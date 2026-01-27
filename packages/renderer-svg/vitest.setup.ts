import { JSDOM } from 'jsdom'

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
  url: 'http://localhost',
  pretendToBeVisual: true,
})

// Set up global document and window for tests
;(global as any).window = dom.window
;(global as any).document = dom.window.document
;(global as any).navigator = dom.window.navigator
