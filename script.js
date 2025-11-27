const mockData = [
  { date: '2024-01-12', close: 426.31 },
  { date: '2024-02-09', close: 433.85 },
  { date: '2024-03-08', close: 445.92 },
  { date: '2024-04-12', close: 456.17 },
  { date: '2024-05-10', close: 468.42 },
  { date: '2024-06-14', close: 479.63 },
  { date: '2024-07-12', close: 482.18 },
  { date: '2024-08-09', close: 474.02 },
  { date: '2024-09-13', close: 468.11 },
  { date: '2024-10-11', close: 461.44 },
  { date: '2024-11-08', close: 469.32 },
  { date: '2024-12-13', close: 477.89 },
  { date: '2025-01-10', close: 484.15 },
  { date: '2025-02-07', close: 492.88 },
  { date: '2025-03-07', close: 503.44 },
  { date: '2025-04-11', close: 497.72 },
  { date: '2025-05-09', close: 489.36 }
];

function formatCurrency(value) {
  return `$${value.toFixed(2)}`;
}

function formatPercent(value) {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

function computeStats(prices) {
  const closes = prices.map((p) => p.close);
  const dates = prices.map((p) => p.date);
  const current = closes[closes.length - 1];
  const start = closes[0];
  const athValue = Math.max(...closes);
  const athIndex = closes.indexOf(athValue);
  const athDate = dates[athIndex];
  const drawdown = ((current - athValue) / athValue) * 100;
  const periodChange = ((current - start) / start) * 100;

  return {
    current,
    start,
    athValue,
    athDate,
    drawdown,
    periodChange
  };
}

function renderStats(stats) {
  const currentPriceEl = document.getElementById('current-price');
  const athPriceEl = document.getElementById('ath-price');
  const athDateEl = document.getElementById('ath-date');
  const drawdownEl = document.getElementById('drawdown');
  const periodChangeEl = document.getElementById('period-change');

  currentPriceEl.textContent = formatCurrency(stats.current);
  athPriceEl.textContent = formatCurrency(stats.athValue);
  athDateEl.textContent = `Recorded on ${stats.athDate}`;
  drawdownEl.textContent = formatPercent(stats.drawdown);
  drawdownEl.style.color = stats.drawdown < 0 ? 'var(--danger)' : 'var(--accent)';
  periodChangeEl.textContent = formatPercent(stats.periodChange);
  periodChangeEl.style.color = stats.periodChange < 0 ? 'var(--danger)' : 'var(--accent)';
}

function renderList(stats) {
  const list = document.getElementById('stats-list');
  const points = mockData.length;
  const median = mockData.map((p) => p.close).sort((a, b) => a - b)[Math.floor(points / 2)];
  const lastFive = mockData.slice(-5);
  const avg5 = lastFive.reduce((sum, p) => sum + p.close, 0) / lastFive.length;

  list.innerHTML = '';
  const items = [
    `Data points tracked: ${points}`,
    `Median close: ${formatCurrency(median)}`,
    `5-sample average: ${formatCurrency(avg5)}`,
    `Distance to ATH: ${formatPercent(stats.drawdown)}`,
    `ATH recorded on ${stats.athDate}`
  ];

  items.forEach((item) => {
    const li = document.createElement('li');
    li.textContent = item;
    list.appendChild(li);
  });
}

function renderChart(prices) {
  const svg = document.getElementById('price-chart');
  const ns = 'http://www.w3.org/2000/svg';
  const width = 960;
  const height = 360;
  const padding = 48;

  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  while (svg.firstChild) svg.removeChild(svg.firstChild);

  const closes = prices.map((p) => p.close);
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const range = max - min || 1;
  const xStep = prices.length > 1 ? (width - padding * 2) / (prices.length - 1) : 0;

  const xForIndex = (i) => padding + i * xStep;
  const yForValue = (v) => padding + (max - v) * ((height - padding * 2) / range);

  const defs = document.createElementNS(ns, 'defs');
  const gradient = document.createElementNS(ns, 'linearGradient');
  gradient.setAttribute('id', 'areaGradient');
  gradient.setAttribute('x1', '0');
  gradient.setAttribute('y1', '0');
  gradient.setAttribute('x2', '0');
  gradient.setAttribute('y2', '1');

  const stopTop = document.createElementNS(ns, 'stop');
  stopTop.setAttribute('offset', '0%');
  stopTop.setAttribute('stop-color', 'rgba(56, 189, 248, 0.35)');
  const stopBottom = document.createElementNS(ns, 'stop');
  stopBottom.setAttribute('offset', '100%');
  stopBottom.setAttribute('stop-color', 'rgba(56, 189, 248, 0)');

  gradient.append(stopTop, stopBottom);
  defs.appendChild(gradient);
  svg.appendChild(defs);

  const areaPath = document.createElementNS(ns, 'path');
  const linePath = document.createElementNS(ns, 'path');

  const pointString = prices
    .map((p, i) => `${xForIndex(i)},${yForValue(p.close)}`)
    .join(' ');

  const areaD = `M ${padding} ${height - padding} L ${pointString} L ${padding + xStep * (prices.length - 1)} ${height - padding} Z`;
  areaPath.setAttribute('d', areaD);
  areaPath.setAttribute('fill', 'url(#areaGradient)');
  areaPath.setAttribute('stroke', 'none');

  const lineD = `M ${pointString}`;
  linePath.setAttribute('d', lineD);
  linePath.setAttribute('fill', 'none');
  linePath.setAttribute('stroke', 'rgba(56, 189, 248, 0.9)');
  linePath.setAttribute('stroke-width', '3');
  linePath.setAttribute('stroke-linejoin', 'round');
  linePath.setAttribute('stroke-linecap', 'round');

  const axis = document.createElementNS(ns, 'line');
  axis.setAttribute('x1', padding);
  axis.setAttribute('x2', width - padding);
  axis.setAttribute('y1', height - padding);
  axis.setAttribute('y2', height - padding);
  axis.setAttribute('stroke', 'rgba(148, 163, 184, 0.35)');
  axis.setAttribute('stroke-width', '1');

  const labels = document.createElementNS(ns, 'g');
  const formatPrice = (v) => `$${v.toFixed(0)}`;
  [max, min].forEach((value, idx) => {
    const label = document.createElementNS(ns, 'text');
    label.textContent = `${idx === 0 ? 'High ' : 'Low '}${formatPrice(value)}`;
    label.setAttribute('x', width - padding);
    label.setAttribute('y', yForValue(value) - 8 * idx);
    label.setAttribute('text-anchor', 'end');
    label.setAttribute('fill', '#cbd5e1');
    label.setAttribute('font-size', '12');
    labels.appendChild(label);
  });

  const dateLabels = document.createElementNS(ns, 'g');
  const firstDate = document.createElementNS(ns, 'text');
  firstDate.textContent = prices[0].date;
  firstDate.setAttribute('x', padding);
  firstDate.setAttribute('y', height - padding + 18);
  firstDate.setAttribute('fill', '#94a3b8');
  firstDate.setAttribute('font-size', '12');
  const lastDate = document.createElementNS(ns, 'text');
  lastDate.textContent = prices[prices.length - 1].date;
  lastDate.setAttribute('x', width - padding);
  lastDate.setAttribute('y', height - padding + 18);
  lastDate.setAttribute('text-anchor', 'end');
  lastDate.setAttribute('fill', '#94a3b8');
  lastDate.setAttribute('font-size', '12');
  dateLabels.append(firstDate, lastDate);

  const lastPoint = document.createElementNS(ns, 'circle');
  lastPoint.setAttribute('cx', xForIndex(prices.length - 1));
  lastPoint.setAttribute('cy', yForValue(prices[prices.length - 1].close));
  lastPoint.setAttribute('r', '4.5');
  lastPoint.setAttribute('fill', '#0ea5e9');
  lastPoint.setAttribute('stroke', '#e0f2fe');
  lastPoint.setAttribute('stroke-width', '2');

  svg.append(areaPath, linePath, axis, labels, dateLabels, lastPoint);
}

function init() {
  const stats = computeStats(mockData);
  renderStats(stats);
  renderList(stats);
  renderChart(mockData);

  const rangeLabel = document.getElementById('range-label');
  const firstDate = mockData[0].date;
  const lastDate = mockData[mockData.length - 1].date;
  rangeLabel.textContent = `${firstDate} → ${lastDate}`;
}

document.addEventListener('DOMContentLoaded', init);
