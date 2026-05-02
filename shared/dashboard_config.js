(function () {
  const LIVE_RATE_STORAGE_KEY = "materialsLiveRatesV1";
  const MANUAL_RATE_STORAGE_KEY = "materialsManualRatesV1";
  const REMOTE_SYNC_INTERVAL_MS = 60000;

  const SHARED_STORE_FALLBACK_VERSION = 1;
  const SHARED_STORE_FALLBACK_KEYS = {
    workbookIndex: "shared-store-workbook-index-v1",
    workbookPrefix: "shared-store-workbook-v1:",
    workbookLitePrefix: "shared-store-workbook-lite-v1:",
    settings: "shared-store-settings-v1",
  };

  const SHARED_MODULE_PATHS = {
    dataStore: "./shared/shared_data_store.js",
    excelParser: "./shared/shared_excel_parser.js",
    studyPersistence: "./shared/study_persistence.js",
  };

  const MATERIAL_COL_CANDIDATES = {
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

  const MATERIAL_SERIES_COLORS = {
    total: "#0f766e",
    reparable: "#2563eb",
    totalEstimated: "#f59e0b",
    reparableEstimated: "#ef4444",
  };

  const MATERIAL_PIE_COLORS = ["#2563eb", "#0f766e", "#f59e0b", "#ef4444", "#7c3aed", "#0891b2", "#16a34a", "#ea580c"];

  const OVERHAUL_COL_CANDIDATES = {
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

  const OVERHAUL_STACK_COLORS = {
    material: "#137fec",
    tc: "#f59e0b",
    management: "#14b8a6",
  };

  const OVERHAUL_TYPE_COLORS = {
    overhaul: "#137fec",
    renewal: "#14b8a6",
  };

  const OVERHAUL_PIE_COLORS = ["#137fec", "#14b8a6", "#f59e0b", "#ef4444", "#7c3aed", "#0891b2", "#16a34a", "#ea580c"];

  const SUBCONTRACT_COL_CANDIDATES = {
    yearlyCost: ["yearly_cost", "annual_cost", "cost"],
    currency: ["currency", "curr", "devise"],
    subsystem: ["subsystem", "system", "sub_system"],
    equipment: ["equipment", "equipment_name", "asset", "asset_name"],
    project: ["project_name", "project", "project_label"],
    activity: ["activity_description", "activity", "description"],
    type: ["type", "activity_type", "service_type"],
    frequency: ["frequency", "freq", "periodicity"],
  };

  const SUBCONTRACT_PIE_COLORS = ["#137fec", "#14b8a6", "#f59e0b", "#ef4444", "#7c3aed", "#0891b2", "#16a34a", "#ea580c"];
  const SUBCONTRACT_TYPE_COLORS = ["#137fec", "#14b8a6", "#f59e0b", "#ef4444", "#7c3aed", "#0891b2", "#16a34a", "#ea580c"];
  const PROJECT_SERIES_PALETTE = ["#137fec", "#14b8a6", "#a855f7", "#f59e0b", "#ef4444", "#22c55e", "#06b6d4", "#f97316", "#64748b"];

  window.PasserelleDashboardConfig = {
    LIVE_RATE_STORAGE_KEY,
    MANUAL_RATE_STORAGE_KEY,
    REMOTE_SYNC_INTERVAL_MS,
    SHARED_STORE_FALLBACK_VERSION,
    SHARED_STORE_FALLBACK_KEYS,
    SHARED_MODULE_PATHS,
    MATERIAL_COL_CANDIDATES,
    MATERIAL_SERIES_COLORS,
    MATERIAL_PIE_COLORS,
    OVERHAUL_COL_CANDIDATES,
    OVERHAUL_STACK_COLORS,
    OVERHAUL_TYPE_COLORS,
    OVERHAUL_PIE_COLORS,
    SUBCONTRACT_COL_CANDIDATES,
    SUBCONTRACT_PIE_COLORS,
    SUBCONTRACT_TYPE_COLORS,
    PROJECT_SERIES_PALETTE,
  };
})();
