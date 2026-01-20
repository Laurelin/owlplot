/**
 * allowed text anchor positions
 */
export enum TextAnchor {
    START  = "start",
    MIDDLE = "middle",
    END    = "end"
  }
  
  /**
   * allowed dominant baseline values
   * (subset of SVG options)
   */
  export enum DominantBaseline {
    AUTO     = "auto",
    MIDDLE   = "middle",
    HANGING  = "hanging",
    BASELINE = "baseline"
  }
  

export type TextMetrics = { width: number; height: number };

export type MeasureText = (text: string, fontCss: string) => TextMetrics;
