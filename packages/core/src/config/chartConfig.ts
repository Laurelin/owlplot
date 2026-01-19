export type ChartKind = "line"; // expand later

export type DataPoint = { x: number; y: number | null };

export type LineSeries = {
  id: string;
  points: DataPoint[];
};

export type Padding = { top: number; right: number; bottom: number; left: number };

export type Cartesian2DOptions = {
  xLabel?: string;
  yLabel?: string;
  showGrid?: boolean;
  showPoints?: boolean;
  padding?: Partial<Padding>;
};

export type LineChartOptions = Cartesian2DOptions & {
  curve?: "linear"; // expand later
};

export type LineChartConfig = {
  kind: "line";
  series: LineSeries[];
  options?: LineChartOptions;
};

export type ChartConfig = LineChartConfig;
