package com.example.payment.service;

import com.example.payment.entity.Order;
import com.example.payment.entity.PaymentRecord;
import com.example.payment.repository.OrderRepo;
import com.example.payment.repository.PaymentRepo;
import com.example.payment.repository.UserRepo;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

/**
 * 支付回调处理服务 — 存在严重的竞态条件问题。
 *
 * 问题场景：
 * 1. 线程A 和 线程B 同时收到同一笔支付通知（网络重试/消息队列重复投递）
 * 2. 两个线程同时调用 processCallback()，同时读到 order.status = PENDING
 * 3. 两个线程都通过 status 校验，各自执行扣款和状态更新
 * 4. 用户余额被重复扣减
 *
 * 根因：@Transactional 只保证数据库事务的 ACID（原子性/一致性/隔离性/持久性），
 * 但无法阻止两个并发事务同时读到相同数据（取决于隔离级别）。
 * 在默认的 READ_COMMITTED 隔离级别下，事务A读到 PENDING 后，事务B也能读到 PENDING，
 * 导致两个事务各自认为自己是第一个处理的，从而重复处理。
 */
@Service
public class PaymentService {

    private static final Logger log = LoggerFactory.getLogger(PaymentService.class);

    @Autowired
    private OrderRepo orderRepo;

    @Autowired
    private PaymentRepo paymentRepo;

    @Autowired
    private UserRepo userRepo;

    /**
     * 处理支付回调 — 存在竞态条件。
     *
     * @param orderNo       订单号
     * @param transactionId 支付平台交易ID
     * @param payAmount     支付金额
     * @param rawData       原始回调数据
     */
    @Transactional
    public void processCallback(String orderNo, String transactionId,
                                BigDecimal payAmount, String rawData) {

        // 第一步：查询订单 — 无锁读取
        Order order = orderRepo.findByOrderNo(orderNo);
        if (order == null) {
            log.error("订单不存在: orderNo={}", orderNo);
            throw new RuntimeException("订单不存在");
        }

        // 第二步：状态校验 — 竞态窗口在此
        // 线程A和线程B可能同时到达这里，都读到 PENDING
        if ("PAID".equals(order.getStatus())) {
            log.info("订单已处理，跳过: orderNo={}", orderNo);
            return;
        }

        if (!"PENDING".equals(order.getStatus())) {
            log.error("订单状态异常: orderNo={}, status={}", orderNo, order.getStatus());
            throw new RuntimeException("订单状态不允许支付回调");
        }

        // 第三步：记录支付信息 — 无幂等校验
        PaymentRecord record = new PaymentRecord();
        record.setOrderId(order.getId());
        record.setTransactionId(transactionId);
        record.setAmount(payAmount);
        record.setStatus("SUCCESS");
        record.setRawNotification(rawData);
        paymentRepo.insert(record);

        // 第四步：扣减用户余额 — 无乐观锁
        int rows = userRepo.deductBalance(order.getUserId(), order.getAmount());
        if (rows == 0) {
            throw new RuntimeException("余额扣减失败");
        }

        // 第五步：更新订单状态为 PAID
        orderRepo.updateStatus(order.getId(), "PAID", transactionId);

        log.info("支付回调处理成功: orderNo={}, transactionId={}", orderNo, transactionId);
    }
}
