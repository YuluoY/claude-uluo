package com.example.payment.entity;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 用户实体
 */
public class User {

    private Long id;
    private String username;
    private BigDecimal balance;      // 账户余额
    private LocalDateTime updatedAt;

    public User() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public BigDecimal getBalance() { return balance; }
    public void setBalance(BigDecimal balance) { this.balance = balance; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
