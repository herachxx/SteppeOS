'use strict';

/* CHART.JS GLOBAL DEFAULTS */
Chart.defaults.color = '#4A5668';
Chart.defaults.borderColor = 'rgba(255,255,255,0.06)';
Chart.defaults.font.family = "'IBM Plex Mono', monospace";
Chart.defaults.font.size = 10;
Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(14,17,20,0.97)';
Chart.defaults.plugins.tooltip.borderColor = 'rgba(255,255,255,0.12)';
Chart.defaults.plugins.tooltip.borderWidth = 1;
Chart.defaults.plugins.tooltip.padding = 8;
Chart.defaults.plugins.tooltip.titleFont = { family: "'IBM Plex Mono', monospace", size: 10, weight: '600' };
Chart.defaults.plugins.tooltip.bodyFont  = { family: "'IBM Plex Mono', monospace", size: 10 };

/* PALETTE */
const P = {
  t0: '#F0F4F8', t1: '#8B99AA', t2: '#4A5668', t3: '#2A333F',
  a: '#A8D8FF', ok: '#6EDBA0', err: '#FF6B6B', warn: '#E8C547',
  b0: 'rgba(255,255,255,0.04)', b1: 'rgba(255,255,255,0.08)',
  // chart series — muted, monochromatic range
  c: ['#C8DFF0','#9BBFD8','#6D9EBF','#4A7EA8','#2A5F90','#1A4878']
};

/* NAVIGATION */
const pageTitles = {
  dashboard: 'Dashboard', map: 'AI Region Map',
  simulation: 'Simulation Engine', risks: 'Risk Detection',
  recommendations: 'Recommendations', demographics: 'Demographics',
  infrastructure: 'Infrastructure', ecology: 'Ecology'
};

function navigateTo(pg) {
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const item = document.querySelector(`.nav-item[data-page="${pg}"]`);
  if (item) item.classList.add('active');
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const target = document.getElementById(`page-${pg}`);
  if (target) target.classList.add('active');
  document.getElementById('pageTitle').textContent = pageTitles[pg] || pg;

  if (pg === 'map'            && !window._mapInit)   initMap();
  if (pg === 'demographics'   && !window._demoInit)  initDemoCharts();
  if (pg === 'infrastructure'  && !window._infraInit) initInfraCharts();
  if (pg === 'ecology'        && !window._ecoInit)   initEcoCharts();

  if (window.innerWidth <= 960) {
    document.getElementById('sidebar').classList.remove('open');
  }
}

document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', e => { e.preventDefault(); navigateTo(item.dataset.page); });
});

/* mobile menu */
document.getElementById('menuToggle').addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('open');
});
document.addEventListener('click', e => {
  if (window.innerWidth > 960) return;
  const sb = document.getElementById('sidebar');
  if (sb.classList.contains('open') &&
      !sb.contains(e.target) &&
      !document.getElementById('menuToggle').contains(e.target)) {
    sb.classList.remove('open');
  }
});

/* CLOCK */
(function tick() {
  const d = new Date(), p = n => String(n).padStart(2,'0');
  document.getElementById('timeBadge').textContent =
    `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())} AST`;
  setTimeout(tick, 1000);
})();

