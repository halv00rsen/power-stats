import {
  countUniqueDays,
  getMonthIndex,
  getMonthQueryInfo,
} from '../date-utils';

jest.useFakeTimers().setSystemTime(new Date('2020-01-01'));

describe('getMonthQueryInfo', () => {
  test('januar', () => {
    const { date, numDays } = getMonthQueryInfo('januar');
    expect(numDays).toBe(31);
    expect(date.getFullYear()).toBe(2019);
    expect(date.getMonth()).toBe(getMonthIndex('desember'));
  });

  test('february with leap year', () => {
    const { date, numDays } = getMonthQueryInfo('februar');
    expect(numDays).toBe(29);
    expect(date.getMonth()).toBe(getMonthIndex('januar'));
  });

  test('oktober', () => {
    const { date, numDays } = getMonthQueryInfo('oktober');
    expect(numDays).toBe(31);
    expect(date.getMonth()).toBe(getMonthIndex('september'));
  });

  test('november', () => {
    const { date, numDays } = getMonthQueryInfo('november');
    expect(numDays).toBe(30);
    expect(date.getMonth()).toBe(getMonthIndex('oktober'));
  });

  test('november', () => {
    const { date, numDays } = getMonthQueryInfo('desember');
    expect(numDays).toBe(31);
    expect(date.getMonth()).toBe(getMonthIndex('november'));
  });
});

describe('countUniqueDays', () => {
  test('same day', () => {
    expect(
      countUniqueDays([
        new Date('2020-01-01'),
        new Date('2020-01-01'),
      ])
    ).toBe(1);
  });
  test('to be one day', () => {
    expect(
      countUniqueDays([
        new Date('2020-01-01'),
        new Date('2020-01-02'),
      ])
    ).toBe(2);
  });

  test('test to contain two days', () => {
    expect(
      countUniqueDays([
        new Date('2020-01-01T23:00'),
        new Date('2020-01-03T01:00'),
      ])
    ).toBe(3);
  });

  test('many days', () => {
    expect(
      countUniqueDays([
        new Date('2022-12-01T00:00:00.000+01:00'),
        new Date('2022-12-10T14:00:00.000+01:00'),
      ])
    ).toBe(10);
  });
});
