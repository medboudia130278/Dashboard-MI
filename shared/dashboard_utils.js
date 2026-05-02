(function () {
  function normalizeKey(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_]/g, "");
  }

  function normalizeCurrencyCode(value) {
    const code = String(value ?? "").trim().toUpperCase();
    return /^[A-Z]{3}$/.test(code) ? code : "";
  }

  function colorForSeriesIndex(index, palette) {
    if (Array.isArray(palette) && index < palette.length) return palette[index];
    const hue = (index * 47) % 360;
    return `hsl(${hue},70%,45%)`;
  }

  function readStoredJson(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function writeStoredJson(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Ignore storage failures such as private mode or quota limits.
    }
  }

  function formatInt(value) {
    if (value === null || value === undefined || Number.isNaN(value)) return "0";
    return new Intl.NumberFormat().format(Math.round(value));
  }

  function formatHours(value) {
    if (value === null || value === undefined || Number.isNaN(value)) return "0h";
    const rounded = Math.round(value * 10) / 10;
    return `${new Intl.NumberFormat().format(rounded)}h`;
  }

  function formatCompactNumber(value, digits = 1) {
    if (value === null || value === undefined || Number.isNaN(value)) return "0";
    return new Intl.NumberFormat("en-US", {
      notation: "compact",
      maximumFractionDigits: digits,
    }).format(value);
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[character]));
  }

  function toNumber(value) {
    if (value === null || value === undefined) return 0;
    if (typeof value === "number") return Number.isFinite(value) ? value : 0;

    let text = String(value).trim();
    if (!text) return 0;

    const timeMatch = text.match(/^(-?\d+):(\d{1,2})(?::(\d{1,2}))?$/);
    if (timeMatch) {
      const hours = Number(timeMatch[1]);
      const minutes = Number(timeMatch[2]);
      const seconds = timeMatch[3] ? Number(timeMatch[3]) : 0;
      return (Number.isFinite(hours) ? hours : 0)
        + (Number.isFinite(minutes) ? minutes : 0) / 60
        + (Number.isFinite(seconds) ? seconds : 0) / 3600;
    }

    text = text.replace(/\s/g, "").replace(",", ".");
    const parsed = Number(text);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function excelDateToJSDate(excelNum) {
    const epoch = new Date(Date.UTC(1899, 11, 30));
    const ms = excelNum * 24 * 60 * 60 * 1000;
    return new Date(epoch.getTime() + ms);
  }

  function parseDate(value) {
    if (value === null || value === undefined || value === "") return null;
    if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
    if (typeof value === "number") {
      const date = excelDateToJSDate(value);
      return Number.isNaN(date.getTime()) ? null : date;
    }

    const text = String(value).trim();
    const date = new Date(text);
    if (!Number.isNaN(date.getTime())) return date;

    const match = text.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
    if (match) {
      const day = Number(match[1]);
      const month = Number(match[2]) - 1;
      let year = Number(match[3]);
      if (year < 100) year += 2000;
      const parsedDate = new Date(year, month, day);
      return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
    }

    return null;
  }

  window.PasserelleDashboardUtils = {
    normalizeKey,
    normalizeCurrencyCode,
    colorForSeriesIndex,
    readStoredJson,
    writeStoredJson,
    formatInt,
    formatHours,
    formatCompactNumber,
    escapeHtml,
    toNumber,
    excelDateToJSDate,
    parseDate,
  };
})();
