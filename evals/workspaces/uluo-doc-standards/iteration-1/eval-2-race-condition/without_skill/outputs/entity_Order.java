package com.example.payment.entity;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 订单实体
 */
public class Order {

    private Long id;
    private String orderNo;          // 订单号
    private Long userId;             // 用户ID
    private BigDecimal amount;       // 订单金额
    private String status;           // 订单状态: PENDING/PAID/FAILED/CANCELLED
    private String paymentRefNo;     // 支付平台交易流水号
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public Order() {}

    public Order(Long id, String orderNo, Long userId, BigDecimal amount, String status) {
        this.id = id;
        this.orderNo = orderNo;
        this.userId = userId;
        this.amount = amount;
        this.status = status;
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getOrderNo() { return orderNo; }
    public void setOrderNo(String orderNo) { this.orderNo = orderNo; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getPaymentRefNo() { return paymentRefNo; }
    public void setPaymentRefNo(String paymentRefNo) { this.paymentRefNo = paymentRefNo; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
