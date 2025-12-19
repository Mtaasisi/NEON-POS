export function getMonthNumber(month: string): number | null {
  const monthNames = [
    'january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december'
  ];
  const numericMonth = parseInt(month);
  if (!isNaN(numericMonth) && numericMonth >= 1 && numericMonth <= 12) {
    return numericMonth;
  }
  const monthIndex = monthNames.indexOf(month.toLowerCase());
  return monthIndex !== -1 ? monthIndex + 1 : null;
}

export function getDayNumber(day: string): number | null {
  if (day.trim() === '') return null;
  const dayMatch = day.match(/^(\d+)/);
  if (dayMatch) {
    return parseInt(dayMatch[1]);
  }
  const numericDay = parseInt(day);
  return !isNaN(numericDay) ? numericDay : null;
}

export function isTodayBirthday(birthMonth: string | number | null, birthDay: string | number | null): boolean {
  if (birthMonth === null || birthDay === null) return false;

  const today = new Date();
  const currentMonth = today.getMonth() + 1;
  const currentDay = today.getDate();

  let customerMonth: number | null;
  if (typeof birthMonth === 'string') {
    customerMonth = getMonthNumber(birthMonth);
  } else if (typeof birthMonth === 'number' && birthMonth >= 1 && birthMonth <= 12) {
    customerMonth = birthMonth;
  } else {
    return false;
  }

  let customerDay: number | null;
  if (typeof birthDay === 'string') {
    customerDay = getDayNumber(birthDay);
  } else if (typeof birthDay === 'number' && birthDay >= 1 && birthDay <= 31) {
    customerDay = birthDay;
  } else {
    return false;
  }

  if (customerMonth === null || customerDay === null) return false;

  return customerMonth === currentMonth && customerDay === currentDay;
}