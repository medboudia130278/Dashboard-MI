import {
  DEFAULT_COST_SUMMARY_DRAFT,
  SHARED_STORE_KEYS,
  createEmptyCostSummarySnapshot,
} from "./shared/shared_models.js";
import {
  getAllWorkbookData,
  initSharedStore,
  loadCostSummaryDraft,
  loadSharedSettings,
  saveCostSummaryDraft,
} from "./shared/shared_data_store.js";
import {
  createStudy,
  deleteStudy,
  ensureDashboardBridgeStudy,
  ensureDefaultStudy,
  listNormalizedWorkbooks,
  listStudies,
  loadStudyConfig as loadPersistedStudyConfig,
  removeSource,
  saveStudyConfig as savePersistedStudyConfig,
  setLastOpenStudyId,
  updateStudy,
} from "./shared/study_persistence.js";

const state = createEmptyCostSummarySnapshot();
state.activeToolbarMenuKey = "";
state.activeDrawerModuleKey = "";
state.currentStudy = null;
state.studies = [];
state.studyConfig = null;
state.currentProjectPhasesProjectKey = "";
state.currentCostCentersProjectKey = "";
state.currentPioDefinitionProjectKey = "";
state.currentCurrencyExchangeProjectKey = "";
state.currentGuidePlanningProjectKey = "";

const WORKSPACE_LITE_INDEX_KEY = "cost-summary-mi-workbook-lite-index-v1";
const WORKSPACE_FULL_PREFIX = SHARED_STORE_KEYS.workbookPrefix;
const WORKSPACE_LITE_PREFIX = "shared-store-workbook-lite-v1:";

const calculationBlocks = [
  {
    block: "Parameter intake",
    purpose: "Collect user drivers, workbook metadata, and export options.",
    dependency: "Manual inputs",
    status: "Ready for detailed design",
  },
  {
    block: "Source mapping",
    purpose: "Map the future MI logic to the relevant workbook sheets and columns.",
    dependency: "Dashboard workbook schema",
    status: "To define",
  },
  {
    block: "Calculation engine",
    purpose: "Transform raw planning/cost data into the MI summary model.",
    dependency: "Business formulas",
    status: "Not started",
  },
  {
    block: "Validation controls",
    purpose: "Check missing values, invalid currencies, and inconsistent project scopes.",
    dependency: "Rulebook",
    status: "Not started",
  },
  {
    block: "Workbook export",
    purpose: "Generate the final Excel file with formatting and optional protected tabs.",
    dependency: "Calculation output",
    status: "Not started",
  },
];

const workbookOutline = [
  "Cover / assumptions",
  "Input parameters",
  "Calculation engine",
  "Cost Summary",
  "MI output",
  "Audit trail",
];

function buildWorkspaceLiteMirror(workbook = {}) {
  const generalParams = workbook.generalParams || workbook.sheets?.generalParameters || {};
  const synthesisRows = Array.isArray(workbook.sheets?.synthesis) ? workbook.sheets.synthesis : [];
  const summarySubsystems = Array.from(
    new Set(
      synthesisRows
        .map((row) => String(row?.subsystem || row?.sub_system || "").trim())
        .filter(Boolean)
    )
  ).sort((left, right) => String(left).localeCompare(String(right)));
  const summaryCurrencies = Array.from(
    new Set(
      synthesisRows
        .map((row) => String(row?.currency || row?.Currency || "").trim().toUpperCase())
        .filter(Boolean)
    )
  ).sort((left, right) => String(left).localeCompare(String(right)));
  const hoursReportRows = Array.isArray(workbook.sheets?.hoursReport) ? workbook.sheets.hoursReport : [];
  const workloadSynthesisRows = synthesisRows.map(function (row) {
    return {
      subsystem: row.subsystem || "",
      type: row.type || "",
      shift: row.shift || "",
      day_technicians_optimized: row.day_technicians_optimized || 0,
      night_technicians_optimized: row.night_technicians_optimized || 0,
      paliative_hours_corrective: row.paliative_hours_corrective || 0,
      yearly_total_hours_corrective: row.yearly_total_hours_corrective || 0,
      yearly_reparable_cost: row.yearly_reparable_cost || 0,
      total_global_cost: row.total_global_cost || 0,
    };
  });
  const workloadHoursRows = hoursReportRows.map(function (row) {
    return {
      subsystem: row.subsystem || "",
      shift_type: row.shift_type || "",
      hours_worked: row.hours_worked || 0,
      available_days: row.available_days || 0,
    };
  });
  return {
    sourceId: workbook.sourceId || "",
    projectKey: workbook.projectKey || "",
    fileName: workbook.fileName || "",
    kind: workbook.kind || "",
    updatedAt: workbook.updatedAt || new Date().toISOString(),
    generalParams,
    sheets: {
      generalParameters: generalParams,
      workloadSynthesis: workloadSynthesisRows,
      workloadHoursReport: workloadHoursRows,
    },
    summary: {
      synthesisSubsystems: summarySubsystems,
      synthesisCurrencies: summaryCurrencies,
      synthesisRowCount: synthesisRows.length,
    },
  };
}

function mergeWorkbooksBySourceId(...collections) {
  const bySourceId = new Map();
  collections.flat().filter(Boolean).forEach((item) => {
    const sourceId = String(item.sourceId || "").trim();
    if (!sourceId) return;
    const existing = bySourceId.get(sourceId);
    const currentScore =
      (Array.isArray(item.sheets?.synthesis) ? item.sheets.synthesis.length : 0) +
      (Array.isArray(item.sheets?.correctivePlanning) ? item.sheets.correctivePlanning.length : 0) +
      (Array.isArray(item.sheets?.overhaulRenewalPlanning) ? item.sheets.overhaulRenewalPlanning.length : 0) +
      (Array.isArray(item.sheets?.subcontractingPlanning) ? item.sheets.subcontractingPlanning.length : 0);
    const existingScore = existing
      ? (
          (Array.isArray(existing.sheets?.synthesis) ? existing.sheets.synthesis.length : 0) +
          (Array.isArray(existing.sheets?.correctivePlanning) ? existing.sheets.correctivePlanning.length : 0) +
          (Array.isArray(existing.sheets?.overhaulRenewalPlanning) ? existing.sheets.overhaulRenewalPlanning.length : 0) +
          (Array.isArray(existing.sheets?.subcontractingPlanning) ? existing.sheets.subcontractingPlanning.length : 0)
        )
      : -1;
    if (!existing || currentScore >= existingScore) {
      bySourceId.set(sourceId, item);
    }
  });
  return compactWorkbooksForSourceData(Array.from(bySourceId.values()));
}

function getWorkbookGeneralParams(workbook) {
  return workbook?.generalParams || workbook?.sheets?.generalParameters || {};
}

function normalizeSourceDataKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\\/g, "/")
    .split("/")
    .pop()
    .replace(/\s+/g, " ");
}

function getWorkbookLogicalSourceKey(workbook) {
  const projectKey = normalizeSourceDataKey(getWorkbookProjectKey(workbook));
  const kind = normalizeSourceDataKey(workbook?.kind || "workbook");
  const fileName = normalizeSourceDataKey(workbook?.fileName || workbook?.label || "");
  if (!projectKey && !kind && !fileName) return String(workbook?.sourceId || "").trim();
  return [projectKey, kind, fileName || String(workbook?.sourceId || "").trim()].join("|");
}

function compactWorkbooksForSourceData(workbooks = []) {
  const byLogicalSource = new Map();
  (workbooks || []).filter(Boolean).forEach((workbook) => {
    const logicalKey = getWorkbookLogicalSourceKey(workbook);
    if (!logicalKey) return;

    const existing = byLogicalSource.get(logicalKey);
    if (!existing) {
      byLogicalSource.set(logicalKey, {
        workbook,
        sourceIds: new Set([String(workbook.sourceId || "").trim()].filter(Boolean)),
      });
      return;
    }

    if (workbook.sourceId) existing.sourceIds.add(String(workbook.sourceId).trim());
    if (isPreferredProjectWorkbook(workbook, existing.workbook)) {
      existing.workbook = workbook;
    }
  });

  return Array.from(byLogicalSource.values()).map((entry) => {
    const sourceIds = Array.from(entry.sourceIds);
    return Object.assign({}, entry.workbook, {
      mergedSourceIds: sourceIds,
      duplicateSourceCount: Math.max(0, sourceIds.length - 1),
    });
  });
}

function getWorkbookProjectKey(workbook) {
  const params = getWorkbookGeneralParams(workbook);
  return workbook?.projectKey || params.project_name || workbook?.fileName || "";
}

