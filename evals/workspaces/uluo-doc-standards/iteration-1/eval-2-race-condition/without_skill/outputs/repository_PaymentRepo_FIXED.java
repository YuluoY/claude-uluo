package com.example.payment.repository;

import com.example.payment.entity.PaymentRecord;
import org.apache.ibatis.annotations.*;

/**
 * 支付记录数据访问层 — 修复版。
 *
 * 修复要点：新增 countByTransactionId 方法用于幂等校验；
 * 数据库层面添加 transaction_id 唯一索引（见 SQL 迁移脚本）。
 */
@Mapper
public interface PaymentRepo {

    /**
     * 【新增】根据交易ID统计记录数，用于幂等校验。
     * 配合数据库唯一索引使用，即使高并发下 INSERT 插入重复记录前也能先检测。
     */
    @Select("SELECT COUNT(1) FROM t_payment_record WHERE transaction_id = #{transactionId}")
    int countByTransactionId(@Param("transactionId") String transactionId);

    /**
     * 【新增】根据交易ID查询记录
     */
    @Select("SELECT id, order_id, transaction_id, amount, status, raw_notification, created_at " +
            "FROM t_payment_record WHERE transaction_id = #{transactionId}")
    PaymentRecord findByTransactionId(@Param("transactionId") String transactionId);

    @Select("SELECT id, order_id, transaction_id, amount, status, raw_notification, created_at " +
            "FROM t_payment_record WHERE id = #{id}")
    PaymentRecord findById(@Param("id") Long id);

    /**
     * INSERT 记录。数据库层面 transaction_id 有唯一约束，
     * 重复插入会抛出 DuplicateKeyException，Service 层捕获后做幂等处理。
     */
    @Insert("INSERT INTO t_payment_record(order_id, transaction_id, amount, status, raw_notification, created_at) " +
            "VALUES(#{orderId}, #{transactionId}, #{amount}, #{status}, #{rawNotification}, NOW())")
    @Options(useGeneratedKeys = true, keyProperty = "id")
    int insert(PaymentRecord record);
}
