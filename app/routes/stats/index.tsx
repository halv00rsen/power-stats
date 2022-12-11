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
  getMonthIndex,
  getMonthName,
  isValidMonth,
  MONTH_NAMES,
} from '~/utils/date-utils';
import type { MonthConsumption } from '~/utils/tibber-api.server';
import { getCurrentMonthConsumption } from '~/utils/tibber-api.server';

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
    'custom-header': 'somehtig',
  };
};

export const links: LinksFunction = () => {
  return [...monthStyles()];
};

export async function loader({ request }: LoaderArgs) {
  const url = new URL(request.url);
  const month =
    url.searchParams.get('month') || getMonthName(new Date());

  if (!isAuthorized(request)) {
    return json(
      { type: 'error' },
      {
        status: 401,
        statusText: 'ingen tilgang',
      }
    );
  }

  if (month && isValidMonth(month)) {
    try {
      const data = await getCurrentMonthConsumption(month);
      return json({ data, type: 'success' });
    } catch {
      return json({
        type: 'success',
        data: {
          monthName: month,
          month: getMonthIndex(month),
          measurements: [],
        },
      });
    }
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
      </Form>
      {month.measurements.length === 0 ? (
        <div>Klarte ikke finne noe data for denne måneden.</div>
      ) : (
        <MonthComponent month={month} />
      )}
    </div>
  );
}
