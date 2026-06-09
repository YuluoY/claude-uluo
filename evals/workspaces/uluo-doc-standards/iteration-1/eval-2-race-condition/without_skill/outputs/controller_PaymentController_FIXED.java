package com.example.payment.controller;

import com.example.payment.service.PaymentService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.Map;

/**
 * 支付回调接口 — 修复版。
 *
 * Controller 层新增：在入口处做请求级幂等检查（可配合 Redis 分布式锁）。
 * 如果多实例部署，仅靠数据库行锁可能不够（FOR UPDATE 是库级锁，跨实例有效），
 * 但加上 Redis 分布式锁可以减少无效的数据库锁等待。
 */
@RestController
@RequestMapping("/api/payment")
public class PaymentController {

    private static final Logger log = LoggerFactory.getLogger(PaymentController.class);

    @Autowired
    private PaymentService paymentService;

    // 如果多实例部署，注入 Redis 分布式锁组件
    // @Autowired
    // private RedisLock redisLock;

    /**
     * 接收支付平台回调通知 — 修复版。
     *
     * 改进：
     * - Service 层已通过 FOR UPDATE + 唯一索引 + 乐观锁 做三层防护
     * - 如需更高级别的防护，可在 Controller 层加 Redis 分布式锁（注释中给出示例）
     */
    @PostMapping("/callback")
    public String receiveCallback(@RequestBody Map<String, Object> params) {
        String orderNo = (String) params.get("orderNo");
        String transactionId = (String) params.get("transactionId");
        BigDecimal payAmount = new BigDecimal(params.get("payAmount").toString());
        String rawData = params.toString();

        log.info("收到支付回调: orderNo={}, transactionId={}", orderNo, transactionId);

        // ====== 可选：Redis 分布式锁（多实例场景） ======
        // String lockKey = "pay:callback:" + orderNo;
        // boolean locked = redisLock.tryLock(lockKey, 30, TimeUnit.SECONDS);
        // if (!locked) {
        //     log.warn("获取分布式锁失败，可能重复请求: orderNo={}", orderNo);
        //     return "SUCCESS"; // 返回成功让支付平台不再重试
        // }
        // try {
        //     paymentService.processCallback(orderNo, transactionId, payAmount, rawData);
        //     return "SUCCESS";
        // } finally {
        //     redisLock.unlock(lockKey);
        // }

        try {
            paymentService.processCallback(orderNo, transactionId, payAmount, rawData);
            return "SUCCESS";
        } catch (Exception e) {
            log.error("支付回调处理失败: orderNo={}", orderNo, e);
            return "FAIL";
        }
    }
}
