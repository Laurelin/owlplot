import { JSDOM } from 'jsdom'

const testGlobal = globalThis as unknown as {
  window: Window & typeof globalThis
  document: Document
  navigator: Navigator
}

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
  url: 'http://localhost',
  pretendToBeVisual: true,
})

// Set up global document and window for tests
testGlobal.window = dom.window
testGlobal.document = dom.window.document
testGlobal.navigator = dom.window.navigator
