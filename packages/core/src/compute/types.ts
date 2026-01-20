import { SceneNode } from '../scene/types'

export type ChartSize = { width: number; height: number }

export type PlotRect = {
  x: number
  y: number
  width: number
  height: number
}

export type ComputeResult = {
  scene: SceneNode
}
