import { btoa } from '@remix-run/node/dist/base64';
import { getCachedMeasurements, saveCache } from './cache.server';
import type { MonthName } from './date-utils';
import { getMonthIndex, getMonthQueryInfo } from './date-utils';
import type { Measurement } from './types';

const tibberEndpointGraphQl = 'https://api.tibber.com/v1-beta/gql';
const accessKey = process.env.TIBBER_ACCESS_KEY;

async function getTibberData<Type>(query: string): Promise<Type> {
  const request = await fetch(tibberEndpointGraphQl, {
    body: JSON.stringify({ query }),
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessKey}`,
    },
    method: 'POST',
  });
  const { data } = await request.json();
  return data;
}

interface User {
  login: string;
  name: string;
}

export async function getUser(): Promise<User> {
  const user: User = (await getTibberData<any>('{ viewer { name }}'))
    .viewer;
  return user;
}

export async function getCurrentPrice(): Promise<number> {
  return 1;
}

interface ConsumptionResponse {
  viewer: {
    homes: {
      consumption: {
        nodes: Measurement[];
      };
    }[];
  };
}

function buildConsumptionQuery(numHours: number, after: string) {
  return `{
    viewer {
      homes {
        consumption(resolution: HOURLY, first: ${numHours}, after: "${after}") {
          nodes {
            from
            to
            cost
            unitPrice
            unitPriceVAT
            consumption
            consumptionUnit
          }
        }
      }
    }
  }`;
}

const getMeasurements = async (
  query: string
): Promise<Measurement[]> => {
  const response = await getTibberData<ConsumptionResponse>(query);
  const home = response.viewer.homes[0];
  if (home) {
    return home.consumption.nodes;
  }
  return [];
};

const getDataForMonth = async (month: MonthName) => {
  const { date, numDays } = getMonthQueryInfo(month);
  const query = buildConsumptionQuery(
    numDays * 24,
    btoa(date.toISOString())
  );
  const cached = await getCachedMeasurements(month);
  if (cached && cached.length > 0) {
    return cached;
  }
  const measurements = await getMeasurements(query);
  saveCache(month, measurements);
  return measurements;
};

export interface MonthConsumption {
  month: number;
  monthName: string;
  measurements: Measurement[];
}

export async function getCurrentMonthConsumption(
  monthName: MonthName
): Promise<MonthConsumption> {
  return {
    month: getMonthIndex(monthName),
    monthName,
    measurements: await getDataForMonth(monthName),
  };
}
