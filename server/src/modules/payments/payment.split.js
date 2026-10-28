export const roundMoney = (value) =>
  Math.round((Number(value) + Number.EPSILON) * 100) / 100;

export const splitTotal = (payments = []) =>
  roundMoney(payments.reduce((sum, part) => sum + Number(part.amount || 0), 0));
