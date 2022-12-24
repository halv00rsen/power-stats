import {
  countUniqueDays,
  getMonthIndex,
  getMonthQueryInfo,
  cacheIsUpToDate,
} from '../date-utils';
import type { Measurement } from '../types';

describe('getMonthQueryInfo', () => {
  jest.useFakeTimers().setSystemTime(new Date('2020-01-01'));

  test('januar', () => {
    const { after, numDays } = getMonthQueryInfo('januar');
    expect(numDays).toBe(31);
    expect(after.getFullYear()).toBe(2019);
    expect(after.getMonth()).toBe(getMonthIndex('desember'));
  });

  test('february with leap year', () => {
    const { after, numDays } = getMonthQueryInfo('februar');
    expect(numDays).toBe(29);
    expect(after.getMonth()).toBe(getMonthIndex('januar'));
  });

  test('oktober', () => {
    const { after, numDays } = getMonthQueryInfo('oktober');
    expect(numDays).toBe(31);
    expect(after.getMonth()).toBe(getMonthIndex('september'));
  });

  test('november', () => {
    const { after, numDays } = getMonthQueryInfo('november');
    expect(numDays).toBe(30);
    expect(after.getMonth()).toBe(getMonthIndex('oktober'));
  });

  test('november', () => {
    const { after, numDays } = getMonthQueryInfo('desember');
    expect(numDays).toBe(31);
    expect(after.getMonth()).toBe(getMonthIndex('november'));
  });
});

describe('countUniqueDays', () => {
  jest.useFakeTimers().setSystemTime(new Date('2020-01-01'));

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

describe('cacheIsUpToDate', () => {
  const measurement: Measurement = {
    from: '2022-12-31:23:00.000+01:00',
    to: '2023-01-01:00:00.000+01:00',
  } as Measurement;

  test('has last measurement with length on list', () => {
    expect(
      cacheIsUpToDate('desember', Array(24 * 31).fill(measurement))
    ).toBeTruthy();
  });

  test('cache is valid on last valid date of month', () => {
    expect(cacheIsUpToDate('desember', [measurement])).toBeTruthy();
  });

  const measurement2: Measurement = {
    from: '2022-12-20:10:00.000+01:00',
    to: '2022-12-20:11:00.000+01:00',
  } as Measurement;

  test('cache is valid on too early invalidation', () => {
    jest
      .useFakeTimers()
      .setSystemTime(new Date('2022-12-20:12:00.000+01:00'));
    expect(cacheIsUpToDate('desember', [measurement2])).toBeTruthy();
  });

  test('cache is invalid on two hours difference from last fetch', () => {
    jest
      .useFakeTimers()
      .setSystemTime(new Date('2022-12-20:13:00.000+01:00'));
    expect(cacheIsUpToDate('desember', [measurement2])).toBeFalsy();
  });
});
