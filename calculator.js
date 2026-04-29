let currentTheme = 'light';

const BTU_CONVERSIONS = {
  btuToWatts: btu => btu * 0.29307107,
  wattsToBtu: w => w * 3.41214,
  btuToKw: btu => btu * 0.000293071,
  kwToBtu: kw => kw * 3412.14,
  btuToTons: btu => btu / 12000,
  tonsToBtu: tons => tons * 12000,
  btuhrToKw: btuhr => btuhr * 0.000293071,
  kwToBtuhr: kw => kw * 3412.14,
  btuToCfm: (btu, deltaT) => btu / (1.08 * deltaT),
  cfmToBtu: (cfm, deltaT) => cfm * 1.08 * deltaT,
  btuToJoules: btu => btu * 1055.06,
  joulesToBtu: j => j / 1055.06,
  btuToTherms: btu => btu / 100000,
  thermsToBtu: therms => therms * 100000,
  btuToHorsepower: btu => btu / 2545.0,
  horsepowerToBtu: hp => hp * 2545.0,
  btuToCalories: btu => btu * 251.996,
  caloriesToBtu: cal => cal / 251.996,
  btuToKcal: btu => btu * 0.251996,
  kcalToBtu: kcal => kcal / 0.251996,
  btuToMcf: btu => btu / 1037000,
  mcfToBtu: mcf => mcf * 1037000,
};

