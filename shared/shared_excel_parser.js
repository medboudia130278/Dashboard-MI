import {
  SHEET_KEYS,
  createEmptyWorkbookData,
  normalizeWorkbookData,
} from "./shared_models.js";

export const CANONICAL_SHEET_KEYS = {
  ...SHEET_KEYS,
  planningComplet: "planningComplet",
  techniciansNeededPerDay: "techniciansNeededPerDay",
  genericRows: "genericRows",
  hoursReport: "hoursReport",
};

const SHEET_NAME_ALIASES = {
  synthesis: CANONICAL_SHEET_KEYS.synthesis,
  general_parameters: CANONICAL_SHEET_KEYS.generalParameters,
  general_parameter: CANONICAL_SHEET_KEYS.generalParameters,
  corrective_planning: CANONICAL_SHEET_KEYS.correctivePlanning,
  deq_vmi_planning: CANONICAL_SHEET_KEYS.deqVmiPlanning,
  deq_vmi: CANONICAL_SHEET_KEYS.deqVmiPlanning,
  overhaul_and_renewal_planning: CANONICAL_SHEET_KEYS.overhaulRenewalPlanning,
  overhaul_renewal_planning: CANONICAL_SHEET_KEYS.overhaulRenewalPlanning,
  overhaul_and_renewals_planning: CANONICAL_SHEET_KEYS.overhaulRenewalPlanning,
  subcontracting_planning: CANONICAL_SHEET_KEYS.subcontractingPlanning,
  planning_complet: CANONICAL_SHEET_KEYS.planningComplet,
  technicians_needed_per_day: CANONICAL_SHEET_KEYS.techniciansNeededPerDay,
  technician_needed_per_day: CANONICAL_SHEET_KEYS.techniciansNeededPerDay,
  hours_report: CANONICAL_SHEET_KEYS.hoursReport,
};

const GENERAL_PARAMETER_NAME_KEYS = [
  "nom",
  "name",
  "parameter",
  "parameter_name",
  "parametre",
  "key",
];

const GENERAL_PARAMETER_VALUE_KEYS = [
  "valeur",
  "value",
  "parameter_value",
  "valeur_parametre",
];

const DEQ_VMI_TYPE_KEYS = [
  "type",
  "maintenance_type",
  "preventive_corrective",
];

const DEQ_VMI_YEAR_KEYS = [
  "year_of_planning",
  "planning_year",
  "year",
  "budget_year",
];

const DEQ_VMI_CURRENCY_KEYS = [
  "currency",
  "curr",
  "devise",
];

const DEQ_VMI_SUBSYSTEM_KEYS = [
  "subsystem",
  "system",
  "sub_system",
];

const DEQ_VMI_EQUIPMENT_KEYS = [
  "equipment",
  "equipment_name",
  "asset",
  "asset_name",
];

const DEQ_VMI_UNIT_COST_KEYS = [
  "unit_cost",
  "total_cost_estimated",
  "estimated_total_cost",
  "total_estimated_cost",
  "material_cost",
  "global_cost",
  "total_cost",
  "overall_cost",
];

const DEQ_VMI_SOURCE_KEYS = [
  "source",
  "vendor_source",
  "origin",
];

function ensureExtendedSheets(baseSheets = {}) {
  return {
    ...baseSheets,
    [CANONICAL_SHEET_KEYS.synthesis]: Array.isArray(baseSheets.synthesis)
      ? baseSheets.synthesis
      : [],
    [CANONICAL_SHEET_KEYS.generalParameters]:
      baseSheets.generalParameters && typeof baseSheets.generalParameters === "object"
        ? baseSheets.generalParameters
        : {},
    [CANONICAL_SHEET_KEYS.correctivePlanning]: Array.isArray(baseSheets.correctivePlanning)
      ? baseSheets.correctivePlanning
      : [],
    [CANONICAL_SHEET_KEYS.deqVmiPlanning]: Array.isArray(baseSheets.deqVmiPlanning)
      ? baseSheets.deqVmiPlanning
      : [],
    [CANONICAL_SHEET_KEYS.overhaulRenewalPlanning]: Array.isArray(baseSheets.overhaulRenewalPlanning)
      ? baseSheets.overhaulRenewalPlanning
      : [],
    [CANONICAL_SHEET_KEYS.subcontractingPlanning]: Array.isArray(baseSheets.subcontractingPlanning)
      ? baseSheets.subcontractingPlanning
      : [],
    [CANONICAL_SHEET_KEYS.planningComplet]: Array.isArray(baseSheets.planningComplet)
      ? baseSheets.planningComplet
      : [],
    [CANONICAL_SHEET_KEYS.techniciansNeededPerDay]: Array.isArray(baseSheets.techniciansNeededPerDay)
      ? baseSheets.techniciansNeededPerDay
      : [],
    [CANONICAL_SHEET_KEYS.genericRows]: Array.isArray(baseSheets.genericRows)
      ? baseSheets.genericRows
      : [],
    [CANONICAL_SHEET_KEYS.hoursReport]: Array.isArray(baseSheets.hoursReport)
      ? baseSheets.hoursReport
      : [],
  };
}

