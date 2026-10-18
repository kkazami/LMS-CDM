export type CalendarDay = {
  date: Date;
  isoDate: string;
  day: number;
  isCurrentMonth: boolean;
  isToday: boolean;
};

export function buildMonthMatrix(activeMonth: Date): CalendarDay[][] {
  const firstOfMonth = new Date(activeMonth.getFullYear(), activeMonth.getMonth(), 1);
  const startDay = (firstOfMonth.getDay() + 6) % 7;
  const gridStart = new Date(firstOfMonth);
  gridStart.setDate(firstOfMonth.getDate() - startDay);

  const matrix: CalendarDay[][] = [];
  let cursor = new Date(gridStart);

  for (let weekIndex = 0; weekIndex < 6; weekIndex += 1) {
    const week: CalendarDay[] = [];

    for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
      const date = new Date(cursor);
      const isoDate = formatDateKey(date);
      const isCurrentMonth = date.getMonth() === activeMonth.getMonth();
      const today = new Date();

      week.push({
        date,
        isoDate,
        day: date.getDate(),
        isCurrentMonth,
        isToday:
          date.getFullYear() === today.getFullYear() &&
          date.getMonth() === today.getMonth() &&
          date.getDate() === today.getDate(),
      });

      cursor.setDate(cursor.getDate() + 1);
    }

    matrix.push(week);
  }

  return matrix;
}

export function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}