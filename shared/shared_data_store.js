import {
  DEFAULT_COST_SUMMARY_DRAFT,
  DEFAULT_SHARED_SETTINGS,
  SHARED_STORE_KEYS,
  SHARED_STORE_VERSION,
  normalizeWorkbookData,
} from "./shared_models.js";

function safeReadJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function safeWriteJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function makeWorkbookStorageKey(sourceId) {
  return `${SHARED_STORE_KEYS.workbookPrefix}${sourceId}`;
}

export async function initSharedStore() {
  const currentIndex = safeReadJson(SHARED_STORE_KEYS.workbookIndex, []);
  if (!Array.isArray(currentIndex)) {
    safeWriteJson(SHARED_STORE_KEYS.workbookIndex, []);
  }

  const currentSettings = safeReadJson(SHARED_STORE_KEYS.settings, null);
  if (!currentSettings || typeof currentSettings !== "object") {
    safeWriteJson(SHARED_STORE_KEYS.settings, {
      version: SHARED_STORE_VERSION,
      ...DEFAULT_SHARED_SETTINGS,
    });
  }
}

export async function getWorkbookIndex() {
  const index = safeReadJson(SHARED_STORE_KEYS.workbookIndex, []);
  return Array.isArray(index) ? index : [];
}

export async function saveWorkbookData(workbookData) {
  const normalized = normalizeWorkbookData({
    ...workbookData,
    version: SHARED_STORE_VERSION,
    updatedAt: new Date().toISOString(),
  });
  if (!normalized.sourceId) {
    throw new Error("Workbook sourceId is required.");
  }

  safeWriteJson(makeWorkbookStorageKey(normalized.sourceId), normalized);

  const index = await getWorkbookIndex();
  const nextIndex = Array.from(new Set(index.concat([normalized.sourceId])));
  safeWriteJson(SHARED_STORE_KEYS.workbookIndex, nextIndex);
  return normalized;
}

export async function getWorkbookData(sourceId) {
  if (!sourceId) return null;
  const data = safeReadJson(makeWorkbookStorageKey(sourceId), null);
  return data ? normalizeWorkbookData(data) : null;
}

export async function getAllWorkbookData() {
  const index = await getWorkbookIndex();
  const items = await Promise.all(index.map((sourceId) => getWorkbookData(sourceId)));
  return items.filter(Boolean);
}

export async function removeWorkbookData(sourceId) {
  if (!sourceId) return;
  localStorage.removeItem(makeWorkbookStorageKey(sourceId));
  const index = await getWorkbookIndex();
  safeWriteJson(
    SHARED_STORE_KEYS.workbookIndex,
    index.filter((id) => id !== sourceId)
  );
}

export async function clearAllWorkbookData() {
  const index = await getWorkbookIndex();
  index.forEach((sourceId) => localStorage.removeItem(makeWorkbookStorageKey(sourceId)));
  safeWriteJson(SHARED_STORE_KEYS.workbookIndex, []);
}

export async function loadSharedSettings() {
  const settings = safeReadJson(SHARED_STORE_KEYS.settings, {});
  return {
    version: SHARED_STORE_VERSION,
    ...DEFAULT_SHARED_SETTINGS,
    ...(settings || {}),
  };
}

export async function saveSharedSettings(settings = {}) {
  const next = {
    version: SHARED_STORE_VERSION,
    ...DEFAULT_SHARED_SETTINGS,
    ...(settings || {}),
  };
  safeWriteJson(SHARED_STORE_KEYS.settings, next);
  return next;
}

export async function loadCostSummaryDraft() {
  const draft = safeReadJson(SHARED_STORE_KEYS.costSummaryDraft, {});
  return {
    ...DEFAULT_COST_SUMMARY_DRAFT,
    ...(draft || {}),
  };
}

export async function saveCostSummaryDraft(draft = {}) {
  const next = {
    ...DEFAULT_COST_SUMMARY_DRAFT,
    ...(draft || {}),
  };
  safeWriteJson(SHARED_STORE_KEYS.costSummaryDraft, next);
  return next;
}

