const mongoose = require('../server/node_modules/mongoose');
require('../server/src/models/User');
const User = mongoose.model('User');
(async () => {
  await mongoose.connect('mongodb://127.0.0.1:27017/teamhub_erp');
  const users = await User.find({ deletedAt: null, isActive: true, dob: { $ne: null } }).select('name dob designation department profileImage').lean();
  console.log('users with DOB count:', users.length);
  users.forEach(u => console.log(u.name, 'dob:', u.dob, 'profileImage:', u.profileImage));
  process.exit(0);
})();
