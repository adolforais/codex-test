const tabs = document.querySelectorAll('[data-tab-target]');
const panels = document.querySelectorAll('.panel');

function activateTab(target) {
  const selected = document.getElementById(target);
  if (!selected) return;

  tabs.forEach((tab) => {
    const isActive = tab.dataset.tabTarget === target;
    tab.classList.toggle('active', isActive);
    tab.setAttribute('aria-selected', isActive);
    tab.setAttribute('tabindex', isActive ? '0' : '-1');
  });

  panels.forEach((panel) => {
    panel.classList.toggle('active', panel.id === target);
  });
}

function handleTabClick(event) {
  const target = event.currentTarget.dataset.tabTarget;
  activateTab(target);
}

tabs.forEach((tab, index) => {
  tab.addEventListener('click', handleTabClick);
  tab.setAttribute('role', 'tab');
  tab.setAttribute('tabindex', tab.classList.contains('active') ? '0' : '-1');
  tab.setAttribute('aria-selected', tab.classList.contains('active'));
  tab.setAttribute('aria-controls', tab.dataset.tabTarget);

  tab.addEventListener('keydown', (event) => {
    const horizontal = window.matchMedia('(max-width: 768px)').matches;
    const keys = ['ArrowLeft', 'ArrowUp', 'ArrowRight', 'ArrowDown'];
    if (!keys.includes(event.key)) return;

    event.preventDefault();
    const direction = event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 1;
    const tabsArray = Array.from(tabs).filter((btn) => btn.offsetParent !== null);
    const currentIndex = tabsArray.indexOf(event.currentTarget);
    const nextIndex = (currentIndex + direction + tabsArray.length) % tabsArray.length;
    tabsArray[nextIndex].focus();
    tabsArray[nextIndex].click();

    if (horizontal) {
      tabsArray[nextIndex].scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  });
});

document.addEventListener('DOMContentLoaded', () => {
  const activeTab = document.querySelector('.tab.active, .mobile-tab.active');
  if (activeTab) {
    activateTab(activeTab.dataset.tabTarget);
  }
});
