export interface Measurement {
  from: string;
  to: string;
  cost: number;
  unitPrice: number;
  unitPriceVAT: number;
  consumption: number;
  consumptionUnit: 'kWh';
}

export interface Month {
  month: number;
  monthName: string;
  measurements: Measurement[];
}
