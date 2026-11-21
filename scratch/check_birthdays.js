const mongoose = require('../server/node_modules/mongoose');
require('../server/src/models/User');
const User = mongoose.model('User');

(async () => {
  await mongoose.connect('mongodb://127.0.0.1:27017/teamhub_erp');
  const now = new Date();
  const currentMonth = now.getMonth();
  const users = await User.find({ deletedAt: null, isActive: true, dob: { $ne: null } })
    .select('name dob designation department profileImage')
    .lean();
  console.log('Users with DOB in DB:', users.length);
  const items = users
    .map((user) => ({ user, dob: new Date(user.dob) }))
    .filter(({ dob }) => !Number.isNaN(dob.getTime()) && dob.getMonth() === currentMonth)
    .map(({ user, dob }) => ({
      ...user,
      nextBirthday: new Date(now.getFullYear(), currentMonth, dob.getDate()),
    }))
    .sort((a, b) => new Date(a.nextBirthday) - new Date(b.nextBirthday));
  console.log('Result of getBirthdays:', JSON.stringify(items, null, 2));
  process.exit(0);
})();
