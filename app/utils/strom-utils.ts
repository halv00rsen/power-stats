import type { MonthName } from './date-utils';
import type { Measurement, Month } from './types';

export const TIBBER_FASTPRIS_KR = 39;

const PAASLAG_PER_KWH = 0.01;
const EL_AVGIFT_PER_KWH = 15.41;

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

type Unit = 'kroner' | 'oere' | 'oere per kwh' | 'kwh';

export type UnitValue<U extends Unit> = {
  roundedValue: number;
  rawValue: number;
  visual: string;
  unit: U;
};

interface MontlyTotal extends Omit<Month, 'measurements'> {
  totalUsage: {
    consumption: UnitValue<'kwh'>;
    cost: UnitValue<'kroner'>;
  };
  nettleie: {
    fastledd: Fastledd;
    energiledd: Energiledd;
  };
  spotpris: {
    medMva: UnitValue<'oere per kwh'>;
    utenMva: UnitValue<'oere per kwh'>;
  };
  bruktSpotpris: {
    medMva: UnitValue<'oere per kwh'>;
    utenMva: UnitValue<'oere per kwh'>;
  };
  stromstotte: UnitValue<'kroner'>;
  totalCost: UnitValue<'kroner'>;
  totalNettleie: UnitValue<'kroner'>;
}

export const getMonthlyInformation = ({
  month,
  year,
}: {
  month: Month;
  year: number;
}): MontlyTotal => {
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

  const stromstotteConfig = getStromstotteConfig({
    month: monthName,
    year,
  });

  const numEntries = measurements.length;
  const measurementAverage: Measurement = {
    ...measurementTotal,
    consumption: measurementTotal.consumption,
    cost: measurementTotal.cost,
    unitPrice: measurementTotal.unitPrice / numEntries,
    unitPriceVAT: measurementTotal.unitPriceVAT / numEntries,
  };

  const spotprisMedMva =
    measurementAverage.unitPrice - PAASLAG_PER_KWH;
  const spotprisUtenMva =
    spotprisMedMva - measurementAverage.unitPriceVAT;
  const stromstotte =
    (spotprisUtenMva - stromstotteConfig.stotteFromKroner) *
    stromstotteConfig.percentage *
    Math.min(
      measurementAverage.consumption,
      stromstotteConfig.maxNumKwh
    ) *
    1.25;

  const fastledd = getFastleddTrinn(month);
  const energiledd = getEnergiledd(month);
  const totalNettleie =
    energiledd.dag.cost.rawValue +
    energiledd.natt.cost.rawValue +
    fastledd.cost.rawValue;

  const totalCost =
    TIBBER_FASTPRIS_KR +
    totalNettleie +
    measurementAverage.cost -
    stromstotte;

  const utenPaaslag =
    measurementAverage.cost -
    PAASLAG_PER_KWH * measurementAverage.consumption -
    (EL_AVGIFT_PER_KWH / 100) * measurementAverage.consumption;
  const bruktSpotprisMedMva =
    utenPaaslag / measurementAverage.consumption;
  const bruktSpotprisUtenMva = bruktSpotprisMedMva * 0.8;

  return {
    month: monthNumber,
    monthName,
    totalUsage: {
      cost: {
        rawValue: measurementAverage.cost,
        roundedValue: Math.round(measurementAverage.cost),
        visual: toKronerPostfix(measurementAverage.cost),
        unit: 'kroner',
      },
      consumption: {
        rawValue: measurementAverage.consumption,
        roundedValue: Math.round(measurementAverage.consumption),
        visual: `${Math.round(measurementAverage.consumption)} ${
          measurementAverage.consumptionUnit
        }`,
        unit: 'kwh',
      },
    },
    nettleie: {
      fastledd: getFastleddTrinn(month),
      energiledd: getEnergiledd(month),
    },
    spotpris: {
      medMva: {
        rawValue: spotprisMedMva * 100,
        roundedValue: Math.round(spotprisMedMva * 100),
        visual: toOerePerKwh(spotprisMedMva),
        unit: 'oere per kwh',
      },
      utenMva: {
        rawValue: spotprisUtenMva * 100,
        roundedValue: Math.round(spotprisUtenMva * 100),
        visual: toOerePerKwh(spotprisUtenMva),
        unit: 'oere per kwh',
      },
    },
    bruktSpotpris: {
      medMva: {
        rawValue: bruktSpotprisMedMva * 100,
        roundedValue: Math.round(bruktSpotprisMedMva * 100),
        visual: toOerePerKwh(bruktSpotprisMedMva),
        unit: 'oere per kwh',
      },
      utenMva: {
        rawValue: bruktSpotprisUtenMva * 100,
        roundedValue: Math.round(bruktSpotprisUtenMva * 100),
        visual: toOerePerKwh(bruktSpotprisUtenMva),
        unit: 'oere per kwh',
      },
    },
    stromstotte: {
      rawValue: stromstotte,
      roundedValue: Math.round(stromstotte),
      visual: toKronerPostfix(stromstotte),
      unit: 'kroner',
    },
    totalCost: {
      rawValue: totalCost,
      roundedValue: Math.round(totalCost),
      visual: toKronerPostfix(totalCost),
      unit: 'kroner',
    },
    totalNettleie: {
      rawValue: totalNettleie,
      roundedValue: Math.round(totalNettleie),
      visual: toKronerPostfix(totalNettleie),
      unit: 'kroner',
    },
    year,
  };
};