function getWorkbookUpdatedAtMs(workbook) {
  const timestamp = Date.parse(String(workbook?.updatedAt || ""));
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function getWorkbookGeneralParamsFieldCount(workbook) {
  const params = getWorkbookGeneralParams(workbook);
  return params && typeof params === "object" ? Object.keys(params).length : 0;
}

function getWorkbookCompletenessScore(workbook) {
  return (
    (Array.isArray(workbook?.sheets?.synthesis) ? workbook.sheets.synthesis.length : 0) +
    (Array.isArray(workbook?.sheets?.correctivePlanning) ? workbook.sheets.correctivePlanning.length : 0) +
    (Array.isArray(workbook?.sheets?.overhaulRenewalPlanning) ? workbook.sheets.overhaulRenewalPlanning.length : 0) +
    (Array.isArray(workbook?.sheets?.subcontractingPlanning) ? workbook.sheets.subcontractingPlanning.length : 0)
  );
}

function isPreferredProjectWorkbook(candidate, existing) {
  if (!existing) return true;

  const candidateGpCount = getWorkbookGeneralParamsFieldCount(candidate);
  const existingGpCount = getWorkbookGeneralParamsFieldCount(existing);
  if (candidateGpCount && !existingGpCount) return true;
  if (!candidateGpCount && existingGpCount) return false;

  const candidateUpdatedAt = getWorkbookUpdatedAtMs(candidate);
  const existingUpdatedAt = getWorkbookUpdatedAtMs(existing);
  if (candidateUpdatedAt !== existingUpdatedAt) {
    return candidateUpdatedAt > existingUpdatedAt;
  }

  const candidateScore = getWorkbookCompletenessScore(candidate);
  const existingScore = getWorkbookCompletenessScore(existing);
  if (candidateScore !== existingScore) {
    return candidateScore > existingScore;
  }

  return false;
}

function getPreferredProjectWorkbookMap(workbooks = state.workbooks) {
  const byProject = new Map();
  (workbooks || []).forEach((workbook) => {
    const projectKey = getWorkbookProjectKey(workbook);
    if (!projectKey) return;
    const existing = byProject.get(projectKey);
    if (isPreferredProjectWorkbook(workbook, existing)) {
      byProject.set(projectKey, workbook);
    }
  });
  return byProject;
}

function getMergedProjectGeneralParamsMap(workbooks = state.workbooks) {
  const byProject = new Map();
  (workbooks || []).forEach((workbook) => {
    const projectKey = getWorkbookProjectKey(workbook);
    if (!projectKey) return;
    const params = getWorkbookGeneralParams(workbook);
    const updatedAtMs = getWorkbookUpdatedAtMs(workbook);
    const existing = byProject.get(projectKey) || {
      projectKey,
      params: {},
      fieldUpdatedAt: {},
    };

    Object.keys(params || {}).forEach((key) => {
      const nextUpdatedAt = updatedAtMs;
      const currentUpdatedAt = Number(existing.fieldUpdatedAt[key] || 0);
      if (nextUpdatedAt >= currentUpdatedAt) {
        existing.params[key] = params[key];
        existing.fieldUpdatedAt[key] = nextUpdatedAt;
      }
    });

    byProject.set(projectKey, existing);
  });
  return byProject;
}

function syncWorkspaceLiteCache(workbooks = []) {
  window.__costSummarySharedWorkbooks = workbooks.slice();
  const ids = Array.from(new Set(workbooks.map((item) => String(item.sourceId || "").trim()).filter(Boolean)));
  try {
    const existingIndex = (() => {
      const raw = localStorage.getItem(WORKSPACE_LITE_INDEX_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    })();
    existingIndex
      .filter((id) => !ids.includes(id))
      .forEach((id) => {
        localStorage.removeItem(`${WORKSPACE_LITE_PREFIX}${id}`);
      });
    localStorage.setItem(WORKSPACE_LITE_INDEX_KEY, JSON.stringify(ids));
    workbooks.forEach((workbook) => {
      if (!workbook?.sourceId) return;
      localStorage.setItem(
        `${WORKSPACE_LITE_PREFIX}${workbook.sourceId}`,
        JSON.stringify(buildWorkspaceLiteMirror(workbook))
      );
    });
  } catch (error) {
    console.warn("Unable to sync Cost Summary workbook lite cache.", error);
  }
}

function readLocalJsonValue(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function listStoredSharedWorkbookIds() {
  const ids = [];
  try {
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index) || "";
      if (key.startsWith(WORKSPACE_FULL_PREFIX)) {
        ids.push(key.slice(WORKSPACE_FULL_PREFIX.length));
      }
    }
  } catch {
    return [];
  }
  return Array.from(new Set(ids.filter(Boolean)));
}

function readStoredSharedWorkbook(sourceId) {
  const workbook = readLocalJsonValue(`${WORKSPACE_FULL_PREFIX}${sourceId}`, null);
  if (!workbook || typeof workbook !== "object") return null;
  return {
    ...workbook,
    sourceId: workbook.sourceId || sourceId,
  };
}

async function cleanupSharedWorkbookStore() {
  const indexedIds = readLocalJsonValue(SHARED_STORE_KEYS.workbookIndex, []);
  const indexIds = Array.isArray(indexedIds) ? indexedIds.map((id) => String(id || "").trim()).filter(Boolean) : [];
  const storedIds = listStoredSharedWorkbookIds();
  const sourceIds = Array.from(new Set(indexIds.concat(storedIds)));
  const workbooks = [];
  const missingIds = [];
  let bridgeWorkbooks = [];

  sourceIds.forEach((sourceId) => {
    const workbook = readStoredSharedWorkbook(sourceId);
    if (workbook) workbooks.push(workbook);
    else if (indexIds.includes(sourceId)) missingIds.push(sourceId);
  });

  try {
    bridgeWorkbooks = await loadIndexedDbBridgeWorkbooks();
    bridgeWorkbooks.forEach((workbook) => {
      if (workbook?.sourceId) workbooks.push(workbook);
    });
  } catch {
    bridgeWorkbooks = [];
  }

  const byLogicalSource = new Map();
  workbooks.forEach((workbook) => {
    const logicalKey = getWorkbookLogicalSourceKey(workbook);
    if (!logicalKey) return;

    const existing = byLogicalSource.get(logicalKey);
    if (!existing) {
      byLogicalSource.set(logicalKey, {
        keep: workbook,
        ids: new Set([String(workbook.sourceId || "").trim()].filter(Boolean)),
      });
      return;
    }

    if (workbook.sourceId) existing.ids.add(String(workbook.sourceId).trim());
    if (isPreferredProjectWorkbook(workbook, existing.keep)) {
      existing.keep = workbook;
    }
  });

  const keepWorkbooks = Array.from(byLogicalSource.values())
    .map((entry) => entry.keep)
    .filter(Boolean);
  const keepIds = keepWorkbooks
    .map((workbook) => String(workbook.sourceId || "").trim())
    .filter(Boolean);
  const keepIdSet = new Set(keepIds);
  const duplicateIds = Array.from(new Set(workbooks
    .map((workbook) => String(workbook.sourceId || "").trim())
    .filter((sourceId) => sourceId && !keepIdSet.has(sourceId))));
  const removeIds = Array.from(new Set(missingIds.concat(duplicateIds)));

  removeIds.forEach((sourceId) => {
    localStorage.removeItem(`${WORKSPACE_FULL_PREFIX}${sourceId}`);
    localStorage.removeItem(`${WORKSPACE_LITE_PREFIX}${sourceId}`);
  });

  localStorage.setItem(SHARED_STORE_KEYS.workbookIndex, JSON.stringify(keepIds));
  localStorage.setItem(WORKSPACE_LITE_INDEX_KEY, JSON.stringify(keepIds));

  await Promise.all(removeIds.map(async (sourceId) => {
    try {
      await removeSource(sourceId);
    } catch {
      // IndexedDB cleanup is best-effort; local shared store cleanup is the source of truth here.
    }
  }));

  return {
    beforeIndexCount: indexIds.length,
    beforeStoredCount: storedIds.length,
    beforeBridgeCount: bridgeWorkbooks.length,
    keptCount: keepIds.length,
    removedMissingCount: missingIds.length,
    removedDuplicateCount: duplicateIds.length,
  };
}

async function loadIndexedDbBridgeWorkbooks() {
  try {
    const bridgeStudy = await ensureDashboardBridgeStudy();
    return listNormalizedWorkbooks(bridgeStudy.studyId);
  } catch {
    return [];
  }
}

const toolbarModules = [
  {
    key: "data_sources",
    label: "Data sources",
    icon: "database",
    items: [
      {
        key: "wbs",
        label: "WBS",
        description: "Define the work breakdown structure source, mapping granularity, and expected ownership levels.",
        inputs: ["WBS source workbook", "WBS level mapping", "Project ownership rules"],
      },
      {
        key: "currency_exchange_rates",
        label: "Currency & Exchange Rates",
        description: "Set the reference currency strategy, manual overrides, and the governance rules for exchange-rate refresh.",
        inputs: ["Target currency policy", "Manual rate overrides", "Rate source priority"],
      },
      {
        key: "firming_rules",
        label: "Firming Rules",
        description: "Capture the assumptions that convert draft estimates into firmed values for the MI package.",
        inputs: ["Firming horizon", "Confidence factors", "Rule exceptions by subsystem"],
      },
    ],
  },
  {
    key: "study_setup",
    label: "Study Setup",
    icon: "schema",
    items: [
      {
        key: "project_phases",
        label: "Project Phases",
        description: "Describe the study sequencing and the phase structure that will frame calculations and outputs.",
        inputs: ["Phase list", "Phase order", "Phase-specific scope notes"],
      },
      {
        key: "guide_planning_definition",
        label: "Guide Planning Definition",
        description: "Document the planning guide assumptions that will support the cost summary logic.",
        inputs: ["Planning basis", "Calendar assumptions", "Reference workload horizon"],
      },
      {
        key: "pio_definition_freight_customs",
        label: "PIO Definition, Freight & Customs",
        description: "Prepare the business rules for PIO and the logistics cost perimeter used later in export sheets.",
        inputs: ["PIO scope", "Freight assumptions", "Customs logic"],
      },
    ],
  },
  {
    key: "support_costs",
    label: "Support Costs",
    icon: "inventory_2",
    items: [
      {
        key: "tools_consumables",
        label: "Tools & Consumables",
        description: "Prepare the support-cost structure for tools, expendables, and usage rules.",
        inputs: ["Tool categories", "Consumption basis", "Renewal rules"],
      },
      {
        key: "ppe",
        label: "PPE",
        description: "Capture the PPE assumptions, renewal cycles, and scope allocation rules.",
        inputs: ["PPE categories", "Replacement cycles", "Allocation by workforce"],
      },
      {
        key: "vehicles",
        label: "Vehicles",
        description: "Define vehicle fleets, usage assumptions, and cost allocation rules.",
        inputs: ["Fleet mix", "Mileage assumptions", "Ownership model"],
      },
      {
        key: "mandatory_training",
        label: "Mandatory Training",
        description: "Set the mandatory training plan that contributes to support costs.",
        inputs: ["Training catalogue", "Renewal frequency", "Population rules"],
      },
      {
        key: "other_support_costs",
        label: "Other Support Costs",
        description: "Create room for residual support costs that do not fit the standard buckets.",
        inputs: ["Custom support buckets", "Allocation basis", "Validation notes"],
      },
    ],
  },
  {
    key: "organization_risks",
    label: "Organization & Headcount",
    icon: "groups",
    items: [
      {
        key: "cost_centers",
        label: "Cost Centers",
        description: "Define the organizational cost-center structure used to allocate indirect costs.",
        inputs: ["Cost center list", "Allocation links", "Overhead ownership"],
      },
      {
        key: "white_collar_definition",
        label: "White Collar Definition",
        description: "Prepare the white-collar population rules that will feed organization-related cost calculations.",
        inputs: ["Population categories", "Coverage rules", "Exclusion logic"],
      },
      {
        key: "workload_synthesis",
        label: "Workload Synthesis",
        description: "Frame how workload consolidation will be reused by the future MI engine.",
        inputs: ["Workload sources", "Aggregation rules", "Control checks"],
      },
    ],
  },
  {
    key: "pricing_risks",
    label: "Pricing & Risks",
    icon: "price_change",
    items: [
      {
        key: "price_lists",
        label: "Price Lists",
        description: "Define which price lists will be reused, normalized, and version-controlled inside the module.",
        inputs: ["Price list sources", "Validity dates", "Fallback hierarchy"],
      },
      {
        key: "risk_register",
        label: "Risk Register",
        description: "Define the risk structure, scoring, and cost impact logic for scenario management.",
        inputs: ["Risk categories", "Probability-impact logic", "Mitigation ownership"],
      },
    ],
  },
  {
    key: "export_data",
    label: "Export data",
    icon: "upload_file",
    items: [
      {
        key: "subsystem_summary",
        label: "Subsystem Summary",
        description: "Configure the subsystem-level output package that will feed the final workbook deliverables.",
        inputs: ["Summary layout", "Per-subsystem metrics", "Output formatting"],
      },
      {
        key: "mercury_interface",
        label: "Mercury Interface",
        description: "Prepare the future export mapping dedicated to the Mercury interface.",
        inputs: ["Interface schema", "Field mapping", "Validation checks"],
      },
    ],
  },
];

const configurationProgressGroups = [
  {
    key: "study_setup",
    label: "Study Setup",
    icon: "schema",
    items: [
      { key: "project_phases", label: "Project Phases" },
      { key: "cost_centers", label: "Cost Centers" },
      { key: "pio_definition_freight_customs", label: "PIO Definition" },
      { key: "guide_planning_definition", label: "Guide Planning" },
    ],
  },
  {
    key: "data_sources",
    label: "Data Sources",
    icon: "database",
    items: [
      { key: "currency_exchange_rates", label: "Currency & Exchange Rates" },
      { key: "firming_rules", label: "Firming Rules" },
    ],
  },
  {
    key: "organization_risks",
    label: "Organization",
    icon: "groups",
    items: [
      { key: "workload_synthesis", label: "Workload Synthesis" },
      { key: "white_collar_definition", label: "White Collar Definition" },
    ],
  },
  {
    key: "support_costs",
    label: "Support Costs",
    icon: "inventory_2",
    items: [
      { key: "tools_consumables", label: "Tools & Consumables" },
      { key: "vehicles", label: "Vehicles" },
      { key: "mandatory_training", label: "Mandatory Training" },
      { key: "other_support_costs", label: "Other Support Costs" },
    ],
  },
  {
    key: "pricing_risks",
    label: "Pricing & Risks",
    icon: "price_change",
    items: [
      { key: "price_lists", label: "Price Lists" },
      { key: "risk_register", label: "Risk Register" },
      { key: "wbs", label: "WBS" },
    ],
  },
  {
    key: "export_data",
    label: "Export Data",
    icon: "upload_file",
    items: [
      { key: "subsystem_summary", label: "Subsystem Summary" },
      { key: "mercury_interface", label: "Mercury Interface" },
    ],
  },
];

const moduleBuildSteps = [
  "Confirm the exact business scope and required outputs.",
  "List the workbook sheets and column mappings this module will use.",
  "Define manual parameters and validation rules.",
  "Wire the calculation engine only after the business contract is stable.",
];

function $(id) {
  return document.getElementById(id);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getRowCount(value) {
  return Array.isArray(value) ? value.length : 0;
}

function getProjectLabel(item) {
  const params = item?.generalParams || item?.sheets?.generalParameters || {};
  return (
    params.project_name ||
    params.project ||
    params.project_context ||
    item?.label ||
    item?.projectKey ||
    item?.fileName ||
    "Unnamed project"
  );
}

function formatTimestamp(value) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function setRuntimeAlert(message) {
  const alertBox = $("costSummaryRuntimeAlert");
  const alertText = $("costSummaryRuntimeAlertText");
  if (!alertBox || !alertText) return;
  alertText.textContent = message;
  alertBox.classList.remove("hidden");
}

function clearRuntimeAlert() {
  $("costSummaryRuntimeAlert")?.classList.add("hidden");
}

function composeDraftFromStudy(study, legacyDraft = {}, persistedConfig = {}) {
  return {
    ...DEFAULT_COST_SUMMARY_DRAFT,
    ...legacyDraft,
    studyName: study?.name || legacyDraft?.studyName || DEFAULT_COST_SUMMARY_DRAFT.studyName,
    targetCurrency: study?.targetCurrency || legacyDraft?.targetCurrency || DEFAULT_COST_SUMMARY_DRAFT.targetCurrency,
    scenario: study?.scenario || legacyDraft?.scenario || DEFAULT_COST_SUMMARY_DRAFT.scenario,
    sourceStrategy: study?.sourceStrategy || legacyDraft?.sourceStrategy || DEFAULT_COST_SUMMARY_DRAFT.sourceStrategy,
    exportMode: study?.exportMode || legacyDraft?.exportMode || DEFAULT_COST_SUMMARY_DRAFT.exportMode,
    includeAuditTrail: study?.includeAuditTrail ?? legacyDraft?.includeAuditTrail ?? DEFAULT_COST_SUMMARY_DRAFT.includeAuditTrail,
    lockFormulaSheet: study?.lockFormulaSheet ?? legacyDraft?.lockFormulaSheet ?? DEFAULT_COST_SUMMARY_DRAFT.lockFormulaSheet,
    ...(persistedConfig?.workspaceDraft || {}),
  };
}

// ── Toolbar completion status ──────────────────────────────────────────────

function readFallbackStudySlice(storageKey) {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return {};
    const all = JSON.parse(raw);
    const studyId = state.currentStudy?.studyId
      || localStorage.getItem("cost-summary-mi-last-open-study-id")
      || "default_study";
    return all[studyId] || {};
  } catch { return {}; }
}

function hasObjectValues(value) {
  return Boolean(value && typeof value === "object" && Object.keys(value).length > 0);
}

function hasAnyProjectConfig(projects = {}, predicate = hasObjectValues) {
  return Object.values(projects || {}).some((project) => predicate(project));
}

function getPrimaryProjectConfigs(container) {
  if (!container || typeof container !== "object") return {};
  return container.projects && typeof container.projects === "object" ? container.projects : {};
}

function hasPrimaryProjectConfig(container, predicate = hasObjectValues) {
  return hasAnyProjectConfig(getPrimaryProjectConfigs(container), predicate);
}

function computeModuleStatus(moduleKey) {
  switch (moduleKey) {
    case "cost_centers": {
      const projects = Object.values(getCostCentersStore());
      const hasPositions = projects.some(p => Array.isArray(p?.selectedPositions) && p.selectedPositions.length > 0);
      const hasRates = projects.some(p => p?.rowOverrides && Object.keys(p.rowOverrides).length > 0);
      if (hasPositions && hasRates) return "filled";
      if (hasPositions) return "partial";
      return "empty";
    }
    case "pio_definition_freight_customs": {
      const primaryProjects = getPioDefinitionStore();
      const hasPrimaryConfig = hasAnyProjectConfig(primaryProjects, (project) =>
        Array.isArray(project?.selectedOrigins) && project.selectedOrigins.length > 0 ||
        Array.isArray(project?.customOrigins) && project.customOrigins.length > 0 ||
        hasObjectValues(project?.rowOverrides) ||
        hasObjectValues(project?.customDutiesBySubsystem) ||
        toNumber(project?.onshoreFreightPercent) !== null ||
        toNumber(project?.offshoreFreightPercent) !== null
      );
      if (hasPrimaryConfig) return "filled";
      const s = readFallbackStudySlice("cost-summary-mi-pio-definition-fallback-v1");
      return Object.values(s).some(p => Array.isArray(p?.rows) && p.rows.length > 0) ? "filled" : "empty";
    }
    case "project_phases": {
      const primaryProjects = Object.values(getProjectPhaseStore());
      const primaryHasActive = primaryProjects.some(p =>
        p?.phases && Object.values(p.phases).some(ph => ph?.enabled && (toNumber(ph.durationYears) || 0) > 0)
      );
      if (primaryHasActive) return "filled";
      const primaryHasAny = primaryProjects.some(p => p?.phases && Object.keys(p.phases).length > 0);
      if (primaryHasAny) return "partial";
      const s = readFallbackStudySlice("cost-summary-mi-project-phases-fallback-v1");
      const projects = Object.values(s);
      const hasActive = projects.some(p =>
        p?.phases && Object.values(p.phases).some(ph => ph?.enabled && (toNumber(ph.durationYears) || 0) > 0)
      );
      if (hasActive) return "filled";
      const hasAny = projects.some(p => p?.phases && Object.keys(p.phases).length > 0);
      return hasAny ? "partial" : "empty";
    }
    case "guide_planning_definition": {
      const primaryProjects = Object.values(getGuidePlanningStore());
      const primaryHasMob  = primaryProjects.some(p => hasObjectValues(p?.mobilizationWorkloadMonthsByPosition));
      const primaryHasDemob = primaryProjects.some(p =>
        hasObjectValues(p?.demobilizationWorkloadMonthsByPosition) ||
        hasObjectValues(p?.demobilizationMaterialMonthsByType) ||
        hasObjectValues(p?.demobilizationSubcontractingMonthsByType)
      );
      const primaryHasCustom = primaryProjects.some(p =>
        (Array.isArray(p?.customWorkloadRows) && p.customWorkloadRows.length > 0) ||
        (Array.isArray(p?.customMaterialRows) && p.customMaterialRows.length > 0) ||
        (Array.isArray(p?.customSubcontractingRows) && p.customSubcontractingRows.length > 0) ||
        (Array.isArray(p?.riskRows) && p.riskRows.length > 0) ||
        hasObjectValues(p?.rowOverrides)
      );
      const primaryHasSelections = primaryProjects.some(p =>
        (Array.isArray(p?.selectedMaterialTypes) && p.selectedMaterialTypes.length > 0) ||
        (Array.isArray(p?.selectedSubcontractingTypes) && p.selectedSubcontractingTypes.length > 0) ||
        (Array.isArray(p?.selectedRecurrentMaterialTypes) && p.selectedRecurrentMaterialTypes.length > 0) ||
        (Array.isArray(p?.selectedRecurrentSubcontractingTypes) && p.selectedRecurrentSubcontractingTypes.length > 0)
      );
      if (primaryHasMob || primaryHasDemob || primaryHasCustom || primaryHasSelections) return "filled";
      const s = readFallbackStudySlice("cost-summary-mi-guide-planning-fallback-v1");
      const projects = Object.values(s);
      const hasMob  = projects.some(p => p?.mobilizationWorkloadMonthsByPosition && Object.keys(p.mobilizationWorkloadMonthsByPosition).length > 0);
      const hasDemob = projects.some(p => p?.demobilizationWorkloadMonthsByPosition && Object.keys(p.demobilizationWorkloadMonthsByPosition).length > 0);
      const hasCustom = projects.some(p =>
        (Array.isArray(p?.customRecurrentWorkloadRows) && p.customRecurrentWorkloadRows.length > 0) ||
        (Array.isArray(p?.customDemobilizationWorkloadRows) && p.customDemobilizationWorkloadRows.length > 0)
      );
      return (hasMob || hasDemob || hasCustom) ? "filled" : "empty";
    }
    case "currency_exchange_rates": {
      const projects = Object.values(getCurrencyExchangeStore());
      const hasOverrides = projects.some(p => p?.manualOverrides && Object.keys(p.manualOverrides).length > 0);
      const hasCustom    = projects.some(p => Array.isArray(p?.customCurrencies) && p.customCurrencies.length > 0);
      if (hasOverrides || hasCustom) return "filled";
      const s = readFallbackStudySlice("cost-summary-mi-currency-exchange-fallback-v1");
      const fallbackProjects = Object.values(s);
      const fallbackHasOverrides = fallbackProjects.some(p => p?.manualOverrides && Object.keys(p.manualOverrides).length > 0);
      const fallbackHasCustom    = fallbackProjects.some(p => Array.isArray(p?.customCurrencies) && p.customCurrencies.length > 0);
      return (fallbackHasOverrides || fallbackHasCustom) ? "filled" : "empty";
    }
    case "firming_rules": {
      const hasPrimaryRules = hasPrimaryProjectConfig(state.studyConfig?.dataSources?.firmingRules, (project) => {
        if (!project) return false;
        return (project.firmingTexts && Object.values(project.firmingTexts).some(t => String(t || "").trim())) ||
               hasObjectValues(project.importedOptions);
      });
      if (hasPrimaryRules) return "filled";
      const s = readFallbackStudySlice("cost-summary-mi-firming-rules-fallback-v1");
      const hasRules = Object.values(s).some(p => {
        if (!p) return false;
        return (p.firmingTexts && Object.values(p.firmingTexts).some(t => String(t || "").trim())) ||
               (p.importedOptions && Object.keys(p.importedOptions).length > 0);
      });
      return hasRules ? "filled" : "empty";
    }
    case "workload_synthesis": {
      if (hasPrimaryProjectConfig(state.studyConfig?.organizationRisks?.workloadSynthesis)) return "filled";
      const s = readFallbackStudySlice("cost-summary-mi-workload-overrides-fallback-v1");
      return Object.values(s).some(p => p && Object.keys(p).length > 0) ? "filled" : "empty";
    }
    case "white_collar_definition": {
      if (hasPrimaryProjectConfig(state.studyConfig?.organizationRisks?.whiteCollarDefinition)) return "filled";
      const s = readFallbackStudySlice("cost-summary-mi-white-collar-fallback-v1");
      return Object.values(s).some(p => p && Object.keys(p).length > 0) ? "filled" : "empty";
    }
    case "wbs": {
      const s = readFallbackStudySlice("cost-summary-mi-wbs-fallback-v1");
      return Object.values(s).some(p => p && (
        (Array.isArray(p.importedRows) && p.importedRows.length > 0) ||
        (Array.isArray(p.materialImportedRows) && p.materialImportedRows.length > 0)
      )) ? "filled" : "empty";
    }
    case "tools_consumables": {
      if (hasPrimaryProjectConfig(state.studyConfig?.supportCosts?.toolsConsumables)) return "filled";
      const s = readFallbackStudySlice("cost-summary-mi-tools-consumables-fallback-v1");
      return Object.values(s).some(p => p && Object.keys(p).length > 0) ? "filled" : "empty";
    }
    case "ppe": {
      if (hasPrimaryProjectConfig(state.studyConfig?.supportCosts?.ppe)) return "filled";
      const s = readFallbackStudySlice("cost-summary-mi-tools-consumables-fallback-v1");
      const hasPpeValues = Object.values(s).some(p =>
        p && Object.keys(p).some(key => String(key).endsWith("|ppe"))
      );
      return hasPpeValues ? "filled" : "empty";
    }
    case "vehicles": {
      if (hasPrimaryProjectConfig(state.studyConfig?.supportCosts?.vehicles)) return "filled";
      const s = readFallbackStudySlice("cost-summary-mi-vehicles-fallback-v1");
      return Object.values(s).some(p => p && Object.keys(p).length > 0) ? "filled" : "empty";
    }
    case "other_support_costs": {
      if (hasPrimaryProjectConfig(state.studyConfig?.supportCosts?.otherSupportCosts)) return "filled";
      const s = readFallbackStudySlice("cost-summary-mi-osc-fallback-v1");
      return Object.values(s).some(p => p && Object.keys(p).length > 0) ? "filled" : "empty";
    }
    case "mandatory_training": {
      if (hasPrimaryProjectConfig(state.studyConfig?.supportCosts?.mandatoryTraining)) return "filled";
      const s = readFallbackStudySlice("cost-summary-mi-mandatory-training-fallback-v1");
      return Object.values(s).some(p => p && Object.keys(p).length > 0) ? "filled" : "empty";
    }
    case "subsystem_summary": {
      const required = ["project_phases", "cost_centers", "workload_synthesis", "wbs"];
      const statuses = required.map((key) => computeModuleStatus(key));
      if (statuses.every((status) => status === "filled")) return "filled";
      if (statuses.some((status) => status === "filled" || status === "partial")) return "partial";
      return "empty";
    }
    case "price_lists":
    case "risk_register":
    case "mercury_interface":
      return "empty";
    default:
      return "na";
  }
}

function computeGroupStatus(groupKey) {
  const toolbarButtons = Array.from(document.querySelectorAll("[data-toolbar-item]"))
    .filter((button) => button.getAttribute("data-toolbar-group") === groupKey);
  const statuses = toolbarButtons.length
    ? toolbarButtons.map((button) => computeModuleStatus(button.getAttribute("data-toolbar-item")))
    : (toolbarModules.find(g => g.key === groupKey)?.items || []).map(item => computeModuleStatus(item.key));
  const implemented = statuses.filter(s => s !== "na");
  if (!implemented.length) return "na";
  if (implemented.every(s => s === "filled")) return "filled";
  if (implemented.some(s => s === "filled" || s === "partial")) return "partial";
  return "empty";
}

function statusDot(status) {
  if (status === "na") return "";
  const colors  = { empty: "#cbd5e1", partial: "#fcd34d", filled: "#6ee7b7" };
  const titles  = { empty: "Not configured", partial: "Partially configured", filled: "Fields present — review recommended" };
  return `<span title="${titles[status] || ""}" style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${colors[status] || colors.empty};flex-shrink:0;margin-left:2px;"></span>`;
}

function getProgressGroupSummary(group) {
  const items = (group.items || []).map((item) => ({
    ...item,
    status: computeModuleStatus(item.key),
  }));
  const total = items.length;
  const complete = items.filter((item) => item.status === "filled").length;
  const active = items.filter((item) => item.status === "filled" || item.status === "partial").length;
  const stateName = complete === total && total > 0 ? "complete" : (active > 0 ? "progress" : "empty");
  return {
    items,
    total,
    complete,
    active,
    stateName,
    targetItem: items.find((item) => item.status !== "filled") || items[0] || null,
  };
}

function renderConfigurationProgress() {
  const cards = $("configurationProgressCards");
  const summaryEl = $("configurationProgressSummary");
  if (!cards || !summaryEl) return;

  const summaries = configurationProgressGroups.map((group) => ({
    group,
    summary: getProgressGroupSummary(group),
  }));
  const completeGroups = summaries.filter((entry) => entry.summary.stateName === "complete").length;
  summaryEl.className = "inline-flex items-center gap-1 self-start lg:self-auto rounded-full px-3 py-1.5 text-xs font-bold " +
    (completeGroups === summaries.length ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700");
  summaryEl.innerHTML = '<span class="material-symbols-outlined text-[15px]">auto_awesome</span>' +
    completeGroups + " / " + summaries.length + " complete";

  cards.innerHTML = summaries.map(({ group, summary }) => {
    const isComplete = summary.stateName === "complete";
    const isProgress = summary.stateName === "progress";
    const palette = isComplete
      ? { card: "border-emerald-200 bg-emerald-50/70 hover:bg-emerald-50", icon: "text-emerald-600", badge: "bg-emerald-100 text-emerald-700", bar: "bg-emerald-500", track: "bg-emerald-100", status: "Complete", statusClass: "text-emerald-700" }
      : (isProgress
        ? { card: "border-amber-200 bg-amber-50/70 hover:bg-amber-50", icon: "text-amber-600", badge: "bg-amber-100 text-amber-700", bar: "bg-amber-500", track: "bg-amber-100", status: "In progress", statusClass: "text-amber-700" }
        : { card: "border-slate-200 bg-white hover:bg-slate-50", icon: "text-slate-400", badge: "bg-slate-100 text-slate-500", bar: "bg-slate-300", track: "bg-slate-100", status: "Not started", statusClass: "text-slate-400" });
    const width = summary.total ? Math.round((summary.complete / summary.total) * 100) : 0;
    const displayWidth = isProgress ? Math.max(width, 28) : width;
    const target = summary.targetItem || {};
    const waitingItems = summary.items
      .filter((item) => item.status !== "filled")
      .map((item) => item.label)
      .slice(0, 2)
      .join(", ");
    const helper = isComplete ? "All workspaces configured" : (waitingItems ? "Next: " + waitingItems : "No configured item");
    return `
      <button
        type="button"
        data-config-progress-card="${escapeHtml(group.key)}"
        data-config-progress-target="${escapeHtml(target.key || "")}"
        class="min-h-[128px] rounded-2xl border px-4 py-4 text-left transition-all ${palette.card}"
      >
        <div class="flex items-start justify-between gap-3">
          <span class="material-symbols-outlined text-[22px] ${palette.icon}">${escapeHtml(group.icon)}</span>
          <span class="rounded-full px-2 py-1 text-[11px] font-black ${palette.badge}">${summary.complete}/${summary.total}</span>
        </div>
        <div class="mt-4 text-sm font-black text-slate-800">${escapeHtml(group.label)}</div>
        <div class="mt-4 h-1.5 rounded-full ${palette.track}">
          <div class="h-full rounded-full ${palette.bar}" style="width:${displayWidth}%"></div>
        </div>
        <div class="mt-3 text-xs font-semibold ${palette.statusClass}">${escapeHtml(palette.status)}</div>
        <div class="mt-1 truncate text-[11px] text-slate-500">${escapeHtml(helper)}</div>
      </button>
    `;
  }).join("");
}

function updateToolbarStatusDots() {
  document.querySelectorAll("[data-status-dot-group]").forEach(el => {
    el.innerHTML = statusDot(computeGroupStatus(el.getAttribute("data-status-dot-group")));
  });
  document.querySelectorAll("[data-status-dot-item]").forEach(el => {
    el.innerHTML = statusDot(computeModuleStatus(el.getAttribute("data-status-dot-item")));
  });
  renderConfigurationProgress();
}
window.updateToolbarStatusDots = updateToolbarStatusDots;

// ──────────────────────────────────────────────────────────────────────────────

function findToolbarGroup(menuKey) {
  return toolbarModules.find((group) => group.key === menuKey) || null;
}

const toolbarItemGroupAliases = {
  cost_centers: "organization_risks",
  wbs: "data_sources",
};

function findToolbarItem(menuKey, itemKey) {
  const normalizedMenuKey = toolbarItemGroupAliases[itemKey] || menuKey;
  const group = findToolbarGroup(normalizedMenuKey);
  if (!group) return null;
  const item = group.items.find((entry) => entry.key === itemKey) || null;
  return item ? { group, item } : null;
}

const fallbackWorkspaceItems = new Set([
  "firming_rules",
  "workload_synthesis",
  "white_collar_definition",
  "wbs",
  "tools_consumables",
  "vehicles",
  "mandatory_training",
  "other_support_costs",
  "subsystem_summary",
]);

function closeToolbarMenus() {
  state.activeToolbarMenuKey = "";
  document.querySelectorAll("[data-toolbar-menu]").forEach((menu) => {
    menu.classList.add("hidden");
  });
  document.querySelectorAll("[data-toolbar-trigger]").forEach((button) => {
    button.setAttribute("aria-expanded", "false");
  });
}

function openToolbarMenu(menuKey) {
  const nextKey = state.activeToolbarMenuKey === menuKey ? "" : menuKey;
  closeToolbarMenus();
  if (!nextKey) return;
  state.activeToolbarMenuKey = nextKey;
  const menu = document.querySelector(`[data-toolbar-menu="${nextKey}"]`);
  const trigger = document.querySelector(`[data-toolbar-trigger="${nextKey}"]`);
  menu?.classList.remove("hidden");
  trigger?.setAttribute("aria-expanded", "true");
}

function closeModuleDrawer() {
  state.activeDrawerModuleKey = "";
  $("moduleDrawer")?.classList.add("translate-x-full");
  $("moduleDrawerBackdrop")?.classList.add("hidden");
  document.body.classList.remove("overflow-hidden");
}

function openProjectPhasesWorkspace() {
  $("projectPhasesWorkspace")?.classList.remove("hidden");
}

function closeProjectPhasesWorkspace() {
  state.currentProjectPhasesProjectKey = "";
  window.__costSummaryUseFallbackProjectPhases = false;
  $("projectPhasesWorkspace")?.classList.add("hidden");
}

function closeCostCentersWorkspace() {
  state.currentCostCentersProjectKey = "";
  window.__costSummaryUseFallbackCostCenters = false;
  $("costCentersWorkspace")?.classList.add("hidden");
}

function openCostCentersWorkspace() {
  $("costCentersWorkspace")?.classList.remove("hidden");
}

function closeCurrencyExchangeWorkspace() {
  state.currentCurrencyExchangeProjectKey = "";
  $("currencyExchangeWorkspace")?.classList.add("hidden");
}

function openCurrencyExchangeWorkspace() {
  $("currencyExchangeWorkspace")?.classList.remove("hidden");
}

function closeGuidePlanningWorkspace() {
  state.currentGuidePlanningProjectKey = "";
  window.__costSummaryUseFallbackGuidePlanning = false;
  $("guidePlanningWorkspace")?.classList.add("hidden");
}

function openGuidePlanningWorkspace() {
  $("guidePlanningWorkspace")?.classList.remove("hidden");
}

window.__costSummaryOpenGuidePlanningWorkspace = function __costSummaryOpenGuidePlanningWorkspace() {
  closeModuleDrawer();
  state.activeDrawerModuleKey = "study_setup:guide_planning_definition";
  window.__costSummaryUseFallbackGuidePlanning = false;
  window.__costSummaryFallback?.closeDetailWorkspacesFromMain?.();
  closeProjectPhasesWorkspace();
  closeCostCentersWorkspace();
  closeCurrencyExchangeWorkspace();
  closePioDefinitionWorkspace();
  openGuidePlanningWorkspace();
  renderGuidePlanningWorkspace();
};

function closePioDefinitionWorkspace() {
  state.currentPioDefinitionProjectKey = "";
  window.__costSummaryUseFallbackPioDefinition = false;
  $("pioDefinitionWorkspace")?.classList.add("hidden");
}

function openPioDefinitionWorkspace() {
  $("pioDefinitionWorkspace")?.classList.remove("hidden");
}

function renderModuleDrawer(menuKey, itemKey) {
  const match = findToolbarItem(menuKey, itemKey);
  if (!match) return;

  const { group, item } = match;
  const drawerModuleKey = `${group.key}:${itemKey}`;
  state.activeDrawerModuleKey = drawerModuleKey;
  window.__costSummaryFallback?.closeDetailWorkspacesFromMain?.();

  if (itemKey === "project_phases") {
    closeModuleDrawer();
    state.activeDrawerModuleKey = drawerModuleKey;
    closeCurrencyExchangeWorkspace();
    closeCostCentersWorkspace();
    closePioDefinitionWorkspace();
    closeGuidePlanningWorkspace();
    window.__costSummaryUseFallbackProjectPhases = false;
    openProjectPhasesWorkspace();
    renderProjectPhasesWorkspace(group, item);
    return;
  }

  if (itemKey === "cost_centers") {
    closeModuleDrawer();
    state.activeDrawerModuleKey = drawerModuleKey;
    closeProjectPhasesWorkspace();
    closeCurrencyExchangeWorkspace();
    closePioDefinitionWorkspace();
    closeGuidePlanningWorkspace();
    window.__costSummaryUseFallbackCostCenters = false;
    openCostCentersWorkspace();
    renderCostCentersWorkspace();
    return;
  }

  if (itemKey === "currency_exchange_rates") {
    closeModuleDrawer();
    state.activeDrawerModuleKey = drawerModuleKey;
    window.__costSummaryUseFallbackProjectPhases = false;
    window.__costSummaryUseFallbackCostCenters = false;
    window.__costSummaryUseFallbackPioDefinition = false;
    closeProjectPhasesWorkspace();
    closeCostCentersWorkspace();
    closePioDefinitionWorkspace();
    closeGuidePlanningWorkspace();
    openCurrencyExchangeWorkspace();
    renderCurrencyExchangeWorkspace();
    return;
  }

  if (itemKey === "guide_planning_definition") {
    closeModuleDrawer();
    state.activeDrawerModuleKey = drawerModuleKey;
    window.__costSummaryUseFallbackGuidePlanning = false;
    closeProjectPhasesWorkspace();
    closeCostCentersWorkspace();
    closeCurrencyExchangeWorkspace();
    closePioDefinitionWorkspace();
    openGuidePlanningWorkspace();
    renderGuidePlanningWorkspace();
    return;
  }

  if (itemKey === "pio_definition_freight_customs") {
    closeModuleDrawer();
    state.activeDrawerModuleKey = drawerModuleKey;
    closeProjectPhasesWorkspace();
    closeCostCentersWorkspace();
    closeCurrencyExchangeWorkspace();
    closeGuidePlanningWorkspace();
    window.__costSummaryUseFallbackPioDefinition = false;
    openPioDefinitionWorkspace();
    renderPioDefinitionWorkspace();
    return;
  }

  if (
    fallbackWorkspaceItems.has(itemKey) &&
    typeof window.__costSummaryFallback?.openWorkspaceFromMain === "function"
  ) {
    closeModuleDrawer();
    state.activeDrawerModuleKey = drawerModuleKey;
    window.__costSummaryUseFallbackProjectPhases = false;
    window.__costSummaryUseFallbackCostCenters = false;
    window.__costSummaryUseFallbackPioDefinition = false;
    closeProjectPhasesWorkspace();
    closeCostCentersWorkspace();
    closeCurrencyExchangeWorkspace();
    closeGuidePlanningWorkspace();
    closePioDefinitionWorkspace();
    window.__costSummaryFallback.openWorkspaceFromMain(itemKey);
    return;
  }

  window.__costSummaryUseFallbackProjectPhases = false;
  window.__costSummaryUseFallbackCostCenters = false;
  window.__costSummaryUseFallbackPioDefinition = false;
  closeProjectPhasesWorkspace();
  closeCostCentersWorkspace();
  closeCurrencyExchangeWorkspace();
  closeGuidePlanningWorkspace();
  closePioDefinitionWorkspace();

  const badge = $("moduleDrawerSectionBadge");
  const title = $("moduleDrawerTitle");
  const subtitle = $("moduleDrawerSubtitle");
  const description = $("moduleDrawerDescription");
  const groupLabel = $("moduleDrawerGroup");
  const inputs = $("moduleDrawerInputs");
  const steps = $("moduleDrawerSteps");

  if (badge) {
    badge.innerHTML = `
      <span class="material-symbols-outlined text-[16px]">${escapeHtml(group.icon)}</span>
      ${escapeHtml(group.label)}
    `;
  }
  if (title) title.textContent = item.label;
  if (subtitle) subtitle.textContent = "Configuration placeholder. Detailed business fields will be defined later.";
  if (description) description.textContent = item.description;
  if (groupLabel) groupLabel.textContent = group.label;
  if (inputs) {
    inputs.innerHTML = item.inputs.map((entry) => `
      <div class="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
        <div class="flex items-start gap-3">
          <span class="material-symbols-outlined text-primary text-[18px]">subdirectory_arrow_right</span>
          <div>
            <p class="text-sm font-semibold">${escapeHtml(entry)}</p>
            <p class="mt-1 text-xs text-slate-500">Placeholder field block. Business content to be defined in the next step.</p>
          </div>
        </div>
      </div>
    `).join("");
  }
  if (steps) {
    steps.innerHTML = moduleBuildSteps.map((entry, index) => `
      <div class="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
        <span class="inline-flex items-center justify-center size-6 rounded-full bg-white border border-slate-200 text-[11px] font-bold text-slate-500">${index + 1}</span>
        <p class="text-sm text-slate-600">${escapeHtml(entry)}</p>
      </div>
    `).join("");
  }

  $("moduleDrawerBackdrop")?.classList.remove("hidden");
  $("moduleDrawer")?.classList.remove("translate-x-full");
  document.body.classList.add("overflow-hidden");
}

async function openConfigurationItem(menuKey, itemKey) {
  closeToolbarMenus();
  if (itemKey === "project_phases") {
    await refreshProjectPhaseProjectsSource();
  }
  if (itemKey === "cost_centers") {
    await refreshCostCentersSource();
  }
  if (itemKey === "currency_exchange_rates") {
    await refreshCurrencyExchangeSource();
  }
  if (itemKey === "guide_planning_definition") {
    await refreshGuidePlanningSource();
  }
  if (itemKey === "pio_definition_freight_customs") {
    await refreshPioDefinitionSource();
  }
  renderModuleDrawer(menuKey, itemKey);
}

function renderConfigurationToolbar() {
  const container = $("costSummaryToolbar");
  if (!container) return;
  if (container.children.length) return;

  container.innerHTML = toolbarModules.map((group) => `
    <div class="relative" data-toolbar-root="${escapeHtml(group.key)}">
      <button
        type="button"
        data-toolbar-trigger="${escapeHtml(group.key)}"
        class="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-all"
        aria-expanded="false"
      >
        <span class="material-symbols-outlined text-[18px] text-slate-500">${escapeHtml(group.icon)}</span>
        ${escapeHtml(group.label)}
        <span data-status-dot-group="${escapeHtml(group.key)}"></span>
        <span class="material-symbols-outlined text-[18px] text-slate-400">expand_more</span>
      </button>
      <div
        data-toolbar-menu="${escapeHtml(group.key)}"
        class="hidden absolute left-0 top-[calc(100%+8px)] z-30 min-w-[280px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
      >
        <div class="border-b border-slate-100 px-4 py-3">
          <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">${escapeHtml(group.label)}</p>
        </div>
        <div class="p-2">
          ${group.items.map((item) => `
            <button
              type="button"
              data-toolbar-item="${escapeHtml(item.key)}"
              data-toolbar-group="${escapeHtml(group.key)}"
              class="flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left hover:bg-slate-50 transition-all"
            >
              <span class="material-symbols-outlined mt-0.5 text-[18px] text-primary">chevron_right</span>
              <span class="flex-1 min-w-0">
                <span class="flex items-center gap-2">
                  <span class="text-sm font-semibold text-slate-700">${escapeHtml(item.label)}</span>
                  <span data-status-dot-item="${escapeHtml(item.key)}"></span>
                </span>
                <span class="mt-1 block text-xs leading-5 text-slate-500">${escapeHtml(item.description)}</span>
              </span>
            </button>
          `).join("")}
        </div>
      </div>
    </div>
  `).join("");
}

function renderStudyWorkspace() {
  const selector = $("studySelector");
  const studyId = $("currentStudyId");
  const studyStatus = $("currentStudyStatus");
  const createdAt = $("currentStudyCreatedAt");
  const updatedAt = $("currentStudyUpdatedAt");

  if (selector) {
    selector.innerHTML = state.studies.length
      ? state.studies.map((study) => `
          <option value="${escapeHtml(study.studyId)}" ${study.studyId === state.currentStudy?.studyId ? "selected" : ""}>
            ${escapeHtml(study.name || study.studyId)}
          </option>
        `).join("")
      : '<option value="">No study available</option>';
  }

  if (studyId) studyId.textContent = state.currentStudy?.studyId || "--";
  if (studyStatus) studyStatus.textContent = state.currentStudy?.status || "--";
  if (createdAt) createdAt.textContent = formatTimestamp(state.currentStudy?.createdAt);
  if (updatedAt) updatedAt.textContent = formatTimestamp(state.currentStudy?.updatedAt);
}

function toNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const normalized = String(value).replace(",", ".").trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeProjectContext(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

function formatDateInputValue(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function formatDateDisplay(value) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleDateString("en-GB");
}

function addMonths(dateValue, months) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "";
  const next = new Date(date);
  next.setMonth(next.getMonth() + Number(months || 0));
  return formatDateInputValue(next);
}

function addYears(dateValue, years) {
  return addMonths(dateValue, Number(years || 0) * 12);
}

function addDays(dateValue, days) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "";
  const next = new Date(date);
  next.setDate(next.getDate() + Number(days || 0));
  return formatDateInputValue(next);
}

function addYearsInclusive(dateValue, years) {
  const safeYears = Number(years || 0);
  if (safeYears <= 0) return formatDateInputValue(dateValue);
  return addDays(addYears(dateValue, safeYears), -1);
}

function formatPhaseYearCode(index) {
  const safeIndex = Math.max(1, Math.round(Number(index) || 1));
  return `Y${String(safeIndex).padStart(2, "0")}`;
}

function inferPhaseYearIndex(serviceYear, dateValue) {
  const baseYear = toNumber(serviceYear);
  const date = new Date(dateValue);
  if (baseYear === null || Number.isNaN(date.getTime())) return null;
  return Math.max(1, date.getFullYear() - baseYear + 1);
}

function buildDefaultPhaseCode(serviceYear, startDate, endDate, durationYears) {
  const startIndex = inferPhaseYearIndex(serviceYear, startDate);
  if (startIndex === null) return "";
  const duration = toNumber(durationYears);
  const endIndexFromDuration = duration !== null
    ? Math.max(startIndex, startIndex + Math.max(0, Math.round(duration)) - 1)
    : null;
  const endIndexFromDate = inferPhaseYearIndex(serviceYear, endDate);
  const endIndex = endIndexFromDuration ?? endIndexFromDate ?? startIndex;
  return `${formatPhaseYearCode(startIndex)}_${formatPhaseYearCode(endIndex)}`;
}

function inferContractDurationYears(params = {}) {
  const contractDuration = toNumber(params.contract_duration_years);
  const correcStart = toNumber(params.correc_ovh_start_year);
  const correcEnd = toNumber(params.correc_ovh_end_year);
  const planningYear = toNumber(params.planning_year);
  const serviceYear = toNumber(params.service_year);

  if (correcStart !== null && correcEnd !== null) return Math.max(0, correcEnd - correcStart);
  if (correcStart !== null && contractDuration !== null) return Math.max(0, contractDuration - correcStart);
  if (correcEnd !== null && planningYear !== null && serviceYear !== null) {
    return Math.max(0, correcEnd - (serviceYear - planningYear));
  }
  return Math.max(0, contractDuration || 0);
}

function getProjectPhaseStore() {
  return state.studyConfig?.studySetup?.projectPhases?.projects || {};
}

function getProjectPhaseSequence() {
  return ["Base", "Option_1", "Option_2", "Option_3", "Option_4", "Option_5"];
}

function isCustomProjectPhaseKey(phaseKey) {
  return phaseKey !== "Total" && !getProjectPhaseSequence().includes(phaseKey);
}

function getNextCustomProjectPhaseKey(phases = {}) {
  let index = 1;
  while (phases[`Custom_${index}`]) {
    index += 1;
  }
  return `Custom_${index}`;
}

function getCostCentersStore() {
  const primaryProjects = state.studyConfig?.organizationRisks?.costCenters?.projects || {};
  let fallbackProjects = {};
  try {
    const raw = localStorage.getItem("cost-summary-mi-cost-centers-fallback-v1");
    const parsed = raw ? JSON.parse(raw) : {};
    const studyId = state.currentStudy?.studyId || localStorage.getItem("cost-summary-mi-last-open-study-id") || "default_study";
    fallbackProjects = parsed?.[studyId] || {};
  } catch {
    fallbackProjects = {};
  }

  const mergedProjects = { ...fallbackProjects, ...primaryProjects };
  Object.keys(fallbackProjects).forEach((projectKey) => {
    const fallback = fallbackProjects[projectKey] || {};
    const primary = primaryProjects[projectKey] || {};
    mergedProjects[projectKey] = {
      ...fallback,
      ...primary,
      customCurrencies: Array.from(new Set([...(Array.isArray(fallback.customCurrencies) ? fallback.customCurrencies : []), ...(Array.isArray(primary.customCurrencies) ? primary.customCurrencies : [])])),
      customPositions: Array.from(new Set([...(Array.isArray(fallback.customPositions) ? fallback.customPositions : []), ...(Array.isArray(primary.customPositions) ? primary.customPositions : [])])),
      selectedPositions: Array.from(new Set([...(Array.isArray(fallback.selectedPositions) ? fallback.selectedPositions : []), ...(Array.isArray(primary.selectedPositions) ? primary.selectedPositions : [])])),
      generalTimePeriods: Array.from(new Set([...(Array.isArray(fallback.generalTimePeriods) ? fallback.generalTimePeriods : []), ...(Array.isArray(primary.generalTimePeriods) ? primary.generalTimePeriods : [])])),
      engineerTimePeriods: Array.from(new Set([...(Array.isArray(fallback.engineerTimePeriods) ? fallback.engineerTimePeriods : []), ...(Array.isArray(primary.engineerTimePeriods) ? primary.engineerTimePeriods : [])])),
      rowOverrides: {
        ...(fallback.rowOverrides || {}),
        ...(primary.rowOverrides || {}),
      },
    };
  });
  return mergedProjects;
}

function publishCostCentersBridge() {
  window.__costSummaryCostCentersStore = getCostCentersStore();
}

function publishGuidePlanningBridge() {
  window.__costSummaryGuidePlanningStore = getGuidePlanningStore();
}

function publishPioDefinitionBridge() {
  window.__costSummaryPioDefinitionStore = getPioDefinitionStore();
}

function publishProjectPhasesBridge() {
  window.__costSummaryProjectPhaseProjects = buildProjectPhaseProjects().map((project) => ({
    ...project,
    persistedKeys: Array.from(new Set([
      project.projectKey,
      project.projectName,
    ].filter(Boolean))),
  }));
}

const CONFIG_EXPORT_FALLBACK_STORES = {
  projectPhases: "cost-summary-mi-project-phases-fallback-v1",
  costCenters: "cost-summary-mi-cost-centers-fallback-v1",
  pioDefinition: "cost-summary-mi-pio-definition-fallback-v1",
  currencyExchange: "cost-summary-mi-currency-exchange-fallback-v1",
  firmingRules: "cost-summary-mi-firming-rules-fallback-v1",
  guidePlanning: "cost-summary-mi-guide-planning-fallback-v1",
  workloadSynthesis: "cost-summary-mi-workload-overrides-fallback-v1",
  whiteCollar: "cost-summary-mi-white-collar-fallback-v1",
  wbs: "cost-summary-mi-wbs-fallback-v1",
  toolsConsumables: "cost-summary-mi-tools-consumables-fallback-v1",
  vehicles: "cost-summary-mi-vehicles-fallback-v1",
  otherSupportCosts: "cost-summary-mi-osc-fallback-v1",
  mandatoryTraining: "cost-summary-mi-mandatory-training-fallback-v1",
};

function cloneConfigValue(value) {
  return JSON.parse(JSON.stringify(value ?? {}));
}

function getCurrentConfigStudyId() {
  return state.currentStudy?.studyId || localStorage.getItem("cost-summary-mi-last-open-study-id") || "default_study";
}

function readConfigFallbackModule(moduleName) {
  const storageKey = CONFIG_EXPORT_FALLBACK_STORES[moduleName];
  if (!storageKey) return {};
  try {
    const raw = localStorage.getItem(storageKey);
    const parsed = raw ? JSON.parse(raw) : {};
    const studyId = getCurrentConfigStudyId();
    return cloneConfigValue(parsed && typeof parsed === "object" ? parsed[studyId] || {} : {});
  } catch {
    return {};
  }
}

function mergeProjectConfigStores(fallbackStore = {}, primaryStore = {}) {
  const fallback = fallbackStore && typeof fallbackStore === "object" ? fallbackStore : {};
  const primary = primaryStore && typeof primaryStore === "object" ? primaryStore : {};
  const merged = { ...cloneConfigValue(fallback), ...cloneConfigValue(primary) };
  Array.from(new Set(Object.keys(fallback).concat(Object.keys(primary)))).forEach((projectKey) => {
    const fallbackProject = fallback[projectKey] && typeof fallback[projectKey] === "object" ? fallback[projectKey] : {};
    const primaryProject = primary[projectKey] && typeof primary[projectKey] === "object" ? primary[projectKey] : {};
    merged[projectKey] = {
      ...cloneConfigValue(fallbackProject),
      ...cloneConfigValue(primaryProject),
    };
  });
  return merged;
}

function buildConfigExportModules() {
  const primaryModules = {
    projectPhases: state.studyConfig?.studySetup?.projectPhases?.projects || {},
    costCenters: state.studyConfig?.organizationRisks?.costCenters?.projects || {},
    pioDefinition: state.studyConfig?.studySetup?.pioDefinitionFreightCustoms?.projects || {},
    currencyExchange: state.studyConfig?.dataSources?.currencyExchangeRates?.projects || {},
    firmingRules: state.studyConfig?.dataSources?.firmingRules?.projects || {},
    guidePlanning: state.studyConfig?.studySetup?.guidePlanningDefinition?.projects || {},
    workloadSynthesis: state.studyConfig?.organizationRisks?.workloadSynthesis?.projects || {},
    whiteCollar: state.studyConfig?.organizationRisks?.whiteCollarDefinition?.projects || {},
    wbs: state.studyConfig?.organizationRisks?.wbs?.projects || state.studyConfig?.dataSources?.wbs?.projects || {},
    toolsConsumables: state.studyConfig?.supportCosts?.toolsConsumables?.projects || {},
    vehicles: state.studyConfig?.supportCosts?.vehicles?.projects || {},
    otherSupportCosts: state.studyConfig?.supportCosts?.otherSupportCosts?.projects || {},
    mandatoryTraining: state.studyConfig?.supportCosts?.mandatoryTraining?.projects || {},
  };

  return Object.keys(CONFIG_EXPORT_FALLBACK_STORES).reduce((modules, moduleName) => {
    modules[moduleName] = mergeProjectConfigStores(
      readConfigFallbackModule(moduleName),
      primaryModules[moduleName] || {}
    );
    return modules;
  }, {});
}

function buildCostSummaryConfigExportPayload() {
  const modules = buildConfigExportModules();
  const groups = {
    studySetup: {
      projectPhases: cloneConfigValue(modules.projectPhases),
      costCenters: cloneConfigValue(modules.costCenters),
      pioDefinition: cloneConfigValue(modules.pioDefinition),
      guidePlanning: cloneConfigValue(modules.guidePlanning),
    },
    dataSources: {
      currencyExchange: cloneConfigValue(modules.currencyExchange),
      firmingRules: cloneConfigValue(modules.firmingRules),
    },
    organizationRisks: {
      workloadSynthesis: cloneConfigValue(modules.workloadSynthesis),
      whiteCollar: cloneConfigValue(modules.whiteCollar),
      wbs: cloneConfigValue(modules.wbs),
    },
    supportCosts: {
      toolsConsumables: cloneConfigValue(modules.toolsConsumables),
      vehicles: cloneConfigValue(modules.vehicles),
      otherSupportCosts: cloneConfigValue(modules.otherSupportCosts),
      mandatoryTraining: cloneConfigValue(modules.mandatoryTraining),
    },
  };

  return {
    app: "cost-summary-mi",
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    sourceStudyId: getCurrentConfigStudyId(),
    studyName: state.currentStudy?.name || "Cost Summary & MI",
    note: "Configuration only. Excel workbook data is not included.",
    modules,
    groups,
    studyConfig: cloneConfigValue(state.studyConfig || {}),
    sharedSettings: cloneConfigValue(state.settings || {}),
  };
}

function getImportedModule(payload, moduleName) {
  const modules = payload?.modules && typeof payload.modules === "object" ? payload.modules : {};
  if (modules[moduleName] && typeof modules[moduleName] === "object") return cloneConfigValue(modules[moduleName]);
  const studySetup = payload?.groups?.studySetup || {};
  const dataSources = payload?.groups?.dataSources || {};
  const organizationRisks = payload?.groups?.organizationRisks || {};
  const supportCosts = payload?.groups?.supportCosts || {};
  const groupedModules = {
    projectPhases: studySetup.projectPhases,
    costCenters: studySetup.costCenters,
    pioDefinition: studySetup.pioDefinition,
    guidePlanning: studySetup.guidePlanning,
    currencyExchange: dataSources.currencyExchange,
    firmingRules: dataSources.firmingRules,
    workloadSynthesis: organizationRisks.workloadSynthesis,
    whiteCollar: organizationRisks.whiteCollar,
    wbs: organizationRisks.wbs,
    toolsConsumables: supportCosts.toolsConsumables,
    vehicles: supportCosts.vehicles,
    otherSupportCosts: supportCosts.otherSupportCosts,
    mandatoryTraining: supportCosts.mandatoryTraining,
  };
  return cloneConfigValue(groupedModules[moduleName] || {});
}

async function importCostSummaryConfigPayloadToStudy(payload) {
  if (!payload || payload.app !== "cost-summary-mi" || Number(payload.schemaVersion) !== 1) {
    throw new Error("Invalid Cost Summary & MI configuration file.");
  }
  if (!state.currentStudy?.studyId) return false;

  const existing = state.studyConfig || {};
  const nextStudySetup = {
    ...(existing.studySetup || {}),
    projectPhases: {
      ...((existing.studySetup || {}).projectPhases || {}),
      projects: getImportedModule(payload, "projectPhases"),
      updatedAt: new Date().toISOString(),
    },
    pioDefinitionFreightCustoms: {
      ...((existing.studySetup || {}).pioDefinitionFreightCustoms || {}),
      projects: getImportedModule(payload, "pioDefinition"),
      updatedAt: new Date().toISOString(),
    },
    guidePlanningDefinition: {
      ...((existing.studySetup || {}).guidePlanningDefinition || {}),
      projects: getImportedModule(payload, "guidePlanning"),
      updatedAt: new Date().toISOString(),
    },
  };
  const nextDataSources = {
    ...(existing.dataSources || {}),
    currencyExchangeRates: {
      ...((existing.dataSources || {}).currencyExchangeRates || {}),
      projects: getImportedModule(payload, "currencyExchange"),
      updatedAt: new Date().toISOString(),
    },
    firmingRules: {
      ...((existing.dataSources || {}).firmingRules || {}),
      projects: getImportedModule(payload, "firmingRules"),
      updatedAt: new Date().toISOString(),
    },
  };
  const nextOrganizationRisks = {
    ...(existing.organizationRisks || {}),
    costCenters: {
      ...((existing.organizationRisks || {}).costCenters || {}),
      projects: getImportedModule(payload, "costCenters"),
      updatedAt: new Date().toISOString(),
    },
    workloadSynthesis: {
      ...((existing.organizationRisks || {}).workloadSynthesis || {}),
      projects: getImportedModule(payload, "workloadSynthesis"),
      updatedAt: new Date().toISOString(),
    },
    whiteCollarDefinition: {
      ...((existing.organizationRisks || {}).whiteCollarDefinition || {}),
      projects: getImportedModule(payload, "whiteCollar"),
      updatedAt: new Date().toISOString(),
    },
    wbs: {
      ...((existing.organizationRisks || {}).wbs || {}),
      projects: getImportedModule(payload, "wbs"),
      updatedAt: new Date().toISOString(),
    },
  };
  const nextSupportCosts = {
    ...(existing.supportCosts || {}),
    toolsConsumables: {
      ...((existing.supportCosts || {}).toolsConsumables || {}),
      projects: getImportedModule(payload, "toolsConsumables"),
      updatedAt: new Date().toISOString(),
    },
    vehicles: {
      ...((existing.supportCosts || {}).vehicles || {}),
      projects: getImportedModule(payload, "vehicles"),
      updatedAt: new Date().toISOString(),
    },
    otherSupportCosts: {
      ...((existing.supportCosts || {}).otherSupportCosts || {}),
      projects: getImportedModule(payload, "otherSupportCosts"),
      updatedAt: new Date().toISOString(),
    },
    mandatoryTraining: {
      ...((existing.supportCosts || {}).mandatoryTraining || {}),
      projects: getImportedModule(payload, "mandatoryTraining"),
      updatedAt: new Date().toISOString(),
    },
  };

  state.studyConfig = await savePersistedStudyConfig(state.currentStudy.studyId, {
    dataSources: nextDataSources,
    studySetup: nextStudySetup,
    organizationRisks: nextOrganizationRisks,
    supportCosts: nextSupportCosts,
  });
  publishProjectPhasesBridge();
  publishCostCentersBridge();
  publishGuidePlanningBridge();
  publishPioDefinitionBridge();
  updateToolbarStatusDots();
  return true;
}

window.__costSummaryBuildConfigExport = buildCostSummaryConfigExportPayload;
window.__costSummaryImportConfigPayload = importCostSummaryConfigPayloadToStudy;

function isCostCenterShiftPosition(position) {
  return /team leader|supervisor|technician|worker/i.test(position || "");
}

function isCostCenterEngineerPosition(position) {
  return /engineer/i.test(position || "");
}

function isCostCenterFixedDayPosition(position) {
  return /manager|external support/i.test(position || "");
}

function isCostCenterEuroDefaultPosition(position) {
  return /expat|external support/i.test(position || "");
}

function buildDefaultCostCenterValue(position, timePeriod) {
  const safePosition = String(position || "").trim();
  const safeTimePeriod = String(timePeriod || "Day").trim();
  if (/external support/i.test(safePosition)) {
    return "CFR5232489_POH - SERVICES OPERA";
  }
  if (/manager/i.test(safePosition)) {
    return safePosition;
  }
  if (isCostCenterShiftPosition(safePosition) || isCostCenterEngineerPosition(safePosition)) {
    return safeTimePeriod.toLowerCase() === "average"
      ? safePosition
      : `${safePosition}_${safeTimePeriod}`;
  }
  return safePosition;
}

function buildCostCenterRowKey(position, timePeriod) {
  return `${String(position || "")}__${String(timePeriod || "Day")}`;
}

function resolveCostCenterHourlyRate(row, rowOverrides, rowsByKey, nightPremiumEnabled, nightPremiumPercent) {
  const rowOverride = rowOverrides[row.rowKey] || {};
  if (rowOverride.hourlyRate !== undefined && rowOverride.hourlyRate !== null && rowOverride.hourlyRate !== "") {
    return rowOverride.hourlyRate;
  }
  if (String(row.timePeriod || "").toLowerCase() === "night" && nightPremiumEnabled) {
    const dayRowKey = buildCostCenterRowKey(row.position, "Day");
    const dayRow = rowsByKey[dayRowKey];
    if (dayRow) {
      const dayOverride = rowOverrides[dayRowKey] || {};
      const baseDayRate = dayOverride.hourlyRate !== undefined && dayOverride.hourlyRate !== null && dayOverride.hourlyRate !== ""
        ? toNumber(dayOverride.hourlyRate)
        : toNumber(dayRow.baseHourlyRate);
      if (baseDayRate !== null) {
        return String(baseDayRate * (1 + ((toNumber(nightPremiumPercent) || 0) / 100)));
      }
    }
  }
  return row.baseHourlyRate || "";
}

function buildCostCenterProjects() {
  const byProject = new Map();
  const persistedProjects = getCostCentersStore();
  const pioProjectsByKey = new Map();
  buildPioDefinitionProjects().forEach((project) => {
    [project.projectKey, project.projectName, normalizeSourceDataKey(project.projectKey), normalizeSourceDataKey(project.projectName)]
      .filter(Boolean)
      .forEach((key) => {
        if (!pioProjectsByKey.has(key)) pioProjectsByKey.set(key, project);
      });
  });
  const mergedProjectParams = getMergedProjectGeneralParamsMap();
  const currencyCatalog = ["EUR", "USD", "AED", "SAR", "BRL", "CNY", "SGD", "INR", "GBP", "PLN"];
  const timePeriodCatalog = ["Day", "Night", "Shift", "Average", "Handback"];
  const positionCatalog = [
    "Project_Director_Local",
    "Project_Director_Expat",
    "Operation_Project_Manager_Local",
    "Operation_Project_Manager_Expat",
    "Industrial_Manager",
    "Safety_Manager",
    "Quality_Manager",
    "EHS_Manager",
    "Engineering_Manager",
    "Engineer",
    "Subsystem Engineer",
    "Planning Engineer",
    "Cybersecurity Engineer",
    "Engineering External Support",
    "Warehouse_Manager",
    "Storekeeper",
    "Buyer",
    "Wayside_Maintenance_Manager",
    "Supervisor",
    "Team Leader",
    "Technician",
    "Worker",
  ];

  const preferredWorkbooks = getPreferredProjectWorkbookMap();

  preferredWorkbooks.forEach((workbook, projectKey) => {
    const params = mergedProjectParams.get(projectKey)?.params || getWorkbookGeneralParams(workbook);

    const projectName = params.project_name || workbook.fileName || projectKey;
    const persisted = persistedProjects[projectKey] || {};
    const pioProject = pioProjectsByKey.get(projectKey)
      || pioProjectsByKey.get(projectName)
      || pioProjectsByKey.get(normalizeSourceDataKey(projectKey))
      || pioProjectsByKey.get(normalizeSourceDataKey(projectName))
      || {};
    const pioRows = Array.isArray(pioProject.rows) ? pioProject.rows : [];
    const projectPioRow = pioRows.find((row) => row.origin === projectName) || pioRows[0] || null;
    const projectCaratUnit = projectPioRow?.caratUnit || "";
    const pioCaratUnitOptions = Array.from(new Set(pioRows.map((row) => String(row.caratUnit || "").trim()).filter(Boolean)));
    const annualWorkingHours = toNumber(persisted.annualWorkingHours) !== null
      ? toNumber(persisted.annualWorkingHours)
      : (toNumber(params.max_hours_per_year_per_person) !== null ? toNumber(params.max_hours_per_year_per_person) : 0);
    const annualWorkingHoursSource = toNumber(persisted.annualWorkingHours) !== null
      ? "Manual override"
      : (toNumber(params.max_hours_per_year_per_person) !== null ? "General Parameters / max_hours_per_year_per_person" : "--");
    const customCurrencies = Array.isArray(persisted.customCurrencies)
      ? persisted.customCurrencies.filter(Boolean).map((entry) => String(entry).toUpperCase())
      : [];
    const customPositions = Array.isArray(persisted.customPositions)
      ? persisted.customPositions.filter(Boolean)
      : [];
    const currencyOptions = Array.from(new Set(currencyCatalog.concat(customCurrencies)));
    const positionOptions = Array.from(new Set(positionCatalog.concat(customPositions)));
    const selectedPositions = Array.isArray(persisted.selectedPositions) ? persisted.selectedPositions.slice() : [];
    const generalTimePeriods = Array.isArray(persisted.generalTimePeriods) && persisted.generalTimePeriods.length
      ? persisted.generalTimePeriods.slice()
      : ["Day"];
    const engineerTimePeriods = Array.isArray(persisted.engineerTimePeriods) && persisted.engineerTimePeriods.length
      ? persisted.engineerTimePeriods.slice()
      : ["Day"];
    const rowOverrides = persisted.rowOverrides || {};
    const projectCurrency = persisted.projectCurrency || "EUR";
    const nightPremiumEnabled = !!persisted.nightPremiumEnabled;
    const nightPremiumPercent = toNumber(persisted.nightPremiumPercent) ?? 0;

    const rows = [];
    selectedPositions.forEach((position) => {
      const periods = isCostCenterFixedDayPosition(position)
        ? ["Day"]
        : (isCostCenterShiftPosition(position)
          ? generalTimePeriods
          : (isCostCenterEngineerPosition(position) ? engineerTimePeriods : ["Day"]));
      periods.forEach((timePeriod) => {
        const rowKey = buildCostCenterRowKey(position, timePeriod);
        const rowOverride = rowOverrides[rowKey] || {};
        const isExternalSupport = /external support/i.test(position || "");
        const selectedCaratUnit = isExternalSupport
          ? (rowOverride.caratUnit || "")
          : projectCaratUnit;
        const matchedPioRow = pioRows.find((pioRow) => String(pioRow.caratUnit || "").trim() === String(selectedCaratUnit || "").trim()) || null;
        const externalYearlyHours = matchedPioRow ? toNumber(matchedPioRow.yearlyHours) : null;
        const monthlyWorkingHours = isExternalSupport
          ? (externalYearlyHours !== null ? (externalYearlyHours / 12) : "")
          : (annualWorkingHours ? (annualWorkingHours / 12) : 0);
        rows.push({
          rowKey,
          position,
          caratUnit: selectedCaratUnit,
          pioUnitRole: matchedPioRow?.unitRole || "",
          pioYearlyHours: matchedPioRow?.yearlyHours || "",
          pioCaratUnitOptions,
          timePeriod,
          monthlyWorkingHours,
          currency: rowOverride.currency || (isCostCenterEuroDefaultPosition(position) ? "EUR" : projectCurrency),
          baseHourlyRate: rowOverride.hourlyRate || "",
          costCenter: rowOverride.costCenter || buildDefaultCostCenterValue(position, timePeriod),
        });
      });
    });

    const rowsByKey = {};
    rows.forEach((row) => {
      rowsByKey[row.rowKey] = row;
    });
    rows.forEach((row) => {
      row.hourlyRate = resolveCostCenterHourlyRate(
        row,
        rowOverrides,
        rowsByKey,
        nightPremiumEnabled,
        nightPremiumPercent
      );
    });

    byProject.set(projectKey, {
      projectKey,
      projectName,
      projectType: params.project_type || "",
      projectContext: params.project_context || "",
      annualWorkingHoursSource,
      annualWorkingHours,
      projectCaratUnit,
      projectCurrency,
      currencyOptions,
      positionOptions,
      customPositions,
      selectedPositions,
      generalTimePeriods,
      engineerTimePeriods,
      nightPremiumEnabled,
      nightPremiumPercent,
      rows,
      timePeriodCatalog,
    });
  });

  return Array.from(byProject.values()).sort((left, right) => left.projectName.localeCompare(right.projectName));
}

function getPioDefinitionStore() {
  return state.studyConfig?.studySetup?.pioDefinitionFreightCustoms?.projects || {};
}

function extractSynthesisSubsystems(workbook) {
  const summarySubsystems = Array.isArray(workbook?.summary?.synthesisSubsystems)
    ? workbook.summary.synthesisSubsystems.filter(Boolean).map((value) => String(value).trim()).filter(Boolean)
    : [];
  if (summarySubsystems.length) {
    return Array.from(new Set(summarySubsystems)).sort((left, right) => String(left).localeCompare(String(right)));
  }

  const rows = (workbook && workbook.sheets && workbook.sheets.synthesis) || [];
  const subsystems = new Set();
  rows.forEach((row) => {
    let value = row && (
      row.subsystem ||
      row.Subsystem ||
      row.SUBSYSTEM ||
      row.sub_system ||
      row["Subsystem"] ||
      row["subsystem"]
    );
    if (!value && row && typeof row === "object") {
      Object.keys(row).some((key) => {
        const normalizedKey = String(key || "")
          .trim()
          .toLowerCase()
          .replace(/[\s/\\-]+/g, "_")
          .replace(/[()]+/g, "")
          .replace(/[^\w]+/g, "_")
          .replace(/^_+|_+$/g, "")
          .replace(/_+/g, "_");
        if (normalizedKey === "subsystem" || normalizedKey === "sub_system") {
          value = row[key];
          return true;
        }
        return false;
      });
    }
    const normalized = String(value || "").trim();
    if (normalized) subsystems.add(normalized);
  });
  return Array.from(subsystems).sort((left, right) => left.localeCompare(right));
}

function buildPioDefinitionProjects() {
  const persistedProjects = getPioDefinitionStore();
  const originCatalog = ["France_Saint ouen", "Belgium_Charleroi"];
  const byProject = new Map();

  state.workbooks.forEach((workbook) => {
    const params = getWorkbookGeneralParams(workbook);
    const projectKey = getWorkbookProjectKey(workbook);
    if (!projectKey) return;

    const existing = byProject.get(projectKey) || {
      projectKey,
      projectName: "",
      projectType: "",
      projectContext: "",
      annualWorkingHours: 0,
      subsystemSet: new Set(),
      preferredWorkbook: null,
    };

    if (isPreferredProjectWorkbook(workbook, existing.preferredWorkbook)) {
      existing.preferredWorkbook = workbook;
      existing.projectName = params.project_name || workbook?.fileName || projectKey;
      existing.projectType = params.project_type || "";
      existing.projectContext = params.project_context || "";
      existing.annualWorkingHours = toNumber(params.max_hours_per_year_per_person) !== null
        ? toNumber(params.max_hours_per_year_per_person)
        : 0;
    }

    extractSynthesisSubsystems(workbook).forEach((subsystem) => existing.subsystemSet.add(subsystem));
    byProject.set(projectKey, existing);
  });

  return Array.from(byProject.values()).map((project) => {
    const persisted = persistedProjects[project.projectKey] || {};
    const customOrigins = Array.isArray(persisted.customOrigins) ? persisted.customOrigins.filter(Boolean) : [];
    const originOptions = Array.from(new Set([project.projectName].concat(originCatalog).concat(customOrigins)));
    const selectedOrigins = Array.isArray(persisted.selectedOrigins) && persisted.selectedOrigins.length
      ? persisted.selectedOrigins.slice()
      : [project.projectName];
    const rowOverrides = persisted.rowOverrides || {};
    const customDutiesBySubsystem = { ...(persisted.customDutiesBySubsystem || {}) };
    const subsystems = Array.from(project.subsystemSet || []).sort((left, right) => String(left).localeCompare(String(right)));

    const rows = selectedOrigins.map((origin, index) => {
      const rowOverride = rowOverrides[origin] || {};
      const isProjectOrigin = origin === project.projectName;
      return {
        origin,
        caratUnit: rowOverride.caratUnit || (isProjectOrigin ? "LOCAL" : (origin === "France_Saint ouen" ? "RSC-5232" : "")),
        unitRole: rowOverride.unitRole || (isProjectOrigin ? "LU" : "PU"),
        source: rowOverride.source || (isProjectOrigin ? "Onshore" : "Offshore"),
        yearlyHours: rowOverride.yearlyHours !== undefined && rowOverride.yearlyHours !== null && rowOverride.yearlyHours !== ""
          ? rowOverride.yearlyHours
          : (isProjectOrigin ? project.annualWorkingHours : (index === 1 ? "1510.92" : "")),
      };
    });

    return {
      projectKey: project.projectKey,
      projectName: project.projectName,
      projectType: project.projectType,
      projectContext: project.projectContext,
      annualWorkingHours: project.annualWorkingHours,
      onshoreFreightPercent: toNumber(persisted.onshoreFreightPercent) !== null ? toNumber(persisted.onshoreFreightPercent) : 0,
      offshoreFreightPercent: toNumber(persisted.offshoreFreightPercent) !== null ? toNumber(persisted.offshoreFreightPercent) : 0,
      originOptions,
      selectedOrigins,
      subsystems,
      customDutiesBySubsystem,
      rows,
    };
  }).sort((left, right) => String(left.projectName).localeCompare(String(right.projectName)));
}

function getCurrencyExchangeStore() {
  return state.studyConfig?.dataSources?.currencyExchangeRates?.projects || {};
}

function getGuidePlanningStore() {
  return state.studyConfig?.studySetup?.guidePlanningDefinition?.projects || {};
}

function resolveGuidePlanningServiceDate(project = {}) {
  if (project.startOfProjectDate) return project.startOfProjectDate;
  const serviceYear = String(project.serviceYear || "").trim();
  return /^\d{4}$/.test(serviceYear) ? `${serviceYear}-01-01` : "";
}

function buildGuidePlanningCode(projectCode, mobilisationPhaseCode, months) {
  const safeProjectCode = String(projectCode || "").trim() || "PROJECT";
  const safeMobilisationCode = String(mobilisationPhaseCode || "").trim() || "MOB";
  const safeMonths = Math.max(0, toNumber(months) ?? 0);
  return `${safeProjectCode}_${safeMobilisationCode}_${safeMonths}M`;
}

function buildRecurrentGuidePlanningCode(projectCode, recurrentCode, phaseCode) {
  const safeProjectCode = String(projectCode || "").trim() || "PROJECT";
  const safeRecurrentCode = String(recurrentCode || "").trim() || "REC";
  const safePhaseCode = String(phaseCode || "").trim() || "PHASE";
  return `${safeProjectCode}_${safeRecurrentCode}_${safePhaseCode}`;
}

function buildRecurrentPostWarrantyGuidePlanningCode(projectCode, recurrentCode, phaseCode, postWarrantyCode) {
  const safeProjectCode = String(projectCode || "").trim() || "PROJECT";
  const safeRecurrentCode = String(recurrentCode || "").trim() || "REC";
  const safePhaseCode = String(phaseCode || "").trim() || "PHASE";
  const safePostWarrantyCode = String(postWarrantyCode || "").trim() || "PDLP";
  return `${safeProjectCode}_${safeRecurrentCode}_${safePhaseCode}_${safePostWarrantyCode}`;
}

function getGuidePlanningCustomCollectionKey(rowType) {
  switch (rowType) {
    case "risks":
      return "customRiskRows";
    case "overhaul_renewals":
      return "customOverhaulRenewalRows";
    case "materials":
      return "customMaterialRows";
    case "subcontracting":
      return "customSubcontractingRows";
    case "demobilization_materials":
      return "customDemobilizationMaterialRows";
    case "demobilization_subcontracting":
      return "customDemobilizationSubcontractingRows";
    case "demobilization_workload":
      return "customDemobilizationWorkloadRows";
    case "recurrent_materials":
      return "customRecurrentMaterialRows";
    case "recurrent_subcontracting":
      return "customRecurrentSubcontractingRows";
    case "recurrent_workload":
      return "customRecurrentWorkloadRows";
    default:
      return "customWorkloadRows";
  }
}

function createGuidePlanningCustomRow(rowType) {
  return {
    id: `custom_${rowType}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    riskDescription: "",
    phaseLabel: "",
    subsystem: "",
    position: "",
    materialType: "",
    subcontractingType: "",
    startDate: "",
    endDate: "",
    guidePlanningCode: "",
    overhaulGuidePlanningCode: "",
    renewalGuidePlanningCode: "",
  };
}

function createGuidePlanningRiskRow() {
  return {
    id: `risk_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    riskDescription: "",
    guidePlanningCode: "",
  };
}

function buildGuidePlanningProjects() {
  const projectPhaseMap = new Map(buildProjectPhaseProjects().map((project) => [project.projectKey, project]));
  const costCenterMap = new Map(buildCostCenterProjects().map((project) => [project.projectKey, project]));
  const pioDefinitionMap = new Map(buildPioDefinitionProjects().map((project) => [project.projectKey, project]));
  const persistedProjects = getGuidePlanningStore();
  const materialCatalog = ["Tools", "Consumables", "PPE", "Vehicles", "Spare Parts", "Preventive spares", "Corrective spares", "Repair"];
  const subcontractingCatalog = ["Training", "Technical_Support"];
  const demobilizationMaterialCatalog = ["Preventive spares", "Corrective spares", "Vehicles"];
  const demobilizationSubcontractingCatalog = ["Preventive_Subcontract", "Corrective_Subcontract", "Technical_Support", "Training", "Obsolescence"];
  const recurrentMaterialCatalog = ["Tools", "Consumables", "PPE", "Vehicles", "Preventive spares", "Corrective spares", "Repair"];
  const recurrentSubcontractingCatalog = ["Corrective_Subcontract", "Preventive_Subcontract", "Technical_Support", "Training", "Obsolescence"];
  const projectKeys = Array.from(new Set(
    Array.from(projectPhaseMap.keys())
      .concat(Array.from(costCenterMap.keys()))
      .concat(Array.from(pioDefinitionMap.keys()))
  ));

  return projectKeys.map((projectKey) => {
    const projectPhase = projectPhaseMap.get(projectKey);
    const costCenterProject = costCenterMap.get(projectKey);
    const pioDefinitionProject = pioDefinitionMap.get(projectKey);
    if (!projectPhase && !costCenterProject && !pioDefinitionProject) return null;

    const persisted = persistedProjects[projectKey] || {};
    const rowOverrides = { ...(persisted.rowOverrides || {}) };
    const positions = Array.from(new Set((costCenterProject?.selectedPositions || []).filter(Boolean)));
    const serviceYear = String(projectPhase?.serviceYear || "").trim();
    const serviceDate = resolveGuidePlanningServiceDate(projectPhase || {});
    const endOfProjectDate = Array.isArray(projectPhase?.phases)
      ? (projectPhase.phases.find((phase) => phase?.key === "Total")?.endDate || projectPhase.phases.reduce((latest, phase) => {
        const endDate = String(phase?.endDate || "").trim();
        return !latest || (endDate && endDate > latest) ? endDate : latest;
      }, ""))
      : "";
    const endOfProjectYear = String(endOfProjectDate || "").slice(0, 4);
    const eligiblePhases = Array.isArray(projectPhase?.phases)
      ? projectPhase.phases.filter((phase) => String(phase?.startDate || "").slice(0, 4) === serviceYear)
      : [];
    const demobilizationEligiblePhases = Array.isArray(projectPhase?.phases)
      ? projectPhase.phases.filter((phase) => String(phase?.endDate || "").slice(0, 4) === endOfProjectYear)
      : [];
    const workloadMonthsByPosition = { ...(persisted.mobilizationWorkloadMonthsByPosition || {}) };
    const resolvedWorkloadMonthsByPosition = positions.reduce((accumulator, position) => {
      const legacyMonths = Object.values(persisted.mobilizationWorkloadMonthsByPhase || {}).find((entry) => entry && Object.prototype.hasOwnProperty.call(entry, position));
      accumulator[position] = Math.max(0, toNumber(workloadMonthsByPosition[position]) ?? toNumber(legacyMonths?.[position]) ?? 0);
      return accumulator;
    }, {});
    const demobilizationWorkloadMonthsByPosition = { ...(persisted.demobilizationWorkloadMonthsByPosition || {}) };
    const resolvedDemobilizationWorkloadMonthsByPosition = positions.reduce((accumulator, position) => {
      accumulator[position] = Math.max(0, toNumber(demobilizationWorkloadMonthsByPosition[position]) ?? 0);
      return accumulator;
    }, {});
    const demobilizationMaterialMonthsByType = { ...(persisted.demobilizationMaterialMonthsByType || {}) };
    const resolvedDemobilizationMaterialMonthsByType = demobilizationMaterialCatalog.reduce((accumulator, materialType) => {
      accumulator[materialType] = Math.max(0, toNumber(demobilizationMaterialMonthsByType[materialType]) ?? 0);
      return accumulator;
    }, {});
    const demobilizationSubcontractingMonthsByType = { ...(persisted.demobilizationSubcontractingMonthsByType || {}) };
    const resolvedDemobilizationSubcontractingMonthsByType = demobilizationSubcontractingCatalog.reduce((accumulator, subcontractingType) => {
      accumulator[subcontractingType] = Math.max(0, toNumber(demobilizationSubcontractingMonthsByType[subcontractingType]) ?? 0);
      return accumulator;
    }, {});
    const selectedMaterialTypes = Array.isArray(persisted.selectedMaterialTypes)
      ? persisted.selectedMaterialTypes.filter(Boolean)
      : [];
    const selectedSubcontractingTypes = Array.isArray(persisted.selectedSubcontractingTypes)
      ? persisted.selectedSubcontractingTypes.filter(Boolean)
      : [];
    const selectedRecurrentMaterialTypes = Array.isArray(persisted.selectedRecurrentMaterialTypes)
      ? persisted.selectedRecurrentMaterialTypes.filter(Boolean)
      : [];
    const selectedRecurrentSubcontractingTypes = Array.isArray(persisted.selectedRecurrentSubcontractingTypes)
      ? persisted.selectedRecurrentSubcontractingTypes.filter(Boolean)
      : [];
    const customWorkloadRows = Array.isArray(persisted.customWorkloadRows) ? persisted.customWorkloadRows.map((row) => ({ ...row })) : [];
    const customMaterialRows = Array.isArray(persisted.customMaterialRows) ? persisted.customMaterialRows.map((row) => ({ ...row })) : [];
    const customSubcontractingRows = Array.isArray(persisted.customSubcontractingRows) ? persisted.customSubcontractingRows.map((row) => ({ ...row })) : [];
    const customDemobilizationWorkloadRows = Array.isArray(persisted.customDemobilizationWorkloadRows) ? persisted.customDemobilizationWorkloadRows.map((row) => ({ ...row })) : [];
    const customDemobilizationMaterialRows = Array.isArray(persisted.customDemobilizationMaterialRows) ? persisted.customDemobilizationMaterialRows.map((row) => ({ ...row })) : [];
    const customDemobilizationSubcontractingRows = Array.isArray(persisted.customDemobilizationSubcontractingRows) ? persisted.customDemobilizationSubcontractingRows.map((row) => ({ ...row })) : [];
    const customRecurrentWorkloadRows = Array.isArray(persisted.customRecurrentWorkloadRows) ? persisted.customRecurrentWorkloadRows.map((row) => ({ ...row })) : [];
    const customRecurrentMaterialRows = Array.isArray(persisted.customRecurrentMaterialRows) ? persisted.customRecurrentMaterialRows.map((row) => ({ ...row })) : [];
    const customRecurrentSubcontractingRows = Array.isArray(persisted.customRecurrentSubcontractingRows) ? persisted.customRecurrentSubcontractingRows.map((row) => ({ ...row })) : [];
    const customOverhaulRenewalRows = Array.isArray(persisted.customOverhaulRenewalRows) ? persisted.customOverhaulRenewalRows.map((row) => ({ ...row })) : [];
    const riskRows = Array.isArray(persisted.riskRows)
      ? persisted.riskRows.map((row) => ({ ...row }))
      : (Array.isArray(persisted.customRiskRows) ? persisted.customRiskRows.map((row) => ({ ...row })) : []);
    const generatedRows = [];
    const generatedMaterialRows = [];
    const generatedSubcontractingRows = [];
    const generatedDemobilizationRows = [];
    const generatedDemobilizationMaterialRows = [];
    const generatedDemobilizationSubcontractingRows = [];
    const overhaulRenewalRows = Array.isArray(projectPhase?.phases)
      ? projectPhase.phases
        .filter((phase) => String(phase?.startDate || "").trim() || String(phase?.endDate || "").trim())
        .flatMap((phase) => (Array.isArray(pioDefinitionProject?.subsystems) ? pioDefinitionProject.subsystems : []).map((subsystem) => {
          const rowKey = `overhaul_renewal__${phase.key}__${subsystem}`;
          const rowOverride = rowOverrides[rowKey] || {};
          return {
            rowKey,
            phaseLabel: phase.label || phase.key,
            subsystem,
            overhaulGuidePlanningCode: rowOverride.overhaulGuidePlanningCode || [
              String(projectPhase?.projectCode || "").trim() || "PROJECT",
              String(projectPhase?.overhaulCode || "").trim() || "OVH",
              String(subsystem || "").trim() || "SUBSYSTEM",
              String(phase.phaseCode || phase.key || "PHASE").trim() || "PHASE",
            ].join("_"),
            renewalGuidePlanningCode: rowOverride.renewalGuidePlanningCode || [
              String(projectPhase?.projectCode || "").trim() || "PROJECT",
              String(projectPhase?.renewalCode || "").trim() || "REN",
              String(subsystem || "").trim() || "SUBSYSTEM",
              String(phase.phaseCode || phase.key || "PHASE").trim() || "PHASE",
            ].join("_"),
          };
        }))
      : [];
    const recurrentWorkloadRows = positions.length && Array.isArray(projectPhase?.phases)
      ? projectPhase.phases
        .filter((phase) => String(phase?.startDate || "").trim() || String(phase?.endDate || "").trim())
        .map((phase) => ({
          rowKey: `recurrent__${phase.key}`,
          phaseLabel: phase.label || phase.key,
          startDate: phase.startDate || "",
          endDate: phase.endDate || "",
          phaseCode: phase.phaseCode || phase.key || "PHASE",
          guidePlanningCode: buildRecurrentGuidePlanningCode(
            projectPhase?.projectCode,
            projectPhase?.recurrentCode,
            phase.phaseCode || phase.key || "PHASE",
          ),
        }))
      : [];
    const recurrentMaterialRows = Array.isArray(projectPhase?.phases)
      ? projectPhase.phases.flatMap((phase) => selectedRecurrentMaterialTypes.flatMap((materialType) => {
        const hasPostWarrantyWindow = Boolean(phase?.postWarrantyStartDate && phase?.postWarrantyEndDate);
        const usePostWarrantyWindow = (materialType === "Corrective spares" || materialType === "Repair") && hasPostWarrantyWindow;
        return [{
          rowKey: `recurrent_material__${phase.key}__${materialType}`,
          phaseLabel: phase.label || phase.key,
          materialType,
          startDate: usePostWarrantyWindow ? phase.postWarrantyStartDate : (phase.startDate || ""),
          endDate: usePostWarrantyWindow ? phase.postWarrantyEndDate : (phase.endDate || ""),
          guidePlanningCode: usePostWarrantyWindow
            ? buildRecurrentPostWarrantyGuidePlanningCode(
              projectPhase?.projectCode,
              projectPhase?.recurrentCode,
              phase.phaseCode || phase.key || "PHASE",
              projectPhase?.postWarrantyCode,
            )
            : buildRecurrentGuidePlanningCode(
              projectPhase?.projectCode,
              projectPhase?.recurrentCode,
              phase.phaseCode || phase.key || "PHASE",
            ),
        }];
      }))
      : [];
    const recurrentSubcontractingRows = Array.isArray(projectPhase?.phases)
      ? projectPhase.phases.flatMap((phase) => selectedRecurrentSubcontractingTypes.map((subcontractingType) => ({
        rowKey: `recurrent_subcontracting__${phase.key}__${subcontractingType}`,
        phaseLabel: phase.label || phase.key,
        subcontractingType,
        startDate: phase.startDate || "",
        endDate: phase.endDate || "",
        guidePlanningCode: buildRecurrentGuidePlanningCode(
          projectPhase?.projectCode,
          projectPhase?.recurrentCode,
          phase.phaseCode || phase.key || "PHASE",
        ),
      })))
      : [];

    eligiblePhases.forEach((phase) => {
      positions.forEach((position) => {
        const months = resolvedWorkloadMonthsByPosition[position] || 0;
        if (!months) return;
        const rowKey = `${phase.key}__${position}`;
        const phaseStartDate = phase.startDate || serviceDate || "";
        const defaultStartDate = phaseStartDate ? addMonths(phaseStartDate, -months) : "";
        const defaultEndDate = phaseStartDate ? addDays(phaseStartDate, -1) : "";
        const defaultGuidePlanningCode = buildGuidePlanningCode(projectPhase?.projectCode, projectPhase?.mobilisationPhaseCode, months);
        const rowOverride = rowOverrides[rowKey] || {};
        generatedRows.push({
          rowKey,
          phaseLabel: phase.label || phase.key,
          position,
          startDate: rowOverride.startDate || defaultStartDate,
          endDate: rowOverride.endDate || defaultEndDate,
          guidePlanningCode: rowOverride.guidePlanningCode || defaultGuidePlanningCode,
        });
      });
      selectedMaterialTypes.forEach((materialType) => {
        const rowKey = `materials__${phase.key}__${materialType}`;
        const materialRowOverride = rowOverrides[rowKey] || {};
        const phaseStartDate = phase.startDate || serviceDate || "";
        generatedMaterialRows.push({
          rowKey,
          phaseLabel: phase.label || phase.key,
          materialType,
          startDate: materialRowOverride.startDate || (phaseStartDate ? addMonths(phaseStartDate, -12) : ""),
          endDate: materialRowOverride.endDate || (phaseStartDate ? addDays(phaseStartDate, -1) : ""),
          guidePlanningCode: materialRowOverride.guidePlanningCode || buildGuidePlanningCode(projectPhase?.projectCode, projectPhase?.mobilisationPhaseCode, 12),
        });
      });
      selectedSubcontractingTypes.forEach((subcontractingType) => {
        const rowKey = `subcontracting__${phase.key}__${subcontractingType}`;
        const subcontractingRowOverride = rowOverrides[rowKey] || {};
        const phaseStartDate = phase.startDate || serviceDate || "";
        generatedSubcontractingRows.push({
          rowKey,
          phaseLabel: phase.label || phase.key,
          subcontractingType,
          startDate: subcontractingRowOverride.startDate || (phaseStartDate ? addMonths(phaseStartDate, -12) : ""),
          endDate: subcontractingRowOverride.endDate || (phaseStartDate ? addDays(phaseStartDate, -1) : ""),
          guidePlanningCode: subcontractingRowOverride.guidePlanningCode || buildGuidePlanningCode(projectPhase?.projectCode, projectPhase?.mobilisationPhaseCode, 12),
        });
      });
    });

    demobilizationEligiblePhases.forEach((phase) => {
      positions.forEach((position) => {
        const months = resolvedDemobilizationWorkloadMonthsByPosition[position] || 0;
        if (!months) return;
        generatedDemobilizationRows.push({
          rowKey: `demobilization__${phase.key}__${position}`,
          phaseLabel: phase.label || phase.key,
          position,
          startDate: endOfProjectDate ? addMonths(endOfProjectDate, -months) : "",
          endDate: endOfProjectDate || "",
          guidePlanningCode: buildGuidePlanningCode(projectPhase?.projectCode, projectPhase?.demobilisationCode, months),
        });
      });
      demobilizationMaterialCatalog.forEach((materialType) => {
        const months = resolvedDemobilizationMaterialMonthsByType[materialType] || 0;
        if (!months) return;
        generatedDemobilizationMaterialRows.push({
          rowKey: `demobilization_material__${phase.key}__${materialType}`,
          phaseLabel: phase.label || phase.key,
          materialType,
          startDate: endOfProjectDate ? addMonths(endOfProjectDate, -months) : "",
          endDate: endOfProjectDate || "",
          guidePlanningCode: buildGuidePlanningCode(projectPhase?.projectCode, projectPhase?.demobilisationCode, months),
        });
      });
      demobilizationSubcontractingCatalog.forEach((subcontractingType) => {
        const months = resolvedDemobilizationSubcontractingMonthsByType[subcontractingType] || 0;
        if (!months) return;
        generatedDemobilizationSubcontractingRows.push({
          rowKey: `demobilization_subcontracting__${phase.key}__${subcontractingType}`,
          phaseLabel: phase.label || phase.key,
          subcontractingType,
          startDate: endOfProjectDate ? addMonths(endOfProjectDate, -months) : "",
          endDate: endOfProjectDate || "",
          guidePlanningCode: buildGuidePlanningCode(projectPhase?.projectCode, projectPhase?.demobilisationCode, months),
        });
      });
    });

    const riskGuidePlanningOptions = Array.from(new Set([
      ...generatedRows.map((row) => row.guidePlanningCode).filter(Boolean),
      ...generatedMaterialRows.map((row) => row.guidePlanningCode).filter(Boolean),
      ...generatedSubcontractingRows.map((row) => row.guidePlanningCode).filter(Boolean),
      ...recurrentWorkloadRows.map((row) => row.guidePlanningCode).filter(Boolean),
      ...recurrentMaterialRows.map((row) => row.guidePlanningCode).filter(Boolean),
      ...recurrentSubcontractingRows.map((row) => row.guidePlanningCode).filter(Boolean),
      ...generatedDemobilizationRows.map((row) => row.guidePlanningCode).filter(Boolean),
      ...generatedDemobilizationMaterialRows.map((row) => row.guidePlanningCode).filter(Boolean),
      ...generatedDemobilizationSubcontractingRows.map((row) => row.guidePlanningCode).filter(Boolean),
      ...overhaulRenewalRows.map((row) => row.overhaulGuidePlanningCode).filter(Boolean),
      ...overhaulRenewalRows.map((row) => row.renewalGuidePlanningCode).filter(Boolean),
      ...customWorkloadRows.map((row) => row.guidePlanningCode).filter(Boolean),
      ...customMaterialRows.map((row) => row.guidePlanningCode).filter(Boolean),
      ...customSubcontractingRows.map((row) => row.guidePlanningCode).filter(Boolean),
      ...customRecurrentWorkloadRows.map((row) => row.guidePlanningCode).filter(Boolean),
      ...customRecurrentMaterialRows.map((row) => row.guidePlanningCode).filter(Boolean),
      ...customRecurrentSubcontractingRows.map((row) => row.guidePlanningCode).filter(Boolean),
      ...customDemobilizationWorkloadRows.map((row) => row.guidePlanningCode).filter(Boolean),
      ...customDemobilizationMaterialRows.map((row) => row.guidePlanningCode).filter(Boolean),
      ...customDemobilizationSubcontractingRows.map((row) => row.guidePlanningCode).filter(Boolean),
      ...customOverhaulRenewalRows.map((row) => row.overhaulGuidePlanningCode).filter(Boolean),
      ...customOverhaulRenewalRows.map((row) => row.renewalGuidePlanningCode).filter(Boolean),
      ...riskRows.map((row) => row.guidePlanningCode).filter(Boolean),
    ]));

    return {
      projectKey,
      projectName: projectPhase?.projectName || costCenterProject?.projectName || projectKey,
      projectType: projectPhase?.projectType || costCenterProject?.projectType || "",
      projectContext: projectPhase?.projectContext || costCenterProject?.projectContext || "",
      projectCode: projectPhase?.projectCode || "",
      serviceYear,
      serviceDate,
      endOfProjectDate,
      mobilisationPhaseCode: projectPhase?.mobilisationPhaseCode || "MOB",
      recurrentCode: projectPhase?.recurrentCode || "REC",
      postWarrantyCode: projectPhase?.postWarrantyCode || "PDLP",
      demobilisationCode: projectPhase?.demobilisationCode || "DEM",
      overhaulCode: projectPhase?.overhaulCode || "OVH",
      renewalCode: projectPhase?.renewalCode || "REN",
      positions,
      subsystems: Array.isArray(pioDefinitionProject?.subsystems) ? pioDefinitionProject.subsystems : [],
      eligiblePhases,
      demobilizationEligiblePhases,
      materialCatalog,
      subcontractingCatalog,
      demobilizationMaterialCatalog,
      demobilizationSubcontractingCatalog,
      recurrentMaterialCatalog,
      recurrentSubcontractingCatalog,
      selectedMaterialTypes,
      selectedSubcontractingTypes,
      selectedRecurrentMaterialTypes,
      selectedRecurrentSubcontractingTypes,
      workloadMonthsByPosition: resolvedWorkloadMonthsByPosition,
      demobilizationWorkloadMonthsByPosition: resolvedDemobilizationWorkloadMonthsByPosition,
      demobilizationMaterialMonthsByType: resolvedDemobilizationMaterialMonthsByType,
      demobilizationSubcontractingMonthsByType: resolvedDemobilizationSubcontractingMonthsByType,
      generatedRows,
      recurrentWorkloadRows,
      recurrentMaterialRows,
      recurrentSubcontractingRows,
      generatedMaterialRows,
      generatedSubcontractingRows,
      generatedDemobilizationRows,
      generatedDemobilizationMaterialRows,
      generatedDemobilizationSubcontractingRows,
      overhaulRenewalRows,
      riskGuidePlanningOptions,
      customWorkloadRows,
      customMaterialRows,
      customSubcontractingRows,
      customDemobilizationWorkloadRows,
      customDemobilizationMaterialRows,
      customDemobilizationSubcontractingRows,
      customRecurrentWorkloadRows,
      customRecurrentMaterialRows,
      customRecurrentSubcontractingRows,
      customOverhaulRenewalRows,
      riskRows,
    };
  }).filter(Boolean).sort((left, right) => String(left.projectName).localeCompare(String(right.projectName)));
}

function extractSynthesisCurrencies(workbook) {
  const summaryCurrencies = Array.isArray(workbook?.summary?.synthesisCurrencies)
    ? workbook.summary.synthesisCurrencies.filter(Boolean).map((value) => String(value).trim().toUpperCase()).filter(Boolean)
    : [];
  if (summaryCurrencies.length) {
    return Array.from(new Set(summaryCurrencies)).sort((left, right) => left.localeCompare(right));
  }
  const rows = (workbook && workbook.sheets && workbook.sheets.synthesis) || [];
  const currencies = new Set();
  rows.forEach((row) => {
    let value = row && (
      row.currency ||
      row.Currency ||
      row.CURRENCY ||
      row["Currency"] ||
      row["currency"]
    );
    if (!value && row && typeof row === "object") {
      Object.keys(row).some((key) => {
        const normalizedKey = String(key || "")
          .trim()
          .toLowerCase()
          .replace(/[\s/\\-]+/g, "_")
          .replace(/[()]+/g, "")
          .replace(/[^\w]+/g, "_")
          .replace(/^_+|_+$/g, "")
          .replace(/_+/g, "_");
        if (normalizedKey === "currency") {
          value = row[key];
          return true;
        }
        return false;
      });
    }
    const normalized = String(value || "").trim().toUpperCase();
    if (normalized) currencies.add(normalized);
  });
  return Array.from(currencies).sort((left, right) => left.localeCompare(right));
}

function buildCurrencyExchangeProjects() {
  const persistedProjects = getCurrencyExchangeStore();
  const costCentersProjects = getCostCentersStore();
  const currencyCatalog = ["EUR", "USD", "AED", "SAR", "BRL", "CNY", "SGD", "INR", "GBP", "PLN"];
  const byProject = new Map();

  state.workbooks.forEach((workbook) => {
    const params = getWorkbookGeneralParams(workbook);
    const projectKey = getWorkbookProjectKey(workbook);
    if (!projectKey) return;

    const existing = byProject.get(projectKey) || {
      projectKey,
      projectName: "",
      projectType: "",
      projectContext: "",
      currencySet: new Set(),
      preferredWorkbook: null,
    };

    if (isPreferredProjectWorkbook(workbook, existing.preferredWorkbook)) {
      existing.preferredWorkbook = workbook;
      existing.projectName = params.project_name || workbook?.fileName || projectKey;
      existing.projectType = params.project_type || "";
      existing.projectContext = params.project_context || "";
    }

    extractSynthesisCurrencies(workbook).forEach((currency) => existing.currencySet.add(currency));
    byProject.set(projectKey, existing);
  });

  const baseCurrency = String(state.settings?.exchangeBase || "USD").toUpperCase();
  const liveRates = state.settings?.liveRates || {};
  const globalManualRates = state.settings?.manualRates || {};

  function readBaseRate(currency) {
    const code = String(currency || "").toUpperCase();
    if (!code) return null;
    if (code === baseCurrency) return 1;
    const value = Number(liveRates?.[code]);
    return Number.isFinite(value) && value > 0 ? value : null;
  }

  function computePairRate(sourceCurrency, targetCurrency) {
    const source = String(sourceCurrency || "").toUpperCase();
    const target = String(targetCurrency || "").toUpperCase();
    if (!source || !target) return null;
    if (source === target) return 1;
    const sourceBaseRate = readBaseRate(source);
    const targetBaseRate = readBaseRate(target);
    if (sourceBaseRate === null || targetBaseRate === null) return null;
    return targetBaseRate / sourceBaseRate;
  }

  return Array.from(byProject.values()).map((project) => {
    const persisted = persistedProjects[project.projectKey] || {};
    const costCentersProject = costCentersProjects[project.projectKey] || {};
    const targetCurrency = String(persisted.targetCurrency || "EUR").toUpperCase();
    const manualOverrides = { ...(persisted.manualOverrides || {}) };
    const customCurrencies = Array.isArray(persisted.customCurrencies)
      ? persisted.customCurrencies.filter(Boolean).map((entry) => String(entry).trim().toUpperCase())
      : [];
    const projectCurrency = String(costCentersProject.projectCurrency || "").trim().toUpperCase();
    if (projectCurrency) {
      project.currencySet.add(projectCurrency);
    }
    const projectCurrencies = Array.from(project.currencySet || []);
    const rows = projectCurrencies.map((currency) => {
      const liveRate = computePairRate(currency, targetCurrency);
      const manualOverride = Number(manualOverrides[currency]);
      const hasManualOverride = Number.isFinite(manualOverride) && manualOverride > 0;
      const effectiveRate = hasManualOverride ? manualOverride : liveRate;
      let sourceLabel = "Missing";
      if (currency === targetCurrency) sourceLabel = "Identity";
      else if (hasManualOverride) sourceLabel = "Manual override";
      else if (liveRate !== null) sourceLabel = "Live";
      return {
        currency,
        liveRate,
        manualOverride: hasManualOverride ? manualOverride : "",
        effectiveRate,
        source: sourceLabel,
      };
    });

    return {
      projectKey: project.projectKey,
      projectName: project.projectName,
      projectType: project.projectType,
      projectContext: project.projectContext,
      projectCurrency,
      targetCurrency,
      targetCurrencyOptions: Array.from(new Set(currencyCatalog.concat(customCurrencies).concat(projectCurrencies).concat([targetCurrency]))).sort((left, right) => left.localeCompare(right)),
      baseCurrency,
      lastUpdated: state.settings?.lastUpdated || "",
      provider: state.settings?.provider || "",
      rows: rows.sort((left, right) => left.currency.localeCompare(right.currency)),
    };
  }).sort((left, right) => String(left.projectName).localeCompare(String(right.projectName)));
}

function normalizeHourlyRateImportKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "_");
}

