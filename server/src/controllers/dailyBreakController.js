const crypto = require('crypto');
const DailySchedule = require('../models/DailySchedule');
const Settings = require('../models/Settings');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const validators = require('../validation/validators');
const { isIsoDate, getISTComponents } = require('../utils/date');
const { writeAuditLog } = require('../services/auditService');

const normalizeBreaks = (breaks) => {
  validators.ensure(Array.isArray(breaks), 'breaks must be an array', 'breaks');
  validators.ensure(breaks.length <= 20, 'A schedule cannot contain more than 20 breaks', 'breaks');
  return breaks.map((item, index) => ({
    id: String(item.id || crypto.randomUUID()),
    breakType: validators.requiredString(item.breakType, `breaks[${index}].breakType`, { max: 120 }),
    fromTime: validators.requiredString(item.fromTime, `breaks[${index}].fromTime`),
    toTime: validators.requiredString(item.toTime, `breaks[${index}].toTime`),
  }));
};

const getDailyBreaks = asyncHandler(async (req, res) => {
  if (!isIsoDate(req.query.date)) throw new AppError('A valid date is required (YYYY-MM-DD)', 400, 'INVALID_DATE');
  let dailySchedule = await DailySchedule.findOne({ dateText: req.query.date }).lean();
  if (dailySchedule && dailySchedule.breaks && dailySchedule.breaks.length > 0) {
    return res.json({ isCustom: true, breaks: dailySchedule.breaks });
  }

  // Fallback: If not found for the requested date, check if a daily schedule was set for today's current date
  const ist = getISTComponents(new Date());
  const todayDate = ist ? `${ist.year}-${String(ist.month + 1).padStart(2, '0')}-${String(ist.date).padStart(2, '0')}` : new Date().toLocaleDateString('en-CA');
  if (req.query.date !== todayDate) {
    dailySchedule = await DailySchedule.findOne({ dateText: todayDate }).lean();
    if (dailySchedule && dailySchedule.breaks && dailySchedule.breaks.length > 0) {
      return res.json({ isCustom: true, breaks: dailySchedule.breaks });
    }
  }

  if (dailySchedule) return res.json({ isCustom: true, breaks: dailySchedule.breaks || [] });

  const globalBreaks = await Settings.findOne({ type: 'breaks' }).lean();
  return res.json({ isCustom: false, breaks: Array.isArray(globalBreaks?.config) ? globalBreaks.config : [] });
});

const setDailyBreaks = asyncHandler(async (req, res) => {
  if (!isIsoDate(req.body.date)) throw new AppError('A valid date is required (YYYY-MM-DD)', 400, 'INVALID_DATE');
  const breaks = normalizeBreaks(req.body.breaks);
  const schedule = await DailySchedule.findOneAndUpdate(
    { dateText: req.body.date },
    { $set: { breaks, updatedBy: req.user._id } },
    { returnDocument: 'after', upsert: true, runValidators: true, setDefaultsOnInsert: true },
  );
  await writeAuditLog(req, 'break_schedule.updated', 'DailySchedule', schedule._id, { date: req.body.date, breakCount: breaks.length });
  res.json({ message: 'Daily break schedule updated successfully', schedule });
});

const resetDailyBreaks = asyncHandler(async (req, res) => {
  if (!isIsoDate(req.query.date)) throw new AppError('A valid date is required (YYYY-MM-DD)', 400, 'INVALID_DATE');
  const deleted = await DailySchedule.findOneAndDelete({ dateText: req.query.date });
  if (deleted) await writeAuditLog(req, 'break_schedule.reset', 'DailySchedule', deleted._id, { date: req.query.date });
  res.json({ message: 'Reverted to global break configuration' });
});

module.exports = { getDailyBreaks, setDailyBreaks, resetDailyBreaks };
