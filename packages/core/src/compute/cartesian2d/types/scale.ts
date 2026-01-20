export interface LinearScaleSpec {
    domain: [number, number];
    range: [number, number];
  }
  
  export type ScaleSpec 
    = LinearScaleSpec; // add time/log/band later
  