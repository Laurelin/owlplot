import type { TextAnchor, DominantBaseline } from "../text/types";
// -----------------------------------
// enums (never use hardcoded strings)
// -----------------------------------

/**
 * scene node kinds
 */
export enum SceneNodeKind {
  GROUP  = "group",
  PATH   = "path",
  RECT   = "rect",
  CIRCLE = "circle",
  TEXT   = "text"
}

// -----------------------------------
// scene graph node types
// -----------------------------------

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
  kind: SceneNodeKind.GROUP;
  transform?: string;
  children: SceneNode[];
};

export type ScenePathNode = SceneBaseNode & {
  kind: SceneNodeKind.PATH;
  d: string;
};

export type SceneRectNode = SceneBaseNode & {
  kind: SceneNodeKind.RECT;
  x: number;
  y: number;
  width: number;
  height: number;
  rx?: number;
  ry?: number;
};

export type SceneCircleNode = SceneBaseNode & {
  kind: SceneNodeKind.CIRCLE;
  cx: number;
  cy: number;
  r: number;
};

export type SceneTextNode = SceneBaseNode & {
  kind: SceneNodeKind.TEXT;
  x: number;
  y: number;
  text: string;
  textAnchor?: TextAnchor;
  dominantBaseline?: DominantBaseline;
};
