const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');

const router = express.Router();

// 登录接口
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ where: { username } });

  if (!user || !await bcrypt.compare(password, user.password)) {
    return res.status(401).json({ error: '用户名或密码错误' });
  }

  req.session.userId = user.id;
  res.json({ message: '登录成功', user: { id: user.id, username: user.username } });
});

// 登出接口
router.post('/logout', (req, res) => {
  req.session.destroy();
  res.json({ message: '已登出' });
});

// 认证中间件
function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: '未登录' });
  }
  next();
}

module.exports = { router, requireAuth };
