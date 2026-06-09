package com.example.payment.repository;

import com.example.payment.entity.PaymentRecord;
import org.apache.ibatis.annotations.*;

/**
 * 支付记录数据访问层 — 缺少幂等校验。
 */
@Mapper
public interface PaymentRepo {

    /**
     * 【问题】缺少根据 transactionId 查重的方法，无法做幂等校验。
     */
    @Select("SELECT id, order_id, transaction_id, amount, status, raw_notification, created_at " +
            "FROM t_payment_record WHERE id = #{id}")
    PaymentRecord findById(@Param("id") Long id);

    /**
     * 【问题】缺少根据 transactionId 查重的方法。
     */
    @Select("SELECT id, order_id, transaction_id, amount, status, raw_notification, created_at " +
            "FROM t_payment_record WHERE order_id = #{orderId}")
    PaymentRecord findByOrderId(@Param("orderId") Long orderId);

    @Insert("INSERT INTO t_payment_record(order_id, transaction_id, amount, status, raw_notification, created_at) " +
            "VALUES(#{orderId}, #{transactionId}, #{amount}, #{status}, #{rawNotification}, NOW())")
    @Options(useGeneratedKeys = true, keyProperty = "id")
    int insert(PaymentRecord record);
}
