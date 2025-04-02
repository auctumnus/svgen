const h = (tag: string, props?: Record<string, any>, children?: Element[]): Element => {
  const el = document.createElement(tag)

  Object.entries(props || {}).forEach(([key, value]) => {
    el.setAttribute(key, value)
  })

  for (const child of children || []) {
    el.appendChild(child)
  }

  return el
}

export const prelude = {
  h,
  path: (d: string, props?: Record<string, any>): SVGPathElement => {
    return h('path', { d, ...props }) as SVGPathElement
  },
  rect: (props?: Record<string, any>): SVGRectElement => {
    return h('rect', props) as SVGRectElement
  },
  g: (props?: Record<string, any>, children?: Element[]): SVGGElement => {
    return h('g', props, children) as SVGGElement
  },
}
