const mongoose = require('../server/node_modules/mongoose');
require('../server/src/models/RecruitmentManagement');
const Recruitment = mongoose.model('RecruitmentManagement');
(async () => {
  await mongoose.connect('mongodb://127.0.0.1:27017/teamhub_erp');
  const candidates = await Recruitment.find({ interviewScore: /%/ }).lean();
  console.log('Candidates with % in interviewScore:', candidates.length);
  for (const c of candidates) {
    const cleanScore = (c.interviewScore || '').replace(/\s*\(\d+%\)/g, '');
    const cleanNotes = (c.notes || '').replace(/\s*\(\d+%\)/g, '');
    const cleanRemarks = (c.remarks || '').replace(/\s*\(\d+%\)/g, '');
    await Recruitment.updateOne(
      { _id: c._id },
      { $set: { interviewScore: cleanScore, notes: cleanNotes, remarks: cleanRemarks } }
    );
    console.log(`Updated ${c.candidateName}: ${c.interviewScore} -> ${cleanScore}`);
  }
  process.exit(0);
})();
