/* SteppeOS v4 — three genkit-derived AI flows:
   flow 1: proactiveRiskDetectionWarning  → risk detection page + dashboard panel
   flow 2: aiGeneratedRegionalInsights    → regional insights page + dashboard panels
   flow 3: simulateDevelopmentScenario    → simulation engine (3-domain output) */
'use strict';
/* CHART.JS DEFAULTS */
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

const P = {
  t0:'#F0F4F8', t1:'#8B99AA', t2:'#4A5668', t3:'#2A333F',
  a:'#A8D8FF', ok:'#6EDBA0', err:'#FF6B6B', warn:'#E8C547',
  b0:'rgba(255,255,255,0.04)', b1:'rgba(255,255,255,0.08)',
  c:['#C8DFF0','#9BBFD8','#6D9EBF','#4A7EA8','#2A5F90','#1A4878']
};

/* NAVIGATION */
const pageTitles = {
  dashboard:'Dashboard', map:'AI Region Map', simulation:'Simulation Engine',
  risks:'Risk Detection', insights:'Regional Insights',
  recommendations:'Recommendations', demographics:'Demographics',
  infrastructure:'Infrastructure', ecology:'Ecology'
};

function navigateTo(pg) {
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const item = document.querySelector(`.nav-item[data-page="${pg}"]`);
  if (item) item.classList.add('active');
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const target = document.getElementById(`page-${pg}`);
  if (target) target.classList.add('active');
  document.getElementById('pageTitle').textContent = pageTitles[pg] || pg;

  if (pg === 'map'           && !window._mapInit)    initMap();
  if (pg === 'demographics'  && !window._demoInit)   initDemoCharts();
  if (pg === 'infrastructure' && !window._infraInit)  initInfraCharts();
  if (pg === 'ecology'       && !window._ecoInit)    initEcoCharts();
  if (pg === 'insights'      && !window._insightsInit) loadInsights();

  if (window.innerWidth <= 960) document.getElementById('sidebar').classList.remove('open');
}

document.querySelectorAll('.nav-item').forEach(item =>
  item.addEventListener('click', e => { e.preventDefault(); navigateTo(item.dataset.page); })
);

document.getElementById('menuToggle').addEventListener('click', () =>
  document.getElementById('sidebar').classList.toggle('open')
);
document.addEventListener('click', e => {
  if (window.innerWidth > 960) return;
  const sb = document.getElementById('sidebar');
  if (sb.classList.contains('open') && !sb.contains(e.target) && !document.getElementById('menuToggle').contains(e.target))
    sb.classList.remove('open');
});

/* CLOCK */
(function tick() {
  const d = new Date(), p = n => String(n).padStart(2,'0');
  document.getElementById('timeBadge').textContent = `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())} AST`;
  setTimeout(tick, 1000);
})();