/* TOAST */
function showToast(msg, type='info') {
  const c = document.getElementById('toastContainer');
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<div class="toast-dot"></div><span>${msg}</span>`;
  c.appendChild(t);
  setTimeout(() => {
    t.style.animation = 't-out 0.2s ease both';
    setTimeout(() => t.remove(), 220);
  }, 3000);
}
window.showToast = showToast;

/* KPI COUNTER */
function animateCounters() {
  document.querySelectorAll('.kpi-val[data-target]').forEach(el => {
    const target = parseFloat(el.dataset.target);
    const suffix = el.dataset.suffix || '';
    const dur = 1400, start = performance.now();
    (function step(now) {
      const p = Math.min((now - start) / dur, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      const v = target * ease;
      el.textContent = target >= 1000
        ? Math.round(v).toLocaleString() + suffix
        : target < 10 ? v.toFixed(1) + suffix
        : Math.round(v) + suffix;
      if (p < 1) requestAnimationFrame(step);
    })(performance.now());
  });
}

/* SPARKLINES */
const sparkData = [
  [820,880,920,960,990,1020,1047,1072],
  [54,61,65,70,72,75,80,84],
  [1980,1920,1880,1850,1830,1845,1838,1840],
  [5,4,6,4,5,3,4,3],
  [3.8,4.2,4.6,5.0,5.4,5.7,5.9,6.2],
  [88,89,90,91,92,93,93.5,94]
];

function buildSparklines() {
  sparkData.forEach((data, i) => {
    const c = document.getElementById(`spark${i}`);
    if (!c) return;
    const min = Math.min(...data), max = Math.max(...data), range = max - min || 1;
    data.forEach((v, j) => {
      const bar = document.createElement('div');
      bar.className = 'spark-bar';
      const pct = (v - min) / range;
      bar.style.height = `${Math.max(2, pct * 20)}px`;
      // last bar highlighted
      bar.style.background = j === data.length - 1 ? P.a : P.t3;
      bar.style.opacity = j === data.length - 1 ? '1' : (0.3 + pct * 0.4);
      c.appendChild(bar);
    });
  });
}

/* SHARED CHART OPTIONS */
function scaleOpts(yCallback) {
  return {
    x: { grid: { color: P.b0 }, ticks: { color: P.t2 } },
    y: { grid: { color: P.b0 }, ticks: { color: P.t2, callback: yCallback } }
  };
}

/* DASHBOARD CHARTS */
function initDashboardCharts() {
  /* population forecast */
  const popYears = ['2019','2020','2021','2022','2023','2024','2025','2026','2027','2028','2029','2030'];
  const hist  = [920,945,963,990,1022,1072,null,null,null,null,null,null];
  const proj  = [null,null,null,null,null,1072,1108,1147,1189,1234,1281,1332];

  new Chart(document.getElementById('popChart'), {
    type: 'line',
    data: {
      labels: popYears,
      datasets: [
        {
          label: 'Historical',
          data: hist,
          borderColor: P.t1,
          backgroundColor: 'rgba(139,153,170,0.06)',
          borderWidth: 1.5, pointRadius: 2.5, pointBackgroundColor: P.t1,
          tension: 0.4, fill: true, spanGaps: false
        },
        {
          label: 'AI Projected',
          data: proj,
          borderColor: P.a,
          backgroundColor: 'rgba(168,216,255,0.06)',
          borderWidth: 1.5, borderDash: [4,3], pointRadius: 2.5, pointBackgroundColor: P.a,
          tension: 0.4, fill: true, spanGaps: false
        }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { labels: { boxWidth: 8, padding: 14, color: P.t1, pointStyle: 'line' } } },
      scales: scaleOpts(v => (v/1000).toFixed(0)+'K')
    }
  });

  /* economic sectors */
  new Chart(document.getElementById('sectorChart'), {
    type: 'doughnut',
    data: {
      labels: ['Services','Industry','Construction','Agriculture','Transport','Other'],
      datasets: [{
        data: [38,24,15,10,9,4],
        backgroundColor: P.c,
        borderWidth: 0, hoverOffset: 4
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: '64%',
      plugins: { legend: { position: 'right', labels: { boxWidth: 8, padding: 10, color: P.t1 } } }
    }
  });

  /* live energy */
  const hours = Array.from({length:24},(_,i)=>`${String(i).padStart(2,'0')}:00`);
  const energyBase = [920,880,855,840,858,912,1024,1214,1382,1454,1462,1441,1421,1414,1432,1462,1522,1578,1611,1594,1520,1441,1302,1098];
  const energyData = [...energyBase];

  const eChart = new Chart(document.getElementById('energyChart'), {
    type: 'line',
    data: {
      labels: hours,
      datasets: [{
        label: 'Load MW',
        data: energyData,
        borderColor: P.t0,
        backgroundColor: 'rgba(240,244,248,0.04)',
        borderWidth: 1, pointRadius: 0, tension: 0.4, fill: true
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false, animation: false,
      plugins: { legend: { display: false } },
      scales: scaleOpts(v => v+' MW')
    }
  });

  let lh = new Date().getHours();
  setInterval(() => {
    lh = (lh + 1) % 24;
    energyData[lh] = energyBase[lh] + (Math.random() - 0.5) * 80;
    eChart.update('none');
  }, 2500);

  /* infrastructure index */
  new Chart(document.getElementById('infraChart'), {
    type: 'bar',
    data: {
      labels: ['Alatau','Abay','Al-Farabi','Karatau','Turan','N.Ind'],
      datasets: [
        { label: 'Roads',     data: [72,65,88,60,70,55], backgroundColor: P.c[0], borderRadius: 2 },
        { label: 'Utilities', data: [85,78,91,74,82,68], backgroundColor: P.c[2], borderRadius: 2 },
        { label: 'Social',    data: [68,72,82,58,66,40], backgroundColor: P.c[4], borderRadius: 2 }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { labels: { boxWidth: 8, padding: 14, color: P.t1 } } },
      scales: scaleOpts(v => v+'%')
    }
  });
}

/* ── AI DAILY BRIEFING ── */
async function loadAIInsight() {
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: `You are SteppeOS AI for Shymkent, Kazakhstan (pop 1.07M, fastest-growing Kazakh city).
Write a concise daily briefing for city planners: 3 sentences only.
Include: one current status fact, one key trend with a specific number, one actionable recommendation.
Professional, data-driven tone. No bullet points. No preamble.`
        }]
      })
    });
    const d = await res.json();
    const text = d.content?.[0]?.text || '';
    const el = document.getElementById('insightText');
    if (!el || !text) return;
    el.innerHTML = '';
    let i = 0;
    (function type() {
      if (i < text.length) { el.textContent += text[i++]; setTimeout(type, 10); }
    })();
  } catch {
    document.getElementById('insightText').textContent =
      "Shymkent's population growth of 2.3% annually remains the highest in Kazakhstan, with Alatau and Turan districts showing the steepest density increases. AI models project a 2,400-seat educational shortfall by 2029 absent immediate investment in northern districts. Prioritize the East–West BRT corridor feasibility study and the North Industrial Rezoning proposal for Q3 budget allocation.";
  }
}

/* MAP */
function initMap() {
  window._mapInit = true;
  const map = L.map('leafletMap', { center: [42.320, 69.596], zoom: 12, zoomControl: true, attributionControl: false });
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom: 19, opacity: 0.85 }).addTo(map);

  function circleIcon(color, size=12) {
    return L.divIcon({
      html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:1px solid rgba(255,255,255,0.2);box-shadow:0 0 8px ${color}55;"></div>`,
      className:'', iconAnchor:[size/2,size/2]
    });
  }
  function hexIcon(color) {
    return L.divIcon({
      html: `<svg viewBox="0 0 18 18" width="18" height="18"><polygon points="9,1 17,5 17,13 9,17 1,13 1,5" fill="${color}44" stroke="${color}" stroke-width="1"/></svg>`,
      className:'', iconAnchor:[9,9]
    });
  }

  const popOpts = { maxWidth:280, className:'' };

  [
    [42.317,69.590,'Central Bus Terminal','Inter-city hub · 1.2M passengers/year'],
    [42.335,69.620,'North Transport Junction','Freight & logistics · M39 highway node'],
    [42.305,69.575,'South Transit Hub','Karatau/Turan service · High demand route'],
    [42.328,69.550,'Western Interchange','Turkestan region highway connection']
  ].forEach(([lat,lng,name,detail]) =>
    L.marker([lat,lng],{icon:circleIcon('#7DC8FF',13)}).addTo(map)
      .bindPopup(`<b style="color:#A8D8FF">${name}</b><br><span style="color:#8B99AA">${detail}</span>`, popOpts)
  );

  [
    [42.350,69.610,'North Industrial Zone','Chemical cluster · 12,000 employed'],
    [42.310,69.640,'East Manufacturing District','Food processing · 4,800 workers'],
    [42.290,69.580,'South Processing Zone','Textile & garment · +8% YoY']
  ].forEach(([lat,lng,name,detail]) =>
    L.marker([lat,lng],{icon:hexIcon('#D4B94A')}).addTo(map)
      .bindPopup(`<b style="color:#E8C547">${name}</b><br><span style="color:#8B99AA">${detail}</span>`, popOpts)
  );

  [
    [42.320,69.570,'Syr Darya Green Belt','Ecological corridor · Buffer expansion recommended'],
    [42.305,69.610,'Abay Central Park','Urban green · 8.2m²/capita — below WHO target'],
    [42.340,69.585,'Botanical Reserve','Protected zone · Water table monitoring active']
  ].forEach(([lat,lng,name,detail]) =>
    L.marker([lat,lng],{icon:circleIcon('#6EDBA0',12)}).addTo(map)
      .bindPopup(`<b style="color:#6EDBA0">${name}</b><br><span style="color:#8B99AA">${detail}</span>`, popOpts)
  );

  L.circle([42.324,69.605],{color:'#FF6B6B',fillColor:'#FF6B6B',fillOpacity:0.06,weight:1,radius:600,dashArray:'5 4'})
    .addTo(map).bindPopup('<b style="color:#FF6B6B">⚠ HIGH: Abay Ave Congestion</b><br><span style="color:#8B99AA">Projected capacity breach Q2 2025.</span>',popOpts);
  L.circle([42.345,69.620],{color:'#E8C547',fillColor:'#E8C547',fillOpacity:0.05,weight:1,radius:800,dashArray:'5 4'})
    .addTo(map).bindPopup('<b style="color:#E8C547">⚠ HIGH: Air Quality — Industrial Zone</b><br><span style="color:#8B99AA">PM2.5 trending above threshold.</span>',popOpts);

  L.marker([42.320,69.596],{icon:L.divIcon({html:'<div style="width:14px;height:14px;border-radius:50%;background:#F0F4F8;border:2px solid rgba(168,216,255,0.6);box-shadow:0 0 10px rgba(168,216,255,0.4)"></div>',className:'',iconAnchor:[7,7]})})
    .addTo(map).bindPopup('<b style="color:#A8D8FF">Shymkent City Center</b><br><span style="color:#8B99AA">Pop. 1,072,000 · Regional Capital</span>',popOpts);

  document.querySelectorAll('.layer-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.classList.toggle('active');
      showToast(`Layer "${btn.textContent.trim()}" ${btn.classList.contains('active')?'enabled':'disabled'}`, 'info');
    });
  });

  document.getElementById('mapSearch').addEventListener('keydown', e => {
    if (e.key !== 'Enter') return;
    const q = e.target.value.toLowerCase();
    if (q.includes('north')||q.includes('industrial')) map.flyTo([42.350,69.610],14);
    else if (q.includes('park')||q.includes('green')) map.flyTo([42.305,69.610],14);
    else if (q.includes('bus')||q.includes('transit')) map.flyTo([42.317,69.590],14);
    else if (q.includes('center')||q.includes('city')) map.flyTo([42.320,69.596],13);
    else { showToast('Location not found', 'error'); return; }
    showToast(`Navigating to "${e.target.value}"`, 'info');
  });
}

