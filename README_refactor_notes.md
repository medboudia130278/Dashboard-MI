# Refactor Notes

## Stable extraction point

This project currently keeps the main dashboard business logic in `index_Vref.js`.
The current refactor intentionally extracted only low-risk code:

- `shared/dashboard_config.js`
  - Dashboard storage keys.
  - Shared module paths.
  - Column candidate mappings.
  - Chart color palettes.
- `shared/dashboard_utils.js`
  - Pure formatting and normalization helpers.
  - JSON localStorage read/write wrappers.
  - Date and number parsing helpers.
- `shared/dashboard_workbook_mirror.js`
  - Pure helpers for building the lightweight shared workbook mirror.

`index_Vref.js` still keeps fallbacks for these extracted helpers and constants.
If one extracted file fails to load, the dashboard should still have the original
local definitions available.

## Do not move yet

Keep these areas in `index_Vref.js` until there is a stronger test harness:

- Calculation logic.
- The main `state` object and state transitions.
- Excel ingestion and workbook parsing flow.
- Remote Excel sync.
- `localStorage` and IndexedDB write/remove flows.
- Main view renderers for Workload, Materials, Overhaul, Subcontracting, and Benchmark.
- Cost Summary bridge synchronization.

## Manual smoke test

After any future refactor, run:

```text
node --check index_Vref.js
node --check shared/dashboard_config.js
node --check shared/dashboard_utils.js
node --check shared/dashboard_workbook_mirror.js
node --check cost_summary_mi.js
node --check cost_summary_mi_ui.js
```

Then manually verify:

- Open `index_Vref.html`.
- Upload a representative Excel file.
- Check Workload, Materials, Overhaul, Subcontracting, and Benchmark views.
- Verify colors and charts are displayed.
- Verify currency conversion still works.
- Open `cost_summary_mi.html` and confirm dashboard data is visible there.

