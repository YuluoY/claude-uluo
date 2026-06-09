package com.example.payment.entity;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 支付记录实体
 */
public class PaymentRecord {

    private Long id;
    private Long orderId;
    private String transactionId;    // 支付平台交易ID（幂等键）
    private BigDecimal amount;
    private String status;           // SUCCESS/FAILED
    private String rawNotification;  // 原始回调报文
    private LocalDateTime createdAt;

    public PaymentRecord() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getOrderId() { return orderId; }
    public void setOrderId(Long orderId) { this.orderId = orderId; }

    public String getTransactionId() { return transactionId; }
    public void setTransactionId(String transactionId) { this.transactionId = transactionId; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getRawNotification() { return rawNotification; }
    public void setRawNotification(String rawNotification) { this.rawNotification = rawNotification; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
