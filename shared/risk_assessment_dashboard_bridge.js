const RISK_ASSESSMENT_BRIDGE_DB_NAME = "passerelle-risk-assessment-dashboard";
const RISK_ASSESSMENT_BRIDGE_DB_VERSION = 1;
const RISK_ASSESSMENT_BRIDGE_STORE = "snapshots";
const RISK_ASSESSMENT_BRIDGE_ACTIVE_KEY = "active";

export const RISK_ASSESSMENT_BRIDGE_SIGNAL_KEY = "cost-summary-mi-risk-assessment-bridge-v1";

let bridgeDbPromise = null;

function openRiskAssessmentBridgeDb() {
  if (bridgeDbPromise) return bridgeDbPromise;
  bridgeDbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is not available."));
      return;
    }
    const request = indexedDB.open(RISK_ASSESSMENT_BRIDGE_DB_NAME, RISK_ASSESSMENT_BRIDGE_DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(RISK_ASSESSMENT_BRIDGE_STORE)) {
        db.createObjectStore(RISK_ASSESSMENT_BRIDGE_STORE, { keyPath: "key" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Unable to open the Risk Assessment dashboard bridge."));
  });
  return bridgeDbPromise;
}

function waitForRequest(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Risk Assessment dashboard bridge request failed."));
  });
}

function waitForTransaction(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error || new Error("Risk Assessment dashboard bridge transaction failed."));
    transaction.onabort = () => reject(transaction.error || new Error("Risk Assessment dashboard bridge transaction was aborted."));
  });
}

export async function publishRiskAssessmentBridge(payload = {}) {
  const db = await openRiskAssessmentBridgeDb();
  const publishedAt = payload.publishedAt || new Date().toISOString();
  const snapshot = {
    ...payload,
    key: RISK_ASSESSMENT_BRIDGE_ACTIVE_KEY,
    version: 1,
    publishedAt,
    rows: Array.isArray(payload.rows) ? payload.rows : [],
    projects: Array.isArray(payload.projects) ? payload.projects : [],
  };
  const transaction = db.transaction(RISK_ASSESSMENT_BRIDGE_STORE, "readwrite");
  const transactionDone = waitForTransaction(transaction);
  transaction.objectStore(RISK_ASSESSMENT_BRIDGE_STORE).put(snapshot);
  await transactionDone;

  const signal = {
    version: snapshot.version,
    studyId: snapshot.studyId || "",
    studyName: snapshot.studyName || "",
    publishedAt,
    rowCount: snapshot.rows.length,
    projectCount: snapshot.projects.length,
    revision: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  };
  localStorage.setItem(RISK_ASSESSMENT_BRIDGE_SIGNAL_KEY, JSON.stringify(signal));
  return signal;
}

export async function readRiskAssessmentBridge() {
  const db = await openRiskAssessmentBridgeDb();
  const transaction = db.transaction(RISK_ASSESSMENT_BRIDGE_STORE, "readonly");
  const transactionDone = waitForTransaction(transaction);
  const result = await waitForRequest(
    transaction.objectStore(RISK_ASSESSMENT_BRIDGE_STORE).get(RISK_ASSESSMENT_BRIDGE_ACTIVE_KEY)
  );
  await transactionDone;
  return result || null;
}