/* TOAST */
function showToast(msg, type='info') {
  const c = document.getElementById('toastContainer');
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<div class="toast-dot"></div><span>${msg}</span>`;
  c.appendChild(t);
  setTimeout(() => { t.style.animation = 't-out 0.2s ease both'; setTimeout(() => t.remove(), 220); }, 3000);
}
window.showToast = showToast;

/* KPI COUNTERS */
function animateCounters() {
  document.querySelectorAll('.kpi-val[data-target]').forEach(el => {
    const target = parseFloat(el.dataset.target), suffix = el.dataset.suffix || '';
    const dur = 1400, start = performance.now();
    (function step(now) {
      const p = Math.min((now - start) / dur, 1);
      const ease = 1 - Math.pow(1 - p, 3), v = target * ease;
      el.textContent = target >= 1000 ? Math.round(v).toLocaleString() + suffix
        : target < 10 ? v.toFixed(1) + suffix : Math.round(v) + suffix;
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
    const c = document.getElementById(`spark${i}`); if (!c) return;
    const min = Math.min(...data), max = Math.max(...data), range = max - min || 1;
    data.forEach((v, j) => {
      const bar = document.createElement('div'); bar.className = 'spark-bar';
      const pct = (v - min) / range;
      bar.style.height = `${Math.max(2, pct * 20)}px`;
      bar.style.background = j === data.length - 1 ? P.a : P.t3;
      bar.style.opacity = j === data.length - 1 ? '1' : (0.3 + pct * 0.4);
      c.appendChild(bar);
    });
  });
}

/* SHARED SCALE OPTIONS */
function scaleOpts(yCallback) {
  return {
    x: { grid: { color: P.b0 }, ticks: { color: P.t2 } },
    y: { grid: { color: P.b0 }, ticks: { color: P.t2, callback: yCallback } }
  };
}

/* DASHBOARD CHARTS */
function initDashboardCharts() {
  const popYears = ['2019','2020','2021','2022','2023','2024','2025','2026','2027','2028','2029','2030'];
  new Chart(document.getElementById('popChart'), {
    type: 'line',
    data: {
      labels: popYears,
      datasets: [
        { label:'Historical', data:[920,945,963,990,1022,1072,null,null,null,null,null,null], borderColor:P.t1, backgroundColor:'rgba(139,153,170,0.06)', borderWidth:1.5, pointRadius:2.5, pointBackgroundColor:P.t1, tension:0.4, fill:true, spanGaps:false },
        { label:'AI Projected', data:[null,null,null,null,null,1072,1108,1147,1189,1234,1281,1332], borderColor:P.a, backgroundColor:'rgba(168,216,255,0.06)', borderWidth:1.5, borderDash:[4,3], pointRadius:2.5, pointBackgroundColor:P.a, tension:0.4, fill:true, spanGaps:false }
      ]
    },
    options: { responsive:true, maintainAspectRatio:false, plugins:{ legend:{ labels:{ boxWidth:8, padding:14, color:P.t1, pointStyle:'line' } } }, scales:scaleOpts(v => (v/1000).toFixed(0)+'K') }
  });

  new Chart(document.getElementById('sectorChart'), {
    type:'doughnut', data:{ labels:['Services','Industry','Construction','Agriculture','Transport','Other'], datasets:[{ data:[38,24,15,10,9,4], backgroundColor:P.c, borderWidth:0, hoverOffset:4 }] },
    options:{ responsive:true, maintainAspectRatio:false, cutout:'64%', plugins:{ legend:{ position:'right', labels:{ boxWidth:8, padding:10, color:P.t1 } } } }
  });

  const hours = Array.from({length:24},(_,i)=>`${String(i).padStart(2,'0')}:00`);
  const energyBase = [920,880,855,840,858,912,1024,1214,1382,1454,1462,1441,1421,1414,1432,1462,1522,1578,1611,1594,1520,1441,1302,1098];
  const energyData = [...energyBase];
  const eChart = new Chart(document.getElementById('energyChart'), {
    type:'line', data:{ labels:hours, datasets:[{ label:'Load MW', data:energyData, borderColor:P.t0, backgroundColor:'rgba(240,244,248,0.04)', borderWidth:1, pointRadius:0, tension:0.4, fill:true }] },
    options:{ responsive:true, maintainAspectRatio:false, animation:false, plugins:{ legend:{ display:false } }, scales:scaleOpts(v => v+' MW') }
  });
  let lh = new Date().getHours();
  setInterval(() => { lh=(lh+1)%24; energyData[lh]=energyBase[lh]+(Math.random()-0.5)*80; eChart.update('none'); }, 2500);

  new Chart(document.getElementById('infraChart'), {
    type:'bar', data:{ labels:['Alatau','Abay','Al-Farabi','Karatau','Turan','N.Ind'],
      datasets:[
        { label:'Roads',     data:[72,65,88,60,70,55], backgroundColor:P.c[0], borderRadius:2 },
        { label:'Utilities', data:[85,78,91,74,82,68], backgroundColor:P.c[2], borderRadius:2 },
        { label:'Social',    data:[68,72,82,58,66,40], backgroundColor:P.c[4], borderRadius:2 }
      ] },
    options:{ responsive:true, maintainAspectRatio:false, plugins:{ legend:{ labels:{ boxWidth:8, padding:14, color:P.t1 } } }, scales:scaleOpts(v => v+'%') }
  });
}

/* ANTHROPIC API HELPER */
async function callClaude(userPrompt, systemPrompt='') {
  const body = {
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1000,
    messages: [{ role:'user', content: userPrompt }]
  };
  if (systemPrompt) body.system = systemPrompt;
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify(body)
  });
  const d = await res.json();
  return d.content?.[0]?.text || '';
}

function parseJSON(raw) {
  return JSON.parse(raw.replace(/```json\s*/g,'').replace(/```\s*/g,'').trim());
}

/* FLOW 1 — PROACTIVE RISK DETECTION
   Mirrors: proactive-risk-detection-warning-flow.ts
   Input: city metrics → Output: warnings[] + overallSummary */

/* sample data per district (mirrors b2g SAMPLE_INPUT) */
const DISTRICT_METRICS = {
  'Karatau': { currentPopulation:250000, populationGrowthRatePercent:4.5, currentTrafficLoadPercentage:88, trafficCapacityLimitPercentage:95, currentSchoolEnrollment:42000, schoolCapacity:45000, currentEnergyDemandMW:120, energySupplyCapacityMW:140, businessGrowthRatePercent:12.5, housingConstructionRate:5000 },
  'Alatau':  { currentPopulation:224000, populationGrowthRatePercent:3.8, currentTrafficLoadPercentage:74, trafficCapacityLimitPercentage:95, currentSchoolEnrollment:36000, schoolCapacity:41000, currentEnergyDemandMW:104, energySupplyCapacityMW:130, businessGrowthRatePercent:9.2, housingConstructionRate:4200 },
  'Abay':    { currentPopulation:198000, populationGrowthRatePercent:2.9, currentTrafficLoadPercentage:82, trafficCapacityLimitPercentage:95, currentSchoolEnrollment:31000, schoolCapacity:34000, currentEnergyDemandMW:90,  energySupplyCapacityMW:115, businessGrowthRatePercent:7.8, housingConstructionRate:3100 },
  'Al-Farabi':{ currentPopulation:287000, populationGrowthRatePercent:3.1, currentTrafficLoadPercentage:69, trafficCapacityLimitPercentage:95, currentSchoolEnrollment:44000, schoolCapacity:52000, currentEnergyDemandMW:138, energySupplyCapacityMW:165, businessGrowthRatePercent:11.0, housingConstructionRate:4600 },
  'Turan':   { currentPopulation:187000, populationGrowthRatePercent:3.4, currentTrafficLoadPercentage:61, trafficCapacityLimitPercentage:95, currentSchoolEnrollment:28000, schoolCapacity:33000, currentEnergyDemandMW:85,  energySupplyCapacityMW:108, businessGrowthRatePercent:8.5, housingConstructionRate:3400 }
};

const RISK_FALLBACK = {
  warnings:[
    { riskArea:'Traffic', warningMessage:'Abay Avenue projected to exceed 95% capacity within 18 months based on current growth trajectory.', projectedImpactYears:2, severity:'Critical', recommendation:'Commission East-West BRT corridor feasibility study immediately.' },
    { riskArea:'Schools', warningMessage:'School enrollment is growing 3x faster than construction. A 2,400-seat shortfall is projected by 2029.', projectedImpactYears:3, severity:'High', recommendation:'Approve 3 new school construction sites in Alatau and Turan districts.' },
    { riskArea:'Energy', warningMessage:'Summer peak demand will exceed supply capacity if Karatau residential expansion proceeds without grid reinforcement.', projectedImpactYears:2, severity:'High', recommendation:'Commission grid reinforcement study for Karatau substation.' }
  ],
  overallSummary:'Karatau District faces compounding growth pressures across traffic, education, and energy infrastructure. Immediate planning action is required in all three areas to prevent cascading service failures.'
};

async function loadRiskData(district='Karatau') {
  const grid   = document.getElementById('riskGrid');
  const loading= document.getElementById('riskLoadingState');
  const sumBar = document.getElementById('riskSummaryBar');
  const sumText= document.getElementById('riskSummaryText');

  grid.style.display = 'none';
  sumBar.style.display = 'none';
  loading.style.display = 'flex';

  const m = DISTRICT_METRICS[district] || DISTRICT_METRICS['Karatau'];

  const prompt = `You are an official regional risk assessment system for Shymkent, Kazakhstan.
Analyze the following data for ${district} district and identify infrastructure overloads projected within 1-5 years.

Current Data:
- Population: ${m.currentPopulation.toLocaleString()} (Growth: ${m.populationGrowthRatePercent}%/yr)
- Traffic Load: ${m.currentTrafficLoadPercentage}% of capacity (Critical limit: ${m.trafficCapacityLimitPercentage}%)
- School Enrollment: ${m.currentSchoolEnrollment.toLocaleString()} (Capacity: ${m.schoolCapacity.toLocaleString()})
- Energy Demand: ${m.currentEnergyDemandMW} MW (Supply: ${m.energySupplyCapacityMW} MW)
- Business Growth: ${m.businessGrowthRatePercent}%/yr
- Housing Construction: ${m.housingConstructionRate.toLocaleString()} units/yr

Return ONLY valid JSON (no markdown) matching this exact structure:
{
  "warnings": [
    {
      "riskArea": "string (e.g. Traffic, Schools, Energy, Water, Housing)",
      "warningMessage": "1-2 sentence description of the risk",
      "projectedImpactYears": number,
      "severity": "Low" | "Medium" | "High" | "Critical",
      "recommendation": "One actionable official recommendation"
    }
  ],
  "overallSummary": "2-sentence official summary of the district status"
}
Identify 3-5 risks. Use formal, administrative tone. Be concise and direct.`;

  let data;
  try {
    const raw = await callClaude(prompt);
    data = parseJSON(raw);
  } catch {
    data = RISK_FALLBACK;
    showToast('Using cached risk data', 'info');
  }

  loading.style.display = 'none';

  // update summary bar
  sumText.textContent = data.overallSummary;
  sumBar.style.display = 'flex';

  // update risk badge count
  const critCount = data.warnings.filter(w => w.severity === 'Critical' || w.severity === 'High').length;
  document.getElementById('riskBadge').textContent = critCount;

  // update dashboard risk panel
  updateDashboardRisks(data.warnings.slice(0, 3));

  // build risk grid
  grid.innerHTML = '';
  data.warnings.forEach(risk => {
    const sevColor = { Critical:'var(--err)', High:'var(--warn)', Medium:'var(--t1)', Low:'var(--ok)' }[risk.severity] || 'var(--t1)';
    const sevClass = { Critical:'critical', High:'high', Medium:'medium', Low:'low' }[risk.severity] || 'medium';
    const barW     = { Critical:92, High:72, Medium:50, Low:28 }[risk.severity] || 50;
    const card = document.createElement('div');
    card.className = 'risk-card';
    card.innerHTML = `
      <div class="risk-card-top">
        <span class="risk-badge ${sevClass}">${risk.severity}</span>
        <span class="risk-time">~${risk.projectedImpactYears || '?'} yr${(risk.projectedImpactYears||1)!==1?'s':''}</span>
      </div>
      <div class="risk-title">${risk.riskArea}</div>
      <div class="risk-body">${risk.warningMessage}</div>
      <div class="risk-bar-label">Risk Level</div>
      <div class="risk-bar"><div class="risk-fill" style="width:${barW}%;background:${sevColor}"></div></div>
      <div class="risk-rec">
        <svg viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1"><polyline points="2 5 4 7 8 3"/></svg>
        ${risk.recommendation}
      </div>
      <div class="risk-actions">
        <button class="risk-btn accent" onclick="navigateTo('simulation')">Simulate</button>
        <button class="risk-btn" onclick="showToast('Task assigned to Planning Dept','success')">Assign</button>
      </div>`;
    grid.appendChild(card);
  });
  grid.style.display = 'grid';
  window._riskData = data;
}

function updateDashboardRisks(warnings) {
  const el = document.getElementById('dashRiskList');
  if (!el) return;
  el.innerHTML = warnings.map(w => {
    const cls = { Critical:'err', High:'err', Medium:'warn', Low:'' }[w.severity] || 'warn';
    return `<div class="alert-item">
      <span class="alert-sev ${cls}">${w.severity.slice(0,4)}</span>
      <div><div class="alert-title">${w.riskArea}</div><div class="alert-desc">${w.warningMessage.slice(0,80)}…</div></div>
    </div>`;
  }).join('');
  // also update KPI delta
  const d = document.getElementById('riskKpiDesc');
  if (d) {
    const c = warnings.filter(w => w.severity==='Critical').length;
    const h = warnings.filter(w => w.severity==='High').length;
    d.textContent = `${c} critical · ${h} high priority`;
  }
}

document.getElementById('riskRefreshBtn')?.addEventListener('click', () => {
  const d = document.getElementById('riskDistrict').value;
  loadRiskData(d);
});
document.getElementById('riskDistrict')?.addEventListener('change', function() {
  loadRiskData(this.value);
});

/* FLOW 2 — AI REGIONAL INSIGHTS
   Mirrors: ai-generated-regional-insights-flow.ts
   Input: districtName + historical data → Output: summary + keyTrends[] + recommendations[] */

/* historical data per district (mirrors b2g MOCK_HISTORICAL_DATA) */
const DISTRICT_HISTORY = {
  'Al-Farabi District':  { pop:[{year:2020,population:262000},{year:2021,population:271000},{year:2022,population:279000},{year:2023,population:287000}], biz:[{year:2020,businessCount:3100},{year:2021,businessCount:3450},{year:2022,businessCount:3900},{year:2023,businessCount:4400}], infra:[{year:2020,usagePercentage:62},{year:2021,usagePercentage:68},{year:2022,usagePercentage:74},{year:2023,usagePercentage:81}] },
  'Alatau District':     { pop:[{year:2020,population:198000},{year:2021,population:206000},{year:2022,population:215000},{year:2023,population:224000}], biz:[{year:2020,businessCount:2100},{year:2021,businessCount:2450},{year:2022,businessCount:2900},{year:2023,businessCount:3400}], infra:[{year:2020,usagePercentage:65},{year:2021,usagePercentage:72},{year:2022,usagePercentage:78},{year:2023,usagePercentage:84}] },
  'Abay District':       { pop:[{year:2020,population:178000},{year:2021,population:185000},{year:2022,population:191000},{year:2023,population:198000}], biz:[{year:2020,businessCount:1800},{year:2021,businessCount:2100},{year:2022,businessCount:2350},{year:2023,businessCount:2700}], infra:[{year:2020,usagePercentage:70},{year:2021,usagePercentage:75},{year:2022,usagePercentage:80},{year:2023,usagePercentage:87}] },
  'Karatau District':    { pop:[{year:2020,population:218000},{year:2021,population:228000},{year:2022,population:239000},{year:2023,population:250000}], biz:[{year:2020,businessCount:2400},{year:2021,businessCount:2800},{year:2022,businessCount:3300},{year:2023,businessCount:3900}], infra:[{year:2020,usagePercentage:72},{year:2021,usagePercentage:79},{year:2022,usagePercentage:86},{year:2023,usagePercentage:92}] },
  'Turan District':      { pop:[{year:2020,population:164000},{year:2021,population:171000},{year:2022,population:179000},{year:2023,population:187000}], biz:[{year:2020,businessCount:1600},{year:2021,businessCount:1900},{year:2022,businessCount:2200},{year:2023,businessCount:2600}], infra:[{year:2020,usagePercentage:55},{year:2021,usagePercentage:61},{year:2022,usagePercentage:68},{year:2023,usagePercentage:73}] }
};

const INSIGHTS_FALLBACK = {
  summaryInsights: 'Al-Farabi District is the largest and most commercially active in Shymkent, with a population of 287,000 and strong business formation. Infrastructure usage has risen to 81%, approaching stress thresholds and requiring near-term investment.',
  keyTrends: ['Business registrations growing at 12.7% annually — fastest in the metro area', 'Population density increasing due to migration from rural southern Kazakhstan', 'Infrastructure utilization rising 5-6 percentage points per year since 2020'],
  recommendations: ['Expand the Al-Farabi road network to accommodate 15% traffic growth by 2026', 'Develop two new primary schools in the northern subdistrict before 2027', 'Commission grid capacity study for commercial zone given 81% infrastructure load']
};

async function loadInsights(district='Al-Farabi District') {
  window._insightsInit = true;
  const loadEl = document.getElementById('insightsLoadingState');
  const contentEl = document.getElementById('insightsContent');
  loadEl.style.display = 'flex';
  contentEl.style.display = 'none';

  const h = DISTRICT_HISTORY[district] || DISTRICT_HISTORY['Al-Farabi District'];

  const prompt = `You are an official AI analysis system for regional management in Shymkent, Kazakhstan.
Analyze the following data for ${district} and provide a concise professional assessment.

Population Data:
${h.pop.map(d=>`- Year: ${d.year}, Population: ${d.population.toLocaleString()}`).join('\n')}

Business Growth Data:
${h.biz.map(d=>`- Year: ${d.year}, Business Count: ${d.businessCount.toLocaleString()}`).join('\n')}

Infrastructure Usage Data:
${h.infra.map(d=>`- Year: ${d.year}, Usage: ${d.usagePercentage}%`).join('\n')}

Return ONLY valid JSON (no markdown) with this exact structure:
{
  "summaryInsights": "2-3 sentence official summary of current district status and key emerging trends",
  "keyTrends": ["trend 1", "trend 2", "trend 3"],
  "recommendations": ["recommendation 1", "recommendation 2", "recommendation 3"]
}
Use formal, administrative tone. Be concise and direct. No fluff.`;

  let data;
  try {
    const raw = await callClaude(prompt);
    data = parseJSON(raw);
  } catch {
    data = INSIGHTS_FALLBACK;
    showToast('Using cached insights data', 'info');
  }

  loadEl.style.display = 'none';
  contentEl.style.display = 'block';

  // populate summary
  document.getElementById('insightsSummary').textContent = data.summaryInsights;

  // populate trends
  const trendsEl = document.getElementById('insightsTrends');
  trendsEl.innerHTML = data.keyTrends.map(t =>
    `<div class="insights-list-item up">
      <svg viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.2"><polyline points="1 7 4 4 7 6 9 2"/></svg>
      ${t}
    </div>`
  ).join('');

  // populate recommendations
  const recsEl = document.getElementById('insightsRecs');
  recsEl.innerHTML = data.recommendations.map(r =>
    `<div class="insights-list-item">
      <svg viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.2"><polyline points="2 5 4 7 8 3"/></svg>
      ${r}
    </div>`
  ).join('');

  // populate demographic bars (from b2g pattern)
  const barsEl = document.getElementById('insightsDemoBars');
  const maxPop = Math.max(...h.pop.map(d => d.population));
  barsEl.innerHTML = h.pop.map(d =>
    `<div class="demo-bar-row">
      <div class="demo-bar-meta">
        <span>${d.year}</span>
        <span>${(d.population/1000).toFixed(0)}K</span>
      </div>
      <div class="demo-bar-track">
        <div class="demo-bar-fill" style="width:${(d.population/maxPop*100).toFixed(1)}%"></div>
      </div>
    </div>`
  ).join('');

  // update dashboard district analysis panel
  const insightEl = document.getElementById('insightText');
  if (insightEl) insightEl.textContent = data.summaryInsights;

  // update dashboard recommendations panel
  const recListEl = document.getElementById('dashRecList');
  if (recListEl) {
    recListEl.innerHTML = data.recommendations.map((r, i) =>
      `<div class="rec-item">
        <span class="rec-num">0${i+1}</span>
        <div><div class="rec-desc">${r}</div></div>
      </div>`
    ).join('');
  }
}

document.getElementById('insightsRefreshBtn')?.addEventListener('click', () => {
  const d = document.getElementById('insightsDistrict').value;
  window._insightsInit = false;
  loadInsights(d);
});

/* ── AI BRIEFING STRIP (quick summary from insights) ── */
async function loadBriefingStrip() {
  const el = document.getElementById('briefingText');
  const prompt = `You are SteppeOS AI for Shymkent, Kazakhstan (pop 1.07M). Write exactly ONE sentence — a crisp daily status summary for city planners. Include one specific number. Official tone. No preamble.`;
  try {
    const text = await callClaude(prompt);
    el.innerHTML = '';
    let i = 0;
    (function type() { if (i < text.length) { el.textContent += text[i++]; setTimeout(type, 12); } })();
  } catch {
    el.textContent = 'Shymkent maintains 2.3% annual growth — Karatau and Alatau districts require urgent infrastructure review ahead of the 2025 budget cycle.';
  }
}

/* FLOW 3 — DEVELOPMENT SCENARIO SIMULATION
   Mirrors: development-scenario-simulation-flow.ts
   Input: projectName + type + location + description
   Output: economicImpact + trafficImpact + environmentalImpact + overallSummary */

document.getElementById('runSimBtn')?.addEventListener('click', async () => {
  const btn = document.getElementById('runSimBtn');
  const name = document.getElementById('projectName').value.trim();
  const type = document.getElementById('scenarioType').value;
  const district = document.getElementById('locationDistrict').value;
  const desc = document.getElementById('projectDesc').value.trim();

  if (!name) { showToast('Enter a project name first', 'error'); return; }
  if (!desc)  { showToast('Add a project description', 'error'); return; }

  btn.disabled = true;
  btn.innerHTML = `<span class="dot-loader"><span></span><span></span><span></span></span> Simulating…`;
  document.getElementById('simResults').innerHTML = `
    <div class="sim-loading-state">
      <div class="dot-loader" style="gap:5px"><span></span><span></span><span></span></div>
      <div class="sim-loading-text">
        <div style="font-size:12px;font-weight:600;color:var(--t0);margin-bottom:5px">Processing Regional Model…</div>
        <div style="font-size:10px;color:var(--t2)">Cross-referencing population data, traffic patterns, and energy requirements for ${district}.</div>
      </div>
    </div>`;
  showToast('AI simulation running…', 'info');

  const prompt = `You are an official urban development analyst for Shymkent, Kazakhstan.
Simulate the impact of the following proposed development project. Use an official, administrative tone.

Project Name: ${name}
Project Type: ${type}
Location: ${district}, Shymkent, Kazakhstan
Project Description: ${desc}

Return ONLY valid JSON (no markdown) matching this exact structure:
{
  "economicImpact": {
    "jobCreation": "e.g. 1,200 direct jobs + 800 indirect",
    "economicGrowthPercentage": "e.g. +2.8% local GDP",
    "revenueImpact": "e.g. ₸420M additional annual tax revenue"
  },
  "trafficImpact": {
    "congestionIncrease": "e.g. +15% peak-hour load on adjacent roads",
    "publicTransportUsageChange": "e.g. +8% demand on Bus Route 14",
    "infrastructureNeeds": "e.g. New interchange at Abay/Tauke junction"
  },
  "environmentalImpact": {
    "carbonEmissionsChange": "e.g. +4,200 tCO2/year at full operation",
    "resourceConsumptionChange": "e.g. +18 MW electricity, +2,400 m³/day water",
    "pollutionNotes": "e.g. Dust mitigation plan required during 18-month construction phase"
  },
  "overallSummary": "2-sentence official summary of projected net impact"
}`;

  let result;
  const fallbacks = {
    factory:      { economicImpact:{ jobCreation:'3,200 direct + 1,800 indirect jobs', economicGrowthPercentage:'+4.2% local GDP over 5 years', revenueImpact:'₸840M annual tax revenue' }, trafficImpact:{ congestionIncrease:'+22% peak-hour load on access roads', publicTransportUsageChange:'+12% demand on freight routes', infrastructureNeeds:'Dedicated industrial access road from M-39 highway required' }, environmentalImpact:{ carbonEmissionsChange:'+12,400 tCO2/year at full capacity', resourceConsumptionChange:'+180 MW electricity, +8,500 m³/day water', pollutionNotes:'Enhanced air filtration and wastewater treatment mandatory per Kazakh environmental standards' }, overallSummary:`${name} in ${district} will generate 3,200 jobs and ₸840M annually. Environmental controls and a dedicated access road are required pre-construction.` },
    residential:  { economicImpact:{ jobCreation:'2,100 construction + 400 permanent service jobs', economicGrowthPercentage:'+3.1% district GDP', revenueImpact:'₸520M additional property and service tax' }, trafficImpact:{ congestionIncrease:'+18% residential traffic on local roads', publicTransportUsageChange:'+15% on adjacent bus routes', infrastructureNeeds:'New feeder road and bus stop on north approach required' }, environmentalImpact:{ carbonEmissionsChange:'+3,200 tCO2/year operational emissions', resourceConsumptionChange:'+95 MW electricity, +4,200 m³/day water', pollutionNotes:'Green space ratio must meet 9m² per resident per city standard' }, overallSummary:`${name} will house approximately 14,000 new residents and generate ₸520M in annual tax. Grid reinforcement in ${district} must precede occupancy.` },
    school:       { economicImpact:{ jobCreation:'420 education and administrative jobs', economicGrowthPercentage:'+0.4% human capital index', revenueImpact:'₸80M annual economic activity' }, trafficImpact:{ congestionIncrease:'+8% morning peak on adjacent streets', publicTransportUsageChange:'+6% on school-hour routes', infrastructureNeeds:'Safe pedestrian crossing and drop-off zone on main approach' }, environmentalImpact:{ carbonEmissionsChange:'+240 tCO2/year operational', resourceConsumptionChange:'+8 MW, +320 m³/day', pollutionNotes:'Low-emission facility. Solar panels recommended per 2024 efficiency standards' }, overallSummary:`${name} in ${district} will address the district capacity shortfall and create 420 jobs. Traffic management around school hours requires advance planning.` },
    park:         { economicImpact:{ jobCreation:'120 maintenance and service positions', economicGrowthPercentage:'+0.2% area property values', revenueImpact:'₸30M annual indirect economic benefit' }, trafficImpact:{ congestionIncrease:'Negligible — weekend peak only', publicTransportUsageChange:'+3% on adjacent weekend routes', infrastructureNeeds:'Pedestrian path connections to nearest residential areas' }, environmentalImpact:{ carbonEmissionsChange:'-800 tCO2/year carbon sequestration', resourceConsumptionChange:'+2 MW lighting, +180 m³/day irrigation', pollutionNotes:'Net environmental positive. Biodiversity corridor integration recommended' }, overallSummary:`${name} delivers the highest ecological return of any project type — carbon sequestration and urban cooling offset the modest operational cost. Minimal infrastructure impact.` }
  };
  const fb = fallbacks[type] || fallbacks['factory'];
  try {
    const raw = await callClaude(prompt);
    result = parseJSON(raw);
  } catch {
    result = fb;
    showToast('Simulation complete (offline mode)', 'success');
  }

  renderSimResult(result, name, district);
  showToast('Simulation complete', 'success');
  btn.disabled = false;
  btn.innerHTML = `<svg viewBox="0 0 12 12" fill="currentColor"><path d="M3 2l7 4-7 4V2z"/></svg> Run AI Simulation`;
});

function renderSimResult(r, name, district) {
  const el = document.getElementById('simResults');
  el.innerHTML = `
    <div class="sim-output">
      <div class="sim-output-header">
        <div class="sim-output-check">
          <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.4"><polyline points="2 6 5 9 10 3"/></svg>
          Simulation Complete
        </div>
        <div class="sim-output-name">${name}</div>
        <div class="sim-output-summary">${r.overallSummary}</div>
      </div>

      <div class="sim-three-domains">
        <!-- Economic -->
        <div class="sim-domain">
          <div class="sim-domain-title economic">
            <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.2"><polyline points="1 9 4 5 7 7 11 2"/></svg>
            Economic Impact
          </div>
          <div class="sim-domain-rows">
            <div class="sim-domain-row"><div class="sdr-lbl">Job Creation</div><div class="sdr-val ok">${r.economicImpact.jobCreation}</div></div>
            <div class="sim-domain-row"><div class="sdr-lbl">Growth Projection</div><div class="sdr-val ok">${r.economicImpact.economicGrowthPercentage}</div></div>
            <div class="sim-domain-row"><div class="sdr-lbl">Revenue Impact</div><div class="sdr-val">${r.economicImpact.revenueImpact}</div></div>
          </div>
        </div>

        <!-- Traffic -->
        <div class="sim-domain">
          <div class="sim-domain-title traffic">
            <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.2"><rect x="1" y="4" width="10" height="5" rx="1"/><circle cx="4" cy="9" r="1.5"/><circle cx="8" cy="9" r="1.5"/><path d="M3 4V3a2 2 0 0 1 6 0v1"/></svg>
            Traffic & Logistics
          </div>
          <div class="sim-domain-rows">
            <div class="sim-domain-row"><div class="sdr-lbl">Congestion Delta</div><div class="sdr-val warn">${r.trafficImpact.congestionIncrease}</div></div>
            <div class="sim-domain-row"><div class="sdr-lbl">Transit Usage</div><div class="sdr-val">${r.trafficImpact.publicTransportUsageChange}</div></div>
            <div class="sim-domain-row critical-rec"><div class="sdr-lbl">Critical Infra Need</div><div class="sdr-val err">${r.trafficImpact.infrastructureNeeds}</div></div>
          </div>
        </div>

        <!-- Environmental -->
        <div class="sim-domain">
          <div class="sim-domain-title env">
            <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M6 11V7m0 0C6 4 3 2 1 2.5c0 3 1.5 5 5 4.5m0 0c0-3 3-5 5-4.5-1 3-3 5-5 4.5"/></svg>
            Environmental
          </div>
          <div class="sim-domain-rows">
            <div class="sim-domain-row"><div class="sdr-lbl">Carbon Change</div><div class="sdr-val">${r.environmentalImpact.carbonEmissionsChange}</div></div>
            <div class="sim-domain-row"><div class="sdr-lbl">Resource Demand</div><div class="sdr-val">${r.environmentalImpact.resourceConsumptionChange}</div></div>
            <div class="sim-domain-row"><div class="sdr-lbl">Pollution Notes</div><div class="sdr-val">${r.environmentalImpact.pollutionNotes}</div></div>
          </div>
        </div>
      </div>
    </div>`;
}

/* MAP */
function initMap() {
  window._mapInit = true;
  const map = L.map('leafletMap', { center:[42.320,69.596], zoom:12, zoomControl:true, attributionControl:false });
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom:19, opacity:0.85 }).addTo(map);

  function circleIcon(color, size=12) {
    return L.divIcon({ html:`<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:1px solid rgba(255,255,255,0.2);box-shadow:0 0 8px ${color}55;"></div>`, className:'', iconAnchor:[size/2,size/2] });
  }
  function hexIcon(color) {
    return L.divIcon({ html:`<svg viewBox="0 0 18 18" width="18" height="18"><polygon points="9,1 17,5 17,13 9,17 1,13 1,5" fill="${color}44" stroke="${color}" stroke-width="1"/></svg>`, className:'', iconAnchor:[9,9] });
  }
  const popOpts = { maxWidth:280, className:'' };
  [[42.317,69.590,'Central Bus Terminal','Inter-city hub · 1.2M passengers/year'],[42.335,69.620,'North Transport Junction','Freight & logistics · M39 highway node'],[42.305,69.575,'South Transit Hub','Karatau/Turan service'],[42.328,69.550,'Western Interchange','Turkestan highway connection']].forEach(([lat,lng,name,d])=>L.marker([lat,lng],{icon:circleIcon('#7DC8FF',13)}).addTo(map).bindPopup(`<b style="color:#A8D8FF">${name}</b><br><span style="color:#8B99AA">${d}</span>`,popOpts));
  [[42.350,69.610,'North Industrial Zone','Chemical cluster · 12,000 employed'],[42.310,69.640,'East Manufacturing District','Food processing · 4,800 workers'],[42.290,69.580,'South Processing Zone','Textile & garment']].forEach(([lat,lng,name,d])=>L.marker([lat,lng],{icon:hexIcon('#D4B94A')}).addTo(map).bindPopup(`<b style="color:#E8C547">${name}</b><br><span style="color:#8B99AA">${d}</span>`,popOpts));
  [[42.320,69.570,'Syr Darya Green Belt','Ecological corridor'],[42.305,69.610,'Abay Central Park','Urban green · 8.2m²/capita'],[42.340,69.585,'Botanical Reserve','Protected zone']].forEach(([lat,lng,name,d])=>L.marker([lat,lng],{icon:circleIcon('#6EDBA0',12)}).addTo(map).bindPopup(`<b style="color:#6EDBA0">${name}</b><br><span style="color:#8B99AA">${d}</span>`,popOpts));
  L.circle([42.324,69.605],{color:'#FF6B6B',fillColor:'#FF6B6B',fillOpacity:0.06,weight:1,radius:600,dashArray:'5 4'}).addTo(map).bindPopup('<b style="color:#FF6B6B">⚠ HIGH: Abay Ave Congestion</b><br><span style="color:#8B99AA">Projected capacity breach Q2 2025.</span>',popOpts);
  L.circle([42.345,69.620],{color:'#E8C547',fillColor:'#E8C547',fillOpacity:0.05,weight:1,radius:800,dashArray:'5 4'}).addTo(map).bindPopup('<b style="color:#E8C547">⚠ HIGH: Air Quality — Industrial Zone</b><br><span style="color:#8B99AA">PM2.5 trending above threshold.</span>',popOpts);
  L.marker([42.320,69.596],{icon:L.divIcon({html:'<div style="width:14px;height:14px;border-radius:50%;background:#F0F4F8;border:2px solid rgba(168,216,255,0.6);box-shadow:0 0 10px rgba(168,216,255,0.4)"></div>',className:'',iconAnchor:[7,7]})}).addTo(map).bindPopup('<b style="color:#A8D8FF">Shymkent City Center</b><br><span style="color:#8B99AA">Pop. 1,072,000 · Regional Capital</span>',popOpts);

  document.querySelectorAll('.layer-btn').forEach(btn => btn.addEventListener('click', () => { btn.classList.toggle('active'); showToast(`Layer "${btn.textContent.trim()}" ${btn.classList.contains('active')?'enabled':'disabled'}`, 'info'); }));
  document.getElementById('mapSearch').addEventListener('keydown', e => {
    if (e.key!=='Enter') return;
    const q=e.target.value.toLowerCase();
    if (q.includes('north')||q.includes('industrial')) map.flyTo([42.350,69.610],14);
    else if (q.includes('park')||q.includes('green')) map.flyTo([42.305,69.610],14);
    else if (q.includes('bus')||q.includes('transit')) map.flyTo([42.317,69.590],14);
    else if (q.includes('center')||q.includes('city')) map.flyTo([42.320,69.596],13);
    else { showToast('Location not found', 'error'); return; }
    showToast(`Navigating to "${e.target.value}"`, 'info');
  });
}

