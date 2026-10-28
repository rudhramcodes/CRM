export const LEAVE_ENTITLEMENT = { casual: 12, sick: 5 };
export const BALANCE_TRACKED_LEAVE_TYPES = Object.keys(LEAVE_ENTITLEMENT);

export const isBalanceTrackedLeave = (leaveType) =>
  BALANCE_TRACKED_LEAVE_TYPES.includes(leaveType);

export const calculateLeaveDays = (start, end) =>
  Math.ceil((new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24)) + 1;

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