function parseHourlyRateImportRows(rows) {
  return (rows || []).map((row) => {
    const normalized = {};
    Object.keys(row || {}).forEach((key) => {
      normalized[normalizeHourlyRateImportKey(key)] = row[key];
    });
    return {
      costCenter: normalized.cost_center || normalized.costcenter || "",
      timePeriod: normalized.time_period || normalized.timeperiod || "",
      hourlyRate: normalized.hourly_rate || normalized.hourlyrate || "",
      currency: normalized.currency || "",
      position: normalized.position || "",
    };
  }).filter((row) => row.costCenter && row.timePeriod && row.hourlyRate !== "");
}

function findMatchingHourlyRateImportRow(importRows, row) {
  const targetCostCenter = normalizeHourlyRateImportKey(row.costCenter);
  const targetTimePeriod = normalizeHourlyRateImportKey(row.timePeriod);
  const targetCurrency = normalizeHourlyRateImportKey(row.currency);
  const targetPosition = normalizeHourlyRateImportKey(row.position);
  return importRows.find((entry) => {
    if (normalizeHourlyRateImportKey(entry.costCenter) !== targetCostCenter) return false;
    if (normalizeHourlyRateImportKey(entry.timePeriod) !== targetTimePeriod) return false;
    if (entry.currency && normalizeHourlyRateImportKey(entry.currency) !== targetCurrency) return false;
    if (entry.position && normalizeHourlyRateImportKey(entry.position) !== targetPosition) return false;
    return true;
  }) || null;
}

