import { basicCharts } from './basic'
import { hoverCharts } from './hover'
import { axisCharts } from './axis'
import { dataCharts } from './data'
import { colorCharts } from './colors'
import { legendsCharts } from './legends'
import { complexityCharts } from './complexity'
import type { ChartGroup } from '../shared/types'

export const chartGroups: readonly ChartGroup[] = [
  { id: 'basic', label: 'Basic Charts', demos: basicCharts },
  { id: 'hover', label: 'Hover Interactions', demos: hoverCharts },
  { id: 'axis', label: 'Axis Customization', demos: axisCharts },
  { id: 'data', label: 'Data Patterns', demos: dataCharts },
  { id: 'colors', label: 'Colors & Paint', demos: colorCharts },
  { id: 'legends', label: 'Legends', demos: legendsCharts },
  { id: 'complexity', label: 'Complexity Charts', demos: complexityCharts },
] as const