function trimCellValue(value) {
  if (typeof value === "string") {
    return value.trim();
  }
  return value;
}

function hasValue(value) {
  return value !== "" && value !== null && value !== undefined;
}

function firstDefinedValue(row, keys) {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(row, key)) {
      const value = row[key];
      if (hasValue(value)) {
        return value;
      }
    }
  }
  return "";
}

function inferWorkbookKind(sheets) {
  if (sheets[CANONICAL_SHEET_KEYS.hoursReport]?.length) {
    return "hours_report";
  }
  if (
    sheets[CANONICAL_SHEET_KEYS.planningComplet]?.length ||
    sheets[CANONICAL_SHEET_KEYS.synthesis]?.length ||
    Object.keys(sheets[CANONICAL_SHEET_KEYS.generalParameters] || {}).length
  ) {
    return "output_planning";
  }
  return "";
}

function deriveProjectKey(generalParams, fallback) {
  const projectName =
    generalParams.project_name ||
    generalParams.project ||
    generalParams.project_context ||
    fallback ||
    "";
  return normalizeKey(projectName);
}

export function normalizeKey(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s/\\-]+/g, "_")
    .replace(/[()]+/g, "")
    .replace(/[^\w]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");
}

export function normalizeSheetName(name) {
  const normalized = normalizeKey(name);
  return SHEET_NAME_ALIASES[normalized] || normalized;
}

export function normalizeRow(row = {}, options = {}) {
  const { preserveOriginalKeys = true } = options;
  const normalizedRow = {};

  Object.entries(row || {}).forEach(([key, rawValue]) => {
    if (!key) return;
    const value = trimCellValue(rawValue);
    if (preserveOriginalKeys) {
      normalizedRow[key] = value;
    }

    const normalizedKey = normalizeKey(key);
    if (!normalizedKey) return;
    if (!Object.prototype.hasOwnProperty.call(normalizedRow, normalizedKey)) {
      normalizedRow[normalizedKey] = value;
    }
  });

  return normalizedRow;
}

export function normalizeRows(rows = [], options = {}) {
  if (!Array.isArray(rows)) return [];
  return rows
    .filter((row) => row && typeof row === "object" && !Array.isArray(row))
    .map((row) => normalizeRow(row, options));
}

export function parseGeneralParameters(rows = []) {
  const params = {};
  const normalizedRows = normalizeRows(rows, { preserveOriginalKeys: true });

  normalizedRows.forEach((row) => {
    const rawName = firstDefinedValue(row, GENERAL_PARAMETER_NAME_KEYS);
    if (!rawName) return;
    const normalizedName = normalizeKey(rawName);
    if (!normalizedName) return;
    params[normalizedName] = trimCellValue(firstDefinedValue(row, GENERAL_PARAMETER_VALUE_KEYS));
  });

  return params;
}

function pickDeqVmiValue(row, keys) {
  return trimCellValue(firstDefinedValue(row, keys));
}

function buildDeqVmiSignature(row) {
  return [
    normalizeKey(row.equipment || ""),
    normalizeKey(row.subsystem || ""),
    normalizeKey(row.type || ""),
    String(row.year_of_planning || row.year || ""),
    String(row.currency || ""),
    String(row.unit_cost || ""),
  ].join("|");
}

function normalizeDeqVmiRow(row = {}, sourceTag = "") {
  const type = pickDeqVmiValue(row, DEQ_VMI_TYPE_KEYS);
  const year = pickDeqVmiValue(row, DEQ_VMI_YEAR_KEYS);
  const normalized = {
    ...row,
    type,
    year_of_planning: year,
    year,
    currency: pickDeqVmiValue(row, DEQ_VMI_CURRENCY_KEYS),
    subsystem: pickDeqVmiValue(row, DEQ_VMI_SUBSYSTEM_KEYS),
    equipment: pickDeqVmiValue(row, DEQ_VMI_EQUIPMENT_KEYS),
    unit_cost: pickDeqVmiValue(row, DEQ_VMI_UNIT_COST_KEYS),
    source: pickDeqVmiValue(row, DEQ_VMI_SOURCE_KEYS),
  };

  if (sourceTag && !normalized.__deq_vmi_source) {
    normalized.__deq_vmi_source = sourceTag;
  }
  return normalized;
}

function dedupeRows(rows = [], buildSignature) {
  const seen = new Set();
  const deduped = [];

  rows.forEach((row) => {
    const signature = buildSignature(row);
    if (seen.has(signature)) return;
    seen.add(signature);
    deduped.push(row);
  });

  return deduped;
}