async function refreshCostCentersSource() {
  await initSharedStore();
  const localSharedWorkbooks = await getAllWorkbookData();
  const indexedDbBridgeWorkbooks = await loadIndexedDbBridgeWorkbooks();
  state.workbooks = mergeWorkbooksBySourceId(indexedDbBridgeWorkbooks, localSharedWorkbooks);
  syncWorkspaceLiteCache(state.workbooks);
}

async function saveCostCentersState(mutator) {
  if (!state.currentStudy?.studyId) return;
  const existingOrganizationRisks = state.studyConfig?.organizationRisks || {};
  const currentProjects = { ...(existingOrganizationRisks.costCenters?.projects || {}) };
  const nextProjects = mutator(currentProjects) || currentProjects;
  state.studyConfig = await savePersistedStudyConfig(state.currentStudy.studyId, {
    organizationRisks: {
      ...existingOrganizationRisks,
      costCenters: {
        ...(existingOrganizationRisks.costCenters || {}),
        projects: nextProjects,
        updatedAt: new Date().toISOString(),
      },
    },
  });
  publishCostCentersBridge();
  updateToolbarStatusDots();
}

async function refreshPioDefinitionSource() {
  await initSharedStore();
  const localSharedWorkbooks = await getAllWorkbookData();
  const indexedDbBridgeWorkbooks = await loadIndexedDbBridgeWorkbooks();
  state.workbooks = mergeWorkbooksBySourceId(indexedDbBridgeWorkbooks, localSharedWorkbooks);
  syncWorkspaceLiteCache(state.workbooks);
}

async function refreshGuidePlanningSource() {
  await initSharedStore();
  const localSharedWorkbooks = await getAllWorkbookData();
  const indexedDbBridgeWorkbooks = await loadIndexedDbBridgeWorkbooks();
  state.workbooks = mergeWorkbooksBySourceId(indexedDbBridgeWorkbooks, localSharedWorkbooks);
  syncWorkspaceLiteCache(state.workbooks);
}

async function savePioDefinitionState(mutator) {
  if (!state.currentStudy?.studyId) return;
  const existingStudySetup = state.studyConfig?.studySetup || {};
  const currentProjects = { ...(existingStudySetup.pioDefinitionFreightCustoms?.projects || {}) };
  const nextProjects = mutator(currentProjects) || currentProjects;
  state.studyConfig = await savePersistedStudyConfig(state.currentStudy.studyId, {
    studySetup: {
      ...existingStudySetup,
      pioDefinitionFreightCustoms: {
        ...(existingStudySetup.pioDefinitionFreightCustoms || {}),
        projects: nextProjects,
        updatedAt: new Date().toISOString(),
      },
    },
  });
  publishPioDefinitionBridge();
  updateToolbarStatusDots();
}

async function refreshCurrencyExchangeSource() {
  await initSharedStore();
  const localSharedWorkbooks = await getAllWorkbookData();
  const indexedDbBridgeWorkbooks = await loadIndexedDbBridgeWorkbooks();
  state.workbooks = mergeWorkbooksBySourceId(indexedDbBridgeWorkbooks, localSharedWorkbooks);
  syncWorkspaceLiteCache(state.workbooks);
  state.settings = await loadSharedSettings();
}

async function saveCurrencyExchangeState(mutator) {
  if (!state.currentStudy?.studyId) return;
  const existingDataSources = state.studyConfig?.dataSources || {};
  const currentProjects = { ...(existingDataSources.currencyExchangeRates?.projects || {}) };
  const nextProjects = mutator(currentProjects) || currentProjects;
  state.studyConfig = await savePersistedStudyConfig(state.currentStudy.studyId, {
    dataSources: {
      ...existingDataSources,
      currencyExchangeRates: {
        ...(existingDataSources.currencyExchangeRates || {}),
        projects: nextProjects,
        updatedAt: new Date().toISOString(),
      },
    },
  });
  updateToolbarStatusDots();
}

async function saveSingleCurrencyExchangeProject(projectKey, mutator) {
  if (!projectKey) return;
  await saveCurrencyExchangeState((projects) => {
    const current = {
      ...(projects[projectKey] || {}),
      customCurrencies: Array.isArray(projects[projectKey]?.customCurrencies) ? [...projects[projectKey].customCurrencies] : [],
      manualOverrides: { ...((projects[projectKey] || {}).manualOverrides || {}) },
    };
    const nextProject = mutator(current) || current;
    projects[projectKey] = nextProject;
    return projects;
  });
}

async function saveSinglePioDefinitionProject(projectKey, mutator) {
  if (!projectKey) return;
  await savePioDefinitionState((projects) => {
    const current = {
      ...(projects[projectKey] || {}),
      customOrigins: Array.isArray(projects[projectKey]?.customOrigins) ? [...projects[projectKey].customOrigins] : [],
      selectedOrigins: Array.isArray(projects[projectKey]?.selectedOrigins) ? [...projects[projectKey].selectedOrigins] : [],
      rowOverrides: { ...((projects[projectKey] || {}).rowOverrides || {}) },
      customDutiesBySubsystem: { ...((projects[projectKey] || {}).customDutiesBySubsystem || {}) },
    };
    const nextProject = mutator(current) || current;
    projects[projectKey] = nextProject;
    return projects;
  });
}

async function saveSingleCostCentersProject(projectKey, mutator) {
  if (!projectKey) return;
  await saveCostCentersState((projects) => {
    const current = {
      ...(projects[projectKey] || {}),
      customCurrencies: Array.isArray(projects[projectKey]?.customCurrencies) ? [...projects[projectKey].customCurrencies] : [],
      customPositions: Array.isArray(projects[projectKey]?.customPositions) ? [...projects[projectKey].customPositions] : [],
      selectedPositions: Array.isArray(projects[projectKey]?.selectedPositions) ? [...projects[projectKey].selectedPositions] : [],
      generalTimePeriods: Array.isArray(projects[projectKey]?.generalTimePeriods) ? [...projects[projectKey].generalTimePeriods] : [],
      engineerTimePeriods: Array.isArray(projects[projectKey]?.engineerTimePeriods) ? [...projects[projectKey].engineerTimePeriods] : [],
      rowOverrides: { ...((projects[projectKey] || {}).rowOverrides || {}) },
    };
    const nextProject = mutator(current) || current;
    projects[projectKey] = nextProject;
    return projects;
  });
}

async function saveGuidePlanningState(mutator) {
  if (!state.currentStudy?.studyId) return;
  const existingStudySetup = state.studyConfig?.studySetup || {};
  const currentProjects = { ...(existingStudySetup.guidePlanningDefinition?.projects || {}) };
  const nextProjects = mutator(currentProjects) || currentProjects;
  state.studyConfig = await savePersistedStudyConfig(state.currentStudy.studyId, {
    studySetup: {
      ...existingStudySetup,
      guidePlanningDefinition: {
        ...(existingStudySetup.guidePlanningDefinition || {}),
        projects: nextProjects,
        updatedAt: new Date().toISOString(),
      },
    },
  });
  publishGuidePlanningBridge();
  updateToolbarStatusDots();
}

async function saveSingleGuidePlanningProject(projectKey, mutator) {
  await saveGuidePlanningState((projects) => {
    const current = {
      ...(projects[projectKey] || {}),
      selectedMaterialTypes: Array.isArray(projects[projectKey]?.selectedMaterialTypes) ? [...projects[projectKey].selectedMaterialTypes] : [],
      selectedSubcontractingTypes: Array.isArray(projects[projectKey]?.selectedSubcontractingTypes) ? [...projects[projectKey].selectedSubcontractingTypes] : [],
      selectedRecurrentMaterialTypes: Array.isArray(projects[projectKey]?.selectedRecurrentMaterialTypes) ? [...projects[projectKey].selectedRecurrentMaterialTypes] : [],
      selectedRecurrentSubcontractingTypes: Array.isArray(projects[projectKey]?.selectedRecurrentSubcontractingTypes) ? [...projects[projectKey].selectedRecurrentSubcontractingTypes] : [],
      mobilizationWorkloadMonthsByPosition: {
        ...((projects[projectKey] || {}).mobilizationWorkloadMonthsByPosition || {}),
      },
      demobilizationWorkloadMonthsByPosition: {
        ...((projects[projectKey] || {}).demobilizationWorkloadMonthsByPosition || {}),
      },
      demobilizationMaterialMonthsByType: {
        ...((projects[projectKey] || {}).demobilizationMaterialMonthsByType || {}),
      },
      demobilizationSubcontractingMonthsByType: {
        ...((projects[projectKey] || {}).demobilizationSubcontractingMonthsByType || {}),
      },
      mobilizationWorkloadMonthsByPhase: {
        ...((projects[projectKey] || {}).mobilizationWorkloadMonthsByPhase || {}),
      },
      rowOverrides: {
        ...((projects[projectKey] || {}).rowOverrides || {}),
      },
      customWorkloadRows: Array.isArray(projects[projectKey]?.customWorkloadRows) ? projects[projectKey].customWorkloadRows.map((row) => ({ ...row })) : [],
      customMaterialRows: Array.isArray(projects[projectKey]?.customMaterialRows) ? projects[projectKey].customMaterialRows.map((row) => ({ ...row })) : [],
      customSubcontractingRows: Array.isArray(projects[projectKey]?.customSubcontractingRows) ? projects[projectKey].customSubcontractingRows.map((row) => ({ ...row })) : [],
      customRecurrentWorkloadRows: Array.isArray(projects[projectKey]?.customRecurrentWorkloadRows) ? projects[projectKey].customRecurrentWorkloadRows.map((row) => ({ ...row })) : [],
      customRecurrentMaterialRows: Array.isArray(projects[projectKey]?.customRecurrentMaterialRows) ? projects[projectKey].customRecurrentMaterialRows.map((row) => ({ ...row })) : [],
      customRecurrentSubcontractingRows: Array.isArray(projects[projectKey]?.customRecurrentSubcontractingRows) ? projects[projectKey].customRecurrentSubcontractingRows.map((row) => ({ ...row })) : [],
      customDemobilizationWorkloadRows: Array.isArray(projects[projectKey]?.customDemobilizationWorkloadRows) ? projects[projectKey].customDemobilizationWorkloadRows.map((row) => ({ ...row })) : [],
      customDemobilizationMaterialRows: Array.isArray(projects[projectKey]?.customDemobilizationMaterialRows) ? projects[projectKey].customDemobilizationMaterialRows.map((row) => ({ ...row })) : [],
      customDemobilizationSubcontractingRows: Array.isArray(projects[projectKey]?.customDemobilizationSubcontractingRows) ? projects[projectKey].customDemobilizationSubcontractingRows.map((row) => ({ ...row })) : [],
      customOverhaulRenewalRows: Array.isArray(projects[projectKey]?.customOverhaulRenewalRows) ? projects[projectKey].customOverhaulRenewalRows.map((row) => ({ ...row })) : [],
      customRiskRows: Array.isArray(projects[projectKey]?.customRiskRows) ? projects[projectKey].customRiskRows.map((row) => ({ ...row })) : [],
      riskRows: Array.isArray(projects[projectKey]?.riskRows)
        ? projects[projectKey].riskRows.map((row) => ({ ...row }))
        : (Array.isArray(projects[projectKey]?.customRiskRows) ? projects[projectKey].customRiskRows.map((row) => ({ ...row })) : []),
    };
    const next = mutator(current) || current;
    projects[projectKey] = next;
    return projects;
  });
}

async function importCostCenterHourlyRates(projectKey, file) {
  if (!projectKey || !file) return;
  if (typeof XLSX === "undefined") {
    window.alert("XLSX library is not available on this page.");
    return;
  }

  const reader = new FileReader();
  reader.onload = async (event) => {
    try {
      const data = event.target?.result;
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = (workbook.SheetNames || []).find((entry) => {
        const normalized = normalizeHourlyRateImportKey(entry);
        return normalized === "hourly_rates" || normalized === "hourly_rate";
      });
      if (!sheetName) {
        window.alert('The workbook does not contain a sheet named "Hourly rates" or "Hourly rate".');
        return;
      }

      const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: "" });
      const importRows = parseHourlyRateImportRows(rows);
      const project = buildCostCenterProjects().find((entry) => entry.projectKey === projectKey);
      if (!project) {
        window.alert("No matching project is currently loaded in Cost Centers.");
        return;
      }

      let matchedCount = 0;
      await saveCostCentersState((projects) => {
        const current = { ...(projects[projectKey] || {}) };
        const rowOverrides = { ...(current.rowOverrides || {}) };
        project.rows.forEach((row) => {
          const match = findMatchingHourlyRateImportRow(importRows, row);
          if (!match) return;
          rowOverrides[row.rowKey] = {
            ...(rowOverrides[row.rowKey] || {}),
            hourlyRate: match.hourlyRate,
          };
          matchedCount += 1;
        });
        current.rowOverrides = rowOverrides;
        projects[projectKey] = current;
        return projects;
      });
      renderCostCentersWorkspace();
      window.alert(`${matchedCount} hourly rate row(s) imported.`);
      const input = $("costCentersHourlyRateImportInput");
      if (input) input.value = "";
    } catch (error) {
      window.alert(`Unable to import hourly rates. ${error?.message || "Unknown error."}`);
    }
  };
  reader.readAsArrayBuffer(file);
}

function renderCostCentersWorkspace() {
  const workspace = $("costCentersWorkspace");
  const list = $("costCentersProjectList");
  const empty = $("costCentersWorkspaceEmpty");
  const content = $("costCentersWorkspaceContent");
  const status = $("costCentersWorkspaceStatus");
  const title = $("costCentersCurrentProjectTitle");
  const meta = $("costCentersCurrentProjectMeta");
  const annualSource = $("costCentersAnnualHoursSource");
  const currencySelect = $("costCentersProjectCurrencySelect");
  const annualHoursInput = $("costCentersAnnualHoursInput");
  const positionsSelector = $("costCentersPositionsSelector");
  const generalPeriodsSelector = $("costCentersGeneralPeriodsSelector");
  const engineerPeriodsSelector = $("costCentersEngineerPeriodsSelector");
  const tableBody = $("costCentersTableBody");
  const addCurrencyBtn = $("costCentersAddCurrencyBtn");
  const addPositionBtn = $("costCentersAddPositionBtn");
  const nightPremiumToggle = $("costCentersNightPremiumToggle");
  const nightPremiumPercent = $("costCentersNightPremiumPercent");
  const hourlyRateImportInput = $("costCentersHourlyRateImportInput");
  const importRatesBtn = $("costCentersImportRatesBtn");
  if (!workspace || !list || !empty || !content || !status || !title || !meta || !annualSource || !currencySelect || !annualHoursInput || !positionsSelector || !generalPeriodsSelector || !engineerPeriodsSelector || !tableBody || !addCurrencyBtn || !addPositionBtn || !nightPremiumToggle || !nightPremiumPercent || !hourlyRateImportInput || !importRatesBtn) return;

  const projects = buildCostCenterProjects();
  if (!projects.length) {
    workspace.classList.remove("hidden");
    list.innerHTML = "";
    empty.classList.remove("hidden");
    content.classList.add("hidden");
    status.textContent = `No project available. Shared workbooks detected: ${state.workbooks.length}`;
    return;
  }

  if (!projects.some((project) => project.projectKey === state.currentCostCentersProjectKey)) {
    state.currentCostCentersProjectKey = projects[0].projectKey;
  }
  const currentProject = projects.find((project) => project.projectKey === state.currentCostCentersProjectKey) || projects[0];

  workspace.classList.remove("hidden");
  status.textContent = `${projects.length} project(s) available`;
  list.innerHTML = projects.map((project) => `
    <button
      type="button"
      data-cost-centers-select="${escapeHtml(project.projectKey)}"
      class="w-full rounded-xl border px-3 py-3 text-left transition-all ${project.projectKey === currentProject.projectKey ? "border-emerald-300 bg-emerald-50 shadow-sm ring-1 ring-emerald-200" : "border-slate-200 bg-white hover:bg-slate-100"}"
    >
      <div class="text-sm font-semibold text-slate-900">${escapeHtml(project.projectName)}</div>
      <div class="mt-1 text-xs text-slate-500">${escapeHtml(project.projectContext || "No context")}</div>
    </button>
  `).join("");

  empty.classList.add("hidden");
  content.classList.remove("hidden");
  title.textContent = currentProject.projectName;
  meta.textContent = `${currentProject.projectType || "No project type"} | ${currentProject.projectContext || "No context"}`;
  annualSource.textContent = currentProject.annualWorkingHoursSource || "--";
  currencySelect.innerHTML = currentProject.currencyOptions.map((currency) => `<option value="${escapeHtml(currency)}"${currency === currentProject.projectCurrency ? " selected" : ""}>${escapeHtml(currency)}</option>`).join("");
  currencySelect.dataset.projectKey = currentProject.projectKey;
  annualHoursInput.value = currentProject.annualWorkingHours || 0;
  annualHoursInput.dataset.projectKey = currentProject.projectKey;
  addCurrencyBtn.dataset.projectKey = currentProject.projectKey;
  addPositionBtn.dataset.projectKey = currentProject.projectKey;
  nightPremiumToggle.checked = !!currentProject.nightPremiumEnabled;
  nightPremiumToggle.dataset.projectKey = currentProject.projectKey;
  nightPremiumPercent.value = currentProject.nightPremiumPercent || 0;
  nightPremiumPercent.dataset.projectKey = currentProject.projectKey;
  nightPremiumPercent.disabled = !currentProject.nightPremiumEnabled;
  importRatesBtn.dataset.projectKey = currentProject.projectKey;
  hourlyRateImportInput.dataset.projectKey = currentProject.projectKey;

  positionsSelector.innerHTML = currentProject.positionOptions.map((position) => {
    const checked = currentProject.selectedPositions.includes(position);
    const removable = currentProject.customPositions.includes(position);
    return `<label class="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"><input data-cost-center-position data-project-key="${escapeHtml(currentProject.projectKey)}" type="checkbox" value="${escapeHtml(position)}"${checked ? " checked" : ""}/><span class="flex-1">${escapeHtml(position)}</span>${removable ? `<button type="button" data-cost-center-remove-position="${escapeHtml(position)}" data-project-key="${escapeHtml(currentProject.projectKey)}" class="inline-flex items-center justify-center size-7 rounded-lg border border-rose-200 bg-white text-rose-600 hover:bg-rose-50 transition-all"><span class="material-symbols-outlined text-[16px]">delete</span></button>` : ""}</label>`;
  }).join("");

  generalPeriodsSelector.innerHTML = currentProject.timePeriodCatalog.map((entry) => {
    const checked = currentProject.generalTimePeriods.includes(entry);
    return `<label class="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"><input data-cost-center-general-period data-project-key="${escapeHtml(currentProject.projectKey)}" type="checkbox" value="${escapeHtml(entry)}"${checked ? " checked" : ""}/><span>${escapeHtml(entry)}</span></label>`;
  }).join("");

  engineerPeriodsSelector.innerHTML = currentProject.timePeriodCatalog.map((entry) => {
    const checked = currentProject.engineerTimePeriods.includes(entry);
    return `<label class="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"><input data-cost-center-engineer-period data-project-key="${escapeHtml(currentProject.projectKey)}" type="checkbox" value="${escapeHtml(entry)}"${checked ? " checked" : ""}/><span>${escapeHtml(entry)}</span></label>`;
  }).join("");

  tableBody.innerHTML = currentProject.rows.length
    ? currentProject.rows.map((row) => {
      const monthlyHours = row.monthlyWorkingHours === "" ? "--" : String((Math.round(Number(row.monthlyWorkingHours || 0) * 100) / 100).toFixed(2));
      return `
        <tr>
          <td class="py-3 pr-4 font-semibold">${escapeHtml(row.position)}</td>
          <td class="py-3 px-4">${/external support/i.test(row.position || "")
            ? `<select data-cost-center-row-field="caratUnit" data-project-key="${escapeHtml(currentProject.projectKey)}" data-row-key="${escapeHtml(row.rowKey)}" class="rounded-xl border-slate-200 px-3 py-2"><option value="">Select</option>${row.pioCaratUnitOptions.map((caratUnit) => `<option value="${escapeHtml(caratUnit)}"${caratUnit === row.caratUnit ? " selected" : ""}>${escapeHtml(caratUnit)}</option>`).join("")}</select>`
            : `<span class="text-slate-700">${escapeHtml(row.caratUnit || "--")}</span>`}
          </td>
          <td class="py-3 px-4">${escapeHtml(row.timePeriod)}</td>
          <td class="py-3 px-4 text-right">${escapeHtml(monthlyHours)}</td>
          <td class="py-3 px-4"><select data-cost-center-row-field="currency" data-project-key="${escapeHtml(currentProject.projectKey)}" data-row-key="${escapeHtml(row.rowKey)}" class="rounded-xl border-slate-200 px-3 py-2">${currentProject.currencyOptions.map((currency) => `<option value="${escapeHtml(currency)}"${currency === row.currency ? " selected" : ""}>${escapeHtml(currency)}</option>`).join("")}</select></td>
          <td class="py-3 px-4 text-right"><input data-cost-center-row-field="hourlyRate" data-project-key="${escapeHtml(currentProject.projectKey)}" data-row-key="${escapeHtml(row.rowKey)}" type="number" min="0" step="0.01" class="w-28 rounded-xl border-slate-200 px-3 py-2 text-right" value="${escapeHtml(row.hourlyRate)}"/></td>
          <td class="py-3 pl-4"><input data-cost-center-row-field="costCenter" data-project-key="${escapeHtml(currentProject.projectKey)}" data-row-key="${escapeHtml(row.rowKey)}" type="text" class="w-full min-w-[160px] rounded-xl border-slate-200 px-3 py-2" value="${escapeHtml(row.costCenter)}"/></td>
        </tr>
      `;
    }).join("")
    : '<tr><td colspan="7" class="py-6 text-center text-sm text-slate-500">Select at least one position to generate the table.</td></tr>';
}

function renderPioDefinitionWorkspace() {
  const workspace = $("pioDefinitionWorkspace");
  const list = $("pioDefinitionProjectList");
  const empty = $("pioDefinitionWorkspaceEmpty");
  const content = $("pioDefinitionWorkspaceContent");
  const status = $("pioDefinitionWorkspaceStatus");
  const title = $("pioDefinitionCurrentProjectTitle");
  const meta = $("pioDefinitionCurrentProjectMeta");
  const annualWorkingHours = $("pioDefinitionAnnualWorkingHours");
  const originSelector = $("pioDefinitionOriginSelector");
  const onshoreFreightInput = $("pioDefinitionOnshoreFreightInput");
  const offshoreFreightInput = $("pioDefinitionOffshoreFreightInput");
  const customDutiesBody = $("pioDefinitionCustomDutiesBody");
  const tableBody = $("pioDefinitionTableBody");
  const addOriginBtn = $("pioDefinitionAddOriginBtn");
  if (!workspace || !list || !empty || !content || !status || !title || !meta || !annualWorkingHours || !originSelector || !onshoreFreightInput || !offshoreFreightInput || !customDutiesBody || !tableBody || !addOriginBtn) return;

  const projects = buildPioDefinitionProjects();
  if (!projects.length) {
    workspace.classList.remove("hidden");
    list.innerHTML = "";
    empty.classList.remove("hidden");
    content.classList.add("hidden");
    status.textContent = `No project available. Shared workbooks detected: ${state.workbooks.length}`;
    return;
  }

  if (!projects.some((project) => project.projectKey === state.currentPioDefinitionProjectKey)) {
    state.currentPioDefinitionProjectKey = projects[0].projectKey;
  }
  const currentProject = projects.find((project) => project.projectKey === state.currentPioDefinitionProjectKey) || projects[0];

  workspace.classList.remove("hidden");
  status.textContent = `${projects.length} project(s) available`;
  list.innerHTML = projects.map((project) => `
    <button
      type="button"
      data-pio-definition-select="${escapeHtml(project.projectKey)}"
      class="w-full rounded-xl border px-3 py-3 text-left transition-all ${project.projectKey === currentProject.projectKey ? "border-emerald-300 bg-emerald-50 shadow-sm ring-1 ring-emerald-200" : "border-slate-200 bg-white hover:bg-slate-100"}"
    >
      <div class="text-sm font-semibold text-slate-900">${escapeHtml(project.projectName)}</div>
      <div class="mt-1 text-xs text-slate-500">${escapeHtml(project.projectContext || "No context")}</div>
    </button>
  `).join("");

  empty.classList.add("hidden");
  content.classList.remove("hidden");
  title.textContent = currentProject.projectName;
  meta.textContent = `${currentProject.projectType || "No project type"} | ${currentProject.projectContext || "No context"}`;
  annualWorkingHours.textContent = currentProject.annualWorkingHours || "--";
  addOriginBtn.dataset.projectKey = currentProject.projectKey;
  onshoreFreightInput.value = currentProject.onshoreFreightPercent || 0;
  onshoreFreightInput.dataset.projectKey = currentProject.projectKey;
  offshoreFreightInput.value = currentProject.offshoreFreightPercent || 0;
  offshoreFreightInput.dataset.projectKey = currentProject.projectKey;

  originSelector.innerHTML = currentProject.originOptions.map((origin) => {
    const checked = currentProject.selectedOrigins.includes(origin);
    return `<label class="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"><input data-pio-origin data-project-key="${escapeHtml(currentProject.projectKey)}" type="checkbox" value="${escapeHtml(origin)}"${checked ? " checked" : ""}/><span>${escapeHtml(origin)}</span></label>`;
  }).join("");

  customDutiesBody.innerHTML = currentProject.subsystems.length
    ? currentProject.subsystems.map((subsystem) => {
      const value = currentProject.customDutiesBySubsystem[subsystem] !== undefined && currentProject.customDutiesBySubsystem[subsystem] !== null
        ? currentProject.customDutiesBySubsystem[subsystem]
        : 0;
      return `
        <tr>
          <td class="py-3 pr-4 font-semibold">${escapeHtml(subsystem)}</td>
          <td class="py-3 pl-4 text-right"><input data-pio-custom-duty data-project-key="${escapeHtml(currentProject.projectKey)}" data-subsystem="${escapeHtml(subsystem)}" type="number" min="0" max="100" step="0.1" class="w-28 rounded-xl border-slate-200 px-3 py-2 text-right" value="${escapeHtml(value)}"/></td>
        </tr>
      `;
    }).join("")
    : '<tr><td colspan="2" class="py-6 text-center text-sm text-slate-500">No subsystem found in `Synthesis` for this project.</td></tr>';

  tableBody.innerHTML = currentProject.rows.length
    ? currentProject.rows.map((row) => `
      <tr>
        <td class="py-3 pr-4 font-semibold">${escapeHtml(row.origin)}</td>
        <td class="py-3 px-4"><input data-pio-row-field="caratUnit" data-project-key="${escapeHtml(currentProject.projectKey)}" data-origin="${escapeHtml(row.origin)}" type="text" class="w-full min-w-[140px] rounded-xl border-slate-200 px-3 py-2" value="${escapeHtml(row.caratUnit)}"/></td>
        <td class="py-3 px-4"><input data-pio-row-field="unitRole" data-project-key="${escapeHtml(currentProject.projectKey)}" data-origin="${escapeHtml(row.origin)}" type="text" class="w-full min-w-[90px] rounded-xl border-slate-200 px-3 py-2" value="${escapeHtml(row.unitRole)}"/></td>
        <td class="py-3 px-4"><input data-pio-row-field="source" data-project-key="${escapeHtml(currentProject.projectKey)}" data-origin="${escapeHtml(row.origin)}" type="text" class="w-full min-w-[120px] rounded-xl border-slate-200 px-3 py-2" value="${escapeHtml(row.source)}"/></td>
        <td class="py-3 pl-4 text-right"><input data-pio-row-field="yearlyHours" data-project-key="${escapeHtml(currentProject.projectKey)}" data-origin="${escapeHtml(row.origin)}" type="number" min="0" step="0.01" class="w-32 rounded-xl border-slate-200 px-3 py-2 text-right" value="${escapeHtml(row.yearlyHours)}"/></td>
      </tr>
    `).join("")
    : '<tr><td colspan="5" class="py-6 text-center text-sm text-slate-500">Select at least one origin to build the table.</td></tr>';
}

function renderCurrencyExchangeWorkspace() {
  const workspace = $("currencyExchangeWorkspace");
  const list = $("currencyExchangeProjectList");
  const empty = $("currencyExchangeWorkspaceEmpty");
  const content = $("currencyExchangeWorkspaceContent");
  const status = $("currencyExchangeWorkspaceStatus");
  const title = $("currencyExchangeCurrentProjectTitle");
  const meta = $("currencyExchangeCurrentProjectMeta");
  const targetCurrencySelect = $("currencyExchangeTargetCurrencySelect");
  const addCurrencyBtn = $("currencyExchangeAddCurrencyBtn");
  const liveSource = $("currencyExchangeLiveSource");
  const tableBody = $("currencyExchangeTableBody");
  if (!workspace || !list || !empty || !content || !status || !title || !meta || !targetCurrencySelect || !addCurrencyBtn || !liveSource || !tableBody) return;

  const projects = buildCurrencyExchangeProjects();
  if (!projects.length) {
    workspace.classList.remove("hidden");
    list.innerHTML = "";
    empty.classList.remove("hidden");
    content.classList.add("hidden");
    status.textContent = `No project available. Shared workbooks detected: ${state.workbooks.length}`;
    return;
  }

  if (!projects.some((project) => project.projectKey === state.currentCurrencyExchangeProjectKey)) {
    state.currentCurrencyExchangeProjectKey = projects[0].projectKey;
  }
  const currentProject = projects.find((project) => project.projectKey === state.currentCurrencyExchangeProjectKey) || projects[0];

  workspace.classList.remove("hidden");
  status.textContent = `${projects.length} project(s) available`;
  list.innerHTML = projects.map((project) => `
    <button
      type="button"
      data-currency-exchange-select="${escapeHtml(project.projectKey)}"
      class="w-full rounded-xl border px-3 py-3 text-left transition-all ${project.projectKey === currentProject.projectKey ? "border-emerald-300 bg-emerald-50 shadow-sm ring-1 ring-emerald-200" : "border-slate-200 bg-white hover:bg-slate-100"}"
    >
      <div class="text-sm font-semibold text-slate-900">${escapeHtml(project.projectName)}</div>
      <div class="mt-1 text-xs text-slate-500">${escapeHtml(project.projectContext || "No context")}</div>
    </button>
  `).join("");

  empty.classList.add("hidden");
  content.classList.remove("hidden");
  title.textContent = currentProject.projectName;
  meta.textContent = `${currentProject.projectType || "No project type"} | ${currentProject.projectContext || "No context"} | Base ${currentProject.baseCurrency}`;
  targetCurrencySelect.innerHTML = currentProject.targetCurrencyOptions.map((currency) => `<option value="${escapeHtml(currency)}"${currency === currentProject.targetCurrency ? " selected" : ""}>${escapeHtml(currency)}</option>`).join("");
  targetCurrencySelect.dataset.projectKey = currentProject.projectKey;
  addCurrencyBtn.dataset.projectKey = currentProject.projectKey;
  liveSource.textContent = currentProject.provider
    ? `${currentProject.provider}${currentProject.lastUpdated ? ` | updated ${formatTimestamp(currentProject.lastUpdated)}` : ""}`
    : `Base ${currentProject.baseCurrency}`;

  tableBody.innerHTML = currentProject.rows.length
    ? currentProject.rows.map((row) => `
      <tr>
        <td class="py-3 pr-4 font-semibold">${escapeHtml(row.currency)}</td>
        <td class="py-3 px-4">${row.liveRate === null ? '<span class="text-slate-400">--</span>' : escapeHtml(row.liveRate.toFixed(6))}</td>
        <td class="py-3 px-4">
          <input
            data-currency-exchange-manual
            data-project-key="${escapeHtml(currentProject.projectKey)}"
            data-currency="${escapeHtml(row.currency)}"
            type="number"
            min="0"
            step="0.000001"
            class="w-32 rounded-xl border-slate-200 px-3 py-2 text-right"
            value="${escapeHtml(row.manualOverride)}"
          />
        </td>
        <td class="py-3 px-4">${row.effectiveRate === null ? '<span class="text-slate-400">--</span>' : `<span class="font-semibold">${escapeHtml(row.effectiveRate.toFixed(6))}</span>`}</td>
        <td class="py-3 pl-4">${escapeHtml(row.source)}</td>
      </tr>
    `).join("")
    : '<tr><td colspan="5" class="py-6 text-center text-sm text-slate-500">No currency found in `Synthesis` for this project.</td></tr>';
}

function buildProjectPhaseProjects() {
  const byProject = new Map();
  const persistedProjects = getProjectPhaseStore();
  const preferredWorkbooks = getPreferredProjectWorkbookMap();
  const mergedProjectParams = getMergedProjectGeneralParamsMap();

  preferredWorkbooks.forEach((workbook, projectKey) => {
    const params = mergedProjectParams.get(projectKey)?.params || getWorkbookGeneralParams(workbook);

    const projectName = params.project_name || workbook.fileName || projectKey;
    const serviceYear = toNumber(params.service_year);
    const projectContext = params.project_context || "";
    const persisted = persistedProjects[projectKey] || {};
    const normalizedContext = normalizeProjectContext(projectContext);
    const defaultWarranty = normalizedContext === "green_field" ? 24 : 0;
    const defaultStartDate = serviceYear !== null ? `${String(serviceYear).padStart(4, "0")}-01-01` : "";
    const defaultTotalDurationYears = inferContractDurationYears(params);

    const defaultProjectCode = String(projectName).replace(/[^A-Za-z0-9]/g, "").slice(0, 3).toUpperCase() || "PRJ";
    const totalPhasePersisted = persisted.phases?.Total || {};
    const startOfProject = persisted.startOfProjectDate || defaultStartDate;
    const totalDurationYears = toNumber(totalPhasePersisted.durationYears) ?? defaultTotalDurationYears;
    const totalStartDate = totalPhasePersisted.startDate || startOfProject;
    const totalEndDate = totalPhasePersisted.endDate || addYearsInclusive(totalStartDate, totalDurationYears);
    const totalPhaseCode = totalPhasePersisted.phaseCode || buildDefaultPhaseCode(params.service_year, totalStartDate, totalEndDate, totalDurationYears);

    const phases = [
      {
        key: "Total",
        label: "Total",
        phaseCode: totalPhaseCode,
        durationYears: totalDurationYears,
        startDate: totalStartDate,
        endDate: totalEndDate,
        postWarrantyStartDate: addMonths(totalStartDate, toNumber(persisted.warrantyDurationMonths) ?? defaultWarranty),
        postWarrantyEndDate: totalEndDate,
        removable: false,
        manual: false,
        order: 0,
      },
    ];

    let previousEndDate = startOfProject;
    getProjectPhaseSequence().forEach((phaseKey, index) => {
      const phasePersisted = persisted.phases?.[phaseKey];
      if (!phasePersisted?.enabled) return;
      const durationYears = toNumber(phasePersisted.durationYears) ?? 0;
      const phaseStartDate = phaseKey === "Base"
        ? startOfProject
        : addDays(previousEndDate, 1);
      const phaseEndDate = addYearsInclusive(phaseStartDate, durationYears);
      const postWarrantyApplicable = phaseKey === "Base";
      const phaseCode = phasePersisted.phaseCode || buildDefaultPhaseCode(params.service_year, phaseStartDate, phaseEndDate, durationYears);

      phases.push({
        key: phaseKey,
        label: phaseKey,
        phaseCode,
        durationYears,
        startDate: phaseStartDate,
        endDate: phaseEndDate,
        postWarrantyStartDate: postWarrantyApplicable
          ? addMonths(phaseStartDate, toNumber(persisted.warrantyDurationMonths) ?? defaultWarranty)
          : "",
        postWarrantyEndDate: postWarrantyApplicable ? phaseEndDate : "",
        removable: true,
        manual: false,
        order: index + 1,
      });

      previousEndDate = phaseEndDate;
    });

    Object.keys(persisted.phases || {})
      .filter((phaseKey) => isCustomProjectPhaseKey(phaseKey) && persisted.phases?.[phaseKey]?.enabled)
      .sort((left, right) => left.localeCompare(right))
      .forEach((phaseKey, index) => {
        const customPhase = persisted.phases?.[phaseKey] || {};
        phases.push({
          key: phaseKey,
          label: customPhase.label || phaseKey.replace(/_/g, " "),
          phaseCode: customPhase.phaseCode || buildDefaultPhaseCode(params.service_year, customPhase.startDate || "", customPhase.endDate || "", customPhase.durationYears),
          durationYears: toNumber(customPhase.durationYears) ?? 0,
          startDate: customPhase.startDate || "",
          endDate: customPhase.endDate || "",
          postWarrantyStartDate: customPhase.postWarrantyStartDate || "",
          postWarrantyEndDate: customPhase.postWarrantyEndDate || "",
          removable: true,
          manual: true,
          order: 100 + index,
        });
      });

    const orderedPhases = [phases[0]].concat(
      phases.slice(1).sort((left, right) => {
        const leftTime = left.startDate ? new Date(left.startDate).getTime() : Number.POSITIVE_INFINITY;
        const rightTime = right.startDate ? new Date(right.startDate).getTime() : Number.POSITIVE_INFINITY;
        const safeLeftTime = Number.isFinite(leftTime) ? leftTime : Number.POSITIVE_INFINITY;
        const safeRightTime = Number.isFinite(rightTime) ? rightTime : Number.POSITIVE_INFINITY;
        if (safeLeftTime !== safeRightTime) return safeLeftTime - safeRightTime;
        return (left.order || 0) - (right.order || 0);
      })
    );

    byProject.set(projectKey, {
      projectKey,
      projectName,
      projectType: params.project_type || "",
      projectContext,
      serviceYear: params.service_year || "",
      planningYear: params.planning_year || "",
      correcOvhStartYear: params.correc_ovh_start_year || "",
      correcOvhEndYear: params.correc_ovh_end_year || "",
      contractDurationYears: params.contract_duration_years || "",
      derivedContractDurationYears: inferContractDurationYears(params),
      projectCode: persisted.projectCode || defaultProjectCode,
      startOfProjectDate: startOfProject,
      maxMobilisationMonths: toNumber(persisted.maxMobilisationMonths) ?? 18,
      mobilisationPhaseCode: persisted.mobilisationPhaseCode || "MOB",
      warrantyDurationMonths: toNumber(persisted.warrantyDurationMonths) ?? defaultWarranty,
      warrantyCode: persisted.warrantyCode || "DLP",
      postWarrantyCode: persisted.postWarrantyCode || "PDLP",
      recurrentCode: persisted.recurrentCode || "REC",
      demobilisationCode: persisted.demobilisationCode || "DEM",
      overhaulCode: persisted.overhaulCode || "OVH",
      renewalCode: persisted.renewalCode || "REN",
      warrantyStartDate: startOfProject,
      warrantyEndDate: addMonths(startOfProject, toNumber(persisted.warrantyDurationMonths) ?? defaultWarranty),
      phases: orderedPhases,
      nextCustomPhaseKey: getNextCustomProjectPhaseKey(persisted.phases || {}),
      nextPhaseKey: getProjectPhaseSequence().find((key) => !persisted.phases?.[key]?.enabled) || "",
    });
  });

  return Array.from(byProject.values()).sort((left, right) => left.projectName.localeCompare(right.projectName));
}

