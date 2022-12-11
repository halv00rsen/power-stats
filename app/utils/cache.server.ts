import type { MonthName } from './date-utils';
import type { Measurement } from './types';
import { db } from '~/utils/db.server';

export const getCachedMeasurements = async (
  month: MonthName
): Promise<Measurement[] | undefined> => {
  const data = await db.measurement.findMany({
    where: { month },
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
  measurements: Measurement[]
) => {
  await db.measurement.deleteMany({
    where: { month },
  });
  for (let i = 0; i < measurements.length; i++) {
    await db.measurement.create({
      data: {
        ...measurements[i],
        month,
      },
    });
  }
};
