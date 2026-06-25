const express = require('express');
const router = express.Router();

// 创建用户
router.post('/', async (req, res) => {
  const { username, email, password } = req.body;
  const existing = await User.findOne({ where: { username } });
  if (existing) {
    return res.status(409).json({ error: '用户名已存在' });
  }
  const user = await User.create({ username, email, password });
  res.status(201).json(user);
});

// 编辑用户
router.put('/:id', async (req, res) => {
  const user = await User.findByPk(req.params.id);
  if (!user) return res.status(404).json({ error: '用户不存在' });
  await user.update(req.body);
  res.json(user);
});

// 删除用户（软删除）
router.delete('/:id', async (req, res) => {
  const user = await User.findByPk(req.params.id);
  if (!user) return res.status(404).json({ error: '用户不存在' });
  await user.update({ deletedAt: new Date() });
  res.json({ message: '已删除' });
});

module.exports = router;
