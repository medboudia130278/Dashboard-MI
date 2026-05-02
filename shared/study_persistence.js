const STUDY_DB_NAME = "cost-summary-mi-db";
const STUDY_DB_VERSION = 1;
const LAST_OPEN_STUDY_KEY = "cost-summary-mi-last-open-study-id";

let _dbPromise = null;
export const DASHBOARD_BRIDGE_STUDY_ID = "__dashboard_shared_bridge__";

export const STUDY_STORE_NAMES = {
  studies: "studies",
  studyConfigs: "study_configs",
  sourceRegistry: "source_registry",
  normalizedWorkbooks: "normalized_workbooks",
};

function promisifyRequest(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("IndexedDB request failed."));
  });
}

function waitForTransaction(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error || new Error("IndexedDB transaction failed."));
    transaction.onabort = () => reject(transaction.error || new Error("IndexedDB transaction aborted."));
  });
}

function toIsoNow() {
  return new Date().toISOString();
}

function makeId(prefix) {
  const random = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now()}_${random}`;
}

function normalizeStudyMeta(input = {}) {
  const createdAt = input.createdAt || toIsoNow();
  return {
    studyId: input.studyId || makeId("study"),
    name: input.name || "Cost Summary & MI - Draft",
    status: input.status || "draft",
    targetCurrency: input.targetCurrency || "USD",
    scenario: input.scenario || "baseline",
    sourceStrategy: input.sourceStrategy || "shared_dashboard_files",
    exportMode: input.exportMode || "single_workbook",
    includeAuditTrail: input.includeAuditTrail ?? true,
    lockFormulaSheet: input.lockFormulaSheet ?? false,
    createdAt,
    updatedAt: input.updatedAt || createdAt,
    version: 1,
  };
}

function createEmptyStudyConfig(studyId) {
  return {
    studyId,
    dataSources: {
      wbs: {},
      currencyExchangeRates: {},
      firmingRules: {},
    },
    studySetup: {
      projectPhases: {},
      guidePlanningDefinition: {},
      pioDefinitionFreightCustoms: {},
      priceLists: {},
    },
    supportCosts: {
      toolsConsumables: {},
      ppe: {},
      vehicles: {},
      mandatoryTraining: {},
      otherSupportCosts: {},
    },
    organizationRisks: {
      costCenters: {},
      whiteCollarDefinition: {},
      workloadSynthesis: {},
      riskRegister: {},
    },
    deliverables: {
      subsystemSummary: {},
      mercuryInterface: {},
    },
    notes: "",
    updatedAt: toIsoNow(),
  };
}

function normalizeSourceRecord(input = {}) {
  return {
    sourceId: input.sourceId || makeId("source"),
    studyId: input.studyId || "",
    projectKey: input.projectKey || "",
    sourceType: input.sourceType || "upload",
    label: input.label || input.fileName || "Unnamed source",
    fileName: input.fileName || "",
    url: input.url || "",
    handleSupported: !!input.handleSupported,
    handleId: input.handleId || "",
    syncMode: input.syncMode || "manual",
    lastHash: input.lastHash || "",
    lastImportedAt: input.lastImportedAt || "",
    lastSyncedAt: input.lastSyncedAt || "",
    status: input.status || "ready",
    errorMessage: input.errorMessage || "",
    version: 1,
  };
}

function normalizeWorkbookRecord(input = {}) {
  return {
    sourceId: input.sourceId || "",
    studyId: input.studyId || "",
    projectKey: input.projectKey || "",
    fileName: input.fileName || "",
    kind: input.kind || "",
    updatedAt: input.updatedAt || toIsoNow(),
    sheets: input.sheets || {},
    version: 1,
  };
}

export function generateStudyId() {
  return makeId("study");
}

export function generateSourceId() {
  return makeId("source");
}

export function openStudyDatabase() {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB is not available in this browser context."));
  }

  if (_dbPromise) return _dbPromise;

  _dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(STUDY_DB_NAME, STUDY_DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(STUDY_STORE_NAMES.studies)) {
        const store = db.createObjectStore(STUDY_STORE_NAMES.studies, { keyPath: "studyId" });
        store.createIndex("by_updatedAt", "updatedAt", { unique: false });
        store.createIndex("by_name", "name", { unique: false });
      }

      if (!db.objectStoreNames.contains(STUDY_STORE_NAMES.studyConfigs)) {
        db.createObjectStore(STUDY_STORE_NAMES.studyConfigs, { keyPath: "studyId" });
      }

      if (!db.objectStoreNames.contains(STUDY_STORE_NAMES.sourceRegistry)) {
        const store = db.createObjectStore(STUDY_STORE_NAMES.sourceRegistry, { keyPath: "sourceId" });
        store.createIndex("by_studyId", "studyId", { unique: false });
        store.createIndex("by_projectKey", "projectKey", { unique: false });
        store.createIndex("by_sourceType", "sourceType", { unique: false });
        store.createIndex("by_status", "status", { unique: false });
      }

      if (!db.objectStoreNames.contains(STUDY_STORE_NAMES.normalizedWorkbooks)) {
        const store = db.createObjectStore(STUDY_STORE_NAMES.normalizedWorkbooks, { keyPath: "sourceId" });
        store.createIndex("by_studyId", "studyId", { unique: false });
        store.createIndex("by_projectKey", "projectKey", { unique: false });
        store.createIndex("by_kind", "kind", { unique: false });
      }
    };

    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => {
        db.close();
        _dbPromise = null;
      };
      resolve(db);
    };

    request.onerror = () => {
      _dbPromise = null;
      reject(request.error || new Error("Unable to open IndexedDB."));
    };
  });

  return _dbPromise;
}

export function closeStudyDatabase() {
  _dbPromise = null;
}

async function withStore(storeName, mode, runner) {
  const db = await openStudyDatabase();
  const transaction = db.transaction(storeName, mode);
  const store = transaction.objectStore(storeName);
  const result = await runner(store, transaction);
  await waitForTransaction(transaction);
  return result;
}

export async function createStudy(meta = {}) {
  const study = normalizeStudyMeta(meta);
  const config = createEmptyStudyConfig(study.studyId);

  const db = await openStudyDatabase();
  const transaction = db.transaction(
    [STUDY_STORE_NAMES.studies, STUDY_STORE_NAMES.studyConfigs],
    "readwrite"
  );
  transaction.objectStore(STUDY_STORE_NAMES.studies).put(study);
  transaction.objectStore(STUDY_STORE_NAMES.studyConfigs).put(config);
  await waitForTransaction(transaction);
  return study;
}

export async function getStudy(studyId) {
  if (!studyId) return null;
  return withStore(STUDY_STORE_NAMES.studies, "readonly", async (store) => {
    const result = await promisifyRequest(store.get(studyId));
    return result || null;
  });
}

export async function listStudies() {
  return withStore(STUDY_STORE_NAMES.studies, "readonly", async (store) => {
    const items = await promisifyRequest(store.getAll());
    return Array.isArray(items)
      ? items.sort((left, right) => String(right.updatedAt || "").localeCompare(String(left.updatedAt || "")))
      : [];
  });
}

export async function updateStudy(studyId, patch = {}) {
  const existing = await getStudy(studyId);
  if (!existing) {
    throw new Error(`Study not found: ${studyId}`);
  }

  const next = normalizeStudyMeta({
    ...existing,
    ...patch,
    studyId: existing.studyId,
    createdAt: existing.createdAt,
    updatedAt: toIsoNow(),
  });

  await withStore(STUDY_STORE_NAMES.studies, "readwrite", async (store) => {
    store.put(next);
  });
  return next;
}

export async function deleteStudy(studyId) {
  if (!studyId) return;

  const db = await openStudyDatabase();
  const transaction = db.transaction(
    [
      STUDY_STORE_NAMES.studies,
      STUDY_STORE_NAMES.studyConfigs,
      STUDY_STORE_NAMES.sourceRegistry,
      STUDY_STORE_NAMES.normalizedWorkbooks,
    ],
    "readwrite"
  );

  transaction.objectStore(STUDY_STORE_NAMES.studies).delete(studyId);
  transaction.objectStore(STUDY_STORE_NAMES.studyConfigs).delete(studyId);

  const sourceStore = transaction.objectStore(STUDY_STORE_NAMES.sourceRegistry);
  const workbookStore = transaction.objectStore(STUDY_STORE_NAMES.normalizedWorkbooks);
  const sourceIndex = sourceStore.index("by_studyId");
  const workbookIndex = workbookStore.index("by_studyId");

  const sources = await promisifyRequest(sourceIndex.getAll(IDBKeyRange.only(studyId)));
  const workbooks = await promisifyRequest(workbookIndex.getAll(IDBKeyRange.only(studyId)));

  sources.forEach((item) => sourceStore.delete(item.sourceId));
  workbooks.forEach((item) => workbookStore.delete(item.sourceId));

  await waitForTransaction(transaction);

  if (getLastOpenStudyId() === studyId) {
    clearLastOpenStudyId();
  }
}

export async function loadStudyConfig(studyId) {
  if (!studyId) return null;
  return withStore(STUDY_STORE_NAMES.studyConfigs, "readonly", async (store) => {
    const result = await promisifyRequest(store.get(studyId));
    return result || createEmptyStudyConfig(studyId);
  });
}

export async function saveStudyConfig(studyId, config = {}) {
  if (!studyId) {
    throw new Error("studyId is required to save a study config.");
  }

  const existing = (await loadStudyConfig(studyId)) || createEmptyStudyConfig(studyId);
  const next = {
    ...existing,
    ...config,
    studyId,
    updatedAt: toIsoNow(),
  };

  await withStore(STUDY_STORE_NAMES.studyConfigs, "readwrite", async (store) => {
    store.put(next);
  });
  return next;
}

export async function registerSource(source = {}) {
  const normalized = normalizeSourceRecord(source);
  if (!normalized.studyId) {
    throw new Error("studyId is required to register a source.");
  }

  await withStore(STUDY_STORE_NAMES.sourceRegistry, "readwrite", async (store) => {
    store.put(normalized);
  });
  return normalized;
}

export async function getSource(sourceId) {
  if (!sourceId) return null;
  return withStore(STUDY_STORE_NAMES.sourceRegistry, "readonly", async (store) => {
    const result = await promisifyRequest(store.get(sourceId));
    return result || null;
  });
}

export async function listStudySources(studyId) {
  if (!studyId) return [];
  return withStore(STUDY_STORE_NAMES.sourceRegistry, "readonly", async (store) => {
    const index = store.index("by_studyId");
    const items = await promisifyRequest(index.getAll(IDBKeyRange.only(studyId)));
    return Array.isArray(items) ? items : [];
  });
}

export async function updateSource(sourceId, patch = {}) {
  const existing = await getSource(sourceId);
  if (!existing) {
    throw new Error(`Source not found: ${sourceId}`);
  }

  const next = normalizeSourceRecord({
    ...existing,
    ...patch,
    sourceId: existing.sourceId,
    studyId: existing.studyId,
  });

  await withStore(STUDY_STORE_NAMES.sourceRegistry, "readwrite", async (store) => {
    store.put(next);
  });
  return next;
}

export async function removeSource(sourceId) {
  if (!sourceId) return;

  const db = await openStudyDatabase();
  const transaction = db.transaction(
    [STUDY_STORE_NAMES.sourceRegistry, STUDY_STORE_NAMES.normalizedWorkbooks],
    "readwrite"
  );
  transaction.objectStore(STUDY_STORE_NAMES.sourceRegistry).delete(sourceId);
  transaction.objectStore(STUDY_STORE_NAMES.normalizedWorkbooks).delete(sourceId);
  await waitForTransaction(transaction);
}

export async function saveNormalizedWorkbook(sourceId, workbookData = {}) {
  if (!sourceId) {
    throw new Error("sourceId is required to save a normalized workbook.");
  }

  const record = normalizeWorkbookRecord({
    ...workbookData,
    sourceId,
    updatedAt: toIsoNow(),
  });

  if (!record.studyId) {
    throw new Error("studyId is required on normalized workbook records.");
  }

  await withStore(STUDY_STORE_NAMES.normalizedWorkbooks, "readwrite", async (store) => {
    store.put(record);
  });
  return record;
}

export async function getNormalizedWorkbook(sourceId) {
  if (!sourceId) return null;
  return withStore(STUDY_STORE_NAMES.normalizedWorkbooks, "readonly", async (store) => {
    const result = await promisifyRequest(store.get(sourceId));
    return result || null;
  });
}

export async function listNormalizedWorkbooks(studyId) {
  if (!studyId) return [];
  return withStore(STUDY_STORE_NAMES.normalizedWorkbooks, "readonly", async (store) => {
    const index = store.index("by_studyId");
    const items = await promisifyRequest(index.getAll(IDBKeyRange.only(studyId)));
    return Array.isArray(items) ? items : [];
  });
}

export function setLastOpenStudyId(studyId) {
  if (!studyId) return;
  localStorage.setItem(LAST_OPEN_STUDY_KEY, studyId);
}

export function getLastOpenStudyId() {
  return localStorage.getItem(LAST_OPEN_STUDY_KEY) || "";
}

export function clearLastOpenStudyId() {
  localStorage.removeItem(LAST_OPEN_STUDY_KEY);
}

export async function ensureDefaultStudy(meta = {}) {
  const lastStudyId = getLastOpenStudyId();
  const existing = lastStudyId ? await getStudy(lastStudyId) : null;
  if (existing) return existing;

  const studies = await listStudies();
  if (studies.length) {
    setLastOpenStudyId(studies[0].studyId);
    return studies[0];
  }

  const created = await createStudy(meta);
  setLastOpenStudyId(created.studyId);
  return created;
}

export async function ensureDashboardBridgeStudy(meta = {}) {
  const existing = await getStudy(DASHBOARD_BRIDGE_STUDY_ID);
  if (existing) return existing;

  return createStudy({
    studyId: DASHBOARD_BRIDGE_STUDY_ID,
    name: "Dashboard Shared Bridge",
    status: "system",
    sourceStrategy: "shared_dashboard_files",
    exportMode: "single_workbook",
    includeAuditTrail: false,
    lockFormulaSheet: false,
    ...meta,
  });
}
