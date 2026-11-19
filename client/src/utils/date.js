export const getLogicalDateString = (input = new Date(), cutoffHour = 10) => {
  const date = new Date(input);
  if (date.getHours() < cutoffHour) date.setDate(date.getDate() - 1);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const formatDate = (value, options = {}) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', ...options }).format(date);
};

export const formatCurrency = (value, currency = 'INR') => new Intl.NumberFormat(undefined, {
  style: 'currency',
  currency,
  maximumFractionDigits: 0,
}).format(Number(value || 0));