/* DEMOGRAPHICS */
function initDemoCharts() {
  window._demoInit = true;
  new Chart(document.getElementById('ageChart'), { type:'bar', data:{ labels:['0–9','10–19','20–29','30–39','40–49','50–59','60–69','70+'], datasets:[{ data:[16.2,15.8,18.4,16.9,13.2,10.1,6.4,3.0], backgroundColor:P.c, borderRadius:3 }] }, options:{ responsive:true, maintainAspectRatio:false, plugins:{ legend:{ display:false } }, scales:scaleOpts(v=>v+'%') } });
  new Chart(document.getElementById('districtChart'), { type:'doughnut', data:{ labels:['Alatau','Abay','Al-Farabi','Karatau','Turan'], datasets:[{ data:[224,198,287,176,187], backgroundColor:P.c, borderWidth:0, hoverOffset:4 }] }, options:{ responsive:true, maintainAspectRatio:false, cutout:'62%', plugins:{ legend:{ position:'right', labels:{ boxWidth:8, padding:10, color:P.t1 } } } } });
  new Chart(document.getElementById('growthChart'), { type:'bar', data:{ labels:['Alatau','Abay','Al-Farabi','Karatau','Turan'], datasets:[{ label:'2024', data:[224,198,287,176,187], backgroundColor:P.c[3], borderRadius:2 }, { label:'2029 (Projected)', data:[264,216,311,194,224], backgroundColor:P.c[0], borderRadius:2 }] }, options:{ responsive:true, maintainAspectRatio:false, plugins:{ legend:{ labels:{ boxWidth:8, padding:14, color:P.t1 } } }, scales:scaleOpts(v=>v+'K') } });
}

