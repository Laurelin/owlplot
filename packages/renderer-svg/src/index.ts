import type { SceneNode, SceneStyle } from "@owlplot/core";
export { renderSvgScene };

function setStyle(el: Element, style: SceneStyle | undefined) {
  if (!style) return;
  for (const [key, val] of Object.entries(style)) {
    if (val == null) continue;
    const attr = key.replace(/([A-Z])/g, "-$1").toLowerCase();
    el.setAttribute(attr, String(val));
  }
}

function createElement(tag: string): SVGElement {
  return document.createElementNS("http://www.w3.org/2000/svg", tag);
}

function appendNode(node: SceneNode, parent: SVGElement) {
  let el: SVGElement | null = null;

  switch (node.kind) {
    case "group":
      el = createElement("g");
      if (node.transform) el.setAttribute("transform", node.transform);
      node.children.forEach((child: SceneNode) => appendNode(child, el!));
      break;
    case "path":
      el = createElement("path");
      el.setAttribute("d", node.d);
      break;
    case "rect":
      el = createElement("rect");
      el.setAttribute("x", String(node.x));
      el.setAttribute("y", String(node.y));
      el.setAttribute("width", String(node.width));
      el.setAttribute("height", String(node.height));
      break;
    case "circle":
      el = createElement("circle");
      el.setAttribute("cx", String(node.cx));
      el.setAttribute("cy", String(node.cy));
      el.setAttribute("r", String(node.r));
      break;
    case "text":
      el = createElement("text");
      el.setAttribute("x", String(node.x));
      el.setAttribute("y", String(node.y));
      el.textContent = node.text;
      if (node.textAnchor) el.setAttribute("text-anchor", node.textAnchor);
      if (node.dominantBaseline)
        el.setAttribute("dominant-baseline", node.dominantBaseline);
      break;
  }

  if (!el) return;
  el.setAttribute("id", node.id);
  setStyle(el, node.style);
  parent.appendChild(el);
}

function clearSvg(svg: SVGSVGElement) {
  while (svg.firstChild) svg.removeChild(svg.firstChild);
}

function renderSvgScene(scene: SceneNode, svg: SVGSVGElement): void {
  clearSvg(svg);
  appendNode(scene, svg);
}
