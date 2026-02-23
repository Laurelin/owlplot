import { ChartKind, type CartesianSeries } from '@owlplot/core'
import type { ChartDemo } from '../shared/types'
import { sampleFunction } from '../shared/dataGenerators'
import {
  injectBigOWedgeBackgroundTransform,
  styleBigOPosterTransform,
} from './bigOTransforms'

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

const annotationDefs = [
  { text: 'O(n!)', x: 1.9, y: 5_000_000, align: 'left' as const },
  { text: 'O(2^n)', x: 3.4, y: 5_000_000, align: 'left' as const },
  { text: 'O(n^2)', x: 8.0, y: 3_500_000, align: 'left' as const },
  { text: 'O(n log n)', x: 19.5, y: 15_000, align: 'center' as const },
  { text: 'O(n)', x: 23.2, y: 120, align: 'left' as const },
  { text: 'O(log n), O(1)', x: 21.4, y: 2.4, align: 'left' as const },
] as const

export const complexityCharts: readonly ChartDemo[] = [
  {
    id: 'big-o-complexity-poster',
    title: 'Big-O Complexity Chart',
    description:
      'Poster-style comparison using log-scale y-axis, origin wedges, and annotation labels.',
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
        axisVisibility: {
          ticks: false,
          tickLabels: false,
          axisLine: true,
        },
        annotations: annotationDefs.map(annotation => ({
          ...annotation,
          style: {
            fill: { type: 'solid', color: '#111111' as const },
            fontSizePx: 15,
            fontWeight: 500,
          },
        })),
      },
    },
    sceneTransforms: [injectBigOWedgeBackgroundTransform, styleBigOPosterTransform],
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
