import { ChartKind, type CartesianSeries } from '@owlplot/core'
import type { ChartDemo } from '../shared/types'
import { sampleFunction } from '../shared/dataGenerators'
import {
  injectBigOWedgeBackgroundTransform,
  styleBigOPosterTransform,
} from './bigOTransforms'
import { createBigOPosterSeries } from './bigOPosterSeries'

const mathDomain = { xMin: 1, xMax: 24, step: 1 } as const
const yCap = 1e7

function log10(n: number): number {
  return Math.log10(n)
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
  { id: 'O(log n)', evaluate: n => 1 + log10(n) },
  { id: 'O(n)', evaluate: n => n },
  { id: 'O(n log n)', evaluate: n => n * log10(n) },
  { id: 'O(n^2)', evaluate: n => n * n },
  { id: 'O(2^n)', evaluate: n => 2 ** n },
  { id: 'O(n!)', evaluate: n => factorialCapped(Math.floor(n), yCap) },
] as const

function makeMathSeries(): CartesianSeries[] {
  return bigODefs.map(def => ({
    id: def.id,
    color: '#111111',
    curve: { type: 'linear' },
    points: sampleFunction(def.evaluate, mathDomain.xMin, mathDomain.xMax, mathDomain.step, {
      yCap,
    }),
  }))
}

function makePosterSeries(): CartesianSeries[] {
  return createBigOPosterSeries({ sampleCount: 16, bandGap: 0.012 }).map(series => ({
    id: series.id,
    color: '#111111',
    curve: { type: 'linear' },
    points: series.points,
  }))
}

const regionDefs = [
  {
    upperSeriesId: 'O(n!)',
    lowerSeriesId: 'O(2^n)',
    fill: { type: 'solid', color: '#ef8f87' as const },
    opacity: 1,
  },
  {
    upperSeriesId: 'O(2^n)',
    lowerSeriesId: 'O(n^2)',
    fill: { type: 'solid', color: '#f19a8f' as const },
    opacity: 1,
  },
  {
    upperSeriesId: 'O(n^2)',
    lowerSeriesId: 'O(n log n)',
    fill: { type: 'solid', color: '#ffc447' as const },
    opacity: 1,
  },
  {
    upperSeriesId: 'O(n log n)',
    lowerSeriesId: 'O(n)',
    fill: { type: 'solid', color: '#fff15c' as const },
    opacity: 1,
  },
  {
    upperSeriesId: 'O(n)',
    lowerSeriesId: 'O(log n)',
    fill: { type: 'solid', color: '#c8ea2d' as const },
    opacity: 1,
  },
  {
    upperSeriesId: 'O(log n)',
    lowerSeriesId: 'O(1)',
    fill: { type: 'solid', color: '#7bdc2a' as const },
    opacity: 1,
  },
] as const

const mathAnnotations = [
  { text: 'O(1)', x: 23, y: 1.1, align: 'right' as const },
  { text: 'O(log n)', x: 23, y: 2.2, align: 'right' as const },
  { text: 'O(n)', x: 23, y: 22, align: 'right' as const },
  { text: 'O(n log n)', x: 20, y: 80, align: 'right' as const },
  { text: 'O(n^2)', x: 10, y: 100, align: 'left' as const },
  { text: 'O(2^n)', x: 4.2, y: 120, align: 'left' as const },
  { text: 'O(n!)', x: 2.2, y: 130, align: 'left' as const },
  { text: 'Excellent', x: 20, y: 3.2, align: 'center' as const },
  { text: 'Good', x: 20, y: 35, align: 'center' as const },
  { text: 'Fair', x: 20, y: 330, align: 'center' as const },
  { text: 'Bad', x: 20, y: 15000, align: 'center' as const },
  { text: 'Horrible', x: 20, y: 2_000_000, align: 'center' as const },
] as const

export const complexityCharts: readonly ChartDemo[] = [
  {
    id: 'big-o-complexity-math',
    title: 'Complexity (Math)',
    description:
      'Magnitude-oriented comparison using log-scale y-axis with mathematically sampled growth functions.',
    purpose: 'visual-regression',
    config: {
      kind: ChartKind.LINE,
      series: makeMathSeries(),
      options: {
        showPoints: false,
        xLabel: 'Elements',
        yLabel: 'Operations',
        xScale: { type: 'linear' },
        yScale: { type: 'log', base: 10 },
        yDomain: { mode: 'fixed', min: 1, max: 1e7 },
        regions: regionDefs.map(region => ({ ...region })),
        annotations: mathAnnotations.map(annotation => ({
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
  {
    id: 'big-o-complexity-poster',
    title: 'Complexity (Poster)',
    description:
      'Conceptual ranking illustration with normalized series, wedge background bands, and suppressed quantitative ticks.',
    purpose: 'visual-regression',
    config: {
      kind: ChartKind.LINE,
      series: makePosterSeries(),
      options: {
        showPoints: false,
        xLabel: 'Input Size (n)',
        yLabel: 'Relative Growth (Conceptual)',
        xScale: { type: 'linear' },
        yScale: { type: 'linear' },
        xTickCount: 0,
        yTickCount: 0,
        yDomain: { mode: 'fixed', min: 0, max: 1 },
        axisVisibility: {
          ticks: false,
          tickLabels: false,
          axisLine: true,
        },
      },
    },
    sceneTransforms: [injectBigOWedgeBackgroundTransform, styleBigOPosterTransform],
    renderOptions: {
      legend: false,
    },
  },
] as const
