package com.example.payment.repository;

import com.example.payment.entity.Order;
import org.apache.ibatis.annotations.*;

/**
 * 订单数据访问层 — 存在竞态条件隐患：
 * findById 和 updateStatus 之间无行锁，高并发下多个线程可同时读到 PENDING 状态。
 */
@Mapper
public interface OrderRepo {

    /**
     * 【问题】普通 SELECT，不加锁，并发下可能读到过期状态。
     */
    @Select("SELECT id, order_no, user_id, amount, status, payment_ref_no, created_at, updated_at " +
            "FROM t_order WHERE id = #{id}")
    Order findById(@Param("id") Long id);

    /**
     * 【问题】普通 SELECT，不加锁，并发下可能读到过期状态。
     */
    @Select("SELECT id, order_no, user_id, amount, status, payment_ref_no, created_at, updated_at " +
            "FROM t_order WHERE order_no = #{orderNo}")
    Order findByOrderNo(@Param("orderNo") String orderNo);

    /**
     * 【问题】status = #{newStatus} 的 WHERE 条件只在业务层校验，没有排他锁保证原子性。
     */
    @Update("UPDATE t_order SET status = #{newStatus}, payment_ref_no = #{paymentRefNo}, " +
            "updated_at = NOW() WHERE id = #{id}")
    int updateStatus(@Param("id") Long id,
                     @Param("newStatus") String newStatus,
                     @Param("paymentRefNo") String paymentRefNo);

    @Insert("INSERT INTO t_order(order_no, user_id, amount, status, created_at, updated_at) " +
            "VALUES(#{orderNo}, #{userId}, #{amount}, #{status}, NOW(), NOW())")
    @Options(useGeneratedKeys = true, keyProperty = "id")
    int insert(Order order);
}
