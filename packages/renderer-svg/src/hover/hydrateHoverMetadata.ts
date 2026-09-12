import type {
  HoverMetadata,
  HoverMetadataDual,
  HoverMetadataSingle,
  ContinuousScale,
  ContinuousScaleDescriptor,
} from '@owlplot/core'
import { createScaleFromDescriptor } from '@owlplot/core'
import type {
  RuntimeHoverMetadata,
  RuntimeHoverMetadataDual,
  RuntimeHoverMetadataSingle,
} from './types'

function hydrateScale(d: ContinuousScaleDescriptor): ContinuousScale {
  return createScaleFromDescriptor(d)
}

function isDualHoverMetadata(meta: HoverMetadata): meta is HoverMetadataDual {
  return 'yLeft' in meta.scales && 'yRight' in meta.scales
}

/** Rebuild live ContinuousScale instances from serializable scene hover metadata. */
export function hydrateHoverMetadata(
  meta: HoverMetadata
): RuntimeHoverMetadata {
  if (isDualHoverMetadata(meta)) {
    const dual: RuntimeHoverMetadataDual = {
      scales: {
        x: hydrateScale(meta.scales.x),
        yLeft: hydrateScale(meta.scales.yLeft),
        yRight: hydrateScale(meta.scales.yRight),
      },
      yDomainLeft: meta.yDomainLeft,
      yDomainRight: meta.yDomainRight,
      plotRect: meta.plotRect,
      xDomain: meta.xDomain,
      series: meta.series,
    }
    return dual
  }

  const singleMeta = meta as HoverMetadataSingle
  const single: RuntimeHoverMetadataSingle = {
    scales: {
      x: hydrateScale(singleMeta.scales.x),
      y: hydrateScale(singleMeta.scales.y),
    },
    plotRect: singleMeta.plotRect,
    xDomain: singleMeta.xDomain,
    yDomain: singleMeta.yDomain,
    series: singleMeta.series,
  }
  return single
}
