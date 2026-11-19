export const monthCalendar = (monthDate = new Date(), today = new Date()) => {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const days = new Date(year, month + 1, 0).getDate();
  const leading = new Date(year, month, 1).getDay();
  return [
    ...Array.from({ length: leading }, () => null),
    ...Array.from({ length: days }, (_, index) => {
      const date = new Date(year, month, index + 1);
      return { day: index + 1, key: `${year}-${String(month + 1).padStart(2, '0')}-${String(index + 1).padStart(2, '0')}`, future: date.setHours(0, 0, 0, 0) > new Date(today).setHours(0, 0, 0, 0) };
    }),
  ];
};
