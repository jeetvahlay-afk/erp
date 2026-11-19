const env = require('../config/env');

const getISTComponents = (dateInput) => {
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) return null;
  // IST is UTC + 5.5 hours
  const istTime = date.getTime() + (5.5 * 60 * 60 * 1000);
  const istDate = new Date(istTime);
  return {
    year: istDate.getUTCFullYear(),
    month: istDate.getUTCMonth(),
    date: istDate.getUTCDate(),
    hours: istDate.getUTCHours(),
    minutes: istDate.getUTCMinutes(),
    seconds: istDate.getUTCSeconds(),
    milliseconds: istDate.getUTCMilliseconds()
  };
};

const createFromIST = (year, month, date, hours = 0, minutes = 0, seconds = 0, ms = 0) => {
  const utcDate = new Date(Date.UTC(year, month, date, hours, minutes, seconds, ms));
  return new Date(utcDate.getTime() - (5.5 * 60 * 60 * 1000));
};

const startOfLogicalShiftDay = (input = new Date()) => {
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return null;
  
  const ist = getISTComponents(date);
  let d = ist.date;
  let m = ist.month;
  let y = ist.year;
  
  if (ist.hours < env.shiftDayCutoffHour) {
    const temp = createFromIST(y, m, d - 1);
    const tempIst = getISTComponents(temp);
    if (tempIst) {
      d = tempIst.date;
      m = tempIst.month;
      y = tempIst.year;
    }
  }
  
  return createFromIST(y, m, d, 0, 0, 0, 0);
};

const logicalShiftWindow = (dateInput) => {
  const logicalDate = startOfLogicalShiftDay(dateInput);
  if (!logicalDate) return null;

  const ist = getISTComponents(logicalDate);
  const start = createFromIST(ist.year, ist.month, ist.date, env.shiftDayCutoffHour, 0, 0, 0);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);

  return { logicalDate, start, end };
};

const isIsoMonth = (value) => /^\d{4}-(0[1-9]|1[0-2])$/.test(String(value || ''));
const isIsoDate = (value) => /^\d{4}-(0[1-9]|1[0-2])-([0-2]\d|3[01])$/.test(String(value || ''));

module.exports = {
  getISTComponents,
  createFromIST,
  startOfLogicalShiftDay,
  logicalShiftWindow,
  isIsoMonth,
  isIsoDate
};
