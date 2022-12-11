import type { Measurement, Month } from './types';

export const getAveragePriceInOere = (
  measurements: Measurement[]
): number => {
  return (
    (measurements.reduce(
      (total, measurement) => total + measurement.unitPrice,
      0
    ) /
      measurements.length) *
    100
  );
};

export const getTotalCosts = (
  measurements: Measurement[]
): number => {
  return measurements.reduce(
    (total, measurement) => total + measurement.cost,
    0
  );
};

interface MontlyTotal extends Omit<Month, 'measurements'> {
  totalUsage: Measurement;
  nettleie: {
    fastledd: Fastledd;
    energiledd: Energiledd;
  };
}

export const getMonthlyInformation = (month: Month): MontlyTotal => {
  const { measurements, month: monthNumber, monthName } = month;
  const initialMeasurement: Measurement = {
    consumption: 0,
    consumptionUnit: 'kWh',
    cost: 0,
    from: '',
    to: '',
    unitPrice: 0,
    unitPriceVAT: 0,
  };
  const measurementTotal: Measurement = measurements.reduce(
    (total, measurement) => {
      return {
        ...total,
        consumption: total.consumption + measurement.consumption,
        cost: total.cost + measurement.cost,
        unitPrice: total.unitPrice + measurement.unitPrice,
        unitPriceVAT: total.unitPriceVAT + measurement.unitPriceVAT,
      };
    },
    initialMeasurement
  );

  const numEntries = measurements.length;
  const measurementAverage: Measurement = {
    ...measurementTotal,
    consumption: measurementTotal.consumption,
    cost: measurementTotal.cost,
    unitPrice: measurementTotal.unitPrice / numEntries,
    unitPriceVAT: measurementTotal.unitPriceVAT / numEntries,
  };

  return {
    month: monthNumber,
    monthName,
    totalUsage: measurementAverage,
    nettleie: {
      fastledd: getFastleddTrinn(month),
      energiledd: getEnergiledd(month),
    },
  };
};

export const toOere = (sum: number): string => {
  return `${Math.round(sum * 100)} øre/kwh`;
};

interface Fastledd {
  name: string;
  min: number;
  max: number;
  cost: number;
}

const fastleddTrinn: Fastledd[] = [
  {
    name: 'Trinn 1',
    min: 0,
    max: 2,
    cost: 125,
  },
  {
    name: 'Trinn 2',
    min: 2,
    max: 5,
    cost: 200,
  },
  {
    name: 'Trinn 3',
    min: 5,
    max: 10,
    cost: 325,
  },
  {
    name: 'Trinn 4',
    min: 10,
    max: 15,
    cost: 450,
  },
  {
    name: 'Trinn 5',
    min: 15,
    max: 20,
    cost: 575,
  },
  {
    name: 'Trinn 6',
    min: 20,
    max: 25,
    cost: 700,
  },
  {
    name: 'Trinn 7',
    min: 25,
    max: 50,
    cost: 1325,
  },
  {
    name: 'Trinn 8',
    min: 50,
    max: 75,
    cost: 1950,
  },
  {
    name: 'Trinn 9',
    min: 75,
    max: 100,
    cost: 2575,
  },
  {
    name: 'Trinn 10',
    min: 100,
    max: Number.MAX_SAFE_INTEGER,
    cost: 5150,
  },
];

const energileddDag = 43.1;
const dagStart = 6;
const dagSlutt = 22;
const energileddNatt = 36.85;
const saturday = 6;
const sunday = 0;

const isDaySats = (date: Date): boolean => {
  const day = date.getDay();
  if (saturday === day || sunday === day) {
    return false;
  }
  const hour = date.getHours();
  return dagStart <= hour && hour < dagSlutt;
};

interface Energiledd {
  dag: { consume: number; cost: number };
  natt: { consume: number; cost: number };
}

const getEnergiledd = (month: Month): Energiledd => {
  const initial = {
    dag: { consume: 0 },
    natt: { consume: 0 },
  };
  const { dag, natt } = month.measurements.reduce(
    (total, measurement) => {
      if (isDaySats(new Date(measurement.from))) {
        return {
          ...total,
          dag: {
            consume: total.dag.consume + measurement.consumption,
          },
        };
      }
      return {
        ...total,
        natt: {
          consume: total.natt.consume + measurement.consumption,
        },
      };
    },
    initial
  );
  return {
    dag: {
      consume: dag.consume,
      cost: dag.consume * energileddDag,
    },
    natt: {
      consume: natt.consume,
      cost: natt.consume * energileddNatt,
    },
  };
};

const getFastleddTrinn = (month: Month): Fastledd => {
  const [highest = 0, nextHighest = 0, nextNextHighest = 0] =
    month.measurements
      .map((measurement) => measurement.consumption)
      .sort((a, b) => b - a);

  const averageUsage = (highest + nextHighest + nextNextHighest) / 3;
  const trinn = fastleddTrinn.find(
    (trinn) => trinn.max >= averageUsage
  );
  if (!trinn) {
    throw new Error('Could not find matching fastledd');
  }
  return trinn;
};
