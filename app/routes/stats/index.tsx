import type {
  HeadersFunction,
  LinksFunction,
  LoaderArgs,
} from '@remix-run/node';
import { json } from '@remix-run/node';
import {
  Form,
  useLoaderData,
  useSubmit,
  useTransition,
} from '@remix-run/react';
import {
  MonthComponent,
  links as monthStyles,
} from '~/components/MonthComponent';
import {
  getMonthName,
  isValidMonth,
  MONTH_NAMES,
} from '~/utils/date-utils';
import type { MonthConsumption } from '~/utils/tibber-api.server';
import { getCurrentMonthConsumption } from '~/utils/tibber-api.server';

const getValidYears = (): number[] => {
  const years = [2020];
  const today = new Date();
  for (let year = years[0] + 1; year <= today.getFullYear(); year++) {
    years.push(year);
  }
  return years;
};

const isAuthorized = (request: LoaderArgs['request']) => {
  const header = request.headers.get('Authorization');

  if (!header) {
    return false;
  }

  if (!process.env.USERNAME || !process.env.PASSWORD) {
    throw new Response(
      'Server is not configured with authentication',
      {
        status: 500,
      }
    );
  }

  const base64 = header.replace('Basic ', '');
  const [username, password] = Buffer.from(base64, 'base64')
    .toString()
    .split(':');

  return (
    username === process.env.USERNAME &&
    password === process.env.PASSWORD
  );
};

export const headers: HeadersFunction = () => {
  return {
    'WWW-Authenticate': 'Basic',
  };
};

export const links: LinksFunction = () => {
  return [...monthStyles()];
};

export async function loader({ request }: LoaderArgs) {
  if (!isAuthorized(request)) {
    return json(
      { type: 'error' },
      {
        status: 401,
        statusText: 'ingen tilgang',
      }
    );
  }
  const url = new URL(request.url);
  const today = new Date();
  const month = url.searchParams.get('month') || getMonthName(today);
  const year =
    parseInt(url.searchParams.get('year') || '') ||
    today.getFullYear();

  if (
    month &&
    isValidMonth(month) &&
    !isNaN(year) &&
    getValidYears().includes(year)
  ) {
    const data = await getCurrentMonthConsumption({
      monthName: month,
      year,
    });
    return json({ data, type: 'success' });
  }
  return json(
    { type: 'error' },
    {
      status: 404,
      statusText: 'Fant ikke noe data for denne måneden',
    }
  );
}

const isMonthResponse = (
  data: unknown
): data is { type: 'success'; data: MonthConsumption } => {
  return (data as { type: string }).type === 'success';
};

export default function Index() {
  const submit = useSubmit();

  const loaderData = useLoaderData<typeof loader>();
  const transition = useTransition();
  if (!isMonthResponse(loaderData)) {
    return <div>En feil skjedde</div>;
  }

  const { data: month } = loaderData;

  return (
    <div>
      <Form
        method="get"
        onChange={(event) => submit(event.currentTarget)}
      >
        <select
          name="month"
          defaultValue={month.monthName}
          disabled={transition.state !== 'idle'}
        >
          {MONTH_NAMES.map((monthName) => (
            <option key={monthName} value={monthName}>
              {monthName}
            </option>
          ))}
        </select>
        <select
          name="year"
          defaultValue={month.year}
          disabled={transition.state !== 'idle'}
        >
          {getValidYears().map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </Form>
      {month.measurements.length === 0 ? (
        <div>Klarte ikke finne noe data for denne måneden.</div>
      ) : (
        <MonthComponent month={month} />
      )}
    </div>
  );
}