/* INFRASTRUCTURE */
function initInfraCharts() {
  window._infraInit = true;
  new Chart(document.getElementById('investChart'), { type:'bar', data:{ labels:['2019','2020','2021','2022','2023','2024','2025*'], datasets:[{ data:[2.1,2.4,1.8,3.2,4.1,5.6,6.8], backgroundColor:P.c, borderRadius:3 }] }, options:{ responsive:true, maintainAspectRatio:false, plugins:{ legend:{ display:false } }, scales:scaleOpts(v=>'₸'+v+'B') } });
  new Chart(document.getElementById('conditionChart'), { type:'radar', data:{ labels:['Roads','Water','Electricity','Gas','Telecom','Sewage'], datasets:[{ label:'Condition', data:[68,82,91,74,88,65], borderColor:P.t1, backgroundColor:'rgba(139,153,170,0.06)', borderWidth:1.5, pointBackgroundColor:P.t0, pointRadius:3 }] }, options:{ responsive:true, maintainAspectRatio:false, scales:{ r:{ min:0, max:100, grid:{ color:P.b0 }, angleLines:{ color:P.b0 }, pointLabels:{ color:P.t1, font:{size:10} }, ticks:{ display:false } } }, plugins:{ legend:{ display:false } } } });
}

/* ECOLOGY */
function initEcoCharts() {
  window._ecoInit = true;
  const months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  new Chart(document.getElementById('airChart'), { type:'line', data:{ labels:months, datasets:[{ label:'Industrial Zone', data:[42,38,35,28,24,22,19,21,26,38,46,51], borderColor:P.err, backgroundColor:'rgba(255,107,107,0.05)', borderWidth:1.5, pointRadius:2, tension:0.4, fill:true },{ label:'City Average', data:[28,25,22,18,15,13,12,13,17,24,30,34], borderColor:P.t0, backgroundColor:'rgba(240,244,248,0.04)', borderWidth:1.5, pointRadius:2, tension:0.4, fill:true },{ label:'WHO Limit (25)', data:Array(12).fill(25), borderColor:P.warn, borderWidth:1, borderDash:[5,4], pointRadius:0 }] }, options:{ responsive:true, maintainAspectRatio:false, plugins:{ legend:{ labels:{ boxWidth:8, padding:14, color:P.t1 } } }, scales:scaleOpts(v=>v+' μg/m³') } });
  new Chart(document.getElementById('landChart'), { type:'pie', data:{ labels:['Residential','Industrial','Commercial','Green','Transport','Agriculture','Other'], datasets:[{ data:[38,18,12,11,9,8,4], backgroundColor:P.c.concat(P.t2), borderWidth:0, hoverOffset:4 }] }, options:{ responsive:true, maintainAspectRatio:false, plugins:{ legend:{ position:'right', labels:{ boxWidth:8, padding:10, color:P.t1 } } } } });
}

