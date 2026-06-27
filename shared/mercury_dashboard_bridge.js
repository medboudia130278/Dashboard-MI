const MERCURY_BRIDGE_DB_NAME = "passerelle-mercury-dashboard";
const MERCURY_BRIDGE_DB_VERSION = 1;
const MERCURY_BRIDGE_STORE = "snapshots";
const MERCURY_BRIDGE_ACTIVE_KEY = "active";

export const MERCURY_BRIDGE_SIGNAL_KEY = "cost-summary-mi-mercury-bridge-v1";

let bridgeDbPromise = null;

function openMercuryBridgeDb() {
  if (bridgeDbPromise) return bridgeDbPromise;
  bridgeDbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is not available."));
      return;
    }
    const request = indexedDB.open(MERCURY_BRIDGE_DB_NAME, MERCURY_BRIDGE_DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(MERCURY_BRIDGE_STORE)) {
        db.createObjectStore(MERCURY_BRIDGE_STORE, { keyPath: "key" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Unable to open the Mercury dashboard bridge."));
  });
  return bridgeDbPromise;
}

function waitForRequest(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Mercury dashboard bridge request failed."));
  });
}

function waitForTransaction(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error || new Error("Mercury dashboard bridge transaction failed."));
    transaction.onabort = () => reject(transaction.error || new Error("Mercury dashboard bridge transaction was aborted."));
  });
}

export async function publishMercuryBridge(payload = {}) {
  const db = await openMercuryBridgeDb();
  const publishedAt = payload.publishedAt || new Date().toISOString();
  const snapshot = {
    ...payload,
    key: MERCURY_BRIDGE_ACTIVE_KEY,
    version: 1,
    publishedAt,
    rows: Array.isArray(payload.rows) ? payload.rows : [],
    projects: Array.isArray(payload.projects) ? payload.projects : [],
  };
  const transaction = db.transaction(MERCURY_BRIDGE_STORE, "readwrite");
  const transactionDone = waitForTransaction(transaction);
  transaction.objectStore(MERCURY_BRIDGE_STORE).put(snapshot);
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
  localStorage.setItem(MERCURY_BRIDGE_SIGNAL_KEY, JSON.stringify(signal));
  return signal;
}

export async function readMercuryBridge() {
  const db = await openMercuryBridgeDb();
  const transaction = db.transaction(MERCURY_BRIDGE_STORE, "readonly");
  const transactionDone = waitForTransaction(transaction);
  const result = await waitForRequest(
    transaction.objectStore(MERCURY_BRIDGE_STORE).get(MERCURY_BRIDGE_ACTIVE_KEY)
  );
  await transactionDone;
  return result || null;
}
