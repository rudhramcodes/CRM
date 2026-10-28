const PAYROLL_EMAILS = ['jaimishchhowala@rudhramenterprises.com'];

export const canAccessPayroll = (user) => {
  if (!user) return false;
  if (user.role === 'super_admin' || user.canAccessPayroll === true) return true;
  return PAYROLL_EMAILS.includes(String(user.email || '').trim().toLowerCase());
};