/* SIMULATION */
document.getElementById('investScale')?.addEventListener('input', function() {
  document.getElementById('investVal').textContent = '₸' + this.value + 'B';
});
document.getElementById('horizonScale')?.addEventListener('input', function() {
  document.getElementById('horizonVal').textContent = this.value + ' years';
});

document.getElementById('runSimBtn')?.addEventListener('click', async () => {
  const btn = document.getElementById('runSimBtn');
  const type = document.getElementById('scenarioType').value;
  const district = document.getElementById('locationDistrict').value;
  const invest = document.getElementById('investScale').value;
  const horizon = document.getElementById('horizonScale').value;
  const names = {factory:'Industrial Facility',road:'Road / Highway',school:'Educational Campus',hospital:'Healthcare Complex',residential:'Residential District',park:'Green Park'};

  btn.disabled = true;
  btn.innerHTML = `<span class="dot-loader"><span></span><span></span><span></span></span> Simulating…`;
  showToast('AI simulation running…', 'info');

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        model:'claude-sonnet-4-20250514', max_tokens:1000,
        messages:[{role:'user',content:`You are SteppeOS simulation AI for Shymkent, KZ.
Return ONLY valid JSON, no markdown or comments.
Scenario: ${names[type]} in ${district}, ₸${invest}B, ${horizon}-year horizon.
JSON shape: {"jobsCreated":number,"economicGrowth":"+X.X%","energyDemand":"+X MW","populationEffect":"+X,XXX","yearlyGdpContrib":"₸X.XB","envScore":number,"narrative":"2 sentences","chartData":[${horizon} numbers]}`}]
      })
    });
    const d = await res.json();
    const raw = d.content?.[0]?.text || '{}';
    const result = JSON.parse(raw.replace(/```json|```/g,'').trim());
    renderSim(result, names[type], district, horizon);
    showToast('Simulation complete', 'success');
  } catch {
    const fb = {
      factory:  {jobsCreated:3200,economicGrowth:'+4.2%',energyDemand:'+180 MW',populationEffect:'+8,400',yearlyGdpContrib:'₸1.8B',envScore:-45,narrative:`The ${names[type]} in ${district} will generate 3,200 jobs and ₸1.8B annually over ${horizon} years. Environmental controls are mandatory to offset the −45 ecological impact.`,chartData:Array.from({length:parseInt(horizon)||5},(_,i)=>+(0.3*(i+1)+0.2*Math.random()).toFixed(2))},
      road:     {jobsCreated:1800,economicGrowth:'+2.1%',energyDemand:'+20 MW',populationEffect:'+2,100',yearlyGdpContrib:'₸0.9B',envScore:-15,narrative:`Road construction in ${district} boosts local GDP by 2.1% over ${horizon} years. 1,800 construction and permanent jobs are created.`,chartData:Array.from({length:parseInt(horizon)||5},(_,i)=>+(0.15*(i+1)+0.05*Math.random()).toFixed(2))},
      school:   {jobsCreated:420,economicGrowth:'+0.4%',energyDemand:'+8 MW',populationEffect:'+1,200',yearlyGdpContrib:'₸0.2B',envScore:5,narrative:`School expansion in ${district} addresses the growing capacity shortfall. 420 education-sector jobs are created with a positive long-term human capital impact.`,chartData:Array.from({length:parseInt(horizon)||5},(_,i)=>+(0.04*(i+1)).toFixed(2))},
      hospital: {jobsCreated:680,economicGrowth:'+0.6%',energyDemand:'+15 MW',populationEffect:'+900',yearlyGdpContrib:'₸0.3B',envScore:10,narrative:`Healthcare infrastructure in ${district} creates 680 jobs and improves regional health outcomes. Reduced travel costs benefit the entire metro area.`,chartData:Array.from({length:parseInt(horizon)||5},(_,i)=>+(0.06*(i+1)).toFixed(2))},
      residential:{jobsCreated:2100,economicGrowth:'+3.1%',energyDemand:'+95 MW',populationEffect:'+14,000',yearlyGdpContrib:'₸1.1B',envScore:-20,narrative:`Residential development in ${district} accommodates 14,000 new residents and drives ₸1.1B in economic activity. Grid reinforcement is required before occupancy.`,chartData:Array.from({length:parseInt(horizon)||5},(_,i)=>+(0.22*(i+1)+0.05*Math.random()).toFixed(2))},
      park:     {jobsCreated:120,economicGrowth:'+0.2%',energyDemand:'-5 MW',populationEffect:'+500',yearlyGdpContrib:'₸0.1B',envScore:85,narrative:`Green park development in ${district} delivers the highest ecological impact (+85 score) of any scenario type. Slight energy demand reduction from urban heat island mitigation.`,chartData:Array.from({length:parseInt(horizon)||5},(_,i)=>+(0.02*(i+1)).toFixed(2))}
    };
    renderSim(fb[type]||fb.factory, names[type], district, horizon);
    showToast('Simulation complete (offline)', 'success');
  }

  btn.disabled = false;
  btn.innerHTML = `<svg viewBox="0 0 12 12" fill="currentColor"><path d="M3 2l7 4-7 4V2z"/></svg> Run AI Simulation`;
});

