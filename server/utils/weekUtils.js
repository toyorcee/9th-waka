/**
 * Get current week range (Sunday to Saturday)
 * @param {Date} date - Optional date to calculate week range for (defaults to today)
 * @returns {Object} Object with start and end dates of the week
 */
export function getWeekRange(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  const start = new Date(d.setDate(diff));
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  return { start, end };
}

