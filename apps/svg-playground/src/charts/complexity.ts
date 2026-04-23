import { ChartKind, type CartesianSeries } from '@owlplot/core'
import type { ChartDemo } from '../shared/types'
import { sampleFunction } from '../shared/dataGenerators'

const xMin = 1
const xMax = 24
const step = 1
const yMin = 1
const yMax = 3000

function log2(n: number): number {
  return Math.log2(n)
}

function factorial(n: number): number {
  let value = 1
  for (let i = 2; i <= n; i += 1) value *= i
  return value
}

type BigOSeriesDef = {
  readonly id: string
  readonly evaluate: (n: number) => number
}

const bigODefs: readonly BigOSeriesDef[] = [
  { id: 'O(1)', evaluate: () => 1 },
  { id: 'O(log n)', evaluate: n => log2(n) },
  { id: 'O(n)', evaluate: n => n },
  { id: 'O(n log n)', evaluate: n => n * log2(n) },
  { id: 'O(n^2)', evaluate: n => n * n },
  { id: 'O(2^n)', evaluate: n => 2 ** n },
  { id: 'O(n!)', evaluate: n => factorial(Math.floor(n)) },
] as const

function makeSeries(): CartesianSeries[] {
  return bigODefs.map(def => ({
    id: def.id,
    color: '#111111',
    curve: { type: 'linear' },
    points: sampleFunction(def.evaluate, xMin, xMax, step),
  }))
}

export function getYAtX(
  points: readonly { x: number; y: number | null }[],
  x: number
): number {
  if (points.length === 0) return yMin
  const exact = points.find(point => point.x === x && point.y != null)
  if (exact?.y != null) return exact.y

  for (let i = 1; i < points.length; i += 1) {
    const prev = points[i - 1]!
    const next = points[i]!
    if (prev.y == null || next.y == null) continue
    if (x < prev.x || x > next.x) continue
    if (next.x === prev.x) return next.y
    const t = (x - prev.x) / (next.x - prev.x)
    return prev.y + (next.y - prev.y) * t
  }

  const rightmost = [...points].reverse().find(point => point.y != null)
  return rightmost?.y ?? yMin
}

function clampY(value: number): number {
  return Math.max(yMin, Math.min(yMax, value))
}

function makeAnnotations(seriesList: readonly CartesianSeries[]) {
  const byId = new Map(seriesList.map(series => [series.id, series] as const))
  const yFor = (id: string, x: number): number =>
    clampY(getYAtX(byId.get(id)?.points ?? [], x))

  return [
    { text: 'O(n!)', x: 2.1, y: yFor('O(n!)', 2.1), align: 'left' as const },
    { text: 'O(2^n)', x: 3.5, y: yFor('O(2^n)', 3.5), align: 'left' as const },
    { text: 'O(n^2)', x: 8.8, y: yFor('O(n^2)', 8.8), align: 'left' as const },
    {
      text: 'O(n log n)',
      x: 18.5,
      y: yFor('O(n log n)', 18.5),
      align: 'center' as const,
    },
    { text: 'O(n)', x: 22.2, y: yFor('O(n)', 22.2), align: 'left' as const },
    {
      text: 'O(log n), O(1)',
      x: 20.8,
      y: yFor('O(log n)', 20.8),
      align: 'left' as const,
    },
  ] as const
}

const series = makeSeries()
const annotationDefs = makeAnnotations(series)

export const complexityCharts: readonly ChartDemo[] = [
  {
    id: 'big-o-complexity-poster',
    title: 'Big-O Complexity Chart',
    description:
      'Data-derived dominance regions with piecewise boundaries between complexity curves.',
    purpose: 'visual-regression',
    config: {
      kind: ChartKind.LINE,
      series,
      options: {
        showPoints: false,
        xLabel: 'Elements',
        yLabel: 'Operations',
        xScale: { type: 'linear' },
        yScale: { type: 'linear' },
        yDomain: { mode: 'fixed', min: yMin, max: yMax },
        axisVisibility: {
          ticks: false,
          tickLabels: false,
          axisLine: true,
        },
        regions: [
          {
            upper: { type: 'plotTop' },
            lower: { type: 'series', id: 'O(n!)' },
            fill: { type: 'solid', color: '#ef8f87' },
            opacity: 0.85,
          },
          {
            upper: { type: 'series', id: 'O(log n)' },
            lower: { type: 'plotBottom' },
            fill: { type: 'solid', color: '#19cc2a' },
            opacity: 0.85,
          },
        ],
        dominanceRegions: {
          seriesIds: [
            'O(1)',
            'O(log n)',
            'O(n)',
            'O(n log n)',
            'O(n^2)',
            'O(2^n)',
            'O(n!)',
          ],
          fills: [
            { type: 'solid', color: '#7ed527' },
            { type: 'solid', color: '#b9e11d' },
            { type: 'solid', color: '#f6ef13' },
            { type: 'solid', color: '#ffc107' },
            { type: 'solid', color: '#f4a060' },
            { type: 'solid', color: '#ef8f87' },
          ],
          opacity: 0.8,
          tieBreak: 'stable-input',
        },
        annotations: annotationDefs.map(annotation => ({
          ...annotation,
          style: {
            fill: { type: 'solid', color: '#111111' as const },
            fontSizePx: annotation.text.startsWith('O(n!)') ? 14 : 15,
            fontWeight: 500,
          },
        })),
      },
    },
    renderOptions: {
      legend: false,
      tooltip: null,
    },
    meta: {
      badges: [
        { label: 'Horrible', color: '#ef8f87' },
        { label: 'Bad', color: '#ffc107' },
        { label: 'Fair', color: '#f6ef13' },
        { label: 'Good', color: '#b9e11d' },
        { label: 'Excellent', color: '#19cc2a' },
      ],
    },
  },
] as const