function renderSim(r, name, district, horizon) {
  const el = document.getElementById('simResults');
  const envC = r.envScore > 0 ? 'ok' : r.envScore > -30 ? 'warn' : 'err';
  el.innerHTML = `
    <div class="sim-output">
      <div class="sim-output-title">${name} · ${district}</div>
      <div class="sim-metrics">
        <div class="sim-metric"><div class="sm-lbl">Jobs Created</div><div class="sm-val pos">${(r.jobsCreated||0).toLocaleString()}</div></div>
        <div class="sim-metric"><div class="sm-lbl">Economic Growth</div><div class="sm-val pos">${r.economicGrowth||'—'}</div></div>
        <div class="sim-metric"><div class="sm-lbl">Energy Demand</div><div class="sm-val neu">${r.energyDemand||'—'}</div></div>
        <div class="sim-metric"><div class="sm-lbl">Population Effect</div><div class="sm-val pos">${r.populationEffect||'—'}</div></div>
        <div class="sim-metric"><div class="sm-lbl">Annual GDP</div><div class="sm-val pos">${r.yearlyGdpContrib||'—'}</div></div>
        <div class="sim-metric"><div class="sm-lbl">Env. Score</div><div class="sm-val ${envC}">${(r.envScore>0?'+':'')+(r.envScore||0)}</div></div>
      </div>
      <div class="sim-chart-wrap"><canvas id="simChart"></canvas></div>
      <div class="sim-narrative">${r.narrative||''}</div>
    </div>`;

  const cd = (r.chartData||[]).slice(0, parseInt(horizon)||10);
  const labels = cd.map((_,i)=>`Y${i+1}`);
  new Chart(document.getElementById('simChart'), {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Output (₸B)',
        data: cd,
        backgroundColor: cd.map(v => v >= 0 ? 'rgba(168,216,255,0.35)' : 'rgba(255,107,107,0.35)'),
        borderColor: cd.map(v => v >= 0 ? P.a : P.err),
        borderWidth: 1, borderRadius: 2
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: scaleOpts(v => '₸'+v+'B')
    }
  });
}

