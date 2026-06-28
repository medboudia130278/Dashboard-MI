const RISK_ASSESSMENT_UI_STORAGE_KEY = "dashboard-risk-assessment-ui-v1";
const RISK_ASSESSMENT_SIGNAL_KEY = "cost-summary-mi-risk-assessment-bridge-v1";
const RISK_ASSESSMENT_COLORS = ["#e11d48", "#f59e0b", "#2563eb", "#14b8a6", "#8b5cf6", "#06b6d4", "#22c55e", "#f97316"];
const RISK_ASSESSMENT_FINANCIAL_FIELDS = {
  before: "Total Value Before Mitigation (kEUR)",
  effect: "Total Effect of Mitigation (kEUR)",
  mitigationCost: "Total Cost of Mitigation (kEUR)",
  after: "Total Value After Mitigation (kEUR)",
  provision: "Total Provision Approved (kEUR)",
};
const RISK_ASSESSMENT_DEFAULT_COLUMN_KEYS = [
  "phase",
  "riskId",
  "riskDescription",
  "owner",
  "category",
  "riskProfile",
  "before",
  "actionDescription",
  "effect",
  "mitigationCost",
  "after",
  "provisionPct",
  "provision",
  "localCurrency",
  "comments",
];

function normalizeRaText(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[\s/_-]+/g, "");
}

function raFieldValue(row, field) {
  if (!row || !field) return "";
  if (Object.prototype.hasOwnProperty.call(row, field)) return row[field];
  const normalized = normalizeRaText(field);
  const matchingKey = Object.keys(row).find((key) => normalizeRaText(key) === normalized);
  return matchingKey ? row[matchingKey] : "";
}

