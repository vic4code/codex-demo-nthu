const DATA_URL = 'data/market_data.json';
const dateTime = luxon.DateTime;

const state = {
  data: null,
  chart: null,
  selectedSymbol: null,
  rangeDays: 30,
};

async function init() {
  try {
    const response = await fetch(DATA_URL);
    const json = await response.json();
    state.data = json;
    setupAssetSelector(json.assets);
    setupRangeSelector();
    setNarrative(json.narrative, json.generatedAt);
    renderIndicators();
    updateDashboard();
  } catch (error) {
    console.error('Failed to load data', error);
    document.getElementById('chart-caption').textContent =
      '無法載入資料，請稍後再試。';
  }
}

function setupAssetSelector(assets) {
  const select = document.getElementById('asset-select');
  assets.forEach((asset) => {
    const option = document.createElement('option');
    option.value = asset.symbol;
    option.textContent = `${asset.symbol} · ${asset.name}`;
    select.appendChild(option);
  });
  state.selectedSymbol = assets[0]?.symbol;
  select.value = state.selectedSymbol;
  select.addEventListener('change', (event) => {
    state.selectedSymbol = event.target.value;
    updateDashboard();
  });
}

function setupRangeSelector() {
  const rangeSelect = document.getElementById('range-select');
  rangeSelect.value = state.rangeDays.toString();
  rangeSelect.addEventListener('change', (event) => {
    state.rangeDays = Number(event.target.value);
    updateDashboard();
  });
}

function updateDashboard() {
  const asset = state.data.assets.find((item) => item.symbol === state.selectedSymbol);
  if (!asset) return;

  const rangeLimit = dateTime.now().minus({ days: state.rangeDays });
  const filteredPoints = asset.data.filter((point) => dateTime.fromISO(point.date) >= rangeLimit);

  drawChart(asset, filteredPoints);
  renderEvents(filteredPoints);
  updateNarrativeStats(asset, filteredPoints);
}

function drawChart(asset, points) {
  const ctx = document.getElementById('price-chart').getContext('2d');
  const events = state.data.events.filter((event) => event.symbols.includes(asset.symbol));

  const eventAnnotations = events
    .map((event) => ({
      date: event.date,
      impact: event.impact,
      title: event.title,
    }))
    .filter((event) => points.some((p) => p.date === event.date));

  const chartData = {
    labels: points.map((point) => point.date),
    datasets: [
      {
        label: `${asset.symbol} 收盤價`,
        data: points.map((point) => point.close),
        tension: 0.35,
        fill: {
          target: 'origin',
          above: 'rgba(61, 120, 255, 0.22)',
        },
        borderColor: 'rgba(61, 120, 255, 1)',
        pointRadius: 0,
        pointHoverRadius: 4,
        yAxisID: 'price',
      },
      {
        label: '情緒指數',
        data: points.map((point) => point.sentiment),
        borderColor: 'rgba(18, 219, 190, 1)',
        backgroundColor: 'rgba(18, 219, 190, 0.08)',
        pointRadius: 0,
        pointHoverRadius: 4,
        yAxisID: 'sentiment',
        tension: 0.2,
      },
    ],
  };

  const config = {
    type: 'line',
    data: chartData,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        intersect: false,
        mode: 'index',
      },
      scales: {
        x: {
          type: 'time',
          time: {
            parser: 'yyyy-MM-dd',
            tooltipFormat: 'LLL dd',
          },
          ticks: {
            color: 'rgba(240, 246, 252, 0.65)',
          },
          grid: {
            color: 'rgba(240, 246, 252, 0.08)',
          },
        },
        price: {
          position: 'left',
          ticks: {
            color: 'rgba(240, 246, 252, 0.65)',
          },
          grid: {
            color: 'rgba(240, 246, 252, 0.05)',
          },
        },
        sentiment: {
          position: 'right',
          suggestedMin: -1,
          suggestedMax: 1,
          ticks: {
            color: 'rgba(240, 246, 252, 0.65)',
          },
          grid: {
            display: false,
          },
        },
      },
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          callbacks: {
            title(items) {
              const [item] = items;
              const event = eventAnnotations.find((annotation) => annotation.date === item.label);
              return event ? `${item.label}｜${event.title}` : item.label;
            },
          },
        },
      },
    },
  };

  if (state.chart) {
    state.chart.destroy();
  }

  state.chart = new Chart(ctx, config);

  buildLegend(chartData.datasets);
  setChartCaption(points, eventAnnotations);
}

function buildLegend(datasets) {
  const legend = document.getElementById('legend');
  legend.innerHTML = '';
  datasets.forEach((dataset) => {
    const item = document.createElement('span');
    item.textContent = dataset.label;
    item.style.setProperty('--legend-color', dataset.borderColor);
    item.style.color = 'rgba(240, 246, 252, 0.85)';
    legend.appendChild(item);
  });
}