async function refreshProjectPhaseProjectsSource() {
  await initSharedStore();
  const localSharedWorkbooks = await getAllWorkbookData();
  const indexedDbBridgeWorkbooks = await loadIndexedDbBridgeWorkbooks();
  state.workbooks = mergeWorkbooksBySourceId(indexedDbBridgeWorkbooks, localSharedWorkbooks);
  syncWorkspaceLiteCache(state.workbooks);
}

async function saveProjectPhasesState(mutator) {
  if (!state.currentStudy?.studyId) return;

  const existingStudySetup = state.studyConfig?.studySetup || {};
  const currentProjects = { ...(existingStudySetup.projectPhases?.projects || {}) };
  const nextProjects = mutator(currentProjects) || currentProjects;

  state.studyConfig = await savePersistedStudyConfig(state.currentStudy.studyId, {
    studySetup: {
      ...existingStudySetup,
      projectPhases: {
        ...(existingStudySetup.projectPhases || {}),
        projects: nextProjects,
        updatedAt: new Date().toISOString(),
      },
    },
  });
  publishProjectPhasesBridge();
  updateToolbarStatusDots();
}

function renderProjectPhasesWorkspace() {
  const workspace = $("projectPhasesWorkspace");
  const list = $("projectPhasesProjectList");
  const empty = $("projectPhasesWorkspaceEmpty");
  const content = $("projectPhasesWorkspaceContent");
  const status = $("projectPhasesWorkspaceStatus");
  const title = $("projectPhasesCurrentProjectTitle");
  const meta = $("projectPhasesCurrentProjectMeta");
  const planningYear = $("projectPhasesPlanningYear");
  const derivedDuration = $("projectPhasesDerivedDuration");
  const identityGrid = $("projectPhasesIdentityGrid");
  const warrantyGrid = $("projectPhasesWarrantyGrid");
  const overhaulGrid = $("projectPhasesOverhaulGrid");
  const tableBody = $("projectPhasesTableBody");
  const addPhaseBtn = $("projectPhasesAddPhaseBtn");
  const addCustomPhaseBtn = $("projectPhasesAddCustomPhaseBtn");
  if (!workspace || !list || !empty || !content || !status || !title || !meta || !planningYear || !derivedDuration || !identityGrid || !warrantyGrid || !overhaulGrid || !tableBody || !addPhaseBtn) return;

  const projects = buildProjectPhaseProjects();
  if (!projects.length) {
    list.innerHTML = "";
    empty.classList.remove("hidden");
    content.classList.add("hidden");
    status.textContent = `No project available. Shared workbooks detected: ${state.workbooks.length}`;
    addPhaseBtn.disabled = true;
    addPhaseBtn.textContent = "Add phase";
    if (addCustomPhaseBtn) addCustomPhaseBtn.disabled = true;
    return;
  }

  if (!projects.some((project) => project.projectKey === state.currentProjectPhasesProjectKey)) {
    state.currentProjectPhasesProjectKey = projects[0].projectKey;
  }

  const currentProject = projects.find((project) => project.projectKey === state.currentProjectPhasesProjectKey) || projects[0];

  list.innerHTML = projects.map((project) => `
    <button
      type="button"
      data-project-phases-select="${escapeHtml(project.projectKey)}"
      class="w-full rounded-xl border px-3 py-3 text-left transition-all ${project.projectKey === currentProject.projectKey ? "border-emerald-300 bg-emerald-50 shadow-sm ring-1 ring-emerald-200" : "border-slate-200 bg-white hover:bg-slate-100"}"
    >
      <div class="text-sm font-semibold text-slate-900">${escapeHtml(project.projectName)}</div>
      <div class="mt-1 text-xs text-slate-500">${escapeHtml(project.projectContext || "No context")} | ${escapeHtml(project.serviceYear || "--")}</div>
    </button>
  `).join("");

  empty.classList.add("hidden");
  content.classList.remove("hidden");
  status.textContent = `${projects.length} project(s) available`;
  title.textContent = currentProject.projectName;
  meta.textContent = `${currentProject.projectType || "No project type"} | ${currentProject.projectContext || "No context"} | Service Year ${currentProject.serviceYear || "--"}`;
  planningYear.textContent = currentProject.planningYear || "--";
  derivedDuration.textContent = `${currentProject.derivedContractDurationYears || 0} year(s)`;

  identityGrid.innerHTML = `
    <label>
      <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Project Code</p>
      <input data-project-phase-field="projectCode" data-project-key="${escapeHtml(currentProject.projectKey)}" type="text" class="mt-1 w-full rounded-xl border-slate-200 px-3 py-2" value="${escapeHtml(currentProject.projectCode)}"/>
    </label>
    <label>
      <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Project Context</p>
      <input type="text" class="mt-1 w-full rounded-xl border-slate-200 px-3 py-2 bg-slate-100" value="${escapeHtml(currentProject.projectContext || "--")}" readonly/>
    </label>
    <label>
      <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Service Year</p>
      <input type="text" class="mt-1 w-full rounded-xl border-slate-200 px-3 py-2 bg-slate-100" value="${escapeHtml(currentProject.serviceYear || "--")}" readonly/>
    </label>
    <label>
      <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Start of the Project</p>
      <input data-project-phase-field="startOfProjectDate" data-project-key="${escapeHtml(currentProject.projectKey)}" type="date" class="mt-1 w-full rounded-xl border-slate-200 px-3 py-2" value="${escapeHtml(currentProject.startOfProjectDate)}"/>
    </label>
    <div class="rounded-xl border border-slate-200 bg-white px-4 py-3">
      <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Planning Year</p>
      <p class="mt-2 text-sm font-semibold">${escapeHtml(currentProject.planningYear || "--")}</p>
    </div>
    <div class="rounded-xl border border-slate-200 bg-white px-4 py-3">
      <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">correc_ovh_start_year / end_year</p>
      <p class="mt-2 text-sm font-semibold">${escapeHtml(currentProject.correcOvhStartYear || "--")} / ${escapeHtml(currentProject.correcOvhEndYear || "--")}</p>
    </div>
  `;

  warrantyGrid.innerHTML = `
    <label>
      <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Max Mobilisation Period (months)</p>
      <input data-project-phase-field="maxMobilisationMonths" data-project-key="${escapeHtml(currentProject.projectKey)}" type="number" min="0" class="mt-1 w-full rounded-xl border-slate-200 px-3 py-2" value="${escapeHtml(String(currentProject.maxMobilisationMonths))}"/>
    </label>
    <label>
      <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Mobilisation Phase Code</p>
      <input data-project-phase-field="mobilisationPhaseCode" data-project-key="${escapeHtml(currentProject.projectKey)}" type="text" class="mt-1 w-full rounded-xl border-slate-200 px-3 py-2" value="${escapeHtml(currentProject.mobilisationPhaseCode)}"/>
    </label>
    <label>
      <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Warranty Duration (months)</p>
      <input data-project-phase-field="warrantyDurationMonths" data-project-key="${escapeHtml(currentProject.projectKey)}" type="number" min="0" class="mt-1 w-full rounded-xl border-slate-200 px-3 py-2" value="${escapeHtml(String(currentProject.warrantyDurationMonths))}"/>
    </label>
    <label>
      <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Warranty Code</p>
      <input data-project-phase-field="warrantyCode" data-project-key="${escapeHtml(currentProject.projectKey)}" type="text" class="mt-1 w-full rounded-xl border-slate-200 px-3 py-2" value="${escapeHtml(currentProject.warrantyCode)}"/>
    </label>
    <label>
      <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Post Warranty Period Code</p>
      <input data-project-phase-field="postWarrantyCode" data-project-key="${escapeHtml(currentProject.projectKey)}" type="text" class="mt-1 w-full rounded-xl border-slate-200 px-3 py-2" value="${escapeHtml(currentProject.postWarrantyCode)}"/>
    </label>
    <label>
      <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Recurrent Code</p>
      <input data-project-phase-field="recurrentCode" data-project-key="${escapeHtml(currentProject.projectKey)}" type="text" class="mt-1 w-full rounded-xl border-slate-200 px-3 py-2" value="${escapeHtml(currentProject.recurrentCode)}"/>
    </label>
    <label>
      <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Demobilisation Code</p>
      <input data-project-phase-field="demobilisationCode" data-project-key="${escapeHtml(currentProject.projectKey)}" type="text" class="mt-1 w-full rounded-xl border-slate-200 px-3 py-2" value="${escapeHtml(currentProject.demobilisationCode)}"/>
    </label>
    <div class="rounded-xl border border-slate-200 bg-white px-4 py-3">
      <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Warranty Window</p>
      <p class="mt-2 text-sm font-semibold">${escapeHtml(formatDateDisplay(currentProject.warrantyStartDate))} -> ${escapeHtml(formatDateDisplay(currentProject.warrantyEndDate))}</p>
    </div>
  `;

  overhaulGrid.innerHTML = `
    <label>
      <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Overhaul Code</p>
      <input data-project-phase-field="overhaulCode" data-project-key="${escapeHtml(currentProject.projectKey)}" type="text" class="mt-1 w-full rounded-xl border-slate-200 px-3 py-2" value="${escapeHtml(currentProject.overhaulCode || "OVH")}"/>
    </label>
    <label>
      <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Renewal Code</p>
      <input data-project-phase-field="renewalCode" data-project-key="${escapeHtml(currentProject.projectKey)}" type="text" class="mt-1 w-full rounded-xl border-slate-200 px-3 py-2" value="${escapeHtml(currentProject.renewalCode || "REN")}"/>
    </label>
  `;

  tableBody.innerHTML = currentProject.phases.map((phase) => `
    <tr>
      <td class="py-3 pr-4">
        ${phase.manual
          ? `<input data-phase-field="label" data-project-key="${escapeHtml(currentProject.projectKey)}" data-phase-key="${escapeHtml(phase.key)}" type="text" class="w-full min-w-[140px] rounded-xl border-slate-200 px-3 py-2 font-semibold" value="${escapeHtml(phase.label)}"/>`
          : `<span class="font-semibold">${escapeHtml(phase.label)}</span>`}
      </td>
      <td class="py-3 px-4">
        <input
          data-phase-field="phaseCode"
          data-project-key="${escapeHtml(currentProject.projectKey)}"
          data-phase-key="${escapeHtml(phase.key)}"
          type="text"
          class="w-28 rounded-xl border-slate-200 px-3 py-2"
          value="${escapeHtml(phase.phaseCode || "")}"
        />
      </td>
      <td class="py-3 px-4 text-right">
        <input
          data-phase-field="durationYears"
          data-project-key="${escapeHtml(currentProject.projectKey)}"
          data-phase-key="${escapeHtml(phase.key)}"
          type="number"
          min="0"
          step="0.1"
          class="w-24 rounded-xl border-slate-200 px-3 py-2 text-right"
          value="${escapeHtml(String(phase.durationYears ?? 0))}"
        />
      </td>
      <td class="py-3 px-4">
        ${phase.key === "Total" || phase.manual
          ? `<input data-phase-field="startDate" data-project-key="${escapeHtml(currentProject.projectKey)}" data-phase-key="${escapeHtml(phase.key)}" type="date" class="rounded-xl border-slate-200 px-3 py-2" value="${escapeHtml(phase.startDate)}"/>`
          : `<span class="text-slate-600">${escapeHtml(formatDateDisplay(phase.startDate))}</span>`}
      </td>
      <td class="py-3 px-4">
        ${phase.key === "Total" || phase.manual
          ? `<input data-phase-field="endDate" data-project-key="${escapeHtml(currentProject.projectKey)}" data-phase-key="${escapeHtml(phase.key)}" type="date" class="rounded-xl border-slate-200 px-3 py-2" value="${escapeHtml(phase.endDate)}"/>`
          : `<span class="text-slate-600">${escapeHtml(formatDateDisplay(phase.endDate))}</span>`}
      </td>
      <td class="py-3 px-4">
        ${phase.manual
          ? `<input data-phase-field="postWarrantyStartDate" data-project-key="${escapeHtml(currentProject.projectKey)}" data-phase-key="${escapeHtml(phase.key)}" type="date" class="rounded-xl border-slate-200 px-3 py-2" value="${escapeHtml(phase.postWarrantyStartDate)}"/>`
          : `<span class="text-slate-600">${escapeHtml(formatDateDisplay(phase.postWarrantyStartDate))}</span>`}
      </td>
      <td class="py-3 px-4">
        ${phase.manual
          ? `<input data-phase-field="postWarrantyEndDate" data-project-key="${escapeHtml(currentProject.projectKey)}" data-phase-key="${escapeHtml(phase.key)}" type="date" class="rounded-xl border-slate-200 px-3 py-2" value="${escapeHtml(phase.postWarrantyEndDate)}"/>`
          : `<span class="text-slate-600">${escapeHtml(formatDateDisplay(phase.postWarrantyEndDate))}</span>`}
      </td>
      <td class="py-3 pl-4 text-right">
        ${phase.removable
          ? `<button type="button" data-project-phase-remove="${escapeHtml(currentProject.projectKey)}" data-phase-key="${escapeHtml(phase.key)}" class="inline-flex items-center gap-1 text-rose-600 hover:text-rose-700 font-semibold">
              <span class="material-symbols-outlined text-[16px]">delete</span>
              Remove
            </button>`
          : `<span class="text-xs text-slate-400">Mandatory</span>`}
      </td>
    </tr>
  `).join("");

  addPhaseBtn.disabled = !currentProject.nextPhaseKey;
  addPhaseBtn.innerHTML = `
    <span class="material-symbols-outlined text-[18px]">add</span>
    ${currentProject.nextPhaseKey ? `Add ${escapeHtml(currentProject.nextPhaseKey)}` : "No more phase"}
  `;
  addPhaseBtn.dataset.projectPhaseAdd = currentProject.projectKey;
  if (addCustomPhaseBtn) {
    addCustomPhaseBtn.dataset.projectCustomPhaseAdd = currentProject.projectKey;
    addCustomPhaseBtn.disabled = false;
  }
}

