export type LegendPlacement = 'none' | 'inside' | 'outside'

export type LegendAnchor =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right'
  | 'left-center'
  | 'right-center'

export type LegendDirection = 'row' | 'column'

export type LegendOverlapPolicy = 'allow' | 'avoid-frame'

export type LegendItemSize = {
  width: number
  height: number
}

export type LegendLayoutInput = {
  placement: Exclude<LegendPlacement, 'none'>
  anchor: LegendAnchor
  direction: LegendDirection
  overlapPolicy: LegendOverlapPolicy
  padding: number
  axisToLegendGap: number
  offsetX: number
  offsetY: number
  gap: number
  chartRect: { x: number; y: number; width: number; height: number }
  plotRect: { x: number; y: number; width: number; height: number }
  itemSizes: LegendItemSize[]
}

export type LegendLayoutResult = {
  box: { x: number; y: number; width: number; height: number }
  itemOrigins: Array<{ x: number; y: number }>
  reserved: { top: number; right: number; bottom: number; left: number }
}

function parseAnchor(anchor: LegendAnchor): {
  vertical: 'top' | 'center' | 'bottom'
  horizontal: 'left' | 'center' | 'right'
} {
  if (anchor === 'left-center')
    return { vertical: 'center', horizontal: 'left' }
  if (anchor === 'right-center')
    return { vertical: 'center', horizontal: 'right' }
  const [vertical, horizontal] = anchor.split('-') as [
    'top' | 'bottom',
    'left' | 'center' | 'right',
  ]
  return { vertical, horizontal }
}

function computeLegendSize(
  direction: LegendDirection,
  gap: number,
  itemSizes: LegendItemSize[]
): { width: number; height: number } {
  if (itemSizes.length === 0) return { width: 0, height: 0 }

  if (direction === 'column') {
    const width = Math.max(...itemSizes.map(item => item.width))
    const height =
      itemSizes.reduce((sum, item) => sum + item.height, 0) +
      gap * Math.max(0, itemSizes.length - 1)
    return { width, height }
  }

  const width =
    itemSizes.reduce((sum, item) => sum + item.width, 0) +
    gap * Math.max(0, itemSizes.length - 1)
  const height = Math.max(...itemSizes.map(item => item.height))
  return { width, height }
}

function anchorLegendBox(
  anchor: LegendAnchor,
  frame: { x: number; y: number; width: number; height: number },
  legendSize: { width: number; height: number },
  padding: number,
  offsetX: number,
  offsetY: number
): { x: number; y: number } {
  const { vertical, horizontal } = parseAnchor(anchor)

  let x = frame.x + padding
  if (horizontal === 'center') {
    x = frame.x + (frame.width - legendSize.width) / 2
  } else if (horizontal === 'right') {
    x = frame.x + frame.width - padding - legendSize.width
  }

  let y = frame.y + padding
  if (vertical === 'center') {
    y = frame.y + (frame.height - legendSize.height) / 2
  } else if (vertical === 'bottom') {
    y = frame.y + frame.height - padding - legendSize.height
  }

  return { x: x + offsetX, y: y + offsetY }
}

function computeItemOrigins(
  direction: LegendDirection,
  gap: number,
  itemSizes: LegendItemSize[],
  box: { x: number; y: number; width: number; height: number }
): Array<{ x: number; y: number }> {
  const origins: Array<{ x: number; y: number }> = []

  if (direction === 'column') {
    let y = box.y
    for (const item of itemSizes) {
      origins.push({ x: box.x, y })
      y += item.height + gap
    }
    return origins
  }

  let x = box.x
  for (const item of itemSizes) {
    origins.push({ x, y: box.y })
    x += item.width + gap
  }
  return origins
}

export function computeLegendLayout(
  input: LegendLayoutInput
): LegendLayoutResult {
  const legendSize = computeLegendSize(
    input.direction,
    input.gap,
    input.itemSizes
  )

  const reserved = { top: 0, right: 0, bottom: 0, left: 0 }
  const anchor = parseAnchor(input.anchor)

  const frame = (() => {
    if (input.placement === 'inside') {
      return input.overlapPolicy === 'avoid-frame'
        ? input.plotRect
        : input.chartRect
    }

    if (anchor.vertical === 'top') {
      reserved.top =
        input.axisToLegendGap + legendSize.height + input.padding * 2
      return {
        x: input.chartRect.x,
        y: input.chartRect.y,
        width: input.chartRect.width,
        height: legendSize.height + input.padding * 2,
      }
    }

    if (anchor.vertical === 'bottom') {
      reserved.bottom =
        input.axisToLegendGap + legendSize.height + input.padding * 2
      return {
        x: input.chartRect.x,
        y: input.chartRect.y + input.chartRect.height + input.axisToLegendGap,
        width: input.chartRect.width,
        height: legendSize.height + input.padding * 2,
      }
    }

    if (anchor.horizontal === 'left') {
      reserved.left =
        input.axisToLegendGap + legendSize.width + input.padding * 2
      return {
        x: input.chartRect.x,
        y: input.chartRect.y,
        width: legendSize.width + input.padding * 2,
        height: input.chartRect.height,
      }
    }

    reserved.right =
      input.axisToLegendGap + legendSize.width + input.padding * 2
    return {
      x: input.chartRect.x + input.chartRect.width + input.axisToLegendGap,
      y: input.chartRect.y,
      width: legendSize.width + input.padding * 2,
      height: input.chartRect.height,
    }
  })()

  const origin = anchorLegendBox(
    input.anchor,
    frame,
    legendSize,
    input.padding,
    input.offsetX,
    input.offsetY
  )

  const box = {
    x: origin.x,
    y: origin.y,
    width: legendSize.width,
    height: legendSize.height,
  }

  return {
    box,
    itemOrigins: computeItemOrigins(
      input.direction,
      input.gap,
      input.itemSizes,
      box
    ),
    reserved,
  }
}
