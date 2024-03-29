import type { Measurement } from './types';

export const MONTH_NAMES = [
  'januar',
  'februar',
  'mars',
  'april',
  'mai',
  'juni',
  'juli',
  'august',
  'september',
  'oktober',
  'november',
  'desember',
] as const;

export type MonthName = typeof MONTH_NAMES[number];

export const getMonthName = (date: Date) => {
  return MONTH_NAMES[date.getMonth()];
};

export const getMonthIndex = (month: MonthName): number =>
  MONTH_NAMES.indexOf(month);

export const isValidMonth = (month: string): month is MonthName => {
  return MONTH_NAMES.includes(month as MonthName);
};

// Use one hour before requested month so 'after'-query won't
// remove first entry from given month.
// Example, oktober would yield 2022-09-30T23:00 instead of 2022-10-01T00:00
// because of Tibbers API not including hour from the 'after' keyword
export const getMonthQueryInfo = ({
  month,
  year,
}: {
  month: MonthName;
  year: number;
}): { after: Date; numDays: number } => {
  const monthIndex = getMonthIndex(month);
  if (monthIndex === MONTH_NAMES.indexOf('januar')) {
    return {
      after: new Date(`${year - 1}-12-31T23:00`),
      numDays: getDaysInMonth({ year, monthNotZeroIndexed: 1 }),
    };
  }
  const lastMonthNotPadded = monthIndex;
  const nextMonthNotPadded = monthIndex + 1;
  const daysInLastMonth = getDaysInMonth({
    monthNotZeroIndexed: lastMonthNotPadded,
    year,
  });
  const dateString =
    lastMonthNotPadded < 10
      ? `${year}-0${lastMonthNotPadded}-${daysInLastMonth}T23:00`
      : `${year}-${lastMonthNotPadded}-${daysInLastMonth}T23:00`;
  return {
    after: new Date(dateString),
    numDays: getDaysInMonth({
      year,
      monthNotZeroIndexed: nextMonthNotPadded,
    }),
  };
};

export function getDaysInMonth({
  monthNotZeroIndexed,
  year,
}: {
  monthNotZeroIndexed: number;
  year: number;
}) {
  return new Date(year, monthNotZeroIndexed, 0).getDate();
}

export function countUniqueDays(dates: Date[]): number {
  let maxDate = new Date('2000-01-01');
  let minDate = new Date('2100-01-01');

  dates
    .map((date) => {
      const d = new Date(date);
      d.setHours(0);
      d.setMinutes(0);
      d.setSeconds(0);
      return d;
    })
    .forEach((date) => {
      if (maxDate.getTime() < date.getTime()) {
        maxDate = date;
      }
      if (minDate.getTime() > date.getTime()) {
        minDate = date;
      }
    });
  return (
    Math.floor(
      (maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)
    ) + 1
  );
}

export const cacheIsUpToDate = ({
  measurements,
  month,
  year,
}: {
  month: MonthName;
  measurements: Measurement[];
  year: number;
}): boolean => {
  const { numDays } = getMonthQueryInfo({ month, year });
  if (numDays * 24 === measurements.length) {
    return true;
  }
  const lastMeasurement = measurements[measurements.length - 1];
  const lastFrom = new Date(lastMeasurement.from);
  const lastTo = new Date(lastMeasurement.to);
  if (lastTo.getMonth() !== lastFrom.getMonth()) {
    return true;
  }
  const current = new Date();
  const TWO_HOURS = 1000 * 60 * 60 * 2;
  if (current.getTime() < lastTo.getTime() + TWO_HOURS) {
    return true;
  }
  return false;
};

const padWithZero = (num: number): string => {
  if (num > 99) {
    throw new Error(
      'pad with zero not supported for numbers with three digits'
    );
  }
  if (num < 10) {
    return `0${num}`;
  }
  return `${num}`;
};

export const getFullDateString = (dateString: string): string => {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = padWithZero(date.getMonth() + 1);
  const day = padWithZero(date.getDate());
  return `${year}-${month}-${day}`;
};
