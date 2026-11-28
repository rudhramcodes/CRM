export const LEAVE_ENTITLEMENT = { casual: 12, sick: 5 };
export const BALANCE_TRACKED_LEAVE_TYPES = Object.keys(LEAVE_ENTITLEMENT);

export const isBalanceTrackedLeave = (leaveType) =>
  BALANCE_TRACKED_LEAVE_TYPES.includes(leaveType);

const dayKey = (d) => new Date(d).toISOString().slice(0, 10);

// Leave is charged for working days only: Sundays and holidays inside the range are free, the same days approval
// skips when it marks attendance. Leave and holiday dates are stored as UTC midnight, so days are walked in UTC.
// A half-day request is always a single day and counts as 0.5.
export const calculateLeaveDays = (start, end, halfDay, holidayDates = []) => {
  if (halfDay) return 0.5;
  const off = new Set(holidayDates.map(dayKey));
  let days = 0;
  for (let t = Date.parse(dayKey(start)); t <= Date.parse(dayKey(end)); t += 864e5) {
    if (new Date(t).getUTCDay() !== 0 && !off.has(dayKey(t))) days += 1;
  }
  return days;
};

// What a leave approved before working-day counting was charged: every calendar day. Only for refunds of those.
export const calendarLeaveDays = (start, end, halfDay) =>
  halfDay ? 0.5 : Math.round((Date.parse(dayKey(end)) - Date.parse(dayKey(start))) / 864e5) + 1;

// End-of-day rule for a worked day with no leave behind it
export const SHORT_DAY_ABSENT_HOURS = 2;
export const SHORT_DAY_HALF_HOURS = 4;
export const shortDayStatus = (workHours = 0) => {
  if (workHours < SHORT_DAY_ABSENT_HOURS) return 'absent';
  if (workHours < SHORT_DAY_HALF_HOURS) return 'half_day';
  return null;
};

export const formatLeaveDuration = (days, halfDay) =>
  halfDay ? `Half day (${halfDay} half)` : `${days} ${days === 1 ? 'day' : 'days'}`;

export const getCasualAccrued = (year, now = new Date()) => {
  const currentYear = now.getFullYear();
  if (year > currentYear) return 0;
  if (year < currentYear) return LEAVE_ENTITLEMENT.casual;
  return Math.min(LEAVE_ENTITLEMENT.casual, now.getMonth() + 1);
};

export const normalizeLeaveBalance = (balance, year, now = new Date()) => {
  const casualUsed = balance.casual?.used || 0;
  const sickUsed = balance.sick?.used || 0;

  balance.casual = {
    total: LEAVE_ENTITLEMENT.casual,
    used: casualUsed,
    balance: Math.max(0, getCasualAccrued(year, now) - casualUsed),
  };
  balance.sick = {
    total: LEAVE_ENTITLEMENT.sick,
    used: sickUsed,
    balance: Math.max(0, LEAVE_ENTITLEMENT.sick - sickUsed),
  };

  return balance;
};
