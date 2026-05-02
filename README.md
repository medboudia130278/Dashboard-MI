# Dashboard MI

Static browser dashboard for maintenance planning analysis and Cost Summary & MI preparation.

## Entry points

- `index_Vref.html`: main dashboard.
- `cost_summary_mi.html`: Cost Summary & MI workspace.

Open the HTML files directly in a browser. The app currently uses browser-side storage only.

## Main features

- Import Excel planning files in the browser.
- Analyze workload, materials, overhaul and renewals, subcontracting, and benchmark views.
- Prepare shared dashboard data for the Cost Summary & MI workspace.
- Store local working data in `localStorage` and `IndexedDB`.

## Dependencies

The current version loads these libraries from CDNs:

- Tailwind CSS
- SheetJS XLSX
- PptxGenJS
- html2canvas
- Google Fonts / Material Symbols

An internet connection is required for the UI libraries and exports that depend on these CDN assets.

## Repository hygiene

The repository intentionally excludes:

- `archives/`
- `Excel files/`
- Excel workbooks (`*.xlsx`, `*.xls`, `*.xlsm`, `*.xlsb`)
- generated exports such as `*.pptx` and `*.pdf`

Do not commit client, project, pricing, or workbook data unless it has been explicitly sanitized.

## Refactor status

See `README_refactor_notes.md` for the current low-risk extraction point and the manual smoke test to run after future changes.

