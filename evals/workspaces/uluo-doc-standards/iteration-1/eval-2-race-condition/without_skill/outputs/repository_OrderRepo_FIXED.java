package com.example.payment.repository;

import com.example.payment.entity.Order;
import org.apache.ibatis.annotations.*;

/**
 * 订单数据访问层 — 修复版。
 *
 * 修复要点：findByOrderNo 使用 SELECT ... FOR UPDATE 加排他行锁，
 * 确保同一订单号在同一时刻只有一个事务能读取并处理。
 */
@Mapper
public interface OrderRepo {

    /**
     * 【修复】使用 FOR UPDATE 加排他锁，防止并发读取同一订单。
     * 事务提交前，其他事务的 FOR UPDATE 查询会被阻塞。
     */
    @Select("SELECT id, order_no, user_id, amount, status, payment_ref_no, created_at, updated_at " +
            "FROM t_order WHERE order_no = #{orderNo} FOR UPDATE")
    Order findByOrderNoForUpdate(@Param("orderNo") String orderNo);

    /**
     * 普通查询（非锁场景使用）
     */
    @Select("SELECT id, order_no, user_id, amount, status, payment_ref_no, created_at, updated_at " +
            "FROM t_order WHERE id = #{id}")
    Order findById(@Param("id") Long id);

    /**
     * 更新订单状态
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