/* DEMOGRAPHICS CHARTS */
function initDemoCharts() {
  window._demoInit = true;

  new Chart(document.getElementById('ageChart'), {
    type: 'bar',
    data: {
      labels: ['0–9','10–19','20–29','30–39','40–49','50–59','60–69','70+'],
      datasets: [{ data: [16.2,15.8,18.4,16.9,13.2,10.1,6.4,3.0], backgroundColor: P.c, borderRadius: 3 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: scaleOpts(v => v+'%')
    }
  });

  new Chart(document.getElementById('districtChart'), {
    type: 'doughnut',
    data: {
      labels: ['Alatau','Abay','Al-Farabi','Karatau','Turan'],
      datasets: [{ data: [224,198,287,176,187], backgroundColor: P.c, borderWidth: 0, hoverOffset: 4 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: '62%',
      plugins: { legend: { position: 'right', labels: { boxWidth: 8, padding: 10, color: P.t1 } } }
    }
  });

  new Chart(document.getElementById('growthChart'), {
    type: 'bar',
    data: {
      labels: ['Alatau','Abay','Al-Farabi','Karatau','Turan'],
      datasets: [
        { label: '2024',              data: [224,198,287,176,187], backgroundColor: P.c[3], borderRadius: 2 },
        { label: '2029 (Projected)',   data: [264,216,311,194,224], backgroundColor: P.c[0], borderRadius: 2 }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { labels: { boxWidth: 8, padding: 14, color: P.t1 } } },
      scales: scaleOpts(v => v+'K')
    }
  });
}

/* INFRASTRUCTURE CHARTS */
function initInfraCharts() {
  window._infraInit = true;

  new Chart(document.getElementById('investChart'), {
    type: 'bar',
    data: {
      labels: ['2019','2020','2021','2022','2023','2024','2025*'],
      datasets: [{ data: [2.1,2.4,1.8,3.2,4.1,5.6,6.8], backgroundColor: P.c, borderRadius: 3 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: scaleOpts(v => '₸'+v+'B')
    }
  });

  new Chart(document.getElementById('conditionChart'), {
    type: 'radar',
    data: {
      labels: ['Roads','Water','Electricity','Gas','Telecom','Sewage'],
      datasets: [{
        label: 'Condition', data: [68,82,91,74,88,65],
        borderColor: P.t1, backgroundColor: 'rgba(139,153,170,0.06)',
        borderWidth: 1.5, pointBackgroundColor: P.t0, pointRadius: 3,
        pointBorderColor: 'var(--s0)'
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      scales: { r: { min:0, max:100, grid: { color: P.b0 }, angleLines: { color: P.b0 }, pointLabels: { color: P.t1, font:{size:10} }, ticks: { display:false } } },
      plugins: { legend: { display: false } }
    }
  });
}

/* ECOLOGY CHARTS */
function initEcoCharts() {
  window._ecoInit = true;
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  new Chart(document.getElementById('airChart'), {
    type: 'line',
    data: {
      labels: months,
      datasets: [
        { label: 'Industrial Zone', data: [42,38,35,28,24,22,19,21,26,38,46,51], borderColor: P.err, backgroundColor: 'rgba(255,107,107,0.05)', borderWidth: 1.5, pointRadius: 2, tension: 0.4, fill: true },
        { label: 'City Average',    data: [28,25,22,18,15,13,12,13,17,24,30,34], borderColor: P.t0, backgroundColor: 'rgba(240,244,248,0.04)', borderWidth: 1.5, pointRadius: 2, tension: 0.4, fill: true },
        { label: 'WHO Limit (25)',  data: Array(12).fill(25), borderColor: P.warn, borderWidth: 1, borderDash: [5,4], pointRadius: 0 }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { labels: { boxWidth: 8, padding: 14, color: P.t1 } } },
      scales: scaleOpts(v => v+' μg/m³')
    }
  });

  new Chart(document.getElementById('landChart'), {
    type: 'pie',
    data: {
      labels: ['Residential','Industrial','Commercial','Green','Transport','Agriculture','Other'],
      datasets: [{ data: [38,18,12,11,9,8,4], backgroundColor: P.c.concat(P.t2), borderWidth: 0, hoverOffset: 4 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'right', labels: { boxWidth: 8, padding: 10, color: P.t1 } } }
    }
  });
}

/* AI CHAT */
document.getElementById('aiChatToggle')?.addEventListener('click', () => {
  document.getElementById('aiChat').classList.toggle('collapsed');
});

const chatHistory = [];

async function sendChat() {
  const inp = document.getElementById('chatInput');
  const msg = inp.value.trim();
  if (!msg) return;
  inp.value = '';

  const msgs = document.getElementById('chatMessages');
  msgs.innerHTML += `<div class="chat-msg user"><div class="chat-avatar">YOU</div><div class="chat-bubble">${msg}</div></div>`;
  const tid = 't' + Date.now();
  msgs.innerHTML += `<div class="chat-msg assistant" id="${tid}"><div class="chat-avatar">AI</div><div class="chat-bubble"><span class="dot-loader"><span></span><span></span><span></span></span></div></div>`;
  msgs.scrollTop = msgs.scrollHeight;

  chatHistory.push({role:'user', content:msg});

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        model:'claude-sonnet-4-20250514', max_tokens:1000,
        system:`You are SteppeOS AI, regional intelligence assistant for Shymkent, Kazakhstan (pop 1.07M). Answer in 2-3 sentences. Be specific, use real numbers. Professional and concise.`,
        messages: chatHistory
      })
    });
    const d = await res.json();
    const reply = d.content?.[0]?.text || 'Analysis unavailable.';
    chatHistory.push({role:'assistant', content:reply});
    document.getElementById(tid)?.remove();
    msgs.innerHTML += `<div class="chat-msg assistant"><div class="chat-avatar">AI</div><div class="chat-bubble">${reply}</div></div>`;
  } catch {
    const lower = msg.toLowerCase();
    const fb = lower.includes('population') ? "Shymkent reached 1,072,000 residents in 2024, sustaining a 2.3% annual growth rate — the highest among Kazakhstani cities. AI models project 1.33 million by 2030."
      : lower.includes('traffic') ? "Abay Avenue is projected to exceed 78% peak capacity by Q2 2025. The East–West BRT corridor is the highest-impact intervention, reducing peak congestion by 31%."
      : lower.includes('energy') ? "Current demand stands at 1,840 MW. Grid reinforcement in Karatau district is recommended before 2026 residential expansion pushes peak load above safe thresholds."
      : lower.includes('school') ? "Alatau and Turan districts face a combined 2,400-seat educational shortfall by 2029. Three optimal school sites have been identified using density and transit accessibility scoring."
      : "Based on current SteppeOS data, Shymkent shows accelerated growth across all key indicators. Which sector would you like me to analyze?";
    document.getElementById(tid)?.remove();
    msgs.innerHTML += `<div class="chat-msg assistant"><div class="chat-avatar">AI</div><div class="chat-bubble">${fb}</div></div>`;
  }
  msgs.scrollTop = msgs.scrollHeight;
}

document.getElementById('chatSend')?.addEventListener('click', sendChat);
document.getElementById('chatInput')?.addEventListener('keydown', e => { if (e.key==='Enter') sendChat(); });

/* KEYBOARD SHORTCUTS */
document.addEventListener('keydown', e => {
  if (!e.altKey) return;
  const map = {'1':'dashboard','2':'map','3':'simulation','4':'risks','5':'recommendations','6':'demographics','7':'infrastructure','8':'ecology'};
  if (map[e.key]) { e.preventDefault(); navigateTo(map[e.key]); showToast(`→ ${pageTitles[map[e.key]]}`, 'info'); }
});

/* INIT */
window.addEventListener('load', () => {
  buildSparklines();
  setTimeout(animateCounters, 200);
  setTimeout(initDashboardCharts, 100);
  setTimeout(loadAIInsight, 500);
  showToast('SteppeOS v3.0 · Ready', 'success');
});

window.navigateTo = navigateTo;
