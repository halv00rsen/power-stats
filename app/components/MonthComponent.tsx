import type { Measurement, Month } from '~/utils/types';
import type { LinksFunction } from '@remix-run/node';
import {
  getMonthlyInformation,
  getStromstotteConfig,
  TIBBER_FASTPRIS_KR,
  toKronerPostfix,
} from '~/utils/strom-utils';
import styles from './MonthComponent.css';
import { countUniqueDays } from '~/utils/date-utils';
import { MeasurementsTable } from './MeasurementsTable';

const getLastRegisteredHour = (
  measurements: Measurement[]
): Measurement => {
  return measurements[measurements.length - 1];
};

export const links: LinksFunction = () => {
  return [{ rel: 'stylesheet', href: styles }];
};

interface Props {
  month: Month;
}

export const MonthComponent = ({ month }: Props) => {
  const { monthName, year } = month;

  const {
    totalUsage: { consumption, cost },
    nettleie: { fastledd, energiledd },
    bruktSpotpris,
    spotpris,
    stromstotte,
    totalCost,
    totalNettleie,
  } = getMonthlyInformation({ month, year });

  const numDaysCounted = countUniqueDays(
    month.measurements.map(({ from }) => new Date(from))
  );

  const lastRegisteredMeasurement = getLastRegisteredHour(
    month.measurements
  );

  const stromstotteConfig = getStromstotteConfig({
    month: monthName,
    year,
  });

  return (
    <div className="wrapper">
      <section>
        <h3>Strømforbruk for {monthName}</h3>
        <dl>
          <dt>
            <strong>Kostnad for {monthName}</strong>
          </dt>
          <dd>
            {cost.visual} ({consumption.visual})
          </dd>
          <dt>
            <strong>Data frem til</strong>
          </dt>
          <dd>
            {new Date(lastRegisteredMeasurement.to).toLocaleString(
              'no-NB'
            )}
          </dd>
        </dl>
      </section>

      <section>
        <h3>Spotpriser</h3>
        <p>
          For {monthName} gis støtte på{' '}
          {stromstotteConfig.percentage * 100}% av gjennomsnittlig
          spotpris over {stromstotteConfig.stotteFromKroner * 100} øre
          opptil et forbruk på {stromstotteConfig.maxNumKwh} kwh.
        </p>
        <table className="spotpriser">
          <thead>
            <tr>
              <th></th>
              <th>Med mva</th>
              <th>Uten mva</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Spotpris</td>
              <td>{spotpris.medMva.visual}</td>
              <td>{spotpris.utenMva.visual}</td>
            </tr>
            <tr>
              <td>Forbruk snitt</td>
              <td>{bruktSpotpris.medMva.visual}</td>
              <td>{bruktSpotpris.utenMva.visual}</td>
            </tr>
          </tbody>
        </table>
      </section>
      <section>
        <h3>Strømforbruk</h3>
        <dl className="container">
          <dt>Totalpris for {monthName}</dt>
          <dd>{cost.visual}</dd>
          <dt>Estimert stønad</dt>
          <dd>- {stromstotte.visual}</dd>
          <dt>Faktisk strømkostnad</dt>
          <dd>{cost.roundedValue - stromstotte.roundedValue} kr</dd>
        </dl>
      </section>
      <section>
        <h3>Nettleie</h3>
        <dl className="container">
          <dt>Fastledd {fastledd.name}</dt>
          <dd>{fastledd.cost.visual}</dd>
          <dt>Energiledd dag ({energiledd.dag.consume.visual})</dt>
          <dd>{energiledd.dag.cost.visual}</dd>
          <dt>Energiledd natt ({energiledd.natt.consume.visual})</dt>
          <dd>{energiledd.natt.cost.visual}</dd>
        </dl>
      </section>

      <section>
        <h3>Totalkostnader for {monthName}</h3>
        <dl className="container">
          <dt>Fastpris Tibber</dt>
          <dd>{TIBBER_FASTPRIS_KR} kr</dd>
          <dt>Sum nettleie</dt>
          <dd>{totalNettleie.visual}</dd>
          <dt>Strømkostnader</dt>
          <dd>{cost.visual}</dd>
          <dt>Strømstønad</dt>
          <dd>- {stromstotte.visual}</dd>
          <dt>Sum</dt>
          <dd>{totalCost.visual}</dd>
        </dl>
      </section>

      <section>
        <h3>Kostnader per dag ({numDaysCounted} dager totalt)</h3>
        <dl className="container">
          <dt>Kost</dt>
          <dd>
            {toKronerPostfix(totalCost.rawValue / numDaysCounted)}
          </dd>
        </dl>
      </section>

      <MeasurementsTable
        measurements={month.measurements}
        spotWithoutMva={spotpris.utenMva}
      />
    </div>
  );
};