/* AI CHAT */
document.getElementById('aiChatToggle')?.addEventListener('click', () => document.getElementById('aiChat').classList.toggle('collapsed'));
const chatHistory = [];
async function sendChat() {
  const inp = document.getElementById('chatInput');
  const msg = inp.value.trim(); if (!msg) return; inp.value = '';
  const msgs = document.getElementById('chatMessages');
  msgs.innerHTML += `<div class="chat-msg user"><div class="chat-avatar">YOU</div><div class="chat-bubble">${msg}</div></div>`;
  const tid = 't'+Date.now();
  msgs.innerHTML += `<div class="chat-msg assistant" id="${tid}"><div class="chat-avatar">AI</div><div class="chat-bubble"><span class="dot-loader"><span></span><span></span><span></span></span></div></div>`;
  msgs.scrollTop = msgs.scrollHeight;
  chatHistory.push({role:'user',content:msg});
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ model:'claude-sonnet-4-20250514', max_tokens:1000, system:`You are SteppeOS AI, regional intelligence assistant for Shymkent, Kazakhstan (pop 1.07M). Answer in 2-3 sentences. Be specific, use real numbers. Professional and concise.`, messages:chatHistory }) });
    const d = await res.json(); const reply = d.content?.[0]?.text || 'Analysis unavailable.';
    chatHistory.push({role:'assistant',content:reply});
    document.getElementById(tid)?.remove();
    msgs.innerHTML += `<div class="chat-msg assistant"><div class="chat-avatar">AI</div><div class="chat-bubble">${reply}</div></div>`;
  } catch {
    const fb = msg.toLowerCase().includes('risk') ? 'The AI risk detection system has identified 3 active alerts — 1 critical (traffic) and 2 high (education, air quality). Navigate to Risk Detection for the full breakdown.'
      : msg.toLowerCase().includes('simulation') ? 'The simulation engine models economic, traffic, and environmental impacts independently using the development scenario flow. Enter a project name and description and run the forecast.'
      : msg.toLowerCase().includes('insight') ? 'Regional Insights analyzes population, business, and infrastructure trends per district and produces structured trend lists and recommendations. Select a district and click Analyze.'
      : 'Based on current SteppeOS data, Shymkent shows accelerated growth across all key indicators. Which sector — risks, insights, or simulation — would you like me to expand on?';
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
  const map={'1':'dashboard','2':'map','3':'simulation','4':'risks','5':'insights','6':'recommendations','7':'demographics','8':'infrastructure','9':'ecology'};
  if (map[e.key]) { e.preventDefault(); navigateTo(map[e.key]); showToast(`→ ${pageTitles[map[e.key]]}`, 'info'); }
});

/* INIT */
window.addEventListener('load', () => {
  buildSparklines();
  setTimeout(animateCounters, 200);
  setTimeout(initDashboardCharts, 100);
  // load all three AI flows on startup
  setTimeout(() => loadBriefingStrip(), 300);
  setTimeout(() => loadRiskData('Karatau'), 400);
  setTimeout(() => loadInsights('Al-Farabi District'), 600);
  showToast('SteppeOS v4.0 · AI Flows Active', 'success');
});

window.navigateTo = navigateTo;