function setChartCaption(points, annotations) {
  if (!points.length) {
    document.getElementById('chart-caption').textContent = '無近期資料';
    return;
  }
  const first = points[0];
  const last = points[points.length - 1];
  const change = ((last.close - first.close) / first.close) * 100;
  const formattedChange = change >= 0 ? `+${change.toFixed(2)}%` : `${change.toFixed(2)}%`;
  const highlight = annotations.slice(0, 3).map((item) => item.title).join('、');

  const captionParts = [
    `${dateTime.fromISO(first.date).toFormat('LLL dd')} 至 ${dateTime
      .fromISO(last.date)
      .toFormat('LLL dd')}`,
    `價格變動 ${formattedChange}`,
  ];

  if (highlight) {
    captionParts.push(`事件焦點：${highlight}`);
  }

  document.getElementById('chart-caption').textContent = captionParts.join(' ｜ ');
}

function renderEvents(points) {
  const container = document.getElementById('event-timeline');
  container.innerHTML = '';

  const pointDates = new Set(points.map((point) => point.date));

  const events = state.data.events
    .filter((event) => event.symbols.includes(state.selectedSymbol))
    .filter((event) => pointDates.has(event.date))
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  if (!events.length) {
    container.innerHTML = '<p class="empty">近期沒有關聯事件。</p>';
    return;
  }

  events.forEach((event) => {
    const item = document.createElement('article');
    item.className = `timeline-item ${event.impact}`;
    item.innerHTML = `
      <time>${dateTime.fromISO(event.date).toFormat('LLL dd')}</time>
      <h4>${event.title}</h4>
      <p>${event.summary}</p>
    `;

    const detailRow = document.createElement('div');
    detailRow.className = 'detail-row';

    const categoryPill = document.createElement('span');
    categoryPill.className = 'pill';
    categoryPill.textContent = `${event.category}｜影響：${event.impact.toUpperCase()}`;
    detailRow.appendChild(categoryPill);

    if (event.sentimentScore !== undefined) {
      const sentimentPill = document.createElement('span');
      sentimentPill.className = 'pill';
      sentimentPill.textContent = `情緒：${formatSentiment(event.sentimentScore)}`;
      detailRow.appendChild(sentimentPill);
    }

    item.appendChild(detailRow);

    if (event.links?.length) {
      const links = document.createElement('div');
      links.className = 'links';
      event.links.forEach((link) => {
        const anchor = document.createElement('a');
        anchor.href = link.url;
        anchor.target = '_blank';
        anchor.rel = 'noopener';
        anchor.textContent = link.label;
        links.appendChild(anchor);
      });
      item.appendChild(links);
    }

    container.appendChild(item);
  });
}

function formatSentiment(value) {
  if (value >= 0.35) return '偏多';
  if (value <= -0.35) return '偏空';
  return '中性';
}

function setNarrative(narrative, generatedAt) {
  const container = document.getElementById('narrative');
  container.innerHTML = '';

  if (!narrative) {
    container.textContent = '敘事摘要準備中。';
    return;
  }

  const timestamp = document.createElement('p');
  timestamp.className = 'generated-at';
  timestamp.textContent = `最後更新：${dateTime.fromISO(generatedAt).toFormat('yyyy/MM/dd HH:mm')} (UTC)`;
  container.appendChild(timestamp);

  const sections = [
    { title: '市場脈動', items: narrative.marketPulse },
    { title: '驅動因素', items: narrative.topDrivers },
    { title: '前瞻觀察', items: narrative.forwardLook },
  ];

  sections.forEach((section) => {
    if (!section.items?.length) return;
    const wrapper = document.createElement('section');
    wrapper.className = 'narrative-section';

    const heading = document.createElement('h4');
    heading.textContent = section.title;
    wrapper.appendChild(heading);

    const list = document.createElement('ul');
    section.items.forEach((item) => {
      const li = document.createElement('li');
      li.textContent = item;
      list.appendChild(li);
    });
    wrapper.appendChild(list);

    container.appendChild(wrapper);
  });
}

function updateNarrativeStats(asset, points) {
  const summary = [];
  if (points.length > 1) {
    const first = points[0];
    const last = points[points.length - 1];
    const change = ((last.close - first.close) / first.close) * 100;
    summary.push(`近 ${points.length} 筆資料，價格變動 ${change.toFixed(2)}%。`);
  }

  const avgSentiment = points.reduce((acc, point) => acc + point.sentiment, 0) / (points.length || 1);
  summary.push(`平均情緒指數 ${avgSentiment.toFixed(2)}，${formatSentiment(avgSentiment)}氣氛。`);

  const caption = document.createElement('p');
  caption.textContent = summary.join(' ');
  caption.className = 'narrative-highlight';

  const narrativeContainer = document.getElementById('narrative');
  const existingHighlight = narrativeContainer.querySelector('.narrative-highlight');
  if (existingHighlight) {
    existingHighlight.replaceWith(caption);
  } else {
    narrativeContainer.appendChild(caption);
  }
}

function renderIndicators() {
  const grid = document.getElementById('indicator-grid');
  grid.innerHTML = '';

  state.data.indicators.forEach((indicator) => {
    const card = document.createElement('div');
    card.className = 'indicator-card';
    card.innerHTML = `
      <h4>${indicator.name}</h4>
      <strong>${indicator.value}</strong>
      <span class="trend ${indicator.trend}">
        <span>${indicator.trend === 'up' ? '▲' : indicator.trend === 'down' ? '▼' : '•'}</span>
        ${indicator.delta}
      </span>
      <p>${indicator.commentary}</p>
    `;
    grid.appendChild(card);
  });
}

init();
