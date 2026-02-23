import { ChartKind, type CartesianSeries } from '@owlplot/core'
import type { ChartDemo } from '../shared/types'
import { sampleFunction } from '../shared/dataGenerators'

const xMin = 1
const xMax = 24
const step = 1
const yCap = 1e7

function log2(n: number): number {
  return Math.log2(n)
}

function factorialCapped(n: number, cap: number): number {
  let value = 1
  for (let i = 2; i <= n; i += 1) {
    value *= i
    if (value >= cap) return cap
  }
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
  { id: 'O(n!)', evaluate: n => factorialCapped(Math.floor(n), yCap) },
] as const

function makeSeries(): CartesianSeries[] {
  return bigODefs.map(def => ({
    id: def.id,
    color: '#111111',
    curve: { type: 'linear' },
    points: sampleFunction(def.evaluate, xMin, xMax, step, { yCap }),
  }))
}

const bandDefs = [
  {
    fill: { type: 'solid', color: '#7bdc2a' as const },
    opacity: 0.78,
    yMin: 1,
    yMax: 10,
  },
  {
    fill: { type: 'solid', color: '#c8ea2d' as const },
    opacity: 0.78,
    yMin: 10,
    yMax: 100,
  },
  {
    fill: { type: 'solid', color: '#fff15c' as const },
    opacity: 0.78,
    yMin: 100,
    yMax: 1000,
  },
  {
    fill: { type: 'solid', color: '#ffc447' as const },
    opacity: 0.78,
    yMin: 1000,
    yMax: 100000,
  },
  {
    fill: { type: 'solid', color: '#ef8f87' as const },
    opacity: 0.78,
    yMin: 100000,
    yMax: 10000000,
  },
] as const

const annotationDefs = [
  { text: 'Excellent', x: 20, y: 3, align: 'center' as const },
  { text: 'Good', x: 20, y: 30, align: 'center' as const },
  { text: 'Fair', x: 20, y: 300, align: 'center' as const },
  { text: 'Bad', x: 20, y: 30000, align: 'center' as const },
  { text: 'Horrible', x: 20, y: 3000000, align: 'center' as const },
  { text: 'O(1)', x: 22, y: 1.5, align: 'left' as const },
  { text: 'O(log n)', x: 20, y: 5, align: 'left' as const },
  { text: 'O(n)', x: 22, y: 30, align: 'left' as const },
  { text: 'O(n log n)', x: 18, y: 100, align: 'center' as const },
  { text: 'O(n^2)', x: 12, y: 150, align: 'center' as const },
  { text: 'O(2^n)', x: 5, y: 150, align: 'center' as const },
  { text: 'O(n!)', x: 3, y: 150, align: 'center' as const },
] as const

export const complexityCharts: readonly ChartDemo[] = [
  {
    id: 'big-o-complexity-poster',
    title: 'Big-O Complexity Chart',
    description:
      'Poster-style comparison using log-scale y-axis, threshold bands, and annotation labels.',
    purpose: 'visual-regression',
    config: {
      kind: ChartKind.LINE,
      series: makeSeries(),
      options: {
        showPoints: false,
        xLabel: 'Elements',
        yLabel: 'Operations',
        xScale: { type: 'linear' },
        yScale: { type: 'log', base: 10 },
        yDomain: { mode: 'fixed', min: 1, max: 1e7 },
        bands: bandDefs.map(band => ({ ...band })),
        annotations: annotationDefs.map(annotation => ({
          ...annotation,
          style: {
            fill: { type: 'solid', color: '#111111' as const },
            fontSizePx: 14,
            fontWeight: 500,
          },
        })),
      },
    },
    renderOptions: {
      legend: false,
    },
  },
] as const
