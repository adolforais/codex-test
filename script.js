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
  const ctx = document.getElementById('price-chart').getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, 400);
  gradient.addColorStop(0, 'rgba(56, 189, 248, 0.4)');
  gradient.addColorStop(1, 'rgba(56, 189, 248, 0)');

  new Chart(ctx, {
    type: 'line',
    data: {
      labels: prices.map((p) => p.date),
      datasets: [
        {
          label: 'VOO close',
          data: prices.map((p) => p.close),
          tension: 0.3,
          fill: true,
          backgroundColor: gradient,
          borderColor: 'rgba(56, 189, 248, 0.9)',
          borderWidth: 2,
          pointRadius: 0,
          pointHitRadius: 12
        }
      ]
    },
    options: {
      animation: false,
      responsive: true,
      maintainAspectRatio: true,
      scales: {
        x: {
          grid: { color: 'rgba(148, 163, 184, 0.15)' },
          ticks: { color: '#cbd5e1', maxRotation: 0, autoSkip: true, maxTicksLimit: 6 }
        },
        y: {
          grid: { color: 'rgba(148, 163, 184, 0.15)' },
          ticks: {
            color: '#cbd5e1',
            callback: (value) => `$${value}`
          }
        }
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: '#0f172a',
          borderColor: 'rgba(56, 189, 248, 0.5)',
          borderWidth: 1,
          callbacks: {
            label: (context) => `Close: ${formatCurrency(context.parsed.y)}`
          }
        }
      }
    }
  });
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
