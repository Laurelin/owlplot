export type SceneNode =
  | SceneGroupNode
  | ScenePathNode
  | SceneRectNode
  | SceneCircleNode
  | SceneTextNode;

export type SceneStyle = {
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
  fontFamily?: string;
  fontSizePx?: number;
  fontWeight?: number | string;
};

export type SceneBaseNode = {
  id: string;
  style?: SceneStyle;
};

export type SceneGroupNode = SceneBaseNode & {
  kind: "group";
  transform?: string;
  children: SceneNode[];
};

export type ScenePathNode = SceneBaseNode & {
  kind: "path";
  d: string;
};

export type SceneRectNode = SceneBaseNode & {
  kind: "rect";
  x: number;
  y: number;
  width: number;
  height: number;
  rx?: number;
  ry?: number;
};

export type SceneCircleNode = SceneBaseNode & {
  kind: "circle";
  cx: number;
  cy: number;
  r: number;
};

export type SceneTextNode = SceneBaseNode & {
  kind: "text";
  x: number;
  y: number;
  text: string;
  textAnchor?: "start" | "middle" | "end";
  dominantBaseline?: "auto" | "middle" | "hanging";
};
