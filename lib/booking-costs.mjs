export function compareBookingCosts({ appointmentPrice, newClients, commissionPercent, monthlySubscription, customBuild, customMonthly }) {
  const values = [appointmentPrice, newClients, commissionPercent, monthlySubscription, customBuild, customMonthly];
  if (values.some(value => !Number.isFinite(value) || value < 0) || commissionPercent > 100 || newClients > 10000 || appointmentPrice > 100000 || monthlySubscription > 100000 || customBuild > 1000000 || customMonthly > 100000) return null;
  const commission = appointmentPrice * newClients * commissionPercent / 100;
  const platformYear = (commission + monthlySubscription) * 12;
  const customYear = customBuild + customMonthly * 12;
  return { commission, platformMonth: commission + monthlySubscription, platformYear, customYear, difference: platformYear - customYear };
}
