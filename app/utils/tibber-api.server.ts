import { Response } from '@remix-run/node';
import { btoa } from '@remix-run/node/dist/base64';
import { getCachedMeasurements, saveCache } from './cache.server';
import { FullYear, MonthName, YearDiff, yearDiffToYear } from './date-utils';
import { cacheIsUpToDate } from './date-utils';
import { getMonthIndex, getMonthQueryInfo } from './date-utils';
import type { Measurement } from './types';

const tibberFetchTimeout = 10000;

const tibberEndpointGraphQl = 'https://api.tibber.com/v1-beta/gql';
const accessKey = process.env.TIBBER_ACCESS_KEY;

async function getTibberData<Type>(query: string): Promise<Type> {
  if (!accessKey) {
    throw new Response(
      'Server is misconfigured. Missing access token for Tibber',
      { status: 500 }
    );
  }
  const request = await fetch(tibberEndpointGraphQl, {
    body: JSON.stringify({ query }),
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessKey}`,
    },
    method: 'POST',
    signal: AbortSignal.timeout(tibberFetchTimeout),
  });
  if (!request.ok) {
    throw new Response('Error fetching data from Tibber', {
      status: request.status,
      statusText: request.statusText,
    });
  }
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

function buildConsumptionQuery({
  numDays,
  after,
}: {
  numDays: number;
  after: Date;
}) {
  const encodedDate = btoa(after.toISOString());
  const numHours = numDays * 24;
  return `{
    viewer {
      homes {
        consumption(resolution: HOURLY, first: ${numHours}, after: "${encodedDate}") {
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

const getDataForMonth = async (month: MonthName, yearNum: YearDiff) => {
  const query = buildConsumptionQuery(getMonthQueryInfo(month, yearNum));
  const cached = await getCachedMeasurements(month, yearNum);
  let fullYear: FullYear = yearDiffToYear(yearNum)
  if (cached && cached.length > 0 && cacheIsUpToDate(month, cached, yearNum)) {
    console.log(`Using cache for ${month} ${fullYear}`);
    return cached;
  }
  console.log(`Fetching new measurements for ${month} ${fullYear}`);
  const measurements = (await getMeasurements(query)).filter(
    ({ cost, consumption }) => cost != null && consumption != null
  );

  saveCache(month, measurements, yearNum);

  return measurements;
};

export interface MonthConsumption {
  year: YearDiff,
  month: number;
  monthName: string;
  measurements: Measurement[];
}

export async function getCurrentMonthConsumption(
  monthName: MonthName,
  year: YearDiff
): Promise<MonthConsumption> {
  if (!accessKey) {
    throw new Response(
      'Server is misconfigured. Missing access token for Tibber',
      { status: 500 }
    );
  }
  return {
    year,
    month: getMonthIndex(monthName),
    monthName,
    measurements: await getDataForMonth(monthName, year),
  };
}
