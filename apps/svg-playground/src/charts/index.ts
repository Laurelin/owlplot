import { basicCharts } from './basic'
import { hoverCharts } from './hover'
import { axisCharts } from './axis'
import { dataCharts } from './data'
import { colorCharts } from './colors'
import type { ChartGroup } from '../shared/types'

export const chartGroups: readonly ChartGroup[] = [
  { id: 'basic', label: 'Basic Charts', demos: basicCharts },
  { id: 'hover', label: 'Hover Interactions', demos: hoverCharts },
  { id: 'axis', label: 'Axis Customization', demos: axisCharts },
  { id: 'data', label: 'Data Patterns', demos: dataCharts },
  { id: 'colors', label: 'Colors & Paint', demos: colorCharts },
] as const
