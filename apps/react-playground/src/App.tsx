import { useCallback, useMemo, useState } from 'react'
import {
  HoverIndicatorKind,
  HoverModeKind,
  type LegendOptions,
} from '@owlplot/renderer-svg'
import { OwlplotChart } from './OwlplotChart'
import { CHART_SIZE, buildDemoConfig } from './demoConfig'

export function App() {
  const [hiddenSeriesIds, setHiddenSeriesIds] = useState<readonly string[]>([])

  const config = useMemo(
    () => buildDemoConfig(hiddenSeriesIds),
    [hiddenSeriesIds]
  )

  const onToggleSeries = useCallback((seriesId: string) => {
    setHiddenSeriesIds(current =>
      current.includes(seriesId)
        ? current.filter(id => id !== seriesId)
        : [...current, seriesId]
    )
  }, [])

  const legend = useMemo<LegendOptions>(
    () => ({
      placement: 'outside',
      anchor: 'bottom-center',
      hiddenSeriesIds,
      onToggleSeries,
    }),
    [hiddenSeriesIds, onToggleSeries]
  )

  return (
    <>
      <h1>owlplot react playground</h1>
      <p className="lede">
        Props → <code>computeChartScene</code> → <code>renderSvgScene</code>.
        Legend clicks update <code>hiddenSeriesIds</code> and recompute the
        scene. Hover uses the existing SVG scene path.
      </p>
      <OwlplotChart
        config={config}
        width={CHART_SIZE.width}
        height={CHART_SIZE.height}
        legend={legend}
        hoverMode={{ kind: HoverModeKind.X_AXIS }}
        hoverIndicator={{ kind: HoverIndicatorKind.X_LINE }}
      />
    </>
  )
}
