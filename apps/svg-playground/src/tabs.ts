import type { ChartGroup } from './shared/types'

/**
 * Mounts tab navigation UI.
 *
 * HARD RULE: Only mutates the tabsContainer. Never touches panels or content.
 * Emits onSelect callback - parent handles panel visibility.
 */
export function mountTabs(
  tabsContainer: HTMLElement,
  groups: readonly ChartGroup[],
  onSelect: (groupId: string) => void
): void {
  // Clear container
  tabsContainer.innerHTML = ''

  // Create tab buttons from groups
  groups.forEach((group, index) => {
    const button = document.createElement('button')
    button.classList.add('tab-button')
    // Tab active state is visual only; content visibility is handled by parent
    if (index === 0) button.classList.add('active')
    button.setAttribute('data-tab', group.id)
    button.textContent = group.label

    button.addEventListener('click', () => {
      // Update active button (visual state only)
      tabsContainer.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active')
      })
      button.classList.add('active')

      // Emit selection - parent handles panels
      onSelect(group.id)
    })

    tabsContainer.appendChild(button)
  })
}
