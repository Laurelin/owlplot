import { ChartKind } from '@owlplot/core'
import type { ChartDemo } from '../shared/types'
import { withDemoColor } from '../shared/demoPalette'
import { dropSeriesNodes } from '../shared/sceneTransforms'

/**
 * One live demo that sets a real sceneTransforms entry (drop a series).
 * Customization stays pure scene → scene in the app helper.
 */
export const transformCharts: readonly ChartDemo[] = [
  {
    id: 'scene-transform-drop-series',
    title: 'Drop series (scene transform)',
    description:
      'Compute a two-series scene, then drop expenses via pure scene → scene before SVG render',
    purpose: 'api-example',
    config: {
      kind: ChartKind.LINE,
      series: [
        withDemoColor(
          {
            id: 'revenue',
            points: [
              { x: 0, y: 100 },
              { x: 1, y: 120 },
              { x: 2, y: 110 },
              { x: 3, y: 140 },
              { x: 4, y: 130 },
              { x: 5, y: 150 },
            ],
          },
          0
        ),
        withDemoColor(
          {
            id: 'expenses',
            points: [
              { x: 0, y: 80 },
              { x: 1, y: 85 },
              { x: 2, y: 90 },
              { x: 3, y: 95 },
              { x: 4, y: 100 },
              { x: 5, y: 105 },
            ],
          },
          1
        ),
      ],
      options: { showPoints: true },
    },
    sceneTransforms: [dropSeriesNodes('expenses')],
  },
] as const
