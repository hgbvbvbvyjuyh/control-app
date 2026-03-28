export const getWeekNumber = (d: Date) => {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
};

export const isSameDay = (d1: Date, d2: Date) => 
  d1.getFullYear() === d2.getFullYear() && 
  d1.getMonth() === d2.getMonth() && 
  d1.getDate() === d2.getDate();

export const isSameWeek = (d1: Date, d2: Date) => 
  d1.getFullYear() === d2.getFullYear() && 
  getWeekNumber(d1) === getWeekNumber(d2);

export const isSameMonth = (d1: Date, d2: Date) => 
  d1.getFullYear() === d2.getFullYear() && 
  d1.getMonth() === d2.getMonth();

export const isSameYear = (d1: Date, d2: Date) => 
  d1.getFullYear() === d2.getFullYear();

/** Local calendar date (strip time). */
export const startOfDay = (d: Date): Date =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate());

/** Monday 00:00 local of the week containing `d` (ISO-style work week). */
export const startOfCalendarWeek = (d: Date): Date => {
  const x = startOfDay(d);
  const day = x.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + offset);
  return x;
};

export const addCalendarDays = (d: Date, days: number): Date => {
  const x = startOfDay(d);
  x.setDate(x.getDate() + days);
  return x;
};

export const localDayKey = (ms: number): string => {
  const d = new Date(ms);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};