function qs(selector, scope = document) { return scope.querySelector(selector); }
function qsa(selector, scope = document) { return [...scope.querySelectorAll(selector)]; }
function round(value, step = 1) { return Math.round(value / step) * step; }
function formatNumber(value, decimals = 0) {
  return Number(value).toLocaleString('en-US', { maximumFractionDigits: decimals, minimumFractionDigits: decimals });
}
function safeNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : NaN;
}
function showError(form, message) {
  const error = qs('.form-error', form);
  if (error) {
    error.textContent = message;
    error.hidden = false;
  }
}
function clearError(form) {
  const error = qs('.form-error', form);
  if (error) {
    error.textContent = '';
    error.hidden = true;
  }
}
function setTheme(theme) {
  currentTheme = theme;
  document.documentElement.setAttribute('data-theme', theme);
  qsa('[data-theme-toggle]').forEach(btn => { btn.textContent = theme === 'dark' ? '☀️' : '🌙'; });
}
function initTheme() {
  setTheme(currentTheme);
  qsa('[data-theme-toggle]').forEach(btn => btn.addEventListener('click', () => setTheme(currentTheme === 'dark' ? 'light' : 'dark')));
}
function initMenu() {
  const hamburger = qs('.hamburger');
  const mobilePanel = qs('.mobile-panel');
  if (!hamburger || !mobilePanel) return;
  hamburger.addEventListener('click', () => {
    const expanded = hamburger.getAttribute('aria-expanded') === 'true';
    hamburger.setAttribute('aria-expanded', String(!expanded));
    mobilePanel.classList.toggle('open', !expanded);
  });
}
function initUnitToggles() {
  qsa('[data-unit-group]').forEach(group => {
    qsa('.unit-btn', group).forEach(btn => {
      btn.addEventListener('click', () => {
        qsa('.unit-btn', group).forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        group.dataset.unit = btn.dataset.unit;
      });
    });
  });
}
function getUnit(groupId) {
  const group = document.getElementById(groupId);
  return group?.dataset.unit || 'ft';
}
function toFeet(value, unit) { return unit === 'm' ? value * 3.28084 : value; }
function copyText(text) {
  return navigator.clipboard.writeText(text);
}
function resetForm(formId, resultId, placeholderId) {
  const form = document.getElementById(formId);
  if (!form) return;
  form.reset();
  qsa('[data-unit-group]').forEach(group => {
    group.dataset.unit = 'ft';
    qsa('.unit-btn', group).forEach((btn, index) => btn.classList.toggle('active', index === 0));
  });
  const result = document.getElementById(resultId);
  const placeholder = document.getElementById(placeholderId);
  if (result) result.hidden = true;
  if (placeholder) placeholder.hidden = false;
  clearError(form);
}
function revealResult(resultId, placeholderId) {
  const result = document.getElementById(resultId);
  const placeholder = document.getElementById(placeholderId);
  if (result) result.hidden = false;
  if (placeholder) placeholder.hidden = true;
}
function calculateACBtu(lengthFt, widthFt, ceilingFt, climateZone, sunExposure, occupants, hasKitchen, insulation) {
  const sqft = lengthFt * widthFt;
  let btu = sqft * 20;
  const climateMultiplier = { hot: 1.2, mixed: 1.1, moderate: 1.0, cool: 0.9, verycold: 0.8 };
  btu *= climateMultiplier[climateZone] || 1;
  if (ceilingFt > 8) btu *= ceilingFt / 8;
  if (sunExposure === 'heavy') btu *= 1.1;
  if (sunExposure === 'shaded') btu *= 0.9;
  if (occupants > 2) btu += (occupants - 2) * 600;
  if (hasKitchen) btu += 4000;
  const insulationMultiplier = { poor: 1.15, average: 1.0, good: 0.9, excellent: 0.82 };
  btu *= insulationMultiplier[insulation] || 1;
  return round(btu, 500);
}
function calculateHeatingBtu(sqft, floors, climateZone, insulation, ceilingFt, windows, fuelType, afue) {
  const climateFactors = { verycold: 50, cold: 40, mixed: 35, warm: 25, hot: 20 };
  let btuPerSqft = climateFactors[climateZone] || 35;
  const insulationAdjust = { poor: 1.25, average: 1.0, good: 0.85, excellent: 0.7 };
  btuPerSqft *= insulationAdjust[insulation] || 1;
  if (ceilingFt > 8) btuPerSqft *= ceilingFt / 8;
  const windowAdjust = { few: 0.95, average: 1.0, many: 1.1 };
  btuPerSqft *= windowAdjust[windows] || 1;
  let requiredBtu = sqft * btuPerSqft;
  if (floors > 1) requiredBtu *= 1 + (floors - 1) * 0.04;
  if (['gas', 'oil', 'propane'].includes(fuelType)) requiredBtu /= afue / 100;
  return round(requiredBtu, 1000);
}
function estimateHeatingCost(requiredBtu, fuelType, efficiency) {
  const fuelRates = {
    gas: { unitCost: 1.55, btuPerUnit: 100000, label: '$/therm' },
    oil: { unitCost: 4.1, btuPerUnit: 138500, label: '$/gal' },
    electric: { unitCost: 0.17, btuPerUnit: 3412, label: '$/kWh' },
    propane: { unitCost: 2.9, btuPerUnit: 91500, label: '$/gal' },
    heatpump: { unitCost: 0.17, btuPerUnit: 3412 * 2.8, label: '$/kWh' }
  };
  const rate = fuelRates[fuelType] || fuelRates.gas;
  const annualLoad = requiredBtu * 1200;
  const delivered = annualLoad / (efficiency || 1);
  return (delivered / rate.btuPerUnit) * rate.unitCost;
}
function getSuggestedACUnit(btu) {
  if (btu <= 12000) return 'Window AC or portable AC';
  if (btu <= 24000) return 'Mini split or large window AC';
  if (btu <= 36000) return 'Ductless mini split or central AC zone';
  return 'Central AC or multi-zone mini split';
}
function initACCalculator() {
  const form = document.getElementById('ac-form');
  if (!form) return;
  form.addEventListener('submit', event => {
    event.preventDefault();
    clearError(form);
    const unit = getUnit('ac-unit-group');
    const length = toFeet(safeNumber(qs('#ac-length').value), unit);
    const width = toFeet(safeNumber(qs('#ac-width').value), unit);
    const ceiling = safeNumber(qs('#ac-ceiling').value);
    const occupants = safeNumber(qs('#ac-occupants').value);
    if ([length, width, ceiling, occupants].some(v => !Number.isFinite(v) || v <= 0)) return showError(form, 'Please enter valid room dimensions and occupancy values.');
    const btu = calculateACBtu(length, width, ceiling, qs('#ac-climate').value, qs('#ac-sun').value, occupants, qs('#ac-kitchen').value === 'yes', qs('#ac-insulation').value);
    const low = Math.max(5000, btu - 1000);
    const high = btu + 1000;
    qs('#ac-btu-output').textContent = `${formatNumber(low)} – ${formatNumber(high)} BTU`;
    qs('#ac-tonnage-output').textContent = `${(btu / 12000).toFixed(2)} tons`;
    qs('#ac-unit-type').textContent = getSuggestedACUnit(btu);
    qs('#ac-sizing-badge').textContent = btu > 36000 ? 'Consider multi-zone or multiple systems' : '✓ Properly Sized for one area';
    qs('#ac-warning').textContent = btu > 36000 ? 'Large load detected: split the space into multiple zones for better humidity control.' : 'Single-zone sizing looks appropriate for this room.';
    revealResult('ac-result-output', 'ac-result-placeholder');
  });
}
function initHeatingCalculator() {
  const form = document.getElementById('heating-form');
  if (!form) return;
  form.addEventListener('submit', event => {
    event.preventDefault();
    clearError(form);
    const sqft = safeNumber(qs('#heat-sqft').value);
    const floors = safeNumber(qs('#heat-floors').value);
    const ceilingFt = safeNumber(qs('#heat-ceiling').value);
    const fuel = qs('#heat-fuel').value;
    const afue = safeNumber(qs('#heat-afue').value);
    if ([sqft, floors, ceilingFt, afue].some(v => !Number.isFinite(v) || v <= 0)) return showError(form, 'Please fill in valid square footage, floors, ceiling height, and efficiency.');
    const btu = calculateHeatingBtu(sqft, floors, qs('#heat-climate').value, qs('#heat-insulation').value, ceilingFt, qs('#heat-windows').value, fuel, afue);
    const mbh = btu / 1000;
    const annual = estimateHeatingCost(btu, fuel, fuel === 'electric' ? 1 : afue / 100);
    qs('#heat-btu-output').textContent = `${formatNumber(btu)} BTU/hr`;
    qs('#heat-mbh-output').textContent = `${formatNumber(mbh, 1)} MBH furnace`;
    qs('#heat-sizing-output').textContent = btu < 40000 ? 'Compact load — avoid oversizing with a huge furnace.' : btu > 120000 ? 'High heating demand — stage the equipment if possible.' : 'Right in the typical residential sizing range.';
    qs('#heat-cost-output').textContent = `$${formatNumber(annual, 0)}/year est.`;
    revealResult('heat-result-output', 'heat-result-placeholder');
  });
}
function addZoneCard(index) {
  return `<div class="content-card zone-card">
    <div class="two-col">
      <div class="input-group"><label for="zone-name-${index}">Room Name</label><input type="text" id="zone-name-${index}" value="Zone ${index}"></div>
      <div class="input-group"><label for="zone-use-${index}">Usage</label><select id="zone-use-${index}"><option value="bedroom">Bedroom</option><option value="living">Living Room</option><option value="kitchen">Kitchen</option><option value="garage">Garage</option><option value="server">Server Room</option></select></div>
      <div class="input-group"><label for="zone-length-${index}">Length</label><input type="number" id="zone-length-${index}" min="1" value="12"></div>
      <div class="input-group"><label for="zone-width-${index}">Width</label><input type="number" id="zone-width-${index}" min="1" value="12"></div>
      <div class="input-group"><label for="zone-height-${index}">Ceiling Height</label><input type="number" id="zone-height-${index}" min="7" value="8"></div>
    </div>
  </div>`;
}
function miniSplitZoneBtu(length, width, height, usage, climate, insulation) {
  let btu = length * width * 22 * (height / 8);
  const usageAdjust = { bedroom: 0.95, living: 1.0, kitchen: 1.2, garage: 1.18, server: 1.45 };
  const climateAdjust = { '1': 0.85, '2': 0.9, '3': 0.95, '4': 1.0, '5': 1.08, '6': 1.15, '7': 1.22 };
  const insulationAdjust = { poor: 1.15, average: 1.0, good: 0.9, excellent: 0.82 };
  btu *= usageAdjust[usage] || 1;
  btu *= climateAdjust[climate] || 1;
  btu *= insulationAdjust[insulation] || 1;
  return round(btu, 500);
}
function initMiniSplitCalculator() {
  const form = document.getElementById('mini-form');
  if (!form) return;
  const zones = qs('#mini-zones');
  const modeButtons = qsa('[data-mini-mode]');
  let zoneCount = 1;
  const renderZones = count => {
    zones.innerHTML = Array.from({ length: count }, (_, i) => addZoneCard(i + 1)).join('');
  };
  renderZones(zoneCount);
  modeButtons.forEach(btn => btn.addEventListener('click', () => {
    modeButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const multi = btn.dataset.miniMode === 'multi';
    qs('#add-zone-btn').classList.toggle('hidden', !multi);
    zoneCount = multi ? Math.max(zoneCount, 2) : 1;
    renderZones(zoneCount);
  }));
  qs('#add-zone-btn')?.addEventListener('click', () => {
    if (zoneCount < 5) {
      zoneCount += 1;
      renderZones(zoneCount);
    }
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    clearError(form);
    const climate = qs('#mini-climate').value;
    const insulation = qs('#mini-insulation').value;
    const type = qs('#mini-type').value;
    let total = 0;
    const zoneSummaries = [];
    for (let i = 1; i <= zoneCount; i += 1) {
      const length = safeNumber(qs(`#zone-length-${i}`).value);
      const width = safeNumber(qs(`#zone-width-${i}`).value);
      const height = safeNumber(qs(`#zone-height-${i}`).value);
      if ([length, width, height].some(v => !Number.isFinite(v) || v <= 0)) return showError(form, 'Please enter valid dimensions for every mini split zone.');
      const usage = qs(`#zone-use-${i}`).value;
      const roomName = qs(`#zone-name-${i}`).value || `Zone ${i}`;
      const btu = miniSplitZoneBtu(length, width, height, usage, climate, insulation);
      total += btu;
      zoneSummaries.push(`${roomName}: ${formatNumber(btu)} BTU`);
    }
    qs('#mini-btu-output').textContent = `${formatNumber(total)} BTU total`;
    qs('#mini-tonnage-output').textContent = `${(total / 12000).toFixed(2)} tons`;
    qs('#mini-unit-type').textContent = total > 18000 || zoneCount > 1 ? 'Multi-zone outdoor unit recommended' : 'Single-zone wall mount recommended';
    qs('#mini-brand-output').textContent = `Mitsubishi/Daikin/LG match: ${formatNumber(round(total, 6000))} BTU class`;
    qs('#mini-zones-output').textContent = zoneSummaries.join(' • ');
    qs('#mini-outdoor-output').textContent = `${type} outdoor size: ${formatNumber(round(total * 1.08, 1000))} BTU nominal`;
    revealResult('mini-result-output', 'mini-result-placeholder');
  });
}
function initRadiatorCalculator() {
  const form = document.getElementById('radiator-form');
  if (!form) return;
  form.addEventListener('submit', event => {
    event.preventDefault();
    clearError(form);
    const unit = getUnit('rad-unit-group');
    const length = toFeet(safeNumber(qs('#rad-length').value), unit);
    const width = toFeet(safeNumber(qs('#rad-width').value), unit);
    const ceiling = toFeet(safeNumber(qs('#rad-height').value), unit);
    if ([length, width, ceiling].some(v => !Number.isFinite(v) || v <= 0)) return showError(form, 'Please enter valid room dimensions.');
    let btu = length * width * ceiling * 4.8;
    const roomAdjust = { living: 1.0, bedroom: 0.9, bathroom: 1.15, kitchen: 1.05, hallway: 0.8, conservatory: 1.3 };
    const wallsAdjust = { '1': 1.0, '2': 1.1, '3': 1.2 };
    const windowAdjust = { single: 1.15, double: 1.0, triple: 0.9 };
    const floorAdjust = { ground: 1.08, mid: 1.0, top: 1.06 };
    const insulationAdjust = { poor: 1.12, average: 1.0, good: 0.9 };
    const tempAdjust = { '70': 1.0, '60': 1.15, '50': 1.3 };
    btu *= roomAdjust[qs('#rad-room').value];
    btu *= wallsAdjust[qs('#rad-walls').value];
    btu *= windowAdjust[qs('#rad-window').value];
    btu *= floorAdjust[qs('#rad-floor').value];
    btu *= insulationAdjust[qs('#rad-insulation').value];
    btu *= tempAdjust[qs('#rad-temp').value];
    btu = round(btu, 100);
    const watts = btu * 0.293071;
    qs('#rad-btu-output').textContent = `${formatNumber(btu)} BTU`;
    qs('#rad-watt-output').textContent = `${formatNumber(watts, 0)} W`;
    qs('#rad-size-output').textContent = btu < 4000 ? 'One compact 600×800mm panel radiator' : btu < 8000 ? 'One medium 600×1400mm panel radiator' : 'Two radiators or one large double-panel unit';
    qs('#rad-count-output').textContent = btu > 8000 ? 'Use 2 emitters for better room balance.' : '1 radiator is typically sufficient.';
    revealResult('rad-result-output', 'rad-result-placeholder');
  });
}
function initConversionCalculator() {
  const form = document.getElementById('conversion-form');
  if (!form) return;
  const tabs = qsa('.tab-btn', form);
  const panels = qsa('[data-conversion-panel]', form);
  tabs.forEach(btn => btn.addEventListener('click', () => {
    tabs.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    panels.forEach(panel => panel.classList.toggle('hidden', panel.dataset.conversionPanel !== btn.dataset.tab));
  }));
  form.addEventListener('input', () => {
    const active = qs('.tab-btn.active', form)?.dataset.tab;
    if (!active) return;
    const input = safeNumber(qs(`[data-input="${active}"]`).value);
    if (!Number.isFinite(input)) return;
    let output = 0;
    let formula = '';
    if (active === 'watts') { output = BTU_CONVERSIONS.btuToWatts(input); formula = 'Watts = BTU × 0.293071'; }
    if (active === 'tons') { output = BTU_CONVERSIONS.btuToTons(input); formula = 'Tons = BTU ÷ 12,000'; }
    if (active === 'cfm') {
      const delta = safeNumber(qs('#cfm-delta').value) || 20;
      output = BTU_CONVERSIONS.btuToCfm(input, delta);
      formula = 'CFM = BTU ÷ (1.08 × ΔT)';
    }
    if (active === 'kwrate') { output = BTU_CONVERSIONS.btuhrToKw(input); formula = 'kW = BTU/hr × 0.000293071'; }
    if (active === 'joules') { output = BTU_CONVERSIONS.btuToJoules(input); formula = 'Joules = BTU × 1055.06'; }
    if (active === 'therms') { output = BTU_CONVERSIONS.btuToTherms(input); formula = 'Therms = BTU ÷ 100,000'; }
    if (active === 'hp') { output = BTU_CONVERSIONS.btuToHorsepower(input); formula = 'Horsepower = BTU ÷ 2545'; }
    if (active === 'calories') { output = BTU_CONVERSIONS.btuToCalories(input); formula = 'Calories = BTU × 251.996'; }
    qs('#conversion-output').textContent = formatNumber(output, 3);
    qs('#conversion-formula').textContent = formula;
  });
}
function initSpecialSpacesCalculator() {
  const form = document.getElementById('special-form');
  if (!form) return;
  const cards = qsa('.space-card-selector', form);
  const panels = qsa('[data-space-panel]', form);
  cards.forEach(card => card.addEventListener('click', () => {
    cards.forEach(c => c.classList.remove('active'));
    card.classList.add('active');
    panels.forEach(panel => panel.classList.toggle('hidden', panel.dataset.spacePanel !== card.dataset.space));
  }));
  form.addEventListener('submit', event => {
    event.preventDefault();
    clearError(form);
    const active = qs('.space-card-selector.active', form)?.dataset.space || 'garage';
    let btu = 0;
    let details = '';
    if (active === 'garage') {
      const sqft = safeNumber(qs('#garage-sqft').value); const vehicles = safeNumber(qs('#garage-vehicles').value);
      if (![sqft, vehicles].every(v => Number.isFinite(v) && v >= 0)) return showError(form, 'Enter valid garage inputs.');
      btu = sqft * (qs('#garage-insulated').value === 'yes' ? 24 : 32) + vehicles * 1200;
      if (qs('#garage-attached').value === 'detached') btu *= 1.08;
      details = 'Garage formula uses room area, insulation, vehicles, and attached/detached shell losses.';
    }
    if (active === 'server') {
      const server = safeNumber(qs('#server-watts').value); const ups = safeNumber(qs('#ups-watts').value); const lights = safeNumber(qs('#server-lights').value);
      if (![server, ups, lights].every(v => Number.isFinite(v) && v >= 0)) return showError(form, 'Enter valid server room watt loads.');
      btu = (server + ups + lights) * 3.41214;
      details = 'Server room heat load converts every watt of IT and UPS power into cooling BTU/hr.';
    }
    if (active === 'grow') {
      const watts = safeNumber(qs('#grow-watts').value); const sqft = safeNumber(qs('#grow-sqft').value);
      if (![watts, sqft].every(v => Number.isFinite(v) && v > 0)) return showError(form, 'Enter valid grow room values.');
      const typeAdjust = { led: 1.0, hps: 1.18, cmh: 1.1 };
      btu = watts * 3.41214 * typeAdjust[qs('#grow-type').value] + sqft * 8;
      details = 'Grow room loads combine lighting heat, ballast losses, and sensible room heat.';
    }
    if (active === 'wine') {
      const volume = safeNumber(qs('#wine-volume').value); const rval = safeNumber(qs('#wine-r').value); const delta = safeNumber(qs('#wine-delta').value);
      if (![volume, rval, delta].every(v => Number.isFinite(v) && v > 0)) return showError(form, 'Enter valid wine cellar values.');
      btu = (volume * delta / rval) * 7.5;
      details = 'Wine cellar sizing emphasizes tight temperature control and steady envelope gains.';
    }
    if (active === 'cooler') {
      const length = safeNumber(qs('#cool-length').value); const width = safeNumber(qs('#cool-width').value); const height = safeNumber(qs('#cool-height').value); const openings = safeNumber(qs('#cool-openings').value); const load = safeNumber(qs('#cool-load').value);
      if (![length, width, height, openings, load].every(v => Number.isFinite(v) && v >= 0)) return showError(form, 'Enter valid cold room values.');
      btu = length * width * height * 6 + openings * 350 + load * 500;
      details = 'Walk-in cooler BTU includes room envelope, infiltrating air, and product pull-down load.';
    }
    if (active === 'workshop') {
      const sqft = safeNumber(qs('#shop-sqft').value); const machinery = safeNumber(qs('#shop-machinery').value);
      if (![sqft, machinery].every(v => Number.isFinite(v) && v >= 0)) return showError(form, 'Enter valid workshop values.');
      const climateFactor = { cool: 18, mixed: 22, hot: 26 };
      btu = sqft * climateFactor[qs('#shop-climate').value] + machinery * 3.41214;
      details = 'Workshop BTU combines envelope loads with machine-driven heat release.';
    }
    if (active === 'commercial') {
      const sqft = safeNumber(qs('#com-sqft').value); const people = safeNumber(qs('#com-occupancy').value); const equipment = safeNumber(qs('#com-equipment').value);
      if (![sqft, people, equipment].every(v => Number.isFinite(v) && v >= 0)) return showError(form, 'Enter valid commercial inputs.');
      const lightFactor = { led: 3, fluorescent: 4, mixed: 3.5 };
      btu = sqft * 18 + people * 400 + equipment * 3.41214 + sqft * lightFactor[qs('#com-lighting').value];
      details = 'Commercial loads add occupancy, plug loads, and lighting density to base cooling demand.';
    }
    btu = round(btu, 100);
    qs('#special-btu-output').textContent = `${formatNumber(btu)} BTU/hr`;
    qs('#special-tonnage-output').textContent = `${(btu / 12000).toFixed(2)} tons`;
    qs('#special-unit-type').textContent = btu > 36000 ? 'Commercial split or packaged system' : 'Dedicated zone unit or ductless system';
    qs('#special-formula-output').textContent = details;
    revealResult('special-result-output', 'special-result-placeholder');
  });
}
function initApplianceCalculator() {
  const form = document.getElementById('appliance-form');
  if (!form) return;
  const tabs = qsa('.appliance-selector', form);
  const panels = qsa('[data-appliance-panel]', form);
  tabs.forEach(tab => tab.addEventListener('click', () => {
    tabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    panels.forEach(panel => panel.classList.toggle('hidden', panel.dataset.appliancePanel !== tab.dataset.appliance));
  }));
  form.addEventListener('submit', event => {
    event.preventDefault();
    clearError(form);
    const active = qs('.appliance-selector.active', form)?.dataset.appliance || 'fireplace';
    let btu = 0;
    if (active === 'fireplace') {
      const sqft = safeNumber(qs('#fp-sqft').value); const height = safeNumber(qs('#fp-height').value); const eff = safeNumber(qs('#fp-eff').value);
      if (![sqft, height, eff].every(v => Number.isFinite(v) && v > 0)) return showError(form, 'Enter valid fireplace values.');
      const insulation = { poor: 1.12, average: 1.0, good: 0.88 };
      btu = sqft * 25 * (height / 8) * insulation[qs('#fp-insulation').value] / (eff / 100);
    }
    if (active === 'wood') {
      const cubic = safeNumber(qs('#wood-cubic').value);
      if (!Number.isFinite(cubic) || cubic <= 0) return showError(form, 'Enter valid wood stove room volume.');
      const climate = { mild: 18, mixed: 24, cold: 30 };
      btu = (cubic / 100) * climate[qs('#wood-climate').value];
    }
    if (active === 'firepit') {
      const area = safeNumber(qs('#pit-area').value); const rise = safeNumber(qs('#pit-rise').value);
      if (![area, rise].every(v => Number.isFinite(v) && v > 0)) return showError(form, 'Enter valid outdoor heater values.');
      btu = area * rise * 12;
    }
    if (active === 'pool') {
      const gallons = safeNumber(qs('#pool-gallons').value); const target = safeNumber(qs('#pool-target').value); const outdoor = safeNumber(qs('#pool-outdoor').value);
      if (![gallons, target, outdoor].every(v => Number.isFinite(v) && v > 0)) return showError(form, 'Enter valid pool heater values.');
      btu = gallons * 8.34 * Math.max(1, target - outdoor) / 24;
    }
    if (active === 'spa') {
      const gallons = safeNumber(qs('#spa-gallons').value); const target = safeNumber(qs('#spa-target').value); const outdoor = safeNumber(qs('#spa-outdoor').value);
      if (![gallons, target, outdoor].every(v => Number.isFinite(v) && v > 0)) return showError(form, 'Enter valid spa values.');
      btu = gallons * 8.34 * Math.max(1, target - outdoor) / 8;
      if (qs('#spa-cover').value === 'yes') btu *= 0.82;
    }
    if (active === 'boiler') {
      const sqft = safeNumber(qs('#boiler-sqft').value);
      if (!Number.isFinite(sqft) || sqft <= 0) return showError(form, 'Enter valid boiler area.');
      const systemAdjust = { radiant: 28, baseboard: 35 };
      const climateAdjust = { warm: 24, mixed: 30, cold: 38 };
      btu = sqft * ((systemAdjust[qs('#boiler-system').value] + climateAdjust[qs('#boiler-climate').value]) / 2);
    }
    btu = round(btu, 100);
    qs('#appliance-btu-output').textContent = `${formatNumber(btu)} BTU/hr`;
    qs('#appliance-tonnage-output').textContent = `${(btu / 12000).toFixed(2)} ton equivalent`;
    qs('#appliance-unit-type').textContent = active === 'pool' || active === 'spa' ? 'Choose the next larger heater size for faster recovery.' : 'Select the nearest appliance size without gross oversizing.';
    qs('#appliance-detail-output').textContent = active === 'wood' ? `${formatNumber(btu / 20000, 2)} cords/day equivalent at peak burn.` : 'Output includes sensible heat demand and appliance-specific adjustments.';
    revealResult('appliance-result-output', 'appliance-result-placeholder');
  });
}
function initEnergyCostCalculator() {
  const form = document.getElementById('energy-form');
  if (!form) return;
  form.addEventListener('submit', event => {
    event.preventDefault();
    clearError(form);
    const gas = safeNumber(qs('#fuel-gas').value); const electric = safeNumber(qs('#fuel-electric').value); const propane = safeNumber(qs('#fuel-propane').value); const oil = safeNumber(qs('#fuel-oil').value);
    if (![gas, electric, propane, oil].every(v => Number.isFinite(v) && v > 0)) return showError(form, 'Please enter valid fuel prices for all comparison fields.');
    const rows = [
      ['Natural Gas', gas / 100000 * 1000000],
      ['Electric Resistance', electric / 3412 * 1000000],
      ['Propane', propane / 91500 * 1000000],
      ['Heating Oil', oil / 138500 * 1000000],
    ];
    qs('#fuel-compare-body').innerHTML = rows.map(([name, value]) => `<tr><td>${name}</td><td>$${formatNumber(value,2)}</td></tr>`).join('');
    const sqft = safeNumber(qs('#annual-sqft').value); const eff = safeNumber(qs('#annual-eff').value); const climate = qs('#annual-climate').value; const fuel = qs('#annual-fuel').value;
    if (![sqft, eff].every(v => Number.isFinite(v) && v > 0)) return showError(form, 'Please enter valid annual heating size and efficiency values.');
    const climateLoad = { cold: 48, mixed: 35, warm: 24 };
    const annualBtu = sqft * climateLoad[climate] * 1200;
    const priceMap = { gas, electric, propane, oil, heatpump: electric };
    const rateBtu = { gas: 100000, electric: 3412, propane: 91500, oil: 138500, heatpump: 3412 * 2.8 };
    const annualCost = (annualBtu / ((eff / 100) * rateBtu[fuel])) * priceMap[fuel];
    qs('#annual-cost-output').textContent = `$${formatNumber(annualCost,0)}/year`;
    qs('#annual-btu-output').textContent = `${formatNumber(round(annualBtu,1000))} BTU/year`;
    const currentFuel = qs('#switch-current').value; const newFuel = qs('#switch-new').value;
    const currentPrice = safeNumber(qs('#switch-current-price').value); const newPrice = safeNumber(qs('#switch-new-price').value);
    if (![currentPrice, newPrice].every(v => Number.isFinite(v) && v > 0)) return showError(form, 'Please enter valid switch comparison prices.');
    const currentAnnual = (annualBtu / rateBtu[currentFuel]) * currentPrice;
    const newAnnual = (annualBtu / rateBtu[newFuel]) * newPrice;
    qs('#switch-savings-output').textContent = `$${formatNumber(currentAnnual - newAnnual,0)}/year`;
    qs('#switch-detail-output').textContent = `${currentFuel} → ${newFuel}`;
    revealResult('energy-result-output', 'energy-result-placeholder');
  });
}
function initCopyButtons() {
  qsa('[data-copy-target]').forEach(button => button.addEventListener('click', async () => {
    const target = document.getElementById(button.dataset.copyTarget);
    if (!target) return;
    try {
      await copyText(target.innerText || target.textContent || '');
      button.textContent = 'Copied!';
      setTimeout(() => { button.textContent = '📋 Copy Result'; }, 1500);
    } catch (error) {
      button.textContent = 'Copy failed';
    }
  }));
}
function initResetButtons() {
  qsa('[data-reset-form]').forEach(button => button.addEventListener('click', () => {
    resetForm(button.dataset.resetForm, button.dataset.resetResult, button.dataset.resetPlaceholder);
  }));
}
window.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initMenu();
  initUnitToggles();
  initCopyButtons();
  initResetButtons();
  initACCalculator();
  initHeatingCalculator();
  initMiniSplitCalculator();
  initRadiatorCalculator();
  initConversionCalculator();
  initSpecialSpacesCalculator();
  initApplianceCalculator();
  initEnergyCostCalculator();
});
