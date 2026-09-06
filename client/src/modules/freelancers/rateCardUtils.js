export function getCurrentRate(rateCards = [], today = new Date()) {
  const rates = Array.isArray(rateCards) ? rateCards : [];
  const referenceDate = new Date(today);
  const activeRates = rates
    .filter((rate) => {
      const start = new Date(rate.effectiveFrom);
      const end = rate.effectiveUntil ? new Date(rate.effectiveUntil) : null;
      return !Number.isNaN(start.getTime()) && start <= referenceDate && (!end || end >= referenceDate);
    })
    .sort((a, b) => new Date(b.effectiveFrom) - new Date(a.effectiveFrom));

  if (activeRates[0]) return activeRates[0];

  return rates
    .filter((rate) => !Number.isNaN(new Date(rate.effectiveFrom).getTime()))
    .sort((a, b) => new Date(b.effectiveFrom) - new Date(a.effectiveFrom))[0];
}

export function formatRateSummary(rate) {
  return rate ? `${rate.currency || 'INR'} ${Number(rate.amount || 0).toLocaleString('en-IN')} / ${String(rate.rateBasis || '').replaceAll('_', ' ')}` : '';
}
