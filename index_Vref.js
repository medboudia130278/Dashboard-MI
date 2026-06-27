  // -----------------------------
  // State
  // -----------------------------
  const state = {
    mode: "auto", // "output_planning" | "generic"
    files: [],
    planningRows: [],
    techRows: [],
    synthesisRows: [],
    correctiveRows: [],
    overhaulRows: [],
    subcontractingRows: [],
    genericRows: [],
    columns: {},
    materialsColumns: {},
    overhaulColumns: {},
    subcontractingColumns: {},
    activityTypes: [],
    subsystems: [],
    generalParams: {},
    hoursReportRows: [],   // ✅ uniquement pour le graphe Preventive vs Corrective
    currentActivity: "__ALL__",
    currentSubsystem: "__ALL__",
    currentProjectName: "__ALL__",
    currentProjectType: "__ALL__",
    currentWorkloadEquipment: "__ALL__",
    currentWorkloadLocation: "__ALL__",
    showWorkloadKpiProjectSum: true,
    currentWorkloadTreeProject: "__AUTO__",
    currentWorkloadTreeSubsystem: "__AUTO__",
    currentMaterialCurrency: "USD",
    currentMaterialYear: "__ALL__",
    currentMaterialEquipment: "__ALL__",
    currentMaterialElement: "__ALL__",
    showMaterialsKpiTotal: true,
    showMaterialsPieMinorSources: false,
    currentOverhaulYear: "__ALL__",
    currentOverhaulEquipment: "__ALL__",
    currentOverhaulType: "__ALL__",
    currentOverhaulSpanLife: "__ALL__",
    showOverhaulKpiTotal: true,
    currentSubcontractingEquipment: "__ALL__",
    currentSubcontractingActivity: "__ALL__",
    currentSubcontractingType: "__ALL__",
    currentSubcontractingFrequency: "__ALL__",
    currentSubcontractingPeriodDuration: 1,
    showSubcontractingKpiTotal: true,
    currentSubcontractingTreeProject: "__AUTO__",
    currentSubcontractingTreeSubsystem: "__AUTO__",
    showBenchmarkDriverKpiTotal: true,
    currentBenchmarkTrackDriver: "km_single_track",
    currentBenchmarkCostTrackDriver: "turnout",
    currentBenchmarkGlobalCostActivityType: "__ALL__",
    currentBenchmarkGlobalCostTrackDriver: "km_single_track",
    totalCostTargetCurrency: "USD",
    totalCostLevels: ["Phase"],
    totalCostDescFilter: [],
    totalCostPhaseFilter: [],
    tcExplorerLevels: ["Phase", "Type", "Price List Code 3"],
    tcExplorerSelections: {},
    totalCostBridge: null,
    totalCostBridgeLoading: false,
    totalCostDescSearch: "",
    riskAssessmentTargetCurrency: "USD",
    riskAssessmentPhaseFilter: null,
    riskAssessmentExplorerLevels: ["Phase", "Owner / Sub System", "Category"],
    riskAssessmentExplorerSelections: {},
    riskAssessmentBridge: null,
    riskAssessmentBridgeLoading: false,
    manualContractDurationByProject: {},
    exchangeRates: {},
    exchangeLastUpdated: "",
    exchangeProvider: "",
    exchangeBase: "USD",
    manualExchangeRates: {},
    _exchangeRefreshPromise: null,
    remoteSources: {},
    localLinkedSources: {},
    activeFileIds: null,   // null = ALL, Set() = selection, empty Set = NONE
    fileMeta: {},          // fileId -> {name, gp, label}
    selectedFileIds: new Set(),
    barsOffset: 0,
    _barsNavSetup: false,
    _workloadTreeResizeSetup: false,
    _remoteSyncTimer: null,
    _remoteSyncInFlight: false,
  };

  // -----------------------------
  // Helpers
  // -----------------------------
  const $ = (id) => document.getElementById(id);
  const dashboardConfig = window.PasserelleDashboardConfig || {};
  const LIVE_RATE_STORAGE_KEY = dashboardConfig.LIVE_RATE_STORAGE_KEY || "materialsLiveRatesV1";
  const MANUAL_RATE_STORAGE_KEY = dashboardConfig.MANUAL_RATE_STORAGE_KEY || "materialsManualRatesV1";
  const REMOTE_SYNC_INTERVAL_MS = dashboardConfig.REMOTE_SYNC_INTERVAL_MS || 60000;
  const MATERIAL_COL_CANDIDATES = dashboardConfig.MATERIAL_COL_CANDIDATES || {
    year: ["year", "planning_year", "budget_year"],
    currency: ["currency", "curr", "devise"],
    subsystem: ["subsystem", "system", "sub_system"],
    equipment: ["equipment", "equipment_name", "asset", "asset_name"],
    element: ["element", "item", "material", "component"],
    source: ["source", "vendor_source", "origin"],
    totalCost: ["total_cost", "total_costs", "cost_total"],
    reparableCost: ["reparable_cost", "repairable_cost", "reparable_total_cost"],
    totalCostEstimated: ["total_cost_estimated", "estimated_total_cost", "total_estimated_cost"],
    reparableCostEstimated: ["reparable_cost_estimated", "repairable_cost_estimated", "estimated_reparable_cost"],
  };
  const MATERIAL_SERIES_COLORS = dashboardConfig.MATERIAL_SERIES_COLORS || {
    total: "#0f766e",
    reparable: "#2563eb",
    totalEstimated: "#f59e0b",
    reparableEstimated: "#ef4444",
  };
  const MATERIAL_PIE_COLORS = dashboardConfig.MATERIAL_PIE_COLORS || ["#2563eb", "#0f766e", "#f59e0b", "#ef4444", "#7c3aed", "#0891b2", "#16a34a", "#ea580c"];
  const OVERHAUL_COL_CANDIDATES = dashboardConfig.OVERHAUL_COL_CANDIDATES || {
    year: ["year_of_planning", "planning_year", "year", "budget_year"],
    currency: ["currency", "curr", "devise"],
    subsystem: ["subsystem", "system", "sub_system"],
    equipment: ["equipment", "equipment_name", "asset", "asset_name"],
    element: ["element", "item", "material", "component"],
    spanLife: ["span_life", "spanlife", "life_span"],
    type: ["type", "activity_type", "renewal_type"],
    materialCost: ["material_cost", "materials_cost", "unit_cost"],
    tcCost: ["tc_cost", "t_c_cost", "test__commissioning_cost", "test_and_commissioning_cost"],
    managementCost: ["management_cost", "mgmt_cost"],
    globalCost: ["global_cost", "unit_cost", "total_cost", "overall_cost"],
  };
  const OVERHAUL_STACK_COLORS = dashboardConfig.OVERHAUL_STACK_COLORS || {
    material: "#137fec",
    tc: "#f59e0b",
    management: "#14b8a6",
  };
  const OVERHAUL_TYPE_COLORS = dashboardConfig.OVERHAUL_TYPE_COLORS || {
    overhaul: "#137fec",
    renewal: "#14b8a6",
  };
  const OVERHAUL_PIE_COLORS = dashboardConfig.OVERHAUL_PIE_COLORS || ["#137fec", "#14b8a6", "#f59e0b", "#ef4444", "#7c3aed", "#0891b2", "#16a34a", "#ea580c"];
  const SUBCONTRACT_COL_CANDIDATES = dashboardConfig.SUBCONTRACT_COL_CANDIDATES || {
    yearlyCost: ["yearly_cost", "annual_cost", "cost"],
    currency: ["currency", "curr", "devise"],
    subsystem: ["subsystem", "system", "sub_system"],
    equipment: ["equipment", "equipment_name", "asset", "asset_name"],
    project: ["project_name", "project", "project_label"],
    activity: ["activity_description", "activity", "description"],
    type: ["type", "activity_type", "service_type"],
    frequency: ["frequency", "freq", "periodicity"],
  };
  const SUBCONTRACT_PIE_COLORS = dashboardConfig.SUBCONTRACT_PIE_COLORS || ["#137fec", "#14b8a6", "#f59e0b", "#ef4444", "#7c3aed", "#0891b2", "#16a34a", "#ea580c"];
  const SUBCONTRACT_TYPE_COLORS = dashboardConfig.SUBCONTRACT_TYPE_COLORS || ["#137fec", "#14b8a6", "#f59e0b", "#ef4444", "#7c3aed", "#0891b2", "#16a34a", "#ea580c"];
  const PROJECT_SERIES_PALETTE = dashboardConfig.PROJECT_SERIES_PALETTE || ['#137fec', '#14b8a6', '#a855f7', '#f59e0b', '#ef4444', '#22c55e', '#06b6d4', '#f97316', '#64748b'];

  const dashboardUtils = window.PasserelleDashboardUtils || {};
  const DASHBOARD_THEME_STORAGE_KEY = "dashboard-theme-preference-v2";

  function getDashboardTheme() {
    const rootTheme = document.documentElement.dataset.theme;
    if (rootTheme === "light" || rootTheme === "dark") return rootTheme;
    return document.documentElement.classList.contains("dark") ? "dark" : "light";
  }

  function updateDashboardThemeButton(theme) {
    const icon = $('themeToggleIcon');
    const label = $('themeToggleLabel');
    const button = $('themeToggleBtn');
    const isDark = theme === "dark";
    if (icon) icon.textContent = isDark ? "light_mode" : "dark_mode";
    if (label) label.textContent = isDark ? "Light mode" : "Dark mode";
    if (button) button.setAttribute("aria-label", isDark ? "Switch to light mode" : "Switch to dark mode");
  }

  function applyDashboardTheme(theme, persist = true) {
    const normalized = theme === "light" ? "light" : "dark";
    document.documentElement.classList.toggle("dark", normalized === "dark");
    document.documentElement.classList.toggle("light", normalized !== "dark");
    document.documentElement.dataset.theme = normalized;
    if (persist) {
      try { localStorage.setItem(DASHBOARD_THEME_STORAGE_KEY, normalized); } catch (error) {}
    }
    updateDashboardThemeButton(normalized);
  }

  function initDashboardThemeToggle() {
    updateDashboardThemeButton(getDashboardTheme());
    const button = $('themeToggleBtn');
    if (!button || button.dataset.bound === "1") return;
    button.dataset.bound = "1";
    button.addEventListener("click", () => {
      applyDashboardTheme(getDashboardTheme() === "dark" ? "light" : "dark");
    });
  }

  const normalizeKey = dashboardUtils.normalizeKey || function (value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_]/g, "");
  };

  const normalizeCurrencyCode = dashboardUtils.normalizeCurrencyCode || function (value) {
    const code = String(value ?? "").trim().toUpperCase();
    return /^[A-Z]{3}$/.test(code) ? code : "";
  };

  function colorForSeriesIndex(index) {
    if (typeof dashboardUtils.colorForSeriesIndex === "function") {
      return dashboardUtils.colorForSeriesIndex(index, PROJECT_SERIES_PALETTE);
    }
    if (index < PROJECT_SERIES_PALETTE.length) return PROJECT_SERIES_PALETTE[index];
    const hue = (index * 47) % 360;
    return `hsl(${hue},70%,45%)`;
  }

  const readStoredJson = dashboardUtils.readStoredJson || function (key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };

  const writeStoredJson = dashboardUtils.writeStoredJson || function (key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Ignore storage failures (private mode / quota).
    }
  };

  const SHARED_STORE_FALLBACK_VERSION = dashboardConfig.SHARED_STORE_FALLBACK_VERSION || 1;
  const SHARED_STORE_FALLBACK_KEYS = dashboardConfig.SHARED_STORE_FALLBACK_KEYS || {
    workbookIndex: "shared-store-workbook-index-v1",
    workbookPrefix: "shared-store-workbook-v1:",
    workbookLitePrefix: "shared-store-workbook-lite-v1:",
    settings: "shared-store-settings-v1",
  };

  const SHARED_MODULE_PATHS = dashboardConfig.SHARED_MODULE_PATHS || {};
  const SHARED_DATA_STORE_MODULE_PATH = SHARED_MODULE_PATHS.dataStore || "./shared/shared_data_store.js";
  const SHARED_EXCEL_PARSER_MODULE_PATH = SHARED_MODULE_PATHS.excelParser || "./shared/shared_excel_parser.js";
  const SHARED_STUDY_PERSISTENCE_MODULE_PATH = SHARED_MODULE_PATHS.studyPersistence || "./shared/study_persistence.js";
  const dashboardWorkbookMirror = window.PasserelleDashboardWorkbookMirror || {};
  let sharedModulesPromise = null;

  function loadSharedModules() {
    if (!sharedModulesPromise) {
      sharedModulesPromise = Promise.allSettled([
        import(SHARED_DATA_STORE_MODULE_PATH),
        import(SHARED_EXCEL_PARSER_MODULE_PATH),
        import(SHARED_STUDY_PERSISTENCE_MODULE_PATH),
      ])
        .then(async ([dataStoreResult, excelParserResult, studyPersistenceResult]) => {
          const dataStoreModule = dataStoreResult.status === "fulfilled" ? dataStoreResult.value : null;
          const excelParserModule = excelParserResult.status === "fulfilled" ? excelParserResult.value : null;
          const studyPersistenceModule = studyPersistenceResult.status === "fulfilled" ? studyPersistenceResult.value : null;
          if (!dataStoreModule && dataStoreResult.status === "rejected") {
            console.warn("Shared data store module could not be loaded.", dataStoreResult.reason);
          }
          if (!excelParserModule && excelParserResult.status === "rejected") {
            console.warn("Shared excel parser module could not be loaded.", excelParserResult.reason);
          }
          if (!studyPersistenceModule && studyPersistenceResult.status === "rejected") {
            console.warn("Study persistence module could not be loaded.", studyPersistenceResult.reason);
          }
          if (typeof dataStoreModule?.initSharedStore === "function") await dataStoreModule.initSharedStore();
          return { dataStoreModule, excelParserModule, studyPersistenceModule };
        })
        .catch((err) => {
          console.warn("Shared modules could not be loaded.", err);
          sharedModulesPromise = null;
          return null;
        });
    }
    return sharedModulesPromise;
  }

  const getRowsForSharedStore = dashboardWorkbookMirror.getRowsForSharedStore || function (rows, fileId) {
    return (rows || []).filter((row) => row?.__fileid === fileId);
  };

  const buildSharedWorkbookLiteData = dashboardWorkbookMirror.buildSharedWorkbookLiteData
    ? function (workbookData) {
        return dashboardWorkbookMirror.buildSharedWorkbookLiteData(workbookData, {
          version: SHARED_STORE_FALLBACK_VERSION,
        });
      }
    : function (workbookData) {
    const gp = workbookData?.generalParams || workbookData?.sheets?.generalParameters || {};
    const synthesisRows = Array.isArray(workbookData?.sheets?.synthesis) ? workbookData.sheets.synthesis : [];
    const synthesisSubsystems = Array.from(new Set(
      synthesisRows
        .map((row) => String(row?.subsystem || row?.sub_system || "").trim())
        .filter(Boolean)
    )).sort((a, b) => String(a).localeCompare(String(b)));
    const synthesisCurrencies = Array.from(new Set(
      synthesisRows
        .map((row) => String(row?.currency || row?.Currency || "").trim().toUpperCase())
        .filter(Boolean)
    )).sort((a, b) => String(a).localeCompare(String(b)));
    const hoursReportRows = Array.isArray(workbookData?.sheets?.hoursReport) ? workbookData.sheets.hoursReport : [];
    const workloadSynthesisRows = synthesisRows.map(function (row) {
      return {
        subsystem: row.subsystem || "",
        type: row.type || "",
        shift: row.shift || "",
        day_technicians_optimized: row.day_technicians_optimized || 0,
        night_technicians_optimized: row.night_technicians_optimized || 0,
        paliative_hours_corrective: row.paliative_hours_corrective || 0,
        yearly_total_hours_corrective: row.yearly_total_hours_corrective || 0,
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
      version: SHARED_STORE_FALLBACK_VERSION,
      sourceId: workbookData?.sourceId || "",
      projectKey: workbookData?.projectKey || "",
      fileName: workbookData?.fileName || "",
      kind: workbookData?.kind || "",
      updatedAt: new Date().toISOString(),
      generalParams: gp,
      sheets: {
        generalParameters: gp,
        workloadSynthesis: workloadSynthesisRows,
        workloadHoursReport: workloadHoursRows,
      },
      summary: {
        synthesisSubsystems,
        synthesisCurrencies,
        synthesisRowCount: synthesisRows.length,
      },
    };
  };

  function saveSharedWorkbookLiteFallback(workbookData) {
    if (!workbookData?.sourceId) return;
    const lite = buildSharedWorkbookLiteData(workbookData);
    writeStoredJson(`${SHARED_STORE_FALLBACK_KEYS.workbookLitePrefix}${lite.sourceId}`, lite);
  }

  function saveSharedWorkbookDataFallback(workbookData) {
    if (!workbookData?.sourceId) return;
    const normalized = {
      ...workbookData,
      version: SHARED_STORE_FALLBACK_VERSION,
      updatedAt: new Date().toISOString(),
    };
    writeStoredJson(`${SHARED_STORE_FALLBACK_KEYS.workbookPrefix}${normalized.sourceId}`, normalized);
    saveSharedWorkbookLiteFallback(normalized);
    const index = readStoredJson(SHARED_STORE_FALLBACK_KEYS.workbookIndex, []);
    const nextIndex = Array.isArray(index)
      ? Array.from(new Set(index.concat([normalized.sourceId])))
      : [normalized.sourceId];
    writeStoredJson(SHARED_STORE_FALLBACK_KEYS.workbookIndex, nextIndex);
  }

  async function syncIndexedDbBridgeWorkbook(workbookData, modules) {
    const persistence = modules?.studyPersistenceModule;
    if (!persistence?.ensureDashboardBridgeStudy || !persistence?.registerSource || !persistence?.saveNormalizedWorkbook) return;

    const bridgeStudy = await persistence.ensureDashboardBridgeStudy({
      targetCurrency: state.currentMaterialCurrency || "USD",
    });
    const sourceRecord = await persistence.registerSource({
      sourceId: workbookData.sourceId,
      studyId: bridgeStudy.studyId,
      projectKey: workbookData.projectKey || "",
      sourceType: workbookData.sourceType || "upload",
      label: workbookData.label || workbookData.fileName || workbookData.sourceId,
      fileName: workbookData.fileName || "",
      url: workbookData.remoteUrl || "",
      syncMode: workbookData.remoteUrl ? "auto" : "manual",
      lastImportedAt: new Date().toISOString(),
      lastSyncedAt: new Date().toISOString(),
      status: "ready",
    });
    await persistence.saveNormalizedWorkbook(sourceRecord.sourceId, {
      ...workbookData,
      sourceId: sourceRecord.sourceId,
      studyId: bridgeStudy.studyId,
    });
  }

  function removeSharedWorkbookDataFallback(fileIds) {
    const ids = Array.from(new Set((fileIds || []).filter(Boolean)));
    if (!ids.length) return;
    ids.forEach((fileId) => {
      try {
        localStorage.removeItem(`${SHARED_STORE_FALLBACK_KEYS.workbookPrefix}${fileId}`);
        localStorage.removeItem(`${SHARED_STORE_FALLBACK_KEYS.workbookLitePrefix}${fileId}`);
      } catch {
        // Ignore storage failures.
      }
    });
    const index = readStoredJson(SHARED_STORE_FALLBACK_KEYS.workbookIndex, []);
    const nextIndex = Array.isArray(index) ? index.filter((id) => !ids.includes(id)) : [];
    writeStoredJson(SHARED_STORE_FALLBACK_KEYS.workbookIndex, nextIndex);
  }

  function saveSharedSettingsFallback() {
    writeStoredJson(SHARED_STORE_FALLBACK_KEYS.settings, {
      version: SHARED_STORE_FALLBACK_VERSION,
      targetCurrency: state.currentMaterialCurrency || "USD",
      exchangeBase: state.exchangeBase || "USD",
      liveRates: state.exchangeRates || {},
      manualRates: state.manualExchangeRates || {},
      lastUpdated: state.exchangeLastUpdated || "",
      provider: state.exchangeProvider || "",
    });
  }

  function buildGeneralParametersRows(generalParams) {
    return Object.entries(generalParams || {}).map(([name, value]) => ({
      Nom: name,
      Valeur: value,
    }));
  }

  function buildSharedWorkbookData(fileId, parserModule) {
    const meta = state.fileMeta?.[fileId] || {};
    const file = state.files.find((item) => item.id === fileId) || {};
    const generalParams = meta.gp || {};
    const deqVmiRows = getRowsForSharedStore(state.correctiveRows, fileId)
      .filter((row) => row?.__material_origin === "deq_vmi_planning");
    const sheetMap = {
      Synthesis: getRowsForSharedStore(state.synthesisRows, fileId),
      "General Parameters": buildGeneralParametersRows(generalParams),
      "Corrective Planning": getRowsForSharedStore(state.correctiveRows, fileId),
      DEQ_VMI_Planning: deqVmiRows,
      "Overhaul and Renewal Planning": getRowsForSharedStore(state.overhaulRows, fileId),
      "Subcontracting Planning": getRowsForSharedStore(state.subcontractingRows, fileId),
      "Planning Complet": getRowsForSharedStore(state.planningRows, fileId),
      "Technicians Needed Per Day": getRowsForSharedStore(state.techRows, fileId),
      "Hours Report": getRowsForSharedStore(state.hoursReportRows, fileId),
      Generic: getRowsForSharedStore(state.genericRows, fileId),
    };
    const parser = parserModule;
    const workbookData = parser?.parseWorkbookFromSheetMap
      ? parser.parseWorkbookFromSheetMap(sheetMap, {
          sourceId: fileId,
          projectKey: meta.projectKey || "",
          fileName: meta.name || file.name || "",
          kind: meta.kind || "",
          label: meta.label || file.name || "",
          sourceType: meta.sourceType || file.sourceType || "local",
          remoteUrl: meta.remoteUrl || "",
          remoteSourceKey: meta.remoteSourceKey || "",
          localSourceKey: meta.localSourceKey || "",
          updatedAt: new Date().toISOString(),
        })
      : null;

    if (workbookData) {
      workbookData.generalParams = generalParams;
      workbookData.sheets.generalParameters = generalParams;
      workbookData.sheets.genericRows = getRowsForSharedStore(state.genericRows, fileId);
      return workbookData;
    }

    return {
      sourceId: fileId,
      projectKey: meta.projectKey || "",
      fileName: meta.name || file.name || "",
      kind: meta.kind || "",
      label: meta.label || file.name || "",
      sourceType: meta.sourceType || file.sourceType || "local",
      remoteUrl: meta.remoteUrl || "",
      remoteSourceKey: meta.remoteSourceKey || "",
      localSourceKey: meta.localSourceKey || "",
      generalParams,
      sheets: {
        synthesis: getRowsForSharedStore(state.synthesisRows, fileId),
        generalParameters: generalParams,
        correctivePlanning: getRowsForSharedStore(state.correctiveRows, fileId),
        deqVmiPlanning: deqVmiRows,
        overhaulRenewalPlanning: getRowsForSharedStore(state.overhaulRows, fileId),
        subcontractingPlanning: getRowsForSharedStore(state.subcontractingRows, fileId),
        planningComplet: getRowsForSharedStore(state.planningRows, fileId),
        techniciansNeededPerDay: getRowsForSharedStore(state.techRows, fileId),
        genericRows: getRowsForSharedStore(state.genericRows, fileId),
        hoursReport: getRowsForSharedStore(state.hoursReportRows, fileId),
      },
    };
  }

  async function syncSharedWorkbookDataForFile(fileId) {
    if (!fileId || !state.fileMeta?.[fileId]) return;
    const modules = await loadSharedModules();
    const workbookData = buildSharedWorkbookData(fileId, modules?.excelParserModule || null);
    saveSharedWorkbookLiteFallback(workbookData);
    if (!modules?.dataStoreModule?.saveWorkbookData) {
      saveSharedWorkbookDataFallback(workbookData);
      return;
    }
    try {
      await modules.dataStoreModule.saveWorkbookData(workbookData);
      try {
        await syncIndexedDbBridgeWorkbook(workbookData, modules);
      } catch (bridgeErr) {
        console.warn(`Failed to sync workbook ${fileId} to IndexedDB bridge.`, bridgeErr);
      }
    } catch (err) {
      console.warn(`Failed to sync workbook ${fileId} to shared store.`, err);
      saveSharedWorkbookDataFallback(workbookData);
      try {
        await syncIndexedDbBridgeWorkbook(workbookData, modules);
      } catch (bridgeErr) {
        console.warn(`Failed to sync workbook ${fileId} to IndexedDB bridge after fallback.`, bridgeErr);
      }
    }
  }

  async function removeSharedWorkbookDataForFiles(fileIds) {
    const ids = Array.from(new Set((fileIds || []).filter(Boolean)));
    if (!ids.length) return;
    const modules = await loadSharedModules();
    if (!modules?.dataStoreModule?.removeWorkbookData) {
      removeSharedWorkbookDataFallback(ids);
    } else {
      await Promise.all(ids.map(async (fileId) => {
        try {
          await modules.dataStoreModule.removeWorkbookData(fileId);
        } catch (err) {
          console.warn(`Failed to remove workbook ${fileId} from shared store.`, err);
          removeSharedWorkbookDataFallback([fileId]);
        }
      }));
    }
    if (modules?.studyPersistenceModule?.removeSource) {
      await Promise.all(ids.map(async (fileId) => {
        try {
          await modules.studyPersistenceModule.removeSource(fileId);
        } catch (err) {
          console.warn(`Failed to remove workbook ${fileId} from IndexedDB bridge.`, err);
        }
      }));
    }
  }

  async function syncSharedSettings() {
    const modules = await loadSharedModules();
    if (!modules?.dataStoreModule?.saveSharedSettings) {
      saveSharedSettingsFallback();
      return;
    }
    try {
      await modules.dataStoreModule.saveSharedSettings({
        targetCurrency: state.currentMaterialCurrency || "USD",
        exchangeBase: state.exchangeBase || "USD",
        liveRates: state.exchangeRates || {},
        manualRates: state.manualExchangeRates || {},
        lastUpdated: state.exchangeLastUpdated || "",
        provider: state.exchangeProvider || "",
      });
    } catch (err) {
      console.warn("Failed to sync shared dashboard settings.", err);
      saveSharedSettingsFallback();
    }
  }

  function queueSharedWorkbookSync(fileId) {
    void syncSharedWorkbookDataForFile(fileId);
  }

  function queueSharedWorkbookRemoval(fileIds) {
    removeSharedWorkbookDataFallback(fileIds);
    void removeSharedWorkbookDataForFiles(fileIds);
  }

  function queueSharedSettingsSync() {
    void syncSharedSettings();
  }

  function getLoadedRowCount() {
    return state.mode === "output_planning"
      ? state.planningRows.length + state.techRows.length + state.synthesisRows.length + state.correctiveRows.length + state.overhaulRows.length + state.subcontractingRows.length
      : state.genericRows.length;
  }

  function setRemoteExcelUrlStatus(text, tone = "muted") {
    const el = $('remoteExcelUrlStatus');
    if (!el) return;
    el.textContent = text;
    el.className = `mt-2 text-[11px] ${
      tone === "error"
        ? "text-rose-600 dark:text-rose-400"
        : tone === "success"
          ? "text-emerald-600 dark:text-emerald-400"
          : "text-slate-500 dark:text-slate-400"
    }`;
  }

  function normalizeRemoteUrl(url) {
    return String(url || "").trim();
  }

  function getRemoteSourceKey(url) {
    return normalizeRemoteUrl(url).toLowerCase();
  }

  function isRemoteExcelUrl(url) {
    const normalized = normalizeRemoteUrl(url);
    if (!/^https?:\/\//i.test(normalized)) return false;
    try {
      new URL(normalized);
      return true;
    } catch {
      return false;
    }
  }

  function getDownloadableRemoteUrl(url) {
    const normalized = normalizeRemoteUrl(url);
    try {
      const parsed = new URL(normalized);
      const host = parsed.hostname.toLowerCase();
      if (host.includes("sharepoint.com") || host.includes("1drv.ms") || host.includes("onedrive")) {
        parsed.searchParams.set("download", "1");
        if (parsed.searchParams.has("web")) parsed.searchParams.set("web", "0");
      }
      return parsed.toString();
    } catch {
      return normalized;
    }
  }

  function getRemoteFileName(url, headers) {
    const disposition = headers?.get?.("content-disposition") || "";
    const match = disposition.match(/filename\*?=(?:UTF-8''|")?([^\";]+)/i);
    if (match?.[1]) return decodeURIComponent(match[1].replace(/"/g, "").trim());
    try {
      const parsed = new URL(url);
      const candidate = parsed.pathname.split('/').filter(Boolean).pop();
      if (candidate) return decodeURIComponent(candidate);
    } catch {
      // Ignore parsing failure.
    }
    return "remote_import.xlsx";
  }

  async function hashArrayBuffer(buffer) {
    if (globalThis.crypto?.subtle) {
      const digest = await globalThis.crypto.subtle.digest("SHA-256", buffer);
      return Array.from(new Uint8Array(digest)).map((value) => value.toString(16).padStart(2, "0")).join("");
    }
    return `${buffer.byteLength}:${Date.now()}`;
  }

  async function ensureFileHandlePermission(handle) {
    if (!handle?.queryPermission || !handle?.requestPermission) return true;
    const options = { mode: "read" };
    if ((await handle.queryPermission(options)) === "granted") return true;
    return (await handle.requestPermission(options)) === "granted";
  }

  function setFileSelection(fileId, checked) {
    if (!(state.selectedFileIds instanceof Set)) state.selectedFileIds = new Set();
    if (checked) state.selectedFileIds.add(fileId);
    else state.selectedFileIds.delete(fileId);
    updateDeleteFilesBtn();
  }

  function updateDeleteFilesBtn() {
    const btn = $('deleteFilesBtn');
    if (!btn) return;
    const count = state.selectedFileIds instanceof Set ? state.selectedFileIds.size : 0;
    btn.disabled = count === 0;
    btn.textContent = count > 0 ? `Delete Selected (${count})` : 'Delete Selected';
  }

  function removeFiles(fileIds, { preserveRemoteSources = false, preserveLocalSources = false, silentStatus = false } = {}) {
    const unique = Array.from(new Set((fileIds || []).filter(Boolean)));
    if (!unique.length) return;
    const removeSet = new Set(unique);

    const filterRows = (rows = []) => rows.filter((r) => !removeSet.has(r.__fileid));

    state.planningRows = filterRows(state.planningRows);
    state.techRows = filterRows(state.techRows);
    state.synthesisRows = filterRows(state.synthesisRows);
    state.correctiveRows = filterRows(state.correctiveRows);
    state.overhaulRows = filterRows(state.overhaulRows);
    state.subcontractingRows = filterRows(state.subcontractingRows);
    state.genericRows = filterRows(state.genericRows);
    state.hoursReportRows = filterRows(state.hoursReportRows);
    state.files = state.files.filter((f) => !removeSet.has(f.id));

    removeSet.forEach((id) => {
      const remoteKey = state.fileMeta[id]?.remoteSourceKey;
      const localKey = state.fileMeta[id]?.localSourceKey;
      if (!preserveRemoteSources && remoteKey) delete state.remoteSources[remoteKey];
      if (!preserveLocalSources && localKey) delete state.localLinkedSources[localKey];
      delete state.fileMeta[id];
      state.selectedFileIds?.delete(id);
      if (state.activeFileIds instanceof Set) state.activeFileIds.delete(id);
    });

    if (!Object.keys(state.remoteSources || {}).length && !Object.keys(state.localLinkedSources || {}).length && state._remoteSyncTimer) {
      clearInterval(state._remoteSyncTimer);
      state._remoteSyncTimer = null;
    }

    if (state.planningRows.length > 0) state.mode = "output_planning";
    else if (state.genericRows.length > 0) state.mode = "generic";
    else state.mode = "auto";

    if (!state.files.length) state.activeFileIds = null;
    updateMaterialsColumns();
    updateOverhaulColumns();
    updateSubcontractingColumns();

    renderFilesList();
    renderScopeList();
    applyScopeProjectInfo();
    rebuildFilters();
    recomputeAndRender();
    updateDeleteFilesBtn();
    queueSharedWorkbookRemoval(unique);

    if (!silentStatus) $('statusLine').textContent = `Removed ${unique.length} file(s).`;
  }

  function buildProjectKey(gp) {
    const get = (k) => (gp && gp[k] !== undefined && gp[k] !== null) ? String(gp[k]).trim() : "";
    const name = get("project_name") || get("project") || "";
    const type = get("project_type") || "";
    const bid  = get("bid_year") || "";
    const serv = get("service_year") || "";
    // clé stable, normalisée
    return normalizeKey([name, type, bid, serv].filter(Boolean).join("|")) || "";
  }

  function getProjectKeyForFileId(fileId) {
    return state.fileMeta[fileId]?.projectKey || "";
  }

  function parseOptionalNumber(value) {
    if (value === null || value === undefined) return null;
    const text = String(value).trim();
    if (!text) return null;
    const match = text.match(/-?\d+(?:[.,]\d+)?/);
    if (!match) return null;
    const parsed = toNumber(match[0]);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function formatContractDurationYears(value) {
    if (!Number.isFinite(value) || value <= 0) return "—";
    const rounded = Math.round(value * 10) / 10;
    const text = Number.isInteger(rounded)
      ? String(rounded)
      : new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(rounded);
    return `${text} years`;
  }

  function computeAutoContractDurationInfo(gp = {}) {
    const baseDuration = parseOptionalNumber(gp?.contract_duration_years ?? gp?.contract_duration);
    const correctiveStart = parseOptionalNumber(gp?.correc_ovh_start_year);
    const correctiveEnd = parseOptionalNumber(gp?.correc_ovh_end_year);
    const planningYear = parseOptionalNumber(gp?.planning_year);
    const serviceYear = parseOptionalNumber(gp?.service_year);
    let value = baseDuration;
    let formula = "contract_duration_years";

    if (correctiveStart !== null && correctiveEnd !== null) {
      value = correctiveEnd - correctiveStart;
      formula = "correc_ovh_end_year - correc_ovh_start_year";
    } else if (correctiveStart !== null && correctiveEnd === null) {
      value = baseDuration !== null ? baseDuration - correctiveStart : null;
      formula = "contract_duration_years - correc_ovh_start_year";
    } else if (correctiveEnd !== null && correctiveStart === null) {
      value = planningYear !== null && serviceYear !== null
        ? correctiveEnd - (serviceYear - planningYear)
        : baseDuration;
      formula = "correc_ovh_end_year - (service_year - planning_year)";
    }

    const safeValue = Number.isFinite(value) ? Math.max(0, value) : 0;
    return {
      value: safeValue,
      label: formatContractDurationYears(safeValue),
      formula,
      baseDuration,
      correctiveStart,
      correctiveEnd,
      planningYear,
      serviceYear,
    };
  }

  function getResolvedContractDurationInfo(gp = {}, projectKey = "") {
    const resolvedProjectKey = projectKey || buildProjectKey(gp);
    const manualValue = parseOptionalNumber(state.manualContractDurationByProject?.[resolvedProjectKey]);
    const autoInfo = computeAutoContractDurationInfo(gp);
    if (manualValue !== null && manualValue > 0) {
      const safeManual = Math.max(0, manualValue);
      return {
        value: safeManual,
        label: formatContractDurationYears(safeManual),
        source: "manual",
        projectKey: resolvedProjectKey,
        autoValue: autoInfo.value,
        autoLabel: autoInfo.label,
        autoFormula: autoInfo.formula,
      };
    }
    return {
      value: autoInfo.value,
      label: autoInfo.label,
      source: "auto",
      projectKey: resolvedProjectKey,
      autoValue: autoInfo.value,
      autoLabel: autoInfo.label,
      autoFormula: autoInfo.formula,
    };
  }

  function getRepresentativeProjectEntries(fileIds = getEffectiveFileIds()) {
    const byProject = new Map();
    fileIds.filter(Boolean).forEach((fileId) => {
      const meta = state.fileMeta?.[fileId] || {};
      const gp = meta.gp || {};
      const projectKey = meta.projectKey || buildProjectKey(gp) || `__file__${fileId}`;
      const candidate = {
        projectKey,
        fileId,
        gp,
        label: getProjectLabelForFileId(fileId),
        kind: meta.kind || "",
      };
      const current = byProject.get(projectKey);
      if (!current || candidate.kind === "output_planning") byProject.set(projectKey, candidate);
    });
    return Array.from(byProject.values()).sort((a, b) => a.label.localeCompare(b.label));
  }

  function getFileIdsForProjectKey(pk) {
    return state.files
      .map(f => f.id)
      .filter(id => id && getProjectKeyForFileId(id) === pk);
  }

  function getProjectLabelForFileId(fileId) {
    const meta = state.fileMeta?.[fileId] || {};
    const gp = meta?.gp || {};
    const project = String(gp.project_name ?? gp.project ?? meta.label ?? meta.name ?? "").trim();
    return project || "Unspecified project";
  }

  function getSelectedProjectKeys() {
    const ids = getEffectiveFileIds(); // ✅ inclut Project Name/Type
    const keys = ids.map(getProjectKeyForFileId).filter(Boolean);
    return Array.from(new Set(keys));
  }

  function pickCol(columns, candidates) {
    const set = new Set(columns);
    for (const c of candidates) {
      if (set.has(c)) return c;
    }
    return null;
  }

  const formatInt = dashboardUtils.formatInt || function (n) {
    if (n === null || n === undefined || Number.isNaN(n)) return "0";
    return new Intl.NumberFormat().format(Math.round(n));
  };

  const formatHours = dashboardUtils.formatHours || function (n) {
    if (n === null || n === undefined || Number.isNaN(n)) return "0h";
    const rounded = Math.round(n * 10) / 10;
    return `${new Intl.NumberFormat().format(rounded)}h`;
  };

  const formatCompactNumber = dashboardUtils.formatCompactNumber || function (n, digits = 1) {
    if (n === null || n === undefined || Number.isNaN(n)) return "0";
    return new Intl.NumberFormat("en-US", {
      notation: "compact",
      maximumFractionDigits: digits,
    }).format(n);
  };

  function formatCurrencyValue(amount, currency, digits = 0) {
    const code = normalizeCurrencyCode(currency) || "USD";
    const value = Number.isFinite(amount) ? amount : 0;
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: code,
        maximumFractionDigits: digits,
        minimumFractionDigits: 0,
      }).format(value);
    } catch {
      return `${formatCompactNumber(value, Math.min(2, digits + 1))} ${code}`;
    }
  }

  function formatRate(n) {
    if (!Number.isFinite(n) || n <= 0) return "—";
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 6,
    }).format(n);
  }

  function formatAmountWithCurrency(amount, currency, digits = 0) {
    const value = Number.isFinite(amount) ? amount : 0;
    const code = normalizeCurrencyCode(currency);
    if (!code) return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: digits }).format(value)} N/A`;
    return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: digits }).format(value)} ${code}`;
  }

  const escapeHtml = dashboardUtils.escapeHtml || function (s) {
    return String(s ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  };

  const toNumber = dashboardUtils.toNumber || function (v) {
    if (v === null || v === undefined) return 0;
    if (typeof v === "number") return Number.isFinite(v) ? v : 0;

    let s = String(v).trim();
    if (!s) return 0;

    // Handle time "hh:mm" (or "hh:mm:ss") as hours
    const hm = s.match(/^(-?\d+):(\d{1,2})(?::(\d{1,2}))?$/);
    if (hm) {
      const h = Number(hm[1]);
      const m = Number(hm[2]);
      const sec = hm[3] ? Number(hm[3]) : 0;
      return (Number.isFinite(h) ? h : 0) + (Number.isFinite(m) ? m : 0) / 60 + (Number.isFinite(sec) ? sec : 0) / 3600;
    }

    // Handle French decimals "1,5"
    s = s.replace(/\s/g, "").replace(",", ".");
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  };

  const excelDateToJSDate = dashboardUtils.excelDateToJSDate || function (excelNum) {
    // Excel serial date: days since 1899-12-30
    const epoch = new Date(Date.UTC(1899, 11, 30));
    const ms = excelNum * 24 * 60 * 60 * 1000;
    return new Date(epoch.getTime() + ms);
  };

  function getAllFileIds() {
    return state.files.map(f => f.id).filter(Boolean);
  }

  function isRowInScope(row) {
    const fid = row.__fileid;

    // scope checkbox
    if (state.activeFileIds !== null) {
      if (!state.activeFileIds || state.activeFileIds.size === 0) return false;
      if (!state.activeFileIds.has(fid)) return false;
    }

    // ✅ filtre Project Name / Project Type
    if (!fileMatchesProjectFilters(fid)) return false;

    return true;
  }

  function scopedRows(rows) {
    return rows.filter(isRowInScope);
  }

  const parseDate = dashboardUtils.parseDate || function (v) {
    if (v === null || v === undefined || v === "") return null;
    if (v instanceof Date && !Number.isNaN(v.getTime())) return v;
    if (typeof v === "number") {
      const d = excelDateToJSDate(v);
      return Number.isNaN(d.getTime()) ? null : d;
    }
    const s = String(v).trim();
    // Try ISO, then locale-ish
    const d = new Date(s);
    if (!Number.isNaN(d.getTime())) return d;

    // Try DD/MM/YYYY
    const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
    if (m) {
      const dd = Number(m[1]);
      const mm = Number(m[2]) - 1;
      let yy = Number(m[3]);
      if (yy < 100) yy += 2000;
      const d2 = new Date(yy, mm, dd);
      return Number.isNaN(d2.getTime()) ? null : d2;
    }
    return null;
  };

  function readSheet(wb, sheetName, fileName, fileId) {
    const ws = wb.Sheets[sheetName];
    if (!ws) return [];
    const json = XLSX.utils.sheet_to_json(ws, { defval: null });
    return json.map((row) => {
      const out = { __sheet: sheetName, __file: fileName, __fileid: fileId };
      for (const [k, v] of Object.entries(row)) out[normalizeKey(k)] = v;
      return out;
    });
  }

  function mapDeqVmiRows(rows = []) {
    const pickValue = (...values) => {
      for (const value of values) {
        if (value !== null && value !== undefined && String(value).trim() !== "") return value;
      }
      return null;
    };

    return rows
      .filter((row) => /preventive|corrective/i.test(String(pickValue(row?.type, row?.maintenance_type, row?.preventive_corrective) || "")))
      .map((row) => ({
        ...row,
        __material_origin: "deq_vmi_planning",
        year: pickValue(row?.year, row?.year_of_planning, row?.planning_year, row?.budget_year),
        currency: pickValue(row?.currency, row?.curr, row?.devise),
        subsystem: pickValue(row?.subsystem, row?.system, row?.sub_system),
        equipment: pickValue(row?.equipment, row?.equipment_name, row?.asset, row?.asset_name),
        source: pickValue(row?.source, row?.vendor_source, row?.origin),
        total_cost_estimated: pickValue(row?.total_cost_estimated, row?.estimated_total_cost, row?.total_estimated_cost, row?.unit_cost),
        reparable_cost_estimated: 0,
      }));
  }

  function mapDeqVmiOverhaulRows(rows = []) {
    const pickValue = (...values) => {
      for (const value of values) {
        if (value !== null && value !== undefined && String(value).trim() !== "") return value;
      }
      return null;
    };

    return rows
      .filter((row) => /overhaul|renewal/i.test(String(pickValue(row?.type, row?.maintenance_type, row?.preventive_corrective) || "")))
      .map((row) => {
        const type = normalizeOverhaulTypeCategory(pickValue(row?.type, row?.maintenance_type, row?.preventive_corrective));
        const year = pickValue(row?.year_of_planning, row?.planning_year, row?.year, row?.budget_year);
        const currency = pickValue(row?.currency, row?.curr, row?.devise);
        const subsystem = pickValue(row?.subsystem, row?.system, row?.sub_system);
        const equipment = pickValue(row?.equipment, row?.equipment_name, row?.asset, row?.asset_name);
        const unitCost = pickValue(row?.unit_cost, row?.global_cost, row?.total_cost, row?.overall_cost);
        return {
          ...row,
          __overhaul_origin: "deq_vmi_planning",
          year_of_planning: year,
          year: year,
          currency,
          subsystem,
          equipment,
          type,
          material_cost: unitCost,
          tc_cost: 0,
          management_cost: 0,
          global_cost: unitCost,
        };
      });
  }

  function normStr(v) { return String(v ?? "").trim().toLowerCase(); }

  function getSelectedSubsystems() {
    if (Array.isArray(state.currentSubsystem)) {
      return Array.from(new Set(
        state.currentSubsystem
          .map((value) => String(value ?? "").trim())
          .filter((value) => value && value !== "__ALL__")
      ));
    }
    if (!state.currentSubsystem || state.currentSubsystem === "__ALL__") return [];
    const value = String(state.currentSubsystem).trim();
    return value ? [value] : [];
  }

  function normalizeSubsystemSelection(selection) {
    const values = Array.isArray(selection) ? selection : [selection];
    const normalized = Array.from(new Set(
      values
        .map((value) => String(value ?? "").trim())
        .filter((value) => value && value !== "__ALL__")
    ));
    if (values.some((value) => String(value ?? "").trim() === "__ALL__") && !normalized.length) return "__ALL__";
    return normalized.length ? normalized : "__ALL__";
  }

  function shouldFilterBySubsystem() {
    return Array.isArray(state.currentSubsystem);
  }

  function getSelectedProjectNames() {
    if (Array.isArray(state.currentProjectName)) {
      return Array.from(new Set(
        state.currentProjectName
          .map((value) => String(value ?? "").trim())
          .filter((value) => value && value !== "__ALL__")
      ));
    }
    if (!state.currentProjectName || state.currentProjectName === "__ALL__") return [];
    const value = String(state.currentProjectName).trim();
    return value ? [value] : [];
  }

  function normalizeProjectNameSelection(selection) {
    const values = Array.isArray(selection) ? selection : [selection];
    const normalized = Array.from(new Set(
      values
        .map((value) => String(value ?? "").trim())
        .filter((value) => value && value !== "__ALL__")
    ));
    if (values.some((value) => String(value ?? "").trim() === "__ALL__") && !normalized.length) return "__ALL__";
    return normalized.length ? normalized : "__ALL__";
  }

  function shouldFilterByProjectName() {
    return Array.isArray(state.currentProjectName);
  }

  function projectNameMatchesSelection(value) {
    if (shouldFilterByProjectName() && !state.currentProjectName.length) return false;
    const selected = getSelectedProjectNames().map(normStr);
    if (!selected.length) return true;
    return selected.includes(normStr(value));
  }

  function formatProjectSelectionLabel() {
    const selected = getSelectedProjectNames();
    if (shouldFilterByProjectName() && !selected.length) return "No project selected";
    if (!selected.length) return "All projects";
    if (selected.length <= 2) return selected.join(", ");
    return `${selected.length} projects selected`;
  }

  function subsystemMatchesSelection(value) {
    if (shouldFilterBySubsystem() && !state.currentSubsystem.length) return false;
    const selected = getSelectedSubsystems();
    if (!selected.length) return true;
    return selected.includes(String(value ?? "").trim());
  }

  function formatSubsystemSelectionLabel() {
    const selected = getSelectedSubsystems();
    if (shouldFilterBySubsystem() && !selected.length) return "No subsystem selected";
    if (!selected.length) return "All subsystems";
    if (selected.length === 1) return `Subsystem: ${selected[0]}`;
    if (selected.length <= 3) return `Subsystems: ${selected.join(", ")}`;
    return `Subsystems: ${selected.length} selected`;
  }

  function syncWorkloadFilterHint() {
    const activityFilter = $('activityFilter');
    const hint = activityFilter?.closest('.bg-white')?.querySelector('p.text-\\[11px\\]');
    if (hint) hint.textContent = 'Filters all charts in the Workload view based on the selected activity.';
  }

  function getFilteredDurationAndBarsRows({
    includeEquipment = true,
    includeLocation = true,
  } = {}) {
    const rows = getFilteredPlanningRows();
    const equipmentCol = state.columns.equipment;
    const locationCol = state.columns.location;

    return rows.filter((row) => {
      if (includeEquipment && state.currentWorkloadEquipment !== "__ALL__") {
        if (!equipmentCol || String(row?.[equipmentCol] ?? "").trim() !== String(state.currentWorkloadEquipment)) return false;
      }
      if (includeLocation && state.currentWorkloadLocation !== "__ALL__") {
        if (!locationCol || String(row?.[locationCol] ?? "").trim() !== String(state.currentWorkloadLocation)) return false;
      }
      return true;
    });
  }

  function getScopeFileIdsOnly() {
    // Scope checkbox uniquement (sans filtre projet)
    return (state.activeFileIds === null)
      ? state.files.map(f => f.id)
      : Array.from(state.activeFileIds || []);
  }

  function fileMatchesProjectFilters(fileId) {
    const meta = state.fileMeta[fileId];
    const gp = meta?.gp || {};

    const name = normStr(gp.project_name || gp.project || meta?.label || "");
    const type = normStr(gp.project_type || "");

    if (!projectNameMatchesSelection(name)) return false;
    if (state.currentProjectType !== "__ALL__" && type !== normStr(state.currentProjectType)) return false;

    return true;
  }

  function getEffectiveFileIds({ kind = null } = {}) {
    // Scope checkbox + dropdown project + (optionnel) kind
    return getScopeFileIdsOnly()
      .filter(Boolean)
      .filter(id => fileMatchesProjectFilters(id))
      .filter(id => !kind || state.fileMeta[id]?.kind === kind);
  }

  function rebuildProjectFilters() {
    const list = $('projectList');
    const summary = $('projectSummary');
    const typeSel = $('projectTypeFilter');
    if (!list || !summary || !typeSel) return;

    const prevNames = getSelectedProjectNames();
    const prevType = state.currentProjectType;

    // Options basées sur le scope checkbox (pas sur le filtre projet, sinon tu te bloques)
    const ids = getScopeFileIdsOnly().filter(Boolean);

    const names = new Set();
    const types = new Set();

    for (const id of ids) {
      const meta = state.fileMeta[id];
      const gp = meta?.gp;
      if (!gp) continue;

      const n = String(gp.project_name ?? gp.project ?? "").trim();
      const t = String(gp.project_type ?? "").trim();
      if (n) names.add(n);
      if (t) types.add(t);
    }
    if (typeof getRiskAssessmentProjects === "function") {
      getRiskAssessmentProjects().forEach((project) => {
        const name = String(project?.projectName || "").trim();
        const type = String(project?.projectType || "").trim();
        if (name) names.add(name);
        if (type) types.add(type);
      });
    }

    const nameList = Array.from(names).sort((a,b)=>a.localeCompare(b));
    const typeList = Array.from(types).sort((a,b)=>a.localeCompare(b));

    const validSelectedNames = prevNames.filter((value) => nameList.includes(value));
    state.currentProjectName = shouldFilterByProjectName()
      ? validSelectedNames
      : normalizeProjectNameSelection(validSelectedNames);
    const currentNames = getSelectedProjectNames();

    summary.textContent = formatProjectSelectionLabel();

    if (!nameList.length) {
      list.innerHTML = `
        <div class="p-3 rounded-lg border border-dashed border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-sm">
          No project available yet.
        </div>
      `;
      state.currentProjectName = "__ALL__";
      summary.textContent = "All projects";
    } else {
      list.innerHTML = nameList.map((value) => `
        <label class="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer">
          <input type="checkbox" data-project-value="${escapeHtml(value)}" class="rounded border-slate-300 dark:border-slate-600" ${currentNames.includes(value) ? 'checked' : ''}>
          <span class="text-sm text-slate-700 dark:text-slate-200">${escapeHtml(value)}</span>
        </label>
      `).join("");

      list.querySelectorAll('input[type="checkbox"][data-project-value]').forEach((input) => {
        input.addEventListener('change', () => {
          const selected = Array.from(list.querySelectorAll('input[type="checkbox"][data-project-value]:checked'))
            .map((el) => el.getAttribute('data-project-value'))
            .filter(Boolean);
          state.currentProjectName = selected.length ? normalizeProjectNameSelection(selected) : [];
          rebuildFilters();
          applyScopeProjectInfo();
          scheduleRender();
        });
      });
    }

    typeSel.innerHTML = `<option value="__ALL__">All types</option>` +
      typeList.map(t => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join("");

    typeSel.value = typeList.includes(prevType) ? prevType : "__ALL__";
    state.currentProjectType = typeSel.value;
  }

  function parseGeneralParameters(rows) {
    if (!rows || !rows.length) return {};

    const nameKeys = ["nom", "name", "parameter", "parameter_name", "parametre", "key"];
    const valueKeys = ["valeur", "value", "parameter_value", "valeur_parametre"];
    const cols = Object.keys(rows[0] || {});
    const nameCol = nameKeys.find((key) => cols.includes(key)) || null;
    const valueCol = valueKeys.find((key) => cols.includes(key)) || null;

    if (!nameCol || !valueCol) return {};

    const out = {};
    for (const r of rows) {
      const kRaw = r[nameCol];
      if (kRaw === null || kRaw === undefined || String(kRaw).trim() === "") continue;
      const key = normalizeKey(kRaw);
      out[key] = r[valueCol];
    }
    return out;
  }

  function applyGeneralParameters(gp) {
    if (!gp) return;

    const get = (k) => gp[k] !== undefined && gp[k] !== null ? String(gp[k]).trim() : "";

    // Expected keys after normalizeKey:
    // project_name, project_type, bid_year, service_year, l_total_single_track, contract_duration_years
    const projectName = get("project_name") || get("project") || get("projectname");
    const projectType = get("project_type") || get("projecttype");

    const lineLen = get("l_total_single_track"); // <-- your requested mapping
    const bidYear = get("bid_year");
    const serviceYear = get("service_year");

    const contractDurationInfo = getResolvedContractDurationInfo(gp);

    if (projectName) $("projectName").textContent = projectName;
    if (projectType) $("projectType").textContent = projectType;

    if (lineLen) {
      // Keep your display style: "176.5 Km STK"
      const txt = /km/i.test(lineLen) ? lineLen : `${lineLen} Km`;
      $("lineLength").innerHTML = `${txt} <span class="text-[10px] font-normal text-slate-400">STK</span>`;
    }

    // Bid / Service Year displayed in the SAME cell (#serviceYear)
    if (bidYear || serviceYear) {
      const left = bidYear || "—";
      const right = serviceYear || "—";
      $("serviceYear").textContent = `${left} / ${right}`;
    }

    // Contract duration (new block)
    if ($("contractDuration")) {
      $("contractDuration").textContent = contractDurationInfo.label;
    }
  }

  function inferPlanningYear() {
    // Prefer "planning_year" from Planning Complet
    for (const r of state.planningRows) {
      const y = r.planning_year;
      if (y !== null && y !== undefined && String(y).trim() !== "") return String(y).trim();
    }
    // Else derive from first date found
    for (const r of state.planningRows) {
      const d = parseDate(r.date);
      if (d) return String(d.getFullYear());
    }
    for (const r of state.techRows) {
      const d = parseDate(r.date);
      if (d) return String(d.getFullYear());
    }
    return null;
  }

  function uniqueSorted(arr) {
    return Array.from(new Set(arr.filter(Boolean).map((x) => String(x).trim()))).sort((a, b) =>
      a.localeCompare(b)
    );
  }

  function sortDimensionValues(values) {
    return Array.from(new Set(values.filter(Boolean).map((x) => String(x).trim()))).sort((a, b) => {
      const na = Number(a);
      const nb = Number(b);
      if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
      return a.localeCompare(b);
    });
  }

  function updateMaterialsColumns() {
    const sample = state.correctiveRows.slice(0, 400);
    const cols = new Set();
    sample.forEach((row) => Object.keys(row || {}).forEach((key) => cols.add(key)));
    const colList = Array.from(cols);
    state.materialsColumns = {
      year: pickCol(colList, MATERIAL_COL_CANDIDATES.year),
      currency: pickCol(colList, MATERIAL_COL_CANDIDATES.currency),
      subsystem: pickCol(colList, MATERIAL_COL_CANDIDATES.subsystem),
      equipment: pickCol(colList, MATERIAL_COL_CANDIDATES.equipment),
      element: pickCol(colList, MATERIAL_COL_CANDIDATES.element),
      source: pickCol(colList, MATERIAL_COL_CANDIDATES.source),
      totalCost: pickCol(colList, MATERIAL_COL_CANDIDATES.totalCost),
      reparableCost: pickCol(colList, MATERIAL_COL_CANDIDATES.reparableCost),
      totalCostEstimated: pickCol(colList, MATERIAL_COL_CANDIDATES.totalCostEstimated),
      reparableCostEstimated: pickCol(colList, MATERIAL_COL_CANDIDATES.reparableCostEstimated),
    };
  }

  function updateOverhaulColumns() {
    const sample = state.overhaulRows.slice(0, 400);
    const cols = new Set();
    sample.forEach((row) => Object.keys(row || {}).forEach((key) => cols.add(key)));
    const colList = Array.from(cols);
    state.overhaulColumns = {
      year: pickCol(colList, OVERHAUL_COL_CANDIDATES.year),
      currency: pickCol(colList, OVERHAUL_COL_CANDIDATES.currency),
      subsystem: pickCol(colList, OVERHAUL_COL_CANDIDATES.subsystem),
      equipment: pickCol(colList, OVERHAUL_COL_CANDIDATES.equipment),
      element: pickCol(colList, OVERHAUL_COL_CANDIDATES.element),
      spanLife: pickCol(colList, OVERHAUL_COL_CANDIDATES.spanLife),
      type: pickCol(colList, OVERHAUL_COL_CANDIDATES.type),
      materialCost: pickCol(colList, OVERHAUL_COL_CANDIDATES.materialCost),
      tcCost: pickCol(colList, OVERHAUL_COL_CANDIDATES.tcCost),
      managementCost: pickCol(colList, OVERHAUL_COL_CANDIDATES.managementCost),
      globalCost: pickCol(colList, OVERHAUL_COL_CANDIDATES.globalCost),
    };
  }

  function updateSubcontractingColumns() {
    const sample = state.subcontractingRows.slice(0, 400);
    const cols = new Set();
    sample.forEach((row) => Object.keys(row || {}).forEach((key) => cols.add(key)));
    const colList = Array.from(cols);
    state.subcontractingColumns = {
      yearlyCost: pickCol(colList, SUBCONTRACT_COL_CANDIDATES.yearlyCost),
      currency: pickCol(colList, SUBCONTRACT_COL_CANDIDATES.currency),
      subsystem: pickCol(colList, SUBCONTRACT_COL_CANDIDATES.subsystem),
      equipment: pickCol(colList, SUBCONTRACT_COL_CANDIDATES.equipment),
      project: pickCol(colList, SUBCONTRACT_COL_CANDIDATES.project),
      activity: pickCol(colList, SUBCONTRACT_COL_CANDIDATES.activity),
      type: pickCol(colList, SUBCONTRACT_COL_CANDIDATES.type),
      frequency: pickCol(colList, SUBCONTRACT_COL_CANDIDATES.frequency),
    };
  }

  function getMaterialYearValue(row) {
    const yearCol = state.materialsColumns.year;
    const raw = yearCol ? row?.[yearCol] : null;
    if (raw !== null && raw !== undefined && String(raw).trim() !== "") return String(raw).trim();
    const dt = parseDate(row?.date ?? row?.planned_date ?? row?.target_date ?? null);
    return dt ? String(dt.getFullYear()) : "";
  }

  function getOverhaulYearValue(row) {
    const yearCol = state.overhaulColumns.year;
    const raw = yearCol ? row?.[yearCol] : null;
    if (raw !== null && raw !== undefined && String(raw).trim() !== "") return String(raw).trim();
    const dt = parseDate(row?.date ?? row?.planned_date ?? row?.target_date ?? null);
    return dt ? String(dt.getFullYear()) : "";
  }

  function getMultiSelectValues(selection) {
    if (selection === "__ALL__" || selection === null || selection === undefined) return [];
    if (Array.isArray(selection)) {
      return uniqueSorted(selection.map((value) => String(value ?? "").trim()).filter(Boolean));
    }
    const single = String(selection ?? "").trim();
    return single && single !== "__ALL__" ? [single] : [];
  }

  function normalizeMultiSelectState(values) {
    const next = uniqueSorted((values || []).map((value) => String(value ?? "").trim()).filter(Boolean));
    return next.length ? next : "__ALL__";
  }

  function matchesMultiSelectValue(selection, value) {
    const selected = getMultiSelectValues(selection);
    if (!selected.length) return true;
    return selected.includes(String(value ?? "").trim());
  }

  function formatMultiSelectSummary(selection, singularLabel, pluralLabel = `${singularLabel}s`) {
    const selected = getMultiSelectValues(selection);
    if (!selected.length) return `All ${pluralLabel}`;
    if (selected.length <= 2) return selected.join(", ");
    return `${selected.length} ${pluralLabel} selected`;
  }

  function getMaterialsBaseRows() {
    const rows = scopedRows(state.correctiveRows || []);
    const subCol = state.materialsColumns.subsystem;
    if (!subCol || state.currentSubsystem === "__ALL__") return rows;
    return rows.filter((row) => subsystemMatchesSelection(row?.[subCol]));
  }

  function getOverhaulBaseRows() {
    const rows = scopedRows(state.overhaulRows || []);
    const subCol = state.overhaulColumns.subsystem;
    if (!subCol || state.currentSubsystem === "__ALL__") return rows;
    return rows.filter((row) => subsystemMatchesSelection(row?.[subCol]));
  }

  function getSubcontractingBaseRows() {
    const rows = scopedRows(state.subcontractingRows || []);
    const subCol = state.subcontractingColumns.subsystem;
    if (!subCol || state.currentSubsystem === "__ALL__") return rows;
    return rows.filter((row) => subsystemMatchesSelection(row?.[subCol]));
  }

  function getFilteredCorrectiveRows({
    includeYear = true,
    includeEquipment = true,
    includeElement = true,
  } = {}) {
    const cols = state.materialsColumns;
    return getMaterialsBaseRows().filter((row) => {
      if (includeYear && !matchesMultiSelectValue(state.currentMaterialYear, getMaterialYearValue(row))) {
        return false;
      }
      if (includeEquipment && state.currentMaterialEquipment !== "__ALL__") {
        if (!cols.equipment || String(row?.[cols.equipment] ?? "").trim() !== String(state.currentMaterialEquipment)) return false;
      }
      if (includeElement && state.currentMaterialElement !== "__ALL__") {
        if (!cols.element || String(row?.[cols.element] ?? "").trim() !== String(state.currentMaterialElement)) return false;
      }
      return true;
    });
  }

  function getCurrenciesInRows(rows = []) {
    const currencyCol = state.materialsColumns.currency;
    const out = new Set();
    rows.forEach((row) => {
      const code = normalizeCurrencyCode(currencyCol ? row?.[currencyCol] : "");
      if (code) out.add(code);
    });
    return Array.from(out).sort((a, b) => a.localeCompare(b));
  }

  function getCurrenciesInRowsByColumn(rows = [], currencyCol = null) {
    const out = new Set();
    rows.forEach((row) => {
      const code = normalizeCurrencyCode(currencyCol ? row?.[currencyCol] : "");
      if (code) out.add(code);
    });
    return Array.from(out).sort((a, b) => a.localeCompare(b));
  }

  function getEffectiveRate(code) {
    const currency = normalizeCurrencyCode(code);
    if (!currency) return null;
    if (currency === state.exchangeBase) return 1;
    const manual = Number(state.manualExchangeRates?.[currency]);
    if (Number.isFinite(manual) && manual > 0) return manual;
    const live = Number(state.exchangeRates?.[currency]);
    if (Number.isFinite(live) && live > 0) return live;
    return null;
  }

  function convertAmount(amount, sourceCurrency, targetCurrency) {
    const value = Number(amount);
    const source = normalizeCurrencyCode(sourceCurrency);
    const target = normalizeCurrencyCode(targetCurrency || state.currentMaterialCurrency);
    if (!Number.isFinite(value)) return null;
    if (!source || !target) return null;
    if (source === target) return value;
    const sourceRate = getEffectiveRate(source);
    const targetRate = getEffectiveRate(target);
    if (!sourceRate || !targetRate) return null;
    return (value / sourceRate) * targetRate;
  }

  // -----------------------------
  // Upload wiring
  // -----------------------------
  // Data Sources dropdown behavior + use Data Sources button to load Excel
  const dsWrap = $('dataSourcesWrap');
  const dsBtn = $('dataSourcesBtn');
  const dsPanel = $('dataSourcesPanel');
  const dropZone = $('dropZone');
  const excelInput = $('excelInput');
  const remoteExcelUrlInput = $('remoteExcelUrlInput');
  const addRemoteExcelUrlBtn = $('addRemoteExcelUrlBtn');
  const linkLocalExcelBtn = $('linkLocalExcelBtn');

  const openFilePicker = () => {
    if (!excelInput) return;
    excelInput.value = "";
    excelInput.click();
  };

  dsBtn.addEventListener('click', (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    dsPanel.classList.toggle('hidden');
  });

  document.addEventListener('click', (ev) => {
    if (!dsWrap.contains(ev.target)) dsPanel.classList.add('hidden');
  });

  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') dsPanel.classList.add('hidden');
  });

  $('uploadBtn').addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    openFilePicker();
  });

  addRemoteExcelUrlBtn?.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    await addRemoteExcelUrl(remoteExcelUrlInput?.value || "");
  });

  remoteExcelUrlInput?.addEventListener('keydown', async (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    await addRemoteExcelUrl(remoteExcelUrlInput?.value || "");
  });

  linkLocalExcelBtn?.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    await addLinkedLocalExcelFiles();
  });

  $('deleteFilesBtn')?.addEventListener('click', () => {
    const count = state.selectedFileIds instanceof Set ? state.selectedFileIds.size : 0;
    if (!count) return;
    const message =
      count === 1
        ? 'Delete the selected file from memory?'
        : `Delete ${count} selected files from memory?`;
    if (!confirm(message)) return;
    removeFiles(Array.from(state.selectedFileIds));
  });

  async function syncRemoteSource(remoteKey, { force = false, silent = false } = {}) {
    const source = state.remoteSources?.[remoteKey];
    if (!source?.url) return false;
    const fetchUrl = source.fetchUrl || source.url;

    if (!silent) setRemoteExcelUrlStatus(`Syncing ${source.url}...`);
    source.status = "syncing";
    source.error = "";
    renderFilesList();

    try {
      const res = await fetch(fetchUrl, { cache: "no-store", credentials: "include" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const buffer = await res.arrayBuffer();
      const fingerprint = await hashArrayBuffer(buffer);
      const fileName = getRemoteFileName(fetchUrl, res.headers);

      if (!force && source.fingerprint && source.fingerprint === fingerprint) {
        source.status = "synced";
        source.lastCheckedAt = Date.now();
        renderFilesList();
        if (!silent) setRemoteExcelUrlStatus("Remote file checked: no update detected.", "muted");
        return false;
      }

      const existingFileId = source.fileId;
      if (existingFileId) {
        removeFiles([existingFileId], { preserveRemoteSources: true, silentStatus: true });
      }

      const file = new File([buffer], fileName, {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const fileId = await ingestExcelFile(file, {
        sourceType: "remote",
        remoteUrl: source.url,
        remoteSourceKey: remoteKey,
      });

      source.fileId = fileId;
      source.name = fileName;
      source.fingerprint = fingerprint;
      source.lastSyncAt = Date.now();
      source.lastCheckedAt = Date.now();
      source.status = "synced";
      source.error = "";
      source.etag = res.headers.get("etag") || "";
      source.lastModified = res.headers.get("last-modified") || "";
      source.contentLength = res.headers.get("content-length") || "";

      if (state.correctiveRows.length || state.overhaulRows.length || state.subcontractingRows.length) {
        await refreshExchangeRates({ silent: true });
      }

      rebuildFilters();
      recomputeAndRender();
      setupLineHover();
      renderFilesList();
      renderScopeList();
      applyScopeProjectInfo();

      $('statusLine').textContent = `Loaded ${state.files.length} file(s) - ${formatInt(getLoadedRowCount())} row(s)`;
      if (!silent) setRemoteExcelUrlStatus(`Remote file synced: ${fileName}`, "success");
      return true;
    } catch (err) {
      console.error("Remote source sync failed", err);
      source.status = "error";
      source.error = err?.message || String(err);
      source.lastCheckedAt = Date.now();
      renderFilesList();
      if (!silent) {
        const isCors = err instanceof TypeError && !source.error.startsWith("HTTP ");
        setRemoteExcelUrlStatus(
          isCors
            ? "Access blocked (CORS): the server does not allow browser requests. Download the file manually and use Upload Excel."
            : `Remote import failed: ${source.error}`,
          "error"
        );
      }
      return false;
    }
  }

  async function addRemoteExcelUrl(url) {
    const normalized = normalizeRemoteUrl(url);
    if (!isRemoteExcelUrl(normalized)) {
      setRemoteExcelUrlStatus("Enter an HTTP/HTTPS link to the Excel file or its SharePoint/OneDrive download page.", "error");
      return;
    }

    const remoteKey = getRemoteSourceKey(normalized);
    if (!state.remoteSources[remoteKey]) {
      state.remoteSources[remoteKey] = {
        url: normalized,
        fetchUrl: getDownloadableRemoteUrl(normalized),
        fileId: "",
        fingerprint: "",
        lastSyncAt: 0,
        lastCheckedAt: 0,
        status: "idle",
        error: "",
      };
    }

    const synced = await syncRemoteSource(remoteKey, { force: true });
    if (synced || state.remoteSources[remoteKey]?.fileId) {
      if (remoteExcelUrlInput) remoteExcelUrlInput.value = "";
      startRemoteSyncLoop();
      dsPanel?.classList.add('hidden');
    }
  }

  async function syncLinkedLocalSource(localKey, { force = false, silent = false } = {}) {
    const source = state.localLinkedSources?.[localKey];
    if (!source?.handle) return false;

    if (!silent) setRemoteExcelUrlStatus(`Checking linked local file ${source.name || "..."}...`);
    source.status = "syncing";
    source.error = "";
    renderFilesList();

    try {
      const hasPermission = await ensureFileHandlePermission(source.handle);
      if (!hasPermission) throw new Error("File read permission was denied");

      const file = await source.handle.getFile();
      const fingerprint = `${file.lastModified}:${file.size}`;
      if (!force && source.fingerprint && source.fingerprint === fingerprint) {
        source.status = "synced";
        source.lastCheckedAt = Date.now();
        renderFilesList();
        if (!silent) setRemoteExcelUrlStatus("Linked local file checked: no update detected.", "muted");
        return false;
      }

      if (source.fileId) {
        removeFiles([source.fileId], { preserveLocalSources: true, silentStatus: true });
      }

      const fileId = await ingestExcelFile(file, {
        sourceType: "linked_local",
        localSourceKey: localKey,
      });

      source.fileId = fileId;
      source.name = file.name;
      source.fingerprint = fingerprint;
      source.lastSyncAt = Date.now();
      source.lastCheckedAt = Date.now();
      source.status = "synced";
      source.error = "";

      if (state.correctiveRows.length || state.overhaulRows.length || state.subcontractingRows.length) {
        await refreshExchangeRates({ silent: true });
      }

      rebuildFilters();
      recomputeAndRender();
      setupLineHover();
      renderFilesList();
      renderScopeList();
      applyScopeProjectInfo();

      $('statusLine').textContent = `Loaded ${state.files.length} file(s) - ${formatInt(getLoadedRowCount())} row(s)`;
      if (!silent) setRemoteExcelUrlStatus(`Linked local file synced: ${file.name}`, "success");
      return true;
    } catch (err) {
      console.error("Linked local source sync failed", err);
      source.status = "error";
      source.error = err?.message || String(err);
      source.lastCheckedAt = Date.now();
      renderFilesList();
      if (!silent) setRemoteExcelUrlStatus(`Linked local file failed: ${source.error}`, "error");
      return false;
    }
  }

  async function addLinkedLocalExcelFiles() {
    if (!window.showOpenFilePicker) {
      setRemoteExcelUrlStatus("This browser does not support linked local files. Use Edge or Chrome, or use Upload Excel.", "error");
      return;
    }

    try {
      const handles = await window.showOpenFilePicker({
        multiple: true,
        types: [{
          description: "Excel files",
          accept: {
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
            "application/vnd.ms-excel": [".xls"],
          },
        }],
      });
      if (!handles?.length) return;

      for (const handle of handles) {
        const localKey = `${handle.name}__${Date.now()}__${Math.random().toString(16).slice(2)}`;
        state.localLinkedSources[localKey] = {
          handle,
          fileId: "",
          name: handle.name,
          fingerprint: "",
          lastSyncAt: 0,
          lastCheckedAt: 0,
          status: "idle",
          error: "",
        };
        await syncLinkedLocalSource(localKey, { force: true });
      }

      startRemoteSyncLoop();
      dsPanel?.classList.add('hidden');
    } catch (err) {
      if (err?.name === "AbortError") return;
      console.error("Link local Excel failed", err);
      setRemoteExcelUrlStatus(`Local link failed: ${err?.message || err}`, "error");
    }
  }

  async function pollRemoteSources() {
    const keys = Object.keys(state.remoteSources || {});
    if (!keys.length || state._remoteSyncInFlight) return;
    state._remoteSyncInFlight = true;
    try {
      for (const remoteKey of keys) {
        await syncRemoteSource(remoteKey, { silent: true });
      }
    } finally {
      state._remoteSyncInFlight = false;
    }
  }

  async function pollLinkedLocalSources() {
    const keys = Object.keys(state.localLinkedSources || {});
    if (!keys.length || state._remoteSyncInFlight) return;
    state._remoteSyncInFlight = true;
    try {
      for (const localKey of keys) {
        await syncLinkedLocalSource(localKey, { silent: true });
      }
    } finally {
      state._remoteSyncInFlight = false;
    }
  }

  function startRemoteSyncLoop() {
    if (state._remoteSyncTimer) return;
    state._remoteSyncTimer = window.setInterval(async () => {
      await pollRemoteSources();
      await pollLinkedLocalSources();
    }, REMOTE_SYNC_INTERVAL_MS);
  }

  async function processExcelFiles(fileList) {
    const files = Array.from(fileList || []).filter((f) => /\.xlsx?$/i.test(f.name || ""));
    if (!files.length) return;

    $('statusLine').textContent = 'Loading Excel...';

    try {
      for (const f of files) {
        const existingLocalIds = state.files
          .filter((entry) => (entry?.sourceType || "local") === "local" && String(entry?.name || "").trim() === String(f.name || "").trim())
          .map((entry) => entry.id)
          .filter(Boolean);
        if (existingLocalIds.length) {
          removeFiles(existingLocalIds, { silentStatus: true });
        }
        await ingestExcelFile(f);
      }
      if (state.correctiveRows.length || state.overhaulRows.length || state.subcontractingRows.length) {
        await refreshExchangeRates({ silent: true });
      }

      rebuildFilters();
      recomputeAndRender();
      setupLineHover();

      $('statusLine').textContent = `Loaded ${state.files.length} file(s) - ${formatInt(getLoadedRowCount())} row(s)`;
      dsPanel?.classList.add('hidden');
    } catch (err) {
      console.error(err);
      $('statusLine').textContent = `Error: ${err?.message || err}`;
      alert(`Error while reading Excel: ${err?.message || err}`);
    } finally {
      if (excelInput) excelInput.value = '';
    }
  }

  excelInput?.addEventListener('change', async (e) => {
    await processExcelFiles(e.target.files || []);
  });

  if (dropZone) {
    const prevent = (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
    };

    const deactivate = () => dropZone.classList.remove('drop-zone-active');

    ['dragenter', 'dragover'].forEach((evt) => {
      dropZone.addEventListener(evt, (ev) => {
        prevent(ev);
        dropZone.classList.add('drop-zone-active');
        if (ev.dataTransfer) ev.dataTransfer.dropEffect = 'copy';
      });
    });

    ['dragleave', 'dragend'].forEach((evt) => {
      dropZone.addEventListener(evt, (ev) => {
        prevent(ev);
        deactivate();
      });
    });

    dropZone.addEventListener('drop', async (ev) => {
      prevent(ev);
      deactivate();
      await processExcelFiles(ev.dataTransfer?.files || []);
    });

    dropZone.addEventListener('click', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      openFilePicker();
    });
  }

  $('activityFilter').addEventListener('change', (e) => {
    state.currentActivity = e.target.value;
    rebuildActivityFilter();
    rebuildWorkloadDetailFilters();
    scheduleRender();
  });
  $('workloadEquipmentFilter')?.addEventListener('change', (e) => {
    state.currentWorkloadEquipment = e.target.value;
    rebuildActivityFilter();
    rebuildWorkloadDetailFilters();
    scheduleRender();
  });
  $('workloadLocationFilter')?.addEventListener('change', (e) => {
    state.currentWorkloadLocation = e.target.value;
    rebuildActivityFilter();
    rebuildWorkloadDetailFilters();
    scheduleRender();
  });

  const subsystemBtn = $('subsystemBtn');
  const subsystemPanel = $('subsystemPanel');
  const subsystemCloseBtn = $('subsystemCloseBtn');
  const subsystemAllBtn = $('subsystemAllBtn');
  const subsystemClearBtn = $('subsystemClearBtn');
  const projectWrap = $('projectWrap');
  const projectBtn = $('projectBtn');
  const projectPanel = $('projectPanel');
  const projectCloseBtn = $('projectCloseBtn');
  const projectAllBtn = $('projectAllBtn');
  const projectClearBtn = $('projectClearBtn');
  const contractDurationWrap = $('contractDurationWrap');
  const contractDurationBtn = $('contractDurationBtn');
  const contractDurationPanel = $('contractDurationPanel');
  const contractDurationCloseBtn = $('contractDurationCloseBtn');
  const contractDurationResetBtn = $('contractDurationResetBtn');

  $('projectTypeFilter')?.addEventListener('change', (e) => {
    state.currentProjectType = e.target.value;
    rebuildFilters();
    applyScopeProjectInfo();
    scheduleRender();
  });

  $('exportBtn').addEventListener('click', async () => {
    if (state._exportingPptx) return;
    const rows = getFilteredPlanningRows();
    if (!rows.length) {
      alert('Nothing to export yet (upload Excel first).');
      return;
    }
    state._exportingPptx = true;
    try {
      await exportPowerPoint(rows);
    } finally {
      state._exportingPptx = false;
    }
  });

  async function exportPowerPoint(rows) {
    if (typeof PptxGenJS === 'undefined') {
      alert('PowerPoint export library not loaded yet. Please retry in a few seconds.');
      return;
    }
    if (typeof html2canvas === 'undefined') {
      alert('Capture library not loaded yet. Please retry in a few seconds.');
      return;
    }

    const pptx = new PptxGenJS();
    pptx.layout = 'LAYOUT_WIDE';
    pptx.author = 'OpenAI Codex';
    pptx.subject = 'Maintenance dashboard export';
    pptx.title = 'Dashboard Export Report';
    const now = new Date();
    const filterLines = buildFilterSummaryLines();
    const projectLabels = getActiveProjectLabels();
    const localeDateTime = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'full', timeStyle: 'short' }).format(now);
    const exportViews = getPptxExportViewConfigs();
    const currentView = getCurrentActiveViewKey();
    try {
      for (const view of exportViews) {
        const shots = await captureViewChartImages(view);
        addViewTitleSlide(pptx, view, {
          localeDateTime,
          filterLines,
          projectLabels,
          chartCount: shots.length,
        });
        if (!shots.length) {
          addEmptyViewSlide(pptx, view);
          continue;
        }
        shots.forEach((shot) => addChartShotSlide(pptx, view, shot));
      }
    } finally {
      if (currentView) {
        setActiveView(currentView);
        await waitForExportRender();
      }
    }

    await pptx.writeFile({ fileName: `dashboard_export_${Date.now()}.pptx` });
  }

  function getPptxExportViewConfigs() {
    return [
      {
        key: 'workload',
        badgeLabel: 'Workload',
        badgeIcon: 'engineering',
        badgeFill: 'E9F8EF',
        badgeBorder: 'B9E6C8',
        badgeText: '1F7A46',
        title: 'Resource Planning Dashboard',
        charts: [
          { title: 'Technician Breakdown Tree', selector: '#workloadTreeCard' },
          { title: 'Intervention Duration per Equipment', selector: '#barsCard' },
          { title: 'Preventive vs Corrective Hours Split', selector: '#pieCard' },
          { title: 'Daily Technician Requirement Evolution', selector: '#lineCard' },
          { title: 'Daily Intervention Duration Evolution', selector: '#durationLineCard' },
        ],
      },
      {
        key: 'materials',
        badgeLabel: 'Corrective Planning',
        badgeIcon: 'paid',
        badgeFill: 'FFF5D8',
        badgeBorder: 'F3D792',
        badgeText: '9A6700',
        title: 'Material Cost Dashboard',
        charts: [
          { title: 'Replacement Cost vs Reparable Cost by Year', selector: '#materialsLineCard' },
          { title: 'Estimated Costs by Equipment', selector: '#materialsBarsCard' },
          { title: 'Source Share of Estimated Costs', selector: '#materialsPieCard' },
        ],
      },
      {
        key: 'overhaul',
        badgeLabel: 'Overhaul & Renewals',
        badgeIcon: 'build',
        badgeFill: 'E6F4FF',
        badgeBorder: 'B7D9F8',
        badgeText: '0F5F97',
        title: 'Overhaul & Renewals Dashboard',
        charts: [
          { title: 'Stacked Costs by Planning Year', selector: '#overhaulStackCard' },
          { title: 'Global Costs by Equipment', selector: '#overhaulBarsCard' },
          { title: 'Global Cost Share by Subsystem', selector: '#overhaulPieCard' },
        ],
      },
      {
        key: 'subcontracting',
        badgeLabel: 'Subcontracting Planning',
        badgeIcon: 'schema',
        badgeFill: 'EAF2FF',
        badgeBorder: 'BED4FF',
        badgeText: '245FAE',
        title: 'Subcontracting Activities Dashboard',
        charts: [
          { title: 'Subcontracting Cost Decomposition Tree', selector: '#subcontractingTreeBody', closestCard: true },
          { title: 'Yearly Cost Share by Subsystem', selector: '#subcontractingPieSvg', closestCard: true },
          { title: 'Yearly Cost by Activity', selector: '#subcontractingActivityBarsPlot', closestCard: true },
        ],
      },
      {
        key: 'benchmark',
        badgeLabel: 'Benchmark & Cost drivers',
        badgeIcon: 'query_stats',
        badgeFill: 'E9F8EF',
        badgeBorder: 'B9E6C8',
        badgeText: '1F7A46',
        title: 'Benchmark & Cost drivers',
        charts: [
          { title: 'Technicians Benchmark by Subsystem', selector: '#benchmarkBarsCard' },
          { title: 'Technician Share by Subsystem', selector: '#benchmarkPieCard' },
          { title: 'Average Annual Cost by Subsystem', selector: '#benchmarkCostLineCard' },
          { title: 'Average Benchmark Cost by Subsystem', selector: '#benchmarkCostBarsCard' },
          { title: 'Total Global Cost by Subsystem', selector: '#benchmarkGlobalCostLineCard' },
          { title: 'Total Benchmark Global Cost by Subsystem', selector: '#benchmarkGlobalCostBarsCard' },
          { title: 'Yearly Subcontracting Cost by Subsystem', selector: '#benchmarkSubcontractCostCard' },
        ],
      },
    ];
  }

  function getCurrentActiveViewKey() {
    const active = Array.from(document.querySelectorAll('.view')).find((view) => !view.classList.contains('hidden'));
    if (!active?.id?.startsWith('view-')) return 'workload';
    return active.id.replace(/^view-/, '') || 'workload';
  }

  async function waitForExportRender() {
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    await new Promise((resolve) => setTimeout(resolve, 120));
  }

  function hideExportTooltips() {
    document.querySelectorAll('[id$="Tooltip"]').forEach((el) => el.classList.add('hidden'));
  }

  async function captureViewChartImages(viewConfig) {
    setActiveView(viewConfig.key);
    hideExportTooltips();
    await waitForExportRender();
    const shots = [];
    for (const chart of viewConfig.charts) {
      const shot = await elementToImage(chart.selector, { closestCard: chart.closestCard === true });
      if (shot) shots.push({ ...chart, ...shot });
    }
    return shots;
  }

  function addViewTitleSlide(pptx, viewConfig, meta) {
    const slide = pptx.addSlide();
    slide.background = { color: 'F8FAFC' };
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.7,
      y: 0.9,
      w: Math.min(4.2, 0.42 + (viewConfig.badgeLabel.length * 0.11)),
      h: 0.48,
      rectRadius: 0.12,
      fill: { color: viewConfig.badgeFill },
      line: { color: viewConfig.badgeBorder, width: 1 },
    });
    slide.addText(viewConfig.badgeLabel, {
      x: 0.92,
      y: 1.02,
      w: 3.6,
      h: 0.22,
      fontSize: 11,
      bold: true,
      color: viewConfig.badgeText,
      breakLine: false,
    });
    slide.addText(viewConfig.title, {
      x: 0.7,
      y: 1.7,
      w: 11.2,
      h: 0.5,
      fontSize: 26,
      bold: true,
      color: '0F172A',
    });
    slide.addText(meta.localeDateTime, {
      x: 0.7,
      y: 2.25,
      fontSize: 12,
      color: '475569',
    });
    slide.addText(`Projects: ${meta.projectLabels.length ? meta.projectLabels.join(', ') : 'All in scope'}`, {
      x: 0.7,
      y: 2.6,
      w: 11.6,
      h: 0.3,
      fontSize: 12,
      color: '111827',
    });
    slide.addText(`Charts exported: ${meta.chartCount}`, {
      x: 0.7,
      y: 2.95,
      fontSize: 12,
      color: '111827',
    });
    slide.addText(meta.filterLines.join('\n'), {
      x: 0.7,
      y: 3.45,
      w: 6.6,
      h: 2.0,
      fontSize: 13,
      color: '1F2937',
      lineSpacing: 18,
      margin: 0,
    });
    slide.addShape(pptx.ShapeType.line, {
      x: 7.8, y: 3.35, w: 0, h: 2.5,
      line: { color: 'CBD5E1', width: 1 },
    });
    slide.addText('Export structure', {
      x: 8.2,
      y: 3.45,
      fontSize: 14,
      bold: true,
      color: '0F172A',
    });
    slide.addText('One slide title for this view, then one slide per chart card.', {
      x: 8.2,
      y: 3.85,
      w: 4.2,
      h: 0.8,
      fontSize: 12,
      color: '475569',
      margin: 0,
    });
  }

  function addEmptyViewSlide(pptx, viewConfig) {
    const slide = pptx.addSlide();
    slide.addText(viewConfig.title, { x: 0.6, y: 0.5, fontSize: 24, bold: true, color: '111827' });
    slide.addText('No chart card could be captured for this view.', {
      x: 0.6, y: 1.5, fontSize: 18, color: 'ef4444'
    });
  }

  function addChartShotSlide(pptx, viewConfig, shot) {
    const slide = pptx.addSlide();
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.6,
      y: 0.36,
      w: Math.min(3.8, 0.42 + (viewConfig.badgeLabel.length * 0.11)),
      h: 0.4,
      rectRadius: 0.1,
      fill: { color: viewConfig.badgeFill },
      line: { color: viewConfig.badgeBorder, width: 1 },
    });
    slide.addText(viewConfig.badgeLabel, {
      x: 0.78,
      y: 0.46,
      w: 3.2,
      h: 0.16,
      fontSize: 10,
      bold: true,
      color: viewConfig.badgeText,
      breakLine: false,
    });
    slide.addText(shot.title, { x: 0.6, y: 0.9, fontSize: 22, bold: true, color: '111827' });
    const maxWidth = 9.0;
    const maxHeight = 5.8;
    const h = Math.min(maxHeight, maxWidth * shot.ratio);
    const y = 1.45 + Math.max(0, (maxHeight - h) / 2);
    slide.addImage({
      data: shot.dataUrl,
      x: 0.4,
      y,
      w: maxWidth,
      h,
    });
  }

  async function elementToImage(selector, options = {}) {
    const target = document.querySelector(selector);
    if (!target) return null;
    const el = options.closestCard ? target.closest('.shadow-sm') : target;
    if (!el) return null;
    const bg = getComputedStyle(document.body).backgroundColor || '#ffffff';
    const canvas = await html2canvas(el, {
      backgroundColor: bg,
      scale: Math.min(3, window.devicePixelRatio || 2),
      scrollX: window.scrollX,
      scrollY: window.scrollY,
      useCORS: true,
    });
    const dataUrl = canvas.toDataURL('image/png');
    const ratio = canvas.width ? canvas.height / canvas.width : 0.5625;
    return { dataUrl, ratio };
  }

  function buildFilterSummaryLines() {
    const entries = [
      ['Activity', state.currentActivity],
      ['Subsystem', shouldFilterBySubsystem() ? (getSelectedSubsystems().length ? getSelectedSubsystems().join(', ') : '__NONE__') : '__ALL__'],
      ['Project', shouldFilterByProjectName() ? (getSelectedProjectNames().length ? getSelectedProjectNames().join(', ') : '__NONE__') : '__ALL__'],
      ['Type', state.currentProjectType],
    ];
    return entries.map(([label, value]) => {
      const txt = !value || value === '__ALL__' ? 'All' : (value === '__NONE__' ? 'None' : String(value));
      return `${label}: ${txt}`;
    });
  }

  function getActiveProjectLabels() {
    const ids = getEffectiveFileIds().filter(Boolean);
    const labels = new Set();
    ids.forEach((id) => {
      const meta = state.fileMeta[id];
      const gp = meta?.gp || {};
      const label = gp.project_name || gp.project || meta?.label || meta?.name;
      if (label) labels.add(String(label).trim());
    });
    return Array.from(labels);
  }

  function collectPptxMetrics(rows) {
    const hoursCol = state.columns.hours;
    const actCol = state.columns.activity;
    const equipCol = state.columns.equipment;
    const dateCol = state.columns.date;

    let totalHours = 0;
    const equipment = new Set();
    const activityHours = new Map();
    let minDate = null;
    let maxDate = null;

    for (const row of rows) {
      const hrs = getHoursFromRow(row, hoursCol);
      totalHours += hrs;

      if (equipCol && row[equipCol]) {
        equipment.add(String(row[equipCol]).trim());
      }

      const activity = actCol ? (String(row[actCol] ?? '').trim() || 'Autre') : 'Autre';
      activityHours.set(activity, (activityHours.get(activity) || 0) + hrs);

      if (dateCol && row[dateCol]) {
        const d = parseDate(row[dateCol]);
        if (d) {
          if (!minDate || d < minDate) minDate = d;
          if (!maxDate || d > maxDate) maxDate = d;
        }
      }
    }

    return {
      totalHours,
      equipmentCount: equipment.size,
      activityHours,
      minDate,
      maxDate,
    };
  }

  function getHoursFromRow(row, hoursCol) {
    if (hoursCol && row[hoursCol] !== undefined) return toNumber(row[hoursCol]);
    if (row.duration !== undefined) return toNumber(row.duration);
    if (row.hours !== undefined) return toNumber(row.hours);
    if (row.total_hours !== undefined) return toNumber(row.total_hours);
    return 0;
  }

  // -----------------------------
  // Ingest
  // -----------------------------
  async function ingestExcelFile(file, options = {}) {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const fileId = options.fileId || `${file.name}__${Date.now()}__${Math.random().toString(16).slice(2)}`;

    // Detect hours_report + general_parameters (case/spacing tolerant)
    const hasHoursReport = wb.SheetNames.some((sn) => normalizeKey(sn) === "hours_report");
    const correctiveSheetName = wb.SheetNames.find((sn) => normalizeKey(sn) === "corrective_planning") || null;
    const deqVmiSheetName = wb.SheetNames.find((sn) => normalizeKey(sn) === "deq_vmi_planning") || null;
    const overhaulSheetName = wb.SheetNames.find((sn) => normalizeKey(sn) === "overhaul_and_renewal_planning") || null;
    const subcontractingSheetName = wb.SheetNames.find((sn) => normalizeKey(sn) === "subcontracting_planning") || null;
    const gpSheetName = wb.SheetNames.find((sn) => normalizeKey(sn) === "general_parameters") || null;

    // Detect Output Planning structure
    const hasOutputPlanning =
      wb.SheetNames.includes("Planning Complet") &&
      wb.SheetNames.includes("Technicians Needed Per Day") &&
      wb.SheetNames.includes("Synthesis");

    // Helper: read GP (works for "General Parameters" too)
    const readGP = () => {
      let gp = {};
      if (gpSheetName) {
        const gpRows = readSheet(wb, gpSheetName, file.name, fileId);
        gp = parseGeneralParameters(gpRows);
      } else if (wb.SheetNames.includes("General Parameters")) {
        const gpRows = readSheet(wb, "General Parameters", file.name, fileId);
        gp = parseGeneralParameters(gpRows);
      }
      return gp;
    };

    if (hasOutputPlanning) {
      state.mode = "output_planning";

      const planning = readSheet(wb, "Planning Complet", file.name, fileId);
      const tech = readSheet(wb, "Technicians Needed Per Day", file.name, fileId);
      const syn = readSheet(wb, "Synthesis", file.name, fileId);
      const corrective = correctiveSheetName ? readSheet(wb, correctiveSheetName, file.name, fileId) : [];
      const deqVmiRaw = deqVmiSheetName ? readSheet(wb, deqVmiSheetName, file.name, fileId) : [];
      const deqVmi = mapDeqVmiRows(deqVmiRaw);
      const deqVmiOverhaul = mapDeqVmiOverhaulRows(deqVmiRaw);
      const overhaul = overhaulSheetName ? readSheet(wb, overhaulSheetName, file.name, fileId) : [];
      const subcontracting = subcontractingSheetName ? readSheet(wb, subcontractingSheetName, file.name, fileId) : [];

      const gp = readGP();
      const label = gp.project_name ? String(gp.project_name).trim() : file.name;
      const projectKey = buildProjectKey(gp);

      state.fileMeta[fileId] = {
        name: file.name,
        gp,
        label,
        projectKey,
        kind: "output_planning",
        sourceType: options.sourceType || "local",
        remoteUrl: options.remoteUrl || "",
        remoteSourceKey: options.remoteSourceKey || "",
        localSourceKey: options.localSourceKey || "",
      };

      // Append datasets (these feed all charts except donut special source)
      state.planningRows = state.planningRows.concat(planning);
      state.techRows = state.techRows.concat(tech);
      state.synthesisRows = state.synthesisRows.concat(syn);
      state.correctiveRows = state.correctiveRows.concat(corrective, deqVmi);
      state.overhaulRows = state.overhaulRows.concat(overhaul, deqVmiOverhaul);
      state.subcontractingRows = state.subcontractingRows.concat(subcontracting);
      updateMaterialsColumns();
      updateOverhaulColumns();
      updateSubcontractingColumns();

      // Schema (from Planning Complet)
      const cols = new Set();
      (planning[0] ? Object.keys(planning[0]) : []).forEach((k) => cols.add(k));
      const colList = Array.from(cols);

      state.columns = {
        date: pickCol(colList, ["date"]),
        shift: pickCol(colList, ["time_of_day", "shift"]),
        subsystem: pickCol(colList, ["subsystem"]),
        activity: pickCol(colList, ["activity", "activity_type"]),
        equipment: pickCol(colList, ["equipment"]),
        location: pickCol(colList, ["location", "site", "area", "station"]),
        hours: pickCol(colList, ["duration", "hours"]),
        techNeeded: pickCol(colList, ["technicians_needed"]),
      };

      state.files.push({
        id: fileId,
        name: file.name,
        loadedAt: Date.now(),
        mode: "Output Planning",
        rows: planning.length + tech.length + syn.length + corrective.length + deqVmi.length + overhaul.length + deqVmiOverhaul.length + subcontracting.length,
        sourceType: options.sourceType || "local",
        remoteSourceKey: options.remoteSourceKey || "",
        localSourceKey: options.localSourceKey || "",
      });

      // If already in manual selection mode, auto-add
      if (state.activeFileIds instanceof Set && state.activeFileIds.size > 0) {
        state.activeFileIds.add(fileId);
      }

    } else if (hasHoursReport) {
      // ✅ HOURS REPORT file: impacts ONLY the donut
      const hrSheet = wb.SheetNames.find((sn) => normalizeKey(sn) === "hours_report");
      if (!hrSheet) throw new Error('Sheet "hours_report" not found (unexpected).');

      const hr = readSheet(wb, hrSheet, file.name, fileId);
      state.hoursReportRows = state.hoursReportRows.concat(hr);

      const gp = readGP();
      const label = gp.project_name ? String(gp.project_name).trim() : file.name;
      const projectKey = buildProjectKey(gp);

      state.fileMeta[fileId] = {
        name: file.name,
        gp,
        label,
        projectKey,
        kind: "hours_report",
        sourceType: options.sourceType || "local",
        remoteUrl: options.remoteUrl || "",
        remoteSourceKey: options.remoteSourceKey || "",
        localSourceKey: options.localSourceKey || "",
      };

      // Keep it in the scope list, but it must not feed other datasets
      state.files.push({
        id: fileId,
        name: file.name,
        loadedAt: Date.now(),
        mode: "Hours Report",
        rows: hr.length,
        sourceType: options.sourceType || "local",
        remoteSourceKey: options.remoteSourceKey || "",
        localSourceKey: options.localSourceKey || "",
      });

      // If already in manual selection mode, auto-add
      if (state.activeFileIds instanceof Set && state.activeFileIds.size > 0) {
        state.activeFileIds.add(fileId);
      }

    } else {
      // Generic mode
      if (state.mode === "auto") state.mode = "generic";

      let all = [];
      for (const sheetName of wb.SheetNames) {
        all = all.concat(readSheet(wb, sheetName, file.name, fileId));
      }
      state.genericRows = state.genericRows.concat(all);
      if (correctiveSheetName || deqVmiSheetName) {
        const corrective = correctiveSheetName ? readSheet(wb, correctiveSheetName, file.name, fileId) : [];
        const deqVmiRaw = deqVmiSheetName ? readSheet(wb, deqVmiSheetName, file.name, fileId) : [];
        const deqVmi = mapDeqVmiRows(deqVmiRaw);
        const deqVmiOverhaul = mapDeqVmiOverhaulRows(deqVmiRaw);
        state.correctiveRows = state.correctiveRows.concat(corrective, deqVmi);
        state.overhaulRows = state.overhaulRows.concat(deqVmiOverhaul);
        updateMaterialsColumns();
        if (deqVmiOverhaul.length) updateOverhaulColumns();
      }
      if (overhaulSheetName) {
        const overhaul = readSheet(wb, overhaulSheetName, file.name, fileId);
        state.overhaulRows = state.overhaulRows.concat(overhaul);
        updateOverhaulColumns();
      }
      if (subcontractingSheetName) {
        const subcontracting = readSheet(wb, subcontractingSheetName, file.name, fileId);
        state.subcontractingRows = state.subcontractingRows.concat(subcontracting);
        updateSubcontractingColumns();
      }

      const gp = readGP();
      const label = gp.project_name ? String(gp.project_name).trim() : file.name;
      const projectKey = buildProjectKey(gp);

      state.files.push({
        id: fileId,
        name: file.name,
        loadedAt: Date.now(),
        mode: "Generic",
        rows: all.length,
        sourceType: options.sourceType || "local",
        remoteSourceKey: options.remoteSourceKey || "",
        localSourceKey: options.localSourceKey || "",
      });

      state.fileMeta[fileId] = {
        name: file.name,
        gp,
        label,
        projectKey,
        kind: "generic",
        sourceType: options.sourceType || "local",
        remoteUrl: options.remoteUrl || "",
        remoteSourceKey: options.remoteSourceKey || "",
        localSourceKey: options.localSourceKey || "",
      };

      // Infer columns (generic)
      const cols = new Set();
      for (const r of state.genericRows.slice(0, 200)) Object.keys(r).forEach((k) => cols.add(k));
      const colList = Array.from(cols);

      state.columns = {
        date: pickCol(colList, ["date", "day", "planned_date", "start_date", "work_date"]),
        shift: pickCol(colList, ["shift", "day_night", "period", "work_shift"]),
        subsystem: pickCol(colList, ["subsystem", "system", "domain", "discipline"]),
        activity: pickCol(colList, ["activity_type", "activity", "work_type", "type", "maintenance_activity"]),
        maintType: pickCol(colList, ["maintenance_type", "maint_type", "pm_cm", "preventive_corrective"]),
        equipment: pickCol(colList, ["equipment", "asset", "equipment_name", "element", "machine"]),
        location: pickCol(colList, ["location", "site", "area", "station", "localisation"]),
        hours: pickCol(colList, ["hours", "duration_hours", "work_hours", "total_hours", "duration", "duration_h"]),
        orderId: pickCol(colList, ["order", "order_id", "wo", "work_order", "workorder", "ticket"]),
      };

      if (state.activeFileIds instanceof Set && state.activeFileIds.size > 0) {
        state.activeFileIds.add(fileId);
      }
    }

    rebuildLists();
    renderFilesList();
    renderScopeList();
    applyScopeProjectInfo();
    queueSharedWorkbookSync(fileId);
    queueSharedSettingsSync();
    return fileId;
  }

  function rebuildLists() {
    const planning = scopedRows(state.mode === "output_planning" ? state.planningRows : state.genericRows);
    const actCol = state.columns.activity;
    const subCol = state.columns.subsystem;
    const correctiveSubCol = state.materialsColumns.subsystem;
    const overhaulSubCol = state.overhaulColumns.subsystem;
    const subcontractSubCol = state.subcontractingColumns.subsystem;

    state.subsystems = uniqueSorted(
      []
        .concat(planning.map((r) => (subCol ? r[subCol] : null)))
        .concat(scopedRows(state.techRows).map((r) => r.subsystem))
        .concat(scopedRows(state.synthesisRows).map((r) => r.subsystem))
        .concat(scopedRows(state.correctiveRows).map((r) => (correctiveSubCol ? r[correctiveSubCol] : null)))
        .concat(scopedRows(state.overhaulRows).map((r) => (overhaulSubCol ? r[overhaulSubCol] : r.subsystem)))
        .concat(scopedRows(state.subcontractingRows).map((r) => (subcontractSubCol ? r[subcontractSubCol] : r.subsystem)))
        .concat(
          typeof getRiskAssessmentRows === "function"
            ? getRiskAssessmentRows().map((row) => raFieldValue(row, "Owner / Sub System"))
            : []
        )
    );
    if (
      typeof getTotalCostMercuryRows === "function"
      && getTotalCostMercuryRows().some((row) => normalizeKey(row?.["Price List Code 3"]) === "infra_management")
    ) {
      state.subsystems = uniqueSorted(state.subsystems.concat(["Infra_Management"]));
    }

    const validSelectedSubsystems = getSelectedSubsystems().filter((value) => state.subsystems.includes(value));
    state.currentSubsystem = shouldFilterBySubsystem()
      ? validSelectedSubsystems
      : normalizeSubsystemSelection(validSelectedSubsystems);

    let activitySource = planning;
    if (subCol && shouldFilterBySubsystem()) {
      activitySource = planning.filter((r) => subsystemMatchesSelection(r[subCol]));
    }

    state.activityTypes = uniqueSorted(activitySource.map((r) => (actCol ? r[actCol] : null)));
  }

  function rebuildFilters() {
    rebuildProjectFilters();   // ✅ AJOUT
    rebuildLists();
    rebuildActivityFilter();
    rebuildWorkloadDetailFilters();
    rebuildSubsystemFilter();
    rebuildMaterialsFilters();
    rebuildOverhaulFilters();
    rebuildSubcontractingFilters();
    renderContractDurationOverrides();
  }

  function rebuildActivityFilter() {
    const sel = $('activityFilter');
    if (!sel) return;
    const current = state.currentActivity;
    const rows = getFilteredWorkloadDetailRows({
      includeActivity: false,
      includeEquipment: true,
      includeLocation: true,
    });
    const actCol = state.columns.activity;
    const activities = uniqueSorted(rows.map((row) => (actCol ? row?.[actCol] : null)));
    sel.innerHTML = '';
    const allOpt = document.createElement('option');
    allOpt.value = '__ALL__';
    allOpt.textContent = 'All';
    sel.appendChild(allOpt);

    for (const a of activities) {
      const opt = document.createElement('option');
      opt.value = a;
      opt.textContent = a;
      sel.appendChild(opt);
    }
    // restore selection if still valid
    sel.value = activities.includes(current) ? current : '__ALL__';
    state.currentActivity = sel.value;
  }

  function renderContractDurationOverrides() {
    const list = $('contractDurationList');
    const summary = $('contractDurationSummary');
    if (!list || !summary) return;

    const projects = getRepresentativeProjectEntries(getEffectiveFileIds());
    const manualCount = projects.filter((item) => {
      const manual = parseOptionalNumber(state.manualContractDurationByProject?.[item.projectKey]);
      return manual !== null && manual > 0;
    }).length;

    if (!projects.length) {
      summary.textContent = "Auto duration";
      list.innerHTML = `
        <div class="p-3 rounded-lg border border-dashed border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-sm">
          No project available under the current scope and filters.
        </div>
      `;
      return;
    }

    summary.textContent = manualCount === 0
      ? "Auto duration"
      : manualCount === 1
        ? "1 manual override"
        : `${manualCount} manual overrides`;

    list.innerHTML = projects.map((item) => {
      const info = getResolvedContractDurationInfo(item.gp, item.projectKey);
      const manual = parseOptionalNumber(state.manualContractDurationByProject?.[item.projectKey]);
      return `
        <div class="p-3 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="text-sm font-semibold truncate" title="${escapeHtml(item.label)}">${escapeHtml(item.label)}</p>
              <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Auto: ${escapeHtml(info.autoLabel)}${info.autoFormula ? ` (${escapeHtml(info.autoFormula)})` : ""}</p>
            </div>
            <button type="button" data-contract-duration-clear="${escapeHtml(item.projectKey)}" class="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all">
              Auto
            </button>
          </div>
          <div class="flex items-center gap-3">
            <label class="flex-1">
              <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Manual override</p>
              <input
                type="number"
                min="0"
                step="0.1"
                inputmode="decimal"
                data-contract-duration-input="${escapeHtml(item.projectKey)}"
                value="${manual !== null && manual > 0 ? manual : ""}"
                placeholder="Leave blank for auto"
                class="mt-1 w-full rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
              />
            </label>
            <div class="min-w-[86px] text-right">
              <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Effective</p>
              <p class="mt-1 text-sm font-semibold">${escapeHtml(info.label)}</p>
            </div>
          </div>
        </div>
      `;
    }).join("");

    list.querySelectorAll('[data-contract-duration-input]').forEach((input) => {
      input.addEventListener('change', () => {
        const projectKey = input.getAttribute('data-contract-duration-input');
        if (!projectKey) return;
        const parsed = parseOptionalNumber(input.value);
        if (parsed !== null && parsed > 0) state.manualContractDurationByProject[projectKey] = parsed;
        else delete state.manualContractDurationByProject[projectKey];
        renderContractDurationOverrides();
        applyScopeProjectInfo();
        scheduleRender();
      });
    });

    list.querySelectorAll('[data-contract-duration-clear]').forEach((button) => {
      button.addEventListener('click', () => {
        const projectKey = button.getAttribute('data-contract-duration-clear');
        if (!projectKey) return;
        delete state.manualContractDurationByProject[projectKey];
        renderContractDurationOverrides();
        applyScopeProjectInfo();
        scheduleRender();
      });
    });
  }

  function rebuildWorkloadDetailFilters() {
    const equipmentSel = $('workloadEquipmentFilter');
    const locationSel = $('workloadLocationFilter');
    if (!equipmentSel || !locationSel) return;

    const baseRows = getFilteredWorkloadDetailRows({
      includeActivity: true,
      includeEquipment: false,
      includeLocation: false,
    });
    const equipmentCol = state.columns.equipment;
    const locationCol = state.columns.location;

    const equipmentRows =
      state.currentWorkloadLocation === "__ALL__" || !locationCol
        ? baseRows
        : baseRows.filter((row) => String(row?.[locationCol] ?? "").trim() === String(state.currentWorkloadLocation));
    const locationRows =
      state.currentWorkloadEquipment === "__ALL__" || !equipmentCol
        ? baseRows
        : baseRows.filter((row) => String(row?.[equipmentCol] ?? "").trim() === String(state.currentWorkloadEquipment));

    const equipments = sortDimensionValues(equipmentRows.map((row) => (equipmentCol ? row?.[equipmentCol] : null)));
    const locations = sortDimensionValues(locationRows.map((row) => (locationCol ? row?.[locationCol] : null)));

    equipmentSel.innerHTML =
      `<option value="__ALL__">All equipment</option>` +
      equipments.map((item) => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`).join("");
    if (state.currentWorkloadEquipment !== "__ALL__" && !equipments.includes(state.currentWorkloadEquipment)) {
      state.currentWorkloadEquipment = "__ALL__";
    }
    equipmentSel.value = state.currentWorkloadEquipment;

    locationSel.innerHTML =
      `<option value="__ALL__">All locations</option>` +
      locations.map((item) => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`).join("");
    if (state.currentWorkloadLocation !== "__ALL__" && !locations.includes(state.currentWorkloadLocation)) {
      state.currentWorkloadLocation = "__ALL__";
    }
    locationSel.value = state.currentWorkloadLocation;
  }

  function getFilteredWorkloadDetailRows({
    includeActivity = true,
    includeEquipment = true,
    includeLocation = true,
  } = {}) {
    let rows = state.mode === "output_planning" ? state.planningRows : state.genericRows;
    rows = scopedRows(rows);
    const actCol = state.columns.activity;
    const subCol = state.columns.subsystem;
    const equipmentCol = state.columns.equipment;
    const locationCol = state.columns.location;

    return rows.filter((row) => {
      if (
        includeActivity &&
        state.currentActivity !== "__ALL__" &&
        (!actCol || String(row?.[actCol] ?? "").trim() !== String(state.currentActivity).trim())
      ) {
        return false;
      }
      if (
        shouldFilterBySubsystem() &&
        (!subCol || !subsystemMatchesSelection(row?.[subCol]))
      ) {
        return false;
      }
      if (
        includeEquipment &&
        state.currentWorkloadEquipment !== "__ALL__" &&
        (!equipmentCol || String(row?.[equipmentCol] ?? "").trim() !== String(state.currentWorkloadEquipment).trim())
      ) {
        return false;
      }
      if (
        includeLocation &&
        state.currentWorkloadLocation !== "__ALL__" &&
        (!locationCol || String(row?.[locationCol] ?? "").trim() !== String(state.currentWorkloadLocation).trim())
      ) {
        return false;
      }
      return true;
    });
  }

  function rebuildSubsystemFilter() {
    const list = $('subsystemList');
    const summary = $('subsystemSummary');
    if (!list || !summary) return;
    const current = getSelectedSubsystems();
    summary.textContent = shouldFilterBySubsystem()
      ? (current.length ? (current.length <= 2 ? current.join(', ') : `${current.length} subsystems selected`) : 'No subsystem selected')
      : 'All subsystems';

    if (!state.subsystems.length) {
      list.innerHTML = `
        <div class="p-3 rounded-lg border border-dashed border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-sm">
          No subsystem available yet.
        </div>
      `;
      state.currentSubsystem = "__ALL__";
      return;
    }

    list.innerHTML = state.subsystems.map((value) => `
      <label class="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer">
        <input type="checkbox" data-subsystem-value="${escapeHtml(value)}" class="rounded border-slate-300 dark:border-slate-600" ${current.includes(value) ? 'checked' : ''}>
        <span class="text-sm text-slate-700 dark:text-slate-200">${escapeHtml(value)}</span>
      </label>
    `).join("");

    list.querySelectorAll('input[type="checkbox"][data-subsystem-value]').forEach((input) => {
      input.addEventListener('change', () => {
        const selected = Array.from(list.querySelectorAll('input[type="checkbox"][data-subsystem-value]:checked'))
          .map((el) => el.getAttribute('data-subsystem-value'))
          .filter(Boolean);
        state.currentSubsystem = selected.length ? normalizeSubsystemSelection(selected) : [];
        rebuildLists();
        rebuildActivityFilter();
        rebuildWorkloadDetailFilters();
        rebuildSubsystemFilter();
        scheduleRender();
      });
    });

    state.currentSubsystem = shouldFilterBySubsystem()
      ? current
      : normalizeSubsystemSelection(current);
  }

  function rebuildMaterialsFilters() {
    const currencySel = $('materialsCurrencyFilter');
    const yearSummary = $('materialsYearSummary');
    const yearList = $('materialsYearList');
    const equipmentSel = $('materialsEquipmentFilter');
    const elementSel = $('materialsElementFilter');
    if (!currencySel || !yearSummary || !yearList || !equipmentSel || !elementSel) return;

    const baseRows = getMaterialsBaseRows();
    const selectedYears = getMultiSelectValues(state.currentMaterialYear);
    const yearScopedRows =
      !selectedYears.length
        ? baseRows
        : baseRows.filter((row) => selectedYears.includes(getMaterialYearValue(row)));

    const currencies = Array.from(new Set(
      []
        .concat(getCurrenciesInRows(baseRows))
        .concat(Object.keys(state.manualExchangeRates || {}))
        .concat([state.currentMaterialCurrency])
        .concat(["USD", "EUR", "AED", "SGD", "BRL", "CNY"])
        .filter(Boolean)
    )).sort((a, b) => a.localeCompare(b));
    const years = sortDimensionValues(baseRows.map((row) => getMaterialYearValue(row)));
    const equipments = sortDimensionValues(
      yearScopedRows
        .filter((row) => state.currentMaterialElement === "__ALL__" || !state.materialsColumns.element || String(row[state.materialsColumns.element] ?? "").trim() === String(state.currentMaterialElement))
        .map((row) => (state.materialsColumns.equipment ? row[state.materialsColumns.equipment] : null))
    );
    const elements = sortDimensionValues(
      yearScopedRows
        .filter((row) => state.currentMaterialEquipment === "__ALL__" || !state.materialsColumns.equipment || String(row[state.materialsColumns.equipment] ?? "").trim() === String(state.currentMaterialEquipment))
        .map((row) => (state.materialsColumns.element ? row[state.materialsColumns.element] : null))
    );

    currencySel.innerHTML = currencies.length
      ? currencies.map((code) => `<option value="${escapeHtml(code)}">${escapeHtml(code)}</option>`).join("")
      : `<option value="USD">USD</option>`;
    if (!currencies.includes(state.currentMaterialCurrency)) {
      state.currentMaterialCurrency = currencies.includes("USD") ? "USD" : (currencies[0] || "USD");
    }
    currencySel.value = state.currentMaterialCurrency;

    const validSelectedYears = selectedYears.filter((year) => years.includes(year));
    if (validSelectedYears.length !== selectedYears.length) {
      state.currentMaterialYear = normalizeMultiSelectState(validSelectedYears);
    }
    yearSummary.textContent = formatMultiSelectSummary(state.currentMaterialYear, "year");
    yearList.innerHTML = years.length
      ? years.map((year) => `
        <label class="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer">
          <input type="checkbox" data-material-year-value="${escapeHtml(year)}" class="rounded border-slate-300 dark:border-slate-600" ${getMultiSelectValues(state.currentMaterialYear).includes(year) ? 'checked' : ''}>
          <span class="text-sm text-slate-700 dark:text-slate-200">${escapeHtml(year)}</span>
        </label>
      `).join("")
      : `
        <div class="p-3 rounded-lg border border-dashed border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-sm">
          No year available yet.
        </div>
      `;
    yearList.querySelectorAll('input[type="checkbox"][data-material-year-value]').forEach((input) => {
      input.addEventListener('change', () => {
        const selected = Array.from(yearList.querySelectorAll('input[type="checkbox"][data-material-year-value]:checked'))
          .map((el) => el.getAttribute('data-material-year-value'))
          .filter(Boolean);
        state.currentMaterialYear = normalizeMultiSelectState(selected);
        rebuildMaterialsFilters();
        renderMaterialsDashboard();
      });
    });

    equipmentSel.innerHTML =
      `<option value="__ALL__">All equipment</option>` +
      equipments.map((item) => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`).join("");
    if (state.currentMaterialEquipment !== "__ALL__" && !equipments.includes(state.currentMaterialEquipment)) {
      state.currentMaterialEquipment = "__ALL__";
    }
    equipmentSel.value = state.currentMaterialEquipment;

    elementSel.innerHTML =
      `<option value="__ALL__">All elements</option>` +
      elements.map((item) => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`).join("");
    if (state.currentMaterialElement !== "__ALL__" && !elements.includes(state.currentMaterialElement)) {
      state.currentMaterialElement = "__ALL__";
    }
    elementSel.value = state.currentMaterialElement;
  }

  function getFilteredOverhaulRows({
    includeYear = true,
    includeEquipment = true,
    includeType = true,
    includeSpanLife = true,
  } = {}) {
    const cols = state.overhaulColumns;
    return getOverhaulBaseRows().filter((row) => {
      if (includeYear && !matchesMultiSelectValue(state.currentOverhaulYear, getOverhaulYearValue(row))) {
        return false;
      }
      if (includeEquipment && state.currentOverhaulEquipment !== "__ALL__") {
        if (!cols.equipment || String(row?.[cols.equipment] ?? "").trim() !== String(state.currentOverhaulEquipment)) return false;
      }
      if (includeType && state.currentOverhaulType !== "__ALL__") {
        if (!cols.type || String(row?.[cols.type] ?? "").trim() !== String(state.currentOverhaulType)) return false;
      }
      if (includeSpanLife && state.currentOverhaulSpanLife !== "__ALL__") {
        if (!cols.spanLife || String(row?.[cols.spanLife] ?? "").trim() !== String(state.currentOverhaulSpanLife)) return false;
      }
      return true;
    });
  }

  function getFilteredSubcontractingRows({
    includeEquipment = true,
    includeActivity = true,
    includeType = true,
    includeFrequency = true,
  } = {}) {
    const cols = state.subcontractingColumns;
    return getSubcontractingBaseRows().filter((row) => {
      if (includeEquipment && state.currentSubcontractingEquipment !== "__ALL__") {
        if (!cols.equipment || String(row?.[cols.equipment] ?? "").trim() !== String(state.currentSubcontractingEquipment)) return false;
      }
      if (includeActivity && state.currentSubcontractingActivity !== "__ALL__") {
        if (!cols.activity || String(row?.[cols.activity] ?? "").trim() !== String(state.currentSubcontractingActivity)) return false;
      }
      if (includeType && state.currentSubcontractingType !== "__ALL__") {
        if (!cols.type || String(row?.[cols.type] ?? "").trim() !== String(state.currentSubcontractingType)) return false;
      }
      if (includeFrequency && state.currentSubcontractingFrequency !== "__ALL__") {
        if (!cols.frequency || String(row?.[cols.frequency] ?? "").trim() !== String(state.currentSubcontractingFrequency)) return false;
      }
      return true;
    });
  }

  function getSubcontractingPeriodDuration() {
    const value = Number(state.currentSubcontractingPeriodDuration);
    if (!Number.isFinite(value) || value <= 0) return 1;
    return value;
  }

  function rebuildOverhaulFilters() {
    const currencySel = $('overhaulCurrencyFilter');
    const yearSummary = $('overhaulYearSummary');
    const yearList = $('overhaulYearList');
    const equipmentSel = $('overhaulEquipmentFilter');
    const typeSel = $('overhaulTypeFilter');
    const spanLifeSel = $('overhaulSpanLifeFilter');
    if (!currencySel || !yearSummary || !yearList || !equipmentSel || !typeSel || !spanLifeSel) return;

    const baseRows = getOverhaulBaseRows();
    const selectedYears = getMultiSelectValues(state.currentOverhaulYear);
    const yearScopedRows =
      !selectedYears.length
        ? baseRows
        : baseRows.filter((row) => selectedYears.includes(getOverhaulYearValue(row)));

    const equipmentScopedRows = yearScopedRows.filter((row) =>
      state.currentOverhaulType === "__ALL__" || !state.overhaulColumns.type || String(row?.[state.overhaulColumns.type] ?? "").trim() === String(state.currentOverhaulType)
    );
    const typeScopedRows = yearScopedRows.filter((row) =>
      state.currentOverhaulEquipment === "__ALL__" || !state.overhaulColumns.equipment || String(row?.[state.overhaulColumns.equipment] ?? "").trim() === String(state.currentOverhaulEquipment)
    );
    const spanLifeScopedRows = yearScopedRows.filter((row) =>
      (state.currentOverhaulEquipment === "__ALL__" || !state.overhaulColumns.equipment || String(row?.[state.overhaulColumns.equipment] ?? "").trim() === String(state.currentOverhaulEquipment)) &&
      (state.currentOverhaulType === "__ALL__" || !state.overhaulColumns.type || String(row?.[state.overhaulColumns.type] ?? "").trim() === String(state.currentOverhaulType))
    );

    const currencies = Array.from(new Set(
      []
        .concat(getCurrenciesInRowsByColumn(baseRows, state.overhaulColumns.currency))
        .concat(Object.keys(state.manualExchangeRates || {}))
        .concat([state.currentMaterialCurrency])
        .concat(["USD", "EUR", "AED", "SGD", "BRL", "CNY"])
        .filter(Boolean)
    )).sort((a, b) => a.localeCompare(b));
    const years = sortDimensionValues(baseRows.map((row) => getOverhaulYearValue(row)));
    const equipments = sortDimensionValues(
      equipmentScopedRows.map((row) => (state.overhaulColumns.equipment ? row?.[state.overhaulColumns.equipment] : null))
    );
    const types = sortDimensionValues(
      typeScopedRows.map((row) => (state.overhaulColumns.type ? row?.[state.overhaulColumns.type] : null))
    );
    const spanLives = sortDimensionValues(
      spanLifeScopedRows.map((row) => (state.overhaulColumns.spanLife ? row?.[state.overhaulColumns.spanLife] : null))
    );

    currencySel.innerHTML = currencies.length
      ? currencies.map((code) => `<option value="${escapeHtml(code)}">${escapeHtml(code)}</option>`).join("")
      : `<option value="USD">USD</option>`;
    if (!currencies.includes(state.currentMaterialCurrency)) {
      state.currentMaterialCurrency = currencies.includes("USD") ? "USD" : (currencies[0] || "USD");
    }
    currencySel.value = state.currentMaterialCurrency;

    const validSelectedYears = selectedYears.filter((year) => years.includes(year));
    if (validSelectedYears.length !== selectedYears.length) {
      state.currentOverhaulYear = normalizeMultiSelectState(validSelectedYears);
    }
    yearSummary.textContent = formatMultiSelectSummary(state.currentOverhaulYear, "year");
    yearList.innerHTML = years.length
      ? years.map((year) => `
        <label class="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer">
          <input type="checkbox" data-overhaul-year-value="${escapeHtml(year)}" class="rounded border-slate-300 dark:border-slate-600" ${getMultiSelectValues(state.currentOverhaulYear).includes(year) ? 'checked' : ''}>
          <span class="text-sm text-slate-700 dark:text-slate-200">${escapeHtml(year)}</span>
        </label>
      `).join("")
      : `
        <div class="p-3 rounded-lg border border-dashed border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-sm">
          No year available yet.
        </div>
      `;
    yearList.querySelectorAll('input[type="checkbox"][data-overhaul-year-value]').forEach((input) => {
      input.addEventListener('change', () => {
        const selected = Array.from(yearList.querySelectorAll('input[type="checkbox"][data-overhaul-year-value]:checked'))
          .map((el) => el.getAttribute('data-overhaul-year-value'))
          .filter(Boolean);
        state.currentOverhaulYear = normalizeMultiSelectState(selected);
        rebuildOverhaulFilters();
        renderOverhaulDashboard();
      });
    });

    equipmentSel.innerHTML =
      `<option value="__ALL__">All equipment</option>` +
      equipments.map((item) => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`).join("");
    if (state.currentOverhaulEquipment !== "__ALL__" && !equipments.includes(state.currentOverhaulEquipment)) {
      state.currentOverhaulEquipment = "__ALL__";
    }
    equipmentSel.value = state.currentOverhaulEquipment;

    typeSel.innerHTML =
      `<option value="__ALL__">All activity types</option>` +
      types.map((item) => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`).join("");
    if (state.currentOverhaulType !== "__ALL__" && !types.includes(state.currentOverhaulType)) {
      state.currentOverhaulType = "__ALL__";
    }
    typeSel.value = state.currentOverhaulType;

    spanLifeSel.innerHTML =
      `<option value="__ALL__">All span life</option>` +
      spanLives.map((item) => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`).join("");
    if (state.currentOverhaulSpanLife !== "__ALL__" && !spanLives.includes(state.currentOverhaulSpanLife)) {
      state.currentOverhaulSpanLife = "__ALL__";
    }
    spanLifeSel.value = state.currentOverhaulSpanLife;
  }

  function rebuildSubcontractingFilters() {
    const currencySel = $('subcontractingCurrencyFilter');
    const equipmentSel = $('subcontractingEquipmentFilter');
    const activitySel = $('subcontractingActivityFilter');
    const typeSel = $('subcontractingTypeFilter');
    const frequencySel = $('subcontractingFrequencyFilter');
    if (!currencySel || !equipmentSel || !activitySel || !typeSel || !frequencySel) return;

    const baseRows = getSubcontractingBaseRows();
    const equipmentScopedRows = baseRows.filter((row) =>
      (state.currentSubcontractingActivity === "__ALL__" || !state.subcontractingColumns.activity || String(row?.[state.subcontractingColumns.activity] ?? "").trim() === String(state.currentSubcontractingActivity)) &&
      (state.currentSubcontractingType === "__ALL__" || !state.subcontractingColumns.type || String(row?.[state.subcontractingColumns.type] ?? "").trim() === String(state.currentSubcontractingType)) &&
      (state.currentSubcontractingFrequency === "__ALL__" || !state.subcontractingColumns.frequency || String(row?.[state.subcontractingColumns.frequency] ?? "").trim() === String(state.currentSubcontractingFrequency))
    );
    const activityScopedRows = baseRows.filter((row) =>
      (state.currentSubcontractingEquipment === "__ALL__" || !state.subcontractingColumns.equipment || String(row?.[state.subcontractingColumns.equipment] ?? "").trim() === String(state.currentSubcontractingEquipment)) &&
      (state.currentSubcontractingType === "__ALL__" || !state.subcontractingColumns.type || String(row?.[state.subcontractingColumns.type] ?? "").trim() === String(state.currentSubcontractingType)) &&
      (state.currentSubcontractingFrequency === "__ALL__" || !state.subcontractingColumns.frequency || String(row?.[state.subcontractingColumns.frequency] ?? "").trim() === String(state.currentSubcontractingFrequency))
    );
    const typeScopedRows = baseRows.filter((row) =>
      (state.currentSubcontractingEquipment === "__ALL__" || !state.subcontractingColumns.equipment || String(row?.[state.subcontractingColumns.equipment] ?? "").trim() === String(state.currentSubcontractingEquipment)) &&
      (state.currentSubcontractingActivity === "__ALL__" || !state.subcontractingColumns.activity || String(row?.[state.subcontractingColumns.activity] ?? "").trim() === String(state.currentSubcontractingActivity)) &&
      (state.currentSubcontractingFrequency === "__ALL__" || !state.subcontractingColumns.frequency || String(row?.[state.subcontractingColumns.frequency] ?? "").trim() === String(state.currentSubcontractingFrequency))
    );
    const frequencyScopedRows = baseRows.filter((row) =>
      (state.currentSubcontractingEquipment === "__ALL__" || !state.subcontractingColumns.equipment || String(row?.[state.subcontractingColumns.equipment] ?? "").trim() === String(state.currentSubcontractingEquipment)) &&
      (state.currentSubcontractingActivity === "__ALL__" || !state.subcontractingColumns.activity || String(row?.[state.subcontractingColumns.activity] ?? "").trim() === String(state.currentSubcontractingActivity)) &&
      (state.currentSubcontractingType === "__ALL__" || !state.subcontractingColumns.type || String(row?.[state.subcontractingColumns.type] ?? "").trim() === String(state.currentSubcontractingType))
    );

    const currencies = Array.from(new Set(
      []
        .concat(getCurrenciesInRowsByColumn(baseRows, state.subcontractingColumns.currency))
        .concat(Object.keys(state.manualExchangeRates || {}))
        .concat([state.currentMaterialCurrency])
        .concat(["USD", "EUR", "AED", "SGD", "BRL", "CNY"])
        .filter(Boolean)
    )).sort((a, b) => a.localeCompare(b));
    const equipments = sortDimensionValues(
      equipmentScopedRows.map((row) => (state.subcontractingColumns.equipment ? row?.[state.subcontractingColumns.equipment] : null))
    );
    const activities = sortDimensionValues(
      activityScopedRows.map((row) => (state.subcontractingColumns.activity ? row?.[state.subcontractingColumns.activity] : null))
    );
    const types = sortDimensionValues(
      typeScopedRows.map((row) => (state.subcontractingColumns.type ? row?.[state.subcontractingColumns.type] : null))
    );
    const frequencies = sortDimensionValues(
      frequencyScopedRows.map((row) => (state.subcontractingColumns.frequency ? row?.[state.subcontractingColumns.frequency] : null))
    );

    currencySel.innerHTML = currencies.length
      ? currencies.map((code) => `<option value="${escapeHtml(code)}">${escapeHtml(code)}</option>`).join("")
      : `<option value="USD">USD</option>`;
    if (!currencies.includes(state.currentMaterialCurrency)) {
      state.currentMaterialCurrency = currencies.includes("USD") ? "USD" : (currencies[0] || "USD");
    }
    currencySel.value = state.currentMaterialCurrency;

    equipmentSel.innerHTML =
      `<option value="__ALL__">All equipment</option>` +
      equipments.map((item) => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`).join("");
    if (state.currentSubcontractingEquipment !== "__ALL__" && !equipments.includes(state.currentSubcontractingEquipment)) {
      state.currentSubcontractingEquipment = "__ALL__";
    }
    equipmentSel.value = state.currentSubcontractingEquipment;

    activitySel.innerHTML =
      `<option value="__ALL__">All activities</option>` +
      activities.map((item) => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`).join("");
    if (state.currentSubcontractingActivity !== "__ALL__" && !activities.includes(state.currentSubcontractingActivity)) {
      state.currentSubcontractingActivity = "__ALL__";
    }
    activitySel.value = state.currentSubcontractingActivity;

    typeSel.innerHTML =
      `<option value="__ALL__">All types</option>` +
      types.map((item) => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`).join("");
    if (state.currentSubcontractingType !== "__ALL__" && !types.includes(state.currentSubcontractingType)) {
      state.currentSubcontractingType = "__ALL__";
    }
    typeSel.value = state.currentSubcontractingType;

    frequencySel.innerHTML =
      `<option value="__ALL__">All frequencies</option>` +
      frequencies.map((item) => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`).join("");
    if (state.currentSubcontractingFrequency !== "__ALL__" && !frequencies.includes(state.currentSubcontractingFrequency)) {
      state.currentSubcontractingFrequency = "__ALL__";
    }
    frequencySel.value = state.currentSubcontractingFrequency;
  }

  function renderFilesList() {
    const list = $('filesList');
    if (!list) return;
    list.innerHTML = '';

    const validIds = new Set(state.files.map((f) => f.id));
    state.selectedFileIds?.forEach((id) => {
      if (!validIds.has(id)) state.selectedFileIds.delete(id);
    });

    const files = state.files.slice().reverse();

    if (!files.length) {
      state.selectedFileIds?.clear();
      list.innerHTML = `
        <div class="p-3 rounded-lg border border-dashed border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-sm">
          Upload Excel files or add remote Excel URLs to start.
        </div>
      `;
      updateDeleteFilesBtn();
      return;
    }

    files.forEach((f) => {
      const meta = state.fileMeta[f.id] || {};
      const label = escapeHtml(meta.label || f.name);
      const remoteSource = meta.remoteSourceKey ? state.remoteSources?.[meta.remoteSourceKey] : null;
      const localSource = meta.localSourceKey ? state.localLinkedSources?.[meta.localSourceKey] : null;
      const linkedSource = remoteSource || localSource || null;
      const sourceTag =
        f.sourceType === "remote"
          ? "Remote URL"
          : f.sourceType === "linked_local"
            ? "Linked local file"
            : "Local file";
      const subtitle = `${escapeHtml(f.mode || 'File')} • ${formatInt(f.rows)} row(s) • ${escapeHtml(sourceTag)}`;
      const time = escapeHtml(new Date(f.loadedAt).toLocaleTimeString());
      const checked = state.selectedFileIds?.has(f.id);
      const syncStatus = linkedSource
        ? (linkedSource.status === "error"
            ? `Sync error: ${linkedSource.error || "unknown"}`
            : linkedSource.status === "syncing"
              ? "Syncing source..."
              : linkedSource.lastSyncAt
                ? `Auto-sync on • last sync ${new Date(linkedSource.lastSyncAt).toLocaleTimeString()}`
                : f.sourceType === "remote"
                  ? "Remote link added"
                  : "Local file linked")
        : "";

      const card = document.createElement('div');
      card.className =
        'p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 border border-transparent hover:border-slate-100 dark:hover:border-slate-700 transition-all';
      card.innerHTML = `
        <div class="flex items-start gap-3">
          <input type="checkbox"
                 data-file-select="${f.id}"
                 class="mt-1 rounded border-slate-300 dark:border-slate-600 flex-shrink-0"
                 ${checked ? 'checked' : ''}>
          <div class="flex-1 min-w-0">
            <p class="text-xs font-semibold truncate">${label}</p>
            <p class="text-[10px] text-slate-500 dark:text-slate-400">${subtitle}</p>
            ${linkedSource ? `<p class="text-[10px] mt-1 ${linkedSource.status === "error" ? "text-rose-500 dark:text-rose-400" : "text-slate-400 dark:text-slate-500"} truncate" title="${escapeHtml(remoteSource?.url || localSource?.name || "")}">${escapeHtml(syncStatus)}</p>` : ""}
          </div>
          <div class="flex flex-col items-end gap-1 text-right">
            <span class="text-[10px] font-bold text-slate-400 uppercase">${time}</span>
            <div class="flex items-center gap-1">
              ${linkedSource ? `
                <button type="button"
                        class="text-slate-400 hover:text-primary transition-colors"
                        data-file-linked-refresh="${f.id}"
                        title="Refresh this linked source">
                  <span class="material-symbols-outlined text-[16px] leading-none">sync</span>
                </button>
              ` : ""}
              <button type="button"
                      class="text-slate-400 hover:text-rose-500 transition-colors"
                      data-file-remove="${f.id}"
                      title="Delete this file">
                <span class="material-symbols-outlined text-[16px] leading-none">delete</span>
              </button>
            </div>
          </div>
        </div>
      `;

      const checkbox = card.querySelector('input[data-file-select]');
      checkbox?.addEventListener('change', (e) => {
        setFileSelection(f.id, e.target.checked);
      });

      const removeBtn = card.querySelector('button[data-file-remove]');
      removeBtn?.addEventListener('click', () => {
        const name = meta.label || f.name;
        if (!confirm(`Delete "${name}" from workspace?`)) return;
        removeFiles([f.id]);
      });

      const refreshBtn = card.querySelector('button[data-file-linked-refresh]');
      refreshBtn?.addEventListener('click', async () => {
        if (meta.remoteSourceKey) {
          await syncRemoteSource(meta.remoteSourceKey, { force: true });
          return;
        }
        if (meta.localSourceKey) {
          await syncLinkedLocalSource(meta.localSourceKey, { force: true });
        }
      });

      list.appendChild(card);
    });

    updateDeleteFilesBtn();
  }

  // -----------------------------
  // Filtering
  // -----------------------------
  function getFilteredPlanningRows() {
    let rows = state.mode === "output_planning" ? state.planningRows : state.genericRows;
    rows = scopedRows(rows);
    const actCol = state.columns.activity;
    const subCol = state.columns.subsystem;

    return rows.filter((r) => {
      const okAct =
        state.currentActivity === "__ALL__" ||
        (actCol && String(r[actCol] ?? "").trim() === String(state.currentActivity).trim());

      const okSub =
        !shouldFilterBySubsystem() ||
        (subCol && subsystemMatchesSelection(r[subCol]));

      return okAct && okSub;
    });
  }

  function syncWorkloadSectionOrder() {
    const view = $('view-workload');
    const treeCard = $('workloadTreeCard');
    const secondaryGrid = $('workloadSecondaryGrid');
    const lineCard = $('lineCard');
    if (!view || !treeCard || !secondaryGrid || !lineCard) return;

    if (treeCard.nextElementSibling !== secondaryGrid) {
      view.insertBefore(secondaryGrid, lineCard);
    }
  }

  // -----------------------------
  // Main render pipeline
  // -----------------------------
  function recomputeAndRender() {
    const activeView = getCurrentActiveViewKey();

    if (activeView === 'overview') { renderOverviewDashboard(); return; }
    if (activeView === 'materials') { renderMaterialsDashboard(); return; }
    if (activeView === 'overhaul') { renderOverhaulDashboard(); return; }
    if (activeView === 'subcontracting') { renderSubcontractingDashboard(); return; }
    if (activeView === 'benchmark') { renderBenchmarkDashboard(); return; }
    if (activeView === 'riskassessment') { renderRiskAssessmentDashboard(); return; }
    if (activeView === 'totalcost') { renderTotalCostDashboard(); return; }

    const rows = getFilteredPlanningRows();
    const durationAndBarsRows = getFilteredDurationAndBarsRows();

    syncWorkloadSectionOrder();
    renderKpis();
    renderWorkloadTreeChart();
    renderLine();
    renderDurationLine();
    renderBars(durationAndBarsRows);
    renderPie(rows);
    renderSynthesisTable();
  }

  let _renderScheduleTimer = null;
  function scheduleRender() {
    clearTimeout(_renderScheduleTimer);
    _renderScheduleTimer = setTimeout(recomputeAndRender, 120);
  }

  // -----------------------------
  // KPI cards (from Synthesis)
  // -----------------------------
  function buildSynthesisMap() {
    const deduped = new Map(); // file|subsystem|shift -> max headcount
    const map = new Map(); // subsystem -> {dayOpt, nightOpt, projects: Map}
    const totalByProject = new Map(); // project -> {dayOpt, nightOpt}

    for (const r of scopedRows(state.synthesisRows)) {
      const type = String(r.type ?? "").trim().toLowerCase();
      const shift = String(r.shift ?? "").trim().toLowerCase();
      const subsystem = String(r.subsystem ?? "").trim();
      if (!subsystem) continue;
      if (type !== "preventive") continue;
      const fileId = r.__fileid || "";
      if (shift === "day") {
        deduped.set(`${fileId}|${subsystem}|day`, Math.max(deduped.get(`${fileId}|${subsystem}|day`) || 0, toNumber(r.day_technicians_optimized)));
      } else if (shift === "night") {
        deduped.set(`${fileId}|${subsystem}|night`, Math.max(deduped.get(`${fileId}|${subsystem}|night`) || 0, toNumber(r.night_technicians_optimized)));
      }
    }

    deduped.forEach((headcount, key) => {
      if (!headcount) return;
      const [fileId, subsystem, shift] = key.split("|");
      const project = getProjectLabelForFileId(fileId);
      if (!map.has(subsystem)) map.set(subsystem, { dayOpt: 0, nightOpt: 0, projects: new Map() });
      if (!totalByProject.has(project)) totalByProject.set(project, { dayOpt: 0, nightOpt: 0 });

      const subsystemBucket = map.get(subsystem);
      const projectBucket = subsystemBucket.projects.get(project) || { dayOpt: 0, nightOpt: 0 };
      const totalProjectBucket = totalByProject.get(project);

      if (shift === "day") {
        subsystemBucket.dayOpt += headcount;
        projectBucket.dayOpt += headcount;
        totalProjectBucket.dayOpt += headcount;
      } else if (shift === "night") {
        subsystemBucket.nightOpt += headcount;
        projectBucket.nightOpt += headcount;
        totalProjectBucket.nightOpt += headcount;
      }

      subsystemBucket.projects.set(project, projectBucket);
      totalByProject.set(project, totalProjectBucket);
      map.set(subsystem, subsystemBucket);
    });

    return { subsystems: map, totalByProject };
  }

  function renderKpis() {
    const grid = $('kpiGrid');
    if (!grid) return;

    if (state.synthesisRows.length) {
      const { subsystems: map, totalByProject } = buildSynthesisMap();
      const subs = Array.from(map.keys()).sort((a, b) => a.localeCompare(b));
      const orderedProjects = Array.from(totalByProject.entries())
        .sort((a, b) => ((b[1].dayOpt + b[1].nightOpt) - (a[1].dayOpt + a[1].nightOpt)) || a[0].localeCompare(b[0]));
      const projectColorMap = new Map(orderedProjects.map(([project], index) => [project, colorForSeriesIndex(index)]));
      grid.innerHTML = "";

      if (!subs.length) {
        grid.innerHTML = `
          <div class="col-span-full p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-sm">
            No preventive headcount rows found in <span class="font-mono">Synthesis</span>.
          </div>
        `;
        return;
      }

      let totalDay = 0;
      let totalNight = 0;
      for (const sub of subs) {
        const { dayOpt, nightOpt, projects } = map.get(sub);
        totalDay += dayOpt || 0;
        totalNight += nightOpt || 0;
        const projectItems = Array.from(projects.entries())
          .map(([project, values]) => ({
            project,
            dayOpt: values.dayOpt || 0,
            nightOpt: values.nightOpt || 0,
            total: (values.dayOpt || 0) + (values.nightOpt || 0),
          }))
          .filter((item) => item.total > 0)
          .sort((a, b) => b.total - a.total);
        const card = document.createElement('div');
        card.className =
          'bg-white dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-2 min-h-[170px]';
        card.innerHTML = `
          <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">${sub}</span>
          ${state.showWorkloadKpiProjectSum ? `
            <div class="flex items-baseline justify-between">
              <div class="flex flex-col">
                <span class="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Night</span>
                <span class="text-2xl font-black text-primary">${formatInt(nightOpt)}</span>
              </div>
              <div class="flex flex-col items-end">
                <span class="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Day</span>
                <span class="text-2xl font-black text-teal-600">${formatInt(dayOpt)}</span>
              </div>
            </div>
          ` : `
            <div class="text-[11px] text-slate-500 dark:text-slate-400">
              Project split only
            </div>
          `}
          <div class="mt-1 space-y-1.5 overflow-y-auto custom-scrollbar max-h-[92px]">
            ${projectItems.length ? projectItems.map((item) => `
              <div class="flex items-start justify-between gap-3 text-[11px]">
                <div class="flex min-w-0 items-start gap-2">
                  <span class="inline-block size-2.5 rounded-full shrink-0" style="background:${projectColorMap.get(item.project) || "#94a3b8"};"></span>
                  <span class="leading-tight text-slate-600 dark:text-slate-300 break-words" title="${escapeHtml(item.project)}">${escapeHtml(item.project)}</span>
                </div>
                <div class="shrink-0 text-right text-slate-500 dark:text-slate-400">
                  <span class="font-semibold text-primary">N ${formatInt(item.nightOpt)}</span>
                  <span class="ml-2 font-semibold text-teal-600">D ${formatInt(item.dayOpt)}</span>
                </div>
              </div>
            `).join("") : `<div class="text-[11px] text-slate-500 dark:text-slate-400">No project split available.</div>`}
          </div>
        `;
        grid.appendChild(card);
      }

      const totalProjectItems = orderedProjects
        .map(([project, values]) => ({
          project,
          dayOpt: values.dayOpt || 0,
          nightOpt: values.nightOpt || 0,
          total: (values.dayOpt || 0) + (values.nightOpt || 0),
        }))
        .filter((item) => item.total > 0);
      const totalCard = document.createElement('div');
      totalCard.className =
        'bg-slate-50 dark:bg-slate-900/80 p-4 rounded-xl border border-primary/20 dark:border-primary/30 shadow-sm flex flex-col gap-2 min-h-[170px]';
      totalCard.innerHTML = `
        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total</span>
        ${state.showWorkloadKpiProjectSum ? `
          <div class="flex items-baseline justify-between">
            <div class="flex flex-col">
              <span class="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Night</span>
              <span class="text-2xl font-black text-primary">${formatInt(totalNight)}</span>
            </div>
            <div class="flex flex-col items-end">
              <span class="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Day</span>
              <span class="text-2xl font-black text-teal-600">${formatInt(totalDay)}</span>
            </div>
          </div>
        ` : `
          <div class="text-[11px] text-slate-500 dark:text-slate-400">
            Project split only
          </div>
        `}
        <div class="mt-1 space-y-1.5 overflow-y-auto custom-scrollbar max-h-[92px]">
          ${totalProjectItems.length ? totalProjectItems.map((item) => `
            <div class="flex items-start justify-between gap-3 text-[11px]">
              <div class="flex min-w-0 items-start gap-2">
                <span class="inline-block size-2.5 rounded-full shrink-0" style="background:${projectColorMap.get(item.project) || "#94a3b8"};"></span>
                <span class="leading-tight text-slate-600 dark:text-slate-300 break-words" title="${escapeHtml(item.project)}">${escapeHtml(item.project)}</span>
              </div>
              <div class="shrink-0 text-right text-slate-500 dark:text-slate-400">
                <span class="font-semibold text-primary">N ${formatInt(item.nightOpt)}</span>
                <span class="ml-2 font-semibold text-teal-600">D ${formatInt(item.dayOpt)}</span>
              </div>
            </div>
          `).join("") : `<div class="text-[11px] text-slate-500 dark:text-slate-400">No project split available.</div>`}
        </div>
      `;
      grid.appendChild(totalCard);
      const toggleCard = document.createElement('div');
      toggleCard.className =
        'bg-white dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between gap-3 min-h-[170px]';
      toggleCard.innerHTML = `
        <div>
          <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Display</span>
          <p class="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Project Sum on KPI cards</p>
          <p class="mt-1 text-[11px] text-slate-500 dark:text-slate-400">Show or hide the aggregated Day/Night total on every Workload KPI card.</p>
        </div>
        <label class="inline-flex items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-3 py-2 cursor-pointer">
          <span class="text-xs font-semibold text-slate-600 dark:text-slate-300">Show total</span>
          <input id="workloadKpiProjectSumToggle" type="checkbox" class="rounded border-slate-300 dark:border-slate-600 text-primary" ${state.showWorkloadKpiProjectSum ? 'checked' : ''}>
        </label>
      `;
      grid.appendChild(toggleCard);
      $('workloadKpiProjectSumToggle')?.addEventListener('change', (e) => {
        state.showWorkloadKpiProjectSum = !!e.target.checked;
        renderKpis();
        renderWorkloadTreeChart();
      });
      return;
    }

    // Fallback: count planning rows by subsystem
    const col = state.columns.subsystem;
    const counts = new Map();
    for (const r of getFilteredPlanningRows()) {
      const raw = col ? r[col] : null;
      const key = String(raw ?? '').trim().toUpperCase();
      if (!key) continue;
      counts.set(key, (counts.get(key) || 0) + 1);
    }

    grid.innerHTML = '';
    if (!counts.size) {
      grid.innerHTML = `
        <div class="col-span-full p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-sm">
          Upload an Excel file with a <span class="font-mono">subsystem</span> column (or an Output Planning file) to populate KPIs.
        </div>
      `;
      return;
    }

    const subs = Array.from(counts.keys()).sort((a, b) => a.localeCompare(b));
    for (const sub of subs) {
      const v = counts.get(sub) || 0;
      const card = document.createElement('div');
      card.className =
        'bg-white dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-2';
      card.innerHTML = `
        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">${sub}</span>
        <span class="text-2xl font-black text-primary">${formatInt(v)}</span>
        <span class="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Rows</span>
      `;
      grid.appendChild(card);
    }
  }

  function renderWorkloadTreeChart() {
    const body = $('workloadTreeBody');
    const empty = $('workloadTreeEmpty');
    const subtitle = $('workloadTreeSubtitle');
    if (!body || !empty || !subtitle) return;

    const shiftColors = { Day: "#14b8a6", Night: "#2563eb" };
    const optionalMatches = (row) => {
      if (state.currentActivity !== "__ALL__") {
        const activity = String(row?.activity ?? row?.activity_type ?? row?.work_type ?? row?.type ?? "").trim();
        if (activity && activity !== String(state.currentActivity).trim()) return false;
      }
      if (state.currentWorkloadEquipment !== "__ALL__") {
        const equipment = String(row?.equipment ?? "").trim();
        if (equipment && equipment !== String(state.currentWorkloadEquipment).trim()) return false;
      }
      if (state.currentWorkloadLocation !== "__ALL__") {
        const location = String(row?.location ?? row?.site ?? row?.area ?? row?.station ?? "").trim();
        if (location && location !== String(state.currentWorkloadLocation).trim()) return false;
      }
      return true;
    };
    const normalizeShift = (value) => {
      const raw = String(value ?? "").trim().toLowerCase();
      if (!raw) return "";
      if (raw.includes("night") || raw.includes("nuit")) return "Night";
      if (raw.includes("day") || raw.includes("jour")) return "Day";
      return raw.charAt(0).toUpperCase() + raw.slice(1);
    };
    const projectMap = new Map();
    const ensureProject = (projectLabel) => {
      let bucket = projectMap.get(projectLabel);
      if (!bucket) {
        bucket = { label: projectLabel, total: 0, subsystems: new Map() };
        projectMap.set(projectLabel, bucket);
      }
      return bucket;
    };
    const addNodeValue = (projectLabel, subsystem, shift, value) => {
      if (!value || value <= 0) return;
      const projectBucket = ensureProject(projectLabel);
      projectBucket.total += value;
      let subsystemBucket = projectBucket.subsystems.get(subsystem);
      if (!subsystemBucket) {
        subsystemBucket = { label: subsystem, total: 0, shifts: new Map() };
        projectBucket.subsystems.set(subsystem, subsystemBucket);
      }
      subsystemBucket.total += value;
      subsystemBucket.shifts.set(shift, (subsystemBucket.shifts.get(shift) || 0) + value);
    };

    let sourceLabel = "";
    if (state.synthesisRows.length) {
      sourceLabel = "Synthesis";
      const byFileSubShift = new Map();
      for (const row of scopedRows(state.synthesisRows || [])) {
        const type = String(row?.type ?? "").trim().toLowerCase();
        if (type !== "preventive") continue;
        if (!optionalMatches(row)) continue;
        const subsystem = String(row?.subsystem ?? "").trim();
        if (!subsystem) continue;
        if (shouldFilterBySubsystem() && !subsystemMatchesSelection(subsystem)) continue;
        const shift = normalizeShift(row?.shift);
        if (shift !== "Day" && shift !== "Night") continue;
        const fileId = row?.__fileid || "";
        const value = shift === "Day"
          ? toNumber(row?.day_technicians_optimized)
          : toNumber(row?.night_technicians_optimized);
        if (!value) continue;
        const key = `${fileId}|${subsystem}|${shift}`;
        byFileSubShift.set(key, Math.max(byFileSubShift.get(key) || 0, value));
      }

      byFileSubShift.forEach((value, key) => {
        const [fileId, subsystem, shift] = key.split("|");
        addNodeValue(getProjectLabelForFileId(fileId), subsystem || "Unspecified", shift || "Unspecified", value);
      });
    } else {
      sourceLabel = "Planning Complet";
      const rows = getFilteredDurationAndBarsRows();
      const shiftCol = state.columns.shift;
      const subCol = state.columns.subsystem;
      const techCol = state.columns.techNeeded;
      const byFileSubShift = new Map();

      rows.forEach((row) => {
        const subsystem = subCol ? String(row?.[subCol] ?? "").trim() : "";
        if (!subsystem) return;
        const shift = normalizeShift(shiftCol ? row?.[shiftCol] : "");
        if (shift !== "Day" && shift !== "Night") return;
        const value = techCol ? toNumber(row?.[techCol]) : 0;
        if (!value) return;
        const fileId = row?.__fileid || "";
        const key = `${fileId}|${subsystem}|${shift}`;
        byFileSubShift.set(key, Math.max(byFileSubShift.get(key) || 0, value));
      });

      byFileSubShift.forEach((value, key) => {
        const [fileId, subsystem, shift] = key.split("|");
        addNodeValue(getProjectLabelForFileId(fileId), subsystem || "Unspecified", shift || "Unspecified", value);
      });
    }

    const projects = Array.from(projectMap.values())
      .filter((item) => item.total > 0)
      .sort((a, b) => b.total - a.total);
    subtitle.textContent = `Source: ${sourceLabel} - technicians split by project, subsystem and shift - ${formatSubsystemSelectionLabel()}`;

    if (!projects.length) {
      body.innerHTML = "";
      empty.classList.remove('hidden');
      return;
    }

    empty.classList.add('hidden');
    const selectedProjectLabel = projects.some((item) => item.label === state.currentWorkloadTreeProject)
      ? state.currentWorkloadTreeProject
      : projects[0]?.label;
    state.currentWorkloadTreeProject = selectedProjectLabel || "__AUTO__";

    const selectedProject = projects.find((item) => item.label === selectedProjectLabel) || projects[0];
    const subsystems = selectedProject
      ? Array.from(selectedProject.subsystems.values()).sort((a, b) => b.total - a.total)
      : [];
    const selectedSubsystemLabel = subsystems.some((item) => item.label === state.currentWorkloadTreeSubsystem)
      ? state.currentWorkloadTreeSubsystem
      : subsystems[0]?.label;
    state.currentWorkloadTreeSubsystem = selectedSubsystemLabel || "__AUTO__";

    const selectedSubsystem = subsystems.find((item) => item.label === selectedSubsystemLabel) || subsystems[0] || null;
    const shifts = selectedSubsystem
      ? Array.from(selectedSubsystem.shifts.entries())
          .map(([label, value]) => ({ label, value }))
          .sort((a, b) => b.value - a.value)
      : [];

    const totalValue = projects.reduce((sum, item) => sum + item.total, 0);
    const maxProject = Math.max(1, ...projects.map((item) => item.total));
    const maxSubsystem = Math.max(1, ...subsystems.map((item) => item.total), 1);
    const maxShift = Math.max(1, ...shifts.map((item) => item.value), 1);

    const renderTreeNode = ({
      nodeId,
      parentId = "",
      label,
      value,
      widthPct,
      color,
      active = false,
      levelLabel,
      button = false,
      action = "",
      title = "",
      showValue = true,
      hiddenValueLabel = "",
    }) => {
      const tag = button ? "button" : "div";
      const attrs = [
        `data-workload-tree-node-id="${escapeHtml(nodeId)}"`,
        parentId ? `data-workload-tree-parent-id="${escapeHtml(parentId)}"` : "",
        active ? `data-workload-tree-selected="1"` : `data-workload-tree-selected="0"`,
        button ? `type="button"` : "",
        action ? `data-workload-tree-action="${escapeHtml(action)}"` : "",
        title ? `title="${escapeHtml(title)}"` : "",
        `class="${button ? "w-full text-left" : "w-full"} group relative rounded-xl px-3 py-3 bg-white/90 dark:bg-slate-900/90 border ${active ? "border-blue-400 dark:border-blue-500 shadow-[0_0_0_1px_rgba(59,130,246,0.25)]" : "border-slate-200 dark:border-slate-800"} transition-all"`
      ].filter(Boolean).join(" ");
      return `
        <${tag} ${attrs}>
          <div class="absolute left-0 right-0 top-0 h-2 rounded-t-xl bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div class="h-full" style="width:${Math.max(2, Math.min(100, widthPct))}%; background:${color};"></div>
          </div>
          <div class="pt-3">
            ${levelLabel ? `<div class="text-[10px] font-bold uppercase tracking-wider ${active ? "text-blue-600 dark:text-blue-300" : "text-slate-400"}">${escapeHtml(levelLabel)}</div>` : ""}
            <div class="mt-1 text-[13px] leading-5 ${active ? "font-extrabold text-slate-900 dark:text-white" : "font-semibold text-slate-700 dark:text-slate-200"} truncate">${escapeHtml(label)}</div>
            ${showValue
              ? `<div class="mt-1 text-[12px] ${active ? "text-slate-700 dark:text-slate-200" : "text-slate-500 dark:text-slate-400"}">${escapeHtml(formatInt(value))} technicians</div>`
              : `<div class="mt-1 text-[12px] ${active ? "text-slate-700 dark:text-slate-200" : "text-slate-500 dark:text-slate-400"}">${escapeHtml(hiddenValueLabel || "Project split only")}</div>`
            }
          </div>
        </${tag}>
      `;
    };

    body.innerHTML = `
      <div class="relative overflow-x-auto">
        <div class="relative min-w-[1120px] pb-2" data-workload-tree-surface>
          <svg id="workloadTreeSvg" class="pointer-events-none absolute inset-0 h-full w-full overflow-visible"></svg>
          <div class="relative z-10 grid gap-14 items-start" style="grid-template-columns: 220px 220px 220px 220px;">
            <div class="pt-24">
              ${renderTreeNode({
                nodeId: "root",
                label: "Total Technicians",
                value: totalValue,
                widthPct: 100,
                color: "#1d4ed8",
                active: true,
                showValue: !!state.showWorkloadKpiProjectSum,
                hiddenValueLabel: "Project split only",
              })}
            </div>
            <div class="space-y-6">
              ${projects.map((project, index) => renderTreeNode({
                nodeId: `project:${project.label}`,
                parentId: "root",
                label: project.label,
                value: project.total,
                widthPct: (project.total / maxProject) * 100,
                color: colorForSeriesIndex(index),
                active: project.label === selectedProjectLabel,
                levelLabel: "Project",
                button: true,
                action: `project:${project.label}`,
                title: project.label,
              })).join("")}
            </div>
            <div class="space-y-6">
              ${subsystems.map((subsystem, index) => renderTreeNode({
                nodeId: `subsystem:${subsystem.label}`,
                parentId: selectedProject ? `project:${selectedProject.label}` : "",
                label: subsystem.label,
                value: subsystem.total,
                widthPct: (subsystem.total / maxSubsystem) * 100,
                color: SUBCONTRACT_PIE_COLORS[index % SUBCONTRACT_PIE_COLORS.length],
                active: subsystem.label === selectedSubsystemLabel,
                levelLabel: "Subsystem",
                button: true,
                action: `subsystem:${subsystem.label}`,
                title: subsystem.label,
              })).join("")}
            </div>
            <div class="space-y-6">
              ${shifts.map((shift) => renderTreeNode({
                nodeId: `shift:${shift.label}`,
                parentId: selectedSubsystem ? `subsystem:${selectedSubsystem.label}` : "",
                label: shift.label,
                value: shift.value,
                widthPct: (shift.value / maxShift) * 100,
                color: shiftColors[shift.label] || "#64748b",
                active: true,
                levelLabel: "Shift",
                title: shift.label,
              })).join("")}
            </div>
          </div>
        </div>
      </div>
    `;

    body.querySelectorAll('[data-workload-tree-action]').forEach((node) => {
      node.addEventListener('click', () => {
        const action = node.getAttribute('data-workload-tree-action') || "";
        if (action.startsWith("project:")) {
          state.currentWorkloadTreeProject = action.slice("project:".length);
          state.currentWorkloadTreeSubsystem = "__AUTO__";
        } else if (action.startsWith("subsystem:")) {
          state.currentWorkloadTreeSubsystem = action.slice("subsystem:".length);
        }
        renderWorkloadTreeChart();
      });
    });

    if (!state._workloadTreeResizeSetup) {
      state._workloadTreeResizeSetup = true;
      window.addEventListener('resize', () => {
        requestAnimationFrame(() => drawWorkloadTreeConnectors());
      });
    }

    requestAnimationFrame(() => drawWorkloadTreeConnectors());
  }

  function drawWorkloadTreeConnectors() {
    const body = $('workloadTreeBody');
    const svg = $('workloadTreeSvg');
    const surface = body?.querySelector('[data-workload-tree-surface]');
    if (!body || !svg || !surface) return;

    const surfaceRect = surface.getBoundingClientRect();
    if (!surfaceRect.width || !surfaceRect.height) return;

    svg.setAttribute('viewBox', `0 0 ${surfaceRect.width} ${surfaceRect.height}`);
    svg.setAttribute('width', `${surfaceRect.width}`);
    svg.setAttribute('height', `${surfaceRect.height}`);

    const nodeMap = new Map();
    surface.querySelectorAll('[data-workload-tree-node-id]').forEach((node) => {
      const rect = node.getBoundingClientRect();
      nodeMap.set(node.getAttribute('data-workload-tree-node-id'), {
        left: rect.left - surfaceRect.left,
        right: rect.right - surfaceRect.left,
        midY: rect.top - surfaceRect.top + (rect.height / 2),
      });
    });

    const paths = [];
    surface.querySelectorAll('[data-workload-tree-parent-id]').forEach((node) => {
      const childId = node.getAttribute('data-workload-tree-node-id');
      const parentId = node.getAttribute('data-workload-tree-parent-id');
      const isSelected = node.getAttribute('data-workload-tree-selected') === "1";
      const parent = nodeMap.get(parentId);
      const child = nodeMap.get(childId);
      if (!parent || !child) return;

      const startX = parent.right;
      const endX = child.left;
      const startY = parent.midY;
      const endY = child.midY;
      const delta = Math.max(28, (endX - startX) * 0.35);
      const color = isSelected ? "#1d4ed8" : "#93c5fd";
      const width = isSelected ? 2.4 : 1.5;
      paths.push(`
        <path
          d="M ${startX} ${startY} C ${startX + delta} ${startY}, ${endX - delta} ${endY}, ${endX} ${endY}"
          fill="none"
          stroke="${color}"
          stroke-width="${width}"
          stroke-linecap="round"
          opacity="${isSelected ? "1" : "0.9"}"></path>
      `);
    });

    svg.innerHTML = paths.join("");
  }

  // -----------------------------
  // Line chart: Technicians Needed Per Day
  // -----------------------------
  function buildTechSeries() {
    const rows = scopedRows(state.techRows.length ? state.techRows : []);
    const map = new Map(); // dateKey -> {day, night}
    const perProject = new Map(); // projectKey -> { label, color, byDate: Map }
    const palette = ['#137fec', '#14b8a6', '#a855f7', '#f59e0b', '#ef4444', '#22c55e', '#06b6d4', '#f97316', '#64748b'];
    const colorForIndex = (i) => {
      if (i < palette.length) return palette[i];
      const hue = (i * 47) % 360;
      return `hsl(${hue},70%,45%)`;
    };
    const ensureProject = (row) => {
      const fid = row.__fileid;
      const pk = getProjectKeyForFileId(fid) || fid || '__unknown__';
      if (!perProject.has(pk)) {
        const idx = perProject.size;
        const ids = getFileIdsForProjectKey(pk);
        const refId = ids[0] || fid;
        const meta = state.fileMeta[refId] || state.fileMeta[fid] || {};
        perProject.set(pk, {
          key: pk,
          label: meta.label || meta.name || pk,
          color: colorForIndex(idx),
          byDate: new Map(),
        });
      }
      return perProject.get(pk);
    };
    const addPoint = (bucket, key, dayV, nightV) => {
      const prev = bucket.get(key) || { day: 0, night: 0 };
      prev.day += dayV;
      prev.night += nightV;
      bucket.set(key, prev);
    };

    if (rows.length) {
      for (const r of rows) {
        if (shouldFilterBySubsystem()) {
          const rs = String(r.subsystem ?? "").trim();
          if (!subsystemMatchesSelection(rs)) continue;
        }
        const d = parseDate(r.date);
        if (!d) continue;
        const key = d.toISOString().slice(0, 10);

        const dayV = toNumber(r.day_technicians_needed);
        const nightV = toNumber(r.night_technicians_needed);

        addPoint(map, key, dayV, nightV);
        addPoint(ensureProject(r).byDate, key, dayV, nightV);
      }
    } else {
      const plan = getFilteredPlanningRows();
      const dateCol = state.columns.date;
      const shiftCol = state.columns.shift;
      const techCol = state.columns.techNeeded;

      for (const r of plan) {
        const d = dateCol ? parseDate(r[dateCol]) : null;
        if (!d) continue;
        const key = d.toISOString().slice(0, 10);

        const s = shiftCol ? String(r[shiftCol] ?? '').toLowerCase() : '';
        const isNight = s.includes('night') || s.includes('nuit');
        const t = techCol ? toNumber(r[techCol]) : 0;
        const dayV = isNight ? 0 : t;
        const nightV = isNight ? t : 0;

        addPoint(map, key, dayV, nightV);
        addPoint(ensureProject(r).byDate, key, dayV, nightV);
      }
    }

    const dates = Array.from(map.keys()).sort();
    const day = dates.map((k) => map.get(k).day);
    const night = dates.map((k) => map.get(k).night);
    const projects = Array.from(perProject.values()).map((project) => ({
      key: project.key,
      label: project.label,
      color: project.color,
      day: dates.map((k) => (project.byDate.get(k)?.day || 0)),
      night: dates.map((k) => (project.byDate.get(k)?.night || 0)),
    }));

    // Keep at most 365-400 points; downsample if needed for performance
    const maxPoints = 400;
    if (dates.length > maxPoints) {
      const step = Math.ceil(dates.length / maxPoints);
      const d2 = [];
      const day2 = [];
      const night2 = [];
      const projects2 = projects.map((project) => ({
        ...project,
        day: [],
        night: [],
      }));
      for (let i = 0; i < dates.length; i += step) {
        d2.push(dates[i]);
        day2.push(day[i]);
        night2.push(night[i]);
        projects2.forEach((project, idx) => {
          project.day.push(projects[idx].day[i]);
          project.night.push(projects[idx].night[i]);
        });
      }
      return { dates: d2, day: day2, night: night2, projects: projects2 };
    }

    return { dates, day, night, projects };
  }

  function buildDurationSeries() {
    const rows = getFilteredDurationAndBarsRows();
    const dateCol = state.columns.date;
    const shiftCol = state.columns.shift;
    const hoursCol = state.columns.hours;
    const map = new Map();
    const perProject = new Map();

    const ensureProject = (row) => {
      const fid = row.__fileid;
      const pk = getProjectKeyForFileId(fid) || fid || '__unknown__';
      if (!perProject.has(pk)) {
        const idx = perProject.size;
        const ids = getFileIdsForProjectKey(pk);
        const refId = ids[0] || fid;
        const meta = state.fileMeta[refId] || state.fileMeta[fid] || {};
        perProject.set(pk, {
          key: pk,
          label: meta.label || meta.name || pk,
          color: colorForSeriesIndex(idx),
          byDate: new Map(),
        });
      }
      return perProject.get(pk);
    };

    const addPoint = (bucket, key, dayV, nightV) => {
      const prev = bucket.get(key) || { day: 0, night: 0 };
      prev.day += dayV;
      prev.night += nightV;
      bucket.set(key, prev);
    };

    for (const r of rows) {
      const d = dateCol ? parseDate(r[dateCol]) : null;
      if (!d) continue;
      const key = d.toISOString().slice(0, 10);

      const shift = shiftCol ? String(r[shiftCol] ?? '').toLowerCase() : '';
      const isNight = shift.includes('night') || shift.includes('nuit');
      const duration = hoursCol ? toNumber(r[hoursCol]) : 0;
      if (!duration) continue;

      const dayV = isNight ? 0 : duration;
      const nightV = isNight ? duration : 0;

      addPoint(map, key, dayV, nightV);
      addPoint(ensureProject(r).byDate, key, dayV, nightV);
    }

    const dates = Array.from(map.keys()).sort();
    const projects = Array.from(perProject.values()).map((project) => ({
      key: project.key,
      label: project.label,
      color: project.color,
      day: dates.map((k) => project.byDate.get(k)?.day || 0),
      night: dates.map((k) => project.byDate.get(k)?.night || 0),
    }));

    const maxPoints = 400;
    if (dates.length > maxPoints) {
      const step = Math.ceil(dates.length / maxPoints);
      const dates2 = [];
      const projects2 = projects.map((project) => ({
        ...project,
        day: [],
        night: [],
      }));

      for (let i = 0; i < dates.length; i += step) {
        dates2.push(dates[i]);
        projects2.forEach((project, idx) => {
          project.day.push(projects[idx].day[i]);
          project.night.push(projects[idx].night[i]);
        });
      }
      return { dates: dates2, projects: projects2 };
    }

    return { dates, projects };
  }

  function renderLine() {
    const subtitle = $('lineSubtitle');
    const projectLegend = $('lineProjectsLegend');
    const year = inferPlanningYear();
    const subLabel = formatSubsystemSelectionLabel();
    if (subtitle) subtitle.textContent = `Source: Technicians Needed Per Day - Day/Night by project - ${subLabel} - Year: ${year || "--"}`;

    const series = buildTechSeries();
    const projectLayer = $('projectLineLayer');
    const nightPath = $('nightPath');
    const dayPath = $('dayPath');
    const nightArea = $('nightArea');

    if (!series.dates.length) {
      state._line = null;
      if (projectLegend) projectLegend.innerHTML = '';
      if (projectLayer) projectLayer.innerHTML = '';
      if (nightPath) {
        nightPath.setAttribute('d', '');
        nightPath.setAttribute('opacity', '0');
      }
      if (dayPath) {
        dayPath.setAttribute('d', '');
        dayPath.setAttribute('opacity', '0');
      }
      if (nightArea) {
        nightArea.setAttribute('d', '');
        nightArea.setAttribute('opacity', '0');
      }
      ['p1', 'p2', 'p3'].forEach((id) => {
        const marker = $(id);
        if (marker) marker.setAttribute('opacity', '0');
      });
      return;
    }

    const n = series.dates.length;
    const projectSeries = (series.projects || [])
      .map((project) => ({
        key: project.key,
        label: project.label,
        color: project.color,
        dayValues: series.dates.map((_, i) => project.day[i] || 0),
        nightValues: series.dates.map((_, i) => project.night[i] || 0),
      }))
      .filter((project) =>
        project.dayValues.some((v) => v > 0) || project.nightValues.some((v) => v > 0)
      );

    if (!projectSeries.length) {
      state._line = null;
      if (projectLegend) projectLegend.innerHTML = '';
      if (projectLayer) projectLayer.innerHTML = '';
      ['p1', 'p2', 'p3'].forEach((id) => {
        const marker = $(id);
        if (marker) marker.setAttribute('opacity', '0');
      });
      return;
    }

    let maxV = 1;
    for (const project of projectSeries) {
      for (const v of project.dayValues) maxV = Math.max(maxV, v);
      for (const v of project.nightValues) maxV = Math.max(maxV, v);
    }
    for (const project of projectSeries) {
      project.pointsDay = project.dayValues.map((v, i) => ({
        x: n === 1 ? 0 : i * (1000 / (n - 1)),
        y: 20 + (1 - v / maxV) * 240,
      }));
      project.pointsNight = project.nightValues.map((v, i) => ({
        x: n === 1 ? 0 : i * (1000 / (n - 1)),
        y: 20 + (1 - v / maxV) * 240,
      }));
    }

    const tickTop = maxV;
    const tickMid = maxV * (2 / 3);
    const tickLow = maxV * (1 / 3);
    const tickZero = 0;
    const tickEls = {
      top: $('lineTickTop'),
      mid: $('lineTickMid'),
      low: $('lineTickLow'),
      zero: $('lineTickZero'),
    };

    const outer = $('lineChartOuter');
    const yAxis = $('lineTickTop')?.parentElement;
    if (outer && yAxis) {
      const H = outer.clientHeight || 350;
      const padTop = (20 / 300) * H;
      const padBottom = ((300 - 260) / 300) * H;
      yAxis.style.paddingTop = `${Math.round(padTop)}px`;
      yAxis.style.paddingBottom = `${Math.round(padBottom)}px`;
    }

    if (tickEls.top) tickEls.top.textContent = formatInt(tickTop);
    if (tickEls.mid) tickEls.mid.textContent = formatInt(tickMid);
    if (tickEls.low) tickEls.low.textContent = formatInt(tickLow);
    if (tickEls.zero) tickEls.zero.textContent = String(tickZero);

    const yFor = (v) => 20 + (1 - v / maxV) * 240;
    const setY = (id, y) => {
      const el = $(id);
      if (!el) return;
      el.setAttribute('y1', String(y));
      el.setAttribute('y2', String(y));
    };
    setY('gridTop', yFor(tickTop));
    setY('gridMid', yFor(tickMid));
    setY('gridLow', yFor(tickLow));
    setY('gridZero', yFor(tickZero));

    state._line = { series, maxV, projectSeries };

    if (projectLayer) {
      projectLayer.innerHTML = projectSeries.map((project) => {
        const pathNight = toSmoothPath(project.pointsNight);
        const pathDay = toSmoothPath(project.pointsDay);
        return `
          <path d="${pathNight}" fill="none" stroke="${project.color}" stroke-opacity="0.14" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"></path>
          <path d="${pathNight}" fill="none" stroke="${project.color}" stroke-opacity="0.98" stroke-width="2.75" stroke-linecap="round" stroke-linejoin="round"></path>
          <path d="${pathDay}" fill="none" stroke="${project.color}" stroke-opacity="0.1" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="8,6"></path>
          <path d="${pathDay}" fill="none" stroke="${project.color}" stroke-opacity="0.92" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="8,6"></path>
        `;
      }).join('');
    }

    if (projectLegend) {
      projectLegend.innerHTML = projectSeries.map((project) => `
          <div class="flex items-center gap-2">
            <span class="inline-block size-2.5 rounded-full" style="background:${project.color};"></span>
            <span class="max-w-[180px] truncate" title="${escapeHtml(project.label)}">${escapeHtml(project.label)}</span>
          </div>
        `).join('');
    }

    if (nightPath) {
      nightPath.setAttribute('d', '');
      nightPath.setAttribute('opacity', '0');
    }
    if (dayPath) {
      dayPath.setAttribute('d', '');
      dayPath.setAttribute('opacity', '0');
    }
    if (nightArea) {
      nightArea.setAttribute('d', '');
      nightArea.setAttribute('opacity', '0');
    }

    const svgEl = $('lineSvg');
    const projectLayerEl = $('projectLineLayer');
    const hoverLayer = $('hoverLayer');
    if (svgEl && projectLayerEl) svgEl.appendChild(projectLayerEl);
    if (svgEl && hoverLayer) svgEl.appendChild(hoverLayer);

    ['p1', 'p2', 'p3'].forEach((id) => {
      const marker = $(id);
      if (marker) marker.setAttribute('opacity', '0');
    });
  }

  function renderDurationLine() {
    const subtitle = $('durationLineSubtitle');
    const projectLegend = $('durationLineProjectsLegend');
    const year = inferPlanningYear();
    const subLabel = formatSubsystemSelectionLabel();
    const equipmentLabel = state.currentWorkloadEquipment === "__ALL__" ? "All equipment" : `Equipment: ${state.currentWorkloadEquipment}`;
    const locationLabel = state.currentWorkloadLocation === "__ALL__" ? "All locations" : `Location: ${state.currentWorkloadLocation}`;
    if (subtitle) subtitle.textContent = `Source: Planning Complet - Duration by project and time of day - ${subLabel} - ${equipmentLabel} - ${locationLabel} - Year: ${year || "--"}`;

    const series = buildDurationSeries();
    const projectLayer = $('durationProjectLineLayer');

    if (!series.dates.length) {
      state._durationLine = null;
      if (projectLegend) projectLegend.innerHTML = '';
      if (projectLayer) projectLayer.innerHTML = '';
      return;
    }

    const n = series.dates.length;
    const projectSeries = (series.projects || [])
      .map((project) => ({
        key: project.key,
        label: project.label,
        color: project.color,
        dayValues: series.dates.map((_, i) => project.day[i] || 0),
        nightValues: series.dates.map((_, i) => project.night[i] || 0),
      }))
      .filter((project) =>
        project.dayValues.some((v) => v > 0) || project.nightValues.some((v) => v > 0)
      );

    if (!projectSeries.length) {
      state._durationLine = null;
      if (projectLegend) projectLegend.innerHTML = '';
      if (projectLayer) projectLayer.innerHTML = '';
      return;
    }

    let maxV = 1;
    for (const project of projectSeries) {
      for (const v of project.dayValues) maxV = Math.max(maxV, v);
      for (const v of project.nightValues) maxV = Math.max(maxV, v);
    }

    for (const project of projectSeries) {
      project.pointsDay = project.dayValues.map((v, i) => ({
        x: n === 1 ? 0 : i * (1000 / (n - 1)),
        y: 20 + (1 - v / maxV) * 240,
      }));
      project.pointsNight = project.nightValues.map((v, i) => ({
        x: n === 1 ? 0 : i * (1000 / (n - 1)),
        y: 20 + (1 - v / maxV) * 240,
      }));
    }

    const tickTop = maxV;
    const tickMid = maxV * (2 / 3);
    const tickLow = maxV * (1 / 3);
    const tickZero = 0;
    const tickEls = {
      top: $('durationLineTickTop'),
      mid: $('durationLineTickMid'),
      low: $('durationLineTickLow'),
      zero: $('durationLineTickZero'),
    };

    const outer = $('durationLineChartOuter');
    const yAxis = $('durationLineTickTop')?.parentElement;
    if (outer && yAxis) {
      const H = outer.clientHeight || 350;
      const padTop = (20 / 300) * H;
      const padBottom = ((300 - 260) / 300) * H;
      yAxis.style.paddingTop = `${Math.round(padTop)}px`;
      yAxis.style.paddingBottom = `${Math.round(padBottom)}px`;
    }

    if (tickEls.top) tickEls.top.textContent = formatHours(tickTop);
    if (tickEls.mid) tickEls.mid.textContent = formatHours(tickMid);
    if (tickEls.low) tickEls.low.textContent = formatHours(tickLow);
    if (tickEls.zero) tickEls.zero.textContent = '0h';

    const yFor = (v) => 20 + (1 - v / maxV) * 240;
    const setY = (id, y) => {
      const el = $(id);
      if (!el) return;
      el.setAttribute('y1', String(y));
      el.setAttribute('y2', String(y));
    };
    setY('durationGridTop', yFor(tickTop));
    setY('durationGridMid', yFor(tickMid));
    setY('durationGridLow', yFor(tickLow));
    setY('durationGridZero', yFor(tickZero));

    state._durationLine = { series, maxV, projectSeries };

    if (projectLayer) {
      projectLayer.innerHTML = projectSeries.map((project) => {
        const pathNight = toSmoothPath(project.pointsNight);
        const pathDay = toSmoothPath(project.pointsDay);
        return `
          <path d="${pathNight}" fill="none" stroke="${project.color}" stroke-opacity="0.14" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"></path>
          <path d="${pathNight}" fill="none" stroke="${project.color}" stroke-opacity="0.98" stroke-width="2.75" stroke-linecap="round" stroke-linejoin="round"></path>
          <path d="${pathDay}" fill="none" stroke="${project.color}" stroke-opacity="0.1" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="8,6"></path>
          <path d="${pathDay}" fill="none" stroke="${project.color}" stroke-opacity="0.92" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="8,6"></path>
        `;
      }).join('');
    }

    if (projectLegend) {
      projectLegend.innerHTML = projectSeries.map((project) => `
        <div class="flex items-center gap-2">
          <span class="inline-block size-2.5 rounded-full" style="background:${project.color};"></span>
          <span class="max-w-[180px] truncate" title="${escapeHtml(project.label)}">${escapeHtml(project.label)}</span>
        </div>
      `).join('');
    }

    const svgEl = $('durationLineSvg');
    const projectLayerEl = $('durationProjectLineLayer');
    const hoverLayer = $('durationHoverLayer');
    if (svgEl && projectLayerEl) svgEl.appendChild(projectLayerEl);
    if (svgEl && hoverLayer) svgEl.appendChild(hoverLayer);
  }

  function toSmoothPath(points) {
    if (!points.length) return '';
    // Catmull-Rom to Bezier approximation
    const d = [`M${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`];
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i - 1] || points[i];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2] || p2;

      const c1x = p1.x + (p2.x - p0.x) / 6;
      const c1y = p1.y + (p2.y - p0.y) / 6;
      const c2x = p2.x - (p3.x - p1.x) / 6;
      const c2y = p2.y - (p3.y - p1.y) / 6;

      d.push(
        `C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`
      );
    }
    return d.join(' ');
  }

  // -----------------------------
  // Bars: Intervention Duration per Equipment
  // -----------------------------
  function renderBars(rows) {
    const eqCol = state.columns.equipment;
    const hoursCol = state.columns.hours;

    const wrap = $('barsWrap');
    const nav = $('barsNav');
    const navRange = $('barsNavRange');
    const navLabel = $('barsNavLabel');
    wrap.querySelectorAll('[data-bar]').forEach((el) => el.remove());

    // Legend container (optional)
    const legend = $('barsLegend');
    if (legend) legend.innerHTML = '';

    if (!eqCol) return;

    // Which projects are in scope?
    // Which projects are in scope? (ONLY output_planning files + project filters)
    let fileIds = getEffectiveFileIds({ kind: "output_planning" });

    if (!fileIds.length) {
      state.barsOffset = 0;
      if (nav) nav.classList.add('hidden');
      const empty = document.createElement('div');
      empty.setAttribute('data-bar', '1');
      empty.className = 'text-xs text-slate-500 dark:text-slate-400';
      empty.textContent = 'No project selected (scope = none).';
      wrap.appendChild(empty);
      return;
    }

    const fileIdSet = new Set(fileIds);

    // Color palette (repeats with HSL if more projects)
    const palette = ['#137fec', '#14b8a6', '#a855f7', '#f59e0b', '#ef4444', '#22c55e', '#06b6d4', '#f97316', '#64748b'];
    const colorForIndex = (i) => {
      if (i < palette.length) return palette[i];
      const hue = (i * 47) % 360;
      return `hsl(${hue},70%,45%)`;
    };

    // Build fileId -> {label, color}
    const fileInfo = {};
    fileIds.forEach((id, i) => {
      const meta = state.fileMeta[id] || {};
      fileInfo[id] = {
        label: meta.label || meta.name || id,
        color: colorForIndex(i),
      };
    });

    // Render legend
    if (legend) {
      legend.innerHTML = fileIds.map((id) => {
        const info = fileInfo[id];
        return `
          <div class="flex items-center gap-2">
            <span class="inline-block size-2.5 rounded-full" style="background:${info.color};"></span>
            <span class="max-w-[180px] truncate" title="${escapeHtml(info.label)}">${escapeHtml(info.label)}</span>
          </div>
        `;
      }).join('');
    }

    // Totals per equipment per project + combined totals
    const byEq = new Map(); // eq -> Map(fileId -> hours)
    const combined = new Map(); // eq -> total hours (all projects)

    for (const r of rows) {
      const fid = r.__fileid;
      if (!fileIdSet.has(fid)) continue;

      const eq = String(r[eqCol] ?? '').trim();
      if (!eq) continue;

      const hrs = hoursCol ? toNumber(r[hoursCol]) : 0;

      if (!byEq.has(eq)) byEq.set(eq, new Map());
      const m = byEq.get(eq);
      m.set(fid, (m.get(fid) || 0) + hrs);

      combined.set(eq, (combined.get(eq) || 0) + hrs);
    }

    // Top N equipments by combined total
    const visibleCount = 8;
    const sortedEquipAll = Array.from(combined.entries()).sort((a, b) => b[1] - a[1]);
    const maxStart = Math.max(0, sortedEquipAll.length - visibleCount);
    state.barsOffset = Math.max(0, Math.min(state.barsOffset || 0, maxStart));
    const sortedEquip = sortedEquipAll.slice(state.barsOffset, state.barsOffset + visibleCount);

    if (nav && navRange && navLabel) {
      if (sortedEquipAll.length > visibleCount) {
        nav.classList.remove('hidden');
        navRange.max = String(maxStart);
        navRange.value = String(state.barsOffset);
        navLabel.textContent = `Showing ${state.barsOffset + 1}-${state.barsOffset + sortedEquip.length} of ${sortedEquipAll.length}`;
      } else {
        nav.classList.add('hidden');
        navRange.max = '0';
        navRange.value = '0';
        navLabel.textContent = `Showing 1-${sortedEquipAll.length} of ${sortedEquipAll.length}`;
      }
    }

    if (!sortedEquip.length) {
      state.barsOffset = 0;
      if (nav) nav.classList.add('hidden');
      const empty = document.createElement('div');
      empty.setAttribute('data-bar', '1');
      empty.className = 'text-xs text-slate-500 dark:text-slate-400';
      empty.textContent = 'No equipment data (check filters / scope).';
      wrap.appendChild(empty);
      $('avgHours').textContent = '0h';
      $('peakLoad').textContent = '0h';
      $('totalEquip').textContent = '0 Units';
      return;
    }

    // Max value among ALL displayed bars (per project)
    let maxV = 1;
    for (const [eq] of sortedEquip) {
      const m = byEq.get(eq) || new Map();
      for (const fid of fileIds) {
        maxV = Math.max(maxV, m.get(fid) || 0);
      }
    }

    // Y ticks
    $('barTickTop').textContent = `${formatInt(maxV)}h`;
    $('barTickMid').textContent = `${formatInt(maxV * (2/3))}h`;
    $('barTickLow').textContent = `${formatInt(maxV * (1/3))}h`;

    // Stats (based on combined totals for displayed equipments)
    const combinedVals = sortedEquip.map(x => x[1]);
    const avg = combinedVals.reduce((s, v) => s + v, 0) / combinedVals.length;
    const peak = Math.max(...combinedVals);
    const totalEquip = combined.size;

    $('avgHours').textContent = formatHours(avg);
    $('peakLoad').textContent = formatHours(peak);
    $('totalEquip').textContent = `${formatInt(totalEquip)} Units`;

    // Heights: keep aligned with your axis padding
    const wrapH = wrap.clientHeight || 256;
    const axisPadTop = 6;
    const axisPadBottom = 48;
    const plotH = Math.max(10, wrapH - axisPadTop - axisPadBottom);

    // Render grouped bars
    for (const [eq] of sortedEquip) {
      const group = document.createElement('div');
      group.setAttribute('data-bar', '1');
      group.className = 'flex-1 self-stretch relative flex flex-col justify-end items-center min-w-0';

      const m = byEq.get(eq) || new Map();
      const barsRow = document.createElement('div');
      barsRow.className = 'w-full flex items-end justify-center gap-1';

      for (const fid of fileIds) {
        const v = m.get(fid) || 0;
        const h = (v <= 0) ? 0 : Math.max(3, (v / maxV) * plotH);

        const bw = document.createElement('div');
        bw.className = 'relative flex-1 group';
        bw.innerHTML = `
          <div class="w-full rounded-lg opacity-90" style="height:${h}px; background:${fileInfo[fid].color};"></div>

          <div class="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block pointer-events-none
                      bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-700
                      rounded-lg shadow-sm px-2 py-1 text-[11px] font-semibold whitespace-nowrap">
            ${escapeHtml(eq)} • ${escapeHtml(fileInfo[fid].label)} : ${formatHours(v)}
          </div>
        `;
        barsRow.appendChild(bw);
      }

      const label = document.createElement('div');
      label.className =
        'absolute -bottom-7 left-1/2 -translate-x-1/2 w-full px-1 text-[10px] font-bold text-slate-500 dark:text-slate-400 text-center leading-tight truncate';
      label.title = eq;
      label.textContent = eq;
      group.appendChild(barsRow);
      group.appendChild(label);
      wrap.appendChild(group);
    }
  }
  // -----------------------------
  // Donut: Day vs Night hours
  // -----------------------------
  function renderPie(_rowsIgnored) {
    const svg = $('pieSvg');
    const legend = $('pieProjectsLegend');

    // scope + Project Name/Type (tous kinds : output_planning + hours_report)
    const fileIds = getEffectiveFileIds();

    if (!svg || !fileIds.length) {
      // reset UI
      if (legend) legend.innerHTML = '';
      $('totalHours').textContent = '0h';
      $('nightPct').textContent = `0% Corrective`;
      $('dayPct').textContent = `0% Preventive`;
      $('nightHours').textContent = '0h';
      $('dayHours').textContent = '0h';
      $('nightCount').textContent = `0 projects`;
      $('dayCount').textContent = `0 projects`;
      svg.innerHTML = '';
      return;
    }

    // Palette projets (si + de 9 projets, on génère des HSL)
    const palette = ['#137fec', '#14b8a6', '#a855f7', '#f59e0b', '#ef4444', '#22c55e', '#06b6d4', '#f97316', '#64748b'];
    const colorForIndex = (i) => {
      if (i < palette.length) return palette[i];
      const hue = (i * 47) % 360;
      return `hsl(${hue},70%,45%)`;
    };

    // Source = Synthesis (déjà scope-aware via __fileid)
    const synAll = scopedRows(state.synthesisRows || []);
    const hrAll = scopedRows(state.hoursReportRows || []);

    function sumCol(rows, col) {
      return rows.reduce((s, r) => s + toNumber(r[col]), 0);
    }

    function computeFromHoursReport(fid) {
      const rows = hrAll.filter(r => r.__fileid === fid);

      if (!rows.length) return { preventive: 0, corrective: 0 };

      // on filtre par subsystem si sélectionné et si la colonne existe
      const keys = Object.keys(rows[0] || {});
      const subCol = keys.includes('subsystem') ? 'subsystem' : null;
      const filtered = (!shouldFilterBySubsystem() || !subCol)
        ? rows
        : rows.filter(r => subsystemMatchesSelection(r[subCol]));

      const cols = Object.keys(filtered[0] || {});

      // Colonnes possibles (normalisées)
      const prevCol = pickCol(cols, [
        'total_preventive_duration',
        'preventive_hours',
        'total_preventive_hours',
        'preventive_duration'
      ]);

      const paliCol = pickCol(cols, [
        'paliative_hours_corrective',
        'palliative_hours_corrective',
        'paliative_hours',
        'palliative_hours'
      ]);

      const replCol = pickCol(cols, [
        'yearly_total_hours_corrective',
        'replacement_hours_corrective',
        'corrective_replacement_hours'
      ]);

      const corrCol = pickCol(cols, [
        'corrective_hours',
        'total_corrective_duration',
        'total_corrective_hours',
        'corrective_duration'
      ]);

      const preventive = prevCol ? sumCol(filtered, prevCol) : 0;

      let corrective = 0;
      if (paliCol || replCol) {
        corrective = (paliCol ? sumCol(filtered, paliCol) : 0) + (replCol ? sumCol(filtered, replCol) : 0);
      } else if (corrCol) {
        corrective = sumCol(filtered, corrCol);
      }

      return { preventive, corrective };
    }

    // calc totals par projet
    function computePreventiveFromHoursReport(projectKey) {
      // colonne "Hours Worked" => normalizeKey => hours_worked
      let total = 0;
      for (const r of state.hoursReportRows) {
        const fid = r.__fileid;
        if (getProjectKeyForFileId(fid) !== projectKey) continue;

        const sub = String(r.subsystem ?? "").trim();
        if (shouldFilterBySubsystem() && sub && !subsystemMatchesSelection(sub)) continue;

        total += toNumber(r.hours_worked);
      }
      return total;
    }

    function computeCorrectiveFromSynthesis(projectKey) {
      // par subsystem : corrective = max(paliative) + max(yearly_total)
      const bySub = new Map(); // sub -> {pali, yearly}

      for (const r of state.synthesisRows) {
        const fid = r.__fileid;
        if (getProjectKeyForFileId(fid) !== projectKey) continue;

        const sub = String(r.subsystem ?? "").trim();
        if (!sub) continue;
        if (shouldFilterBySubsystem() && !subsystemMatchesSelection(sub)) continue;

        const pali = toNumber(r.paliative_hours_corrective);
        const yearly = toNumber(r.yearly_total_hours_corrective);

        if (!bySub.has(sub)) bySub.set(sub, { pali: 0, yearly: 0 });
        const o = bySub.get(sub);
        o.pali = Math.max(o.pali, pali);
        o.yearly = Math.max(o.yearly, yearly);
      }

      let total = 0;
      for (const o of bySub.values()) total += (o.pali + o.yearly);
      return total;
    }

    // Build dataset
    const projectKeys = getSelectedProjectKeys();
    if (!projectKeys.length) {
      svg.innerHTML = "";
      if (legend) legend.innerHTML = "";
      $('totalHours').textContent = '0h';
      $('nightPct').textContent = `0% Corrective`;
      $('dayPct').textContent = `0% Preventive`;
      $('nightHours').textContent = '0h';
      $('dayHours').textContent = '0h';
      $('nightCount').textContent = `0 projects`;
      $('dayCount').textContent = `0 projects`;
      return;
    }
    // limite anneaux
    const MAX_RINGS = 5;
    const ringKeys = projectKeys.slice(0, MAX_RINGS);
    const otherKeys = projectKeys.slice(MAX_RINGS);

    const dataset = [];
    ringKeys.forEach((pk, i) => {
      // label : on prend le 1er fichier connu de ce projet
      const someFileId = getFileIdsForProjectKey(pk)[0];
      const meta = state.fileMeta[someFileId] || {};
      const label = meta.label || meta.name || pk;

      const preventive = computePreventiveFromHoursReport(pk);     // ✅ hours_report
      const corrective = computeCorrectiveFromSynthesis(pk);       // ✅ synthesis

      dataset.push({
        id: pk,
        label,
        color: colorForIndex(i),
        preventive,
        corrective
      });
    });

    // Others
    if (otherKeys.length) {
      let preventive = 0, corrective = 0;
      for (const pk of otherKeys) {
        preventive += computePreventiveFromHoursReport(pk);
        corrective += computeCorrectiveFromSynthesis(pk);
      }
      dataset.push({
        id: '__others__',
        label: `Others (${otherKeys.length})`,
        color: '#64748b',
        preventive,
        corrective
      });
    }

    // Global totals (for center text + percentages)
    const totalPrev = dataset.reduce((s, d) => s + d.preventive, 0);
    const totalCorr = dataset.reduce((s, d) => s + d.corrective, 0);
    const total = totalPrev + totalCorr;

    const pctCorr = total > 0 ? totalCorr / total : 0;
    const pctPrev = total > 0 ? totalPrev / total : 0;

    $('totalHours').textContent = total ? formatHours(total) : '0h';
    $('nightPct').textContent = `${Math.round(pctCorr * 100)}% Corrective`;
    $('dayPct').textContent = `${Math.round(pctPrev * 100)}% Preventive`;
    $('nightHours').textContent = formatHours(totalCorr);
    $('dayHours').textContent = formatHours(totalPrev);
    $('nightCount').textContent = `${projectKeys.length} projects`;
    $('dayCount').textContent = `${projectKeys.length} projects`;

    // Legend projects
    if (legend) {
      legend.innerHTML = `
        <div class="flex items-center gap-2 mr-3">
          <span class="inline-block size-2.5 rounded-full" style="background:#111827; opacity:.85"></span>
          <span>Corrective (solid)</span>
        </div>
        <div class="flex items-center gap-2 mr-6">
          <span class="inline-block size-2.5 rounded-full" style="background:#111827; opacity:.25"></span>
          <span>Preventive (light)</span>
        </div>
        ${dataset.map(d => `
          <div class="flex items-center gap-2">
            <span class="inline-block size-2.5 rounded-full" style="background:${d.color};"></span>
            <span class="max-w-[180px] truncate" title="${escapeHtml(d.label)}">${escapeHtml(d.label)}</span>
          </div>
        `).join('')}
      `;
    }

    // Draw multi-ring donut (one ring per project)
    // SVG viewBox 0..64, center = 32
    const cx = 32, cy = 32;
    const ringW = 4;   // stroke width
    const gap = 1.2;   // gap between rings
    const outerR = 28; // fits within 64x64 with stroke

    let html = '';
    dataset.forEach((d, idx) => {
      const r = outerR - idx * (ringW + gap);
      if (r <= ringW) return; // safety

      const C = 2 * Math.PI * r;
      const ringTotal = d.preventive + d.corrective;
      const fracCorr = ringTotal > 0 ? d.corrective / ringTotal : 0;
      const dash = fracCorr * C;

      // background (preventive = light)
      html += `
        <circle cx="${cx}" cy="${cy}" r="${r}"
          fill="transparent"
          stroke="${d.color}"
          stroke-opacity="0.25"
          stroke-width="${ringW}" />
      `;

      // overlay (corrective = solid)
      html += `
        <circle cx="${cx}" cy="${cy}" r="${r}"
          fill="transparent"
          stroke="${d.color}"
          stroke-opacity="1"
          stroke-width="${ringW}"
          stroke-dasharray="${dash.toFixed(2)} ${(C - dash).toFixed(2)}" />
      `;
    });

    svg.innerHTML = html;
  }

  function renderSynthesisTable() {
    const body = $('synthesisTableBody');
    const note = $('synthesisNote');
    if (!body) return;

    // On ne prend que les lignes Synthesis des fichiers output_planning (hours_report ne doit pas impacter)
    const rows = scopedRows(state.synthesisRows || []);

    if (!rows.length) {
      if (note) note.textContent = 'Upload an Output Planning file to populate this table.';
      body.innerHTML = `<tr><td class="py-3 text-slate-500 dark:text-slate-400" colspan="9">No data yet.</td></tr>`;
      return;
    }

    // --- Déduplication par fichier/projet pour éviter de compter 2 fois
    // Preventive: clé = fileId|subsystem|shift  (max HC + max duration)
    const prevByFileSubShift = new Map(); // key -> { hc, dur }
    // Corrective: clé = fileId|subsystem (max paliative + max replacement)
    const corrByFileSub = new Map(); // key -> { pali, repl }

    for (const r of rows) {
      const type = String(r.type ?? "").trim().toLowerCase();
      const fid = r.__fileid || "";
      const sub = String(r.subsystem ?? "").trim();
      if (!sub) continue;
      if (shouldFilterBySubsystem() && !subsystemMatchesSelection(sub)) continue;

      if (type === "preventive") {
        const shift = String(r.shift ?? "").trim().toLowerCase(); // day/night
        const key = `${fid}|${sub}|${shift}`;

        const dur = toNumber(r.total_preventive_duration);
        const hc =
          shift === "day"
            ? toNumber(r.day_technicians_optimized)
            : toNumber(r.night_technicians_optimized);

        const prev = prevByFileSubShift.get(key) || { hc: 0, dur: 0 };
        prev.hc = Math.max(prev.hc, hc);
        prev.dur = Math.max(prev.dur, dur);
        prevByFileSubShift.set(key, prev);
      }

      // ✅ Corrective: ne pas filtrer sur type, car ces colonnes peuvent être sur d'autres lignes
      {
        const key = `${fid}|${sub}`;

        const pali = toNumber(r.paliative_hours_corrective ?? r.palliative_hours_corrective);
        const repl = toNumber(r.yearly_total_hours_corrective);

        const prev = corrByFileSub.get(key) || { pali: 0, repl: 0 };
        prev.pali = Math.max(prev.pali, pali);
        prev.repl = Math.max(prev.repl, repl);
        corrByFileSub.set(key, prev);
      }
    }

    // --- Agrégation finale par subsystem (on somme entre projets/fichiers)
    const map = new Map(); // sub -> { dayOpt, nightOpt, prevDay, prevNight, corrPali, corrRepl }

    // Preventive aggregation
    for (const [key, v] of prevByFileSubShift.entries()) {
      const parts = key.split("|");
      const sub = parts[1];
      const shift = (parts[2] || "").toLowerCase();

      if (!map.has(sub)) {
        map.set(sub, { dayOpt: 0, nightOpt: 0, prevDay: 0, prevNight: 0, corrPali: 0, corrRepl: 0 });
      }
      const o = map.get(sub);

      if (shift === "day") {
        o.dayOpt += v.hc;
        o.prevDay += v.dur;
      } else if (shift === "night") {
        o.nightOpt += v.hc;
        o.prevNight += v.dur;
      }
    }

    // Corrective aggregation
    for (const [key, v] of corrByFileSub.entries()) {
      const parts = key.split("|");
      const sub = parts[1];

      if (!map.has(sub)) {
        map.set(sub, { dayOpt: 0, nightOpt: 0, prevDay: 0, prevNight: 0, corrPali: 0, corrRepl: 0 });
      }
      const o = map.get(sub);
      o.corrPali += v.pali;
      o.corrRepl += v.repl;
    }

    const subs = Array.from(map.keys()).sort((a, b) => a.localeCompare(b));

    if (note) note.textContent = `Source: Synthesis • Preventive + Corrective • Rows: ${formatInt(rows.length)}`;

    if (!subs.length) {
      body.innerHTML = `<tr><td class="py-3 text-slate-500 dark:text-slate-400" colspan="9">No rows found for this filter/scope.</td></tr>`;
      return;
    }

    body.innerHTML = '';
    for (const sub of subs) {
      const o = map.get(sub);

      const prevTotal = (o.prevDay || 0) + (o.prevNight || 0);
      const corrTotal = (o.corrPali || 0) + (o.corrRepl || 0);

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="py-3 pr-4 font-semibold text-slate-700 dark:text-slate-200">${escapeHtml(sub)}</td>

        <td class="py-3 px-2 text-right">${formatInt(o.dayOpt)}</td>
        <td class="py-3 px-2 text-right">${formatInt(o.nightOpt)}</td>

        <td class="py-3 px-2 text-right">${formatHours(o.prevDay)}</td>
        <td class="py-3 px-2 text-right">${formatHours(o.prevNight)}</td>
        <td class="py-3 px-2 text-right font-semibold">${formatHours(prevTotal)}</td>

        <td class="py-3 px-2 text-right">${formatHours(o.corrPali)}</td>
        <td class="py-3 px-2 text-right">${formatHours(o.corrRepl)}</td>
        <td class="py-3 pl-2 text-right font-semibold">${formatHours(corrTotal)}</td>
      `;
      body.appendChild(tr);
    }
  }
  
  // -----------------------------
  // Line chart hover (crosshair + tooltip)
  // -----------------------------
  function setupLineHover() {
    if (state._lineHoverSetup) return;
    state._lineHoverSetup = true;

    const svg = $('lineSvg');
    const outer = $('lineChartOuter');
    const tooltip = $('lineTooltip');
    const hoverLine = $('hoverLine');
    const hoverDots = $('hoverDots');

    if (!svg || !outer || !tooltip || !hoverLine || !hoverDots) return;

    const ttDate = $('ttDate');
    const ttProjects = $('ttProjects');

    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

    const fmtDate = (iso) => {
      try {
        const d = new Date(String(iso).slice(0, 10) + 'T00:00:00');
        return new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }).format(d);
      } catch (e) {
        return String(iso);
      }
    };

    const show = () => {
      tooltip.classList.remove('hidden');
      hoverLine.setAttribute('opacity', '1');
    };

    const hide = () => {
      tooltip.classList.add('hidden');
      hoverLine.setAttribute('opacity', '0');
      hoverDots.innerHTML = '';
    };

    const update = (ev) => {
      const l = state._line;
      if (!l || !l.series || !l.series.dates || !l.series.dates.length || !l.projectSeries || !l.projectSeries.length) {
        hide();
        return;
      }

      const n = l.series.dates.length;
      const rect = svg.getBoundingClientRect();
      const xPx = clamp(ev.clientX - rect.left, 0, rect.width);
      const ratio = rect.width ? xPx / rect.width : 0;
      const t = ratio * (n - 1);
      const i0 = clamp(Math.floor(t), 0, n - 1);
      const i1 = clamp(i0 + 1, 0, n - 1);
      const a = n <= 1 ? 0 : (t - i0);
      const idx = clamp(Math.round(t), 0, n - 1);
      const xSvg = ratio * 1000;

      const projectValues = l.projectSeries
        .map((project) => {
          const day = (1 - a) * (project.dayValues[i0] || 0) + a * (project.dayValues[i1] || 0);
          const night = (1 - a) * (project.nightValues[i0] || 0) + a * (project.nightValues[i1] || 0);
          const yDay = 20 + (1 - day / l.maxV) * 240;
          const yNight = 20 + (1 - night / l.maxV) * 240;
          return {
            label: project.label,
            color: project.color,
            day,
            night,
            total: day + night,
            yDay,
            yNight,
          };
        })
        .sort((a, b) => b.total - a.total);

      hoverLine.setAttribute('x1', String(xSvg));
      hoverLine.setAttribute('x2', String(xSvg));
      hoverDots.innerHTML = projectValues
        .filter((project) => project.day > 0 || project.night > 0)
        .map((project) => `
          ${project.night > 0 ? `<circle cx="${xSvg.toFixed(1)}" cy="${project.yNight.toFixed(1)}" r="4.5" fill="${project.color}" stroke="#ffffff" stroke-width="1.5"></circle>` : ''}
          ${project.day > 0 ? `<circle cx="${xSvg.toFixed(1)}" cy="${project.yDay.toFixed(1)}" r="4.5" fill="#ffffff" stroke="${project.color}" stroke-width="2"></circle>` : ''}
        `)
        .join('');

      if (ttDate) ttDate.textContent = fmtDate(l.series.dates[idx]);
      if (ttProjects) {
        ttProjects.innerHTML = projectValues.map((project) => `
          <div class="flex items-center justify-between gap-3">
            <div class="flex min-w-0 items-center gap-2">
              <span class="inline-block size-2.5 rounded-full shrink-0" style="background:${project.color};"></span>
              <span class="truncate text-slate-600 dark:text-slate-300" title="${escapeHtml(project.label)}">${escapeHtml(project.label)}</span>
            </div>
            <div class="flex shrink-0 items-center gap-3 text-[10px]">
              <span class="font-semibold text-slate-700 dark:text-slate-200">N ${formatInt(project.night)}</span>
              <span class="font-semibold text-slate-500 dark:text-slate-300">D ${formatInt(project.day)}</span>
            </div>
          </div>
        `).join('');
      }

      show();

      const outerRect = outer.getBoundingClientRect();
      let left = (ev.clientX - outerRect.left) + 12;
      const top = 12;

      const tipRect = tooltip.getBoundingClientRect();
      left = clamp(left, 8, outerRect.width - tipRect.width - 8);

      tooltip.style.left = `${left}px`;
      tooltip.style.top = `${top}px`;
    };

    svg.addEventListener('pointerenter', update);
    svg.addEventListener('pointermove', update);
    svg.addEventListener('pointerleave', hide);
  }

  function setupDurationHover() {
    if (state._durationHoverSetup) return;
    state._durationHoverSetup = true;

    const svg = $('durationLineSvg');
    const outer = $('durationLineChartOuter');
    const tooltip = $('durationLineTooltip');
    const hoverLine = $('durationHoverLine');
    const hoverDots = $('durationHoverDots');

    if (!svg || !outer || !tooltip || !hoverLine || !hoverDots) return;

    const ttDate = $('durationTtDate');
    const ttProjects = $('durationTtProjects');
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

    const fmtDate = (iso) => {
      try {
        const d = new Date(String(iso).slice(0, 10) + 'T00:00:00');
        return new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }).format(d);
      } catch (e) {
        return String(iso);
      }
    };

    const show = () => {
      tooltip.classList.remove('hidden');
      hoverLine.setAttribute('opacity', '1');
    };

    const hide = () => {
      tooltip.classList.add('hidden');
      hoverLine.setAttribute('opacity', '0');
      hoverDots.innerHTML = '';
    };

    const update = (ev) => {
      const l = state._durationLine;
      if (!l || !l.series || !l.series.dates || !l.series.dates.length || !l.projectSeries || !l.projectSeries.length) {
        hide();
        return;
      }

      const n = l.series.dates.length;
      const rect = svg.getBoundingClientRect();
      const xPx = clamp(ev.clientX - rect.left, 0, rect.width);
      const ratio = rect.width ? xPx / rect.width : 0;
      const t = ratio * (n - 1);
      const i0 = clamp(Math.floor(t), 0, n - 1);
      const i1 = clamp(i0 + 1, 0, n - 1);
      const a = n <= 1 ? 0 : (t - i0);
      const idx = clamp(Math.round(t), 0, n - 1);
      const xSvg = ratio * 1000;

      const projectValues = l.projectSeries
        .map((project) => {
          const day = (1 - a) * (project.dayValues[i0] || 0) + a * (project.dayValues[i1] || 0);
          const night = (1 - a) * (project.nightValues[i0] || 0) + a * (project.nightValues[i1] || 0);
          const yDay = 20 + (1 - day / l.maxV) * 240;
          const yNight = 20 + (1 - night / l.maxV) * 240;
          return {
            label: project.label,
            color: project.color,
            day,
            night,
            total: day + night,
            yDay,
            yNight,
          };
        })
        .sort((a, b) => b.total - a.total);

      hoverLine.setAttribute('x1', String(xSvg));
      hoverLine.setAttribute('x2', String(xSvg));
      hoverDots.innerHTML = projectValues
        .filter((project) => project.day > 0 || project.night > 0)
        .map((project) => `
          ${project.night > 0 ? `<circle cx="${xSvg.toFixed(1)}" cy="${project.yNight.toFixed(1)}" r="4.5" fill="${project.color}" stroke="#ffffff" stroke-width="1.5"></circle>` : ''}
          ${project.day > 0 ? `<circle cx="${xSvg.toFixed(1)}" cy="${project.yDay.toFixed(1)}" r="4.5" fill="#ffffff" stroke="${project.color}" stroke-width="2"></circle>` : ''}
        `)
        .join('');

      if (ttDate) ttDate.textContent = fmtDate(l.series.dates[idx]);
      if (ttProjects) {
        ttProjects.innerHTML = projectValues.map((project) => `
          <div class="flex items-center justify-between gap-3">
            <div class="flex min-w-0 items-center gap-2">
              <span class="inline-block size-2.5 rounded-full shrink-0" style="background:${project.color};"></span>
              <span class="truncate text-slate-600 dark:text-slate-300" title="${escapeHtml(project.label)}">${escapeHtml(project.label)}</span>
            </div>
            <div class="flex shrink-0 items-center gap-3 text-[10px]">
              <span class="font-semibold text-slate-700 dark:text-slate-200">N ${formatHours(project.night)}</span>
              <span class="font-semibold text-slate-500 dark:text-slate-300">D ${formatHours(project.day)}</span>
            </div>
          </div>
        `).join('');
      }

      show();

      const outerRect = outer.getBoundingClientRect();
      let left = (ev.clientX - outerRect.left) + 12;
      const top = 12;

      const tipRect = tooltip.getBoundingClientRect();
      left = clamp(left, 8, outerRect.width - tipRect.width - 8);

      tooltip.style.left = `${left}px`;
      tooltip.style.top = `${top}px`;
    };

    svg.addEventListener('pointerenter', update);
    svg.addEventListener('pointermove', update);
    svg.addEventListener('pointerleave', hide);
  }

  function setupBarsNavigator() {
    if (state._barsNavSetup) return;
    state._barsNavSetup = true;

    const navRange = $('barsNavRange');
    if (!navRange) return;

    navRange.addEventListener('input', (e) => {
      state.barsOffset = Number(e.target.value || 0);
      scheduleRender();
    });
  }

  function loadStoredExchangeState() {
    const live = readStoredJson(LIVE_RATE_STORAGE_KEY);
    if (live?.rates && typeof live.rates === "object") {
      state.exchangeRates = live.rates;
      state.exchangeLastUpdated = String(live.lastUpdated || "");
      state.exchangeProvider = String(live.provider || "");
      state.exchangeBase = normalizeCurrencyCode(live.base) || "USD";
    }
    const manual = readStoredJson(MANUAL_RATE_STORAGE_KEY);
    if (manual && typeof manual === "object") {
      state.manualExchangeRates = Object.fromEntries(
        Object.entries(manual)
          .map(([code, value]) => [normalizeCurrencyCode(code), Number(value)])
          .filter(([code, value]) => code && Number.isFinite(value) && value > 0)
      );
    }
    queueSharedSettingsSync();
  }

  function persistManualExchangeRates() {
    writeStoredJson(MANUAL_RATE_STORAGE_KEY, state.manualExchangeRates || {});
    queueSharedSettingsSync();
  }

  function setMaterialsStatus(title, text) {
    const titleEl = $('materialsRateStatusTitle');
    const textEl = $('materialsRateStatusText');
    if (titleEl) titleEl.textContent = title;
    if (textEl) textEl.textContent = text;
  }

  async function refreshExchangeRates({ silent = false } = {}) {
    if (state._exchangeRefreshPromise) return state._exchangeRefreshPromise;
    if (!silent) setMaterialsStatus("Refreshing rates", "Fetching latest online exchange rates...");
    state._exchangeRefreshPromise = (async () => {
    try {
      const res = await fetch("https://open.er-api.com/v6/latest/USD", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data?.result !== "success" || !data?.rates) throw new Error("Unexpected exchange rate payload");

      state.exchangeRates = data.rates;
      state.exchangeLastUpdated = String(data.time_last_update_utc || "");
      state.exchangeProvider = String(data.provider || "https://www.exchangerate-api.com");
      state.exchangeBase = normalizeCurrencyCode(data.base_code) || "USD";
      writeStoredJson(LIVE_RATE_STORAGE_KEY, {
        rates: state.exchangeRates,
        lastUpdated: state.exchangeLastUpdated,
        provider: state.exchangeProvider,
        base: state.exchangeBase,
      });
      queueSharedSettingsSync();
      renderMaterialsDashboard();
      renderOverhaulDashboard();
      renderSubcontractingDashboard();
      renderBenchmarkDashboard();
      return true;
    } catch (err) {
      console.error("Failed to refresh exchange rates", err);
      if (!Object.keys(state.exchangeRates || {}).length) {
        setMaterialsStatus("Rates unavailable", "Live exchange rates could not be loaded. Add manual overrides to enable conversions.");
      }
      renderMaterialsDashboard();
      renderOverhaulDashboard();
      renderSubcontractingDashboard();
      renderBenchmarkDashboard();
      return false;
    }
    })();
    try {
      return await state._exchangeRefreshPromise;
    } finally {
      state._exchangeRefreshPromise = null;
    }
  }

  function clearManualExchangeRates() {
    state.manualExchangeRates = {};
    persistManualExchangeRates();
    renderMaterialsDashboard();
    renderOverhaulDashboard();
    renderSubcontractingDashboard();
    renderBenchmarkDashboard();
  }

  function setManualExchangeRate(currency, value) {
    const code = normalizeCurrencyCode(currency);
    const rate = Number(value);
    if (!code) return;
    if (!Number.isFinite(rate) || rate <= 0) delete state.manualExchangeRates[code];
    else state.manualExchangeRates[code] = rate;
    persistManualExchangeRates();
    renderMaterialsDashboard();
    renderOverhaulDashboard();
    renderSubcontractingDashboard();
    renderBenchmarkDashboard();
  }

  function getMaterialsProjectLabel(row) {
    const meta = state.fileMeta?.[row?.__fileid] || {};
    const gp = meta?.gp || {};
    const gpProject = String(gp.project_name ?? gp.project ?? "").trim();
    if (gpProject) return gpProject;
    const label = String(meta.label ?? "").trim();
    if (label) return label;
    return "Unspecified project";
  }

  function initMaterialsView() {
    const view = $('view-materials');
    if (!view || view.dataset.ready === "1") return;
    view.dataset.ready = "1";
    view.innerHTML = `
      <section class="pt-8 space-y-6">
        <div class="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-5">
          <div class="flex flex-col 2xl:flex-row 2xl:items-start justify-between gap-6">
            <div class="space-y-2 max-w-3xl">
              <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-bold uppercase tracking-[0.18em]">
                <span class="material-symbols-outlined text-[16px]">paid</span>
                Corrective Planning
              </div>
              <div>
                <h2 class="text-3xl font-black tracking-tight">Material Cost Dashboard</h2>
                <p class="text-sm text-slate-500 dark:text-slate-400 mt-2">
                  Annual cost evolution, equipment cost distribution, and source mix with live multi-currency conversion.
                </p>
              </div>
            </div>

            <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex flex-wrap gap-6 items-center 2xl:max-w-[58%]">
              <div class="flex items-center gap-3">
                <div class="bg-primary opacity-10 text-primary p-2 rounded-lg">
                  <span class="material-symbols-outlined text-[20px]">location_on</span>
                </div>
                <div>
                  <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Project Name</p>
                  <p class="text-sm font-bold" id="materialsProjectName">Riyadh Metro</p>
                </div>
              </div>

              <div class="w-px h-8 bg-slate-100 dark:bg-slate-800 hidden md:block"></div>
              <div>
                <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Project Type</p>
                <p class="text-sm font-bold" id="materialsProjectType">Metro / APM</p>
              </div>

              <div class="w-px h-8 bg-slate-100 dark:bg-slate-800 hidden md:block"></div>
              <div>
                <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Line Length</p>
                <p class="text-sm font-bold" id="materialsLineLength">176.5 Km <span class="text-[10px] font-normal text-slate-400">STK</span></p>
              </div>

              <div class="w-px h-8 bg-slate-100 dark:bg-slate-800 hidden md:block"></div>
              <div>
                <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Bid / Service Year</p>
                <p class="text-sm font-bold" id="materialsServiceYear">2018 / 2024</p>
              </div>

              <div class="w-px h-8 bg-slate-100 dark:bg-slate-800 hidden md:block"></div>
              <div>
                <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Contract Duration</p>
                <p class="text-sm font-bold" id="materialsContractDuration">--</p>
              </div>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 min-w-0">
            <label class="space-y-1.5">
              <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Currency</span>
              <select id="materialsCurrencyFilter" class="w-full text-sm rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5"><option value="USD">USD</option></select>
            </label>
            <div id="materialsYearWrap" class="space-y-1.5 relative">
              <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Year</span>
              <button id="materialsYearBtn" type="button" class="w-full inline-flex items-center justify-between gap-3 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                <span id="materialsYearSummary" class="truncate text-left">All years</span>
                <span class="material-symbols-outlined text-[18px] text-slate-500 dark:text-slate-400">expand_more</span>
              </button>
              <div id="materialsYearPanel" class="hidden absolute left-0 top-full mt-2 w-full min-w-[240px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-30">
                <div class="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                  <div>
                    <p class="text-xs font-bold uppercase tracking-wider text-slate-400">Year</p>
                    <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Select one or many years for the Materials view.</p>
                  </div>
                  <button id="materialsYearCloseBtn" class="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800" type="button">
                    <span class="material-symbols-outlined text-[18px]">close</span>
                  </button>
                </div>
                <div id="materialsYearList" class="p-3 max-h-[240px] overflow-y-auto custom-scrollbar">
                  <div class="p-3 rounded-lg border border-dashed border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-sm">
                    No year available yet.
                  </div>
                </div>
                <div class="p-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                  <button id="materialsYearAllBtn" class="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700" type="button">All</button>
                  <button id="materialsYearClearBtn" class="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700" type="button">Clear</button>
                </div>
              </div>
            </div>
            <label class="space-y-1.5">
              <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Equipment</span>
              <select id="materialsEquipmentFilter" class="w-full text-sm rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5"><option value="__ALL__">All equipment</option></select>
            </label>
            <label class="space-y-1.5">
              <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Element</span>
              <select id="materialsElementFilter" class="w-full text-sm rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5"><option value="__ALL__">All elements</option></select>
            </label>
          </div>

          <div class="mt-5 grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-4 items-start">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/70 p-4 min-h-[164px] flex flex-col">
                <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Replacement Cost Estimated</p>
                <p class="mt-2 text-3xl font-black" id="materialsTotalEstimatedKpi">0</p>
                <p id="materialsTotalEstimatedKpiHidden" class="hidden mt-2 text-xs text-slate-500 dark:text-slate-400">Project split only</p>
                <div id="materialsTotalEstimatedProjectList" class="mt-3 space-y-2 overflow-y-auto custom-scrollbar max-h-[92px]">
                  <p class="text-sm text-slate-500 dark:text-slate-400">No estimated amounts available.</p>
                </div>
                <p class="mt-2 text-xs text-slate-500 dark:text-slate-400 mt-auto">Aggregated in the selected target currency.</p>
              </div>
              <div class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/70 p-4 min-h-[164px] flex flex-col">
                <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Reparable Cost Estimated</p>
                <p class="mt-2 text-3xl font-black" id="materialsReparableEstimatedKpi">0</p>
                <p id="materialsReparableEstimatedKpiHidden" class="hidden mt-2 text-xs text-slate-500 dark:text-slate-400">Project split only</p>
                <div id="materialsReparableEstimatedProjectList" class="mt-3 space-y-2 overflow-y-auto custom-scrollbar max-h-[92px]">
                  <p class="text-sm text-slate-500 dark:text-slate-400">No estimated amounts available.</p>
                </div>
                <p class="mt-2 text-xs text-slate-500 dark:text-slate-400 mt-auto">Aggregated in the selected target currency.</p>
              </div>
              <div class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/70 p-4 min-h-[164px] flex flex-col">
                <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Estimated Total by Currency</p>
                <div id="materialsEstimatedByCurrencyList" class="mt-3 space-y-2 overflow-y-auto custom-scrollbar max-h-[126px]">
                  <p class="text-sm text-slate-500 dark:text-slate-400">No estimated amounts available.</p>
                </div>
              </div>
            </div>

            <div class="space-y-4">
              <div class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/70 p-4 space-y-3">
                <div class="flex flex-wrap items-center gap-2 justify-between">
                  <div>
                    <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Exchange Rates</p>
                    <p class="text-xs text-slate-500 dark:text-slate-400 mt-1" id="materialsRatesMeta">1 USD = x currency</p>
                  </div>
                  <div class="flex items-center gap-2">
                    <button id="materialsRefreshRatesBtn" type="button" class="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl bg-slate-900 text-white border border-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:border-white dark:hover:bg-slate-100 transition-all">
                      <span class="material-symbols-outlined text-[16px] leading-none">refresh</span>
                      <span>Refresh live rates</span>
                    </button>
                    <button id="materialsResetOverridesBtn" type="button" class="px-3 py-2 text-xs font-semibold rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">Reset manual</button>
                  </div>
                </div>
                <p class="text-[11px] text-slate-500 dark:text-slate-400">
                  Live rates are refreshed from the internet. Every row in the conversion table can be adjusted manually.
                </p>
              </div>
              <div class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/70 p-4 flex flex-col gap-3 min-h-[124px]">
                <div>
                  <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Display</p>
                  <p class="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Project Sum on KPI cards</p>
                  <p class="mt-1 text-[11px] text-slate-500 dark:text-slate-400">Show or hide the aggregated total on Replacement Cost Estimated and Reparable Cost Estimated.</p>
                </div>
                <label class="inline-flex items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 cursor-pointer">
                  <span class="text-xs font-semibold text-slate-600 dark:text-slate-300">Show total</span>
                  <input id="materialsKpiTotalToggle" type="checkbox" class="rounded border-slate-300 dark:border-slate-600 text-primary" checked>
                </label>
              </div>
            </div>
          </div>
        </div>

        <div id="materialsLineCard" class="bg-white dark:bg-slate-900/60 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div class="flex flex-col xl:flex-row xl:items-end justify-between gap-4 mb-6">
            <div>
              <h3 class="text-lg font-bold">Replacement Cost vs Reparable Cost by Year</h3>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-1" id="materialsLineSubtitle"></p>
            </div>
            <div id="materialsLineLegend" class="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400"></div>
          </div>
          <div class="relative" style="height: 360px;">
            <div class="absolute left-0 top-0 bottom-10 flex flex-col justify-between pr-3 text-[11px] font-bold text-slate-400" style="width:84px;" id="materialsLineYAxis"><span>0</span><span>0</span><span>0</span><span>0</span></div>
            <div class="h-full" style="margin-left:84px;">
              <svg id="materialsLineSvg" class="w-full h-[320px]" viewBox="0 0 1000 320" preserveAspectRatio="none"></svg>
              <div id="materialsLineYears" class="mt-2 grid gap-2 text-[11px] font-semibold text-slate-400"></div>
            </div>
            <div id="materialsLineEmpty" class="hidden absolute inset-0 flex items-center justify-center text-sm text-slate-500 dark:text-slate-400">No Corrective Planning cost data in scope.</div>
            <div id="materialsLineTooltip" class="pointer-events-none absolute z-10 hidden" style="min-width:220px;">
              <div class="bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm px-3 py-2">
                <div id="materialsTtYear" class="text-[11px] font-semibold text-slate-700 dark:text-slate-200"></div>
                <div id="materialsTtValues" class="mt-2 space-y-1 text-[11px]"></div>
              </div>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 2xl:grid-cols-[minmax(0,1.2fr)_420px] gap-6">
          <div id="materialsBarsCard" class="relative bg-white dark:bg-slate-900/60 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div class="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-6">
              <div>
                <h3 class="text-lg font-bold">Estimated Costs by Equipment</h3>
                <p class="text-xs text-slate-500 dark:text-slate-400 mt-1" id="materialsBarsSubtitle"></p>
              </div>
              <div id="materialsBarsLegend" class="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400"></div>
            </div>
            <div id="materialsBarsPlot" class="space-y-4 min-h-[320px]"></div>
            <div id="materialsBarsEmpty" class="hidden min-h-[320px] flex items-center justify-center text-sm text-slate-500 dark:text-slate-400">No estimated equipment costs available for the selected filters.</div>
            <div id="materialsBarsTooltip" class="pointer-events-none absolute z-10 hidden" style="min-width:260px;">
              <div class="bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm px-3 py-2">
                <div id="materialsBarsTooltipTitle" class="text-[11px] font-semibold text-slate-700 dark:text-slate-200"></div>
                <div id="materialsBarsTooltipValue" class="mt-1 text-[11px] text-slate-500 dark:text-slate-300"></div>
                <div id="materialsBarsTooltipSubsystems" class="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700 text-[10px] text-slate-500 dark:text-slate-300"></div>
                <div id="materialsBarsTooltipProjects" class="mt-2 space-y-1 text-[11px]"></div>
              </div>
            </div>
          </div>

          <div id="materialsPieCard" class="bg-white dark:bg-slate-900/60 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
            <div>
              <h3 class="text-lg font-bold">Source Share of Estimated Costs</h3>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-1" id="materialsPieSubtitle"></p>
            </div>
            <div class="flex-1 flex flex-col items-center justify-center py-6">
              <div class="relative size-64">
                <svg id="materialsPieSvg" class="size-full -rotate-90" viewBox="0 0 64 64"></svg>
                <div class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center px-8">
                  <span class="text-3xl font-black leading-none" id="materialsPieCenterValue">0</span>
                  <span class="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 mt-2">Estimated Total</span>
                </div>
              </div>
              <div id="materialsPieLegend" class="mt-6 w-full space-y-3"></div>
              <div id="materialsPieEmpty" class="hidden py-12 text-sm text-slate-500 dark:text-slate-400">No source mix available for the selected filters.</div>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 2xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)] gap-6">
          <div id="materialsRatesCard" class="bg-white dark:bg-slate-900/60 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div class="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-4">
              <div>
                <h3 class="text-lg font-bold">Conversion Table</h3>
                <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Internal conversion basis: <span class="font-semibold">1 USD = X Currency</span>. Manual overrides take precedence over live rates.</p>
              </div>
              <div class="flex items-center gap-2">
                <div class="text-xs text-slate-500 dark:text-slate-400" id="materialsRatesSourceText">Live source pending</div>
                <button
                  id="materialsRefreshRatesInlineBtn"
                  type="button"
                  class="inline-flex items-center justify-center size-9 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                  title="Refresh conversion table from live source"
                  aria-label="Refresh conversion table from live source">
                  <span class="material-symbols-outlined text-[18px] text-slate-600 dark:text-slate-300">refresh</span>
                </button>
              </div>
            </div>
            <div class="overflow-x-auto">
              <table class="min-w-full text-sm">
                <thead class="text-[10px] uppercase tracking-wider text-slate-400">
                  <tr class="border-b border-slate-100 dark:border-slate-800">
                    <th class="text-left py-3 pr-4">Currency</th>
                    <th class="text-left py-3 px-4">Live rate</th>
                    <th class="text-left py-3 px-4">Manual override</th>
                    <th class="text-left py-3 px-4">Effective rate</th>
                    <th class="text-left py-3 pl-4">Source</th>
                  </tr>
                </thead>
                <tbody id="materialsRatesTableBody" class="divide-y divide-slate-100 dark:divide-slate-800"></tbody>
              </table>
            </div>
          </div>

          <div id="materialsSubsystemCard" class="bg-white dark:bg-slate-900/60 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div class="flex flex-col gap-1 mb-4">
              <h3 class="text-lg font-bold">Estimated Costs by Subsystem</h3>
              <p class="text-xs text-slate-500 dark:text-slate-400" id="materialsSubsystemNote">
                Replacement Cost Estimated and Reparable Cost Estimated in the selected target currency.
              </p>
            </div>
            <div class="overflow-x-auto">
              <table class="min-w-full text-sm">
                <thead class="text-[10px] uppercase tracking-wider text-slate-400">
                  <tr class="border-b border-slate-100 dark:border-slate-800">
                    <th class="text-left py-3 pr-4">Subsystem</th>
                    <th class="text-right py-3 px-4">Replacement Cost Estimated</th>
                    <th class="text-right py-3 px-4">Reparable Cost Estimated</th>
                    <th class="text-right py-3 pl-4">Total Cost Estimated</th>
                  </tr>
                </thead>
                <tbody id="materialsSubsystemTableBody" class="divide-y divide-slate-100 dark:divide-slate-800">
                  <tr>
                    <td colspan="4" class="py-6 text-center text-sm text-slate-500 dark:text-slate-400">No subsystem cost data available.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>
    `;

    const schemaHint = $('schemaHint');
    if (schemaHint) {
      schemaHint.textContent =
        'Expected Output Planning workbook: "Planning Complet", "Technicians Needed Per Day", "Synthesis", and for the Materials view "Corrective Planning" and "DEQ_VMI_Planning".';
    }

    loadStoredExchangeState();

    $('materialsCurrencyFilter')?.addEventListener('change', (e) => {
      state.currentMaterialCurrency = e.target.value;
      queueSharedSettingsSync();
      renderMaterialsDashboard();
    });
    $('materialsEquipmentFilter')?.addEventListener('change', (e) => {
      state.currentMaterialEquipment = e.target.value;
      rebuildMaterialsFilters();
      renderMaterialsDashboard();
    });
    $('materialsElementFilter')?.addEventListener('change', (e) => {
      state.currentMaterialElement = e.target.value;
      rebuildMaterialsFilters();
      renderMaterialsDashboard();
    });
    $('materialsRefreshRatesBtn')?.addEventListener('click', async () => {
      await refreshExchangeRates();
    });
    $('materialsRefreshRatesInlineBtn')?.addEventListener('click', async () => {
      await refreshExchangeRates();
    });
    $('materialsResetOverridesBtn')?.addEventListener('click', () => {
      clearManualExchangeRates();
    });
    $('materialsKpiTotalToggle')?.addEventListener('change', (e) => {
      state.showMaterialsKpiTotal = !!e.target.checked;
      renderMaterialsDashboard();
    });
    const materialsYearWrap = $('materialsYearWrap');
    const materialsYearPanel = $('materialsYearPanel');
    $('materialsYearBtn')?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      materialsYearPanel?.classList.toggle('hidden');
      rebuildMaterialsFilters();
    });
    $('materialsYearCloseBtn')?.addEventListener('click', () => materialsYearPanel?.classList.add('hidden'));
    $('materialsYearAllBtn')?.addEventListener('click', () => {
      state.currentMaterialYear = "__ALL__";
      rebuildMaterialsFilters();
      renderMaterialsDashboard();
    });
    $('materialsYearClearBtn')?.addEventListener('click', () => {
      state.currentMaterialYear = "__ALL__";
      rebuildMaterialsFilters();
      renderMaterialsDashboard();
    });
    document.addEventListener('click', (e) => {
      if (materialsYearWrap && !materialsYearWrap.contains(e.target)) materialsYearPanel?.classList.add('hidden');
    });

    rebuildMaterialsFilters();
    renderMaterialsDashboard();
    refreshExchangeRates({ silent: true });
  }

  function renderMaterialsDashboard() {
    if (!$('view-materials') || $('view-materials')?.dataset.ready !== "1") return;

    rebuildMaterialsFilters();

    const rows = getFilteredCorrectiveRows();
    const totalEstimatedKpi = $('materialsTotalEstimatedKpi');
    const reparableEstimatedKpi = $('materialsReparableEstimatedKpi');
    const totalEstimatedKpiHidden = $('materialsTotalEstimatedKpiHidden');
    const reparableEstimatedKpiHidden = $('materialsReparableEstimatedKpiHidden');
    const totalEstimatedProjectList = $('materialsTotalEstimatedProjectList');
    const reparableEstimatedProjectList = $('materialsReparableEstimatedProjectList');
    const materialsKpiTotalToggle = $('materialsKpiTotalToggle');
    const cols = state.materialsColumns;
    let totalEstimated = 0;
    let reparableEstimated = 0;
    const totalEstimatedByProject = new Map();
    const reparableEstimatedByProject = new Map();
    const estimatedByCurrencyByProject = new Map();

    rows.forEach((row) => {
      const project = getMaterialsProjectLabel(row);
      const currency = cols.currency ? row?.[cols.currency] : "";
      const totalRaw = cols.totalCostEstimated ? toNumber(row?.[cols.totalCostEstimated]) : 0;
      const reparableRaw = cols.reparableCostEstimated ? toNumber(row?.[cols.reparableCostEstimated]) : 0;
      const total = cols.totalCostEstimated ? convertAmount(totalRaw, currency, state.currentMaterialCurrency) : null;
      const reparable = cols.reparableCostEstimated ? convertAmount(reparableRaw, currency, state.currentMaterialCurrency) : null;
      totalEstimated += total ?? 0;
      reparableEstimated += reparable ?? 0;
      totalEstimatedByProject.set(project, (totalEstimatedByProject.get(project) || 0) + (total ?? 0));
      reparableEstimatedByProject.set(project, (reparableEstimatedByProject.get(project) || 0) + (reparable ?? 0));
      const code = normalizeCurrencyCode(currency) || "N/A";
      if (!estimatedByCurrencyByProject.has(project)) estimatedByCurrencyByProject.set(project, new Map());
      const projectCurrencies = estimatedByCurrencyByProject.get(project);
      projectCurrencies.set(code, (projectCurrencies.get(code) || 0) + totalRaw + reparableRaw);
    });

    if (materialsKpiTotalToggle) materialsKpiTotalToggle.checked = !!state.showMaterialsKpiTotal;
    if (totalEstimatedKpi) {
      totalEstimatedKpi.textContent = formatCurrencyValue(totalEstimated, state.currentMaterialCurrency, 0);
      totalEstimatedKpi.classList.toggle('hidden', !state.showMaterialsKpiTotal);
    }
    if (reparableEstimatedKpi) {
      reparableEstimatedKpi.textContent = formatCurrencyValue(reparableEstimated, state.currentMaterialCurrency, 0);
      reparableEstimatedKpi.classList.toggle('hidden', !state.showMaterialsKpiTotal);
    }
    if (totalEstimatedKpiHidden) totalEstimatedKpiHidden.classList.toggle('hidden', !!state.showMaterialsKpiTotal);
    if (reparableEstimatedKpiHidden) reparableEstimatedKpiHidden.classList.toggle('hidden', !!state.showMaterialsKpiTotal);
    if (totalEstimatedProjectList) {
      const items = Array.from(totalEstimatedByProject.entries())
        .filter(([, value]) => value !== 0)
        .sort((a, b) => b[1] - a[1]);
      const projectColorMap = new Map(items.map(([project], index) => [project, colorForSeriesIndex(index)]));
      totalEstimatedProjectList.innerHTML = items.length
        ? items.map(([project, value]) => `
            <div class="flex items-center justify-between gap-3">
              <div class="flex items-center gap-2 min-w-0">
                <span class="inline-block size-2.5 rounded-full shrink-0" style="background:${projectColorMap.get(project)};"></span>
                <span class="text-xs font-bold uppercase tracking-wider text-slate-400 truncate" title="${escapeHtml(project)}">${escapeHtml(project)}</span>
              </div>
              <span class="text-sm font-semibold text-slate-700 dark:text-slate-100">${escapeHtml(formatCurrencyValue(value, state.currentMaterialCurrency, 0))}</span>
            </div>
          `).join("")
        : `<p class="text-sm text-slate-500 dark:text-slate-400">No estimated amounts available.</p>`;
    }
    if (reparableEstimatedProjectList) {
      const items = Array.from(reparableEstimatedByProject.entries())
        .filter(([, value]) => value !== 0)
        .sort((a, b) => b[1] - a[1]);
      const projectColorMap = new Map(items.map(([project], index) => [project, colorForSeriesIndex(index)]));
      reparableEstimatedProjectList.innerHTML = items.length
        ? items.map(([project, value]) => `
            <div class="flex items-center justify-between gap-3">
              <div class="flex items-center gap-2 min-w-0">
                <span class="inline-block size-2.5 rounded-full shrink-0" style="background:${projectColorMap.get(project)};"></span>
                <span class="text-xs font-bold uppercase tracking-wider text-slate-400 truncate" title="${escapeHtml(project)}">${escapeHtml(project)}</span>
              </div>
              <span class="text-sm font-semibold text-slate-700 dark:text-slate-100">${escapeHtml(formatCurrencyValue(value, state.currentMaterialCurrency, 0))}</span>
            </div>
          `).join("")
        : `<p class="text-sm text-slate-500 dark:text-slate-400">No estimated amounts available.</p>`;
    }

    const estimatedByCurrencyList = $('materialsEstimatedByCurrencyList');
    if (estimatedByCurrencyList) {
      const items = Array.from(estimatedByCurrencyByProject.entries())
        .map(([project, currencies]) => ({
          project,
          currencies: Array.from(currencies.entries())
            .filter(([, value]) => value !== 0)
            .sort((a, b) => b[1] - a[1]),
        }))
        .filter((item) => item.currencies.length)
        .sort((a, b) => {
          const aTotal = a.currencies.reduce((sum, [, value]) => sum + value, 0);
          const bTotal = b.currencies.reduce((sum, [, value]) => sum + value, 0);
          return bTotal - aTotal;
        });
      const projectColorMap = new Map(items.map((item, index) => [item.project, colorForSeriesIndex(index)]));
      estimatedByCurrencyList.innerHTML = items.length
        ? items.map((item) => `
            <div class="space-y-1.5">
              <div class="flex items-center gap-2 min-w-0">
                <span class="inline-block size-2.5 rounded-full shrink-0" style="background:${projectColorMap.get(item.project)};"></span>
                <div class="text-xs font-bold uppercase tracking-wider text-slate-400 truncate" title="${escapeHtml(item.project)}">${escapeHtml(item.project)}</div>
              </div>
              ${item.currencies.map(([currency, value]) => `
                <div class="flex items-center justify-between gap-3 pl-3">
                  <span class="text-[11px] text-slate-500 dark:text-slate-400 uppercase">${escapeHtml(currency)}</span>
                  <span class="text-sm font-semibold text-slate-700 dark:text-slate-100">${escapeHtml(formatAmountWithCurrency(value, currency, 0))}</span>
                </div>
              `).join("")}
            </div>
          `).join("")
        : `<p class="text-sm text-slate-500 dark:text-slate-400">No estimated amounts available.</p>`;
    }

    const lastUpdated = state.exchangeLastUpdated ? new Date(state.exchangeLastUpdated).toLocaleString("en-GB") : "";

    const meta = $('materialsRatesMeta');
    if (meta) meta.textContent = `Base ${state.exchangeBase} - 1 ${state.exchangeBase} = X currency`;
    const sourceText = $('materialsRatesSourceText');
    if (sourceText) {
      sourceText.innerHTML = state.exchangeProvider
        ? `Live source: <a class="text-primary underline underline-offset-2" href="https://www.exchangerate-api.com" target="_blank" rel="noreferrer">Rates By Exchange Rate API</a>${state.exchangeLastUpdated ? ` - updated ${escapeHtml(lastUpdated)}` : ""}`
        : "Live source pending";
    }

    renderMaterialsLineChart();
    renderMaterialsBarsChart();
    renderMaterialsPieChart();
    renderMaterialsRatesTable();
    renderMaterialsSubsystemTable();
  }

  function renderMaterialsLineChart() {
    const svg = $('materialsLineSvg');
    const yearsWrap = $('materialsLineYears');
    const yAxis = $('materialsLineYAxis');
    const empty = $('materialsLineEmpty');
    const subtitle = $('materialsLineSubtitle');
    const legend = $('materialsLineLegend');
    if (!svg || !yearsWrap || !yAxis || !empty || !subtitle || !legend) return;

    const rows = getFilteredCorrectiveRows({ includeYear: false });
    const cols = state.materialsColumns;
    const byProject = new Map();
    let skipped = 0;

    rows.forEach((row) => {
      const year = getMaterialYearValue(row);
      if (!year) return;
      const fid = row?.__fileid;
      const pk = getProjectKeyForFileId(fid) || fid || '__unknown__';
      if (!byProject.has(pk)) {
        const candidateIds = pk ? getFileIdsForProjectKey(pk) : [fid];
        const refId = candidateIds[0] || fid;
        const meta = state.fileMeta[refId] || state.fileMeta[fid] || {};
        byProject.set(pk, {
          key: pk,
          label: meta.label || meta.name || pk,
          byYear: new Map(),
        });
      }
      const currency = cols.currency ? row?.[cols.currency] : "";
      const totalRaw = cols.totalCost ? toNumber(row?.[cols.totalCost]) : 0;
      const reparableRaw = cols.reparableCost ? toNumber(row?.[cols.reparableCost]) : 0;
      const total = cols.totalCost ? convertAmount(totalRaw, currency, state.currentMaterialCurrency) : null;
      const reparable = cols.reparableCost ? convertAmount(reparableRaw, currency, state.currentMaterialCurrency) : null;
      if ((totalRaw && total === null) || (reparableRaw && reparable === null)) skipped += 1;
      const bucket = byProject.get(pk).byYear.get(year) || { total: 0, reparable: 0 };
      bucket.total += total ?? 0;
      bucket.reparable += reparable ?? 0;
      byProject.get(pk).byYear.set(year, bucket);
    });

    const years = sortDimensionValues(
      Array.from(byProject.values()).flatMap((project) => Array.from(project.byYear.keys()))
    );
    const projects = Array.from(byProject.values())
      .sort((a, b) => a.label.localeCompare(b.label))
      .map((project, index) => ({
        key: project.key,
        label: project.label,
        color: colorForSeriesIndex(index),
        dataset: years.map((year) => ({
          year,
          total: project.byYear.get(year)?.total || 0,
          reparable: project.byYear.get(year)?.reparable || 0,
        })),
      }))
      .filter((project) => project.dataset.some((item) => item.total > 0 || item.reparable > 0));

    const totalsByYear = years.map((year) => projects.reduce((sum, project) => sum + (project.dataset.find((item) => item.year === year)?.total || 0), 0));
    const reparablesByYear = years.map((year) => projects.reduce((sum, project) => sum + (project.dataset.find((item) => item.year === year)?.reparable || 0), 0));
    subtitle.textContent = `Source: Corrective Planning - project curves - currency ${state.currentMaterialCurrency}${skipped ? ` - ${skipped} row(s) skipped because a conversion rate is missing` : ""}`;

    legend.innerHTML = `
      <div class="flex items-center gap-2"><span class="inline-block size-2.5 rounded-full bg-slate-700 dark:bg-slate-200"></span><span>1 color = 1 project</span></div>
      <div class="flex items-center gap-2"><span class="inline-block h-0.5 w-5 rounded-full bg-slate-700 dark:bg-slate-200"></span><span>Replacement Cost = solid</span></div>
      <div class="flex items-center gap-2"><span class="inline-block h-0.5 w-5 border-t-2 border-dashed border-slate-500 dark:border-slate-300"></span><span>Reparable Cost = dashed</span></div>
      ${projects.map((project) => `
        <div class="flex items-center gap-2">
          <span class="inline-block size-2.5 rounded-full" style="background:${project.color};"></span>
          <span class="max-w-[180px] truncate" title="${escapeHtml(project.label)}">${escapeHtml(project.label)}</span>
        </div>
      `).join("")}
    `;

    if (!years.length || !projects.length || (totalsByYear.every((v) => v === 0) && reparablesByYear.every((v) => v === 0))) {
      state._materialsLine = null;
      svg.innerHTML = "";
      yearsWrap.innerHTML = "";
      yearsWrap.style.gridTemplateColumns = "none";
      yAxis.innerHTML = `<span>0</span><span>0</span><span>0</span><span>0</span>`;
      $('materialsLineTooltip')?.classList.add('hidden');
      empty.classList.remove('hidden');
      return;
    }

    empty.classList.add('hidden');
    const maxV = Math.max(
      1,
      ...projects.flatMap((project) => project.dataset.flatMap((item) => [item.total, item.reparable]))
    );
    const ticks = [maxV, maxV * (2 / 3), maxV * (1 / 3), 0];
    yAxis.innerHTML = ticks.map((tick) => `<span>${escapeHtml(`${formatCompactNumber(tick)} ${state.currentMaterialCurrency}`)}</span>`).join("");

    const yFor = (v) => 20 + (1 - (v / maxV)) * 240;
    const n = years.length;
    const pointsFor = (datasetValues, key) => datasetValues.map((item, index) => ({
      x: n === 1 ? 500 : index * (1000 / (n - 1)),
      y: yFor(item[key]),
    }));
    const projectSeries = projects.map((project) => ({
      ...project,
      totalPoints: pointsFor(project.dataset, "total"),
      reparablePoints: pointsFor(project.dataset, "reparable"),
    }));
    state._materialsLine = { years, projectSeries, maxV };

    svg.innerHTML = `
      <g opacity="0.55">
        ${ticks.map((tick, idx) => `<line x1="0" y1="${yFor(tick).toFixed(1)}" x2="1000" y2="${yFor(tick).toFixed(1)}" stroke="#cbd5e1" stroke-width="1" ${idx === 0 || idx === ticks.length - 1 ? "" : 'stroke-dasharray="4,6"'}></line>`).join("")}
      </g>
      ${projectSeries.map((project) => `
        <path d="${toSmoothPath(project.totalPoints)}" fill="none" stroke="${project.color}" stroke-width="3.25" stroke-linecap="round" stroke-linejoin="round"></path>
        <path d="${toSmoothPath(project.reparablePoints)}" fill="none" stroke="${project.color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="8,6" opacity="0.95"></path>
        ${project.totalPoints.map((point) => `<circle cx="${point.x.toFixed(1)}" cy="${point.y.toFixed(1)}" r="4" fill="${project.color}" stroke="#fff" stroke-width="2"></circle>`).join("")}
        ${project.reparablePoints.map((point) => `<circle cx="${point.x.toFixed(1)}" cy="${point.y.toFixed(1)}" r="4" fill="#fff" stroke="${project.color}" stroke-width="2"></circle>`).join("")}
      `).join("")}
      <line id="materialsHoverLine" x1="0" y1="20" x2="0" y2="260" stroke="#94a3b8" stroke-width="1" stroke-dasharray="4,4" opacity="0"></line>
      <g id="materialsHoverDots"></g>
    `;

    yearsWrap.style.gridTemplateColumns = `repeat(${years.length}, minmax(0, 1fr))`;
    yearsWrap.innerHTML = years.map((year) => `<div class="text-center">${escapeHtml(year)}</div>`).join("");
    setupMaterialsLineHover();
  }

  function renderMaterialsBarsChart() {
    const plot = $('materialsBarsPlot');
    const empty = $('materialsBarsEmpty');
    const subtitle = $('materialsBarsSubtitle');
    const legend = $('materialsBarsLegend');
    const card = $('materialsBarsCard');
    const tooltip = $('materialsBarsTooltip');
    const tooltipTitle = $('materialsBarsTooltipTitle');
    const tooltipValue = $('materialsBarsTooltipValue');
    const tooltipSubsystems = $('materialsBarsTooltipSubsystems');
    const tooltipProjects = $('materialsBarsTooltipProjects');
    if (!plot || !empty || !subtitle || !legend) return;

    legend.innerHTML = `
      <div class="flex items-center gap-2"><span class="inline-block size-2.5 rounded-full" style="background:${MATERIAL_SERIES_COLORS.totalEstimated};"></span><span>Replacement Cost Estimated</span></div>
      <div class="flex items-center gap-2"><span class="inline-block size-2.5 rounded-full" style="background:${MATERIAL_SERIES_COLORS.reparableEstimated};"></span><span>Reparable Cost Estimated</span></div>
    `;

    const rows = getFilteredCorrectiveRows();
    const cols = state.materialsColumns;
    const eqCol = cols.equipment;
    const map = new Map();
    const projectTotals = new Map();

    rows.forEach((row) => {
      const equipment = eqCol ? (String(row?.[eqCol] ?? "").trim() || "Unspecified") : "Unspecified";
      const currency = cols.currency ? row?.[cols.currency] : "";
      const totalEst = cols.totalCostEstimated ? convertAmount(toNumber(row?.[cols.totalCostEstimated]), currency, state.currentMaterialCurrency) : null;
      const reparableEst = cols.reparableCostEstimated ? convertAmount(toNumber(row?.[cols.reparableCostEstimated]), currency, state.currentMaterialCurrency) : null;
      const project = getMaterialsProjectLabel(row);
      const subsystem = cols.subsystem ? (String(row?.[cols.subsystem] ?? "").trim() || "Unspecified") : "Unspecified";
      const bucket = map.get(equipment) || {
        label: equipment,
        totalEstimated: 0,
        reparableEstimated: 0,
        details: {
          totalEstimated: { total: 0, projects: new Map(), subsystems: new Set() },
          reparableEstimated: { total: 0, projects: new Map(), subsystems: new Set() },
        },
      };
      bucket.totalEstimated += totalEst ?? 0;
      bucket.reparableEstimated += reparableEst ?? 0;
      if ((totalEst ?? 0) > 0) {
        bucket.details.totalEstimated.total += totalEst ?? 0;
        bucket.details.totalEstimated.projects.set(project, (bucket.details.totalEstimated.projects.get(project) || 0) + (totalEst ?? 0));
        bucket.details.totalEstimated.subsystems.add(subsystem);
        projectTotals.set(project, (projectTotals.get(project) || 0) + (totalEst ?? 0));
      }
      if ((reparableEst ?? 0) > 0) {
        bucket.details.reparableEstimated.total += reparableEst ?? 0;
        bucket.details.reparableEstimated.projects.set(project, (bucket.details.reparableEstimated.projects.get(project) || 0) + (reparableEst ?? 0));
        bucket.details.reparableEstimated.subsystems.add(subsystem);
        projectTotals.set(project, (projectTotals.get(project) || 0) + (reparableEst ?? 0));
      }
      map.set(equipment, bucket);
    });

    const items = Array.from(map.values())
      .filter((item) => item.totalEstimated > 0 || item.reparableEstimated > 0)
      .sort((a, b) => (b.totalEstimated + b.reparableEstimated) - (a.totalEstimated + a.reparableEstimated))
      .slice(0, 12);
    const projectColorMap = new Map(
      Array.from(projectTotals.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([project], index) => [project, colorForSeriesIndex(index)])
    );

    subtitle.textContent = `Selected year: ${formatMultiSelectSummary(state.currentMaterialYear, "year")} - currency ${state.currentMaterialCurrency}`;

    if (!items.length) {
      plot.innerHTML = "";
      empty.classList.remove('hidden');
      tooltip?.classList.add('hidden');
      return;
    }

    empty.classList.add('hidden');
    const maxV = Math.max(1, ...items.flatMap((item) => [item.totalEstimated, item.reparableEstimated]));
    const tooltipData = new Map();
    plot.innerHTML = items.map((item, index) => {
      const replacementKey = `materials-bars-${index}-replacement`;
      const reparableKey = `materials-bars-${index}-reparable`;
      tooltipData.set(replacementKey, {
        equipment: item.label,
        type: "Replacement Cost Estimated",
        value: item.totalEstimated,
        detail: item.details.totalEstimated,
      });
      tooltipData.set(reparableKey, {
        equipment: item.label,
        type: "Reparable Cost Estimated",
        value: item.reparableEstimated,
        detail: item.details.reparableEstimated,
      });
      return `
      <div class="grid gap-3 items-start" style="grid-template-columns:minmax(140px,180px) minmax(0,1fr);">
        <div class="pt-1">
          <p class="text-xs font-semibold text-slate-700 dark:text-slate-200">${escapeHtml(item.label)}</p>
        </div>
        <div class="space-y-2">
          <div class="relative h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden cursor-pointer" data-materials-bars-key="${replacementKey}">
            <div class="absolute inset-y-0 left-0 rounded-full" style="width:${item.totalEstimated > 0 ? Math.max(2, (item.totalEstimated / maxV) * 100) : 0}%; background:${MATERIAL_SERIES_COLORS.totalEstimated};"></div>
          </div>
          <div class="relative h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden cursor-pointer" data-materials-bars-key="${reparableKey}">
            <div class="absolute inset-y-0 left-0 rounded-full" style="width:${item.reparableEstimated > 0 ? Math.max(2, (item.reparableEstimated / maxV) * 100) : 0}%; background:${MATERIAL_SERIES_COLORS.reparableEstimated};"></div>
          </div>
          <div class="flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-500 dark:text-slate-400">
            <span>Replacement: ${escapeHtml(formatCurrencyValue(item.totalEstimated, state.currentMaterialCurrency, 0))}</span>
            <span>Reparable: ${escapeHtml(formatCurrencyValue(item.reparableEstimated, state.currentMaterialCurrency, 0))}</span>
          </div>
        </div>
      </div>
    `;
    }).join("");

    if (!card || !tooltip || !tooltipTitle || !tooltipValue || !tooltipSubsystems || !tooltipProjects) return;
    tooltip.classList.add('hidden');

    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const hideTooltip = () => tooltip.classList.add('hidden');
    const updateTooltip = (event, key) => {
      const entry = tooltipData.get(key);
      if (!entry || entry.value <= 0) return;

      tooltipTitle.textContent = `${entry.equipment} - ${entry.type}`;
      tooltipValue.textContent = formatCurrencyValue(entry.value, state.currentMaterialCurrency, 0);
      const subsystemList = Array.from(entry.detail.subsystems.values()).sort((a, b) => a.localeCompare(b));
      tooltipSubsystems.innerHTML = subsystemList.length
        ? `<div><span class="font-semibold text-slate-600 dark:text-slate-200">Subsystem${subsystemList.length > 1 ? "s" : ""}:</span> ${escapeHtml(subsystemList.join(", "))}</div>`
        : `<div>No subsystem data available.</div>`;

      const projects = Array.from(entry.detail.projects.entries())
        .filter(([, value]) => value > 0)
        .sort((a, b) => b[1] - a[1]);
      tooltipProjects.innerHTML = projects.length
        ? projects.map(([project, value]) => {
            const pct = entry.value > 0 ? (value / entry.value) * 100 : 0;
            const color = projectColorMap.get(project) || "#94a3b8";
            return `
              <div class="flex items-center justify-between gap-3">
                <div class="flex min-w-0 items-center gap-2">
                  <span class="inline-block size-2.5 rounded-full shrink-0" style="background:${color};"></span>
                  <span class="truncate text-slate-600 dark:text-slate-300" title="${escapeHtml(project)}">${escapeHtml(project)}</span>
                </div>
                <div class="shrink-0 text-right">
                  <div class="font-semibold text-slate-700 dark:text-slate-100">${pct.toFixed(1)}%</div>
                  <div class="text-[10px] text-slate-500 dark:text-slate-400">${escapeHtml(formatCurrencyValue(value, state.currentMaterialCurrency, 0))}</div>
                </div>
              </div>
            `;
          }).join("")
        : `<div class="text-[10px] text-slate-500 dark:text-slate-400">No project share available.</div>`;

      tooltip.classList.remove('hidden');
      const cardRect = card.getBoundingClientRect();
      const tipRect = tooltip.getBoundingClientRect();
      let left = (event.clientX - cardRect.left) + 12;
      let top = (event.clientY - cardRect.top) - tipRect.height - 10;
      left = clamp(left, 12, cardRect.width - tipRect.width - 12);
      top = clamp(top, 12, cardRect.height - tipRect.height - 12);
      tooltip.style.left = `${left}px`;
      tooltip.style.top = `${top}px`;
    };

    plot.querySelectorAll('[data-materials-bars-key]').forEach((bar) => {
      bar.addEventListener('pointerenter', (event) => updateTooltip(event, bar.getAttribute('data-materials-bars-key')));
      bar.addEventListener('pointermove', (event) => updateTooltip(event, bar.getAttribute('data-materials-bars-key')));
      bar.addEventListener('pointerleave', hideTooltip);
    });
  }

  function renderMaterialsPieChart() {
    const svg = $('materialsPieSvg');
    const legend = $('materialsPieLegend');
    const empty = $('materialsPieEmpty');
    const centerValue = $('materialsPieCenterValue');
    const subtitle = $('materialsPieSubtitle');
    if (!svg || !legend || !empty || !centerValue || !subtitle) return;

    const rows = getFilteredCorrectiveRows();
    const cols = state.materialsColumns;
    const map = new Map();

    rows.forEach((row) => {
      const source = cols.source ? (String(row?.[cols.source] ?? "").trim() || "Unspecified") : "Unspecified";
      const currency = cols.currency ? row?.[cols.currency] : "";
      const totalEst = cols.totalCostEstimated ? convertAmount(toNumber(row?.[cols.totalCostEstimated]), currency, state.currentMaterialCurrency) : null;
      const reparableEst = cols.reparableCostEstimated ? convertAmount(toNumber(row?.[cols.reparableCostEstimated]), currency, state.currentMaterialCurrency) : null;
      const value = (totalEst ?? 0) + (reparableEst ?? 0);
      if (value <= 0) return;
      map.set(source, (map.get(source) || 0) + value);
    });

    const items = Array.from(map.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);
    const total = items.reduce((sum, item) => sum + item.value, 0);
    subtitle.textContent = `Selected year: ${formatMultiSelectSummary(state.currentMaterialYear, "year")} - currency ${state.currentMaterialCurrency}`;
    centerValue.textContent = formatCurrencyValue(total, state.currentMaterialCurrency, 0);

    if (!items.length || total <= 0) {
      svg.innerHTML = "";
      legend.innerHTML = "";
      empty.classList.remove('hidden');
      return;
    }

    empty.classList.add('hidden');
    const radius = 24;
    const circumference = 2 * Math.PI * radius;
    let offset = 0;
    svg.innerHTML = `
      <circle cx="32" cy="32" r="${radius}" fill="none" stroke="#e2e8f0" stroke-width="10"></circle>
      ${items.map((item, index) => {
        const fraction = item.value / total;
        const dash = fraction * circumference;
        const stroke = MATERIAL_PIE_COLORS[index % MATERIAL_PIE_COLORS.length];
        const circle = `<circle cx="32" cy="32" r="${radius}" fill="none" stroke="${stroke}" stroke-width="10" stroke-dasharray="${dash} ${circumference - dash}" stroke-dashoffset="${-offset}"></circle>`;
        offset += dash;
        return circle;
      }).join("")}
    `;

    const itemsWithPct = items.map((item, index) => ({
      ...item,
      pct: total > 0 ? (item.value / total) * 100 : 0,
      color: MATERIAL_PIE_COLORS[index % MATERIAL_PIE_COLORS.length],
    }));
    let visibleItems = itemsWithPct.filter((item) => item.pct >= 3);
    let hiddenItems = itemsWithPct.filter((item) => item.pct < 3);

    if (!visibleItems.length && itemsWithPct.length) {
      visibleItems = [itemsWithPct[0]];
      hiddenItems = itemsWithPct.slice(1);
    }

    const displayedItems = state.showMaterialsPieMinorSources
      ? visibleItems.concat(hiddenItems)
      : visibleItems;

    legend.innerHTML = `
      ${displayedItems.map((item) => `
        <div class="flex items-center justify-between gap-3">
          <div class="flex items-center gap-3 min-w-0">
            <span class="inline-block size-3 rounded-full flex-shrink-0" style="background:${item.color};"></span>
            <span class="text-sm font-medium truncate">${escapeHtml(item.label)}</span>
          </div>
          <div class="text-right">
            <div class="text-sm font-semibold">${item.pct.toFixed(1)}%</div>
            <div class="text-[11px] text-slate-500 dark:text-slate-400">${escapeHtml(formatCurrencyValue(item.value, state.currentMaterialCurrency, 0))}</div>
          </div>
        </div>
      `).join("")}
      ${hiddenItems.length ? `
        <button
          id="materialsPieToggleMinorBtn"
          type="button"
          class="mt-2 inline-flex items-center gap-2 text-xs font-semibold text-primary hover:opacity-80 transition-opacity">
          <span class="material-symbols-outlined text-[16px] leading-none">${state.showMaterialsPieMinorSources ? "expand_less" : "expand_more"}</span>
          <span>${state.showMaterialsPieMinorSources ? "Hide" : "Show"} ${hiddenItems.length} source${hiddenItems.length > 1 ? "s" : ""} under 3%</span>
        </button>
      ` : ""}
    `;

    $('materialsPieToggleMinorBtn')?.addEventListener('click', () => {
      state.showMaterialsPieMinorSources = !state.showMaterialsPieMinorSources;
      renderMaterialsPieChart();
    });
  }

  function renderMaterialsRatesTable() {
    const tbody = $('materialsRatesTableBody');
    if (!tbody) return;

    const currencies = Array.from(new Set(
      []
        .concat(getCurrenciesInRows(getMaterialsBaseRows()))
        .concat(Object.keys(state.manualExchangeRates || {}))
        .concat([state.currentMaterialCurrency, state.exchangeBase])
        .filter(Boolean)
    )).sort((a, b) => a.localeCompare(b));

    if (!currencies.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
            Upload a sheet with Synthesis currency data. Corrective Planning / DEQ_VMI_Planning remain available as backup for benchmark costs.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = currencies.map((currency) => {
      const liveRate = currency === state.exchangeBase ? 1 : Number(state.exchangeRates?.[currency]);
      const manualRate = Number(state.manualExchangeRates?.[currency]);
      const effectiveRate = getEffectiveRate(currency);
      const source = Number.isFinite(manualRate) && manualRate > 0 ? "Manual" : (Number.isFinite(liveRate) && liveRate > 0 ? "Live" : "Missing");
      return `
        <tr>
          <td class="py-3 pr-4 font-semibold">${escapeHtml(currency)}</td>
          <td class="py-3 px-4 text-slate-500 dark:text-slate-400">${escapeHtml(formatRate(liveRate))}</td>
          <td class="py-3 px-4">
            <div class="flex items-center gap-2">
              <input
                type="number"
                min="0"
                step="0.000001"
                class="w-32 rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                data-rate-input="${escapeHtml(currency)}"
                value="${Number.isFinite(manualRate) && manualRate > 0 ? manualRate : ""}"
                placeholder="optional">
              <button
                type="button"
                class="px-2.5 py-2 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                data-rate-clear="${escapeHtml(currency)}">
                Clear
              </button>
            </div>
          </td>
          <td class="py-3 px-4 font-semibold">${escapeHtml(formatRate(effectiveRate))}</td>
          <td class="py-3 pl-4">
            <span class="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold ${source === "Manual" ? "bg-amber-50 text-amber-700 border border-amber-200" : source === "Live" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200"}">
              ${source}
            </span>
          </td>
        </tr>
      `;
    }).join("");

    tbody.querySelectorAll('input[data-rate-input]').forEach((input) => {
      input.addEventListener('change', (e) => {
        const currency = e.target.getAttribute('data-rate-input');
        setManualExchangeRate(currency, e.target.value);
      });
    });
    tbody.querySelectorAll('button[data-rate-clear]').forEach((button) => {
      button.addEventListener('click', () => {
        const currency = button.getAttribute('data-rate-clear');
        setManualExchangeRate(currency, "");
      });
    });
  }

  function renderMaterialsSubsystemTable() {
    const tbody = $('materialsSubsystemTableBody');
    const note = $('materialsSubsystemNote');
    if (!tbody || !note) return;

    note.textContent = `Replacement Cost Estimated and Reparable Cost Estimated in ${state.currentMaterialCurrency}.`;

    const rows = getFilteredCorrectiveRows();
    const cols = state.materialsColumns;
    const subCol = cols.subsystem;
    if (!subCol) {
      tbody.innerHTML = `
        <tr>
          <td colspan="4" class="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
            No subsystem column was found in Corrective Planning or DEQ_VMI_Planning.
          </td>
        </tr>
      `;
      return;
    }

    const map = new Map();
    rows.forEach((row) => {
      const subsystem = String(row?.[subCol] ?? "").trim() || "Unspecified";
      const currency = cols.currency ? row?.[cols.currency] : "";
      const total = cols.totalCostEstimated ? convertAmount(toNumber(row?.[cols.totalCostEstimated]), currency, state.currentMaterialCurrency) : null;
      const reparable = cols.reparableCostEstimated ? convertAmount(toNumber(row?.[cols.reparableCostEstimated]), currency, state.currentMaterialCurrency) : null;
      const bucket = map.get(subsystem) || { subsystem, total: 0, reparable: 0 };
      bucket.total += total ?? 0;
      bucket.reparable += reparable ?? 0;
      map.set(subsystem, bucket);
    });

    const items = Array.from(map.values())
      .filter((item) => item.total > 0 || item.reparable > 0)
      .sort((a, b) => (b.total + b.reparable) - (a.total + a.reparable));

    if (!items.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="4" class="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
            No subsystem cost data available for the selected filters.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = items.map((item) => `
      <tr>
        <td class="py-3 pr-4 font-semibold">${escapeHtml(item.subsystem)}</td>
        <td class="py-3 px-4 text-right font-medium">${escapeHtml(formatCurrencyValue(item.total, state.currentMaterialCurrency, 0))}</td>
        <td class="py-3 px-4 text-right font-medium">${escapeHtml(formatCurrencyValue(item.reparable, state.currentMaterialCurrency, 0))}</td>
        <td class="py-3 pl-4 text-right font-semibold">${escapeHtml(formatCurrencyValue(item.total + item.reparable, state.currentMaterialCurrency, 0))}</td>
      </tr>
    `).join("");
  }

  function normalizeOverhaulTypeCategory(value) {
    const raw = String(value ?? "").trim();
    if (!raw) return "Unspecified";
    if (/overhaul/i.test(raw)) return "Overhaul";
    if (/renewal/i.test(raw)) return "Renewal";
    return raw;
  }

  function getOverhaulProjectLabel(row) {
    const meta = state.fileMeta?.[row?.__fileid] || {};
    const gp = meta?.gp || {};
    const gpProject = String(gp.project_name ?? gp.project ?? "").trim();
    if (gpProject) return gpProject;
    const label = String(meta.label ?? "").trim();
    if (label) return label;
    return "Unspecified project";
  }

  function initOverhaulView() {
    const view = $('view-overhaul');
    if (!view || view.dataset.ready === "1") return;
    view.dataset.ready = "1";
    view.innerHTML = `
      <section class="pt-8 space-y-6">
        <div class="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-5">
          <div class="flex flex-col 2xl:flex-row 2xl:items-start justify-between gap-6">
            <div class="space-y-2 max-w-3xl">
              <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-50 text-cyan-700 border border-cyan-200 text-[11px] font-bold uppercase tracking-[0.18em]">
                <span class="material-symbols-outlined text-[16px]">build_circle</span>
                Overhaul and Renewal Planning
              </div>
              <div>
                <h2 class="text-3xl font-black tracking-tight">Overhaul &amp; Renewals Dashboard</h2>
                <p class="text-sm text-slate-500 dark:text-slate-400 mt-2">
                  Planning costs by year, equipment, subsystem and activity type with live multi-currency conversion.
                </p>
              </div>
            </div>

            <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex flex-wrap gap-6 items-center 2xl:max-w-[58%]">
              <div class="flex items-center gap-3">
                <div class="bg-primary opacity-10 text-primary p-2 rounded-lg">
                  <span class="material-symbols-outlined text-[20px]">location_on</span>
                </div>
                <div>
                  <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Project Name</p>
                  <p class="text-sm font-bold" id="overhaulProjectName">Riyadh Metro</p>
                </div>
              </div>
              <div class="w-px h-8 bg-slate-100 dark:bg-slate-800 hidden md:block"></div>
              <div>
                <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Project Type</p>
                <p class="text-sm font-bold" id="overhaulProjectType">Metro / APM</p>
              </div>
              <div class="w-px h-8 bg-slate-100 dark:bg-slate-800 hidden md:block"></div>
              <div>
                <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Line Length</p>
                <p class="text-sm font-bold" id="overhaulLineLength">176.5 Km <span class="text-[10px] font-normal text-slate-400">STK</span></p>
              </div>
              <div class="w-px h-8 bg-slate-100 dark:bg-slate-800 hidden md:block"></div>
              <div>
                <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Bid / Service Year</p>
                <p class="text-sm font-bold" id="overhaulServiceYear">2018 / 2024</p>
              </div>
              <div class="w-px h-8 bg-slate-100 dark:bg-slate-800 hidden md:block"></div>
              <div>
                <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Contract Duration</p>
                <p class="text-sm font-bold" id="overhaulContractDuration">--</p>
              </div>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3 min-w-0">
            <label class="space-y-1.5">
              <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Currency</span>
              <select id="overhaulCurrencyFilter" class="w-full text-sm rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5"><option value="USD">USD</option></select>
            </label>
            <div id="overhaulYearWrap" class="space-y-1.5 relative">
              <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Year</span>
              <button id="overhaulYearBtn" type="button" class="w-full inline-flex items-center justify-between gap-3 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                <span id="overhaulYearSummary" class="truncate text-left">All years</span>
                <span class="material-symbols-outlined text-[18px] text-slate-500 dark:text-slate-400">expand_more</span>
              </button>
              <div id="overhaulYearPanel" class="hidden absolute left-0 top-full mt-2 w-full min-w-[240px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-30">
                <div class="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                  <div>
                    <p class="text-xs font-bold uppercase tracking-wider text-slate-400">Year</p>
                    <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Select one or many planning years for Overhaul &amp; Renewals.</p>
                  </div>
                  <button id="overhaulYearCloseBtn" class="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800" type="button">
                    <span class="material-symbols-outlined text-[18px]">close</span>
                  </button>
                </div>
                <div id="overhaulYearList" class="p-3 max-h-[240px] overflow-y-auto custom-scrollbar">
                  <div class="p-3 rounded-lg border border-dashed border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-sm">
                    No year available yet.
                  </div>
                </div>
                <div class="p-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                  <button id="overhaulYearAllBtn" class="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700" type="button">All</button>
                  <button id="overhaulYearClearBtn" class="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700" type="button">Clear</button>
                </div>
              </div>
            </div>
            <label class="space-y-1.5">
              <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Equipment</span>
              <select id="overhaulEquipmentFilter" class="w-full text-sm rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5"><option value="__ALL__">All equipment</option></select>
            </label>
            <label class="space-y-1.5">
              <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Activity Type</span>
              <select id="overhaulTypeFilter" class="w-full text-sm rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5"><option value="__ALL__">All activity types</option></select>
            </label>
            <label class="space-y-1.5">
              <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Span Life</span>
              <select id="overhaulSpanLifeFilter" class="w-full text-sm rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5"><option value="__ALL__">All span life</option></select>
            </label>
          </div>

          <div class="mt-1 grid grid-cols-1 xl:grid-cols-4 gap-4">
            <div class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/70 p-4 h-full min-h-[164px] flex flex-col">
              <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Global Cost</p>
              <p class="mt-2 text-3xl font-black" id="overhaulGlobalCostKpi">0</p>
              <p id="overhaulGlobalCostKpiHidden" class="hidden mt-2 text-xs text-slate-500 dark:text-slate-400">Project split only</p>
              <div id="overhaulGlobalCostProjectList" class="mt-3 space-y-2 overflow-y-auto custom-scrollbar max-h-[92px]">
                <p class="text-sm text-slate-500 dark:text-slate-400">No global costs available.</p>
              </div>
              <p class="mt-2 text-xs text-slate-500 dark:text-slate-400 mt-auto">Aggregated in the selected target currency.</p>
            </div>
            <div class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/70 p-4 h-full min-h-[164px] flex flex-col">
              <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Global Cost by Source Currency</p>
              <div id="overhaulGlobalCostByCurrencyList" class="mt-3 space-y-2 overflow-y-auto custom-scrollbar max-h-[92px]">
                <p class="text-sm text-slate-500 dark:text-slate-400">No global costs available.</p>
              </div>
            </div>
            <div class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/70 p-4 space-y-3 h-full min-h-[164px]">
              <div class="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Exchange Rates</p>
                  <p class="mt-1 text-sm font-semibold" id="overhaulRatesMeta">Base USD - 1 USD = X currency</p>
                </div>
                <div class="flex items-center gap-2">
                  <button id="overhaulRefreshRatesBtn" type="button" class="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl bg-slate-900 text-white border border-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:border-white dark:hover:bg-slate-100 transition-all">
                    <span class="material-symbols-outlined text-[16px] leading-none">refresh</span>
                    <span>Refresh live rates</span>
                  </button>
                  <button id="overhaulResetOverridesBtn" type="button" class="px-3 py-2 text-xs font-semibold rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">Reset manual</button>
                </div>
              </div>
              <p class="text-[11px] text-slate-500 dark:text-slate-400">
                Live rates are refreshed from the internet. Every row in the conversion table can be adjusted manually.
              </p>
              <p class="text-xs text-slate-500 dark:text-slate-400" id="overhaulRatesSourceText">Live source pending</p>
            </div>
            <div class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/70 p-4 flex flex-col gap-3 min-h-[164px]">
              <div>
                <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Display</p>
                <p class="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Project Sum on KPI cards</p>
                <p class="mt-1 text-[11px] text-slate-500 dark:text-slate-400">Show or hide the aggregated total on Global Cost.</p>
              </div>
              <label class="inline-flex items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 cursor-pointer">
                <span class="text-xs font-semibold text-slate-600 dark:text-slate-300">Show total</span>
                <input id="overhaulKpiTotalToggle" type="checkbox" class="rounded border-slate-300 dark:border-slate-600 text-primary" checked>
              </label>
            </div>
          </div>
        </div>

        <div id="overhaulStackCard" class="bg-white dark:bg-slate-900/60 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div class="flex flex-col xl:flex-row xl:items-end justify-between gap-4 mb-6">
            <div>
              <h3 class="text-lg font-bold">Stacked Costs by Planning Year</h3>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-1" id="overhaulStackSubtitle"></p>
            </div>
            <div id="overhaulStackLegend" class="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400"></div>
          </div>
          <div class="relative" style="height: 360px;">
            <div class="absolute left-0 top-0 bottom-10 flex flex-col justify-between pr-3 text-[11px] font-bold text-slate-400" style="width:84px;" id="overhaulStackYAxis"><span>0</span><span>0</span><span>0</span><span>0</span></div>
            <div class="h-full" style="margin-left:84px;">
              <svg id="overhaulStackSvg" class="w-full h-[320px]" viewBox="0 0 1000 320" preserveAspectRatio="none"></svg>
              <div id="overhaulStackYears" class="mt-2 grid gap-2 text-[11px] font-semibold text-slate-400"></div>
            </div>
            <div id="overhaulStackEmpty" class="hidden absolute inset-0 flex items-center justify-center text-sm text-slate-500 dark:text-slate-400">No overhaul and renewal cost data in scope.</div>
            <div id="overhaulStackTooltip" class="pointer-events-none absolute z-10 hidden" style="min-width:220px;">
              <div class="bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm px-3 py-2">
                <div id="overhaulStackTtYear" class="text-[11px] font-semibold text-slate-700 dark:text-slate-200"></div>
                <div id="overhaulStackTtValues" class="mt-2 space-y-1 text-[11px]"></div>
                <div id="overhaulStackTtSubsystems" class="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700 text-[10px] text-slate-500 dark:text-slate-300"></div>
              </div>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 2xl:grid-cols-[minmax(0,1.2fr)_420px] gap-6">
          <div id="overhaulBarsCard" class="relative bg-white dark:bg-slate-900/60 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div class="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-6">
              <div>
                <h3 class="text-lg font-bold">Global Costs by Equipment</h3>
                <p class="text-xs text-slate-500 dark:text-slate-400 mt-1" id="overhaulBarsSubtitle"></p>
              </div>
              <div id="overhaulBarsLegend" class="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400"></div>
            </div>
            <div id="overhaulBarsPlot" class="space-y-4 min-h-[320px]"></div>
            <div id="overhaulBarsEmpty" class="hidden min-h-[320px] flex items-center justify-center text-sm text-slate-500 dark:text-slate-400">No equipment costs available for the selected filters.</div>
            <div id="overhaulBarsTooltip" class="pointer-events-none absolute z-10 hidden" style="min-width:260px;">
              <div class="bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm px-3 py-2">
                <div id="overhaulBarsTooltipTitle" class="text-[11px] font-semibold text-slate-700 dark:text-slate-200"></div>
                <div id="overhaulBarsTooltipValue" class="mt-1 text-[11px] text-slate-500 dark:text-slate-300"></div>
                <div id="overhaulBarsTooltipSubsystems" class="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700 text-[10px] text-slate-500 dark:text-slate-300"></div>
                <div id="overhaulBarsTooltipProjects" class="mt-2 space-y-1 text-[11px]"></div>
              </div>
            </div>
          </div>

          <div id="overhaulPieCard" class="bg-white dark:bg-slate-900/60 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
            <div>
              <h3 class="text-lg font-bold">Global Cost Share by Subsystem</h3>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-1" id="overhaulPieSubtitle"></p>
            </div>
            <div class="flex-1 flex flex-col items-center justify-center py-6">
              <div class="relative size-64">
                <svg id="overhaulPieSvg" class="size-full -rotate-90" viewBox="0 0 64 64"></svg>
                <div class="absolute inset-0 flex flex-col items-center justify-center text-center px-8">
                  <span class="text-3xl font-black leading-none" id="overhaulPieCenterValue">0</span>
                  <span class="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 mt-2">Global Cost</span>
                </div>
              </div>
              <div id="overhaulPieLegend" class="mt-6 w-full space-y-3"></div>
              <div id="overhaulPieEmpty" class="hidden py-12 text-sm text-slate-500 dark:text-slate-400">No subsystem share available for the selected filters.</div>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 2xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)] gap-6">
          <div id="overhaulRatesCard" class="bg-white dark:bg-slate-900/60 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div class="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-4">
              <div>
                <h3 class="text-lg font-bold">Conversion Table</h3>
                <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Internal conversion basis: <span class="font-semibold">1 USD = X Currency</span>. Manual overrides take precedence over live rates.</p>
              </div>
              <div class="flex items-center gap-2">
                <div class="text-xs text-slate-500 dark:text-slate-400" id="overhaulRatesSourceInlineText">Live source pending</div>
                <button id="overhaulRefreshRatesInlineBtn" type="button" class="inline-flex items-center justify-center size-9 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all" title="Refresh conversion table from live source" aria-label="Refresh conversion table from live source">
                  <span class="material-symbols-outlined text-[18px] text-slate-600 dark:text-slate-300">refresh</span>
                </button>
              </div>
            </div>
            <div class="overflow-x-auto">
              <table class="min-w-full text-sm">
                <thead class="text-[10px] uppercase tracking-wider text-slate-400">
                  <tr class="border-b border-slate-100 dark:border-slate-800">
                    <th class="text-left py-3 pr-4">Currency</th>
                    <th class="text-left py-3 px-4">Live rate</th>
                    <th class="text-left py-3 px-4">Manual override</th>
                    <th class="text-left py-3 px-4">Effective rate</th>
                    <th class="text-left py-3 pl-4">Source</th>
                  </tr>
                </thead>
                <tbody id="overhaulRatesTableBody" class="divide-y divide-slate-100 dark:divide-slate-800"></tbody>
              </table>
            </div>
          </div>

          <div id="overhaulSubsystemCard" class="bg-white dark:bg-slate-900/60 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div class="flex flex-col gap-1 mb-4">
              <h3 class="text-lg font-bold">Global Costs by Subsystem</h3>
              <p class="text-xs text-slate-500 dark:text-slate-400" id="overhaulSubsystemNote">
                Global Cost split between Overhaul and Renewal in the selected target currency.
              </p>
            </div>
            <div class="overflow-x-auto">
              <table class="min-w-full text-sm">
                <thead class="text-[10px] uppercase tracking-wider text-slate-400">
                  <tr class="border-b border-slate-100 dark:border-slate-800">
                    <th class="text-left py-3 pr-4">Subsystem</th>
                    <th class="text-right py-3 px-4">Overhaul</th>
                    <th class="text-right py-3 px-4">Renewal</th>
                    <th class="text-right py-3 pl-4">Total</th>
                  </tr>
                </thead>
                <tbody id="overhaulSubsystemTableBody" class="divide-y divide-slate-100 dark:divide-slate-800">
                  <tr>
                    <td colspan="4" class="py-6 text-center text-sm text-slate-500 dark:text-slate-400">No subsystem cost data available.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>
    `;

    const schemaHint = $('schemaHint');
    if (schemaHint) {
      schemaHint.textContent =
        'Expected workbook sheets: "Planning Complet", "Technicians Needed Per Day", "Synthesis", "Corrective Planning", "DEQ_VMI_Planning", and "Overhaul and Renewal Planning".';
    }

    loadStoredExchangeState();

    $('overhaulCurrencyFilter')?.addEventListener('change', (e) => {
      state.currentMaterialCurrency = e.target.value;
      queueSharedSettingsSync();
      renderOverhaulDashboard();
    });
    $('overhaulEquipmentFilter')?.addEventListener('change', (e) => {
      state.currentOverhaulEquipment = e.target.value;
      rebuildOverhaulFilters();
      renderOverhaulDashboard();
    });
    $('overhaulTypeFilter')?.addEventListener('change', (e) => {
      state.currentOverhaulType = e.target.value;
      rebuildOverhaulFilters();
      renderOverhaulDashboard();
    });
    $('overhaulSpanLifeFilter')?.addEventListener('change', (e) => {
      state.currentOverhaulSpanLife = e.target.value;
      rebuildOverhaulFilters();
      renderOverhaulDashboard();
    });
    $('overhaulRefreshRatesBtn')?.addEventListener('click', async () => {
      await refreshExchangeRates();
    });
    $('overhaulRefreshRatesInlineBtn')?.addEventListener('click', async () => {
      await refreshExchangeRates();
    });
    $('overhaulResetOverridesBtn')?.addEventListener('click', () => {
      clearManualExchangeRates();
    });
    $('overhaulKpiTotalToggle')?.addEventListener('change', (e) => {
      state.showOverhaulKpiTotal = !!e.target.checked;
      renderOverhaulDashboard();
    });
    const overhaulYearWrap = $('overhaulYearWrap');
    const overhaulYearPanel = $('overhaulYearPanel');
    $('overhaulYearBtn')?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      overhaulYearPanel?.classList.toggle('hidden');
      rebuildOverhaulFilters();
    });
    $('overhaulYearCloseBtn')?.addEventListener('click', () => overhaulYearPanel?.classList.add('hidden'));
    $('overhaulYearAllBtn')?.addEventListener('click', () => {
      state.currentOverhaulYear = "__ALL__";
      rebuildOverhaulFilters();
      renderOverhaulDashboard();
    });
    $('overhaulYearClearBtn')?.addEventListener('click', () => {
      state.currentOverhaulYear = "__ALL__";
      rebuildOverhaulFilters();
      renderOverhaulDashboard();
    });
    document.addEventListener('click', (e) => {
      if (overhaulYearWrap && !overhaulYearWrap.contains(e.target)) overhaulYearPanel?.classList.add('hidden');
    });

    rebuildOverhaulFilters();
    renderOverhaulDashboard();
    refreshExchangeRates({ silent: true });
  }

  function renderOverhaulDashboard() {
    if (!$('view-overhaul') || $('view-overhaul')?.dataset.ready !== "1") return;

    rebuildOverhaulFilters();

    const rows = getFilteredOverhaulRows();
    const cols = state.overhaulColumns;
    const globalCostKpi = $('overhaulGlobalCostKpi');
    const globalCostKpiHidden = $('overhaulGlobalCostKpiHidden');
    const globalCostProjectList = $('overhaulGlobalCostProjectList');
    const byCurrencyList = $('overhaulGlobalCostByCurrencyList');
    const overhaulKpiTotalToggle = $('overhaulKpiTotalToggle');
    let totalGlobalCost = 0;
    const totalByProject = new Map();
    const rawByCurrencyByProject = new Map();

    rows.forEach((row) => {
      const project = getOverhaulProjectLabel(row);
      const currency = cols.currency ? row?.[cols.currency] : "";
      const rawGlobal = cols.globalCost ? toNumber(row?.[cols.globalCost]) : 0;
      const converted = cols.globalCost ? convertAmount(rawGlobal, currency, state.currentMaterialCurrency) : null;
      totalGlobalCost += converted ?? 0;
      totalByProject.set(project, (totalByProject.get(project) || 0) + (converted ?? 0));
      const code = normalizeCurrencyCode(currency) || "N/A";
      if (!rawByCurrencyByProject.has(project)) rawByCurrencyByProject.set(project, new Map());
      const projectCurrencies = rawByCurrencyByProject.get(project);
      projectCurrencies.set(code, (projectCurrencies.get(code) || 0) + rawGlobal);
    });

    if (overhaulKpiTotalToggle) overhaulKpiTotalToggle.checked = !!state.showOverhaulKpiTotal;
    if (globalCostKpi) {
      globalCostKpi.textContent = formatCurrencyValue(totalGlobalCost, state.currentMaterialCurrency, 0);
      globalCostKpi.classList.toggle('hidden', !state.showOverhaulKpiTotal);
    }
    if (globalCostKpiHidden) globalCostKpiHidden.classList.toggle('hidden', !!state.showOverhaulKpiTotal);
    if (globalCostProjectList) {
      const items = Array.from(totalByProject.entries())
        .filter(([, value]) => value !== 0)
        .sort((a, b) => b[1] - a[1]);
      const projectColorMap = new Map(items.map(([project], index) => [project, colorForSeriesIndex(index)]));
      globalCostProjectList.innerHTML = items.length
        ? items.map(([project, value]) => `
            <div class="flex items-center justify-between gap-3">
              <div class="flex items-center gap-2 min-w-0">
                <span class="inline-block size-2.5 rounded-full shrink-0" style="background:${projectColorMap.get(project)};"></span>
                <span class="text-xs font-bold uppercase tracking-wider text-slate-400 truncate" title="${escapeHtml(project)}">${escapeHtml(project)}</span>
              </div>
              <span class="text-sm font-semibold text-slate-700 dark:text-slate-100">${escapeHtml(formatCurrencyValue(value, state.currentMaterialCurrency, 0))}</span>
            </div>
          `).join("")
        : `<p class="text-sm text-slate-500 dark:text-slate-400">No global costs available.</p>`;
    }
    if (byCurrencyList) {
      const items = Array.from(rawByCurrencyByProject.entries())
        .map(([project, currencies]) => ({
          project,
          currencies: Array.from(currencies.entries())
            .filter(([, value]) => value !== 0)
            .sort((a, b) => b[1] - a[1]),
        }))
        .filter((item) => item.currencies.length)
        .sort((a, b) => {
          const aTotal = a.currencies.reduce((sum, [, value]) => sum + value, 0);
          const bTotal = b.currencies.reduce((sum, [, value]) => sum + value, 0);
          return bTotal - aTotal;
        });
      const projectColorMap = new Map(items.map((item, index) => [item.project, colorForSeriesIndex(index)]));
      byCurrencyList.innerHTML = items.length
        ? items.map((item) => `
            <div class="space-y-1.5">
              <div class="flex items-center gap-2 min-w-0">
                <span class="inline-block size-2.5 rounded-full shrink-0" style="background:${projectColorMap.get(item.project)};"></span>
                <div class="text-xs font-bold uppercase tracking-wider text-slate-400 truncate" title="${escapeHtml(item.project)}">${escapeHtml(item.project)}</div>
              </div>
              ${item.currencies.map(([currency, value]) => `
                <div class="flex items-center justify-between gap-3 pl-3">
                  <span class="text-[11px] text-slate-500 dark:text-slate-400 uppercase">${escapeHtml(currency)}</span>
                  <span class="text-sm font-semibold text-slate-700 dark:text-slate-100">${escapeHtml(formatAmountWithCurrency(value, currency, 0))}</span>
                </div>
              `).join("")}
            </div>
          `).join("")
        : `<p class="text-sm text-slate-500 dark:text-slate-400">No global costs available.</p>`;
    }

    const lastUpdated = state.exchangeLastUpdated ? new Date(state.exchangeLastUpdated).toLocaleString("en-GB") : "";
    const meta = $('overhaulRatesMeta');
    if (meta) meta.textContent = `Base ${state.exchangeBase} - 1 ${state.exchangeBase} = X currency`;
    const sourceHtml = state.exchangeProvider
      ? `Live source: <a class="text-primary underline underline-offset-2" href="https://www.exchangerate-api.com" target="_blank" rel="noreferrer">Rates By Exchange Rate API</a>${state.exchangeLastUpdated ? ` - updated ${escapeHtml(lastUpdated)}` : ""}`
      : "Live source pending";
    const sourceText = $('overhaulRatesSourceText');
    if (sourceText) sourceText.innerHTML = sourceHtml;
    const inlineSourceText = $('overhaulRatesSourceInlineText');
    if (inlineSourceText) inlineSourceText.innerHTML = sourceHtml;

    renderOverhaulYearChart();
    renderOverhaulEquipmentChart();
    renderOverhaulPieChart();
    renderOverhaulRatesTable();
    renderOverhaulSubsystemTable();
  }

  function renderOverhaulYearChart() {
    const svg = $('overhaulStackSvg');
    const yearsWrap = $('overhaulStackYears');
    const yAxis = $('overhaulStackYAxis');
    const empty = $('overhaulStackEmpty');
    const subtitle = $('overhaulStackSubtitle');
    const legend = $('overhaulStackLegend');
    const tooltip = $('overhaulStackTooltip');
    const ttYear = $('overhaulStackTtYear');
    const ttValues = $('overhaulStackTtValues');
    const ttSubsystems = $('overhaulStackTtSubsystems');
    const stackCard = $('overhaulStackCard');
    if (!svg || !yearsWrap || !yAxis || !empty || !subtitle || !legend) return;

    legend.innerHTML = `
      <div class="flex items-center gap-2"><span class="inline-block size-2.5 rounded-full" style="background:${OVERHAUL_STACK_COLORS.material};"></span><span>Material Cost</span></div>
      <div class="flex items-center gap-2"><span class="inline-block size-2.5 rounded-full" style="background:${OVERHAUL_STACK_COLORS.tc};"></span><span>T&amp;C Cost</span></div>
      <div class="flex items-center gap-2"><span class="inline-block size-2.5 rounded-full" style="background:${OVERHAUL_STACK_COLORS.management};"></span><span>Management Cost</span></div>
    `;

    const rows = getFilteredOverhaulRows();
    const cols = state.overhaulColumns;
    const byYear = new Map();
    const globalProjectTotals = new Map();
    let skipped = 0;

    rows.forEach((row) => {
      const year = getOverhaulYearValue(row);
      if (!year) return;
      const project = getOverhaulProjectLabel(row);
      const currency = cols.currency ? row?.[cols.currency] : "";
      const type = normalizeOverhaulTypeCategory(cols.type ? row?.[cols.type] : "");
      if (type !== "Overhaul" && type !== "Renewal") return;
      const subsystem = cols.subsystem ? (String(row?.[cols.subsystem] ?? "").trim() || "Unspecified") : "Unspecified";
      const materialRaw = cols.materialCost ? toNumber(row?.[cols.materialCost]) : 0;
      const tcRaw = cols.tcCost ? toNumber(row?.[cols.tcCost]) : 0;
      const managementRaw = cols.managementCost ? toNumber(row?.[cols.managementCost]) : 0;
      const material = cols.materialCost ? convertAmount(materialRaw, currency, state.currentMaterialCurrency) : null;
      const tc = cols.tcCost ? convertAmount(tcRaw, currency, state.currentMaterialCurrency) : null;
      const management = cols.managementCost ? convertAmount(managementRaw, currency, state.currentMaterialCurrency) : null;
      if ((materialRaw && material === null) || (tcRaw && tc === null) || (managementRaw && management === null)) skipped += 1;
      const yearProjects = byYear.get(year) || new Map();
      const bucket = yearProjects.get(project) || { year, project, material: 0, tc: 0, management: 0, subsystems: new Map() };
      bucket.material += material ?? 0;
      bucket.tc += tc ?? 0;
      bucket.management += management ?? 0;
      const subsystemTotal = (material ?? 0) + (tc ?? 0) + (management ?? 0);
      if (subsystemTotal > 0) {
        bucket.subsystems.set(subsystem, (bucket.subsystems.get(subsystem) || 0) + subsystemTotal);
      }
      yearProjects.set(project, bucket);
      byYear.set(year, yearProjects);
      globalProjectTotals.set(project, (globalProjectTotals.get(project) || 0) + subsystemTotal);
    });

    const projectOrder = Array.from(globalProjectTotals.entries())
      .filter(([, value]) => value > 0)
      .sort((a, b) => (b[1] - a[1]) || a[0].localeCompare(b[0]))
      .map(([project]) => project);
    const projectColorMap = new Map(projectOrder.map((project, index) => [project, colorForSeriesIndex(index)]));
    const items = sortDimensionValues(Array.from(byYear.keys())).map((year) => {
      const yearProjects = byYear.get(year) || new Map();
      return {
        year,
        projects: projectOrder
          .filter((project) => yearProjects.has(project))
          .map((project) => yearProjects.get(project)),
      };
    });
    const totals = items.flatMap((item) => item.projects.map((project) => project.material + project.tc + project.management));
    const maxV = Math.max(1, ...totals);
    const ticks = [maxV, maxV * 0.66, maxV * 0.33, 0];
    subtitle.textContent = `Source: Overhaul and Renewal Planning + DEQ_VMI_Planning - grouped by project within each planning year - currency ${state.currentMaterialCurrency}${skipped ? ` - ${skipped} row(s) skipped because a conversion rate is missing` : ""}`;

    yAxis.innerHTML = ticks.map((tick) => `<span>${escapeHtml(formatCurrencyValue(tick, state.currentMaterialCurrency, 0))}</span>`).join("");

    if (!items.length || totals.every((value) => value === 0)) {
      svg.innerHTML = "";
      yearsWrap.innerHTML = "";
      empty.classList.remove('hidden');
      if (tooltip) tooltip.classList.add('hidden');
      return;
    }

    empty.classList.add('hidden');
    const chartTop = 20;
    const chartBottom = 260;
    const chartHeight = chartBottom - chartTop;
    const step = 1000 / items.length;
    const maxProjects = Math.max(1, ...items.map((item) => item.projects.length));
    const barGap = Math.max(2, Math.min(8, step * 0.04));
    const groupPadding = Math.max(12, step * 0.12);
    const availableGroupWidth = Math.max(32, step - (groupPadding * 2));
    const barWidth = Math.max(8, Math.min(40, (availableGroupWidth - (barGap * Math.max(0, maxProjects - 1))) / maxProjects));
    const baseY = chartBottom;
    const yFor = (value) => baseY - ((value / maxV) * chartHeight);
    const byBarKey = new Map();

    svg.innerHTML = `
      <g>
        ${ticks.map((tick, idx) => `<line x1="0" y1="${yFor(tick).toFixed(1)}" x2="1000" y2="${yFor(tick).toFixed(1)}" stroke="#cbd5e1" stroke-width="1" ${idx === 0 || idx === ticks.length - 1 ? "" : 'stroke-dasharray="4,6"'}></line>`).join("")}
      </g>
      <g>
        ${items.map((item, index) => {
          const groupWidth = (item.projects.length * barWidth) + (Math.max(0, item.projects.length - 1) * barGap);
          const groupStartX = (step * index) + ((step - groupWidth) / 2);
          return item.projects.map((projectItem, projectIndex) => {
            const total = projectItem.material + projectItem.tc + projectItem.management;
            const x = groupStartX + (projectIndex * (barWidth + barGap));
            const materialHeight = maxV ? (projectItem.material / maxV) * chartHeight : 0;
            const tcHeight = maxV ? (projectItem.tc / maxV) * chartHeight : 0;
            const managementHeight = maxV ? (projectItem.management / maxV) * chartHeight : 0;
            const managementY = baseY - managementHeight;
            const tcY = managementY - tcHeight;
            const materialY = tcY - materialHeight;
            const topY = Math.min(materialY, tcY, managementY);
            const hitHeight = Math.max(1, baseY - topY);
            const stroke = projectColorMap.get(projectItem.project) || "#94a3b8";
            const barKey = `overhaul-${index}-${projectIndex}`;
            byBarKey.set(barKey, projectItem);
            return `
              <g>
                <rect x="${x.toFixed(1)}" y="${materialY.toFixed(1)}" width="${barWidth.toFixed(1)}" height="${Math.max(0, materialHeight).toFixed(1)}" rx="8" fill="${OVERHAUL_STACK_COLORS.material}" stroke="${stroke}" stroke-width="1.2" opacity="0.95"></rect>
                <rect x="${x.toFixed(1)}" y="${tcY.toFixed(1)}" width="${barWidth.toFixed(1)}" height="${Math.max(0, tcHeight).toFixed(1)}" fill="${OVERHAUL_STACK_COLORS.tc}" stroke="${stroke}" stroke-width="1.2" opacity="0.92"></rect>
                <rect x="${x.toFixed(1)}" y="${managementY.toFixed(1)}" width="${barWidth.toFixed(1)}" height="${Math.max(0, managementHeight).toFixed(1)}" rx="8" fill="${OVERHAUL_STACK_COLORS.management}" stroke="${stroke}" stroke-width="1.2" opacity="0.92"></rect>
                <rect x="${x.toFixed(1)}" y="${topY.toFixed(1)}" width="${barWidth.toFixed(1)}" height="${hitHeight.toFixed(1)}" fill="transparent" data-overhaul-bar="${barKey}" style="cursor:pointer;"></rect>
                ${barWidth >= 18 ? `<text x="${(x + (barWidth / 2)).toFixed(1)}" y="${Math.max(14, materialY - 8).toFixed(1)}" text-anchor="middle" font-size="10" font-weight="700" fill="#475569">${escapeHtml(formatCompactNumber(total, 1))}</text>` : ""}
              </g>
            `;
          }).join("");
        }).join("")}
      </g>
    `;
    yearsWrap.style.gridTemplateColumns = `repeat(${items.length}, minmax(0, 1fr))`;
    yearsWrap.innerHTML = items.map((item) => `
      <div class="flex flex-col items-center gap-1 text-center">
        <div>${escapeHtml(item.year)}</div>
        <div class="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[9px] font-medium text-slate-500 dark:text-slate-400">
          ${item.projects.map((projectItem) => `
            <span class="inline-flex items-center gap-1 max-w-full" title="${escapeHtml(projectItem.project)}">
              <span class="inline-block size-1.5 rounded-full shrink-0" style="background:${projectColorMap.get(projectItem.project) || "#94a3b8"};"></span>
              <span class="truncate max-w-[86px]">${escapeHtml(projectItem.project)}</span>
            </span>
          `).join("")}
        </div>
      </div>
    `).join("");

    if (!tooltip || !ttYear || !ttValues || !ttSubsystems || !stackCard) return;
    tooltip.classList.add('hidden');

    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const hideTooltip = () => tooltip.classList.add('hidden');

    const updateTooltip = (event, barKey) => {
      const item = byBarKey.get(String(barKey));
      if (!item) return;

      ttYear.textContent = `Year ${item.year} - ${item.project}`;
      ttValues.innerHTML = `
        <div class="flex items-center justify-between gap-3"><span>Material Cost</span><span class="font-semibold">${escapeHtml(formatCurrencyValue(item.material, state.currentMaterialCurrency, 0))}</span></div>
        <div class="flex items-center justify-between gap-3"><span>T&C Cost</span><span class="font-semibold">${escapeHtml(formatCurrencyValue(item.tc, state.currentMaterialCurrency, 0))}</span></div>
        <div class="flex items-center justify-between gap-3"><span>Management Cost</span><span class="font-semibold">${escapeHtml(formatCurrencyValue(item.management, state.currentMaterialCurrency, 0))}</span></div>
      `;

      const subsystemItems = Array.from(item.subsystems.entries())
        .sort((a, b) => b[1] - a[1]);
      const displayed = subsystemItems.slice(0, 5);
      ttSubsystems.innerHTML = displayed.length
        ? `
          <div class="font-semibold text-slate-600 dark:text-slate-200 mb-1">Subsystems (top ${displayed.length})</div>
          ${displayed.map(([name, value]) => `<div class="flex items-center justify-between gap-2"><span class="truncate">${escapeHtml(name)}</span><span>${escapeHtml(formatCurrencyValue(value, state.currentMaterialCurrency, 0))}</span></div>`).join("")}
          ${subsystemItems.length > displayed.length ? `<div class="mt-1 text-slate-400">+${subsystemItems.length - displayed.length} more</div>` : ""}
        `
        : `<div>No subsystem data available.</div>`;

      tooltip.classList.remove('hidden');
      const cardRect = stackCard.getBoundingClientRect();
      const tipRect = tooltip.getBoundingClientRect();
      let left = (event.clientX - cardRect.left) + 12;
      let top = (event.clientY - cardRect.top) - tipRect.height - 10;
      left = clamp(left, 12, cardRect.width - tipRect.width - 12);
      top = clamp(top, 12, cardRect.height - tipRect.height - 12);
      tooltip.style.left = `${left}px`;
      tooltip.style.top = `${top}px`;
    };

    svg.querySelectorAll('[data-overhaul-bar]').forEach((hit) => {
      hit.addEventListener('pointerenter', (event) => updateTooltip(event, hit.getAttribute('data-overhaul-bar')));
      hit.addEventListener('pointermove', (event) => updateTooltip(event, hit.getAttribute('data-overhaul-bar')));
      hit.addEventListener('pointerleave', hideTooltip);
    });
  }

  function renderOverhaulEquipmentChart() {
    const plot = $('overhaulBarsPlot');
    const empty = $('overhaulBarsEmpty');
    const subtitle = $('overhaulBarsSubtitle');
    const legend = $('overhaulBarsLegend');
    const card = $('overhaulBarsCard');
    const tooltip = $('overhaulBarsTooltip');
    const tooltipTitle = $('overhaulBarsTooltipTitle');
    const tooltipValue = $('overhaulBarsTooltipValue');
    const tooltipSubsystems = $('overhaulBarsTooltipSubsystems');
    const tooltipProjects = $('overhaulBarsTooltipProjects');
    if (!plot || !empty || !subtitle || !legend) return;

    legend.innerHTML = `
      <div class="flex items-center gap-2"><span class="inline-block size-2.5 rounded-full" style="background:${OVERHAUL_TYPE_COLORS.overhaul};"></span><span>Overhaul</span></div>
      <div class="flex items-center gap-2"><span class="inline-block size-2.5 rounded-full" style="background:${OVERHAUL_TYPE_COLORS.renewal};"></span><span>Renewal</span></div>
    `;

    const rows = getFilteredOverhaulRows();
    const cols = state.overhaulColumns;
    const map = new Map();
    const projectTotals = new Map();

    rows.forEach((row) => {
      const equipment = cols.equipment ? (String(row?.[cols.equipment] ?? "").trim() || "Unspecified") : "Unspecified";
      const currency = cols.currency ? row?.[cols.currency] : "";
      const type = normalizeOverhaulTypeCategory(cols.type ? row?.[cols.type] : "");
      if (type !== "Overhaul" && type !== "Renewal") return;
      const value = cols.globalCost ? convertAmount(toNumber(row?.[cols.globalCost]), currency, state.currentMaterialCurrency) : null;
      const project = getOverhaulProjectLabel(row);
      const subsystem = cols.subsystem ? (String(row?.[cols.subsystem] ?? "").trim() || "Unspecified") : "Unspecified";
      const bucket = map.get(equipment) || {
        label: equipment,
        overhaul: 0,
        renewal: 0,
        details: {
          Overhaul: { total: 0, projects: new Map(), subsystems: new Set() },
          Renewal: { total: 0, projects: new Map(), subsystems: new Set() },
        },
      };
      if (type === "Renewal") bucket.renewal += value ?? 0;
      else bucket.overhaul += value ?? 0;
      const detail = bucket.details[type];
      detail.total += value ?? 0;
      detail.projects.set(project, (detail.projects.get(project) || 0) + (value ?? 0));
      detail.subsystems.add(subsystem);
      projectTotals.set(project, (projectTotals.get(project) || 0) + (value ?? 0));
      map.set(equipment, bucket);
    });

    const items = Array.from(map.values())
      .filter((item) => item.overhaul > 0 || item.renewal > 0)
      .sort((a, b) => (b.overhaul + b.renewal) - (a.overhaul + a.renewal))
      .slice(0, 12);
    const projectColorMap = new Map(
      Array.from(projectTotals.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([project], index) => [project, colorForSeriesIndex(index)])
    );

    subtitle.textContent = `Filters applied - currency ${state.currentMaterialCurrency}`;

    if (!items.length) {
      plot.innerHTML = "";
      empty.classList.remove('hidden');
      tooltip?.classList.add('hidden');
      return;
    }

    empty.classList.add('hidden');
    const maxV = Math.max(1, ...items.flatMap((item) => [item.overhaul, item.renewal]));
    const tooltipData = new Map();
    plot.innerHTML = items.map((item, index) => {
      const overhaulKey = `overhaul-bars-${index}-overhaul`;
      const renewalKey = `overhaul-bars-${index}-renewal`;
      tooltipData.set(overhaulKey, { equipment: item.label, type: "Overhaul", value: item.overhaul, detail: item.details.Overhaul });
      tooltipData.set(renewalKey, { equipment: item.label, type: "Renewal", value: item.renewal, detail: item.details.Renewal });
      return `
      <div class="grid gap-3 items-start" style="grid-template-columns:minmax(140px,180px) minmax(0,1fr);">
        <div class="pt-1">
          <p class="text-xs font-semibold text-slate-700 dark:text-slate-200">${escapeHtml(item.label)}</p>
        </div>
        <div class="space-y-2">
          <div class="relative h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden cursor-pointer" data-overhaul-bars-key="${overhaulKey}">
            <div class="absolute inset-y-0 left-0 rounded-full" style="width:${item.overhaul > 0 ? Math.max(2, (item.overhaul / maxV) * 100) : 0}%; background:${OVERHAUL_TYPE_COLORS.overhaul};"></div>
          </div>
          <div class="relative h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden cursor-pointer" data-overhaul-bars-key="${renewalKey}">
            <div class="absolute inset-y-0 left-0 rounded-full" style="width:${item.renewal > 0 ? Math.max(2, (item.renewal / maxV) * 100) : 0}%; background:${OVERHAUL_TYPE_COLORS.renewal};"></div>
          </div>
          <div class="flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-500 dark:text-slate-400">
            <span>Overhaul: ${escapeHtml(formatCurrencyValue(item.overhaul, state.currentMaterialCurrency, 0))}</span>
            <span>Renewal: ${escapeHtml(formatCurrencyValue(item.renewal, state.currentMaterialCurrency, 0))}</span>
          </div>
        </div>
      </div>
    `;
    }).join("");

    if (!card || !tooltip || !tooltipTitle || !tooltipValue || !tooltipSubsystems || !tooltipProjects) return;
    tooltip.classList.add('hidden');

    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const hideTooltip = () => tooltip.classList.add('hidden');
    const updateTooltip = (event, key) => {
      const entry = tooltipData.get(key);
      if (!entry || entry.value <= 0) return;

      tooltipTitle.textContent = `${entry.equipment} - ${entry.type}`;
      tooltipValue.textContent = formatCurrencyValue(entry.value, state.currentMaterialCurrency, 0);
      const subsystemList = Array.from(entry.detail.subsystems.values()).sort((a, b) => a.localeCompare(b));
      tooltipSubsystems.innerHTML = subsystemList.length
        ? `<div><span class="font-semibold text-slate-600 dark:text-slate-200">Subsystem${subsystemList.length > 1 ? "s" : ""}:</span> ${escapeHtml(subsystemList.join(", "))}</div>`
        : `<div>No subsystem data available.</div>`;

      const projects = Array.from(entry.detail.projects.entries())
        .filter(([, value]) => value > 0)
        .sort((a, b) => b[1] - a[1]);
      tooltipProjects.innerHTML = projects.length
        ? projects.map(([project, value]) => {
            const pct = entry.value > 0 ? (value / entry.value) * 100 : 0;
            const color = projectColorMap.get(project) || "#94a3b8";
            return `
              <div class="flex items-center justify-between gap-3">
                <div class="flex min-w-0 items-center gap-2">
                  <span class="inline-block size-2.5 rounded-full shrink-0" style="background:${color};"></span>
                  <span class="truncate text-slate-600 dark:text-slate-300" title="${escapeHtml(project)}">${escapeHtml(project)}</span>
                </div>
                <div class="shrink-0 text-right">
                  <div class="font-semibold text-slate-700 dark:text-slate-100">${pct.toFixed(1)}%</div>
                  <div class="text-[10px] text-slate-500 dark:text-slate-400">${escapeHtml(formatCurrencyValue(value, state.currentMaterialCurrency, 0))}</div>
                </div>
              </div>
            `;
          }).join("")
        : `<div class="text-[10px] text-slate-500 dark:text-slate-400">No project share available.</div>`;

      tooltip.classList.remove('hidden');
      const cardRect = card.getBoundingClientRect();
      const tipRect = tooltip.getBoundingClientRect();
      let left = (event.clientX - cardRect.left) + 12;
      let top = (event.clientY - cardRect.top) - tipRect.height - 10;
      left = clamp(left, 12, cardRect.width - tipRect.width - 12);
      top = clamp(top, 12, cardRect.height - tipRect.height - 12);
      tooltip.style.left = `${left}px`;
      tooltip.style.top = `${top}px`;
    };

    plot.querySelectorAll('[data-overhaul-bars-key]').forEach((bar) => {
      bar.addEventListener('pointerenter', (event) => updateTooltip(event, bar.getAttribute('data-overhaul-bars-key')));
      bar.addEventListener('pointermove', (event) => updateTooltip(event, bar.getAttribute('data-overhaul-bars-key')));
      bar.addEventListener('pointerleave', hideTooltip);
    });
  }

  function renderOverhaulPieChart() {
    const svg = $('overhaulPieSvg');
    const legend = $('overhaulPieLegend');
    const empty = $('overhaulPieEmpty');
    const centerValue = $('overhaulPieCenterValue');
    const subtitle = $('overhaulPieSubtitle');
    if (!svg || !legend || !empty || !centerValue || !subtitle) return;

    const rows = getFilteredOverhaulRows();
    const cols = state.overhaulColumns;
    const map = new Map();

    rows.forEach((row) => {
      const subsystem = cols.subsystem ? (String(row?.[cols.subsystem] ?? "").trim() || "Unspecified") : "Unspecified";
      const currency = cols.currency ? row?.[cols.currency] : "";
      const globalCost = cols.globalCost ? convertAmount(toNumber(row?.[cols.globalCost]), currency, state.currentMaterialCurrency) : null;
      const value = globalCost ?? 0;
      if (value <= 0) return;
      map.set(subsystem, (map.get(subsystem) || 0) + value);
    });

    const items = Array.from(map.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);
    const total = items.reduce((sum, item) => sum + item.value, 0);
    subtitle.textContent = `Selected target currency ${state.currentMaterialCurrency}`;
    centerValue.textContent = formatCurrencyValue(total, state.currentMaterialCurrency, 0);

    if (!items.length || total <= 0) {
      svg.innerHTML = "";
      legend.innerHTML = "";
      empty.classList.remove('hidden');
      return;
    }

    empty.classList.add('hidden');
    const radius = 24;
    const circumference = 2 * Math.PI * radius;
    let offset = 0;
    svg.innerHTML = `
      <circle cx="32" cy="32" r="${radius}" fill="none" stroke="#e2e8f0" stroke-width="10"></circle>
      ${items.map((item, index) => {
        const fraction = item.value / total;
        const dash = fraction * circumference;
        const stroke = OVERHAUL_PIE_COLORS[index % OVERHAUL_PIE_COLORS.length];
        const circle = `<circle cx="32" cy="32" r="${radius}" fill="none" stroke="${stroke}" stroke-width="10" stroke-dasharray="${dash} ${circumference - dash}" stroke-dashoffset="${-offset}"></circle>`;
        offset += dash;
        return circle;
      }).join("")}
    `;

    legend.innerHTML = items.map((item, index) => {
      const pct = total > 0 ? (item.value / total) * 100 : 0;
      const color = OVERHAUL_PIE_COLORS[index % OVERHAUL_PIE_COLORS.length];
      return `
        <div class="flex items-center justify-between gap-3">
          <div class="flex items-center gap-3 min-w-0">
            <span class="inline-block size-3 rounded-full flex-shrink-0" style="background:${color};"></span>
            <span class="text-sm font-medium truncate">${escapeHtml(item.label)}</span>
          </div>
          <div class="text-right">
            <div class="text-sm font-semibold">${pct.toFixed(1)}%</div>
            <div class="text-[11px] text-slate-500 dark:text-slate-400">${escapeHtml(formatCurrencyValue(item.value, state.currentMaterialCurrency, 0))}</div>
          </div>
        </div>
      `;
    }).join("");
  }

  function renderOverhaulRatesTable() {
    const tbody = $('overhaulRatesTableBody');
    if (!tbody) return;

    const currencies = Array.from(new Set(
      []
        .concat(getCurrenciesInRowsByColumn(getOverhaulBaseRows(), state.overhaulColumns.currency))
        .concat(Object.keys(state.manualExchangeRates || {}))
        .concat([state.currentMaterialCurrency, state.exchangeBase])
        .filter(Boolean)
    )).sort((a, b) => a.localeCompare(b));

    if (!currencies.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
            Upload a sheet with Overhaul and Renewal Planning or DEQ_VMI_Planning currency data to build the conversion table.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = currencies.map((currency) => {
      const liveRate = currency === state.exchangeBase ? 1 : Number(state.exchangeRates?.[currency]);
      const manualRate = Number(state.manualExchangeRates?.[currency]);
      const effectiveRate = getEffectiveRate(currency);
      const source = Number.isFinite(manualRate) && manualRate > 0 ? "Manual" : (Number.isFinite(liveRate) && liveRate > 0 ? "Live" : "Missing");
      return `
        <tr>
          <td class="py-3 pr-4 font-semibold">${escapeHtml(currency)}</td>
          <td class="py-3 px-4 text-slate-500 dark:text-slate-400">${escapeHtml(formatRate(liveRate))}</td>
          <td class="py-3 px-4">
            <div class="flex items-center gap-2">
              <input
                type="number"
                min="0"
                step="0.000001"
                class="w-32 rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                data-overhaul-rate-input="${escapeHtml(currency)}"
                value="${Number.isFinite(manualRate) && manualRate > 0 ? manualRate : ""}"
                placeholder="optional">
              <button
                type="button"
                class="px-2.5 py-2 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                data-overhaul-rate-clear="${escapeHtml(currency)}">
                Clear
              </button>
            </div>
          </td>
          <td class="py-3 px-4 font-semibold">${escapeHtml(formatRate(effectiveRate))}</td>
          <td class="py-3 pl-4">
            <span class="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold ${source === "Manual" ? "bg-amber-50 text-amber-700 border border-amber-200" : source === "Live" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200"}">
              ${source}
            </span>
          </td>
        </tr>
      `;
    }).join("");

    tbody.querySelectorAll('input[data-overhaul-rate-input]').forEach((input) => {
      input.addEventListener('change', (e) => {
        const currency = e.target.getAttribute('data-overhaul-rate-input');
        setManualExchangeRate(currency, e.target.value);
      });
    });
    tbody.querySelectorAll('button[data-overhaul-rate-clear]').forEach((button) => {
      button.addEventListener('click', () => {
        const currency = button.getAttribute('data-overhaul-rate-clear');
        setManualExchangeRate(currency, "");
      });
    });
  }

  function renderOverhaulSubsystemTable() {
    const tbody = $('overhaulSubsystemTableBody');
    const note = $('overhaulSubsystemNote');
    if (!tbody || !note) return;

    note.textContent = `Global Cost split between Overhaul and Renewal in ${state.currentMaterialCurrency}.`;

    const rows = getFilteredOverhaulRows();
    const cols = state.overhaulColumns;
    const subCol = cols.subsystem;
    if (!subCol) {
      tbody.innerHTML = `
        <tr>
          <td colspan="4" class="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
            No subsystem column was found in Overhaul and Renewal Planning or DEQ_VMI_Planning.
          </td>
        </tr>
      `;
      return;
    }

    const map = new Map();
    rows.forEach((row) => {
      const subsystem = String(row?.[subCol] ?? "").trim() || "Unspecified";
      const currency = cols.currency ? row?.[cols.currency] : "";
      const type = normalizeOverhaulTypeCategory(cols.type ? row?.[cols.type] : "");
      if (type !== "Overhaul" && type !== "Renewal") return;
      const globalCost = cols.globalCost ? convertAmount(toNumber(row?.[cols.globalCost]), currency, state.currentMaterialCurrency) : null;
      const bucket = map.get(subsystem) || { subsystem, overhaul: 0, renewal: 0 };
      if (type === "Renewal") bucket.renewal += globalCost ?? 0;
      else bucket.overhaul += globalCost ?? 0;
      map.set(subsystem, bucket);
    });

    const items = Array.from(map.values())
      .filter((item) => item.overhaul > 0 || item.renewal > 0)
      .sort((a, b) => (b.overhaul + b.renewal) - (a.overhaul + a.renewal));

    if (!items.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="4" class="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
            No subsystem cost data available for the selected filters.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = items.map((item) => `
      <tr>
        <td class="py-3 pr-4 font-semibold">${escapeHtml(item.subsystem)}</td>
        <td class="py-3 px-4 text-right font-medium">${escapeHtml(formatCurrencyValue(item.overhaul, state.currentMaterialCurrency, 0))}</td>
        <td class="py-3 px-4 text-right font-medium">${escapeHtml(formatCurrencyValue(item.renewal, state.currentMaterialCurrency, 0))}</td>
        <td class="py-3 pl-4 text-right font-semibold">${escapeHtml(formatCurrencyValue(item.overhaul + item.renewal, state.currentMaterialCurrency, 0))}</td>
      </tr>
    `).join("");
  }

  function getSubcontractingProjectLabel(row) {
    const cols = state.subcontractingColumns;
    const rowProject = cols.project ? String(row?.[cols.project] ?? "").trim() : "";
    if (rowProject) return rowProject;
    const meta = state.fileMeta?.[row?.__fileid] || {};
    const gp = meta?.gp || {};
    const gpProject = String(gp.project_name ?? gp.project ?? "").trim();
    if (gpProject) return gpProject;
    const label = String(meta.label ?? "").trim();
    if (label) return label;
    return "Unspecified project";
  }

  function initSubcontractingView() {
    const view = $('view-subcontracting');
    if (!view || view.dataset.ready === "1") return;
    view.dataset.ready = "1";
    view.innerHTML = `
      <section class="pt-8 space-y-6">
        <div class="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
          <div class="flex flex-col 2xl:flex-row 2xl:items-start justify-between gap-5">
            <div>
              <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-bold uppercase tracking-[0.18em]">
                <span class="material-symbols-outlined text-[16px]">schema</span>
                Subcontracting Planning
              </div>
              <h2 class="text-3xl font-black tracking-tight mt-2">Subcontracting Activities Dashboard</h2>
              <p class="text-sm text-slate-500 dark:text-slate-400 mt-2">Yearly subcontracting cost decomposition by project, subsystem and activity with live multi-currency conversion.</p>
            </div>
            <div class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
              <div><p class="text-[10px] font-bold text-slate-400 uppercase">Project Name</p><p class="font-bold" id="subcontractingProjectName">--</p></div>
              <div><p class="text-[10px] font-bold text-slate-400 uppercase">Project Type</p><p class="font-bold" id="subcontractingProjectType">--</p></div>
              <div><p class="text-[10px] font-bold text-slate-400 uppercase">Line Length</p><p class="font-bold" id="subcontractingLineLength">-- <span class="text-[10px] font-normal text-slate-400">STK</span></p></div>
              <div><p class="text-[10px] font-bold text-slate-400 uppercase">Bid / Service Year</p><p class="font-bold" id="subcontractingServiceYear">-- / --</p></div>
              <div><p class="text-[10px] font-bold text-slate-400 uppercase">Contract Duration</p><p class="font-bold" id="subcontractingContractDuration">--</p></div>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-3">
            <label><span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Currency</span><select id="subcontractingCurrencyFilter" class="mt-1 w-full text-sm rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2"><option value="USD">USD</option></select></label>
            <label><span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Equipment</span><select id="subcontractingEquipmentFilter" class="mt-1 w-full text-sm rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2"><option value="__ALL__">All equipment</option></select></label>
            <label><span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Activity</span><select id="subcontractingActivityFilter" class="mt-1 w-full text-sm rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2"><option value="__ALL__">All activities</option></select></label>
            <label><span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Type</span><select id="subcontractingTypeFilter" class="mt-1 w-full text-sm rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2"><option value="__ALL__">All types</option></select></label>
            <label><span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Frequency</span><select id="subcontractingFrequencyFilter" class="mt-1 w-full text-sm rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2"><option value="__ALL__">All frequencies</option></select></label>
            <label><span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Period Duration</span><input id="subcontractingPeriodDurationInput" type="number" min="0" step="0.01" value="1" class="mt-1 w-full text-sm rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2" /></label>
          </div>

        <div class="grid grid-cols-1 xl:grid-cols-4 gap-4">
          <div class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/70 p-4 min-h-[160px]">
            <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Global Cost</p>
            <p class="mt-2 text-3xl font-black" id="subcontractingGlobalCostKpi">0</p>
            <p id="subcontractingGlobalCostKpiHidden" class="hidden mt-2 text-xs text-slate-500 dark:text-slate-400">Project split only</p>
            <div id="subcontractingGlobalCostProjectList" class="mt-3 space-y-2 max-h-[92px] overflow-y-auto custom-scrollbar">
              <p class="text-sm text-slate-500 dark:text-slate-400">No subcontracting costs available.</p>
            </div>
          </div>
          <div class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/70 p-4 min-h-[160px]">
            <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Global Cost by Source Currency</p>
            <div id="subcontractingGlobalCostByCurrencyList" class="mt-3 space-y-2 max-h-[96px] overflow-y-auto custom-scrollbar"><p class="text-sm text-slate-500 dark:text-slate-400">No subcontracting costs available.</p></div>
          </div>
          <div class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/70 p-4 min-h-[160px] space-y-3">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <p class="text-sm font-semibold" id="subcontractingRatesMeta">Base USD - 1 USD = X currency</p>
              <div class="flex items-center gap-2">
                <button id="subcontractingRefreshRatesBtn" type="button" class="px-3 py-2 text-xs font-semibold rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900">Refresh live rates</button>
                <button id="subcontractingResetOverridesBtn" type="button" class="px-3 py-2 text-xs font-semibold rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">Reset manual</button>
              </div>
            </div>
            <p class="text-xs text-slate-500 dark:text-slate-400" id="subcontractingRatesSourceText">Live source pending</p>
          </div>
          <div class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/70 p-4 flex flex-col gap-3 min-h-[160px]">
            <div>
              <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Display</p>
              <p class="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Project Sum on KPI cards</p>
              <p class="mt-1 text-[11px] text-slate-500 dark:text-slate-400">Show or hide the aggregated total on Global Cost.</p>
            </div>
            <label class="inline-flex items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 cursor-pointer">
              <span class="text-xs font-semibold text-slate-600 dark:text-slate-300">Show total</span>
              <input id="subcontractingKpiTotalToggle" type="checkbox" class="rounded border-slate-300 dark:border-slate-600 text-primary" checked>
            </label>
          </div>
        </div>
        </div>

        <div class="bg-white dark:bg-slate-900/60 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <h3 class="text-lg font-bold">Subcontracting Cost Decomposition Tree</h3>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-1" id="subcontractingTreeSubtitle"></p>
          <div id="subcontractingTreeBody" class="mt-4 space-y-4 min-h-[260px]"></div>
          <div id="subcontractingTreeEmpty" class="hidden min-h-[260px] flex items-center justify-center text-sm text-slate-500 dark:text-slate-400">No subcontracting costs available for the selected filters.</div>
        </div>

        <div class="grid grid-cols-1 2xl:grid-cols-[420px_minmax(0,1fr)] gap-6">
          <div class="bg-white dark:bg-slate-900/60 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 class="text-lg font-bold">Yearly Cost Share by Subsystem</h3>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1" id="subcontractingPieSubtitle"></p>
            <div class="flex flex-col items-center py-6">
              <div class="relative size-64">
                <svg id="subcontractingPieSvg" class="size-full -rotate-90" viewBox="0 0 64 64"></svg>
                <div class="absolute inset-0 flex flex-col items-center justify-center text-center px-8">
                  <span class="text-3xl font-black leading-none" id="subcontractingPieCenterValue">0</span>
                  <span class="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 mt-2">Yearly Cost</span>
                </div>
              </div>
              <div id="subcontractingPieLegend" class="mt-6 w-full space-y-3"></div>
              <div id="subcontractingPieEmpty" class="hidden py-10 text-sm text-slate-500 dark:text-slate-400">No subsystem share available for the selected filters.</div>
            </div>
          </div>
          <div class="bg-white dark:bg-slate-900/60 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 class="text-lg font-bold">Yearly Cost by Activity</h3>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1" id="subcontractingActivityBarsSubtitle"></p>
            <div id="subcontractingActivityBarsLegend" class="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400"></div>
            <div id="subcontractingActivityBarsPlot" class="mt-4 space-y-4 min-h-[320px]"></div>
            <div id="subcontractingActivityBarsEmpty" class="hidden min-h-[320px] flex items-center justify-center text-sm text-slate-500 dark:text-slate-400">No activity costs available for the selected filters.</div>
          </div>
        </div>

        <div class="grid grid-cols-1 2xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)] gap-6">
          <div class="bg-white dark:bg-slate-900/60 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h3 class="text-lg font-bold">Conversion Table</h3>
              <div class="flex items-center gap-2">
                <div class="text-xs text-slate-500 dark:text-slate-400" id="subcontractingRatesSourceInlineText">Live source pending</div>
                <button id="subcontractingRefreshRatesInlineBtn" type="button" class="inline-flex items-center justify-center size-9 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700" title="Refresh conversion table"><span class="material-symbols-outlined text-[18px]">refresh</span></button>
              </div>
            </div>
            <div class="overflow-x-auto">
              <table class="min-w-full text-sm">
                <thead class="text-[10px] uppercase tracking-wider text-slate-400"><tr class="border-b border-slate-100 dark:border-slate-800"><th class="text-left py-3 pr-4">Currency</th><th class="text-left py-3 px-4">Live rate</th><th class="text-left py-3 px-4">Manual override</th><th class="text-left py-3 px-4">Effective rate</th><th class="text-left py-3 pl-4">Source</th></tr></thead>
                <tbody id="subcontractingRatesTableBody" class="divide-y divide-slate-100 dark:divide-slate-800"></tbody>
              </table>
            </div>
          </div>
          <div class="bg-white dark:bg-slate-900/60 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 class="text-lg font-bold">Yearly Cost by Type and Subsystem</h3>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1" id="subcontractingTypeSubsystemNote">Yearly subcontracting cost by type and subsystem in the selected target currency.</p>
            <div class="overflow-x-auto mt-3">
              <table class="min-w-full text-sm">
                <thead class="text-[10px] uppercase tracking-wider text-slate-400"><tr class="border-b border-slate-100 dark:border-slate-800"><th class="text-left py-3 pr-4">Subsystem</th><th class="text-left py-3 px-4">Type</th><th class="text-right py-3 px-4">Yearly Cost</th><th class="text-right py-3 px-4">Total Cost</th><th class="text-right py-3 pl-4">Share</th></tr></thead>
                <tbody id="subcontractingTypeSubsystemTableBody" class="divide-y divide-slate-100 dark:divide-slate-800"><tr><td colspan="5" class="py-6 text-center text-sm text-slate-500 dark:text-slate-400">No subcontracting cost data available.</td></tr></tbody>
              </table>
            </div>
          </div>
        </div>
      </section>
    `;

    const schemaHint = $('schemaHint');
    if (schemaHint) {
      schemaHint.textContent =
        'Expected workbook sheets: "Planning Complet", "Technicians Needed Per Day", "Synthesis", "Corrective Planning", "DEQ_VMI_Planning", "Overhaul and Renewal Planning", and "Subcontracting Planning".';
    }

    loadStoredExchangeState();
    $('subcontractingCurrencyFilter')?.addEventListener('change', (e) => { state.currentMaterialCurrency = e.target.value; queueSharedSettingsSync(); renderSubcontractingDashboard(); });
    $('subcontractingEquipmentFilter')?.addEventListener('change', (e) => { state.currentSubcontractingEquipment = e.target.value; rebuildSubcontractingFilters(); renderSubcontractingDashboard(); });
    $('subcontractingActivityFilter')?.addEventListener('change', (e) => { state.currentSubcontractingActivity = e.target.value; rebuildSubcontractingFilters(); renderSubcontractingDashboard(); });
    $('subcontractingTypeFilter')?.addEventListener('change', (e) => { state.currentSubcontractingType = e.target.value; rebuildSubcontractingFilters(); renderSubcontractingDashboard(); });
    $('subcontractingFrequencyFilter')?.addEventListener('change', (e) => { state.currentSubcontractingFrequency = e.target.value; rebuildSubcontractingFilters(); renderSubcontractingDashboard(); });
    $('subcontractingPeriodDurationInput')?.addEventListener('input', (e) => {
      state.currentSubcontractingPeriodDuration = Math.max(0, Number(e.target.value || 0));
      renderSubcontractingDashboard();
    });
    $('subcontractingRefreshRatesBtn')?.addEventListener('click', async () => { await refreshExchangeRates(); });
    $('subcontractingRefreshRatesInlineBtn')?.addEventListener('click', async () => { await refreshExchangeRates(); });
    $('subcontractingResetOverridesBtn')?.addEventListener('click', () => { clearManualExchangeRates(); });
    $('subcontractingKpiTotalToggle')?.addEventListener('change', (e) => {
      state.showSubcontractingKpiTotal = !!e.target.checked;
      renderSubcontractingDashboard();
      renderSubcontractingTreeChart();
    });

    if (!state._subcontractingTreeResizeSetup) {
      state._subcontractingTreeResizeSetup = true;
      window.addEventListener('resize', () => {
        if (document.getElementById('view-subcontracting')?.classList.contains('hidden')) return;
        drawSubcontractingTreeConnectors();
      });
    }

    rebuildSubcontractingFilters();
    renderSubcontractingDashboard();
    refreshExchangeRates({ silent: true });
  }

  function renderSubcontractingDashboard() {
    if (!$('view-subcontracting') || $('view-subcontracting')?.dataset.ready !== "1") return;

    rebuildSubcontractingFilters();

    const rows = getFilteredSubcontractingRows();
    const cols = state.subcontractingColumns;
    const globalCostKpi = $('subcontractingGlobalCostKpi');
    const globalCostKpiHidden = $('subcontractingGlobalCostKpiHidden');
    const globalCostProjectList = $('subcontractingGlobalCostProjectList');
    const byCurrencyList = $('subcontractingGlobalCostByCurrencyList');
    const periodDurationInput = $('subcontractingPeriodDurationInput');
    const subcontractingKpiTotalToggle = $('subcontractingKpiTotalToggle');
    const periodDuration = getSubcontractingPeriodDuration();

    if (periodDurationInput) periodDurationInput.value = String(periodDuration);

    let totalGlobalCost = 0;
    const totalByProject = new Map();
    const rawByCurrencyByProject = new Map();
    rows.forEach((row) => {
      const project = getSubcontractingProjectLabel(row);
      const currency = cols.currency ? row?.[cols.currency] : "";
      const raw = cols.yearlyCost ? toNumber(row?.[cols.yearlyCost]) : 0;
      const converted = cols.yearlyCost ? convertAmount(raw, currency, state.currentMaterialCurrency) : null;
      const adjustedConverted = (converted ?? 0) * periodDuration;
      totalGlobalCost += adjustedConverted;
      totalByProject.set(project, (totalByProject.get(project) || 0) + adjustedConverted);
      const code = normalizeCurrencyCode(currency) || "N/A";
      if (!rawByCurrencyByProject.has(project)) rawByCurrencyByProject.set(project, new Map());
      const projectCurrencies = rawByCurrencyByProject.get(project);
      projectCurrencies.set(code, (projectCurrencies.get(code) || 0) + (raw * periodDuration));
    });

    if (subcontractingKpiTotalToggle) subcontractingKpiTotalToggle.checked = !!state.showSubcontractingKpiTotal;
    if (globalCostKpi) {
      globalCostKpi.textContent = formatCurrencyValue(totalGlobalCost, state.currentMaterialCurrency, 0);
      globalCostKpi.classList.toggle('hidden', !state.showSubcontractingKpiTotal);
    }
    if (globalCostKpiHidden) globalCostKpiHidden.classList.toggle('hidden', !!state.showSubcontractingKpiTotal);
    if (globalCostProjectList) {
      const items = Array.from(totalByProject.entries())
        .filter(([, value]) => value !== 0)
        .sort((a, b) => b[1] - a[1]);
      const projectColorMap = new Map(items.map(([project], index) => [project, colorForSeriesIndex(index)]));
      globalCostProjectList.innerHTML = items.length
        ? items.map(([project, value]) => `
            <div class="flex items-center justify-between gap-3">
              <div class="flex items-center gap-2 min-w-0">
                <span class="inline-block size-2.5 rounded-full shrink-0" style="background:${projectColorMap.get(project)};"></span>
                <span class="text-xs font-bold uppercase tracking-wider text-slate-400 truncate" title="${escapeHtml(project)}">${escapeHtml(project)}</span>
              </div>
              <span class="text-sm font-semibold text-slate-700 dark:text-slate-100">${escapeHtml(formatCurrencyValue(value, state.currentMaterialCurrency, 0))}</span>
            </div>
          `).join("")
        : `<p class="text-sm text-slate-500 dark:text-slate-400">No subcontracting costs available.</p>`;
    }
    if (byCurrencyList) {
      const items = Array.from(rawByCurrencyByProject.entries())
        .map(([project, currencies]) => ({
          project,
          currencies: Array.from(currencies.entries())
            .filter(([, value]) => value !== 0)
            .sort((a, b) => b[1] - a[1]),
        }))
        .filter((item) => item.currencies.length)
        .sort((a, b) => {
          const aTotal = a.currencies.reduce((sum, [, value]) => sum + value, 0);
          const bTotal = b.currencies.reduce((sum, [, value]) => sum + value, 0);
          return bTotal - aTotal;
        });
      const projectColorMap = new Map(items.map((item, index) => [item.project, colorForSeriesIndex(index)]));
      byCurrencyList.innerHTML = items.length
        ? items.map((item) => `
            <div class="space-y-1.5">
              <div class="flex items-center gap-2 min-w-0">
                <span class="inline-block size-2.5 rounded-full shrink-0" style="background:${projectColorMap.get(item.project)};"></span>
                <div class="text-xs font-bold uppercase tracking-wider text-slate-400 truncate" title="${escapeHtml(item.project)}">${escapeHtml(item.project)}</div>
              </div>
              ${item.currencies.map(([currency, value]) => `
                <div class="flex items-center justify-between gap-3 pl-3">
                  <span class="text-[11px] text-slate-500 dark:text-slate-400 uppercase">${escapeHtml(currency)}</span>
                  <span class="text-sm font-semibold text-slate-700 dark:text-slate-100">${escapeHtml(formatAmountWithCurrency(value, currency, 0))}</span>
                </div>
              `).join("")}
            </div>
          `).join("")
        : `<p class="text-sm text-slate-500 dark:text-slate-400">No subcontracting costs available.</p>`;
    }

    const lastUpdated = state.exchangeLastUpdated ? new Date(state.exchangeLastUpdated).toLocaleString("en-GB") : "";
    const meta = $('subcontractingRatesMeta');
    if (meta) meta.textContent = `Base ${state.exchangeBase} - 1 ${state.exchangeBase} = X currency`;
    const sourceHtml = state.exchangeProvider
      ? `Live source: <a class="text-primary underline underline-offset-2" href="https://www.exchangerate-api.com" target="_blank" rel="noreferrer">Rates By Exchange Rate API</a>${state.exchangeLastUpdated ? ` - updated ${escapeHtml(lastUpdated)}` : ""}`
      : "Live source pending";
    const sourceText = $('subcontractingRatesSourceText');
    if (sourceText) sourceText.innerHTML = sourceHtml;
    const inlineSourceText = $('subcontractingRatesSourceInlineText');
    if (inlineSourceText) inlineSourceText.innerHTML = sourceHtml;

    renderSubcontractingTreeChart();
    renderSubcontractingPieChart();
    renderSubcontractingActivityBars();
    renderSubcontractingRatesTable();
    renderSubcontractingTypeSubsystemTable();
  }

  function renderSubcontractingTreeChart() {
    const body = $('subcontractingTreeBody');
    const empty = $('subcontractingTreeEmpty');
    const subtitle = $('subcontractingTreeSubtitle');
    if (!body || !empty || !subtitle) return;

    const rows = getFilteredSubcontractingRows();
    const cols = state.subcontractingColumns;
    const byProject = new Map();
    let skipped = 0;

    rows.forEach((row) => {
      const raw = cols.yearlyCost ? toNumber(row?.[cols.yearlyCost]) : 0;
      const currency = cols.currency ? row?.[cols.currency] : "";
      const converted = cols.yearlyCost ? convertAmount(raw, currency, state.currentMaterialCurrency) : null;
      if (converted === null) {
        if (raw !== 0) skipped += 1;
        return;
      }
      if (converted <= 0) return;

      const project = getSubcontractingProjectLabel(row);
      const subsystem = cols.subsystem ? (String(row?.[cols.subsystem] ?? "").trim() || "Unspecified") : "Unspecified";
      const activity = cols.activity ? (String(row?.[cols.activity] ?? "").trim() || "Unspecified") : "Unspecified";

      let projectBucket = byProject.get(project);
      if (!projectBucket) {
        projectBucket = { label: project, total: 0, subsystems: new Map() };
        byProject.set(project, projectBucket);
      }
      projectBucket.total += converted;

      let subBucket = projectBucket.subsystems.get(subsystem);
      if (!subBucket) {
        subBucket = { label: subsystem, total: 0, activities: new Map() };
        projectBucket.subsystems.set(subsystem, subBucket);
      }
      subBucket.total += converted;
      subBucket.activities.set(activity, (subBucket.activities.get(activity) || 0) + converted);
    });

    const projects = Array.from(byProject.values()).sort((a, b) => b.total - a.total);
    subtitle.textContent = `Project > Subsystem > Activity - currency ${state.currentMaterialCurrency}${skipped ? ` - ${skipped} row(s) skipped because a conversion rate is missing` : ""}`;

    if (!projects.length) {
      body.innerHTML = "";
      empty.classList.remove('hidden');
      return;
    }

    empty.classList.add('hidden');
    const selectedProjectLabel = projects.some((item) => item.label === state.currentSubcontractingTreeProject)
      ? state.currentSubcontractingTreeProject
      : projects[0]?.label;
    state.currentSubcontractingTreeProject = selectedProjectLabel || "__AUTO__";

    const selectedProject = projects.find((item) => item.label === selectedProjectLabel) || projects[0];
    const subsystems = selectedProject
      ? Array.from(selectedProject.subsystems.values()).sort((a, b) => b.total - a.total)
      : [];
    const selectedSubsystemLabel = subsystems.some((item) => item.label === state.currentSubcontractingTreeSubsystem)
      ? state.currentSubcontractingTreeSubsystem
      : subsystems[0]?.label;
    state.currentSubcontractingTreeSubsystem = selectedSubsystemLabel || "__AUTO__";

    const selectedSubsystem = subsystems.find((item) => item.label === selectedSubsystemLabel) || subsystems[0] || null;
    const activities = selectedSubsystem
      ? Array.from(selectedSubsystem.activities.entries())
          .map(([label, value]) => ({ label, value }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 10)
      : [];

    const totalValue = projects.reduce((sum, item) => sum + item.total, 0);
    const maxProject = Math.max(1, ...projects.map((item) => item.total));
    const maxSubsystem = Math.max(1, ...subsystems.map((item) => item.total), 1);
    const maxActivity = Math.max(1, ...activities.map((item) => item.value), 1);

    const renderTreeNode = ({
      nodeId,
      parentId = "",
      label,
      value,
      widthPct,
      color,
      active = false,
      levelLabel,
      button = false,
      action = "",
      title = "",
      showValue = true,
      hiddenValueLabel = "",
    }) => {
      const tag = button ? "button" : "div";
      const attrs = [
        `data-tree-node-id="${escapeHtml(nodeId)}"`,
        parentId ? `data-tree-parent-id="${escapeHtml(parentId)}"` : "",
        active ? `data-tree-selected="1"` : `data-tree-selected="0"`,
        button ? `type="button"` : "",
        action ? `data-tree-action="${escapeHtml(action)}"` : "",
        title ? `title="${escapeHtml(title)}"` : "",
        `class="${button ? "w-full text-left" : "w-full"} group relative rounded-xl px-3 py-3 bg-white/90 dark:bg-slate-900/90 border ${active ? "border-blue-400 dark:border-blue-500 shadow-[0_0_0_1px_rgba(59,130,246,0.25)]" : "border-slate-200 dark:border-slate-800"} transition-all"`
      ].filter(Boolean).join(" ");
      return `
        <${tag} ${attrs}>
          <div class="absolute left-0 right-0 top-0 h-2 rounded-t-xl bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div class="h-full" style="width:${Math.max(2, Math.min(100, widthPct))}%; background:${color};"></div>
          </div>
          <div class="pt-3">
            ${levelLabel ? `<div class="text-[10px] font-bold uppercase tracking-wider ${active ? "text-blue-600 dark:text-blue-300" : "text-slate-400"}">${escapeHtml(levelLabel)}</div>` : ""}
            <div class="mt-1 text-[13px] leading-5 ${active ? "font-extrabold text-slate-900 dark:text-white" : "font-semibold text-slate-700 dark:text-slate-200"} truncate">${escapeHtml(label)}</div>
            ${showValue
              ? `<div class="mt-1 text-[12px] ${active ? "text-slate-700 dark:text-slate-200" : "text-slate-500 dark:text-slate-400"}">${escapeHtml(formatCurrencyValue(value, state.currentMaterialCurrency, 0))}</div>`
              : `<div class="mt-1 text-[12px] ${active ? "text-slate-700 dark:text-slate-200" : "text-slate-500 dark:text-slate-400"}">${escapeHtml(hiddenValueLabel || "Project split only")}</div>`
            }
          </div>
        </${tag}>
      `;
    };

    body.innerHTML = `
      <div class="relative overflow-x-auto">
        <div class="relative min-w-[1120px] pb-2" data-tree-surface>
          <svg id="subcontractingTreeSvg" class="pointer-events-none absolute inset-0 h-full w-full overflow-visible"></svg>
          <div class="relative z-10 grid gap-14 items-start" style="grid-template-columns: 220px 220px 220px 260px;">
            <div class="pt-24">
              ${renderTreeNode({
                nodeId: "root",
                label: "Yearly Subcontract",
                value: totalValue,
                widthPct: 100,
                color: "#1d4ed8",
                active: true,
                showValue: !!state.showSubcontractingKpiTotal,
                hiddenValueLabel: "Project split only",
              })}
            </div>
            <div class="space-y-6">
              ${projects.map((project, index) => renderTreeNode({
                nodeId: `project:${project.label}`,
                parentId: "root",
                label: project.label,
                value: project.total,
                widthPct: (project.total / maxProject) * 100,
                color: colorForSeriesIndex(index),
                active: project.label === selectedProjectLabel,
                levelLabel: "Project",
                button: true,
                action: `project:${project.label}`,
                title: project.label,
              })).join("")}
            </div>
            <div class="space-y-6">
              ${subsystems.map((sub, index) => renderTreeNode({
                nodeId: `subsystem:${sub.label}`,
                parentId: selectedProject ? `project:${selectedProject.label}` : "",
                label: sub.label,
                value: sub.total,
                widthPct: (sub.total / maxSubsystem) * 100,
                color: SUBCONTRACT_PIE_COLORS[index % SUBCONTRACT_PIE_COLORS.length],
                active: sub.label === selectedSubsystemLabel,
                levelLabel: "Subsystem",
                button: true,
                action: `subsystem:${sub.label}`,
                title: sub.label,
              })).join("")}
            </div>
            <div class="space-y-6">
              ${activities.map((activity, index) => renderTreeNode({
                nodeId: `activity:${activity.label}`,
                parentId: selectedSubsystem ? `subsystem:${selectedSubsystem.label}` : "",
                label: activity.label,
                value: activity.value,
                widthPct: (activity.value / maxActivity) * 100,
                color: SUBCONTRACT_TYPE_COLORS[index % SUBCONTRACT_TYPE_COLORS.length],
                active: index === 0,
                levelLabel: "Activity",
                title: activity.label,
              })).join("")}
            </div>
          </div>
        </div>
      </div>
    `;

    body.querySelectorAll('[data-tree-action]').forEach((node) => {
      node.addEventListener('click', () => {
        const action = node.getAttribute('data-tree-action') || "";
        if (action.startsWith("project:")) {
          state.currentSubcontractingTreeProject = action.slice("project:".length);
          state.currentSubcontractingTreeSubsystem = "__AUTO__";
        } else if (action.startsWith("subsystem:")) {
          state.currentSubcontractingTreeSubsystem = action.slice("subsystem:".length);
        }
        renderSubcontractingTreeChart();
      });
    });

    requestAnimationFrame(() => drawSubcontractingTreeConnectors());
  }

  function drawSubcontractingTreeConnectors() {
    const body = $('subcontractingTreeBody');
    const svg = $('subcontractingTreeSvg');
    const surface = body?.querySelector('[data-tree-surface]');
    if (!body || !svg || !surface) return;

    const surfaceRect = surface.getBoundingClientRect();
    if (!surfaceRect.width || !surfaceRect.height) return;

    svg.setAttribute('viewBox', `0 0 ${surfaceRect.width} ${surfaceRect.height}`);
    svg.setAttribute('width', `${surfaceRect.width}`);
    svg.setAttribute('height', `${surfaceRect.height}`);

    const nodeMap = new Map();
    surface.querySelectorAll('[data-tree-node-id]').forEach((node) => {
      const rect = node.getBoundingClientRect();
      nodeMap.set(node.getAttribute('data-tree-node-id'), {
        left: rect.left - surfaceRect.left,
        right: rect.right - surfaceRect.left,
        midY: rect.top - surfaceRect.top + (rect.height / 2),
      });
    });

    const paths = [];
    surface.querySelectorAll('[data-tree-parent-id]').forEach((node) => {
      const childId = node.getAttribute('data-tree-node-id');
      const parentId = node.getAttribute('data-tree-parent-id');
      const isSelected = node.getAttribute('data-tree-selected') === "1";
      const parent = nodeMap.get(parentId);
      const child = nodeMap.get(childId);
      if (!parent || !child) return;

      const startX = parent.right;
      const endX = child.left;
      const startY = parent.midY;
      const endY = child.midY;
      const delta = Math.max(28, (endX - startX) * 0.35);
      const color = isSelected ? "#1d4ed8" : "#93c5fd";
      const width = isSelected ? 2.4 : 1.5;
      paths.push(`
        <path
          d="M ${startX} ${startY} C ${startX + delta} ${startY}, ${endX - delta} ${endY}, ${endX} ${endY}"
          fill="none"
          stroke="${color}"
          stroke-width="${width}"
          stroke-linecap="round"
          opacity="${isSelected ? "1" : "0.9"}"></path>
      `);
    });

    svg.innerHTML = paths.join("");
  }

  function renderSubcontractingPieChart() {
    const svg = $('subcontractingPieSvg');
    const legend = $('subcontractingPieLegend');
    const empty = $('subcontractingPieEmpty');
    const centerValue = $('subcontractingPieCenterValue');
    const subtitle = $('subcontractingPieSubtitle');
    if (!svg || !legend || !empty || !centerValue || !subtitle) return;

    const rows = getFilteredSubcontractingRows();
    const cols = state.subcontractingColumns;
    const map = new Map();
    let skipped = 0;

    rows.forEach((row) => {
      const subsystem = cols.subsystem ? (String(row?.[cols.subsystem] ?? "").trim() || "Unspecified") : "Unspecified";
      const currency = cols.currency ? row?.[cols.currency] : "";
      const raw = cols.yearlyCost ? toNumber(row?.[cols.yearlyCost]) : 0;
      const converted = cols.yearlyCost ? convertAmount(raw, currency, state.currentMaterialCurrency) : null;
      if (converted === null) {
        if (raw !== 0) skipped += 1;
        return;
      }
      if (converted <= 0) return;
      map.set(subsystem, (map.get(subsystem) || 0) + converted);
    });

    const items = Array.from(map.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);
    const total = items.reduce((sum, item) => sum + item.value, 0);
    subtitle.textContent = `Selected target currency ${state.currentMaterialCurrency}${skipped ? ` - ${skipped} row(s) skipped due to missing conversion` : ""}`;
    centerValue.textContent = formatCurrencyValue(total, state.currentMaterialCurrency, 0);

    if (!items.length || total <= 0) {
      svg.innerHTML = "";
      legend.innerHTML = "";
      empty.classList.remove('hidden');
      return;
    }

    empty.classList.add('hidden');
    const radius = 24;
    const circumference = 2 * Math.PI * radius;
    let offset = 0;
    svg.innerHTML = `
      <circle cx="32" cy="32" r="${radius}" fill="none" stroke="#e2e8f0" stroke-width="10"></circle>
      ${items.map((item, index) => {
        const fraction = item.value / total;
        const dash = fraction * circumference;
        const stroke = SUBCONTRACT_PIE_COLORS[index % SUBCONTRACT_PIE_COLORS.length];
        const circle = `<circle cx="32" cy="32" r="${radius}" fill="none" stroke="${stroke}" stroke-width="10" stroke-dasharray="${dash} ${circumference - dash}" stroke-dashoffset="${-offset}"></circle>`;
        offset += dash;
        return circle;
      }).join("")}
    `;

    legend.innerHTML = items.map((item, index) => {
      const pct = total > 0 ? (item.value / total) * 100 : 0;
      const color = SUBCONTRACT_PIE_COLORS[index % SUBCONTRACT_PIE_COLORS.length];
      return `
        <div class="flex items-center justify-between gap-3">
          <div class="flex items-center gap-3 min-w-0">
            <span class="inline-block size-3 rounded-full flex-shrink-0" style="background:${color};"></span>
            <span class="text-sm font-medium truncate">${escapeHtml(item.label)}</span>
          </div>
          <div class="text-right">
            <div class="text-sm font-semibold">${pct.toFixed(1)}%</div>
            <div class="text-[11px] text-slate-500 dark:text-slate-400">${escapeHtml(formatCurrencyValue(item.value, state.currentMaterialCurrency, 0))}</div>
          </div>
        </div>
      `;
    }).join("");
  }

  function renderSubcontractingActivityBars() {
    const plot = $('subcontractingActivityBarsPlot');
    const empty = $('subcontractingActivityBarsEmpty');
    const subtitle = $('subcontractingActivityBarsSubtitle');
    const legend = $('subcontractingActivityBarsLegend');
    if (!plot || !empty || !subtitle || !legend) return;

    const rows = getFilteredSubcontractingRows();
    const cols = state.subcontractingColumns;
    const map = new Map();
    const projectTotals = new Map();
    let skipped = 0;

    rows.forEach((row) => {
      const activity = cols.activity ? (String(row?.[cols.activity] ?? "").trim() || "Unspecified") : "Unspecified";
      const project = getSubcontractingProjectLabel(row);
      const currency = cols.currency ? row?.[cols.currency] : "";
      const raw = cols.yearlyCost ? toNumber(row?.[cols.yearlyCost]) : 0;
      const converted = cols.yearlyCost ? convertAmount(raw, currency, state.currentMaterialCurrency) : null;
      if (converted === null) {
        if (raw !== 0) skipped += 1;
        return;
      }
      if (converted <= 0) return;
      const activityBucket = map.get(activity) || { label: activity, total: 0, projects: new Map() };
      activityBucket.total += converted;
      activityBucket.projects.set(project, (activityBucket.projects.get(project) || 0) + converted);
      map.set(activity, activityBucket);
      projectTotals.set(project, (projectTotals.get(project) || 0) + converted);
    });

    const items = Array.from(map.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 12);
    subtitle.textContent = `Grouped by project inside each activity - currency ${state.currentMaterialCurrency}${skipped ? ` - ${skipped} row(s) skipped due to missing conversion` : ""}`;

    if (!items.length) {
      legend.innerHTML = "";
      plot.innerHTML = "";
      empty.classList.remove('hidden');
      return;
    }

    empty.classList.add('hidden');
    const orderedProjects = Array.from(projectTotals.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([project]) => project);
    const projectColorMap = new Map(orderedProjects.map((project, index) => [project, colorForSeriesIndex(index)]));
    legend.innerHTML = orderedProjects.map((project) => `
      <div class="flex items-center gap-2">
        <span class="inline-block size-2.5 rounded-full" style="background:${projectColorMap.get(project)};"></span>
        <span class="truncate max-w-[160px]" title="${escapeHtml(project)}">${escapeHtml(project)}</span>
      </div>
    `).join("");

    const maxV = Math.max(
      1,
      ...items.flatMap((item) => Array.from(item.projects.values()))
    );
    plot.innerHTML = items.map((item) => {
      const projectItems = Array.from(item.projects.entries())
        .map(([project, value]) => ({ project, value }))
        .sort((a, b) => b.value - a.value);
      return `
        <div class="grid gap-3 items-start" style="grid-template-columns:minmax(180px,240px) minmax(0,1fr) auto;">
          <div class="pt-1 min-w-0">
            <p class="text-sm font-semibold truncate" title="${escapeHtml(item.label)}">${escapeHtml(item.label)}</p>
            <p class="text-[11px] text-slate-500 dark:text-slate-400">${projectItems.length} project(s)</p>
          </div>
          <div class="space-y-2 pt-1">
            ${projectItems.map((projectItem) => {
              const width = Math.max(2, (projectItem.value / maxV) * 100);
              const color = projectColorMap.get(projectItem.project) || "#137fec";
              return `
                <div class="space-y-1">
                  <div class="flex items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                    <span class="truncate" title="${escapeHtml(projectItem.project)}">${escapeHtml(projectItem.project)}</span>
                    <span>${escapeHtml(formatCurrencyValue(projectItem.value, state.currentMaterialCurrency, 0))}</span>
                  </div>
                  <div class="relative h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div class="absolute inset-y-0 left-0 rounded-full" style="width:${width}%; background:${color};"></div>
                  </div>
                </div>
              `;
            }).join("")}
          </div>
          <div class="pt-1 text-right">
            <div class="text-sm font-semibold">${escapeHtml(formatCurrencyValue(item.total, state.currentMaterialCurrency, 0))}</div>
            <div class="text-[11px] text-slate-500 dark:text-slate-400">Activity total</div>
          </div>
        </div>
      `;
    }).join("");
  }

  function renderSubcontractingRatesTable() {
    const tbody = $('subcontractingRatesTableBody');
    if (!tbody) return;

    const currencies = Array.from(new Set(
      []
        .concat(getCurrenciesInRowsByColumn(getSubcontractingBaseRows(), state.subcontractingColumns.currency))
        .concat(Object.keys(state.manualExchangeRates || {}))
        .concat([state.currentMaterialCurrency, state.exchangeBase])
        .filter(Boolean)
    )).sort((a, b) => a.localeCompare(b));

    if (!currencies.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
            Upload a sheet with Subcontracting Planning currency data to build the conversion table.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = currencies.map((currency) => {
      const liveRate = currency === state.exchangeBase ? 1 : Number(state.exchangeRates?.[currency]);
      const manualRate = Number(state.manualExchangeRates?.[currency]);
      const effectiveRate = getEffectiveRate(currency);
      const source = Number.isFinite(manualRate) && manualRate > 0 ? "Manual" : (Number.isFinite(liveRate) && liveRate > 0 ? "Live" : "Missing");
      return `
        <tr>
          <td class="py-3 pr-4 font-semibold">${escapeHtml(currency)}</td>
          <td class="py-3 px-4 text-slate-500 dark:text-slate-400">${escapeHtml(formatRate(liveRate))}</td>
          <td class="py-3 px-4">
            <div class="flex items-center gap-2">
              <input
                type="number"
                min="0"
                step="0.000001"
                class="w-32 rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                data-subcontracting-rate-input="${escapeHtml(currency)}"
                value="${Number.isFinite(manualRate) && manualRate > 0 ? manualRate : ""}"
                placeholder="optional">
              <button
                type="button"
                class="px-2.5 py-2 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                data-subcontracting-rate-clear="${escapeHtml(currency)}">
                Clear
              </button>
            </div>
          </td>
          <td class="py-3 px-4 font-semibold">${escapeHtml(formatRate(effectiveRate))}</td>
          <td class="py-3 pl-4">
            <span class="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold ${source === "Manual" ? "bg-amber-50 text-amber-700 border border-amber-200" : source === "Live" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200"}">
              ${source}
            </span>
          </td>
        </tr>
      `;
    }).join("");

    tbody.querySelectorAll('input[data-subcontracting-rate-input]').forEach((input) => {
      input.addEventListener('change', (e) => {
        const currency = e.target.getAttribute('data-subcontracting-rate-input');
        setManualExchangeRate(currency, e.target.value);
      });
    });
    tbody.querySelectorAll('button[data-subcontracting-rate-clear]').forEach((button) => {
      button.addEventListener('click', () => {
        const currency = button.getAttribute('data-subcontracting-rate-clear');
        setManualExchangeRate(currency, "");
      });
    });
  }

  function renderSubcontractingTypeSubsystemTable() {
    const tbody = $('subcontractingTypeSubsystemTableBody');
    const note = $('subcontractingTypeSubsystemNote');
    if (!tbody || !note) return;

    const periodDuration = getSubcontractingPeriodDuration();
    note.textContent = `Yearly subcontracting cost by type and subsystem in ${state.currentMaterialCurrency}. Total Cost = Yearly Cost × Period Duration (${periodDuration}).`;

    const rows = getFilteredSubcontractingRows();
    const cols = state.subcontractingColumns;
    const map = new Map();
    let skipped = 0;

    rows.forEach((row) => {
      const subsystem = cols.subsystem ? (String(row?.[cols.subsystem] ?? "").trim() || "Unspecified") : "Unspecified";
      const type = cols.type ? (String(row?.[cols.type] ?? "").trim() || "Unspecified") : "Unspecified";
      const currency = cols.currency ? row?.[cols.currency] : "";
      const raw = cols.yearlyCost ? toNumber(row?.[cols.yearlyCost]) : 0;
      const converted = cols.yearlyCost ? convertAmount(raw, currency, state.currentMaterialCurrency) : null;
      if (converted === null) {
        if (raw !== 0) skipped += 1;
        return;
      }
      if (converted <= 0) return;
      const key = `${subsystem}__${type}`;
      map.set(key, { subsystem, type, value: (map.get(key)?.value || 0) + converted });
    });

    const items = Array.from(map.values()).sort((a, b) => b.value - a.value);
    const total = items.reduce((sum, item) => sum + item.value, 0);

    if (!items.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
            No subcontracting type/subsystem costs available for the selected filters.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = items.map((item) => {
      const pct = total > 0 ? (item.value / total) * 100 : 0;
      const totalCost = item.value * periodDuration;
      return `
        <tr>
          <td class="py-3 pr-4 font-semibold">${escapeHtml(item.subsystem)}</td>
          <td class="py-3 px-4">${escapeHtml(item.type)}</td>
          <td class="py-3 px-4 text-right font-medium">${escapeHtml(formatCurrencyValue(item.value, state.currentMaterialCurrency, 0))}</td>
          <td class="py-3 px-4 text-right font-medium">${escapeHtml(formatCurrencyValue(totalCost, state.currentMaterialCurrency, 0))}</td>
          <td class="py-3 pl-4 text-right text-slate-500 dark:text-slate-300">${pct.toFixed(1)}%</td>
        </tr>
      `;
    }).join("");

    if (skipped > 0) note.textContent += ` ${skipped} row(s) skipped due to missing conversion rates.`;
  }

  function setupMaterialsLineHover() {
    if (state._materialsLineHoverSetup) return;
    state._materialsLineHoverSetup = true;

    const svg = $('materialsLineSvg');
    const tooltip = $('materialsLineTooltip');
    const outer = $('materialsLineCard');
    const ttYear = $('materialsTtYear');
    const ttValues = $('materialsTtValues');
    if (!svg || !tooltip || !outer || !ttYear || !ttValues) return;

    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

    const hide = () => {
      tooltip.classList.add('hidden');
      const hoverLine = $('materialsHoverLine');
      const hoverDots = $('materialsHoverDots');
      if (hoverLine) hoverLine.setAttribute('opacity', '0');
      if (hoverDots) hoverDots.innerHTML = '';
    };

    const update = (ev) => {
      const line = state._materialsLine;
      const hoverLine = $('materialsHoverLine');
      const hoverDots = $('materialsHoverDots');
      if (!line || !line.years?.length || !line.projectSeries?.length || !hoverLine || !hoverDots) {
        hide();
        return;
      }

      const rect = svg.getBoundingClientRect();
      const xPx = clamp(ev.clientX - rect.left, 0, rect.width);
      const ratio = rect.width ? xPx / rect.width : 0;
      const idx = clamp(Math.round(ratio * (line.years.length - 1)), 0, line.years.length - 1);
      const year = line.years[idx];
      const values = line.projectSeries
        .map((project) => ({
          label: project.label,
          color: project.color,
          total: project.dataset[idx]?.total || 0,
          reparable: project.dataset[idx]?.reparable || 0,
          totalPoint: project.totalPoints[idx],
          reparablePoint: project.reparablePoints[idx],
        }))
        .filter((project) => project.total > 0 || project.reparable > 0)
        .sort((a, b) => (b.total + b.reparable) - (a.total + a.reparable));
      const xSvg = values[0]?.totalPoint?.x ?? values[0]?.reparablePoint?.x ?? 0;

      hoverLine.setAttribute('x1', String(xSvg));
      hoverLine.setAttribute('x2', String(xSvg));
      hoverLine.setAttribute('opacity', '1');
      hoverDots.innerHTML = values.map((project) => `
        ${project.total > 0 ? `<circle cx="${xSvg.toFixed(1)}" cy="${project.totalPoint.y.toFixed(1)}" r="5" fill="${project.color}" stroke="#ffffff" stroke-width="2"></circle>` : ''}
        ${project.reparable > 0 ? `<circle cx="${xSvg.toFixed(1)}" cy="${project.reparablePoint.y.toFixed(1)}" r="5" fill="#ffffff" stroke="${project.color}" stroke-width="2"></circle>` : ''}
      `).join('');

      ttYear.textContent = `Year ${year}`;
      ttValues.innerHTML = values.map((project) => `
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <span class="inline-block size-2.5 rounded-full shrink-0" style="background:${project.color};"></span>
              <span class="truncate text-slate-700 dark:text-slate-100" title="${escapeHtml(project.label)}">${escapeHtml(project.label)}</span>
            </div>
            <div class="mt-1 flex flex-wrap items-center gap-3 pl-[18px] text-[10px] text-slate-500 dark:text-slate-300">
              <span>Total: ${escapeHtml(formatCurrencyValue(project.total, state.currentMaterialCurrency, 0))}</span>
              <span>Reparable: ${escapeHtml(formatCurrencyValue(project.reparable, state.currentMaterialCurrency, 0))}</span>
            </div>
          </div>
        </div>
      `).join('');

      tooltip.classList.remove('hidden');
      const outerRect = outer.getBoundingClientRect();
      let left = (ev.clientX - outerRect.left) + 12;
      const top = 72;
      const tipRect = tooltip.getBoundingClientRect();
      left = clamp(left, 12, outerRect.width - tipRect.width - 12);
      tooltip.style.left = `${left}px`;
      tooltip.style.top = `${top}px`;
    };

    svg.addEventListener('pointerenter', update);
    svg.addEventListener('pointermove', update);
    svg.addEventListener('pointerleave', hide);
  }

  const scopeBtn = $('scopeBtn');
  const scopePanel = $('scopePanel');
  const scopeCloseBtn = $('scopeCloseBtn');
  const scopeAllBtn = $('scopeAllBtn');
  const scopeNoneBtn = $('scopeNoneBtn');
  const scopeList = $('scopeList');
  const scopeSummary = $('scopeSummary');
  const subsystemWrap = $('subsystemWrap');

  function openScope() { scopePanel?.classList.remove('hidden'); }
  function closeScope() { scopePanel?.classList.add('hidden'); }
  function openProjectPanel() { projectPanel?.classList.remove('hidden'); }
  function closeProjectPanel() { projectPanel?.classList.add('hidden'); }
  function openSubsystemPanel() { subsystemPanel?.classList.remove('hidden'); }
  function closeSubsystemPanel() { subsystemPanel?.classList.add('hidden'); }
  function openContractDurationPanel() {
    renderContractDurationOverrides();
    contractDurationPanel?.classList.remove('hidden');
  }
  function closeContractDurationPanel() { contractDurationPanel?.classList.add('hidden'); }

  scopeBtn?.addEventListener('click', (e) => {
    e.preventDefault(); e.stopPropagation();
    scopePanel.classList.toggle('hidden');
    renderScopeList();
  });

  subsystemBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    subsystemPanel?.classList.toggle('hidden');
    rebuildSubsystemFilter();
  });

  contractDurationBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (contractDurationPanel?.classList.contains('hidden')) openContractDurationPanel();
    else closeContractDurationPanel();
  });

  scopeCloseBtn?.addEventListener('click', closeScope);
  projectBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    projectPanel?.classList.toggle('hidden');
    rebuildProjectFilters();
  });
  projectCloseBtn?.addEventListener('click', closeProjectPanel);
  subsystemCloseBtn?.addEventListener('click', closeSubsystemPanel);
  contractDurationCloseBtn?.addEventListener('click', closeContractDurationPanel);
  contractDurationResetBtn?.addEventListener('click', () => {
    state.manualContractDurationByProject = {};
    renderContractDurationOverrides();
    applyScopeProjectInfo();
    scheduleRender();
  });
  projectAllBtn?.addEventListener('click', () => {
    state.currentProjectName = "__ALL__";
    rebuildFilters();
    applyScopeProjectInfo();
    scheduleRender();
  });
  projectClearBtn?.addEventListener('click', () => {
    state.currentProjectName = [];
    rebuildFilters();
    applyScopeProjectInfo();
    scheduleRender();
  });
  subsystemAllBtn?.addEventListener('click', () => {
    state.currentSubsystem = "__ALL__";
    rebuildLists();
    rebuildActivityFilter();
    rebuildWorkloadDetailFilters();
    rebuildSubsystemFilter();
    scheduleRender();
  });
  subsystemClearBtn?.addEventListener('click', () => {
    state.currentSubsystem = [];
    rebuildLists();
    rebuildActivityFilter();
    rebuildWorkloadDetailFilters();
    rebuildSubsystemFilter();
    scheduleRender();
  });

  document.addEventListener('click', (e) => {
    const wrap = scopeBtn?.parentElement;
    if (wrap && !wrap.contains(e.target)) closeScope();
    if (projectWrap && !projectWrap.contains(e.target)) closeProjectPanel();
    if (subsystemWrap && !subsystemWrap.contains(e.target)) closeSubsystemPanel();
    if (contractDurationWrap && !contractDurationWrap.contains(e.target)) closeContractDurationPanel();
  });

  scopeAllBtn?.addEventListener('click', () => {
    state.activeFileIds = null; // ALL
    renderScopeList();
    applyScopeProjectInfo();
    rebuildFilters();
    scheduleRender();
  });

  scopeNoneBtn?.addEventListener('click', () => {
    state.activeFileIds = new Set(); // NONE
    renderScopeList();
    applyScopeProjectInfo();
    rebuildFilters();
    scheduleRender();
  });

  function renderScopeList() {
    if (!scopeList) return;

    if (!state.files.length) {
      scopeList.innerHTML = `
        <div class="p-3 rounded-lg border border-dashed border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-sm">
          Upload files first from <b>Data Sources</b>.
        </div>`;
      if (scopeSummary) scopeSummary.textContent = "All files";
      return;
    }

    const checkedAll = (state.activeFileIds === null);

    scopeList.innerHTML = state.files.map(f => {
      const meta = state.fileMeta[f.id] || {};
      const label = meta.label || f.name;
      const checked = checkedAll || (state.activeFileIds?.has(f.id));
      return `
        <label class="flex items-start gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer">
          <input type="checkbox" data-scope-id="${f.id}" ${checked ? "checked" : ""} class="mt-1 rounded border-slate-300 dark:border-slate-600">
          <div class="min-w-0">
            <p class="text-xs font-semibold truncate">${escapeHtml(label)}</p>
            <p class="text-[10px] text-slate-500 dark:text-slate-400 truncate">${escapeHtml(f.name)}</p>
          </div>
        </label>
      `;
    }).join("");

    // events
    scopeList.querySelectorAll('input[type="checkbox"][data-scope-id]').forEach(cb => {
      cb.addEventListener('change', (e) => {
        const id = e.target.getAttribute('data-scope-id');

        if (state.activeFileIds === null) {
          state.activeFileIds = new Set(state.files.map(x => x.id));
        }

        const pk = getProjectKeyForFileId(id);
        const related = pk ? getFileIdsForProjectKey(pk) : [id];

        if (e.target.checked) {
          related.forEach(fid => state.activeFileIds.add(fid));
        } else {
          related.forEach(fid => state.activeFileIds.delete(fid));
        }

        renderScopeList();
        applyScopeProjectInfo();
        rebuildFilters();
        scheduleRender();
      });
    });

    // summary
    if (scopeSummary) {
      if (state.activeFileIds === null) scopeSummary.textContent = "All files";
      else scopeSummary.textContent = `${state.activeFileIds.size} selected`;
    }
  }

  function setProjectInfoFields(ids, projectInfo) {
    const { name, type, lineLen, bidYear, serviceYear, contractDur } = projectInfo;
    const nameEl = $(ids.name);
    const typeEl = $(ids.type);
    const lineEl = $(ids.lineLength);
    const yearEl = $(ids.serviceYear);
    if (!nameEl || !typeEl || !lineEl || !yearEl) return;

    nameEl.textContent = name ?? "--";
    typeEl.textContent = type ?? "--";

    if (lineLen) {
      const txt = /km/i.test(lineLen) ? lineLen : `${lineLen} Km`;
      lineEl.innerHTML = `${txt} <span class="text-[10px] font-normal text-slate-400">STK</span>`;
    } else {
      lineEl.innerHTML = `-- <span class="text-[10px] font-normal text-slate-400">STK</span>`;
    }

    yearEl.textContent = `${bidYear || "--"} / ${serviceYear || "--"}`;

    const durationEl = $(ids.contractDuration);
    if (durationEl) durationEl.textContent = contractDur || "--";
  }

  function setProjectInfoUI(projectInfo) {
    [
      {
        name: 'projectName',
        type: 'projectType',
        lineLength: 'lineLength',
        serviceYear: 'serviceYear',
        contractDuration: 'contractDuration',
      },
      {
        name: 'materialsProjectName',
        type: 'materialsProjectType',
        lineLength: 'materialsLineLength',
        serviceYear: 'materialsServiceYear',
        contractDuration: 'materialsContractDuration',
      },
      {
        name: 'overhaulProjectName',
        type: 'overhaulProjectType',
        lineLength: 'overhaulLineLength',
        serviceYear: 'overhaulServiceYear',
        contractDuration: 'overhaulContractDuration',
      },
      {
        name: 'subcontractingProjectName',
        type: 'subcontractingProjectType',
        lineLength: 'subcontractingLineLength',
        serviceYear: 'subcontractingServiceYear',
        contractDuration: 'subcontractingContractDuration',
      },
    ].forEach((ids) => setProjectInfoFields(ids, projectInfo));
  }

  function applyScopeProjectInfo() {
    if (!state.files.length) return;

    // 1) fileIds sélectionnés
    // ✅ Scope + Project Name/Type
    const ids = getEffectiveFileIds().filter(Boolean);

    // 2) projectKeys sélectionnés (unique)
    const projectKeys = Array.from(
      new Set(ids.map(getProjectKeyForFileId).filter(Boolean))
    );

    // 0 projet
    if (projectKeys.length === 0) {
      setProjectInfoUI({
        name: "No project selected",
        type: "—",
        lineLen: "",
        bidYear: "",
        serviceYear: "",
        contractDur: ""
      });
      return;
    }

    // 1 projet (même si plusieurs fichiers)
    if (projectKeys.length === 1) {
      const pk = projectKeys[0];

      // choisir un fichier "représentatif" de ce projet :
      // priorité à output_planning (car il a les infos les plus complètes), sinon hours_report
      const candidateIds = ids.filter(id => getProjectKeyForFileId(id) === pk);
      const repId =
        candidateIds.find(id => state.fileMeta[id]?.kind === "output_planning") ||
        candidateIds.find(id => state.fileMeta[id]?.kind === "hours_report") ||
        candidateIds[0];

      const gp = state.fileMeta[repId]?.gp || {};
      const get = (k) => gp[k] !== undefined && gp[k] !== null ? String(gp[k]).trim() : "";
      const contractDurationInfo = getResolvedContractDurationInfo(gp, getProjectKeyForFileId(repId));

      setProjectInfoUI({
        name: get("project_name") || get("project") || state.fileMeta[repId]?.name || "—",
        type: get("project_type") || "—",
        lineLen: get("l_total_single_track"),
        bidYear: get("bid_year"),
        serviceYear: get("service_year"),
        contractDur: contractDurationInfo.label === "—" ? "" : contractDurationInfo.label
      });
      return;
    }

    // Plusieurs projets
    setProjectInfoUI({
      name: `${projectKeys.length} projects selected`,
      type: "Multiple",
      lineLen: "",
      bidYear: "",
      serviceYear: "",
      contractDur: ""
    });
  }

  function normalizeBenchmarkSubsystem(value) {
    const key = normalizeKey(value);
    if (key === "3rdrail" || key === "3rd_rail" || key === "third_rail") return "3rd_Rail";
    if (key === "pos") return "POS";
    if (key === "psd") return "PSD";
    if (key === "afc") return "AFC";
    if (key === "deq") return "DEQ";
    if (key === "vmi") return "VMI";
    if (key === "mep") return "MEP";
    if (key === "track") return "Track";
    if (key === "cat") return "CAT";
    return String(value ?? "").trim() || "Unspecified";
  }

  function computeBenchmarkAdjustedValue(subsystem, rawValue, gp = {}) {
    const raw = rawValue ?? 0;
    const key = normalizeBenchmarkSubsystem(subsystem);
    const getNum = (name) => toNumber(gp?.[name]);
    const lineLength = getNum("l_total_single_track");
    const traction = getNum("number_of_traction_substation");
    const auxiliary = getNum("number_of_auxiliary_substation");
    const mv = getNum("number_of_mv_substation");
    const stations = getNum("number_of_station");
    const apsdPerWall = getNum("apsd_per_wall");
    const wallsPerStation = getNum("walls_per_station");
    const turnoutCount = getNum("switch") + (getNum("diamond_crossing") * 4) + (getNum("crossover") * 2);

    if (key === "POS") {
      const denom = traction + auxiliary + mv;
      return denom > 0 ? raw / denom : 0;
    }
    if (key === "PSD") {
      const denom = stations * apsdPerWall * wallsPerStation;
      return denom > 0 ? raw / denom : 0;
    }
    if (key === "AFC") {
      return stations > 0 ? raw / stations : 0;
    }
    if (key === "Track") {
      if (state.currentBenchmarkTrackDriver === "turnout") {
        return turnoutCount > 0 ? raw / turnoutCount : 0;
      }
      return lineLength > 0 ? raw / lineLength : 0;
    }
    if (key === "3rd_Rail" || key === "CAT") {
      return lineLength > 0 ? raw / lineLength : 0;
    }
    return raw;
  }

  function getBenchmarkDriverInfo(subsystem, gp = {}) {
    const key = normalizeBenchmarkSubsystem(subsystem);
    const getNum = (name) => toNumber(gp?.[name]);
    const lineLength = getNum("l_total_single_track");
    const traction = getNum("number_of_traction_substation");
    const auxiliary = getNum("number_of_auxiliary_substation");
    const mv = getNum("number_of_mv_substation");
    const stations = getNum("number_of_station");
    const apsdPerWall = getNum("apsd_per_wall");
    const wallsPerStation = getNum("walls_per_station");
    const turnoutCount = getNum("switch") + (getNum("diamond_crossing") * 4) + (getNum("crossover") * 2);

    if (key === "POS") {
      return {
        basisLabel: "Substations",
        basisValue: traction + auxiliary + mv,
        detail: `${formatInt(traction)} traction + ${formatInt(auxiliary)} auxiliary + ${formatInt(mv)} MV`,
      };
    }
    if (key === "PSD") {
      return {
        basisLabel: "APSD",
        basisValue: stations * apsdPerWall * wallsPerStation,
        detail: `${formatInt(stations)} station(s) x ${formatInt(apsdPerWall)} APSD/wall x ${formatInt(wallsPerStation)} wall(s)/station`,
      };
    }
    if (key === "AFC") {
      return {
        basisLabel: "Station",
        basisValue: stations,
        detail: `${formatInt(stations)} station(s)`,
      };
    }
    if (key === "Track") {
      if (state.currentBenchmarkTrackDriver === "turnout") {
        return {
          basisLabel: "Turnout",
          basisValue: turnoutCount,
          detail: `${formatInt(getNum("switch"))} switch + ${formatInt(getNum("diamond_crossing"))} diamond crossing x4 + ${formatInt(getNum("crossover"))} crossover x2`,
        };
      }
      return {
        basisLabel: "Km single track",
        basisValue: lineLength,
        detail: `L_total_single_track = ${lineLength || 0}`,
      };
    }
    if (key === "3rd_Rail" || key === "CAT") {
      return {
        basisLabel: "Km single track",
        basisValue: lineLength,
        detail: `L_total_single_track = ${lineLength || 0}`,
      };
    }
    return {
      basisLabel: "Project",
      basisValue: 1,
      detail: "No driver division applied beyond project scope",
    };
  }

  function computeBenchmarkCostAdjustedValue(subsystem, rawValue, gp = {}) {
    const raw = rawValue ?? 0;
    const key = normalizeBenchmarkSubsystem(subsystem);
    const getNum = (name) => toNumber(gp?.[name]);
    const lineLength = getNum("l_total_single_track");
    const traction = getNum("number_of_traction_substation");
    const auxiliary = getNum("number_of_auxiliary_substation");
    const mv = getNum("number_of_mv_substation");
    const stations = getNum("number_of_station");
    const apsdPerWall = getNum("apsd_per_wall");
    const wallsPerStation = getNum("walls_per_station");
    const turnoutCount = getNum("switch") + (getNum("diamond_crossing") * 4) + (getNum("crossover") * 2);

    if (key === "POS") {
      const denom = traction + auxiliary + mv;
      return denom > 0 ? raw / denom : 0;
    }
    if (key === "PSD") {
      const denom = stations * apsdPerWall * wallsPerStation;
      return denom > 0 ? raw / denom : 0;
    }
    if (key === "AFC") {
      return stations > 0 ? raw / stations : 0;
    }
    if (key === "Track") {
      if (state.currentBenchmarkCostTrackDriver === "km_single_track") {
        return lineLength > 0 ? raw / lineLength : 0;
      }
      return turnoutCount > 0 ? raw / turnoutCount : 0;
    }
    if (key === "3rd_Rail" || key === "CAT") {
      return lineLength > 0 ? raw / lineLength : 0;
    }
    return raw;
  }

  function getBenchmarkCostDriverInfo(subsystem, gp = {}) {
    const key = normalizeBenchmarkSubsystem(subsystem);
    const getNum = (name) => toNumber(gp?.[name]);
    const lineLength = getNum("l_total_single_track");
    const traction = getNum("number_of_traction_substation");
    const auxiliary = getNum("number_of_auxiliary_substation");
    const mv = getNum("number_of_mv_substation");
    const stations = getNum("number_of_station");
    const apsdPerWall = getNum("apsd_per_wall");
    const wallsPerStation = getNum("walls_per_station");
    const turnoutCount = getNum("switch") + (getNum("diamond_crossing") * 4) + (getNum("crossover") * 2);

    if (key === "POS") {
      return {
        basisLabel: "Substations",
        basisValue: traction + auxiliary + mv,
        detail: `${formatInt(traction)} traction + ${formatInt(auxiliary)} auxiliary + ${formatInt(mv)} MV`,
      };
    }
    if (key === "PSD") {
      return {
        basisLabel: "APSD",
        basisValue: stations * apsdPerWall * wallsPerStation,
        detail: `${formatInt(stations)} station(s) x ${formatInt(apsdPerWall)} APSD/wall x ${formatInt(wallsPerStation)} wall(s)/station`,
      };
    }
    if (key === "AFC") {
      return {
        basisLabel: "Station",
        basisValue: stations,
        detail: `${formatInt(stations)} station(s)`,
      };
    }
    if (key === "Track") {
      if (state.currentBenchmarkCostTrackDriver === "km_single_track") {
        return {
          basisLabel: "Km single track",
          basisValue: lineLength,
          detail: `L_total_single_track = ${lineLength || 0}`,
        };
      }
      return {
        basisLabel: "Turnout",
        basisValue: turnoutCount,
        detail: `${formatInt(getNum("switch"))} switch + ${formatInt(getNum("diamond_crossing"))} diamond crossing x4 + ${formatInt(getNum("crossover"))} crossover x2`,
      };
    }
    if (key === "3rd_Rail" || key === "CAT") {
      return {
        basisLabel: "Km single track",
        basisValue: lineLength,
        detail: `L_total_single_track = ${lineLength || 0}`,
      };
    }
    return {
      basisLabel: "Project",
      basisValue: 1,
      detail: "No driver division applied beyond project scope",
    };
  }

  function getBenchmarkContractDuration(gp = {}) {
    return getResolvedContractDurationInfo(gp).value;
  }

  function computeBenchmarkGlobalCostAdjustedValue(subsystem, rawValue, gp = {}) {
    const raw = rawValue ?? 0;
    const key = normalizeBenchmarkSubsystem(subsystem);
    const getNum = (name) => toNumber(gp?.[name]);
    const lineLength = getNum("l_total_single_track");
    const traction = getNum("number_of_traction_substation");
    const auxiliary = getNum("number_of_auxiliary_substation");
    const mv = getNum("number_of_mv_substation");
    const stations = getNum("number_of_station");
    const apsdPerWall = getNum("apsd_per_wall");
    const wallsPerStation = getNum("walls_per_station");
    const turnoutCount = getNum("switch") + (getNum("diamond_crossing") * 4) + (getNum("crossover") * 2);
    const contractDuration = getBenchmarkContractDuration(gp);
    if (contractDuration <= 0) return 0;

    if (key === "POS") {
      const denom = (traction + auxiliary + mv) * contractDuration;
      return denom > 0 ? raw / denom : 0;
    }
    if (key === "PSD") {
      const denom = (stations * apsdPerWall * wallsPerStation) * contractDuration;
      return denom > 0 ? raw / denom : 0;
    }
    if (key === "AFC") {
      const denom = stations * contractDuration;
      return denom > 0 ? raw / denom : 0;
    }
    if (key === "Track") {
      if (state.currentBenchmarkGlobalCostTrackDriver === "turnout") {
        const denom = turnoutCount * contractDuration;
        return denom > 0 ? raw / denom : 0;
      }
      const denom = lineLength * contractDuration;
      return denom > 0 ? raw / denom : 0;
    }
    if (key === "3rd_Rail" || key === "CAT") {
      const denom = lineLength * contractDuration;
      return denom > 0 ? raw / denom : 0;
    }
    return raw / contractDuration;
  }

  function getBenchmarkGlobalCostDriverInfo(subsystem, gp = {}) {
    const key = normalizeBenchmarkSubsystem(subsystem);
    const getNum = (name) => toNumber(gp?.[name]);
    const lineLength = getNum("l_total_single_track");
    const traction = getNum("number_of_traction_substation");
    const auxiliary = getNum("number_of_auxiliary_substation");
    const mv = getNum("number_of_mv_substation");
    const stations = getNum("number_of_station");
    const apsdPerWall = getNum("apsd_per_wall");
    const wallsPerStation = getNum("walls_per_station");
    const turnoutCount = getNum("switch") + (getNum("diamond_crossing") * 4) + (getNum("crossover") * 2);
    const contractDuration = getBenchmarkContractDuration(gp);

    if (key === "POS") {
      const substationCount = traction + auxiliary + mv;
      return {
        basisLabel: "Substations x Contract duration",
        basisValue: substationCount * contractDuration,
        detail: `${formatInt(substationCount)} substations x ${formatCompactNumber(contractDuration, 1)} year(s)`,
      };
    }
    if (key === "PSD") {
      const apsdCount = stations * apsdPerWall * wallsPerStation;
      return {
        basisLabel: "APSD x Contract duration",
        basisValue: apsdCount * contractDuration,
        detail: `${formatInt(apsdCount)} APSD x ${formatCompactNumber(contractDuration, 1)} year(s)`,
      };
    }
    if (key === "AFC") {
      return {
        basisLabel: "Stations x Contract duration",
        basisValue: stations * contractDuration,
        detail: `${formatInt(stations)} station(s) x ${formatCompactNumber(contractDuration, 1)} year(s)`,
      };
    }
    if (key === "Track") {
      if (state.currentBenchmarkGlobalCostTrackDriver === "turnout") {
        return {
          basisLabel: "Turnout x Contract duration",
          basisValue: turnoutCount * contractDuration,
          detail: `${formatInt(turnoutCount)} turnout(s) x ${formatCompactNumber(contractDuration, 1)} year(s)`,
        };
      }
      return {
        basisLabel: "Km single track x Contract duration",
        basisValue: lineLength * contractDuration,
        detail: `${formatCompactNumber(lineLength, 2)} km x ${formatCompactNumber(contractDuration, 1)} year(s)`,
      };
    }
    if (key === "3rd_Rail" || key === "CAT") {
      return {
        basisLabel: "Km single track x Contract duration",
        basisValue: lineLength * contractDuration,
        detail: `${formatCompactNumber(lineLength, 2)} km x ${formatCompactNumber(contractDuration, 1)} year(s)`,
      };
    }
    return {
      basisLabel: "Contract duration",
      basisValue: contractDuration,
      detail: `${formatCompactNumber(contractDuration, 1)} year(s)`,
    };
  }

  function initBenchmarkView() {
    const view = $('view-benchmark');
    if (!view || view.dataset.ready === "1") return;
    view.dataset.ready = "1";
    view.innerHTML = `
      <section class="pt-8 space-y-6">
        <div class="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-5">
          <div class="flex flex-col 2xl:flex-row 2xl:items-start justify-between gap-6">
            <div class="space-y-2 max-w-3xl">
              <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold uppercase tracking-[0.18em]">
                <span class="material-symbols-outlined text-[16px]">query_stats</span>
                Benchmark &amp; Cost drivers
              </div>
              <div>
                <h2 class="text-3xl font-black tracking-tight">Benchmark &amp; Cost drivers</h2>
                <p class="text-sm text-slate-500 dark:text-slate-400 mt-2">
                  Cross-project benchmark of technician intensity by subsystem and project context.
                </p>
              </div>
            </div>

            <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex flex-wrap gap-6 items-center 2xl:max-w-[68%]">
              <div class="flex items-center gap-3">
                <div class="bg-primary opacity-10 text-primary p-2 rounded-lg">
                  <span class="material-symbols-outlined text-[20px]">location_on</span>
                </div>
                <div>
                  <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Project Name</p>
                  <p class="text-sm font-bold" id="benchmarkProjectName">--</p>
                </div>
              </div>
              <div class="w-px h-8 bg-slate-100 dark:bg-slate-800 hidden md:block"></div>
              <div>
                <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Project Type</p>
                <p class="text-sm font-bold" id="benchmarkProjectType">--</p>
              </div>
              <div class="w-px h-8 bg-slate-100 dark:bg-slate-800 hidden md:block"></div>
              <div>
                <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Line Length</p>
                <p class="text-sm font-bold" id="benchmarkLineLength">-- <span class="text-[10px] font-normal text-slate-400">STK</span></p>
              </div>
              <div class="w-px h-8 bg-slate-100 dark:bg-slate-800 hidden md:block"></div>
              <div>
                <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Bid / Service Year</p>
                <p class="text-sm font-bold" id="benchmarkServiceYear">-- / --</p>
              </div>
              <div class="w-px h-8 bg-slate-100 dark:bg-slate-800 hidden md:block"></div>
              <div>
                <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Contract Duration</p>
                <p class="text-sm font-bold" id="benchmarkContractDuration">--</p>
              </div>
              <div class="w-px h-8 bg-slate-100 dark:bg-slate-800 hidden md:block"></div>
              <div>
                <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Project Context</p>
                <p class="text-sm font-bold" id="benchmarkProjectContext">--</p>
              </div>
            </div>
          </div>

        </div>

        <div id="benchmarkDriverKpiGrid" class="grid grid-cols-1 xl:grid-cols-7 gap-6">
          <div class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/70 p-4 min-h-[196px] flex flex-col">
            <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Turnout</p>
            <p class="mt-2 text-3xl font-black" id="benchmarkTurnoutKpi">0</p>
            <p id="benchmarkTurnoutKpiHidden" class="hidden mt-2 text-xs text-slate-500 dark:text-slate-400">Project split only</p>
            <div id="benchmarkTurnoutProjectList" class="mt-3 space-y-2 overflow-y-auto custom-scrollbar max-h-[110px]">
              <p class="text-sm text-slate-500 dark:text-slate-400">No project data available.</p>
            </div>
            <p class="mt-2 text-xs text-slate-500 dark:text-slate-400 mt-auto">Computed as switch + 4 × diamond crossing + 2 × crossover.</p>
          </div>

          <div class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/70 p-4 min-h-[196px] flex flex-col">
            <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Substation</p>
            <p class="mt-2 text-3xl font-black" id="benchmarkSubstationKpi">0</p>
            <p id="benchmarkSubstationKpiHidden" class="hidden mt-2 text-xs text-slate-500 dark:text-slate-400">Project split only</p>
            <div id="benchmarkSubstationProjectList" class="mt-3 space-y-2 overflow-y-auto custom-scrollbar max-h-[110px]">
              <p class="text-sm text-slate-500 dark:text-slate-400">No project data available.</p>
            </div>
            <p class="mt-2 text-xs text-slate-500 dark:text-slate-400 mt-auto">Traction + auxiliary + MV substations.</p>
          </div>

          <div class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/70 p-4 min-h-[196px] flex flex-col">
            <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total APSD</p>
            <p class="mt-2 text-3xl font-black" id="benchmarkApsdKpi">0</p>
            <p id="benchmarkApsdKpiHidden" class="hidden mt-2 text-xs text-slate-500 dark:text-slate-400">Project split only</p>
            <div id="benchmarkApsdProjectList" class="mt-3 space-y-2 overflow-y-auto custom-scrollbar max-h-[110px]">
              <p class="text-sm text-slate-500 dark:text-slate-400">No project data available.</p>
            </div>
            <p class="mt-2 text-xs text-slate-500 dark:text-slate-400 mt-auto">Stations × APSD per wall × walls per station.</p>
          </div>

          <div class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/70 p-4 min-h-[196px] flex flex-col">
            <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Number of Station</p>
            <p class="mt-2 text-3xl font-black" id="benchmarkStationsKpi">0</p>
            <p id="benchmarkStationsKpiHidden" class="hidden mt-2 text-xs text-slate-500 dark:text-slate-400">Project split only</p>
            <div id="benchmarkStationsProjectList" class="mt-3 space-y-2 overflow-y-auto custom-scrollbar max-h-[110px]">
              <p class="text-sm text-slate-500 dark:text-slate-400">No project data available.</p>
            </div>
            <p class="mt-2 text-xs text-slate-500 dark:text-slate-400 mt-auto">Raw value from General Parameters.</p>
          </div>

          <div class="xl:col-span-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-6 shadow-sm">
            <div class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/70 p-4 space-y-3 h-full">
              <div class="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Exchange Rates</p>
                  <p class="mt-1 text-sm font-semibold" id="benchmarkRatesMeta">Base USD - 1 USD = X currency</p>
                </div>
                <div class="flex items-center gap-2">
                  <label class="min-w-[150px]">
                    <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Currency</p>
                    <select id="benchmarkCurrencyFilter" class="mt-1 w-full text-sm rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2">
                      <option value="USD">USD</option>
                    </select>
                  </label>
                  <button id="benchmarkRefreshRatesBtn" type="button" class="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl bg-slate-900 text-white border border-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:border-white dark:hover:bg-slate-100 transition-all">
                    <span class="material-symbols-outlined text-[16px] leading-none">refresh</span>
                    <span>Refresh live rates</span>
                  </button>
                  <button id="benchmarkResetOverridesBtn" type="button" class="px-3 py-2 text-xs font-semibold rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">Reset manual</button>
                </div>
              </div>
              <p class="text-[11px] text-slate-500 dark:text-slate-400">
                Live rates are refreshed from the internet. Every row in the conversion table can be adjusted manually.
              </p>
              <p class="text-xs text-slate-500 dark:text-slate-400" id="benchmarkRatesSourceText">Live source pending</p>
            </div>
          </div>
          <div class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/70 p-4 min-h-[196px] flex flex-col gap-3">
            <div>
              <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Display</p>
              <p class="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Project Sum on KPI cards</p>
              <p class="mt-1 text-[11px] text-slate-500 dark:text-slate-400">Show or hide the aggregated total on Total Turnout, Total Substation, Total APSD and Number of Station.</p>
            </div>
            <label class="inline-flex items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 cursor-pointer mt-auto">
              <span class="text-xs font-semibold text-slate-600 dark:text-slate-300">Show total</span>
              <input id="benchmarkDriverKpiTotalToggle" type="checkbox" class="rounded border-slate-300 dark:border-slate-600 text-primary" checked>
            </label>
          </div>
        </div>

        <div class="grid grid-cols-1 2xl:grid-cols-[minmax(0,1.35fr)_420px] gap-6">
          <div id="benchmarkBarsCard" class="relative bg-white dark:bg-slate-900/60 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div class="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-6">
              <div>
                <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold uppercase tracking-[0.18em] mb-3">
                  <span class="material-symbols-outlined text-[16px]">engineering</span>
                  Workload
                </div>
                <h3 class="text-lg font-bold">Technicians Benchmark by Subsystem</h3>
                <p class="text-xs text-slate-500 dark:text-slate-400 mt-1" id="benchmarkBarsSubtitle"></p>
              </div>
              <div class="flex flex-col items-start lg:items-end gap-3">
                <label class="min-w-[200px]">
                  <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Track Cost Driver</p>
                  <select id="benchmarkTrackDriverSelect" class="mt-1 w-full text-sm rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2">
                    <option value="km_single_track">Km single track</option>
                    <option value="turnout">Turnout</option>
                  </select>
                </label>
                <div id="benchmarkBarsLegend" class="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400"></div>
              </div>
            </div>
            <div class="relative" style="height: 360px;">
              <div class="absolute left-0 top-0 bottom-10 flex flex-col justify-between pr-3 text-[11px] font-bold text-slate-400" style="width:84px;" id="benchmarkBarsYAxis"><span>0</span><span>0</span><span>0</span><span>0</span></div>
              <div class="h-full" style="margin-left:84px;">
                <svg id="benchmarkBarsSvg" class="w-full h-[320px]" viewBox="0 0 1000 320" preserveAspectRatio="none"></svg>
                <div id="benchmarkBarsLabels" class="mt-2 grid gap-2 text-[11px] font-semibold text-slate-400"></div>
              </div>
              <div id="benchmarkBarsEmpty" class="hidden absolute inset-0 flex items-center justify-center text-sm text-slate-500 dark:text-slate-400">No benchmark data available for the selected filters.</div>
            </div>
            <div class="mt-6">
              <div class="flex items-center justify-between gap-3 mb-3">
                <h4 class="text-sm font-bold">Technician Benchmark Detail</h4>
                <p class="text-[11px] text-slate-500 dark:text-slate-400">Total and normalized technicians by subsystem and project.</p>
              </div>
              <div class="overflow-x-auto">
                <table class="min-w-full text-sm">
                  <thead id="benchmarkBarsTableHead" class="text-[10px] uppercase tracking-wider text-slate-400">
                    <tr class="border-b border-slate-100 dark:border-slate-800">
                      <th class="text-left py-3 pr-4">Subsystem</th>
                      <th class="text-right py-3 px-4">Total Technicians</th>
                      <th class="text-right py-3 pl-4">Normalized Technicians</th>
                    </tr>
                  </thead>
                  <tbody id="benchmarkBarsTableBody" class="divide-y divide-slate-100 dark:divide-slate-800">
                    <tr>
                      <td colspan="3" class="py-6 text-center text-sm text-slate-500 dark:text-slate-400">No benchmark data available.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div id="benchmarkBarsTooltip" class="pointer-events-none absolute z-10 hidden" style="min-width:280px;">
              <div class="bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm px-3 py-2">
                <div id="benchmarkBarsTooltipTitle" class="text-[11px] font-semibold text-slate-700 dark:text-slate-200"></div>
                <div id="benchmarkBarsTooltipValue" class="mt-1 text-[11px] text-slate-500 dark:text-slate-300"></div>
                <div id="benchmarkBarsTooltipDriver" class="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700 text-[10px] text-slate-500 dark:text-slate-300"></div>
              </div>
            </div>
          </div>

          <div id="benchmarkPieCard" class="relative bg-white dark:bg-slate-900/60 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
            <div>
              <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold uppercase tracking-[0.18em] mb-3">
                <span class="material-symbols-outlined text-[16px]">engineering</span>
                Workload
              </div>
              <h3 class="text-lg font-bold">Technician Share by Subsystem</h3>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-1" id="benchmarkPieSubtitle"></p>
            </div>
            <div class="flex-1 flex flex-col items-center justify-center py-6">
              <div class="relative size-64">
                <svg id="benchmarkPieSvg" class="size-full -rotate-90" viewBox="0 0 64 64"></svg>
                <div class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center px-8">
                  <span class="text-3xl font-black leading-none" id="benchmarkPieCenterValue">0</span>
                  <span class="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 mt-2">Technicians</span>
                </div>
              </div>
              <div id="benchmarkPieLegend" class="mt-6 w-full space-y-3"></div>
              <div id="benchmarkPieEmpty" class="hidden py-12 text-sm text-slate-500 dark:text-slate-400">No subsystem share available for the selected filters.</div>
            </div>
            <div id="benchmarkPieTooltip" class="pointer-events-none absolute z-10 hidden" style="min-width:260px;">
              <div class="bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm px-3 py-2">
                <div id="benchmarkPieTooltipTitle" class="text-[11px] font-semibold text-slate-700 dark:text-slate-200"></div>
                <div id="benchmarkPieTooltipValue" class="mt-1 text-[11px] text-slate-500 dark:text-slate-300"></div>
                <div id="benchmarkPieTooltipProjects" class="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700 space-y-1 text-[11px]"></div>
              </div>
            </div>
          </div>
        </div>

        <div class="space-y-6">
          <div class="grid grid-cols-1 2xl:grid-cols-[minmax(0,1.25fr)_minmax(420px,0.95fr)] gap-6">
            <div id="benchmarkCostLineCard" class="bg-white dark:bg-slate-900/60 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div class="flex flex-col xl:flex-row xl:items-end justify-between gap-4 mb-6">
                <div>
                  <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-bold uppercase tracking-[0.18em] mb-3">
                    <span class="material-symbols-outlined text-[16px]">inventory_2</span>
                    Materials
                  </div>
                  <h3 class="text-lg font-bold">Average Annual Cost by Subsystem</h3>
                  <p class="text-xs text-slate-500 dark:text-slate-400 mt-1" id="benchmarkCostLineSubtitle"></p>
                </div>
                <div id="benchmarkCostLineLegend" class="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400"></div>
              </div>
              <div class="relative" style="height: 360px;">
                <div class="absolute left-0 top-0 bottom-10 flex flex-col justify-between pr-3 text-[11px] font-bold text-slate-400" style="width:96px;" id="benchmarkCostLineYAxis"><span>0</span><span>0</span><span>0</span><span>0</span></div>
                <div class="h-full" style="margin-left:96px;">
                  <svg id="benchmarkCostLineSvg" class="w-full h-[320px]" viewBox="0 0 1000 320" preserveAspectRatio="none"></svg>
                  <div id="benchmarkCostLineLabels" class="mt-2 grid gap-2 text-[11px] font-semibold text-slate-400"></div>
                </div>
                <div id="benchmarkCostLineEmpty" class="hidden absolute inset-0 flex items-center justify-center text-sm text-slate-500 dark:text-slate-400">No benchmark cost data available for the selected filters.</div>
                <div id="benchmarkCostLineTooltip" class="pointer-events-none absolute z-10 hidden" style="min-width:260px;">
                  <div class="bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm px-3 py-2">
                    <div id="benchmarkCostLineTooltipTitle" class="text-[11px] font-semibold text-slate-700 dark:text-slate-200"></div>
                    <div id="benchmarkCostLineTooltipValue" class="mt-1 text-[11px] text-slate-500 dark:text-slate-300"></div>
                  </div>
                </div>
              </div>
            </div>

            <div id="benchmarkCostBarsCard" class="bg-white dark:bg-slate-900/60 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div class="flex flex-col xl:flex-row xl:items-end justify-between gap-4 mb-6">
                <div>
                  <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-bold uppercase tracking-[0.18em] mb-3">
                    <span class="material-symbols-outlined text-[16px]">inventory_2</span>
                    Materials
                  </div>
                  <h3 class="text-lg font-bold">Average Benchmark Cost by Subsystem</h3>
                  <p class="text-xs text-slate-500 dark:text-slate-400 mt-1" id="benchmarkCostBarsSubtitle"></p>
                </div>
                <div class="flex flex-col items-start xl:items-end gap-3">
                  <label class="min-w-[200px]">
                    <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Track Cost Driver</p>
                    <select id="benchmarkCostTrackDriverSelect" class="mt-1 w-full text-sm rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2">
                      <option value="km_single_track">Km single track</option>
                      <option value="turnout">Turnout</option>
                    </select>
                  </label>
                  <div id="benchmarkCostBarsLegend" class="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400"></div>
                </div>
              </div>
              <div class="relative" style="height: 360px;">
                <div class="absolute left-0 top-0 bottom-10 flex flex-col justify-between pr-3 text-[11px] font-bold text-slate-400" style="width:96px;" id="benchmarkCostBarsYAxis"><span>0</span><span>0</span><span>0</span><span>0</span></div>
                <div class="h-full" style="margin-left:96px;">
                  <svg id="benchmarkCostBarsSvg" class="w-full h-[320px]" viewBox="0 0 1000 320" preserveAspectRatio="none"></svg>
                  <div id="benchmarkCostBarsLabels" class="mt-2 grid gap-2 text-[11px] font-semibold text-slate-400"></div>
                </div>
                <div id="benchmarkCostBarsEmpty" class="hidden absolute inset-0 flex items-center justify-center text-sm text-slate-500 dark:text-slate-400">No normalized benchmark cost data available for the selected filters.</div>
                <div id="benchmarkCostBarsTooltip" class="pointer-events-none absolute z-10 hidden" style="min-width:260px;">
                  <div class="bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm px-3 py-2">
                    <div id="benchmarkCostBarsTooltipTitle" class="text-[11px] font-semibold text-slate-700 dark:text-slate-200"></div>
                    <div id="benchmarkCostBarsTooltipValue" class="mt-1 text-[11px] text-slate-500 dark:text-slate-300"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="bg-white dark:bg-slate-900/60 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div class="flex flex-col xl:flex-row xl:items-end justify-between gap-4 mb-4">
              <div>
                <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-bold uppercase tracking-[0.18em] mb-3">
                  <span class="material-symbols-outlined text-[16px]">inventory_2</span>
                  Materials
                </div>
                <h3 class="text-lg font-bold">Materials Cost Benchmark Detail</h3>
                <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Average annual cost and normalized benchmark cost by subsystem and project.</p>
              </div>
              <label class="min-w-[200px]">
                <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Track Cost Driver</p>
                <select id="benchmarkCostTableTrackDriverSelect" class="mt-1 w-full text-sm rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2">
                  <option value="km_single_track">Km single track</option>
                  <option value="turnout">Turnout</option>
                </select>
              </label>
            </div>
            <div class="overflow-x-auto">
              <table class="min-w-full text-sm">
                <thead id="benchmarkCostTableHead" class="text-[10px] uppercase tracking-wider text-slate-400"></thead>
                <tbody id="benchmarkCostTableBody" class="divide-y divide-slate-100 dark:divide-slate-800"></tbody>
              </table>
            </div>
          </div>

          <div class="grid grid-cols-1 xl:grid-cols-[minmax(0,1.04fr)_minmax(360px,0.96fr)] gap-6">
            <div id="benchmarkGlobalCostLineCard" class="bg-white dark:bg-slate-900/60 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div class="flex flex-col xl:flex-row xl:items-end justify-between gap-4 mb-6">
                <div>
                  <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-50 text-sky-700 border border-sky-200 text-[11px] font-bold uppercase tracking-[0.18em] mb-3">
                    <span class="material-symbols-outlined text-[16px]">build</span>
                    Overhaul &amp; Renewals
                  </div>
                  <h3 class="text-lg font-bold">Total Global Cost by Subsystem</h3>
                  <p class="text-xs text-slate-500 dark:text-slate-400 mt-1" id="benchmarkGlobalCostLineSubtitle"></p>
                </div>
                <div class="flex flex-col items-start xl:items-end gap-3">
                  <label class="min-w-[200px]">
                    <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Type Activity</p>
                    <select id="benchmarkGlobalCostActivityTypeFilter" class="mt-1 w-full text-sm rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2">
                      <option value="__ALL__">ALL</option>
                    </select>
                  </label>
                  <div id="benchmarkGlobalCostLineLegend" class="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400"></div>
                </div>
              </div>
              <div class="relative" style="height: 360px;">
                <div class="absolute left-0 top-0 bottom-10 flex flex-col justify-between pr-3 text-[11px] font-bold text-slate-400" style="width:96px;" id="benchmarkGlobalCostLineYAxis"><span>0</span><span>0</span><span>0</span><span>0</span></div>
                <div class="h-full" style="margin-left:96px;">
                  <svg id="benchmarkGlobalCostLineSvg" class="w-full h-[320px]" viewBox="0 0 1000 320" preserveAspectRatio="none"></svg>
                  <div id="benchmarkGlobalCostLineLabels" class="mt-2 grid gap-2 text-[11px] font-semibold text-slate-400"></div>
                </div>
                <div id="benchmarkGlobalCostLineEmpty" class="hidden absolute inset-0 flex items-center justify-center text-sm text-slate-500 dark:text-slate-400">No total global cost data available for the selected filters.</div>
                <div id="benchmarkGlobalCostLineTooltip" class="pointer-events-none absolute z-10 hidden" style="min-width:280px;">
                  <div class="bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm px-3 py-2">
                    <div id="benchmarkGlobalCostLineTooltipTitle" class="text-[11px] font-semibold text-slate-700 dark:text-slate-200"></div>
                    <div id="benchmarkGlobalCostLineTooltipValue" class="mt-1 text-[11px] text-slate-500 dark:text-slate-300"></div>
                  </div>
                </div>
              </div>
            </div>

            <div id="benchmarkGlobalCostBarsCard" class="bg-white dark:bg-slate-900/60 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div class="flex flex-col xl:flex-row xl:items-end justify-between gap-4 mb-6">
                <div>
                  <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-50 text-sky-700 border border-sky-200 text-[11px] font-bold uppercase tracking-[0.18em] mb-3">
                    <span class="material-symbols-outlined text-[16px]">build</span>
                    Overhaul &amp; Renewals
                  </div>
                  <h3 class="text-lg font-bold">Total Benchmark Global Cost by Subsystem</h3>
                  <p class="text-xs text-slate-500 dark:text-slate-400 mt-1" id="benchmarkGlobalCostBarsSubtitle"></p>
                </div>
                <div class="flex flex-col items-start xl:items-end gap-3">
                  <label class="min-w-[200px]">
                    <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Track Cost Driver</p>
                    <select id="benchmarkGlobalCostTrackDriverSelect" class="mt-1 w-full text-sm rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2">
                      <option value="km_single_track">Km single track</option>
                      <option value="turnout">Turnout</option>
                    </select>
                  </label>
                  <div id="benchmarkGlobalCostBarsLegend" class="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400"></div>
                </div>
              </div>
              <div class="relative" style="height: 360px;">
                <div class="absolute left-0 top-0 bottom-10 flex flex-col justify-between pr-3 text-[11px] font-bold text-slate-400" style="width:96px;" id="benchmarkGlobalCostBarsYAxis"><span>0</span><span>0</span><span>0</span><span>0</span></div>
                <div class="h-full" style="margin-left:96px;">
                  <svg id="benchmarkGlobalCostBarsSvg" class="w-full h-[320px]" viewBox="0 0 1000 320" preserveAspectRatio="none"></svg>
                  <div id="benchmarkGlobalCostBarsLabels" class="mt-2 grid gap-2 text-[11px] font-semibold text-slate-400"></div>
                </div>
                <div id="benchmarkGlobalCostBarsEmpty" class="hidden absolute inset-0 flex items-center justify-center text-sm text-slate-500 dark:text-slate-400">No normalized total global cost data available for the selected filters.</div>
                <div id="benchmarkGlobalCostBarsTooltip" class="pointer-events-none absolute z-10 hidden" style="min-width:280px;">
                  <div class="bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm px-3 py-2">
                    <div id="benchmarkGlobalCostBarsTooltipTitle" class="text-[11px] font-semibold text-slate-700 dark:text-slate-200"></div>
                    <div id="benchmarkGlobalCostBarsTooltipValue" class="mt-1 text-[11px] text-slate-500 dark:text-slate-300"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="bg-white dark:bg-slate-900/60 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div class="flex flex-col xl:flex-row xl:items-end justify-between gap-4 mb-4">
            <div>
              <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-50 text-sky-700 border border-sky-200 text-[11px] font-bold uppercase tracking-[0.18em] mb-3">
                <span class="material-symbols-outlined text-[16px]">build</span>
                Overhaul &amp; Renewals
              </div>
              <h3 class="text-lg font-bold">Overhaul &amp; Renewals Cost Benchmark Detail</h3>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Total Global Cost and normalized benchmark global cost by subsystem and project.</p>
            </div>
            <div class="flex flex-col items-start xl:items-end gap-3">
              <label class="min-w-[200px]">
                <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Type Activity</p>
                <select id="benchmarkGlobalCostTableActivityTypeFilter" class="mt-1 w-full text-sm rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2">
                  <option value="__ALL__">ALL</option>
                </select>
              </label>
              <label class="min-w-[200px]">
                <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Track Cost Driver</p>
                <select id="benchmarkGlobalCostTableTrackDriverSelect" class="mt-1 w-full text-sm rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2">
                  <option value="km_single_track">Km single track</option>
                  <option value="turnout">Turnout</option>
                </select>
              </label>
            </div>
          </div>
          <div class="overflow-x-auto">
            <table class="min-w-full text-sm">
              <thead id="benchmarkGlobalCostTableHead" class="text-[10px] uppercase tracking-wider text-slate-400"></thead>
              <tbody id="benchmarkGlobalCostTableBody" class="divide-y divide-slate-100 dark:divide-slate-800"></tbody>
            </table>
          </div>
        </div>

        <div id="benchmarkSubcontractCostCard" class="relative bg-white dark:bg-slate-900/60 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div class="flex flex-col xl:flex-row xl:items-end justify-between gap-4 mb-6">
            <div>
              <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-bold uppercase tracking-[0.18em] mb-3">
                <span class="material-symbols-outlined text-[16px]">handshake</span>
                Subcontracting Activities
              </div>
              <h3 class="text-lg font-bold">Yearly Subcontracting Cost by Subsystem</h3>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-1" id="benchmarkSubcontractCostSubtitle"></p>
            </div>
            <div id="benchmarkSubcontractCostLegend" class="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400"></div>
          </div>
          <div class="relative" style="height: 360px;">
            <div class="absolute left-0 top-0 bottom-10 flex flex-col justify-between pr-3 text-[11px] font-bold text-slate-400" style="width:96px;" id="benchmarkSubcontractCostYAxis"><span>0</span><span>0</span><span>0</span><span>0</span></div>
            <div class="h-full" style="margin-left:96px;">
              <svg id="benchmarkSubcontractCostSvg" class="w-full h-[320px]" viewBox="0 0 1000 320" preserveAspectRatio="none"></svg>
              <div id="benchmarkSubcontractCostLabels" class="mt-2 grid gap-2 text-[11px] font-semibold text-slate-400"></div>
            </div>
            <div id="benchmarkSubcontractCostEmpty" class="hidden absolute inset-0 flex items-center justify-center text-sm text-slate-500 dark:text-slate-400">No yearly subcontracting cost data available for the selected filters.</div>
            <div id="benchmarkSubcontractCostTooltip" class="pointer-events-none absolute z-10 hidden" style="min-width:320px;">
              <div class="bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm px-3 py-2">
                <div id="benchmarkSubcontractCostTooltipTitle" class="text-[11px] font-semibold text-slate-700 dark:text-slate-200"></div>
                <div id="benchmarkSubcontractCostTooltipValue" class="mt-1 text-[11px] text-slate-500 dark:text-slate-300"></div>
                <div id="benchmarkSubcontractCostTooltipTypes" class="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700 space-y-1 text-[11px]"></div>
              </div>
            </div>
          </div>
        </div>

        <div class="bg-white dark:bg-slate-900/60 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div class="flex flex-col xl:flex-row xl:items-end justify-between gap-4 mb-4">
            <div>
              <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-bold uppercase tracking-[0.18em] mb-3">
                <span class="material-symbols-outlined text-[16px]">handshake</span>
                Subcontracting Activities
              </div>
              <h3 class="text-lg font-bold">Yearly Subcontracting Cost Detail</h3>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Yearly Cost (Subcontracting) by subsystem, project and type in the selected target currency.</p>
            </div>
          </div>
          <div class="overflow-x-auto">
            <table class="min-w-full text-sm">
              <thead id="benchmarkSubcontractCostTableHead" class="text-[10px] uppercase tracking-wider text-slate-400"></thead>
              <tbody id="benchmarkSubcontractCostTableBody" class="divide-y divide-slate-100 dark:divide-slate-800"></tbody>
            </table>
          </div>
        </div>

        <div id="benchmarkRatesCard" class="bg-white dark:bg-slate-900/60 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div class="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-4">
            <div>
              <h3 class="text-lg font-bold">Conversion Table</h3>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Internal conversion basis: <span class="font-semibold">1 USD = X Currency</span>. Manual overrides take precedence over live rates.</p>
            </div>
            <div class="flex items-center gap-2">
              <div class="text-xs text-slate-500 dark:text-slate-400" id="benchmarkRatesSourceInlineText">Live source pending</div>
              <button
                id="benchmarkRefreshRatesInlineBtn"
                type="button"
                class="inline-flex items-center justify-center size-9 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                title="Refresh conversion table from live source"
                aria-label="Refresh conversion table from live source">
                <span class="material-symbols-outlined text-[18px] text-slate-600 dark:text-slate-300">refresh</span>
              </button>
            </div>
          </div>
          <div class="overflow-x-auto">
            <table class="min-w-full text-sm">
              <thead class="text-[10px] uppercase tracking-wider text-slate-400">
                <tr class="border-b border-slate-100 dark:border-slate-800">
                  <th class="text-left py-3 pr-4">Currency</th>
                  <th class="text-left py-3 px-4">Live rate</th>
                  <th class="text-left py-3 px-4">Manual override</th>
                  <th class="text-left py-3 px-4">Effective rate</th>
                  <th class="text-left py-3 pl-4">Source</th>
                </tr>
              </thead>
              <tbody id="benchmarkRatesTableBody" class="divide-y divide-slate-100 dark:divide-slate-800"></tbody>
            </table>
          </div>
        </div>
      </section>
    `;

    const schemaHint = $('schemaHint');
    if (schemaHint) {
      schemaHint.textContent =
        'Expected workbook sheets: "Planning Complet", "Technicians Needed Per Day", "Synthesis", "General Parameters". Benchmark costs use Synthesis first, with Corrective Planning + DEQ_VMI_Planning as backup.';
    }

    loadStoredExchangeState();
    renderBenchmarkDashboard();
    $('benchmarkCurrencyFilter')?.addEventListener('change', (e) => {
      state.currentMaterialCurrency = e.target.value;
      queueSharedSettingsSync();
      renderBenchmarkDashboard();
    });
    $('benchmarkTrackDriverSelect')?.addEventListener('change', (e) => {
      state.currentBenchmarkTrackDriver = e.target.value === "turnout" ? "turnout" : "km_single_track";
      renderBenchmarkDashboard();
    });
    $('benchmarkCostTrackDriverSelect')?.addEventListener('change', (e) => {
      state.currentBenchmarkCostTrackDriver = e.target.value === "km_single_track" ? "km_single_track" : "turnout";
      renderBenchmarkDashboard();
    });
    $('benchmarkCostTableTrackDriverSelect')?.addEventListener('change', (e) => {
      state.currentBenchmarkCostTrackDriver = e.target.value === "km_single_track" ? "km_single_track" : "turnout";
      renderBenchmarkDashboard();
    });
    $('benchmarkGlobalCostActivityTypeFilter')?.addEventListener('change', (e) => {
      state.currentBenchmarkGlobalCostActivityType = e.target.value || "__ALL__";
      renderBenchmarkDashboard();
    });
    $('benchmarkGlobalCostTableActivityTypeFilter')?.addEventListener('change', (e) => {
      state.currentBenchmarkGlobalCostActivityType = e.target.value || "__ALL__";
      renderBenchmarkDashboard();
    });
    $('benchmarkGlobalCostTrackDriverSelect')?.addEventListener('change', (e) => {
      state.currentBenchmarkGlobalCostTrackDriver = e.target.value === "turnout" ? "turnout" : "km_single_track";
      renderBenchmarkDashboard();
    });
    $('benchmarkGlobalCostTableTrackDriverSelect')?.addEventListener('change', (e) => {
      state.currentBenchmarkGlobalCostTrackDriver = e.target.value === "turnout" ? "turnout" : "km_single_track";
      renderBenchmarkDashboard();
    });
    $('benchmarkRefreshRatesBtn')?.addEventListener('click', async () => { await refreshExchangeRates(); });
    $('benchmarkRefreshRatesInlineBtn')?.addEventListener('click', async () => { await refreshExchangeRates(); });
    $('benchmarkResetOverridesBtn')?.addEventListener('click', () => { clearManualExchangeRates(); });
    $('benchmarkDriverKpiTotalToggle')?.addEventListener('change', (e) => {
      state.showBenchmarkDriverKpiTotal = !!e.target.checked;
      renderBenchmarkDashboard();
    });
    const trackDriverSelect = $('benchmarkTrackDriverSelect');
    if (trackDriverSelect) trackDriverSelect.value = state.currentBenchmarkTrackDriver;
    const costTrackDriverSelect = $('benchmarkCostTrackDriverSelect');
    if (costTrackDriverSelect) costTrackDriverSelect.value = state.currentBenchmarkCostTrackDriver;
    const costTableTrackDriverSelect = $('benchmarkCostTableTrackDriverSelect');
    if (costTableTrackDriverSelect) costTableTrackDriverSelect.value = state.currentBenchmarkCostTrackDriver;
    const globalCostActivityTypeFilter = $('benchmarkGlobalCostActivityTypeFilter');
    if (globalCostActivityTypeFilter) globalCostActivityTypeFilter.value = state.currentBenchmarkGlobalCostActivityType;
    const globalCostTableActivityTypeFilter = $('benchmarkGlobalCostTableActivityTypeFilter');
    if (globalCostTableActivityTypeFilter) globalCostTableActivityTypeFilter.value = state.currentBenchmarkGlobalCostActivityType;
    const globalCostTrackDriverSelect = $('benchmarkGlobalCostTrackDriverSelect');
    if (globalCostTrackDriverSelect) globalCostTrackDriverSelect.value = state.currentBenchmarkGlobalCostTrackDriver;
    const globalCostTableTrackDriverSelect = $('benchmarkGlobalCostTableTrackDriverSelect');
    if (globalCostTableTrackDriverSelect) globalCostTableTrackDriverSelect.value = state.currentBenchmarkGlobalCostTrackDriver;
    refreshExchangeRates({ silent: true });
  }

  function getBenchmarkBaseFileIds() {
    return getEffectiveFileIds({ kind: "output_planning" }).filter(Boolean);
  }

  function getFilteredBenchmarkRows() {
    return scopedRows(state.synthesisRows || []).filter((row) => {
      const fileId = row?.__fileid;
      if (!getBenchmarkBaseFileIds().includes(fileId)) return false;
      const type = String(row?.type ?? "").trim().toLowerCase();
      if (type !== "preventive") return false;
      const subsystem = normalizeBenchmarkSubsystem(row?.subsystem);
      if (shouldFilterBySubsystem() && !subsystemMatchesSelection(subsystem)) return false;
      return true;
    });
  }

  function getBenchmarkScopedSynthesisRows() {
    return scopedRows(state.synthesisRows || []).filter((row) => {
      const fileId = row?.__fileid;
      if (!getBenchmarkBaseFileIds().includes(fileId)) return false;
      const subsystem = normalizeBenchmarkSubsystem(row?.subsystem);
      if (shouldFilterBySubsystem() && !subsystemMatchesSelection(subsystem)) return false;
      return true;
    });
  }

  function getBenchmarkCostCurrencies() {
    const synthesisCurrencies = getCurrenciesInRowsByColumn(getBenchmarkScopedSynthesisRows(), "currency");
    const backupCurrencies = getCurrenciesInRows(getMaterialsBaseRows());
    return Array.from(new Set(
      []
        .concat(synthesisCurrencies)
        .concat(backupCurrencies)
        .concat(Object.keys(state.manualExchangeRates || {}))
        .concat([state.currentMaterialCurrency, state.exchangeBase])
        .concat(["USD", "EUR", "AED", "SGD", "BRL", "CNY"])
        .filter(Boolean)
    )).sort((a, b) => a.localeCompare(b));
  }

  function getBenchmarkGlobalCostActivityTypeOptions() {
    const allowedTypes = new Map([
      ["overhaul", "Overhaul"],
      ["renewal", "Renewal"],
    ]);
    const labelsByKey = new Map();
    getBenchmarkScopedSynthesisRows().forEach((row) => {
      const key = normalizeKey(row?.type);
      if (!allowedTypes.has(key)) return;
      if (!labelsByKey.has(key)) {
        labelsByKey.set(key, allowedTypes.get(key));
      }
    });
    return Array.from(labelsByKey.entries())
      .sort((a, b) => a[1].localeCompare(b[1]))
      .map(([value, label]) => ({ value, label }));
  }

  function buildBenchmarkDataset() {
    const rows = getFilteredBenchmarkRows();
    const deduped = new Map();

    rows.forEach((row) => {
      const fileId = row?.__fileid || "";
      const subsystem = normalizeBenchmarkSubsystem(row?.subsystem);
      const shiftRaw = String(row?.shift ?? "").trim().toLowerCase();
      const shift = shiftRaw.includes("night") || shiftRaw.includes("nuit") ? "night" : (shiftRaw.includes("day") || shiftRaw.includes("jour") ? "day" : "");
      if (!subsystem || !shift) return;
      const value = shift === "day" ? toNumber(row?.day_technicians_optimized) : toNumber(row?.night_technicians_optimized);
      const key = `${fileId}|${subsystem}|${shift}`;
      deduped.set(key, Math.max(deduped.get(key) || 0, value));
    });

    const projectMap = new Map();
    const rawBySubsystem = new Map();

    deduped.forEach((value, key) => {
      if (!value) return;
      const [fileId, subsystem] = key.split("|");
      const meta = state.fileMeta?.[fileId] || {};
      const gp = meta?.gp || {};
      const project = getProjectLabelForFileId(fileId);
      const projectType = String(gp.project_type ?? "").trim() || "Unspecified";
      const projectBucket = projectMap.get(project) || { label: project, type: projectType, gp, rawBySubsystem: new Map() };
      projectBucket.rawBySubsystem.set(subsystem, (projectBucket.rawBySubsystem.get(subsystem) || 0) + value);
      projectMap.set(project, projectBucket);
      rawBySubsystem.set(subsystem, (rawBySubsystem.get(subsystem) || 0) + value);
    });

    const preferredOrder = ["POS", "PSD", "AFC", "DEQ", "VMI", "MEP", "Track", "3rd_Rail", "CAT"];
    const subsystemSet = new Set();
    projectMap.forEach((project) => {
      Array.from(project.rawBySubsystem.keys()).forEach((subsystem) => subsystemSet.add(subsystem));
    });
    const subsystems = Array.from(subsystemSet).sort((a, b) => {
      const ai = preferredOrder.indexOf(a);
      const bi = preferredOrder.indexOf(b);
      if (ai !== -1 || bi !== -1) return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
      return a.localeCompare(b);
    });

    const projects = Array.from(projectMap.values())
      .map((project) => ({
        ...project,
        adjustedBySubsystem: new Map(
          subsystems.map((subsystem) => [
            subsystem,
            computeBenchmarkAdjustedValue(subsystem, project.rawBySubsystem.get(subsystem) || 0, project.gp || {}),
          ])
        ),
      }))
      .filter((project) => Array.from(project.adjustedBySubsystem.values()).some((value) => value > 0))
      .sort((a, b) => {
        const aTotal = Array.from(a.adjustedBySubsystem.values()).reduce((sum, value) => sum + value, 0);
        const bTotal = Array.from(b.adjustedBySubsystem.values()).reduce((sum, value) => sum + value, 0);
        return bTotal - aTotal;
      });

    return { projects, subsystems, rawBySubsystem };
  }

  function buildBenchmarkCostDatasetFromBackup() {
    const rows = getMaterialsBaseRows();
    const cols = state.materialsColumns;
    const byProject = new Map();
    const appliedCurrencies = new Set();
    let skipped = 0;

    rows.forEach((row) => {
      const subsystem = normalizeBenchmarkSubsystem(cols.subsystem ? row?.[cols.subsystem] : row?.subsystem);
      const year = getMaterialYearValue(row);
      if (!subsystem || !year) return;

      const fileId = row?.__fileid || "";
      const meta = state.fileMeta?.[fileId] || {};
      const gp = meta?.gp || {};
      const project = getMaterialsProjectLabel(row);
      const projectType = String(gp.project_type ?? "").trim() || "Unspecified";
      const currency = cols.currency ? row?.[cols.currency] : "";
      const sourceCurrency = normalizeCurrencyCode(currency);
      const replacementRaw = cols.totalCostEstimated ? toNumber(row?.[cols.totalCostEstimated]) : 0;
      const reparableRaw = cols.reparableCostEstimated ? toNumber(row?.[cols.reparableCostEstimated]) : 0;
      const replacement = cols.totalCostEstimated ? convertAmount(replacementRaw, currency, state.currentMaterialCurrency) : null;
      const reparable = cols.reparableCostEstimated ? convertAmount(reparableRaw, currency, state.currentMaterialCurrency) : null;
      if ((replacementRaw && replacement === null) || (reparableRaw && reparable === null)) skipped += 1;
      const total = (replacement ?? 0) + (reparable ?? 0);
      if (!total) return;
      if (sourceCurrency) appliedCurrencies.add(sourceCurrency);

      const projectBucket = byProject.get(project) || { label: project, type: projectType, gp, bySubsystemYear: new Map() };
      if (!projectBucket.bySubsystemYear.has(subsystem)) projectBucket.bySubsystemYear.set(subsystem, new Map());
      const yearMap = projectBucket.bySubsystemYear.get(subsystem);
      yearMap.set(year, (yearMap.get(year) || 0) + total);
      byProject.set(project, projectBucket);
    });

    const preferredOrder = ["POS", "PSD", "AFC", "DEQ", "VMI", "MEP", "Track", "3rd_Rail", "CAT"];
    const subsystemSet = new Set();
    byProject.forEach((project) => {
      Array.from(project.bySubsystemYear.keys()).forEach((subsystem) => subsystemSet.add(subsystem));
    });
    const subsystems = Array.from(subsystemSet).sort((a, b) => {
      const ai = preferredOrder.indexOf(a);
      const bi = preferredOrder.indexOf(b);
      if (ai !== -1 || bi !== -1) return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
      return a.localeCompare(b);
    });

    const projects = Array.from(byProject.values())
      .map((project) => {
        const averageBySubsystem = new Map(
          subsystems.map((subsystem) => {
            const yearMap = project.bySubsystemYear.get(subsystem) || new Map();
            const values = Array.from(yearMap.values());
            const avg = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
            return [subsystem, avg];
          })
        );
        return {
          ...project,
          averageBySubsystem,
          adjustedAverageBySubsystem: new Map(
            subsystems.map((subsystem) => [
              subsystem,
              computeBenchmarkCostAdjustedValue(subsystem, averageBySubsystem.get(subsystem) || 0, project.gp || {}),
            ])
          ),
        };
      })
      .filter((project) => Array.from(project.averageBySubsystem.values()).some((value) => value > 0))
      .sort((a, b) => {
        const aTotal = Array.from(a.averageBySubsystem.values()).reduce((sum, value) => sum + value, 0);
        const bTotal = Array.from(b.averageBySubsystem.values()).reduce((sum, value) => sum + value, 0);
        return bTotal - aTotal;
      });

    return {
      projects,
      subsystems,
      skipped,
      sourceLabel: "Corrective Planning + DEQ_VMI_Planning (backup)",
      appliedCurrencies: Array.from(appliedCurrencies).sort((a, b) => a.localeCompare(b)),
    };
  }

  function buildBenchmarkCostDataset() {
    const rows = getBenchmarkScopedSynthesisRows();
    const deduped = new Map();
    const appliedCurrencies = new Set();
    let skipped = 0;

    rows.forEach((row) => {
      const fileId = row?.__fileid || "";
      const subsystem = normalizeBenchmarkSubsystem(row?.subsystem);
      if (!subsystem) return;
      const yearlyTotalRaw = toNumber(row?.yearly_total_cost);
      const yearlyReparableRaw = toNumber(row?.yearly_reparable_cost);
      if (!yearlyTotalRaw && !yearlyReparableRaw) return;
      const currency = normalizeCurrencyCode(row?.currency) || "N/A";
      const yearlyTotal = convertAmount(yearlyTotalRaw, currency, state.currentMaterialCurrency);
      const yearlyReparable = convertAmount(yearlyReparableRaw, currency, state.currentMaterialCurrency);
      if ((yearlyTotalRaw && yearlyTotal === null) || (yearlyReparableRaw && yearlyReparable === null)) {
        skipped += 1;
        return;
      }
      if (currency && currency !== "N/A") appliedCurrencies.add(currency);

      // Keep one bucket per source currency so multi-currency rows for the same subsystem are accumulated.
      const key = `${fileId}|${subsystem}|${currency}`;
      const prev = deduped.get(key) || { total: 0, reparable: 0 };
      prev.total = Math.max(prev.total, yearlyTotal ?? 0);
      prev.reparable = Math.max(prev.reparable, yearlyReparable ?? 0);
      deduped.set(key, prev);
    });

    const projectMap = new Map();
    const preferredOrder = ["POS", "PSD", "AFC", "DEQ", "VMI", "MEP", "Track", "3rd_Rail", "CAT"];
    const subsystemSet = new Set();

    deduped.forEach((value, key) => {
      const [fileId, subsystem] = key.split("|");
      const meta = state.fileMeta?.[fileId] || {};
      const gp = meta?.gp || {};
      const project = getProjectLabelForFileId(fileId);
      const projectType = String(gp.project_type ?? "").trim() || "Unspecified";
      const projectBucket = projectMap.get(project) || { label: project, type: projectType, gp, averageBySubsystem: new Map() };
      projectBucket.averageBySubsystem.set(subsystem, (projectBucket.averageBySubsystem.get(subsystem) || 0) + (value.total + value.reparable));
      projectMap.set(project, projectBucket);
      subsystemSet.add(subsystem);
    });

    const subsystems = Array.from(subsystemSet).sort((a, b) => {
      const ai = preferredOrder.indexOf(a);
      const bi = preferredOrder.indexOf(b);
      if (ai !== -1 || bi !== -1) return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
      return a.localeCompare(b);
    });

    const projects = Array.from(projectMap.values())
      .map((project) => ({
        ...project,
        averageBySubsystem: new Map(
          subsystems.map((subsystem) => [subsystem, project.averageBySubsystem.get(subsystem) || 0])
        ),
        adjustedAverageBySubsystem: new Map(
          subsystems.map((subsystem) => [
            subsystem,
            computeBenchmarkCostAdjustedValue(subsystem, project.averageBySubsystem.get(subsystem) || 0, project.gp || {}),
          ])
        ),
      }))
      .filter((project) => Array.from(project.averageBySubsystem.values()).some((value) => value > 0))
      .sort((a, b) => {
        const aTotal = Array.from(a.averageBySubsystem.values()).reduce((sum, value) => sum + value, 0);
        const bTotal = Array.from(b.averageBySubsystem.values()).reduce((sum, value) => sum + value, 0);
        return bTotal - aTotal;
      });

    if (projects.length) {
      return {
        projects,
        subsystems,
        skipped,
        sourceLabel: "Synthesis",
        appliedCurrencies: Array.from(appliedCurrencies).sort((a, b) => a.localeCompare(b)),
      };
    }

    const backup = buildBenchmarkCostDatasetFromBackup();
    backup.skipped += skipped;
    return backup;
  }

  function buildBenchmarkGlobalCostDataset() {
    const rows = getBenchmarkScopedSynthesisRows();
    const selectedType = state.currentBenchmarkGlobalCostActivityType || "__ALL__";
    const deduped = new Map();
    const appliedCurrencies = new Set();
    let skipped = 0;

    rows.forEach((row) => {
      const fileId = row?.__fileid || "";
      const subsystem = normalizeBenchmarkSubsystem(row?.subsystem);
      if (!subsystem) return;
      const activityTypeKey = normalizeKey(row?.type) || "unspecified";
      if (selectedType !== "__ALL__" && activityTypeKey !== selectedType) return;
      const totalGlobalCostRaw = toNumber(row?.total_global_cost);
      if (!totalGlobalCostRaw) return;
      const currency = normalizeCurrencyCode(row?.currency) || "N/A";
      const totalGlobalCost = convertAmount(totalGlobalCostRaw, currency, state.currentMaterialCurrency);
      if (totalGlobalCostRaw && totalGlobalCost === null) {
        skipped += 1;
        return;
      }
      if (currency && currency !== "N/A") appliedCurrencies.add(currency);
      const key = `${fileId}|${subsystem}|${activityTypeKey}|${currency}`;
      deduped.set(key, Math.max(deduped.get(key) || 0, totalGlobalCost ?? 0));
    });

    const projectMap = new Map();
    const preferredOrder = ["POS", "PSD", "AFC", "DEQ", "VMI", "MEP", "Track", "3rd_Rail", "CAT"];
    const subsystemSet = new Set();

    deduped.forEach((value, key) => {
      if (!value) return;
      const [fileId, subsystem] = key.split("|");
      const meta = state.fileMeta?.[fileId] || {};
      const gp = meta?.gp || {};
      const project = getProjectLabelForFileId(fileId);
      const projectType = String(gp.project_type ?? "").trim() || "Unspecified";
      const projectBucket = projectMap.get(project) || { label: project, type: projectType, gp, bySubsystem: new Map() };
      projectBucket.bySubsystem.set(subsystem, (projectBucket.bySubsystem.get(subsystem) || 0) + value);
      projectMap.set(project, projectBucket);
      subsystemSet.add(subsystem);
    });

    const subsystems = Array.from(subsystemSet).sort((a, b) => {
      const ai = preferredOrder.indexOf(a);
      const bi = preferredOrder.indexOf(b);
      if (ai !== -1 || bi !== -1) return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
      return a.localeCompare(b);
    });

    const projects = Array.from(projectMap.values())
      .map((project) => ({
        ...project,
        bySubsystem: new Map(
          subsystems.map((subsystem) => [subsystem, project.bySubsystem.get(subsystem) || 0])
        ),
        adjustedBySubsystem: new Map(
          subsystems.map((subsystem) => [
            subsystem,
            computeBenchmarkGlobalCostAdjustedValue(subsystem, project.bySubsystem.get(subsystem) || 0, project.gp || {}),
          ])
        ),
      }))
      .filter((project) => Array.from(project.bySubsystem.values()).some((value) => value > 0))
      .sort((a, b) => {
        const aTotal = Array.from(a.bySubsystem.values()).reduce((sum, value) => sum + value, 0);
        const bTotal = Array.from(b.bySubsystem.values()).reduce((sum, value) => sum + value, 0);
        return bTotal - aTotal;
      });

    return {
      projects,
      subsystems,
      skipped,
      sourceLabel: "Synthesis",
      activityTypeLabel: selectedType === "__ALL__"
        ? "ALL"
        : (selectedType === "overhaul" ? "Overhaul" : (selectedType === "renewal" ? "Renewal" : selectedType)),
      appliedCurrencies: Array.from(appliedCurrencies).sort((a, b) => a.localeCompare(b)),
    };
  }

  function buildBenchmarkSubcontractingCostDataset() {
    const rows = getBenchmarkScopedSynthesisRows();
    const deduped = new Map();
    const appliedCurrencies = new Set();
    const typeLabelSet = new Set();
    let skipped = 0;

    rows.forEach((row) => {
      const fileId = row?.__fileid || "";
      const subsystem = normalizeBenchmarkSubsystem(row?.subsystem);
      if (!subsystem) return;
      const yearlySubcontractingRaw = toNumber(row?.yearly_cost_subcontracting);
      if (!yearlySubcontractingRaw) return;
      const currency = normalizeCurrencyCode(row?.currency) || "N/A";
      const yearlySubcontracting = convertAmount(yearlySubcontractingRaw, currency, state.currentMaterialCurrency);
      if (yearlySubcontractingRaw && yearlySubcontracting === null) {
        skipped += 1;
        return;
      }
      if (currency && currency !== "N/A") appliedCurrencies.add(currency);
      const activityTypeKey = normalizeKey(row?.type) || "unspecified";
      const activityTypeLabel = String(row?.type ?? "").trim() || "Unspecified";
      typeLabelSet.add(activityTypeLabel);
      const key = `${fileId}|${subsystem}|${activityTypeKey}|${currency}`;
      const prev = deduped.get(key) || { value: 0, activityTypeKey, activityTypeLabel };
      prev.value = Math.max(prev.value, yearlySubcontracting ?? 0);
      prev.activityTypeLabel = activityTypeLabel;
      deduped.set(key, prev);
    });

    const projectMap = new Map();
    const preferredOrder = ["POS", "PSD", "AFC", "DEQ", "VMI", "MEP", "Track", "3rd_Rail", "CAT"];
    const subsystemSet = new Set();

    deduped.forEach((entry, key) => {
      if (!entry.value) return;
      const [fileId, subsystem] = key.split("|");
      const meta = state.fileMeta?.[fileId] || {};
      const gp = meta?.gp || {};
      const project = getProjectLabelForFileId(fileId);
      const projectType = String(gp.project_type ?? "").trim() || "Unspecified";
      const projectBucket = projectMap.get(project) || {
        label: project,
        type: projectType,
        gp,
        bySubsystem: new Map(),
        typeBreakdownBySubsystem: new Map(),
      };
      projectBucket.bySubsystem.set(subsystem, (projectBucket.bySubsystem.get(subsystem) || 0) + entry.value);
      if (!projectBucket.typeBreakdownBySubsystem.has(subsystem)) {
        projectBucket.typeBreakdownBySubsystem.set(subsystem, new Map());
      }
      const typeMap = projectBucket.typeBreakdownBySubsystem.get(subsystem);
      typeMap.set(entry.activityTypeLabel, (typeMap.get(entry.activityTypeLabel) || 0) + entry.value);
      projectMap.set(project, projectBucket);
      subsystemSet.add(subsystem);
    });

    const subsystems = Array.from(subsystemSet).sort((a, b) => {
      const ai = preferredOrder.indexOf(a);
      const bi = preferredOrder.indexOf(b);
      if (ai !== -1 || bi !== -1) return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
      return a.localeCompare(b);
    });

    const projects = Array.from(projectMap.values())
      .map((project) => ({
        ...project,
        bySubsystem: new Map(
          subsystems.map((subsystem) => [subsystem, project.bySubsystem.get(subsystem) || 0])
        ),
      }))
      .filter((project) => Array.from(project.bySubsystem.values()).some((value) => value > 0))
      .sort((a, b) => {
        const aTotal = Array.from(a.bySubsystem.values()).reduce((sum, value) => sum + value, 0);
        const bTotal = Array.from(b.bySubsystem.values()).reduce((sum, value) => sum + value, 0);
        return bTotal - aTotal;
      });

    return {
      projects,
      subsystems,
      typeLabels: Array.from(typeLabelSet).sort((a, b) => a.localeCompare(b)),
      skipped,
      sourceLabel: "Synthesis",
      appliedCurrencies: Array.from(appliedCurrencies).sort((a, b) => a.localeCompare(b)),
    };
  }

  function updateBenchmarkProjectInfo() {
    const ids = getBenchmarkBaseFileIds();
    const projectKeys = Array.from(new Set(ids.map(getProjectKeyForFileId).filter(Boolean)));
    const setText = (id, value) => { const el = $(id); if (el) el.textContent = value; };
    const lineEl = $('benchmarkLineLength');

    if (!projectKeys.length) {
      setText('benchmarkProjectName', 'No project selected');
      setText('benchmarkProjectType', '—');
      if (lineEl) lineEl.innerHTML = `-- <span class="text-[10px] font-normal text-slate-400">STK</span>`;
      setText('benchmarkServiceYear', '-- / --');
      setText('benchmarkContractDuration', '--');
      setText('benchmarkProjectContext', '--');
      return;
    }

    if (projectKeys.length === 1) {
      const projectId = ids[0];
      const gp = state.fileMeta?.[projectId]?.gp || {};
      const get = (key) => gp[key] !== undefined && gp[key] !== null ? String(gp[key]).trim() : "";
      const contractDurationInfo = getResolvedContractDurationInfo(gp, getProjectKeyForFileId(projectId));
      setText('benchmarkProjectName', get('project_name') || get('project') || getProjectLabelForFileId(projectId));
      setText('benchmarkProjectType', get('project_type') || '—');
      if (lineEl) {
        const lineLen = get('l_total_single_track');
        if (lineLen) {
          const txt = /km/i.test(lineLen) ? lineLen : `${lineLen} Km`;
          lineEl.innerHTML = `${txt} <span class="text-[10px] font-normal text-slate-400">STK</span>`;
        } else {
          lineEl.innerHTML = `-- <span class="text-[10px] font-normal text-slate-400">STK</span>`;
        }
      }
      setText('benchmarkServiceYear', `${get('bid_year') || '--'} / ${get('service_year') || '--'}`);
      setText('benchmarkContractDuration', contractDurationInfo.label);
      setText('benchmarkProjectContext', get('project_context') || '--');
      return;
    }

    setText('benchmarkProjectName', `${projectKeys.length} projects selected`);
    setText('benchmarkProjectType', state.currentProjectType !== "__ALL__" ? state.currentProjectType : 'Multiple');
    if (lineEl) lineEl.innerHTML = `-- <span class="text-[10px] font-normal text-slate-400">STK</span>`;
    setText('benchmarkServiceYear', '-- / --');
    setText('benchmarkContractDuration', '--');
    setText('benchmarkProjectContext', 'Multiple');
  }

  function renderBenchmarkDriverKpis() {
    const metricConfigs = [
      {
        valueId: 'benchmarkTurnoutKpi',
        hiddenId: 'benchmarkTurnoutKpiHidden',
        listId: 'benchmarkTurnoutProjectList',
        emptyText: 'No project data available.',
        field: 'turnout',
      },
      {
        valueId: 'benchmarkSubstationKpi',
        hiddenId: 'benchmarkSubstationKpiHidden',
        listId: 'benchmarkSubstationProjectList',
        emptyText: 'No project data available.',
        field: 'substation',
      },
      {
        valueId: 'benchmarkApsdKpi',
        hiddenId: 'benchmarkApsdKpiHidden',
        listId: 'benchmarkApsdProjectList',
        emptyText: 'No project data available.',
        field: 'apsd',
      },
      {
        valueId: 'benchmarkStationsKpi',
        hiddenId: 'benchmarkStationsKpiHidden',
        listId: 'benchmarkStationsProjectList',
        emptyText: 'No project data available.',
        field: 'stations',
      },
    ];
    const ids = getBenchmarkBaseFileIds();
    const projectItems = [];
    const seenProjects = new Set();

    ids.forEach((fileId) => {
      const projectKey = getProjectKeyForFileId(fileId) || `__file__${fileId}`;
      if (seenProjects.has(projectKey)) return;
      seenProjects.add(projectKey);
      const gp = state.fileMeta?.[fileId]?.gp || {};
      const getNum = (name) => toNumber(gp?.[name]);
      const turnout = getNum("switch") + (getNum("diamond_crossing") * 4) + (getNum("crossover") * 2);
      const substation = getNum("number_of_traction_substation") + getNum("number_of_auxiliary_substation") + getNum("number_of_mv_substation");
      const stations = getNum("number_of_station");
      const apsd = stations * getNum("apsd_per_wall") * getNum("walls_per_station");
      projectItems.push({
        projectKey,
        label: getProjectLabelForFileId(fileId),
        turnout,
        substation,
        apsd,
        stations,
      });
    });

    const projectColorMap = new Map(projectItems.map((item, index) => [item.projectKey, colorForSeriesIndex(index)]));
    const toggle = $('benchmarkDriverKpiTotalToggle');
    if (toggle) toggle.checked = !!state.showBenchmarkDriverKpiTotal;
    metricConfigs.forEach((config) => {
      const valueEl = $(config.valueId);
      const hiddenEl = $(config.hiddenId);
      const listEl = $(config.listId);
      const total = projectItems.reduce((sum, item) => sum + (item[config.field] || 0), 0);
      if (valueEl) {
        valueEl.textContent = formatInt(total);
        valueEl.classList.toggle('hidden', !state.showBenchmarkDriverKpiTotal);
      }
      if (hiddenEl) hiddenEl.classList.toggle('hidden', !!state.showBenchmarkDriverKpiTotal);
      if (!listEl) return;
      listEl.innerHTML = projectItems.length
        ? projectItems.map((item) => `
            <div class="flex items-start justify-between gap-3">
              <div class="flex items-start gap-2 min-w-0">
                <span class="inline-block size-2.5 rounded-full shrink-0" style="background:${projectColorMap.get(item.projectKey) || "#94a3b8"};"></span>
                <span class="text-xs font-bold uppercase tracking-wider text-slate-400 leading-tight break-words" title="${escapeHtml(item.label)}">${escapeHtml(item.label)}</span>
              </div>
              <span class="text-sm font-semibold text-slate-700 dark:text-slate-100">${escapeHtml(formatInt(item[config.field] || 0))}</span>
            </div>
          `).join("")
        : `<p class="text-sm text-slate-500 dark:text-slate-400">${escapeHtml(config.emptyText)}</p>`;
    });
  }

  function renderBenchmarkBarsChart(dataset) {
    const svg = $('benchmarkBarsSvg');
    const labels = $('benchmarkBarsLabels');
    const yAxis = $('benchmarkBarsYAxis');
    const legend = $('benchmarkBarsLegend');
    const empty = $('benchmarkBarsEmpty');
    const subtitle = $('benchmarkBarsSubtitle');
    const card = $('benchmarkBarsCard');
    const tooltip = $('benchmarkBarsTooltip');
    const tooltipTitle = $('benchmarkBarsTooltipTitle');
    const tooltipValue = $('benchmarkBarsTooltipValue');
    const tooltipDriver = $('benchmarkBarsTooltipDriver');
    if (!svg || !labels || !yAxis || !legend || !empty || !subtitle) return;

    const { projects, subsystems } = dataset;
    const orderedProjects = projects.map((project) => project.label);
    const projectColorMap = new Map(orderedProjects.map((project, index) => [project, colorForSeriesIndex(index)]));
    const categories = subsystems.filter((subsystem) => projects.some((project) => (project.adjustedBySubsystem.get(subsystem) || 0) > 0));

    legend.innerHTML = orderedProjects.map((project) => `
      <div class="flex items-center gap-2">
        <span class="inline-block size-2.5 rounded-full" style="background:${projectColorMap.get(project)};"></span>
        <span class="truncate max-w-[160px]" title="${escapeHtml(project)}">${escapeHtml(project)}</span>
      </div>
    `).join("");
    subtitle.textContent = `Normalized day + night technicians by subsystem and project - ${formatSubsystemSelectionLabel()}`;

    if (!projects.length || !categories.length) {
      svg.innerHTML = "";
      labels.innerHTML = "";
      labels.style.gridTemplateColumns = "none";
      yAxis.innerHTML = `<span>0</span><span>0</span><span>0</span><span>0</span>`;
      tooltip?.classList.add('hidden');
      empty.classList.remove('hidden');
      return;
    }

    empty.classList.add('hidden');
    const values = projects.flatMap((project) => categories.map((subsystem) => project.adjustedBySubsystem.get(subsystem) || 0));
    const maxV = Math.max(1, ...values);
    const ticks = [maxV, maxV * 0.66, maxV * 0.33, 0];
    const chartBottom = 260;
    const chartHeight = 240;
    const step = 1000 / categories.length;
    const barGap = Math.max(2, Math.min(8, step * 0.04));
    const groupPadding = Math.max(12, step * 0.12);
    const availableGroupWidth = Math.max(36, step - (groupPadding * 2));
    const barWidth = Math.max(8, Math.min(40, (availableGroupWidth - (barGap * Math.max(0, orderedProjects.length - 1))) / Math.max(1, orderedProjects.length)));
    const yFor = (value) => chartBottom - ((value / maxV) * chartHeight);

    yAxis.innerHTML = ticks.map((tick) => `<span>${escapeHtml(formatCompactNumber(tick, 2))}</span>`).join("");
    const tooltipData = new Map();
    svg.innerHTML = `
      <g>
        ${ticks.map((tick, idx) => `<line x1="0" y1="${yFor(tick).toFixed(1)}" x2="1000" y2="${yFor(tick).toFixed(1)}" stroke="#cbd5e1" stroke-width="1" ${idx === 0 || idx === ticks.length - 1 ? "" : 'stroke-dasharray="4,6"'}></line>`).join("")}
      </g>
      <g>
        ${categories.map((subsystem, index) => {
          const groupWidth = (orderedProjects.length * barWidth) + (Math.max(0, orderedProjects.length - 1) * barGap);
          const groupStartX = (step * index) + ((step - groupWidth) / 2);
          return projects.map((project, projectIndex) => {
            const value = project.adjustedBySubsystem.get(subsystem) || 0;
            const x = groupStartX + (projectIndex * (barWidth + barGap));
            const y = yFor(value);
            const height = chartBottom - y;
            const barKey = `benchmark-${index}-${projectIndex}`;
            tooltipData.set(barKey, {
              subsystem,
              project: project.label,
              adjustedValue: value,
              rawValue: project.rawBySubsystem.get(subsystem) || 0,
              driver: getBenchmarkDriverInfo(subsystem, project.gp || {}),
            });
            return `
              <g>
                <rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barWidth.toFixed(1)}" height="${Math.max(0, height).toFixed(1)}" rx="8" fill="${projectColorMap.get(project.label)}" opacity="0.92"></rect>
                <rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barWidth.toFixed(1)}" height="${Math.max(1, height).toFixed(1)}" fill="transparent" data-benchmark-bar="${barKey}" style="cursor:pointer;"></rect>
              </g>
            `;
          }).join("");
        }).join("")}
      </g>
    `;

    labels.style.gridTemplateColumns = `repeat(${categories.length}, minmax(0, 1fr))`;
    labels.innerHTML = categories.map((subsystem) => `<div class="text-center">${escapeHtml(subsystem)}</div>`).join("");

    if (!card || !tooltip || !tooltipTitle || !tooltipValue || !tooltipDriver) return;
    tooltip.classList.add('hidden');

    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const hideTooltip = () => tooltip.classList.add('hidden');
    const updateTooltip = (event, key) => {
      const item = tooltipData.get(String(key));
      if (!item) return;

      tooltipTitle.textContent = `${item.subsystem} - ${item.project}`;
      tooltipValue.innerHTML = `
        <div><span class="font-semibold text-slate-700 dark:text-slate-100">${formatCompactNumber(item.adjustedValue, 2)}</span> benchmark technicians</div>
        <div class="mt-1 text-[10px] text-slate-500 dark:text-slate-400">Raw day + night technicians: ${formatInt(item.rawValue)}</div>
      `;
      tooltipDriver.innerHTML = `
        <div><span class="font-semibold text-slate-600 dark:text-slate-200">Based on:</span> ${escapeHtml(item.driver.basisLabel)}</div>
        <div class="mt-1"><span class="font-semibold text-slate-600 dark:text-slate-200">Driver value:</span> ${escapeHtml(String(item.driver.basisValue || 0))}</div>
        <div class="mt-1">${escapeHtml(item.driver.detail)}</div>
      `;

      tooltip.classList.remove('hidden');
      const cardRect = card.getBoundingClientRect();
      const tipRect = tooltip.getBoundingClientRect();
      let left = (event.clientX - cardRect.left) + 12;
      let top = (event.clientY - cardRect.top) - tipRect.height - 10;
      left = clamp(left, 12, cardRect.width - tipRect.width - 12);
      top = clamp(top, 12, cardRect.height - tipRect.height - 12);
      tooltip.style.left = `${left}px`;
      tooltip.style.top = `${top}px`;
    };

    svg.querySelectorAll('[data-benchmark-bar]').forEach((bar) => {
      bar.addEventListener('pointerenter', (event) => updateTooltip(event, bar.getAttribute('data-benchmark-bar')));
      bar.addEventListener('pointermove', (event) => updateTooltip(event, bar.getAttribute('data-benchmark-bar')));
      bar.addEventListener('pointerleave', hideTooltip);
    });
  }

  function renderBenchmarkBarsTable(dataset) {
    const thead = $('benchmarkBarsTableHead');
    const tbody = $('benchmarkBarsTableBody');
    if (!thead || !tbody) return;

    const getComment = (subsystem) => {
      const key = normalizeBenchmarkSubsystem(subsystem);
      if (key === "POS") return "Number of technicians per Substation";
      if (key === "PSD") return "Number of technicians per APSD";
      if (key === "AFC") return "Number of technicians per Station";
      if (key === "Track") {
        return state.currentBenchmarkTrackDriver === "turnout"
          ? "Number of technicians per Turnout"
          : "Number of technicians per Km single track";
      }
      if (key === "3rd_Rail" || key === "CAT") return "Number of technicians per Km single track";
      if (key === "DEQ" || key === "VMI" || key === "MEP") return "Number of technicians per Project";
      return "Number of technicians per Project";
    };

    const projects = dataset.projects || [];
    const subsystems = (dataset.subsystems || []).filter((subsystem) =>
      projects.some((project) => (project.rawBySubsystem.get(subsystem) || 0) > 0 || (project.adjustedBySubsystem.get(subsystem) || 0) > 0)
    );
    const projectColorMap = new Map(projects.map((project, index) => [project.label, colorForSeriesIndex(index)]));

    if (!projects.length || !subsystems.length) {
      thead.innerHTML = `
        <tr class="border-b border-slate-100 dark:border-slate-800">
          <th class="text-left py-3 pr-4">Subsystem</th>
          <th class="text-right py-3 px-4">Total Technicians</th>
          <th class="text-right py-3 pl-4">Normalized Technicians</th>
          <th class="text-left py-3 pl-4">Comments</th>
        </tr>
      `;
      tbody.innerHTML = `
        <tr>
          <td colspan="4" class="py-6 text-center text-sm text-slate-500 dark:text-slate-400">No benchmark data available.</td>
        </tr>
      `;
      return;
    }

    thead.innerHTML = `
      <tr class="border-b border-slate-100 dark:border-slate-800">
        <th rowspan="2" class="text-left py-3 pr-4 align-bottom">Subsystem</th>
        <th colspan="${projects.length}" class="text-center py-3 px-4">Total Technicians</th>
        <th colspan="${projects.length}" class="text-center py-3 pl-4">Normalized Technicians</th>
        <th rowspan="2" class="text-left py-3 pl-4 align-bottom">Comments</th>
      </tr>
      <tr class="border-b border-slate-100 dark:border-slate-800">
        ${projects.map((project, index) => `
          <th class="${index === 0 ? "text-right py-3 px-4" : "text-right py-3 px-4"}">
            <span class="inline-flex items-center gap-2 justify-end w-full">
              <span class="inline-block size-2 rounded-full" style="background:${projectColorMap.get(project.label) || "#94a3b8"};"></span>
              <span class="truncate max-w-[120px]" title="${escapeHtml(project.label)}">${escapeHtml(project.label)}</span>
            </span>
          </th>
        `).join("")}
        ${projects.map((project, index) => `
          <th class="${index === 0 ? "text-right py-3 pl-4 pr-4" : "text-right py-3 px-4"}">
            <span class="inline-flex items-center gap-2 justify-end w-full">
              <span class="inline-block size-2 rounded-full" style="background:${projectColorMap.get(project.label) || "#94a3b8"};"></span>
              <span class="truncate max-w-[120px]" title="${escapeHtml(project.label)}">${escapeHtml(project.label)}</span>
            </span>
          </th>
        `).join("")}
      </tr>
    `;

    tbody.innerHTML = subsystems.map((subsystem) => `
      <tr>
        <td class="py-3 pr-4 font-semibold">${escapeHtml(subsystem)}</td>
        ${projects.map((project, index) => `
          <td class="${index === 0 ? "py-3 px-4 text-right font-medium" : "py-3 px-4 text-right font-medium"}">${escapeHtml(formatInt(project.rawBySubsystem.get(subsystem) || 0))}</td>
        `).join("")}
        ${projects.map((project, index) => `
          <td class="${index === 0 ? "py-3 pl-4 pr-4 text-right font-medium" : "py-3 px-4 text-right font-medium"}">${escapeHtml(formatCompactNumber(project.adjustedBySubsystem.get(subsystem) || 0, 2))}</td>
        `).join("")}
        <td class="py-3 pl-4 text-slate-500 dark:text-slate-300">${escapeHtml(getComment(subsystem))}</td>
      </tr>
    `).join("");
  }

  function getBenchmarkMaterialsCostComment(subsystem) {
    const key = normalizeBenchmarkSubsystem(subsystem);
    if (key === "POS") return "Material Annual Cost per Substation";
    if (key === "PSD") return "Material Annual Cost per APSD";
    if (key === "AFC") return "Material Annual Cost per Station";
    if (key === "Track") {
      return state.currentBenchmarkCostTrackDriver === "turnout"
        ? "Material Annual Cost per Turnout"
        : "Material Annual Cost per Km single track";
    }
    if (key === "3rd_Rail" || key === "CAT") return "Material Annual Cost per Km single track";
    if (key === "DEQ" || key === "VMI" || key === "MEP") return "Material Annual Cost per Project";
    return "Material Annual Cost per Project";
  }

  function getBenchmarkGlobalCostComment(subsystem) {
    const key = normalizeBenchmarkSubsystem(subsystem);
    if (key === "POS") return "Overhaul & Renewal Cost per Year and per Substation";
    if (key === "PSD") return "Overhaul & Renewal Cost per Year and per APSD";
    if (key === "AFC") return "Overhaul & Renewal Cost per Year and per Station";
    if (key === "Track") {
      return state.currentBenchmarkGlobalCostTrackDriver === "turnout"
        ? "Overhaul & Renewal Cost per Year and per Turnout"
        : "Overhaul & Renewal Cost per Year and per Km single track";
    }
    if (key === "3rd_Rail" || key === "CAT") return "Overhaul & Renewal Cost per Year and per Km single track";
    if (key === "DEQ" || key === "VMI" || key === "MEP") return "Overhaul & Renewal Cost per Year and per Project";
    return "Overhaul & Renewal Cost per Year and per Project";
  }

  function renderBenchmarkCostDetailTable(dataset) {
    const thead = $('benchmarkCostTableHead');
    const tbody = $('benchmarkCostTableBody');
    if (!thead || !tbody) return;

    const projects = dataset.projects || [];
    const subsystems = (dataset.subsystems || []).filter((subsystem) =>
      projects.some((project) => (project.averageBySubsystem.get(subsystem) || 0) > 0 || (project.adjustedAverageBySubsystem.get(subsystem) || 0) > 0)
    );
    const projectColorMap = new Map(projects.map((project, index) => [project.label, colorForSeriesIndex(index)]));

    if (!projects.length || !subsystems.length) {
      thead.innerHTML = `
        <tr class="border-b border-slate-100 dark:border-slate-800">
          <th class="text-left py-3 pr-4">Subsystem</th>
          <th class="text-right py-3 px-4">Average Annual Cost by Subsystem</th>
          <th class="text-right py-3 pl-4">Average Benchmark Cost by Subsystem</th>
          <th class="text-left py-3 pl-4">Comments</th>
        </tr>
      `;
      tbody.innerHTML = `
        <tr>
          <td colspan="4" class="py-6 text-center text-sm text-slate-500 dark:text-slate-400">No materials benchmark data available.</td>
        </tr>
      `;
      return;
    }

    thead.innerHTML = `
      <tr class="border-b border-slate-100 dark:border-slate-800">
        <th rowspan="2" class="text-left py-3 pr-4 align-bottom">Subsystem</th>
        <th colspan="${projects.length}" class="text-center py-3 px-4">Average Annual Cost by Subsystem</th>
        <th colspan="${projects.length}" class="text-center py-3 pl-4">Average Benchmark Cost by Subsystem</th>
        <th rowspan="2" class="text-left py-3 pl-4 align-bottom">Comments</th>
      </tr>
      <tr class="border-b border-slate-100 dark:border-slate-800">
        ${projects.map((project, index) => `
          <th class="${index === 0 ? "text-right py-3 px-4" : "text-right py-3 px-4"}">
            <span class="inline-flex items-center gap-2 justify-end w-full">
              <span class="inline-block size-2 rounded-full" style="background:${projectColorMap.get(project.label) || "#94a3b8"};"></span>
              <span class="truncate max-w-[120px]" title="${escapeHtml(project.label)}">${escapeHtml(project.label)}</span>
            </span>
          </th>
        `).join("")}
        ${projects.map((project, index) => `
          <th class="${index === 0 ? "text-right py-3 pl-4 pr-4" : "text-right py-3 px-4"}">
            <span class="inline-flex items-center gap-2 justify-end w-full">
              <span class="inline-block size-2 rounded-full" style="background:${projectColorMap.get(project.label) || "#94a3b8"};"></span>
              <span class="truncate max-w-[120px]" title="${escapeHtml(project.label)}">${escapeHtml(project.label)}</span>
            </span>
          </th>
        `).join("")}
      </tr>
    `;

    tbody.innerHTML = subsystems.map((subsystem) => `
      <tr>
        <td class="py-3 pr-4 font-semibold">${escapeHtml(subsystem)}</td>
        ${projects.map((project) => `
          <td class="py-3 px-4 text-right font-medium">${escapeHtml(formatCurrencyValue(project.averageBySubsystem.get(subsystem) || 0, state.currentMaterialCurrency, 0))}</td>
        `).join("")}
        ${projects.map((project, index) => `
          <td class="${index === 0 ? "py-3 pl-4 pr-4 text-right font-medium" : "py-3 px-4 text-right font-medium"}">${escapeHtml(formatCurrencyValue(project.adjustedAverageBySubsystem.get(subsystem) || 0, state.currentMaterialCurrency, 0))}</td>
        `).join("")}
        <td class="py-3 pl-4 text-slate-500 dark:text-slate-300">${escapeHtml(getBenchmarkMaterialsCostComment(subsystem))}</td>
      </tr>
    `).join("");
  }

  function renderBenchmarkGlobalCostDetailTable(dataset) {
    const thead = $('benchmarkGlobalCostTableHead');
    const tbody = $('benchmarkGlobalCostTableBody');
    if (!thead || !tbody) return;

    const projects = dataset.projects || [];
    const subsystems = (dataset.subsystems || []).filter((subsystem) =>
      projects.some((project) => (project.bySubsystem.get(subsystem) || 0) > 0 || (project.adjustedBySubsystem.get(subsystem) || 0) > 0)
    );
    const projectColorMap = new Map(projects.map((project, index) => [project.label, colorForSeriesIndex(index)]));

    if (!projects.length || !subsystems.length) {
      thead.innerHTML = `
        <tr class="border-b border-slate-100 dark:border-slate-800">
          <th class="text-left py-3 pr-4">Subsystem</th>
          <th class="text-right py-3 px-4">Total Global Cost by Subsystem</th>
          <th class="text-right py-3 pl-4">Total Benchmark Global Cost by Subsystem</th>
          <th class="text-left py-3 pl-4">Comments</th>
        </tr>
      `;
      tbody.innerHTML = `
        <tr>
          <td colspan="4" class="py-6 text-center text-sm text-slate-500 dark:text-slate-400">No overhaul and renewal benchmark data available.</td>
        </tr>
      `;
      return;
    }

    thead.innerHTML = `
      <tr class="border-b border-slate-100 dark:border-slate-800">
        <th rowspan="2" class="text-left py-3 pr-4 align-bottom">Subsystem</th>
        <th colspan="${projects.length}" class="text-center py-3 px-4">Total Global Cost by Subsystem</th>
        <th colspan="${projects.length}" class="text-center py-3 pl-4">Total Benchmark Global Cost by Subsystem</th>
        <th rowspan="2" class="text-left py-3 pl-4 align-bottom">Comments</th>
      </tr>
      <tr class="border-b border-slate-100 dark:border-slate-800">
        ${projects.map((project, index) => `
          <th class="${index === 0 ? "text-right py-3 px-4" : "text-right py-3 px-4"}">
            <span class="inline-flex items-center gap-2 justify-end w-full">
              <span class="inline-block size-2 rounded-full" style="background:${projectColorMap.get(project.label) || "#94a3b8"};"></span>
              <span class="truncate max-w-[120px]" title="${escapeHtml(project.label)}">${escapeHtml(project.label)}</span>
            </span>
          </th>
        `).join("")}
        ${projects.map((project, index) => `
          <th class="${index === 0 ? "text-right py-3 pl-4 pr-4" : "text-right py-3 px-4"}">
            <span class="inline-flex items-center gap-2 justify-end w-full">
              <span class="inline-block size-2 rounded-full" style="background:${projectColorMap.get(project.label) || "#94a3b8"};"></span>
              <span class="truncate max-w-[120px]" title="${escapeHtml(project.label)}">${escapeHtml(project.label)}</span>
            </span>
          </th>
        `).join("")}
      </tr>
    `;

    tbody.innerHTML = subsystems.map((subsystem) => `
      <tr>
        <td class="py-3 pr-4 font-semibold">${escapeHtml(subsystem)}</td>
        ${projects.map((project) => `
          <td class="py-3 px-4 text-right font-medium">${escapeHtml(formatCurrencyValue(project.bySubsystem.get(subsystem) || 0, state.currentMaterialCurrency, 0))}</td>
        `).join("")}
        ${projects.map((project, index) => `
          <td class="${index === 0 ? "py-3 pl-4 pr-4 text-right font-medium" : "py-3 px-4 text-right font-medium"}">${escapeHtml(formatCurrencyValue(project.adjustedBySubsystem.get(subsystem) || 0, state.currentMaterialCurrency, 0))}</td>
        `).join("")}
        <td class="py-3 pl-4 text-slate-500 dark:text-slate-300">${escapeHtml(getBenchmarkGlobalCostComment(subsystem))}</td>
      </tr>
    `).join("");
  }

  function renderBenchmarkPieChart(dataset) {
    const svg = $('benchmarkPieSvg');
    const legend = $('benchmarkPieLegend');
    const empty = $('benchmarkPieEmpty');
    const centerValue = $('benchmarkPieCenterValue');
    const subtitle = $('benchmarkPieSubtitle');
    const card = $('benchmarkPieCard');
    const tooltip = $('benchmarkPieTooltip');
    const tooltipTitle = $('benchmarkPieTooltipTitle');
    const tooltipValue = $('benchmarkPieTooltipValue');
    const tooltipProjects = $('benchmarkPieTooltipProjects');
    if (!svg || !legend || !empty || !centerValue || !subtitle) return;

    const items = Array.from(dataset.rawBySubsystem.entries())
      .map(([label, value]) => ({ label, value }))
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value);
    const total = items.reduce((sum, item) => sum + item.value, 0);
    subtitle.textContent = `Global day + night technicians by subsystem - ${formatSubsystemSelectionLabel()}`;
    centerValue.textContent = formatInt(total);

    if (!items.length || total <= 0) {
      svg.innerHTML = "";
      legend.innerHTML = "";
      tooltip?.classList.add('hidden');
      empty.classList.remove('hidden');
      return;
    }

    empty.classList.add('hidden');
    const radius = 24;
    const circumference = 2 * Math.PI * radius;
    let offset = 0;
    const tooltipData = new Map();
    svg.innerHTML = `
      <circle cx="32" cy="32" r="${radius}" fill="none" stroke="#e2e8f0" stroke-width="10"></circle>
      ${items.map((item, index) => {
        const fraction = item.value / total;
        const dash = fraction * circumference;
        const stroke = MATERIAL_PIE_COLORS[index % MATERIAL_PIE_COLORS.length];
        const key = `benchmark-pie-${index}`;
        tooltipData.set(key, {
          label: item.label,
          value: item.value,
          pct: total > 0 ? (item.value / total) * 100 : 0,
          color: stroke,
          projects: dataset.projects
            .map((project) => ({
              project: project.label,
              value: project.rawBySubsystem.get(item.label) || 0,
            }))
            .filter((project) => project.value > 0)
            .sort((a, b) => b.value - a.value),
        });
        const circle = `
          <circle cx="32" cy="32" r="${radius}" fill="none" stroke="transparent" stroke-width="18" stroke-dasharray="${dash} ${circumference - dash}" stroke-dashoffset="${-offset}" data-benchmark-pie-key="${key}" pointer-events="stroke" style="cursor:pointer;"></circle>
          <circle cx="32" cy="32" r="${radius}" fill="none" stroke="${stroke}" stroke-width="10" stroke-dasharray="${dash} ${circumference - dash}" stroke-dashoffset="${-offset}" pointer-events="none"></circle>
        `;
        offset += dash;
        return circle;
      }).join("")}
    `;

    const projectColorMap = new Map(dataset.projects.map((project, index) => [project.label, colorForSeriesIndex(index)]));
    legend.innerHTML = items.map((item, index) => {
      const pct = total > 0 ? (item.value / total) * 100 : 0;
      const color = MATERIAL_PIE_COLORS[index % MATERIAL_PIE_COLORS.length];
      const projectItems = dataset.projects
        .map((project) => ({
          project: project.label,
          value: project.rawBySubsystem.get(item.label) || 0,
        }))
        .filter((project) => project.value > 0)
        .sort((a, b) => b.value - a.value);
      return `
        <div class="border-b border-slate-100 dark:border-slate-800 py-3">
          <div class="flex items-center justify-between gap-3">
            <div class="flex items-center gap-3 min-w-0">
              <span class="inline-block size-3 rounded-full flex-shrink-0" style="background:${color};"></span>
              <span class="text-sm font-medium truncate">${escapeHtml(item.label)}</span>
            </div>
            <div class="text-right">
              <div class="text-sm font-semibold">${pct.toFixed(1)}%</div>
              <div class="text-[11px] text-slate-500 dark:text-slate-400">${escapeHtml(formatInt(item.value))}</div>
            </div>
          </div>
          ${projectItems.length
            ? `
              <details class="mt-2 group">
                <summary class="cursor-pointer list-none text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2 select-none">
                  <span class="font-medium">Project details</span>
                  <span>(${projectItems.length})</span>
                  <span class="text-[10px] group-open:hidden">Show</span>
                  <span class="text-[10px] hidden group-open:inline">Hide</span>
                </summary>
                <div class="mt-2 space-y-1.5 pl-5">
                  ${projectItems.map((projectItem) => {
                    const projectPct = item.value > 0 ? (projectItem.value / item.value) * 100 : 0;
                    const projectColor = projectColorMap.get(projectItem.project) || "#94a3b8";
                    return `
                      <div class="flex items-center justify-between gap-3 text-[11px]">
                        <div class="flex min-w-0 items-center gap-2">
                          <span class="inline-block size-2.5 rounded-full shrink-0" style="background:${projectColor};"></span>
                          <span class="truncate text-slate-600 dark:text-slate-300" title="${escapeHtml(projectItem.project)}">${escapeHtml(projectItem.project)}</span>
                        </div>
                        <div class="shrink-0 text-right">
                          <div class="font-semibold text-slate-700 dark:text-slate-100">${projectPct.toFixed(1)}%</div>
                          <div class="text-[10px] text-slate-500 dark:text-slate-400">${escapeHtml(formatInt(projectItem.value))}</div>
                        </div>
                      </div>
                    `;
                  }).join("")}
                </div>
              </details>
            `
            : `<div class="mt-2 text-[10px] text-slate-500 dark:text-slate-400">No project split available.</div>`}
        </div>
      `;
    }).join("");

    if (!card || !tooltip || !tooltipTitle || !tooltipValue || !tooltipProjects) return;
    tooltip.classList.add('hidden');

    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const hideTooltip = () => tooltip.classList.add('hidden');
    const updateTooltip = (event, key) => {
      const item = tooltipData.get(String(key));
      if (!item) return;

      tooltipTitle.textContent = item.label;
      tooltipValue.innerHTML = `
        <div><span class="font-semibold text-slate-700 dark:text-slate-100">${formatInt(item.value)}</span> technicians</div>
        <div class="mt-1 text-[10px] text-slate-500 dark:text-slate-400">${item.pct.toFixed(1)}% of total technicians</div>
      `;
      tooltipProjects.innerHTML = item.projects.length
        ? item.projects.map((projectItem) => {
            const pct = item.value > 0 ? (projectItem.value / item.value) * 100 : 0;
            return `
              <div class="flex items-center justify-between gap-3">
                <span class="truncate text-slate-600 dark:text-slate-300" title="${escapeHtml(projectItem.project)}">${escapeHtml(projectItem.project)}</span>
                <div class="shrink-0 text-right">
                  <div class="font-semibold text-slate-700 dark:text-slate-100">${pct.toFixed(1)}%</div>
                  <div class="text-[10px] text-slate-500 dark:text-slate-400">${escapeHtml(formatInt(projectItem.value))}</div>
                </div>
              </div>
            `;
          }).join("")
        : `<div class="text-[10px] text-slate-500 dark:text-slate-400">No project split available.</div>`;

      tooltip.classList.remove('hidden');
      const cardRect = card.getBoundingClientRect();
      const tipRect = tooltip.getBoundingClientRect();
      let left = (event.clientX - cardRect.left) + 12;
      let top = (event.clientY - cardRect.top) - tipRect.height - 10;
      left = clamp(left, 12, cardRect.width - tipRect.width - 12);
      top = clamp(top, 12, cardRect.height - tipRect.height - 12);
      tooltip.style.left = `${left}px`;
      tooltip.style.top = `${top}px`;
    };

    svg.querySelectorAll('[data-benchmark-pie-key]').forEach((slice) => {
      slice.addEventListener('pointerenter', (event) => updateTooltip(event, slice.getAttribute('data-benchmark-pie-key')));
      slice.addEventListener('pointermove', (event) => updateTooltip(event, slice.getAttribute('data-benchmark-pie-key')));
      slice.addEventListener('pointerleave', hideTooltip);
    });
  }

  function renderBenchmarkCostLineChart(dataset) {
    const svg = $('benchmarkCostLineSvg');
    const labels = $('benchmarkCostLineLabels');
    const yAxis = $('benchmarkCostLineYAxis');
    const legend = $('benchmarkCostLineLegend');
    const empty = $('benchmarkCostLineEmpty');
    const subtitle = $('benchmarkCostLineSubtitle');
    const card = $('benchmarkCostLineCard');
    const tooltip = $('benchmarkCostLineTooltip');
    const tooltipTitle = $('benchmarkCostLineTooltipTitle');
    const tooltipValue = $('benchmarkCostLineTooltipValue');
    if (!svg || !labels || !yAxis || !legend || !empty || !subtitle) return;

    const orderedProjects = dataset.projects.map((project) => project.label);
    const projectColorMap = new Map(orderedProjects.map((project, index) => [project, colorForSeriesIndex(index)]));
    const categories = dataset.subsystems.filter((subsystem) => dataset.projects.some((project) => (project.averageBySubsystem.get(subsystem) || 0) > 0));
    subtitle.textContent = `Source: ${dataset.sourceLabel} - annual average cost by subsystem and project - currency ${state.currentMaterialCurrency}${dataset.skipped ? ` - ${dataset.skipped} row(s) skipped because a conversion rate is missing` : ""}`;
    legend.innerHTML = orderedProjects.map((project) => `
      <div class="flex items-center gap-2">
        <span class="inline-block size-2.5 rounded-full" style="background:${projectColorMap.get(project)};"></span>
        <span class="truncate max-w-[160px]" title="${escapeHtml(project)}">${escapeHtml(project)}</span>
      </div>
    `).join("");

    if (!dataset.projects.length || !categories.length) {
      svg.innerHTML = "";
      labels.innerHTML = "";
      labels.style.gridTemplateColumns = "none";
      yAxis.innerHTML = `<span>0</span><span>0</span><span>0</span><span>0</span>`;
      tooltip?.classList.add('hidden');
      empty.classList.remove('hidden');
      return;
    }

    empty.classList.add('hidden');
    const values = dataset.projects.flatMap((project) => categories.map((subsystem) => project.averageBySubsystem.get(subsystem) || 0));
    const maxV = Math.max(1, ...values);
    const ticks = [maxV, maxV * 0.66, maxV * 0.33, 0];
    const chartBottom = 260;
    const chartHeight = 240;
    const xFor = (index) => categories.length === 1 ? 500 : index * (1000 / (categories.length - 1));
    const yFor = (value) => chartBottom - ((value / maxV) * chartHeight);

    yAxis.innerHTML = ticks.map((tick) => `<span>${escapeHtml(formatCompactNumber(tick, 2))}</span>`).join("");
    const tooltipData = new Map();
    svg.innerHTML = `
      <g>
        ${ticks.map((tick, idx) => `<line x1="0" y1="${yFor(tick).toFixed(1)}" x2="1000" y2="${yFor(tick).toFixed(1)}" stroke="#cbd5e1" stroke-width="1" ${idx === 0 || idx === ticks.length - 1 ? "" : 'stroke-dasharray="4,6"'}></line>`).join("")}
      </g>
      <g>
        ${dataset.projects.map((project) => {
          const points = categories.map((subsystem, index) => ({
            x: xFor(index),
            y: yFor(project.averageBySubsystem.get(subsystem) || 0),
            value: project.averageBySubsystem.get(subsystem) || 0,
          }));
          const color = projectColorMap.get(project.label) || "#137fec";
          const path = points.length > 1 ? `<path d="${toSmoothPath(points)}" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" opacity="0.95"></path>` : "";
          const dots = points.map((point, pointIndex) => {
            const key = `benchmark-cost-line-${project.label}-${pointIndex}`;
            tooltipData.set(key, {
              project: project.label,
              subsystem: categories[pointIndex],
              value: point.value,
            });
            return `
              <circle cx="${point.x.toFixed(1)}" cy="${point.y.toFixed(1)}" r="4.5" fill="${color}" stroke="#ffffff" stroke-width="2"></circle>
              <circle cx="${point.x.toFixed(1)}" cy="${point.y.toFixed(1)}" r="10" fill="transparent" data-benchmark-cost-line="${key}" style="cursor:pointer;"></circle>
            `;
          }).join("");
          return `<g>${path}${dots}</g>`;
        }).join("")}
      </g>
    `;

    labels.style.gridTemplateColumns = `repeat(${categories.length}, minmax(0, 1fr))`;
    labels.innerHTML = categories.map((subsystem) => `<div class="text-center">${escapeHtml(subsystem)}</div>`).join("");

    if (!card || !tooltip || !tooltipTitle || !tooltipValue) return;
    tooltip.classList.add('hidden');
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const hideTooltip = () => tooltip.classList.add('hidden');
    const updateTooltip = (event, key) => {
      const item = tooltipData.get(String(key));
      if (!item) return;
      tooltipTitle.textContent = `${item.subsystem} - ${item.project}`;
      tooltipValue.innerHTML = `<div><span class="font-semibold text-slate-700 dark:text-slate-100">${escapeHtml(formatCurrencyValue(item.value, state.currentMaterialCurrency, 0))}</span></div>`;
      tooltip.classList.remove('hidden');
      const cardRect = card.getBoundingClientRect();
      const tipRect = tooltip.getBoundingClientRect();
      let left = (event.clientX - cardRect.left) + 12;
      let top = (event.clientY - cardRect.top) - tipRect.height - 10;
      left = clamp(left, 12, cardRect.width - tipRect.width - 12);
      top = clamp(top, 12, cardRect.height - tipRect.height - 12);
      tooltip.style.left = `${left}px`;
      tooltip.style.top = `${top}px`;
    };

    svg.querySelectorAll('[data-benchmark-cost-line]').forEach((dot) => {
      dot.addEventListener('pointerenter', (event) => updateTooltip(event, dot.getAttribute('data-benchmark-cost-line')));
      dot.addEventListener('pointermove', (event) => updateTooltip(event, dot.getAttribute('data-benchmark-cost-line')));
      dot.addEventListener('pointerleave', hideTooltip);
    });
  }

  function renderBenchmarkCostBarsChart(dataset) {
    const svg = $('benchmarkCostBarsSvg');
    const labels = $('benchmarkCostBarsLabels');
    const yAxis = $('benchmarkCostBarsYAxis');
    const legend = $('benchmarkCostBarsLegend');
    const empty = $('benchmarkCostBarsEmpty');
    const subtitle = $('benchmarkCostBarsSubtitle');
    const card = $('benchmarkCostBarsCard');
    const tooltip = $('benchmarkCostBarsTooltip');
    const tooltipTitle = $('benchmarkCostBarsTooltipTitle');
    const tooltipValue = $('benchmarkCostBarsTooltipValue');
    if (!svg || !labels || !yAxis || !legend || !empty || !subtitle) return;

    const orderedProjects = dataset.projects.map((project) => project.label);
    const projectColorMap = new Map(orderedProjects.map((project, index) => [project, colorForSeriesIndex(index)]));
    const categories = dataset.subsystems.filter((subsystem) => dataset.projects.some((project) => (project.adjustedAverageBySubsystem.get(subsystem) || 0) > 0));
    subtitle.textContent = `Source: ${dataset.sourceLabel} - average benchmark cost by subsystem and project - currency ${state.currentMaterialCurrency} - Track normalized by ${state.currentBenchmarkCostTrackDriver === "km_single_track" ? "Km single track" : "Turnout"}`;
    legend.innerHTML = orderedProjects.map((project) => `
      <div class="flex items-center gap-2">
        <span class="inline-block size-2.5 rounded-full" style="background:${projectColorMap.get(project)};"></span>
        <span class="truncate max-w-[160px]" title="${escapeHtml(project)}">${escapeHtml(project)}</span>
      </div>
    `).join("");

    if (!dataset.projects.length || !categories.length) {
      svg.innerHTML = "";
      labels.innerHTML = "";
      labels.style.gridTemplateColumns = "none";
      yAxis.innerHTML = `<span>0</span><span>0</span><span>0</span><span>0</span>`;
      tooltip?.classList.add('hidden');
      empty.classList.remove('hidden');
      return;
    }

    empty.classList.add('hidden');
    const values = dataset.projects.flatMap((project) => categories.map((subsystem) => project.adjustedAverageBySubsystem.get(subsystem) || 0));
    const maxV = Math.max(1, ...values);
    const ticks = [maxV, maxV * 0.66, maxV * 0.33, 0];
    const chartBottom = 260;
    const chartHeight = 240;
    const step = 1000 / categories.length;
    const barGap = Math.max(2, Math.min(8, step * 0.04));
    const groupPadding = Math.max(12, step * 0.12);
    const availableGroupWidth = Math.max(36, step - (groupPadding * 2));
    const barWidth = Math.max(8, Math.min(40, (availableGroupWidth - (barGap * Math.max(0, orderedProjects.length - 1))) / Math.max(1, orderedProjects.length)));
    const yFor = (value) => chartBottom - ((value / maxV) * chartHeight);

    yAxis.innerHTML = ticks.map((tick) => `<span>${escapeHtml(formatCompactNumber(tick, 2))}</span>`).join("");
    const tooltipData = new Map();
    svg.innerHTML = `
      <g>
        ${ticks.map((tick, idx) => `<line x1="0" y1="${yFor(tick).toFixed(1)}" x2="1000" y2="${yFor(tick).toFixed(1)}" stroke="#cbd5e1" stroke-width="1" ${idx === 0 || idx === ticks.length - 1 ? "" : 'stroke-dasharray="4,6"'}></line>`).join("")}
      </g>
      <g>
        ${categories.map((subsystem, index) => {
          const groupWidth = (orderedProjects.length * barWidth) + (Math.max(0, orderedProjects.length - 1) * barGap);
          const groupStartX = (step * index) + ((step - groupWidth) / 2);
          return dataset.projects.map((project, projectIndex) => {
            const value = project.adjustedAverageBySubsystem.get(subsystem) || 0;
            const x = groupStartX + (projectIndex * (barWidth + barGap));
            const y = yFor(value);
            const height = chartBottom - y;
            const key = `benchmark-cost-bars-${index}-${projectIndex}`;
            tooltipData.set(key, {
              project: project.label,
              subsystem,
              value,
              rawValue: project.averageBySubsystem.get(subsystem) || 0,
              driver: getBenchmarkCostDriverInfo(subsystem, project.gp || {}),
            });
            return `
              <g>
                <rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barWidth.toFixed(1)}" height="${Math.max(0, height).toFixed(1)}" rx="8" fill="${projectColorMap.get(project.label)}" opacity="0.92"></rect>
                <rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barWidth.toFixed(1)}" height="${Math.max(1, height).toFixed(1)}" fill="transparent" data-benchmark-cost-bar="${key}" style="cursor:pointer;"></rect>
              </g>
            `;
          }).join("");
        }).join("")}
      </g>
    `;

    labels.style.gridTemplateColumns = `repeat(${categories.length}, minmax(0, 1fr))`;
    labels.innerHTML = categories.map((subsystem) => `<div class="text-center">${escapeHtml(subsystem)}</div>`).join("");

    if (!card || !tooltip || !tooltipTitle || !tooltipValue) return;
    tooltip.classList.add('hidden');
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const hideTooltip = () => tooltip.classList.add('hidden');
    const updateTooltip = (event, key) => {
      const item = tooltipData.get(String(key));
      if (!item) return;
      tooltipTitle.textContent = `${item.subsystem} - ${item.project}`;
      tooltipValue.innerHTML = `
        <div><span class="font-semibold text-slate-700 dark:text-slate-100">${escapeHtml(formatCurrencyValue(item.value, state.currentMaterialCurrency, 0))}</span> benchmark cost</div>
        <div class="mt-1 text-[10px] text-slate-500 dark:text-slate-400">Raw average annual cost: ${escapeHtml(formatCurrencyValue(item.rawValue, state.currentMaterialCurrency, 0))}</div>
        <div class="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700 text-[10px] text-slate-500 dark:text-slate-300">
          <div><span class="font-semibold text-slate-600 dark:text-slate-200">Based on:</span> ${escapeHtml(item.driver.basisLabel)}</div>
          <div class="mt-1"><span class="font-semibold text-slate-600 dark:text-slate-200">Driver value:</span> ${escapeHtml(String(item.driver.basisValue || 0))}</div>
          <div class="mt-1">${escapeHtml(item.driver.detail)}</div>
        </div>
      `;
      tooltip.classList.remove('hidden');
      const cardRect = card.getBoundingClientRect();
      const tipRect = tooltip.getBoundingClientRect();
      let left = (event.clientX - cardRect.left) + 12;
      let top = (event.clientY - cardRect.top) - tipRect.height - 10;
      left = clamp(left, 12, cardRect.width - tipRect.width - 12);
      top = clamp(top, 12, cardRect.height - tipRect.height - 12);
      tooltip.style.left = `${left}px`;
      tooltip.style.top = `${top}px`;
    };

    svg.querySelectorAll('[data-benchmark-cost-bar]').forEach((bar) => {
      bar.addEventListener('pointerenter', (event) => updateTooltip(event, bar.getAttribute('data-benchmark-cost-bar')));
      bar.addEventListener('pointermove', (event) => updateTooltip(event, bar.getAttribute('data-benchmark-cost-bar')));
      bar.addEventListener('pointerleave', hideTooltip);
    });
  }

  function renderBenchmarkGlobalCostLineChart(dataset) {
    const svg = $('benchmarkGlobalCostLineSvg');
    const labels = $('benchmarkGlobalCostLineLabels');
    const yAxis = $('benchmarkGlobalCostLineYAxis');
    const legend = $('benchmarkGlobalCostLineLegend');
    const empty = $('benchmarkGlobalCostLineEmpty');
    const subtitle = $('benchmarkGlobalCostLineSubtitle');
    const card = $('benchmarkGlobalCostLineCard');
    const tooltip = $('benchmarkGlobalCostLineTooltip');
    const tooltipTitle = $('benchmarkGlobalCostLineTooltipTitle');
    const tooltipValue = $('benchmarkGlobalCostLineTooltipValue');
    if (!svg || !labels || !yAxis || !legend || !empty || !subtitle) return;

    const orderedProjects = dataset.projects.map((project) => project.label);
    const projectColorMap = new Map(orderedProjects.map((project, index) => [project, colorForSeriesIndex(index)]));
    const categories = dataset.subsystems.filter((subsystem) => dataset.projects.some((project) => (project.bySubsystem.get(subsystem) || 0) > 0));
    subtitle.textContent = `Source: ${dataset.sourceLabel} - Total Global Cost by subsystem and project - Type Activity ${dataset.activityTypeLabel} - currency ${state.currentMaterialCurrency}${dataset.skipped ? ` - ${dataset.skipped} row(s) skipped because a conversion rate is missing` : ""}`;
    legend.innerHTML = orderedProjects.map((project) => `
      <div class="flex items-center gap-2">
        <span class="inline-block size-2.5 rounded-full" style="background:${projectColorMap.get(project)};"></span>
        <span class="truncate max-w-[160px]" title="${escapeHtml(project)}">${escapeHtml(project)}</span>
      </div>
    `).join("");

    if (!dataset.projects.length || !categories.length) {
      svg.innerHTML = "";
      labels.innerHTML = "";
      labels.style.gridTemplateColumns = "none";
      yAxis.innerHTML = `<span>0</span><span>0</span><span>0</span><span>0</span>`;
      tooltip?.classList.add('hidden');
      empty.classList.remove('hidden');
      return;
    }

    empty.classList.add('hidden');
    const values = dataset.projects.flatMap((project) => categories.map((subsystem) => project.bySubsystem.get(subsystem) || 0));
    const maxV = Math.max(1, ...values);
    const ticks = [maxV, maxV * 0.66, maxV * 0.33, 0];
    const chartBottom = 260;
    const chartHeight = 240;
    const xFor = (index) => categories.length === 1 ? 500 : index * (1000 / (categories.length - 1));
    const yFor = (value) => chartBottom - ((value / maxV) * chartHeight);

    yAxis.innerHTML = ticks.map((tick) => `<span>${escapeHtml(formatCompactNumber(tick, 2))}</span>`).join("");
    const tooltipData = new Map();
    svg.innerHTML = `
      <g>
        ${ticks.map((tick, idx) => `<line x1="0" y1="${yFor(tick).toFixed(1)}" x2="1000" y2="${yFor(tick).toFixed(1)}" stroke="#cbd5e1" stroke-width="1" ${idx === 0 || idx === ticks.length - 1 ? "" : 'stroke-dasharray="4,6"'}></line>`).join("")}
      </g>
      <g>
        ${dataset.projects.map((project) => {
          const points = categories.map((subsystem, index) => ({
            x: xFor(index),
            y: yFor(project.bySubsystem.get(subsystem) || 0),
            value: project.bySubsystem.get(subsystem) || 0,
          }));
          const color = projectColorMap.get(project.label) || "#137fec";
          const path = points.length > 1 ? `<path d="${toSmoothPath(points)}" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" opacity="0.95"></path>` : "";
          const dots = points.map((point, pointIndex) => {
            const subsystem = categories[pointIndex];
            const key = `benchmark-total-global-cost-line-${project.label}-${pointIndex}`;
            tooltipData.set(key, {
              subsystem,
              hoveredProject: project.label,
              values: dataset.projects
                .map((projectItem) => ({
                  project: projectItem.label,
                  value: projectItem.bySubsystem.get(subsystem) || 0,
                }))
                .filter((item) => item.value > 0),
            });
            return `
              <circle cx="${point.x.toFixed(1)}" cy="${point.y.toFixed(1)}" r="4.5" fill="${color}" stroke="#ffffff" stroke-width="2"></circle>
              <circle cx="${point.x.toFixed(1)}" cy="${point.y.toFixed(1)}" r="10" fill="transparent" data-benchmark-total-global-cost-line="${key}" style="cursor:pointer;"></circle>
            `;
          }).join("");
          return `<g>${path}${dots}</g>`;
        }).join("")}
      </g>
    `;

    labels.style.gridTemplateColumns = `repeat(${categories.length}, minmax(0, 1fr))`;
    labels.innerHTML = categories.map((subsystem) => `<div class="text-center">${escapeHtml(subsystem)}</div>`).join("");

    if (!card || !tooltip || !tooltipTitle || !tooltipValue) return;
    tooltip.classList.add('hidden');
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const hideTooltip = () => tooltip.classList.add('hidden');
    const updateTooltip = (event, key) => {
      const item = tooltipData.get(String(key));
      if (!item) return;
      tooltipTitle.textContent = item.subsystem;
      tooltipValue.innerHTML = item.values.length
        ? item.values.map((projectItem) => `
            <div class="flex items-center justify-between gap-3 ${projectItem.project === item.hoveredProject ? 'font-semibold' : ''}">
              <div class="flex items-center gap-2 min-w-0">
                <span class="inline-block size-2 rounded-full shrink-0" style="background:${projectColorMap.get(projectItem.project) || "#94a3b8"};"></span>
                <span class="truncate" title="${escapeHtml(projectItem.project)}">${escapeHtml(projectItem.project)}</span>
              </div>
              <span class="text-slate-700 dark:text-slate-100">${escapeHtml(formatCurrencyValue(projectItem.value, state.currentMaterialCurrency, 0))}</span>
            </div>
          `).join("")
        : `<div>No project value available.</div>`;
      tooltip.classList.remove('hidden');
      const cardRect = card.getBoundingClientRect();
      const tipRect = tooltip.getBoundingClientRect();
      let left = (event.clientX - cardRect.left) + 12;
      let top = (event.clientY - cardRect.top) - tipRect.height - 10;
      left = clamp(left, 12, cardRect.width - tipRect.width - 12);
      top = clamp(top, 12, cardRect.height - tipRect.height - 12);
      tooltip.style.left = `${left}px`;
      tooltip.style.top = `${top}px`;
    };

    svg.querySelectorAll('[data-benchmark-total-global-cost-line]').forEach((dot) => {
      dot.addEventListener('pointerenter', (event) => updateTooltip(event, dot.getAttribute('data-benchmark-total-global-cost-line')));
      dot.addEventListener('pointermove', (event) => updateTooltip(event, dot.getAttribute('data-benchmark-total-global-cost-line')));
      dot.addEventListener('pointerleave', hideTooltip);
    });
  }

  function renderBenchmarkGlobalCostBarsChart(dataset) {
    const svg = $('benchmarkGlobalCostBarsSvg');
    const labels = $('benchmarkGlobalCostBarsLabels');
    const yAxis = $('benchmarkGlobalCostBarsYAxis');
    const legend = $('benchmarkGlobalCostBarsLegend');
    const empty = $('benchmarkGlobalCostBarsEmpty');
    const subtitle = $('benchmarkGlobalCostBarsSubtitle');
    const card = $('benchmarkGlobalCostBarsCard');
    const tooltip = $('benchmarkGlobalCostBarsTooltip');
    const tooltipTitle = $('benchmarkGlobalCostBarsTooltipTitle');
    const tooltipValue = $('benchmarkGlobalCostBarsTooltipValue');
    if (!svg || !labels || !yAxis || !legend || !empty || !subtitle) return;

    const orderedProjects = dataset.projects.map((project) => project.label);
    const projectColorMap = new Map(orderedProjects.map((project, index) => [project, colorForSeriesIndex(index)]));
    const categories = dataset.subsystems.filter((subsystem) => dataset.projects.some((project) => (project.adjustedBySubsystem.get(subsystem) || 0) > 0));
    subtitle.textContent = `Source: ${dataset.sourceLabel} - normalized Total Global Cost by subsystem and project - Type Activity ${dataset.activityTypeLabel} - currency ${state.currentMaterialCurrency} - Track normalized by ${state.currentBenchmarkGlobalCostTrackDriver === "turnout" ? "Turnout" : "Km single track"}`;
    legend.innerHTML = orderedProjects.map((project) => `
      <div class="flex items-center gap-2">
        <span class="inline-block size-2.5 rounded-full" style="background:${projectColorMap.get(project)};"></span>
        <span class="truncate max-w-[160px]" title="${escapeHtml(project)}">${escapeHtml(project)}</span>
      </div>
    `).join("");

    if (!dataset.projects.length || !categories.length) {
      svg.innerHTML = "";
      labels.innerHTML = "";
      labels.style.gridTemplateColumns = "none";
      yAxis.innerHTML = `<span>0</span><span>0</span><span>0</span><span>0</span>`;
      tooltip?.classList.add('hidden');
      empty.classList.remove('hidden');
      return;
    }

    empty.classList.add('hidden');
    const values = dataset.projects.flatMap((project) => categories.map((subsystem) => project.adjustedBySubsystem.get(subsystem) || 0));
    const maxV = Math.max(1, ...values);
    const ticks = [maxV, maxV * 0.66, maxV * 0.33, 0];
    const chartBottom = 260;
    const chartHeight = 240;
    const step = 1000 / categories.length;
    const barGap = Math.max(2, Math.min(8, step * 0.04));
    const groupPadding = Math.max(12, step * 0.12);
    const availableGroupWidth = Math.max(36, step - (groupPadding * 2));
    const barWidth = Math.max(8, Math.min(40, (availableGroupWidth - (barGap * Math.max(0, orderedProjects.length - 1))) / Math.max(1, orderedProjects.length)));
    const yFor = (value) => chartBottom - ((value / maxV) * chartHeight);

    yAxis.innerHTML = ticks.map((tick) => `<span>${escapeHtml(formatCompactNumber(tick, 2))}</span>`).join("");
    const tooltipData = new Map();
    svg.innerHTML = `
      <g>
        ${ticks.map((tick, idx) => `<line x1="0" y1="${yFor(tick).toFixed(1)}" x2="1000" y2="${yFor(tick).toFixed(1)}" stroke="#cbd5e1" stroke-width="1" ${idx === 0 || idx === ticks.length - 1 ? "" : 'stroke-dasharray="4,6"'}></line>`).join("")}
      </g>
      <g>
        ${categories.map((subsystem, index) => {
          const groupWidth = (orderedProjects.length * barWidth) + (Math.max(0, orderedProjects.length - 1) * barGap);
          const groupStartX = (step * index) + ((step - groupWidth) / 2);
          return dataset.projects.map((project, projectIndex) => {
            const value = project.adjustedBySubsystem.get(subsystem) || 0;
            const x = groupStartX + (projectIndex * (barWidth + barGap));
            const y = yFor(value);
            const height = chartBottom - y;
            const key = `benchmark-global-cost-bars-${index}-${projectIndex}`;
            tooltipData.set(key, {
              project: project.label,
              subsystem,
              value,
              rawValue: project.bySubsystem.get(subsystem) || 0,
              driver: getBenchmarkGlobalCostDriverInfo(subsystem, project.gp || {}),
            });
            return `
              <g>
                <rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barWidth.toFixed(1)}" height="${Math.max(0, height).toFixed(1)}" rx="8" fill="${projectColorMap.get(project.label)}" opacity="0.92"></rect>
                <rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barWidth.toFixed(1)}" height="${Math.max(1, height).toFixed(1)}" fill="transparent" data-benchmark-global-cost-bar="${key}" style="cursor:pointer;"></rect>
              </g>
            `;
          }).join("");
        }).join("")}
      </g>
    `;

    labels.style.gridTemplateColumns = `repeat(${categories.length}, minmax(0, 1fr))`;
    labels.innerHTML = categories.map((subsystem) => `<div class="text-center">${escapeHtml(subsystem)}</div>`).join("");

    if (!card || !tooltip || !tooltipTitle || !tooltipValue) return;
    tooltip.classList.add('hidden');
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const hideTooltip = () => tooltip.classList.add('hidden');
    const updateTooltip = (event, key) => {
      const item = tooltipData.get(String(key));
      if (!item) return;
      tooltipTitle.textContent = `${item.subsystem} - ${item.project}`;
      tooltipValue.innerHTML = `
        <div><span class="font-semibold text-slate-700 dark:text-slate-100">${escapeHtml(formatCurrencyValue(item.value, state.currentMaterialCurrency, 0))}</span> normalized total benchmark global cost</div>
        <div class="mt-1 text-[10px] text-slate-500 dark:text-slate-400">Raw Total Global Cost: ${escapeHtml(formatCurrencyValue(item.rawValue, state.currentMaterialCurrency, 0))}</div>
        <div class="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700 text-[10px] text-slate-500 dark:text-slate-300">
          <div><span class="font-semibold text-slate-600 dark:text-slate-200">Based on:</span> ${escapeHtml(item.driver.basisLabel)}</div>
          <div class="mt-1"><span class="font-semibold text-slate-600 dark:text-slate-200">Driver value:</span> ${escapeHtml(String(item.driver.basisValue || 0))}</div>
          <div class="mt-1">${escapeHtml(item.driver.detail)}</div>
        </div>
      `;
      tooltip.classList.remove('hidden');
      const cardRect = card.getBoundingClientRect();
      const tipRect = tooltip.getBoundingClientRect();
      let left = (event.clientX - cardRect.left) + 12;
      let top = (event.clientY - cardRect.top) - tipRect.height - 10;
      left = clamp(left, 12, cardRect.width - tipRect.width - 12);
      top = clamp(top, 12, cardRect.height - tipRect.height - 12);
      tooltip.style.left = `${left}px`;
      tooltip.style.top = `${top}px`;
    };

    svg.querySelectorAll('[data-benchmark-global-cost-bar]').forEach((bar) => {
      bar.addEventListener('pointerenter', (event) => updateTooltip(event, bar.getAttribute('data-benchmark-global-cost-bar')));
      bar.addEventListener('pointermove', (event) => updateTooltip(event, bar.getAttribute('data-benchmark-global-cost-bar')));
      bar.addEventListener('pointerleave', hideTooltip);
    });
  }

  function renderBenchmarkSubcontractingCostChart(dataset) {
    const svg = $('benchmarkSubcontractCostSvg');
    const labels = $('benchmarkSubcontractCostLabels');
    const yAxis = $('benchmarkSubcontractCostYAxis');
    const legend = $('benchmarkSubcontractCostLegend');
    const empty = $('benchmarkSubcontractCostEmpty');
    const subtitle = $('benchmarkSubcontractCostSubtitle');
    const card = $('benchmarkSubcontractCostCard');
    const tooltip = $('benchmarkSubcontractCostTooltip');
    const tooltipTitle = $('benchmarkSubcontractCostTooltipTitle');
    const tooltipValue = $('benchmarkSubcontractCostTooltipValue');
    const tooltipTypes = $('benchmarkSubcontractCostTooltipTypes');
    if (!svg || !labels || !yAxis || !legend || !empty || !subtitle) return;

    const orderedProjects = dataset.projects.map((project) => project.label);
    const projectColorMap = new Map(orderedProjects.map((project, index) => [project, colorForSeriesIndex(index)]));
    const categories = dataset.subsystems.filter((subsystem) => dataset.projects.some((project) => (project.bySubsystem.get(subsystem) || 0) > 0));
    subtitle.textContent = `Source: ${dataset.sourceLabel} - Yearly Cost (Subcontracting) by subsystem and project - currency ${state.currentMaterialCurrency}${dataset.skipped ? ` - ${dataset.skipped} row(s) skipped because a conversion rate is missing` : ""}`;
    legend.innerHTML = orderedProjects.map((project) => `
      <div class="flex items-center gap-2">
        <span class="inline-block size-2.5 rounded-full" style="background:${projectColorMap.get(project)};"></span>
        <span class="truncate max-w-[160px]" title="${escapeHtml(project)}">${escapeHtml(project)}</span>
      </div>
    `).join("");

    if (!dataset.projects.length || !categories.length) {
      svg.innerHTML = "";
      labels.innerHTML = "";
      labels.style.gridTemplateColumns = "none";
      yAxis.innerHTML = `<span>0</span><span>0</span><span>0</span><span>0</span>`;
      tooltip?.classList.add('hidden');
      empty.classList.remove('hidden');
      return;
    }

    empty.classList.add('hidden');
    const values = dataset.projects.flatMap((project) => categories.map((subsystem) => project.bySubsystem.get(subsystem) || 0));
    const maxV = Math.max(1, ...values);
    const ticks = [maxV, maxV * 0.66, maxV * 0.33, 0];
    const chartBottom = 260;
    const chartHeight = 240;
    const step = 1000 / categories.length;
    const barGap = Math.max(2, Math.min(8, step * 0.04));
    const groupPadding = Math.max(12, step * 0.12);
    const availableGroupWidth = Math.max(36, step - (groupPadding * 2));
    const barWidth = Math.max(8, Math.min(40, (availableGroupWidth - (barGap * Math.max(0, orderedProjects.length - 1))) / Math.max(1, orderedProjects.length)));
    const yFor = (value) => chartBottom - ((value / maxV) * chartHeight);

    yAxis.innerHTML = ticks.map((tick) => `<span>${escapeHtml(formatCompactNumber(tick, 2))}</span>`).join("");
    const tooltipData = new Map();
    svg.innerHTML = `
      <g>
        ${ticks.map((tick, idx) => `<line x1="0" y1="${yFor(tick).toFixed(1)}" x2="1000" y2="${yFor(tick).toFixed(1)}" stroke="#cbd5e1" stroke-width="1" ${idx === 0 || idx === ticks.length - 1 ? "" : 'stroke-dasharray="4,6"'}></line>`).join("")}
      </g>
      <g>
        ${categories.map((subsystem, index) => {
          const groupWidth = (orderedProjects.length * barWidth) + (Math.max(0, orderedProjects.length - 1) * barGap);
          const groupStartX = (step * index) + ((step - groupWidth) / 2);
          return dataset.projects.map((project, projectIndex) => {
            const value = project.bySubsystem.get(subsystem) || 0;
            const x = groupStartX + (projectIndex * (barWidth + barGap));
            const y = yFor(value);
            const height = chartBottom - y;
            const typeMap = project.typeBreakdownBySubsystem?.get(subsystem) || new Map();
            const typeItems = Array.from(typeMap.entries())
              .map(([type, typeValue]) => ({ type, value: typeValue }))
              .filter((item) => item.value > 0)
              .sort((a, b) => b.value - a.value);
            const key = `benchmark-subcontract-cost-bar-${index}-${projectIndex}`;
            tooltipData.set(key, {
              project: project.label,
              subsystem,
              value,
              types: typeItems,
            });
            return `
              <g>
                <rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barWidth.toFixed(1)}" height="${Math.max(0, height).toFixed(1)}" rx="8" fill="${projectColorMap.get(project.label)}" opacity="0.92"></rect>
                <rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barWidth.toFixed(1)}" height="${Math.max(1, height).toFixed(1)}" fill="transparent" data-benchmark-subcontract-cost-bar="${key}" style="cursor:pointer;"></rect>
              </g>
            `;
          }).join("");
        }).join("")}
      </g>
    `;

    labels.style.gridTemplateColumns = `repeat(${categories.length}, minmax(0, 1fr))`;
    labels.innerHTML = categories.map((subsystem) => `<div class="text-center">${escapeHtml(subsystem)}</div>`).join("");

    if (!card || !tooltip || !tooltipTitle || !tooltipValue || !tooltipTypes) return;
    tooltip.classList.add('hidden');
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const hideTooltip = () => tooltip.classList.add('hidden');
    const updateTooltip = (event, key) => {
      const item = tooltipData.get(String(key));
      if (!item) return;
      tooltipTitle.textContent = `${item.subsystem} - ${item.project}`;
      tooltipValue.innerHTML = `
        <div><span class="font-semibold text-slate-700 dark:text-slate-100">${escapeHtml(formatCurrencyValue(item.value, state.currentMaterialCurrency, 0))}</span> yearly subcontracting cost</div>
      `;
      tooltipTypes.innerHTML = item.types.length
        ? item.types.map((typeItem) => {
            const pct = item.value > 0 ? (typeItem.value / item.value) * 100 : 0;
            return `
              <div class="flex items-center justify-between gap-3">
                <span class="truncate text-slate-600 dark:text-slate-300" title="${escapeHtml(typeItem.type)}">${escapeHtml(typeItem.type)}</span>
                <div class="shrink-0 text-right">
                  <div class="font-semibold text-slate-700 dark:text-slate-100">${pct.toFixed(1)}%</div>
                  <div class="text-[10px] text-slate-500 dark:text-slate-400">${escapeHtml(formatCurrencyValue(typeItem.value, state.currentMaterialCurrency, 0))}</div>
                </div>
              </div>
            `;
          }).join("")
        : `<div class="text-[10px] text-slate-500 dark:text-slate-400">No type activity split available.</div>`;
      tooltip.classList.remove('hidden');
      const cardRect = card.getBoundingClientRect();
      const tipRect = tooltip.getBoundingClientRect();
      let left = (event.clientX - cardRect.left) + 12;
      let top = (event.clientY - cardRect.top) - tipRect.height - 10;
      left = clamp(left, 12, cardRect.width - tipRect.width - 12);
      top = clamp(top, 12, cardRect.height - tipRect.height - 12);
      tooltip.style.left = `${left}px`;
      tooltip.style.top = `${top}px`;
    };

    svg.querySelectorAll('[data-benchmark-subcontract-cost-bar]').forEach((bar) => {
      bar.addEventListener('pointerenter', (event) => updateTooltip(event, bar.getAttribute('data-benchmark-subcontract-cost-bar')));
      bar.addEventListener('pointermove', (event) => updateTooltip(event, bar.getAttribute('data-benchmark-subcontract-cost-bar')));
      bar.addEventListener('pointerleave', hideTooltip);
    });
  }

  function renderBenchmarkSubcontractingCostTable(dataset) {
    const thead = $('benchmarkSubcontractCostTableHead');
    const tbody = $('benchmarkSubcontractCostTableBody');
    if (!thead || !tbody) return;

    const projects = dataset.projects || [];
    const typeLabels = dataset.typeLabels || [];
    const subsystems = (dataset.subsystems || []).filter((subsystem) =>
      projects.some((project) => (project.bySubsystem.get(subsystem) || 0) > 0)
    );
    const projectColorMap = new Map(projects.map((project, index) => [project.label, colorForSeriesIndex(index)]));

    if (!projects.length || !subsystems.length || !typeLabels.length) {
      thead.innerHTML = `
        <tr class="border-b border-slate-100 dark:border-slate-800">
          <th class="text-left py-3 pr-4">Subsystem</th>
          <th class="text-left py-3 px-4">Project</th>
          <th class="text-right py-3 pl-4">Type</th>
        </tr>
      `;
      tbody.innerHTML = `
        <tr>
          <td colspan="3" class="py-6 text-center text-sm text-slate-500 dark:text-slate-400">No yearly subcontracting cost data available.</td>
        </tr>
      `;
      return;
    }

    thead.innerHTML = `
      <tr class="border-b border-slate-100 dark:border-slate-800">
        <th class="text-left py-3 pr-4">Subsystem</th>
        <th class="text-left py-3 px-4">Project</th>
        ${typeLabels.map((label, index) => `
          <th class="${index === 0 ? "text-right py-3 pl-4 pr-4" : "text-right py-3 px-4"}">${escapeHtml(label)}</th>
        `).join("")}
      </tr>
    `;

    tbody.innerHTML = subsystems.map((subsystem) => {
      const subsystemProjects = projects
        .map((project) => {
          const typeMap = project.typeBreakdownBySubsystem?.get(subsystem) || new Map();
          const total = project.bySubsystem.get(subsystem) || 0;
          return {
            label: project.label,
            total,
            typeMap,
          };
        })
        .filter((project) => project.total > 0)
        .sort((a, b) => b.total - a.total);

      if (!subsystemProjects.length) return "";

      return subsystemProjects.map((project, rowIndex) => `
        <tr>
          ${rowIndex === 0 ? `<td rowspan="${subsystemProjects.length}" class="py-3 pr-4 font-semibold align-top">${escapeHtml(subsystem)}</td>` : ""}
          <td class="${rowIndex === 0 ? "py-3 px-4" : "py-3 px-4 border-t border-slate-50 dark:border-slate-800/60"}">
            <span class="inline-flex items-center gap-2">
              <span class="inline-block size-2.5 rounded-full" style="background:${projectColorMap.get(project.label) || "#94a3b8"};"></span>
              <span class="font-medium" title="${escapeHtml(project.label)}">${escapeHtml(project.label)}</span>
            </span>
          </td>
          ${typeLabels.map((typeLabel, index) => `
            <td class="${index === 0 ? "py-3 pl-4 pr-4 text-right font-medium" : "py-3 px-4 text-right font-medium"}">${escapeHtml(formatCurrencyValue(project.typeMap.get(typeLabel) || 0, state.currentMaterialCurrency, 0))}</td>
          `).join("")}
        </tr>
      `).join("");
    }).join("");
  }

  function renderBenchmarkRatesTable(dataset) {
    const tbody = $('benchmarkRatesTableBody');
    if (!tbody) return;

    const currencies = Array.from(new Set(
      []
        .concat(dataset?.appliedCurrencies || [])
        .concat([state.currentMaterialCurrency, state.exchangeBase])
        .filter(Boolean)
    )).sort((a, b) => a.localeCompare(b));

    if (!currencies.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
            Upload a sheet with Synthesis cost currencies. Corrective Planning / DEQ_VMI_Planning remain available as backup.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = currencies.map((currency) => {
      const liveRate = currency === state.exchangeBase ? 1 : Number(state.exchangeRates?.[currency]);
      const manualRate = Number(state.manualExchangeRates?.[currency]);
      const effectiveRate = getEffectiveRate(currency);
      const source = Number.isFinite(manualRate) && manualRate > 0 ? "Manual" : (Number.isFinite(liveRate) && liveRate > 0 ? "Live" : "Missing");
      return `
        <tr>
          <td class="py-3 pr-4 font-semibold">${escapeHtml(currency)}</td>
          <td class="py-3 px-4 text-slate-500 dark:text-slate-400">${escapeHtml(formatRate(liveRate))}</td>
          <td class="py-3 px-4">
            <div class="flex items-center gap-2">
              <input
                type="number"
                min="0"
                step="0.000001"
                class="w-32 rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                data-benchmark-rate-input="${escapeHtml(currency)}"
                value="${Number.isFinite(manualRate) && manualRate > 0 ? manualRate : ""}"
                placeholder="optional">
              <button
                type="button"
                class="px-2.5 py-2 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                data-benchmark-rate-clear="${escapeHtml(currency)}">
                Clear
              </button>
            </div>
          </td>
          <td class="py-3 px-4 font-semibold">${escapeHtml(formatRate(effectiveRate))}</td>
          <td class="py-3 pl-4">
            <span class="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold ${source === "Manual" ? "bg-amber-50 text-amber-700 border border-amber-200" : source === "Live" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200"}">
              ${source}
            </span>
          </td>
        </tr>
      `;
    }).join("");

    tbody.querySelectorAll('input[data-benchmark-rate-input]').forEach((input) => {
      input.addEventListener('change', (e) => {
        const currency = e.target.getAttribute('data-benchmark-rate-input');
        setManualExchangeRate(currency, e.target.value);
      });
    });
    tbody.querySelectorAll('button[data-benchmark-rate-clear]').forEach((button) => {
      button.addEventListener('click', () => {
        const currency = button.getAttribute('data-benchmark-rate-clear');
        setManualExchangeRate(currency, "");
      });
    });
  }

  function renderBenchmarkDashboard() {
    if (!$('view-benchmark') || $('view-benchmark')?.dataset.ready !== "1") return;
    updateBenchmarkProjectInfo();
    renderBenchmarkDriverKpis();
    const activityTypeOptions = getBenchmarkGlobalCostActivityTypeOptions();
    ['benchmarkGlobalCostActivityTypeFilter', 'benchmarkGlobalCostTableActivityTypeFilter'].forEach((id) => {
      const select = $(id);
      if (!select) return;
      select.innerHTML = [`<option value="__ALL__">ALL</option>`]
        .concat(activityTypeOptions.map((option) => `<option value="${escapeHtml(option.value)}">${escapeHtml(option.label)}</option>`))
        .join("");
      if (state.currentBenchmarkGlobalCostActivityType !== "__ALL__" && !activityTypeOptions.some((option) => option.value === state.currentBenchmarkGlobalCostActivityType)) {
        state.currentBenchmarkGlobalCostActivityType = "__ALL__";
      }
      select.value = state.currentBenchmarkGlobalCostActivityType;
    });
    ['benchmarkGlobalCostTrackDriverSelect', 'benchmarkGlobalCostTableTrackDriverSelect'].forEach((id) => {
      const select = $(id);
      if (select) select.value = state.currentBenchmarkGlobalCostTrackDriver;
    });
    ['benchmarkCostTrackDriverSelect', 'benchmarkCostTableTrackDriverSelect'].forEach((id) => {
      const select = $(id);
      if (select) select.value = state.currentBenchmarkCostTrackDriver;
    });
    const currencyFilter = $('benchmarkCurrencyFilter');
    const currencies = getBenchmarkCostCurrencies();
    if (currencyFilter) {
      currencyFilter.innerHTML = currencies.length
        ? currencies.map((code) => `<option value="${escapeHtml(code)}">${escapeHtml(code)}</option>`).join("")
        : `<option value="USD">USD</option>`;
      if (!currencies.includes(state.currentMaterialCurrency)) {
        state.currentMaterialCurrency = currencies.includes("USD") ? "USD" : (currencies[0] || "USD");
      }
      currencyFilter.value = state.currentMaterialCurrency;
    }
    const dataset = buildBenchmarkDataset();
    const costDataset = buildBenchmarkCostDataset();
    const globalCostDataset = buildBenchmarkGlobalCostDataset();
    const subcontractingCostDataset = buildBenchmarkSubcontractingCostDataset();
    const lastUpdated = state.exchangeLastUpdated ? new Date(state.exchangeLastUpdated).toLocaleString("en-GB") : "";
    const meta = $('benchmarkRatesMeta');
    if (meta) meta.textContent = `Base ${state.exchangeBase} - 1 ${state.exchangeBase} = X currency`;
    const sourceText = $('benchmarkRatesSourceText');
    if (sourceText) {
      sourceText.innerHTML = state.exchangeProvider
        ? `Live source: <a class="text-primary underline underline-offset-2" href="https://www.exchangerate-api.com" target="_blank" rel="noreferrer">Rates By Exchange Rate API</a>${state.exchangeLastUpdated ? ` - updated ${escapeHtml(lastUpdated)}` : ""}`
        : "Live source pending";
    }
    const inlineSourceText = $('benchmarkRatesSourceInlineText');
    if (inlineSourceText) {
      inlineSourceText.innerHTML = state.exchangeProvider
        ? `Live source: <a class="text-primary underline underline-offset-2" href="https://www.exchangerate-api.com" target="_blank" rel="noreferrer">Rates By Exchange Rate API</a>${state.exchangeLastUpdated ? ` - updated ${escapeHtml(lastUpdated)}` : ""}`
        : "Live source pending";
    }
    renderBenchmarkBarsChart(dataset);
    renderBenchmarkBarsTable(dataset);
    renderBenchmarkPieChart(dataset);
    renderBenchmarkCostLineChart(costDataset);
    renderBenchmarkCostDetailTable(costDataset);
    renderBenchmarkGlobalCostLineChart(globalCostDataset);
    renderBenchmarkGlobalCostBarsChart(globalCostDataset);
    renderBenchmarkGlobalCostDetailTable(globalCostDataset);
    renderBenchmarkSubcontractingCostChart(subcontractingCostDataset);
    renderBenchmarkSubcontractingCostTable(subcontractingCostDataset);
    renderBenchmarkCostBarsChart(costDataset);
    renderBenchmarkRatesTable({
      ...costDataset,
      appliedCurrencies: Array.from(new Set([]
        .concat(costDataset?.appliedCurrencies || [])
        .concat(globalCostDataset?.appliedCurrencies || [])
        .concat(subcontractingCostDataset?.appliedCurrencies || [])
      )),
    });
  }

  function overviewKpiCard(label, value, detail = "", accent = "#137fec") {
    return `
      <div class="overview-kpi-card rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" style="--accent:${accent};">
        <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">${escapeHtml(label)}</p>
        <p class="mt-2 text-3xl font-black text-slate-950">${escapeHtml(value)}</p>
        ${detail ? `<p class="mt-3 text-xs leading-relaxed text-slate-500">${detail}</p>` : ""}
      </div>
    `;
  }

  function overviewEmpty(message) {
    return `
      <div class="col-span-full rounded-2xl border border-dashed border-slate-300 bg-white/70 p-4 text-sm text-slate-500">
        ${escapeHtml(message)}
      </div>
    `;
  }

  function initOverviewView() {
    const view = $('view-overview');
    if (!view || view.dataset.ready === "1") return;
    view.dataset.ready = "1";
    view.innerHTML = `
      <section class="overview-page pt-8 pb-8 space-y-6">
        <div class="overview-hero rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-bold uppercase tracking-[0.18em]">
            <span class="material-symbols-outlined text-[16px]">dashboard</span>
            Overview
          </div>
          <h2 class="mt-4 text-3xl font-black tracking-tight">Overview</h2>
          <p class="mt-2 max-w-3xl text-sm text-slate-500 dark:text-slate-400">
            Executive snapshot across cost drivers, workload, materials, overhaul and subcontracting.
          </p>
        </div>

        <section class="overview-section" data-overview-module="benchmark">
          <div class="overview-section-head">
            <div>
              <p class="overview-eyebrow">Benchmark &amp; Cost drivers</p>
              <h3>Cost driver KPI</h3>
            </div>
            <button class="overview-open-detail" type="button" data-overview-target="benchmark">Open details</button>
          </div>
          <div id="overviewBenchmarkKpis" class="overview-kpi-grid"></div>
        </section>

        <section class="overview-section" data-overview-module="workload">
          <div class="overview-section-head">
            <div>
              <p class="overview-eyebrow">Workload</p>
              <h3>Subsystem KPI</h3>
            </div>
            <button class="overview-open-detail" type="button" data-overview-target="workload">Open details</button>
          </div>
          <div id="overviewWorkloadKpis" class="overview-kpi-grid"></div>
        </section>

        <section class="overview-section" data-overview-module="materials">
          <div class="overview-section-head">
            <div>
              <p class="overview-eyebrow">Materials</p>
              <h3>Material KPI and filters</h3>
            </div>
            <button class="overview-open-detail" type="button" data-overview-target="materials">Open details</button>
          </div>
          <div class="overview-filter-grid">
            <label><span>Currency</span><select id="overviewMaterialsCurrency"></select></label>
            <label><span>Year</span><select id="overviewMaterialsYear"></select></label>
            <label><span>Equipment</span><select id="overviewMaterialsEquipment"></select></label>
            <label><span>Element</span><select id="overviewMaterialsElement"></select></label>
          </div>
          <div id="overviewMaterialsKpis" class="overview-kpi-grid"></div>
        </section>

        <section class="overview-section" data-overview-module="overhaul">
          <div class="overview-section-head">
            <div>
              <p class="overview-eyebrow">Overhaul &amp; Renewals</p>
              <h3>Overhaul KPI and filters</h3>
            </div>
            <button class="overview-open-detail" type="button" data-overview-target="overhaul">Open details</button>
          </div>
          <div class="overview-filter-grid">
            <label><span>Currency</span><select id="overviewOverhaulCurrency"></select></label>
            <label><span>Year</span><select id="overviewOverhaulYear"></select></label>
            <label><span>Equipment</span><select id="overviewOverhaulEquipment"></select></label>
            <label><span>Activity Type</span><select id="overviewOverhaulType"></select></label>
            <label><span>Span Life</span><select id="overviewOverhaulSpanLife"></select></label>
          </div>
          <div id="overviewOverhaulKpis" class="overview-kpi-grid"></div>
        </section>

        <section class="overview-section" data-overview-module="subcontracting">
          <div class="overview-section-head">
            <div>
              <p class="overview-eyebrow">Subcontracting Activities</p>
              <h3>Subcontracting KPI and filters</h3>
            </div>
            <button class="overview-open-detail" type="button" data-overview-target="subcontracting">Open details</button>
          </div>
          <div class="overview-filter-grid">
            <label><span>Currency</span><select id="overviewSubcontractingCurrency"></select></label>
            <label><span>Equipment</span><select id="overviewSubcontractingEquipment"></select></label>
            <label><span>Activity</span><select id="overviewSubcontractingActivity"></select></label>
            <label><span>Type</span><select id="overviewSubcontractingType"></select></label>
            <label><span>Frequency</span><select id="overviewSubcontractingFrequency"></select></label>
            <label><span>Period Duration</span><input id="overviewSubcontractingPeriodDuration" type="number" min="0" step="0.01"></label>
          </div>
          <div id="overviewSubcontractingKpis" class="overview-kpi-grid"></div>
        </section>
      </section>
    `;

    view.querySelectorAll('[data-overview-target]').forEach((button) => {
      button.addEventListener('click', () => setActiveView(button.getAttribute('data-overview-target')));
    });

    $('overviewMaterialsCurrency')?.addEventListener('change', (e) => {
      state.currentMaterialCurrency = e.target.value;
      queueSharedSettingsSync();
      renderAllModuleDashboards();
      renderOverviewDashboard();
    });
    $('overviewMaterialsYear')?.addEventListener('change', (e) => {
      state.currentMaterialYear = e.target.value;
      renderMaterialsDashboard();
      renderOverviewDashboard();
    });
    $('overviewMaterialsEquipment')?.addEventListener('change', (e) => {
      state.currentMaterialEquipment = e.target.value;
      rebuildMaterialsFilters();
      renderMaterialsDashboard();
      renderOverviewDashboard();
    });
    $('overviewMaterialsElement')?.addEventListener('change', (e) => {
      state.currentMaterialElement = e.target.value;
      rebuildMaterialsFilters();
      renderMaterialsDashboard();
      renderOverviewDashboard();
    });

    $('overviewOverhaulCurrency')?.addEventListener('change', (e) => {
      state.currentMaterialCurrency = e.target.value;
      queueSharedSettingsSync();
      renderAllModuleDashboards();
      renderOverviewDashboard();
    });
    $('overviewOverhaulYear')?.addEventListener('change', (e) => {
      state.currentOverhaulYear = e.target.value;
      renderOverhaulDashboard();
      renderOverviewDashboard();
    });
    $('overviewOverhaulEquipment')?.addEventListener('change', (e) => {
      state.currentOverhaulEquipment = e.target.value;
      rebuildOverhaulFilters();
      renderOverhaulDashboard();
      renderOverviewDashboard();
    });
    $('overviewOverhaulType')?.addEventListener('change', (e) => {
      state.currentOverhaulType = e.target.value;
      rebuildOverhaulFilters();
      renderOverhaulDashboard();
      renderOverviewDashboard();
    });
    $('overviewOverhaulSpanLife')?.addEventListener('change', (e) => {
      state.currentOverhaulSpanLife = e.target.value;
      rebuildOverhaulFilters();
      renderOverhaulDashboard();
      renderOverviewDashboard();
    });

    $('overviewSubcontractingCurrency')?.addEventListener('change', (e) => {
      state.currentMaterialCurrency = e.target.value;
      queueSharedSettingsSync();
      renderAllModuleDashboards();
      renderOverviewDashboard();
    });
    $('overviewSubcontractingEquipment')?.addEventListener('change', (e) => {
      state.currentSubcontractingEquipment = e.target.value;
      rebuildSubcontractingFilters();
      renderSubcontractingDashboard();
      renderOverviewDashboard();
    });
    $('overviewSubcontractingActivity')?.addEventListener('change', (e) => {
      state.currentSubcontractingActivity = e.target.value;
      rebuildSubcontractingFilters();
      renderSubcontractingDashboard();
      renderOverviewDashboard();
    });
    $('overviewSubcontractingType')?.addEventListener('change', (e) => {
      state.currentSubcontractingType = e.target.value;
      rebuildSubcontractingFilters();
      renderSubcontractingDashboard();
      renderOverviewDashboard();
    });
    $('overviewSubcontractingFrequency')?.addEventListener('change', (e) => {
      state.currentSubcontractingFrequency = e.target.value;
      rebuildSubcontractingFilters();
      renderSubcontractingDashboard();
      renderOverviewDashboard();
    });
    $('overviewSubcontractingPeriodDuration')?.addEventListener('input', (e) => {
      state.currentSubcontractingPeriodDuration = Math.max(0, Number(e.target.value || 0));
      renderSubcontractingDashboard();
      renderOverviewDashboard();
    });
  }

  function renderAllModuleDashboards() {
    renderMaterialsDashboard();
    renderOverhaulDashboard();
    renderSubcontractingDashboard();
    renderBenchmarkDashboard();
  }

  function syncOverviewSelect(sourceId, targetId, selectedValue = null) {
    const source = $(sourceId);
    const target = $(targetId);
    if (!target) return;
    if (source) target.innerHTML = Array.from(source.options).map((option) => (
      `<option value="${escapeHtml(option.value)}">${escapeHtml(option.textContent)}</option>`
    )).join("");
    const value = selectedValue ?? source?.value ?? "__ALL__";
    if (Array.from(target.options).some((option) => option.value === value)) target.value = value;
  }

  function syncOverviewControls() {
    rebuildMaterialsFilters();
    rebuildOverhaulFilters();
    rebuildSubcontractingFilters();

    syncOverviewSelect('materialsCurrencyFilter', 'overviewMaterialsCurrency', state.currentMaterialCurrency);
    syncOverviewSelect('materialsEquipmentFilter', 'overviewMaterialsEquipment', state.currentMaterialEquipment);
    syncOverviewSelect('materialsElementFilter', 'overviewMaterialsElement', state.currentMaterialElement);
    const materialYear = $('overviewMaterialsYear');
    if (materialYear) {
      const sourceYears = $('materialsYearList');
      const values = sourceYears
        ? Array.from(sourceYears.querySelectorAll('[data-material-year-value]')).map((input) => input.getAttribute('data-material-year-value')).filter(Boolean)
        : [];
      materialYear.innerHTML = [`<option value="__ALL__">All years</option>`]
        .concat(values.map((year) => `<option value="${escapeHtml(year)}">${escapeHtml(year)}</option>`))
        .join("");
      const selected = getMultiSelectValues(state.currentMaterialYear);
      materialYear.value = selected.length === 1 ? selected[0] : "__ALL__";
    }

    syncOverviewSelect('overhaulCurrencyFilter', 'overviewOverhaulCurrency', state.currentMaterialCurrency);
    syncOverviewSelect('overhaulEquipmentFilter', 'overviewOverhaulEquipment', state.currentOverhaulEquipment);
    syncOverviewSelect('overhaulTypeFilter', 'overviewOverhaulType', state.currentOverhaulType);
    syncOverviewSelect('overhaulSpanLifeFilter', 'overviewOverhaulSpanLife', state.currentOverhaulSpanLife);
    const overhaulYear = $('overviewOverhaulYear');
    if (overhaulYear) {
      const sourceYears = $('overhaulYearList');
      const values = sourceYears
        ? Array.from(sourceYears.querySelectorAll('[data-overhaul-year-value]')).map((input) => input.getAttribute('data-overhaul-year-value')).filter(Boolean)
        : [];
      overhaulYear.innerHTML = [`<option value="__ALL__">All years</option>`]
        .concat(values.map((year) => `<option value="${escapeHtml(year)}">${escapeHtml(year)}</option>`))
        .join("");
      const selected = getMultiSelectValues(state.currentOverhaulYear);
      overhaulYear.value = selected.length === 1 ? selected[0] : "__ALL__";
    }

    syncOverviewSelect('subcontractingCurrencyFilter', 'overviewSubcontractingCurrency', state.currentMaterialCurrency);
    syncOverviewSelect('subcontractingEquipmentFilter', 'overviewSubcontractingEquipment', state.currentSubcontractingEquipment);
    syncOverviewSelect('subcontractingActivityFilter', 'overviewSubcontractingActivity', state.currentSubcontractingActivity);
    syncOverviewSelect('subcontractingTypeFilter', 'overviewSubcontractingType', state.currentSubcontractingType);
    syncOverviewSelect('subcontractingFrequencyFilter', 'overviewSubcontractingFrequency', state.currentSubcontractingFrequency);
    const period = $('overviewSubcontractingPeriodDuration');
    if (period) period.value = String(getSubcontractingPeriodDuration());
  }

  function renderOverviewBenchmarkKpis() {
    const target = $('overviewBenchmarkKpis');
    if (!target) return;
    const ids = getBenchmarkBaseFileIds();
    const seen = new Set();
    const totals = { turnout: 0, substation: 0, apsd: 0, stations: 0 };
    ids.forEach((fileId) => {
      const projectKey = getProjectKeyForFileId(fileId) || `__file__${fileId}`;
      if (seen.has(projectKey)) return;
      seen.add(projectKey);
      const gp = state.fileMeta?.[fileId]?.gp || {};
      const getNum = (name) => toNumber(gp?.[name]);
      const stations = getNum("number_of_station");
      totals.turnout += getNum("switch") + (getNum("diamond_crossing") * 4) + (getNum("crossover") * 2);
      totals.substation += getNum("number_of_traction_substation") + getNum("number_of_auxiliary_substation") + getNum("number_of_mv_substation");
      totals.apsd += stations * getNum("apsd_per_wall") * getNum("walls_per_station");
      totals.stations += stations;
    });
    target.innerHTML = [
      overviewKpiCard("Total Turnout", formatInt(totals.turnout), `${seen.size || 0} project(s)`, "#137fec"),
      overviewKpiCard("Total Substation", formatInt(totals.substation), "Traction + auxiliary + MV", "#14b8a6"),
      overviewKpiCard("Total APSD", formatInt(totals.apsd), "Stations x APSD parameters", "#f59e0b"),
      overviewKpiCard("Number of Station", formatInt(totals.stations), "General Parameters", "#8b5cf6"),
    ].join("");
  }

  function renderOverviewWorkloadKpis() {
    const target = $('overviewWorkloadKpis');
    if (!target) return;
    if (state.synthesisRows.length) {
      const { subsystems: map } = buildSynthesisMap();
      const subs = Array.from(map.keys()).sort((a, b) => a.localeCompare(b));
      if (!subs.length) {
        target.innerHTML = overviewEmpty("No preventive headcount rows found in Synthesis.");
        return;
      }
      target.innerHTML = subs.map((sub, index) => {
        const { dayOpt, nightOpt } = map.get(sub);
        return overviewKpiCard(
          sub,
          `N ${formatInt(nightOpt || 0)} / D ${formatInt(dayOpt || 0)}`,
          "Optimized headcount",
          colorForSeriesIndex(index)
        );
      }).join("");
      return;
    }
    target.innerHTML = overviewEmpty("Upload an Output Planning file to populate Workload KPI.");
  }

  function renderOverviewMaterialsKpis() {
    const target = $('overviewMaterialsKpis');
    if (!target) return;
    const rows = getFilteredCorrectiveRows();
    const cols = state.materialsColumns;
    let totalEstimated = 0;
    let reparableEstimated = 0;
    rows.forEach((row) => {
      const currency = cols.currency ? row?.[cols.currency] : "";
      const totalRaw = cols.totalCostEstimated ? toNumber(row?.[cols.totalCostEstimated]) : 0;
      const reparableRaw = cols.reparableCostEstimated ? toNumber(row?.[cols.reparableCostEstimated]) : 0;
      totalEstimated += convertAmount(totalRaw, currency, state.currentMaterialCurrency) ?? 0;
      reparableEstimated += convertAmount(reparableRaw, currency, state.currentMaterialCurrency) ?? 0;
    });
    target.innerHTML = [
      overviewKpiCard("Replacement Cost Estimated", formatCurrencyValue(totalEstimated, state.currentMaterialCurrency, 0), `${rows.length} row(s)`, "#137fec"),
      overviewKpiCard("Reparable Cost Estimated", formatCurrencyValue(reparableEstimated, state.currentMaterialCurrency, 0), "Selected target currency", "#14b8a6"),
      overviewKpiCard("Total Estimated", formatCurrencyValue(totalEstimated + reparableEstimated, state.currentMaterialCurrency, 0), "Replacement + reparable", "#f59e0b"),
    ].join("");
  }

  function renderOverviewOverhaulKpis() {
    const target = $('overviewOverhaulKpis');
    if (!target) return;
    const rows = getFilteredOverhaulRows();
    const cols = state.overhaulColumns;
    let totalGlobalCost = 0;
    const typeSet = new Set();
    rows.forEach((row) => {
      const currency = cols.currency ? row?.[cols.currency] : "";
      const rawGlobal = cols.globalCost ? toNumber(row?.[cols.globalCost]) : 0;
      totalGlobalCost += convertAmount(rawGlobal, currency, state.currentMaterialCurrency) ?? 0;
      if (cols.type) {
        const type = String(row?.[cols.type] ?? "").trim();
        if (type) typeSet.add(type);
      }
    });
    target.innerHTML = [
      overviewKpiCard("Global Cost", formatCurrencyValue(totalGlobalCost, state.currentMaterialCurrency, 0), `${rows.length} row(s)`, "#8b5cf6"),
      overviewKpiCard("Activity Types", formatInt(typeSet.size), "In selected scope", "#137fec"),
      overviewKpiCard("Currency", state.currentMaterialCurrency, "Selected target currency", "#f59e0b"),
    ].join("");
  }

  function renderOverviewSubcontractingKpis() {
    const target = $('overviewSubcontractingKpis');
    if (!target) return;
    const rows = getFilteredSubcontractingRows();
    const cols = state.subcontractingColumns;
    const duration = getSubcontractingPeriodDuration();
    let totalGlobalCost = 0;
    const activitySet = new Set();
    rows.forEach((row) => {
      const currency = cols.currency ? row?.[cols.currency] : "";
      const raw = cols.yearlyCost ? toNumber(row?.[cols.yearlyCost]) : 0;
      totalGlobalCost += (convertAmount(raw, currency, state.currentMaterialCurrency) ?? 0) * duration;
      if (cols.activity) {
        const activity = String(row?.[cols.activity] ?? "").trim();
        if (activity) activitySet.add(activity);
      }
    });
    target.innerHTML = [
      overviewKpiCard("Global Cost", formatCurrencyValue(totalGlobalCost, state.currentMaterialCurrency, 0), `${rows.length} row(s)`, "#10b981"),
      overviewKpiCard("Activities", formatInt(activitySet.size), "In selected scope", "#137fec"),
      overviewKpiCard("Period Duration", formatCompactNumber(duration, 2), "Applied multiplier", "#f59e0b"),
    ].join("");
  }

  function renderOverviewDashboard() {
    const view = $('view-overview');
    if (!view || view.dataset.ready !== "1") return;
    syncOverviewControls();
    renderOverviewBenchmarkKpis();
    renderOverviewWorkloadKpis();
    renderOverviewMaterialsKpis();
    renderOverviewOverhaulKpis();
    renderOverviewSubcontractingKpis();
  }

  function ensureSecondaryViewsMounted() {
    const scrollArea = $('scrollArea');
    if (!scrollArea) return;

    const ensureView = (id, fallbackHtml = '') => {
      let view = document.getElementById(id);
      if (!view) {
        view = document.createElement('div');
        view.id = id;
        view.className = 'view hidden px-8 pb-8 space-y-8 max-w-full';
        view.innerHTML = fallbackHtml;
      }
      if (view.parentElement !== scrollArea) scrollArea.appendChild(view);
      return view;
    };

    ensureView('view-overview');
    initOverviewView();
    ensureView('view-materials');
    ensureView(
      'view-overhaul',
      `
        <div class="bg-white dark:bg-slate-900/50 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <h3 class="text-lg font-bold">Overhaul &amp; Renewals</h3>
          <p class="text-sm text-slate-500 dark:text-slate-400 mt-2">Coming soon...</p>
        </div>
      `
    );
    ensureView(
      'view-subcontracting',
      `
        <div class="bg-white dark:bg-slate-900/50 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <h3 class="text-lg font-bold">Subcontracting Activities</h3>
          <p class="text-sm text-slate-500 dark:text-slate-400 mt-2">Coming soon...</p>
        </div>
      `
    );
    ensureView(
      'view-benchmark',
      `
        <div class="bg-white dark:bg-slate-900/50 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <h3 class="text-lg font-bold">Benchmark &amp; Cost drivers</h3>
          <p class="text-sm text-slate-500 dark:text-slate-400 mt-2">Coming soon...</p>
        </div>
      `
    );
    ensureView('view-riskassessment');
    ensureView('view-totalcost');
  }

  function setActiveView(viewKey) {
    ensureSecondaryViewsMounted();
    // 1) show/hide views
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
    const active = document.getElementById(`view-${viewKey}`);
    if (active) active.classList.remove('hidden');

    const deferVisibleRender = (renderFn) => {
      const run = () => {
        const current = document.getElementById(`view-${viewKey}`);
        if (!current || current.classList.contains('hidden')) return;
        renderFn();
      };
      if (typeof requestAnimationFrame === "function") requestAnimationFrame(run);
      else setTimeout(run, 0);
    };

    // 2) highlight sidebar item
    document.querySelectorAll('.nav-item').forEach(a => {
      a.classList.remove('bg-primary/10','text-primary');
      a.classList.add('text-slate-600','dark:text-slate-400');
    });

    const btn = document.querySelector(`.nav-item[data-view="${viewKey}"]`);
    if (btn) {
      btn.classList.add('bg-primary/10','text-primary');
      btn.classList.remove('text-slate-600','dark:text-slate-400');
    }

    // 3) render view-specific content
    if (viewKey === 'overview') {
      initMaterialsView();
      initOverhaulView();
      initSubcontractingView();
      initBenchmarkView();
      renderOverviewDashboard();
      return;
    } else if (viewKey === 'workload') {
      recomputeAndRender();
      setupLineHover();
      setupDurationHover();
      setupBarsNavigator();
    } else if (viewKey === 'materials') {
      initMaterialsView();
      deferVisibleRender(renderMaterialsDashboard);
    } else if (viewKey === 'overhaul') {
      initOverhaulView();
      renderOverhaulDashboard();
    } else if (viewKey === 'subcontracting') {
      initSubcontractingView();
      renderSubcontractingDashboard();
    } else if (viewKey === 'benchmark') {
      initBenchmarkView();
      renderBenchmarkDashboard();
    } else if (viewKey === 'riskassessment') {
      initRiskAssessmentView();
      deferVisibleRender(renderRiskAssessmentDashboard);
    } else if (viewKey === 'totalcost') {
      initTotalCostView();
      deferVisibleRender(renderTotalCostDashboard);
    }
  }

  // Sidebar click wiring
  document.querySelectorAll('.nav-item[data-view]').forEach(a => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      setActiveView(a.getAttribute('data-view'));
    });
  });

  initDashboardThemeToggle();
  ensureSecondaryViewsMounted();
  initMaterialsView();
  initOverhaulView();
  initSubcontractingView();
  initBenchmarkView();
  initRiskAssessmentBridge();
  initTotalCostBridge();
  // Default view
  setActiveView('workload');
  // Initial render (placeholders)
  renderFilesList();
  syncWorkloadFilterHint();
  recomputeAndRender();
  setupLineHover(); // ✅ active le crosshair même après refresh
  setupDurationHover();
  setupBarsNavigator();
