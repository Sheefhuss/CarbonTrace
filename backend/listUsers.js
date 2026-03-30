require('dotenv').config();
const { User } = require('./models');

(async () => {
  const users = await User.unscoped().findAll({
    attributes: ['name', 'email', 'username', 'role', 'createdAt'],
    order: [['createdAt', 'DESC']],
  });
  users.forEach(u => {
    console.log(`${u.name} | ${u.email} | @${u.username} | ${u.role}`);
  });
  process.exit(0);
})();