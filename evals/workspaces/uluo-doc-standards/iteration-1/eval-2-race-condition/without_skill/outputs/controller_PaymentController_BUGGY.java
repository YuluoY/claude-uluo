package com.example.payment.controller;

import com.example.payment.service.PaymentService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.Map;

/**
 * 支付回调接口 — 存在竞态条件导致重复处理。
 *
 * 触发条件（高并发）：
 * - 支付平台因网络超时重发回调通知
 * - 消息队列 at-least-once 语义导致重复投递
 * - 客户端短时间内多次点击
 * - 反向代理/网关的自动重试
 */
@RestController
@RequestMapping("/api/payment")
public class PaymentController {

    private static final Logger log = LoggerFactory.getLogger(PaymentController.class);

    @Autowired
    private PaymentService paymentService;

    /**
     * 接收支付平台回调通知。
     *
     * 问题：Controller 层没有任何防重机制（无分布式锁、无请求ID去重），
     * 直接将请求转发给 Service 层。
     */
    @PostMapping("/callback")
    public String receiveCallback(@RequestBody Map<String, Object> params) {
        String orderNo = (String) params.get("orderNo");
        String transactionId = (String) params.get("transactionId");
        BigDecimal payAmount = new BigDecimal(params.get("payAmount").toString());
        String rawData = params.toString();

        log.info("收到支付回调: orderNo={}, transactionId={}", orderNo, transactionId);

        try {
            paymentService.processCallback(orderNo, transactionId, payAmount, rawData);
            return "SUCCESS";
        } catch (Exception e) {
            log.error("支付回调处理失败: orderNo={}", orderNo, e);
            return "FAIL";
        }
    }
}
