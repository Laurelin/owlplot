import { ChartKind } from '@owlplot/core'
import type { ChartDemo } from '../shared/types'

export const colorCharts: readonly ChartDemo[] = [
  {
    id: 'basic-color-usage',
    title: 'Basic Color Usage',
    description: 'Series with simple color property (string)',
    purpose: 'api-example',
    config: {
      kind: ChartKind.LINE,
      series: [
        {
          id: 'sales',
          color: '#3b82f6',
          points: [
            { x: 0, y: 100 },
            { x: 1, y: 120 },
            { x: 2, y: 110 },
            { x: 3, y: 140 },
            { x: 4, y: 130 },
            { x: 5, y: 150 },
          ],
        },
      ],
      options: { showPoints: true },
    },
  },
  {
    id: 'multiple-colors',
    title: 'Multiple Colors',
    description: 'Different colors per series',
    purpose: 'api-example',
    config: {
      kind: ChartKind.LINE,
      series: [
        {
          id: 'revenue',
          color: '#10b981',
          points: [
            { x: 0, y: 50 },
            { x: 1, y: 60 },
            { x: 2, y: 55 },
            { x: 3, y: 70 },
            { x: 4, y: 65 },
            { x: 5, y: 80 },
          ],
        },
        {
          id: 'costs',
          color: '#ef4444',
          points: [
            { x: 0, y: 30 },
            { x: 1, y: 35 },
            { x: 2, y: 32 },
            { x: 3, y: 40 },
            { x: 4, y: 38 },
            { x: 5, y: 45 },
          ],
        },
        {
          id: 'profit',
          color: '#8b5cf6',
          points: [
            { x: 0, y: 20 },
            { x: 1, y: 25 },
            { x: 2, y: 23 },
            { x: 3, y: 30 },
            { x: 4, y: 27 },
            { x: 5, y: 35 },
          ],
        },
      ],
      options: { showPoints: true },
    },
  },
  {
    id: 'custom-paint-styles',
    title: 'Custom Paint Styles',
    description: 'Full PaintStyles object with custom fill/stroke',
    purpose: 'api-example',
    config: {
      kind: ChartKind.LINE,
      series: [
        {
          id: 'custom',
          paint: {
            stroke: { type: 'solid', color: '#f59e0b' },
            fill: { type: 'solid', color: '#fbbf24' },
          },
          points: [
            { x: 0, y: 40 },
            { x: 1, y: 50 },
            { x: 2, y: 45 },
            { x: 3, y: 60 },
            { x: 4, y: 55 },
            { x: 5, y: 70 },
          ],
        },
      ],
      options: { showPoints: true },
    },
  },
  {
    id: 'color-paint-overlay',
    title: 'Color + Paint Overlay',
    description: 'Base color with paint overlay (shallow merge)',
    purpose: 'api-example',
    config: {
      kind: ChartKind.LINE,
      series: [
        {
          id: 'overlay',
          color: '#06b6d4',
          paint: {
            stroke: { type: 'solid', color: '#0891b2' },
          },
          points: [
            { x: 0, y: 60 },
            { x: 1, y: 70 },
            { x: 2, y: 65 },
            { x: 3, y: 80 },
            { x: 4, y: 75 },
            { x: 5, y: 90 },
          ],
        },
      ],
      options: { showPoints: true },
    },
  },
  {
    id: 'gradients-linear',
    title: 'Gradients (Linear)',
    description: 'Linear gradients with vertical and horizontal directions',
    purpose: 'api-example',
    config: {
      kind: ChartKind.LINE,
      series: [
        {
          id: 'gradient-vertical',
          paint: {
            stroke: {
              type: 'linear',
              direction: 'vertical',
              stops: [
                { offset: 0, color: '#60a5fa' },
                { offset: 0.5, color: '#2563eb' },
                { offset: 1, color: '#1e3a8a' },
              ],
            },
            fill: {
              type: 'linear',
              direction: 'horizontal',
              stops: [
                { offset: 0, color: '#93c5fd' },
                { offset: 1, color: '#1e40af' },
              ],
            },
          },
          points: [
            { x: 0, y: 80 },
            { x: 1, y: 90 },
            { x: 2, y: 85 },
            { x: 3, y: 100 },
            { x: 4, y: 95 },
            { x: 5, y: 110 },
          ],
        },
        {
          id: 'gradient-horizontal',
          paint: {
            stroke: {
              type: 'linear',
              direction: 'horizontal',
              stops: [
                { offset: 0, color: '#6ee7b7' },
                { offset: 0.5, color: '#10b981' },
                { offset: 1, color: '#047857' },
              ],
            },
            fill: {
              type: 'solid',
              color: '#6ee7b7',
            },
          },
          points: [
            { x: 0, y: 20 },
            { x: 1, y: 30 },
            { x: 2, y: 25 },
            { x: 3, y: 40 },
            { x: 4, y: 35 },
            { x: 5, y: 50 },
          ],
        },
      ],
      options: { showPoints: true },
    },
  },
  {
    id: 'gradients-radial',
    title: 'Gradients (Radial)',
    description: 'Radial gradients for points',
    purpose: 'api-example',
    config: {
      kind: ChartKind.LINE,
      series: [
        {
          id: 'radial-gradient',
          paint: {
            stroke: {
              type: 'linear',
              direction: 'horizontal',
              stops: [
                { offset: 0, color: '#a78bfa' },
                { offset: 1, color: '#6d28d9' },
              ],
            },
            fill: {
              type: 'radial',
              stops: [
                { offset: 0, color: '#f3e8ff' },
                { offset: 0.4, color: '#c4b5fd' },
                { offset: 1, color: '#5b21b6' },
              ],
            },
          },
          points: [
            { x: 0, y: 70 },
            { x: 1, y: 80 },
            { x: 2, y: 75 },
            { x: 3, y: 90 },
            { x: 4, y: 85 },
            { x: 5, y: 100 },
          ],
        },
      ],
      options: { showPoints: true },
    },
  },
] as const
