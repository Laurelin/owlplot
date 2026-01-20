import { Padding } from "./types";

const DEFAULT_PADDING: Padding = {
    top: 16,
    right: 16,
    bottom: 24,
    left: 32
  };

/**
 * normalize a Partial<Padding> into full Padding
 */
export function mergePadding(partial: Partial<Padding> | undefined): Padding {
    return {
      top: partial?.top ?? DEFAULT_PADDING.top,
      right: partial?.right ?? DEFAULT_PADDING.right,
      bottom: partial?.bottom ?? DEFAULT_PADDING.bottom,
      left: partial?.left ?? DEFAULT_PADDING.left
    };
  }