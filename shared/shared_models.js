export const SHARED_STORE_VERSION = 1;

export const SHARED_STORE_KEYS = {
  workbookIndex: "shared-store-workbook-index-v1",
  workbookPrefix: "shared-store-workbook-v1:",
  settings: "shared-store-settings-v1",
  costSummaryDraft: "cost-summary-mi-draft-v1",
};

export const SHEET_KEYS = {
  synthesis: "synthesis",
  generalParameters: "generalParameters",
  correctivePlanning: "correctivePlanning",
  deqVmiPlanning: "deqVmiPlanning",
  overhaulRenewalPlanning: "overhaulRenewalPlanning",
  subcontractingPlanning: "subcontractingPlanning",
};

export const DEFAULT_SHARED_SETTINGS = {
  targetCurrency: "USD",
  exchangeBase: "USD",
  liveRates: {},
  manualRates: {},
  lastUpdated: "",
  provider: "",
};

export const DEFAULT_COST_SUMMARY_DRAFT = {
  studyName: "Cost Summary & MI - Draft",
  targetCurrency: "USD",
  outputFileName: "cost_summary_mi.xlsx",
  scenario: "baseline",
  sourceStrategy: "shared_dashboard_files",
  exportMode: "single_workbook",
  includeAuditTrail: true,
  lockFormulaSheet: false,
  notes: "",
};

export function createEmptyWorkbookData() {
  return {
    version: SHARED_STORE_VERSION,
    sourceId: "",
    projectKey: "",
    fileName: "",
    kind: "",
    updatedAt: "",
    sheets: {
      [SHEET_KEYS.synthesis]: [],
      [SHEET_KEYS.generalParameters]: {},
      [SHEET_KEYS.correctivePlanning]: [],
      [SHEET_KEYS.deqVmiPlanning]: [],
      [SHEET_KEYS.overhaulRenewalPlanning]: [],
      [SHEET_KEYS.subcontractingPlanning]: [],
    },
  };
}

export function createEmptyCostSummarySnapshot() {
  return {
    workbooks: [],
    settings: { ...DEFAULT_SHARED_SETTINGS },
    draft: { ...DEFAULT_COST_SUMMARY_DRAFT },
  };
}

export function normalizeWorkbookData(input = {}) {
  const base = createEmptyWorkbookData();
  return {
    ...base,
    ...input,
    sheets: {
      ...base.sheets,
      ...(input.sheets || {}),
    },
  };
}