function reconstructDeqVmiPlanningSheets(sheets) {
  const explicitRows = Array.isArray(sheets[CANONICAL_SHEET_KEYS.deqVmiPlanning])
    ? sheets[CANONICAL_SHEET_KEYS.deqVmiPlanning]
    : [];
  const correctiveRows = Array.isArray(sheets[CANONICAL_SHEET_KEYS.correctivePlanning])
    ? sheets[CANONICAL_SHEET_KEYS.correctivePlanning]
    : [];
  const overhaulRows = Array.isArray(sheets[CANONICAL_SHEET_KEYS.overhaulRenewalPlanning])
    ? sheets[CANONICAL_SHEET_KEYS.overhaulRenewalPlanning]
    : [];

  const derivedFromCorrective = correctiveRows
    .filter((row) => row?.__material_origin === "deq_vmi_planning")
    .map((row) => normalizeDeqVmiRow(row, "corrective_planning"));

  const derivedFromOverhaul = overhaulRows
    .filter((row) => row?.__overhaul_origin === "deq_vmi_planning")
    .map((row) => normalizeDeqVmiRow(row, "overhaul_renewal_planning"));

  const normalizedExplicit = explicitRows.map((row) => normalizeDeqVmiRow(row, "deq_vmi_planning"));
  const mergedDeqVmiRows = dedupeRows(
    normalizedExplicit.concat(derivedFromCorrective, derivedFromOverhaul),
    buildDeqVmiSignature
  );

  sheets[CANONICAL_SHEET_KEYS.deqVmiPlanning] = mergedDeqVmiRows;
  sheets[CANONICAL_SHEET_KEYS.correctivePlanning] = correctiveRows
    .filter((row) => row?.__material_origin !== "deq_vmi_planning");
  sheets[CANONICAL_SHEET_KEYS.overhaulRenewalPlanning] = overhaulRows
    .filter((row) => row?.__overhaul_origin !== "deq_vmi_planning");
}

export function extractSheetRows(sheet, options = {}) {
  if (Array.isArray(sheet)) {
    return normalizeRows(sheet, options);
  }

  const sheetToJson =
    options.sheetToJson ||
    globalThis.XLSX?.utils?.sheet_to_json;

  if (typeof sheetToJson !== "function") {
    throw new Error("No sheet_to_json adapter is available to parse workbook sheets.");
  }

  const rawRows = sheetToJson(sheet, {
    defval: "",
    raw: false,
    blankrows: false,
    ...(options.sheetToJsonOptions || {}),
  });
  return normalizeRows(rawRows, options);
}

export function parseWorkbookFromSheetMap(sheetMap = {}, options = {}) {
  const base = createEmptyWorkbookData();
  const workbookData = normalizeWorkbookData({
    ...base,
    sourceId: options.sourceId || "",
    projectKey: options.projectKey || "",
    fileName: options.fileName || "",
    kind: options.kind || "",
    label: options.label || options.fileName || "",
    sourceType: options.sourceType || "local",
    remoteUrl: options.remoteUrl || "",
    remoteSourceKey: options.remoteSourceKey || "",
    localSourceKey: options.localSourceKey || "",
    updatedAt: options.updatedAt || new Date().toISOString(),
    generalParams: {},
    sheets: ensureExtendedSheets(base.sheets),
  });

  Object.entries(sheetMap || {}).forEach(([sheetName, rawSheet]) => {
    const sheetKey = normalizeSheetName(sheetName);
    const rows = extractSheetRows(rawSheet, options);

    switch (sheetKey) {
      case CANONICAL_SHEET_KEYS.generalParameters: {
        const params = parseGeneralParameters(rows);
        workbookData.generalParams = params;
        workbookData.sheets.generalParameters = params;
        break;
      }
      case CANONICAL_SHEET_KEYS.synthesis:
      case CANONICAL_SHEET_KEYS.correctivePlanning:
      case CANONICAL_SHEET_KEYS.deqVmiPlanning:
      case CANONICAL_SHEET_KEYS.overhaulRenewalPlanning:
      case CANONICAL_SHEET_KEYS.subcontractingPlanning:
      case CANONICAL_SHEET_KEYS.planningComplet:
      case CANONICAL_SHEET_KEYS.techniciansNeededPerDay:
      case CANONICAL_SHEET_KEYS.hoursReport:
        workbookData.sheets[sheetKey] = rows;
        break;
      default:
        workbookData.sheets.genericRows.push(
          ...rows.map((row) => ({
            ...row,
            __sheetname: sheetName,
            __sheetkey: sheetKey,
          }))
        );
        break;
    }
  });

  reconstructDeqVmiPlanningSheets(workbookData.sheets);

  workbookData.projectKey =
    workbookData.projectKey ||
    deriveProjectKey(workbookData.generalParams, workbookData.fileName);
  workbookData.label =
    workbookData.label ||
    workbookData.generalParams.project_name ||
    workbookData.fileName ||
    "Unnamed workbook";
  workbookData.kind = workbookData.kind || inferWorkbookKind(workbookData.sheets);

  return workbookData;
}

export function parseWorkbook(workbook, options = {}) {
  if (!workbook || typeof workbook !== "object") {
    throw new Error("A workbook object is required.");
  }

  if (Array.isArray(workbook.SheetNames) && workbook.Sheets) {
    const sheetMap = {};
    workbook.SheetNames.forEach((sheetName) => {
      sheetMap[sheetName] = workbook.Sheets[sheetName];
    });
    return parseWorkbookFromSheetMap(sheetMap, options);
  }

  return parseWorkbookFromSheetMap(workbook, options);
}
