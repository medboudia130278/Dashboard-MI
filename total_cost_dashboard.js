const TOTAL_COST_UI_STORAGE_KEY = "dashboard-total-cost-ui-v1";
const TOTAL_COST_SIGNAL_KEY = "cost-summary-mi-mercury-bridge-v1";
const TOTAL_COST_COLORS = ["#2563eb", "#14b8a6", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4", "#22c55e", "#f97316", "#64748b", "#ec4899"];

function normalizeTcText(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[\s/_-]+/g, "");
}

function tcFieldValue(row, field) {
  if (!row || !field) return "";
  if (Object.prototype.hasOwnProperty.call(row, field)) return row[field];
  const normalized = normalizeTcText(field);
  const matchingKey = Object.keys(row).find((key) => normalizeTcText(key) === normalized);
  return matchingKey ? row[matchingKey] : "";
}

function tcNumeric(value) {
  if (value === null || value === undefined || value === "") return 0;
  const parsed = Number(String(value).replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function tcColorFor(value, index = 0) {
  const text = String(value || "");
  let hash = 0;
  for (let position = 0; position < text.length; position += 1) {
    hash = ((hash << 5) - hash + text.charCodeAt(position)) | 0;
  }
  return TOTAL_COST_COLORS[Math.abs(hash + index) % TOTAL_COST_COLORS.length];
}

function loadTotalCostUiState() {
  const saved = readStoredJson(TOTAL_COST_UI_STORAGE_KEY, {}) || {};
  if (saved.targetCurrency) state.totalCostTargetCurrency = saved.targetCurrency;
  if (Array.isArray(saved.levels) && saved.levels.length) state.totalCostLevels = saved.levels;
  if (Array.isArray(saved.explorerLevels) && saved.explorerLevels.length) state.tcExplorerLevels = saved.explorerLevels;
  if (Array.isArray(saved.descriptions)) state.totalCostDescFilter = saved.descriptions;
  if (Array.isArray(saved.phases)) state.totalCostPhaseFilter = saved.phases;
  if (saved.explorerSelections && typeof saved.explorerSelections === "object") {
    state.tcExplorerSelections = saved.explorerSelections;
  }
}

function saveTotalCostUiState() {
  writeStoredJson(TOTAL_COST_UI_STORAGE_KEY, {
    targetCurrency: state.totalCostTargetCurrency,
    levels: state.totalCostLevels,
    explorerLevels: state.tcExplorerLevels,
    descriptions: state.totalCostDescFilter,
    phases: state.totalCostPhaseFilter,
    explorerSelections: state.tcExplorerSelections,
  });
}

async function loadTotalCostBridge() {
  if (state.totalCostBridgeLoading) return;
  state.totalCostBridgeLoading = true;
  try {
    const bridgeModule = await import("./shared/mercury_dashboard_bridge.js");
    state.totalCostBridge = await bridgeModule.readMercuryBridge();
  } catch (error) {
    console.warn("Unable to read Mercury data for Total Cost.", error);
    state.totalCostBridge = null;
  } finally {
    state.totalCostBridgeLoading = false;
    if (document.getElementById("view-totalcost")?.dataset.ready === "1") {
      renderTotalCostDashboard();
    }
    if (state.totalCostBridge?.rows?.some((row) => normalizeTcText(row["Price List Code 3"]) === "inframanagement")) {
      if (!state.subsystems.includes("Infra_Management")) {
        state.subsystems = uniqueSorted(state.subsystems.concat(["Infra_Management"]));
        rebuildSubsystemFilter();
      }
    }
  }
}

function initTotalCostBridge() {
  if (state._totalCostBridgeInitialized) return;
  state._totalCostBridgeInitialized = true;
  loadTotalCostUiState();
  void loadTotalCostBridge();
  window.addEventListener("storage", (event) => {
    if (event.key !== TOTAL_COST_SIGNAL_KEY) return;
    void loadTotalCostBridge();
  });
  window.addEventListener("focus", () => {
    const signal = readStoredJson(TOTAL_COST_SIGNAL_KEY, null);
    if (signal?.publishedAt && signal.publishedAt !== state.totalCostBridge?.publishedAt) {
      void loadTotalCostBridge();
    }
  });
  window.addEventListener("resize", () => {
    if (!document.getElementById("view-totalcost")?.classList.contains("hidden")) {
      requestAnimationFrame(drawTcExplorerConnectors);
    }
  });
}

function getTotalCostMercuryRows() {
  return Array.isArray(state.totalCostBridge?.rows) ? state.totalCostBridge.rows : [];
}

function getTotalCostProjects() {
  return Array.isArray(state.totalCostBridge?.projects) ? state.totalCostBridge.projects : [];
}

function tcSubsystemKey(value) {
  const normalized = normalizeTcText(value);
  if (["3rdrail", "cat", "feedingsystem"].includes(normalized)) return "feedingsystem";
  if (normalized === "inframanagement") return "inframanagement";
  return normalized;
}

function tcSubsystemMatches(row) {
  if (shouldFilterBySubsystem() && !state.currentSubsystem.length) return false;
  const selected = getSelectedSubsystems();
  if (!selected.length) return true;
  const rowKey = tcSubsystemKey(tcFieldValue(row, "Price List Code 3"));
  return selected.some((value) => tcSubsystemKey(value) === rowKey);
}

function getGlobalFilteredTotalCostRows() {
  return getTotalCostMercuryRows().filter((row) => {
    if (!tcSubsystemMatches(row)) return false;
    if (!projectNameMatchesSelection(row._project)) return false;
    if (
      state.currentProjectType !== "__ALL__"
      && normalizeTcText(row._projectType) !== normalizeTcText(state.currentProjectType)
    ) return false;
    return true;
  });
}

function getFilteredTotalCostRows() {
  const descriptions = new Set((state.totalCostDescFilter || []).map(String));
  const phases = new Set((state.totalCostPhaseFilter || []).map(String));
  return getGlobalFilteredTotalCostRows().filter((row) => {
    if (descriptions.size && !descriptions.has(String(tcFieldValue(row, "Description")))) return false;
    if (phases.size && !phases.has(String(tcFieldValue(row, "Phase")))) return false;
    return true;
  });
}

function findTcProject(row) {
  const projects = getTotalCostProjects();
  return projects.find((project) => project.projectKey && project.projectKey === row._projectKey)
    || projects.find((project) => normalizeTcText(project.projectName) === normalizeTcText(row._project))
    || null;
}

function getTcRateToConfiguredTarget(project, currency) {
  const conversion = project?.conversion;
  const code = normalizeCurrencyCode(currency);
  if (!conversion || !code) return null;
  const configuredTarget = normalizeCurrencyCode(conversion.configuredTargetCurrency);
  if (code === configuredTarget) return 1;
  const row = (conversion.rows || []).find((entry) => normalizeCurrencyCode(entry.currency) === code);
  const rate = Number(row?.effectiveRate);
  return Number.isFinite(rate) && rate > 0 ? rate : null;
}

function convertTotalCost(value, sourceCurrency, project, targetCurrency = state.totalCostTargetCurrency) {
  const amount = Number(value);
  const source = normalizeCurrencyCode(sourceCurrency);
  const target = normalizeCurrencyCode(targetCurrency);
  if (!Number.isFinite(amount) || !source || !target || !project) return null;
  if (source === target) return amount;
  const sourceRate = getTcRateToConfiguredTarget(project, source);
  const targetRate = getTcRateToConfiguredTarget(project, target);
  if (sourceRate === null || targetRate === null || targetRate <= 0) return null;
  return amount * sourceRate / targetRate;
}

function getTcConvertedRows(rows) {
  let missingCount = 0;
  const convertedRows = [];
  rows.forEach((row) => {
    const rawTotalCost = tcFieldValue(row, "Total Cost");
    const numericTotalCost = tcNumeric(rawTotalCost);
    if (rawTotalCost === "" || rawTotalCost === null || rawTotalCost === undefined || numericTotalCost === 0) {
      convertedRows.push({ ...row, _convertedCost: 0 });
      return;
    }
    const project = findTcProject(row);
    const converted = convertTotalCost(
      numericTotalCost,
      tcFieldValue(row, "Currency"),
      project
    );
    if (converted === null) {
      missingCount += 1;
      return;
    }
    convertedRows.push({ ...row, _convertedCost: converted });
  });
  return { rows: convertedRows, missingCount };
}

function getTcTargetCurrencyOptions() {
  const options = new Set(["USD", "EUR"]);
  getTotalCostProjects().forEach((project) => {
    const conversion = project.conversion;
    if (!conversion) return;
    (conversion.targetCurrencyOptions || []).forEach((currency) => {
      const code = normalizeCurrencyCode(currency);
      if (code) options.add(code);
    });
    (conversion.rows || []).forEach((row) => {
      const code = normalizeCurrencyCode(row.currency);
      if (code) options.add(code);
    });
  });
  getTotalCostMercuryRows().forEach((row) => {
    const code = normalizeCurrencyCode(tcFieldValue(row, "Currency"));
    if (code) options.add(code);
  });
  return Array.from(options).sort();
}

function getTcLevelOptions() {
  const base = [
    "Phase",
    "Period",
    "Type",
    "Short Description",
    "Price List Code 1",
    "Price List Code 2",
    "Price List Code 3",
    "Delegated Person",
  ];
  const globalRows = getGlobalFilteredTotalCostRows();
  const representedProjects = new Set(globalRows.map((row) => row._projectKey || row._project));
  const textSlots = new Set();
  getTotalCostProjects().forEach((project) => {
    if (representedProjects.size && !representedProjects.has(project.projectKey) && !representedProjects.has(project.projectName)) return;
    (project.textMappings || []).slice(0, 9).forEach((mapping, index) => {
      if (mapping && normalizeTcText(mapping) !== "notapplicable") textSlots.add(`Text ${index + 1}`);
    });
  });
  return base.concat(Array.from(textSlots));
}

function buildTcTree(rows, levels, depth = 0) {
  if (!levels.length) return [];
  const field = levels[0];
  const groups = new Map();
  rows.forEach((row) => {
    const raw = tcFieldValue(row, field);
    const label = String(raw ?? "").trim() || "(Blank)";
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label).push(row);
  });
  return Array.from(groups.entries())
    .map(([label, groupRows]) => ({
      label,
      field,
      depth,
      value: groupRows.reduce((sum, row) => sum + row._convertedCost, 0),
      rows: groupRows,
      children: buildTcTree(groupRows, levels.slice(1), depth + 1),
    }))
    .sort((left, right) => Math.abs(right.value) - Math.abs(left.value));
}

function renderTcTreeNode(node, maxValue) {
  const width = maxValue > 0 ? Math.max(1, Math.abs(node.value) / maxValue * 100) : 0;
  const color = TOTAL_COST_COLORS[node.depth % TOTAL_COST_COLORS.length];
  const childrenMax = node.children.length
    ? Math.max(...node.children.map((child) => Math.abs(child.value)), 0)
    : 0;
  return `
    <div class="tc-tree-node" style="--tc-depth:${node.depth};--tc-tree-border:${node.depth ? 2 : 0}px;--tc-node-color:${color}">
      <div class="mb-1 flex items-center justify-between gap-4 text-sm">
        <span class="font-semibold truncate" title="${escapeHtml(node.label)}">${escapeHtml(node.label)}</span>
        <span class="shrink-0 font-bold tabular-nums">${escapeHtml(formatAmountWithCurrency(node.value, state.totalCostTargetCurrency))}</span>
      </div>
      <div class="tc-tree-bar"><span style="width:${width}%"></span></div>
      ${node.children.map((child) => renderTcTreeNode(child, childrenMax)).join("")}
    </div>
  `;
}

function tcLevelToolbarHtml(levels, scope) {
  const options = getTcLevelOptions();
  return `
    <div class="tc-level-toolbar">
      ${levels.map((level, index) => `
        <div class="tc-level">
          <span class="text-[10px] font-bold text-slate-400">L${index + 1}</span>
          <select class="tc-level-select border-0 p-0 min-h-0" data-tc-level-select="${scope}" data-index="${index}">
            ${options.map((option) => `<option value="${escapeHtml(option)}"${option === level ? " selected" : ""}>${escapeHtml(option)}</option>`).join("")}
          </select>
          <button type="button" data-tc-remove-level="${scope}" data-index="${index}" class="inline-flex size-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-rose-600" title="Remove level"${levels.length <= 1 ? " disabled" : ""}>
            <span class="material-symbols-outlined text-[17px]">close</span>
          </button>
        </div>
      `).join('<span class="material-symbols-outlined text-slate-300">chevron_right</span>')}
      <button type="button" data-tc-add-level="${scope}" class="inline-flex items-center gap-1 rounded-lg border border-emerald-300 px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-50">
        <span class="material-symbols-outlined text-[17px]">add</span>Add Level
      </button>
    </div>
  `;
}

function renderTcTree(rows) {
  const container = document.getElementById("tcTreeContent");
  const toolbar = document.getElementById("tcTreeLevels");
  const subtitle = document.getElementById("tcTreeSubtitle");
  if (!container || !toolbar || !subtitle) return;
  toolbar.innerHTML = tcLevelToolbarHtml(state.totalCostLevels, "tree");
  subtitle.textContent = `${state.totalCostLevels.join(" > ")} - ${state.totalCostTargetCurrency}`;
  if (!rows.length) {
    container.innerHTML = '<p class="py-8 text-center text-sm text-slate-500">No converted cost is available for the selected filters.</p>';
    return;
  }
  const nodes = buildTcTree(rows, state.totalCostLevels);
  const maxValue = Math.max(...nodes.map((node) => Math.abs(node.value)), 0);
  container.innerHTML = nodes.map((node) => renderTcTreeNode(node, maxValue)).join("");
}

function tcGroupRows(rows, field) {
  const groups = new Map();
  rows.forEach((row) => {
    const value = String(tcFieldValue(row, field) ?? "").trim() || "(Blank)";
    if (!groups.has(value)) groups.set(value, []);
    groups.get(value).push(row);
  });
  return Array.from(groups.entries())
    .map(([label, groupRows]) => ({
      label,
      rows: groupRows,
      value: groupRows.reduce((sum, row) => sum + row._convertedCost, 0),
    }))
    .sort((left, right) => Math.abs(right.value) - Math.abs(left.value))
    .slice(0, 12);
}

function renderTcExplorer(rows) {
  const toolbar = document.getElementById("tcExplorerLevels");
  const subtitle = document.getElementById("tcExplorerSubtitle");
  const explorer = document.getElementById("tcExplorer");
  if (!toolbar || !subtitle || !explorer) return;
  toolbar.innerHTML = tcLevelToolbarHtml(state.tcExplorerLevels, "explorer");
  subtitle.textContent = `${state.tcExplorerLevels.join(" > ")} - ${state.totalCostTargetCurrency}`;
  if (!rows.length) {
    explorer.innerHTML = '<div class="py-8 text-sm text-slate-500">No converted cost is available for the selected filters.</div>';
    return;
  }

  const total = rows.reduce((sum, row) => sum + row._convertedCost, 0);
  let currentRows = rows;
  const columns = [];
  state.tcExplorerLevels.forEach((field, levelIndex) => {
    const groups = tcGroupRows(currentRows, field);
    const selected = groups.some((group) => group.label === state.tcExplorerSelections[levelIndex])
      ? state.tcExplorerSelections[levelIndex]
      : (groups[0]?.label || "");
    state.tcExplorerSelections[levelIndex] = selected;
    Object.keys(state.tcExplorerSelections).forEach((key) => {
      if (Number(key) >= state.tcExplorerLevels.length) delete state.tcExplorerSelections[key];
    });
    columns.push({ field, groups, selected, levelIndex });
    currentRows = groups.find((group) => group.label === selected)?.rows || [];
  });

  explorer.innerHTML = `
    <svg id="tcExplorerConnectors" class="tc-explorer-connectors" aria-hidden="true"></svg>
    <div class="tc-explorer-column" data-tc-explorer-column="-1">
      <div class="tc-explorer-card is-selected" data-tc-explorer-card data-level="-1" data-value="__ROOT__" style="--tc-card-color:#2563eb;--tc-card-share:100%">
        <span class="tc-label">Root</span>
        <p class="mt-2 font-bold">Total Cost</p>
        <p class="mt-1 text-sm text-slate-500">${escapeHtml(formatAmountWithCurrency(total, state.totalCostTargetCurrency))}</p>
      </div>
    </div>
    ${columns.map((column, columnIndex) => {
      const max = Math.max(...column.groups.map((group) => Math.abs(group.value)), 0);
      return `
        <div class="tc-explorer-column" data-tc-explorer-column="${columnIndex}">
          ${column.groups.map((group) => {
            const selected = group.label === column.selected;
            const share = max > 0 ? Math.max(2, Math.abs(group.value) / max * 100) : 0;
            return `
              <button type="button" class="tc-explorer-card${selected ? " is-selected" : ""}" data-tc-explorer-card data-level="${columnIndex}" data-value="${escapeHtml(group.label)}" style="--tc-card-color:${tcColorFor(group.label, columnIndex)};--tc-card-share:${share}%">
                <span class="tc-label">${escapeHtml(column.field)}</span>
                <p class="mt-2 font-bold truncate" title="${escapeHtml(group.label)}">${escapeHtml(group.label)}</p>
                <p class="mt-1 text-sm text-slate-500">${escapeHtml(formatAmountWithCurrency(group.value, state.totalCostTargetCurrency))}</p>
              </button>
            `;
          }).join("")}
        </div>
      `;
    }).join("")}
  `;
  saveTotalCostUiState();
  requestAnimationFrame(drawTcExplorerConnectors);
}

function drawTcExplorerConnectors() {
  const explorer = document.getElementById("tcExplorer");
  const svg = document.getElementById("tcExplorerConnectors");
  if (!explorer || !svg) return;
  const bounds = explorer.getBoundingClientRect();
  svg.setAttribute("width", String(explorer.scrollWidth));
  svg.setAttribute("height", String(explorer.scrollHeight));
  svg.setAttribute("viewBox", `0 0 ${explorer.scrollWidth} ${explorer.scrollHeight}`);
  const paths = [];
  const columns = Array.from(explorer.querySelectorAll("[data-tc-explorer-column]"));
  columns.slice(1).forEach((column, index) => {
    const sourceColumn = columns[index];
    const source = sourceColumn.querySelector(".tc-explorer-card.is-selected") || sourceColumn.querySelector(".tc-explorer-card");
    if (!source) return;
    const sourceBounds = source.getBoundingClientRect();
    const x1 = sourceBounds.right - bounds.left;
    const y1 = sourceBounds.top - bounds.top + sourceBounds.height / 2;
    column.querySelectorAll(".tc-explorer-card").forEach((target) => {
      const targetBounds = target.getBoundingClientRect();
      const x2 = targetBounds.left - bounds.left;
      const y2 = targetBounds.top - bounds.top + targetBounds.height / 2;
      const bend = Math.max(24, (x2 - x1) * .45);
      const selected = target.classList.contains("is-selected");
      paths.push(`<path d="M ${x1} ${y1} C ${x1 + bend} ${y1}, ${x2 - bend} ${y2}, ${x2} ${y2}" fill="none" stroke="${selected ? "#1d4ed8" : "#93c5fd"}" stroke-width="${selected ? "2.4" : "1.5"}"/>`);
    });
  });
  svg.innerHTML = paths.join("");
}

function tcAggregate(rows, field) {
  const result = new Map();
  rows.forEach((row) => {
    const key = String(tcFieldValue(row, field) ?? "").trim() || "(Blank)";
    result.set(key, (result.get(key) || 0) + row._convertedCost);
  });
  return result;
}

function renderTcDonutChart(svgId, centerId, legendId, rows, plcField) {
  const svg = document.getElementById(svgId);
  const center = document.getElementById(centerId);
  const legend = document.getElementById(legendId);
  if (!svg || !center || !legend) return;
  const positiveRows = rows.filter((row) => row._convertedCost > 0);
  const phases = Array.from(new Set(positiveRows.map((row) => String(tcFieldValue(row, "Phase") || "(Blank)"))));
  const total = rows.reduce((sum, row) => sum + row._convertedCost, 0);
  center.textContent = formatCompactNumber(total, 1);
  if (!positiveRows.length || !phases.length) {
    svg.innerHTML = '<text x="50" y="50" text-anchor="middle" dominant-baseline="middle" fill="#94a3b8" font-size="8">No positive cost</text>';
    legend.innerHTML = "";
    return;
  }
  const ringGap = 2;
  const maxRadius = 43;
  const thickness = Math.max(3, Math.min(9, (maxRadius - 10) / phases.length - ringGap));
  let circles = "";
  phases.forEach((phase, phaseIndex) => {
    const phaseRows = positiveRows.filter((row) => String(tcFieldValue(row, "Phase") || "(Blank)") === phase);
    const groups = tcAggregate(phaseRows, plcField);
    const phaseTotal = Array.from(groups.values()).reduce((sum, value) => sum + value, 0);
    const radius = maxRadius - phaseIndex * (thickness + ringGap);
    const circumference = 2 * Math.PI * radius;
    let offset = 0;
    circles += `<circle cx="50" cy="50" r="${radius}" fill="none" stroke="#e2e8f0" stroke-width="${thickness}"/>`;
    Array.from(groups.entries()).forEach(([code, value]) => {
      const length = phaseTotal > 0 ? value / phaseTotal * circumference : 0;
      const dash = `${length} ${Math.max(0, circumference - length)}`;
      const color = tcColorFor(code);
      const title = `${phase} - ${code}: ${phaseTotal > 0 ? (value / phaseTotal * 100).toFixed(1) : "0.0"}% (${formatAmountWithCurrency(value, state.totalCostTargetCurrency)})`;
      circles += `<circle cx="50" cy="50" r="${radius}" fill="none" stroke="${color}" stroke-width="${thickness}" stroke-dasharray="${dash}" stroke-dashoffset="${-offset}" transform="rotate(-90 50 50)" pointer-events="none"/>`;
      circles += `<circle cx="50" cy="50" r="${radius}" fill="none" stroke="transparent" stroke-width="${thickness + 3}" stroke-dasharray="${dash}" stroke-dashoffset="${-offset}" transform="rotate(-90 50 50)" pointer-events="stroke"><title>${escapeHtml(title)}</title></circle>`;
      offset += length;
    });
  });
  svg.innerHTML = circles;

  const codeGroups = tcAggregate(positiveRows, plcField);
  const grandPositive = Array.from(codeGroups.values()).reduce((sum, value) => sum + value, 0);
  const codeLegend = Array.from(codeGroups.entries())
    .sort((left, right) => right[1] - left[1])
    .map(([code, value]) => `
      <div class="flex items-center justify-between gap-3 py-1 text-xs">
        <span class="flex min-w-0 items-center gap-2"><span class="size-2.5 rounded-sm" style="background:${tcColorFor(code)}"></span><span class="truncate">${escapeHtml(code)}</span></span>
        <strong>${grandPositive > 0 ? (value / grandPositive * 100).toFixed(1) : "0.0"}%</strong>
      </div>
    `).join("");
  const ringLegend = phases.map((phase, index) => `<span class="mr-3 whitespace-nowrap">Ring ${index + 1}: ${escapeHtml(phase)}</span>`).join("");
  legend.innerHTML = codeLegend + `<div class="mt-3 border-t border-slate-200 pt-2 text-[10px] text-slate-500">${ringLegend}</div>`;
}

function renderTcDonuts(rows) {
  renderTcDonutChart("tcDonutPlc1", "tcDonutPlc1Center", "tcDonutPlc1Legend", rows, "Price List Code 1");
  renderTcDonutChart("tcDonutPlc2", "tcDonutPlc2Center", "tcDonutPlc2Legend", rows, "Price List Code 2");
  renderTcDonutChart("tcDonutPlc3", "tcDonutPlc3Center", "tcDonutPlc3Legend", rows, "Price List Code 3");
}

function renderTcPlcTable(tableId, subtitleId, rows, plcField) {
  const table = document.getElementById(tableId);
  const subtitle = document.getElementById(subtitleId);
  if (!table || !subtitle) return;
  const phases = Array.from(new Set(rows.map((row) => String(tcFieldValue(row, "Phase") || "(Blank)"))));
  const groups = tcAggregate(rows, plcField);
  const codes = Array.from(groups.entries()).sort((left, right) => Math.abs(right[1]) - Math.abs(left[1])).map(([code]) => code);
  subtitle.textContent = `${codes.length} code(s) x ${phases.length} phase(s) - ${state.totalCostTargetCurrency}`;
  if (!codes.length) {
    table.innerHTML = '<tbody><tr><td class="p-6 text-center text-sm text-slate-500">No converted cost available.</td></tr></tbody>';
    return;
  }
  table.innerHTML = `
    <thead><tr>
      <th class="px-3 py-2 text-left">${escapeHtml(plcField)}</th>
      ${phases.map((phase) => `<th class="px-3 py-2 text-right">${escapeHtml(phase)}</th>`).join("")}
    </tr></thead>
    <tbody>
      ${codes.map((code) => `
        <tr class="border-t border-slate-100">
          <td class="px-3 py-2 font-semibold">${escapeHtml(code)}</td>
          ${phases.map((phase) => {
            const value = rows
              .filter((row) => String(tcFieldValue(row, plcField) || "(Blank)") === code && String(tcFieldValue(row, "Phase") || "(Blank)") === phase)
              .reduce((sum, row) => sum + row._convertedCost, 0);
            return `<td class="px-3 py-2 text-right tabular-nums">${escapeHtml(formatAmountWithCurrency(value, state.totalCostTargetCurrency))}</td>`;
          }).join("")}
        </tr>
      `).join("")}
    </tbody>
  `;
}

function renderTcPlcTables(rows) {
  renderTcPlcTable("tcTablePlc1", "tcTablePlc1Subtitle", rows, "Price List Code 1");
  renderTcPlcTable("tcTablePlc2", "tcTablePlc2Subtitle", rows, "Price List Code 2");
  renderTcPlcTable("tcTablePlc3", "tcTablePlc3Subtitle", rows, "Price List Code 3");
}

function tcFilterSummary(selected, allLabel) {
  if (!selected.length) return allLabel;
  if (selected.length <= 2) return selected.join(", ");
  return `${selected.length} selected`;
}

function syncTcDescSummary() {
  const summary = document.getElementById("tcDescSummary");
  if (summary) summary.textContent = tcFilterSummary(state.totalCostDescFilter, "All descriptions");
}

function syncTcPhaseSummary() {
  const summary = document.getElementById("tcPhaseSummary");
  if (summary) summary.textContent = tcFilterSummary(state.totalCostPhaseFilter, "All phases");
}

function rebuildTcDescList() {
  const list = document.getElementById("tcDescList");
  if (!list) return;
  const search = normalizeTcText(state.totalCostDescSearch);
  const options = Array.from(new Set(
    getGlobalFilteredTotalCostRows().map((row) => String(tcFieldValue(row, "Description") || "").trim()).filter(Boolean)
  )).sort().filter((value) => !search || normalizeTcText(value).includes(search));
  list.innerHTML = options.length ? options.map((value) => `
    <label class="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800">
      <input type="checkbox" data-tc-desc-value="${escapeHtml(value)}"${state.totalCostDescFilter.includes(value) ? " checked" : ""}>
      <span class="truncate text-sm">${escapeHtml(value)}</span>
    </label>
  `).join("") : '<p class="p-4 text-sm text-slate-500">No description available.</p>';
  syncTcDescSummary();
}

function rebuildTcPhaseList() {
  const list = document.getElementById("tcPhaseList");
  if (!list) return;
  const options = Array.from(new Set(
    getGlobalFilteredTotalCostRows().map((row) => String(tcFieldValue(row, "Phase") || "").trim()).filter(Boolean)
  )).sort();
  list.innerHTML = options.length ? options.map((value) => `
    <label class="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800">
      <input type="checkbox" data-tc-phase-value="${escapeHtml(value)}"${state.totalCostPhaseFilter.includes(value) ? " checked" : ""}>
      <span class="truncate text-sm">${escapeHtml(value)}</span>
    </label>
  `).join("") : '<p class="p-4 text-sm text-slate-500">No phase available.</p>';
  syncTcPhaseSummary();
}

function renderTcProjectInfo(globalRows) {
  const container = document.getElementById("tcProjectInfo");
  if (!container) return;
  const represented = new Set(globalRows.map((row) => row._projectKey || row._project));
  const projects = getTotalCostProjects().filter((project) => !represented.size || represented.has(project.projectKey) || represented.has(project.projectName));
  const single = projects.length === 1 ? projects[0] : null;
  const values = [
    ["Project Name", single ? single.projectName : `${projects.length} projects selected`],
    ["Project Type", single ? (single.projectType || "--") : "Multiple"],
    ["Line Length", single ? (single.lineLength || "--") : "--"],
    ["Bid / Service Year", single ? `${single.bidYear || "--"} / ${single.serviceYear || "--"}` : "-- / --"],
    ["Contract Duration", single ? (single.contractDuration || "--") : "--"],
  ];
  container.innerHTML = values.map(([label, value]) => `
    <div><p class="tc-label">${escapeHtml(label)}</p><p class="mt-1 truncate text-sm font-bold" title="${escapeHtml(value)}">${escapeHtml(value)}</p></div>
  `).join("");
}

function renderTcKpis(filteredRows, convertedRows, missingCount) {
  const globalCard = document.getElementById("tcKpiGlobal");
  const sourceCard = document.getElementById("tcKpiSource");
  const ratesCard = document.getElementById("tcKpiRates");
  if (!globalCard || !sourceCard || !ratesCard) return;
  const total = convertedRows.reduce((sum, row) => sum + row._convertedCost, 0);
  const byProject = new Map();
  convertedRows.forEach((row) => byProject.set(row._project || "Unspecified", (byProject.get(row._project || "Unspecified") || 0) + row._convertedCost));
  globalCard.innerHTML = `
    <p class="tc-label">Global Cost</p>
    <p class="mt-3 text-3xl font-black">${escapeHtml(formatAmountWithCurrency(total, state.totalCostTargetCurrency))}</p>
    <div class="mt-4 space-y-1.5">${Array.from(byProject.entries()).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).map(([project, value], index) => `
      <div class="flex items-center justify-between gap-3 text-xs"><span class="flex min-w-0 items-center gap-2"><span class="size-2 rounded-full" style="background:${colorForSeriesIndex(index)}"></span><span class="truncate">${escapeHtml(project)}</span></span><strong>${escapeHtml(formatAmountWithCurrency(value, state.totalCostTargetCurrency))}</strong></div>
    `).join("")}</div>
  `;

  const byCurrency = new Map();
  filteredRows.forEach((row) => {
    const currency = normalizeCurrencyCode(tcFieldValue(row, "Currency"));
    const value = tcNumeric(tcFieldValue(row, "Total Cost"));
    if (!currency && value === 0) return;
    const key = currency || "N/A";
    byCurrency.set(key, (byCurrency.get(key) || 0) + value);
  });
  sourceCard.innerHTML = `
    <p class="tc-label">Cost by Source Currency</p>
    <div class="mt-4 space-y-2">${Array.from(byCurrency.entries()).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).map(([currency, value]) => `
      <div class="flex items-center justify-between gap-3"><span class="font-bold">${escapeHtml(currency)}</span><span class="tabular-nums">${escapeHtml(formatAmountWithCurrency(value, currency))}</span></div>
    `).join("") || '<p class="text-sm text-slate-500">No source cost available.</p>'}</div>
  `;

  const representedKeys = new Set(filteredRows.map((row) => row._projectKey || row._project));
  const contexts = getTotalCostProjects().filter((project) => representedKeys.has(project.projectKey) || representedKeys.has(project.projectName));
  const providers = Array.from(new Set(contexts.map((project) => project.conversion?.provider).filter(Boolean)));
  const bases = Array.from(new Set(contexts.map((project) => project.conversion?.baseCurrency).filter(Boolean)));
  ratesCard.innerHTML = `
    <p class="tc-label">Exchange Rates</p>
    <p class="mt-3 text-xl font-black">Target ${escapeHtml(state.totalCostTargetCurrency)}</p>
    <p class="mt-2 text-sm text-slate-500">Base: ${escapeHtml(bases.join(", ") || "--")}</p>
    <p class="mt-1 text-sm text-slate-500">Source: ${escapeHtml(providers.join(", ") || "Conversion Table")}</p>
    <p class="mt-4 text-xs ${missingCount ? "text-amber-600" : "text-emerald-600"}">${missingCount ? `${missingCount} row(s) excluded because a conversion rate is missing.` : "All selected rows were converted."}</p>
  `;
}

function renderTotalCostDashboard() {
  const view = document.getElementById("view-totalcost");
  if (!view || view.dataset.ready !== "1") return;
  const snapshot = state.totalCostBridge;
  const publishedMeta = document.getElementById("tcPublishedMeta");
  if (publishedMeta) {
    publishedMeta.textContent = snapshot
      ? `Study: ${snapshot.studyName || snapshot.studyId || "--"} | Published: ${snapshot.publishedAt ? new Date(snapshot.publishedAt).toLocaleString() : "--"} | Mercury rows: ${getTotalCostMercuryRows().length}`
      : "No Mercury publication available. Open Cost Summary & MI to publish the active study.";
  }

  const targetOptions = getTcTargetCurrencyOptions();
  if (!targetOptions.includes(state.totalCostTargetCurrency)) {
    state.totalCostTargetCurrency = targetOptions.includes("USD") ? "USD" : (targetOptions[0] || "USD");
  }
  const targetSelect = document.getElementById("tcTargetCurrency");
  if (targetSelect) {
    targetSelect.innerHTML = targetOptions.map((currency) => `<option value="${currency}"${currency === state.totalCostTargetCurrency ? " selected" : ""}>${currency}</option>`).join("");
  }

  const globalRows = getGlobalFilteredTotalCostRows();
  const descriptions = new Set(globalRows.map((row) => String(tcFieldValue(row, "Description") || "").trim()).filter(Boolean));
  const phases = new Set(globalRows.map((row) => String(tcFieldValue(row, "Phase") || "").trim()).filter(Boolean));
  state.totalCostDescFilter = state.totalCostDescFilter.filter((value) => descriptions.has(value));
  state.totalCostPhaseFilter = state.totalCostPhaseFilter.filter((value) => phases.has(value));
  rebuildTcDescList();
  rebuildTcPhaseList();
  renderTcProjectInfo(globalRows);

  const filteredRows = getFilteredTotalCostRows();
  const converted = getTcConvertedRows(filteredRows);
  const warning = document.getElementById("tcConversionWarning");
  if (warning) {
    warning.classList.toggle("hidden", converted.missingCount === 0);
    warning.textContent = converted.missingCount
      ? `${converted.missingCount} Mercury row(s) were excluded because the Conversion Table does not provide a valid path to ${state.totalCostTargetCurrency}.`
      : "";
  }
  renderTcKpis(filteredRows, converted.rows, converted.missingCount);
  renderTcTree(converted.rows);
  renderTcExplorer(converted.rows);
  renderTcDonuts(converted.rows);
  renderTcPlcTables(converted.rows);
  saveTotalCostUiState();
}

function initTotalCostView() {
  const view = document.getElementById("view-totalcost");
  if (!view || view.dataset.ready === "1") return;
  view.dataset.ready = "1";
  view.innerHTML = `
    <section class="tc-page">
      <div class="tc-hero">
        <div class="tc-hero-grid">
          <div>
            <div class="inline-flex items-center gap-2 rounded-full border border-cyan-500/40 bg-cyan-500/10 px-3 py-1 text-[11px] font-bold uppercase text-cyan-200">
              <span class="material-symbols-outlined text-[16px]">account_balance_wallet</span>Total Cost Analytics
            </div>
            <h2 class="mt-4 text-3xl font-black">Total Cost</h2>
            <p class="mt-2 max-w-2xl text-sm text-slate-300">Analyze Mercury Interface costs by project, phase, source, price-list structure and configurable decomposition levels.</p>
            <p id="tcPublishedMeta" class="mt-4 text-xs text-slate-400"></p>
          </div>
          <div id="tcProjectInfo" class="tc-project-info"></div>
        </div>
      </div>

      <div class="mt-6 space-y-6">
        <section class="tc-panel">
          <div class="tc-filter-grid">
            <label><span class="tc-label">Target Currency</span><select id="tcTargetCurrency" class="tc-level-select mt-2"></select></label>
            <div class="tc-filter-control">
              <span class="tc-label">Description</span>
              <button id="tcDescButton" type="button" class="tc-filter-button mt-2"><span id="tcDescSummary" class="truncate">All descriptions</span><span class="material-symbols-outlined text-[18px]">expand_more</span></button>
              <div id="tcDescPopover" class="tc-popover hidden">
                <div class="border-b border-slate-200 p-3"><input id="tcDescSearch" type="text" class="w-full rounded-lg px-3 py-2 text-sm" placeholder="Search descriptions"></div>
                <div id="tcDescList" class="max-h-72 overflow-y-auto"></div>
                <div class="flex gap-2 border-t border-slate-200 p-3"><button type="button" data-tc-filter-action="desc-all" class="rounded-lg border px-3 py-1.5 text-xs font-bold">All</button><button type="button" data-tc-filter-action="desc-clear" class="rounded-lg border px-3 py-1.5 text-xs font-bold">Clear</button></div>
              </div>
            </div>
            <div class="tc-filter-control">
              <span class="tc-label">Phase</span>
              <button id="tcPhaseButton" type="button" class="tc-filter-button mt-2"><span id="tcPhaseSummary" class="truncate">All phases</span><span class="material-symbols-outlined text-[18px]">expand_more</span></button>
              <div id="tcPhasePopover" class="tc-popover hidden">
                <div id="tcPhaseList" class="max-h-72 overflow-y-auto"></div>
                <div class="flex gap-2 border-t border-slate-200 p-3"><button type="button" data-tc-filter-action="phase-all" class="rounded-lg border px-3 py-1.5 text-xs font-bold">All</button><button type="button" data-tc-filter-action="phase-clear" class="rounded-lg border px-3 py-1.5 text-xs font-bold">Clear</button></div>
              </div>
            </div>
          </div>
          <p id="tcConversionWarning" class="mt-4 hidden rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800"></p>
        </section>

        <section class="tc-kpis">
          <article id="tcKpiGlobal" class="tc-panel tc-kpi" style="--tc-accent:#2563eb"></article>
          <article id="tcKpiSource" class="tc-panel tc-kpi" style="--tc-accent:#14b8a6"></article>
          <article id="tcKpiRates" class="tc-panel tc-kpi" style="--tc-accent:#f59e0b"></article>
        </section>

        <section class="tc-panel">
          <div class="flex flex-wrap items-start justify-between gap-4"><div><h3 class="text-lg font-bold">Cost Decomposition Tree</h3><p id="tcTreeSubtitle" class="mt-1 text-xs text-slate-500"></p></div><div id="tcTreeLevels"></div></div>
          <div id="tcTreeContent" class="mt-5"></div>
        </section>

        <section class="tc-panel">
          <div class="flex flex-wrap items-start justify-between gap-4"><div><h3 class="text-lg font-bold">Cost Breakdown Explorer</h3><p id="tcExplorerSubtitle" class="mt-1 text-xs text-slate-500"></p></div><div id="tcExplorerLevels"></div></div>
          <div class="tc-explorer-scroll mt-5"><div id="tcExplorer" class="tc-explorer"></div></div>
        </section>

        <section class="tc-chart-grid">
          ${[1, 2, 3].map((index) => `
            <article class="tc-panel">
              <h3 class="font-bold">Cost Share by Price List Code ${index}</h3>
              <p class="mt-1 text-xs text-slate-500">One ring per phase; percentages are calculated within each phase.</p>
              <div class="tc-donut-layout mt-4">
                <div class="relative"><svg id="tcDonutPlc${index}" class="tc-donut" viewBox="0 0 100 100"></svg><div id="tcDonutPlc${index}Center" class="pointer-events-none absolute inset-0 flex items-center justify-center text-sm font-black"></div></div>
                <div id="tcDonutPlc${index}Legend" class="tc-legend"></div>
              </div>
            </article>
          `).join("")}
        </section>

        <section class="tc-table-grid">
          ${[1, 2, 3].map((index) => `
            <article class="tc-panel min-w-0">
              <h3 class="font-bold">Cost by Price List Code ${index} x Phase</h3>
              <p id="tcTablePlc${index}Subtitle" class="mt-1 text-xs text-slate-500"></p>
              <div class="tc-table-scroll mt-4"><table id="tcTablePlc${index}" class="w-full min-w-[520px] text-xs"></table></div>
            </article>
          `).join("")}
        </section>
      </div>
    </section>
  `;

  view.addEventListener("click", (event) => {
    const descButton = event.target.closest("#tcDescButton");
    const phaseButton = event.target.closest("#tcPhaseButton");
    if (descButton) {
      document.getElementById("tcDescPopover")?.classList.toggle("hidden");
      document.getElementById("tcPhasePopover")?.classList.add("hidden");
      return;
    }
    if (phaseButton) {
      document.getElementById("tcPhasePopover")?.classList.toggle("hidden");
      document.getElementById("tcDescPopover")?.classList.add("hidden");
      return;
    }
    const action = event.target.closest("[data-tc-filter-action]")?.getAttribute("data-tc-filter-action");
    if (action) {
      if (action === "desc-all" || action === "desc-clear") state.totalCostDescFilter = [];
      if (action === "phase-all" || action === "phase-clear") state.totalCostPhaseFilter = [];
      renderTotalCostDashboard();
      return;
    }
    const addLevel = event.target.closest("[data-tc-add-level]");
    if (addLevel) {
      const scope = addLevel.getAttribute("data-tc-add-level");
      const options = getTcLevelOptions();
      const levels = scope === "tree" ? state.totalCostLevels : state.tcExplorerLevels;
      levels.push(options.find((option) => !levels.includes(option)) || options[0] || "Phase");
      if (scope === "explorer") state.tcExplorerSelections = {};
      renderTotalCostDashboard();
      return;
    }
    const removeLevel = event.target.closest("[data-tc-remove-level]");
    if (removeLevel && !removeLevel.disabled) {
      const scope = removeLevel.getAttribute("data-tc-remove-level");
      const index = Number(removeLevel.getAttribute("data-index"));
      const levels = scope === "tree" ? state.totalCostLevels : state.tcExplorerLevels;
      if (levels.length > 1) levels.splice(index, 1);
      if (scope === "explorer") state.tcExplorerSelections = {};
      renderTotalCostDashboard();
      return;
    }
    const card = event.target.closest("[data-tc-explorer-card]");
    if (card) {
      const level = Number(card.getAttribute("data-level"));
      if (level >= 0) {
        state.tcExplorerSelections[level] = card.getAttribute("data-value") || "";
        Object.keys(state.tcExplorerSelections).forEach((key) => {
          if (Number(key) > level) delete state.tcExplorerSelections[key];
        });
        renderTotalCostDashboard();
      }
    }
  });

  view.addEventListener("change", (event) => {
    if (event.target.id === "tcTargetCurrency") {
      state.totalCostTargetCurrency = event.target.value || "USD";
      renderTotalCostDashboard();
      return;
    }
    if (event.target.matches("[data-tc-desc-value]")) {
      const selected = Array.from(view.querySelectorAll("[data-tc-desc-value]:checked")).map((input) => input.getAttribute("data-tc-desc-value"));
      state.totalCostDescFilter = selected;
      renderTotalCostDashboard();
      return;
    }
    if (event.target.matches("[data-tc-phase-value]")) {
      const selected = Array.from(view.querySelectorAll("[data-tc-phase-value]:checked")).map((input) => input.getAttribute("data-tc-phase-value"));
      state.totalCostPhaseFilter = selected;
      renderTotalCostDashboard();
      return;
    }
    if (event.target.matches("[data-tc-level-select]")) {
      const scope = event.target.getAttribute("data-tc-level-select");
      const index = Number(event.target.getAttribute("data-index"));
      const levels = scope === "tree" ? state.totalCostLevels : state.tcExplorerLevels;
      levels[index] = event.target.value;
      if (scope === "explorer") state.tcExplorerSelections = {};
      renderTotalCostDashboard();
    }
  });

  view.addEventListener("input", (event) => {
    if (event.target.id !== "tcDescSearch") return;
    state.totalCostDescSearch = event.target.value || "";
    rebuildTcDescList();
  });

  renderTotalCostDashboard();
}
