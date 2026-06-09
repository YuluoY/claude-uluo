package com.example.payment.repository;

import com.example.payment.entity.User;
import org.apache.ibatis.annotations.*;

import java.math.BigDecimal;

/**
 * 用户数据访问层 — 修复版。
 *
 * 修复要点：扣减余额时使用 version 字段做乐观锁校验，
 * 防止并发扣减导致余额错误。
 */
@Mapper
public interface UserRepo {

    @Select("SELECT id, username, balance, version, updated_at FROM t_user WHERE id = #{id}")
    User findById(@Param("id") Long id);

    /**
     * 【修复】扣减余额时带上 version 条件做乐观锁校验。
     * 如果 version 不匹配（说明已有其他事务修改过），update 返回 0。
     * Service 层检测到返回 0 后重试或报错。
     *
     * 同时增加 balance >= #{amount} 的条件，防止余额扣成负数。
     */
    @Update("UPDATE t_user SET balance = balance - #{amount}, version = version + 1, updated_at = NOW() " +
            "WHERE id = #{id} AND version = #{version} AND balance >= #{amount}")
    int deductBalance(@Param("id") Long id,
                      @Param("amount") BigDecimal amount,
                      @Param("version") int version);
}
