import { chartGroups } from './charts'
import { mountTabs } from './tabs'
import { renderChartInto } from './shared/renderChart'
import type { ChartDemo } from './shared/types'

function createBadgeLegend(demo: ChartDemo): HTMLElement | null {
  const badges = demo.meta?.badges
  if (badges == null || badges.length === 0) return null

  const row = document.createElement('div')
  row.classList.add('chart-badge-row')

  for (const badge of badges) {
    const chip = document.createElement('span')
    chip.classList.add('chart-badge')
    chip.textContent = badge.label
    chip.style.background = badge.color
    chip.style.color = badge.textColor ?? '#222222'
    row.appendChild(chip)
  }

  return row
}

function createChartCard(demo: ChartDemo): HTMLElement {
  const card = document.createElement('div')
  card.classList.add('chart-card')

  const title = document.createElement('div')
  title.classList.add('chart-title')
  title.textContent = demo.title
  card.appendChild(title)

  const description = document.createElement('div')
  description.classList.add('chart-description')
  description.textContent = demo.description
  card.appendChild(description)

  const badgeRow = createBadgeLegend(demo)
  if (badgeRow) {
    card.appendChild(badgeRow)
  }

  const svgContainer = document.createElement('div')
  svgContainer.classList.add('chart-svg-container')
  card.appendChild(svgContainer)

  return card
}

/**
 * Renders a chart group idempotently.
 * If already rendered, only toggles visibility.
 * Uses DOM existence as source of truth (no redundant Set).
 */
function renderGroup(groupId: string): void {
  const group = chartGroups.find(g => g.id === groupId)
  if (!group) return

  const panelsContainer = document.getElementById('tab-panels')
  if (!panelsContainer) return

  // Check if already rendered (DOM is source of truth)
  let panel = document.getElementById(`tab-${groupId}`) as HTMLElement | null

  if (!panel) {
    // First render - create panel
    panel = document.createElement('div')
    panel.classList.add('tab-content')
    panel.id = `tab-${groupId}`

    const grid = document.createElement('div')
    grid.classList.add('charts-grid')

    for (const demo of group.demos) {
      const card = createChartCard(demo)
      const svgContainer = card.querySelector(
        '.chart-svg-container'
      ) as HTMLElement
      renderChartInto(svgContainer, demo)
      grid.appendChild(card)
    }

    panel.appendChild(grid)
    panel.classList.add('active') // Explicitly activate on first render
    panelsContainer.appendChild(panel)
  } else {
    // Already rendered - just show it
    panel.classList.add('active')
  }

  // Hide all other panels
  panelsContainer.querySelectorAll('.tab-content').forEach(p => {
    if (p.id !== `tab-${groupId}`) {
      p.classList.remove('active')
    }
  })
}

// Initialize
const tabsContainer = document.querySelector('[data-tabs]') as HTMLElement
if (tabsContainer) {
  mountTabs(tabsContainer, chartGroups, groupId => {
    renderGroup(groupId)
  })

  // Render initial tab
  renderGroup(chartGroups[0]!.id)
}