function raNumeric(value) {
  if (value === null || value === undefined || value === "") return 0;
  const parsed = Number(String(value).replace(/\s/g, "").replace(",", ".").replace("%", ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function loadRiskAssessmentUiState() {
  const saved = readStoredJson(RISK_ASSESSMENT_UI_STORAGE_KEY, {}) || {};
  if (saved.targetCurrency) state.riskAssessmentTargetCurrency = saved.targetCurrency;
  if (saved.phaseFilter === null || Array.isArray(saved.phaseFilter)) {
    state.riskAssessmentPhaseFilter = saved.phaseFilter;
  }
  if (Array.isArray(saved.explorerLevels) && saved.explorerLevels.length) {
    state.riskAssessmentExplorerLevels = saved.explorerLevels;
  }
  if (saved.explorerSelections && typeof saved.explorerSelections === "object") {
    state.riskAssessmentExplorerSelections = saved.explorerSelections;
  }
  if (Array.isArray(saved.visibleColumns) && saved.visibleColumns.length) {
    state.riskAssessmentVisibleColumns = saved.visibleColumns.slice();
  }
}

function saveRiskAssessmentUiState() {
  writeStoredJson(RISK_ASSESSMENT_UI_STORAGE_KEY, {
    targetCurrency: state.riskAssessmentTargetCurrency,
    phaseFilter: state.riskAssessmentPhaseFilter,
    explorerLevels: state.riskAssessmentExplorerLevels,
    explorerSelections: state.riskAssessmentExplorerSelections,
    visibleColumns: state.riskAssessmentVisibleColumns,
  });
}

async function loadRiskAssessmentBridge() {
  if (state.riskAssessmentBridgeLoading) return;
  state.riskAssessmentBridgeLoading = true;
  try {
    const bridgeModule = await import("./shared/risk_assessment_dashboard_bridge.js");
    state.riskAssessmentBridge = await bridgeModule.readRiskAssessmentBridge();
  } catch (error) {
    console.warn("Unable to read Risk Assessment data.", error);
    state.riskAssessmentBridge = null;
  } finally {
    state.riskAssessmentBridgeLoading = false;
    rebuildFilters();
    if (document.getElementById("view-riskassessment")?.dataset.ready === "1") {
      renderRiskAssessmentDashboard();
    }
  }
}

function initRiskAssessmentBridge() {
  if (state._riskAssessmentBridgeInitialized) return;
  state._riskAssessmentBridgeInitialized = true;
  loadRiskAssessmentUiState();
  void loadRiskAssessmentBridge();
  window.addEventListener("storage", (event) => {
    if (event.key === RISK_ASSESSMENT_SIGNAL_KEY) void loadRiskAssessmentBridge();
  });
  window.addEventListener("focus", () => {
    const signal = readStoredJson(RISK_ASSESSMENT_SIGNAL_KEY, null);
    if (signal?.publishedAt && signal.publishedAt !== state.riskAssessmentBridge?.publishedAt) {
      void loadRiskAssessmentBridge();
    }
  });
  window.addEventListener("resize", () => {
    if (!document.getElementById("view-riskassessment")?.classList.contains("hidden")) {
      requestAnimationFrame(drawRaExplorerConnectors);
    }
  });
}

function getRiskAssessmentRows() {
  return Array.isArray(state.riskAssessmentBridge?.rows) ? state.riskAssessmentBridge.rows : [];
}

function getRiskAssessmentProjects() {
  return Array.isArray(state.riskAssessmentBridge?.projects) ? state.riskAssessmentBridge.projects : [];
}

function raSubsystemKey(value) {
  const normalized = normalizeRaText(value);
  if (["3rdrail", "cat", "feedingsystem"].includes(normalized)) return "feedingsystem";
  if (normalized === "inframanagement") return "inframanagement";
  return normalized;
}

function raSubsystemMatches(row) {
  if (shouldFilterBySubsystem() && !state.currentSubsystem.length) return false;
  const selected = getSelectedSubsystems();
  if (!selected.length) return true;
  const rowKey = raSubsystemKey(raFieldValue(row, "Owner / Sub System"));
  return selected.some((value) => raSubsystemKey(value) === rowKey);
}

function getGlobalFilteredRiskAssessmentRows() {
  return getRiskAssessmentRows().filter((row) => {
    if (!raSubsystemMatches(row)) return false;
    if (!projectNameMatchesSelection(row._project)) return false;
    if (
      state.currentProjectType !== "__ALL__"
      && normalizeRaText(row._projectType) !== normalizeRaText(state.currentProjectType)
    ) return false;
    return true;
  });
}

function getFilteredRiskAssessmentRows() {
  const phaseFilter = state.riskAssessmentPhaseFilter;
  return getGlobalFilteredRiskAssessmentRows().filter((row) => {
    if (phaseFilter === null) return true;
    if (!Array.isArray(phaseFilter) || !phaseFilter.length) return false;
    return phaseFilter.includes(String(raFieldValue(row, "Phase")));
  });
}

function findRaProject(row) {
  const projects = getRiskAssessmentProjects();
  return projects.find((project) => project.projectKey && project.projectKey === row._projectKey)
    || projects.find((project) => normalizeRaText(project.projectName) === normalizeRaText(row._project))
    || null;
}

function getRaRateToConfiguredTarget(project, currency) {
  const conversion = project?.conversion;
  const code = normalizeCurrencyCode(currency);
  if (!conversion || !code) return null;
  const configuredTarget = normalizeCurrencyCode(conversion.configuredTargetCurrency);
  if (code === configuredTarget) return 1;
  const row = (conversion.rows || []).find((entry) => normalizeCurrencyCode(entry.currency) === code);
  const rate = Number(row?.effectiveRate);
  return Number.isFinite(rate) && rate > 0 ? rate : null;
}

function convertRiskAssessmentAmount(value, sourceCurrency, project, targetCurrency = state.riskAssessmentTargetCurrency) {
  const amount = Number(value);
  const source = normalizeCurrencyCode(sourceCurrency);
  const target = normalizeCurrencyCode(targetCurrency);
  if (!Number.isFinite(amount) || !source || !target) return null;
  if (source === target) return amount;
  if (!project) return null;
  const sourceRate = getRaRateToConfiguredTarget(project, source);
  const targetRate = getRaRateToConfiguredTarget(project, target);
  if (sourceRate === null || targetRate === null || targetRate <= 0) return null;
  return amount * sourceRate / targetRate;
}

function getConvertedRiskAssessmentRows(rows) {
  let missingCount = 0;
  const convertedRows = rows.map((row) => {
    const project = findRaProject(row);
    const sourceCurrency = normalizeCurrencyCode(raFieldValue(row, "Local Currency"));
    const converted = {};
    let conversionMissing = false;
    Object.entries(RISK_ASSESSMENT_FINANCIAL_FIELDS).forEach(([key, field]) => {
      const rawValue = raFieldValue(row, field);
      if (rawValue === "" || rawValue === null || rawValue === undefined) {
        converted[key] = null;
        return;
      }
      const numericValue = raNumeric(rawValue);
      if (numericValue === 0) {
        converted[key] = 0;
        return;
      }
      const value = convertRiskAssessmentAmount(numericValue, sourceCurrency, project);
      converted[key] = value;
      if (value === null) conversionMissing = true;
    });
    if (conversionMissing) missingCount += 1;
    return {
      ...row,
      _convertedFinancials: converted,
      _conversionMissing: conversionMissing,
      _sourceCurrency: sourceCurrency,
    };
  });
  return { rows: convertedRows, missingCount };
}

function getRaTargetCurrencyOptions() {
  const options = new Set(["USD", "EUR"]);
  getRiskAssessmentProjects().forEach((project) => {
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
  getRiskAssessmentRows().forEach((row) => {
    const code = normalizeCurrencyCode(raFieldValue(row, "Local Currency"));
    if (code) options.add(code);
  });
  return Array.from(options).sort();
}

function formatRiskKAmount(value, currency = state.riskAssessmentTargetCurrency) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return "N/A";
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(Number(value))} k${normalizeCurrencyCode(currency) || ""}`;
}

function renderRaProjectInfo(globalRows) {
  const container = document.getElementById("raProjectInfo");
  if (!container) return;
  const represented = new Set(globalRows.map((row) => row._projectKey || row._project));
  const projects = getRiskAssessmentProjects().filter((project) => (
    !represented.size || represented.has(project.projectKey) || represented.has(project.projectName)
  ));
  const single = projects.length === 1 ? projects[0] : null;
  const contractDuration = single
    ? (window.getBridgeProjectContractDurationInfo?.(single)?.label || single.contractDuration || "--")
    : "--";
  const values = [
    ["Project Name", single ? single.projectName : `${projects.length} projects selected`],
    ["Project Type", single ? (single.projectType || "--") : "Multiple"],
    ["Line Length", single ? (single.lineLength || "--") : "--"],
    ["Bid / Service Year", single ? `${single.bidYear || "--"} / ${single.serviceYear || "--"}` : "-- / --"],
    ["Contract Duration", contractDuration],
  ];
  container.innerHTML = values.map(([label, value]) => `
    <div><p class="tc-label">${escapeHtml(label)}</p><p class="mt-1 truncate text-sm font-bold" title="${escapeHtml(value)}">${escapeHtml(value)}</p></div>
  `).join("");
}

function renderRaKpis(convertedRows) {
  const provisionCard = document.getElementById("raKpiProvision");
  const afterCard = document.getElementById("raKpiAfter");
  const countCard = document.getElementById("raKpiCount");
  const ratesCard = document.getElementById("raKpiRates");
  if (!provisionCard || !afterCard || !countCard || !ratesCard) return;

  const validRows = convertedRows.filter((row) => !row._conversionMissing);
  const provisionTotal = validRows.reduce((sum, row) => sum + (row._convertedFinancials.provision || 0), 0);
  const afterTotal = validRows.reduce((sum, row) => sum + (row._convertedFinancials.after || 0), 0);
  const byProject = new Map();
  validRows.forEach((row) => {
    const project = row._project || "Unspecified";
    byProject.set(project, (byProject.get(project) || 0) + (row._convertedFinancials.provision || 0));
  });
  provisionCard.innerHTML = `
    <p class="tc-label">Provision Approved Cost</p>
    <p class="mt-3 text-3xl font-black">${escapeHtml(formatRiskKAmount(provisionTotal))}</p>
    <div class="mt-4 space-y-1.5">${Array.from(byProject.entries()).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).map(([project, value], index) => `
      <div class="flex items-center justify-between gap-3 text-xs">
        <span class="flex min-w-0 items-center gap-2"><span class="size-2 rounded-full" style="background:${colorForSeriesIndex(index)}"></span><span class="truncate">${escapeHtml(project)}</span></span>
        <strong>${escapeHtml(formatRiskKAmount(value))}</strong>
      </div>
    `).join("")}</div>
  `;
  afterCard.innerHTML = `
    <p class="tc-label">Value After Mitigation</p>
    <p class="mt-3 text-3xl font-black">${escapeHtml(formatRiskKAmount(afterTotal))}</p>
    <p class="mt-4 text-xs text-slate-500">Converted from each row's Local Currency.</p>
  `;
  const distinctRisks = new Set(convertedRows.map((row) => `${row._projectKey || row._project}|${raFieldValue(row, "Phase")}|${raFieldValue(row, "RISK ID")}`));
  countCard.innerHTML = `
    <p class="tc-label">Risks Assessed</p>
    <p class="mt-3 text-3xl font-black">${escapeHtml(String(distinctRisks.size))}</p>
    <p class="mt-4 text-xs text-slate-500">${escapeHtml(String(convertedRows.length))} register row(s) in the selected scope.</p>
  `;
  const representedProjects = getRiskAssessmentProjects().filter((project) => (
    convertedRows.some((row) => row._projectKey === project.projectKey || normalizeRaText(row._project) === normalizeRaText(project.projectName))
  ));
  const providers = Array.from(new Set(representedProjects.map((project) => project.conversion?.provider).filter(Boolean)));
  const bases = Array.from(new Set(representedProjects.map((project) => project.conversion?.baseCurrency).filter(Boolean)));
  ratesCard.innerHTML = `
    <p class="tc-label">Exchange Rates</p>
    <p class="mt-3 text-xl font-black">Target ${escapeHtml(state.riskAssessmentTargetCurrency)}</p>
    <p class="mt-3 text-xs text-slate-500">Base: ${escapeHtml(bases.join(", ") || "--")}</p>
    <p class="mt-1 text-xs text-slate-500">Source: ${escapeHtml(providers.join(", ") || "Conversion Table")}</p>
  `;
}

function getRaTableColumns() {
  return [
    { key: "phase", label: "Phase", field: "Phase" },
    { key: "riskId", label: "RISK ID", field: "RISK ID" },
    { key: "riskDescription", label: "Risk Description", field: "Risk Description", wide: true },
    { key: "owner", label: "Owner / Sub System", field: "Owner / Sub System" },
    { key: "category", label: "Category", field: "Category" },
    { key: "riskProfile", label: "Risk Profile", field: "Risk Profile" },
    { key: "before", label: `Value Before Mitigation (k${state.riskAssessmentTargetCurrency})`, converted: "before" },
    { key: "actionDescription", label: "Action Description", field: "Action Description", wide: true },
    { key: "effect", label: `Effect of Mitigation (k${state.riskAssessmentTargetCurrency})`, converted: "effect" },
    { key: "mitigationCost", label: `Cost of Mitigation (k${state.riskAssessmentTargetCurrency})`, converted: "mitigationCost" },
    { key: "after", label: `Value After Mitigation (k${state.riskAssessmentTargetCurrency})`, converted: "after" },
    { key: "provisionPct", label: "Provision %", field: "Provision %" },
    { key: "provision", label: `Provision Approved (k${state.riskAssessmentTargetCurrency})`, converted: "provision" },
    { key: "localCurrency", label: "Local Currency", field: "Local Currency" },
    { key: "comments", label: "Comments", field: "Comments", wide: true },
  ];
}

function getRaVisibleColumnKeys() {
  const validKeys = new Set(RISK_ASSESSMENT_DEFAULT_COLUMN_KEYS);
  const configured = Array.isArray(state.riskAssessmentVisibleColumns)
    ? state.riskAssessmentVisibleColumns.filter((key) => validKeys.has(key))
    : [];
  if (!configured.length) {
    state.riskAssessmentVisibleColumns = RISK_ASSESSMENT_DEFAULT_COLUMN_KEYS.slice();
  } else if (configured.length !== state.riskAssessmentVisibleColumns.length) {
    state.riskAssessmentVisibleColumns = configured;
  }
  return state.riskAssessmentVisibleColumns;
}

function getRaRiskProfileKey(value) {
  const profile = normalizeRaText(value);
  if (profile === "acceptable") return "acceptable";
  if (profile === "moderate") return "moderate";
  if (profile === "undesirable") return "undesirable";
  if (profile === "intolerable") return "intolerable";
  return "neutral";
}

function renderRaColumnSelector() {
  const list = document.getElementById("raColumnsList");
  const summary = document.getElementById("raColumnsSummary");
  if (!list || !summary) return;
  const columns = getRaTableColumns();
  const visibleKeys = getRaVisibleColumnKeys();
  summary.textContent = `${visibleKeys.length}/${columns.length} columns`;
  list.innerHTML = columns.map((column) => `
    <label class="flex items-center gap-3 px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
      <input type="checkbox" data-ra-column-key="${escapeHtml(column.key)}"${visibleKeys.includes(column.key) ? " checked" : ""}>
      <span class="text-sm">${escapeHtml(column.label)}</span>
    </label>
  `).join("");
}

function renderRaTable(convertedRows) {
  const table = document.getElementById("raRegisterTable");
  const subtitle = document.getElementById("raTableSubtitle");
  if (!table || !subtitle) return;
  subtitle.textContent = `${convertedRows.length} risk row(s) - financial values in k${state.riskAssessmentTargetCurrency}`;
  const visibleKeys = getRaVisibleColumnKeys();
  const columns = getRaTableColumns().filter((column) => visibleKeys.includes(column.key));
  table.style.minWidth = `${Math.max(720, columns.reduce((sum, column) => sum + (column.wide ? 300 : 140), 0))}px`;
  table.innerHTML = `
    <thead><tr>${columns.map((column) => `<th class="px-3 py-3 text-left ${column.wide ? "min-w-[300px]" : "min-w-[130px]"}">${escapeHtml(column.label)}</th>`).join("")}</tr></thead>
    <tbody>${convertedRows.length ? convertedRows.map((row) => {
      const profileValue = String(raFieldValue(row, "Risk Profile") ?? "");
      const profileKey = getRaRiskProfileKey(profileValue);
      return `
      <tr class="ra-risk-row ra-risk-${profileKey} border-t border-slate-100 dark:border-slate-800" data-risk-profile="${escapeHtml(profileKey)}">
        ${columns.map((column) => {
          const value = column.converted
            ? (row._conversionMissing && row._convertedFinancials[column.converted] === null ? "N/A" : formatRiskKAmount(row._convertedFinancials[column.converted]))
            : String(raFieldValue(row, column.field) ?? "");
          const content = column.key === "riskProfile"
            ? `<span class="ra-profile-badge ra-profile-${profileKey}">${escapeHtml(value || "Unspecified")}</span>`
            : escapeHtml(value);
          return `<td class="px-3 py-3 align-top ${column.converted ? "text-right tabular-nums font-semibold" : ""}" title="${escapeHtml(value)}">${content}</td>`;
        }).join("")}
      </tr>
    `;
    }).join("") : `<tr><td colspan="${columns.length}" class="px-4 py-10 text-center text-sm text-slate-500">No Risk Assessment row matches the selected filters.</td></tr>`}</tbody>
  `;
}

function getRaExplorerLevelOptions() {
  return ["Phase", "RISK ID", "Owner / Sub System", "Category", "Risk Profile", "Risk Description"];
}

function raExplorerToolbarHtml() {
  const options = getRaExplorerLevelOptions();
  const levels = state.riskAssessmentExplorerLevels;
  return `
    <div class="tc-level-toolbar">
      ${levels.map((level, index) => `
        <div class="tc-level">
          <span class="text-[10px] font-bold text-slate-400">L${index + 1}</span>
          <select class="tc-level-select border-0 p-0 min-h-0" data-ra-level-select data-index="${index}">
            ${options.map((option) => `<option value="${escapeHtml(option)}"${option === level ? " selected" : ""}>${escapeHtml(option)}</option>`).join("")}
          </select>
          <button type="button" data-ra-remove-level data-index="${index}" class="inline-flex size-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-rose-600" title="Remove level"${levels.length <= 1 ? " disabled" : ""}>
            <span class="material-symbols-outlined text-[17px]">close</span>
          </button>
        </div>
      `).join('<span class="material-symbols-outlined text-slate-300">chevron_right</span>')}
      <button type="button" data-ra-add-level class="inline-flex items-center gap-1 rounded-lg border border-rose-300 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50"${levels.length >= options.length ? " disabled" : ""}>
        <span class="material-symbols-outlined text-[17px]">add</span>Add Level
      </button>
    </div>
  `;
}

function groupRaExplorerRows(rows, field) {
  const groups = new Map();
  rows.forEach((row) => {
    const value = String(raFieldValue(row, field) ?? "").trim() || "(Blank)";
    if (!groups.has(value)) groups.set(value, []);
    groups.get(value).push(row);
  });
  return Array.from(groups.entries())
    .map(([label, groupRows]) => ({
      label,
      rows: groupRows,
      value: groupRows.reduce((sum, row) => sum + (row._convertedFinancials.provision || 0), 0),
    }))
    .sort((left, right) => Math.abs(right.value) - Math.abs(left.value))
    .slice(0, 12);
}

function renderRaExplorer(rows) {
  const toolbar = document.getElementById("raExplorerLevels");
  const subtitle = document.getElementById("raExplorerSubtitle");
  const explorer = document.getElementById("raExplorer");
  if (!toolbar || !subtitle || !explorer) return;
  toolbar.innerHTML = raExplorerToolbarHtml();
  subtitle.textContent = `${state.riskAssessmentExplorerLevels.join(" > ")} - k${state.riskAssessmentTargetCurrency}`;
  if (!rows.length) {
    explorer.innerHTML = '<div class="py-8 text-sm text-slate-500">No strictly positive approved provision is available for the selected filters.</div>';
    return;
  }

  const total = rows.reduce((sum, row) => sum + (row._convertedFinancials.provision || 0), 0);
  let currentRows = rows;
  const columns = [];
  state.riskAssessmentExplorerLevels.forEach((field, levelIndex) => {
    const groups = groupRaExplorerRows(currentRows, field);
    const selected = groups.some((group) => group.label === state.riskAssessmentExplorerSelections[levelIndex])
      ? state.riskAssessmentExplorerSelections[levelIndex]
      : (groups[0]?.label || "");
    state.riskAssessmentExplorerSelections[levelIndex] = selected;
    columns.push({ field, groups, selected, levelIndex });
    currentRows = groups.find((group) => group.label === selected)?.rows || [];
  });
  Object.keys(state.riskAssessmentExplorerSelections).forEach((key) => {
    if (Number(key) >= state.riskAssessmentExplorerLevels.length) delete state.riskAssessmentExplorerSelections[key];
  });

  explorer.innerHTML = `
    <svg id="raExplorerConnectors" class="tc-explorer-connectors" aria-hidden="true"></svg>
    <div class="tc-explorer-column" data-ra-explorer-column="-1">
      <div class="tc-explorer-card is-selected" data-ra-explorer-card data-level="-1" data-value="__ROOT__" style="--tc-card-color:#e11d48;--tc-card-share:100%">
        <span class="tc-label">Root</span>
        <p class="mt-2 font-bold">Provision Approved Cost</p>
        <p class="mt-1 text-sm text-slate-500">${escapeHtml(formatRiskKAmount(total))}</p>
      </div>
    </div>
    ${columns.map((column, columnIndex) => {
      const max = Math.max(...column.groups.map((group) => Math.abs(group.value)), 0);
      return `
        <div class="tc-explorer-column" data-ra-explorer-column="${columnIndex}">
          ${column.groups.map((group) => {
            const selected = group.label === column.selected;
            const share = max > 0 ? Math.max(2, Math.abs(group.value) / max * 100) : 0;
            const color = RISK_ASSESSMENT_COLORS[(columnIndex + Math.abs(group.label.length)) % RISK_ASSESSMENT_COLORS.length];
            return `
              <button type="button" class="tc-explorer-card${selected ? " is-selected" : ""}" data-ra-explorer-card data-level="${columnIndex}" data-value="${escapeHtml(group.label)}" style="--tc-card-color:${color};--tc-card-share:${share}%">
                <span class="tc-label">${escapeHtml(column.field)}</span>
                <p class="mt-2 font-bold truncate" title="${escapeHtml(group.label)}">${escapeHtml(group.label)}</p>
                <p class="mt-1 text-sm text-slate-500">${escapeHtml(formatRiskKAmount(group.value))}</p>
              </button>
            `;
          }).join("")}
        </div>
      `;
    }).join("")}
  `;
  saveRiskAssessmentUiState();
  requestAnimationFrame(drawRaExplorerConnectors);
}

function drawRaExplorerConnectors() {
  const explorer = document.getElementById("raExplorer");
  const svg = document.getElementById("raExplorerConnectors");
  if (!explorer || !svg) return;
  const bounds = explorer.getBoundingClientRect();
  svg.setAttribute("width", String(explorer.scrollWidth));
  svg.setAttribute("height", String(explorer.scrollHeight));
  svg.setAttribute("viewBox", `0 0 ${explorer.scrollWidth} ${explorer.scrollHeight}`);
  const paths = [];
  const columns = Array.from(explorer.querySelectorAll("[data-ra-explorer-column]"));
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

function syncRaPhaseSummary() {
  const summary = document.getElementById("raPhaseSummary");
  if (!summary) return;
  const selection = state.riskAssessmentPhaseFilter;
  summary.textContent = selection === null
    ? "All phases"
    : selection.length
      ? (selection.length <= 2 ? selection.join(", ") : `${selection.length} phases selected`)
      : "No phase selected";
}

function rebuildRaPhaseList(globalRows) {
  const list = document.getElementById("raPhaseList");
  if (!list) return;
  const phases = Array.from(new Set(globalRows.map((row) => String(raFieldValue(row, "Phase") || "").trim()).filter(Boolean))).sort();
  const allSelected = state.riskAssessmentPhaseFilter === null;
  list.innerHTML = phases.length ? phases.map((phase) => `
    <label class="flex items-center gap-3 px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
      <input type="checkbox" data-ra-phase-value="${escapeHtml(phase)}"${allSelected || state.riskAssessmentPhaseFilter.includes(phase) ? " checked" : ""}>
      <span class="text-sm">${escapeHtml(phase)}</span>
    </label>
  `).join("") : '<p class="p-4 text-sm text-slate-500">No phase available.</p>';
  syncRaPhaseSummary();
}

function renderRiskAssessmentDashboard() {
  const view = document.getElementById("view-riskassessment");
  if (!view || view.dataset.ready !== "1") return;
  const snapshot = state.riskAssessmentBridge;
  const warning = document.getElementById("raWarning");
  const targetSelect = document.getElementById("raTargetCurrency");
  const targetOptions = getRaTargetCurrencyOptions();
  if (!targetOptions.includes(state.riskAssessmentTargetCurrency)) {
    state.riskAssessmentTargetCurrency = targetOptions.includes("USD") ? "USD" : (targetOptions[0] || "USD");
  }
  if (targetSelect) {
    targetSelect.innerHTML = targetOptions.map((currency) => `<option value="${currency}"${currency === state.riskAssessmentTargetCurrency ? " selected" : ""}>${currency}</option>`).join("");
  }

  const globalRows = getGlobalFilteredRiskAssessmentRows();
  const availablePhases = new Set(globalRows.map((row) => String(raFieldValue(row, "Phase") || "").trim()).filter(Boolean));
  if (Array.isArray(state.riskAssessmentPhaseFilter) && state.riskAssessmentPhaseFilter.length) {
    const valid = state.riskAssessmentPhaseFilter.filter((phase) => availablePhases.has(phase));
    state.riskAssessmentPhaseFilter = valid.length ? valid : null;
  }
  rebuildRaPhaseList(globalRows);
  renderRaProjectInfo(globalRows);

  const filteredRows = getFilteredRiskAssessmentRows();
  const converted = getConvertedRiskAssessmentRows(filteredRows);
  renderRaKpis(converted.rows);
  renderRaColumnSelector();
  renderRaTable(converted.rows);
  renderRaExplorer(converted.rows.filter((row) => !row._conversionMissing && (row._convertedFinancials.provision || 0) > 0));

  if (warning) {
    const messages = [];
    if (!snapshot) messages.push("No Risk Assessment publication is available. Open Cost Summary & MI to publish the active study.");
    else if (!globalRows.length) messages.push("No Risk Assessment row matches the global Dashboard filters.");
    if (converted.missingCount) {
      messages.push(`${converted.missingCount} row(s) could not be converted to ${state.riskAssessmentTargetCurrency} because no valid Conversion Table path was found.`);
    }
    warning.textContent = messages.join(" ");
    warning.classList.toggle("hidden", !messages.length);
  }
  saveRiskAssessmentUiState();
}

function initRiskAssessmentView() {
  const view = document.getElementById("view-riskassessment");
  if (!view || view.dataset.ready === "1") return;
  view.dataset.ready = "1";
  view.innerHTML = `
    <section class="ra-page">
      <header class="ra-hero">
        <div class="tc-hero-grid">
          <div>
            <span class="inline-flex items-center gap-2 rounded-full border border-rose-300/40 bg-rose-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[.16em] text-rose-200">
              <span class="material-symbols-outlined text-[16px]">policy</span>Risk Assessment Analytics
            </span>
            <h2 class="mt-4 text-3xl font-black">Risk Assessment</h2>
            <p class="mt-2 max-w-2xl text-sm text-slate-300">Analyze approved provisions, mitigation values and risk exposure from the active Cost Summary & MI study.</p>
          </div>
          <div id="raProjectInfo" class="tc-project-info"></div>
        </div>
      </header>

      <div class="space-y-6 pt-6">
        <section class="tc-panel">
          <div class="ra-filter-grid">
            <label>
              <span class="tc-label">Target Currency</span>
              <select id="raTargetCurrency" class="mt-2 w-full"></select>
            </label>
            <div class="tc-filter-control">
              <span class="tc-label">Phase</span>
              <button id="raPhaseButton" type="button" class="tc-filter-button mt-2">
                <span id="raPhaseSummary">All phases</span><span class="material-symbols-outlined text-[18px]">expand_more</span>
              </button>
              <div id="raPhasePopover" class="tc-popover hidden">
                <div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 px-4 py-3">
                  <strong class="text-sm">Select phases</strong>
                  <div class="flex gap-2">
                    <button type="button" data-ra-phase-action="all" class="text-xs font-bold text-blue-600">All</button>
                    <button type="button" data-ra-phase-action="clear" class="text-xs font-bold text-rose-600">Clear</button>
                  </div>
                </div>
                <div id="raPhaseList" class="max-h-72 overflow-y-auto"></div>
              </div>
            </div>
          </div>
        </section>

        <div id="raWarning" class="hidden rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200"></div>

        <section class="ra-kpis">
          <article id="raKpiProvision" class="tc-panel tc-kpi" style="--tc-accent:#e11d48"></article>
          <article id="raKpiAfter" class="tc-panel tc-kpi" style="--tc-accent:#f59e0b"></article>
          <article id="raKpiCount" class="tc-panel tc-kpi" style="--tc-accent:#2563eb"></article>
          <article id="raKpiRates" class="tc-panel tc-kpi" style="--tc-accent:#14b8a6"></article>
        </section>

        <section class="tc-panel min-w-0">
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h3 class="text-lg font-bold">Risk Assessment Register</h3>
              <p id="raTableSubtitle" class="mt-1 text-xs text-slate-500"></p>
              <div class="ra-profile-legend mt-3" aria-label="Risk Profile color legend">
                <span><i class="ra-legend-dot ra-legend-acceptable"></i>Acceptable</span>
                <span><i class="ra-legend-dot ra-legend-moderate"></i>Moderate</span>
                <span><i class="ra-legend-dot ra-legend-undesirable"></i>Undesirable</span>
                <span><i class="ra-legend-dot ra-legend-intolerable"></i>Intolerable</span>
              </div>
            </div>
            <div class="tc-filter-control">
              <button id="raColumnsButton" type="button" class="tc-filter-button min-w-[210px]">
                <span class="flex items-center gap-2"><span class="material-symbols-outlined text-[18px]">view_column</span><span id="raColumnsSummary">15/15 columns</span></span>
                <span class="material-symbols-outlined text-[18px]">expand_more</span>
              </button>
              <div id="raColumnsPopover" class="tc-popover right-0 left-auto hidden">
                <div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 px-4 py-3">
                  <strong class="text-sm">Displayed columns</strong>
                  <div class="flex gap-3">
                    <button type="button" data-ra-columns-action="all" class="text-xs font-bold text-blue-600">Show all</button>
                    <button type="button" data-ra-columns-action="reset" class="text-xs font-bold text-rose-600">Reset</button>
                  </div>
                </div>
                <div id="raColumnsList" class="max-h-80 overflow-y-auto"></div>
              </div>
            </div>
          </div>
          <div class="ra-table-scroll mt-4"><table id="raRegisterTable" class="w-full text-xs"></table></div>
        </section>

        <section class="tc-panel min-w-0">
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h3 class="text-lg font-bold">Cost Breakdown Explorer</h3>
              <p id="raExplorerSubtitle" class="mt-1 text-xs text-slate-500"></p>
            </div>
            <div id="raExplorerLevels"></div>
          </div>
          <div class="tc-explorer-scroll mt-4">
            <div id="raExplorer" class="tc-explorer"></div>
          </div>
        </section>
      </div>
    </section>
  `;

  view.addEventListener("click", (event) => {
    if (event.target.closest("#raPhaseButton")) {
      document.getElementById("raPhasePopover")?.classList.toggle("hidden");
      document.getElementById("raColumnsPopover")?.classList.add("hidden");
      return;
    }
    if (event.target.closest("#raColumnsButton")) {
      document.getElementById("raColumnsPopover")?.classList.toggle("hidden");
      document.getElementById("raPhasePopover")?.classList.add("hidden");
      return;
    }
    const phaseAction = event.target.closest("[data-ra-phase-action]")?.getAttribute("data-ra-phase-action");
    if (phaseAction) {
      state.riskAssessmentPhaseFilter = phaseAction === "all" ? null : [];
      state.riskAssessmentExplorerSelections = {};
      renderRiskAssessmentDashboard();
      return;
    }
    const columnsAction = event.target.closest("[data-ra-columns-action]")?.getAttribute("data-ra-columns-action");
    if (columnsAction) {
      state.riskAssessmentVisibleColumns = RISK_ASSESSMENT_DEFAULT_COLUMN_KEYS.slice();
      renderRiskAssessmentDashboard();
      return;
    }
    const addLevel = event.target.closest("[data-ra-add-level]");
    if (addLevel && !addLevel.disabled) {
      const options = getRaExplorerLevelOptions();
      const next = options.find((option) => !state.riskAssessmentExplorerLevels.includes(option));
      if (next) state.riskAssessmentExplorerLevels.push(next);
      state.riskAssessmentExplorerSelections = {};
      renderRiskAssessmentDashboard();
      return;
    }
    const removeLevel = event.target.closest("[data-ra-remove-level]");
    if (removeLevel && !removeLevel.disabled) {
      state.riskAssessmentExplorerLevels.splice(Number(removeLevel.getAttribute("data-index")), 1);
      state.riskAssessmentExplorerSelections = {};
      renderRiskAssessmentDashboard();
      return;
    }
    const card = event.target.closest("[data-ra-explorer-card]");
    if (card) {
      const level = Number(card.getAttribute("data-level"));
      if (level >= 0) {
        state.riskAssessmentExplorerSelections[level] = card.getAttribute("data-value") || "";
        Object.keys(state.riskAssessmentExplorerSelections).forEach((key) => {
          if (Number(key) > level) delete state.riskAssessmentExplorerSelections[key];
        });
        renderRiskAssessmentDashboard();
      }
    }
  });

  view.addEventListener("change", (event) => {
    if (event.target.id === "raTargetCurrency") {
      state.riskAssessmentTargetCurrency = event.target.value || "USD";
      renderRiskAssessmentDashboard();
      return;
    }
    if (event.target.matches("[data-ra-phase-value]")) {
      const allPhases = Array.from(view.querySelectorAll("[data-ra-phase-value]")).map((input) => input.getAttribute("data-ra-phase-value"));
      const selected = Array.from(view.querySelectorAll("[data-ra-phase-value]:checked")).map((input) => input.getAttribute("data-ra-phase-value"));
      state.riskAssessmentPhaseFilter = selected.length === allPhases.length ? null : selected;
      state.riskAssessmentExplorerSelections = {};
      renderRiskAssessmentDashboard();
      return;
    }
    if (event.target.matches("[data-ra-column-key]")) {
      const selected = Array.from(view.querySelectorAll("[data-ra-column-key]:checked"))
        .map((input) => input.getAttribute("data-ra-column-key"))
        .filter(Boolean);
      if (!selected.length) {
        event.target.checked = true;
        return;
      }
      state.riskAssessmentVisibleColumns = RISK_ASSESSMENT_DEFAULT_COLUMN_KEYS.filter((key) => selected.includes(key));
      const filteredRows = getFilteredRiskAssessmentRows();
      renderRaTable(getConvertedRiskAssessmentRows(filteredRows).rows);
      const summary = document.getElementById("raColumnsSummary");
      if (summary) summary.textContent = `${state.riskAssessmentVisibleColumns.length}/${RISK_ASSESSMENT_DEFAULT_COLUMN_KEYS.length} columns`;
      saveRiskAssessmentUiState();
      return;
    }
    if (event.target.matches("[data-ra-level-select]")) {
      state.riskAssessmentExplorerLevels[Number(event.target.getAttribute("data-index"))] = event.target.value;
      state.riskAssessmentExplorerSelections = {};
      renderRiskAssessmentDashboard();
    }
  });

  renderRiskAssessmentDashboard();
}
