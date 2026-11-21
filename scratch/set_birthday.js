const mongoose = require('../server/node_modules/mongoose');
require('../server/src/models/User');
const User = mongoose.model('User');

(async () => {
  await mongoose.connect('mongodb://127.0.0.1:27017/teamhub_erp');
  const now = new Date();
  const dob = new Date(1998, now.getMonth(), now.getDate());
  await User.updateOne({ name: /wodwo/i }, { $set: { dob } });
  const updated = await User.findOne({ name: /wodwo/i }).lean();
  console.log('Updated user:', updated.name, 'DOB:', updated.dob);
  process.exit(0);
})();
