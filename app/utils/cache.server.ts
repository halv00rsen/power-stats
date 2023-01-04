import { MonthName, YearDiff, yearDiffToYear, FullYear } from './date-utils';
import type { Measurement } from './types';
import { db } from '~/utils/db.server';

export const getCachedMeasurements = async (
  month: MonthName,
  yearNum: YearDiff
): Promise<Measurement[] | undefined> => {
  let year: FullYear = yearDiffToYear(yearNum)
  const data = await db.measurement.findMany({
    where: { month, year },
  });
  return data.map(
    ({ consumption, cost, from, to, unitPrice, unitPriceVAT }) => ({
      consumption,
      from,
      to,
      cost,
      consumptionUnit: 'kWh',
      unitPrice,
      unitPriceVAT,
    })
  );
};

export const saveCache = async (
  month: MonthName,
  measurements: Measurement[],
  yearNum: YearDiff
) => {
  let year: FullYear = yearDiffToYear(yearNum)
  await db.measurement.deleteMany({
    where: { month, year },
  });
  for (let i = 0; i < measurements.length; i++) {
    await db.measurement.create({
      data: {
        ...measurements[i],
        month,
        year
      },
    });
  }
};
