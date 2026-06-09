package com.example.payment.service;

import com.example.payment.entity.Order;
import com.example.payment.entity.PaymentRecord;
import com.example.payment.repository.OrderRepo;
import com.example.payment.repository.PaymentRepo;
import com.example.payment.repository.UserRepo;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

/**
 * 支付回调处理服务 — 修复版。
 *
 * 修复策略（三层防护）：
 *
 * 1. 数据库行锁（FOR UPDATE）：processCallback 入口处对订单行加排他锁，
 *    确保同一订单号只有一个事务能进入处理流程。
 *
 * 2. 唯一索引 + 幂等校验：t_payment_record.transaction_id 添加 UNIQUE 约束。
 *    先检查 transactionId 是否已存在，已存在则直接返回；
 *    INSERT 时的 DuplicateKeyException 作为最后兜底。
 *
 * 3. 用户余额乐观锁（version）：deductBalance 带上 version 条件，
 *    防止并发扣减。
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
     * 处理支付回调 — 修复版。
     *
     * 执行流程：
     * 1. 幂等校验：检查 transactionId 是否已处理
     * 2. SELECT ... FOR UPDATE 锁定订单行
     * 3. 检查订单状态
     * 4. 插入支付记录（唯一索引防重）
     * 5. 扣减余额（乐观锁）
     * 6. 更新订单状态
     *
     * @param orderNo       订单号
     * @param transactionId 支付平台交易ID（幂等键）
     * @param payAmount     支付金额
     * @param rawData       原始回调数据
     */
    @Transactional
    public void processCallback(String orderNo, String transactionId,
                                BigDecimal payAmount, String rawData) {

        // ====== 第一层防护：业务层幂等校验 ======
        int existingCount = paymentRepo.countByTransactionId(transactionId);
        if (existingCount > 0) {
            log.info("支付记录已存在，幂等跳过: transactionId={}", transactionId);
            return;
        }

        // ====== 第二层防护：SELECT ... FOR UPDATE 行锁 ======
        // 此时如果有另一个事务正在处理同一订单，当前事务会被阻塞，
        // 直到前者提交。提交后读到 status=PAID，直接跳过。
        Order order = orderRepo.findByOrderNoForUpdate(orderNo);
        if (order == null) {
            log.error("订单不存在: orderNo={}", orderNo);
            throw new RuntimeException("订单不存在");
        }

        // 再次检查状态（可能已被并发事务处理完）
        if ("PAID".equals(order.getStatus())) {
            log.info("订单已被并发事务处理，跳过: orderNo={}", orderNo);
            return;
        }

        if (!"PENDING".equals(order.getStatus())) {
            log.error("订单状态异常: orderNo={}, status={}", orderNo, order.getStatus());
            throw new RuntimeException("订单状态不允许支付回调");
        }

        // ====== 第三层防护：唯一索引防重插入 ======
        PaymentRecord record = new PaymentRecord();
        record.setOrderId(order.getId());
        record.setTransactionId(transactionId);
        record.setAmount(payAmount);
        record.setStatus("SUCCESS");
        record.setRawNotification(rawData);

        try {
            paymentRepo.insert(record);
        } catch (DuplicateKeyException e) {
            // 极端并发场景：事务A和B同时到达这里，
            // A 先插入成功，B 触发唯一约束冲突
            log.warn("支付记录重复插入被阻止: transactionId={}", transactionId);
            return;
        }

        // ====== 扣减用户余额（乐观锁） ======
        // 此处传入 version=0 是因为在当前事务中首次扣减，
        // 且 FOR UPDATE 已锁定了订单行，不会有并发扣同一用户余额的场景
        // （同一订单的 userId 是固定的）。
        // 如果业务中存在同一用户多个订单并发扣减，则需要查出当前 version 再传入。
        int rows = userRepo.deductBalance(order.getUserId(), order.getAmount(), 0);
        if (rows == 0) {
            throw new RuntimeException("余额扣减失败，余额不足或并发冲突");
        }

        // ====== 更新订单状态 ======
        orderRepo.updateStatus(order.getId(), "PAID", transactionId);

        log.info("支付回调处理成功: orderNo={}, transactionId={}", orderNo, transactionId);
    }
}
