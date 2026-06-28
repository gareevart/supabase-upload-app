export type MonthBounds = {
  start: string;
  end: string;
  label: string;
};

export const getCurrentMonthBounds = (now = new Date()): MonthBounds => {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();

  const start = new Date(Date.UTC(year, month, 1));
  const end = new Date(Date.UTC(year, month + 1, 1));

  const label = new Intl.DateTimeFormat(undefined, {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(start);

  return {
    start: start.toISOString(),
    end: end.toISOString(),
    label,
  };
};
