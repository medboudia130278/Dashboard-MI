(function () {
  function getRowsForSharedStore(rows, fileId) {
    return (rows || []).filter((row) => row?.__fileid === fileId);
  }

  function buildSharedWorkbookLiteData(workbookData, options = {}) {
    const version = options.version || 1;
    const gp = workbookData?.generalParams || workbookData?.sheets?.generalParameters || {};
    const synthesisRows = Array.isArray(workbookData?.sheets?.synthesis) ? workbookData.sheets.synthesis : [];
    const synthesisSubsystems = Array.from(new Set(
      synthesisRows
        .map((row) => String(row?.subsystem || row?.sub_system || "").trim())
        .filter(Boolean)
    )).sort((left, right) => String(left).localeCompare(String(right)));
    const synthesisCurrencies = Array.from(new Set(
      synthesisRows
        .map((row) => String(row?.currency || row?.Currency || "").trim().toUpperCase())
        .filter(Boolean)
    )).sort((left, right) => String(left).localeCompare(String(right)));
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
      version,
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
  }

  window.PasserelleDashboardWorkbookMirror = {
    getRowsForSharedStore,
    buildSharedWorkbookLiteData,
  };
})();
