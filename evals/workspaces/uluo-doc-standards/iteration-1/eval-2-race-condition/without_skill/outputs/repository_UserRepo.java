package com.example.payment.repository;

import com.example.payment.entity.User;
import org.apache.ibatis.annotations.*;

/**
 * 用户数据访问层
 */
@Mapper
public interface UserRepo {

    @Select("SELECT id, username, balance, updated_at FROM t_user WHERE id = #{id}")
    User findById(@Param("id") Long id);

    /**
     * 【问题】直接 SET balance = balance - #{amount}，不做乐观锁或版本号校验，
     * 并发扣减可能造成余额错误。
     */
    @Update("UPDATE t_user SET balance = balance - #{amount}, updated_at = NOW() WHERE id = #{id}")
    int deductBalance(@Param("id") Long id, @Param("amount") java.math.BigDecimal amount);
}