export const toOerePerKwh = (kroner: number): string => {
  return `${Math.round(kroner * 100)} øre/kwh`;
};

export const toKronerPostfix = (kroner: number): string => {
  return `${Math.round(kroner)} kr`;
};

interface Fastledd {
  name: string;
  min: number;
  max: number;
  cost: UnitValue<'kroner'>;
}

const fastleddTrinn: Fastledd[] = [
  {
    name: 'Trinn 1',
    min: 0,
    max: 2,
    cost: {
      rawValue: 125,
      roundedValue: 125,
      unit: 'kroner',
      visual: `${125} kr`,
    },
  },
  {
    name: 'Trinn 2',
    min: 2,
    max: 5,
    cost: {
      rawValue: 200,
      roundedValue: 200,
      unit: 'kroner',
      visual: `${200} kr`,
    },
  },
  {
    name: 'Trinn 3',
    min: 5,
    max: 10,
    cost: {
      rawValue: 325,
      roundedValue: 325,
      unit: 'kroner',
      visual: `${325} kr`,
    },
  },
  {
    name: 'Trinn 4',
    min: 10,
    max: 15,
    cost: {
      rawValue: 450,
      roundedValue: 450,
      unit: 'kroner',
      visual: `${450} kr`,
    },
  },
  {
    name: 'Trinn 5',
    min: 15,
    max: 20,
    cost: {
      rawValue: 575,
      roundedValue: 575,
      unit: 'kroner',
      visual: `${575} kr`,
    },
  },
  {
    name: 'Trinn 6',
    min: 20,
    max: 25,
    cost: {
      rawValue: 700,
      roundedValue: 700,
      unit: 'kroner',
      visual: `${700} kr`,
    },
  },
  {
    name: 'Trinn 7',
    min: 25,
    max: 50,
    cost: {
      rawValue: 1325,
      roundedValue: 1325,
      unit: 'kroner',
      visual: `${1325} kr`,
    },
  },
  {
    name: 'Trinn 8',
    min: 50,
    max: 75,
    cost: {
      rawValue: 1950,
      roundedValue: 1950,
      unit: 'kroner',
      visual: `${1950} kr`,
    },
  },
  {
    name: 'Trinn 9',
    min: 75,
    max: 100,
    cost: {
      rawValue: 2575,
      roundedValue: 2575,
      unit: 'kroner',
      visual: `${2575} kr`,
    },
  },
  {
    name: 'Trinn 10',
    min: 100,
    max: Number.MAX_SAFE_INTEGER,
    cost: {
      rawValue: 5150,
      roundedValue: 5150,
      unit: 'kroner',
      visual: `${5150} kr`,
    },
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
  dag: { consume: UnitValue<'kwh'>; cost: UnitValue<'kroner'> };
  natt: { consume: UnitValue<'kwh'>; cost: UnitValue<'kroner'> };
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
      consume: {
        rawValue: dag.consume,
        roundedValue: Math.round(dag.consume),
        visual: `${Math.round(dag.consume)} kwh`,
        unit: 'kwh',
      },
      cost: {
        rawValue: (dag.consume * energileddDag) / 100,
        roundedValue: Math.round((dag.consume * energileddDag) / 100),
        visual: `${Math.round(
          (dag.consume * energileddDag) / 100
        )} kr`,
        unit: 'kroner',
      },
    },
    natt: {
      consume: {
        rawValue: natt.consume,
        roundedValue: Math.round(natt.consume),
        visual: `${Math.round(natt.consume)} kwh`,
        unit: 'kwh',
      },
      cost: {
        rawValue: (natt.consume * energileddNatt) / 100,
        roundedValue: Math.round(
          (natt.consume * energileddNatt) / 100
        ),
        visual: `${Math.round(
          (natt.consume * energileddNatt) / 100
        )} kr`,
        unit: 'kroner',
      },
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

interface Stromstotte {
  month: MonthName;
  year: number;
  percentage: number;
  stotteFromKroner: number;
  maxNumKwh: number;
}

export const getStromstotteConfig = ({
  month,
  year,
}: {
  month: MonthName;
  year: number;
}): Stromstotte => {
  if (year === 2022) {
    return {
      month,
      percentage: 0.9,
      year,
      stotteFromKroner: 0.7,
      maxNumKwh: 5000,
    };
  } else if (year === 2023) {
    switch (month) {
      case 'april':
      case 'mai':
      case 'juni':
      case 'juli':
      case 'august':
      case 'september':
        return {
          maxNumKwh: 5000,
          month,
          percentage: 0.8,
          year,
          stotteFromKroner: 0.7,
        };
      case 'januar':
      case 'februar':
      case 'mars':
      case 'oktober':
      case 'november':
      case 'desember':
      default:
        return {
          maxNumKwh: 5000,
          month,
          percentage: 0.9,
          year,
          stotteFromKroner: 0.7,
        };
    }
  }
  return {
    maxNumKwh: 0,
    month,
    percentage: 0,
    year,
    stotteFromKroner: 0,
  };
};
