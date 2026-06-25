const express = require('express');
const router = express.Router();

// CSV 导出接口
router.get('/export/csv', async (req, res) => {
  try {
    const users = await User.findAll({ limit: 100000 });
    const csv = convertToCSV(users);
    res.setHeader('Content-Type', 'text/csv');
    res.attachment('users.csv');
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function convertToCSV(users) {
  const header = 'id,name,email,created_at\n';
  const rows = users.map(u => `${u.id},${u.name},${u.email},${u.createdAt}`).join('\n');
  return header + rows;
}

module.exports = router;