function renderGuidePlanningWorkspace() {
  const workspace = $("guidePlanningWorkspace");
  const projectList = $("guidePlanningProjectList");
  const empty = $("guidePlanningWorkspaceEmpty");
  const content = $("guidePlanningWorkspaceContent");
  const status = $("guidePlanningWorkspaceStatus");
  const title = $("guidePlanningCurrentProjectTitle");
  const meta = $("guidePlanningCurrentProjectMeta");
  const workloadSelector = $("guidePlanningMobilisationWorkloadSelector");
  const workloadTableBody = $("guidePlanningMobilisationWorkloadTableBody");
  const materialsSelector = $("guidePlanningMaterialsSelector");
  const materialsTableBody = $("guidePlanningMaterialsTableBody");
  const subcontractingSelector = $("guidePlanningSubcontractingSelector");
  const subcontractingTableBody = $("guidePlanningSubcontractingTableBody");
  const workloadAddRowBtn = $("guidePlanningWorkloadAddRowBtn");
  const materialsAddRowBtn = $("guidePlanningMaterialsAddRowBtn");
  const subcontractingAddRowBtn = $("guidePlanningSubcontractingAddRowBtn");
  const recurrentPlaceholder = $("guidePlanningRecurrentPlaceholder");
  const demobilisationPlaceholder = $("guidePlanningDemobilisationPlaceholder");
  const overhaulPlaceholder = $("guidePlanningOverhaulPlaceholder");
  const risksPlaceholder = $("guidePlanningRisksPlaceholder");
  if (!workspace || !projectList || !empty || !content || !status || !title || !meta || !workloadSelector || !workloadTableBody || !materialsSelector || !materialsTableBody || !subcontractingSelector || !subcontractingTableBody) return;

  const projects = buildGuidePlanningProjects();
  if (!projects.length) {
    projectList.innerHTML = "";
    empty.classList.remove("hidden");
    content.classList.add("hidden");
    workspace.classList.remove("hidden");
    status.textContent = `No project available. Shared workbooks detected: ${state.workbooks.length}`;
    return;
  }

  if (!projects.some((project) => project.projectKey === state.currentGuidePlanningProjectKey)) {
    state.currentGuidePlanningProjectKey = projects[0].projectKey;
  }

  const currentProject = projects.find((project) => project.projectKey === state.currentGuidePlanningProjectKey) || projects[0];

  projectList.innerHTML = projects.map((project) => `
    <button
      type="button"
      data-guide-planning-select="${escapeHtml(project.projectKey)}"
      class="min-w-[220px] rounded-xl border px-4 py-3 text-left transition-all ${project.projectKey === currentProject.projectKey ? "border-emerald-300 bg-emerald-50 shadow-sm ring-1 ring-emerald-200" : "border-slate-200 bg-white hover:bg-slate-100"}"
    >
      <div class="text-sm font-semibold text-slate-900">${escapeHtml(project.projectName)}</div>
      <div class="mt-1 text-xs text-slate-500">${escapeHtml(project.projectContext || "No context")} | Service Year ${escapeHtml(project.serviceYear || "--")}</div>
    </button>
  `).join("");

  workspace.classList.remove("hidden");
  empty.classList.add("hidden");
  content.classList.remove("hidden");
  status.textContent = `${projects.length} project(s) available`;
  title.textContent = currentProject.projectName;
  meta.textContent = `${currentProject.projectType || "No project type"} | ${currentProject.projectContext || "No context"} | Project Code ${currentProject.projectCode || "--"} | Mobilisation Code ${currentProject.mobilisationPhaseCode || "--"}`;
  if (workloadAddRowBtn) workloadAddRowBtn.dataset.projectKey = currentProject.projectKey;
  if (materialsAddRowBtn) materialsAddRowBtn.dataset.projectKey = currentProject.projectKey;
  if (subcontractingAddRowBtn) subcontractingAddRowBtn.dataset.projectKey = currentProject.projectKey;

  if (!currentProject.positions.length || !currentProject.eligiblePhases.length) {
    workloadSelector.innerHTML = `
      <div class="rounded-2xl border border-dashed border-slate-200 bg-white px-5 py-8 text-sm text-slate-500">
        ${!currentProject.positions.length
          ? "No applicable positions found yet. Configure positions first in Cost Centers Workspace."
          : "No project phase starts in the Service Year. Check Project Phases Workspace."}
      </div>
    `;
  } else {
    workloadSelector.innerHTML = `
      <details class="rounded-2xl border border-slate-200 bg-white p-4" open>
        <summary class="cursor-pointer text-sm font-bold text-slate-700">Applicable Positions <span class="text-slate-400 font-medium">| Applied to ${currentProject.eligiblePhases.length} phase(s)</span></summary>
        <p class="mt-3 text-xs text-slate-500">The same mobilization duration is applied to every eligible phase whose start year matches the Service Year. Phase distinction remains visible in the guide planning table below.</p>
        <div class="mt-4 grid grid-cols-1 xl:grid-cols-2 gap-3">
          ${currentProject.positions.map((position) => `
            <label class="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div class="flex items-center justify-between gap-4">
                <span class="text-sm font-semibold text-slate-800">${escapeHtml(position)}</span>
                <input
                  data-guide-mobilisation-months="true"
                  data-project-key="${escapeHtml(currentProject.projectKey)}"
                  data-position="${escapeHtml(position)}"
                  type="number"
                  min="0"
                  step="1"
                  class="w-24 rounded-xl border-slate-200 px-3 py-2 text-right"
                  value="${escapeHtml(String(toNumber(currentProject.workloadMonthsByPosition[position]) ?? 0))}"
                />
              </div>
              <p class="mt-2 text-xs text-slate-500">Mobilization months applied to all eligible phases for this position.</p>
            </label>
          `).join("")}
        </div>
      </details>
    `;
  }

  materialsSelector.innerHTML = currentProject.eligiblePhases.length
    ? currentProject.materialCatalog.map((materialType) => `
      <label class="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
        <input type="checkbox" data-guide-material-type="${escapeHtml(materialType)}" data-project-key="${escapeHtml(currentProject.projectKey)}" class="rounded border-slate-300 text-primary focus:ring-primary" ${currentProject.selectedMaterialTypes.includes(materialType) ? "checked" : ""}/>
        <span class="text-sm font-medium text-slate-700">${escapeHtml(materialType)}</span>
      </label>
    `).join("")
    : `<div class="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-6 text-sm text-slate-500">Materials mobilization is only available for phases starting in the Service Year.</div>`;

  materialsTableBody.innerHTML = currentProject.generatedMaterialRows.length
    ? currentProject.generatedMaterialRows.map((row) => `
      <tr>
        <td class="py-3 pr-4 font-semibold">${escapeHtml(row.phaseLabel)}</td>
        <td class="py-3 px-4 font-semibold">${escapeHtml(row.materialType)}</td>
        <td class="py-3 px-4">
          <div class="inline-flex items-center gap-2">
            <span>${escapeHtml(formatDateDisplay(row.startDate))}</span>
            <button type="button" data-guide-planning-material-edit="startDate" data-project-key="${escapeHtml(currentProject.projectKey)}" data-row-key="${escapeHtml(row.rowKey)}" data-current-value="${escapeHtml(row.startDate || "")}" class="inline-flex items-center justify-center size-7 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 transition-all">
              <span class="material-symbols-outlined text-[16px]">edit</span>
            </button>
          </div>
        </td>
        <td class="py-3 px-4">
          <div class="inline-flex items-center gap-2">
            <span>${escapeHtml(formatDateDisplay(row.endDate))}</span>
            <button type="button" data-guide-planning-material-edit="endDate" data-project-key="${escapeHtml(currentProject.projectKey)}" data-row-key="${escapeHtml(row.rowKey)}" data-current-value="${escapeHtml(row.endDate || "")}" class="inline-flex items-center justify-center size-7 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 transition-all">
              <span class="material-symbols-outlined text-[16px]">edit</span>
            </button>
          </div>
        </td>
        <td class="py-3 pl-4">
          <div class="inline-flex items-center gap-2">
            <span class="font-mono text-xs">${escapeHtml(row.guidePlanningCode)}</span>
            <button type="button" data-guide-planning-material-edit="guidePlanningCode" data-project-key="${escapeHtml(currentProject.projectKey)}" data-row-key="${escapeHtml(row.rowKey)}" data-current-value="${escapeHtml(row.guidePlanningCode || "")}" class="inline-flex items-center justify-center size-7 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 transition-all">
              <span class="material-symbols-outlined text-[16px]">edit</span>
            </button>
          </div>
        </td>
        <td class="py-3 pl-4 text-slate-300">--</td>
      </tr>
    `).join("")
    : ``;
  materialsTableBody.innerHTML += currentProject.customMaterialRows.map((row) => `
      <tr class="bg-amber-50/60">
        <td class="py-3 pr-4"><input data-guide-custom-row-field="phaseLabel" data-row-type="materials" data-project-key="${escapeHtml(currentProject.projectKey)}" data-row-id="${escapeHtml(row.id)}" type="text" class="w-full min-w-[120px] rounded-xl border-slate-200 px-3 py-2" value="${escapeHtml(row.phaseLabel || "")}"/></td>
        <td class="py-3 px-4"><input data-guide-custom-row-field="materialType" data-row-type="materials" data-project-key="${escapeHtml(currentProject.projectKey)}" data-row-id="${escapeHtml(row.id)}" type="text" class="w-full min-w-[120px] rounded-xl border-slate-200 px-3 py-2" value="${escapeHtml(row.materialType || "")}"/></td>
        <td class="py-3 px-4"><input data-guide-custom-row-field="startDate" data-row-type="materials" data-project-key="${escapeHtml(currentProject.projectKey)}" data-row-id="${escapeHtml(row.id)}" type="date" class="rounded-xl border-slate-200 px-3 py-2" value="${escapeHtml(row.startDate || "")}"/></td>
        <td class="py-3 px-4"><input data-guide-custom-row-field="endDate" data-row-type="materials" data-project-key="${escapeHtml(currentProject.projectKey)}" data-row-id="${escapeHtml(row.id)}" type="date" class="rounded-xl border-slate-200 px-3 py-2" value="${escapeHtml(row.endDate || "")}"/></td>
        <td class="py-3 pl-4"><input data-guide-custom-row-field="guidePlanningCode" data-row-type="materials" data-project-key="${escapeHtml(currentProject.projectKey)}" data-row-id="${escapeHtml(row.id)}" type="text" class="w-full min-w-[180px] rounded-xl border-slate-200 px-3 py-2 font-mono text-xs" value="${escapeHtml(row.guidePlanningCode || "")}"/></td>
        <td class="py-3 pl-4"><button type="button" data-guide-custom-row-remove="materials" data-project-key="${escapeHtml(currentProject.projectKey)}" data-row-id="${escapeHtml(row.id)}" class="inline-flex items-center justify-center size-8 rounded-lg border border-rose-200 bg-white text-rose-600 hover:bg-rose-50 transition-all"><span class="material-symbols-outlined text-[16px]">delete</span></button></td>
      </tr>
    `).join("");
  if (!currentProject.generatedMaterialRows.length && !currentProject.customMaterialRows.length) {
    materialsTableBody.innerHTML = `<tr><td colspan="6" class="py-6 text-center text-sm text-slate-500">No materials mobilization selected for this project.</td></tr>`;
  }

  subcontractingSelector.innerHTML = currentProject.eligiblePhases.length
    ? currentProject.subcontractingCatalog.map((subcontractingType) => `
      <label class="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
        <input type="checkbox" data-guide-subcontracting-type="${escapeHtml(subcontractingType)}" data-project-key="${escapeHtml(currentProject.projectKey)}" class="rounded border-slate-300 text-primary focus:ring-primary" ${currentProject.selectedSubcontractingTypes.includes(subcontractingType) ? "checked" : ""}/>
        <span class="text-sm font-medium text-slate-700">${escapeHtml(subcontractingType)}</span>
      </label>
    `).join("")
    : `<div class="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-6 text-sm text-slate-500">Subcontracting mobilization is only available for phases starting in the Service Year.</div>`;

  subcontractingTableBody.innerHTML = currentProject.generatedSubcontractingRows.length
    ? currentProject.generatedSubcontractingRows.map((row) => `
      <tr>
        <td class="py-3 pr-4 font-semibold">${escapeHtml(row.phaseLabel)}</td>
        <td class="py-3 px-4 font-semibold">${escapeHtml(row.subcontractingType)}</td>
        <td class="py-3 px-4">
          <div class="inline-flex items-center gap-2">
            <span>${escapeHtml(formatDateDisplay(row.startDate))}</span>
            <button type="button" data-guide-planning-subcontracting-edit="startDate" data-project-key="${escapeHtml(currentProject.projectKey)}" data-row-key="${escapeHtml(row.rowKey)}" data-current-value="${escapeHtml(row.startDate || "")}" class="inline-flex items-center justify-center size-7 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 transition-all">
              <span class="material-symbols-outlined text-[16px]">edit</span>
            </button>
          </div>
        </td>
        <td class="py-3 px-4">
          <div class="inline-flex items-center gap-2">
            <span>${escapeHtml(formatDateDisplay(row.endDate))}</span>
            <button type="button" data-guide-planning-subcontracting-edit="endDate" data-project-key="${escapeHtml(currentProject.projectKey)}" data-row-key="${escapeHtml(row.rowKey)}" data-current-value="${escapeHtml(row.endDate || "")}" class="inline-flex items-center justify-center size-7 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 transition-all">
              <span class="material-symbols-outlined text-[16px]">edit</span>
            </button>
          </div>
        </td>
        <td class="py-3 pl-4">
          <div class="inline-flex items-center gap-2">
            <span class="font-mono text-xs">${escapeHtml(row.guidePlanningCode)}</span>
            <button type="button" data-guide-planning-subcontracting-edit="guidePlanningCode" data-project-key="${escapeHtml(currentProject.projectKey)}" data-row-key="${escapeHtml(row.rowKey)}" data-current-value="${escapeHtml(row.guidePlanningCode || "")}" class="inline-flex items-center justify-center size-7 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 transition-all">
              <span class="material-symbols-outlined text-[16px]">edit</span>
            </button>
          </div>
        </td>
        <td class="py-3 pl-4 text-slate-300">--</td>
      </tr>
    `).join("")
    : ``;
  subcontractingTableBody.innerHTML += currentProject.customSubcontractingRows.map((row) => `
      <tr class="bg-amber-50/60">
        <td class="py-3 pr-4"><input data-guide-custom-row-field="phaseLabel" data-row-type="subcontracting" data-project-key="${escapeHtml(currentProject.projectKey)}" data-row-id="${escapeHtml(row.id)}" type="text" class="w-full min-w-[120px] rounded-xl border-slate-200 px-3 py-2" value="${escapeHtml(row.phaseLabel || "")}"/></td>
        <td class="py-3 px-4"><input data-guide-custom-row-field="subcontractingType" data-row-type="subcontracting" data-project-key="${escapeHtml(currentProject.projectKey)}" data-row-id="${escapeHtml(row.id)}" type="text" class="w-full min-w-[150px] rounded-xl border-slate-200 px-3 py-2" value="${escapeHtml(row.subcontractingType || "")}"/></td>
        <td class="py-3 px-4"><input data-guide-custom-row-field="startDate" data-row-type="subcontracting" data-project-key="${escapeHtml(currentProject.projectKey)}" data-row-id="${escapeHtml(row.id)}" type="date" class="rounded-xl border-slate-200 px-3 py-2" value="${escapeHtml(row.startDate || "")}"/></td>
        <td class="py-3 px-4"><input data-guide-custom-row-field="endDate" data-row-type="subcontracting" data-project-key="${escapeHtml(currentProject.projectKey)}" data-row-id="${escapeHtml(row.id)}" type="date" class="rounded-xl border-slate-200 px-3 py-2" value="${escapeHtml(row.endDate || "")}"/></td>
        <td class="py-3 pl-4"><input data-guide-custom-row-field="guidePlanningCode" data-row-type="subcontracting" data-project-key="${escapeHtml(currentProject.projectKey)}" data-row-id="${escapeHtml(row.id)}" type="text" class="w-full min-w-[180px] rounded-xl border-slate-200 px-3 py-2 font-mono text-xs" value="${escapeHtml(row.guidePlanningCode || "")}"/></td>
        <td class="py-3 pl-4"><button type="button" data-guide-custom-row-remove="subcontracting" data-project-key="${escapeHtml(currentProject.projectKey)}" data-row-id="${escapeHtml(row.id)}" class="inline-flex items-center justify-center size-8 rounded-lg border border-rose-200 bg-white text-rose-600 hover:bg-rose-50 transition-all"><span class="material-symbols-outlined text-[16px]">delete</span></button></td>
      </tr>
    `).join("");
  if (!currentProject.generatedSubcontractingRows.length && !currentProject.customSubcontractingRows.length) {
    subcontractingTableBody.innerHTML = `<tr><td colspan="6" class="py-6 text-center text-sm text-slate-500">No subcontracting mobilization selected for this project.</td></tr>`;
  }

  workloadTableBody.innerHTML = currentProject.generatedRows.length
    ? currentProject.generatedRows.map((row) => `
      <tr>
        <td class="py-3 pr-4 font-semibold">${escapeHtml(row.phaseLabel)}</td>
        <td class="py-3 px-4">${escapeHtml(row.position)}</td>
        <td class="py-3 px-4">
          <div class="inline-flex items-center gap-2">
            <span>${escapeHtml(formatDateDisplay(row.startDate))}</span>
            <button type="button" data-guide-planning-edit="startDate" data-project-key="${escapeHtml(currentProject.projectKey)}" data-row-key="${escapeHtml(row.rowKey)}" data-current-value="${escapeHtml(row.startDate || "")}" class="inline-flex items-center justify-center size-7 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 transition-all">
              <span class="material-symbols-outlined text-[16px]">edit</span>
            </button>
          </div>
        </td>
        <td class="py-3 px-4">
          <div class="inline-flex items-center gap-2">
            <span>${escapeHtml(formatDateDisplay(row.endDate))}</span>
            <button type="button" data-guide-planning-edit="endDate" data-project-key="${escapeHtml(currentProject.projectKey)}" data-row-key="${escapeHtml(row.rowKey)}" data-current-value="${escapeHtml(row.endDate || "")}" class="inline-flex items-center justify-center size-7 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 transition-all">
              <span class="material-symbols-outlined text-[16px]">edit</span>
            </button>
          </div>
        </td>
        <td class="py-3 pl-4">
          <div class="inline-flex items-center gap-2">
            <span class="font-mono text-xs">${escapeHtml(row.guidePlanningCode)}</span>
            <button type="button" data-guide-planning-edit="guidePlanningCode" data-project-key="${escapeHtml(currentProject.projectKey)}" data-row-key="${escapeHtml(row.rowKey)}" data-current-value="${escapeHtml(row.guidePlanningCode || "")}" class="inline-flex items-center justify-center size-7 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 transition-all">
              <span class="material-symbols-outlined text-[16px]">edit</span>
            </button>
          </div>
        </td>
        <td class="py-3 pl-4 text-slate-300">--</td>
      </tr>
    `).join("")
    : ``;
  workloadTableBody.innerHTML += currentProject.customWorkloadRows.map((row) => `
      <tr class="bg-amber-50/60">
        <td class="py-3 pr-4"><input data-guide-custom-row-field="phaseLabel" data-row-type="workload" data-project-key="${escapeHtml(currentProject.projectKey)}" data-row-id="${escapeHtml(row.id)}" type="text" class="w-full min-w-[120px] rounded-xl border-slate-200 px-3 py-2" value="${escapeHtml(row.phaseLabel || "")}"/></td>
        <td class="py-3 px-4"><input data-guide-custom-row-field="position" data-row-type="workload" data-project-key="${escapeHtml(currentProject.projectKey)}" data-row-id="${escapeHtml(row.id)}" type="text" class="w-full min-w-[140px] rounded-xl border-slate-200 px-3 py-2" value="${escapeHtml(row.position || "")}"/></td>
        <td class="py-3 px-4"><input data-guide-custom-row-field="startDate" data-row-type="workload" data-project-key="${escapeHtml(currentProject.projectKey)}" data-row-id="${escapeHtml(row.id)}" type="date" class="rounded-xl border-slate-200 px-3 py-2" value="${escapeHtml(row.startDate || "")}"/></td>
        <td class="py-3 px-4"><input data-guide-custom-row-field="endDate" data-row-type="workload" data-project-key="${escapeHtml(currentProject.projectKey)}" data-row-id="${escapeHtml(row.id)}" type="date" class="rounded-xl border-slate-200 px-3 py-2" value="${escapeHtml(row.endDate || "")}"/></td>
        <td class="py-3 pl-4"><input data-guide-custom-row-field="guidePlanningCode" data-row-type="workload" data-project-key="${escapeHtml(currentProject.projectKey)}" data-row-id="${escapeHtml(row.id)}" type="text" class="w-full min-w-[180px] rounded-xl border-slate-200 px-3 py-2 font-mono text-xs" value="${escapeHtml(row.guidePlanningCode || "")}"/></td>
        <td class="py-3 pl-4"><button type="button" data-guide-custom-row-remove="workload" data-project-key="${escapeHtml(currentProject.projectKey)}" data-row-id="${escapeHtml(row.id)}" class="inline-flex items-center justify-center size-8 rounded-lg border border-rose-200 bg-white text-rose-600 hover:bg-rose-50 transition-all"><span class="material-symbols-outlined text-[16px]">delete</span></button></td>
      </tr>
    `).join("");
  if (!currentProject.generatedRows.length && !currentProject.customWorkloadRows.length) {
    workloadTableBody.innerHTML = `<tr><td colspan="6" class="py-6 text-center text-sm text-slate-500">No mobilization row generated yet. Enter months above to populate the guide planning table.</td></tr>`;
  }

  if (recurrentPlaceholder) {
    recurrentPlaceholder.innerHTML = `
      <div class="space-y-4">
        <div class="rounded-2xl border border-slate-200 bg-white p-4">
          <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 class="text-sm font-bold text-slate-700">Workload</h3>
              <p class="mt-1 text-xs text-slate-500">Recurrent workload inherits the positions selected in Mobilization. One row is generated per phase, since all positions of the same phase share the same dates and guide planning code.</p>
            </div>
            <div class="text-xs font-medium text-slate-500">Recurrent Code ${escapeHtml(currentProject.recurrentCode || "REC")} | ${currentProject.positions.length} inherited position(s)</div>
          </div>
          ${!currentProject.positions.length
            ? `<div class="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">No positions available. Configure Mobilization / Cost Centers first.</div>`
            : !currentProject.recurrentWorkloadRows.length
              ? `<div class="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">No project phases available yet. Configure Project Phases first.</div>`
              : `
                <details class="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4" open>
                  <summary class="cursor-pointer text-sm font-bold text-slate-700">Recurrent Workload Guide Planning Table <span class="text-slate-400 font-medium">| ${currentProject.recurrentWorkloadRows.length} phase row(s)</span></summary>
                  <div class="mt-4 flex justify-end">
                    <button type="button" data-guide-custom-row-add="recurrent_workload" data-project-key="${escapeHtml(currentProject.projectKey)}" class="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-all">
                      <span class="material-symbols-outlined text-[16px]">add</span>
                      Add row
                    </button>
                  </div>
                  <div class="mt-4 overflow-x-auto">
                    <table class="min-w-full text-sm">
                      <thead class="bg-slate-100 text-slate-600">
                        <tr>
                          <th class="text-left py-3 px-4">Phase</th>
                          <th class="text-left py-3 px-4">Start date</th>
                          <th class="text-left py-3 px-4">End date</th>
                          <th class="text-left py-3 px-4">Guide planning code</th>
                          <th class="text-left py-3 px-4">Actions</th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-slate-200">
                        ${currentProject.recurrentWorkloadRows.map((row) => `
                          <tr>
                            <td class="py-3 px-4 font-semibold">${escapeHtml(row.phaseLabel)}</td>
                            <td class="py-3 px-4"><div class="inline-flex items-center gap-2"><span>${escapeHtml(formatDateDisplay(row.startDate))}</span><button type="button" data-guide-planning-edit="startDate" data-project-key="${escapeHtml(currentProject.projectKey)}" data-row-key="${escapeHtml(row.rowKey)}" data-current-value="${escapeHtml(row.startDate || "")}" class="inline-flex items-center justify-center size-7 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 transition-all"><span class="material-symbols-outlined text-[16px]">edit</span></button></div></td>
                            <td class="py-3 px-4"><div class="inline-flex items-center gap-2"><span>${escapeHtml(formatDateDisplay(row.endDate))}</span><button type="button" data-guide-planning-edit="endDate" data-project-key="${escapeHtml(currentProject.projectKey)}" data-row-key="${escapeHtml(row.rowKey)}" data-current-value="${escapeHtml(row.endDate || "")}" class="inline-flex items-center justify-center size-7 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 transition-all"><span class="material-symbols-outlined text-[16px]">edit</span></button></div></td>
                            <td class="py-3 px-4"><div class="inline-flex items-center gap-2"><span class="font-mono text-xs">${escapeHtml(row.guidePlanningCode)}</span><button type="button" data-guide-planning-edit="guidePlanningCode" data-project-key="${escapeHtml(currentProject.projectKey)}" data-row-key="${escapeHtml(row.rowKey)}" data-current-value="${escapeHtml(row.guidePlanningCode || "")}" class="inline-flex items-center justify-center size-7 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 transition-all"><span class="material-symbols-outlined text-[16px]">edit</span></button></div></td>
                            <td class="py-3 px-4 text-slate-300">--</td>
                          </tr>
                        `).join("")}
                        ${currentProject.customRecurrentWorkloadRows.map((row) => `
                          <tr class="bg-amber-50/60">
                            <td class="py-3 px-4"><input data-guide-custom-row-field="phaseLabel" data-row-type="recurrent_workload" data-project-key="${escapeHtml(currentProject.projectKey)}" data-row-id="${escapeHtml(row.id)}" type="text" class="w-full min-w-[120px] rounded-xl border-slate-200 px-3 py-2" value="${escapeHtml(row.phaseLabel || "")}"/></td>
                            <td class="py-3 px-4"><input data-guide-custom-row-field="startDate" data-row-type="recurrent_workload" data-project-key="${escapeHtml(currentProject.projectKey)}" data-row-id="${escapeHtml(row.id)}" type="date" class="rounded-xl border-slate-200 px-3 py-2" value="${escapeHtml(row.startDate || "")}"/></td>
                            <td class="py-3 px-4"><input data-guide-custom-row-field="endDate" data-row-type="recurrent_workload" data-project-key="${escapeHtml(currentProject.projectKey)}" data-row-id="${escapeHtml(row.id)}" type="date" class="rounded-xl border-slate-200 px-3 py-2" value="${escapeHtml(row.endDate || "")}"/></td>
                            <td class="py-3 px-4"><input data-guide-custom-row-field="guidePlanningCode" data-row-type="recurrent_workload" data-project-key="${escapeHtml(currentProject.projectKey)}" data-row-id="${escapeHtml(row.id)}" type="text" class="w-full min-w-[180px] rounded-xl border-slate-200 px-3 py-2 font-mono text-xs" value="${escapeHtml(row.guidePlanningCode || "")}"/></td>
                            <td class="py-3 px-4"><button type="button" data-guide-custom-row-remove="recurrent_workload" data-project-key="${escapeHtml(currentProject.projectKey)}" data-row-id="${escapeHtml(row.id)}" class="inline-flex items-center justify-center size-8 rounded-lg border border-rose-200 bg-white text-rose-600 hover:bg-rose-50 transition-all"><span class="material-symbols-outlined text-[16px]">delete</span></button></td>
                          </tr>
                        `).join("")}
                      </tbody>
                    </table>
                  </div>
                </details>
              `}
        </div>
        <div class="rounded-2xl border border-slate-200 bg-white p-4">
          <h3 class="text-sm font-bold text-slate-700">Materials</h3>
          <div class="mt-4 space-y-4">
            <details class="rounded-2xl border border-slate-200 bg-slate-50 p-4" open>
              <summary class="cursor-pointer text-sm font-bold text-slate-700">Recurrent Material Types</summary>
              <label class="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
                <input type="checkbox" data-guide-recurrent-material-toggle-all data-project-key="${escapeHtml(currentProject.projectKey)}" class="rounded border-slate-300 text-primary focus:ring-primary" ${currentProject.recurrentMaterialCatalog.length && currentProject.selectedRecurrentMaterialTypes.length === currentProject.recurrentMaterialCatalog.length ? "checked" : ""}/>
                <span class="text-sm font-semibold text-slate-700">Select all</span>
              </label>
              <div class="mt-4 flex flex-wrap gap-3">
                ${currentProject.recurrentMaterialCatalog.map((materialType) => `
                  <label class="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
                    <input type="checkbox" data-guide-recurrent-material-type="${escapeHtml(materialType)}" data-project-key="${escapeHtml(currentProject.projectKey)}" class="rounded border-slate-300 text-primary focus:ring-primary" ${currentProject.selectedRecurrentMaterialTypes.includes(materialType) ? "checked" : ""}/>
                    <span class="text-sm font-medium text-slate-700">${escapeHtml(materialType)}</span>
                  </label>
                `).join("")}
              </div>
            </details>
            <details class="rounded-2xl border border-slate-200 bg-slate-50 p-4" open>
              <summary class="cursor-pointer text-sm font-bold text-slate-700">Recurrent Materials Guide Planning Table <span class="text-slate-400 font-medium">| ${currentProject.recurrentMaterialRows.length} row(s)</span></summary>
              <div class="mt-4 flex justify-end">
                <button type="button" data-guide-custom-row-add="recurrent_materials" data-project-key="${escapeHtml(currentProject.projectKey)}" class="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-all">
                  <span class="material-symbols-outlined text-[16px]">add</span>
                  Add row
                </button>
              </div>
              <div class="mt-4 overflow-x-auto">
                <table class="min-w-full text-sm">
                  <thead class="bg-slate-100 text-slate-600">
                    <tr>
                      <th class="text-left py-3 px-4">Phase</th>
                      <th class="text-left py-3 px-4">Material type</th>
                      <th class="text-left py-3 px-4">Start date</th>
                      <th class="text-left py-3 px-4">End date</th>
                      <th class="text-left py-3 px-4">Guide planning code</th>
                      <th class="text-left py-3 px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-200">
                    ${currentProject.recurrentMaterialRows.length
                      ? currentProject.recurrentMaterialRows.map((row) => `
                        <tr>
                          <td class="py-3 px-4 font-semibold">${escapeHtml(row.phaseLabel)}</td>
                          <td class="py-3 px-4">${escapeHtml(row.materialType)}</td>
                          <td class="py-3 px-4"><div class="inline-flex items-center gap-2"><span>${escapeHtml(formatDateDisplay(row.startDate))}</span><button type="button" data-guide-planning-material-edit="startDate" data-project-key="${escapeHtml(currentProject.projectKey)}" data-row-key="${escapeHtml(row.rowKey)}" data-current-value="${escapeHtml(row.startDate || "")}" class="inline-flex items-center justify-center size-7 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 transition-all"><span class="material-symbols-outlined text-[16px]">edit</span></button></div></td>
                          <td class="py-3 px-4"><div class="inline-flex items-center gap-2"><span>${escapeHtml(formatDateDisplay(row.endDate))}</span><button type="button" data-guide-planning-material-edit="endDate" data-project-key="${escapeHtml(currentProject.projectKey)}" data-row-key="${escapeHtml(row.rowKey)}" data-current-value="${escapeHtml(row.endDate || "")}" class="inline-flex items-center justify-center size-7 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 transition-all"><span class="material-symbols-outlined text-[16px]">edit</span></button></div></td>
                          <td class="py-3 px-4"><div class="inline-flex items-center gap-2"><span class="font-mono text-xs">${escapeHtml(row.guidePlanningCode)}</span><button type="button" data-guide-planning-material-edit="guidePlanningCode" data-project-key="${escapeHtml(currentProject.projectKey)}" data-row-key="${escapeHtml(row.rowKey)}" data-current-value="${escapeHtml(row.guidePlanningCode || "")}" class="inline-flex items-center justify-center size-7 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 transition-all"><span class="material-symbols-outlined text-[16px]">edit</span></button></div></td>
                          <td class="py-3 px-4 text-slate-300">--</td>
                        </tr>
                      `).join("")
                      : `<tr><td colspan="6" class="py-6 text-center text-sm text-slate-500">No recurrent material row generated yet. Select at least one material type.</td></tr>`}
                    ${currentProject.customRecurrentMaterialRows.map((row) => `
                      <tr class="bg-amber-50/60">
                        <td class="py-3 px-4"><input data-guide-custom-row-field="phaseLabel" data-row-type="recurrent_materials" data-project-key="${escapeHtml(currentProject.projectKey)}" data-row-id="${escapeHtml(row.id)}" type="text" class="w-full min-w-[120px] rounded-xl border-slate-200 px-3 py-2" value="${escapeHtml(row.phaseLabel || "")}"/></td>
                        <td class="py-3 px-4"><input data-guide-custom-row-field="materialType" data-row-type="recurrent_materials" data-project-key="${escapeHtml(currentProject.projectKey)}" data-row-id="${escapeHtml(row.id)}" type="text" class="w-full min-w-[140px] rounded-xl border-slate-200 px-3 py-2" value="${escapeHtml(row.materialType || "")}"/></td>
                        <td class="py-3 px-4"><input data-guide-custom-row-field="startDate" data-row-type="recurrent_materials" data-project-key="${escapeHtml(currentProject.projectKey)}" data-row-id="${escapeHtml(row.id)}" type="date" class="rounded-xl border-slate-200 px-3 py-2" value="${escapeHtml(row.startDate || "")}"/></td>
                        <td class="py-3 px-4"><input data-guide-custom-row-field="endDate" data-row-type="recurrent_materials" data-project-key="${escapeHtml(currentProject.projectKey)}" data-row-id="${escapeHtml(row.id)}" type="date" class="rounded-xl border-slate-200 px-3 py-2" value="${escapeHtml(row.endDate || "")}"/></td>
                        <td class="py-3 px-4"><input data-guide-custom-row-field="guidePlanningCode" data-row-type="recurrent_materials" data-project-key="${escapeHtml(currentProject.projectKey)}" data-row-id="${escapeHtml(row.id)}" type="text" class="w-full min-w-[180px] rounded-xl border-slate-200 px-3 py-2 font-mono text-xs" value="${escapeHtml(row.guidePlanningCode || "")}"/></td>
                        <td class="py-3 px-4"><button type="button" data-guide-custom-row-remove="recurrent_materials" data-project-key="${escapeHtml(currentProject.projectKey)}" data-row-id="${escapeHtml(row.id)}" class="inline-flex items-center justify-center size-8 rounded-lg border border-rose-200 bg-white text-rose-600 hover:bg-rose-50 transition-all"><span class="material-symbols-outlined text-[16px]">delete</span></button></td>
                      </tr>
                    `).join("")}
                  </tbody>
                </table>
              </div>
            </details>
          </div>
        </div>
        <div class="rounded-2xl border border-slate-200 bg-white p-4">
          <h3 class="text-sm font-bold text-slate-700">Subcontracting Activities</h3>
          <div class="mt-4 space-y-4">
            <details class="rounded-2xl border border-slate-200 bg-slate-50 p-4" open>
              <summary class="cursor-pointer text-sm font-bold text-slate-700">Applicable Subcontracting Types</summary>
              <label class="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
                <input type="checkbox" data-guide-recurrent-subcontracting-toggle-all data-project-key="${escapeHtml(currentProject.projectKey)}" class="rounded border-slate-300 text-primary focus:ring-primary" ${currentProject.recurrentSubcontractingCatalog.length && currentProject.selectedRecurrentSubcontractingTypes.length === currentProject.recurrentSubcontractingCatalog.length ? "checked" : ""}/>
                <span class="text-sm font-semibold text-slate-700">Select all</span>
              </label>
              <div class="mt-4 flex flex-wrap gap-3">
                ${currentProject.recurrentSubcontractingCatalog.map((subcontractingType) => `
                  <label class="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
                    <input type="checkbox" data-guide-recurrent-subcontracting-type="${escapeHtml(subcontractingType)}" data-project-key="${escapeHtml(currentProject.projectKey)}" class="rounded border-slate-300 text-primary focus:ring-primary" ${currentProject.selectedRecurrentSubcontractingTypes.includes(subcontractingType) ? "checked" : ""}/>
                    <span class="text-sm font-medium text-slate-700">${escapeHtml(subcontractingType)}</span>
                  </label>
                `).join("")}
              </div>
            </details>
            <details class="rounded-2xl border border-slate-200 bg-slate-50 p-4" open>
              <summary class="cursor-pointer text-sm font-bold text-slate-700">Subcontracting Reccurent Guide Planning Table <span class="text-slate-400 font-medium">| ${currentProject.recurrentSubcontractingRows.length} row(s)</span></summary>
              <div class="mt-4 flex justify-end">
                <button type="button" data-guide-custom-row-add="recurrent_subcontracting" data-project-key="${escapeHtml(currentProject.projectKey)}" class="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-all">
                  <span class="material-symbols-outlined text-[16px]">add</span>
                  Add row
                </button>
              </div>
              <div class="mt-4 overflow-x-auto">
                <table class="min-w-full text-sm">
                  <thead class="bg-slate-100 text-slate-600">
                    <tr>
                      <th class="text-left py-3 px-4">Phase</th>
                      <th class="text-left py-3 px-4">Subcontracting Type</th>
                      <th class="text-left py-3 px-4">Start date</th>
                      <th class="text-left py-3 px-4">End date</th>
                      <th class="text-left py-3 px-4">Guide planning code</th>
                      <th class="text-left py-3 px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-200">
                    ${currentProject.recurrentSubcontractingRows.length
                      ? currentProject.recurrentSubcontractingRows.map((row) => `
                        <tr>
                          <td class="py-3 px-4 font-semibold">${escapeHtml(row.phaseLabel)}</td>
                          <td class="py-3 px-4">${escapeHtml(row.subcontractingType)}</td>
                          <td class="py-3 px-4"><div class="inline-flex items-center gap-2"><span>${escapeHtml(formatDateDisplay(row.startDate))}</span><button type="button" data-guide-planning-subcontracting-edit="startDate" data-project-key="${escapeHtml(currentProject.projectKey)}" data-row-key="${escapeHtml(row.rowKey)}" data-current-value="${escapeHtml(row.startDate || "")}" class="inline-flex items-center justify-center size-7 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 transition-all"><span class="material-symbols-outlined text-[16px]">edit</span></button></div></td>
                          <td class="py-3 px-4"><div class="inline-flex items-center gap-2"><span>${escapeHtml(formatDateDisplay(row.endDate))}</span><button type="button" data-guide-planning-subcontracting-edit="endDate" data-project-key="${escapeHtml(currentProject.projectKey)}" data-row-key="${escapeHtml(row.rowKey)}" data-current-value="${escapeHtml(row.endDate || "")}" class="inline-flex items-center justify-center size-7 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 transition-all"><span class="material-symbols-outlined text-[16px]">edit</span></button></div></td>
                          <td class="py-3 px-4"><div class="inline-flex items-center gap-2"><span class="font-mono text-xs">${escapeHtml(row.guidePlanningCode)}</span><button type="button" data-guide-planning-subcontracting-edit="guidePlanningCode" data-project-key="${escapeHtml(currentProject.projectKey)}" data-row-key="${escapeHtml(row.rowKey)}" data-current-value="${escapeHtml(row.guidePlanningCode || "")}" class="inline-flex items-center justify-center size-7 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 transition-all"><span class="material-symbols-outlined text-[16px]">edit</span></button></div></td>
                          <td class="py-3 px-4 text-slate-300">--</td>
                        </tr>
                      `).join("")
                      : `<tr><td colspan="6" class="py-6 text-center text-sm text-slate-500">No recurrent subcontracting row generated yet. Select at least one subcontracting type.</td></tr>`}
                    ${currentProject.customRecurrentSubcontractingRows.map((row) => `
                      <tr class="bg-amber-50/60">
                        <td class="py-3 px-4"><input data-guide-custom-row-field="phaseLabel" data-row-type="recurrent_subcontracting" data-project-key="${escapeHtml(currentProject.projectKey)}" data-row-id="${escapeHtml(row.id)}" type="text" class="w-full min-w-[120px] rounded-xl border-slate-200 px-3 py-2" value="${escapeHtml(row.phaseLabel || "")}"/></td>
                        <td class="py-3 px-4"><input data-guide-custom-row-field="subcontractingType" data-row-type="recurrent_subcontracting" data-project-key="${escapeHtml(currentProject.projectKey)}" data-row-id="${escapeHtml(row.id)}" type="text" class="w-full min-w-[160px] rounded-xl border-slate-200 px-3 py-2" value="${escapeHtml(row.subcontractingType || "")}"/></td>
                        <td class="py-3 px-4"><input data-guide-custom-row-field="startDate" data-row-type="recurrent_subcontracting" data-project-key="${escapeHtml(currentProject.projectKey)}" data-row-id="${escapeHtml(row.id)}" type="date" class="rounded-xl border-slate-200 px-3 py-2" value="${escapeHtml(row.startDate || "")}"/></td>
                        <td class="py-3 px-4"><input data-guide-custom-row-field="endDate" data-row-type="recurrent_subcontracting" data-project-key="${escapeHtml(currentProject.projectKey)}" data-row-id="${escapeHtml(row.id)}" type="date" class="rounded-xl border-slate-200 px-3 py-2" value="${escapeHtml(row.endDate || "")}"/></td>
                        <td class="py-3 px-4"><input data-guide-custom-row-field="guidePlanningCode" data-row-type="recurrent_subcontracting" data-project-key="${escapeHtml(currentProject.projectKey)}" data-row-id="${escapeHtml(row.id)}" type="text" class="w-full min-w-[180px] rounded-xl border-slate-200 px-3 py-2 font-mono text-xs" value="${escapeHtml(row.guidePlanningCode || "")}"/></td>
                        <td class="py-3 px-4"><button type="button" data-guide-custom-row-remove="recurrent_subcontracting" data-project-key="${escapeHtml(currentProject.projectKey)}" data-row-id="${escapeHtml(row.id)}" class="inline-flex items-center justify-center size-8 rounded-lg border border-rose-200 bg-white text-rose-600 hover:bg-rose-50 transition-all"><span class="material-symbols-outlined text-[16px]">delete</span></button></td>
                      </tr>
                    `).join("")}
                  </tbody>
                </table>
              </div>
            </details>
          </div>
        </div>
      </div>`;
  }
  if (demobilisationPlaceholder) {
    demobilisationPlaceholder.innerHTML = `
      <div class="space-y-4">
        <div class="rounded-2xl border border-slate-200 bg-white p-4">
          <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 class="text-sm font-bold text-slate-700">Workload</h3>
              <p class="mt-1 text-xs text-slate-500">Define one demobilization duration per position. It will be applied only to phases whose end year matches the last year of the project.</p>
            </div>
            <div class="text-xs font-medium text-slate-500">Demobilisation Code ${escapeHtml(currentProject.demobilisationCode || "DEM")} | Project end ${escapeHtml(formatDateDisplay(currentProject.endOfProjectDate))}</div>
          </div>
          ${!currentProject.positions.length
            ? `<div class="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">No applicable positions found yet. Configure positions first in Cost Centers Workspace.</div>`
            : !currentProject.demobilizationEligiblePhases.length
              ? `<div class="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">No phase ends in the last year of the project. Check Project Phases Workspace.</div>`
              : `
                <details class="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4" open>
                  <summary class="cursor-pointer text-sm font-bold text-slate-700">Applicable Positions <span class="text-slate-400 font-medium">| Applied to ${currentProject.demobilizationEligiblePhases.length} phase(s)</span></summary>
                  <div class="mt-4 grid grid-cols-1 xl:grid-cols-2 gap-3">
                    ${currentProject.positions.map((position) => `
                      <label class="rounded-xl border border-slate-200 bg-white px-4 py-3">
                        <div class="flex items-center justify-between gap-4">
                          <span class="text-sm font-semibold text-slate-800">${escapeHtml(position)}</span>
                          <input
                            data-guide-demobilisation-months="true"
                            data-project-key="${escapeHtml(currentProject.projectKey)}"
                            data-position="${escapeHtml(position)}"
                            type="number"
                            min="0"
                            step="1"
                            class="w-24 rounded-xl border-slate-200 px-3 py-2 text-right"
                            value="${escapeHtml(String(toNumber(currentProject.demobilizationWorkloadMonthsByPosition[position]) ?? 0))}"
                          />
                        </div>
                        <p class="mt-2 text-xs text-slate-500">Demobilization months applied to every eligible end-of-project phase for this position.</p>
                      </label>
                    `).join("")}
                  </div>
                </details>
                <details class="rounded-2xl border border-slate-200 bg-slate-50 p-4" open>
                  <summary class="cursor-pointer text-sm font-bold text-slate-700">Demobilization Workload Guide Planning Table <span class="text-slate-400 font-medium">| ${currentProject.generatedDemobilizationRows.length} row(s)</span></summary>
                  <div class="mt-4 flex justify-end">
                    <button type="button" data-guide-custom-row-add="demobilization_workload" data-project-key="${escapeHtml(currentProject.projectKey)}" class="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-all">
                      <span class="material-symbols-outlined text-[16px]">add</span>
                      Add row
                    </button>
                  </div>
                  <div class="mt-4 overflow-x-auto">
                    <table class="min-w-full text-sm">
                      <thead class="bg-slate-100 text-slate-600">
                        <tr>
                          <th class="text-left py-3 px-4">Phase</th>
                          <th class="text-left py-3 px-4">Position</th>
                          <th class="text-left py-3 px-4">Start date</th>
                          <th class="text-left py-3 px-4">End date</th>
                          <th class="text-left py-3 px-4">Guide planning code</th>
                          <th class="text-left py-3 px-4">Actions</th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-slate-200">
                        ${currentProject.generatedDemobilizationRows.length
                          ? currentProject.generatedDemobilizationRows.map((row) => `
                            <tr>
                              <td class="py-3 px-4 font-semibold">${escapeHtml(row.phaseLabel)}</td>
                              <td class="py-3 px-4">${escapeHtml(row.position)}</td>
                              <td class="py-3 px-4"><div class="inline-flex items-center gap-2"><span>${escapeHtml(formatDateDisplay(row.startDate))}</span><button type="button" data-guide-planning-edit="startDate" data-project-key="${escapeHtml(currentProject.projectKey)}" data-row-key="${escapeHtml(row.rowKey)}" data-current-value="${escapeHtml(row.startDate || "")}" class="inline-flex items-center justify-center size-7 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 transition-all"><span class="material-symbols-outlined text-[16px]">edit</span></button></div></td>
                              <td class="py-3 px-4"><div class="inline-flex items-center gap-2"><span>${escapeHtml(formatDateDisplay(row.endDate))}</span><button type="button" data-guide-planning-edit="endDate" data-project-key="${escapeHtml(currentProject.projectKey)}" data-row-key="${escapeHtml(row.rowKey)}" data-current-value="${escapeHtml(row.endDate || "")}" class="inline-flex items-center justify-center size-7 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 transition-all"><span class="material-symbols-outlined text-[16px]">edit</span></button></div></td>
                              <td class="py-3 px-4"><div class="inline-flex items-center gap-2"><span class="font-mono text-xs">${escapeHtml(row.guidePlanningCode)}</span><button type="button" data-guide-planning-edit="guidePlanningCode" data-project-key="${escapeHtml(currentProject.projectKey)}" data-row-key="${escapeHtml(row.rowKey)}" data-current-value="${escapeHtml(row.guidePlanningCode || "")}" class="inline-flex items-center justify-center size-7 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 transition-all"><span class="material-symbols-outlined text-[16px]">edit</span></button></div></td>
                              <td class="py-3 px-4 text-slate-300">--</td>
                            </tr>
                          `).join("")
                          : ""}
                        ${currentProject.customDemobilizationWorkloadRows.map((row) => `
                          <tr class="bg-amber-50/60">
                            <td class="py-3 px-4"><input data-guide-custom-row-field="phaseLabel" data-row-type="demobilization_workload" data-project-key="${escapeHtml(currentProject.projectKey)}" data-row-id="${escapeHtml(row.id)}" type="text" class="w-full min-w-[120px] rounded-xl border-slate-200 px-3 py-2" value="${escapeHtml(row.phaseLabel || "")}"/></td>
                            <td class="py-3 px-4"><input data-guide-custom-row-field="position" data-row-type="demobilization_workload" data-project-key="${escapeHtml(currentProject.projectKey)}" data-row-id="${escapeHtml(row.id)}" type="text" class="w-full min-w-[140px] rounded-xl border-slate-200 px-3 py-2" value="${escapeHtml(row.position || "")}"/></td>
                            <td class="py-3 px-4"><input data-guide-custom-row-field="startDate" data-row-type="demobilization_workload" data-project-key="${escapeHtml(currentProject.projectKey)}" data-row-id="${escapeHtml(row.id)}" type="date" class="rounded-xl border-slate-200 px-3 py-2" value="${escapeHtml(row.startDate || "")}"/></td>
                            <td class="py-3 px-4"><input data-guide-custom-row-field="endDate" data-row-type="demobilization_workload" data-project-key="${escapeHtml(currentProject.projectKey)}" data-row-id="${escapeHtml(row.id)}" type="date" class="rounded-xl border-slate-200 px-3 py-2" value="${escapeHtml(row.endDate || "")}"/></td>
                            <td class="py-3 px-4"><input data-guide-custom-row-field="guidePlanningCode" data-row-type="demobilization_workload" data-project-key="${escapeHtml(currentProject.projectKey)}" data-row-id="${escapeHtml(row.id)}" type="text" class="w-full min-w-[180px] rounded-xl border-slate-200 px-3 py-2 font-mono text-xs" value="${escapeHtml(row.guidePlanningCode || "")}"/></td>
                            <td class="py-3 px-4"><button type="button" data-guide-custom-row-remove="demobilization_workload" data-project-key="${escapeHtml(currentProject.projectKey)}" data-row-id="${escapeHtml(row.id)}" class="inline-flex items-center justify-center size-8 rounded-lg border border-rose-200 bg-white text-rose-600 hover:bg-rose-50 transition-all"><span class="material-symbols-outlined text-[16px]">delete</span></button></td>
                          </tr>
                        `).join("")}
                        ${!currentProject.generatedDemobilizationRows.length && !currentProject.customDemobilizationWorkloadRows.length
                          ? `<tr><td colspan="6" class="py-6 text-center text-sm text-slate-500">No demobilization workload row generated yet. Enter months above to populate the table.</td></tr>`
                          : ""}
                      </tbody>
                    </table>
                  </div>
                </details>
              `}
        </div>
        <div class="rounded-2xl border border-slate-200 bg-white p-4">
          <h3 class="text-sm font-bold text-slate-700">Materials</h3>
          ${!currentProject.demobilizationEligiblePhases.length
            ? `<div class="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">No phase ends in the last year of the project. Check Project Phases Workspace.</div>`
            : `
              <div class="mt-4 space-y-4">
                <details class="rounded-2xl border border-slate-200 bg-slate-50 p-4" open>
                  <summary class="cursor-pointer text-sm font-bold text-slate-700">Demobilisation Material Types</summary>
                  <div class="mt-4 grid grid-cols-1 xl:grid-cols-2 gap-3">
                    ${currentProject.demobilizationMaterialCatalog.map((materialType) => `
                      <label class="rounded-xl border border-slate-200 bg-white px-4 py-3">
                        <div class="flex items-center justify-between gap-4">
                          <span class="text-sm font-semibold text-slate-800">${escapeHtml(materialType)}</span>
                          <input
                            data-guide-demobilisation-material-months="true"
                            data-project-key="${escapeHtml(currentProject.projectKey)}"
                            data-material-type="${escapeHtml(materialType)}"
                            type="number"
                            min="0"
                            step="1"
                            class="w-24 rounded-xl border-slate-200 px-3 py-2 text-right"
                            value="${escapeHtml(String(toNumber(currentProject.demobilizationMaterialMonthsByType[materialType]) ?? 0))}"
                          />
                        </div>
                        <p class="mt-2 text-xs text-slate-500">Set the demobilization duration in months for this material type.</p>
                      </label>
                    `).join("")}
                  </div>
                </details>
                <details class="rounded-2xl border border-slate-200 bg-slate-50 p-4" open>
                  <summary class="cursor-pointer text-sm font-bold text-slate-700">Demobilization Materials Guide Planning Table <span class="text-slate-400 font-medium">| ${currentProject.generatedDemobilizationMaterialRows.length} row(s)</span></summary>
                  <div class="mt-4 flex justify-end">
                    <button type="button" data-guide-custom-row-add="demobilization_materials" data-project-key="${escapeHtml(currentProject.projectKey)}" class="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-all">
                      <span class="material-symbols-outlined text-[16px]">add</span>
                      Add row
                    </button>
                  </div>
                  <div class="mt-4 overflow-x-auto">
                    <table class="min-w-full text-sm">
                      <thead class="bg-slate-100 text-slate-600">
                        <tr>
                          <th class="text-left py-3 px-4">Phase</th>
                          <th class="text-left py-3 px-4">Material type</th>
                          <th class="text-left py-3 px-4">Start date</th>
                          <th class="text-left py-3 px-4">End date</th>
                          <th class="text-left py-3 px-4">Guide planning code</th>
                          <th class="text-left py-3 px-4">Actions</th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-slate-200">
                        ${currentProject.generatedDemobilizationMaterialRows.length
                          ? currentProject.generatedDemobilizationMaterialRows.map((row) => `
                            <tr>
                              <td class="py-3 px-4 font-semibold">${escapeHtml(row.phaseLabel)}</td>
                              <td class="py-3 px-4">${escapeHtml(row.materialType)}</td>
                              <td class="py-3 px-4"><div class="inline-flex items-center gap-2"><span>${escapeHtml(formatDateDisplay(row.startDate))}</span><button type="button" data-guide-planning-material-edit="startDate" data-project-key="${escapeHtml(currentProject.projectKey)}" data-row-key="${escapeHtml(row.rowKey)}" data-current-value="${escapeHtml(row.startDate || "")}" class="inline-flex items-center justify-center size-7 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 transition-all"><span class="material-symbols-outlined text-[16px]">edit</span></button></div></td>
                              <td class="py-3 px-4"><div class="inline-flex items-center gap-2"><span>${escapeHtml(formatDateDisplay(row.endDate))}</span><button type="button" data-guide-planning-material-edit="endDate" data-project-key="${escapeHtml(currentProject.projectKey)}" data-row-key="${escapeHtml(row.rowKey)}" data-current-value="${escapeHtml(row.endDate || "")}" class="inline-flex items-center justify-center size-7 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 transition-all"><span class="material-symbols-outlined text-[16px]">edit</span></button></div></td>
                              <td class="py-3 px-4"><div class="inline-flex items-center gap-2"><span class="font-mono text-xs">${escapeHtml(row.guidePlanningCode)}</span><button type="button" data-guide-planning-material-edit="guidePlanningCode" data-project-key="${escapeHtml(currentProject.projectKey)}" data-row-key="${escapeHtml(row.rowKey)}" data-current-value="${escapeHtml(row.guidePlanningCode || "")}" class="inline-flex items-center justify-center size-7 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 transition-all"><span class="material-symbols-outlined text-[16px]">edit</span></button></div></td>
                              <td class="py-3 px-4 text-slate-300">--</td>
                            </tr>
                          `).join("")
                          : ""}
                        ${currentProject.customDemobilizationMaterialRows.map((row) => `
                          <tr class="bg-amber-50/60">
                            <td class="py-3 px-4"><input data-guide-custom-row-field="phaseLabel" data-row-type="demobilization_materials" data-project-key="${escapeHtml(currentProject.projectKey)}" data-row-id="${escapeHtml(row.id)}" type="text" class="w-full min-w-[120px] rounded-xl border-slate-200 px-3 py-2" value="${escapeHtml(row.phaseLabel || "")}"/></td>
                            <td class="py-3 px-4"><input data-guide-custom-row-field="materialType" data-row-type="demobilization_materials" data-project-key="${escapeHtml(currentProject.projectKey)}" data-row-id="${escapeHtml(row.id)}" type="text" class="w-full min-w-[140px] rounded-xl border-slate-200 px-3 py-2" value="${escapeHtml(row.materialType || "")}"/></td>
                            <td class="py-3 px-4"><input data-guide-custom-row-field="startDate" data-row-type="demobilization_materials" data-project-key="${escapeHtml(currentProject.projectKey)}" data-row-id="${escapeHtml(row.id)}" type="date" class="rounded-xl border-slate-200 px-3 py-2" value="${escapeHtml(row.startDate || "")}"/></td>
                            <td class="py-3 px-4"><input data-guide-custom-row-field="endDate" data-row-type="demobilization_materials" data-project-key="${escapeHtml(currentProject.projectKey)}" data-row-id="${escapeHtml(row.id)}" type="date" class="rounded-xl border-slate-200 px-3 py-2" value="${escapeHtml(row.endDate || "")}"/></td>
                            <td class="py-3 px-4"><input data-guide-custom-row-field="guidePlanningCode" data-row-type="demobilization_materials" data-project-key="${escapeHtml(currentProject.projectKey)}" data-row-id="${escapeHtml(row.id)}" type="text" class="w-full min-w-[180px] rounded-xl border-slate-200 px-3 py-2 font-mono text-xs" value="${escapeHtml(row.guidePlanningCode || "")}"/></td>
                            <td class="py-3 px-4"><button type="button" data-guide-custom-row-remove="demobilization_materials" data-project-key="${escapeHtml(currentProject.projectKey)}" data-row-id="${escapeHtml(row.id)}" class="inline-flex items-center justify-center size-8 rounded-lg border border-rose-200 bg-white text-rose-600 hover:bg-rose-50 transition-all"><span class="material-symbols-outlined text-[16px]">delete</span></button></td>
                          </tr>
                        `).join("")}
                        ${!currentProject.generatedDemobilizationMaterialRows.length && !currentProject.customDemobilizationMaterialRows.length
                          ? `<tr><td colspan="6" class="py-6 text-center text-sm text-slate-500">No demobilization material row generated yet. Enter months above to populate the table.</td></tr>`
                          : ""}
                      </tbody>
                    </table>
                  </div>
                </details>
              </div>
            `}
        </div>
        <div class="rounded-2xl border border-slate-200 bg-white p-4">
          <h3 class="text-sm font-bold text-slate-700">Subcontracting Activities</h3>
          ${!currentProject.demobilizationEligiblePhases.length
            ? `<div class="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">No phase ends in the last year of the project. Check Project Phases Workspace.</div>`
            : `
              <div class="mt-4 space-y-4">
                <details class="rounded-2xl border border-slate-200 bg-slate-50 p-4" open>
                  <summary class="cursor-pointer text-sm font-bold text-slate-700">Applicable Subcontracting Types</summary>
                  <div class="mt-4 grid grid-cols-1 xl:grid-cols-2 gap-3">
                    ${currentProject.demobilizationSubcontractingCatalog.map((subcontractingType) => `
                      <label class="rounded-xl border border-slate-200 bg-white px-4 py-3">
                        <div class="flex items-center justify-between gap-4">
                          <span class="text-sm font-semibold text-slate-800">${escapeHtml(subcontractingType)}</span>
                          <input
                            data-guide-demobilisation-subcontracting-months="true"
                            data-project-key="${escapeHtml(currentProject.projectKey)}"
                            data-subcontracting-type="${escapeHtml(subcontractingType)}"
                            type="number"
                            min="0"
                            step="1"
                            class="w-24 rounded-xl border-slate-200 px-3 py-2 text-right"
                            value="${escapeHtml(String(toNumber(currentProject.demobilizationSubcontractingMonthsByType[subcontractingType]) ?? 0))}"
                          />
                        </div>
                        <p class="mt-2 text-xs text-slate-500">Set the demobilization duration in months for this subcontracting type.</p>
                      </label>
                    `).join("")}
                  </div>
                </details>
                <details class="rounded-2xl border border-slate-200 bg-slate-50 p-4" open>
                  <summary class="cursor-pointer text-sm font-bold text-slate-700">Demobilization Subcontracting Guide Planning Table <span class="text-slate-400 font-medium">| ${currentProject.generatedDemobilizationSubcontractingRows.length} row(s)</span></summary>
                  <div class="mt-4 flex justify-end">
                    <button type="button" data-guide-custom-row-add="demobilization_subcontracting" data-project-key="${escapeHtml(currentProject.projectKey)}" class="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-all">
                      <span class="material-symbols-outlined text-[16px]">add</span>
                      Add row
                    </button>
                  </div>
                  <div class="mt-4 overflow-x-auto">
                    <table class="min-w-full text-sm">
                      <thead class="bg-slate-100 text-slate-600">
                        <tr>
                          <th class="text-left py-3 px-4">Phase</th>
                          <th class="text-left py-3 px-4">Subcontracting type</th>
                          <th class="text-left py-3 px-4">Start date</th>
                          <th class="text-left py-3 px-4">End date</th>
                          <th class="text-left py-3 px-4">Guide planning code</th>
                          <th class="text-left py-3 px-4">Actions</th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-slate-200">
                        ${currentProject.generatedDemobilizationSubcontractingRows.length
                          ? currentProject.generatedDemobilizationSubcontractingRows.map((row) => `
                            <tr>
                              <td class="py-3 px-4 font-semibold">${escapeHtml(row.phaseLabel)}</td>
                              <td class="py-3 px-4">${escapeHtml(row.subcontractingType)}</td>
                              <td class="py-3 px-4"><div class="inline-flex items-center gap-2"><span>${escapeHtml(formatDateDisplay(row.startDate))}</span><button type="button" data-guide-planning-subcontracting-edit="startDate" data-project-key="${escapeHtml(currentProject.projectKey)}" data-row-key="${escapeHtml(row.rowKey)}" data-current-value="${escapeHtml(row.startDate || "")}" class="inline-flex items-center justify-center size-7 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 transition-all"><span class="material-symbols-outlined text-[16px]">edit</span></button></div></td>
                              <td class="py-3 px-4"><div class="inline-flex items-center gap-2"><span>${escapeHtml(formatDateDisplay(row.endDate))}</span><button type="button" data-guide-planning-subcontracting-edit="endDate" data-project-key="${escapeHtml(currentProject.projectKey)}" data-row-key="${escapeHtml(row.rowKey)}" data-current-value="${escapeHtml(row.endDate || "")}" class="inline-flex items-center justify-center size-7 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 transition-all"><span class="material-symbols-outlined text-[16px]">edit</span></button></div></td>
                              <td class="py-3 px-4"><div class="inline-flex items-center gap-2"><span class="font-mono text-xs">${escapeHtml(row.guidePlanningCode)}</span><button type="button" data-guide-planning-subcontracting-edit="guidePlanningCode" data-project-key="${escapeHtml(currentProject.projectKey)}" data-row-key="${escapeHtml(row.rowKey)}" data-current-value="${escapeHtml(row.guidePlanningCode || "")}" class="inline-flex items-center justify-center size-7 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 transition-all"><span class="material-symbols-outlined text-[16px]">edit</span></button></div></td>
                              <td class="py-3 px-4 text-slate-300">--</td>
                            </tr>
                          `).join("")
                          : ""}
                        ${currentProject.customDemobilizationSubcontractingRows.map((row) => `
                          <tr class="bg-amber-50/60">
                            <td class="py-3 px-4"><input data-guide-custom-row-field="phaseLabel" data-row-type="demobilization_subcontracting" data-project-key="${escapeHtml(currentProject.projectKey)}" data-row-id="${escapeHtml(row.id)}" type="text" class="w-full min-w-[120px] rounded-xl border-slate-200 px-3 py-2" value="${escapeHtml(row.phaseLabel || "")}"/></td>
                            <td class="py-3 px-4"><input data-guide-custom-row-field="subcontractingType" data-row-type="demobilization_subcontracting" data-project-key="${escapeHtml(currentProject.projectKey)}" data-row-id="${escapeHtml(row.id)}" type="text" class="w-full min-w-[160px] rounded-xl border-slate-200 px-3 py-2" value="${escapeHtml(row.subcontractingType || "")}"/></td>
                            <td class="py-3 px-4"><input data-guide-custom-row-field="startDate" data-row-type="demobilization_subcontracting" data-project-key="${escapeHtml(currentProject.projectKey)}" data-row-id="${escapeHtml(row.id)}" type="date" class="rounded-xl border-slate-200 px-3 py-2" value="${escapeHtml(row.startDate || "")}"/></td>
                            <td class="py-3 px-4"><input data-guide-custom-row-field="endDate" data-row-type="demobilization_subcontracting" data-project-key="${escapeHtml(currentProject.projectKey)}" data-row-id="${escapeHtml(row.id)}" type="date" class="rounded-xl border-slate-200 px-3 py-2" value="${escapeHtml(row.endDate || "")}"/></td>
                            <td class="py-3 px-4"><input data-guide-custom-row-field="guidePlanningCode" data-row-type="demobilization_subcontracting" data-project-key="${escapeHtml(currentProject.projectKey)}" data-row-id="${escapeHtml(row.id)}" type="text" class="w-full min-w-[180px] rounded-xl border-slate-200 px-3 py-2 font-mono text-xs" value="${escapeHtml(row.guidePlanningCode || "")}"/></td>
                            <td class="py-3 px-4"><button type="button" data-guide-custom-row-remove="demobilization_subcontracting" data-project-key="${escapeHtml(currentProject.projectKey)}" data-row-id="${escapeHtml(row.id)}" class="inline-flex items-center justify-center size-8 rounded-lg border border-rose-200 bg-white text-rose-600 hover:bg-rose-50 transition-all"><span class="material-symbols-outlined text-[16px]">delete</span></button></td>
                          </tr>
                        `).join("")}
                        ${!currentProject.generatedDemobilizationSubcontractingRows.length && !currentProject.customDemobilizationSubcontractingRows.length
                          ? `<tr><td colspan="6" class="py-6 text-center text-sm text-slate-500">No demobilization subcontracting row generated yet. Enter months above to populate the table.</td></tr>`
                          : ""}
                      </tbody>
                    </table>
                  </div>
                </details>
              </div>
            `}
        </div>
      </div>`;
  }
  if (overhaulPlaceholder) {
    const overhaulTotalRows = currentProject.overhaulRenewalRows.length + currentProject.customOverhaulRenewalRows.length;
    overhaulPlaceholder.innerHTML = `
      <details class="rounded-2xl border border-slate-200 bg-slate-50 p-4" open>
        <summary class="cursor-pointer text-sm font-bold text-slate-700">Overhaul & Renewals Guide Planning Table <span class="text-slate-400 font-medium">| ${overhaulTotalRows} row(s)</span></summary>
        ${!currentProject.subsystems.length
          ? `<div class="mt-4 rounded-xl border border-dashed border-slate-200 bg-white px-4 py-6 text-sm text-slate-500">No subsystem found for this project. Check PIO Definition / Synthesis data, or add rows manually.</div>`
          : ``}
        <div class="mt-4 flex justify-end">
              <button type="button" data-guide-custom-row-add="overhaul_renewals" data-project-key="${escapeHtml(currentProject.projectKey)}" class="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-all">
                <span class="material-symbols-outlined text-[16px]">add</span>
                Add row
              </button>
            </div>
            <div class="mt-4 overflow-x-auto">
              <table class="min-w-full text-sm">
                <thead class="bg-slate-100 text-slate-600">
                  <tr>
                    <th class="text-left py-3 px-4">Phase</th>
                    <th class="text-left py-3 px-4">Subsystem</th>
                    <th class="text-left py-3 px-4">Overhaul guide planning code</th>
                    <th class="text-left py-3 px-4">Renewal guide planning code</th>
                    <th class="text-left py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-200">
                  ${currentProject.overhaulRenewalRows.length
                    ? currentProject.overhaulRenewalRows.map((row) => `
                      <tr>
                        <td class="py-3 px-4 font-semibold">${escapeHtml(row.phaseLabel)}</td>
                        <td class="py-3 px-4">${escapeHtml(row.subsystem)}</td>
                        <td class="py-3 px-4"><div class="inline-flex items-center gap-2"><span class="font-mono text-xs">${escapeHtml(row.overhaulGuidePlanningCode)}</span><button type="button" data-guide-planning-overhaul-edit="overhaulGuidePlanningCode" data-project-key="${escapeHtml(currentProject.projectKey)}" data-row-key="${escapeHtml(row.rowKey)}" data-current-value="${escapeHtml(row.overhaulGuidePlanningCode || "")}" class="inline-flex items-center justify-center size-7 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 transition-all"><span class="material-symbols-outlined text-[16px]">edit</span></button></div></td>
                        <td class="py-3 px-4"><div class="inline-flex items-center gap-2"><span class="font-mono text-xs">${escapeHtml(row.renewalGuidePlanningCode)}</span><button type="button" data-guide-planning-overhaul-edit="renewalGuidePlanningCode" data-project-key="${escapeHtml(currentProject.projectKey)}" data-row-key="${escapeHtml(row.rowKey)}" data-current-value="${escapeHtml(row.renewalGuidePlanningCode || "")}" class="inline-flex items-center justify-center size-7 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 transition-all"><span class="material-symbols-outlined text-[16px]">edit</span></button></div></td>
                        <td class="py-3 px-4 text-slate-300">--</td>
                      </tr>
                    `).join("")
                    : ``}
                  ${currentProject.customOverhaulRenewalRows.map((row) => `
                    <tr class="bg-amber-50/60">
                      <td class="py-3 px-4"><input data-guide-custom-row-field="phaseLabel" data-row-type="overhaul_renewals" data-project-key="${escapeHtml(currentProject.projectKey)}" data-row-id="${escapeHtml(row.id)}" type="text" class="w-full min-w-[120px] rounded-xl border-slate-200 px-3 py-2" value="${escapeHtml(row.phaseLabel || "")}"/></td>
                      <td class="py-3 px-4"><input data-guide-custom-row-field="subsystem" data-row-type="overhaul_renewals" data-project-key="${escapeHtml(currentProject.projectKey)}" data-row-id="${escapeHtml(row.id)}" type="text" class="w-full min-w-[140px] rounded-xl border-slate-200 px-3 py-2" value="${escapeHtml(row.subsystem || "")}"/></td>
                      <td class="py-3 px-4"><input data-guide-custom-row-field="overhaulGuidePlanningCode" data-row-type="overhaul_renewals" data-project-key="${escapeHtml(currentProject.projectKey)}" data-row-id="${escapeHtml(row.id)}" type="text" class="w-full min-w-[220px] rounded-xl border-slate-200 px-3 py-2 font-mono text-xs" value="${escapeHtml(row.overhaulGuidePlanningCode || "")}"/></td>
                      <td class="py-3 px-4"><input data-guide-custom-row-field="renewalGuidePlanningCode" data-row-type="overhaul_renewals" data-project-key="${escapeHtml(currentProject.projectKey)}" data-row-id="${escapeHtml(row.id)}" type="text" class="w-full min-w-[220px] rounded-xl border-slate-200 px-3 py-2 font-mono text-xs" value="${escapeHtml(row.renewalGuidePlanningCode || "")}"/></td>
                      <td class="py-3 px-4"><button type="button" data-guide-custom-row-remove="overhaul_renewals" data-project-key="${escapeHtml(currentProject.projectKey)}" data-row-id="${escapeHtml(row.id)}" class="inline-flex items-center justify-center size-8 rounded-lg border border-rose-200 bg-white text-rose-600 hover:bg-rose-50 transition-all"><span class="material-symbols-outlined text-[16px]">delete</span></button></td>
                    </tr>
                  `).join("")}
                  ${!currentProject.overhaulRenewalRows.length && !currentProject.customOverhaulRenewalRows.length
                    ? `<tr><td colspan="5" class="py-6 text-center text-sm text-slate-500">No overhaul or renewal row generated yet.</td></tr>`
                    : ``}
                </tbody>
              </table>
            </div>
      </details>`;
  }
  if (risksPlaceholder) {
    risksPlaceholder.innerHTML = `
      <details class="rounded-2xl border border-slate-200 bg-slate-50 p-4" open>
        <summary class="cursor-pointer text-sm font-bold text-slate-700">Risks Table <span class="text-slate-400 font-medium">| ${currentProject.riskRows.length} row(s)</span></summary>
        <div class="mt-4 flex justify-end">
          <button type="button" data-guide-risk-row-add data-project-key="${escapeHtml(currentProject.projectKey)}" class="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-all">
            <span class="material-symbols-outlined text-[16px]">add</span>
            Add row
          </button>
        </div>
        <div class="mt-4 overflow-x-auto">
          <table class="min-w-full text-sm">
            <thead class="bg-slate-100 text-slate-600">
              <tr>
                <th class="text-left py-3 px-4">Risk Description</th>
                <th class="text-left py-3 px-4">Guide planning code</th>
                <th class="text-left py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200">
              ${currentProject.riskRows.map((row) => `
                <tr class="bg-amber-50/60">
                  <td class="py-3 px-4"><input data-guide-risk-field="riskDescription" data-project-key="${escapeHtml(currentProject.projectKey)}" data-row-id="${escapeHtml(row.id)}" type="text" class="w-full min-w-[280px] rounded-xl border-slate-200 px-3 py-2" value="${escapeHtml(row.riskDescription || "")}"/></td>
                  <td class="py-3 px-4">
                    <select data-guide-risk-field="guidePlanningCode" data-project-key="${escapeHtml(currentProject.projectKey)}" data-row-id="${escapeHtml(row.id)}" class="w-full min-w-[260px] rounded-xl border-slate-200 px-3 py-2">
                      <option value="">Select guide planning code</option>
                      ${currentProject.riskGuidePlanningOptions.map((code) => `<option value="${escapeHtml(code)}" ${code === row.guidePlanningCode ? "selected" : ""}>${escapeHtml(code)}</option>`).join("")}
                    </select>
                  </td>
                  <td class="py-3 px-4"><button type="button" data-guide-risk-row-remove data-project-key="${escapeHtml(currentProject.projectKey)}" data-row-id="${escapeHtml(row.id)}" class="inline-flex items-center justify-center size-8 rounded-lg border border-rose-200 bg-white text-rose-600 hover:bg-rose-50 transition-all"><span class="material-symbols-outlined text-[16px]">delete</span></button></td>
                </tr>
              `).join("")}
              ${!currentProject.riskRows.length
                ? `<tr><td colspan="3" class="py-6 text-center text-sm text-slate-500">${currentProject.riskGuidePlanningOptions.length ? "No risk defined yet." : "No guide planning code available yet from the other periods."}</td></tr>`
                : ``}
            </tbody>
          </table>
        </div>
      </details>`;
  }
}

