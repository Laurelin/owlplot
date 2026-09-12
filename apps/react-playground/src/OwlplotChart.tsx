import { useEffect, useMemo, useRef } from 'react'
import { computeChartScene, type ChartConfig } from '@owlplot/core'
import {
  createCanvasMeasureText,
  renderSvgScene,
  type HoverIndicatorConfig,
  type HoverMode,
  type LegendOptions,
} from '@owlplot/renderer-svg'

export type OwlplotChartProps = {
  config: ChartConfig
  width: number
  height: number
  /** Legend options; pass `false`/`null` to disable. Toggle must update props. */
  legend?: LegendOptions | boolean | null
  hoverMode?: HoverMode
  hoverIndicator?: HoverIndicatorConfig | HoverIndicatorConfig[]
}

/**
 * Thin host: props → computeChartScene → renderSvgScene.
 * No chart instance, no load/destroy ref API, SVG-only.
 */
export function OwlplotChart({
  config,
  width,
  height,
  legend,
  hoverMode,
  hoverIndicator,
}: OwlplotChartProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const measureText = useMemo(() => createCanvasMeasureText(), [])

  useEffect(() => {
    const host = hostRef.current
    const svg = svgRef.current
    if (!host || !svg) return

    svg.setAttribute('width', String(width))
    svg.setAttribute('height', String(height))

    const { scene } = computeChartScene(
      config,
      { width, height },
      {
        devicePixelRatio: window.devicePixelRatio || 1,
        measureText,
      }
    )

    renderSvgScene(scene, svg, {
      hoverMode,
      hoverIndicator,
      legend,
      legendHost: host,
    })
  }, [config, width, height, legend, hoverMode, hoverIndicator, measureText])

  return (
    <div ref={hostRef} className="chart-host">
      <svg
        ref={svgRef}
        className="chart-svg"
        role="img"
        aria-label="owlplot chart"
      />
    </div>
  )
}
