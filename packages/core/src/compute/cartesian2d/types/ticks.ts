export type TickFormatter = (value: number) => string;

export interface TickSpec {
  values: number[];
  formatter: TickFormatter;
}