async function persistDraft(draft) {
  try {
    const mergedDraft = {
      ...DEFAULT_COST_SUMMARY_DRAFT,
      ...draft,
    };

    state.draft = await saveCostSummaryDraft(mergedDraft);

    if (state.currentStudy?.studyId) {
      const studyId = state.currentStudy.studyId;
      state.studyConfig = await savePersistedStudyConfig(studyId, {
        workspaceDraft: mergedDraft,
      });
      state.currentStudy = await updateStudy(studyId, {
        name: mergedDraft.studyName,
        targetCurrency: mergedDraft.targetCurrency,
        scenario: mergedDraft.scenario,
        sourceStrategy: mergedDraft.sourceStrategy,
        exportMode: mergedDraft.exportMode,
        includeAuditTrail: mergedDraft.includeAuditTrail,
        lockFormulaSheet: mergedDraft.lockFormulaSheet,
      });
      setLastOpenStudyId(studyId);
      state.studies = await listStudies();
    }

    clearRuntimeAlert();
    renderStudyWorkspace();

    const label = $("draftSavedLabel");
    if (label) {
      label.textContent = `Draft saved ${new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`;
    }
  } catch (error) {
    console.error("Cost Summary draft persistence failed:", error);
    setRuntimeAlert(`Unable to persist the current study configuration. ${error?.message || ""}`.trim());
  }
}

function renderCalculationBlocks() {
  const body = $("calculationBlocksBody");
  if (!body) return;
  body.innerHTML = calculationBlocks.map((item) => `
    <tr>
      <td class="py-3 pr-4 font-semibold">${item.block}</td>
      <td class="py-3 px-4 text-slate-600">${item.purpose}</td>
      <td class="py-3 px-4 text-slate-500">${item.dependency}</td>
      <td class="py-3 pl-4">
        <span class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${item.status === "Ready for detailed design" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-600 border border-slate-200"}">
          ${item.status}
        </span>
      </td>
    </tr>
  `).join("");
}

function renderWorkbookOutline() {
  const container = $("workbookOutline");
  if (!container) return;
  container.innerHTML = workbookOutline.map((item, index) => `
    <div class="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
      <span class="inline-flex items-center justify-center size-7 rounded-full bg-white border border-slate-200 text-xs font-bold text-slate-500">${index + 1}</span>
      <span class="text-sm font-semibold">${item}</span>
    </div>
  `).join("");
}

function applyDraftToForm(draft) {
  const studyNameInput = $("studyNameInput");
  const targetCurrencySelect = $("targetCurrencySelect");
  const outputFileNameInput = $("outputFileNameInput");
  const scenarioSelect = $("scenarioSelect");
  const sourceStrategySelect = $("sourceStrategySelect");
  const exportModeSelect = $("exportModeSelect");
  const includeAuditTrail = $("includeAuditTrail");
  const lockFormulaSheet = $("lockFormulaSheet");
  const notesInput = $("notesInput");

  if (studyNameInput) studyNameInput.value = draft.studyName;
  if (targetCurrencySelect) targetCurrencySelect.value = draft.targetCurrency;
  if (outputFileNameInput) outputFileNameInput.value = draft.outputFileName;
  if (scenarioSelect) scenarioSelect.value = draft.scenario;
  if (sourceStrategySelect) sourceStrategySelect.value = draft.sourceStrategy;
  if (exportModeSelect) exportModeSelect.value = draft.exportMode;
  if (includeAuditTrail) includeAuditTrail.checked = draft.includeAuditTrail;
  if (lockFormulaSheet) lockFormulaSheet.checked = draft.lockFormulaSheet;
  if (notesInput) notesInput.value = draft.notes;
}

function readDraftFromForm() {
  return {
    studyName: $("studyNameInput")?.value?.trim?.() || DEFAULT_COST_SUMMARY_DRAFT.studyName,
    targetCurrency: $("targetCurrencySelect")?.value || DEFAULT_COST_SUMMARY_DRAFT.targetCurrency,
    outputFileName: $("outputFileNameInput")?.value?.trim?.() || DEFAULT_COST_SUMMARY_DRAFT.outputFileName,
    scenario: $("scenarioSelect")?.value || DEFAULT_COST_SUMMARY_DRAFT.scenario,
    sourceStrategy: $("sourceStrategySelect")?.value || DEFAULT_COST_SUMMARY_DRAFT.sourceStrategy,
    exportMode: $("exportModeSelect")?.value || DEFAULT_COST_SUMMARY_DRAFT.exportMode,
    includeAuditTrail: $("includeAuditTrail")?.checked ?? DEFAULT_COST_SUMMARY_DRAFT.includeAuditTrail,
    lockFormulaSheet: $("lockFormulaSheet")?.checked ?? DEFAULT_COST_SUMMARY_DRAFT.lockFormulaSheet,
    notes: $("notesInput")?.value || DEFAULT_COST_SUMMARY_DRAFT.notes,
  };
}

function refreshStatus(draft) {
  const scopeStatus = $("scopeStatus");
  const integrationStatus = $("integrationStatus");
  const exportStatus = $("exportStatus");
  const dataSourceStatus = $("dataSourceStatus");
  if (scopeStatus) {
    scopeStatus.textContent = draft.notes.trim()
      ? "Draft definition captured locally"
      : "Draft definition in progress";
  }
  if (integrationStatus) {
    integrationStatus.textContent =
      draft.sourceStrategy === "shared_dashboard_files"
        ? "Planned to reuse dashboard files later"
        : draft.sourceStrategy === "dedicated_upload"
          ? "Planned dedicated upload flow"
          : "Hybrid input flow planned";
  }
  if (exportStatus) {
    exportStatus.textContent = `${draft.exportMode === "single_workbook" ? "Single workbook" : "Multi-sheet package"} - placeholder only`;
  }
  if (dataSourceStatus) {
    const workbookCount = state.workbooks.length;
    dataSourceStatus.textContent = workbookCount
      ? `${workbookCount} shared workbook(s) detected from the dashboard store`
      : "No shared workbook detected yet";
  }
}

function renderActiveSharedWorkspace() {
  if (state.activeDrawerModuleKey === "study_setup:project_phases") {
    renderProjectPhasesWorkspace();
  }
  if (state.activeDrawerModuleKey === "study_setup:guide_planning_definition") {
    renderGuidePlanningWorkspace();
  }
  if (state.activeDrawerModuleKey === "organization_risks:cost_centers") {
    renderCostCentersWorkspace();
  }
  if (state.activeDrawerModuleKey === "data_sources:currency_exchange_rates") {
    renderCurrencyExchangeWorkspace();
  }
  if (state.activeDrawerModuleKey === "study_setup:pio_definition_freight_customs") {
    renderPioDefinitionWorkspace();
  }
}

