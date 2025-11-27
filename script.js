const RANGE_WINDOWS = {
  '1D': 1,
  '5D': 5,
  '1W': 7,
  '1M': 30,
  '3M': 90,
  '6M': 180,
  YTD: 'YTD',
  '1Y': 365,
  '5Y': 365 * 5,
  ALL: 'ALL'
};

const DEFAULT_RANGE = '6M';
const SYMBOL = 'VOO';

let fullSeries = [];
let filteredSeries = [];
let allTimeHigh = null;
let currentRange = DEFAULT_RANGE;

const ns = 'http://www.w3.org/2000/svg';

function formatCurrency(value) {
  return `$${value.toFixed(2)}`;
}

function formatPercent(value) {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

function setStatus(message, tone = 'info') {
  const status = document.getElementById('data-status');
  status.textContent = message;
  status.style.color = tone === 'error' ? 'var(--danger)' : 'var(--accent)';
}

function renderNoData(message) {
  setStatus(message, 'error');
  fullSeries = [];
  filteredSeries = [];
  const list = document.getElementById('stats-list');
  list.innerHTML = `<li>${message}</li>`;
  renderStats(null);
  renderChart([]);
  setRangeLabel(currentRange, []);
}

function resolveApiKey() {
  const params = new URLSearchParams(window.location.search);
  const fromQuery = params.get('avkey');
  if (fromQuery) {
    localStorage.setItem('alphaVantageKey', fromQuery);
  }
  const stored = localStorage.getItem('alphaVantageKey');
  return fromQuery || stored || window.ALPHA_VANTAGE_API_KEY || '';
}

function normalizeDailySeries(data) {
  const series = data['Time Series (Daily)'];
  if (!series) throw new Error('Unexpected Alpha Vantage shape');

  return Object.entries(series)
    .map(([date, values]) => ({
      date,
      close: parseFloat(values['4. close'])
    }))
    .filter((point) => !Number.isNaN(point.close))
    .sort((a, b) => new Date(a.date) - new Date(b.date));
}

async function fetchAlphaVantage(symbol, apiKey) {
  const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY_ADJUSTED&symbol=${symbol}&outputsize=full&apikey=${apiKey}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error('Network error');
  const json = await response.json();
  if (json['Note']) throw new Error('Alpha Vantage throttled');
  if (json['Error Message']) throw new Error('Invalid API response');
  return normalizeDailySeries(json);
}

function computeAth(series) {
  const closes = series.map((p) => p.close);
  const dates = series.map((p) => p.date);
  const athValue = Math.max(...closes);
  const athIndex = closes.indexOf(athValue);
  return { value: athValue, date: dates[athIndex] };
}

function computeStats(prices, athReference) {
  if (!prices.length) return null;
  const closes = prices.map((p) => p.close);
  const dates = prices.map((p) => p.date);
  const current = closes[closes.length - 1];
  const start = closes[0];
  const athValue = athReference?.value ?? Math.max(...closes);
  const athDate = athReference?.date ?? dates[closes.indexOf(athValue)];
  const drawdown = ((current - athValue) / athValue) * 100;
  const periodChange = ((current - start) / start) * 100;

  return { current, start, athValue, athDate, drawdown, periodChange };
}

function renderStats(stats) {
  if (!stats) return;
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

function renderList(stats, prices) {
  const list = document.getElementById('stats-list');
  if (!stats || !prices.length) {
    list.innerHTML = '<li>No data available.</li>';
    return;
  }
  const points = prices.length;
  const sorted = [...prices].map((p) => p.close).sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const lastFive = prices.slice(-5);
  const avg5 = lastFive.reduce((sum, p) => sum + p.close, 0) / lastFive.length;

  const items = [
    `Data points shown: ${points}`,
    `Median close: ${formatCurrency(median)}`,
    `5-sample average: ${formatCurrency(avg5)}`,
    `Distance to ATH: ${formatPercent(stats.drawdown)}`,
    `ATH recorded on ${stats.athDate}`
  ];

  list.innerHTML = '';
  items.forEach((item) => {
    const li = document.createElement('li');
    li.textContent = item;
    list.appendChild(li);
  });
}

function renderChart(prices) {
  const svg = document.getElementById('price-chart');
  const width = 960;
  const height = 360;
  const padding = 48;

  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  while (svg.firstChild) svg.removeChild(svg.firstChild);

  if (!prices.length) return;

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

  const lastX = padding + xStep * (prices.length - 1);
  const areaD = `M ${padding} ${height - padding} L ${pointString} L ${lastX} ${height - padding} Z`;
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

function filterByRange(range, series) {
  if (!series.length) return [];
  const end = new Date(series[series.length - 1].date);
  if (range === 'ALL') return [...series];
  if (range === 'YTD') {
    const start = new Date(end.getFullYear(), 0, 1);
    return series.filter((p) => new Date(p.date) >= start);
  }
  const days = RANGE_WINDOWS[range] || RANGE_WINDOWS[DEFAULT_RANGE];
  const start = new Date(end);
  start.setDate(start.getDate() - (days - 1));
  return series.filter((p) => new Date(p.date) >= start);
}

function setRangeLabel(range, prices) {
  const label = document.getElementById('range-label');
  if (!prices.length) {
    label.textContent = 'No data';
    return;
  }
  const start = prices[0].date;
  const end = prices[prices.length - 1].date;
  const labelText = range === 'ALL' ? `All history → ${end}` : `${start} → ${end}`;
  label.textContent = labelText;
}

function updateRange(range) {
  currentRange = range;
  filteredSeries = filterByRange(range, fullSeries);
  const stats = computeStats(filteredSeries, allTimeHigh);
  renderStats(stats);
  renderList(stats, filteredSeries);
  renderChart(filteredSeries);
  setRangeLabel(range, filteredSeries);
}

function bindRangeSwitcher() {
  const pills = document.querySelectorAll('.pill');
  pills.forEach((pill) => {
    pill.addEventListener('click', () => {
      const range = pill.dataset.range;
      pills.forEach((btn) => {
        btn.classList.toggle('active', btn === pill);
        btn.setAttribute('aria-selected', btn === pill ? 'true' : 'false');
      });
      updateRange(range);
    });
  });
}

async function init() {
  const apiKey = resolveApiKey();
  if (!apiKey) {
    renderNoData('API key missing • add ?avkey=YOUR_KEY');
    bindRangeSwitcher();
    return;
  }

  try {
    const liveSeries = await fetchAlphaVantage(SYMBOL, apiKey);
    fullSeries = liveSeries;
    allTimeHigh = computeAth(fullSeries);
    setStatus('Alpha Vantage • live data');
    bindRangeSwitcher();
    updateRange(currentRange);
  } catch (err) {
    console.error(err);
    renderNoData('Could not load data with provided API key');
    bindRangeSwitcher();
  }
}

document.addEventListener('DOMContentLoaded', init);
