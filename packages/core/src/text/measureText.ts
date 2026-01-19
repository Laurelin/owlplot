export type TextMetrics = { width: number; height: number };

export type MeasureText = (text: string, fontCss: string) => TextMetrics;

// used in node tests + as fallback in non-dom envs
export const approximateMeasureText: MeasureText = (text, fontCss) => {
  // crude but deterministic: ~0.6em per char, 1em height
  const fontSizeMatch = /(\d+(?:\.\d+)?)px/.exec(fontCss);
  const fontSizePx = fontSizeMatch ? Number(fontSizeMatch[1]) : 12;
  return { width: text.length * fontSizePx * 0.6, height: fontSizePx };
};