function setupEvents() {
  const inputs = [
    "studyNameInput",
    "targetCurrencySelect",
    "outputFileNameInput",
    "scenarioSelect",
    "sourceStrategySelect",
    "exportModeSelect",
    "includeAuditTrail",
    "lockFormulaSheet",
    "notesInput",
  ];

  inputs.forEach((id) => {
    const element = $(id);
    if (!element) return;
    const eventName = element.tagName === "TEXTAREA" || element.type === "text" ? "input" : "change";
    element.addEventListener(eventName, async () => {
      const draft = readDraftFromForm();
      await persistDraft(draft);
      refreshStatus(draft);
    });
  });

  $("previewConfigBtn")?.addEventListener("click", () => {
    const draft = readDraftFromForm();
    refreshStatus(draft);
    alert(
      [
        `Study: ${draft.studyName || "--"}`,
        `Target currency: ${draft.targetCurrency}`,
        `Source strategy: ${draft.sourceStrategy}`,
        `Export mode: ${draft.exportMode}`,
        `Audit trail: ${draft.includeAuditTrail ? "Yes" : "No"}`,
        `Lock formula sheet: ${draft.lockFormulaSheet ? "Yes" : "No"}`,
      ].join("\n")
    );
  });

  $("resetDraftBtn")?.addEventListener("click", async () => {
    const draft = { ...DEFAULT_COST_SUMMARY_DRAFT };
    applyDraftToForm(draft);
    await persistDraft(draft);
    refreshStatus(draft);
  });

  $("toggleThemeBtn")?.addEventListener("click", () => {
    document.documentElement.classList.toggle("dark");
  });

  $("refreshSharedStoreBtn")?.addEventListener("click", async () => {
    await refreshSharedSnapshot();
    renderActiveSharedWorkspace();
  });

  $("cleanSharedStoreBtn")?.addEventListener("click", async () => {
    const confirmed = window.confirm("Clean old Source Data imports and keep only the latest workbook for each project/type/file?");
    if (!confirmed) return;

    try {
      const result = await cleanupSharedWorkbookStore();
      await refreshSharedSnapshot();
      renderActiveSharedWorkspace();
      const status = $("projectPreviewStatus");
      if (status) {
        status.textContent = `Cleaned Source Data: kept ${result.keptCount}, removed ${result.removedDuplicateCount} duplicate(s), removed ${result.removedMissingCount} orphan index item(s).`;
      }
    } catch (error) {
      window.alert(`Unable to clean Source Data. ${error?.message || "Unknown error."}`);
    }
  });

  $("closeProjectPhasesWorkspaceBtn")?.addEventListener("click", () => {
    closeProjectPhasesWorkspace();
    state.activeDrawerModuleKey = "";
  });

  $("refreshProjectPhasesWorkspaceBtn")?.addEventListener("click", async () => {
    await refreshProjectPhaseProjectsSource();
    renderProjectPhasesWorkspace();
  });

  $("closeCostCentersWorkspaceBtn")?.addEventListener("click", () => {
    closeCostCentersWorkspace();
    state.activeDrawerModuleKey = "";
  });

  $("refreshCostCentersWorkspaceBtn")?.addEventListener("click", async () => {
    await refreshCostCentersSource();
    renderCostCentersWorkspace();
  });

  $("closeCurrencyExchangeWorkspaceBtn")?.addEventListener("click", () => {
    closeCurrencyExchangeWorkspace();
    state.activeDrawerModuleKey = "";
  });

  $("refreshCurrencyExchangeWorkspaceBtn")?.addEventListener("click", async () => {
    await refreshCurrencyExchangeSource();
    renderCurrencyExchangeWorkspace();
  });

  $("closeGuidePlanningWorkspaceBtn")?.addEventListener("click", () => {
    closeGuidePlanningWorkspace();
    state.activeDrawerModuleKey = "";
  });

  $("refreshGuidePlanningWorkspaceBtn")?.addEventListener("click", async () => {
    await refreshGuidePlanningSource();
    renderGuidePlanningWorkspace();
  });

  $("closePioDefinitionWorkspaceBtn")?.addEventListener("click", () => {
    closePioDefinitionWorkspace();
    state.activeDrawerModuleKey = "";
  });

  $("refreshPioDefinitionWorkspaceBtn")?.addEventListener("click", async () => {
    await refreshPioDefinitionSource();
    renderPioDefinitionWorkspace();
  });

  $("studySelector")?.addEventListener("change", async (event) => {
    const studyId = event.target?.value || "";
    await switchToStudy(studyId);
  });

  $("newStudyBtn")?.addEventListener("click", async () => {
    const inputName = window.prompt("Study name", "Cost Summary & MI - New Study");
    if (inputName === null) return;
    const studyName = inputName.trim() || "Cost Summary & MI - New Study";
    const baseDraft = readDraftFromForm();
    const study = await createStudy({
      name: studyName,
      targetCurrency: baseDraft.targetCurrency,
      scenario: baseDraft.scenario,
      sourceStrategy: baseDraft.sourceStrategy,
      exportMode: baseDraft.exportMode,
      includeAuditTrail: baseDraft.includeAuditTrail,
      lockFormulaSheet: baseDraft.lockFormulaSheet,
    });
    await savePersistedStudyConfig(study.studyId, {
      workspaceDraft: {
        ...DEFAULT_COST_SUMMARY_DRAFT,
        ...baseDraft,
        studyName,
      },
    });
    state.studies = await listStudies();
    await switchToStudy(study.studyId);
  });

  $("renameStudyBtn")?.addEventListener("click", async () => {
    if (!state.currentStudy?.studyId) return;
    const inputName = window.prompt("Rename study", state.currentStudy.name || "");
    if (inputName === null) return;
    const studyName = inputName.trim();
    if (!studyName) return;
    state.currentStudy = await updateStudy(state.currentStudy.studyId, { name: studyName });
    state.studies = await listStudies();
    state.draft = {
      ...state.draft,
      studyName,
    };
    applyDraftToForm(state.draft);
    renderStudyWorkspace();
  });

  $("deleteStudyBtn")?.addEventListener("click", async () => {
    if (!state.currentStudy?.studyId) return;
    const confirmed = window.confirm(`Delete study "${state.currentStudy.name}"?`);
    if (!confirmed) return;
    const deletedStudyId = state.currentStudy.studyId;
    await deleteStudy(deletedStudyId);
    state.studies = await listStudies();
    state.currentStudy = await ensureDefaultStudy({
      name: DEFAULT_COST_SUMMARY_DRAFT.studyName,
      targetCurrency: state.draft.targetCurrency,
      scenario: state.draft.scenario,
      sourceStrategy: state.draft.sourceStrategy,
      exportMode: state.draft.exportMode,
      includeAuditTrail: state.draft.includeAuditTrail,
      lockFormulaSheet: state.draft.lockFormulaSheet,
    });
    state.studies = await listStudies();
    await switchToStudy(state.currentStudy.studyId);
  });

  document.addEventListener("change", async (event) => {
    const projectField = event.target.closest("[data-project-phase-field]");
    if (projectField && state.activeDrawerModuleKey === "study_setup:project_phases") {
      const projectKey = projectField.getAttribute("data-project-key") || "";
      const field = projectField.getAttribute("data-project-phase-field") || "";
      const rawValue = projectField.value;
      await saveProjectPhasesState((projects) => {
        const current = { ...(projects[projectKey] || {}), phases: { ...((projects[projectKey] || {}).phases || {}) } };
        current[field] = ["maxMobilisationMonths", "warrantyDurationMonths"].includes(field)
          ? (toNumber(rawValue) ?? 0)
          : rawValue;
        projects[projectKey] = current;
        return projects;
      });
      renderProjectPhasesWorkspace();
      return;
    }

    const phaseField = event.target.closest("[data-phase-field]");
    if (phaseField && state.activeDrawerModuleKey === "study_setup:project_phases") {
      const projectKey = phaseField.getAttribute("data-project-key") || "";
      const phaseKey = phaseField.getAttribute("data-phase-key") || "";
      const field = phaseField.getAttribute("data-phase-field") || "";
      const rawValue = phaseField.value;
      await saveProjectPhasesState((projects) => {
        const current = { ...(projects[projectKey] || {}) };
        const phases = { ...(current.phases || {}) };
        const phase = { ...(phases[phaseKey] || {}) };
        phase.enabled = true;
        phase[field] = field === "durationYears" ? (toNumber(rawValue) ?? 0) : rawValue;
        phases[phaseKey] = phase;
        current.phases = phases;
        projects[projectKey] = current;
        return projects;
      });
      renderProjectPhasesWorkspace();
      return;
    }

    const projectCurrencySelect = event.target.closest("#costCentersProjectCurrencySelect");
    if (projectCurrencySelect && state.activeDrawerModuleKey === "organization_risks:cost_centers") {
      const projectKey = projectCurrencySelect.dataset.projectKey || "";
      await saveSingleCostCentersProject(projectKey, (current) => {
        current.projectCurrency = projectCurrencySelect.value || "EUR";
        return current;
      });
      renderCostCentersWorkspace();
      return;
    }

    const annualHoursInput = event.target.closest("#costCentersAnnualHoursInput");
    if (annualHoursInput && state.activeDrawerModuleKey === "organization_risks:cost_centers") {
      const projectKey = annualHoursInput.dataset.projectKey || "";
      await saveSingleCostCentersProject(projectKey, (current) => {
        current.annualWorkingHours = toNumber(annualHoursInput.value) ?? 0;
        return current;
      });
      renderCostCentersWorkspace();
      return;
    }

    const nightPremiumToggle = event.target.closest("#costCentersNightPremiumToggle");
    if (nightPremiumToggle && state.activeDrawerModuleKey === "organization_risks:cost_centers") {
      const projectKey = nightPremiumToggle.dataset.projectKey || "";
      await saveSingleCostCentersProject(projectKey, (current) => {
        current.nightPremiumEnabled = !!nightPremiumToggle.checked;
        return current;
      });
      renderCostCentersWorkspace();
      return;
    }

    const nightPremiumPercent = event.target.closest("#costCentersNightPremiumPercent");
    if (nightPremiumPercent && state.activeDrawerModuleKey === "organization_risks:cost_centers") {
      const projectKey = nightPremiumPercent.dataset.projectKey || "";
      await saveSingleCostCentersProject(projectKey, (current) => {
        current.nightPremiumPercent = toNumber(nightPremiumPercent.value) ?? 0;
        return current;
      });
      renderCostCentersWorkspace();
      return;
    }

    const currencyExchangeTargetCurrencySelect = event.target.closest("#currencyExchangeTargetCurrencySelect");
    if (currencyExchangeTargetCurrencySelect && state.activeDrawerModuleKey === "data_sources:currency_exchange_rates") {
      const projectKey = currencyExchangeTargetCurrencySelect.dataset.projectKey || "";
      await saveSingleCurrencyExchangeProject(projectKey, (current) => {
        current.targetCurrency = String(currencyExchangeTargetCurrencySelect.value || "EUR").toUpperCase();
        return current;
      });
      renderCurrencyExchangeWorkspace();
      return;
    }

    const currencyExchangeManualInput = event.target.closest("[data-currency-exchange-manual]");
    if (currencyExchangeManualInput && state.activeDrawerModuleKey === "data_sources:currency_exchange_rates") {
      const projectKey = currencyExchangeManualInput.getAttribute("data-project-key") || "";
      const currency = String(currencyExchangeManualInput.getAttribute("data-currency") || "").toUpperCase();
      await saveSingleCurrencyExchangeProject(projectKey, (current) => {
        current.manualOverrides = { ...(current.manualOverrides || {}) };
        const value = toNumber(currencyExchangeManualInput.value);
        if (value === null || value <= 0) delete current.manualOverrides[currency];
        else current.manualOverrides[currency] = value;
        return current;
      });
      renderCurrencyExchangeWorkspace();
      return;
    }

    const guideMobilisationMonthsInput = event.target.closest("[data-guide-mobilisation-months]");
    if (guideMobilisationMonthsInput && state.activeDrawerModuleKey === "study_setup:guide_planning_definition") {
      const projectKey = guideMobilisationMonthsInput.getAttribute("data-project-key") || "";
      const position = guideMobilisationMonthsInput.getAttribute("data-position") || "";
      await saveSingleGuidePlanningProject(projectKey, (current) => {
        current.mobilizationWorkloadMonthsByPosition = {
          ...(current.mobilizationWorkloadMonthsByPosition || {}),
          [position]: Math.max(0, toNumber(guideMobilisationMonthsInput.value) ?? 0),
        };
        return current;
      });
      renderGuidePlanningWorkspace();
      return;
    }

    const guideMaterialTypeField = event.target.closest("[data-guide-material-type]");
    if (guideMaterialTypeField && state.activeDrawerModuleKey === "study_setup:guide_planning_definition") {
      const projectKey = guideMaterialTypeField.getAttribute("data-project-key") || "";
      const selectedMaterialTypes = Array.from(document.querySelectorAll(`[data-guide-material-type][data-project-key="${projectKey}"]:checked`))
        .map((input) => input.getAttribute("data-guide-material-type") || "")
        .filter(Boolean);
      await saveSingleGuidePlanningProject(projectKey, (current) => {
        current.selectedMaterialTypes = selectedMaterialTypes;
        return current;
      });
      renderGuidePlanningWorkspace();
      return;
    }

    const guideRecurrentMaterialTypeField = event.target.closest("[data-guide-recurrent-material-type]");
    if (guideRecurrentMaterialTypeField && state.activeDrawerModuleKey === "study_setup:guide_planning_definition") {
      const projectKey = guideRecurrentMaterialTypeField.getAttribute("data-project-key") || "";
      const selectedRecurrentMaterialTypes = Array.from(document.querySelectorAll(`[data-guide-recurrent-material-type][data-project-key="${projectKey}"]:checked`))
        .map((input) => input.getAttribute("data-guide-recurrent-material-type") || "")
        .filter(Boolean);
      await saveSingleGuidePlanningProject(projectKey, (current) => {
        current.selectedRecurrentMaterialTypes = selectedRecurrentMaterialTypes;
        return current;
      });
      renderGuidePlanningWorkspace();
      return;
    }

    const guideRecurrentMaterialToggleAll = event.target.closest("[data-guide-recurrent-material-toggle-all]");
    if (guideRecurrentMaterialToggleAll && state.activeDrawerModuleKey === "study_setup:guide_planning_definition") {
      const projectKey = guideRecurrentMaterialToggleAll.getAttribute("data-project-key") || "";
      const project = buildGuidePlanningProjects().find((item) => item.projectKey === projectKey);
      await saveSingleGuidePlanningProject(projectKey, (current) => {
        current.selectedRecurrentMaterialTypes = guideRecurrentMaterialToggleAll.checked && project
          ? project.recurrentMaterialCatalog.slice()
          : [];
        return current;
      });
      renderGuidePlanningWorkspace();
      return;
    }

    const guideRecurrentSubcontractingTypeField = event.target.closest("[data-guide-recurrent-subcontracting-type]");
    if (guideRecurrentSubcontractingTypeField && state.activeDrawerModuleKey === "study_setup:guide_planning_definition") {
      const projectKey = guideRecurrentSubcontractingTypeField.getAttribute("data-project-key") || "";
      const selectedRecurrentSubcontractingTypes = Array.from(document.querySelectorAll(`[data-guide-recurrent-subcontracting-type][data-project-key="${projectKey}"]:checked`))
        .map((input) => input.getAttribute("data-guide-recurrent-subcontracting-type") || "")
        .filter(Boolean);
      await saveSingleGuidePlanningProject(projectKey, (current) => {
        current.selectedRecurrentSubcontractingTypes = selectedRecurrentSubcontractingTypes;
        return current;
      });
      renderGuidePlanningWorkspace();
      return;
    }

    const guideRecurrentSubcontractingToggleAll = event.target.closest("[data-guide-recurrent-subcontracting-toggle-all]");
    if (guideRecurrentSubcontractingToggleAll && state.activeDrawerModuleKey === "study_setup:guide_planning_definition") {
      const projectKey = guideRecurrentSubcontractingToggleAll.getAttribute("data-project-key") || "";
      const project = buildGuidePlanningProjects().find((item) => item.projectKey === projectKey);
      await saveSingleGuidePlanningProject(projectKey, (current) => {
        current.selectedRecurrentSubcontractingTypes = guideRecurrentSubcontractingToggleAll.checked && project
          ? project.recurrentSubcontractingCatalog.slice()
          : [];
        return current;
      });
      renderGuidePlanningWorkspace();
      return;
    }

    const guideDemobilisationMonthsField = event.target.closest("[data-guide-demobilisation-months]");
    if (guideDemobilisationMonthsField && state.activeDrawerModuleKey === "study_setup:guide_planning_definition") {
      const projectKey = guideDemobilisationMonthsField.getAttribute("data-project-key") || "";
      const position = guideDemobilisationMonthsField.getAttribute("data-position") || "";
      await saveSingleGuidePlanningProject(projectKey, (current) => {
        current.demobilizationWorkloadMonthsByPosition = {
          ...(current.demobilizationWorkloadMonthsByPosition || {}),
          [position]: Math.max(0, toNumber(guideDemobilisationMonthsField.value) ?? 0),
        };
        return current;
      });
      renderGuidePlanningWorkspace();
      return;
    }

    const guideDemobilisationMaterialMonthsField = event.target.closest("[data-guide-demobilisation-material-months]");
    if (guideDemobilisationMaterialMonthsField && state.activeDrawerModuleKey === "study_setup:guide_planning_definition") {
      const projectKey = guideDemobilisationMaterialMonthsField.getAttribute("data-project-key") || "";
      const materialType = guideDemobilisationMaterialMonthsField.getAttribute("data-material-type") || "";
      await saveSingleGuidePlanningProject(projectKey, (current) => {
        current.demobilizationMaterialMonthsByType = {
          ...(current.demobilizationMaterialMonthsByType || {}),
          [materialType]: Math.max(0, toNumber(guideDemobilisationMaterialMonthsField.value) ?? 0),
        };
        return current;
      });
      renderGuidePlanningWorkspace();
      return;
    }

    const guideDemobilisationSubcontractingMonthsField = event.target.closest("[data-guide-demobilisation-subcontracting-months]");
    if (guideDemobilisationSubcontractingMonthsField && state.activeDrawerModuleKey === "study_setup:guide_planning_definition") {
      const projectKey = guideDemobilisationSubcontractingMonthsField.getAttribute("data-project-key") || "";
      const subcontractingType = guideDemobilisationSubcontractingMonthsField.getAttribute("data-subcontracting-type") || "";
      await saveSingleGuidePlanningProject(projectKey, (current) => {
        current.demobilizationSubcontractingMonthsByType = {
          ...(current.demobilizationSubcontractingMonthsByType || {}),
          [subcontractingType]: Math.max(0, toNumber(guideDemobilisationSubcontractingMonthsField.value) ?? 0),
        };
        return current;
      });
      renderGuidePlanningWorkspace();
      return;
    }

    const guideSubcontractingTypeField = event.target.closest("[data-guide-subcontracting-type]");
    if (guideSubcontractingTypeField && state.activeDrawerModuleKey === "study_setup:guide_planning_definition") {
      const projectKey = guideSubcontractingTypeField.getAttribute("data-project-key") || "";
      const selectedSubcontractingTypes = Array.from(document.querySelectorAll(`[data-guide-subcontracting-type][data-project-key="${projectKey}"]:checked`))
        .map((input) => input.getAttribute("data-guide-subcontracting-type") || "")
        .filter(Boolean);
      await saveSingleGuidePlanningProject(projectKey, (current) => {
        current.selectedSubcontractingTypes = selectedSubcontractingTypes;
        return current;
      });
      renderGuidePlanningWorkspace();
      return;
    }

    const guideCustomRowField = event.target.closest("[data-guide-custom-row-field]");
    if (guideCustomRowField && state.activeDrawerModuleKey === "study_setup:guide_planning_definition") {
      const projectKey = guideCustomRowField.getAttribute("data-project-key") || "";
      const rowType = guideCustomRowField.getAttribute("data-row-type") || "";
      const rowId = guideCustomRowField.getAttribute("data-row-id") || "";
      const field = guideCustomRowField.getAttribute("data-guide-custom-row-field") || "";
      const collectionKey = getGuidePlanningCustomCollectionKey(rowType);
      await saveSingleGuidePlanningProject(projectKey, (current) => {
        const rows = Array.isArray(current[collectionKey]) ? current[collectionKey].map((row) => ({ ...row })) : [];
        const index = rows.findIndex((row) => row.id === rowId);
        if (index >= 0) rows[index][field] = guideCustomRowField.value || "";
        current[collectionKey] = rows;
        return current;
      });
      return;
    }

    const guideRiskField = event.target.closest("[data-guide-risk-field]");
    if (guideRiskField && state.activeDrawerModuleKey === "study_setup:guide_planning_definition") {
      const projectKey = guideRiskField.getAttribute("data-project-key") || "";
      const rowId = guideRiskField.getAttribute("data-row-id") || "";
      const field = guideRiskField.getAttribute("data-guide-risk-field") || "";
      await saveSingleGuidePlanningProject(projectKey, (current) => {
        const rows = Array.isArray(current.riskRows) ? current.riskRows.map((row) => ({ ...row })) : [];
        const index = rows.findIndex((row) => row.id === rowId);
        if (index >= 0) rows[index][field] = guideRiskField.value || "";
        current.riskRows = rows;
        return current;
      });
      return;
    }

    const positionCheckbox = event.target.closest("[data-cost-center-position]");
    if (positionCheckbox && state.activeDrawerModuleKey === "organization_risks:cost_centers") {
      const projectKey = positionCheckbox.getAttribute("data-project-key") || "";
      const selectedPositions = Array.from(document.querySelectorAll(`[data-cost-center-position][data-project-key="${projectKey}"]:checked`))
        .map((input) => input.value)
        .filter(Boolean);
      await saveSingleCostCentersProject(projectKey, (current) => {
        current.selectedPositions = selectedPositions;
        return current;
      });
      renderCostCentersWorkspace();
      return;
    }

    const generalPeriodCheckbox = event.target.closest("[data-cost-center-general-period]");
    if (generalPeriodCheckbox && state.activeDrawerModuleKey === "organization_risks:cost_centers") {
      const projectKey = generalPeriodCheckbox.getAttribute("data-project-key") || "";
      const generalTimePeriods = Array.from(document.querySelectorAll(`[data-cost-center-general-period][data-project-key="${projectKey}"]:checked`))
        .map((input) => input.value)
        .filter(Boolean);
      await saveSingleCostCentersProject(projectKey, (current) => {
        current.generalTimePeriods = generalTimePeriods;
        return current;
      });
      renderCostCentersWorkspace();
      return;
    }

    const engineerPeriodCheckbox = event.target.closest("[data-cost-center-engineer-period]");
    if (engineerPeriodCheckbox && state.activeDrawerModuleKey === "organization_risks:cost_centers") {
      const projectKey = engineerPeriodCheckbox.getAttribute("data-project-key") || "";
      const engineerTimePeriods = Array.from(document.querySelectorAll(`[data-cost-center-engineer-period][data-project-key="${projectKey}"]:checked`))
        .map((input) => input.value)
        .filter(Boolean);
      await saveSingleCostCentersProject(projectKey, (current) => {
        current.engineerTimePeriods = engineerTimePeriods;
        return current;
      });
      renderCostCentersWorkspace();
      return;
    }

    const rowField = event.target.closest("[data-cost-center-row-field]");
    if (rowField && state.activeDrawerModuleKey === "organization_risks:cost_centers") {
      const projectKey = rowField.getAttribute("data-project-key") || "";
      const rowKey = rowField.getAttribute("data-row-key") || "";
      const field = rowField.getAttribute("data-cost-center-row-field") || "";
      await saveSingleCostCentersProject(projectKey, (current) => {
        current.rowOverrides = { ...(current.rowOverrides || {}) };
        current.rowOverrides[rowKey] = {
          ...(current.rowOverrides[rowKey] || {}),
          [field]: rowField.value,
        };
        return current;
      });
      renderCostCentersWorkspace();
      return;
    }

    const hourlyRateImportInput = event.target.closest("#costCentersHourlyRateImportInput");
    if (hourlyRateImportInput && state.activeDrawerModuleKey === "organization_risks:cost_centers") {
      const projectKey = hourlyRateImportInput.dataset.projectKey || "";
      const [file] = hourlyRateImportInput.files || [];
      if (file) {
        await importCostCenterHourlyRates(projectKey, file);
      }
      return;
    }

    const pioOriginField = event.target.closest("[data-pio-origin]");
    if (pioOriginField && state.activeDrawerModuleKey === "study_setup:pio_definition_freight_customs") {
      const projectKey = pioOriginField.getAttribute("data-project-key") || "";
      const selectedOrigins = Array.from(document.querySelectorAll(`[data-pio-origin][data-project-key="${projectKey}"]:checked`))
        .map((input) => input.value)
        .filter(Boolean);
      await saveSinglePioDefinitionProject(projectKey, (current) => {
        current.selectedOrigins = selectedOrigins;
        return current;
      });
      renderPioDefinitionWorkspace();
      return;
    }

    const onshoreFreightInput = event.target.closest("#pioDefinitionOnshoreFreightInput");
    if (onshoreFreightInput && state.activeDrawerModuleKey === "study_setup:pio_definition_freight_customs") {
      const projectKey = onshoreFreightInput.dataset.projectKey || "";
      await saveSinglePioDefinitionProject(projectKey, (current) => {
        current.onshoreFreightPercent = toNumber(onshoreFreightInput.value) ?? 0;
        return current;
      });
      renderPioDefinitionWorkspace();
      return;
    }

    const offshoreFreightInput = event.target.closest("#pioDefinitionOffshoreFreightInput");
    if (offshoreFreightInput && state.activeDrawerModuleKey === "study_setup:pio_definition_freight_customs") {
      const projectKey = offshoreFreightInput.dataset.projectKey || "";
      await saveSinglePioDefinitionProject(projectKey, (current) => {
        current.offshoreFreightPercent = toNumber(offshoreFreightInput.value) ?? 0;
        return current;
      });
      renderPioDefinitionWorkspace();
      return;
    }

    const customDutyField = event.target.closest("[data-pio-custom-duty]");
    if (customDutyField && state.activeDrawerModuleKey === "study_setup:pio_definition_freight_customs") {
      const projectKey = customDutyField.getAttribute("data-project-key") || "";
      const subsystem = customDutyField.getAttribute("data-subsystem") || "";
      await saveSinglePioDefinitionProject(projectKey, (current) => {
        current.customDutiesBySubsystem = { ...(current.customDutiesBySubsystem || {}) };
        current.customDutiesBySubsystem[subsystem] = toNumber(customDutyField.value) ?? 0;
        return current;
      });
      renderPioDefinitionWorkspace();
      return;
    }

    const pioRowField = event.target.closest("[data-pio-row-field]");
    if (pioRowField && state.activeDrawerModuleKey === "study_setup:pio_definition_freight_customs") {
      const projectKey = pioRowField.getAttribute("data-project-key") || "";
      const origin = pioRowField.getAttribute("data-origin") || "";
      const field = pioRowField.getAttribute("data-pio-row-field") || "";
      await saveSinglePioDefinitionProject(projectKey, (current) => {
        current.rowOverrides = { ...(current.rowOverrides || {}) };
        current.rowOverrides[origin] = {
          ...(current.rowOverrides[origin] || {}),
          [field]: pioRowField.value || "",
        };
        return current;
      });
      renderPioDefinitionWorkspace();
      return;
    }
  });

  document.addEventListener("click", async (event) => {
    const selectProjectBtn = event.target.closest("[data-project-phases-select]");
    if (selectProjectBtn) {
      state.currentProjectPhasesProjectKey = selectProjectBtn.getAttribute("data-project-phases-select") || "";
      renderProjectPhasesWorkspace();
      return;
    }

    const addPhaseBtn = event.target.closest("[data-project-phase-add]");
    if (addPhaseBtn && state.activeDrawerModuleKey === "study_setup:project_phases") {
      const projectKey = addPhaseBtn.getAttribute("data-project-phase-add") || "";
      const project = buildProjectPhaseProjects().find((item) => item.projectKey === projectKey);
      if (!project?.nextPhaseKey) return;
      await saveProjectPhasesState((projects) => {
        const current = { ...(projects[projectKey] || {}) };
        const phases = { ...(current.phases || {}) };
        phases[project.nextPhaseKey] = {
          ...(phases[project.nextPhaseKey] || {}),
          enabled: true,
          durationYears: toNumber(phases[project.nextPhaseKey]?.durationYears) ?? 0,
        };
        current.phases = phases;
        projects[projectKey] = current;
        return projects;
      });
      renderProjectPhasesWorkspace();
      return;
    }

    const addCustomPhaseBtn = event.target.closest("[data-project-custom-phase-add]");
    if (addCustomPhaseBtn && state.activeDrawerModuleKey === "study_setup:project_phases") {
      const projectKey = addCustomPhaseBtn.getAttribute("data-project-custom-phase-add") || "";
      const project = buildProjectPhaseProjects().find((item) => item.projectKey === projectKey);
      if (!project?.nextCustomPhaseKey) return;
      await saveProjectPhasesState((projects) => {
        const current = { ...(projects[projectKey] || {}) };
        const phases = { ...(current.phases || {}) };
        phases[project.nextCustomPhaseKey] = {
          ...(phases[project.nextCustomPhaseKey] || {}),
          enabled: true,
          label: phases[project.nextCustomPhaseKey]?.label || project.nextCustomPhaseKey.replace(/_/g, " "),
          durationYears: toNumber(phases[project.nextCustomPhaseKey]?.durationYears) ?? 0,
          startDate: phases[project.nextCustomPhaseKey]?.startDate || "",
          endDate: phases[project.nextCustomPhaseKey]?.endDate || "",
          postWarrantyStartDate: phases[project.nextCustomPhaseKey]?.postWarrantyStartDate || "",
          postWarrantyEndDate: phases[project.nextCustomPhaseKey]?.postWarrantyEndDate || "",
        };
        current.phases = phases;
        projects[projectKey] = current;
        return projects;
      });
      renderProjectPhasesWorkspace();
      return;
    }

    const removePhaseBtn = event.target.closest("[data-project-phase-remove]");
    if (removePhaseBtn && state.activeDrawerModuleKey === "study_setup:project_phases") {
      const projectKey = removePhaseBtn.getAttribute("data-project-phase-remove") || "";
      const phaseKey = removePhaseBtn.getAttribute("data-phase-key") || "";
      await saveProjectPhasesState((projects) => {
        const current = { ...(projects[projectKey] || {}) };
        const phases = { ...(current.phases || {}) };
        delete phases[phaseKey];
        current.phases = phases;
        projects[projectKey] = current;
        return projects;
      });
      renderProjectPhasesWorkspace();
      return;
    }

    const refreshProjectsBtn = event.target.closest("[data-project-phase-refresh]");
    if (refreshProjectsBtn && state.activeDrawerModuleKey === "study_setup:project_phases") {
      await refreshProjectPhaseProjectsSource();
      renderProjectPhasesWorkspace();
      return;
    }

    const selectCostCentersProjectBtn = event.target.closest("[data-cost-centers-select]");
    if (selectCostCentersProjectBtn && state.activeDrawerModuleKey === "organization_risks:cost_centers") {
      state.currentCostCentersProjectKey = selectCostCentersProjectBtn.getAttribute("data-cost-centers-select") || "";
      renderCostCentersWorkspace();
      return;
    }

    const selectCurrencyExchangeProjectBtn = event.target.closest("[data-currency-exchange-select]");
    if (selectCurrencyExchangeProjectBtn && state.activeDrawerModuleKey === "data_sources:currency_exchange_rates") {
      state.currentCurrencyExchangeProjectKey = selectCurrencyExchangeProjectBtn.getAttribute("data-currency-exchange-select") || "";
      renderCurrencyExchangeWorkspace();
      return;
    }

    const selectGuidePlanningProjectBtn = event.target.closest("[data-guide-planning-select]");
    if (selectGuidePlanningProjectBtn && state.activeDrawerModuleKey === "study_setup:guide_planning_definition") {
      state.currentGuidePlanningProjectKey = selectGuidePlanningProjectBtn.getAttribute("data-guide-planning-select") || "";
      renderGuidePlanningWorkspace();
      return;
    }

    const editGuidePlanningBtn = event.target.closest("[data-guide-planning-edit]");
    if (editGuidePlanningBtn && state.activeDrawerModuleKey === "study_setup:guide_planning_definition") {
      const projectKey = editGuidePlanningBtn.getAttribute("data-project-key") || "";
      const rowKey = editGuidePlanningBtn.getAttribute("data-row-key") || "";
      const field = editGuidePlanningBtn.getAttribute("data-guide-planning-edit") || "";
      const currentValue = editGuidePlanningBtn.getAttribute("data-current-value") || "";
      const label = field === "guidePlanningCode" ? "Guide planning code" : (field === "startDate" ? "Start date (YYYY-MM-DD)" : "End date (YYYY-MM-DD)");
      const input = window.prompt(label, currentValue);
      if (input === null) return;
      const nextValue = input.trim();
      await saveSingleGuidePlanningProject(projectKey, (current) => {
        current.rowOverrides = { ...(current.rowOverrides || {}) };
        current.rowOverrides[rowKey] = {
          ...(current.rowOverrides[rowKey] || {}),
        };
        if (!nextValue) delete current.rowOverrides[rowKey][field];
        else current.rowOverrides[rowKey][field] = nextValue;
        if (!Object.keys(current.rowOverrides[rowKey]).length) delete current.rowOverrides[rowKey];
        return current;
      });
      renderGuidePlanningWorkspace();
      return;
    }

    const editGuidePlanningMaterialBtn = event.target.closest("[data-guide-planning-material-edit]");
    if (editGuidePlanningMaterialBtn && state.activeDrawerModuleKey === "study_setup:guide_planning_definition") {
      const projectKey = editGuidePlanningMaterialBtn.getAttribute("data-project-key") || "";
      const rowKey = editGuidePlanningMaterialBtn.getAttribute("data-row-key") || "";
      const field = editGuidePlanningMaterialBtn.getAttribute("data-guide-planning-material-edit") || "";
      const currentValue = editGuidePlanningMaterialBtn.getAttribute("data-current-value") || "";
      const label = field === "guidePlanningCode" ? "Guide planning code" : (field === "startDate" ? "Start date (YYYY-MM-DD)" : "End date (YYYY-MM-DD)");
      const input = window.prompt(label, currentValue);
      if (input === null) return;
      const nextValue = input.trim();
      await saveSingleGuidePlanningProject(projectKey, (current) => {
        current.rowOverrides = { ...(current.rowOverrides || {}) };
        current.rowOverrides[rowKey] = {
          ...(current.rowOverrides[rowKey] || {}),
        };
        if (!nextValue) delete current.rowOverrides[rowKey][field];
        else current.rowOverrides[rowKey][field] = nextValue;
        if (!Object.keys(current.rowOverrides[rowKey]).length) delete current.rowOverrides[rowKey];
        return current;
      });
      renderGuidePlanningWorkspace();
      return;
    }

    const editGuidePlanningSubcontractingBtn = event.target.closest("[data-guide-planning-subcontracting-edit]");
    if (editGuidePlanningSubcontractingBtn && state.activeDrawerModuleKey === "study_setup:guide_planning_definition") {
      const projectKey = editGuidePlanningSubcontractingBtn.getAttribute("data-project-key") || "";
      const rowKey = editGuidePlanningSubcontractingBtn.getAttribute("data-row-key") || "";
      const field = editGuidePlanningSubcontractingBtn.getAttribute("data-guide-planning-subcontracting-edit") || "";
      const currentValue = editGuidePlanningSubcontractingBtn.getAttribute("data-current-value") || "";
      const label = field === "guidePlanningCode" ? "Guide planning code" : (field === "startDate" ? "Start date (YYYY-MM-DD)" : "End date (YYYY-MM-DD)");
      const input = window.prompt(label, currentValue);
      if (input === null) return;
      const nextValue = input.trim();
      await saveSingleGuidePlanningProject(projectKey, (current) => {
        current.rowOverrides = { ...(current.rowOverrides || {}) };
        current.rowOverrides[rowKey] = {
          ...(current.rowOverrides[rowKey] || {}),
        };
        if (!nextValue) delete current.rowOverrides[rowKey][field];
        else current.rowOverrides[rowKey][field] = nextValue;
        if (!Object.keys(current.rowOverrides[rowKey]).length) delete current.rowOverrides[rowKey];
        return current;
      });
      renderGuidePlanningWorkspace();
      return;
    }

    const editGuidePlanningOverhaulBtn = event.target.closest("[data-guide-planning-overhaul-edit]");
    if (editGuidePlanningOverhaulBtn && state.activeDrawerModuleKey === "study_setup:guide_planning_definition") {
      const projectKey = editGuidePlanningOverhaulBtn.getAttribute("data-project-key") || "";
      const rowKey = editGuidePlanningOverhaulBtn.getAttribute("data-row-key") || "";
      const field = editGuidePlanningOverhaulBtn.getAttribute("data-guide-planning-overhaul-edit") || "";
      const currentValue = editGuidePlanningOverhaulBtn.getAttribute("data-current-value") || "";
      const label = field === "overhaulGuidePlanningCode" ? "Overhaul guide planning code" : "Renewal guide planning code";
      const input = window.prompt(label, currentValue);
      if (input === null) return;
      const nextValue = input.trim();
      await saveSingleGuidePlanningProject(projectKey, (current) => {
        current.rowOverrides = { ...(current.rowOverrides || {}) };
        current.rowOverrides[rowKey] = {
          ...(current.rowOverrides[rowKey] || {}),
        };
        if (!nextValue) delete current.rowOverrides[rowKey][field];
        else current.rowOverrides[rowKey][field] = nextValue;
        if (!Object.keys(current.rowOverrides[rowKey]).length) delete current.rowOverrides[rowKey];
        return current;
      });
      renderGuidePlanningWorkspace();
      return;
    }

    const addGuideCustomRowBtn = event.target.closest("[data-guide-custom-row-add]");
    if (addGuideCustomRowBtn && state.activeDrawerModuleKey === "study_setup:guide_planning_definition") {
      const projectKey = addGuideCustomRowBtn.getAttribute("data-project-key") || "";
      const rowType = addGuideCustomRowBtn.getAttribute("data-guide-custom-row-add") || "";
      const collectionKey = getGuidePlanningCustomCollectionKey(rowType);
      await saveSingleGuidePlanningProject(projectKey, (current) => {
        const rows = Array.isArray(current[collectionKey]) ? current[collectionKey].slice() : [];
        rows.push(createGuidePlanningCustomRow(rowType));
        current[collectionKey] = rows;
        return current;
      });
      state.currentGuidePlanningProjectKey = projectKey;
      renderGuidePlanningWorkspace();
      return;
    }

    const addGuideRiskRowBtn = event.target.closest("[data-guide-risk-row-add]");
    if (addGuideRiskRowBtn && state.activeDrawerModuleKey === "study_setup:guide_planning_definition") {
      const projectKey = addGuideRiskRowBtn.getAttribute("data-project-key") || "";
      await saveSingleGuidePlanningProject(projectKey, (current) => {
        const rows = Array.isArray(current.riskRows) ? current.riskRows.slice() : [];
        rows.push(createGuidePlanningRiskRow());
        current.riskRows = rows;
        return current;
      });
      state.currentGuidePlanningProjectKey = projectKey;
      renderGuidePlanningWorkspace();
      return;
    }

    const removeGuideCustomRowBtn = event.target.closest("[data-guide-custom-row-remove]");
    if (removeGuideCustomRowBtn && state.activeDrawerModuleKey === "study_setup:guide_planning_definition") {
      const projectKey = removeGuideCustomRowBtn.getAttribute("data-project-key") || "";
      const rowType = removeGuideCustomRowBtn.getAttribute("data-guide-custom-row-remove") || "";
      const rowId = removeGuideCustomRowBtn.getAttribute("data-row-id") || "";
      const collectionKey = getGuidePlanningCustomCollectionKey(rowType);
      await saveSingleGuidePlanningProject(projectKey, (current) => {
        current[collectionKey] = (Array.isArray(current[collectionKey]) ? current[collectionKey] : []).filter((row) => row.id !== rowId);
        return current;
      });
      state.currentGuidePlanningProjectKey = projectKey;
      renderGuidePlanningWorkspace();
      return;
    }

    const removeGuideRiskRowBtn = event.target.closest("[data-guide-risk-row-remove]");
    if (removeGuideRiskRowBtn && state.activeDrawerModuleKey === "study_setup:guide_planning_definition") {
      const projectKey = removeGuideRiskRowBtn.getAttribute("data-project-key") || "";
      const rowId = removeGuideRiskRowBtn.getAttribute("data-row-id") || "";
      await saveSingleGuidePlanningProject(projectKey, (current) => {
        current.riskRows = (Array.isArray(current.riskRows) ? current.riskRows : []).filter((row) => row.id !== rowId);
        return current;
      });
      state.currentGuidePlanningProjectKey = projectKey;
      renderGuidePlanningWorkspace();
      return;
    }

    const addCurrencyExchangeBtn = event.target.closest("#currencyExchangeAddCurrencyBtn");
    if (addCurrencyExchangeBtn && state.activeDrawerModuleKey === "data_sources:currency_exchange_rates") {
      const projectKey = addCurrencyExchangeBtn.dataset.projectKey || "";
      const input = window.prompt("Additional target currency", "");
      if (input !== null) {
        const currency = input.trim().toUpperCase();
        if (currency) {
          await saveSingleCurrencyExchangeProject(projectKey, (current) => {
            current.customCurrencies = Array.from(new Set([...(current.customCurrencies || []), currency]));
            current.targetCurrency = currency;
            return current;
          });
          renderCurrencyExchangeWorkspace();
        }
      }
      return;
    }

    const addCurrencyBtn = event.target.closest("#costCentersAddCurrencyBtn");
    if (addCurrencyBtn && state.activeDrawerModuleKey === "organization_risks:cost_centers") {
      const projectKey = addCurrencyBtn.dataset.projectKey || "";
      const input = window.prompt("Additional project currency", "");
      if (input !== null) {
        const currency = input.trim().toUpperCase();
        if (currency) {
          await saveSingleCostCentersProject(projectKey, (current) => {
            current.customCurrencies = Array.from(new Set([...(current.customCurrencies || []), currency]));
            current.projectCurrency = currency;
            return current;
          });
          renderCostCentersWorkspace();
        }
      }
      return;
    }

    const addPositionBtn = event.target.closest("#costCentersAddPositionBtn");
    if (addPositionBtn && state.activeDrawerModuleKey === "organization_risks:cost_centers") {
      const projectKey = addPositionBtn.dataset.projectKey || "";
      const input = window.prompt("Applicable position", "");
      if (input !== null) {
        const position = input.trim() === "Subsystem Engineer" ? "Engineer" : input.trim();
        if (position) {
          await saveSingleCostCentersProject(projectKey, (current) => {
            current.customPositions = Array.from(new Set([...(current.customPositions || []), position]));
            current.selectedPositions = Array.from(new Set([...(current.selectedPositions || []), position]));
            return current;
          });
          renderCostCentersWorkspace();
        }
      }
      return;
    }

    const removePositionBtn = event.target.closest("[data-cost-center-remove-position]");
    if (removePositionBtn && state.activeDrawerModuleKey === "organization_risks:cost_centers") {
      const projectKey = removePositionBtn.getAttribute("data-project-key") || "";
      const position = removePositionBtn.getAttribute("data-cost-center-remove-position") || "";
      await saveSingleCostCentersProject(projectKey, (current) => {
        current.customPositions = (Array.isArray(current.customPositions) ? current.customPositions : []).filter((entry) => entry !== position);
        current.selectedPositions = (Array.isArray(current.selectedPositions) ? current.selectedPositions : []).filter((entry) => entry !== position);
        const nextOverrides = { ...(current.rowOverrides || {}) };
        Object.keys(nextOverrides).forEach((rowKey) => {
          if (rowKey.startsWith(`${position}__`)) delete nextOverrides[rowKey];
        });
        current.rowOverrides = nextOverrides;
        return current;
      });
      renderCostCentersWorkspace();
      return;
    }

    const importRatesBtn = event.target.closest("#costCentersImportRatesBtn");
    if (importRatesBtn && state.activeDrawerModuleKey === "organization_risks:cost_centers") {
      $("costCentersHourlyRateImportInput")?.click();
      return;
    }

    const selectPioProjectBtn = event.target.closest("[data-pio-definition-select]");
    if (selectPioProjectBtn && state.activeDrawerModuleKey === "study_setup:pio_definition_freight_customs") {
      state.currentPioDefinitionProjectKey = selectPioProjectBtn.getAttribute("data-pio-definition-select") || "";
      renderPioDefinitionWorkspace();
      return;
    }

    const addOriginBtn = event.target.closest("#pioDefinitionAddOriginBtn");
    if (addOriginBtn && state.activeDrawerModuleKey === "study_setup:pio_definition_freight_customs") {
      const projectKey = addOriginBtn.dataset.projectKey || "";
      const input = window.prompt("Add origin", "");
      if (input !== null) {
        const origin = input.trim();
        if (origin) {
          await saveSinglePioDefinitionProject(projectKey, (current) => {
            current.customOrigins = Array.from(new Set([...(current.customOrigins || []), origin]));
            current.selectedOrigins = Array.from(new Set([...(current.selectedOrigins || []), origin]));
            return current;
          });
          renderPioDefinitionWorkspace();
        }
      }
      return;
    }
  });

  document.querySelectorAll("[data-toolbar-trigger]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      openToolbarMenu(button.getAttribute("data-toolbar-trigger") || "");
    });
  });

  document.querySelectorAll("[data-toolbar-item]").forEach((button) => {
    button.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      const menuKey = button.getAttribute("data-toolbar-group") || "";
      const itemKey = button.getAttribute("data-toolbar-item") || "";
      await openConfigurationItem(menuKey, itemKey);
    });
  });

  $("closeModuleDrawerBtn")?.addEventListener("click", closeModuleDrawer);
  $("moduleDrawerBackdrop")?.addEventListener("click", closeModuleDrawer);

  document.addEventListener("click", (event) => {
    if (!(event.target instanceof Node)) return;
    const progressCard = event.target.closest("[data-config-progress-card]");
    if (progressCard) {
      event.preventDefault();
      const menuKey = progressCard.getAttribute("data-config-progress-card") || "";
      const itemKey = progressCard.getAttribute("data-config-progress-target") || "";
      if (menuKey && itemKey) {
        openConfigurationItem(menuKey, itemKey);
      }
      return;
    }
    if (!event.target.closest("[data-toolbar-root]")) {
      closeToolbarMenus();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeToolbarMenus();
      closeModuleDrawer();
    }
  });

  window.addEventListener("storage", async (event) => {
    if (!event.key) return;
    if (
      event.key === SHARED_STORE_KEYS.costSummaryDraft ||
      event.key === SHARED_STORE_KEYS.settings ||
      event.key === SHARED_STORE_KEYS.workbookIndex ||
      event.key.startsWith(SHARED_STORE_KEYS.workbookPrefix)
    ) {
      const currentDraft = readDraftFromForm();
      await refreshSharedSnapshot();
      state.draft = {
        ...state.draft,
        ...currentDraft,
      };
      applyDraftToForm(state.draft);
      refreshStatus(state.draft);
      if (state.activeDrawerModuleKey === "study_setup:project_phases") {
        renderProjectPhasesWorkspace();
      }
      if (state.activeDrawerModuleKey === "study_setup:guide_planning_definition") {
        renderGuidePlanningWorkspace();
      }
      if (state.activeDrawerModuleKey === "organization_risks:cost_centers") {
        renderCostCentersWorkspace();
      }
      if (state.activeDrawerModuleKey === "data_sources:currency_exchange_rates") {
        renderCurrencyExchangeWorkspace();
      }
      if (state.activeDrawerModuleKey === "study_setup:pio_definition_freight_customs") {
        renderPioDefinitionWorkspace();
      }
    }
  });
}

async function hydrateSharedState() {
  try {
    await initSharedStore();
    const localSharedWorkbooks = await getAllWorkbookData();
    const indexedDbBridgeWorkbooks = await loadIndexedDbBridgeWorkbooks();
    state.workbooks = mergeWorkbooksBySourceId(indexedDbBridgeWorkbooks, localSharedWorkbooks);
    syncWorkspaceLiteCache(state.workbooks);
    state.settings = await loadSharedSettings();
    const legacyDraft = await loadCostSummaryDraft();
    state.currentStudy = await ensureDefaultStudy({
      name: legacyDraft?.studyName || DEFAULT_COST_SUMMARY_DRAFT.studyName,
      targetCurrency: legacyDraft?.targetCurrency || DEFAULT_COST_SUMMARY_DRAFT.targetCurrency,
      scenario: legacyDraft?.scenario || DEFAULT_COST_SUMMARY_DRAFT.scenario,
      sourceStrategy: legacyDraft?.sourceStrategy || DEFAULT_COST_SUMMARY_DRAFT.sourceStrategy,
      exportMode: legacyDraft?.exportMode || DEFAULT_COST_SUMMARY_DRAFT.exportMode,
      includeAuditTrail: legacyDraft?.includeAuditTrail ?? DEFAULT_COST_SUMMARY_DRAFT.includeAuditTrail,
      lockFormulaSheet: legacyDraft?.lockFormulaSheet ?? DEFAULT_COST_SUMMARY_DRAFT.lockFormulaSheet,
    });
    state.studies = await listStudies();

    if (state.currentStudy?.studyId) {
      setLastOpenStudyId(state.currentStudy.studyId);
    }

    const persistedConfig = state.currentStudy?.studyId
      ? await loadPersistedStudyConfig(state.currentStudy.studyId)
      : null;

    state.studyConfig = persistedConfig;
    state.draft = composeDraftFromStudy(state.currentStudy, legacyDraft, persistedConfig);
  } catch (error) {
    state.workbooks = [];
    window.__costSummarySharedWorkbooks = [];
    state.settings = { ...state.settings };
    state.draft = { ...DEFAULT_COST_SUMMARY_DRAFT };
    state.studyConfig = null;
    setRuntimeAlert(`Shared store unavailable. The page is running in fallback mode. ${error?.message || ""}`.trim());
  }
}

function renderSharedStoreSummary() {
  const sharedWorkbookCount = $("sharedWorkbookCount");
  const sharedProjectCount = $("sharedProjectCount");
  const sharedCurrencyCount = $("sharedCurrencyCount");
  const sharedTargetCurrency = $("sharedTargetCurrency");
  const sharedExchangeBase = $("sharedExchangeBase");
  const sharedLastUpdated = $("sharedLastUpdated");
  const sharedWorkbookList = $("sharedWorkbookList");
  if (
    !sharedWorkbookCount ||
    !sharedProjectCount ||
    !sharedCurrencyCount ||
    !sharedTargetCurrency ||
    !sharedExchangeBase ||
    !sharedLastUpdated ||
    !sharedWorkbookList
  ) return;

  const projectKeys = new Set(
    state.workbooks
      .map((item) => String(item.projectKey || "").trim())
      .filter(Boolean)
  );
  const currencies = new Set(
    state.workbooks
      .flatMap((workbook) => extractSynthesisCurrencies(workbook))
      .filter(Boolean)
  );

  sharedWorkbookCount.textContent = String(state.workbooks.length);
  sharedProjectCount.textContent = String(projectKeys.size);
  sharedCurrencyCount.textContent = String(currencies.size);
  sharedTargetCurrency.textContent = state.settings?.targetCurrency || "--";
  sharedExchangeBase.textContent = state.settings?.exchangeBase || "--";
  sharedLastUpdated.textContent = formatTimestamp(state.settings?.lastUpdated);

  if (!state.workbooks.length) {
    sharedWorkbookList.innerHTML = `
      <div class="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
        No workbook is available in the shared store yet.
      </div>
    `;
    return;
  }

  sharedWorkbookList.innerHTML = state.workbooks.map((item) => {
    const synthesisCount = getRowCount(item.sheets?.synthesis);
    const duplicateText = item.duplicateSourceCount
      ? `<p class="text-xs text-amber-600 mt-1">${item.duplicateSourceCount} older duplicate import(s) compacted</p>`
      : "";
    return `
      <div class="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p class="text-sm font-semibold">${escapeHtml(item.fileName || "Unnamed workbook")}</p>
            <p class="text-xs text-slate-500 mt-1">Project key: ${escapeHtml(item.projectKey || "N/A")}</p>
            ${duplicateText}
          </div>
          <div class="text-right">
            <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider">${escapeHtml(item.kind || "Unknown type")}</p>
            <p class="text-xs text-slate-400 mt-1">${synthesisCount} synthesis row(s)</p>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

function renderProjectDataPreview() {
  const body = $("sharedProjectPreviewBody");
  const status = $("projectPreviewStatus");
  if (!body || !status) return;

  if (!state.workbooks.length) {
    body.innerHTML = `
      <tr>
        <td colspan="8" class="py-6 text-center text-sm text-slate-500">No project preview available.</td>
      </tr>
    `;
    status.textContent = "No project preview available yet.";
    return;
  }

  const rows = state.workbooks
    .slice()
    .sort((left, right) => getProjectLabel(left).localeCompare(getProjectLabel(right)))
    .map((item) => {
      const params = item.generalParams || item.sheets?.generalParameters || {};
      const bidYear = params.bid_year || "--";
      const serviceYear = params.service_year || "--";
      const contractDuration = params.contract_duration_years || "--";
      return `
        <tr>
          <td class="py-3 pr-4">
            <div class="font-semibold">${escapeHtml(getProjectLabel(item))}</div>
            <div class="text-xs text-slate-500 mt-1">${escapeHtml(item.projectKey || "N/A")}</div>
          </td>
          <td class="py-3 px-4 text-slate-600">${escapeHtml(item.kind || "Unknown type")}</td>
          <td class="py-3 px-4 text-right font-semibold">${getRowCount(item.sheets?.synthesis)}</td>
          <td class="py-3 px-4 text-right font-semibold">${getRowCount(item.sheets?.correctivePlanning)}</td>
          <td class="py-3 px-4 text-right font-semibold">${getRowCount(item.sheets?.overhaulRenewalPlanning)}</td>
          <td class="py-3 px-4 text-right font-semibold">${getRowCount(item.sheets?.subcontractingPlanning)}</td>
          <td class="py-3 px-4 text-slate-600">${escapeHtml(`${bidYear} / ${serviceYear}`)}</td>
          <td class="py-3 pl-4 text-slate-600">${escapeHtml(contractDuration)}</td>
        </tr>
      `;
    });

  body.innerHTML = rows.join("");
  const duplicateCount = state.workbooks.reduce((total, workbook) => total + Number(workbook.duplicateSourceCount || 0), 0);
  status.textContent = duplicateCount
    ? `${state.workbooks.length} active workbook(s); ${duplicateCount} older duplicate import(s) compacted.`
    : `${state.workbooks.length} workbook(s) available for project-level reuse.`;
}

function renderSharedCoverageTable() {
  const body = $("sharedCoverageBody");
  if (!body) return;

  if (!state.workbooks.length) {
    body.innerHTML = `
      <tr>
        <td colspan="9" class="py-6 text-center text-sm text-slate-500">No shared workbook available.</td>
      </tr>
    `;
    return;
  }

  body.innerHTML = state.workbooks
    .slice()
    .sort((left, right) => (left.fileName || "").localeCompare(right.fileName || ""))
    .map((item) => `
      <tr>
        <td class="py-3 pr-4">
          <div class="font-semibold">${escapeHtml(item.fileName || "Unnamed workbook")}</div>
          <div class="text-xs text-slate-500 mt-1">${escapeHtml(item.kind || "Unknown type")}</div>
        </td>
        <td class="py-3 px-4 text-slate-600">${escapeHtml(item.projectKey || "N/A")}</td>
        <td class="py-3 px-4 text-right font-semibold">${getRowCount(item.sheets?.planningComplet)}</td>
        <td class="py-3 px-4 text-right font-semibold">${getRowCount(item.sheets?.techniciansNeededPerDay)}</td>
        <td class="py-3 px-4 text-right font-semibold">${getRowCount(item.sheets?.synthesis)}</td>
        <td class="py-3 px-4 text-right font-semibold">${getRowCount(item.sheets?.correctivePlanning)}</td>
        <td class="py-3 px-4 text-right font-semibold">${getRowCount(item.sheets?.overhaulRenewalPlanning)}</td>
        <td class="py-3 px-4 text-right font-semibold">${getRowCount(item.sheets?.subcontractingPlanning)}</td>
        <td class="py-3 pl-4 text-right font-semibold">${getRowCount(item.sheets?.hoursReport)}</td>
      </tr>
    `)
    .join("");
}

async function refreshSharedSnapshot() {
  await hydrateSharedState();
  publishProjectPhasesBridge();
  publishCostCentersBridge();
  publishGuidePlanningBridge();
  publishPioDefinitionBridge();
  renderStudyWorkspace();
  renderSharedStoreSummary();
  renderProjectDataPreview();
  renderSharedCoverageTable();
  refreshStatus(state.draft);
}

async function switchToStudy(studyId) {
  if (!studyId) return;
  const study = state.studies.find((item) => item.studyId === studyId);
  if (!study) return;

  const persistedConfig = await loadPersistedStudyConfig(studyId);
  state.currentStudy = study;
  state.studyConfig = persistedConfig;
  state.draft = composeDraftFromStudy(study, state.draft, persistedConfig);
  setLastOpenStudyId(studyId);
  publishProjectPhasesBridge();
  publishCostCentersBridge();
  publishGuidePlanningBridge();
  publishPioDefinitionBridge();
  applyDraftToForm(state.draft);
  renderStudyWorkspace();
  refreshStatus(state.draft);
  clearRuntimeAlert();
}

async function initCostSummaryMIPage() {
  try {
    window.__costSummaryModuleReady = false;
    clearRuntimeAlert();
    await hydrateSharedState();
    const draft = state.draft;
    renderStudyWorkspace();
    renderConfigurationToolbar();
    publishProjectPhasesBridge();
    publishCostCentersBridge();
    publishGuidePlanningBridge();
    publishPioDefinitionBridge();
    updateToolbarStatusDots();
    renderCalculationBlocks();
    renderWorkbookOutline();
    renderSharedStoreSummary();
    renderProjectDataPreview();
    renderSharedCoverageTable();
    applyDraftToForm(draft);
    refreshStatus(draft);
    setupEvents();
    window.__costSummaryModuleReady = true;
  } catch (error) {
    window.__costSummaryModuleReady = false;
    console.error("Cost Summary & MI bootstrap failed:", error);
    setRuntimeAlert(`The page could not finish initializing. ${error?.message || "Unknown runtime error."}`);
  }
}

document.addEventListener("DOMContentLoaded", initCostSummaryMIPage);
