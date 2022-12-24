import { getFullDateString } from '~/utils/date-utils';
import type { UnitValue } from '~/utils/strom-utils';
import { toKronerPostfix, toOerePerKwh } from '~/utils/strom-utils';
import type { Measurement } from '~/utils/types';

const countByDay = (measurements: Measurement[]) => {
  const inital: {
    [day: string]: { usage: number; cost: number; vat: number };
  } = {};
  const data = measurements.reduce((data, measurement) => {
    const day = getFullDateString(measurement.from);
    if (data[day]) {
      return {
        ...data,
        [day]: {
          usage: data[day].usage + measurement.consumption,
          cost: data[day].cost + measurement.cost,
          vat:
            data[day].vat +
            measurement.unitPriceVAT * measurement.consumption,
        },
      };
    }
    return {
      ...data,
      [day]: {
        usage: measurement.consumption,
        cost: measurement.cost,
        vat: measurement.unitPriceVAT * measurement.consumption,
      },
    };
  }, inital);
  return Object.entries(data).map(([key, data]) => ({
    ...data,
    date: key,
  }));
};

interface Props {
  measurements: Measurement[];
  spotWithoutMva: UnitValue<'oere per kwh'>;
}

export const MeasurementsTable = ({
  measurements,
  spotWithoutMva,
}: Props) => {
  return (
    <section className="day-overview">
      <h3>Per dag</h3>
      <table>
        <thead>
          <tr>
            <th></th>
            <th>Kostnad</th>
            <th>Bruk</th>
            <th>Forbruk</th>
            <th>Stønad</th>
            <th>Faktisk</th>
          </tr>
        </thead>
        <tbody>
          {countByDay(measurements)
            .sort((one, two) => {
              return one.date < two.date ? 1 : -1;
            })
            .map((entry) => {
              const estimatedAllowance = Math.round(
                (spotWithoutMva.rawValue / 100 - 0.7) *
                  0.9 *
                  entry.usage *
                  1.25
              );
              const diff = entry.cost - estimatedAllowance;
              return (
                <tr key={entry.date}>
                  <td>{entry.date}</td>
                  <td>{toKronerPostfix(entry.cost)}</td>
                  <td>{Math.round(entry.usage)} kwh</td>
                  <td>{toOerePerKwh(entry.cost / entry.usage)}</td>
                  <td>{toKronerPostfix(estimatedAllowance)}</td>
                  <td className={diff > 0 ? 'red' : 'green'}>
                    {toKronerPostfix(diff)}
                  </td>
                </tr>
              );
            })}
        </tbody>
      </table>
    </section>
  );
};
