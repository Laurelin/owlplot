import { ChartKind } from '@owlplot/core'
import type { ChartDemo } from '../shared/types'
import { sampleFunction } from '../shared/dataGenerators'

const xMin = 1
const xMax = 24
const step = 1
const yCap = 1e7

function log10(n: number): number {
  return Math.log10(n)
}

function factorialCapped(n: number, cap: number): number {
  let value = 1
  for (let i = 2; i <= n; i++) {
    value *= i
    if (value >= cap) return cap
  }
  return value
}

const annotationDefs = [
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

export const complexityCharts: readonly ChartDemo[] = [
  {
    id: 'big-o-complexity-poster',
    title: 'Big-O Complexity Chart',
    description:
      'Poster-style comparison using log-scale y-axis, between-series regions, and annotation labels.',
    purpose: 'visual-regression',
    config: {
      kind: ChartKind.LINE,
      series: [
        {
          id: 'O(1)',
          color: '#111111',
          points: sampleFunction(() => 1, xMin, xMax, step, { yCap }),
        },
        {
          id: 'O(log n)',
          color: '#111111',
          points: sampleFunction(n => 1 + log10(n), xMin, xMax, step, { yCap }),
        },
        {
          id: 'O(n)',
          color: '#111111',
          points: sampleFunction(n => n, xMin, xMax, step, { yCap }),
        },
        {
          id: 'O(n log n)',
          color: '#111111',
          points: sampleFunction(n => n * log10(n), xMin, xMax, step, { yCap }),
        },
        {
          id: 'O(n^2)',
          color: '#111111',
          points: sampleFunction(n => n * n, xMin, xMax, step, { yCap }),
        },
        {
          id: 'O(2^n)',
          color: '#111111',
          points: sampleFunction(n => 2 ** n, xMin, xMax, step, { yCap }),
        },
        {
          id: 'O(n!)',
          color: '#111111',
          points: sampleFunction(n => factorialCapped(Math.floor(n), yCap), xMin, xMax, step, {
            yCap,
          }),
        },
      ],
      options: {
        showPoints: false,
        xLabel: 'Elements',
        yLabel: 'Operations',
        xScale: { type: 'linear' },
        yScale: { type: 'log', base: 10 },
        yDomain: { mode: 'fixed', min: 1, max: 1e7 },
        regions: regionDefs.map(region => ({ ...region })),
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
