    (function () {
      const moduleDefinitions = {
        study_setup: {
          label: "Study Setup",
          icon: "schema",
          items: {
            cost_centers: {
              label: "Cost Centers",
              description: "Define the organizational cost-center structure used to allocate indirect costs.",
              inputs: ["Cost center list", "Allocation links", "Overhead ownership"],
            },
            pio_definition_freight_customs: {
              label: "PIO Definition, Freight & Customs",
              description: "Prepare the business rules for PIO and the logistics cost perimeter used later in export sheets.",
              inputs: ["PIO scope", "Freight assumptions", "Customs logic"],
            },
            project_phases: {
              label: "Project Phases",
              description: "Describe the study sequencing and the phase structure that will frame calculations and outputs.",
              inputs: ["Phase list", "Phase order", "Phase-specific scope notes"],
            },
            guide_planning_definition: {
              label: "Guide Planning Definition",
              description: "Document the planning guide assumptions that will support the cost summary logic.",
              inputs: ["Planning basis", "Calendar assumptions", "Reference workload horizon"],
            },
            price_lists: {
              label: "Price Lists",
              description: "Define which price lists will be reused, normalized, and version-controlled inside the module.",
              inputs: ["Price list sources", "Validity dates", "Fallback hierarchy"],
            },
          },
        },
        data_sources: {
          label: "Data sources",
          icon: "database",
          items: {
            currency_exchange_rates: {
              label: "Currency & Exchange Rates",
              description: "Set the reference currency strategy, manual overrides, and the governance rules for exchange-rate refresh.",
              inputs: ["Target currency policy", "Manual rate overrides", "Rate source priority"],
            },
            firming_rules: {
              label: "Firming Rules",
              description: "Capture the assumptions that convert draft estimates into firmed values for the MI package.",
              inputs: ["Firming horizon", "Confidence factors", "Rule exceptions by subsystem"],
            },
          },
        },
        organization_risks: {
          label: "Organization & Risks",
          icon: "warning",
          items: {
            workload_synthesis: {
              label: "Workload Synthesis",
              description: "Frame how workload consolidation will be reused by the future MI engine.",
              inputs: ["Workload sources", "Aggregation rules", "Control checks"],
            },
            white_collar_definition: {
              label: "White collars & Optimization",
              description: "Prepare the white-collar population rules that will feed organization-related cost calculations.",
              inputs: ["Population categories", "Coverage rules", "Exclusion logic"],
            },
            risk_register: {
              label: "Risk Register",
              description: "Define the risk structure, scoring, and cost impact logic for scenario management.",
              inputs: ["Risk categories", "Probability-impact logic", "Mitigation ownership"],
            },
            wbs: {
              label: "WBS",
              description: "Define the work breakdown structure source, mapping granularity, and expected ownership levels.",
              inputs: ["WBS source workbook", "WBS level mapping", "Project ownership rules"],
            },
          },
        },
        pricing_risks: {
          label: "Pricing & Risks",
          icon: "price_change",
          items: {
            price_lists: {
              label: "Price Lists",
              description: "Define client price-list columns and the Text 1 to Text 9 mapping used by future exports.",
              inputs: ["Client price-list columns", "Manual values", "Text mapping"],
            },
            risk_register: {
              label: "Risk Register",
              description: "Define the risk structure, scoring, and cost impact logic for scenario management.",
              inputs: ["Risk categories", "Probability-impact logic", "Mitigation ownership"],
            },
            wbs: {
              label: "WBS",
              description: "Define the work breakdown structure source, mapping granularity, and expected ownership levels.",
              inputs: ["WBS source workbook", "WBS level mapping", "Project ownership rules"],
            },
          },
        },
        support_costs: {
          label: "Support Costs",
          icon: "inventory_2",
          items: {
            tools_consumables: {
              label: "Tools & Consumables",
              description: "Prepare the support-cost structure for tools, expendables, and usage rules.",
              inputs: ["Tool categories", "Consumption basis", "Renewal rules"],
            },
            vehicles: {
              label: "Vehicles",
              description: "Define vehicle fleets, usage assumptions, and cost allocation rules.",
              inputs: ["Fleet mix", "Mileage assumptions", "Ownership model"],
            },
            mandatory_training: {
              label: "Mandatory Training",
              description: "Set the mandatory training plan that contributes to support costs.",
              inputs: ["Training catalogue", "Renewal frequency", "Population rules"],
            },
            other_support_costs: {
              label: "Other Support Costs",
              description: "Create room for residual support costs that do not fit the standard buckets.",
              inputs: ["Custom support buckets", "Allocation basis", "Validation notes"],
            },
          },
        },
        export_data: {
          label: "Export data",
          icon: "upload_file",
          items: {
            subsystem_summary: {
              label: "Subsystem Summary",
              description: "Configure the subsystem-level output package that will feed the final workbook deliverables.",
              inputs: ["Summary layout", "Per-subsystem metrics", "Output formatting"],
            },
            mercury_interface: {
              label: "Mercury Interface",
              description: "Prepare the future export mapping dedicated to the Mercury interface.",
              inputs: ["Interface schema", "Field mapping", "Validation checks"],
            },
          },
        },
      };

      const buildSteps = [
        "Confirm the exact business scope and required outputs.",
        "List the workbook sheets and column mappings this module will use.",
        "Define manual parameters and validation rules.",
        "Wire the calculation engine only after the business contract is stable.",
      ];

      function $(id) {
        return document.getElementById(id);
      }

      function escapeHtml(value) {
        return String(value ?? "")
          .replaceAll("&", "&amp;")
          .replaceAll("<", "&lt;")
          .replaceAll(">", "&gt;")
          .replaceAll('"', "&quot;")
          .replaceAll("'", "&#39;");
      }

      function safeReadJson(key, fallback) {
        try {
          const raw = localStorage.getItem(key);
          return raw ? JSON.parse(raw) : fallback;
        } catch {
          return fallback;
        }
      }

      const projectPhaseFallbackKey = "cost-summary-mi-project-phases-fallback-v1";
      const costCentersFallbackKey = "cost-summary-mi-cost-centers-fallback-v1";
      const pioDefinitionFallbackKey = "cost-summary-mi-pio-definition-fallback-v1";
      const currencyExchangeFallbackKey = "cost-summary-mi-currency-exchange-fallback-v1";
      const firmingRulesFallbackKey = "cost-summary-mi-firming-rules-fallback-v1";
      const guidePlanningFallbackKey = "cost-summary-mi-guide-planning-fallback-v1";
      const workloadOverridesFallbackKey = "cost-summary-mi-workload-overrides-fallback-v1";
      const whiteCollarFallbackKey = "cost-summary-mi-white-collar-fallback-v1";
      const wbsFallbackKey = "cost-summary-mi-wbs-fallback-v1";
      const toolsConsumablesFallbackKey = "cost-summary-mi-tools-consumables-fallback-v1";
      const vehiclesFallbackKey         = "cost-summary-mi-vehicles-fallback-v1";
      const oscFallbackKey              = "cost-summary-mi-osc-fallback-v1";
      const mandatoryTrainingFallbackKey = "cost-summary-mi-mandatory-training-fallback-v1";
      const priceListsFallbackKey = "cost-summary-mi-price-lists-fallback-v1";
      const sharedStoreWorkbookPrefix = "shared-store-workbook-v1:";
      const sharedStoreWorkbookLitePrefix = "shared-store-workbook-lite-v1:";
      const sharedSettingsKey = "shared-store-settings-v1";
      const costCenterCurrencyCatalog = ["EUR", "USD", "AED", "SAR", "BRL", "CNY", "SGD", "INR", "GBP", "PLN"];
      const costCenterTimePeriodCatalog = ["Day", "Night", "Shift", "Average", "Handback"];
      const pioDefinitionOriginCatalog = ["France_Saint ouen", "Belgium_Charleroi"];
      const costCenterPositionCatalog = [
        "Project_Director_Local",
        "Project_Director_Expat",
        "Operation_Project_Manager_Local",
        "Operation_Project_Manager_Expat",
        "Industrial_Manager",
        "Safety_Manager",
        "Quality_Manager",
        "EHS_Manager",
        "Engineering_Manager",
        "Engineer",
        "Subsystem Engineer",
        "Planning Engineer",
        "Cybersecurity Engineer",
        "Engineering External Support",
        "Warehouse_Manager",
        "Storekeeper",
        "Buyer",
        "Wayside_Maintenance_Manager",
        "Supervisor",
        "Team Leader",
        "Technician",
        "Worker"
      ];

      function normalizeProjectContext(value) {
        return String(value || "")
          .trim()
          .toLowerCase()
          .replace(/[\s-]+/g, "_");
      }

      function toNumber(value) {
        if (value === null || value === undefined || value === "") return null;
        const parsed = Number(String(value).replace(",", ".").trim());
        return Number.isFinite(parsed) ? parsed : null;
      }

      function getFallbackStudyId() {
        return localStorage.getItem("cost-summary-mi-last-open-study-id") || "default_study";
      }

      function readProjectPhaseFallbackState() {
        const all = safeReadJson(projectPhaseFallbackKey, {});
        return all[getFallbackStudyId()] || {};
      }

      function writeProjectPhaseFallbackState(nextState) {
        const all = safeReadJson(projectPhaseFallbackKey, {});
        all[getFallbackStudyId()] = nextState;
        localStorage.setItem(projectPhaseFallbackKey, JSON.stringify(all));
        window.updateToolbarStatusDots?.();
      }

      function readCostCentersFallbackState() {
        const all = safeReadJson(costCentersFallbackKey, {});
        return all[getFallbackStudyId()] || {};
      }

      function readCombinedCostCentersState() {
        const fallback = readCostCentersFallbackState();
        const primary = window.__costSummaryCostCentersStore && typeof window.__costSummaryCostCentersStore === "object"
          ? window.__costSummaryCostCentersStore
          : {};
        const merged = Object.assign({}, fallback, primary);
        Object.keys(fallback || {}).forEach(function (projectKey) {
          const fallbackProject = fallback[projectKey] || {};
          const primaryProject = primary[projectKey] || {};
          merged[projectKey] = Object.assign({}, fallbackProject, primaryProject, {
            customCurrencies: Array.from(new Set([]
              .concat(Array.isArray(fallbackProject.customCurrencies) ? fallbackProject.customCurrencies : [])
              .concat(Array.isArray(primaryProject.customCurrencies) ? primaryProject.customCurrencies : []))),
            customPositions: Array.from(new Set([]
              .concat(Array.isArray(fallbackProject.customPositions) ? fallbackProject.customPositions : [])
              .concat(Array.isArray(primaryProject.customPositions) ? primaryProject.customPositions : []))),
            selectedPositions: Array.from(new Set([]
              .concat(Array.isArray(fallbackProject.selectedPositions) ? fallbackProject.selectedPositions : [])
              .concat(Array.isArray(primaryProject.selectedPositions) ? primaryProject.selectedPositions : []))),
            rowOverrides: Object.assign({}, fallbackProject.rowOverrides || {}, primaryProject.rowOverrides || {}),
          });
        });
        return merged;
      }

      function readCombinedCostCenterProject(projectKey, keys) {
        const state = readCombinedCostCentersState();
        const candidates = Array.from(new Set([]
          .concat(Array.isArray(keys) ? keys : [])
          .concat(projectKey ? [projectKey] : [])
        ));
        return readPersistedFallbackProjectState(state, candidates);
      }

      function getProjectLookupKeys(project) {
        const rawKeys = []
          .concat(Array.isArray(project && project.persistedKeys) ? project.persistedKeys : [])
          .concat([
            project && project.projectKey,
            project && project.projectName,
          ])
          .filter(function (value) { return value !== undefined && value !== null && String(value).trim() !== ""; });
        const expanded = [];
        rawKeys.forEach(function (value) {
          const text = String(value).trim();
          expanded.push(text);
          expanded.push(normalizeWorkspaceKey(text));
        });
        return Array.from(new Set(expanded.filter(Boolean)));
      }

      function buildProjectLookupMap(projects) {
        const byLookupKey = new Map();
        (Array.isArray(projects) ? projects : []).forEach(function (project) {
          getProjectLookupKeys(project).forEach(function (key) {
            if (!byLookupKey.has(key)) byLookupKey.set(key, project);
          });
        });
        return byLookupKey;
      }

      function findProjectByLookupKeys(projectsByLookup, keys) {
        const lookupKeys = Array.isArray(keys) ? keys : [keys];
        for (let index = 0; index < lookupKeys.length; index += 1) {
          const project = projectsByLookup.get(lookupKeys[index]);
          if (project) return project;
        }
        return null;
      }

      function findProjectByStoredKey(projects, projectKey) {
        const list = Array.isArray(projects) ? projects : [];
        const byLookup = buildProjectLookupMap(list);
        return findProjectByLookupKeys(byLookup, [projectKey, normalizeWorkspaceKey(projectKey)])
          || list.find(function (project) { return project && project.projectKey === projectKey; })
          || null;
      }

      function fillMissingImportedPhaseValues(projectData, phases) {
        const data = Object.assign({}, projectData || {});
        const phaseKeys = (Array.isArray(phases) ? phases : [])
          .map(function (phase) { return phase && phase.key; })
          .filter(Boolean);
        const sourcePhaseKey = phaseKeys.find(function (phaseKey) {
          const prefix = phaseKey + "|";
          return Object.keys(data).some(function (key) { return key.indexOf(prefix) === 0; });
        });
        if (!sourcePhaseKey) return data;

        const sourcePrefix = sourcePhaseKey + "|";
        const sourceEntries = Object.keys(data)
          .filter(function (key) { return key.indexOf(sourcePrefix) === 0; })
          .map(function (key) { return { suffix: key.slice(sourcePrefix.length), value: data[key] }; });
        phaseKeys.forEach(function (phaseKey) {
          const targetPrefix = phaseKey + "|";
          const hasPhaseValues = Object.keys(data).some(function (key) { return key.indexOf(targetPrefix) === 0; });
          if (hasPhaseValues) return;
          sourceEntries.forEach(function (entry) {
            data[targetPrefix + entry.suffix] = entry.value;
          });
        });
        return data;
      }

      function forceZeroMobWithoutPostWarranty(projectData, phases) {
        const data = Object.assign({}, projectData || {});
        (Array.isArray(phases) ? phases : []).forEach(function (phase) {
          const hasPostWarranty = !!(phase && phase.postWarrantyStartDate && phase.postWarrantyEndDate);
          if (hasPostWarranty || !phase || !phase.key) return;
          const prefix = phase.key + "|";
          Object.keys(data).forEach(function (key) {
            if (key.indexOf(prefix) === 0 && key.indexOf("|mob|") !== -1) {
              data[key] = 0;
            }
          });
        });
        return data;
      }

      function buildCombinedProjectPhaseProjects() {
        const fallbackProjects = buildFallbackProjectPhaseProjects();
        const primaryProjects = Array.isArray(window.__costSummaryProjectPhaseProjects)
          ? window.__costSummaryProjectPhaseProjects
          : [];
        if (!primaryProjects.length) return fallbackProjects;

        const byLookupKey = new Map();
        fallbackProjects.forEach(function (project) {
          getProjectLookupKeys(project).forEach(function (key) {
            if (!byLookupKey.has(key)) byLookupKey.set(key, project);
          });
        });

        const mergedByProjectKey = new Map();
        fallbackProjects.forEach(function (project) {
          mergedByProjectKey.set(project.projectKey, project);
        });

        primaryProjects.forEach(function (primaryProject) {
          const lookupKeys = getProjectLookupKeys(primaryProject);
          const fallbackProject = lookupKeys.map(function (key) { return byLookupKey.get(key); }).find(Boolean) || {};
          const persistedKeys = Array.from(new Set([]
            .concat(getProjectLookupKeys(fallbackProject))
            .concat(getProjectLookupKeys(primaryProject))
          ));
          const merged = Object.assign({}, fallbackProject, primaryProject, {
            persistedKeys: persistedKeys,
            phases: Array.isArray(primaryProject.phases) && primaryProject.phases.length
              ? primaryProject.phases
              : (Array.isArray(fallbackProject.phases) ? fallbackProject.phases : []),
          });
          mergedByProjectKey.delete(fallbackProject.projectKey);
          mergedByProjectKey.set(merged.projectKey, merged);
        });

        return Array.from(mergedByProjectKey.values()).sort(function (left, right) {
          return String(left.projectName).localeCompare(String(right.projectName));
        });
      }

      function writeCostCentersFallbackState(nextState) {
        const all = safeReadJson(costCentersFallbackKey, {});
        all[getFallbackStudyId()] = nextState;
        localStorage.setItem(costCentersFallbackKey, JSON.stringify(all));
        window.updateToolbarStatusDots?.();
      }

      function readPioDefinitionFallbackState() {
        const all = safeReadJson(pioDefinitionFallbackKey, {});
        return all[getFallbackStudyId()] || {};
      }

      function readCombinedPioDefinitionState() {
        const fallback = readPioDefinitionFallbackState();
        const primary = window.__costSummaryPioDefinitionStore && typeof window.__costSummaryPioDefinitionStore === "object"
          ? window.__costSummaryPioDefinitionStore
          : {};
        const merged = Object.assign({}, fallback, primary);
        Object.keys(fallback || {}).forEach(function (projectKey) {
          const fallbackProject = fallback[projectKey] || {};
          const primaryProject = primary[projectKey] || {};
          merged[projectKey] = Object.assign({}, fallbackProject, primaryProject, {
            customOrigins: Array.from(new Set([])
              .concat(Array.isArray(fallbackProject.customOrigins) ? fallbackProject.customOrigins : [])
              .concat(Array.isArray(primaryProject.customOrigins) ? primaryProject.customOrigins : [])),
            selectedOrigins: Array.from(new Set([])
              .concat(Array.isArray(fallbackProject.selectedOrigins) ? fallbackProject.selectedOrigins : [])
              .concat(Array.isArray(primaryProject.selectedOrigins) ? primaryProject.selectedOrigins : [])),
            rowOverrides: Object.assign({}, fallbackProject.rowOverrides || {}, primaryProject.rowOverrides || {}),
            customDutiesBySubsystem: Object.assign({}, fallbackProject.customDutiesBySubsystem || {}, primaryProject.customDutiesBySubsystem || {}),
          });
        });
        return merged;
      }

      function writePioDefinitionFallbackState(nextState) {
        const all = safeReadJson(pioDefinitionFallbackKey, {});
        all[getFallbackStudyId()] = nextState;
        localStorage.setItem(pioDefinitionFallbackKey, JSON.stringify(all));
        window.updateToolbarStatusDots?.();
      }

      function readCurrencyExchangeFallbackState() {
        const all = safeReadJson(currencyExchangeFallbackKey, {});
        return all[getFallbackStudyId()] || {};
      }

      function writeCurrencyExchangeFallbackState(nextState) {
        const all = safeReadJson(currencyExchangeFallbackKey, {});
        all[getFallbackStudyId()] = nextState;
        localStorage.setItem(currencyExchangeFallbackKey, JSON.stringify(all));
        window.updateToolbarStatusDots?.();
      }

      function readWorkloadOverridesFallbackState() {
        const all = safeReadJson(workloadOverridesFallbackKey, {});
        return all[getFallbackStudyId()] || {};
      }

      function writeWorkloadOverridesFallbackState(nextState) {
        const all = safeReadJson(workloadOverridesFallbackKey, {});
        all[getFallbackStudyId()] = nextState;
        localStorage.setItem(workloadOverridesFallbackKey, JSON.stringify(all));
        window.updateToolbarStatusDots?.();
      }

      function saveWorkloadCellOverride(projectKey, rowKey, col, rawInput, isPct) {
        const num = parseFloat(rawInput);
        if (isNaN(num)) return;
        const stored = isPct ? num / 100 : num;
        const current = readWorkloadOverridesFallbackState();
        const nextProject = Object.assign({}, current[projectKey] || {});
        const cellKey = rowKey + "|" + col;
        nextProject[cellKey] = Math.round(stored * 10000) / 10000;
        current[projectKey] = nextProject;
        writeWorkloadOverridesFallbackState(current);
      }

      function readWhiteCollarFallbackState() {
        const all = safeReadJson(whiteCollarFallbackKey, {});
        return all[getFallbackStudyId()] || {};
      }

      function writeWhiteCollarFallbackState(nextState) {
        const all = safeReadJson(whiteCollarFallbackKey, {});
        all[getFallbackStudyId()] = nextState;
        localStorage.setItem(whiteCollarFallbackKey, JSON.stringify(all));
        window.updateToolbarStatusDots?.();
      }

      function readWbsFallbackState() {
        const all = safeReadJson(wbsFallbackKey, {});
        return all[getFallbackStudyId()] || {};
      }

      function writeWbsFallbackState(nextState) {
        const all = safeReadJson(wbsFallbackKey, {});
        all[getFallbackStudyId()] = nextState;
        localStorage.setItem(wbsFallbackKey, JSON.stringify(all));
        window.updateToolbarStatusDots?.();
      }

      function saveWhiteCollarCellOverride(projectKey, phaseKey, subsystem, periodType, col, rawInput) {
        const num = parseFloat(rawInput);
        if (isNaN(num)) return;
        const state = readWhiteCollarFallbackState();
        const proj = Object.assign({}, state[projectKey] || {});
        proj[phaseKey + "|" + subsystem + "|" + periodType + "|" + col] = Math.round(num * 10000) / 10000;
        state[projectKey] = proj;
        writeWhiteCollarFallbackState(state);
      }

      function saveWhiteCollarQuantityOverride(projectKey, phaseKey, periodType, position, rawInput) {
        const num = parseFloat(rawInput);
        if (isNaN(num)) return;
        const state = readWhiteCollarFallbackState();
        const proj = Object.assign({}, state[projectKey] || {});
        proj["wct|" + phaseKey + "|" + periodType + "|" + position] = Math.round(num * 10000) / 10000;
        state[projectKey] = proj;
        writeWhiteCollarFallbackState(state);
      }

      function readToolsConsumablesFallbackState() {
        const all = safeReadJson(toolsConsumablesFallbackKey, {});
        return all[getFallbackStudyId()] || {};
      }

      function writeToolsConsumablesFallbackState(nextState) {
        const all = safeReadJson(toolsConsumablesFallbackKey, {});
        all[getFallbackStudyId()] = nextState;
        localStorage.setItem(toolsConsumablesFallbackKey, JSON.stringify(all));
        window.updateToolbarStatusDots?.();
      }

      function readVehiclesFallbackState() {
        const all = safeReadJson(vehiclesFallbackKey, {});
        return all[getFallbackStudyId()] || {};
      }

      function writeVehiclesFallbackState(nextState) {
        const all = safeReadJson(vehiclesFallbackKey, {});
        all[getFallbackStudyId()] = nextState;
        localStorage.setItem(vehiclesFallbackKey, JSON.stringify(all));
        window.updateToolbarStatusDots?.();
      }

      function saveTcCellOverride(projectKey, phaseKey, subsystem, periodType, colKey, rawInput, displayRate) {
        const displayVal = parseFloat(rawInput);
        if (isNaN(displayVal)) return;
        const rate = parseFloat(displayRate);
        const eurVal = (Number.isFinite(rate) && rate > 0) ? displayVal / rate : displayVal;
        const state = readToolsConsumablesFallbackState();
        const proj = Object.assign({}, state[projectKey] || {});
        proj[phaseKey + "|" + subsystem + "|" + periodType + "|" + colKey] = Math.round(eurVal * 10000) / 10000;
        state[projectKey] = proj;
        writeToolsConsumablesFallbackState(state);
      }

      function buildTcCurrencyOptions(projectKey) {
        const sharedSettings = safeReadJson(sharedSettingsKey, {}) || {};
        const baseCurrency   = String(sharedSettings.exchangeBase || "USD").toUpperCase();
        const liveRates      = sharedSettings.liveRates || {};

        function baseRate(code) {
          if (code === baseCurrency) return 1;
          const v = Number(liveRates[code]);
          return (Number.isFinite(v) && v > 0) ? v : null;
        }
        function eurToCode(code) {
          if (code === "EUR") return 1;
          const eurBase  = baseRate("EUR");
          const codeBase = baseRate(code);
          if (eurBase === null || codeBase === null) return null;
          return codeBase / eurBase;
        }

        const currProjects = buildFallbackCurrencyExchangeProjects();
        const currProject  = currProjects.find(function (p) { return p.projectKey === projectKey; }) || null;

        const seen    = new Set(["EUR"]);
        const entries = [{ code: "EUR", rate: 1 }];

        if (currProject) {
          currProject.rows.forEach(function (row) {
            const code = String(row.currency || "").toUpperCase();
            if (!code || seen.has(code)) return;
            seen.add(code);
            entries.push({ code: code, rate: eurToCode(code) });
          });
        }

        return entries; // [{ code: "EUR", rate: 1 }, { code: "AED", rate: 3.67 }, ...]
      }

      function saveVehiclesCellOverride(projectKey, phaseKey, subsystem, periodType, colKey, rawInput, displayRate) {
        const displayVal = parseFloat(rawInput);
        if (isNaN(displayVal)) return;
        const rate = parseFloat(displayRate);
        const eurVal = (Number.isFinite(rate) && rate > 0) ? displayVal / rate : displayVal;
        const state = readVehiclesFallbackState();
        const proj = Object.assign({}, state[projectKey] || {});
        proj[phaseKey + "|" + subsystem + "|" + periodType + "|" + colKey] = Math.round(eurVal * 10000) / 10000;
        state[projectKey] = proj;
        writeVehiclesFallbackState(state);
      }

      function buildVehiclesCurrencyOptions(projectKey) {
        const sharedSettings = safeReadJson(sharedSettingsKey, {}) || {};
        const baseCurrency   = String(sharedSettings.exchangeBase || "USD").toUpperCase();
        const liveRates      = sharedSettings.liveRates || {};
        function baseRate(code) {
          if (code === baseCurrency) return 1;
          const v = Number(liveRates[code]);
          return (Number.isFinite(v) && v > 0) ? v : null;
        }
        function eurToCode(code) {
          if (code === "EUR") return 1;
          const eurBase  = baseRate("EUR");
          const codeBase = baseRate(code);
          if (eurBase === null || codeBase === null) return null;
          return codeBase / eurBase;
        }
        const currProjects = buildFallbackCurrencyExchangeProjects();
        const currProject  = currProjects.find(function (p) { return p.projectKey === projectKey; }) || null;
        const seen    = new Set(["EUR"]);
        const entries = [{ code: "EUR", rate: 1 }];
        if (currProject) {
          currProject.rows.forEach(function (row) {
            const code = String(row.currency || "").toUpperCase();
            if (!code || seen.has(code)) return;
            seen.add(code);
            entries.push({ code: code, rate: eurToCode(code) });
          });
        }
        return entries;
      }

      function readOscFallbackState() {
        const all = safeReadJson(oscFallbackKey, {});
        return all[getFallbackStudyId()] || {};
      }

      function writeOscFallbackState(nextState) {
        const all = safeReadJson(oscFallbackKey, {});
        all[getFallbackStudyId()] = nextState;
        localStorage.setItem(oscFallbackKey, JSON.stringify(all));
        window.updateToolbarStatusDots?.();
      }

      function saveOscCellOverride(projectKey, phaseKey, periodType, colKey, rawInput, displayRate) {
        const displayVal = parseFloat(rawInput);
        if (isNaN(displayVal)) return;
        const rate = parseFloat(displayRate);
        const eurVal = (Number.isFinite(rate) && rate > 0) ? displayVal / rate : displayVal;
        const state = readOscFallbackState();
        const proj = Object.assign({}, state[projectKey] || {});
        proj[phaseKey + "|" + periodType + "|" + colKey] = Math.round(eurVal * 10000) / 10000;
        state[projectKey] = proj;
        writeOscFallbackState(state);
      }

      function buildOscCurrencyOptions(projectKey) {
        const sharedSettings = safeReadJson(sharedSettingsKey, {}) || {};
        const baseCurrency   = String(sharedSettings.exchangeBase || "USD").toUpperCase();
        const liveRates      = sharedSettings.liveRates || {};
        function baseRate(code) {
          if (code === baseCurrency) return 1;
          const v = Number(liveRates[code]);
          return (Number.isFinite(v) && v > 0) ? v : null;
        }
        function eurToCode(code) {
          if (code === "EUR") return 1;
          const eurBase  = baseRate("EUR");
          const codeBase = baseRate(code);
          if (eurBase === null || codeBase === null) return null;
          return codeBase / eurBase;
        }
        const currProjects = buildFallbackCurrencyExchangeProjects();
        const currProject  = currProjects.find(function (p) { return p.projectKey === projectKey; }) || null;
        const seen    = new Set(["EUR"]);
        const entries = [{ code: "EUR", rate: 1 }];
        if (currProject) {
          currProject.rows.forEach(function (row) {
            const code = String(row.currency || "").toUpperCase();
            if (!code || seen.has(code)) return;
            seen.add(code);
            entries.push({ code: code, rate: eurToCode(code) });
          });
        }
        return entries;
      }

      function readMandatoryTrainingFallbackState() {
        const all = safeReadJson(mandatoryTrainingFallbackKey, {});
        return all[getFallbackStudyId()] || {};
      }

      function writeMandatoryTrainingFallbackState(nextState) {
        const all = safeReadJson(mandatoryTrainingFallbackKey, {});
        all[getFallbackStudyId()] = nextState;
        localStorage.setItem(mandatoryTrainingFallbackKey, JSON.stringify(all));
        window.updateToolbarStatusDots?.();
      }

      function readPriceListsFallbackState() {
        const all = safeReadJson(priceListsFallbackKey, {});
        return all[getFallbackStudyId()] || {};
      }

      function writePriceListsFallbackState(nextState) {
        const all = safeReadJson(priceListsFallbackKey, {});
        all[getFallbackStudyId()] = nextState;
        localStorage.setItem(priceListsFallbackKey, JSON.stringify(all));
        window.updateToolbarStatusDots?.();
      }

      function buildMtCurrencyOptions(projectKey) {
        const sharedSettings = safeReadJson(sharedSettingsKey, {}) || {};
        const baseCurrency   = String(sharedSettings.exchangeBase || "USD").toUpperCase();
        const liveRates      = sharedSettings.liveRates || {};
        function baseRate(code) {
          if (code === baseCurrency) return 1;
          const v = Number(liveRates[code]);
          return (Number.isFinite(v) && v > 0) ? v : null;
        }
        function eurToCode(code) {
          if (code === "EUR") return 1;
          const eurBase  = baseRate("EUR");
          const codeBase = baseRate(code);
          if (eurBase === null || codeBase === null) return null;
          return codeBase / eurBase;
        }
        const currProjects = buildFallbackCurrencyExchangeProjects();
        const currProject  = currProjects.find(function (p) { return p.projectKey === projectKey; }) || null;
        const seen    = new Set(["EUR"]);
        const entries = [{ code: "EUR", rate: 1 }];
        if (currProject) {
          currProject.rows.forEach(function (row) {
            const code = String(row.currency || "").toUpperCase();
            if (!code || seen.has(code)) return;
            seen.add(code);
            entries.push({ code: code, rate: eurToCode(code) });
          });
        }
        return entries;
      }

      function readFirmingRulesFallbackState() {
        const all = safeReadJson(firmingRulesFallbackKey, {});
        return all[getFallbackStudyId()] || {};
      }

      function writeFirmingRulesFallbackState(nextState) {
        const all = safeReadJson(firmingRulesFallbackKey, {});
        all[getFallbackStudyId()] = nextState;
        localStorage.setItem(firmingRulesFallbackKey, JSON.stringify(all));
        window.updateToolbarStatusDots?.();
      }

      function readGuidePlanningFallbackState() {
        const all = safeReadJson(guidePlanningFallbackKey, {});
        return all[getFallbackStudyId()] || {};
      }

      function writeGuidePlanningFallbackState(nextState) {
        const all = safeReadJson(guidePlanningFallbackKey, {});
        all[getFallbackStudyId()] = nextState;
        localStorage.setItem(guidePlanningFallbackKey, JSON.stringify(all));
        window.updateToolbarStatusDots?.();
      }

      function readCombinedGuidePlanningState() {
        function unionList(left, right) {
          return Array.from(new Set([]
            .concat(Array.isArray(left) ? left : [])
            .concat(Array.isArray(right) ? right : [])
            .filter(Boolean)));
        }
        function mergeRows(left, right) {
          const rows = []
            .concat(Array.isArray(left) ? left : [])
            .concat(Array.isArray(right) ? right : []);
          const seen = new Set();
          return rows.filter(function (row) {
            const key = row && (row.id || row.rowKey || JSON.stringify(row));
            if (!key || seen.has(key)) return false;
            seen.add(key);
            return true;
          });
        }
        const primary = window.__costSummaryGuidePlanningStore && typeof window.__costSummaryGuidePlanningStore === "object"
          ? window.__costSummaryGuidePlanningStore
          : {};
        const fallback = readGuidePlanningFallbackState();
        const merged = Object.assign({}, fallback, primary);
        Array.from(new Set(Object.keys(fallback || {}).concat(Object.keys(primary || {})))).forEach(function (projectKey) {
          const fallbackProject = fallback[projectKey] || {};
          const primaryProject = primary[projectKey] || {};
          merged[projectKey] = Object.assign({}, fallbackProject, primaryProject, {
            selectedMaterialTypes: unionList(fallbackProject.selectedMaterialTypes, primaryProject.selectedMaterialTypes),
            selectedSubcontractingTypes: unionList(fallbackProject.selectedSubcontractingTypes, primaryProject.selectedSubcontractingTypes),
            selectedRecurrentMaterialTypes: unionList(fallbackProject.selectedRecurrentMaterialTypes, primaryProject.selectedRecurrentMaterialTypes),
            selectedRecurrentSubcontractingTypes: unionList(fallbackProject.selectedRecurrentSubcontractingTypes, primaryProject.selectedRecurrentSubcontractingTypes),
            mobilizationWorkloadMonthsByPosition: Object.assign({}, fallbackProject.mobilizationWorkloadMonthsByPosition || {}, primaryProject.mobilizationWorkloadMonthsByPosition || {}),
            demobilizationWorkloadMonthsByPosition: Object.assign({}, fallbackProject.demobilizationWorkloadMonthsByPosition || {}, primaryProject.demobilizationWorkloadMonthsByPosition || {}),
            demobilizationMaterialMonthsByType: Object.assign({}, fallbackProject.demobilizationMaterialMonthsByType || {}, primaryProject.demobilizationMaterialMonthsByType || {}),
            demobilizationSubcontractingMonthsByType: Object.assign({}, fallbackProject.demobilizationSubcontractingMonthsByType || {}, primaryProject.demobilizationSubcontractingMonthsByType || {}),
            rowOverrides: Object.assign({}, fallbackProject.rowOverrides || {}, primaryProject.rowOverrides || {}),
            customWorkloadRows: mergeRows(fallbackProject.customWorkloadRows, primaryProject.customWorkloadRows),
            customMaterialRows: mergeRows(fallbackProject.customMaterialRows, primaryProject.customMaterialRows),
            customSubcontractingRows: mergeRows(fallbackProject.customSubcontractingRows, primaryProject.customSubcontractingRows),
            customRecurrentWorkloadRows: mergeRows(fallbackProject.customRecurrentWorkloadRows, primaryProject.customRecurrentWorkloadRows),
            customRecurrentMaterialRows: mergeRows(fallbackProject.customRecurrentMaterialRows, primaryProject.customRecurrentMaterialRows),
            customRecurrentSubcontractingRows: mergeRows(fallbackProject.customRecurrentSubcontractingRows, primaryProject.customRecurrentSubcontractingRows),
            customDemobilizationWorkloadRows: mergeRows(fallbackProject.customDemobilizationWorkloadRows, primaryProject.customDemobilizationWorkloadRows),
            customDemobilizationMaterialRows: mergeRows(fallbackProject.customDemobilizationMaterialRows, primaryProject.customDemobilizationMaterialRows),
            customDemobilizationSubcontractingRows: mergeRows(fallbackProject.customDemobilizationSubcontractingRows, primaryProject.customDemobilizationSubcontractingRows),
            customOverhaulRenewalRows: mergeRows(fallbackProject.customOverhaulRenewalRows, primaryProject.customOverhaulRenewalRows),
            riskRows: mergeRows(fallbackProject.riskRows || fallbackProject.customRiskRows, primaryProject.riskRows || primaryProject.customRiskRows),
          });
        });
        return merged;
      }

      const configExportStores = [
        { key: projectPhaseFallbackKey, name: "projectPhases" },
        { key: costCentersFallbackKey, name: "costCenters" },
        { key: pioDefinitionFallbackKey, name: "pioDefinition" },
        { key: currencyExchangeFallbackKey, name: "currencyExchange" },
        { key: firmingRulesFallbackKey, name: "firmingRules" },
        { key: guidePlanningFallbackKey, name: "guidePlanning" },
        { key: workloadOverridesFallbackKey, name: "workloadSynthesis" },
        { key: whiteCollarFallbackKey, name: "whiteCollar" },
        { key: wbsFallbackKey, name: "wbs" },
        { key: toolsConsumablesFallbackKey, name: "toolsConsumables" },
        { key: vehiclesFallbackKey, name: "vehicles" },
        { key: oscFallbackKey, name: "otherSupportCosts" },
        { key: mandatoryTrainingFallbackKey, name: "mandatoryTraining" },
        { key: priceListsFallbackKey, name: "priceLists" },
      ];

      function cloneJsonValue(value) {
        return JSON.parse(JSON.stringify(value ?? {}));
      }

      function getCurrentStudyLabel() {
        const selector = $("studySelector");
        const selected = selector && selector.selectedOptions && selector.selectedOptions[0];
        return (selected && selected.textContent ? selected.textContent.trim() : "") || getFallbackStudyId();
      }

      function safeFilePart(value) {
        return String(value || "cost-summary-mi")
          .trim()
          .replace(/[^A-Za-z0-9._-]+/g, "_")
          .replace(/^_+|_+$/g, "")
          .slice(0, 80) || "cost-summary-mi";
      }

      function readConfigStoreSlice(storageKey, studyId) {
        const all = safeReadJson(storageKey, {});
        return cloneJsonValue(all && typeof all === "object" ? all[studyId] || {} : {});
      }

      function writeConfigStoreSlice(storageKey, studyId, value) {
        const all = safeReadJson(storageKey, {});
        all[studyId] = cloneJsonValue(value || {});
        localStorage.setItem(storageKey, JSON.stringify(all));
      }

      function buildCostSummaryConfigExport() {
        const studyId = getFallbackStudyId();
        const modules = {};
        configExportStores.forEach(function (store) {
          modules[store.name] = readConfigStoreSlice(store.key, studyId);
        });
        const groups = {
          studySetup: {
            projectPhases: cloneJsonValue(modules.projectPhases),
            costCenters: cloneJsonValue(modules.costCenters),
            pioDefinition: cloneJsonValue(modules.pioDefinition),
            guidePlanning: cloneJsonValue(modules.guidePlanning),
            priceLists: cloneJsonValue(modules.priceLists),
          },
          dataSources: {
            currencyExchange: cloneJsonValue(modules.currencyExchange),
            firmingRules: cloneJsonValue(modules.firmingRules),
          },
          organizationRisks: {
            workloadSynthesis: cloneJsonValue(modules.workloadSynthesis),
            whiteCollar: cloneJsonValue(modules.whiteCollar),
            wbs: cloneJsonValue(modules.wbs),
          },
          supportCosts: {
            toolsConsumables: cloneJsonValue(modules.toolsConsumables),
            vehicles: cloneJsonValue(modules.vehicles),
            otherSupportCosts: cloneJsonValue(modules.otherSupportCosts),
            mandatoryTraining: cloneJsonValue(modules.mandatoryTraining),
          },
          pricingRisks: {
            priceLists: cloneJsonValue(modules.priceLists),
          },
        };
        return {
          app: "cost-summary-mi",
          schemaVersion: 1,
          exportedAt: new Date().toISOString(),
          sourceStudyId: studyId,
          studyName: getCurrentStudyLabel(),
          note: "Configuration only. Excel workbook data is not included.",
          modules: modules,
          groups: groups,
          sharedSettings: cloneJsonValue(safeReadJson(sharedSettingsKey, {})),
        };
      }

      function exportCostSummaryConfigJson() {
        try {
          const payload = typeof window.__costSummaryBuildConfigExport === "function"
            ? window.__costSummaryBuildConfigExport()
            : buildCostSummaryConfigExport();
          const json = JSON.stringify(payload, null, 2);
          const blob = new Blob([json], { type: "application/json" });
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          const datePart = new Date().toISOString().slice(0, 10);
          link.href = url;
          link.download = safeFilePart(payload.studyName) + "_config_" + datePart + ".json";
          document.body.appendChild(link);
          link.click();
          link.remove();
          URL.revokeObjectURL(url);
        } catch (err) {
          console.error("Cost Summary config export error:", err);
          window.alert("Unable to export JSON configuration: " + (err.message || err));
        }
      }

      function refreshCostSummaryConfigViewsAfterImport() {
        window.updateToolbarStatusDots?.();
        if (!$("projectPhasesWorkspace")?.classList.contains("hidden")) renderFallbackProjectPhasesDrawer(moduleDefinitions.study_setup, moduleDefinitions.study_setup.items.project_phases);
        if (!$("costCentersWorkspace")?.classList.contains("hidden")) renderFallbackCostCentersWorkspace();
        if (!$("pioDefinitionWorkspace")?.classList.contains("hidden")) renderFallbackPioDefinitionWorkspace();
        if (!$("currencyExchangeWorkspace")?.classList.contains("hidden")) renderFallbackCurrencyExchangeWorkspace();
        if (!$("firmingRulesWorkspace")?.classList.contains("hidden")) renderFallbackFirmingRulesWorkspace();
        if (!$("guidePlanningWorkspace")?.classList.contains("hidden")) renderFallbackGuidePlanningWorkspace();
        if (!$("workloadSynthesisWorkspace")?.classList.contains("hidden")) renderFallbackWorkloadSynthesisWorkspace();
        if (!$("whiteCollarDefinitionWorkspace")?.classList.contains("hidden")) renderFallbackWhiteCollarWorkspace();
        if (!$("wbsWorkspace")?.classList.contains("hidden")) renderFallbackWbsWorkspace();
        if (!$("toolsConsumablesWorkspace")?.classList.contains("hidden")) renderFallbackToolsConsumablesWorkspace();
        if (!$("vehiclesWorkspace")?.classList.contains("hidden")) renderFallbackVehiclesWorkspace();
        if (!$("oscWorkspace")?.classList.contains("hidden")) renderFallbackOscWorkspace();
        if (!$("mandatoryTrainingWorkspace")?.classList.contains("hidden")) renderFallbackMandatoryTrainingWorkspace();
        if (!$("priceListsWorkspace")?.classList.contains("hidden")) renderFallbackPriceListsWorkspace();
        if (!$("subsystemSummaryWorkspace")?.classList.contains("hidden")) renderSubsystemSummaryWorkspace();
      }

      async function importCostSummaryConfigPayload(payload) {
        if (!payload || payload.app !== "cost-summary-mi" || Number(payload.schemaVersion) !== 1 || !payload.modules || typeof payload.modules !== "object") {
          throw new Error("Invalid Cost Summary & MI configuration file.");
        }
        if (typeof window.__costSummaryImportConfigPayload === "function") {
          await window.__costSummaryImportConfigPayload(payload);
        }
        const studyId = getFallbackStudyId();
        configExportStores.forEach(function (store) {
          writeConfigStoreSlice(store.key, studyId, payload.modules[store.name] || {});
        });
        if (payload.sharedSettings && typeof payload.sharedSettings === "object") {
          localStorage.setItem(sharedSettingsKey, JSON.stringify(payload.sharedSettings));
        }
        refreshCostSummaryConfigViewsAfterImport();
      }

      function importCostSummaryConfigJsonFile(file) {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async function (evt) {
          try {
            const payload = JSON.parse(String(evt.target.result || ""));
            const sourceName = payload && payload.studyName ? " from \"" + payload.studyName + "\"" : "";
            const ok = window.confirm("Import Cost Summary & MI configuration" + sourceName + " into the current study? This will replace the current local configuration for this study. Excel workbook data is not included.");
            if (!ok) return;
            await importCostSummaryConfigPayload(payload);
            window.alert("Configuration imported successfully. Re-import the Excel source files separately if they are not already loaded on this PC.");
          } catch (err) {
            console.error("Cost Summary config import error:", err);
            window.alert("Unable to import JSON configuration: " + (err.message || err));
          }
        };
        reader.readAsText(file);
      }

      function readSharedWorkbookForWorkspace(sourceId) {
        return safeReadJson(sharedStoreWorkbookLitePrefix + sourceId, null)
          || safeReadJson(sharedStoreWorkbookPrefix + sourceId, null);
      }

      function formatDateInputValue(value) {
        if (!value) return "";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return "";
        return date.toISOString().slice(0, 10);
      }

      function formatDateDisplay(value) {
        if (!value) return "--";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return "--";
        return date.toLocaleDateString("en-GB");
      }

      function addMonths(dateValue, months) {
        const date = new Date(dateValue);
        if (Number.isNaN(date.getTime())) return "";
        const next = new Date(date);
        next.setMonth(next.getMonth() + Number(months || 0));
        return formatDateInputValue(next);
      }

      function addYears(dateValue, years) {
        return addMonths(dateValue, Number(years || 0) * 12);
      }

      function addDays(dateValue, days) {
        const date = new Date(dateValue);
        if (Number.isNaN(date.getTime())) return "";
        const next = new Date(date);
        next.setDate(next.getDate() + Number(days || 0));
        return formatDateInputValue(next);
      }

      function addYearsInclusive(dateValue, years) {
        const safeYears = Number(years || 0);
        if (safeYears <= 0) return formatDateInputValue(dateValue);
        return addDays(addYears(dateValue, safeYears), -1);
      }

      function formatPhaseYearCode(index) {
        const safeIndex = Math.max(1, Math.round(Number(index) || 1));
        return "Y" + String(safeIndex).padStart(2, "0");
      }

      function inferPhaseYearIndex(serviceYear, dateValue) {
        const baseYear = toNumber(serviceYear);
        const date = new Date(dateValue);
        if (baseYear === null || Number.isNaN(date.getTime())) return null;
        return Math.max(1, date.getFullYear() - baseYear + 1);
      }

      function buildDefaultPhaseCode(serviceYear, startDate, endDate, durationYears) {
        const startIndex = inferPhaseYearIndex(serviceYear, startDate);
        if (startIndex === null) return "";
        const duration = toNumber(durationYears);
        const endIndexFromDuration = duration !== null
          ? Math.max(startIndex, startIndex + Math.max(0, Math.round(duration)) - 1)
          : null;
        const endIndexFromDate = inferPhaseYearIndex(serviceYear, endDate);
        const endIndex = endIndexFromDuration !== null ? endIndexFromDuration : (endIndexFromDate !== null ? endIndexFromDate : startIndex);
        return formatPhaseYearCode(startIndex) + "_" + formatPhaseYearCode(endIndex);
      }

      function getPhaseSequence() {
        return ["Base", "Option_1", "Option_2", "Option_3", "Option_4", "Option_5"];
      }

      function isCustomPhaseKey(phaseKey) {
        return phaseKey !== "Total" && getPhaseSequence().indexOf(phaseKey) === -1;
      }

      function getNextCustomPhaseKey(phases) {
        let index = 1;
        while (phases && phases["Custom_" + index]) {
          index += 1;
        }
        return "Custom_" + index;
      }

      function inferContractDurationYears(project) {
        const contractDuration = toNumber(project.contractDuration);
        const correcStart = toNumber(project.correcStartYear);
        const correcEnd = toNumber(project.correcEndYear);
        const planningYear = toNumber(project.planningYear);
        const serviceYear = toNumber(project.serviceYear);

        if (correcStart !== null && correcEnd !== null) return Math.max(0, correcEnd - correcStart);
        if (correcStart !== null && contractDuration !== null) return Math.max(0, contractDuration - correcStart);
        if (correcEnd !== null && planningYear !== null && serviceYear !== null) {
          return Math.max(0, correcEnd - (serviceYear - planningYear));
        }
        return Math.max(0, contractDuration || 0);
      }

      function normalizeWorkspaceKey(value) {
        return String(value || "")
          .trim()
          .toLowerCase()
          .replace(/[\s/\\-]+/g, "_")
          .replace(/[()]+/g, "")
          .replace(/[^\w]+/g, "_")
          .replace(/^_+|_+$/g, "")
          .replace(/_+/g, "_");
      }

      function getWorkspaceWorkbookUpdatedAtMs(workbook) {
        const timestamp = Date.parse(String(workbook && workbook.updatedAt || ""));
        return Number.isFinite(timestamp) ? timestamp : 0;
      }

      function getMergedFallbackGeneralParamsByProject(workbooks) {
        const byProject = new Map();
        (workbooks || []).filter(Boolean).forEach(function (workbook) {
          const group = buildFallbackWorkspaceProjectGroup(workbook);
          const projectKey = group.projectKey;
          if (!projectKey) return;
          const gp = group.gp || {};
          const updatedAtMs = getWorkspaceWorkbookUpdatedAtMs(workbook);
          const existing = byProject.get(projectKey) || {
            group: group,
            mergedGp: {},
            fieldUpdatedAt: {},
            latestWorkbook: null
          };

          if (!existing.latestWorkbook || updatedAtMs >= getWorkspaceWorkbookUpdatedAtMs(existing.latestWorkbook)) {
            existing.latestWorkbook = workbook;
            existing.group = group;
          }

          Object.keys(gp).forEach(function (key) {
            const currentUpdatedAt = Number(existing.fieldUpdatedAt[key] || 0);
            if (updatedAtMs >= currentUpdatedAt) {
              existing.mergedGp[key] = gp[key];
              existing.fieldUpdatedAt[key] = updatedAtMs;
            }
          });

          byProject.set(projectKey, existing);
        });
        return byProject;
      }

      function buildFallbackWorkspaceProjectGroup(workbook) {
        const gp = workbook.generalParams || (workbook.sheets && (workbook.sheets.generalParameters || workbook.sheets.general_parameters)) || {};
        const rawProjectName = String(gp.project_name || gp.project || "").trim();
        const projectName = rawProjectName || String(workbook.fileName || workbook.projectKey || workbook.sourceId || "Unnamed project").trim();
        const compositeProjectKey = normalizeWorkspaceKey([
          rawProjectName || projectName,
          gp.project_type || "",
          gp.bid_year || "",
          gp.service_year || "",
        ].filter(Boolean).join("|"));
        const groupProjectKey =
          normalizeWorkspaceKey(rawProjectName) ||
          compositeProjectKey ||
          normalizeWorkspaceKey(workbook.projectKey || workbook.fileName || workbook.sourceId || "");
        const persistedKeys = Array.from(new Set(
          [
            groupProjectKey,
            workbook.projectKey,
            compositeProjectKey,
            rawProjectName,
            projectName,
            workbook.fileName,
            workbook.sourceId,
          ]
            .filter(function (value) { return value !== undefined && value !== null && String(value).trim() !== ""; })
            .map(function (value) { return String(value).trim(); })
        ));
        return {
          gp: gp,
          projectKey: groupProjectKey,
          projectName: projectName,
          persistedKeys: persistedKeys,
        };
      }

      function readPersistedFallbackProjectState(persisted, keys) {
        const candidates = Array.isArray(keys) ? keys : [keys];
        for (let index = 0; index < candidates.length; index += 1) {
          const key = candidates[index];
          if (key && persisted && typeof persisted[key] === "object" && persisted[key] !== null) {
            return persisted[key];
          }
        }
        return {};
      }

      function readMergedPersistedFallbackProjectState(persisted, keys) {
        const candidates = Array.isArray(keys) ? keys : [keys];
        return candidates.reduce(function (merged, key) {
          if (key && persisted && typeof persisted[key] === "object" && persisted[key] !== null) {
            return Object.assign(merged, persisted[key]);
          }
          return merged;
        }, {});
      }

      function buildFallbackProjectPhaseProjects() {
        const persisted = readProjectPhaseFallbackState();
        const workbooks = getSharedWorkbooksForWorkspace();
        if (!workbooks.length) {
          return [];
        }

        const byProject = new Map();
        getMergedFallbackGeneralParamsByProject(workbooks).forEach(function (entry, projectKey) {
            const group = entry.group;
            const gp = entry.mergedGp || {};
            const workbook = entry.latestWorkbook || {};

            const projectName = group.projectName;
            const current = readPersistedFallbackProjectState(persisted, group.persistedKeys);
            const normalizedContext = normalizeProjectContext(gp.project_context || "");
            const defaultWarrantyMonths = normalizedContext === "green_field" ? 24 : 0;
            const defaultStartDate = gp.service_year ? String(gp.service_year).padStart(4, "0") + "-01-01" : "";
            const defaultTotalDuration = inferContractDurationYears({
              contractDuration: gp.contract_duration_years,
              correcStartYear: gp.correc_ovh_start_year,
              correcEndYear: gp.correc_ovh_end_year,
              planningYear: gp.planning_year,
              serviceYear: gp.service_year,
            });
            const startOfProjectDate = current.startOfProjectDate || defaultStartDate;
            const totalConfig = (current.phases && current.phases.Total) || {};
            const totalDurationYears = toNumber(totalConfig.durationYears) !== null ? toNumber(totalConfig.durationYears) : defaultTotalDuration;
            const totalStartDate = totalConfig.startDate || startOfProjectDate;
            const totalEndDate = totalConfig.endDate || addYearsInclusive(totalStartDate, totalDurationYears);
            const warrantyDurationMonths = toNumber(current.warrantyDurationMonths) !== null ? toNumber(current.warrantyDurationMonths) : defaultWarrantyMonths;
            const totalPhaseCode = totalConfig.phaseCode || buildDefaultPhaseCode(gp.service_year, totalStartDate, totalEndDate, totalDurationYears);

            const phases = [
              {
                key: "Total",
                label: "Total",
                phaseCode: totalPhaseCode,
                durationYears: totalDurationYears,
                startDate: totalStartDate,
                endDate: totalEndDate,
                postWarrantyStartDate: addMonths(totalStartDate, warrantyDurationMonths),
                postWarrantyEndDate: totalEndDate,
                removable: false,
                manual: false,
                order: 0,
              }
            ];

            let previousEndDate = startOfProjectDate;
            getPhaseSequence().forEach(function (phaseKey, index) {
              const phaseConfig = current.phases && current.phases[phaseKey];
              if (!phaseConfig || !phaseConfig.enabled) return;
              const durationYears = toNumber(phaseConfig.durationYears) || 0;
              const phaseStartDate = phaseKey === "Base" ? startOfProjectDate : addDays(previousEndDate, 1);
              const phaseEndDate = addYearsInclusive(phaseStartDate, durationYears);
              const postWarrantyApplicable = phaseKey === "Base";
              const phaseCode = phaseConfig.phaseCode || buildDefaultPhaseCode(gp.service_year, phaseStartDate, phaseEndDate, durationYears);
              phases.push({
                key: phaseKey,
                label: phaseKey,
                phaseCode: phaseCode,
                durationYears: durationYears,
                startDate: phaseStartDate,
                endDate: phaseEndDate,
                postWarrantyStartDate: postWarrantyApplicable ? addMonths(phaseStartDate, warrantyDurationMonths) : "",
                postWarrantyEndDate: postWarrantyApplicable ? phaseEndDate : "",
                removable: true,
                manual: false,
                order: index + 1,
              });
              previousEndDate = phaseEndDate;
            });

            Object.keys(current.phases || {})
              .filter(function (phaseKey) {
                return isCustomPhaseKey(phaseKey) && current.phases[phaseKey] && current.phases[phaseKey].enabled;
              })
              .sort(function (left, right) { return left.localeCompare(right); })
              .forEach(function (phaseKey, index) {
                const phaseConfig = current.phases[phaseKey] || {};
                phases.push({
                  key: phaseKey,
                  label: phaseConfig.label || phaseKey.replace(/_/g, " "),
                  phaseCode: phaseConfig.phaseCode || buildDefaultPhaseCode(gp.service_year, phaseConfig.startDate || "", phaseConfig.endDate || "", phaseConfig.durationYears),
                  durationYears: toNumber(phaseConfig.durationYears) || 0,
                  startDate: phaseConfig.startDate || "",
                  endDate: phaseConfig.endDate || "",
                  postWarrantyStartDate: phaseConfig.postWarrantyStartDate || "",
                  postWarrantyEndDate: phaseConfig.postWarrantyEndDate || "",
                  removable: true,
                  manual: true,
                  order: 100 + index,
                });
              });

            const orderedPhases = [phases[0]].concat(
              phases.slice(1).sort(function (left, right) {
                const leftTime = left.startDate ? new Date(left.startDate).getTime() : Number.POSITIVE_INFINITY;
                const rightTime = right.startDate ? new Date(right.startDate).getTime() : Number.POSITIVE_INFINITY;
                const safeLeftTime = Number.isFinite(leftTime) ? leftTime : Number.POSITIVE_INFINITY;
                const safeRightTime = Number.isFinite(rightTime) ? rightTime : Number.POSITIVE_INFINITY;
                if (safeLeftTime !== safeRightTime) return safeLeftTime - safeRightTime;
                return (left.order || 0) - (right.order || 0);
              })
            );

            const existing = byProject.get(projectKey) || {
              persistedKeysSet: new Set(),
            };
            group.persistedKeys.forEach(function (key) {
              existing.persistedKeysSet.add(key);
            });

            byProject.set(projectKey, Object.assign({}, existing, {
              projectKey: projectKey,
              projectName: projectName,
              projectType: gp.project_type || "",
              projectContext: gp.project_context || "",
              serviceYear: gp.service_year || "",
              planningYear: gp.planning_year || "",
              correcStartYear: gp.correc_ovh_start_year,
              correcEndYear: gp.correc_ovh_end_year,
              contractDuration: gp.contract_duration_years,
              projectCode: current.projectCode || existing.projectCode || String(projectName).replace(/[^A-Za-z0-9]/g, "").slice(0, 3).toUpperCase() || "PRJ",
              startOfProjectDate: current.startOfProjectDate || existing.startOfProjectDate || startOfProjectDate,
              maxMobilisationMonths: toNumber(current.maxMobilisationMonths) !== null ? toNumber(current.maxMobilisationMonths) : (existing.maxMobilisationMonths || 18),
              mobilisationPhaseCode: current.mobilisationPhaseCode || existing.mobilisationPhaseCode || "MOB",
              warrantyDurationMonths: warrantyDurationMonths,
              warrantyCode: current.warrantyCode || existing.warrantyCode || "DLP",
              postWarrantyCode: current.postWarrantyCode || existing.postWarrantyCode || "PDLP",
              recurrentCode: current.recurrentCode || existing.recurrentCode || "REC",
              demobilisationCode: current.demobilisationCode || existing.demobilisationCode || "DEM",
              overhaulCode: current.overhaulCode || existing.overhaulCode || "OVH",
              renewalCode: current.renewalCode || existing.renewalCode || "REN",
              warrantyStartDate: current.startOfProjectDate || existing.warrantyStartDate || startOfProjectDate,
              warrantyEndDate: addMonths(
                current.startOfProjectDate || existing.startOfProjectDate || startOfProjectDate,
                toNumber(current.warrantyDurationMonths) !== null
                  ? toNumber(current.warrantyDurationMonths)
                  : defaultWarrantyMonths
              ),
              phases: orderedPhases,
              nextCustomPhaseKey: getNextCustomPhaseKey(current.phases || {}),
              nextPhaseKey: getPhaseSequence().find(function (phaseKey) {
                return !(current.phases && current.phases[phaseKey] && current.phases[phaseKey].enabled);
              }) || ""
            }));
          });

        return Array.from(byProject.values()).map(function (project) {
          project.persistedKeys = Array.from(project.persistedKeysSet || [project.projectKey]);
          delete project.persistedKeysSet;
          return project;
        }).sort(function (left, right) {
          return String(left.projectName).localeCompare(String(right.projectName));
        });
      }

      function isCostCenterShiftPosition(position) {
        return /team leader|supervisor|technician|worker/i.test(position || "");
      }

      function isCostCenterEngineerPosition(position) {
        return /engineer/i.test(position || "");
      }

      function isCostCenterFixedDayPosition(position) {
        return /manager|external support/i.test(position || "");
      }

      function buildDefaultCostCenterValue(position, timePeriod) {
        const safePosition = String(position || "").trim();
        const safeTimePeriod = String(timePeriod || "Day").trim();
        if (/external support/i.test(safePosition)) {
          return "CFR5232489_POH - SERVICES OPERA";
        }
        if (/manager/i.test(safePosition)) {
          return safePosition;
        }
        if (isCostCenterShiftPosition(safePosition) || isCostCenterEngineerPosition(safePosition)) {
          return safeTimePeriod.toLowerCase() === "average"
            ? safePosition
            : `${safePosition}_${safeTimePeriod}`;
        }
        return safePosition;
      }

      function resolveCostCenterHourlyRate(row, rowOverrides, projectCurrency, rowsByKey, nightPremiumEnabled, nightPremiumPercent) {
        const rowOverride = rowOverrides[row.rowKey] || {};
        if (rowOverride.hourlyRate !== undefined && rowOverride.hourlyRate !== null && rowOverride.hourlyRate !== "") {
          return rowOverride.hourlyRate;
        }
        if (String(row.timePeriod || "").toLowerCase() === "night" && nightPremiumEnabled) {
          const dayRowKey = buildCostCenterRowKey(row.position, "Day");
          const dayRow = rowsByKey[dayRowKey];
          if (dayRow) {
            const dayOverride = rowOverrides[dayRowKey] || {};
            const baseDayRate = dayOverride.hourlyRate !== undefined && dayOverride.hourlyRate !== null && dayOverride.hourlyRate !== ""
              ? toNumber(dayOverride.hourlyRate)
              : toNumber(dayRow.baseHourlyRate);
            if (baseDayRate !== null) {
              return String(baseDayRate * (1 + ((toNumber(nightPremiumPercent) || 0) / 100)));
            }
          }
        }
        return row.baseHourlyRate || "";
      }

      function isCostCenterEuroDefaultPosition(position) {
        return /expat|external support/i.test(position || "");
      }

      function buildCostCenterRowKey(position, timePeriod) {
        return String(position || "") + "__" + String(timePeriod || "Day");
      }

      function normalizeHourlyRateImportKey(value) {
        return String(value || "")
          .trim()
          .toLowerCase()
          .replace(/[\s_]+/g, "_");
      }

      function parseHourlyRateImportRows(rows) {
        return (rows || []).map(function (row) {
          const normalized = {};
          Object.keys(row || {}).forEach(function (key) {
            normalized[normalizeHourlyRateImportKey(key)] = row[key];
          });
          return {
            costCenter: normalized.cost_center || normalized.costcenter || "",
            timePeriod: normalized.time_period || normalized.timeperiod || "",
            hourlyRate: normalized.hourly_rate || normalized.hourlyrate || "",
            currency: normalized.currency || "",
            position: normalized.position || ""
          };
        }).filter(function (row) {
          return row.costCenter && row.timePeriod && row.hourlyRate !== "";
        });
      }

      function findMatchingHourlyRateImportRow(importRows, row) {
        const targetCostCenter = normalizeHourlyRateImportKey(row.costCenter);
        const targetTimePeriod = normalizeHourlyRateImportKey(row.timePeriod);
        const targetCurrency = normalizeHourlyRateImportKey(row.currency);
        const targetPosition = normalizeHourlyRateImportKey(row.position);
        return importRows.find(function (entry) {
          if (normalizeHourlyRateImportKey(entry.costCenter) !== targetCostCenter) return false;
          if (normalizeHourlyRateImportKey(entry.timePeriod) !== targetTimePeriod) return false;
          if (entry.currency && normalizeHourlyRateImportKey(entry.currency) !== targetCurrency) return false;
          if (entry.position && normalizeHourlyRateImportKey(entry.position) !== targetPosition) return false;
          return true;
        }) || null;
      }

      function buildFallbackCostCenterProjects() {
        const persisted = readCombinedCostCentersState();
        const pioProjects = buildFallbackPioDefinitionProjects();
        const pioByLookup = buildProjectLookupMap(pioProjects);
        const workbooks = getSharedWorkbooksForWorkspace();
        if (!workbooks.length) {
          return [];
        }

        const byProject = new Map();
        workbooks
          .filter(Boolean)
          .forEach(function (workbook) {
            const group = buildFallbackWorkspaceProjectGroup(workbook);
            const gp = group.gp;
            const projectKey = group.projectKey;
            if (!projectKey) return;

            const projectName = group.projectName;
            const current = readPersistedFallbackProjectState(persisted, group.persistedKeys);
            const customCurrencies = Array.isArray(current.customCurrencies)
              ? current.customCurrencies.filter(Boolean).map(function (entry) { return String(entry).toUpperCase(); })
              : [];
            const customPositions = Array.isArray(current.customPositions)
              ? current.customPositions.filter(Boolean)
              : [];
            const currencyOptions = Array.from(new Set(costCenterCurrencyCatalog.concat(customCurrencies)));
            const positionOptions = Array.from(new Set(costCenterPositionCatalog.concat(customPositions)));
            const annualWorkingHours = toNumber(current.annualWorkingHours) !== null
              ? toNumber(current.annualWorkingHours)
              : (toNumber(gp.max_hours_per_year_per_person) !== null ? toNumber(gp.max_hours_per_year_per_person) : 0);
            const selectedPositions = Array.isArray(current.selectedPositions) ? current.selectedPositions.slice() : [];
            const generalTimePeriods = Array.isArray(current.generalTimePeriods) && current.generalTimePeriods.length
              ? current.generalTimePeriods.slice()
              : ["Day"];
            const engineerTimePeriods = Array.isArray(current.engineerTimePeriods) && current.engineerTimePeriods.length
              ? current.engineerTimePeriods.slice()
              : ["Day"];
            const rowOverrides = current.rowOverrides || {};
            const projectCurrency = current.projectCurrency || "EUR";
            const nightPremiumEnabled = !!current.nightPremiumEnabled;
            const nightPremiumPercent = toNumber(current.nightPremiumPercent) !== null ? toNumber(current.nightPremiumPercent) : 0;
            const lookupKeys = getProjectLookupKeys({
              projectKey: projectKey,
              projectName: projectName,
              persistedKeys: group.persistedKeys,
            });
            const pioProject = findProjectByLookupKeys(pioByLookup, lookupKeys) || null;
            const pioRows = Array.isArray(pioProject && pioProject.rows) ? pioProject.rows : [];
            const projectPioRow = pioRows.find(function (row) { return row.origin === projectName; }) || pioRows[0] || null;
            const projectCaratUnit = projectPioRow && projectPioRow.caratUnit ? projectPioRow.caratUnit : "";
            const pioCaratUnitOptions = Array.from(new Set(
              pioRows.map(function (row) { return String(row.caratUnit || "").trim(); }).filter(Boolean)
            ));

            const rows = [];
            selectedPositions.forEach(function (position) {
              const periods = isCostCenterFixedDayPosition(position)
                ? ["Day"]
                : (isCostCenterShiftPosition(position)
                  ? generalTimePeriods
                  : (isCostCenterEngineerPosition(position) ? engineerTimePeriods : ["Day"]));
              periods.forEach(function (timePeriod) {
                const rowKey = buildCostCenterRowKey(position, timePeriod);
                const rowOverride = rowOverrides[rowKey] || {};
                const isExternalSupport = /external support/i.test(position || "");
                const selectedCaratUnit = isExternalSupport
                  ? (rowOverride.caratUnit || "")
                  : projectCaratUnit;
                const matchedPioRow = pioRows.find(function (pioRow) {
                  return String(pioRow.caratUnit || "").trim() === String(selectedCaratUnit || "").trim();
                }) || null;
                const externalYearlyHours = matchedPioRow ? toNumber(matchedPioRow.yearlyHours) : null;
                const monthlyWorkingHours = isExternalSupport
                  ? (externalYearlyHours !== null ? (externalYearlyHours / 12) : "")
                  : (annualWorkingHours ? (annualWorkingHours / 12) : 0);
                rows.push({
                  rowKey: rowKey,
                  position: position,
                  caratUnit: selectedCaratUnit,
                  pioUnitRole: matchedPioRow ? (matchedPioRow.unitRole || "") : "",
                  pioYearlyHours: matchedPioRow ? matchedPioRow.yearlyHours : "",
                  pioCaratUnitOptions: pioCaratUnitOptions,
                  timePeriod: timePeriod,
                  monthlyWorkingHours: monthlyWorkingHours,
                  currency: rowOverride.currency || (isCostCenterEuroDefaultPosition(position) ? "EUR" : projectCurrency),
                  baseHourlyRate: rowOverride.hourlyRate || "",
                  costCenter: rowOverride.costCenter || buildDefaultCostCenterValue(position, timePeriod)
                });
              });
            });

            const rowsByKey = {};
            rows.forEach(function (row) {
              rowsByKey[row.rowKey] = row;
            });
            rows.forEach(function (row) {
              row.hourlyRate = resolveCostCenterHourlyRate(
                row,
                rowOverrides,
                projectCurrency,
                rowsByKey,
                nightPremiumEnabled,
                nightPremiumPercent
              );
            });

            const existing = byProject.get(projectKey) || {
              persistedKeysSet: new Set(),
            };
            group.persistedKeys.forEach(function (key) {
              existing.persistedKeysSet.add(key);
            });

            byProject.set(projectKey, Object.assign({}, existing, {
              projectKey: projectKey,
              projectName: existing.projectName || projectName,
              projectType: existing.projectType || gp.project_type || "",
              projectContext: existing.projectContext || gp.project_context || "",
              annualWorkingHoursSource: toNumber(current.annualWorkingHours) !== null
                ? "Manual override"
                : (toNumber(gp.max_hours_per_year_per_person) !== null ? "General Parameters / max_hours_per_year_per_person" : "--"),
              annualWorkingHours: annualWorkingHours,
              projectCaratUnit: projectCaratUnit,
              projectCurrency: projectCurrency,
              currencyOptions: currencyOptions,
              positionOptions: positionOptions,
              customPositions: customPositions,
              selectedPositions: selectedPositions,
              generalTimePeriods: generalTimePeriods,
              engineerTimePeriods: engineerTimePeriods,
              nightPremiumEnabled: nightPremiumEnabled,
              nightPremiumPercent: nightPremiumPercent,
              rows: rows
            }));
          });

        return Array.from(byProject.values()).map(function (project) {
          project.persistedKeys = Array.from(project.persistedKeysSet || [project.projectKey]);
          delete project.persistedKeysSet;
          return project;
        }).sort(function (left, right) {
          return String(left.projectName).localeCompare(String(right.projectName));
        });
      }

      function saveFallbackCostCenterProjectField(projectKey, field, value) {
        const current = readCostCentersFallbackState();
        const nextProject = Object.assign({}, current[projectKey] || {});
        nextProject[field] = value;
        current[projectKey] = nextProject;
        writeCostCentersFallbackState(current);
      }


      function saveFallbackCostCenterRowField(projectKey, rowKey, field, value) {
        const current = readCostCentersFallbackState();
        const nextProject = Object.assign({}, current[projectKey] || {});
        const rowOverrides = Object.assign({}, nextProject.rowOverrides || {});
        const row = Object.assign({}, rowOverrides[rowKey] || {});
        row[field] = value;
        rowOverrides[rowKey] = row;
        nextProject.rowOverrides = rowOverrides;
        current[projectKey] = nextProject;
        writeCostCentersFallbackState(current);
      }

      function addFallbackCostCenterCurrency(projectKey) {
        const customCurrency = window.prompt("Add project currency", "");
        if (!customCurrency) return;
        const nextCurrency = String(customCurrency).trim().toUpperCase();
        if (!nextCurrency) return;
        const current = readCostCentersFallbackState();
        const nextProject = Object.assign({}, current[projectKey] || {});
        const customCurrencies = Array.isArray(nextProject.customCurrencies) ? nextProject.customCurrencies.slice() : [];
        if (customCurrencies.indexOf(nextCurrency) === -1) {
          customCurrencies.push(nextCurrency);
        }
        nextProject.customCurrencies = customCurrencies;
        nextProject.projectCurrency = nextCurrency;
        current[projectKey] = nextProject;
        writeCostCentersFallbackState(current);
      }

      function addFallbackCostCenterPosition(projectKey) {
        const customPosition = window.prompt("Add position", "");
        if (!customPosition) return;
        const nextPosition = String(customPosition).trim() === "Subsystem Engineer" ? "Engineer" : String(customPosition).trim();
        if (!nextPosition) return;
        const current = readCostCentersFallbackState();
        const nextProject = Object.assign({}, current[projectKey] || {});
        const customPositions = Array.isArray(nextProject.customPositions) ? nextProject.customPositions.slice() : [];
        const selectedPositions = Array.isArray(nextProject.selectedPositions) ? nextProject.selectedPositions.slice() : [];
        if (customPositions.indexOf(nextPosition) === -1) {
          customPositions.push(nextPosition);
        }
        if (selectedPositions.indexOf(nextPosition) === -1) {
          selectedPositions.push(nextPosition);
        }
        nextProject.customPositions = customPositions;
        nextProject.selectedPositions = selectedPositions;
        current[projectKey] = nextProject;
        writeCostCentersFallbackState(current);
      }

      function removeFallbackCostCenterPosition(projectKey, position) {
        const current = readCostCentersFallbackState();
        const nextProject = Object.assign({}, current[projectKey] || {});
        nextProject.customPositions = (Array.isArray(nextProject.customPositions) ? nextProject.customPositions : []).filter(function (entry) { return entry !== position; });
        nextProject.selectedPositions = (Array.isArray(nextProject.selectedPositions) ? nextProject.selectedPositions : []).filter(function (entry) { return entry !== position; });
        const rowOverrides = Object.assign({}, nextProject.rowOverrides || {});
        Object.keys(rowOverrides).forEach(function (rowKey) {
          if (rowKey.indexOf(String(position || "") + "__") === 0) delete rowOverrides[rowKey];
        });
        nextProject.rowOverrides = rowOverrides;
        current[projectKey] = nextProject;
        writeCostCentersFallbackState(current);
      }

      function importFallbackCostCenterHourlyRates(projectKey, file) {
        if (!projectKey || !file) return;
        if (typeof XLSX === "undefined") {
          window.alert("XLSX library is not available on this page.");
          return;
        }

        const reader = new FileReader();
        reader.onload = function (event) {
          try {
            const data = event.target && event.target.result;
            const workbook = XLSX.read(data, { type: "array" });
            const sheetName = (workbook.SheetNames || []).find(function (entry) {
              const normalized = normalizeHourlyRateImportKey(entry);
              return normalized === "hourly_rates" || normalized === "hourly_rate";
            });
            if (!sheetName) {
              window.alert('The workbook does not contain a sheet named "Hourly rates" or "Hourly rate".');
              return;
            }

            const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: "" });
            const importRows = parseHourlyRateImportRows(rows);
            const projects = buildFallbackCostCenterProjects();
            const project = projects.find(function (entry) { return entry.projectKey === projectKey; });
            if (!project) {
              window.alert("No matching project is currently loaded in Cost Centers.");
              return;
            }

            const current = readCostCentersFallbackState();
            const nextProject = Object.assign({}, current[projectKey] || {});
            const rowOverrides = Object.assign({}, nextProject.rowOverrides || {});
            let matchedCount = 0;

            project.rows.forEach(function (row) {
              const match = findMatchingHourlyRateImportRow(importRows, row);
              if (!match) return;
              const rowOverride = Object.assign({}, rowOverrides[row.rowKey] || {});
              rowOverride.hourlyRate = match.hourlyRate;
              rowOverrides[row.rowKey] = rowOverride;
              matchedCount += 1;
            });

            nextProject.rowOverrides = rowOverrides;
            current[projectKey] = nextProject;
            writeCostCentersFallbackState(current);
            renderFallbackCostCentersWorkspace();
            window.alert(matchedCount + " hourly rate row(s) imported.");
          } catch (error) {
            window.alert("Unable to import hourly rates. " + (error && error.message ? error.message : "Unknown error."));
          }
        };
        reader.readAsArrayBuffer(file);
      }

      function buildFallbackPioDefinitionProjects() {
        const persisted = readCombinedPioDefinitionState();
        const costCentersPersisted = readCombinedCostCentersState();
        const workbooks = getSharedWorkbooksForWorkspace();
        if (!workbooks.length) {
          return [];
        }

        const byProject = new Map();
        workbooks
          .filter(Boolean)
          .forEach(function (workbook) {
            const group = buildFallbackWorkspaceProjectGroup(workbook);
            const gp = group.gp;
            const projectKey = group.projectKey;
            if (!projectKey) return;

            const current = readPersistedFallbackProjectState(persisted, group.persistedKeys);
            const costCentersCurrent = readPersistedFallbackProjectState(costCentersPersisted, group.persistedKeys);
            const existing = byProject.get(projectKey) || {
              projectKey: projectKey,
              projectName: group.projectName,
              projectType: gp.project_type || "",
              projectContext: gp.project_context || "",
              annualWorkingHours: 0,
              subsystemSet: new Set(),
              persistedKeysSet: new Set(),
            };
            group.persistedKeys.forEach(function (key) {
              existing.persistedKeysSet.add(key);
            });

            if (!existing.projectName && group.projectName) {
              existing.projectName = group.projectName;
            }
            if (!existing.projectType && gp.project_type) {
              existing.projectType = gp.project_type;
            }
            if (!existing.projectContext && gp.project_context) {
              existing.projectContext = gp.project_context;
            }
            if (!existing.annualWorkingHours) {
              const ccHours = toNumber(costCentersCurrent.annualWorkingHours);
              existing.annualWorkingHours = ccHours !== null
                ? ccHours
                : (toNumber(gp.max_hours_per_year_per_person) !== null ? toNumber(gp.max_hours_per_year_per_person) : 0);
            }

            extractSynthesisSubsystems(workbook).forEach(function (subsystem) {
              existing.subsystemSet.add(subsystem);
            });

            byProject.set(projectKey, existing);
          });

        return Array.from(byProject.values()).map(function (project) {
          const current = readPersistedFallbackProjectState(persisted, Array.from(project.persistedKeysSet || [project.projectKey]));
          const customOrigins = Array.isArray(current.customOrigins) ? current.customOrigins.filter(Boolean) : [];
          const originOptions = Array.from(new Set([project.projectName].concat(pioDefinitionOriginCatalog).concat(customOrigins)));
          const selectedOrigins = Array.isArray(current.selectedOrigins) && current.selectedOrigins.length
            ? current.selectedOrigins.slice()
            : [project.projectName];
          const rowOverrides = current.rowOverrides || {};
          const customDutiesBySubsystem = Object.assign({}, current.customDutiesBySubsystem || {});
          const subsystems = Array.from(project.subsystemSet || []).sort(function (left, right) {
            return String(left).localeCompare(String(right));
          });
          const rows = selectedOrigins.map(function (origin, index) {
            const rowOverride = rowOverrides[origin] || {};
            const isProjectOrigin = origin === project.projectName;
            return {
              origin: origin,
              caratUnit: rowOverride.caratUnit || (isProjectOrigin ? "LOCAL" : (origin === "France_Saint ouen" ? "RSC-5232" : "")),
              unitRole: rowOverride.unitRole || (isProjectOrigin ? "LU" : "PU"),
              source: rowOverride.source || (isProjectOrigin ? "Onshore" : "Offshore"),
              yearlyHours: rowOverride.yearlyHours !== undefined && rowOverride.yearlyHours !== null && rowOverride.yearlyHours !== ""
                ? rowOverride.yearlyHours
                : (isProjectOrigin ? project.annualWorkingHours : (index === 1 ? "1510.92" : "")),
            };
          });

          return {
            projectKey: project.projectKey,
            projectName: project.projectName,
            projectType: project.projectType,
            projectContext: project.projectContext,
            annualWorkingHours: project.annualWorkingHours,
            onshoreFreightPercent: toNumber(current.onshoreFreightPercent) !== null ? toNumber(current.onshoreFreightPercent) : 0,
            offshoreFreightPercent: toNumber(current.offshoreFreightPercent) !== null ? toNumber(current.offshoreFreightPercent) : 0,
            originOptions: originOptions,
            selectedOrigins: selectedOrigins,
            subsystems: subsystems,
            customDutiesBySubsystem: customDutiesBySubsystem,
            rows: rows
          };
        }).sort(function (left, right) {
          return String(left.projectName).localeCompare(String(right.projectName));
        });
      }

      function buildFallbackCurrencyExchangeProjects() {
        const persisted = readCurrencyExchangeFallbackState();
        const costCentersState = readCostCentersFallbackState();
        const sharedSettings = safeReadJson(sharedSettingsKey, {}) || {};
        const workbooks = getSharedWorkbooksForWorkspace();
        if (!workbooks.length) {
          return [];
        }

        const byProject = new Map();
        workbooks.filter(Boolean).forEach(function (workbook) {
          const group = buildFallbackWorkspaceProjectGroup(workbook);
          const gp = group.gp;
          const projectKey = group.projectKey;
          if (!projectKey) return;

          const existing = byProject.get(projectKey) || {
            projectKey: projectKey,
            projectName: group.projectName,
            projectType: gp.project_type || "",
            projectContext: gp.project_context || "",
            currencySet: new Set(),
            persistedKeysSet: new Set(),
          };
          group.persistedKeys.forEach(function (key) {
            existing.persistedKeysSet.add(key);
          });
          extractSynthesisCurrencies(workbook).forEach(function (currency) {
            existing.currencySet.add(currency);
          });
          byProject.set(projectKey, existing);
        });

        const baseCurrency = String(sharedSettings.exchangeBase || "USD").toUpperCase();
        const liveRates = sharedSettings.liveRates || {};

        function readBaseRate(currency) {
          const code = String(currency || "").toUpperCase();
          if (!code) return null;
          if (code === baseCurrency) return 1;
          const value = Number(liveRates[code]);
          return Number.isFinite(value) && value > 0 ? value : null;
        }

        function computePairRate(sourceCurrency, targetCurrency) {
          const source = String(sourceCurrency || "").toUpperCase();
          const target = String(targetCurrency || "").toUpperCase();
          if (!source || !target) return null;
          if (source === target) return 1;
          const sourceBaseRate = readBaseRate(source);
          const targetBaseRate = readBaseRate(target);
          if (sourceBaseRate === null || targetBaseRate === null) return null;
          return targetBaseRate / sourceBaseRate;
        }

        return Array.from(byProject.values()).map(function (project) {
          const current = readPersistedFallbackProjectState(persisted, Array.from(project.persistedKeysSet || [project.projectKey]));
          const costCenterProject = readPersistedFallbackProjectState(costCentersState, Array.from(project.persistedKeysSet || [project.projectKey]));
          const targetCurrency = String(current.targetCurrency || "EUR").toUpperCase();
          const manualOverrides = Object.assign({}, current.manualOverrides || {});
          const customCurrencies = Array.isArray(current.customCurrencies)
            ? current.customCurrencies.filter(Boolean).map(function (entry) { return String(entry).trim().toUpperCase(); })
            : [];
          const projectCurrency = String(costCenterProject.projectCurrency || "").trim().toUpperCase();
          if (projectCurrency) {
            project.currencySet.add(projectCurrency);
          }
          project.currencySet.add("EUR");
          const rows = Array.from(project.currencySet || []).sort(function (left, right) {
            return String(left).localeCompare(String(right));
          }).map(function (currency) {
            const liveRate = computePairRate(currency, targetCurrency);
            const manualOverride = Number(manualOverrides[currency]);
            const hasManualOverride = Number.isFinite(manualOverride) && manualOverride > 0;
            const effectiveRate = hasManualOverride ? manualOverride : liveRate;
            var source = "Missing";
            if (String(currency) === targetCurrency) source = "Identity";
            else if (hasManualOverride) source = "Manual override";
            else if (liveRate !== null) source = "Live";
            return {
              currency: currency,
              liveRate: liveRate,
              manualOverride: hasManualOverride ? manualOverride : "",
              effectiveRate: effectiveRate,
              source: source
            };
          });

          return {
            projectKey: project.projectKey,
            projectName: project.projectName,
            projectType: project.projectType,
            projectContext: project.projectContext,
            projectCurrency: projectCurrency,
            targetCurrency: targetCurrency,
            targetCurrencyOptions: Array.from(new Set(costCenterCurrencyCatalog.concat(customCurrencies).concat(Array.from(project.currencySet || [])).concat([targetCurrency]))).sort(function (left, right) {
              return String(left).localeCompare(String(right));
            }),
            baseCurrency: baseCurrency,
            provider: sharedSettings.provider || "",
            lastUpdated: sharedSettings.lastUpdated || "",
            rows: rows
          };
        }).sort(function (left, right) {
          return String(left.projectName).localeCompare(String(right.projectName));
        });
      }

      function buildFallbackFirmingRulesProjects() {
        const persisted = readFirmingRulesFallbackState();
        const costCentersState = readCostCentersFallbackState();
        const primaryCostCentersState = window.__costSummaryCostCentersStore && typeof window.__costSummaryCostCentersStore === "object"
          ? window.__costSummaryCostCentersStore
          : {};
        const workbooks = getSharedWorkbooksForWorkspace();
        if (!workbooks.length) return [];

        const byProject = new Map();
        workbooks.filter(Boolean).forEach(function (workbook) {
          const group = buildFallbackWorkspaceProjectGroup(workbook);
          const gp = group.gp;
          const projectKey = group.projectKey;
          if (!projectKey) return;

          const existing = byProject.get(projectKey) || {
            projectKey: projectKey,
            projectName: group.projectName,
            projectType: gp.project_type || "",
            projectContext: gp.project_context || "",
            bidYear: String(gp.bid_year || "").trim(),
            currencySet: new Set(),
            persistedKeysSet: new Set(),
          };
          if (!existing.bidYear && gp.bid_year) {
            existing.bidYear = String(gp.bid_year).trim();
          }
          group.persistedKeys.forEach(function (key) { existing.persistedKeysSet.add(key); });
          extractSynthesisCurrencies(workbook).forEach(function (currency) { existing.currencySet.add(currency); });
          byProject.set(projectKey, existing);
        });

        return Array.from(byProject.values()).map(function (project) {
          const persistedKeys = Array.from(project.persistedKeysSet || [project.projectKey]);
          const current = readPersistedFallbackProjectState(persisted, persistedKeys);
          const fallbackCostCenterProject = readPersistedFallbackProjectState(costCentersState, persistedKeys);
          const primaryCostCenterProject = readPersistedFallbackProjectState(primaryCostCentersState, persistedKeys);
          const costCenterProject = Object.assign({}, fallbackCostCenterProject, primaryCostCenterProject);
          const projectCurrency = String(costCenterProject.projectCurrency || "").trim().toUpperCase();
          if (projectCurrency) project.currencySet.add(projectCurrency);

          const firmingTexts = Object.assign({}, current.firmingTexts || {});
          const importedOptions = Object.assign({}, current.importedOptions || {});
          const currencies = Array.from(project.currencySet).sort(function (left, right) {
            return String(left).localeCompare(String(right));
          });

          return {
            projectKey: project.projectKey,
            projectName: project.projectName,
            projectType: project.projectType,
            projectContext: project.projectContext,
            bidYear: project.bidYear,
            projectCurrency: projectCurrency,
            currencies: currencies,
            firmingTexts: firmingTexts,
            importedOptions: importedOptions,
          };
        }).sort(function (left, right) {
          return String(left.projectName).localeCompare(String(right.projectName));
        });
      }

      function saveFallbackFirmingRuleText(projectKey, currency, value) {
        const current = readFirmingRulesFallbackState();
        const nextProject = Object.assign({}, current[projectKey] || {});
        const firmingTexts = Object.assign({}, nextProject.firmingTexts || {});
        firmingTexts[String(currency).toUpperCase()] = value;
        nextProject.firmingTexts = firmingTexts;
        current[projectKey] = nextProject;
        writeFirmingRulesFallbackState(current);
      }

      function importFallbackFirmingRulesFromExcel(projectKey, bidYear, currencies, file) {
        if (!file || !projectKey) return;
        const validCurrencySet = new Set(currencies.map(function (c) { return String(c).trim().toUpperCase(); }));
        const targetYear = String(bidYear).trim();

        const reader = new FileReader();
        reader.onload = function (e) {
          try {
            const data = new Uint8Array(e.target.result);
            const wb = XLSX.read(data, { type: "array", cellDates: true });
            const sheetName = wb.SheetNames[0];
            if (!sheetName) return;
            const sheet = wb.Sheets[sheetName];
            const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

            const sampleRow = rows[0] || {};
            const allKeys = Object.keys(sampleRow);
            function findCol(label) {
              return allKeys.find(function (k) { return String(k).trim().toLowerCase() === label.toLowerCase(); }) || label;
            }
            const colCurrency = findCol("Law currency");
            const colName = findCol("Law name");
            const colPeriod = findCol("Period");

            function extractYear(raw) {
              if (raw instanceof Date) return String(raw.getFullYear());
              const s = String(raw || "").trim();
              const m = s.match(/\d{4}/);
              return m ? m[0] : null;
            }

            let filtered = rows.filter(function (row) {
              return targetYear && extractYear(row[colPeriod]) === targetYear;
            });

            if (!filtered.length) {
              const years = rows
                .map(function (row) { return extractYear(row[colPeriod]); })
                .filter(Boolean)
                .sort();
              const firstYear = years[0] || null;
              if (firstYear) {
                filtered = rows.filter(function (row) {
                  return extractYear(row[colPeriod]) === firstYear;
                });
              }
            }

            const optionsByCurrency = {};
            filtered.forEach(function (row) {
              const currency = String(row[colCurrency] || "").trim().toUpperCase();
              const name = String(row[colName] || "").trim();
              if (!currency || !validCurrencySet.has(currency) || !name) return;
              if (!optionsByCurrency[currency]) optionsByCurrency[currency] = [];
              if (optionsByCurrency[currency].indexOf(name) === -1) {
                optionsByCurrency[currency].push(name);
              }
            });

            const current = readFirmingRulesFallbackState();
            const nextProject = Object.assign({}, current[projectKey] || {});
            const firmingTexts = Object.assign({}, nextProject.firmingTexts || {});
            Object.keys(optionsByCurrency).forEach(function (currency) {
              firmingTexts[currency] = "";
            });
            nextProject.firmingTexts = firmingTexts;
            nextProject.importedOptions = Object.assign({}, nextProject.importedOptions || {}, optionsByCurrency);
            current[projectKey] = nextProject;
            writeFirmingRulesFallbackState(current);
            renderFallbackFirmingRulesWorkspace();
          } catch (err) {
            console.error("Firming Rules Excel import error:", err);
          }
        };
        reader.readAsArrayBuffer(file);
      }

      function addWorkloadExtraRow(projectKey) {
        if (!projectKey) return;
        const allOverrides = readWorkloadOverridesFallbackState();
        const proj = Object.assign({}, allOverrides[projectKey] || {});
        const extraRows = Array.isArray(proj.extraRows) ? proj.extraRows.slice() : [];
        extraRows.push({
          id: Date.now() + "_" + Math.floor(Math.random() * 9999),
          subsystem: "",
          shift: "Day",
          preventiveTechs: 0,
          correctiveTechs: 0,
          preventiveSupervisors: 0,
          correctiveSupervisors: 0,
        });
        proj.extraRows = extraRows;
        allOverrides[projectKey] = proj;
        writeWorkloadOverridesFallbackState(allOverrides);
      }

      function deleteWorkloadExtraRow(projectKey, rowId) {
        if (!projectKey || !rowId) return;
        const allOverrides = readWorkloadOverridesFallbackState();
        const proj = Object.assign({}, allOverrides[projectKey] || {});
        proj.extraRows = (Array.isArray(proj.extraRows) ? proj.extraRows : []).filter(function (r) { return r.id !== rowId; });
        allOverrides[projectKey] = proj;
        writeWorkloadOverridesFallbackState(allOverrides);
      }

      function saveWorkloadExtraRowField(projectKey, rowId, col, value) {
        if (!projectKey || !rowId) return;
        const allOverrides = readWorkloadOverridesFallbackState();
        const proj = Object.assign({}, allOverrides[projectKey] || {});
        const extraRows = Array.isArray(proj.extraRows) ? proj.extraRows.slice() : [];
        const idx = extraRows.findIndex(function (r) { return r.id === rowId; });
        if (idx === -1) return;
        const row = Object.assign({}, extraRows[idx]);
        if (col === "subsystem" || col === "shift") {
          row[col] = String(value || "");
        } else {
          const num = parseFloat(value);
          row[col] = isNaN(num) ? 0 : num;
        }
        extraRows[idx] = row;
        proj.extraRows = extraRows;
        allOverrides[projectKey] = proj;
        writeWorkloadOverridesFallbackState(allOverrides);
      }

      function importWorkloadFromExcel(projectKey, file) {
        if (!file || !projectKey) return;
        if (typeof XLSX === "undefined") { window.alert("XLSX library is not available on this page."); return; }

        function nk(s) {
          return String(s || "").trim().toLowerCase()
            .replace(/[\s/\\-]+/g, "_").replace(/[()]+/g, "").replace(/[^\w]+/g, "_")
            .replace(/^_+|_+$/g, "").replace(/_+/g, "_");
        }

        const reader = new FileReader();
        reader.onload = function (evt) {
          try {
            const data = new Uint8Array(evt.target.result);
            const wb = XLSX.read(data, { type: "array" });

            // Find a sheet whose normalized name contains "workload"
            const sheetName = wb.SheetNames.find(function (n) {
              return nk(n) === "workload" || nk(n).indexOf("workload") !== -1;
            });
            if (!sheetName) {
              window.alert("No 'Workload' sheet found in this Excel file. Available sheets: " + wb.SheetNames.join(", "));
              return;
            }

            const rawRows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], {
              defval: "", raw: false, blankrows: false,
            });

            function n(v) { const f = parseFloat(String(v || "").replace(/\s/g, "")); return isNaN(f) ? 0 : f; }
            function normalizeShiftValue(v) {
              const s = String(v || "").trim().toLowerCase();
              if (s === "day") return "Day";
              if (s === "night") return "Night";
              return String(v || "").trim();
            }

            const importedRows = rawRows.map(function (rawRow) {
              const row = {};
              Object.entries(rawRow).forEach(function (kv) { row[nk(kv[0])] = kv[1]; });
              // Column aliases for shift
              const shiftRaw = row.shift_type || row.shift || "";
              const subsystem = String(row.subsystem || row.sub_system || row.system || "").trim();
              const shift = normalizeShiftValue(shiftRaw);
              // Percentage columns: if value looks like a percentage (> 1 assumed to be already ×100), store as ratio
              function pctToRatio(v) {
                const num = n(v);
                // Values stored in Excel as 0–100 → divide by 100; if 0–1 keep as-is
                return Math.abs(num) > 1 ? num / 100 : num;
              }
              return {
                subsystem: subsystem,
                shift: shift,
                preventiveHours:      n(row.preventive_hours),
                dayNightPct:          pctToRatio(row.day_night_percentage || row.day_night_pct || row.day_night_percent),
                remainingHours:       n(row.remaining_hours),
                paliativeHours:       n(row.paliative_hours || row.palliative_hours),
                correctiveHours:      n(row.corrective_hours),
                allCorrectiveHours:   n(row.all_corrective_hours || row.all_corrective_hrs),
                correcPrevPct:        pctToRatio(row.corrective_preventive_percentage || row.corrective_preventive_pct || row.corrective_preventive_percent || row.corr_prev_pct),
                gapHours:             n(row.gap_hours),
                preventiveTechs:      n(row.preventive_technicians || row.preventive_techs),
                correctiveTechs:      n(row.corrective_technicians || row.corrective_techs),
                preventiveSupervisors: n(row.preventive_supervisors),
                correctiveSupervisors: n(row.corrective_supervisors),
              };
            }).filter(function (row) { return row.subsystem && row.shift; });

            if (!importedRows.length) {
              window.alert("No valid rows found in the Workload sheet. Make sure each row has a Subsystem and Shift Type.");
              return;
            }

            // Store importedRows, reset per-cell overrides for this project
            const allOverrides = readWorkloadOverridesFallbackState();
            allOverrides[projectKey] = { importedRows: importedRows };
            writeWorkloadOverridesFallbackState(allOverrides);

            renderFallbackWorkloadSynthesisWorkspace();
          } catch (err) {
            console.error("Workload Excel import error:", err);
            window.alert("Failed to parse Excel file: " + (err.message || err));
          }
        };
        reader.readAsArrayBuffer(file);
      }

      function computeWorkloadRows(synthesisRows, hoursRows) {
        function toNum(v) { const n = parseFloat(v); return isNaN(n) ? 0 : n; }
        function r2(v) { return Math.round(v * 100) / 100; }
        function normalizeShift(v) {
          const s = String(v || "").trim().toLowerCase();
          if (s === "day") return "Day";
          if (s === "night") return "Night";
          return "";
        }

        // Step 1 — unique subsystems (ordered by first appearance, filtered)
        const uniqueSubsystems = [];
        const seenSubs = new Set();
        synthesisRows.forEach(function (row) {
          const sub = String(row.subsystem || "").trim();
          if (!sub || seenSubs.has(sub)) return;
          if (row.shift || row.total_preventive_duration || row.day_technicians_optimized || row.night_technicians_optimized) {
            uniqueSubsystems.push(sub);
            seenSubs.add(sub);
          }
        });

        // Step 2 — preventiveHours + availableDays from hoursReport
        const dictPrevHours = {};
        const dictAvailDays = {};
        hoursRows.forEach(function (row) {
          const sub = String(row.subsystem || "").trim();
          const shift = normalizeShift(row.shift_type);
          if (!sub || !shift) return;
          const k = sub + "|" + shift;
          dictPrevHours[k] = (dictPrevHours[k] || 0) + toNum(row.hours_worked);
          dictAvailDays[k] = (dictAvailDays[k] || 0) + toNum(row.available_days);
        });

        // Step 3 — paliativeHours, optimizedTechs, yearlyCorrectiveHours from Synthesis
        const dictPaliHours = {};
        const dictOptTechs = {};
        const dictYearlyCorrective = {};
        synthesisRows.forEach(function (row) {
          const sub = String(row.subsystem || "").trim();
          if (!sub) return;
          const shift = String(row.shift || "").trim().toLowerCase();
          if (shift === "day" || shift === "night") {
            const shiftCap = shift === "day" ? "Day" : "Night";
            const k = sub + "|" + shiftCap;
            if (!Object.prototype.hasOwnProperty.call(dictPaliHours, k)) {
              dictPaliHours[k] = toNum(row.paliative_hours_corrective);
            }
            dictOptTechs[k] = toNum(shift === "day" ? row.day_technicians_optimized : row.night_technicians_optimized);
          }
          if (String(row.type || "").trim().toLowerCase() === "corrective") {
            if (!Object.prototype.hasOwnProperty.call(dictYearlyCorrective, sub)) {
              dictYearlyCorrective[sub] = toNum(row.yearly_total_hours_corrective);
            }
          }
        });

        // Step 4 — build rows
        const rows = [];
        uniqueSubsystems.forEach(function (sub) {
          const prevDay = dictPrevHours[sub + "|Day"] || 0;
          const prevNight = dictPrevHours[sub + "|Night"] || 0;
          const totalPrev = prevDay + prevNight;
          const yearlyCorrective = dictYearlyCorrective[sub] || 0;

          ["Day", "Night"].forEach(function (shift) {
            const k = sub + "|" + shift;
            const preventiveHours = dictPrevHours[k] || 0;
            const availDays = dictAvailDays[k] || 0;
            const paliativeHours = dictPaliHours[k] || 0;
            const optimizedTechs = dictOptTechs[k] || 0;

            const dayNightPct = totalPrev > 0 ? r2(preventiveHours / totalPrev) : 0;
            const correctiveHours = yearlyCorrective * dayNightPct;
            const allCorrectiveHours = paliativeHours + correctiveHours;
            const correcPrevPct = preventiveHours > 0 ? allCorrectiveHours / preventiveHours : 0;
            const remainingHours = availDays * 8;
            const gapHours = r2(remainingHours - allCorrectiveHours);

            let preventiveTechs = 0;
            let correctiveTechs = 0;
            if (preventiveHours + allCorrectiveHours > 0) {
              preventiveTechs = r2((preventiveHours / (preventiveHours + allCorrectiveHours)) * optimizedTechs);
              correctiveTechs = r2(optimizedTechs - preventiveTechs);
            }

            rows.push({
              subsystem: sub,
              shift: shift,
              preventiveHours: r2(preventiveHours),
              dayNightPct: dayNightPct,
              remainingHours: r2(remainingHours),
              paliativeHours: r2(paliativeHours),
              correctiveHours: r2(correctiveHours),
              allCorrectiveHours: r2(allCorrectiveHours),
              correcPrevPct: r2(correcPrevPct),
              gapHours: gapHours,
              preventiveTechs: preventiveTechs,
              correctiveTechs: correctiveTechs,
              preventiveSupervisors: 0,
              correctiveSupervisors: 0,
            });
          });
        });

        // Step 5 — supervisors
        const dictTotalTechs = {};
        rows.forEach(function (row) {
          dictTotalTechs[row.subsystem] = (dictTotalTechs[row.subsystem] || 0) + row.preventiveTechs + row.correctiveTechs;
        });
        rows.forEach(function (row) {
          const totalTechs = dictTotalTechs[row.subsystem] || 0;
          const numSup = totalTechs <= 8 ? 1 : 2;
          if (totalTechs > 0) {
            row.preventiveSupervisors = r2((row.preventiveTechs / totalTechs) * numSup);
            row.correctiveSupervisors = r2((row.correctiveTechs / totalTechs) * numSup);
          }
        });

        return rows;
      }

      function getFallbackFullWorkbooksForWorkspace() {
        // Workload needs actual sheet rows — lite mirror only has GP+summary.
        // Read full workbook first, fall back to lite for GP-only identification.
        const sourceIds = Array.isArray(window.__costSummarySharedWorkbooks) && window.__costSummarySharedWorkbooks.length
          ? null
          : safeReadJson("shared-store-workbook-index-v1", []);

        let workbooks;
        if (Array.isArray(window.__costSummarySharedWorkbooks) && window.__costSummarySharedWorkbooks.length) {
          workbooks = window.__costSummarySharedWorkbooks.slice();
        } else if (Array.isArray(sourceIds) && sourceIds.length) {
          workbooks = sourceIds.map(function (id) {
            return safeReadJson(sharedStoreWorkbookPrefix + id, null)
              || safeReadJson(sharedStoreWorkbookLitePrefix + id, null);
          }).filter(Boolean);
        } else {
          workbooks = [];
        }
        return workbooks;
      }

      function buildFallbackWorkloadSynthesisProjects() {
        const workbooks = getFallbackFullWorkbooksForWorkspace();
        if (!workbooks.length) return [];

        const byProject = new Map();
        workbooks.filter(Boolean).forEach(function (workbook) {
          const group = buildFallbackWorkspaceProjectGroup(workbook);
          const projectKey = group.projectKey;
          if (!projectKey) return;

          const existing = byProject.get(projectKey) || {
            projectKey: projectKey,
            projectName: group.projectName,
            projectType: group.gp.project_type || "",
            projectContext: group.gp.project_context || "",
            persistedKeysSet: new Set(),
            synthesisRows: [],
            hoursRows: [],
            overhaulRenewalPlanningRows: [],
            deqVmiPlanningRows: [],
          };
          group.persistedKeys.forEach(function (key) {
            existing.persistedKeysSet.add(key);
          });

          const synthesisRows = (workbook.sheets && (workbook.sheets.synthesis || workbook.sheets.workloadSynthesis)) || [];
          if (synthesisRows.length) existing.synthesisRows = synthesisRows;

          const hoursRows = (workbook.sheets && (workbook.sheets.hoursReport || workbook.sheets.workloadHoursReport)) || [];
          if (hoursRows.length) existing.hoursRows = hoursRows;

          const overhaulRenewalPlanningRows = (workbook.sheets && workbook.sheets.overhaulRenewalPlanning) || [];
          if (overhaulRenewalPlanningRows.length) existing.overhaulRenewalPlanningRows = overhaulRenewalPlanningRows;

          const deqVmiPlanningRows = (workbook.sheets && workbook.sheets.deqVmiPlanning) || [];
          if (deqVmiPlanningRows.length) existing.deqVmiPlanningRows = deqVmiPlanningRows;

          byProject.set(projectKey, existing);
        });

        return Array.from(byProject.values())
          .filter(function (p) { return p.synthesisRows.length || p.hoursRows.length; })
          .map(function (project) {
            const hasSynthesis = project.synthesisRows.length > 0;
            const hasHoursReport = project.hoursRows.length > 0;
            const workloadRows = (hasSynthesis && hasHoursReport)
              ? computeWorkloadRows(project.synthesisRows, project.hoursRows)
              : [];
            return {
              projectKey: project.projectKey,
              projectName: project.projectName,
              projectType: project.projectType,
              projectContext: project.projectContext,
              persistedKeys: Array.from(project.persistedKeysSet || [project.projectKey]),
              hasSynthesis: hasSynthesis,
              hasHoursReport: hasHoursReport,
              synthesisRows: project.synthesisRows,
              overhaulRenewalPlanningRows: project.overhaulRenewalPlanningRows,
              deqVmiPlanningRows: project.deqVmiPlanningRows,
              workloadRows: workloadRows,
              gapAlerts: workloadRows.filter(function (r) { return r.gapHours < 0; }),
            };
          })
          .sort(function (a, b) { return String(a.projectName).localeCompare(String(b.projectName)); });
      }

      function buildFallbackSubsystemSourceProjects() {
        const workbooks = getFallbackFullWorkbooksForWorkspace();
        if (!workbooks.length) return [];

        const byProject = new Map();
        workbooks.filter(Boolean).forEach(function (workbook) {
          const group = buildFallbackWorkspaceProjectGroup(workbook);
          if (!group.projectKey) return;

          const existing = byProject.get(group.projectKey) || {
            projectKey: group.projectKey,
            projectName: group.projectName,
            projectType: group.gp.project_type || "",
            projectContext: group.gp.project_context || "",
            persistedKeysSet: new Set(),
            subsystemSet: new Set(),
          };
          group.persistedKeys.forEach(function (key) {
            existing.persistedKeysSet.add(key);
          });
          extractSynthesisSubsystems(workbook).forEach(function (subsystem) {
            existing.subsystemSet.add(subsystem);
          });

          byProject.set(group.projectKey, existing);
        });

        return Array.from(byProject.values())
          .map(function (project) {
            return {
              projectKey: project.projectKey,
              projectName: project.projectName,
              projectType: project.projectType,
              projectContext: project.projectContext,
              persistedKeys: Array.from(project.persistedKeysSet || [project.projectKey]),
              subsystems: Array.from(project.subsystemSet || []).sort(function (left, right) {
                return String(left).localeCompare(String(right));
              }),
            };
          })
          .filter(function (project) { return project.subsystems.length > 0; });
      }

      function resolveFallbackWorkloadContext(phaseProj, workloadByLookup, subsystemByLookup, workloadOverrides) {
        const lookupKeys = getProjectLookupKeys(phaseProj);
        const wProj = findProjectByLookupKeys(workloadByLookup, lookupKeys);
        const subsystemProject = findProjectByLookupKeys(subsystemByLookup, lookupKeys);
        const wOverrides = readPersistedFallbackProjectState(workloadOverrides, lookupKeys);
        const baseRows = (Array.isArray(wOverrides.importedRows) && wOverrides.importedRows.length)
          ? wOverrides.importedRows
          : (wProj ? wProj.workloadRows : []);
        const extraRows = Array.isArray(wOverrides.extraRows) ? wOverrides.extraRows : [];
        const seenSubs = new Set();
        const subsystems = [];
        baseRows.concat(extraRows).forEach(function (row) {
          const sub = String(row.subsystem || "").trim();
          if (sub && !seenSubs.has(sub)) { seenSubs.add(sub); subsystems.push(sub); }
        });
        (Array.isArray(subsystemProject && subsystemProject.subsystems) ? subsystemProject.subsystems : []).forEach(function (sub) {
          const subsystem = String(sub || "").trim();
          if (subsystem && !seenSubs.has(subsystem)) {
            seenSubs.add(subsystem);
            subsystems.push(subsystem);
          }
        });
        return {
          lookupKeys: lookupKeys,
          baseRows: baseRows,
          extraRows: extraRows,
          workloadRows: baseRows.concat(extraRows),
          subsystems: subsystems,
        };
      }

      function saveFallbackPioDefinitionProjectField(projectKey, field, value) {
        const current = readPioDefinitionFallbackState();
        const nextProject = Object.assign({}, current[projectKey] || {});
        nextProject[field] = value;
        current[projectKey] = nextProject;
        writePioDefinitionFallbackState(current);
      }

      function toggleFallbackPioDefinitionOrigin(projectKey, origin, checked) {
        const current = readPioDefinitionFallbackState();
        const nextProject = Object.assign({}, current[projectKey] || {});
        const list = Array.isArray(nextProject.selectedOrigins) ? nextProject.selectedOrigins.slice() : [];
        const nextList = checked
          ? (list.indexOf(origin) === -1 ? list.concat([origin]) : list)
          : list.filter(function (entry) { return entry !== origin; });
        nextProject.selectedOrigins = nextList;
        current[projectKey] = nextProject;
        writePioDefinitionFallbackState(current);
      }

      function addFallbackPioDefinitionOrigin(projectKey) {
        const customOrigin = window.prompt("Add origin", "");
        if (!customOrigin) return;
        const nextOrigin = String(customOrigin).trim();
        if (!nextOrigin) return;
        const current = readPioDefinitionFallbackState();
        const nextProject = Object.assign({}, current[projectKey] || {});
        const customOrigins = Array.isArray(nextProject.customOrigins) ? nextProject.customOrigins.slice() : [];
        const selectedOrigins = Array.isArray(nextProject.selectedOrigins) ? nextProject.selectedOrigins.slice() : [];
        if (customOrigins.indexOf(nextOrigin) === -1) customOrigins.push(nextOrigin);
        if (selectedOrigins.indexOf(nextOrigin) === -1) selectedOrigins.push(nextOrigin);
        nextProject.customOrigins = customOrigins;
        nextProject.selectedOrigins = selectedOrigins;
        current[projectKey] = nextProject;
        writePioDefinitionFallbackState(current);
      }

      function saveFallbackPioDefinitionRowField(projectKey, origin, field, value) {
        const current = readPioDefinitionFallbackState();
        const nextProject = Object.assign({}, current[projectKey] || {});
        const rowOverrides = Object.assign({}, nextProject.rowOverrides || {});
        const row = Object.assign({}, rowOverrides[origin] || {});
        row[field] = value;
        rowOverrides[origin] = row;
        nextProject.rowOverrides = rowOverrides;
        current[projectKey] = nextProject;
        writePioDefinitionFallbackState(current);
      }

      function extractSynthesisSubsystems(workbook) {
        const summarySubsystems = Array.isArray(workbook?.summary?.synthesisSubsystems)
          ? workbook.summary.synthesisSubsystems.filter(Boolean).map(function (value) { return String(value).trim(); }).filter(Boolean)
          : [];
        if (summarySubsystems.length) {
          return Array.from(new Set(summarySubsystems)).sort(function (left, right) {
            return String(left).localeCompare(String(right));
          });
        }
        const rows = (workbook && workbook.sheets && workbook.sheets.synthesis) || [];
        const subsystems = new Set();
        rows.forEach(function (row) {
          let value = row && (
            row.subsystem ||
            row.Subsystem ||
            row.SUBSYSTEM ||
            row.sub_system ||
            row["Subsystem"] ||
            row["subsystem"]
          );
          if (!value && row && typeof row === "object") {
            Object.keys(row).some(function (key) {
              const normalizedKey = String(key || "")
                .trim()
                .toLowerCase()
                .replace(/[\s/\\-]+/g, "_")
                .replace(/[()]+/g, "")
                .replace(/[^\w]+/g, "_")
                .replace(/^_+|_+$/g, "")
                .replace(/_+/g, "_");
              if (normalizedKey === "subsystem" || normalizedKey === "sub_system") {
                value = row[key];
                return true;
              }
              return false;
            });
          }
          const normalized = String(value || "").trim();
          if (normalized) subsystems.add(normalized);
        });
        return Array.from(subsystems).sort(function (left, right) {
          return left.localeCompare(right);
        });
      }

      function extractSynthesisCurrencies(workbook) {
        const summaryCurrencies = Array.isArray(workbook?.summary?.synthesisCurrencies)
          ? workbook.summary.synthesisCurrencies.filter(Boolean).map(function (value) { return String(value).trim().toUpperCase(); }).filter(Boolean)
          : [];
        if (summaryCurrencies.length) {
          return Array.from(new Set(summaryCurrencies)).sort(function (left, right) {
            return left.localeCompare(right);
          });
        }
        const rows = (workbook && workbook.sheets && workbook.sheets.synthesis) || [];
        const currencies = new Set();
        rows.forEach(function (row) {
          let value = row && (
            row.currency ||
            row.Currency ||
            row.CURRENCY ||
            row["Currency"] ||
            row["currency"]
          );
          if (!value && row && typeof row === "object") {
            Object.keys(row).some(function (key) {
              const normalizedKey = String(key || "")
                .trim()
                .toLowerCase()
                .replace(/[\s/\\-]+/g, "_")
                .replace(/[()]+/g, "")
                .replace(/[^\w]+/g, "_")
                .replace(/^_+|_+$/g, "")
                .replace(/_+/g, "_");
              if (normalizedKey === "currency") {
                value = row[key];
                return true;
              }
              return false;
            });
          }
          const normalized = String(value || "").trim().toUpperCase();
          if (normalized) currencies.add(normalized);
        });
        return Array.from(currencies).sort(function (left, right) {
          return left.localeCompare(right);
        });
      }

      function saveFallbackPioDefinitionCustomDuty(projectKey, subsystem, value) {
        const current = readPioDefinitionFallbackState();
        const nextProject = Object.assign({}, current[projectKey] || {});
        const customDuties = Object.assign({}, nextProject.customDutiesBySubsystem || {});
        customDuties[subsystem] = value;
        nextProject.customDutiesBySubsystem = customDuties;
        current[projectKey] = nextProject;
        writePioDefinitionFallbackState(current);
      }

      function saveFallbackCurrencyExchangeProjectField(projectKey, field, value) {
        const current = readCurrencyExchangeFallbackState();
        const nextProject = Object.assign({}, current[projectKey] || {});
        nextProject[field] = value;
        current[projectKey] = nextProject;
        writeCurrencyExchangeFallbackState(current);
      }

      function saveFallbackCurrencyExchangeManualOverride(projectKey, currency, value) {
        const current = readCurrencyExchangeFallbackState();
        const nextProject = Object.assign({}, current[projectKey] || {});
        const manualOverrides = Object.assign({}, nextProject.manualOverrides || {});
        if (value === null || value <= 0) delete manualOverrides[currency];
        else manualOverrides[currency] = value;
        nextProject.manualOverrides = manualOverrides;
        current[projectKey] = nextProject;
        writeCurrencyExchangeFallbackState(current);
      }

      function addFallbackCurrencyExchangeCurrency(projectKey) {
        const customCurrency = window.prompt("Add target currency", "");
        if (!customCurrency) return;
        const nextCurrency = String(customCurrency).trim().toUpperCase();
        if (!nextCurrency) return;
        const current = readCurrencyExchangeFallbackState();
        const nextProject = Object.assign({}, current[projectKey] || {});
        const customCurrencies = Array.isArray(nextProject.customCurrencies) ? nextProject.customCurrencies.slice() : [];
        if (customCurrencies.indexOf(nextCurrency) === -1) {
          customCurrencies.push(nextCurrency);
        }
        nextProject.customCurrencies = customCurrencies;
        nextProject.targetCurrency = nextCurrency;
        current[projectKey] = nextProject;
        writeCurrencyExchangeFallbackState(current);
      }

      function buildFallbackRecurrentGuidePlanningCode(projectCode, recurrentCode, phaseCode) {
        const safeProjectCode = String(projectCode || "").trim() || "PROJECT";
        const safeRecurrentCode = String(recurrentCode || "").trim() || "REC";
        const safePhaseCode = String(phaseCode || "").trim() || "PHASE";
        return safeProjectCode + "_" + safeRecurrentCode + "_" + safePhaseCode;
      }

      function buildFallbackRecurrentPostWarrantyGuidePlanningCode(projectCode, recurrentCode, phaseCode, postWarrantyCode) {
        const safeProjectCode = String(projectCode || "").trim() || "PROJECT";
        const safeRecurrentCode = String(recurrentCode || "").trim() || "REC";
        const safePhaseCode = String(phaseCode || "").trim() || "PHASE";
        const safePostWarrantyCode = String(postWarrantyCode || "").trim() || "PDLP";
        return safeProjectCode + "_" + safeRecurrentCode + "_" + safePhaseCode + "_" + safePostWarrantyCode;
      }

      function buildFallbackGuidePlanningProjects() {
        const persisted = readCombinedGuidePlanningState();
        const projectPhaseProjects = buildCombinedProjectPhaseProjects();
        const costCenterProjects = buildFallbackCostCenterProjects();
        const pioDefinitionProjects = buildFallbackPioDefinitionProjects();
        const materialCatalog = ["Tools", "Consumables", "PPE", "Vehicles", "Spare Parts", "Preventive spares", "Corrective spares", "Repair", "Other Support Costs"];
        const subcontractingCatalog = ["Training", "Legal_Training", "Technical_Support"];
        const demobilizationMaterialCatalog = ["Preventive spares", "Corrective spares", "Vehicles", "Other Support Costs"];
        const demobilizationSubcontractingCatalog = ["Preventive_Subcontract", "Corrective_Subcontract", "Technical_Support", "Training", "Legal_Training", "Obsolescence"];
        const recurrentMaterialCatalog = ["Tools", "Consumables", "PPE", "Vehicles", "Preventive spares", "Corrective spares", "Repair", "Other Support Costs"];
        const recurrentSubcontractingCatalog = ["Corrective_Subcontract", "Preventive_Subcontract", "Technical_Support", "Training", "Legal_Training", "Obsolescence"];
        const projectPhaseMap = buildProjectLookupMap(projectPhaseProjects);
        const costCenterMap = buildProjectLookupMap(costCenterProjects);
        const pioDefinitionMap = buildProjectLookupMap(pioDefinitionProjects);
        const projectKeys = Array.from(new Set(projectPhaseProjects.map(function (project) { return project.projectKey; }).concat(costCenterProjects.map(function (project) { return project.projectKey; })).concat(pioDefinitionProjects.map(function (project) { return project.projectKey; }))));

        return projectKeys.map(function (projectKey) {
          const baseProject = projectPhaseProjects.find(function (project) { return project.projectKey === projectKey; })
            || costCenterProjects.find(function (project) { return project.projectKey === projectKey; })
            || pioDefinitionProjects.find(function (project) { return project.projectKey === projectKey; })
            || { projectKey: projectKey };
          const lookupKeys = getProjectLookupKeys(baseProject);
          const phaseProject = findProjectByLookupKeys(projectPhaseMap, lookupKeys);
          const costCenterProject = findProjectByLookupKeys(costCenterMap, lookupKeys);
          const pioDefinitionProject = findProjectByLookupKeys(pioDefinitionMap, lookupKeys);
          if (!phaseProject && !costCenterProject && !pioDefinitionProject) return null;

          const current = Object.assign({}, readPersistedFallbackProjectState(persisted, lookupKeys));
          const rowOverrides = Object.assign({}, current.rowOverrides || {});
          const positions = Array.from(new Set(((costCenterProject && costCenterProject.selectedPositions) || []).filter(Boolean)));
          const selectedMaterialTypes = Array.isArray(current.selectedMaterialTypes) ? current.selectedMaterialTypes.filter(Boolean) : [];
          const selectedSubcontractingTypes = Array.isArray(current.selectedSubcontractingTypes) ? current.selectedSubcontractingTypes.filter(Boolean) : [];
          const selectedRecurrentMaterialTypes = Array.isArray(current.selectedRecurrentMaterialTypes) ? current.selectedRecurrentMaterialTypes.filter(Boolean) : [];
          const selectedRecurrentSubcontractingTypes = Array.isArray(current.selectedRecurrentSubcontractingTypes) ? current.selectedRecurrentSubcontractingTypes.filter(Boolean) : [];
          const customWorkloadRows = Array.isArray(current.customWorkloadRows) ? current.customWorkloadRows.map(function (row) { return Object.assign({}, row); }) : [];
          const customMaterialRows = Array.isArray(current.customMaterialRows) ? current.customMaterialRows.map(function (row) { return Object.assign({}, row); }) : [];
          const customSubcontractingRows = Array.isArray(current.customSubcontractingRows) ? current.customSubcontractingRows.map(function (row) { return Object.assign({}, row); }) : [];
          const customDemobilizationWorkloadRows = Array.isArray(current.customDemobilizationWorkloadRows) ? current.customDemobilizationWorkloadRows.map(function (row) { return Object.assign({}, row); }) : [];
          const customDemobilizationMaterialRows = Array.isArray(current.customDemobilizationMaterialRows) ? current.customDemobilizationMaterialRows.map(function (row) { return Object.assign({}, row); }) : [];
          const customDemobilizationSubcontractingRows = Array.isArray(current.customDemobilizationSubcontractingRows) ? current.customDemobilizationSubcontractingRows.map(function (row) { return Object.assign({}, row); }) : [];
          const customRecurrentWorkloadRows = Array.isArray(current.customRecurrentWorkloadRows) ? current.customRecurrentWorkloadRows.map(function (row) { return Object.assign({}, row); }) : [];
          const customRecurrentMaterialRows = Array.isArray(current.customRecurrentMaterialRows) ? current.customRecurrentMaterialRows.map(function (row) { return Object.assign({}, row); }) : [];
          const customRecurrentSubcontractingRows = Array.isArray(current.customRecurrentSubcontractingRows) ? current.customRecurrentSubcontractingRows.map(function (row) { return Object.assign({}, row); }) : [];
          const customOverhaulRenewalRows = Array.isArray(current.customOverhaulRenewalRows) ? current.customOverhaulRenewalRows.map(function (row) { return Object.assign({}, row); }) : [];
          const riskRows = Array.isArray(current.riskRows)
            ? current.riskRows.map(function (row) { return Object.assign({}, row); })
            : (Array.isArray(current.customRiskRows) ? current.customRiskRows.map(function (row) { return Object.assign({}, row); }) : []);
          const serviceYear = String((phaseProject && phaseProject.serviceYear) || "").trim();
          const serviceDate = (phaseProject && phaseProject.startOfProjectDate)
            ? phaseProject.startOfProjectDate
            : (/^\d{4}$/.test(serviceYear) ? (serviceYear + "-01-01") : "");
          const endOfProjectDate = Array.isArray(phaseProject && phaseProject.phases)
            ? ((phaseProject.phases.find(function (phase) { return (phase && phase.key) === "Total"; }) || {}).endDate || phaseProject.phases.reduce(function (latest, phase) {
                const endDate = String(phase && phase.endDate || "").trim();
                return !latest || (endDate && endDate > latest) ? endDate : latest;
              }, ""))
            : "";
          const endOfProjectYear = String(endOfProjectDate || "").slice(0, 4);
          const eligiblePhases = Array.isArray(phaseProject && phaseProject.phases)
            ? phaseProject.phases.filter(function (phase) {
                return String(phase && phase.startDate || "").slice(0, 4) === serviceYear;
              })
            : [];
          const demobilizationEligiblePhases = Array.isArray(phaseProject && phaseProject.phases)
            ? phaseProject.phases.filter(function (phase) {
                return String(phase && phase.endDate || "").slice(0, 4) === endOfProjectYear;
              })
            : [];
          const workloadMonthsByPosition = Object.assign({}, current.mobilizationWorkloadMonthsByPosition || {});
          const resolvedWorkloadMonthsByPosition = positions.reduce(function (accumulator, position) {
            const legacyMonths = Object.values(current.mobilizationWorkloadMonthsByPhase || {}).find(function (entry) {
              return entry && Object.prototype.hasOwnProperty.call(entry, position);
            });
            accumulator[position] = Math.max(0, toNumber(workloadMonthsByPosition[position]) || toNumber(legacyMonths && legacyMonths[position]) || 0);
            return accumulator;
          }, {});
          const demobilizationWorkloadMonthsByPosition = Object.assign({}, current.demobilizationWorkloadMonthsByPosition || {});
          const resolvedDemobilizationWorkloadMonthsByPosition = positions.reduce(function (accumulator, position) {
            accumulator[position] = Math.max(0, toNumber(demobilizationWorkloadMonthsByPosition[position]) || 0);
            return accumulator;
          }, {});
          const demobilizationMaterialMonthsByType = Object.assign({}, current.demobilizationMaterialMonthsByType || {});
          const resolvedDemobilizationMaterialMonthsByType = demobilizationMaterialCatalog.reduce(function (accumulator, materialType) {
            accumulator[materialType] = Math.max(0, toNumber(demobilizationMaterialMonthsByType[materialType]) || 0);
            return accumulator;
          }, {});
          const demobilizationSubcontractingMonthsByType = Object.assign({}, current.demobilizationSubcontractingMonthsByType || {});
          const resolvedDemobilizationSubcontractingMonthsByType = demobilizationSubcontractingCatalog.reduce(function (accumulator, subcontractingType) {
            accumulator[subcontractingType] = Math.max(0, toNumber(demobilizationSubcontractingMonthsByType[subcontractingType]) || 0);
            return accumulator;
          }, {});
          const generatedRows = [];
          const generatedMaterialRows = [];
          const generatedSubcontractingRows = [];
          const generatedDemobilizationRows = [];
          const generatedDemobilizationMaterialRows = [];
          const generatedDemobilizationSubcontractingRows = [];
          const overhaulRenewalRows = Array.isArray(phaseProject && phaseProject.phases)
            ? phaseProject.phases
              .filter(function (phase) {
                return String(phase && phase.startDate || "").trim() || String(phase && phase.endDate || "").trim();
              })
              .flatMap(function (phase) {
                return (Array.isArray(pioDefinitionProject && pioDefinitionProject.subsystems) ? pioDefinitionProject.subsystems : []).map(function (subsystem) {
                  const rowKey = "overhaul_renewal__" + ((phase && phase.key) || "PHASE") + "__" + subsystem;
                  const rowOverride = rowOverrides[rowKey] || {};
                  return {
                    rowKey: rowKey,
                    phaseLabel: (phase && (phase.label || phase.key)) || "PHASE",
                    subsystem: subsystem,
                    overhaulGuidePlanningCode: rowOverride.overhaulGuidePlanningCode || [
                      String((phaseProject && phaseProject.projectCode) || "").trim() || "PROJECT",
                      String((phaseProject && phaseProject.overhaulCode) || "").trim() || "OVH",
                      String(subsystem || "").trim() || "SUBSYSTEM",
                      String((phase && (phase.phaseCode || phase.key)) || "PHASE").trim() || "PHASE"
                    ].join("_"),
                    renewalGuidePlanningCode: rowOverride.renewalGuidePlanningCode || [
                      String((phaseProject && phaseProject.projectCode) || "").trim() || "PROJECT",
                      String((phaseProject && phaseProject.renewalCode) || "").trim() || "REN",
                      String(subsystem || "").trim() || "SUBSYSTEM",
                      String((phase && (phase.phaseCode || phase.key)) || "PHASE").trim() || "PHASE"
                    ].join("_")
                  };
                });
              })
            : [];
          const recurrentWorkloadRows = positions.length && Array.isArray(phaseProject && phaseProject.phases)
            ? phaseProject.phases
              .filter(function (phase) {
                return String(phase && phase.startDate || "").trim() || String(phase && phase.endDate || "").trim();
              })
              .map(function (phase) {
                const phaseCode = (phase && phase.phaseCode) || (phase && phase.key) || "PHASE";
                return {
                  rowKey: "recurrent__" + ((phase && phase.key) || phaseCode),
                  phaseLabel: (phase && (phase.label || phase.key)) || phaseCode,
                  startDate: (phase && phase.startDate) || "",
                  endDate: (phase && phase.endDate) || "",
                  phaseCode: phaseCode,
                  guidePlanningCode: buildFallbackRecurrentGuidePlanningCode(
                    (phaseProject && phaseProject.projectCode) || "",
                    (phaseProject && phaseProject.recurrentCode) || "REC",
                    phaseCode
                  )
                };
              })
            : [];
          const recurrentMaterialRows = Array.isArray(phaseProject && phaseProject.phases)
            ? phaseProject.phases.flatMap(function (phase) {
                return selectedRecurrentMaterialTypes.flatMap(function (materialType) {
                  const hasPostWarrantyWindow = Boolean((phase && phase.postWarrantyStartDate) && (phase && phase.postWarrantyEndDate));
                  const phaseCode = (phase && phase.phaseCode) || (phase && phase.key) || "PHASE";
                  const usePostWarrantyWindow = (materialType === "Corrective spares" || materialType === "Repair") && hasPostWarrantyWindow;
                  return [{
                    rowKey: "recurrent_material__" + ((phase && phase.key) || phaseCode) + "__" + materialType,
                    phaseLabel: (phase && (phase.label || phase.key)) || phaseCode,
                    materialType: materialType,
                    startDate: usePostWarrantyWindow ? ((phase && phase.postWarrantyStartDate) || "") : ((phase && phase.startDate) || ""),
                    endDate: usePostWarrantyWindow ? ((phase && phase.postWarrantyEndDate) || "") : ((phase && phase.endDate) || ""),
                    guidePlanningCode: usePostWarrantyWindow
                      ? buildFallbackRecurrentPostWarrantyGuidePlanningCode(
                          (phaseProject && phaseProject.projectCode) || "",
                          (phaseProject && phaseProject.recurrentCode) || "REC",
                          phaseCode,
                          (phaseProject && phaseProject.postWarrantyCode) || "PDLP"
                        )
                      : buildFallbackRecurrentGuidePlanningCode(
                          (phaseProject && phaseProject.projectCode) || "",
                          (phaseProject && phaseProject.recurrentCode) || "REC",
                          phaseCode
                        )
                  }];
                });
              })
            : [];
          const recurrentSubcontractingRows = Array.isArray(phaseProject && phaseProject.phases)
            ? phaseProject.phases.flatMap(function (phase) {
                return selectedRecurrentSubcontractingTypes.map(function (subcontractingType) {
                  const phaseCode = (phase && phase.phaseCode) || (phase && phase.key) || "PHASE";
                  return {
                    rowKey: "recurrent_subcontracting__" + ((phase && phase.key) || phaseCode) + "__" + subcontractingType,
                    phaseLabel: (phase && (phase.label || phase.key)) || phaseCode,
                    subcontractingType: subcontractingType,
                    startDate: (phase && phase.startDate) || "",
                    endDate: (phase && phase.endDate) || "",
                    guidePlanningCode: buildFallbackRecurrentGuidePlanningCode(
                      (phaseProject && phaseProject.projectCode) || "",
                      (phaseProject && phaseProject.recurrentCode) || "REC",
                      phaseCode
                    )
                  };
                });
              })
            : [];

          eligiblePhases.forEach(function (phase) {
            positions.forEach(function (position) {
              const months = resolvedWorkloadMonthsByPosition[position] || 0;
              if (!months) return;
              const rowKey = phase.key + "__" + position;
              const phaseStartDate = phase.startDate || serviceDate || "";
              const defaultStartDate = phaseStartDate ? addMonths(phaseStartDate, -months) : "";
              const defaultEndDate = phaseStartDate ? addDays(phaseStartDate, -1) : "";
              const defaultGuidePlanningCode = [
                String((phaseProject && phaseProject.projectCode) || "PROJECT").trim() || "PROJECT",
                String((phaseProject && phaseProject.mobilisationPhaseCode) || "MOB").trim() || "MOB",
                String(months) + "M"
              ].join("_");
              const rowOverride = rowOverrides[rowKey] || {};
              generatedRows.push({
                rowKey: rowKey,
                phaseLabel: phase.label || phase.key,
                position: position,
                startDate: rowOverride.startDate || defaultStartDate,
                endDate: rowOverride.endDate || defaultEndDate,
                guidePlanningCode: rowOverride.guidePlanningCode || defaultGuidePlanningCode
              });
            });
            selectedMaterialTypes.forEach(function (materialType) {
              const rowKey = "materials__" + phase.key + "__" + materialType;
              const rowOverride = rowOverrides[rowKey] || {};
              const phaseStartDate = phase.startDate || serviceDate || "";
              generatedMaterialRows.push({
                rowKey: rowKey,
                phaseLabel: phase.label || phase.key,
                materialType: materialType,
                startDate: rowOverride.startDate || (phaseStartDate ? addMonths(phaseStartDate, -12) : ""),
                endDate: rowOverride.endDate || (phaseStartDate ? addDays(phaseStartDate, -1) : ""),
                guidePlanningCode: rowOverride.guidePlanningCode || [
                  String((phaseProject && phaseProject.projectCode) || "PROJECT").trim() || "PROJECT",
                  String((phaseProject && phaseProject.mobilisationPhaseCode) || "MOB").trim() || "MOB",
                  "12M"
                ].join("_")
              });
            });
            selectedSubcontractingTypes.forEach(function (subcontractingType) {
              const rowKey = "subcontracting__" + phase.key + "__" + subcontractingType;
              const rowOverride = rowOverrides[rowKey] || {};
              const phaseStartDate = phase.startDate || serviceDate || "";
              generatedSubcontractingRows.push({
                rowKey: rowKey,
                phaseLabel: phase.label || phase.key,
                subcontractingType: subcontractingType,
                startDate: rowOverride.startDate || (phaseStartDate ? addMonths(phaseStartDate, -12) : ""),
                endDate: rowOverride.endDate || (phaseStartDate ? addDays(phaseStartDate, -1) : ""),
                guidePlanningCode: rowOverride.guidePlanningCode || [
                  String((phaseProject && phaseProject.projectCode) || "PROJECT").trim() || "PROJECT",
                  String((phaseProject && phaseProject.mobilisationPhaseCode) || "MOB").trim() || "MOB",
                  "12M"
                ].join("_")
              });
            });
          });

          demobilizationEligiblePhases.forEach(function (phase) {
            positions.forEach(function (position) {
              const months = resolvedDemobilizationWorkloadMonthsByPosition[position] || 0;
              if (!months) return;
              generatedDemobilizationRows.push({
                rowKey: "demobilization__" + phase.key + "__" + position,
                phaseLabel: phase.label || phase.key,
                position: position,
                startDate: endOfProjectDate ? addMonths(endOfProjectDate, -months) : "",
                endDate: endOfProjectDate || "",
                guidePlanningCode: [
                  String((phaseProject && phaseProject.projectCode) || "PROJECT").trim() || "PROJECT",
                  String((phaseProject && phaseProject.demobilisationCode) || "DEM").trim() || "DEM",
                  String(months) + "M"
                ].join("_")
              });
            });
            demobilizationMaterialCatalog.forEach(function (materialType) {
              const months = resolvedDemobilizationMaterialMonthsByType[materialType] || 0;
              if (!months) return;
              generatedDemobilizationMaterialRows.push({
                rowKey: "demobilization_material__" + phase.key + "__" + materialType,
                phaseLabel: phase.label || phase.key,
                materialType: materialType,
                startDate: endOfProjectDate ? addMonths(endOfProjectDate, -months) : "",
                endDate: endOfProjectDate || "",
                guidePlanningCode: [
                  String((phaseProject && phaseProject.projectCode) || "PROJECT").trim() || "PROJECT",
                  String((phaseProject && phaseProject.demobilisationCode) || "DEM").trim() || "DEM",
                  String(months) + "M"
                ].join("_")
              });
            });
            demobilizationSubcontractingCatalog.forEach(function (subcontractingType) {
              const months = resolvedDemobilizationSubcontractingMonthsByType[subcontractingType] || 0;
              if (!months) return;
              generatedDemobilizationSubcontractingRows.push({
                rowKey: "demobilization_subcontracting__" + phase.key + "__" + subcontractingType,
                phaseLabel: phase.label || phase.key,
                subcontractingType: subcontractingType,
                startDate: endOfProjectDate ? addMonths(endOfProjectDate, -months) : "",
                endDate: endOfProjectDate || "",
                guidePlanningCode: [
                  String((phaseProject && phaseProject.projectCode) || "PROJECT").trim() || "PROJECT",
                  String((phaseProject && phaseProject.demobilisationCode) || "DEM").trim() || "DEM",
                  String(months) + "M"
                ].join("_")
              });
            });
          });

          const riskGuidePlanningOptions = Array.from(new Set(
            generatedRows.map(function (row) { return row.guidePlanningCode; })
              .concat(generatedMaterialRows.map(function (row) { return row.guidePlanningCode; }))
              .concat(generatedSubcontractingRows.map(function (row) { return row.guidePlanningCode; }))
              .concat(recurrentWorkloadRows.map(function (row) { return row.guidePlanningCode; }))
              .concat(recurrentMaterialRows.map(function (row) { return row.guidePlanningCode; }))
              .concat(recurrentSubcontractingRows.map(function (row) { return row.guidePlanningCode; }))
              .concat(generatedDemobilizationRows.map(function (row) { return row.guidePlanningCode; }))
              .concat(generatedDemobilizationMaterialRows.map(function (row) { return row.guidePlanningCode; }))
              .concat(generatedDemobilizationSubcontractingRows.map(function (row) { return row.guidePlanningCode; }))
              .concat(overhaulRenewalRows.map(function (row) { return row.overhaulGuidePlanningCode; }))
              .concat(overhaulRenewalRows.map(function (row) { return row.renewalGuidePlanningCode; }))
              .concat(customWorkloadRows.map(function (row) { return row.guidePlanningCode; }))
              .concat(customMaterialRows.map(function (row) { return row.guidePlanningCode; }))
              .concat(customSubcontractingRows.map(function (row) { return row.guidePlanningCode; }))
              .concat(customRecurrentWorkloadRows.map(function (row) { return row.guidePlanningCode; }))
              .concat(customRecurrentMaterialRows.map(function (row) { return row.guidePlanningCode; }))
              .concat(customRecurrentSubcontractingRows.map(function (row) { return row.guidePlanningCode; }))
              .concat(customDemobilizationWorkloadRows.map(function (row) { return row.guidePlanningCode; }))
              .concat(customDemobilizationMaterialRows.map(function (row) { return row.guidePlanningCode; }))
              .concat(customDemobilizationSubcontractingRows.map(function (row) { return row.guidePlanningCode; }))
              .concat(customOverhaulRenewalRows.map(function (row) { return row.overhaulGuidePlanningCode; }))
              .concat(customOverhaulRenewalRows.map(function (row) { return row.renewalGuidePlanningCode; }))
              .concat(riskRows.map(function (row) { return row.guidePlanningCode; }))
              .filter(Boolean)
          ));

          return {
            projectKey: projectKey,
            projectName: (phaseProject && phaseProject.projectName) || (costCenterProject && costCenterProject.projectName) || projectKey,
            projectType: (phaseProject && phaseProject.projectType) || (costCenterProject && costCenterProject.projectType) || "",
            projectContext: (phaseProject && phaseProject.projectContext) || (costCenterProject && costCenterProject.projectContext) || "",
            projectCode: (phaseProject && phaseProject.projectCode) || "",
            mobilisationPhaseCode: (phaseProject && phaseProject.mobilisationPhaseCode) || "MOB",
            recurrentCode: (phaseProject && phaseProject.recurrentCode) || "REC",
            postWarrantyCode: (phaseProject && phaseProject.postWarrantyCode) || "PDLP",
            demobilisationCode: (phaseProject && phaseProject.demobilisationCode) || "DEM",
            overhaulCode: (phaseProject && phaseProject.overhaulCode) || "OVH",
            renewalCode: (phaseProject && phaseProject.renewalCode) || "REN",
            serviceYear: serviceYear,
            endOfProjectDate: endOfProjectDate,
            positions: positions,
            subsystems: Array.isArray(pioDefinitionProject && pioDefinitionProject.subsystems) ? pioDefinitionProject.subsystems : [],
            eligiblePhases: eligiblePhases,
            demobilizationEligiblePhases: demobilizationEligiblePhases,
            materialCatalog: materialCatalog,
            subcontractingCatalog: subcontractingCatalog,
            demobilizationMaterialCatalog: demobilizationMaterialCatalog,
            demobilizationSubcontractingCatalog: demobilizationSubcontractingCatalog,
            recurrentMaterialCatalog: recurrentMaterialCatalog,
            recurrentSubcontractingCatalog: recurrentSubcontractingCatalog,
            selectedMaterialTypes: selectedMaterialTypes,
            selectedSubcontractingTypes: selectedSubcontractingTypes,
            selectedRecurrentMaterialTypes: selectedRecurrentMaterialTypes,
            selectedRecurrentSubcontractingTypes: selectedRecurrentSubcontractingTypes,
            workloadMonthsByPosition: resolvedWorkloadMonthsByPosition,
            demobilizationWorkloadMonthsByPosition: resolvedDemobilizationWorkloadMonthsByPosition,
            demobilizationMaterialMonthsByType: resolvedDemobilizationMaterialMonthsByType,
            demobilizationSubcontractingMonthsByType: resolvedDemobilizationSubcontractingMonthsByType,
            generatedRows: generatedRows,
            recurrentWorkloadRows: recurrentWorkloadRows,
            recurrentMaterialRows: recurrentMaterialRows,
            recurrentSubcontractingRows: recurrentSubcontractingRows,
            generatedMaterialRows: generatedMaterialRows,
            generatedSubcontractingRows: generatedSubcontractingRows,
            generatedDemobilizationRows: generatedDemobilizationRows,
            generatedDemobilizationMaterialRows: generatedDemobilizationMaterialRows,
            generatedDemobilizationSubcontractingRows: generatedDemobilizationSubcontractingRows,
            overhaulRenewalRows: overhaulRenewalRows,
            riskGuidePlanningOptions: riskGuidePlanningOptions,
            customWorkloadRows: customWorkloadRows,
            customMaterialRows: customMaterialRows,
            customSubcontractingRows: customSubcontractingRows,
            customDemobilizationWorkloadRows: customDemobilizationWorkloadRows,
            customDemobilizationMaterialRows: customDemobilizationMaterialRows,
            customDemobilizationSubcontractingRows: customDemobilizationSubcontractingRows,
            customRecurrentWorkloadRows: customRecurrentWorkloadRows,
            customRecurrentMaterialRows: customRecurrentMaterialRows,
            customRecurrentSubcontractingRows: customRecurrentSubcontractingRows,
            customOverhaulRenewalRows: customOverhaulRenewalRows,
            riskRows: riskRows
          };
        }).filter(Boolean).sort(function (left, right) {
          return String(left.projectName).localeCompare(String(right.projectName));
        });
      }

      function saveFallbackGuidePlanningMonths(projectKey, position, value) {
        const current = readGuidePlanningFallbackState();
        const nextProject = Object.assign({}, current[projectKey] || {});
        const byPosition = Object.assign({}, nextProject.mobilizationWorkloadMonthsByPosition || {});
        byPosition[position] = value;
        nextProject.mobilizationWorkloadMonthsByPosition = byPosition;
        current[projectKey] = nextProject;
        writeGuidePlanningFallbackState(current);
      }

      function saveFallbackGuidePlanningDemobilisationMonths(projectKey, position, value) {
        const current = readGuidePlanningFallbackState();
        const nextProject = Object.assign({}, current[projectKey] || {});
        const byPosition = Object.assign({}, nextProject.demobilizationWorkloadMonthsByPosition || {});
        byPosition[position] = value;
        nextProject.demobilizationWorkloadMonthsByPosition = byPosition;
        current[projectKey] = nextProject;
        writeGuidePlanningFallbackState(current);
      }

      function saveFallbackGuidePlanningDemobilisationMaterialMonths(projectKey, materialType, value) {
        const current = readGuidePlanningFallbackState();
        const nextProject = Object.assign({}, current[projectKey] || {});
        const byType = Object.assign({}, nextProject.demobilizationMaterialMonthsByType || {});
        byType[materialType] = value;
        nextProject.demobilizationMaterialMonthsByType = byType;
        current[projectKey] = nextProject;
        writeGuidePlanningFallbackState(current);
      }

      function saveFallbackGuidePlanningDemobilisationSubcontractingMonths(projectKey, subcontractingType, value) {
        const current = readGuidePlanningFallbackState();
        const nextProject = Object.assign({}, current[projectKey] || {});
        const byType = Object.assign({}, nextProject.demobilizationSubcontractingMonthsByType || {});
        byType[subcontractingType] = value;
        nextProject.demobilizationSubcontractingMonthsByType = byType;
        current[projectKey] = nextProject;
        writeGuidePlanningFallbackState(current);
      }

      function saveFallbackGuidePlanningRowField(projectKey, rowKey, field, value) {
        const current = readGuidePlanningFallbackState();
        const nextProject = Object.assign({}, current[projectKey] || {});
        const rowOverrides = Object.assign({}, nextProject.rowOverrides || {});
        const rowOverride = Object.assign({}, rowOverrides[rowKey] || {});
        if (!value) delete rowOverride[field];
        else rowOverride[field] = value;
        if (Object.keys(rowOverride).length) rowOverrides[rowKey] = rowOverride;
        else delete rowOverrides[rowKey];
        nextProject.rowOverrides = rowOverrides;
        current[projectKey] = nextProject;
        writeGuidePlanningFallbackState(current);
      }

      function createFallbackGuidePlanningCustomRow(rowType) {
        return {
          id: "custom_" + rowType + "_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8),
          phaseLabel: "",
          subsystem: "",
          position: "",
          materialType: "",
          subcontractingType: "",
          startDate: "",
          endDate: "",
          guidePlanningCode: "",
          overhaulGuidePlanningCode: "",
          renewalGuidePlanningCode: ""
        };
      }

      function createFallbackGuidePlanningRiskRow() {
        return {
          id: "risk_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8),
          riskDescription: "",
          guidePlanningCode: ""
        };
      }

      function getFallbackGuidePlanningCustomCollectionKey(rowType) {
        switch (rowType) {
          case "overhaul_renewals":
            return "customOverhaulRenewalRows";
          case "materials":
            return "customMaterialRows";
          case "subcontracting":
            return "customSubcontractingRows";
          case "demobilization_materials":
            return "customDemobilizationMaterialRows";
          case "demobilization_subcontracting":
            return "customDemobilizationSubcontractingRows";
          case "demobilization_workload":
            return "customDemobilizationWorkloadRows";
          case "recurrent_materials":
            return "customRecurrentMaterialRows";
          case "recurrent_subcontracting":
            return "customRecurrentSubcontractingRows";
          case "recurrent_workload":
            return "customRecurrentWorkloadRows";
          default:
            return "customWorkloadRows";
        }
      }

      function saveFallbackGuidePlanningCustomRowField(projectKey, rowType, rowId, field, value) {
        const current = readGuidePlanningFallbackState();
        const nextProject = Object.assign({}, current[projectKey] || {});
        const key = getFallbackGuidePlanningCustomCollectionKey(rowType);
        const rows = Array.isArray(nextProject[key]) ? nextProject[key].map(function (row) { return Object.assign({}, row); }) : [];
        const index = rows.findIndex(function (row) { return row.id === rowId; });
        if (index >= 0) rows[index][field] = value;
        nextProject[key] = rows;
        current[projectKey] = nextProject;
        writeGuidePlanningFallbackState(current);
      }

      function addFallbackGuidePlanningCustomRow(projectKey, rowType) {
        const current = readGuidePlanningFallbackState();
        const nextProject = Object.assign({}, current[projectKey] || {});
        const key = getFallbackGuidePlanningCustomCollectionKey(rowType);
        const rows = Array.isArray(nextProject[key]) ? nextProject[key].slice() : [];
        rows.push(createFallbackGuidePlanningCustomRow(rowType));
        nextProject[key] = rows;
        current[projectKey] = nextProject;
        writeGuidePlanningFallbackState(current);
      }

      function removeFallbackGuidePlanningCustomRow(projectKey, rowType, rowId) {
        const current = readGuidePlanningFallbackState();
        const nextProject = Object.assign({}, current[projectKey] || {});
        const key = getFallbackGuidePlanningCustomCollectionKey(rowType);
        nextProject[key] = (Array.isArray(nextProject[key]) ? nextProject[key] : []).filter(function (row) { return row.id !== rowId; });
        current[projectKey] = nextProject;
        writeGuidePlanningFallbackState(current);
      }

      function saveFallbackGuidePlanningRiskField(projectKey, rowId, field, value) {
        const current = readGuidePlanningFallbackState();
        const nextProject = Object.assign({}, current[projectKey] || {});
        const rows = Array.isArray(nextProject.riskRows)
          ? nextProject.riskRows.map(function (row) { return Object.assign({}, row); })
          : (Array.isArray(nextProject.customRiskRows) ? nextProject.customRiskRows.map(function (row) { return Object.assign({}, row); }) : []);
        const index = rows.findIndex(function (row) { return row.id === rowId; });
        if (index >= 0) rows[index][field] = value;
        nextProject.riskRows = rows;
        delete nextProject.customRiskRows;
        current[projectKey] = nextProject;
        writeGuidePlanningFallbackState(current);
      }

      function addFallbackGuidePlanningRiskRow(projectKey) {
        const current = readGuidePlanningFallbackState();
        const nextProject = Object.assign({}, current[projectKey] || {});
        const rows = Array.isArray(nextProject.riskRows)
          ? nextProject.riskRows.slice()
          : (Array.isArray(nextProject.customRiskRows) ? nextProject.customRiskRows.slice() : []);
        rows.push(createFallbackGuidePlanningRiskRow());
        nextProject.riskRows = rows;
        delete nextProject.customRiskRows;
        current[projectKey] = nextProject;
        writeGuidePlanningFallbackState(current);
      }

      function removeFallbackGuidePlanningRiskRow(projectKey, rowId) {
        const current = readGuidePlanningFallbackState();
        const nextProject = Object.assign({}, current[projectKey] || {});
        const rows = Array.isArray(nextProject.riskRows)
          ? nextProject.riskRows
          : (Array.isArray(nextProject.customRiskRows) ? nextProject.customRiskRows : []);
        nextProject.riskRows = rows.filter(function (row) { return row.id !== rowId; });
        delete nextProject.customRiskRows;
        current[projectKey] = nextProject;
        writeGuidePlanningFallbackState(current);
      }

      function renderFallbackGuidePlanningWorkspace() {
        const workspace = $("guidePlanningWorkspace");
        const list = $("guidePlanningProjectList");
        const empty = $("guidePlanningWorkspaceEmpty");
        const content = $("guidePlanningWorkspaceContent");
        const status = $("guidePlanningWorkspaceStatus");
        const title = $("guidePlanningCurrentProjectTitle");
        const meta = $("guidePlanningCurrentProjectMeta");
        const workloadSelector = $("guidePlanningMobilisationWorkloadSelector");
        const workloadTableBody = $("guidePlanningMobilisationWorkloadTableBody");
        const workloadAddRowBtn = $("guidePlanningWorkloadAddRowBtn");
        const materialsSelector = $("guidePlanningMaterialsSelector");
        const materialsTableBody = $("guidePlanningMaterialsTableBody");
        const materialsAddRowBtn = $("guidePlanningMaterialsAddRowBtn");
        const subcontractingSelector = $("guidePlanningSubcontractingSelector");
        const subcontractingTableBody = $("guidePlanningSubcontractingTableBody");
        const subcontractingAddRowBtn = $("guidePlanningSubcontractingAddRowBtn");
        const recurrentPlaceholder = $("guidePlanningRecurrentPlaceholder");
        const demobilisationPlaceholder = $("guidePlanningDemobilisationPlaceholder");
        const overhaulPlaceholder = $("guidePlanningOverhaulPlaceholder");
        const risksPlaceholder = $("guidePlanningRisksPlaceholder");
        if (!workspace || !list || !empty || !content || !status || !title || !meta || !workloadSelector || !workloadTableBody || !materialsSelector || !materialsTableBody || !subcontractingSelector || !subcontractingTableBody) return;

        const projects = buildFallbackGuidePlanningProjects();
        const currentKey = workspace.dataset.currentProjectKey && projects.some(function (project) {
          return project.projectKey === workspace.dataset.currentProjectKey;
        }) ? workspace.dataset.currentProjectKey : (projects[0] ? projects[0].projectKey : "");
        const currentProject = projects.find(function (project) {
          return project.projectKey === currentKey;
        }) || null;

        workspace.classList.remove("hidden");
        status.textContent = projects.length ? (projects.length + " project(s) available") : "No project available.";
        list.innerHTML = projects.map(function (project) {
          const active = currentProject && project.projectKey === currentProject.projectKey;
          return (
            '<button type=\"button\" data-fallback-guide-planning-project-select=\"' + escapeHtml(project.projectKey) + '\" class=\"min-w-[220px] rounded-xl border px-4 py-3 text-left transition-all ' + (active ? 'border-emerald-300 bg-emerald-50 shadow-sm ring-1 ring-emerald-200' : 'border-slate-200 bg-white hover:bg-slate-100') + '\">' +
              '<div class=\"text-sm font-semibold text-slate-900\">' + escapeHtml(project.projectName) + '</div>' +
              '<div class=\"mt-1 text-xs text-slate-500\">' + escapeHtml(project.projectContext || 'No context') + ' | Service Year ' + escapeHtml(project.serviceYear || '--') + '</div>' +
            '</button>'
          );
        }).join("");

        if (!currentProject) {
          empty.classList.remove("hidden");
          content.classList.add("hidden");
          return;
        }

        workspace.dataset.currentProjectKey = currentProject.projectKey;
        empty.classList.add("hidden");
        content.classList.remove("hidden");
        title.textContent = currentProject.projectName;
        meta.textContent = (currentProject.projectType || "No project type") + " | " + (currentProject.projectContext || "No context") + " | Project Code " + (currentProject.projectCode || "--") + " | Mobilisation Code " + (currentProject.mobilisationPhaseCode || "--");
        if (workloadAddRowBtn) workloadAddRowBtn.setAttribute("data-project-key", currentProject.projectKey);
        if (materialsAddRowBtn) materialsAddRowBtn.setAttribute("data-project-key", currentProject.projectKey);
        if (subcontractingAddRowBtn) subcontractingAddRowBtn.setAttribute("data-project-key", currentProject.projectKey);

        if (!currentProject.positions.length || !currentProject.eligiblePhases.length) {
          workloadSelector.innerHTML = '<div class=\"rounded-2xl border border-dashed border-slate-200 bg-white px-5 py-8 text-sm text-slate-500\">' +
            (!currentProject.positions.length
              ? 'No applicable positions found yet. Configure positions first in Cost Centers Workspace.'
              : 'No project phase starts in the Service Year. Check Project Phases Workspace.') +
            '</div>';
        } else {
          workloadSelector.innerHTML =
            '<details class=\"rounded-2xl border border-slate-200 bg-white p-4\" open>' +
              '<summary class=\"cursor-pointer text-sm font-bold text-slate-700\">Applicable Positions <span class=\"text-slate-400 font-medium\">| Applied to ' + escapeHtml(String(currentProject.eligiblePhases.length)) + ' phase(s)</span></summary>' +
              '<p class=\"mt-3 text-xs text-slate-500\">The same mobilization duration is applied to every eligible phase whose start year matches the Service Year. Phase distinction remains visible in the guide planning table below.</p>' +
              '<div class=\"mt-4 grid grid-cols-1 xl:grid-cols-2 gap-3\">' +
                currentProject.positions.map(function (position) {
                  return (
                    '<label class=\"rounded-xl border border-slate-200 bg-slate-50 px-4 py-3\">' +
                      '<div class=\"flex items-center justify-between gap-4\">' +
                        '<span class=\"text-sm font-semibold text-slate-800\">' + escapeHtml(position) + '</span>' +
                        '<input data-fallback-guide-mobilisation-months data-project-key=\"' + escapeHtml(currentProject.projectKey) + '\" data-position=\"' + escapeHtml(position) + '\" type=\"number\" min=\"0\" step=\"1\" class=\"w-24 rounded-xl border-slate-200 px-3 py-2 text-right\" value=\"' + escapeHtml(String(toNumber(currentProject.workloadMonthsByPosition[position]) || 0)) + '\"/>' +
                      '</div>' +
                      '<p class=\"mt-2 text-xs text-slate-500\">Mobilization months applied to all eligible phases for this position.</p>' +
                    '</label>'
                  );
                }).join("") +
              '</div>' +
            '</details>';
        }

        materialsSelector.innerHTML = currentProject.eligiblePhases.length
          ? currentProject.materialCatalog.map(function (materialType) {
              return (
                '<label class=\"inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2\">' +
                  '<input type=\"checkbox\" data-fallback-guide-material-type=\"' + escapeHtml(materialType) + '\" data-project-key=\"' + escapeHtml(currentProject.projectKey) + '\" class=\"rounded border-slate-300 text-primary focus:ring-primary\" ' + (currentProject.selectedMaterialTypes.indexOf(materialType) >= 0 ? 'checked' : '') + '/>' +
                  '<span class=\"text-sm font-medium text-slate-700\">' + escapeHtml(materialType) + '</span>' +
                '</label>'
              );
            }).join("")
          : '<div class=\"rounded-xl border border-dashed border-slate-200 bg-white px-4 py-6 text-sm text-slate-500\">Materials mobilization is only available for phases starting in the Service Year.</div>';

        materialsTableBody.innerHTML = currentProject.generatedMaterialRows.length
          ? currentProject.generatedMaterialRows.map(function (row) {
              return (
                '<tr>' +
                  '<td class=\"py-3 pr-4 font-semibold\">' + escapeHtml(row.phaseLabel) + '</td>' +
                  '<td class=\"py-3 px-4 font-semibold\">' + escapeHtml(row.materialType) + '</td>' +
                  '<td class=\"py-3 px-4\"><div class=\"inline-flex items-center gap-2\"><span>' + escapeHtml(formatDateDisplay(row.startDate)) + '</span><button type=\"button\" data-fallback-guide-planning-material-edit=\"startDate\" data-project-key=\"' + escapeHtml(currentProject.projectKey) + '\" data-row-key=\"' + escapeHtml(row.rowKey) + '\" data-current-value=\"' + escapeHtml(row.startDate || '') + '\" class=\"inline-flex items-center justify-center size-7 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 transition-all\"><span class=\"material-symbols-outlined text-[16px]\">edit</span></button></div></td>' +
                  '<td class=\"py-3 px-4\"><div class=\"inline-flex items-center gap-2\"><span>' + escapeHtml(formatDateDisplay(row.endDate)) + '</span><button type=\"button\" data-fallback-guide-planning-material-edit=\"endDate\" data-project-key=\"' + escapeHtml(currentProject.projectKey) + '\" data-row-key=\"' + escapeHtml(row.rowKey) + '\" data-current-value=\"' + escapeHtml(row.endDate || '') + '\" class=\"inline-flex items-center justify-center size-7 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 transition-all\"><span class=\"material-symbols-outlined text-[16px]\">edit</span></button></div></td>' +
                  '<td class=\"py-3 pl-4\"><div class=\"inline-flex items-center gap-2\"><span class=\"font-mono text-xs\">' + escapeHtml(row.guidePlanningCode) + '</span><button type=\"button\" data-fallback-guide-planning-material-edit=\"guidePlanningCode\" data-project-key=\"' + escapeHtml(currentProject.projectKey) + '\" data-row-key=\"' + escapeHtml(row.rowKey) + '\" data-current-value=\"' + escapeHtml(row.guidePlanningCode || '') + '\" class=\"inline-flex items-center justify-center size-7 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 transition-all\"><span class=\"material-symbols-outlined text-[16px]\">edit</span></button></div></td>' +
                  '<td class=\"py-3 pl-4 text-slate-300\">--</td>' +
                '</tr>'
              );
            }).join("")
          : '';
        materialsTableBody.innerHTML += currentProject.customMaterialRows.map(function (row) {
          return '<tr class=\"bg-amber-50/60\">' +
            '<td class=\"py-3 pr-4\"><input data-fallback-guide-custom-row-field=\"phaseLabel\" data-row-type=\"materials\" data-project-key=\"' + escapeHtml(currentProject.projectKey) + '\" data-row-id=\"' + escapeHtml(row.id) + '\" type=\"text\" class=\"w-full min-w-[120px] rounded-xl border-slate-200 px-3 py-2\" value=\"' + escapeHtml(row.phaseLabel || '') + '\"/></td>' +
            '<td class=\"py-3 px-4\"><input data-fallback-guide-custom-row-field=\"materialType\" data-row-type=\"materials\" data-project-key=\"' + escapeHtml(currentProject.projectKey) + '\" data-row-id=\"' + escapeHtml(row.id) + '\" type=\"text\" class=\"w-full min-w-[120px] rounded-xl border-slate-200 px-3 py-2\" value=\"' + escapeHtml(row.materialType || '') + '\"/></td>' +
            '<td class=\"py-3 px-4\"><input data-fallback-guide-custom-row-field=\"startDate\" data-row-type=\"materials\" data-project-key=\"' + escapeHtml(currentProject.projectKey) + '\" data-row-id=\"' + escapeHtml(row.id) + '\" type=\"date\" class=\"rounded-xl border-slate-200 px-3 py-2\" value=\"' + escapeHtml(row.startDate || '') + '\"/></td>' +
            '<td class=\"py-3 px-4\"><input data-fallback-guide-custom-row-field=\"endDate\" data-row-type=\"materials\" data-project-key=\"' + escapeHtml(currentProject.projectKey) + '\" data-row-id=\"' + escapeHtml(row.id) + '\" type=\"date\" class=\"rounded-xl border-slate-200 px-3 py-2\" value=\"' + escapeHtml(row.endDate || '') + '\"/></td>' +
            '<td class=\"py-3 pl-4\"><input data-fallback-guide-custom-row-field=\"guidePlanningCode\" data-row-type=\"materials\" data-project-key=\"' + escapeHtml(currentProject.projectKey) + '\" data-row-id=\"' + escapeHtml(row.id) + '\" type=\"text\" class=\"w-full min-w-[180px] rounded-xl border-slate-200 px-3 py-2 font-mono text-xs\" value=\"' + escapeHtml(row.guidePlanningCode || '') + '\"/></td>' +
            '<td class=\"py-3 pl-4\"><button type=\"button\" data-fallback-guide-custom-row-remove=\"materials\" data-project-key=\"' + escapeHtml(currentProject.projectKey) + '\" data-row-id=\"' + escapeHtml(row.id) + '\" class=\"inline-flex items-center justify-center size-8 rounded-lg border border-rose-200 bg-white text-rose-600 hover:bg-rose-50 transition-all\"><span class=\"material-symbols-outlined text-[16px]\">delete</span></button></td>' +
          '</tr>';
        }).join("");
        if (!currentProject.generatedMaterialRows.length && !currentProject.customMaterialRows.length) {
          materialsTableBody.innerHTML = '<tr><td colspan=\"6\" class=\"py-6 text-center text-sm text-slate-500\">No materials mobilization selected for this project.</td></tr>';
        }

        subcontractingSelector.innerHTML = currentProject.eligiblePhases.length
          ? currentProject.subcontractingCatalog.map(function (subcontractingType) {
              return (
                '<label class=\"inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2\">' +
                  '<input type=\"checkbox\" data-fallback-guide-subcontracting-type=\"' + escapeHtml(subcontractingType) + '\" data-project-key=\"' + escapeHtml(currentProject.projectKey) + '\" class=\"rounded border-slate-300 text-primary focus:ring-primary\" ' + (currentProject.selectedSubcontractingTypes.indexOf(subcontractingType) >= 0 ? 'checked' : '') + '/>' +
                  '<span class=\"text-sm font-medium text-slate-700\">' + escapeHtml(subcontractingType) + '</span>' +
                '</label>'
              );
            }).join("")
          : '<div class=\"rounded-xl border border-dashed border-slate-200 bg-white px-4 py-6 text-sm text-slate-500\">Subcontracting mobilization is only available for phases starting in the Service Year.</div>';

        subcontractingTableBody.innerHTML = currentProject.generatedSubcontractingRows.length
          ? currentProject.generatedSubcontractingRows.map(function (row) {
              return (
                '<tr>' +
                  '<td class=\"py-3 pr-4 font-semibold\">' + escapeHtml(row.phaseLabel) + '</td>' +
                  '<td class=\"py-3 px-4 font-semibold\">' + escapeHtml(row.subcontractingType) + '</td>' +
                  '<td class=\"py-3 px-4\"><div class=\"inline-flex items-center gap-2\"><span>' + escapeHtml(formatDateDisplay(row.startDate)) + '</span><button type=\"button\" data-fallback-guide-planning-subcontracting-edit=\"startDate\" data-project-key=\"' + escapeHtml(currentProject.projectKey) + '\" data-row-key=\"' + escapeHtml(row.rowKey) + '\" data-current-value=\"' + escapeHtml(row.startDate || '') + '\" class=\"inline-flex items-center justify-center size-7 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 transition-all\"><span class=\"material-symbols-outlined text-[16px]\">edit</span></button></div></td>' +
                  '<td class=\"py-3 px-4\"><div class=\"inline-flex items-center gap-2\"><span>' + escapeHtml(formatDateDisplay(row.endDate)) + '</span><button type=\"button\" data-fallback-guide-planning-subcontracting-edit=\"endDate\" data-project-key=\"' + escapeHtml(currentProject.projectKey) + '\" data-row-key=\"' + escapeHtml(row.rowKey) + '\" data-current-value=\"' + escapeHtml(row.endDate || '') + '\" class=\"inline-flex items-center justify-center size-7 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 transition-all\"><span class=\"material-symbols-outlined text-[16px]\">edit</span></button></div></td>' +
                  '<td class=\"py-3 pl-4\"><div class=\"inline-flex items-center gap-2\"><span class=\"font-mono text-xs\">' + escapeHtml(row.guidePlanningCode) + '</span><button type=\"button\" data-fallback-guide-planning-subcontracting-edit=\"guidePlanningCode\" data-project-key=\"' + escapeHtml(currentProject.projectKey) + '\" data-row-key=\"' + escapeHtml(row.rowKey) + '\" data-current-value=\"' + escapeHtml(row.guidePlanningCode || '') + '\" class=\"inline-flex items-center justify-center size-7 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 transition-all\"><span class=\"material-symbols-outlined text-[16px]\">edit</span></button></div></td>' +
                  '<td class=\"py-3 pl-4 text-slate-300\">--</td>' +
                '</tr>'
              );
            }).join("")
          : '';
        subcontractingTableBody.innerHTML += currentProject.customSubcontractingRows.map(function (row) {
          return '<tr class=\"bg-amber-50/60\">' +
            '<td class=\"py-3 pr-4\"><input data-fallback-guide-custom-row-field=\"phaseLabel\" data-row-type=\"subcontracting\" data-project-key=\"' + escapeHtml(currentProject.projectKey) + '\" data-row-id=\"' + escapeHtml(row.id) + '\" type=\"text\" class=\"w-full min-w-[120px] rounded-xl border-slate-200 px-3 py-2\" value=\"' + escapeHtml(row.phaseLabel || '') + '\"/></td>' +
            '<td class=\"py-3 px-4\"><input data-fallback-guide-custom-row-field=\"subcontractingType\" data-row-type=\"subcontracting\" data-project-key=\"' + escapeHtml(currentProject.projectKey) + '\" data-row-id=\"' + escapeHtml(row.id) + '\" type=\"text\" class=\"w-full min-w-[150px] rounded-xl border-slate-200 px-3 py-2\" value=\"' + escapeHtml(row.subcontractingType || '') + '\"/></td>' +
            '<td class=\"py-3 px-4\"><input data-fallback-guide-custom-row-field=\"startDate\" data-row-type=\"subcontracting\" data-project-key=\"' + escapeHtml(currentProject.projectKey) + '\" data-row-id=\"' + escapeHtml(row.id) + '\" type=\"date\" class=\"rounded-xl border-slate-200 px-3 py-2\" value=\"' + escapeHtml(row.startDate || '') + '\"/></td>' +
            '<td class=\"py-3 px-4\"><input data-fallback-guide-custom-row-field=\"endDate\" data-row-type=\"subcontracting\" data-project-key=\"' + escapeHtml(currentProject.projectKey) + '\" data-row-id=\"' + escapeHtml(row.id) + '\" type=\"date\" class=\"rounded-xl border-slate-200 px-3 py-2\" value=\"' + escapeHtml(row.endDate || '') + '\"/></td>' +
            '<td class=\"py-3 pl-4\"><input data-fallback-guide-custom-row-field=\"guidePlanningCode\" data-row-type=\"subcontracting\" data-project-key=\"' + escapeHtml(currentProject.projectKey) + '\" data-row-id=\"' + escapeHtml(row.id) + '\" type=\"text\" class=\"w-full min-w-[180px] rounded-xl border-slate-200 px-3 py-2 font-mono text-xs\" value=\"' + escapeHtml(row.guidePlanningCode || '') + '\"/></td>' +
            '<td class=\"py-3 pl-4\"><button type=\"button\" data-fallback-guide-custom-row-remove=\"subcontracting\" data-project-key=\"' + escapeHtml(currentProject.projectKey) + '\" data-row-id=\"' + escapeHtml(row.id) + '\" class=\"inline-flex items-center justify-center size-8 rounded-lg border border-rose-200 bg-white text-rose-600 hover:bg-rose-50 transition-all\"><span class=\"material-symbols-outlined text-[16px]\">delete</span></button></td>' +
          '</tr>';
        }).join("");
        if (!currentProject.generatedSubcontractingRows.length && !currentProject.customSubcontractingRows.length) {
          subcontractingTableBody.innerHTML = '<tr><td colspan=\"6\" class=\"py-6 text-center text-sm text-slate-500\">No subcontracting mobilization selected for this project.</td></tr>';
        }

        workloadTableBody.innerHTML = currentProject.generatedRows.length
          ? currentProject.generatedRows.map(function (row) {
              return (
                '<tr>' +
                  '<td class=\"py-3 pr-4 font-semibold\">' + escapeHtml(row.phaseLabel) + '</td>' +
                  '<td class=\"py-3 px-4\">' + escapeHtml(row.position) + '</td>' +
                  '<td class=\"py-3 px-4\"><div class=\"inline-flex items-center gap-2\"><span>' + escapeHtml(formatDateDisplay(row.startDate)) + '</span><button type=\"button\" data-fallback-guide-planning-edit=\"startDate\" data-project-key=\"' + escapeHtml(currentProject.projectKey) + '\" data-row-key=\"' + escapeHtml(row.rowKey) + '\" data-current-value=\"' + escapeHtml(row.startDate || '') + '\" class=\"inline-flex items-center justify-center size-7 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 transition-all\"><span class=\"material-symbols-outlined text-[16px]\">edit</span></button></div></td>' +
                  '<td class=\"py-3 px-4\"><div class=\"inline-flex items-center gap-2\"><span>' + escapeHtml(formatDateDisplay(row.endDate)) + '</span><button type=\"button\" data-fallback-guide-planning-edit=\"endDate\" data-project-key=\"' + escapeHtml(currentProject.projectKey) + '\" data-row-key=\"' + escapeHtml(row.rowKey) + '\" data-current-value=\"' + escapeHtml(row.endDate || '') + '\" class=\"inline-flex items-center justify-center size-7 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 transition-all\"><span class=\"material-symbols-outlined text-[16px]\">edit</span></button></div></td>' +
                  '<td class=\"py-3 pl-4\"><div class=\"inline-flex items-center gap-2\"><span class=\"font-mono text-xs\">' + escapeHtml(row.guidePlanningCode) + '</span><button type=\"button\" data-fallback-guide-planning-edit=\"guidePlanningCode\" data-project-key=\"' + escapeHtml(currentProject.projectKey) + '\" data-row-key=\"' + escapeHtml(row.rowKey) + '\" data-current-value=\"' + escapeHtml(row.guidePlanningCode || '') + '\" class=\"inline-flex items-center justify-center size-7 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 transition-all\"><span class=\"material-symbols-outlined text-[16px]\">edit</span></button></div></td>' +
                  '<td class=\"py-3 pl-4 text-slate-300\">--</td>' +
                '</tr>'
              );
            }).join("")
          : '';
        workloadTableBody.innerHTML += currentProject.customWorkloadRows.map(function (row) {
          return '<tr class=\"bg-amber-50/60\">' +
            '<td class=\"py-3 pr-4\"><input data-fallback-guide-custom-row-field=\"phaseLabel\" data-row-type=\"workload\" data-project-key=\"' + escapeHtml(currentProject.projectKey) + '\" data-row-id=\"' + escapeHtml(row.id) + '\" type=\"text\" class=\"w-full min-w-[120px] rounded-xl border-slate-200 px-3 py-2\" value=\"' + escapeHtml(row.phaseLabel || '') + '\"/></td>' +
            '<td class=\"py-3 px-4\"><input data-fallback-guide-custom-row-field=\"position\" data-row-type=\"workload\" data-project-key=\"' + escapeHtml(currentProject.projectKey) + '\" data-row-id=\"' + escapeHtml(row.id) + '\" type=\"text\" class=\"w-full min-w-[140px] rounded-xl border-slate-200 px-3 py-2\" value=\"' + escapeHtml(row.position || '') + '\"/></td>' +
            '<td class=\"py-3 px-4\"><input data-fallback-guide-custom-row-field=\"startDate\" data-row-type=\"workload\" data-project-key=\"' + escapeHtml(currentProject.projectKey) + '\" data-row-id=\"' + escapeHtml(row.id) + '\" type=\"date\" class=\"rounded-xl border-slate-200 px-3 py-2\" value=\"' + escapeHtml(row.startDate || '') + '\"/></td>' +
            '<td class=\"py-3 px-4\"><input data-fallback-guide-custom-row-field=\"endDate\" data-row-type=\"workload\" data-project-key=\"' + escapeHtml(currentProject.projectKey) + '\" data-row-id=\"' + escapeHtml(row.id) + '\" type=\"date\" class=\"rounded-xl border-slate-200 px-3 py-2\" value=\"' + escapeHtml(row.endDate || '') + '\"/></td>' +
            '<td class=\"py-3 pl-4\"><input data-fallback-guide-custom-row-field=\"guidePlanningCode\" data-row-type=\"workload\" data-project-key=\"' + escapeHtml(currentProject.projectKey) + '\" data-row-id=\"' + escapeHtml(row.id) + '\" type=\"text\" class=\"w-full min-w-[180px] rounded-xl border-slate-200 px-3 py-2 font-mono text-xs\" value=\"' + escapeHtml(row.guidePlanningCode || '') + '\"/></td>' +
            '<td class=\"py-3 pl-4\"><button type=\"button\" data-fallback-guide-custom-row-remove=\"workload\" data-project-key=\"' + escapeHtml(currentProject.projectKey) + '\" data-row-id=\"' + escapeHtml(row.id) + '\" class=\"inline-flex items-center justify-center size-8 rounded-lg border border-rose-200 bg-white text-rose-600 hover:bg-rose-50 transition-all\"><span class=\"material-symbols-outlined text-[16px]\">delete</span></button></td>' +
          '</tr>';
        }).join("");
        if (!currentProject.generatedRows.length && !currentProject.customWorkloadRows.length) {
          workloadTableBody.innerHTML = '<tr><td colspan=\"6\" class=\"py-6 text-center text-sm text-slate-500\">No mobilization row generated yet. Enter months above to populate the guide planning table.</td></tr>';
        }

        if (recurrentPlaceholder) recurrentPlaceholder.innerHTML =
          '<div class="space-y-4">' +
            '<div class="rounded-2xl border border-slate-200 bg-white p-4">' +
              '<div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">' +
                '<div>' +
                  '<h3 class="text-sm font-bold text-slate-700">Workload</h3>' +
                  '<p class="mt-1 text-xs text-slate-500">Recurrent workload inherits the positions selected in Mobilization. One row is generated per phase, since all positions of the same phase share the same dates and guide planning code.</p>' +
                '</div>' +
                '<div class="text-xs font-medium text-slate-500">Recurrent Code ' + escapeHtml(currentProject.recurrentCode || "REC") + ' | ' + escapeHtml(String(currentProject.positions.length)) + ' inherited position(s)</div>' +
              '</div>' +
              (
                !currentProject.positions.length
                  ? '<div class="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">No positions available. Configure Mobilization / Cost Centers first.</div>'
                  : !currentProject.recurrentWorkloadRows.length
                    ? '<div class="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">No project phases available yet. Configure Project Phases first.</div>'
                    : '<details class="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4" open>' +
                        '<summary class="cursor-pointer text-sm font-bold text-slate-700">Recurrent Workload Guide Planning Table <span class="text-slate-400 font-medium">| ' + escapeHtml(String(currentProject.recurrentWorkloadRows.length)) + ' phase row(s)</span></summary>' +
                        '<div class="mt-4 flex justify-end"><button type="button" data-guide-custom-row-add="recurrent_workload" data-project-key="' + escapeHtml(currentProject.projectKey) + '" class="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-all"><span class="material-symbols-outlined text-[16px]">add</span>Add row</button></div>' +
                        '<div class="mt-4 overflow-x-auto">' +
                          '<table class="min-w-full text-sm">' +
                            '<thead class="bg-slate-100 text-slate-600">' +
                              '<tr>' +
                                '<th class="text-left py-3 px-4">Phase</th>' +
                                '<th class="text-left py-3 px-4">Start date</th>' +
                                '<th class="text-left py-3 px-4">End date</th>' +
                                '<th class="text-left py-3 px-4">Guide planning code</th>' +
                                '<th class="text-left py-3 px-4">Actions</th>' +
                              '</tr>' +
                            '</thead>' +
                            '<tbody class="divide-y divide-slate-200">' +
                              currentProject.recurrentWorkloadRows.map(function (row) {
                                return '<tr>' +
                                  '<td class="py-3 px-4 font-semibold">' + escapeHtml(row.phaseLabel) + '</td>' +
                                  '<td class="py-3 px-4"><div class="inline-flex items-center gap-2"><span>' + escapeHtml(formatDateDisplay(row.startDate)) + '</span><button type="button" data-fallback-guide-planning-edit="startDate" data-project-key="' + escapeHtml(currentProject.projectKey) + '" data-row-key="' + escapeHtml(row.rowKey) + '" data-current-value="' + escapeHtml(row.startDate || '') + '" class="inline-flex items-center justify-center size-7 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 transition-all"><span class="material-symbols-outlined text-[16px]">edit</span></button></div></td>' +
                                  '<td class="py-3 px-4"><div class="inline-flex items-center gap-2"><span>' + escapeHtml(formatDateDisplay(row.endDate)) + '</span><button type="button" data-fallback-guide-planning-edit="endDate" data-project-key="' + escapeHtml(currentProject.projectKey) + '" data-row-key="' + escapeHtml(row.rowKey) + '" data-current-value="' + escapeHtml(row.endDate || '') + '" class="inline-flex items-center justify-center size-7 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 transition-all"><span class="material-symbols-outlined text-[16px]">edit</span></button></div></td>' +
                                  '<td class="py-3 px-4"><div class="inline-flex items-center gap-2"><span class="font-mono text-xs">' + escapeHtml(row.guidePlanningCode) + '</span><button type="button" data-fallback-guide-planning-edit="guidePlanningCode" data-project-key="' + escapeHtml(currentProject.projectKey) + '" data-row-key="' + escapeHtml(row.rowKey) + '" data-current-value="' + escapeHtml(row.guidePlanningCode || '') + '" class="inline-flex items-center justify-center size-7 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 transition-all"><span class="material-symbols-outlined text-[16px]">edit</span></button></div></td>' +
                                  '<td class="py-3 px-4 text-slate-300">--</td>' +
                                '</tr>';
                              }).join('') +
                              currentProject.customRecurrentWorkloadRows.map(function (row) {
                                return '<tr class="bg-amber-50/60">' +
                                  '<td class="py-3 px-4"><input data-fallback-guide-custom-row-field="phaseLabel" data-row-type="recurrent_workload" data-project-key="' + escapeHtml(currentProject.projectKey) + '" data-row-id="' + escapeHtml(row.id) + '" type="text" class="w-full min-w-[120px] rounded-xl border-slate-200 px-3 py-2" value="' + escapeHtml(row.phaseLabel || '') + '"/></td>' +
                                  '<td class="py-3 px-4"><input data-fallback-guide-custom-row-field="startDate" data-row-type="recurrent_workload" data-project-key="' + escapeHtml(currentProject.projectKey) + '" data-row-id="' + escapeHtml(row.id) + '" type="date" class="rounded-xl border-slate-200 px-3 py-2" value="' + escapeHtml(row.startDate || '') + '"/></td>' +
                                  '<td class="py-3 px-4"><input data-fallback-guide-custom-row-field="endDate" data-row-type="recurrent_workload" data-project-key="' + escapeHtml(currentProject.projectKey) + '" data-row-id="' + escapeHtml(row.id) + '" type="date" class="rounded-xl border-slate-200 px-3 py-2" value="' + escapeHtml(row.endDate || '') + '"/></td>' +
                                  '<td class="py-3 px-4"><input data-fallback-guide-custom-row-field="guidePlanningCode" data-row-type="recurrent_workload" data-project-key="' + escapeHtml(currentProject.projectKey) + '" data-row-id="' + escapeHtml(row.id) + '" type="text" class="w-full min-w-[180px] rounded-xl border-slate-200 px-3 py-2 font-mono text-xs" value="' + escapeHtml(row.guidePlanningCode || '') + '"/></td>' +
                                  '<td class="py-3 px-4"><button type="button" data-fallback-guide-custom-row-remove="recurrent_workload" data-project-key="' + escapeHtml(currentProject.projectKey) + '" data-row-id="' + escapeHtml(row.id) + '" class="inline-flex items-center justify-center size-8 rounded-lg border border-rose-200 bg-white text-rose-600 hover:bg-rose-50 transition-all"><span class="material-symbols-outlined text-[16px]">delete</span></button></td>' +
                                '</tr>';
                              }).join('') +
                            '</tbody>' +
                          '</table>' +
                        '</div>' +
                      '</details>'
              ) +
            '</div>' +
            '<div class="rounded-2xl border border-slate-200 bg-white p-4">' +
              '<h3 class="text-sm font-bold text-slate-700">Materials</h3>' +
              '<div class="mt-4 space-y-4">' +
                '<details class="rounded-2xl border border-slate-200 bg-slate-50 p-4" open>' +
                  '<summary class="cursor-pointer text-sm font-bold text-slate-700">Recurrent Material Types</summary>' +
                  '<label class="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">' +
                    '<input type="checkbox" data-fallback-guide-recurrent-material-toggle-all data-project-key="' + escapeHtml(currentProject.projectKey) + '" class="rounded border-slate-300 text-primary focus:ring-primary" ' + (currentProject.recurrentMaterialCatalog.length && currentProject.selectedRecurrentMaterialTypes.length === currentProject.recurrentMaterialCatalog.length ? 'checked' : '') + '/>' +
                    '<span class="text-sm font-semibold text-slate-700">Select all</span>' +
                  '</label>' +
                  '<div class="mt-4 flex flex-wrap gap-3">' +
                    currentProject.recurrentMaterialCatalog.map(function (materialType) {
                      return '<label class="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">' +
                        '<input type="checkbox" data-fallback-guide-recurrent-material-type="' + escapeHtml(materialType) + '" data-project-key="' + escapeHtml(currentProject.projectKey) + '" class="rounded border-slate-300 text-primary focus:ring-primary" ' + (currentProject.selectedRecurrentMaterialTypes.indexOf(materialType) >= 0 ? 'checked' : '') + '/>' +
                        '<span class="text-sm font-medium text-slate-700">' + escapeHtml(materialType) + '</span>' +
                      '</label>';
                    }).join('') +
                  '</div>' +
                '</details>' +
                '<details class="rounded-2xl border border-slate-200 bg-slate-50 p-4" open>' +
                  '<summary class="cursor-pointer text-sm font-bold text-slate-700">Recurrent Materials Guide Planning Table <span class="text-slate-400 font-medium">| ' + escapeHtml(String(currentProject.recurrentMaterialRows.length)) + ' row(s)</span></summary>' +
                  '<div class="mt-4 flex justify-end"><button type="button" data-guide-custom-row-add="recurrent_materials" data-project-key="' + escapeHtml(currentProject.projectKey) + '" class="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-all"><span class="material-symbols-outlined text-[16px]">add</span>Add row</button></div>' +
                  '<div class="mt-4 overflow-x-auto">' +
                    '<table class="min-w-full text-sm">' +
                      '<thead class="bg-slate-100 text-slate-600">' +
                        '<tr>' +
                          '<th class="text-left py-3 px-4">Phase</th>' +
                          '<th class="text-left py-3 px-4">Material type</th>' +
                          '<th class="text-left py-3 px-4">Start date</th>' +
                          '<th class="text-left py-3 px-4">End date</th>' +
                          '<th class="text-left py-3 px-4">Guide planning code</th>' +
                          '<th class="text-left py-3 px-4">Actions</th>' +
                        '</tr>' +
                      '</thead>' +
                      '<tbody class="divide-y divide-slate-200">' +
                        (
                          currentProject.recurrentMaterialRows.length
                            ? currentProject.recurrentMaterialRows.map(function (row) {
                                return '<tr>' +
                                  '<td class="py-3 px-4 font-semibold">' + escapeHtml(row.phaseLabel) + '</td>' +
                                  '<td class="py-3 px-4">' + escapeHtml(row.materialType) + '</td>' +
                                  '<td class="py-3 px-4"><div class="inline-flex items-center gap-2"><span>' + escapeHtml(formatDateDisplay(row.startDate)) + '</span><button type="button" data-fallback-guide-planning-material-edit="startDate" data-project-key="' + escapeHtml(currentProject.projectKey) + '" data-row-key="' + escapeHtml(row.rowKey) + '" data-current-value="' + escapeHtml(row.startDate || '') + '" class="inline-flex items-center justify-center size-7 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 transition-all"><span class="material-symbols-outlined text-[16px]">edit</span></button></div></td>' +
                                  '<td class="py-3 px-4"><div class="inline-flex items-center gap-2"><span>' + escapeHtml(formatDateDisplay(row.endDate)) + '</span><button type="button" data-fallback-guide-planning-material-edit="endDate" data-project-key="' + escapeHtml(currentProject.projectKey) + '" data-row-key="' + escapeHtml(row.rowKey) + '" data-current-value="' + escapeHtml(row.endDate || '') + '" class="inline-flex items-center justify-center size-7 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 transition-all"><span class="material-symbols-outlined text-[16px]">edit</span></button></div></td>' +
                                  '<td class="py-3 px-4"><div class="inline-flex items-center gap-2"><span class="font-mono text-xs">' + escapeHtml(row.guidePlanningCode) + '</span><button type="button" data-fallback-guide-planning-material-edit="guidePlanningCode" data-project-key="' + escapeHtml(currentProject.projectKey) + '" data-row-key="' + escapeHtml(row.rowKey) + '" data-current-value="' + escapeHtml(row.guidePlanningCode || '') + '" class="inline-flex items-center justify-center size-7 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 transition-all"><span class="material-symbols-outlined text-[16px]">edit</span></button></div></td>' +
                                  '<td class="py-3 px-4 text-slate-300">--</td>' +
                                '</tr>';
                              }).join('')
                            + currentProject.customRecurrentMaterialRows.map(function (row) {
                                return '<tr class="bg-amber-50/60">' +
                                  '<td class="py-3 px-4"><input data-fallback-guide-custom-row-field="phaseLabel" data-row-type="recurrent_materials" data-project-key="' + escapeHtml(currentProject.projectKey) + '" data-row-id="' + escapeHtml(row.id) + '" type="text" class="w-full min-w-[120px] rounded-xl border-slate-200 px-3 py-2" value="' + escapeHtml(row.phaseLabel || '') + '"/></td>' +
                                  '<td class="py-3 px-4"><input data-fallback-guide-custom-row-field="materialType" data-row-type="recurrent_materials" data-project-key="' + escapeHtml(currentProject.projectKey) + '" data-row-id="' + escapeHtml(row.id) + '" type="text" class="w-full min-w-[140px] rounded-xl border-slate-200 px-3 py-2" value="' + escapeHtml(row.materialType || '') + '"/></td>' +
                                  '<td class="py-3 px-4"><input data-fallback-guide-custom-row-field="startDate" data-row-type="recurrent_materials" data-project-key="' + escapeHtml(currentProject.projectKey) + '" data-row-id="' + escapeHtml(row.id) + '" type="date" class="rounded-xl border-slate-200 px-3 py-2" value="' + escapeHtml(row.startDate || '') + '"/></td>' +
                                  '<td class="py-3 px-4"><input data-fallback-guide-custom-row-field="endDate" data-row-type="recurrent_materials" data-project-key="' + escapeHtml(currentProject.projectKey) + '" data-row-id="' + escapeHtml(row.id) + '" type="date" class="rounded-xl border-slate-200 px-3 py-2" value="' + escapeHtml(row.endDate || '') + '"/></td>' +
                                  '<td class="py-3 px-4"><input data-fallback-guide-custom-row-field="guidePlanningCode" data-row-type="recurrent_materials" data-project-key="' + escapeHtml(currentProject.projectKey) + '" data-row-id="' + escapeHtml(row.id) + '" type="text" class="w-full min-w-[180px] rounded-xl border-slate-200 px-3 py-2 font-mono text-xs" value="' + escapeHtml(row.guidePlanningCode || '') + '"/></td>' +
                                  '<td class="py-3 px-4"><button type="button" data-fallback-guide-custom-row-remove="recurrent_materials" data-project-key="' + escapeHtml(currentProject.projectKey) + '" data-row-id="' + escapeHtml(row.id) + '" class="inline-flex items-center justify-center size-8 rounded-lg border border-rose-200 bg-white text-rose-600 hover:bg-rose-50 transition-all"><span class="material-symbols-outlined text-[16px]">delete</span></button></td>' +
                                '</tr>';
                              }).join('')
                            : '<tr><td colspan="6" class="py-6 text-center text-sm text-slate-500">No recurrent material row generated yet. Select at least one material type.</td></tr>'
                        ) +
                      '</tbody>' +
                    '</table>' +
                  '</div>' +
                '</details>' +
              '</div>' +
            '</div>' +
            '<div class="rounded-2xl border border-slate-200 bg-white p-4">' +
              '<h3 class="text-sm font-bold text-slate-700">Subcontracting Activities</h3>' +
              '<div class="mt-4 space-y-4">' +
                '<details class="rounded-2xl border border-slate-200 bg-slate-50 p-4" open>' +
                  '<summary class="cursor-pointer text-sm font-bold text-slate-700">Applicable Subcontracting Types</summary>' +
                  '<label class="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">' +
                    '<input type="checkbox" data-fallback-guide-recurrent-subcontracting-toggle-all data-project-key="' + escapeHtml(currentProject.projectKey) + '" class="rounded border-slate-300 text-primary focus:ring-primary" ' + (currentProject.recurrentSubcontractingCatalog.length && currentProject.selectedRecurrentSubcontractingTypes.length === currentProject.recurrentSubcontractingCatalog.length ? 'checked' : '') + '/>' +
                    '<span class="text-sm font-semibold text-slate-700">Select all</span>' +
                  '</label>' +
                  '<div class="mt-4 flex flex-wrap gap-3">' +
                    currentProject.recurrentSubcontractingCatalog.map(function (subcontractingType) {
                      return '<label class="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">' +
                        '<input type="checkbox" data-fallback-guide-recurrent-subcontracting-type="' + escapeHtml(subcontractingType) + '" data-project-key="' + escapeHtml(currentProject.projectKey) + '" class="rounded border-slate-300 text-primary focus:ring-primary" ' + (currentProject.selectedRecurrentSubcontractingTypes.indexOf(subcontractingType) >= 0 ? 'checked' : '') + '/>' +
                        '<span class="text-sm font-medium text-slate-700">' + escapeHtml(subcontractingType) + '</span>' +
                      '</label>';
                    }).join('') +
                  '</div>' +
                '</details>' +
                '<details class="rounded-2xl border border-slate-200 bg-slate-50 p-4" open>' +
                  '<summary class="cursor-pointer text-sm font-bold text-slate-700">Subcontracting Reccurent Guide Planning Table <span class="text-slate-400 font-medium">| ' + escapeHtml(String(currentProject.recurrentSubcontractingRows.length)) + ' row(s)</span></summary>' +
                  '<div class="mt-4 flex justify-end"><button type="button" data-guide-custom-row-add="recurrent_subcontracting" data-project-key="' + escapeHtml(currentProject.projectKey) + '" class="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-all"><span class="material-symbols-outlined text-[16px]">add</span>Add row</button></div>' +
                  '<div class="mt-4 overflow-x-auto">' +
                    '<table class="min-w-full text-sm">' +
                      '<thead class="bg-slate-100 text-slate-600">' +
                        '<tr>' +
                          '<th class="text-left py-3 px-4">Phase</th>' +
                          '<th class="text-left py-3 px-4">Subcontracting Type</th>' +
                          '<th class="text-left py-3 px-4">Start date</th>' +
                          '<th class="text-left py-3 px-4">End date</th>' +
                          '<th class="text-left py-3 px-4">Guide planning code</th>' +
                          '<th class="text-left py-3 px-4">Actions</th>' +
                        '</tr>' +
                      '</thead>' +
                      '<tbody class="divide-y divide-slate-200">' +
                        (
                          currentProject.recurrentSubcontractingRows.length
                            ? currentProject.recurrentSubcontractingRows.map(function (row) {
                                return '<tr>' +
                                  '<td class="py-3 px-4 font-semibold">' + escapeHtml(row.phaseLabel) + '</td>' +
                                  '<td class="py-3 px-4">' + escapeHtml(row.subcontractingType) + '</td>' +
                                  '<td class="py-3 px-4"><div class="inline-flex items-center gap-2"><span>' + escapeHtml(formatDateDisplay(row.startDate)) + '</span><button type="button" data-fallback-guide-planning-subcontracting-edit="startDate" data-project-key="' + escapeHtml(currentProject.projectKey) + '" data-row-key="' + escapeHtml(row.rowKey) + '" data-current-value="' + escapeHtml(row.startDate || '') + '" class="inline-flex items-center justify-center size-7 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 transition-all"><span class="material-symbols-outlined text-[16px]">edit</span></button></div></td>' +
                                  '<td class="py-3 px-4"><div class="inline-flex items-center gap-2"><span>' + escapeHtml(formatDateDisplay(row.endDate)) + '</span><button type="button" data-fallback-guide-planning-subcontracting-edit="endDate" data-project-key="' + escapeHtml(currentProject.projectKey) + '" data-row-key="' + escapeHtml(row.rowKey) + '" data-current-value="' + escapeHtml(row.endDate || '') + '" class="inline-flex items-center justify-center size-7 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 transition-all"><span class="material-symbols-outlined text-[16px]">edit</span></button></div></td>' +
                                  '<td class="py-3 px-4"><div class="inline-flex items-center gap-2"><span class="font-mono text-xs">' + escapeHtml(row.guidePlanningCode) + '</span><button type="button" data-fallback-guide-planning-subcontracting-edit="guidePlanningCode" data-project-key="' + escapeHtml(currentProject.projectKey) + '" data-row-key="' + escapeHtml(row.rowKey) + '" data-current-value="' + escapeHtml(row.guidePlanningCode || '') + '" class="inline-flex items-center justify-center size-7 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 transition-all"><span class="material-symbols-outlined text-[16px]">edit</span></button></div></td>' +
                                  '<td class="py-3 px-4 text-slate-300">--</td>' +
                                '</tr>';
                              }).join('')
                            + currentProject.customRecurrentSubcontractingRows.map(function (row) {
                                return '<tr class="bg-amber-50/60">' +
                                  '<td class="py-3 px-4"><input data-fallback-guide-custom-row-field="phaseLabel" data-row-type="recurrent_subcontracting" data-project-key="' + escapeHtml(currentProject.projectKey) + '" data-row-id="' + escapeHtml(row.id) + '" type="text" class="w-full min-w-[120px] rounded-xl border-slate-200 px-3 py-2" value="' + escapeHtml(row.phaseLabel || '') + '"/></td>' +
                                  '<td class="py-3 px-4"><input data-fallback-guide-custom-row-field="subcontractingType" data-row-type="recurrent_subcontracting" data-project-key="' + escapeHtml(currentProject.projectKey) + '" data-row-id="' + escapeHtml(row.id) + '" type="text" class="w-full min-w-[160px] rounded-xl border-slate-200 px-3 py-2" value="' + escapeHtml(row.subcontractingType || '') + '"/></td>' +
                                  '<td class="py-3 px-4"><input data-fallback-guide-custom-row-field="startDate" data-row-type="recurrent_subcontracting" data-project-key="' + escapeHtml(currentProject.projectKey) + '" data-row-id="' + escapeHtml(row.id) + '" type="date" class="rounded-xl border-slate-200 px-3 py-2" value="' + escapeHtml(row.startDate || '') + '"/></td>' +
                                  '<td class="py-3 px-4"><input data-fallback-guide-custom-row-field="endDate" data-row-type="recurrent_subcontracting" data-project-key="' + escapeHtml(currentProject.projectKey) + '" data-row-id="' + escapeHtml(row.id) + '" type="date" class="rounded-xl border-slate-200 px-3 py-2" value="' + escapeHtml(row.endDate || '') + '"/></td>' +
                                  '<td class="py-3 px-4"><input data-fallback-guide-custom-row-field="guidePlanningCode" data-row-type="recurrent_subcontracting" data-project-key="' + escapeHtml(currentProject.projectKey) + '" data-row-id="' + escapeHtml(row.id) + '" type="text" class="w-full min-w-[180px] rounded-xl border-slate-200 px-3 py-2 font-mono text-xs" value="' + escapeHtml(row.guidePlanningCode || '') + '"/></td>' +
                                  '<td class="py-3 px-4"><button type="button" data-fallback-guide-custom-row-remove="recurrent_subcontracting" data-project-key="' + escapeHtml(currentProject.projectKey) + '" data-row-id="' + escapeHtml(row.id) + '" class="inline-flex items-center justify-center size-8 rounded-lg border border-rose-200 bg-white text-rose-600 hover:bg-rose-50 transition-all"><span class="material-symbols-outlined text-[16px]">delete</span></button></td>' +
                                '</tr>';
                              }).join('')
                            : '<tr><td colspan="6" class="py-6 text-center text-sm text-slate-500">No recurrent subcontracting row generated yet. Select at least one subcontracting type.</td></tr>'
                        ) +
                      '</tbody>' +
                    '</table>' +
                  '</div>' +
                '</details>' +
              '</div>' +
            '</div>' +
          '</div>';
        if (demobilisationPlaceholder) demobilisationPlaceholder.innerHTML =
          '<div class="space-y-4">' +
            '<div class="rounded-2xl border border-slate-200 bg-white p-4">' +
              '<div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">' +
                '<div>' +
                  '<h3 class="text-sm font-bold text-slate-700">Workload</h3>' +
                  '<p class="mt-1 text-xs text-slate-500">Define one demobilization duration per position. It will be applied only to phases whose end year matches the last year of the project.</p>' +
                '</div>' +
                '<div class="text-xs font-medium text-slate-500">Demobilisation Code ' + escapeHtml(currentProject.demobilisationCode || 'DEM') + ' | Project end ' + escapeHtml(formatDateDisplay(currentProject.endOfProjectDate)) + '</div>' +
              '</div>' +
              (
                !currentProject.positions.length
                  ? '<div class="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">No applicable positions found yet. Configure positions first in Cost Centers Workspace.</div>'
                  : !currentProject.demobilizationEligiblePhases.length
                    ? '<div class="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">No phase ends in the last year of the project. Check Project Phases Workspace.</div>'
                    : (
                        '<details class="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4" open>' +
                          '<summary class="cursor-pointer text-sm font-bold text-slate-700">Applicable Positions <span class="text-slate-400 font-medium">| Applied to ' + escapeHtml(String(currentProject.demobilizationEligiblePhases.length)) + ' phase(s)</span></summary>' +
                          '<div class="mt-4 grid grid-cols-1 xl:grid-cols-2 gap-3">' +
                            currentProject.positions.map(function (position) {
                              return (
                                '<label class="rounded-xl border border-slate-200 bg-white px-4 py-3">' +
                                  '<div class="flex items-center justify-between gap-4">' +
                                    '<span class="text-sm font-semibold text-slate-800">' + escapeHtml(position) + '</span>' +
                                    '<input data-fallback-guide-demobilisation-months data-project-key="' + escapeHtml(currentProject.projectKey) + '" data-position="' + escapeHtml(position) + '" type="number" min="0" step="1" class="w-24 rounded-xl border-slate-200 px-3 py-2 text-right" value="' + escapeHtml(String(toNumber(currentProject.demobilizationWorkloadMonthsByPosition[position]) || 0)) + '"/>' +
                                  '</div>' +
                                  '<p class="mt-2 text-xs text-slate-500">Demobilization months applied to every eligible end-of-project phase for this position.</p>' +
                                '</label>'
                              );
                            }).join('') +
                          '</div>' +
                        '</details>' +
                        '<details class="rounded-2xl border border-slate-200 bg-slate-50 p-4" open>' +
                          '<summary class="cursor-pointer text-sm font-bold text-slate-700">Demobilization Workload Guide Planning Table <span class="text-slate-400 font-medium">| ' + escapeHtml(String(currentProject.generatedDemobilizationRows.length)) + ' row(s)</span></summary>' +
                          '<div class="mt-4 flex justify-end"><button type="button" data-guide-custom-row-add="demobilization_workload" data-project-key="' + escapeHtml(currentProject.projectKey) + '" class="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-all"><span class="material-symbols-outlined text-[16px]">add</span>Add row</button></div>' +
                          '<div class="mt-4 overflow-x-auto">' +
                            '<table class="min-w-full text-sm">' +
                              '<thead class="bg-slate-100 text-slate-600">' +
                                '<tr>' +
                                  '<th class="text-left py-3 px-4">Phase</th>' +
                                  '<th class="text-left py-3 px-4">Position</th>' +
                                  '<th class="text-left py-3 px-4">Start date</th>' +
                                  '<th class="text-left py-3 px-4">End date</th>' +
                                  '<th class="text-left py-3 px-4">Guide planning code</th>' +
                                  '<th class="text-left py-3 px-4">Actions</th>' +
                                '</tr>' +
                              '</thead>' +
                              '<tbody class="divide-y divide-slate-200">' +
                                (
                                  currentProject.generatedDemobilizationRows.length
                                    ? currentProject.generatedDemobilizationRows.map(function (row) {
                                        return (
                                          '<tr>' +
                                            '<td class="py-3 px-4 font-semibold">' + escapeHtml(row.phaseLabel) + '</td>' +
                                            '<td class="py-3 px-4">' + escapeHtml(row.position) + '</td>' +
                                            '<td class="py-3 px-4"><div class="inline-flex items-center gap-2"><span>' + escapeHtml(formatDateDisplay(row.startDate)) + '</span><button type="button" data-fallback-guide-planning-edit="startDate" data-project-key="' + escapeHtml(currentProject.projectKey) + '" data-row-key="' + escapeHtml(row.rowKey) + '" data-current-value="' + escapeHtml(row.startDate || '') + '" class="inline-flex items-center justify-center size-7 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 transition-all"><span class="material-symbols-outlined text-[16px]">edit</span></button></div></td>' +
                                            '<td class="py-3 px-4"><div class="inline-flex items-center gap-2"><span>' + escapeHtml(formatDateDisplay(row.endDate)) + '</span><button type="button" data-fallback-guide-planning-edit="endDate" data-project-key="' + escapeHtml(currentProject.projectKey) + '" data-row-key="' + escapeHtml(row.rowKey) + '" data-current-value="' + escapeHtml(row.endDate || '') + '" class="inline-flex items-center justify-center size-7 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 transition-all"><span class="material-symbols-outlined text-[16px]">edit</span></button></div></td>' +
                                            '<td class="py-3 px-4"><div class="inline-flex items-center gap-2"><span class="font-mono text-xs">' + escapeHtml(row.guidePlanningCode) + '</span><button type="button" data-fallback-guide-planning-edit="guidePlanningCode" data-project-key="' + escapeHtml(currentProject.projectKey) + '" data-row-key="' + escapeHtml(row.rowKey) + '" data-current-value="' + escapeHtml(row.guidePlanningCode || '') + '" class="inline-flex items-center justify-center size-7 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 transition-all"><span class="material-symbols-outlined text-[16px]">edit</span></button></div></td>' +
                                            '<td class="py-3 px-4 text-slate-300">--</td>' +
                                          '</tr>'
                                        );
                                      }).join('')
                                    : ''
                                ) +
                                currentProject.customDemobilizationWorkloadRows.map(function (row) {
                                  return '<tr class="bg-amber-50/60">' +
                                    '<td class="py-3 px-4"><input data-fallback-guide-custom-row-field="phaseLabel" data-row-type="demobilization_workload" data-project-key="' + escapeHtml(currentProject.projectKey) + '" data-row-id="' + escapeHtml(row.id) + '" type="text" class="w-full min-w-[120px] rounded-xl border-slate-200 px-3 py-2" value="' + escapeHtml(row.phaseLabel || '') + '"/></td>' +
                                    '<td class="py-3 px-4"><input data-fallback-guide-custom-row-field="position" data-row-type="demobilization_workload" data-project-key="' + escapeHtml(currentProject.projectKey) + '" data-row-id="' + escapeHtml(row.id) + '" type="text" class="w-full min-w-[140px] rounded-xl border-slate-200 px-3 py-2" value="' + escapeHtml(row.position || '') + '"/></td>' +
                                    '<td class="py-3 px-4"><input data-fallback-guide-custom-row-field="startDate" data-row-type="demobilization_workload" data-project-key="' + escapeHtml(currentProject.projectKey) + '" data-row-id="' + escapeHtml(row.id) + '" type="date" class="rounded-xl border-slate-200 px-3 py-2" value="' + escapeHtml(row.startDate || '') + '"/></td>' +
                                    '<td class="py-3 px-4"><input data-fallback-guide-custom-row-field="endDate" data-row-type="demobilization_workload" data-project-key="' + escapeHtml(currentProject.projectKey) + '" data-row-id="' + escapeHtml(row.id) + '" type="date" class="rounded-xl border-slate-200 px-3 py-2" value="' + escapeHtml(row.endDate || '') + '"/></td>' +
                                    '<td class="py-3 px-4"><input data-fallback-guide-custom-row-field="guidePlanningCode" data-row-type="demobilization_workload" data-project-key="' + escapeHtml(currentProject.projectKey) + '" data-row-id="' + escapeHtml(row.id) + '" type="text" class="w-full min-w-[180px] rounded-xl border-slate-200 px-3 py-2 font-mono text-xs" value="' + escapeHtml(row.guidePlanningCode || '') + '"/></td>' +
                                    '<td class="py-3 px-4"><button type="button" data-fallback-guide-custom-row-remove="demobilization_workload" data-project-key="' + escapeHtml(currentProject.projectKey) + '" data-row-id="' + escapeHtml(row.id) + '" class="inline-flex items-center justify-center size-8 rounded-lg border border-rose-200 bg-white text-rose-600 hover:bg-rose-50 transition-all"><span class="material-symbols-outlined text-[16px]">delete</span></button></td>' +
                                  '</tr>';
                                }).join('') +
                                (!currentProject.generatedDemobilizationRows.length && !currentProject.customDemobilizationWorkloadRows.length
                                  ? '<tr><td colspan="6" class="py-6 text-center text-sm text-slate-500">No demobilization workload row generated yet. Enter months above to populate the table.</td></tr>'
                                  : '') +
                              '</tbody>' +
                            '</table>' +
                          '</div>' +
                        '</details>'
                      )
              ) +
            '</div>' +
            '<div class="rounded-2xl border border-slate-200 bg-white p-4">' +
              '<h3 class="text-sm font-bold text-slate-700">Materials</h3>' +
              (
                !currentProject.demobilizationEligiblePhases.length
                  ? '<div class="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">No phase ends in the last year of the project. Check Project Phases Workspace.</div>'
                  : '<div class="mt-4 space-y-4">' +
                      '<details class="rounded-2xl border border-slate-200 bg-slate-50 p-4" open>' +
                        '<summary class="cursor-pointer text-sm font-bold text-slate-700">Demobilisation Material Types</summary>' +
                        '<div class="mt-4 grid grid-cols-1 xl:grid-cols-2 gap-3">' +
                          currentProject.demobilizationMaterialCatalog.map(function (materialType) {
                            return (
                              '<label class="rounded-xl border border-slate-200 bg-white px-4 py-3">' +
                                '<div class="flex items-center justify-between gap-4">' +
                                  '<span class="text-sm font-semibold text-slate-800">' + escapeHtml(materialType) + '</span>' +
                                  '<input data-fallback-guide-demobilisation-material-months data-project-key="' + escapeHtml(currentProject.projectKey) + '" data-material-type="' + escapeHtml(materialType) + '" type="number" min="0" step="1" class="w-24 rounded-xl border-slate-200 px-3 py-2 text-right" value="' + escapeHtml(String(toNumber(currentProject.demobilizationMaterialMonthsByType[materialType]) || 0)) + '"/>' +
                                '</div>' +
                                '<p class="mt-2 text-xs text-slate-500">Set the demobilization duration in months for this material type.</p>' +
                              '</label>'
                            );
                          }).join('') +
                        '</div>' +
                      '</details>' +
                      '<details class="rounded-2xl border border-slate-200 bg-slate-50 p-4" open>' +
                        '<summary class="cursor-pointer text-sm font-bold text-slate-700">Demobilization Materials Guide Planning Table <span class="text-slate-400 font-medium">| ' + escapeHtml(String(currentProject.generatedDemobilizationMaterialRows.length)) + ' row(s)</span></summary>' +
                        '<div class="mt-4 flex justify-end"><button type="button" data-guide-custom-row-add="demobilization_materials" data-project-key="' + escapeHtml(currentProject.projectKey) + '" class="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-all"><span class="material-symbols-outlined text-[16px]">add</span>Add row</button></div>' +
                        '<div class="mt-4 overflow-x-auto">' +
                          '<table class="min-w-full text-sm">' +
                            '<thead class="bg-slate-100 text-slate-600">' +
                              '<tr>' +
                                '<th class="text-left py-3 px-4">Phase</th>' +
                                '<th class="text-left py-3 px-4">Material type</th>' +
                                '<th class="text-left py-3 px-4">Start date</th>' +
                                '<th class="text-left py-3 px-4">End date</th>' +
                                '<th class="text-left py-3 px-4">Guide planning code</th>' +
                                '<th class="text-left py-3 px-4">Actions</th>' +
                              '</tr>' +
                            '</thead>' +
                            '<tbody class="divide-y divide-slate-200">' +
                              (
                                currentProject.generatedDemobilizationMaterialRows.length
                                  ? currentProject.generatedDemobilizationMaterialRows.map(function (row) {
                                      return (
                                        '<tr>' +
                                          '<td class="py-3 px-4 font-semibold">' + escapeHtml(row.phaseLabel) + '</td>' +
                                          '<td class="py-3 px-4">' + escapeHtml(row.materialType) + '</td>' +
                                          '<td class="py-3 px-4"><div class="inline-flex items-center gap-2"><span>' + escapeHtml(formatDateDisplay(row.startDate)) + '</span><button type="button" data-fallback-guide-planning-material-edit="startDate" data-project-key="' + escapeHtml(currentProject.projectKey) + '" data-row-key="' + escapeHtml(row.rowKey) + '" data-current-value="' + escapeHtml(row.startDate || '') + '" class="inline-flex items-center justify-center size-7 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 transition-all"><span class="material-symbols-outlined text-[16px]">edit</span></button></div></td>' +
                                          '<td class="py-3 px-4"><div class="inline-flex items-center gap-2"><span>' + escapeHtml(formatDateDisplay(row.endDate)) + '</span><button type="button" data-fallback-guide-planning-material-edit="endDate" data-project-key="' + escapeHtml(currentProject.projectKey) + '" data-row-key="' + escapeHtml(row.rowKey) + '" data-current-value="' + escapeHtml(row.endDate || '') + '" class="inline-flex items-center justify-center size-7 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 transition-all"><span class="material-symbols-outlined text-[16px]">edit</span></button></div></td>' +
                                          '<td class="py-3 px-4"><div class="inline-flex items-center gap-2"><span class="font-mono text-xs">' + escapeHtml(row.guidePlanningCode) + '</span><button type="button" data-fallback-guide-planning-material-edit="guidePlanningCode" data-project-key="' + escapeHtml(currentProject.projectKey) + '" data-row-key="' + escapeHtml(row.rowKey) + '" data-current-value="' + escapeHtml(row.guidePlanningCode || '') + '" class="inline-flex items-center justify-center size-7 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 transition-all"><span class="material-symbols-outlined text-[16px]">edit</span></button></div></td>' +
                                          '<td class="py-3 px-4 text-slate-300">--</td>' +
                                        '</tr>'
                                      );
                                    }).join('')
                                  : ''
                              ) +
                              currentProject.customDemobilizationMaterialRows.map(function (row) {
                                return '<tr class="bg-amber-50/60">' +
                                  '<td class="py-3 px-4"><input data-fallback-guide-custom-row-field="phaseLabel" data-row-type="demobilization_materials" data-project-key="' + escapeHtml(currentProject.projectKey) + '" data-row-id="' + escapeHtml(row.id) + '" type="text" class="w-full min-w-[120px] rounded-xl border-slate-200 px-3 py-2" value="' + escapeHtml(row.phaseLabel || '') + '"/></td>' +
                                  '<td class="py-3 px-4"><input data-fallback-guide-custom-row-field="materialType" data-row-type="demobilization_materials" data-project-key="' + escapeHtml(currentProject.projectKey) + '" data-row-id="' + escapeHtml(row.id) + '" type="text" class="w-full min-w-[140px] rounded-xl border-slate-200 px-3 py-2" value="' + escapeHtml(row.materialType || '') + '"/></td>' +
                                  '<td class="py-3 px-4"><input data-fallback-guide-custom-row-field="startDate" data-row-type="demobilization_materials" data-project-key="' + escapeHtml(currentProject.projectKey) + '" data-row-id="' + escapeHtml(row.id) + '" type="date" class="rounded-xl border-slate-200 px-3 py-2" value="' + escapeHtml(row.startDate || '') + '"/></td>' +
                                  '<td class="py-3 px-4"><input data-fallback-guide-custom-row-field="endDate" data-row-type="demobilization_materials" data-project-key="' + escapeHtml(currentProject.projectKey) + '" data-row-id="' + escapeHtml(row.id) + '" type="date" class="rounded-xl border-slate-200 px-3 py-2" value="' + escapeHtml(row.endDate || '') + '"/></td>' +
                                  '<td class="py-3 px-4"><input data-fallback-guide-custom-row-field="guidePlanningCode" data-row-type="demobilization_materials" data-project-key="' + escapeHtml(currentProject.projectKey) + '" data-row-id="' + escapeHtml(row.id) + '" type="text" class="w-full min-w-[180px] rounded-xl border-slate-200 px-3 py-2 font-mono text-xs" value="' + escapeHtml(row.guidePlanningCode || '') + '"/></td>' +
                                  '<td class="py-3 px-4"><button type="button" data-fallback-guide-custom-row-remove="demobilization_materials" data-project-key="' + escapeHtml(currentProject.projectKey) + '" data-row-id="' + escapeHtml(row.id) + '" class="inline-flex items-center justify-center size-8 rounded-lg border border-rose-200 bg-white text-rose-600 hover:bg-rose-50 transition-all"><span class="material-symbols-outlined text-[16px]">delete</span></button></td>' +
                                '</tr>';
                              }).join('') +
                              (!currentProject.generatedDemobilizationMaterialRows.length && !currentProject.customDemobilizationMaterialRows.length
                                ? '<tr><td colspan="6" class="py-6 text-center text-sm text-slate-500">No demobilization material row generated yet. Enter months above to populate the table.</td></tr>'
                                : '') +
                            '</tbody>' +
                          '</table>' +
                        '</div>' +
                      '</details>' +
                    '</div>'
              ) +
            '</div>' +
            '<div class="rounded-2xl border border-slate-200 bg-white p-4">' +
              '<h3 class="text-sm font-bold text-slate-700">Subcontracting Activities</h3>' +
              (
                !currentProject.demobilizationEligiblePhases.length
                  ? '<div class="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">No phase ends in the last year of the project. Check Project Phases Workspace.</div>'
                  : '<div class="mt-4 space-y-4">' +
                      '<details class="rounded-2xl border border-slate-200 bg-slate-50 p-4" open>' +
                        '<summary class="cursor-pointer text-sm font-bold text-slate-700">Applicable Subcontracting Types</summary>' +
                        '<div class="mt-4 grid grid-cols-1 xl:grid-cols-2 gap-3">' +
                          currentProject.demobilizationSubcontractingCatalog.map(function (subcontractingType) {
                            return (
                              '<label class="rounded-xl border border-slate-200 bg-white px-4 py-3">' +
                                '<div class="flex items-center justify-between gap-4">' +
                                  '<span class="text-sm font-semibold text-slate-800">' + escapeHtml(subcontractingType) + '</span>' +
                                  '<input data-fallback-guide-demobilisation-subcontracting-months data-project-key="' + escapeHtml(currentProject.projectKey) + '" data-subcontracting-type="' + escapeHtml(subcontractingType) + '" type="number" min="0" step="1" class="w-24 rounded-xl border-slate-200 px-3 py-2 text-right" value="' + escapeHtml(String(toNumber(currentProject.demobilizationSubcontractingMonthsByType[subcontractingType]) || 0)) + '"/>' +
                                '</div>' +
                                '<p class="mt-2 text-xs text-slate-500">Set the demobilization duration in months for this subcontracting type.</p>' +
                              '</label>'
                            );
                          }).join('') +
                        '</div>' +
                      '</details>' +
                      '<details class="rounded-2xl border border-slate-200 bg-slate-50 p-4" open>' +
                        '<summary class="cursor-pointer text-sm font-bold text-slate-700">Demobilization Subcontracting Guide Planning Table <span class="text-slate-400 font-medium">| ' + escapeHtml(String(currentProject.generatedDemobilizationSubcontractingRows.length)) + ' row(s)</span></summary>' +
                        '<div class="mt-4 flex justify-end"><button type="button" data-guide-custom-row-add="demobilization_subcontracting" data-project-key="' + escapeHtml(currentProject.projectKey) + '" class="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-all"><span class="material-symbols-outlined text-[16px]">add</span>Add row</button></div>' +
                        '<div class="mt-4 overflow-x-auto">' +
                          '<table class="min-w-full text-sm">' +
                            '<thead class="bg-slate-100 text-slate-600">' +
                              '<tr>' +
                                '<th class="text-left py-3 px-4">Phase</th>' +
                                '<th class="text-left py-3 px-4">Subcontracting type</th>' +
                                '<th class="text-left py-3 px-4">Start date</th>' +
                                '<th class="text-left py-3 px-4">End date</th>' +
                                '<th class="text-left py-3 px-4">Guide planning code</th>' +
                                '<th class="text-left py-3 px-4">Actions</th>' +
                              '</tr>' +
                            '</thead>' +
                            '<tbody class="divide-y divide-slate-200">' +
                              (
                                currentProject.generatedDemobilizationSubcontractingRows.length
                                  ? currentProject.generatedDemobilizationSubcontractingRows.map(function (row) {
                                      return (
                                        '<tr>' +
                                          '<td class="py-3 px-4 font-semibold">' + escapeHtml(row.phaseLabel) + '</td>' +
                                          '<td class="py-3 px-4">' + escapeHtml(row.subcontractingType) + '</td>' +
                                          '<td class="py-3 px-4"><div class="inline-flex items-center gap-2"><span>' + escapeHtml(formatDateDisplay(row.startDate)) + '</span><button type="button" data-fallback-guide-planning-subcontracting-edit="startDate" data-project-key="' + escapeHtml(currentProject.projectKey) + '" data-row-key="' + escapeHtml(row.rowKey) + '" data-current-value="' + escapeHtml(row.startDate || '') + '" class="inline-flex items-center justify-center size-7 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 transition-all"><span class="material-symbols-outlined text-[16px]">edit</span></button></div></td>' +
                                          '<td class="py-3 px-4"><div class="inline-flex items-center gap-2"><span>' + escapeHtml(formatDateDisplay(row.endDate)) + '</span><button type="button" data-fallback-guide-planning-subcontracting-edit="endDate" data-project-key="' + escapeHtml(currentProject.projectKey) + '" data-row-key="' + escapeHtml(row.rowKey) + '" data-current-value="' + escapeHtml(row.endDate || '') + '" class="inline-flex items-center justify-center size-7 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 transition-all"><span class="material-symbols-outlined text-[16px]">edit</span></button></div></td>' +
                                          '<td class="py-3 px-4"><div class="inline-flex items-center gap-2"><span class="font-mono text-xs">' + escapeHtml(row.guidePlanningCode) + '</span><button type="button" data-fallback-guide-planning-subcontracting-edit="guidePlanningCode" data-project-key="' + escapeHtml(currentProject.projectKey) + '" data-row-key="' + escapeHtml(row.rowKey) + '" data-current-value="' + escapeHtml(row.guidePlanningCode || '') + '" class="inline-flex items-center justify-center size-7 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 transition-all"><span class="material-symbols-outlined text-[16px]">edit</span></button></div></td>' +
                                          '<td class="py-3 px-4 text-slate-300">--</td>' +
                                        '</tr>'
                                      );
                                    }).join('')
                                  : ''
                              ) +
                              currentProject.customDemobilizationSubcontractingRows.map(function (row) {
                                return '<tr class="bg-amber-50/60">' +
                                  '<td class="py-3 px-4"><input data-fallback-guide-custom-row-field="phaseLabel" data-row-type="demobilization_subcontracting" data-project-key="' + escapeHtml(currentProject.projectKey) + '" data-row-id="' + escapeHtml(row.id) + '" type="text" class="w-full min-w-[120px] rounded-xl border-slate-200 px-3 py-2" value="' + escapeHtml(row.phaseLabel || '') + '"/></td>' +
                                  '<td class="py-3 px-4"><input data-fallback-guide-custom-row-field="subcontractingType" data-row-type="demobilization_subcontracting" data-project-key="' + escapeHtml(currentProject.projectKey) + '" data-row-id="' + escapeHtml(row.id) + '" type="text" class="w-full min-w-[160px] rounded-xl border-slate-200 px-3 py-2" value="' + escapeHtml(row.subcontractingType || '') + '"/></td>' +
                                  '<td class="py-3 px-4"><input data-fallback-guide-custom-row-field="startDate" data-row-type="demobilization_subcontracting" data-project-key="' + escapeHtml(currentProject.projectKey) + '" data-row-id="' + escapeHtml(row.id) + '" type="date" class="rounded-xl border-slate-200 px-3 py-2" value="' + escapeHtml(row.startDate || '') + '"/></td>' +
                                  '<td class="py-3 px-4"><input data-fallback-guide-custom-row-field="endDate" data-row-type="demobilization_subcontracting" data-project-key="' + escapeHtml(currentProject.projectKey) + '" data-row-id="' + escapeHtml(row.id) + '" type="date" class="rounded-xl border-slate-200 px-3 py-2" value="' + escapeHtml(row.endDate || '') + '"/></td>' +
                                  '<td class="py-3 px-4"><input data-fallback-guide-custom-row-field="guidePlanningCode" data-row-type="demobilization_subcontracting" data-project-key="' + escapeHtml(currentProject.projectKey) + '" data-row-id="' + escapeHtml(row.id) + '" type="text" class="w-full min-w-[180px] rounded-xl border-slate-200 px-3 py-2 font-mono text-xs" value="' + escapeHtml(row.guidePlanningCode || '') + '"/></td>' +
                                  '<td class="py-3 px-4"><button type="button" data-fallback-guide-custom-row-remove="demobilization_subcontracting" data-project-key="' + escapeHtml(currentProject.projectKey) + '" data-row-id="' + escapeHtml(row.id) + '" class="inline-flex items-center justify-center size-8 rounded-lg border border-rose-200 bg-white text-rose-600 hover:bg-rose-50 transition-all"><span class="material-symbols-outlined text-[16px]">delete</span></button></td>' +
                                '</tr>';
                              }).join('') +
                              (!currentProject.generatedDemobilizationSubcontractingRows.length && !currentProject.customDemobilizationSubcontractingRows.length
                                ? '<tr><td colspan="6" class="py-6 text-center text-sm text-slate-500">No demobilization subcontracting row generated yet. Enter months above to populate the table.</td></tr>'
                                : '') +
                            '</tbody>' +
                          '</table>' +
                        '</div>' +
                      '</details>' +
                    '</div>'
              ) +
            '</div>' +
          '</div>';
        if (overhaulPlaceholder) overhaulPlaceholder.innerHTML =
          (function () {
            var overhaulTotalRows = currentProject.overhaulRenewalRows.length + currentProject.customOverhaulRenewalRows.length;
            return (
          '<details class="rounded-2xl border border-slate-200 bg-slate-50 p-4" open>' +
            '<summary class="cursor-pointer text-sm font-bold text-slate-700">Overhaul & Renewals Guide Planning Table <span class="text-slate-400 font-medium">| ' + escapeHtml(String(overhaulTotalRows)) + ' row(s)</span></summary>' +
            (
              !currentProject.subsystems.length
                ? '<div class="mt-4 rounded-xl border border-dashed border-slate-200 bg-white px-4 py-6 text-sm text-slate-500">No subsystem found for this project. Check PIO Definition / Synthesis data, or add rows manually.</div>'
                : ''
            ) +
            '<div class="mt-4 flex justify-end">' +
                    '<button type="button" data-guide-custom-row-add="overhaul_renewals" data-project-key="' + escapeHtml(currentProject.projectKey) + '" class="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-all">' +
                      '<span class="material-symbols-outlined text-[16px]">add</span>' +
                      'Add row' +
                    '</button>' +
                  '</div>' +
            '<div class="mt-4 overflow-x-auto">' +
                    '<table class="min-w-full text-sm">' +
                      '<thead class="bg-slate-100 text-slate-600">' +
                        '<tr>' +
                          '<th class="text-left py-3 px-4">Phase</th>' +
                          '<th class="text-left py-3 px-4">Subsystem</th>' +
                          '<th class="text-left py-3 px-4">Overhaul guide planning code</th>' +
                          '<th class="text-left py-3 px-4">Renewal guide planning code</th>' +
                          '<th class="text-left py-3 px-4">Actions</th>' +
                        '</tr>' +
                      '</thead>' +
                      '<tbody class="divide-y divide-slate-200">' +
                        (
                          currentProject.overhaulRenewalRows.length
                            ? currentProject.overhaulRenewalRows.map(function (row) {
                                return '<tr>' +
                                  '<td class="py-3 px-4 font-semibold">' + escapeHtml(row.phaseLabel) + '</td>' +
                                  '<td class="py-3 px-4">' + escapeHtml(row.subsystem) + '</td>' +
                                  '<td class="py-3 px-4"><div class="inline-flex items-center gap-2"><span class="font-mono text-xs">' + escapeHtml(row.overhaulGuidePlanningCode) + '</span><button type="button" data-fallback-guide-planning-overhaul-edit="overhaulGuidePlanningCode" data-project-key="' + escapeHtml(currentProject.projectKey) + '" data-row-key="' + escapeHtml(row.rowKey) + '" data-current-value="' + escapeHtml(row.overhaulGuidePlanningCode || '') + '" class="inline-flex items-center justify-center size-7 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 transition-all"><span class="material-symbols-outlined text-[16px]">edit</span></button></div></td>' +
                                  '<td class="py-3 px-4"><div class="inline-flex items-center gap-2"><span class="font-mono text-xs">' + escapeHtml(row.renewalGuidePlanningCode) + '</span><button type="button" data-fallback-guide-planning-overhaul-edit="renewalGuidePlanningCode" data-project-key="' + escapeHtml(currentProject.projectKey) + '" data-row-key="' + escapeHtml(row.rowKey) + '" data-current-value="' + escapeHtml(row.renewalGuidePlanningCode || '') + '" class="inline-flex items-center justify-center size-7 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 transition-all"><span class="material-symbols-outlined text-[16px]">edit</span></button></div></td>' +
                                  '<td class="py-3 px-4 text-slate-300">--</td>' +
                                '</tr>';
                              }).join('')
                            : ''
                        ) +
                        currentProject.customOverhaulRenewalRows.map(function (row) {
                          return '<tr class="bg-amber-50/60">' +
                            '<td class="py-3 px-4"><input data-fallback-guide-custom-row-field="phaseLabel" data-row-type="overhaul_renewals" data-project-key="' + escapeHtml(currentProject.projectKey) + '" data-row-id="' + escapeHtml(row.id) + '" type="text" class="w-full min-w-[120px] rounded-xl border-slate-200 px-3 py-2" value="' + escapeHtml(row.phaseLabel || '') + '"/></td>' +
                            '<td class="py-3 px-4"><input data-fallback-guide-custom-row-field="subsystem" data-row-type="overhaul_renewals" data-project-key="' + escapeHtml(currentProject.projectKey) + '" data-row-id="' + escapeHtml(row.id) + '" type="text" class="w-full min-w-[140px] rounded-xl border-slate-200 px-3 py-2" value="' + escapeHtml(row.subsystem || '') + '"/></td>' +
                            '<td class="py-3 px-4"><input data-fallback-guide-custom-row-field="overhaulGuidePlanningCode" data-row-type="overhaul_renewals" data-project-key="' + escapeHtml(currentProject.projectKey) + '" data-row-id="' + escapeHtml(row.id) + '" type="text" class="w-full min-w-[220px] rounded-xl border-slate-200 px-3 py-2 font-mono text-xs" value="' + escapeHtml(row.overhaulGuidePlanningCode || '') + '"/></td>' +
                            '<td class="py-3 px-4"><input data-fallback-guide-custom-row-field="renewalGuidePlanningCode" data-row-type="overhaul_renewals" data-project-key="' + escapeHtml(currentProject.projectKey) + '" data-row-id="' + escapeHtml(row.id) + '" type="text" class="w-full min-w-[220px] rounded-xl border-slate-200 px-3 py-2 font-mono text-xs" value="' + escapeHtml(row.renewalGuidePlanningCode || '') + '"/></td>' +
                            '<td class="py-3 px-4"><button type="button" data-fallback-guide-custom-row-remove="overhaul_renewals" data-project-key="' + escapeHtml(currentProject.projectKey) + '" data-row-id="' + escapeHtml(row.id) + '" class="inline-flex items-center justify-center size-8 rounded-lg border border-rose-200 bg-white text-rose-600 hover:bg-rose-50 transition-all"><span class="material-symbols-outlined text-[16px]">delete</span></button></td>' +
                          '</tr>';
                        }).join('') +
                        (
                          !currentProject.overhaulRenewalRows.length && !currentProject.customOverhaulRenewalRows.length
                            ? '<tr><td colspan="5" class="py-6 text-center text-sm text-slate-500">No overhaul or renewal row generated yet.</td></tr>'
                            : ''
                        ) +
                      '</tbody>' +
                    '</table>' +
                  '</div>' +
          '</details>'
            );
          })();
        if (risksPlaceholder) risksPlaceholder.innerHTML =
          '<details class="rounded-2xl border border-slate-200 bg-slate-50 p-4" open>' +
            '<summary class="cursor-pointer text-sm font-bold text-slate-700">Risks Table <span class="text-slate-400 font-medium">| ' + escapeHtml(String(currentProject.riskRows.length)) + ' row(s)</span></summary>' +
            '<div class="mt-4 flex justify-end">' +
              '<button type="button" data-fallback-guide-risk-row-add data-project-key="' + escapeHtml(currentProject.projectKey) + '" class="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-all">' +
                '<span class="material-symbols-outlined text-[16px]">add</span>' +
                'Add row' +
              '</button>' +
            '</div>' +
            '<div class="mt-4 overflow-x-auto">' +
              '<table class="min-w-full text-sm">' +
                '<thead class="bg-slate-100 text-slate-600">' +
                  '<tr>' +
                    '<th class="text-left py-3 px-4">Risk Description</th>' +
                    '<th class="text-left py-3 px-4">Guide planning code</th>' +
                    '<th class="text-left py-3 px-4">Actions</th>' +
                  '</tr>' +
                '</thead>' +
                '<tbody class="divide-y divide-slate-200">' +
                  currentProject.riskRows.map(function (row) {
                    return '<tr class="bg-amber-50/60">' +
                      '<td class="py-3 px-4"><input data-fallback-guide-risk-field="riskDescription" data-project-key="' + escapeHtml(currentProject.projectKey) + '" data-row-id="' + escapeHtml(row.id) + '" type="text" class="w-full min-w-[280px] rounded-xl border-slate-200 px-3 py-2" value="' + escapeHtml(row.riskDescription || '') + '"/></td>' +
                      '<td class="py-3 px-4"><select data-fallback-guide-risk-field="guidePlanningCode" data-project-key="' + escapeHtml(currentProject.projectKey) + '" data-row-id="' + escapeHtml(row.id) + '" class="w-full min-w-[260px] rounded-xl border-slate-200 px-3 py-2">' +
                        '<option value="">Select guide planning code</option>' +
                        currentProject.riskGuidePlanningOptions.map(function (code) {
                          return '<option value="' + escapeHtml(code) + '"' + (code === row.guidePlanningCode ? ' selected' : '') + '>' + escapeHtml(code) + '</option>';
                        }).join('') +
                      '</select></td>' +
                      '<td class="py-3 px-4"><button type="button" data-fallback-guide-risk-row-remove data-project-key="' + escapeHtml(currentProject.projectKey) + '" data-row-id="' + escapeHtml(row.id) + '" class="inline-flex items-center justify-center size-8 rounded-lg border border-rose-200 bg-white text-rose-600 hover:bg-rose-50 transition-all"><span class="material-symbols-outlined text-[16px]">delete</span></button></td>' +
                    '</tr>';
                  }).join('') +
                  (!currentProject.riskRows.length
                    ? '<tr><td colspan="3" class="py-6 text-center text-sm text-slate-500">' + escapeHtml(currentProject.riskGuidePlanningOptions.length ? 'No risk defined yet.' : 'No guide planning code available yet from the other periods.') + '</td></tr>'
                    : '') +
                '</tbody>' +
              '</table>' +
            '</div>' +
          '</details>';
      }

      function renderFallbackProjectPhasesDrawer(group, item) {
        const workspace = $("projectPhasesWorkspace");
        const list = $("projectPhasesProjectList");
        const empty = $("projectPhasesWorkspaceEmpty");
        const content = $("projectPhasesWorkspaceContent");
        const status = $("projectPhasesWorkspaceStatus");
        const title = $("projectPhasesCurrentProjectTitle");
        const meta = $("projectPhasesCurrentProjectMeta");
        const planningYear = $("projectPhasesPlanningYear");
        const derivedDuration = $("projectPhasesDerivedDuration");
        const identityGrid = $("projectPhasesIdentityGrid");
        const warrantyGrid = $("projectPhasesWarrantyGrid");
        const overhaulGrid = $("projectPhasesOverhaulGrid");
        const tableBody = $("projectPhasesTableBody");
        const addPhaseBtn = $("projectPhasesAddPhaseBtn");
        const addCustomPhaseBtn = $("projectPhasesAddCustomPhaseBtn");
        if (!workspace || !list || !empty || !content || !status || !title || !meta || !planningYear || !derivedDuration || !identityGrid || !warrantyGrid || !overhaulGrid || !tableBody || !addPhaseBtn) return;

        const projects = buildFallbackProjectPhaseProjects();
        const currentKey = workspace.dataset.currentProjectKey && projects.some(function (project) {
          return project.projectKey === workspace.dataset.currentProjectKey;
        }) ? workspace.dataset.currentProjectKey : (projects[0] ? projects[0].projectKey : "");
        const currentProject = projects.find(function (project) {
          return project.projectKey === currentKey;
        }) || null;

        workspace.classList.remove("hidden");
        status.textContent = projects.length ? (projects.length + " project(s) available") : "No project available.";

        list.innerHTML = projects.map(function (project) {
          const active = currentProject && project.projectKey === currentProject.projectKey;
          return (
            '<button type="button" data-fallback-project-select="' + escapeHtml(project.projectKey) + '" class="w-full rounded-xl border px-3 py-3 text-left transition-all ' + (active ? 'border-emerald-300 bg-emerald-50 shadow-sm ring-1 ring-emerald-200' : 'border-slate-200 bg-white hover:bg-slate-100') + '">' +
              '<div class="text-sm font-semibold text-slate-900">' + escapeHtml(project.projectName) + '</div>' +
              '<div class="mt-1 text-xs text-slate-500">' + escapeHtml(project.projectContext || "No context") + ' | ' + escapeHtml(project.serviceYear || "--") + '</div>' +
            '</button>'
          );
        }).join("");

        if (!currentProject) {
          empty.classList.remove("hidden");
          content.classList.add("hidden");
          return;
        }

        workspace.dataset.currentProjectKey = currentProject.projectKey;
        empty.classList.add("hidden");
        content.classList.remove("hidden");

        title.textContent = currentProject.projectName;
        meta.textContent = (currentProject.projectType || "No project type") + " | " + (currentProject.projectContext || "No context") + " | Service Year " + (currentProject.serviceYear || "--");
        planningYear.textContent = currentProject.planningYear || "--";
        derivedDuration.textContent = (inferContractDurationYears(currentProject) || 0) + " year(s)";

        identityGrid.innerHTML =
          '<label><p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Project Code</p><input data-fallback-project-field="projectCode" data-project-key="' + escapeHtml(currentProject.projectKey) + '" type="text" class="mt-1 w-full rounded-xl border-slate-200 px-3 py-2" value="' + escapeHtml(currentProject.projectCode) + '"/></label>' +
          '<label><p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Project Context</p><input type="text" class="mt-1 w-full rounded-xl border-slate-200 px-3 py-2 bg-slate-100" value="' + escapeHtml(currentProject.projectContext || "--") + '" readonly/></label>' +
          '<label><p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Service Year</p><input type="text" class="mt-1 w-full rounded-xl border-slate-200 px-3 py-2 bg-slate-100" value="' + escapeHtml(currentProject.serviceYear || "--") + '" readonly/></label>' +
          '<label><p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Start of the Project</p><input data-fallback-project-field="startOfProjectDate" data-project-key="' + escapeHtml(currentProject.projectKey) + '" type="date" class="mt-1 w-full rounded-xl border-slate-200 px-3 py-2" value="' + escapeHtml(currentProject.startOfProjectDate) + '"/></label>' +
          '<div class="rounded-xl border border-slate-200 bg-white px-4 py-3"><p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Planning Year</p><p class="mt-2 text-sm font-semibold">' + escapeHtml(currentProject.planningYear || "--") + '</p></div>' +
          '<div class="rounded-xl border border-slate-200 bg-white px-4 py-3"><p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">correc_ovh_start_year / end_year</p><p class="mt-2 text-sm font-semibold">' + escapeHtml(currentProject.correcStartYear || "--") + ' / ' + escapeHtml(currentProject.correcEndYear || "--") + '</p></div>';

        warrantyGrid.innerHTML =
          '<label><p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Max Mobilisation Period (months)</p><input data-fallback-project-field="maxMobilisationMonths" data-project-key="' + escapeHtml(currentProject.projectKey) + '" type="number" min="0" class="mt-1 w-full rounded-xl border-slate-200 px-3 py-2" value="' + escapeHtml(String(currentProject.maxMobilisationMonths)) + '"/></label>' +
          '<label><p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Mobilisation Phase Code</p><input data-fallback-project-field="mobilisationPhaseCode" data-project-key="' + escapeHtml(currentProject.projectKey) + '" type="text" class="mt-1 w-full rounded-xl border-slate-200 px-3 py-2" value="' + escapeHtml(currentProject.mobilisationPhaseCode) + '"/></label>' +
          '<label><p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Warranty Duration (months)</p><input data-fallback-project-field="warrantyDurationMonths" data-project-key="' + escapeHtml(currentProject.projectKey) + '" type="number" min="0" class="mt-1 w-full rounded-xl border-slate-200 px-3 py-2" value="' + escapeHtml(String(currentProject.warrantyDurationMonths)) + '"/></label>' +
          '<label><p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Warranty Code</p><input data-fallback-project-field="warrantyCode" data-project-key="' + escapeHtml(currentProject.projectKey) + '" type="text" class="mt-1 w-full rounded-xl border-slate-200 px-3 py-2" value="' + escapeHtml(currentProject.warrantyCode) + '"/></label>' +
          '<label><p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Post Warranty Period Code</p><input data-fallback-project-field="postWarrantyCode" data-project-key="' + escapeHtml(currentProject.projectKey) + '" type="text" class="mt-1 w-full rounded-xl border-slate-200 px-3 py-2" value="' + escapeHtml(currentProject.postWarrantyCode) + '"/></label>' +
          '<label><p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Recurrent Code</p><input data-fallback-project-field="recurrentCode" data-project-key="' + escapeHtml(currentProject.projectKey) + '" type="text" class="mt-1 w-full rounded-xl border-slate-200 px-3 py-2" value="' + escapeHtml(currentProject.recurrentCode) + '"/></label>' +
          '<label><p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Demobilisation Code</p><input data-fallback-project-field="demobilisationCode" data-project-key="' + escapeHtml(currentProject.projectKey) + '" type="text" class="mt-1 w-full rounded-xl border-slate-200 px-3 py-2" value="' + escapeHtml(currentProject.demobilisationCode) + '"/></label>' +
          '<div class="rounded-xl border border-slate-200 bg-white px-4 py-3"><p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Warranty Window</p><p class="mt-2 text-sm font-semibold">' + escapeHtml(formatDateDisplay(currentProject.warrantyStartDate)) + ' -> ' + escapeHtml(formatDateDisplay(currentProject.warrantyEndDate)) + '</p></div>';

        overhaulGrid.innerHTML =
          '<label><p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Overhaul Code</p><input data-fallback-project-field="overhaulCode" data-project-key="' + escapeHtml(currentProject.projectKey) + '" type="text" class="mt-1 w-full rounded-xl border-slate-200 px-3 py-2" value="' + escapeHtml(currentProject.overhaulCode || "OVH") + '"/></label>' +
          '<label><p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Renewal Code</p><input data-fallback-project-field="renewalCode" data-project-key="' + escapeHtml(currentProject.projectKey) + '" type="text" class="mt-1 w-full rounded-xl border-slate-200 px-3 py-2" value="' + escapeHtml(currentProject.renewalCode || "REN") + '"/></label>';

        tableBody.innerHTML = currentProject.phases.map(function (phase) {
          return (
            '<tr>' +
              '<td class="py-3 pr-4">' + (phase.manual
                ? '<input data-fallback-phase-field="label" data-project-key="' + escapeHtml(currentProject.projectKey) + '" data-phase-key="' + escapeHtml(phase.key) + '" type="text" class="w-full min-w-[140px] rounded-xl border-slate-200 px-3 py-2 font-semibold" value="' + escapeHtml(phase.label) + '"/>'
                : '<span class="font-semibold">' + escapeHtml(phase.label) + '</span>') + '</td>' +
              '<td class="py-3 px-4"><input data-fallback-phase-field="phaseCode" data-project-key="' + escapeHtml(currentProject.projectKey) + '" data-phase-key="' + escapeHtml(phase.key) + '" type="text" class="w-28 rounded-xl border-slate-200 px-3 py-2" value="' + escapeHtml(phase.phaseCode || "") + '"/></td>' +
              '<td class="py-3 px-4 text-right"><input data-fallback-phase-field="durationYears" data-project-key="' + escapeHtml(currentProject.projectKey) + '" data-phase-key="' + escapeHtml(phase.key) + '" type="number" min="0" step="0.1" class="w-24 rounded-xl border-slate-200 px-3 py-2 text-right" value="' + escapeHtml(String(phase.durationYears || 0)) + '"/></td>' +
              '<td class="py-3 px-4">' + (phase.key === "Total" || phase.manual
                ? '<input data-fallback-phase-field="startDate" data-project-key="' + escapeHtml(currentProject.projectKey) + '" data-phase-key="' + escapeHtml(phase.key) + '" type="date" class="rounded-xl border-slate-200 px-3 py-2" value="' + escapeHtml(phase.startDate) + '"/>'
                : '<span class="text-slate-600">' + escapeHtml(formatDateDisplay(phase.startDate)) + '</span>') + '</td>' +
              '<td class="py-3 px-4">' + (phase.key === "Total" || phase.manual
                ? '<input data-fallback-phase-field="endDate" data-project-key="' + escapeHtml(currentProject.projectKey) + '" data-phase-key="' + escapeHtml(phase.key) + '" type="date" class="rounded-xl border-slate-200 px-3 py-2" value="' + escapeHtml(phase.endDate) + '"/>'
                : '<span class="text-slate-600">' + escapeHtml(formatDateDisplay(phase.endDate)) + '</span>') + '</td>' +
              '<td class="py-3 px-4">' + (phase.manual
                ? '<input data-fallback-phase-field="postWarrantyStartDate" data-project-key="' + escapeHtml(currentProject.projectKey) + '" data-phase-key="' + escapeHtml(phase.key) + '" type="date" class="rounded-xl border-slate-200 px-3 py-2" value="' + escapeHtml(phase.postWarrantyStartDate) + '"/>'
                : '<span class="text-slate-600">' + escapeHtml(formatDateDisplay(phase.postWarrantyStartDate)) + '</span>') + '</td>' +
              '<td class="py-3 px-4">' + (phase.manual
                ? '<input data-fallback-phase-field="postWarrantyEndDate" data-project-key="' + escapeHtml(currentProject.projectKey) + '" data-phase-key="' + escapeHtml(phase.key) + '" type="date" class="rounded-xl border-slate-200 px-3 py-2" value="' + escapeHtml(phase.postWarrantyEndDate) + '"/>'
                : '<span class="text-slate-600">' + escapeHtml(formatDateDisplay(phase.postWarrantyEndDate)) + '</span>') + '</td>' +
              '<td class="py-3 pl-4 text-right">' + (phase.removable
                ? '<button type="button" data-fallback-project-phase-remove="' + escapeHtml(currentProject.projectKey) + '" data-phase-key="' + escapeHtml(phase.key) + '" class="inline-flex items-center gap-1 text-rose-600 hover:text-rose-700 font-semibold"><span class="material-symbols-outlined text-[16px]">delete</span>Remove</button>'
                : '<span class="text-xs text-slate-400">Mandatory</span>') + '</td>' +
            '</tr>'
          );
        }).join("");

        addPhaseBtn.dataset.fallbackProjectPhaseAdd = currentProject.projectKey;
        addPhaseBtn.disabled = !currentProject.nextPhaseKey;
        addPhaseBtn.innerHTML = '<span class="material-symbols-outlined text-[18px]">add</span>' + (currentProject.nextPhaseKey ? 'Add ' + escapeHtml(currentProject.nextPhaseKey) : 'No more phase');
        if (addCustomPhaseBtn) {
          addCustomPhaseBtn.dataset.fallbackProjectCustomPhaseAdd = currentProject.projectKey;
          addCustomPhaseBtn.disabled = false;
        }
      }

      function renderFallbackCostCentersWorkspace() {
        const workspace = $("costCentersWorkspace");
        const list = $("costCentersProjectList");
        const empty = $("costCentersWorkspaceEmpty");
        const content = $("costCentersWorkspaceContent");
        const status = $("costCentersWorkspaceStatus");
        const title = $("costCentersCurrentProjectTitle");
        const meta = $("costCentersCurrentProjectMeta");
        const annualSource = $("costCentersAnnualHoursSource");
        const currencySelect = $("costCentersProjectCurrencySelect");
        const annualHoursInput = $("costCentersAnnualHoursInput");
        const positionsSelector = $("costCentersPositionsSelector");
        const generalPeriodsSelector = $("costCentersGeneralPeriodsSelector");
        const engineerPeriodsSelector = $("costCentersEngineerPeriodsSelector");
        const tableBody = $("costCentersTableBody");
        const addCurrencyBtn = $("costCentersAddCurrencyBtn");
        const nightPremiumToggle = $("costCentersNightPremiumToggle");
        const nightPremiumPercent = $("costCentersNightPremiumPercent");
        if (!workspace || !list || !empty || !content || !status || !title || !meta || !annualSource || !currencySelect || !annualHoursInput || !positionsSelector || !generalPeriodsSelector || !engineerPeriodsSelector || !tableBody || !addCurrencyBtn || !nightPremiumToggle || !nightPremiumPercent) return;

        const projects = buildFallbackCostCenterProjects();
        const currentKey = workspace.dataset.currentProjectKey && projects.some(function (project) {
          return project.projectKey === workspace.dataset.currentProjectKey;
        }) ? workspace.dataset.currentProjectKey : (projects[0] ? projects[0].projectKey : "");
        const currentProject = projects.find(function (project) {
          return project.projectKey === currentKey;
        }) || null;

        workspace.classList.remove("hidden");
        status.textContent = projects.length ? (projects.length + " project(s) available") : "No project available.";

        list.innerHTML = projects.map(function (project) {
          const active = currentProject && project.projectKey === currentProject.projectKey;
          return (
            '<button type="button" data-fallback-cost-center-project-select="' + escapeHtml(project.projectKey) + '" class="w-full rounded-xl border px-3 py-3 text-left transition-all ' + (active ? 'border-emerald-300 bg-emerald-50 shadow-sm ring-1 ring-emerald-200' : 'border-slate-200 bg-white hover:bg-slate-100') + '">' +
              '<div class="text-sm font-semibold text-slate-900">' + escapeHtml(project.projectName) + '</div>' +
              '<div class="mt-1 text-xs text-slate-500">' + escapeHtml(project.projectContext || "No context") + '</div>' +
            '</button>'
          );
        }).join("");

        if (!currentProject) {
          empty.classList.remove("hidden");
          content.classList.add("hidden");
          return;
        }

        workspace.dataset.currentProjectKey = currentProject.projectKey;
        empty.classList.add("hidden");
        content.classList.remove("hidden");

        title.textContent = currentProject.projectName;
        meta.textContent = (currentProject.projectType || "No project type") + " | " + (currentProject.projectContext || "No context");
        annualSource.textContent = currentProject.annualWorkingHoursSource || "--";

        currencySelect.innerHTML = currentProject.currencyOptions.map(function (currency) {
          return '<option value="' + escapeHtml(currency) + '"' + (currency === currentProject.projectCurrency ? " selected" : "") + '>' + escapeHtml(currency) + '</option>';
        }).join("");
        currencySelect.dataset.projectKey = currentProject.projectKey;
        annualHoursInput.value = currentProject.annualWorkingHours || 0;
        annualHoursInput.dataset.projectKey = currentProject.projectKey;
        addCurrencyBtn.dataset.projectKey = currentProject.projectKey;
        nightPremiumToggle.checked = !!currentProject.nightPremiumEnabled;
        nightPremiumToggle.dataset.projectKey = currentProject.projectKey;
        nightPremiumPercent.value = currentProject.nightPremiumPercent || 0;
        nightPremiumPercent.dataset.projectKey = currentProject.projectKey;
        nightPremiumPercent.disabled = !currentProject.nightPremiumEnabled;

        positionsSelector.innerHTML = currentProject.positionOptions.map(function (position) {
          const checked = currentProject.selectedPositions.indexOf(position) !== -1;
          const removable = currentProject.customPositions.indexOf(position) !== -1;
          return '<label class="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"><input data-fallback-cost-center-position data-project-key="' + escapeHtml(currentProject.projectKey) + '" type="checkbox" value="' + escapeHtml(position) + '"' + (checked ? " checked" : "") + '/><span class="flex-1">' + escapeHtml(position) + '</span>' + (removable ? '<button type="button" data-fallback-cost-center-remove-position="' + escapeHtml(position) + '" data-project-key="' + escapeHtml(currentProject.projectKey) + '" class="inline-flex items-center justify-center size-7 rounded-lg border border-rose-200 bg-white text-rose-600 hover:bg-rose-50 transition-all"><span class="material-symbols-outlined text-[16px]">delete</span></button>' : '') + '</label>';
        }).join("");

        generalPeriodsSelector.innerHTML = costCenterTimePeriodCatalog.map(function (entry) {
          const checked = currentProject.generalTimePeriods.indexOf(entry) !== -1;
          return '<label class="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"><input data-fallback-cost-center-general-period data-project-key="' + escapeHtml(currentProject.projectKey) + '" type="checkbox" value="' + escapeHtml(entry) + '"' + (checked ? " checked" : "") + '/><span>' + escapeHtml(entry) + '</span></label>';
        }).join("");

        engineerPeriodsSelector.innerHTML = costCenterTimePeriodCatalog.map(function (entry) {
          const checked = currentProject.engineerTimePeriods.indexOf(entry) !== -1;
          return '<label class="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"><input data-fallback-cost-center-engineer-period data-project-key="' + escapeHtml(currentProject.projectKey) + '" type="checkbox" value="' + escapeHtml(entry) + '"' + (checked ? " checked" : "") + '/><span>' + escapeHtml(entry) + '</span></label>';
        }).join("");

        tableBody.innerHTML = currentProject.rows.length
          ? currentProject.rows.map(function (row) {
              const monthlyHours = row.monthlyWorkingHours === ""
                ? "--"
                : String((Math.round(Number(row.monthlyWorkingHours || 0) * 100) / 100).toFixed(2));
              return (
                '<tr>' +
                  '<td class="py-3 pr-4 font-semibold">' + escapeHtml(row.position) + '</td>' +
                  '<td class="py-3 px-4">' + (/external support/i.test(row.position || "")
                    ? '<select data-fallback-cost-center-row-field="caratUnit" data-project-key="' + escapeHtml(currentProject.projectKey) + '" data-row-key="' + escapeHtml(row.rowKey) + '" class="rounded-xl border-slate-200 px-3 py-2">' +
                        '<option value="">Select</option>' +
                        row.pioCaratUnitOptions.map(function (caratUnit) {
                          return '<option value="' + escapeHtml(caratUnit) + '"' + (caratUnit === row.caratUnit ? " selected" : "") + '>' + escapeHtml(caratUnit) + '</option>';
                        }).join("") +
                      '</select>'
                    : '<span class="text-slate-700">' + escapeHtml(row.caratUnit || "--") + '</span>') + '</td>' +
                  '<td class="py-3 px-4">' + escapeHtml(row.timePeriod) + '</td>' +
                  '<td class="py-3 px-4 text-right">' + escapeHtml(monthlyHours) + '</td>' +
                  '<td class="py-3 px-4"><select data-fallback-cost-center-row-field="currency" data-project-key="' + escapeHtml(currentProject.projectKey) + '" data-row-key="' + escapeHtml(row.rowKey) + '" class="rounded-xl border-slate-200 px-3 py-2">' + currentProject.currencyOptions.map(function (currency) {
                    return '<option value="' + escapeHtml(currency) + '"' + (currency === row.currency ? " selected" : "") + '>' + escapeHtml(currency) + '</option>';
                  }).join("") + '</select></td>' +
                  '<td class="py-3 px-4 text-right"><input data-fallback-cost-center-row-field="hourlyRate" data-project-key="' + escapeHtml(currentProject.projectKey) + '" data-row-key="' + escapeHtml(row.rowKey) + '" type="number" min="0" step="0.01" class="w-28 rounded-xl border-slate-200 px-3 py-2 text-right" value="' + escapeHtml(row.hourlyRate) + '"/></td>' +
                  '<td class="py-3 pl-4"><input data-fallback-cost-center-row-field="costCenter" data-project-key="' + escapeHtml(currentProject.projectKey) + '" data-row-key="' + escapeHtml(row.rowKey) + '" type="text" class="w-full min-w-[160px] rounded-xl border-slate-200 px-3 py-2" value="' + escapeHtml(row.costCenter) + '"/></td>' +
                '</tr>'
              );
            }).join("")
          : '<tr><td colspan="7" class="py-6 text-center text-sm text-slate-500">Select at least one position to generate the table.</td></tr>';
      }

      function renderFallbackPioDefinitionWorkspace() {
        const workspace = $("pioDefinitionWorkspace");
        const list = $("pioDefinitionProjectList");
        const empty = $("pioDefinitionWorkspaceEmpty");
        const content = $("pioDefinitionWorkspaceContent");
        const status = $("pioDefinitionWorkspaceStatus");
        const title = $("pioDefinitionCurrentProjectTitle");
        const meta = $("pioDefinitionCurrentProjectMeta");
        const annualWorkingHours = $("pioDefinitionAnnualWorkingHours");
        const originSelector = $("pioDefinitionOriginSelector");
        const onshoreFreightInput = $("pioDefinitionOnshoreFreightInput");
        const offshoreFreightInput = $("pioDefinitionOffshoreFreightInput");
        const customDutiesBody = $("pioDefinitionCustomDutiesBody");
        const tableBody = $("pioDefinitionTableBody");
        const addOriginBtn = $("pioDefinitionAddOriginBtn");
        if (!workspace || !list || !empty || !content || !status || !title || !meta || !annualWorkingHours || !originSelector || !onshoreFreightInput || !offshoreFreightInput || !customDutiesBody || !tableBody || !addOriginBtn) return;

        const projects = buildFallbackPioDefinitionProjects();
        const currentKey = workspace.dataset.currentProjectKey && projects.some(function (project) {
          return project.projectKey === workspace.dataset.currentProjectKey;
        }) ? workspace.dataset.currentProjectKey : (projects[0] ? projects[0].projectKey : "");
        const currentProject = projects.find(function (project) {
          return project.projectKey === currentKey;
        }) || null;

        workspace.classList.remove("hidden");
        status.textContent = projects.length ? (projects.length + " project(s) available") : "No project available.";

        list.innerHTML = projects.map(function (project) {
          const active = currentProject && project.projectKey === currentProject.projectKey;
          return (
            '<button type="button" data-fallback-pio-project-select="' + escapeHtml(project.projectKey) + '" class="w-full rounded-xl border px-3 py-3 text-left transition-all ' + (active ? 'border-emerald-300 bg-emerald-50 shadow-sm ring-1 ring-emerald-200' : 'border-slate-200 bg-white hover:bg-slate-100') + '">' +
              '<div class="text-sm font-semibold text-slate-900">' + escapeHtml(project.projectName) + '</div>' +
              '<div class="mt-1 text-xs text-slate-500">' + escapeHtml(project.projectContext || "No context") + '</div>' +
            '</button>'
          );
        }).join("");

        if (!currentProject) {
          empty.classList.remove("hidden");
          content.classList.add("hidden");
          return;
        }

        workspace.dataset.currentProjectKey = currentProject.projectKey;
        empty.classList.add("hidden");
        content.classList.remove("hidden");
        title.textContent = currentProject.projectName;
        meta.textContent = (currentProject.projectType || "No project type") + " | " + (currentProject.projectContext || "No context");
        annualWorkingHours.textContent = currentProject.annualWorkingHours || "--";
        addOriginBtn.dataset.projectKey = currentProject.projectKey;
        onshoreFreightInput.value = currentProject.onshoreFreightPercent || 0;
        onshoreFreightInput.dataset.projectKey = currentProject.projectKey;
        offshoreFreightInput.value = currentProject.offshoreFreightPercent || 0;
        offshoreFreightInput.dataset.projectKey = currentProject.projectKey;

        originSelector.innerHTML = currentProject.originOptions.map(function (origin) {
          const checked = currentProject.selectedOrigins.indexOf(origin) !== -1;
          return '<label class="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"><input data-fallback-pio-origin data-project-key="' + escapeHtml(currentProject.projectKey) + '" type="checkbox" value="' + escapeHtml(origin) + '"' + (checked ? " checked" : "") + '/><span>' + escapeHtml(origin) + '</span></label>';
        }).join("");

        customDutiesBody.innerHTML = currentProject.subsystems.length
          ? currentProject.subsystems.map(function (subsystem) {
              const value = currentProject.customDutiesBySubsystem[subsystem] !== undefined && currentProject.customDutiesBySubsystem[subsystem] !== null
                ? currentProject.customDutiesBySubsystem[subsystem]
                : 0;
              return (
                '<tr>' +
                  '<td class="py-3 pr-4 font-semibold">' + escapeHtml(subsystem) + '</td>' +
                  '<td class="py-3 pl-4 text-right"><input data-fallback-pio-custom-duty data-project-key="' + escapeHtml(currentProject.projectKey) + '" data-subsystem="' + escapeHtml(subsystem) + '" type="number" min="0" max="100" step="0.1" class="w-28 rounded-xl border-slate-200 px-3 py-2 text-right" value="' + escapeHtml(value) + '"/></td>' +
                '</tr>'
              );
            }).join("")
          : '<tr><td colspan="2" class="py-6 text-center text-sm text-slate-500">No subsystem found in `Synthesis` for this project.</td></tr>';

        tableBody.innerHTML = currentProject.rows.length
          ? currentProject.rows.map(function (row) {
              return (
                '<tr>' +
                  '<td class="py-3 pr-4 font-semibold">' + escapeHtml(row.origin) + '</td>' +
                  '<td class="py-3 px-4"><input data-fallback-pio-row-field="caratUnit" data-project-key="' + escapeHtml(currentProject.projectKey) + '" data-origin="' + escapeHtml(row.origin) + '" type="text" class="w-full min-w-[140px] rounded-xl border-slate-200 px-3 py-2" value="' + escapeHtml(row.caratUnit) + '"/></td>' +
                  '<td class="py-3 px-4"><input data-fallback-pio-row-field="unitRole" data-project-key="' + escapeHtml(currentProject.projectKey) + '" data-origin="' + escapeHtml(row.origin) + '" type="text" class="w-full min-w-[90px] rounded-xl border-slate-200 px-3 py-2" value="' + escapeHtml(row.unitRole) + '"/></td>' +
                  '<td class="py-3 px-4"><input data-fallback-pio-row-field="source" data-project-key="' + escapeHtml(currentProject.projectKey) + '" data-origin="' + escapeHtml(row.origin) + '" type="text" class="w-full min-w-[120px] rounded-xl border-slate-200 px-3 py-2" value="' + escapeHtml(row.source) + '"/></td>' +
                  '<td class="py-3 pl-4 text-right"><input data-fallback-pio-row-field="yearlyHours" data-project-key="' + escapeHtml(currentProject.projectKey) + '" data-origin="' + escapeHtml(row.origin) + '" type="number" step="0.01" class="w-32 rounded-xl border-slate-200 px-3 py-2 text-right" value="' + escapeHtml(row.yearlyHours) + '"/></td>' +
                '</tr>'
              );
            }).join("")
          : '<tr><td colspan="5" class="py-6 text-center text-sm text-slate-500">Select at least one origin to generate the table.</td></tr>';
      }

      function renderFallbackCurrencyExchangeWorkspace() {
        const workspace = $("currencyExchangeWorkspace");
        const list = $("currencyExchangeProjectList");
        const empty = $("currencyExchangeWorkspaceEmpty");
        const content = $("currencyExchangeWorkspaceContent");
        const status = $("currencyExchangeWorkspaceStatus");
        const title = $("currencyExchangeCurrentProjectTitle");
        const meta = $("currencyExchangeCurrentProjectMeta");
        const targetCurrencySelect = $("currencyExchangeTargetCurrencySelect");
        const addCurrencyBtn = $("currencyExchangeAddCurrencyBtn");
        const liveSource = $("currencyExchangeLiveSource");
        const tableBody = $("currencyExchangeTableBody");
        if (!workspace || !list || !empty || !content || !status || !title || !meta || !targetCurrencySelect || !addCurrencyBtn || !liveSource || !tableBody) return;

        const projects = buildFallbackCurrencyExchangeProjects();
        const currentKey = workspace.dataset.currentProjectKey && projects.some(function (project) {
          return project.projectKey === workspace.dataset.currentProjectKey;
        }) ? workspace.dataset.currentProjectKey : (projects[0] ? projects[0].projectKey : "");
        const currentProject = projects.find(function (project) {
          return project.projectKey === currentKey;
        }) || null;

        workspace.classList.remove("hidden");
        status.textContent = projects.length ? (projects.length + " project(s) available") : "No project available.";

        list.innerHTML = projects.map(function (project) {
          const active = currentProject && project.projectKey === currentProject.projectKey;
          return (
            '<button type="button" data-fallback-currency-project-select="' + escapeHtml(project.projectKey) + '" class="w-full rounded-xl border px-3 py-3 text-left transition-all ' + (active ? 'border-emerald-300 bg-emerald-50 shadow-sm ring-1 ring-emerald-200' : 'border-slate-200 bg-white hover:bg-slate-100') + '">' +
              '<div class="text-sm font-semibold text-slate-900">' + escapeHtml(project.projectName) + '</div>' +
              '<div class="mt-1 text-xs text-slate-500">' + escapeHtml(project.projectContext || "No context") + '</div>' +
            '</button>'
          );
        }).join("");

        if (!currentProject) {
          empty.classList.remove("hidden");
          content.classList.add("hidden");
          return;
        }

        workspace.dataset.currentProjectKey = currentProject.projectKey;
        empty.classList.add("hidden");
        content.classList.remove("hidden");
        title.textContent = currentProject.projectName;
        meta.textContent = (currentProject.projectType || "No project type") + " | " + (currentProject.projectContext || "No context") + " | Base " + (currentProject.baseCurrency || "--");
        targetCurrencySelect.innerHTML = currentProject.targetCurrencyOptions.map(function (currency) {
          return '<option value="' + escapeHtml(currency) + '"' + (currency === currentProject.targetCurrency ? " selected" : "") + '>' + escapeHtml(currency) + '</option>';
        }).join("");
        targetCurrencySelect.dataset.projectKey = currentProject.projectKey;
        addCurrencyBtn.dataset.projectKey = currentProject.projectKey;
        liveSource.textContent = currentProject.provider
          ? currentProject.provider + (currentProject.lastUpdated ? (" | updated " + currentProject.lastUpdated) : "")
          : ("Base " + (currentProject.baseCurrency || "--"));

        tableBody.innerHTML = currentProject.rows.length
          ? currentProject.rows.map(function (row) {
              return (
                '<tr>' +
                  '<td class="py-3 pr-4 font-semibold">' + escapeHtml(row.currency) + '</td>' +
                  '<td class="py-3 px-4">' + (row.liveRate === null ? '<span class="text-slate-400">--</span>' : escapeHtml(Number(row.liveRate).toFixed(6))) + '</td>' +
                  '<td class="py-3 px-4"><input data-fallback-currency-manual data-project-key="' + escapeHtml(currentProject.projectKey) + '" data-currency="' + escapeHtml(row.currency) + '" type="number" min="0" step="0.000001" class="w-32 rounded-xl border-slate-200 px-3 py-2 text-right" value="' + escapeHtml(row.manualOverride) + '"/></td>' +
                  '<td class="py-3 px-4">' + (row.effectiveRate === null ? '<span class="text-slate-400">--</span>' : ('<span class="font-semibold">' + escapeHtml(Number(row.effectiveRate).toFixed(6)) + '</span>')) + '</td>' +
                  '<td class="py-3 pl-4">' + escapeHtml(row.source) + '</td>' +
                '</tr>'
              );
            }).join("")
          : '<tr><td colspan="5" class="py-6 text-center text-sm text-slate-500">No currency found in `Synthesis` for this project.</td></tr>';
      }

      function renderFallbackFirmingRulesWorkspace() {
        const workspace = $("firmingRulesWorkspace");
        const list = $("firmingRulesProjectList");
        const empty = $("firmingRulesWorkspaceEmpty");
        const content = $("firmingRulesWorkspaceContent");
        const status = $("firmingRulesWorkspaceStatus");
        const title = $("firmingRulesCurrentProjectTitle");
        const meta = $("firmingRulesCurrentProjectMeta");
        const tableBody = $("firmingRulesTableBody");
        if (!workspace || !list || !empty || !content || !status || !title || !meta || !tableBody) return;

        const projects = buildFallbackFirmingRulesProjects();
        const currentKey = workspace.dataset.currentProjectKey && projects.some(function (project) {
          return project.projectKey === workspace.dataset.currentProjectKey;
        }) ? workspace.dataset.currentProjectKey : (projects[0] ? projects[0].projectKey : "");
        const currentProject = projects.find(function (project) {
          return project.projectKey === currentKey;
        }) || null;

        workspace.classList.remove("hidden");
        status.textContent = projects.length ? (projects.length + " project(s) available") : "No project available.";

        list.innerHTML = projects.map(function (project) {
          const active = currentProject && project.projectKey === currentProject.projectKey;
          return (
            '<button type="button" data-fallback-firming-project-select="' + escapeHtml(project.projectKey) + '" class="w-full rounded-xl border px-3 py-3 text-left transition-all ' + (active ? "border-emerald-300 bg-emerald-50 shadow-sm ring-1 ring-emerald-200" : "border-slate-200 bg-white hover:bg-slate-100") + '">' +
              '<div class="text-sm font-semibold text-slate-900">' + escapeHtml(project.projectName) + '</div>' +
              '<div class="mt-1 text-xs text-slate-500">' + escapeHtml(project.projectContext || "No context") + '</div>' +
            '</button>'
          );
        }).join("");

        if (!currentProject) {
          empty.classList.remove("hidden");
          content.classList.add("hidden");
          return;
        }

        workspace.dataset.currentProjectKey = currentProject.projectKey;
        empty.classList.add("hidden");
        content.classList.remove("hidden");
        title.textContent = currentProject.projectName;
        meta.textContent = (currentProject.projectType || "No project type") + " | " + (currentProject.projectContext || "No context");

        const importBtn = $("firmingRulesImportBtn");
        if (importBtn) {
          importBtn.setAttribute("data-project-key", currentProject.projectKey);
          importBtn.setAttribute("data-bid-year", currentProject.bidYear || "");
          importBtn.setAttribute("data-currencies", JSON.stringify(currentProject.currencies));
        }

        tableBody.innerHTML = currentProject.currencies.length
          ? currentProject.currencies.map(function (currency) {
              const currKey = String(currency).toUpperCase();
              const options = Array.isArray(currentProject.importedOptions[currKey]) ? currentProject.importedOptions[currKey] : [];
              const datalistId = "firming-dl-" + currKey.replace(/[^A-Z0-9]/g, "_");
              return (
                '<tr>' +
                  '<td class="py-3 pr-4 font-semibold w-32">' + escapeHtml(currency) + '</td>' +
                  '<td class="py-3 px-4">' + (currKey === String(currentProject.projectCurrency || "").toUpperCase()
                    ? '<span class="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700">' + escapeHtml(currentProject.projectCurrency) + '</span>'
                    : '<span class="text-slate-300">--</span>') + '</td>' +
                  '<td class="py-3 pl-4">' +
                    '<input data-fallback-firming-rule-text data-project-key="' + escapeHtml(currentProject.projectKey) + '" data-currency="' + escapeHtml(currency) + '" type="text"' + (options.length ? ' list="' + datalistId + '"' : '') + ' class="w-full rounded-xl border-slate-200 px-3 py-2" placeholder="e.g. Fixed rate at contract signature" value="' + escapeHtml(currentProject.firmingTexts[currKey] || "") + '"/>' +
                    (options.length ? '<datalist id="' + datalistId + '">' + options.map(function (opt) { return '<option value="' + escapeHtml(opt) + '">'; }).join("") + '</datalist>' : '') +
                  '</td>' +
                '</tr>'
              );
            }).join("")
          : '<tr><td colspan="3" class="py-6 text-center text-sm text-slate-500">No currency found in Synthesis or Cost Centers for this project.</td></tr>';
      }

      function createFallbackPriceListRow() {
        return {
          id: "pl_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
          values: {},
        };
      }

      function normalizeFallbackPriceListProjectConfig(projectConfig) {
        const config = projectConfig && typeof projectConfig === "object" ? projectConfig : {};
        const count = Math.max(0, Math.min(9, Math.round(toNumber(config.count) || 0)));
        const rows = Array.isArray(config.rows) ? config.rows.map(function (row, index) {
          return {
            id: row && row.id ? String(row.id) : "pl_row_" + index,
            values: Object.assign({}, row && row.values ? row.values : {}),
          };
        }) : [];
        const textMappings = Array.from({ length: 9 }, function (_, index) {
          const value = Array.isArray(config.textMappings) ? config.textMappings[index] : "";
          return value || "Not applicable";
        });
        return { count: count, rows: rows, textMappings: textMappings };
      }

      function buildFallbackPriceListsProjects() {
        const persisted = readPriceListsFallbackState();
        return buildCombinedProjectPhaseProjects().map(function (project) {
          const lookupKeys = getProjectLookupKeys(project);
          const current = readMergedPersistedFallbackProjectState(persisted, lookupKeys);
          return Object.assign({}, project, {
            priceListsConfig: normalizeFallbackPriceListProjectConfig(current),
            persistedKeys: lookupKeys,
          });
        });
      }

      function saveFallbackPriceListsProjectConfig(projectKey, updater) {
        if (!projectKey) return;
        const projects = buildFallbackPriceListsProjects();
        const project = findProjectByStoredKey(projects, projectKey) || projects.find(function (entry) { return entry.projectKey === projectKey; });
        const storageKey = project ? project.projectKey : projectKey;
        const lookupKeys = project ? getProjectLookupKeys(project) : [projectKey];
        const currentState = readPriceListsFallbackState();
        const currentConfig = normalizeFallbackPriceListProjectConfig(readMergedPersistedFallbackProjectState(currentState, lookupKeys));
        const nextConfig = normalizeFallbackPriceListProjectConfig(typeof updater === "function" ? updater(currentConfig) : updater);
        currentState[storageKey] = nextConfig;
        writePriceListsFallbackState(currentState);
      }

      function getFallbackPriceListTextChoices(count) {
        return ["Project_name", "Phase", "Phase code", "Duration"]
          .concat(Array.from({ length: count }, function (_, index) { return "Client Price List " + (index + 1); }))
          .concat(["Not applicable"]);
      }

      function renderFallbackPriceListsWorkspace() {
        const workspace = $("priceListsWorkspace");
        const list = $("priceListsProjectList");
        const empty = $("priceListsWorkspaceEmpty");
        const content = $("priceListsWorkspaceContent");
        const status = $("priceListsWorkspaceStatus");
        const title = $("priceListsCurrentProjectTitle");
        const meta = $("priceListsCurrentProjectMeta");
        const countSelect = $("priceListsCountSelect");
        const tableHead = $("priceListsTableHead");
        const tableBody = $("priceListsTableBody");
        const mappingGrid = $("priceListsTextMappingGrid");
        const addRowBtn = $("priceListsAddRowBtn");
        if (!workspace || !list || !empty || !content || !status || !title || !meta || !countSelect || !tableHead || !tableBody || !mappingGrid || !addRowBtn) return;

        const projects = buildFallbackPriceListsProjects();
        const currentKey = workspace.dataset.currentProjectKey && projects.some(function (project) {
          return project.projectKey === workspace.dataset.currentProjectKey;
        }) ? workspace.dataset.currentProjectKey : (projects[0] ? projects[0].projectKey : "");
        const currentProject = projects.find(function (project) { return project.projectKey === currentKey; }) || null;

        workspace.classList.remove("hidden");
        setFallbackDetailWorkspaceActive(true);
        status.textContent = projects.length ? (projects.length + " project(s) available") : "No project available.";

        list.innerHTML = projects.map(function (project) {
          const active = currentProject && project.projectKey === currentProject.projectKey;
          const config = project.priceListsConfig || normalizeFallbackPriceListProjectConfig(null);
          const hasRows = config.rows.some(function (row) {
            return Object.values(row.values || {}).some(function (value) { return String(value || "").trim(); });
          });
          const badges = [
            '<span class="inline-flex items-center rounded-full border border-cyan-200 bg-cyan-50 px-2 py-0.5 text-[10px] font-bold text-cyan-700">' + config.count + ' PL</span>',
            hasRows ? '<span class="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">Rows</span>' : '<span class="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">Empty</span>',
          ].join("");
          return (
            '<button type="button" data-fallback-price-lists-project-select="' + escapeHtml(project.projectKey) + '" class="w-full rounded-xl border px-3 py-3 text-left transition-all ' + (active ? "border-amber-300 bg-amber-50 shadow-sm ring-1 ring-amber-200" : "border-slate-200 bg-white hover:bg-slate-100") + '">' +
              '<div class="text-sm font-semibold text-slate-900">' + escapeHtml(project.projectName) + '</div>' +
              '<div class="mt-1 text-xs text-slate-500">' + escapeHtml(project.projectContext || "No context") + '</div>' +
              '<div class="mt-2 flex flex-wrap gap-1.5">' + badges + '</div>' +
            '</button>'
          );
        }).join("");

        if (!currentProject) {
          empty.classList.remove("hidden");
          content.classList.add("hidden");
          return;
        }

        workspace.dataset.currentProjectKey = currentProject.projectKey;
        empty.classList.add("hidden");
        content.classList.remove("hidden");
        title.textContent = currentProject.projectName;
        meta.textContent = (currentProject.projectType || "No project type") + " | " + (currentProject.projectContext || "No context");

        const config = currentProject.priceListsConfig || normalizeFallbackPriceListProjectConfig(null);
        countSelect.setAttribute("data-project-key", currentProject.projectKey);
        countSelect.innerHTML = Array.from({ length: 10 }, function (_, value) {
          return '<option value="' + value + '"' + (value === config.count ? " selected" : "") + '>' + value + '</option>';
        }).join("");
        addRowBtn.setAttribute("data-project-key", currentProject.projectKey);
        addRowBtn.disabled = config.count <= 0;
        addRowBtn.classList.toggle("opacity-50", config.count <= 0);
        addRowBtn.classList.toggle("cursor-not-allowed", config.count <= 0);

        const visibleColumns = Array.from({ length: config.count }, function (_, index) { return index + 1; });
        tableHead.innerHTML = '<tr>' + visibleColumns.map(function (colIndex) {
          return '<th class="text-left py-3 px-3 whitespace-nowrap">Client Price List ' + colIndex + '</th>';
        }).join("") + '<th class="text-right py-3 pl-3 w-16">Actions</th></tr>';
        if (config.count <= 0) {
          tableBody.innerHTML = '<tr><td colspan="1" class="py-8 text-center text-sm text-slate-500">Choose a Client price Lists number from 1 to 9 to create visible columns.</td></tr>';
        } else if (!config.rows.length) {
          tableBody.innerHTML = '<tr><td colspan="' + (config.count + 1) + '" class="py-8 text-center text-sm text-slate-500">No manual row yet. Use Add row to start.</td></tr>';
        } else {
          tableBody.innerHTML = config.rows.map(function (row) {
            return '<tr>' + visibleColumns.map(function (colIndex) {
              const field = "clientPriceList" + colIndex;
              return '<td class="py-2 px-3 min-w-[180px]"><input type="text" data-fallback-price-list-cell data-project-key="' + escapeHtml(currentProject.projectKey) + '" data-row-id="' + escapeHtml(row.id) + '" data-field="' + field + '" class="w-full rounded-xl border-slate-200 px-3 py-2 text-sm" value="' + escapeHtml((row.values || {})[field] || "") + '"/></td>';
            }).join("") +
            '<td class="py-2 pl-3 text-right"><button type="button" data-fallback-price-list-row-remove data-project-key="' + escapeHtml(currentProject.projectKey) + '" data-row-id="' + escapeHtml(row.id) + '" class="inline-flex items-center justify-center size-9 rounded-xl border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 transition-all" title="Remove row"><span class="material-symbols-outlined text-[18px]">delete</span></button></td>' +
            '</tr>';
          }).join("");
        }

        const choices = getFallbackPriceListTextChoices(config.count);
        mappingGrid.innerHTML = Array.from({ length: 9 }, function (_, index) {
          const currentValue = config.textMappings[index] || "Not applicable";
          const finalChoices = choices.indexOf(currentValue) >= 0 ? choices : choices.concat([currentValue]);
          return (
            '<label class="block rounded-xl border border-slate-200 bg-white px-4 py-3">' +
              '<span class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Text ' + (index + 1) + '</span>' +
              '<select data-fallback-price-list-text-map data-project-key="' + escapeHtml(currentProject.projectKey) + '" data-index="' + index + '" class="mt-2 w-full rounded-xl border-slate-200 px-3 py-2 text-sm">' +
                finalChoices.map(function (choice) {
                  return '<option value="' + escapeHtml(choice) + '"' + (choice === currentValue ? " selected" : "") + '>' + escapeHtml(choice) + '</option>';
                }).join("") +
              '</select>' +
            '</label>'
          );
        }).join("");
      }

      function saveFallbackProjectField(projectKey, field, value) {
        const current = readProjectPhaseFallbackState();
        const nextProject = Object.assign({}, current[projectKey] || {});
        nextProject[field] = value;
        current[projectKey] = nextProject;
        writeProjectPhaseFallbackState(current);
      }

      function saveFallbackPhaseField(projectKey, phaseKey, field, value) {
        const current = readProjectPhaseFallbackState();
        const nextProject = Object.assign({}, current[projectKey] || {});
        const phases = Object.assign({}, nextProject.phases || {});
        const phase = Object.assign({}, phases[phaseKey] || {});
        phase.enabled = true;
        phase[field] = value;
        phases[phaseKey] = phase;
        nextProject.phases = phases;
        current[projectKey] = nextProject;
        writeProjectPhaseFallbackState(current);
      }

      function addFallbackPhase(projectKey, phaseKey) {
        const current = readProjectPhaseFallbackState();
        const nextProject = Object.assign({}, current[projectKey] || {});
        const phases = Object.assign({}, nextProject.phases || {});
        phases[phaseKey] = Object.assign({}, phases[phaseKey] || {}, { enabled: true, durationYears: toNumber((phases[phaseKey] || {}).durationYears) || 0 });
        nextProject.phases = phases;
        current[projectKey] = nextProject;
        writeProjectPhaseFallbackState(current);
      }

      function addFallbackCustomPhase(projectKey, phaseKey) {
        const current = readProjectPhaseFallbackState();
        const nextProject = Object.assign({}, current[projectKey] || {});
        const phases = Object.assign({}, nextProject.phases || {});
        phases[phaseKey] = Object.assign({}, phases[phaseKey] || {}, {
          enabled: true,
          label: (phases[phaseKey] && phases[phaseKey].label) || phaseKey.replace(/_/g, " "),
          durationYears: toNumber((phases[phaseKey] || {}).durationYears) || 0,
          startDate: (phases[phaseKey] || {}).startDate || "",
          endDate: (phases[phaseKey] || {}).endDate || "",
          postWarrantyStartDate: (phases[phaseKey] || {}).postWarrantyStartDate || "",
          postWarrantyEndDate: (phases[phaseKey] || {}).postWarrantyEndDate || "",
        });
        nextProject.phases = phases;
        current[projectKey] = nextProject;
        writeProjectPhaseFallbackState(current);
      }

      function removeFallbackPhase(projectKey, phaseKey) {
        const current = readProjectPhaseFallbackState();
        const nextProject = Object.assign({}, current[projectKey] || {});
        const phases = Object.assign({}, nextProject.phases || {});
        delete phases[phaseKey];
        nextProject.phases = phases;
        current[projectKey] = nextProject;
        writeProjectPhaseFallbackState(current);
      }

      function getSharedProjectPhaseFallbackCards() {
        return getSharedWorkbooksForWorkspace()
          .filter(Boolean)
          .map(function (workbook) {
            const gp = workbook.generalParams || (workbook.sheets && workbook.sheets.generalParameters) || {};
            return {
              projectName: gp.project_name || workbook.fileName || workbook.projectKey || "Unnamed project",
              projectType: gp.project_type || "",
              projectContext: gp.project_context || "",
              serviceYear: gp.service_year || "",
              planningYear: gp.planning_year || "",
              correcStartYear: gp.correc_ovh_start_year || "",
              correcEndYear: gp.correc_ovh_end_year || "",
              contractDuration: gp.contract_duration_years || "",
            };
          })
          .sort(function (left, right) {
            return String(left.projectName).localeCompare(String(right.projectName));
          });
      }

      function getSharedWorkbooksForWorkspace() {
        if (Array.isArray(window.__costSummarySharedWorkbooks) && window.__costSummarySharedWorkbooks.length) {
          return window.__costSummarySharedWorkbooks.slice();
        }
        const workbookIndex = safeReadJson("shared-store-workbook-index-v1", []);
        if (!Array.isArray(workbookIndex) || !workbookIndex.length) {
          return [];
        }
        return workbookIndex
          .map(function (sourceId) {
            return readSharedWorkbookForWorkspace(sourceId);
          })
          .filter(Boolean);
      }

      function closeMenus() {
        document.querySelectorAll("[data-toolbar-menu]").forEach((menu) => menu.classList.add("hidden"));
        document.querySelectorAll("[data-toolbar-trigger]").forEach((trigger) => trigger.setAttribute("aria-expanded", "false"));
      }

      function toggleMenu(menuKey) {
        const menu = document.querySelector('[data-toolbar-menu="' + menuKey + '"]');
        const trigger = document.querySelector('[data-toolbar-trigger="' + menuKey + '"]');
        if (!menu || !trigger) return;
        const shouldOpen = menu.classList.contains("hidden");
        closeMenus();
        if (!shouldOpen) return;
        menu.classList.remove("hidden");
        trigger.setAttribute("aria-expanded", "true");
      }

      function closeDrawer() {
        $("moduleDrawer")?.classList.add("translate-x-full");
        $("moduleDrawerBackdrop")?.classList.add("hidden");
        document.body.classList.remove("overflow-hidden");
      }

      function closeProjectPhasesWorkspace() {
        window.__costSummaryUseFallbackProjectPhases = false;
        $("projectPhasesWorkspace")?.classList.add("hidden");
      }

      function closeCostCentersWorkspace() {
        window.__costSummaryUseFallbackCostCenters = false;
        $("costCentersWorkspace")?.classList.add("hidden");
      }

      function closeCurrencyExchangeWorkspace() {
        $("currencyExchangeWorkspace")?.classList.add("hidden");
      }

      function closeFirmingRulesWorkspace() {
        setFallbackDetailWorkspaceActive(false);
        $("firmingRulesWorkspace")?.classList.add("hidden");
      }

      function closePriceListsWorkspace() {
        setFallbackDetailWorkspaceActive(false);
        $("priceListsWorkspace")?.classList.add("hidden");
      }

      function closeGuidePlanningWorkspace() {
        window.__costSummaryUseFallbackGuidePlanning = false;
        $("guidePlanningWorkspace")?.classList.add("hidden");
      }

      function closePioDefinitionWorkspace() {
        window.__costSummaryUseFallbackPioDefinition = false;
        $("pioDefinitionWorkspace")?.classList.add("hidden");
      }

      function setFallbackDetailWorkspaceActive(active) {
        window.__costSummaryUseFallbackDetailWorkspace = !!active;
      }

      function fallbackInteractionIsActive() {
        return !!(
          window.__costSummaryUseFallbackProjectPhases ||
          window.__costSummaryUseFallbackCostCenters ||
          window.__costSummaryUseFallbackPioDefinition ||
          window.__costSummaryUseFallbackGuidePlanning ||
          window.__costSummaryUseFallbackDetailWorkspace
        );
      }

      function closeWorkloadSynthesisWorkspace() {
        setFallbackDetailWorkspaceActive(false);
        $("workloadSynthesisWorkspace")?.classList.add("hidden");
      }

      function renderFallbackWorkloadSynthesisWorkspace() {
        const workspace = $("workloadSynthesisWorkspace");
        const list = $("workloadSynthesisProjectList");
        const empty = $("workloadSynthesisWorkspaceEmpty");
        const content = $("workloadSynthesisWorkspaceContent");
        const status = $("workloadSynthesisWorkspaceStatus");
        const title = $("workloadSynthesisCurrentProjectTitle");
        const meta = $("workloadSynthesisCurrentProjectMeta");
        const gapAlert = $("workloadSynthesisGapAlert");
        const missingData = $("workloadSynthesisMissingData");
        const tableBody = $("workloadSynthesisTableBody");
        if (!workspace || !list || !empty || !content || !status || !title || !meta || !gapAlert || !missingData || !tableBody) return;

        const projects = buildFallbackWorkloadSynthesisProjects();
        const currentKey = workspace.dataset.currentProjectKey && projects.some(function (p) { return p.projectKey === workspace.dataset.currentProjectKey; })
          ? workspace.dataset.currentProjectKey
          : (projects[0] ? projects[0].projectKey : "");
        const currentProject = projects.find(function (p) { return p.projectKey === currentKey; }) || null;

        workspace.classList.remove("hidden");
        status.textContent = projects.length ? (projects.length + " project(s) available") : "No project available.";

        const allOverridesForList = readWorkloadOverridesFallbackState();
        list.innerHTML = projects.map(function (project) {
          const active = currentProject && project.projectKey === currentProject.projectKey;
          const projOverrides = allOverridesForList[project.projectKey] || {};
          const hasImport = Array.isArray(projOverrides.importedRows) && projOverrides.importedRows.length > 0;
          return (
            '<div class="relative group">' +
              '<button type="button" data-fallback-workload-project-select="' + escapeHtml(project.projectKey) + '" class="w-full rounded-xl border px-3 py-3 pr-10 text-left transition-all ' + (active ? "border-violet-300 bg-violet-50 shadow-sm ring-1 ring-violet-200" : "border-slate-200 bg-white hover:bg-slate-100") + '">' +
                '<div class="text-sm font-semibold text-slate-900">' + escapeHtml(project.projectName) + '</div>' +
                '<div class="mt-1 flex items-center gap-1.5">' +
                  (project.hasSynthesis
                    ? '<span class="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">S</span>'
                    : '<span class="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-400 border border-slate-200">S</span>') +
                  (project.hasHoursReport
                    ? '<span class="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">HR</span>'
                    : '<span class="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-400 border border-slate-200">HR</span>') +
                  (project.gapAlerts.length ? '<span class="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">' + project.gapAlerts.length + ' gap</span>' : '') +
                  (hasImport ? '<span class="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200">XLS</span>' : '') +
                '</div>' +
              '</button>' +
              '<button type="button" title="Import Workload Excel" data-fallback-workload-import-btn data-project-key="' + escapeHtml(project.projectKey) + '" class="absolute top-2 right-2 inline-flex items-center justify-center size-6 rounded-lg text-slate-400 hover:text-violet-700 hover:bg-violet-50 transition-all">' +
                '<span class="material-symbols-outlined text-[16px]">upload_file</span>' +
              '</button>' +
            '</div>'
          );
        }).join("");

        if (!currentProject) {
          empty.classList.remove("hidden");
          content.classList.add("hidden");
          return;
        }

        workspace.dataset.currentProjectKey = currentProject.projectKey;
        empty.classList.add("hidden");
        content.classList.remove("hidden");
        title.textContent = currentProject.projectName;
        meta.textContent = (currentProject.projectType || "No project type") + " | " + (currentProject.projectContext || "No context");

        if (currentProject.gapAlerts.length) {
          gapAlert.classList.remove("hidden");
          gapAlert.innerHTML = '<div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-red-50 border border-red-200 text-sm font-semibold text-red-700"><span class="material-symbols-outlined text-[16px]">warning</span>' + currentProject.gapAlerts.length + ' negative gap alert(s)</div>';
        } else {
          gapAlert.classList.add("hidden");
          gapAlert.innerHTML = "";
        }

        if (!currentProject.hasSynthesis || !currentProject.hasHoursReport) {
          missingData.classList.remove("hidden");
          missingData.innerHTML =
            (!currentProject.hasSynthesis ? '<div class="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"><span class="material-symbols-outlined text-[18px] text-amber-500 shrink-0">info</span>Synthesis data not found for this project. Import the corresponding workbook.</div>' : "") +
            (!currentProject.hasHoursReport ? '<div class="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"><span class="material-symbols-outlined text-[18px] text-amber-500 shrink-0">info</span>Hours Report data not found for this project. Import the corresponding workbook.</div>' : "");
        } else {
          missingData.classList.add("hidden");
          missingData.innerHTML = "";
        }

        // Edit mode state from toggle button
        const editToggle = $("workloadSynthesisEditToggle");
        const editMode = editToggle && editToggle.dataset.active === "true";

        if (editToggle) {
          if (editMode) {
            editToggle.className = "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-violet-300 bg-violet-50 text-sm font-semibold text-violet-700 hover:bg-violet-100 transition-all shrink-0";
            editToggle.innerHTML = '<span class="material-symbols-outlined text-[18px]">edit_off</span>Done';
          } else {
            editToggle.className = "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-all shrink-0";
            editToggle.innerHTML = '<span class="material-symbols-outlined text-[18px]">edit</span>Edit';
          }
        }

        const overrides = readWorkloadOverridesFallbackState()[currentProject.projectKey] || {};
        const importedRows = Array.isArray(overrides.importedRows) && overrides.importedRows.length ? overrides.importedRows : null;
        const baseRows = importedRows || currentProject.workloadRows;
        const usingImport = !!importedRows;

        // Show import source banner
        const workloadTableSourceBanner = $("workloadTableSourceBanner");
        if (workloadTableSourceBanner) {
          if (usingImport) {
            workloadTableSourceBanner.classList.remove("hidden");
            workloadTableSourceBanner.innerHTML =
              '<div class="flex items-center justify-between gap-3 rounded-xl border border-violet-200 bg-violet-50 px-4 py-2.5">' +
                '<div class="flex items-center gap-2 text-sm text-violet-800">' +
                  '<span class="material-symbols-outlined text-[16px] text-violet-500 shrink-0">upload_file</span>' +
                  '<span>Data loaded from imported Excel file (<strong>' + importedRows.length + ' row(s)</strong>). Auto-computed data is overridden.</span>' +
                '</div>' +
                '<button type="button" data-fallback-workload-reset-import data-project-key="' + escapeHtml(currentProject.projectKey) + '" class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-violet-200 bg-white text-xs font-semibold text-violet-700 hover:bg-violet-100 transition-all shrink-0">' +
                  '<span class="material-symbols-outlined text-[14px]">restart_alt</span>Reset to auto' +
                '</button>' +
              '</div>';
          } else {
            workloadTableSourceBanner.classList.add("hidden");
            workloadTableSourceBanner.innerHTML = "";
          }
        }

        function fmtNum(v) { return v === 0 ? "0" : String(v); }
        function fmtPct(v) { return (Math.round(v * 10000) / 100).toFixed(1) + "%"; }

        function resolveVal(row, col) {
          const k = row.subsystem + "|" + row.shift + "|" + col;
          return Object.prototype.hasOwnProperty.call(overrides, k) ? overrides[k] : row[col];
        }

        function cell(tdClass, row, col, isPct, extra) {
          const val = resolveVal(row, col);
          const isGap = col === "gapHours" && val < 0;
          const display = isPct ? fmtPct(val) : fmtNum(val);
          const inputVal = isPct ? String(Math.round(val * 10000) / 100) : String(val);
          const content = editMode
            ? '<input type="number" step="any" data-fallback-workload-cell data-project-key="' + escapeHtml(currentProject.projectKey) + '" data-row-key="' + escapeHtml(row.subsystem + "|" + row.shift) + '" data-col="' + escapeHtml(col) + '" data-is-pct="' + (isPct ? "1" : "0") + '" class="w-full min-w-[72px] rounded-lg border border-violet-200 bg-white px-2 py-1 text-right text-sm tabular-nums focus:outline-none focus:ring-1 focus:ring-violet-400" value="' + escapeHtml(inputVal) + '">'
            : '<span class="' + (isGap ? "font-semibold text-red-700" : "") + '">' + display + '</span>';
          return '<td class="' + tdClass + (extra || "") + '">' + content + '</td>';
        }

        const extraRows = Array.isArray(overrides.extraRows) ? overrides.extraRows : [];

        const baseHtml = baseRows.length
          ? baseRows.map(function (row) {
              const gapVal = resolveVal(row, "gapHours");
              const isGap = gapVal < 0;
              const px = "py-2 px-3";
              return (
                '<tr class="' + (isGap ? "bg-red-50" : "") + '">' +
                  '<td class="py-2 pr-3 font-semibold whitespace-nowrap text-sm">' + escapeHtml(row.subsystem) + '</td>' +
                  '<td class="py-2 px-3">' +
                    '<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ' + (row.shift === "Day" ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-indigo-50 text-indigo-700 border-indigo-200") + '">' + escapeHtml(row.shift) + '</span>' +
                  '</td>' +
                  cell(px + " text-right", row, "preventiveHours",      false) +
                  cell(px + " text-right", row, "dayNightPct",           true)  +
                  cell(px + " text-right", row, "remainingHours",        false) +
                  cell(px + " text-right", row, "paliativeHours",        false) +
                  cell(px + " text-right", row, "correctiveHours",       false) +
                  cell(px + " text-right", row, "allCorrectiveHours",    false) +
                  cell(px + " text-right", row, "correcPrevPct",         true)  +
                  cell(px + " text-right", row, "gapHours",              false) +
                  cell(px + " text-right", row, "preventiveTechs",       false) +
                  cell(px + " text-right", row, "correctiveTechs",       false) +
                  cell(px + " text-right", row, "preventiveSupervisors", false) +
                  cell("py-2 pl-3 text-right", row, "correctiveSupervisors", false) +
                  '<td class="py-2 pl-3 w-8"></td>' +
                '</tr>'
              );
            }).join("")
          : '<tr><td colspan="15" class="py-6 text-center text-sm text-slate-500">No workload data available. Import a Workload Excel file or ensure both Synthesis and Hours Report are imported for this project.</td></tr>';

        function extraInput(type, col, row, extraClass) {
          const val = type === "text" ? escapeHtml(String(row[col] || "")) : escapeHtml(String(row[col] ?? 0));
          return '<input type="' + type + '" ' +
            'data-fallback-workload-extra-cell ' +
            'data-project-key="' + escapeHtml(currentProject.projectKey) + '" ' +
            'data-row-id="' + escapeHtml(row.id) + '" ' +
            'data-col="' + escapeHtml(col) + '" ' +
            'value="' + val + '" ' +
            'class="' + (extraClass || "") + ' rounded-lg border border-emerald-200 bg-white px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-400">';
        }

        const extraHtml = extraRows.map(function (row) {
          const shiftDay = row.shift === "Day";
          return (
            '<tr class="bg-emerald-50/60 border-l-2 border-emerald-300">' +
              '<td class="py-1.5 pr-3">' +
                extraInput("text", "subsystem", row, "w-full min-w-[90px]") +
              '</td>' +
              '<td class="py-1.5 px-3">' +
                '<select data-fallback-workload-extra-cell data-project-key="' + escapeHtml(currentProject.projectKey) + '" data-row-id="' + escapeHtml(row.id) + '" data-col="shift" ' +
                  'class="rounded-lg border ' + (shiftDay ? "border-amber-200 bg-amber-50 text-amber-700" : "border-indigo-200 bg-indigo-50 text-indigo-700") + ' px-2 py-1 text-[11px] font-bold focus:outline-none focus:ring-1 focus:ring-emerald-400">' +
                  '<option value="Day"' + (shiftDay ? " selected" : "") + '>Day</option>' +
                  '<option value="Night"' + (!shiftDay ? " selected" : "") + '>Night</option>' +
                '</select>' +
              '</td>' +
              '<td class="py-1.5 px-3 text-right text-slate-300 text-sm tabular-nums">—</td>' +
              '<td class="py-1.5 px-3 text-right text-slate-300 text-sm tabular-nums">—</td>' +
              '<td class="py-1.5 px-3 text-right text-slate-300 text-sm tabular-nums">—</td>' +
              '<td class="py-1.5 px-3 text-right text-slate-300 text-sm tabular-nums">—</td>' +
              '<td class="py-1.5 px-3 text-right text-slate-300 text-sm tabular-nums">—</td>' +
              '<td class="py-1.5 px-3 text-right text-slate-300 text-sm tabular-nums">—</td>' +
              '<td class="py-1.5 px-3 text-right text-slate-300 text-sm tabular-nums">—</td>' +
              '<td class="py-1.5 px-3 text-right text-slate-300 text-sm tabular-nums">—</td>' +
              '<td class="py-1.5 px-3 text-right">' + extraInput("number", "preventiveTechs",      row, "w-full min-w-[56px] text-right tabular-nums") + '</td>' +
              '<td class="py-1.5 px-3 text-right">' + extraInput("number", "correctiveTechs",      row, "w-full min-w-[56px] text-right tabular-nums") + '</td>' +
              '<td class="py-1.5 px-3 text-right">' + extraInput("number", "preventiveSupervisors",row, "w-full min-w-[56px] text-right tabular-nums") + '</td>' +
              '<td class="py-1.5 pl-3 text-right">' + extraInput("number", "correctiveSupervisors",row, "w-full min-w-[56px] text-right tabular-nums") + '</td>' +
              '<td class="py-1.5 pl-3 w-8">' +
                '<button type="button" title="Delete this row" ' +
                  'data-fallback-workload-delete-extra data-project-key="' + escapeHtml(currentProject.projectKey) + '" data-row-id="' + escapeHtml(row.id) + '" ' +
                  'class="inline-flex items-center justify-center size-6 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all">' +
                  '<span class="material-symbols-outlined text-[16px]">delete</span>' +
                '</button>' +
              '</td>' +
            '</tr>'
          );
        }).join("");

        tableBody.innerHTML = baseHtml + extraHtml;
      }

      // ─── White Collar Definition ──────────────────────────────────────────

      function buildWhiteCollarProjects() {
        const phaseProjects = buildCombinedProjectPhaseProjects();
        if (!phaseProjects.length) return [];

        const workloadProjects = buildFallbackWorkloadSynthesisProjects();
        const workloadByLookup = buildProjectLookupMap(workloadProjects);
        const subsystemByLookup = buildProjectLookupMap(buildFallbackSubsystemSourceProjects());

        const workloadOverrides = readWorkloadOverridesFallbackState();

        return phaseProjects.map(function (phaseProj) {
          const lookupKeys = getProjectLookupKeys(phaseProj);
          const wProj = findProjectByLookupKeys(workloadByLookup, lookupKeys);
          const subsystemProject = findProjectByLookupKeys(subsystemByLookup, lookupKeys);
          const wOverrides = readPersistedFallbackProjectState(workloadOverrides, lookupKeys);

          // base rows: importedRows overrides computed
          const baseRows = (Array.isArray(wOverrides.importedRows) && wOverrides.importedRows.length)
            ? wOverrides.importedRows
            : (wProj ? wProj.workloadRows : []);
          const extraRows = Array.isArray(wOverrides.extraRows) ? wOverrides.extraRows : [];

          // unique subsystems (order preserved)
          const seenSubs = new Set();
          const subsystems = [];
          baseRows.concat(extraRows).forEach(function (row) {
            const sub = String(row.subsystem || "").trim();
            if (sub && !seenSubs.has(sub)) { seenSubs.add(sub); subsystems.push(sub); }
          });
          (Array.isArray(subsystemProject && subsystemProject.subsystems) ? subsystemProject.subsystems : []).forEach(function (sub) {
            const subsystem = String(sub || "").trim();
            if (subsystem && !seenSubs.has(subsystem)) {
              seenSubs.add(subsystem);
              subsystems.push(subsystem);
            }
          });

          // White collar positions: selectedPositions from Cost Centers minus blue-collar keywords
          const EXCLUDED_KW = ["technician", "supervisor", "worker"];
          const ccProj = readCombinedCostCenterProject(phaseProj.projectKey, phaseProj.persistedKeys);
          const selectedPositions = Array.isArray(ccProj.selectedPositions) ? ccProj.selectedPositions : [];
          const whiteCollarPositions = selectedPositions.filter(function (pos) {
            const lower = String(pos).toLowerCase();
            return !EXCLUDED_KW.some(function (kw) { return lower.indexOf(kw) !== -1; });
          });

          return {
            projectKey:             phaseProj.projectKey,
            projectName:            phaseProj.projectName,
            projectType:            phaseProj.projectType,
            projectContext:         phaseProj.projectContext,
            persistedKeys:          lookupKeys,
            phases:                 phaseProj.phases,
            mobilisationPhaseCode:  phaseProj.mobilisationPhaseCode,
            recurrentCode:          phaseProj.recurrentCode,
            demobilisationCode:     phaseProj.demobilisationCode,
            subsystems:             subsystems,
            hasPhases:              phaseProj.phases.length > 0,
            hasSubsystems:          subsystems.length > 0,
            whiteCollarPositions:   whiteCollarPositions,
            workloadRows:           baseRows.concat(extraRows),
          };
        }).filter(function (p) { return p.hasPhases; });
      }

      // ─── Tools & Consumables ──────────────────────────────────────────────

      function normalizeWbsExcelKey(value) {
        return String(value || "").trim().toLowerCase()
          .replace(/[\s/\\-]+/g, "_")
          .replace(/[()]+/g, "")
          .replace(/[^\w]+/g, "_")
          .replace(/^_+|_+$/g, "")
          .replace(/_+/g, "_");
      }

      function normalizeWbsText(value) {
        return String(value || "").trim().toLowerCase().replace(/[_\s/\\-]+/g, " ").replace(/\s+/g, " ");
      }

      function normalizeWbsPositionType(value) {
        const normalized = normalizeWbsText(value);
        if (normalized.indexOf("manager") !== -1) return "Manager";
        if (normalized.indexOf("engineer") !== -1) return "Engineer";
        if (normalized.indexOf("supervisor") !== -1) return "Supervisor";
        if (normalized.indexOf("technician") !== -1 || normalized === "tech") return "Technician";
        if (normalized.indexOf("worker") !== -1) return "Worker";
        return "";
      }

      function isWbsOtherSupportCostDescription(value) {
        const normalized = normalizeWbsText(value);
        return normalized === "other support costs" || normalized === "other support cost";
      }

      function getWbsPeriodDefinitions(project) {
        return [
          { type: "mob", label: project.mobilisationPhaseCode || "MOB" },
          { type: "rec", label: project.recurrentCode || "REC" },
          { type: "dem", label: project.demobilisationCode || "DEM" },
        ];
      }

      function createWbsSubsystemResolver(subsystems) {
        const sourceSubsystems = Array.isArray(subsystems) ? subsystems : [];
        const subsystemLookup = new Map(sourceSubsystems.map(function (subsystem) {
          return [normalizeWbsText(subsystem), subsystem];
        }));
        return function resolveWbsSourceSubsystems(sourceSubsystemValue) {
          const normalized = normalizeWbsText(sourceSubsystemValue);
          if (!normalized) return [];
          const exact = subsystemLookup.get(normalized);
          if (exact) return [exact];
          if (normalized === "feeding system") {
            return sourceSubsystems.filter(function (subsystem) {
              const subKey = normalizeWbsText(subsystem);
              return subKey === "3rd rail" || subKey === "third rail" || subKey === "cat";
            });
          }
          return [];
        };
      }

      function mergeWbsSubsystems() {
        const seen = new Set();
        const result = [];
        Array.from(arguments).forEach(function (list) {
          (Array.isArray(list) ? list : []).forEach(function (value) {
            const subsystem = String(value || "").trim();
            const key = normalizeWbsText(subsystem);
            if (!subsystem || seen.has(key)) return;
            seen.add(key);
            result.push(subsystem);
          });
        });
        return result;
      }

      function getWbsRateKey(positionType) {
        return {
          Manager: "managerRate",
          Engineer: "engineerRate",
          Supervisor: "supervisorRate",
          Technician: "technicianRate",
          Worker: "workerRate",
        }[positionType] || "";
      }

      function buildWbsProjects() {
        const persisted = readWbsFallbackState();
        const oscState = readOscFallbackState();
        const tcState = readToolsConsumablesFallbackState();
        const vehiclesState = readVehiclesFallbackState();
        const guidePlanningProjects = buildFallbackGuidePlanningProjects();
        const guidePlanningByLookup = buildProjectLookupMap(guidePlanningProjects);
        const workloadProjects = buildFallbackWorkloadSynthesisProjects();
        const workloadByLookup = buildProjectLookupMap(workloadProjects);
        return buildWhiteCollarProjects().map(function (project) {
          const lookupKeys = getProjectLookupKeys(project);
          const current = readPersistedFallbackProjectState(persisted, lookupKeys);
          const importedRows = Array.isArray(current.importedRows) ? current.importedRows : [];
          const materialImportedRows = Array.isArray(current.materialImportedRows) ? current.materialImportedRows : [];
          const subcontractingImportedRows = Array.isArray(current.subcontractingImportedRows) ? current.subcontractingImportedRows : [];
          const overhaulRenewalImportedRows = Array.isArray(current.overhaulRenewalImportedRows) ? current.overhaulRenewalImportedRows : [];
          const guidePlanningProject = findProjectByLookupKeys(guidePlanningByLookup, lookupKeys)
            || guidePlanningProjects.find(function (candidate) {
              return normalizeWorkspaceKey(candidate.projectKey) === normalizeWorkspaceKey(project.projectKey)
                || normalizeWorkspaceKey(candidate.projectName) === normalizeWorkspaceKey(project.projectName);
            })
            || null;
          const workloadProject = findProjectByLookupKeys(workloadByLookup, lookupKeys) || null;
          const otherSupportCostProject = fillMissingImportedPhaseValues(
            readPersistedFallbackProjectState(oscState, lookupKeys),
            project.phases
          );
          const toolsConsumablesProject = forceZeroMobWithoutPostWarranty(
            fillMissingImportedPhaseValues(
              readMergedPersistedFallbackProjectState(tcState, lookupKeys),
              project.phases
            ),
            project.phases
          );
          const vehiclesProject = fillMissingImportedPhaseValues(
            readPersistedFallbackProjectState(vehiclesState, lookupKeys),
            project.phases
          );
          return Object.assign({}, project, {
            persistedKeys: lookupKeys,
            wbsImportedRows: importedRows,
            wbsFileName: current.fileName || "",
            wbsImportedAt: current.importedAt || "",
            wbsRowOverrides: Object.assign({}, current.rowOverrides || {}),
            wbsMaterialImportedRows: materialImportedRows,
            wbsMaterialFileName: current.materialFileName || "",
            wbsMaterialImportedAt: current.materialImportedAt || "",
            wbsMaterialRowOverrides: Object.assign({}, current.materialRowOverrides || {}),
            wbsSubcontractingImportedRows: subcontractingImportedRows,
            wbsSubcontractingFileName: current.subcontractingFileName || "",
            wbsSubcontractingImportedAt: current.subcontractingImportedAt || "",
            wbsSubcontractingRowOverrides: Object.assign({}, current.subcontractingRowOverrides || {}),
            wbsOverhaulRenewalImportedRows: overhaulRenewalImportedRows,
            wbsOverhaulRenewalFileName: current.overhaulRenewalFileName || "",
            wbsOverhaulRenewalImportedAt: current.overhaulRenewalImportedAt || "",
            wbsOverhaulRenewalRowOverrides: Object.assign({}, current.overhaulRenewalRowOverrides || {}),
            wbsSynthesisRows: Array.isArray(workloadProject && workloadProject.synthesisRows) ? workloadProject.synthesisRows : [],
            wbsOverhaulRenewalPlanningRows: Array.isArray(workloadProject && workloadProject.overhaulRenewalPlanningRows) ? workloadProject.overhaulRenewalPlanningRows : [],
            wbsDeqVmiPlanningRows: Array.isArray(workloadProject && workloadProject.deqVmiPlanningRows) ? workloadProject.deqVmiPlanningRows : [],
            wbsGuidePlanningProject: guidePlanningProject,
            wbsOtherSupportCostProject: otherSupportCostProject,
            wbsToolsConsumablesProject: toolsConsumablesProject,
            wbsVehiclesProject: vehiclesProject,
            hasWbsImport: importedRows.length > 0,
            hasWbsMaterialImport: materialImportedRows.length > 0,
            hasWbsSubcontractingImport: subcontractingImportedRows.length > 0,
            hasWbsOverhaulRenewalImport: overhaulRenewalImportedRows.length > 0,
          });
        });
      }

      function saveWbsProject(projectKey, mutator) {
        if (!projectKey) return;
        const current = readWbsFallbackState();
        const nextProject = Object.assign({}, current[projectKey] || {});
        current[projectKey] = mutator(nextProject) || nextProject;
        writeWbsFallbackState(current);
      }

      function saveWbsRowField(projectKey, rowKey, field, value) {
        if (!projectKey || !rowKey || !field) return;
        saveWbsProject(projectKey, function (project) {
          const rowOverrides = Object.assign({}, project.rowOverrides || {});
          const row = Object.assign({}, rowOverrides[rowKey] || {});
          row[field] = value || "";
          rowOverrides[rowKey] = row;
          project.rowOverrides = rowOverrides;
          return project;
        });
      }

      function saveWbsMaterialRowField(projectKey, rowKey, field, value) {
        if (!projectKey || !rowKey || !field) return;
        saveWbsProject(projectKey, function (project) {
          const rowOverrides = Object.assign({}, project.materialRowOverrides || {});
          const row = Object.assign({}, rowOverrides[rowKey] || {});
          row[field] = value || "";
          rowOverrides[rowKey] = row;
          project.materialRowOverrides = rowOverrides;
          return project;
        });
      }

      function saveWbsSubcontractingRowField(projectKey, rowKey, field, value) {
        if (!projectKey || !rowKey || !field) return;
        saveWbsProject(projectKey, function (project) {
          const rowOverrides = Object.assign({}, project.subcontractingRowOverrides || {});
          const row = Object.assign({}, rowOverrides[rowKey] || {});
          row[field] = value || "";
          rowOverrides[rowKey] = row;
          project.subcontractingRowOverrides = rowOverrides;
          return project;
        });
      }

      function saveWbsOverhaulRenewalRowField(projectKey, rowKey, field, value) {
        if (!projectKey || !rowKey || !field) return;
        saveWbsProject(projectKey, function (project) {
          const rowOverrides = Object.assign({}, project.overhaulRenewalRowOverrides || {});
          const row = Object.assign({}, rowOverrides[rowKey] || {});
          row[field] = value || "";
          rowOverrides[rowKey] = row;
          project.overhaulRenewalRowOverrides = rowOverrides;
          return project;
        });
      }

      function findWbsSheetName(workbook, expectedKey) {
        return workbook.SheetNames.find(function (name) {
          const key = normalizeWbsExcelKey(name);
          return key === expectedKey || key.indexOf(expectedKey) !== -1;
        }) || "";
      }

      function parseWbsWorkloadRowsFromWorkbook(workbook) {
        const sheetName = findWbsSheetName(workbook, "workload");
        if (!sheetName) return { sheetName: "", rows: [] };
        const rawRows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: "", raw: false, blankrows: false });
        const seenImportedRows = new Set();
        const rows = rawRows.map(function (rawRow, index) {
          const row = {};
          Object.entries(rawRow).forEach(function (entry) {
            row[normalizeWbsExcelKey(entry[0])] = entry[1];
          });
          const description = String(row.description || "").trim();
          const positionType = normalizeWbsPositionType(row.position_type || row.positiontype || row.type || "");
          return {
            id: "wbs_" + index,
            description: description,
            positionType: positionType,
            subsystem: String(row.subsystem || row.sub_system || "").trim(),
            period: String(row.period || "").trim(),
            costsType: String(row.costs_type || row.cost_type || "").trim(),
            pbsIbs: String(row.pbs_ibs || row.pbs || row.ibs || "").trim(),
            abs: String(row.abs || "").trim(),
            associatedWp: String(row.associated_wp || row.associated_work_package || row.wp || "").trim(),
            tasks: String(row.tasks || row.task || "").trim(),
          };
        }).filter(function (row) {
          if (!row.description || !row.positionType) return false;
          const uniqueKey = [
            row.description,
            row.positionType,
            row.subsystem,
            row.period,
            row.costsType,
            row.pbsIbs,
            row.abs,
            row.associatedWp,
            row.tasks,
          ].map(normalizeWbsText).join("|");
          if (seenImportedRows.has(uniqueKey)) return false;
          seenImportedRows.add(uniqueKey);
          return true;
        });
        return { sheetName: sheetName, rows: rows };
      }

      function parseWbsMaterialRowsFromWorkbook(workbook) {
        const sheetName = findWbsSheetName(workbook, "materials");
        if (!sheetName) return { sheetName: "", rows: [] };
        const rawRows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: "", raw: false, blankrows: false });
        const seenImportedRows = new Set();
        const rows = rawRows.map(function (rawRow, index) {
          const row = {};
          Object.entries(rawRow).forEach(function (entry) {
            row[normalizeWbsExcelKey(entry[0])] = entry[1];
          });
          return {
            id: "wbs_material_" + index,
            description: String(row.description || "").trim(),
            subsystem: String(row.subsystem || row.sub_system || "").trim(),
            period: String(row.period || "").trim(),
            costsType: String(row.costs_type || row.cost_type || "").trim(),
            pbsIbs: String(row.pbs_ibs || row.pbs || row.ibs || "").trim(),
            abs: String(row.abs || "").trim(),
            associatedWp: String(row.associated_wp || row.associated_work_package || row.wp || "").trim(),
            tasks: String(row.tasks || row.task || "").trim(),
          };
        }).filter(function (row) {
          const description = normalizeWbsMaterialDescription(row.description);
          const isProjectLevelMaterial = ["Other Support Costs", "Tools", "PPE", "Vehicles"].indexOf(description) !== -1;
          if (!row.description || (!row.subsystem && !isProjectLevelMaterial)) return false;
          const uniqueKey = [
            row.description,
            row.subsystem,
            row.period,
            row.costsType,
            row.pbsIbs,
            row.abs,
            row.associatedWp,
            row.tasks,
          ].map(normalizeWbsText).join("|");
          if (seenImportedRows.has(uniqueKey)) return false;
          seenImportedRows.add(uniqueKey);
          return true;
        });
        return { sheetName: sheetName, rows: rows };
      }

      function parseWbsSubcontractingRowsFromWorkbook(workbook) {
        const sheetName = findWbsSheetName(workbook, "subcontracting") || findWbsSheetName(workbook, "subcontract");
        if (!sheetName) return { sheetName: "", rows: [] };
        const rawRows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: "", raw: false, blankrows: false });
        const seenImportedRows = new Set();
        const rows = rawRows.map(function (rawRow, index) {
          const row = {};
          Object.entries(rawRow).forEach(function (entry) {
            row[normalizeWbsExcelKey(entry[0])] = entry[1];
          });
          return {
            id: "wbs_subcontracting_" + index,
            description: String(row.description || "").trim(),
            subsystem: String(row.subsystem || row.sub_system || "").trim(),
            period: String(row.period || "").trim(),
            costsType: String(row.costs_type || row.cost_type || "").trim(),
            pbsIbs: String(row.pbs_ibs || row.pbs || row.ibs || "").trim(),
            abs: String(row.abs || "").trim(),
            associatedWp: String(row.associated_wp || row.associated_work_package || row.wp || "").trim(),
            tasks: String(row.tasks || row.task || "").trim(),
          };
        }).filter(function (row) {
          const description = normalizeWbsSubcontractingDescription(row.description);
          const isProjectLevelSubcontracting = description === "Legal_Training";
          if (!row.description || (!row.subsystem && !isProjectLevelSubcontracting)) return false;
          const uniqueKey = [
            row.description,
            row.subsystem,
            row.period,
            row.costsType,
            row.pbsIbs,
            row.abs,
            row.associatedWp,
            row.tasks,
          ].map(normalizeWbsText).join("|");
          if (seenImportedRows.has(uniqueKey)) return false;
          seenImportedRows.add(uniqueKey);
          return true;
        });
        return { sheetName: sheetName, rows: rows };
      }

      function findWbsOverhaulRenewalSheetName(workbook) {
        const candidates = ["ovh_renew", "ovh", "renew", "overhaul_renew", "overhaul_renewal", "overhaul_renewals"];
        return workbook.SheetNames.find(function (name) {
          const key = normalizeWbsExcelKey(name);
          return candidates.some(function (candidate) {
            return key === candidate || key.indexOf(candidate) !== -1;
          });
        }) || "";
      }

      function parseWbsOverhaulRenewalRowsFromWorkbook(workbook) {
        const sheetName = findWbsOverhaulRenewalSheetName(workbook);
        if (!sheetName) return { sheetName: "", rows: [] };
        const rawRows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: "", raw: false, blankrows: false });
        const seenImportedRows = new Set();
        const rows = rawRows.map(function (rawRow, index) {
          const row = {};
          Object.entries(rawRow).forEach(function (entry) {
            row[normalizeWbsExcelKey(entry[0])] = entry[1];
          });
          return {
            id: "wbs_overhaul_renewal_" + index,
            description: String(row.description || "").trim(),
            type: String(row.type || "").trim(),
            subsystem: String(row.subsystem || row.sub_system || "").trim(),
            period: String(row.period || "").trim(),
            costsType: String(row.costs_type || row.cost_type || "").trim(),
            pbsIbs: String(row.pbs_ibs || row.pbs || row.ibs || "").trim(),
            abs: String(row.abs || "").trim(),
            associatedWp: String(row.associated_wp || row.associated_work_package || row.wp || "").trim(),
            tasks: String(row.tasks || row.task || "").trim(),
          };
        }).filter(function (row) {
          const description = normalizeWbsOverhaulRenewalDescription(row.description);
          if (!description || !row.subsystem) return false;
          const uniqueKey = [
            row.description,
            row.type,
            row.subsystem,
            row.period,
            row.costsType,
            row.pbsIbs,
            row.abs,
            row.associatedWp,
            row.tasks,
          ].map(normalizeWbsText).join("|");
          if (seenImportedRows.has(uniqueKey)) return false;
          seenImportedRows.add(uniqueKey);
          return true;
        });
        return { sheetName: sheetName, rows: rows };
      }

      function importWbsFromExcel(projectKey, file) {
        if (!file || !projectKey) return;
        if (typeof XLSX === "undefined") { window.alert("XLSX library is not available on this page."); return; }

        const reader = new FileReader();
        reader.onload = function (evt) {
          try {
            const data = new Uint8Array(evt.target.result);
            const wb = XLSX.read(data, { type: "array" });
            const parsed = parseWbsWorkloadRowsFromWorkbook(wb);
            if (!parsed.sheetName) {
              window.alert("No 'Workload' sheet found in this WBS Excel file. Available sheets: " + wb.SheetNames.join(", "));
              return;
            }

            if (!parsed.rows.length) {
              window.alert("No valid WBS rows found. Expected at least Description and Position type columns in the Workload sheet.");
              return;
            }

            saveWbsProject(projectKey, function (project) {
              project.importedRows = parsed.rows;
              project.fileName = file.name || "";
              project.importedAt = new Date().toISOString();
              project.rowOverrides = {};
              return project;
            });
            if (typeof window.updateToolbarStatusDots === "function") window.updateToolbarStatusDots();
            renderFallbackWbsWorkspace();
          } catch (err) {
            console.error("WBS Excel import error:", err);
            window.alert("Failed to parse WBS Excel file: " + (err.message || err));
          }
        };
        reader.readAsArrayBuffer(file);
      }

      function importWbsMaterialsFromExcel(projectKey, file) {
        if (!file || !projectKey) return;
        if (typeof XLSX === "undefined") { window.alert("XLSX library is not available on this page."); return; }

        const reader = new FileReader();
        reader.onload = function (evt) {
          try {
            const data = new Uint8Array(evt.target.result);
            const wb = XLSX.read(data, { type: "array" });
            const parsed = parseWbsMaterialRowsFromWorkbook(wb);
            if (!parsed.sheetName) {
              window.alert("No 'Materials' sheet found in this WBS Excel file. Available sheets: " + wb.SheetNames.join(", "));
              return;
            }

            if (!parsed.rows.length) {
              window.alert("No valid WBS material rows found. Expected Description + Subsystem columns in the Materials sheet, except 'Other Support Costs' rows where Subsystem can be empty.");
              return;
            }

            saveWbsProject(projectKey, function (project) {
              project.materialImportedRows = parsed.rows;
              project.materialFileName = file.name || "";
              project.materialImportedAt = new Date().toISOString();
              project.materialRowOverrides = {};
              return project;
            });
            if (typeof window.updateToolbarStatusDots === "function") window.updateToolbarStatusDots();
            renderFallbackWbsWorkspace();
          } catch (err) {
            console.error("WBS Materials Excel import error:", err);
            window.alert("Failed to parse WBS Materials Excel file: " + (err.message || err));
          }
        };
        reader.readAsArrayBuffer(file);
      }

      function importWbsSubcontractingFromExcel(projectKey, file) {
        if (!file || !projectKey) return;
        if (typeof XLSX === "undefined") { window.alert("XLSX library is not available on this page."); return; }

        const reader = new FileReader();
        reader.onload = function (evt) {
          try {
            const data = new Uint8Array(evt.target.result);
            const wb = XLSX.read(data, { type: "array" });
            const parsed = parseWbsSubcontractingRowsFromWorkbook(wb);
            if (!parsed.sheetName) {
              window.alert("No 'Subcontracting' sheet found in this WBS Excel file. Available sheets: " + wb.SheetNames.join(", "));
              return;
            }

            if (!parsed.rows.length) {
              window.alert("No valid WBS subcontracting rows found. Expected Description + Subsystem columns in the Subcontracting sheet, except 'Legal_Training' rows where Subsystem can be empty.");
              return;
            }

            saveWbsProject(projectKey, function (project) {
              project.subcontractingImportedRows = parsed.rows;
              project.subcontractingFileName = file.name || "";
              project.subcontractingImportedAt = new Date().toISOString();
              project.subcontractingRowOverrides = {};
              return project;
            });
            if (typeof window.updateToolbarStatusDots === "function") window.updateToolbarStatusDots();
            renderFallbackWbsWorkspace();
          } catch (err) {
            console.error("WBS Subcontracting Excel import error:", err);
            window.alert("Failed to parse WBS Subcontracting Excel file: " + (err.message || err));
          }
        };
        reader.readAsArrayBuffer(file);
      }

      function importWbsOverhaulRenewalFromExcel(projectKey, file) {
        if (!file || !projectKey) return;
        if (typeof XLSX === "undefined") { window.alert("XLSX library is not available on this page."); return; }

        const reader = new FileReader();
        reader.onload = function (evt) {
          try {
            const data = new Uint8Array(evt.target.result);
            const wb = XLSX.read(data, { type: "array" });
            const parsed = parseWbsOverhaulRenewalRowsFromWorkbook(wb);
            if (!parsed.sheetName) {
              window.alert("No 'Ovh & Renew' sheet found in this WBS Excel file. Available sheets: " + wb.SheetNames.join(", "));
              return;
            }

            if (!parsed.rows.length) {
              window.alert("No valid WBS Overhaul & Renewals rows found. Expected Description + Subsystem columns in the Ovh & Renew sheet.");
              return;
            }

            saveWbsProject(projectKey, function (project) {
              project.overhaulRenewalImportedRows = parsed.rows;
              project.overhaulRenewalFileName = file.name || "";
              project.overhaulRenewalImportedAt = new Date().toISOString();
              project.overhaulRenewalRowOverrides = {};
              return project;
            });
            if (typeof window.updateToolbarStatusDots === "function") window.updateToolbarStatusDots();
            renderFallbackWbsWorkspace();
          } catch (err) {
            console.error("WBS Overhaul & Renewals Excel import error:", err);
            window.alert("Failed to parse WBS Overhaul & Renewals Excel file: " + (err.message || err));
          }
        };
        reader.readAsArrayBuffer(file);
      }

      function importWbsCombinedFromExcel(projectKey, file) {
        if (!file || !projectKey) return;
        if (typeof XLSX === "undefined") { window.alert("XLSX library is not available on this page."); return; }

        const reader = new FileReader();
        reader.onload = function (evt) {
          try {
            const data = new Uint8Array(evt.target.result);
            const wb = XLSX.read(data, { type: "array" });
            const workload = parseWbsWorkloadRowsFromWorkbook(wb);
            const materials = parseWbsMaterialRowsFromWorkbook(wb);
            const subcontracting = parseWbsSubcontractingRowsFromWorkbook(wb);
            const overhaulRenewal = parseWbsOverhaulRenewalRowsFromWorkbook(wb);

            if (!workload.sheetName || !materials.sheetName || !subcontracting.sheetName || !overhaulRenewal.sheetName) {
              window.alert("The WBS Excel file must contain 'Workload', 'Materials', 'Subcontracting', and 'Ovh & Renew' sheets. Available sheets: " + wb.SheetNames.join(", "));
              return;
            }
            if (!workload.rows.length || !materials.rows.length || !subcontracting.rows.length || !overhaulRenewal.rows.length) {
              window.alert("The WBS Excel file was found, but valid rows are missing. Workload expects Description + Position type; Materials/Subcontracting expect Description + Subsystem, except project-level rows where Subsystem can be empty. Ovh & Renew expects Description + Subsystem.");
              return;
            }

            saveWbsProject(projectKey, function (project) {
              project.importedRows = workload.rows;
              project.fileName = file.name || "";
              project.importedAt = new Date().toISOString();
              project.rowOverrides = {};
              project.materialImportedRows = materials.rows;
              project.materialFileName = file.name || "";
              project.materialImportedAt = new Date().toISOString();
              project.materialRowOverrides = {};
              project.subcontractingImportedRows = subcontracting.rows;
              project.subcontractingFileName = file.name || "";
              project.subcontractingImportedAt = new Date().toISOString();
              project.subcontractingRowOverrides = {};
              project.overhaulRenewalImportedRows = overhaulRenewal.rows;
              project.overhaulRenewalFileName = file.name || "";
              project.overhaulRenewalImportedAt = new Date().toISOString();
              project.overhaulRenewalRowOverrides = {};
              return project;
            });
            if (typeof window.updateToolbarStatusDots === "function") window.updateToolbarStatusDots();
            renderFallbackWbsWorkspace();
          } catch (err) {
            console.error("WBS combined Excel import error:", err);
            window.alert("Failed to parse WBS Excel file: " + (err.message || err));
          }
        };
        reader.readAsArrayBuffer(file);
      }

      function buildGeneratedWbsWorkloadRows(project) {
        const periods = getWbsPeriodDefinitions(project);
        const wcOverrides = readPersistedFallbackProjectState(readWhiteCollarFallbackState(), getProjectLookupKeys(project));
        const subsystems = Array.isArray(project.subsystems) ? project.subsystems : [];
        const resolveWbsSourceSubsystems = createWbsSubsystemResolver(subsystems);

        function defaultRate(col, periodType, phaseHasWarranty) {
          if (col === "workerRate") return 0;
          if (periodType === "mob") return phaseHasWarranty ? 100 : 0;
          if (periodType === "rec") return 100;
          return 0;
        }

        function resolveRate(phaseKey, subsystem, periodType, col, phaseHasWarranty) {
          const key = phaseKey + "|" + subsystem + "|" + periodType + "|" + col;
          return Object.prototype.hasOwnProperty.call(wcOverrides, key)
            ? toNumber(wcOverrides[key]) || 0
            : defaultRate(col, periodType, phaseHasWarranty);
        }

        function resolveProjectRate(phaseKey, periodType, col, phaseHasWarranty) {
          if (!subsystems.length) return resolveRate(phaseKey, "", periodType, col, phaseHasWarranty);
          return subsystems.reduce(function (sum, subsystem) {
            return sum + resolveRate(phaseKey, subsystem, periodType, col, phaseHasWarranty);
          }, 0) / subsystems.length;
        }

        function workloadTotal(subsystem, field) {
          return (project.workloadRows || []).reduce(function (sum, row) {
            if (normalizeWbsText(row.subsystem) !== normalizeWbsText(subsystem)) return sum;
            return sum + (toNumber(row[field]) || 0);
          }, 0);
        }

        function hasDescriptionMarker(description, marker) {
          const text = normalizeWbsText(description);
          const normalizedMarker = normalizeWbsText(marker);
          if (text.indexOf(normalizedMarker) !== -1) return true;
          if (normalizedMarker.indexOf("preventive") !== -1 && text.indexOf("preventive") !== -1) return true;
          if (normalizedMarker.indexOf("corrective") !== -1 && text.indexOf("corrective") !== -1) return true;
          return text.indexOf("preventive") === -1 && text.indexOf("corrective") === -1;
        }

        function sourceRowMatchesPeriod(sourceRow, period) {
          const sourcePeriod = normalizeWbsText(sourceRow.period);
          if (!sourcePeriod) return true;
          return sourcePeriod === normalizeWbsText(period.type) || sourcePeriod === normalizeWbsText(period.label);
        }

        const rows = [];
        const seenGeneratedRows = new Set();
        (project.wbsImportedRows || []).forEach(function (sourceRow, sourceIndex) {
          const positionType = normalizeWbsPositionType(sourceRow.positionType);
          const rateKey = getWbsRateKey(positionType);
          if (!rateKey) return;

          const requiresSubsystem = ["Supervisor", "Technician", "Worker"].indexOf(positionType) !== -1;
          const sourceSubsystems = requiresSubsystem ? resolveWbsSourceSubsystems(sourceRow.subsystem) : [""];
          if (requiresSubsystem && !sourceSubsystems.length) return;

          project.phases.forEach(function (phase) {
            const phaseHasWarranty = !!(phase.postWarrantyStartDate && phase.postWarrantyEndDate);
            periods.forEach(function (period) {
              if (!sourceRowMatchesPeriod(sourceRow, period)) return;

              function pushRow(position, subsystem, variantKey) {
                const rowKey = ["wbs", phase.key, period.type, sourceRow.id || sourceIndex, variantKey || positionType, normalizeWbsText(position), normalizeWbsText(subsystem)].join("|");
                const override = project.wbsRowOverrides[rowKey] || {};
                const row = {
                  rowKey: rowKey,
                  phase: phase.label || phase.key,
                  position: position,
                  subsystem: subsystem,
                  period: period.label,
                  costsType: override.costsType !== undefined ? override.costsType : sourceRow.costsType,
                  pbsIbs: override.pbsIbs !== undefined ? override.pbsIbs : sourceRow.pbsIbs,
                  abs: override.abs !== undefined ? override.abs : sourceRow.abs,
                  associatedWp: override.associatedWp !== undefined ? override.associatedWp : sourceRow.associatedWp,
                  tasks: override.tasks !== undefined ? override.tasks : sourceRow.tasks,
                };
                const uniqueKey = [
                  row.phase,
                  row.position,
                  row.subsystem,
                  row.period,
                  row.costsType,
                  row.pbsIbs,
                  row.abs,
                  row.associatedWp,
                  row.tasks,
                ].map(normalizeWbsText).join("|");
                if (seenGeneratedRows.has(uniqueKey)) return;
                seenGeneratedRows.add(uniqueKey);
                rows.push(row);
              }

              if (positionType === "Manager" || positionType === "Engineer") {
                const rate = resolveProjectRate(phase.key, period.type, rateKey, phaseHasWarranty);
                if (!(rate > 0)) return;
                const hasWhiteCollarMatch = (project.whiteCollarPositions || []).some(function (position) {
                  const posText = normalizeWbsText(position);
                  if (!posText) return false;
                  if (positionType === "Engineer" && posText.indexOf("engineer") === -1) return false;
                  if (positionType === "Manager" && posText.indexOf("engineer") !== -1 && posText.indexOf("manager") === -1) return false;
                  return normalizeWbsText(sourceRow.description).indexOf(posText) !== -1;
                });
                if (hasWhiteCollarMatch) pushRow(sourceRow.description, "", positionType);
                return;
              }

              sourceSubsystems.forEach(function (sourceSubsystem) {
                const rate = resolveRate(phase.key, sourceSubsystem, period.type, rateKey, phaseHasWarranty);
                if (!(rate > 0)) return;

                if (positionType === "Worker") {
                  pushRow(sourceRow.description, sourceSubsystem, "Worker");
                  return;
                }

                const variants = positionType === "Technician"
                  ? [{ label: "Preventive_Technician", field: "preventiveTechs" }, { label: "Corrective_Technician", field: "correctiveTechs" }]
                  : [{ label: "Preventive_Supervisor", field: "preventiveSupervisors" }, { label: "Corrective_Supervisor", field: "correctiveSupervisors" }];
                variants.forEach(function (variant) {
                  if (!(workloadTotal(sourceSubsystem, variant.field) > 0)) return;
                  if (!hasDescriptionMarker(sourceRow.description, variant.label)) return;
                  pushRow(sourceRow.description, sourceSubsystem, variant.label);
                });
              });
            });
          });
        });
        return rows;
      }

      function normalizeWbsMaterialDescription(value) {
        const normalized = normalizeWbsText(value);
        if (normalized === "preventive spares" || normalized === "preventive spare") return "Preventive spares";
        if (normalized === "corrective spares" || normalized === "corrective spare") return "Corrective spares";
        if (normalized === "tools" || normalized === "tool") return "Tools";
        if (normalized === "consumables" || normalized === "consumable") return "Consumables";
        if (normalized === "ppe") return "PPE";
        if (normalized === "vehicles" || normalized === "vehicle") return "Vehicles";
        if (normalized === "other support costs" || normalized === "other support cost") return "Other Support Costs";
        return "";
      }

      function normalizeWbsSubcontractingDescription(value) {
        const normalized = normalizeWbsText(value);
        if (normalized === "preventive subcontract" || normalized === "preventive subcontracts") return "Preventive_Subcontract";
        if (normalized === "corrective subcontract" || normalized === "corrective subcontracts") return "Corrective_Subcontract";
        if (normalized === "technical training" || normalized === "technical trainings") return "Technical_Training";
        if (normalized === "legal training" || normalized === "legal trainings") return "Legal_Training";
        if (normalized === "technical support" || normalized === "technical supports") return "Technical_Support";
        if (normalized === "obsolescence monitoring") return "Obsolescence_Monitoring";
        if (normalized === "obsolescence treatment" || normalized === "obsolescence treatments") return "Obsolescence_Treatment";
        return "";
      }

      function normalizeWbsOverhaulRenewalDescription(value) {
        const normalized = normalizeWbsText(value);
        if (normalized === "repair" || normalized === "repairs") return "Repair";
        if (normalized === "overhaul" || normalized === "overhauls") return "Overhaul";
        if (normalized === "renewal" || normalized === "renewals") return "Renewal";
        return "";
      }

      function getWbsRowValueByCandidates(row, candidates) {
        if (!row) return "";
        const directKeys = Array.isArray(candidates) ? candidates : [];
        for (let index = 0; index < directKeys.length; index += 1) {
          const key = directKeys[index];
          if (Object.prototype.hasOwnProperty.call(row, key)) return row[key];
        }
        const normalizedLookup = {};
        Object.keys(row).forEach(function (key) {
          normalizedLookup[normalizeWbsExcelKey(key)] = row[key];
        });
        for (let index = 0; index < directKeys.length; index += 1) {
          const normalizedKey = normalizeWbsExcelKey(directKeys[index]);
          if (Object.prototype.hasOwnProperty.call(normalizedLookup, normalizedKey)) return normalizedLookup[normalizedKey];
        }
        return "";
      }

      function getWbsSubcontractingGuideType(description) {
        if (description === "Technical_Training") return "Training";
        if (description === "Obsolescence_Monitoring" || description === "Obsolescence_Treatment") return "Obsolescence";
        if (description === "Legal_Training") return "Legal_Training";
        if (description === "Preventive_Subcontract" || description === "Corrective_Subcontract" || description === "Technical_Support") return description;
        return "";
      }

      function guideSelectionIncludes(list, type) {
        const target = normalizeWbsText(type);
        return (Array.isArray(list) ? list : []).some(function (value) {
          const normalized = normalizeWbsText(value);
          return normalized === target || (target === "training" && normalized === "trining");
        });
      }

      function getMandatoryTrainingYearlyTotalsByPhase(project) {
        const mandatoryProjects = buildMandatoryTrainingProjects();
        const mandatoryByLookup = buildProjectLookupMap(mandatoryProjects);
        const mandatoryProject = findProjectByLookupKeys(mandatoryByLookup, getProjectLookupKeys(project)) || null;
        if (!mandatoryProject) return {};

        const projState = readMandatoryTrainingFallbackState();
        const persistedTrainingRows = readPersistedFallbackProjectState(projState, getProjectLookupKeys(mandatoryProject));
        const trainingRows = Array.isArray(persistedTrainingRows) ? persistedTrainingRows : MT_DEFAULT_ROWS;
        const wcOverrides = readPersistedFallbackProjectState(readWhiteCollarFallbackState(), getProjectLookupKeys(mandatoryProject));

        function nkMt(s) {
          return String(s || "").trim().toLowerCase()
            .replace(/[\s/_\-]+/g, "").replace(/[^\w]/g, "");
        }

        const wlBySub = {};
        (mandatoryProject.workloadRows || []).forEach(function (row) {
          const sub = String(row.subsystem || "").trim();
          if (!sub) return;
          if (!wlBySub[sub]) wlBySub[sub] = { totalTechs: 0, totalSupervisors: 0 };
          wlBySub[sub].totalTechs += (toNumber(row.preventiveTechs) || 0) + (toNumber(row.correctiveTechs) || 0);
          wlBySub[sub].totalSupervisors += (toNumber(row.preventiveSupervisors) || 0) + (toNumber(row.correctiveSupervisors) || 0);
        });

        function resolveRate(phaseKey, subsystem, colKey) {
          const k = phaseKey + "|" + subsystem + "|rec|" + colKey;
          if (Object.prototype.hasOwnProperty.call(wcOverrides, k)) return wcOverrides[k];
          if (colKey === "workerRate") return 0;
          if (colKey === "technicianRate" || colKey === "supervisorRate") return 100;
          return 0;
        }

        function resolveQtyMt(phaseKey, pos) {
          const k = "wct|" + phaseKey + "|rec|" + pos;
          return Object.prototype.hasOwnProperty.call(wcOverrides, k) ? wcOverrides[k] : 1;
        }

        function headcountForSubsystem(sub, phaseKey) {
          const wl = wlBySub[sub] || { totalTechs: 0, totalSupervisors: 0 };
          const techRate = resolveRate(phaseKey, sub, "technicianRate") / 100;
          const wkrRate = resolveRate(phaseKey, sub, "workerRate") / 100;
          const supRate = resolveRate(phaseKey, sub, "supervisorRate") / 100;
          return wl.totalTechs * (techRate + wkrRate) + wl.totalSupervisors * supRate;
        }

        function computeWorkload(personnelConcerned, phaseKey) {
          const entries = String(personnelConcerned || "").split(/[;,]/).map(function (s) { return s.trim(); }).filter(Boolean);
          if (!entries.length) return 0;
          if (entries.some(function (e) { return e.toLowerCase() === "all"; })) {
            let total = 0;
            mandatoryProject.subsystems.forEach(function (sub) { total += headcountForSubsystem(sub, phaseKey); });
            mandatoryProject.engPositions.forEach(function (pos) { total += resolveQtyMt(phaseKey, pos); });
            mandatoryProject.mgrPositions.forEach(function (pos) { total += resolveQtyMt(phaseKey, pos); });
            return Math.round(total * 10) / 10;
          }

          let total = 0;
          const addedSubs = new Set();
          entries.forEach(function (entry) {
            const normEntry = nkMt(entry);
            const lowerEntry = entry.toLowerCase();
            if (lowerEntry.indexOf("engineer") !== -1) {
              mandatoryProject.engPositions.forEach(function (pos) { total += resolveQtyMt(phaseKey, pos); });
              return;
            }
            if (lowerEntry.indexOf("management") !== -1 || lowerEntry.indexOf("manager") !== -1) {
              mandatoryProject.mgrPositions.forEach(function (pos) { total += resolveQtyMt(phaseKey, pos); });
              return;
            }
            mandatoryProject.subsystems.forEach(function (sub) {
              if (addedSubs.has(sub)) return;
              if (nkMt(sub) === normEntry || nkMt(sub).indexOf(normEntry) !== -1 || normEntry.indexOf(nkMt(sub)) !== -1) {
                total += headcountForSubsystem(sub, phaseKey);
                addedSubs.add(sub);
              }
            });
          });
          return Math.round(total * 10) / 10;
        }

        function computeYearlyCost(row, workload) {
          const periodicity = toNumber(row.periodicity) || 0;
          const costPerPerson = toNumber(row.costPerPerson) || 0;
          const costPerGroup = toNumber(row.costPerGroup) || 0;
          const maxPersPerGroup = toNumber(row.maxPersPerGroup) || 0;
          if (!periodicity) return 0;
          if (costPerGroup > 0 && maxPersPerGroup > 0) {
            const fullGroups = Math.floor(workload / maxPersPerGroup);
            const remaining = workload - fullGroups * maxPersPerGroup;
            const costCycle = fullGroups * costPerGroup + (remaining > 0 ? Math.min(remaining * costPerPerson, costPerGroup) : 0);
            return Math.round(costCycle / periodicity * 100) / 100;
          }
          return Math.round(workload * costPerPerson / periodicity * 100) / 100;
        }

        return (mandatoryProject.phases || []).reduce(function (totals, phase) {
          if (!phase || !phase.key) return totals;
          totals[phase.key] = trainingRows.reduce(function (sum, row) {
            return sum + computeYearlyCost(row, computeWorkload(row.personnelConcerned, phase.key));
          }, 0);
          return totals;
        }, {});
      }

      function buildGeneratedWbsMaterialRows(project) {
        const periods = getWbsPeriodDefinitions(project);
        const guideProject = project.wbsGuidePlanningProject || {};
        const selectedMobTypes = Array.isArray(guideProject.selectedMaterialTypes) ? guideProject.selectedMaterialTypes : [];
        const selectedRecTypes = Array.isArray(guideProject.selectedRecurrentMaterialTypes) ? guideProject.selectedRecurrentMaterialTypes : [];
        const demobTypes = Object.assign({}, guideProject.demobilizationMaterialMonthsByType || {});
        const otherSupportCosts = Object.assign({}, project.wbsOtherSupportCostProject || {});
        const toolsConsumables = Object.assign({}, project.wbsToolsConsumablesProject || {});
        const vehicles = Object.assign({}, project.wbsVehiclesProject || {});
        const materialSubsystems = mergeWbsSubsystems(project.subsystems);
        const resolveWbsSourceSubsystems = createWbsSubsystemResolver(materialSubsystems);

        function sourceRowMatchesPeriod(sourceRow, period) {
          const sourcePeriod = normalizeWbsText(sourceRow.period);
          if (!sourcePeriod) return true;
          return sourcePeriod === normalizeWbsText(period.type) || sourcePeriod === normalizeWbsText(period.label);
        }

        function materialAllowedForPeriod(description, periodType, phaseHasWarranty) {
          if (periodType === "mob") {
            if (!phaseHasWarranty) return false;
            if (description === "Preventive spares" || description === "Corrective spares") {
              return selectedMobTypes.indexOf(description) >= 0 || selectedMobTypes.indexOf("Spare Parts") >= 0;
            }
            return selectedMobTypes.indexOf(description) >= 0;
          }
          if (periodType === "rec") {
            return selectedRecTypes.indexOf(description) >= 0;
          }
          if (periodType === "dem") {
            if (["Preventive spares", "Corrective spares", "Vehicles"].indexOf(description) === -1) return false;
            return (toNumber(demobTypes[description]) || 0) > 0;
          }
          return false;
        }

        function storedPositive(data, phaseKey, subsystem, periodType, colKey) {
          const directKey = phaseKey + "|" + subsystem + "|" + periodType + "|" + colKey;
          if ((toNumber(data[directKey]) || 0) > 0) return true;
          const subsystemAliases = subsystem === "__shared__"
            ? ["__shared__", "Shared / Depot Pool", "Shared Depot Pool", "Shared/Depot Pool", "Depot Pool"]
            : subsystem === "__project_mgmt__"
              ? ["__project_mgmt__", "Project / Management", "Project Management", "Project/Management"]
              : [subsystem];
          const subsystemKeys = subsystemAliases.map(function (value) { return normalizeWbsText(value).trim(); });
          return Object.keys(data).some(function (key) {
            const parts = String(key || "").split("|");
            if (parts.length !== 4) return false;
            if (parts[0] !== phaseKey || parts[2] !== periodType || parts[3] !== colKey) return false;
            return subsystemKeys.indexOf(normalizeWbsText(parts[1]).trim()) !== -1 && (toNumber(data[key]) || 0) > 0;
          });
        }

        function otherSupportCostAllowedForPeriod(phase, periodType, phaseHasWarranty) {
          if (!phase || !phase.key) return false;
          if (periodType === "mob") {
            if (!phaseHasWarranty) return false;
            return (toNumber(otherSupportCosts[phase.key + "|mob|capex"]) || 0) > 0;
          }
          if (periodType === "rec") {
            return (toNumber(otherSupportCosts[phase.key + "|rec|opex"]) || 0) > 0;
          }
          if (periodType === "dem") {
            if (!((toNumber(demobTypes["Other Support Costs"]) || 0) > 0)) return false;
            return (toNumber(otherSupportCosts[phase.key + "|dem|capex"]) || 0) > 0
              || (toNumber(otherSupportCosts[phase.key + "|mob|capex"]) || 0) > 0;
          }
          return false;
        }

        function projectLevelMaterialAllowedForPeriod(description, phase, periodType, phaseHasWarranty) {
          if (!phase || !phase.key) return false;
          if (description === "Other Support Costs") {
            return otherSupportCostAllowedForPeriod(phase, periodType, phaseHasWarranty);
          }
          if (periodType === "mob" && !phaseHasWarranty) return false;
          if (description === "Tools") {
            return ["ind_tools", "coll_tools", "spec_tools"].some(function (colKey) {
              return storedPositive(toolsConsumables, phase.key, "__shared__", periodType, colKey);
            });
          }
          if (description === "PPE") {
            return storedPositive(toolsConsumables, phase.key, "__management__", periodType, "ppe");
          }
          if (description === "Vehicles") {
            if (periodType === "mob") {
              return storedPositive(vehicles, phase.key, "__project_mgmt__", "mob", "capex");
            }
            if (periodType === "rec") {
              return ["fuel", "opex"].some(function (colKey) {
                return storedPositive(vehicles, phase.key, "__project_mgmt__", "rec", colKey);
              });
            }
            if (periodType === "dem") {
              return ["capex", "fuel", "opex"].some(function (colKey) {
                return storedPositive(vehicles, phase.key, "__project_mgmt__", "dem", colKey);
              });
            }
          }
          return false;
        }

        const rows = [];
        const seenGeneratedRows = new Set();
        (project.wbsMaterialImportedRows || []).forEach(function (sourceRow, sourceIndex) {
          const description = normalizeWbsMaterialDescription(sourceRow.description);
          if (!description) return;
          const isProjectLevelMaterial = ["Other Support Costs", "Tools", "PPE", "Vehicles"].indexOf(description) !== -1 && !String(sourceRow.subsystem || "").trim();
          const sourceSubsystems = resolveWbsSourceSubsystems(sourceRow.subsystem);
          if (!isProjectLevelMaterial && !sourceSubsystems.length) return;

          project.phases.forEach(function (phase) {
            const phaseHasWarranty = !!(phase.postWarrantyStartDate && phase.postWarrantyEndDate);
            periods.forEach(function (period) {
              if (!sourceRowMatchesPeriod(sourceRow, period)) return;
              if (isProjectLevelMaterial) {
                if (!projectLevelMaterialAllowedForPeriod(description, phase, period.type, phaseHasWarranty)) return;
              } else if (!materialAllowedForPeriod(description, period.type, phaseHasWarranty)) {
                return;
              }

              (isProjectLevelMaterial ? [""] : sourceSubsystems).forEach(function (subsystem) {
                const rowKey = ["wbs_material", phase.key, period.type, sourceRow.id || sourceIndex, normalizeWbsText(description), normalizeWbsText(subsystem)].join("|");
                const override = project.wbsMaterialRowOverrides[rowKey] || {};
                const row = {
                  rowKey: rowKey,
                  phase: phase.label || phase.key,
                  description: description,
                  subsystem: subsystem,
                  period: period.label,
                  costsType: override.costsType !== undefined ? override.costsType : sourceRow.costsType,
                  pbsIbs: override.pbsIbs !== undefined ? override.pbsIbs : sourceRow.pbsIbs,
                  abs: override.abs !== undefined ? override.abs : sourceRow.abs,
                  associatedWp: override.associatedWp !== undefined ? override.associatedWp : sourceRow.associatedWp,
                  tasks: override.tasks !== undefined ? override.tasks : sourceRow.tasks,
                };
                const uniqueKey = [
                  row.phase,
                  row.description,
                  row.subsystem,
                  row.period,
                  row.costsType,
                  row.pbsIbs,
                  row.abs,
                  row.associatedWp,
                  row.tasks,
                ].map(normalizeWbsText).join("|");
                if (seenGeneratedRows.has(uniqueKey)) return;
                seenGeneratedRows.add(uniqueKey);
                rows.push(row);
              });
            });
          });
        });
        return rows;
      }

      function buildGeneratedWbsSubcontractingRows(project) {
        const periods = getWbsPeriodDefinitions(project);
        const guideProject = project.wbsGuidePlanningProject || {};
        const selectedMobTypes = Array.isArray(guideProject.selectedSubcontractingTypes) ? guideProject.selectedSubcontractingTypes : [];
        const selectedRecTypes = Array.isArray(guideProject.selectedRecurrentSubcontractingTypes) ? guideProject.selectedRecurrentSubcontractingTypes : [];
        const demobTypes = Object.assign({}, guideProject.demobilizationSubcontractingMonthsByType || {});
        const subcontractingSubsystems = mergeWbsSubsystems(project.subsystems);
        const resolveWbsSourceSubsystems = createWbsSubsystemResolver(subcontractingSubsystems);

        function sourceRowMatchesPeriod(sourceRow, period) {
          const sourcePeriod = normalizeWbsText(sourceRow.period);
          if (!sourcePeriod) return true;
          return sourcePeriod === normalizeWbsText(period.type) || sourcePeriod === normalizeWbsText(period.label);
        }

        function subcontractingAllowedForPeriod(description, phase, periodType, phaseHasWarranty) {
          const guideType = getWbsSubcontractingGuideType(description);
          if (!guideType) return false;
          if (periodType === "mob") {
            if (!phaseHasWarranty) return false;
            return guideSelectionIncludes(selectedMobTypes, guideType);
          }
          if (periodType === "rec") {
            return guideSelectionIncludes(selectedRecTypes, guideType);
          }
          if (periodType === "dem") {
            return (toNumber(demobTypes[guideType]) || 0) > 0;
          }
          return false;
        }

        const rows = [];
        const seenGeneratedRows = new Set();
        (project.wbsSubcontractingImportedRows || []).forEach(function (sourceRow, sourceIndex) {
          const description = normalizeWbsSubcontractingDescription(sourceRow.description);
          if (!description) return;
          const isProjectLevelSubcontracting = description === "Legal_Training" && !String(sourceRow.subsystem || "").trim();
          if (description === "Legal_Training" && !isProjectLevelSubcontracting) return;
          const sourceSubsystems = resolveWbsSourceSubsystems(sourceRow.subsystem);
          if (!isProjectLevelSubcontracting && !sourceSubsystems.length) return;

          project.phases.forEach(function (phase) {
            const phaseHasWarranty = !!(phase.postWarrantyStartDate && phase.postWarrantyEndDate);
            periods.forEach(function (period) {
              if (!sourceRowMatchesPeriod(sourceRow, period)) return;
              if (!subcontractingAllowedForPeriod(description, phase, period.type, phaseHasWarranty)) return;

              (isProjectLevelSubcontracting ? [""] : sourceSubsystems).forEach(function (subsystem) {
                const rowKey = ["wbs_subcontracting", phase.key, period.type, sourceRow.id || sourceIndex, normalizeWbsText(description), normalizeWbsText(subsystem)].join("|");
                const override = project.wbsSubcontractingRowOverrides[rowKey] || {};
                const row = {
                  rowKey: rowKey,
                  phase: phase.label || phase.key,
                  description: description,
                  subsystem: subsystem,
                  period: period.label,
                  costsType: override.costsType !== undefined ? override.costsType : sourceRow.costsType,
                  pbsIbs: override.pbsIbs !== undefined ? override.pbsIbs : sourceRow.pbsIbs,
                  abs: override.abs !== undefined ? override.abs : sourceRow.abs,
                  associatedWp: override.associatedWp !== undefined ? override.associatedWp : sourceRow.associatedWp,
                  tasks: override.tasks !== undefined ? override.tasks : sourceRow.tasks,
                };
                const uniqueKey = [
                  row.phase,
                  row.description,
                  row.subsystem,
                  row.period,
                  row.costsType,
                  row.pbsIbs,
                  row.abs,
                  row.associatedWp,
                  row.tasks,
                ].map(normalizeWbsText).join("|");
                if (seenGeneratedRows.has(uniqueKey)) return;
                seenGeneratedRows.add(uniqueKey);
                rows.push(row);
              });
            });
          });
        });
        return rows;
      }

      function buildGeneratedWbsOverhaulRenewalRows(project) {
        const periods = getWbsPeriodDefinitions(project);
        const recPeriod = periods.find(function (period) { return period.type === "rec"; }) || { type: "rec", label: "REC" };
        const overhaulSubsystems = mergeWbsSubsystems(project.subsystems);
        const resolveWbsSourceSubsystems = createWbsSubsystemResolver(overhaulSubsystems);
        const synthesisRows = Array.isArray(project.wbsSynthesisRows) ? project.wbsSynthesisRows : [];

        function sourceRowMatchesRec(sourceRow) {
          const sourcePeriod = normalizeWbsText(sourceRow.period);
          if (!sourcePeriod) return true;
          return sourcePeriod === "rec" || sourcePeriod === normalizeWbsText(recPeriod.label);
        }

        function synthesisSubsystem(row) {
          return String(getWbsRowValueByCandidates(row, ["Subsystem", "subsystem", "sub_system", "system"]) || "").trim();
        }

        function synthesisType(row) {
          return normalizeWbsText(getWbsRowValueByCandidates(row, ["Type", "type", "activity_type", "renewal_type"]));
        }

        function synthesisYearlyReparableCost(row) {
          return toNumber(getWbsRowValueByCandidates(row, [
            "Yearly Reparable Cost",
            "yearly_reparable_cost",
            "reparable_cost",
            "repairable_cost",
            "reparable_total_cost",
          ])) || 0;
        }

        function synthesisTotalGlobalCost(row) {
          return toNumber(getWbsRowValueByCandidates(row, [
            "Total Global Cost",
            "total_global_cost",
            "global_cost",
            "total_cost",
            "overall_cost",
          ])) || 0;
        }

        function hasSynthesisCondition(description, subsystem) {
          const subsystemKey = normalizeWbsText(subsystem);
          return synthesisRows.some(function (row) {
            if (normalizeWbsText(synthesisSubsystem(row)) !== subsystemKey) return false;
            const rowType = synthesisType(row);
            if (description === "Repair") {
              return rowType.indexOf("corrective") !== -1 && synthesisYearlyReparableCost(row) > 0;
            }
            if (description === "Overhaul") {
              return rowType.indexOf("overhaul") !== -1 && synthesisTotalGlobalCost(row) > 0;
            }
            if (description === "Renewal") {
              return rowType.indexOf("renewal") !== -1 && synthesisTotalGlobalCost(row) > 0;
            }
            return false;
          });
        }

        const rows = [];
        const seenGeneratedRows = new Set();
        (project.wbsOverhaulRenewalImportedRows || []).forEach(function (sourceRow, sourceIndex) {
          const description = normalizeWbsOverhaulRenewalDescription(sourceRow.description);
          if (!description) return;
          if (description === "Repair" && !sourceRowMatchesRec(sourceRow)) return;
          const sourceSubsystems = resolveWbsSourceSubsystems(sourceRow.subsystem);
          if (!sourceSubsystems.length) return;

          project.phases.forEach(function (phase) {
            sourceSubsystems.forEach(function (subsystem) {
              if (!hasSynthesisCondition(description, subsystem)) return;
              const periodLabel = description === "Repair" ? recPeriod.label : "";
              const periodKey = description === "Repair" ? recPeriod.type : "none";
              const rowKey = ["wbs_overhaul_renewal", phase.key, periodKey, sourceRow.id || sourceIndex, normalizeWbsText(description), normalizeWbsText(sourceRow.type), normalizeWbsText(subsystem)].join("|");
              const override = project.wbsOverhaulRenewalRowOverrides[rowKey] || {};
              const row = {
                rowKey: rowKey,
                phase: phase.label || phase.key,
                description: description,
                type: override.type !== undefined ? override.type : sourceRow.type,
                subsystem: subsystem,
                period: periodLabel,
                costsType: override.costsType !== undefined ? override.costsType : sourceRow.costsType,
                pbsIbs: override.pbsIbs !== undefined ? override.pbsIbs : sourceRow.pbsIbs,
                abs: override.abs !== undefined ? override.abs : sourceRow.abs,
                associatedWp: override.associatedWp !== undefined ? override.associatedWp : sourceRow.associatedWp,
                tasks: override.tasks !== undefined ? override.tasks : sourceRow.tasks,
              };
              const uniqueKey = [
                row.phase,
                row.description,
                row.subsystem,
                row.type,
                row.period,
                row.costsType,
                row.pbsIbs,
                row.abs,
                row.associatedWp,
                row.tasks,
              ].map(normalizeWbsText).join("|");
              if (seenGeneratedRows.has(uniqueKey)) return;
              seenGeneratedRows.add(uniqueKey);
              rows.push(row);
            });
          });
        });
        return rows;
      }

      function renderFallbackWbsWorkspace() {
        const workspace = $("wbsWorkspace");
        const list = $("wbsProjectList");
        const emptyEl = $("wbsWorkspaceEmpty");
        const contentEl = $("wbsWorkspaceContent");
        const statusEl = $("wbsWorkspaceStatus");
        const titleEl = $("wbsCurrentProjectTitle");
        const metaEl = $("wbsCurrentProjectMeta");
        const importMetaEl = $("wbsImportMeta");
        const workloadImportMetaEl = $("wbsWorkloadImportMeta");
        const missingEl = $("wbsMissingData");
        const rowCountEl = $("wbsWorkloadRowCount");
        const workloadToggleBtn = $("wbsWorkloadToggleBtn");
        const workloadToggleIcon = $("wbsWorkloadToggleIcon");
        const workloadPanel = $("wbsWorkloadPanel");
        const materialsImportMetaEl = $("wbsMaterialsImportMeta");
        const materialsRowCountEl = $("wbsMaterialsRowCount");
        const materialsToggleBtn = $("wbsMaterialsToggleBtn");
        const materialsToggleIcon = $("wbsMaterialsToggleIcon");
        const materialsPanel = $("wbsMaterialsPanel");
        const materialsTableBody = $("wbsMaterialsTableBody");
        const subcontractingImportMetaEl = $("wbsSubcontractingImportMeta");
        const subcontractingRowCountEl = $("wbsSubcontractingRowCount");
        const subcontractingToggleBtn = $("wbsSubcontractingToggleBtn");
        const subcontractingToggleIcon = $("wbsSubcontractingToggleIcon");
        const subcontractingPanel = $("wbsSubcontractingPanel");
        const subcontractingTableBody = $("wbsSubcontractingTableBody");
        const overhaulRenewalImportMetaEl = $("wbsOverhaulRenewalsImportMeta");
        const overhaulRenewalRowCountEl = $("wbsOverhaulRenewalsRowCount");
        const overhaulRenewalToggleBtn = $("wbsOverhaulRenewalsToggleBtn");
        const overhaulRenewalToggleIcon = $("wbsOverhaulRenewalsToggleIcon");
        const overhaulRenewalPanel = $("wbsOverhaulRenewalsPanel");
        const overhaulRenewalTableBody = $("wbsOverhaulRenewalsTableBody");
        const tableBody = $("wbsWorkloadTableBody");
        if (!workspace || !list || !emptyEl || !contentEl || !statusEl || !titleEl || !metaEl || !importMetaEl || !workloadImportMetaEl || !missingEl || !rowCountEl || !tableBody || !materialsImportMetaEl || !materialsRowCountEl || !materialsTableBody || !subcontractingImportMetaEl || !subcontractingRowCountEl || !subcontractingTableBody || !overhaulRenewalImportMetaEl || !overhaulRenewalRowCountEl || !overhaulRenewalTableBody) return;

        const projects = buildWbsProjects();
        const currentKey = workspace.dataset.currentProjectKey && projects.some(function (project) { return project.projectKey === workspace.dataset.currentProjectKey; })
          ? workspace.dataset.currentProjectKey
          : (projects[0] ? projects[0].projectKey : "");
        const cur = projects.find(function (project) { return project.projectKey === currentKey; }) || null;

        workspace.classList.remove("hidden");
        statusEl.textContent = projects.length ? projects.length + " project(s) available" : "No project available.";
        list.innerHTML = projects.map(function (project) {
          const active = cur && project.projectKey === cur.projectKey;
          return '<button type="button" data-wbs-project-select="' + escapeHtml(project.projectKey) + '" class="w-full rounded-xl border px-3 py-3 text-left transition-all ' +
            (active ? "border-cyan-300 bg-cyan-50 shadow-sm ring-1 ring-cyan-200" : "border-slate-200 bg-white hover:bg-slate-100") + '">' +
              '<div class="text-sm font-semibold text-slate-900">' + escapeHtml(project.projectName) + '</div>' +
              '<div class="mt-1 flex flex-wrap items-center gap-1.5">' +
                '<span class="text-[10px] font-bold px-1.5 py-0.5 rounded-full ' + (project.hasPhases ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-400 border border-slate-200") + '">PH</span>' +
                '<span class="text-[10px] font-bold px-1.5 py-0.5 rounded-full ' + (project.hasSubsystems ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-400 border border-slate-200") + '">SYS</span>' +
                '<span class="text-[10px] font-bold px-1.5 py-0.5 rounded-full ' + (project.hasWbsImport ? "bg-cyan-50 text-cyan-700 border border-cyan-200" : "bg-slate-100 text-slate-400 border border-slate-200") + '">WL</span>' +
                '<span class="text-[10px] font-bold px-1.5 py-0.5 rounded-full ' + (project.hasWbsMaterialImport ? "bg-cyan-50 text-cyan-700 border border-cyan-200" : "bg-slate-100 text-slate-400 border border-slate-200") + '">MAT</span>' +
                '<span class="text-[10px] font-bold px-1.5 py-0.5 rounded-full ' + (project.hasWbsSubcontractingImport ? "bg-cyan-50 text-cyan-700 border border-cyan-200" : "bg-slate-100 text-slate-400 border border-slate-200") + '">SUB</span>' +
                '<span class="text-[10px] font-bold px-1.5 py-0.5 rounded-full ' + (project.hasWbsOverhaulRenewalImport ? "bg-cyan-50 text-cyan-700 border border-cyan-200" : "bg-slate-100 text-slate-400 border border-slate-200") + '">OVH</span>' +
              '</div>' +
            '</button>';
        }).join("");

        if (!cur) {
          emptyEl.classList.remove("hidden");
          contentEl.classList.add("hidden");
          return;
        }

        workspace.dataset.currentProjectKey = cur.projectKey;
        emptyEl.classList.add("hidden");
        contentEl.classList.remove("hidden");
        titleEl.textContent = cur.projectName;
        metaEl.textContent = (cur.projectType || "No project type") + " | " + (cur.projectContext || "No context");
        importMetaEl.textContent = "";
        workloadImportMetaEl.textContent = cur.hasWbsImport ? "Workload imported: " + cur.wbsFileName + " | " + cur.wbsImportedRows.length + " imported row(s)" : "No Workload WBS file imported yet.";
        materialsImportMetaEl.textContent = cur.hasWbsMaterialImport ? "Materials imported: " + cur.wbsMaterialFileName + " | " + cur.wbsMaterialImportedRows.length + " imported row(s)" : "No Materials WBS file imported yet.";
        subcontractingImportMetaEl.textContent = cur.hasWbsSubcontractingImport ? "Subcontracting imported: " + cur.wbsSubcontractingFileName + " | " + cur.wbsSubcontractingImportedRows.length + " imported row(s)" : "No Subcontracting WBS file imported yet.";
        overhaulRenewalImportMetaEl.textContent = cur.hasWbsOverhaulRenewalImport ? "Overhaul & Renewals imported: " + cur.wbsOverhaulRenewalFileName + " | " + cur.wbsOverhaulRenewalImportedRows.length + " imported row(s)" : "No Overhaul & Renewals WBS file imported yet.";

        const missingParts = [];
        if (!cur.hasPhases) missingParts.push('<div class="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">No phases found. Configure Project Phases first.</div>');
        if (!cur.hasSubsystems) missingParts.push('<div class="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">No subsystems found. Fill Workload Synthesis first.</div>');
        if (!cur.hasWbsImport) missingParts.push('<div class="rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm text-cyan-800">Import a WBS Excel file with a Workload sheet to generate workload rows.</div>');
        if (!cur.hasWbsMaterialImport) missingParts.push('<div class="rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm text-cyan-800">Import a WBS Excel file with a Materials sheet to generate material rows.</div>');
        if (!cur.hasWbsSubcontractingImport) missingParts.push('<div class="rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm text-cyan-800">Import a WBS Excel file with a Subcontracting sheet to generate subcontracting rows.</div>');
        if (!cur.hasWbsOverhaulRenewalImport) missingParts.push('<div class="rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm text-cyan-800">Import a WBS Excel file with an Ovh & Renew sheet to generate overhaul and renewal rows.</div>');
        const importedMaterialRows = Array.isArray(cur.wbsMaterialImportedRows) ? cur.wbsMaterialImportedRows : [];
        const importedSubcontractingRows = Array.isArray(cur.wbsSubcontractingImportedRows) ? cur.wbsSubcontractingImportedRows : [];
        function isProjectLevelWbsMaterialRow(row) {
          const description = normalizeWbsMaterialDescription(row && row.description);
          return !String(row && row.subsystem || "").trim() && ["Other Support Costs", "Tools", "PPE", "Vehicles"].indexOf(description) !== -1;
        }
        function isProjectLevelWbsSubcontractingRow(row) {
          return normalizeWbsSubcontractingDescription(row && row.description) === "Legal_Training" && !String(row && row.subsystem || "").trim();
        }
        const hasOtherSupportMaterialRows = importedMaterialRows.some(function (row) { return isWbsOtherSupportCostDescription(row.description); });
        const hasProjectLevelMaterialRows = importedMaterialRows.some(isProjectLevelWbsMaterialRow);
        const hasRegularMaterialRows = importedMaterialRows.some(function (row) { return !isProjectLevelWbsMaterialRow(row); });
        const hasRegularSubcontractingRows = importedSubcontractingRows.some(function (row) { return !isProjectLevelWbsSubcontractingRow(row); });
        if (!cur.wbsGuidePlanningProject && (hasRegularMaterialRows || hasRegularSubcontractingRows)) missingParts.push('<div class="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">No Guide Planning Definition configuration found for this project. Configure applicable types before generating regular WBS rows.</div>');
        missingEl.classList.toggle("hidden", missingParts.length === 0);
        missingEl.innerHTML = missingParts.join("");

        const generatedRows = buildGeneratedWbsWorkloadRows(cur);
        rowCountEl.textContent = generatedRows.length + " generated row(s)";
        const workloadCollapsed = workspace.dataset.wbsWorkloadCollapsed === "true";
        if (workloadPanel) workloadPanel.classList.toggle("hidden", workloadCollapsed);
        if (workloadToggleBtn) workloadToggleBtn.setAttribute("aria-expanded", workloadCollapsed ? "false" : "true");
        if (workloadToggleIcon) workloadToggleIcon.textContent = workloadCollapsed ? "expand_more" : "expand_less";
        tableBody.innerHTML = generatedRows.length ? generatedRows.map(function (row) {
          function textInput(field, value, minWidth) {
            return '<input data-wbs-row-field="' + field + '" data-project-key="' + escapeHtml(cur.projectKey) + '" data-row-key="' + escapeHtml(row.rowKey) + '" type="text" class="w-full ' + (minWidth || "min-w-[120px]") + ' rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm" value="' + escapeHtml(value || "") + '">';
          }
          return '<tr>' +
            '<td class="py-2.5 pr-4 font-semibold whitespace-nowrap">' + escapeHtml(row.phase) + '</td>' +
            '<td class="py-2.5 px-4 font-medium">' + escapeHtml(row.position) + '</td>' +
            '<td class="py-2.5 px-4 text-slate-600">' + (row.subsystem ? escapeHtml(row.subsystem) : '<span class="text-slate-300">--</span>') + '</td>' +
            '<td class="py-2.5 px-4"><span class="inline-flex px-2 py-0.5 rounded-full border border-cyan-200 bg-cyan-50 text-[10px] font-bold text-cyan-700">' + escapeHtml(row.period) + '</span></td>' +
            '<td class="py-2.5 px-4">' + textInput("costsType", row.costsType, "min-w-[140px]") + '</td>' +
            '<td class="py-2.5 px-4">' + textInput("pbsIbs", row.pbsIbs) + '</td>' +
            '<td class="py-2.5 px-4">' + textInput("abs", row.abs) + '</td>' +
            '<td class="py-2.5 px-4">' + textInput("associatedWp", row.associatedWp, "min-w-[160px]") + '</td>' +
            '<td class="py-2.5 pl-4">' + textInput("tasks", row.tasks, "min-w-[220px]") + '</td>' +
          '</tr>';
        }).join("") : '<tr><td colspan="9" class="py-8 text-center text-sm text-slate-500">No WBS workload row generated yet.</td></tr>';

        const generatedMaterialRows = buildGeneratedWbsMaterialRows(cur);
        materialsRowCountEl.textContent = generatedMaterialRows.length + " generated row(s)";
        const materialsCollapsed = workspace.dataset.wbsMaterialsCollapsed === "true";
        if (materialsPanel) materialsPanel.classList.toggle("hidden", materialsCollapsed);
        if (materialsToggleBtn) materialsToggleBtn.setAttribute("aria-expanded", materialsCollapsed ? "false" : "true");
        if (materialsToggleIcon) materialsToggleIcon.textContent = materialsCollapsed ? "expand_more" : "expand_less";
        let noMaterialMessage = "No WBS material row generated yet.";
        if (cur.hasWbsMaterialImport && hasRegularMaterialRows && !cur.wbsGuidePlanningProject) {
          noMaterialMessage = "No Guide Planning Definition configuration found for this project.";
        } else if (cur.hasWbsMaterialImport) {
          const gp = cur.wbsGuidePlanningProject || {};
          const hasMob = Array.isArray(gp.selectedMaterialTypes) && gp.selectedMaterialTypes.length > 0;
          const hasRec = Array.isArray(gp.selectedRecurrentMaterialTypes) && gp.selectedRecurrentMaterialTypes.length > 0;
          const hasDem = Object.values(gp.demobilizationMaterialMonthsByType || {}).some(function (value) { return (toNumber(value) || 0) > 0; });
          const hasSubsystems = mergeWbsSubsystems(cur.subsystems).length > 0;
          if (hasRegularMaterialRows && !hasSubsystems) noMaterialMessage = "No matching subsystem source found for Materials. Check Workload Synthesis.";
          else if (hasRegularMaterialRows && !hasMob && !hasRec && !hasDem) noMaterialMessage = "No material type is enabled in Guide Planning Definition for MOB, REC or DEM.";
          else if (hasOtherSupportMaterialRows || hasProjectLevelMaterialRows) noMaterialMessage = "Imported project-level Materials rows require matching positive values in Tools & Consumables, Vehicles, or Other Support Costs workspaces.";
          else noMaterialMessage = "Imported Materials rows do not match the enabled Guide Planning periods, material types, or subsystems.";
        }
        materialsTableBody.innerHTML = generatedMaterialRows.length ? generatedMaterialRows.map(function (row) {
          function textInput(field, value, minWidth) {
            return '<input data-wbs-material-row-field="' + field + '" data-project-key="' + escapeHtml(cur.projectKey) + '" data-row-key="' + escapeHtml(row.rowKey) + '" type="text" class="w-full ' + (minWidth || "min-w-[120px]") + ' rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm" value="' + escapeHtml(value || "") + '">';
          }
          return '<tr>' +
            '<td class="py-2.5 pr-4 font-semibold whitespace-nowrap">' + escapeHtml(row.phase) + '</td>' +
            '<td class="py-2.5 px-4 font-medium">' + escapeHtml(row.description) + '</td>' +
            '<td class="py-2.5 px-4 text-slate-600">' + escapeHtml(row.subsystem) + '</td>' +
            '<td class="py-2.5 px-4"><span class="inline-flex px-2 py-0.5 rounded-full border border-cyan-200 bg-cyan-50 text-[10px] font-bold text-cyan-700">' + escapeHtml(row.period) + '</span></td>' +
            '<td class="py-2.5 px-4">' + textInput("costsType", row.costsType, "min-w-[140px]") + '</td>' +
            '<td class="py-2.5 px-4">' + textInput("pbsIbs", row.pbsIbs) + '</td>' +
            '<td class="py-2.5 px-4">' + textInput("abs", row.abs) + '</td>' +
            '<td class="py-2.5 px-4">' + textInput("associatedWp", row.associatedWp, "min-w-[160px]") + '</td>' +
            '<td class="py-2.5 pl-4">' + textInput("tasks", row.tasks, "min-w-[220px]") + '</td>' +
          '</tr>';
        }).join("") : '<tr><td colspan="9" class="py-8 text-center text-sm text-slate-500">' + escapeHtml(noMaterialMessage) + '</td></tr>';

        const generatedSubcontractingRows = buildGeneratedWbsSubcontractingRows(cur);
        subcontractingRowCountEl.textContent = generatedSubcontractingRows.length + " generated row(s)";
        const subcontractingCollapsed = workspace.dataset.wbsSubcontractingCollapsed === "true";
        if (subcontractingPanel) subcontractingPanel.classList.toggle("hidden", subcontractingCollapsed);
        if (subcontractingToggleBtn) subcontractingToggleBtn.setAttribute("aria-expanded", subcontractingCollapsed ? "false" : "true");
        if (subcontractingToggleIcon) subcontractingToggleIcon.textContent = subcontractingCollapsed ? "expand_more" : "expand_less";
        let noSubcontractingMessage = "No WBS subcontracting row generated yet.";
        if (cur.hasWbsSubcontractingImport) {
          const gp = cur.wbsGuidePlanningProject || {};
          const hasMob = Array.isArray(gp.selectedSubcontractingTypes) && gp.selectedSubcontractingTypes.length > 0;
          const hasRec = Array.isArray(gp.selectedRecurrentSubcontractingTypes) && gp.selectedRecurrentSubcontractingTypes.length > 0;
          const hasDem = Object.values(gp.demobilizationSubcontractingMonthsByType || {}).some(function (value) { return (toNumber(value) || 0) > 0; });
          const hasSubsystems = mergeWbsSubsystems(cur.subsystems).length > 0;
          if (hasRegularSubcontractingRows && !cur.wbsGuidePlanningProject) noSubcontractingMessage = "No Guide Planning Definition configuration found for this project.";
          else if (hasRegularSubcontractingRows && !hasSubsystems) noSubcontractingMessage = "No matching subsystem source found for Subcontracting. Check Workload Synthesis.";
          else if (hasRegularSubcontractingRows && !hasMob && !hasRec && !hasDem) noSubcontractingMessage = "No subcontracting type is enabled in Guide Planning Definition for MOB, REC or DEM.";
          else noSubcontractingMessage = "Imported Subcontracting rows do not match the enabled Guide Planning periods, subcontracting types, Mandatory Training totals, or subsystems.";
        }
        subcontractingTableBody.innerHTML = generatedSubcontractingRows.length ? generatedSubcontractingRows.map(function (row) {
          function textInput(field, value, minWidth) {
            return '<input data-wbs-subcontracting-row-field="' + field + '" data-project-key="' + escapeHtml(cur.projectKey) + '" data-row-key="' + escapeHtml(row.rowKey) + '" type="text" class="w-full ' + (minWidth || "min-w-[120px]") + ' rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm" value="' + escapeHtml(value || "") + '">';
          }
          return '<tr>' +
            '<td class="py-2.5 pr-4 font-semibold whitespace-nowrap">' + escapeHtml(row.phase) + '</td>' +
            '<td class="py-2.5 px-4 font-medium">' + escapeHtml(row.description) + '</td>' +
            '<td class="py-2.5 px-4 text-slate-600">' + (row.subsystem ? escapeHtml(row.subsystem) : '<span class="text-slate-300">--</span>') + '</td>' +
            '<td class="py-2.5 px-4"><span class="inline-flex px-2 py-0.5 rounded-full border border-cyan-200 bg-cyan-50 text-[10px] font-bold text-cyan-700">' + escapeHtml(row.period) + '</span></td>' +
            '<td class="py-2.5 px-4">' + textInput("costsType", row.costsType, "min-w-[140px]") + '</td>' +
            '<td class="py-2.5 px-4">' + textInput("pbsIbs", row.pbsIbs) + '</td>' +
            '<td class="py-2.5 px-4">' + textInput("abs", row.abs) + '</td>' +
            '<td class="py-2.5 px-4">' + textInput("associatedWp", row.associatedWp, "min-w-[160px]") + '</td>' +
            '<td class="py-2.5 pl-4">' + textInput("tasks", row.tasks, "min-w-[220px]") + '</td>' +
          '</tr>';
        }).join("") : '<tr><td colspan="9" class="py-8 text-center text-sm text-slate-500">' + escapeHtml(noSubcontractingMessage) + '</td></tr>';

        const generatedOverhaulRenewalRows = buildGeneratedWbsOverhaulRenewalRows(cur);
        overhaulRenewalRowCountEl.textContent = generatedOverhaulRenewalRows.length + " generated row(s)";
        const overhaulRenewalCollapsed = workspace.dataset.wbsOverhaulRenewalsCollapsed === "true";
        if (overhaulRenewalPanel) overhaulRenewalPanel.classList.toggle("hidden", overhaulRenewalCollapsed);
        if (overhaulRenewalToggleBtn) overhaulRenewalToggleBtn.setAttribute("aria-expanded", overhaulRenewalCollapsed ? "false" : "true");
        if (overhaulRenewalToggleIcon) overhaulRenewalToggleIcon.textContent = overhaulRenewalCollapsed ? "expand_more" : "expand_less";
        let noOverhaulRenewalMessage = "No WBS overhaul or renewal row generated yet.";
        if (cur.hasWbsOverhaulRenewalImport) {
          const hasSubsystems = mergeWbsSubsystems(cur.subsystems).length > 0;
          if (!hasSubsystems) noOverhaulRenewalMessage = "No matching subsystem source found for Overhaul & Renewals. Check Workload Synthesis.";
          else if (!Array.isArray(cur.wbsSynthesisRows) || !cur.wbsSynthesisRows.length) noOverhaulRenewalMessage = "No Synthesis sheet data found for this project.";
          else noOverhaulRenewalMessage = "Imported Overhaul & Renewals rows do not match positive Synthesis conditions for Repair, Overhaul, or Renewal.";
        }
        overhaulRenewalTableBody.innerHTML = generatedOverhaulRenewalRows.length ? generatedOverhaulRenewalRows.map(function (row) {
          function textInput(field, value, minWidth) {
            return '<input data-wbs-overhaul-renewal-row-field="' + field + '" data-project-key="' + escapeHtml(cur.projectKey) + '" data-row-key="' + escapeHtml(row.rowKey) + '" type="text" class="w-full ' + (minWidth || "min-w-[120px]") + ' rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm" value="' + escapeHtml(value || "") + '">';
          }
          return '<tr>' +
            '<td class="py-2.5 pr-4 font-semibold whitespace-nowrap">' + escapeHtml(row.phase) + '</td>' +
            '<td class="py-2.5 px-4 font-medium">' + escapeHtml(row.description) + '</td>' +
            '<td class="py-2.5 px-4">' + textInput("type", row.type, "min-w-[120px]") + '</td>' +
            '<td class="py-2.5 px-4 text-slate-600">' + escapeHtml(row.subsystem) + '</td>' +
            '<td class="py-2.5 px-4">' + (row.period ? '<span class="inline-flex px-2 py-0.5 rounded-full border border-cyan-200 bg-cyan-50 text-[10px] font-bold text-cyan-700">' + escapeHtml(row.period) + '</span>' : '<span class="text-slate-300">--</span>') + '</td>' +
            '<td class="py-2.5 px-4">' + textInput("costsType", row.costsType, "min-w-[140px]") + '</td>' +
            '<td class="py-2.5 px-4">' + textInput("pbsIbs", row.pbsIbs) + '</td>' +
            '<td class="py-2.5 px-4">' + textInput("abs", row.abs) + '</td>' +
            '<td class="py-2.5 px-4">' + textInput("associatedWp", row.associatedWp, "min-w-[160px]") + '</td>' +
            '<td class="py-2.5 pl-4">' + textInput("tasks", row.tasks, "min-w-[220px]") + '</td>' +
          '</tr>';
        }).join("") : '<tr><td colspan="10" class="py-8 text-center text-sm text-slate-500">' + escapeHtml(noOverhaulRenewalMessage) + '</td></tr>';
      }

      const SUBSYSTEM_SUMMARY_HEADERS = [
        "Phase",
        "Period",
        "Type",
        "Description",
        "Long_Description",
        "Quantity",
        "Unit",
        "External Purchase – Variable",
        "External Services Variable Cost",
        "Shift",
        "Cat 1 (Hours or Months)",
        "Cost Centre",
        "Currency",
        "Planning Guide",
        "Nb Tot. of Occurency",
        "Costs Type",
        "Carat Unit",
        "Unit Role",
        "On/Off Shore",
        "PBS/IBS",
        "ABS",
        "Associated WP",
        "Tasks",
        "Delegated person",
        "Firming rule",
        "Freight per Unit",
        "Insurances-Rates & Taxes",
        "Price List Code 1",
        "Price List Code 2",
        "Price List Code 3",
      ].concat(Array.from({ length: 9 }, function (_, index) {
        return "Text " + (index + 1);
      }));

      const SUBSYSTEM_SUMMARY_TEXT_HEADERS = Array.from({ length: 9 }, function (_, index) {
        return "Text " + (index + 1);
      });

      function closeSubsystemSummaryWorkspace() {
        setFallbackDetailWorkspaceActive(false);
        $("subsystemSummaryWorkspace")?.classList.add("hidden");
      }

      function normalizeSubsystemSummarySheetKey(subsystem) {
        const normalized = normalizeWbsText(subsystem);
        if (normalized === "3rd rail" || normalized === "third rail" || normalized === "cat") return "Feeding_System";
        return String(subsystem || "").trim() || "Subsystem";
      }

      function sanitizeExcelSheetName(name, usedNames) {
        const used = usedNames || new Set();
        const base = String(name || "Sheet")
          .replace(/[\\/?*[\]:]/g, "_")
          .replace(/\s+/g, "_")
          .replace(/^'+|'+$/g, "")
          .slice(0, 31) || "Sheet";
        let candidate = base;
        let index = 1;
        while (used.has(candidate.toLowerCase())) {
          const suffix = "_" + index;
          candidate = base.slice(0, Math.max(1, 31 - suffix.length)) + suffix;
          index += 1;
        }
        used.add(candidate.toLowerCase());
        return candidate;
      }

      function sanitizeExportFileName(value) {
        return String(value || "Subsystem_Summary")
          .replace(/[\\/:*?"<>|]+/g, "_")
          .replace(/\s+/g, "_")
          .replace(/_+/g, "_")
          .replace(/^_+|_+$/g, "");
      }

      function countInclusiveMonths(startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return 0;
        return ((end.getFullYear() - start.getFullYear()) * 12) + (end.getMonth() - start.getMonth()) + 1;
      }

      function countInclusiveMonthsFractional(startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return 0;
        let cursor = new Date(start.getFullYear(), start.getMonth(), 1);
        const lastMonth = new Date(end.getFullYear(), end.getMonth(), 1);
        let months = 0;
        while (cursor <= lastMonth) {
          const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
          const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
          const activeStart = start > monthStart ? start : monthStart;
          const activeEnd = end < monthEnd ? end : monthEnd;
          if (activeEnd >= activeStart) {
            months += ((activeEnd - activeStart) / 86400000 + 1) / monthEnd.getDate();
          }
          cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
        }
        return Math.round(months * 100) / 100;
      }

      function getSubsystemSummaryPositionRole(description) {
        const normalized = normalizeWbsText(description);
        if (normalized.indexOf("supervisor") !== -1) return "Supervisor";
        if (normalized.indexOf("technician") !== -1 || normalized.indexOf("tech") !== -1) return "Technician";
        if (normalized.indexOf("worker") !== -1) return "Worker";
        return "";
      }

      function getSubsystemSummaryCostCenterRole(position) {
        const normalized = normalizeWbsText(position);
        if (normalized === "supervisor" || normalized.indexOf("supervisor") !== -1) return "Supervisor";
        if (normalized === "technician" || normalized.indexOf("technician") !== -1) return "Technician";
        if (normalized === "worker" || normalized.indexOf("worker") !== -1) return "Worker";
        return "";
      }

      function getSubsystemSummaryInfraRateRole(position) {
        const normalized = normalizeWbsText(position);
        if (normalized.indexOf("manager") !== -1) return "Manager";
        if (normalized.indexOf("engineer") !== -1) return "Engineer";
        return "Manager";
      }

      function isSubsystemSummaryPreventive(description) {
        return normalizeWbsText(description).indexOf("preventive") !== -1;
      }

      function isSubsystemSummaryCorrective(description) {
        return normalizeWbsText(description).indexOf("corrective") !== -1;
      }

      function resolveSubsystemSummaryPeriod(project, periodLabel) {
        const periodKey = normalizeWbsText(periodLabel);
        return getWbsPeriodDefinitions(project).find(function (period) {
          return periodKey === normalizeWbsText(period.type) || periodKey === normalizeWbsText(period.label);
        }) || null;
      }

      function findSubsystemSummaryPhase(project, phaseLabel) {
        const phaseKey = normalizeWbsText(phaseLabel);
        return (project.phases || []).find(function (phase) {
          return phaseKey === normalizeWbsText(phase.key)
            || phaseKey === normalizeWbsText(phase.label)
            || phaseKey === normalizeWbsText(phase.phaseCode);
        }) || null;
      }

      function resolveSubsystemSummaryRate(project, phase, subsystem, periodType, positionRole) {
        const rateKey = {
          Supervisor: "supervisorRate",
          Technician: "technicianRate",
          Worker: "workerRate",
        }[positionRole] || "";
        if (!rateKey || !phase) return 0;
        const overrides = readPersistedFallbackProjectState(readWhiteCollarFallbackState(), getProjectLookupKeys(project));
        const key = phase.key + "|" + subsystem + "|" + periodType + "|" + rateKey;
        if (Object.prototype.hasOwnProperty.call(overrides, key)) return toNumber(overrides[key]) || 0;
        if (rateKey === "workerRate") return 0;
        if (periodType === "mob") return phase.postWarrantyStartDate && phase.postWarrantyEndDate ? 100 : 0;
        if (periodType === "rec") return 100;
        return 0;
      }

      function resolveSubsystemSummaryBaseQuantity(project, subsystem, shift, description, positionRole) {
        const overrides = readPersistedFallbackProjectState(readWorkloadOverridesFallbackState(), getProjectLookupKeys(project));
        const row = (project.workloadRows || []).find(function (candidate) {
          return normalizeWbsText(candidate.subsystem) === normalizeWbsText(subsystem)
            && normalizeWbsText(candidate.shift) === normalizeWbsText(shift);
        });
        if (!row) return 0;
        function rowValue(field) {
          const key = row.subsystem + "|" + row.shift + "|" + field;
          return Object.prototype.hasOwnProperty.call(overrides, key) ? overrides[key] : row[field];
        }
        if (positionRole === "Supervisor") {
          return toNumber(rowValue(isSubsystemSummaryCorrective(description) ? "correctiveSupervisors" : "preventiveSupervisors")) || 0;
        }
        if (positionRole === "Technician" || positionRole === "Worker") {
          return toNumber(rowValue(isSubsystemSummaryCorrective(description) ? "correctiveTechs" : "preventiveTechs")) || 0;
        }
        return 0;
      }

      function buildSubsystemSummaryProjects() {
        const wbsProjects = buildWbsProjects();
        const costCenterByLookup = buildProjectLookupMap(buildFallbackCostCenterProjects());
        const guideByLookup = buildProjectLookupMap(buildFallbackGuidePlanningProjects());
        const pioByLookup = buildProjectLookupMap(buildFallbackPioDefinitionProjects());
        const firmingByLookup = buildProjectLookupMap(buildFallbackFirmingRulesProjects());
        const priceListsByLookup = buildProjectLookupMap(buildFallbackPriceListsProjects());
        return wbsProjects.map(function (project) {
          const lookupKeys = getProjectLookupKeys(project);
          return Object.assign({}, project, {
            subsystemSummaryCostCenters: findProjectByLookupKeys(costCenterByLookup, lookupKeys) || null,
            subsystemSummaryGuidePlanning: findProjectByLookupKeys(guideByLookup, lookupKeys) || null,
            subsystemSummaryPio: findProjectByLookupKeys(pioByLookup, lookupKeys) || null,
            subsystemSummaryFirming: findProjectByLookupKeys(firmingByLookup, lookupKeys) || null,
            subsystemSummaryPriceLists: findProjectByLookupKeys(priceListsByLookup, lookupKeys) || null,
          });
        });
      }

      function getSubsystemSummaryPriceListsConfig(project) {
        const priceListsProject = project && project.subsystemSummaryPriceLists;
        return normalizeFallbackPriceListProjectConfig(priceListsProject && priceListsProject.priceListsConfig);
      }

      function getSubsystemSummaryTextMapping(project, textIndex) {
        const config = getSubsystemSummaryPriceListsConfig(project);
        return (config.textMappings || [])[textIndex] || "Not applicable";
      }

      function getSubsystemSummaryPhaseMeta(project, phaseLabel) {
        const phase = findSubsystemSummaryPhase(project, phaseLabel);
        if (!phase) return { phaseCode: "", durationYears: "" };
        const duration = toNumber(phase.durationYears);
        return {
          phaseCode: phase.phaseCode || "",
          durationYears: duration !== null ? duration : "",
        };
      }

      function getSubsystemSummaryPriceListValues(project, mapping) {
        const match = /^Client Price List\s+([1-9])$/i.exec(String(mapping || "").trim());
        if (!match) return [];
        const config = getSubsystemSummaryPriceListsConfig(project);
        const field = "clientPriceList" + match[1];
        const seen = new Set();
        const values = [];
        (config.rows || []).forEach(function (row) {
          const value = String(((row.values || {})[field]) || "").trim();
          const key = normalizeWbsText(value);
          if (!value || seen.has(key)) return;
          seen.add(key);
          values.push(value);
        });
        return values;
      }

      function buildSubsystemSummaryTextValidationLists(project) {
        const lists = {};
        SUBSYSTEM_SUMMARY_TEXT_HEADERS.forEach(function (header, index) {
          const values = getSubsystemSummaryPriceListValues(project, getSubsystemSummaryTextMapping(project, index));
          if (values.length) lists[header] = values;
        });
        return lists;
      }

      function applySubsystemSummaryTextMappings(project, rows) {
        const config = getSubsystemSummaryPriceListsConfig(project);
        const mappings = config.textMappings || [];
        return (rows || []).map(function (row) {
          const nextRow = Object.assign({}, row);
          const phaseMeta = getSubsystemSummaryPhaseMeta(project, nextRow.Phase);
          SUBSYSTEM_SUMMARY_TEXT_HEADERS.forEach(function (header, index) {
            const mapping = mappings[index] || "Not applicable";
            if (mapping === "Project_name") {
              nextRow[header] = project.projectName || "";
            } else if (mapping === "Phase") {
              nextRow[header] = nextRow.Phase || "";
            } else if (mapping === "Phase code") {
              nextRow[header] = phaseMeta.phaseCode || "";
            } else if (mapping === "Duration") {
              nextRow[header] = phaseMeta.durationYears === "" ? "" : phaseMeta.durationYears;
            } else {
              nextRow[header] = "";
            }
          });
          return nextRow;
        });
      }

      function getSubsystemSummarySheetDefinitions(project) {
        const usedNames = new Set();
        const byKey = new Map();
        mergeWbsSubsystems(project.subsystems).forEach(function (subsystem) {
          const logicalKey = normalizeSubsystemSummarySheetKey(subsystem);
          const existing = byKey.get(logicalKey) || {
            key: logicalKey,
            label: logicalKey,
            sheetName: sanitizeExcelSheetName(logicalKey + "_Synthesis", usedNames),
            sourceSubsystems: [],
            rows: [],
          };
          existing.sourceSubsystems.push(subsystem);
          byKey.set(logicalKey, existing);
        });
        return Array.from(byKey.values()).sort(function (left, right) {
          return String(left.sheetName).localeCompare(String(right.sheetName));
        }).concat([{
          key: "Infra_Management",
          label: "Infra_Management",
          sheetName: sanitizeExcelSheetName("Infra_Management_Synthesis", usedNames),
          sourceSubsystems: [],
          rows: [],
        }]);
      }

      function resolveSubsystemSummaryPlanning(project, phase, periodType, positionRole) {
        const guide = project.subsystemSummaryGuidePlanning || {};
        if (!phase || !periodType || !positionRole) return { planningGuide: "", occurrence: 0, allowed: false };
        if (periodType === "mob") {
          const months = toNumber((guide.workloadMonthsByPosition || {})[positionRole]) || 0;
          const row = (guide.generatedRows || []).find(function (candidate) {
            return normalizeWbsText(candidate.phaseLabel) === normalizeWbsText(phase.label || phase.key)
              && normalizeWbsText(candidate.position) === normalizeWbsText(positionRole);
          });
          return { planningGuide: row ? row.guidePlanningCode : "", occurrence: months, allowed: months > 0 };
        }
        if (periodType === "rec") {
          const row = (guide.recurrentWorkloadRows || []).find(function (candidate) {
            return normalizeWbsText(candidate.phaseLabel) === normalizeWbsText(phase.label || phase.key);
          });
          return {
            planningGuide: row ? row.guidePlanningCode : "",
            occurrence: countInclusiveMonths(phase.startDate, phase.endDate),
            allowed: true,
          };
        }
        if (periodType === "dem") {
          const months = toNumber((guide.demobilizationWorkloadMonthsByPosition || {})[positionRole]) || 0;
          const row = (guide.generatedDemobilizationRows || []).find(function (candidate) {
            return normalizeWbsText(candidate.phaseLabel) === normalizeWbsText(phase.label || phase.key)
              && normalizeWbsText(candidate.position) === normalizeWbsText(positionRole);
          });
          return { planningGuide: row ? row.guidePlanningCode : "", occurrence: months, allowed: months > 0 };
        }
        return { planningGuide: "", occurrence: 0, allowed: false };
      }

      function resolveSubsystemSummaryInfraPlanning(project, phase, periodType, position) {
        const guide = project.subsystemSummaryGuidePlanning || {};
        if (!phase || !periodType || !position) return { planningGuide: "", occurrence: 0, allowed: false };
        if (periodType === "mob") {
          const months = toNumber((guide.workloadMonthsByPosition || {})[position]) || 0;
          const row = (guide.generatedRows || []).find(function (candidate) {
            return normalizeWbsText(candidate.phaseLabel) === normalizeWbsText(phase.label || phase.key)
              && normalizeWbsText(candidate.position) === normalizeWbsText(position);
          });
          return { planningGuide: row ? row.guidePlanningCode : "", occurrence: months, allowed: months > 0 };
        }
        if (periodType === "rec") {
          const row = (guide.recurrentWorkloadRows || []).find(function (candidate) {
            return normalizeWbsText(candidate.phaseLabel) === normalizeWbsText(phase.label || phase.key);
          });
          return {
            planningGuide: row ? row.guidePlanningCode : "",
            occurrence: countInclusiveMonthsFractional(phase.startDate, phase.endDate),
            allowed: true,
          };
        }
        if (periodType === "dem") {
          const months = toNumber((guide.demobilizationWorkloadMonthsByPosition || {})[position]) || 0;
          const row = (guide.generatedDemobilizationRows || []).find(function (candidate) {
            return normalizeWbsText(candidate.phaseLabel) === normalizeWbsText(phase.label || phase.key)
              && normalizeWbsText(candidate.position) === normalizeWbsText(position);
          });
          return { planningGuide: row ? row.guidePlanningCode : "", occurrence: months, allowed: months > 0 };
        }
        return { planningGuide: "", occurrence: 0, allowed: false };
      }

      function resolveSubsystemSummaryInfraRate(project, phase, periodType, position) {
        if (!phase || !periodType || !position) return 0;
        const role = getSubsystemSummaryInfraRateRole(position);
        const rateKey = role === "Engineer" ? "engineerRate" : "managerRate";
        const overrides = readPersistedFallbackProjectState(readWhiteCollarFallbackState(), getProjectLookupKeys(project));
        const subsystems = Array.isArray(project.subsystems) ? project.subsystems : [];
        if (!subsystems.length) {
          const emptyKey = phase.key + "||" + periodType + "|" + rateKey;
          if (Object.prototype.hasOwnProperty.call(overrides, emptyKey)) return toNumber(overrides[emptyKey]) || 0;
          if (periodType === "mob") return phase.postWarrantyStartDate && phase.postWarrantyEndDate ? 100 : 0;
          if (periodType === "rec") return 100;
          return 0;
        }
        const total = subsystems.reduce(function (sum, subsystem) {
          const key = phase.key + "|" + subsystem + "|" + periodType + "|" + rateKey;
          if (Object.prototype.hasOwnProperty.call(overrides, key)) return sum + (toNumber(overrides[key]) || 0);
          if (periodType === "mob") return sum + (phase.postWarrantyStartDate && phase.postWarrantyEndDate ? 100 : 0);
          if (periodType === "rec") return sum + 100;
          return sum;
        }, 0);
        return total / subsystems.length;
      }

      function resolveSubsystemSummaryInfraQuantity(project, phase, periodType, position) {
        const overrides = readPersistedFallbackProjectState(readWhiteCollarFallbackState(), getProjectLookupKeys(project));
        const key = "wct|" + phase.key + "|" + periodType + "|" + position;
        if (Object.prototype.hasOwnProperty.call(overrides, key)) return toNumber(overrides[key]) || 0;
        if (periodType === "mob") return phase.postWarrantyStartDate && phase.postWarrantyEndDate ? 1 : 0;
        if (periodType === "rec") return 1;
        return 0;
      }

      function resolveSubsystemSummaryUnitRole(project, caratUnit, costCenterRow) {
        if (costCenterRow && costCenterRow.pioUnitRole) return costCenterRow.pioUnitRole;
        const pioRows = Array.isArray(project.subsystemSummaryPio && project.subsystemSummaryPio.rows) ? project.subsystemSummaryPio.rows : [];
        const match = pioRows.find(function (row) {
          return normalizeWbsText(row.caratUnit) === normalizeWbsText(caratUnit);
        });
        return match ? (match.unitRole || "") : "";
      }

      function resolveSubsystemSummaryMonthlyHours(project, costCenterRow) {
        const directHours = toNumber(costCenterRow && costCenterRow.monthlyWorkingHours);
        if (directHours !== null) return Math.round(directHours * 100) / 100;
        const carriedYearlyHours = toNumber(costCenterRow && costCenterRow.pioYearlyHours);
        if (carriedYearlyHours !== null) return Math.round((carriedYearlyHours / 12) * 100) / 100;
        const caratUnit = costCenterRow ? costCenterRow.caratUnit : "";
        if (!caratUnit) return "";
        const pioRows = Array.isArray(project.subsystemSummaryPio && project.subsystemSummaryPio.rows) ? project.subsystemSummaryPio.rows : [];
        const match = pioRows.find(function (row) {
          return normalizeWbsText(row.caratUnit) === normalizeWbsText(caratUnit);
        });
        const yearlyHours = match ? toNumber(match.yearlyHours) : null;
        return yearlyHours !== null ? Math.round((yearlyHours / 12) * 100) / 100 : "";
      }

      function findSubsystemSummaryWbsRow(wbsRows, phase, periodLabel, position, subsystem) {
        return (Array.isArray(wbsRows) ? wbsRows : []).find(function (row) {
          const phaseMatches = normalizeWbsText(row.phase) === normalizeWbsText(phase.label || phase.key)
            || normalizeWbsText(row.phase) === normalizeWbsText(phase.key);
          if (!phaseMatches) return false;
          if (normalizeWbsText(row.period) !== normalizeWbsText(periodLabel)) return false;
          if (normalizeWbsText(row.position) !== normalizeWbsText(position)) return false;
          return subsystem === undefined || normalizeWbsText(row.subsystem) === normalizeWbsText(subsystem);
        }) || null;
      }

      function buildSubsystemSummaryWorkloadRows(project) {
        const costCenterProject = project.subsystemSummaryCostCenters || {};
        const firmingProject = project.subsystemSummaryFirming || {};
        const projectCurrency = String(costCenterProject.projectCurrency || "").trim().toUpperCase();
        const costCenterRows = (Array.isArray(costCenterProject.rows) ? costCenterProject.rows : []).filter(function (row) {
          return !!getSubsystemSummaryCostCenterRole(row.position);
        });
        const infraCostCenterRows = (Array.isArray(costCenterProject.rows) ? costCenterProject.rows : []).filter(function (row) {
          return String(row.position || "").trim() && !getSubsystemSummaryCostCenterRole(row.position);
        });
        const wbsRows = buildGeneratedWbsWorkloadRows(project);
        const rowsBySheetKey = {};
        const seen = new Set();

        wbsRows.forEach(function (wbsRow) {
          const positionRole = getSubsystemSummaryPositionRole(wbsRow.position);
          if (!positionRole || (!isSubsystemSummaryPreventive(wbsRow.position) && !isSubsystemSummaryCorrective(wbsRow.position))) return;
          const period = resolveSubsystemSummaryPeriod(project, wbsRow.period);
          const phase = findSubsystemSummaryPhase(project, wbsRow.phase);
          if (!period || !phase) return;
          const planning = resolveSubsystemSummaryPlanning(project, phase, period.type, positionRole);
          if (!planning.allowed) return;

          costCenterRows.filter(function (ccRow) { return getSubsystemSummaryCostCenterRole(ccRow.position) === positionRole; }).forEach(function (ccRow) {
            const baseQuantity = resolveSubsystemSummaryBaseQuantity(project, wbsRow.subsystem, ccRow.timePeriod, wbsRow.position, positionRole);
            const rate = resolveSubsystemSummaryRate(project, phase, wbsRow.subsystem, period.type, positionRole);
            const quantity = Math.round((baseQuantity * rate / 100) * 100) / 100;
            if (!(quantity > 0)) return;

            const currency = String(ccRow.currency || "").trim().toUpperCase();
            const sheetKey = normalizeSubsystemSummarySheetKey(wbsRow.subsystem);
            const outputRow = {
              "Phase": wbsRow.phase,
              "Period": wbsRow.period,
              "Type": "Workload",
              "Description": wbsRow.position,
              "Long_Description": [wbsRow.subsystem, wbsRow.position, ccRow.timePeriod, wbsRow.period].join("_"),
              "Quantity": quantity,
              "Unit": "FTE",
              "External Purchase – Variable": "",
              "External Services Variable Cost": "",
              "Shift": ccRow.timePeriod,
              "Cat 1 (Hours or Months)": resolveSubsystemSummaryMonthlyHours(project, ccRow),
              "Cost Centre": ccRow.costCenter || "",
              "Currency": currency,
              "Planning Guide": planning.planningGuide || "",
              "Nb Tot. of Occurency": planning.occurrence || "",
              "Costs Type": wbsRow.costsType || "",
              "Carat Unit": ccRow.caratUnit || "",
              "Unit Role": resolveSubsystemSummaryUnitRole(project, ccRow.caratUnit, ccRow),
              "On/Off Shore": projectCurrency && currency === projectCurrency ? "Onshore" : "Offshore",
              "PBS/IBS": wbsRow.pbsIbs || "",
              "ABS": wbsRow.abs || "",
              "Associated WP": wbsRow.associatedWp || "",
              "Tasks": wbsRow.tasks || "",
              "Delegated person": "INFRA",
              "Firming rule": (firmingProject.firmingTexts || {})[currency] || "",
              "Freight per Unit": "",
              "Insurances-Rates & Taxes": "",
              "Price List Code 1": wbsRow.period,
              "Price List Code 2": "Labour",
              "Price List Code 3": sheetKey,
            };
            const uniqueKey = SUBSYSTEM_SUMMARY_HEADERS.map(function (header) {
              return normalizeWbsText(outputRow[header]);
            }).join("|");
            if (seen.has(uniqueKey)) return;
            seen.add(uniqueKey);
            if (!rowsBySheetKey[sheetKey]) rowsBySheetKey[sheetKey] = [];
            rowsBySheetKey[sheetKey].push(outputRow);
          });
        });

        (Array.isArray(project.phases) ? project.phases : []).forEach(function (phase) {
          getWbsPeriodDefinitions(project).forEach(function (period) {
            infraCostCenterRows.forEach(function (ccRow) {
              const position = String(ccRow.position || "").trim();
              const planning = resolveSubsystemSummaryInfraPlanning(project, phase, period.type, position);
              if (!planning.allowed) return;

              const baseQuantity = resolveSubsystemSummaryInfraQuantity(project, phase, period.type, position);
              const rate = resolveSubsystemSummaryInfraRate(project, phase, period.type, position);
              const quantity = Math.round((baseQuantity * rate / 100) * 100) / 100;
              if (!(quantity > 0)) return;

              const currency = String(ccRow.currency || "").trim().toUpperCase();
              const matchingWbsRow = findSubsystemSummaryWbsRow(wbsRows, phase, period.label, position, "");
              const onOffshore = currency && projectCurrency
                ? (currency === projectCurrency ? "Onshore" : "Offshore")
                : "";
              const outputRow = {
                "Phase": phase.label || phase.key,
                "Period": period.label,
                "Type": "Workload",
                "Description": position,
                "Long_Description": ["Infra_Management", position, ccRow.timePeriod, period.label].join("_"),
                "Quantity": quantity,
                "Unit": "FTE",
                "External Purchase – Variable": "",
                "External Services Variable Cost": "",
                "Shift": ccRow.timePeriod,
                "Cat 1 (Hours or Months)": resolveSubsystemSummaryMonthlyHours(project, ccRow),
                "Cost Centre": ccRow.costCenter || "",
                "Currency": currency,
                "Planning Guide": planning.planningGuide || "",
                "Nb Tot. of Occurency": planning.occurrence || "",
                "Costs Type": matchingWbsRow ? (matchingWbsRow.costsType || "") : "",
                "Carat Unit": ccRow.caratUnit || "",
                "Unit Role": resolveSubsystemSummaryUnitRole(project, ccRow.caratUnit, ccRow),
                "On/Off Shore": onOffshore,
                "PBS/IBS": matchingWbsRow ? (matchingWbsRow.pbsIbs || "") : "",
                "ABS": matchingWbsRow ? (matchingWbsRow.abs || "") : "",
                "Associated WP": matchingWbsRow ? (matchingWbsRow.associatedWp || "") : "",
                "Tasks": matchingWbsRow ? (matchingWbsRow.tasks || "") : "",
                "Delegated person": "INFRA",
                "Firming rule": currency ? ((firmingProject.firmingTexts || {})[currency] || "") : "",
                "Freight per Unit": "",
                "Insurances-Rates & Taxes": "",
                "Price List Code 1": period.label,
                "Price List Code 2": "Labour",
                "Price List Code 3": "Infra_Management",
              };
              const uniqueKey = SUBSYSTEM_SUMMARY_HEADERS.map(function (header) {
                return normalizeWbsText(outputRow[header]);
              }).join("|");
              if (seen.has(uniqueKey)) return;
              seen.add(uniqueKey);
              if (!rowsBySheetKey.Infra_Management) rowsBySheetKey.Infra_Management = [];
              rowsBySheetKey.Infra_Management.push(outputRow);
            });
          });
        });
        return rowsBySheetKey;
      }

      function countInclusiveYearsFractional(startDate, endDate) {
        return Math.round((countInclusiveMonthsFractional(startDate, endDate) / 12) * 100) / 100;
      }

      function normalizeSubsystemSummaryMaterialDescription(value) {
        const normalized = normalizeWbsText(value);
        if (normalized === "other support costs" || normalized === "other support cost") return "Other Support Costs";
        if (normalized === "preventive spares" || normalized === "preventive spare") return "Preventive spares";
        if (normalized === "corrective spares" || normalized === "corrective spare") return "Corrective spares";
        if (normalized === "repair" || normalized === "repairs") return "Repair";
        if (normalized === "tools" || normalized === "tool") return "Tools";
        if (normalized === "consumables" || normalized === "consumable") return "Consumables";
        if (normalized === "ppe") return "PPE";
        if (normalized === "vehicles" || normalized === "vehicle") return "Vehicles";
        return "";
      }

      function normalizeSubsystemSummarySubcontractingDescription(value) {
        const normalized = normalizeWbsText(value);
        if (normalized === "preventive subcontract" || normalized === "preventive subcontracts") return "Preventive_Subcontract";
        if (normalized === "corrective subcontract" || normalized === "corrective subcontracts") return "Corrective_Subcontract";
        if (normalized === "technical support" || normalized === "technical supports") return "Technical_Support";
        if (normalized === "legal training" || normalized === "legal trainings") return "Legal_Training";
        if (normalized === "training" || normalized === "trining" || normalized === "technical training" || normalized === "technical trainings") return "Technical_Training";
        if (normalized === "obsolescence" || normalized === "obsolescence monitoring") return "Obsolescence_Monitoring";
        return "";
      }

      function getSubsystemSummaryProjectCaratUnit(project) {
        const rows = Array.isArray(project.subsystemSummaryPio && project.subsystemSummaryPio.rows) ? project.subsystemSummaryPio.rows : [];
        const projectNameKey = normalizeWbsText(project.projectName);
        const match = rows.find(function (row) {
          return normalizeWbsText(row.origin) === projectNameKey;
        }) || rows.find(function (row) {
          return normalizeWbsText(row.source) === "onshore";
        }) || rows[0] || null;
        return match ? (match.caratUnit || "") : "";
      }

      function getSubsystemSummaryCustomDutyPercent(project, sheetKey, sourceSubsystems) {
        const duties = Object.assign({}, project.subsystemSummaryPio && project.subsystemSummaryPio.customDutiesBySubsystem || {});
        const candidates = [sheetKey].concat(sourceSubsystems || []);
        for (let index = 0; index < candidates.length; index += 1) {
          const directValue = toNumber(duties[candidates[index]]);
          if (directValue !== null) return directValue;
          const target = normalizeWbsText(candidates[index]);
          const matchingKey = Object.keys(duties).find(function (key) {
            return normalizeWbsText(key) === target;
          });
          if (matchingKey) {
            const value = toNumber(duties[matchingKey]);
            if (value !== null) return value;
          }
        }
        return 0;
      }

      function getSubsystemSummaryEurToCurrencyRate(project, currency) {
        const code = String(currency || "").trim().toUpperCase();
        if (!code || code === "EUR") return 1;
        function getSharedLiveEurToCurrencyRate(targetCurrency) {
          const target = String(targetCurrency || "").trim().toUpperCase();
          if (!target || target === "EUR") return 1;
          const sharedSettings = safeReadJson(sharedSettingsKey, {}) || {};
          const baseCurrency = String(sharedSettings.exchangeBase || "USD").trim().toUpperCase();
          const liveRates = sharedSettings.liveRates || {};
          function baseRate(sourceCurrency) {
            const source = String(sourceCurrency || "").trim().toUpperCase();
            if (!source) return null;
            if (source === baseCurrency) return 1;
            const rate = Number(liveRates[source]);
            return Number.isFinite(rate) && rate > 0 ? rate : null;
          }
          const eurBaseRate = baseRate("EUR");
          const targetBaseRate = baseRate(target);
          if (eurBaseRate === null || targetBaseRate === null) return null;
          return targetBaseRate / eurBaseRate;
        }
        const currencyProjects = buildFallbackCurrencyExchangeProjects();
        const currencyProject = findProjectByLookupKeys(buildProjectLookupMap(currencyProjects), getProjectLookupKeys(project))
          || currencyProjects.find(function (candidate) {
            return normalizeWorkspaceKey(candidate.projectKey) === normalizeWorkspaceKey(project.projectKey)
              || normalizeWorkspaceKey(candidate.projectName) === normalizeWorkspaceKey(project.projectName);
          })
          || null;
        function findConversionRow(sourceCurrency) {
          const source = String(sourceCurrency || "").trim().toUpperCase();
          if (!source || !currencyProject) return null;
          return (currencyProject.rows || []).find(function (entry) {
            return String(entry.currency || "").trim().toUpperCase() === source;
          }) || null;
        }
        function rateToConversionTarget(sourceCurrency) {
          const source = String(sourceCurrency || "").trim().toUpperCase();
          if (!source || !currencyProject) return null;
          if (source === String(currencyProject.targetCurrency || "").trim().toUpperCase()) return 1;
          const row = findConversionRow(source);
          const rate = row ? toNumber(row.effectiveRate) : null;
          return rate !== null && rate > 0 ? rate : null;
        }
        const eurToTarget = rateToConversionTarget("EUR");
        const currencyToTarget = rateToConversionTarget(code);
        if (eurToTarget !== null && currencyToTarget !== null && currencyToTarget > 0) {
          return eurToTarget / currencyToTarget;
        }
        const sharedLiveRate = getSharedLiveEurToCurrencyRate(code);
        if (sharedLiveRate !== null && sharedLiveRate > 0) return sharedLiveRate;
        const option = buildTcCurrencyOptions(project.projectKey).find(function (entry) {
          return String(entry.code || "").toUpperCase() === code;
        });
        const fallbackRate = option ? toNumber(option.rate) : null;
        return fallbackRate !== null && fallbackRate > 0 ? fallbackRate : 1;
      }

      function convertSubsystemSummaryEurValue(project, value, currency) {
        const amount = toNumber(value) || 0;
        return Math.round(amount * getSubsystemSummaryEurToCurrencyRate(project, currency) * 100) / 100;
      }

      function resolveSubsystemSummaryStoredValue(data, phaseKey, subsystem, periodType, colKey) {
        const directKey = phaseKey + "|" + subsystem + "|" + periodType + "|" + colKey;
        if (Object.prototype.hasOwnProperty.call(data, directKey)) return toNumber(data[directKey]) || 0;
        const targetPhaseKey = normalizeWbsText(phaseKey);
        const targetSubsystemKey = normalizeWbsText(subsystem);
        function matchesStoredSubsystem(value) {
          const storedKey = normalizeWbsText(value);
          if (storedKey === targetSubsystemKey) return true;
          if (targetSubsystemKey === "shared") {
            return storedKey === "shared" || storedKey.indexOf("shared") !== -1 || storedKey.indexOf("depot pool") !== -1;
          }
          if (targetSubsystemKey === "management") {
            return storedKey === "management" || storedKey.indexOf("management") !== -1;
          }
          if (targetSubsystemKey === "project mgmt") {
            return storedKey === "project mgmt" || storedKey.indexOf("project management") !== -1 || storedKey.indexOf("project mgmt") !== -1;
          }
          return false;
        }
        const matchKey = Object.keys(data || {}).find(function (key) {
          const parts = String(key || "").split("|");
          return parts.length === 4
            && normalizeWbsText(parts[0]) === targetPhaseKey
            && matchesStoredSubsystem(parts[1])
            && parts[2] === periodType
            && parts[3] === colKey;
        });
        return matchKey ? (toNumber(data[matchKey]) || 0) : 0;
      }

      function resolveSubsystemSummaryMaterialRate(project, phase, sourceSubsystems, periodType) {
        if (!phase || !periodType) return 0;
        const overrides = readPersistedFallbackProjectState(readWhiteCollarFallbackState(), getProjectLookupKeys(project));
        const values = (sourceSubsystems || []).map(function (subsystem) {
          const key = phase.key + "|" + subsystem + "|" + periodType + "|materialRate";
          if (Object.prototype.hasOwnProperty.call(overrides, key)) return toNumber(overrides[key]) || 0;
          return periodType === "rec" ? 100 : 0;
        });
        return values.length ? Math.max.apply(null, values) : 0;
      }

      function collectSubsystemSummaryGuideMaterialRows(project) {
        const guide = project.subsystemSummaryGuidePlanning || {};
        const rows = [];
        function addRows(list, customList, periodType, periodLabel) {
          (Array.isArray(list) ? list : []).forEach(function (row) {
            rows.push(Object.assign({}, row, {
              materialType: row.materialType,
              periodType: periodType,
              periodLabel: periodLabel,
              isCustom: false,
            }));
          });
          (Array.isArray(customList) ? customList : []).forEach(function (row) {
            rows.push(Object.assign({}, row, {
              materialType: row.materialType,
              periodType: periodType,
              periodLabel: periodLabel,
              isCustom: true,
            }));
          });
        }
        addRows(guide.generatedMaterialRows, guide.customMaterialRows, "mob", project.mobilisationPhaseCode || "MOB");
        addRows(guide.recurrentMaterialRows, guide.customRecurrentMaterialRows, "rec", project.recurrentCode || "REC");
        addRows(guide.generatedDemobilizationMaterialRows, guide.customDemobilizationMaterialRows, "dem", project.demobilisationCode || "DEM");
        return rows;
      }

      function collectSubsystemSummaryGuideSubcontractingRows(project) {
        const guide = project.subsystemSummaryGuidePlanning || {};
        const rows = [];
        function addRows(list, customList, periodType, periodLabel) {
          (Array.isArray(list) ? list : []).forEach(function (row) {
            rows.push(Object.assign({}, row, {
              subcontractingType: row.subcontractingType,
              periodType: periodType,
              periodLabel: periodLabel,
              isCustom: false,
            }));
          });
          (Array.isArray(customList) ? customList : []).forEach(function (row) {
            rows.push(Object.assign({}, row, {
              subcontractingType: row.subcontractingType,
              periodType: periodType,
              periodLabel: periodLabel,
              isCustom: true,
            }));
          });
        }
        addRows(guide.generatedSubcontractingRows, guide.customSubcontractingRows, "mob", project.mobilisationPhaseCode || "MOB");
        addRows(guide.recurrentSubcontractingRows, guide.customRecurrentSubcontractingRows, "rec", project.recurrentCode || "REC");
        addRows(guide.generatedDemobilizationSubcontractingRows, guide.customDemobilizationSubcontractingRows, "dem", project.demobilisationCode || "DEM");
        return rows;
      }

      function resolveSubsystemSummaryMaterialPlanning(project, guideRow, phase, description) {
        const periodType = guideRow.periodType;
        if (periodType === "mob") {
          return {
            planningGuide: guideRow.guidePlanningCode || "",
            occurrence: 1,
            allowed: true,
          };
        }
        if (periodType === "rec") {
          return {
            planningGuide: guideRow.guidePlanningCode || "",
            occurrence: countInclusiveYearsFractional(guideRow.startDate || phase.startDate, guideRow.endDate || phase.endDate),
            allowed: true,
          };
        }
        if (periodType === "dem") {
          const months = toNumber(((project.subsystemSummaryGuidePlanning || {}).demobilizationMaterialMonthsByType || {})[description]) || 0;
          return {
            planningGuide: guideRow.guidePlanningCode || "",
            occurrence: months,
            allowed: months > 0,
          };
        }
        return { planningGuide: "", occurrence: 0, allowed: false };
      }

      function resolveSubsystemSummarySubcontractingPlanning(project, guideRow, phase, guideType) {
        const periodType = guideRow.periodType;
        if (periodType === "mob") {
          return {
            planningGuide: guideRow.guidePlanningCode || "",
            occurrence: 1,
            allowed: true,
          };
        }
        if (periodType === "rec") {
          return {
            planningGuide: guideRow.guidePlanningCode || "",
            occurrence: countInclusiveYearsFractional(guideRow.startDate || phase.startDate, guideRow.endDate || phase.endDate),
            allowed: true,
          };
        }
        if (periodType === "dem") {
          const monthsByType = (project.subsystemSummaryGuidePlanning || {}).demobilizationSubcontractingMonthsByType || {};
          const normalizedGuideType = normalizeSubsystemSummarySubcontractingDescription(guideType) || guideType;
          const directMonths = toNumber(monthsByType[guideType]);
          const normalizedMonths = toNumber(monthsByType[normalizedGuideType]);
          const matchingKey = Object.keys(monthsByType).find(function (key) {
            return normalizeSubsystemSummarySubcontractingDescription(key) === normalizedGuideType
              || normalizeWbsText(key) === normalizeWbsText(guideType);
          });
          const months = directMonths || normalizedMonths || (matchingKey ? (toNumber(monthsByType[matchingKey]) || 0) : 0);
          return {
            planningGuide: guideRow.guidePlanningCode || "",
            occurrence: months,
            allowed: months > 0,
          };
        }
        return { planningGuide: "", occurrence: 0, allowed: false };
      }

      function resolveSubsystemSummaryMaterialMetadata(project, description, phase, periodLabel, sheetSourceSubsystems) {
        const rows = description === "Repair"
          ? buildGeneratedWbsOverhaulRenewalRows(project)
          : buildGeneratedWbsMaterialRows(project);
        const candidates = Array.isArray(sheetSourceSubsystems) ? sheetSourceSubsystems : [];
        const match = rows.find(function (row) {
          if (normalizeWbsText(row.description) !== normalizeWbsText(description)) return false;
          const phaseMatches = normalizeWbsText(row.phase) === normalizeWbsText(phase.label || phase.key)
            || normalizeWbsText(row.phase) === normalizeWbsText(phase.key);
          if (!phaseMatches) return false;
          if (description !== "Repair" && normalizeWbsText(row.period) !== normalizeWbsText(periodLabel)) return false;
          if (!candidates.length) return !String(row.subsystem || "").trim();
          return candidates.some(function (subsystem) {
            return normalizeWbsText(row.subsystem) === normalizeWbsText(subsystem);
          });
        }) || null;
        if (match) return match;

        const importedRows = description === "Repair"
          ? (project.wbsOverhaulRenewalImportedRows || [])
          : (project.wbsMaterialImportedRows || []);
        const resolver = createWbsSubsystemResolver(candidates);
        const imported = importedRows.find(function (row) {
          const rowDescription = description === "Repair"
            ? normalizeWbsOverhaulRenewalDescription(row.description)
            : normalizeWbsMaterialDescription(row.description);
          if (rowDescription !== description) return false;
          if (!candidates.length) return !String(row.subsystem || "").trim();
          return resolver(row.subsystem).length > 0;
        }) || null;
        return imported || {};
      }

      function getSubsystemSummarySynthesisMaterialType(row) {
        return normalizeWbsText(getWbsRowValueByCandidates(row, ["Material Type", "material_type", "materialType", "MaterialType"]));
      }

      function getSubsystemSummarySynthesisType(row) {
        return normalizeWbsText(getWbsRowValueByCandidates(row, ["Type", "type", "activity_type", "renewal_type"]));
      }

      function getSubsystemSummarySynthesisSubsystem(row) {
        return String(getWbsRowValueByCandidates(row, ["Subsystem", "subsystem", "Sub System", "system"]) || "").trim();
      }

      function getSubsystemSummarySynthesisCurrency(row) {
        return String(getWbsRowValueByCandidates(row, ["Currency", "currency"]) || "").trim().toUpperCase();
      }

      function getSubsystemSummarySynthesisYearlyTotal(row) {
        return toNumber(getWbsRowValueByCandidates(row, [
          "Yearly Total Cost",
          "yearly_total_cost",
          "Yearly Total",
          "yearly_total",
          "Total Yearly Cost",
        ])) || 0;
      }

      function getSubsystemSummarySynthesisYearlyReparable(row) {
        return toNumber(getWbsRowValueByCandidates(row, [
          "Yearly Reparable Cost",
          "yearly_reparable_cost",
          "reparable_cost",
          "repairable_cost",
        ])) || 0;
      }

      function getSubsystemSummarySynthesisYearlySubcontracting(row) {
        return toNumber(getWbsRowValueByCandidates(row, [
          "Yearly Cost (Subcontracting)",
          "yearly_cost_subcontracting",
          "Yearly Subcontracting Cost",
          "subcontracting_yearly_cost",
          "Subcontracting Yearly Cost",
        ])) || 0;
      }

      function subsystemSummarySubcontractingTypeMatches(rowType, description) {
        const typeKey = normalizeWbsText(rowType);
        const descriptionKey = normalizeWbsText(description);
        if (!typeKey || !descriptionKey) return false;
        if (typeKey === descriptionKey || typeKey.indexOf(descriptionKey) !== -1) return true;
        if (description === "Technical_Training") {
          return typeKey === "training" || typeKey.indexOf("technical training") !== -1;
        }
        if (description === "Obsolescence_Monitoring") {
          return typeKey === "obsolescence" || typeKey.indexOf("obsolescence monitoring") !== -1;
        }
        return false;
      }

      function collectSubsystemSummarySynthesisExternalValues(project, description, sourceSubsystems, periodType) {
        const targetMaterialType = description === "Preventive spares" ? "preventive spares" : "corrective spares";
        const targetSynthesisType = description === "Preventive spares" ? "preventive" : "corrective";
        const subsystemKeys = new Set();
        (sourceSubsystems || []).forEach(function (subsystem) {
          const key = normalizeWbsText(subsystem);
          if (!key) return;
          subsystemKeys.add(key);
          if (key === "3rd rail" || key === "third rail" || key === "cat") {
            subsystemKeys.add("feeding system");
          }
        });
        const byCurrencyAndSubsystem = {};
        (project.wbsSynthesisRows || []).forEach(function (row) {
          const rowSubsystem = getSubsystemSummarySynthesisSubsystem(row);
          if (!subsystemKeys.has(normalizeWbsText(rowSubsystem))) return;
          const materialType = getSubsystemSummarySynthesisMaterialType(row);
          const synthesisType = getSubsystemSummarySynthesisType(row);
          const materialMatches = description === "Repair"
            ? (materialType.indexOf("corrective spares") !== -1 || synthesisType.indexOf("corrective") !== -1)
            : (materialType.indexOf(targetMaterialType) !== -1 || (!materialType && synthesisType.indexOf(targetSynthesisType) !== -1));
          if (!materialMatches) return;
          const currency = getSubsystemSummarySynthesisCurrency(row);
          if (!currency) return;
          const rawValue = description === "Repair"
            ? getSubsystemSummarySynthesisYearlyReparable(row)
            : getSubsystemSummarySynthesisYearlyTotal(row);
          if (!(rawValue > 0)) return;
          const subsystemLabel = resolveSubsystemSummarySourceSubsystemLabel(sourceSubsystems, rowSubsystem);
          const key = currency + "||" + subsystemLabel;
          byCurrencyAndSubsystem[key] = byCurrencyAndSubsystem[key] || {
            currency: currency,
            subsystemLabel: subsystemLabel,
            externalPurchase: 0,
          };
          byCurrencyAndSubsystem[key].externalPurchase += periodType === "dem" ? rawValue / 12 : rawValue;
        });
        return Object.keys(byCurrencyAndSubsystem).sort().map(function (key) {
          const entry = byCurrencyAndSubsystem[key];
          return {
            currency: entry.currency,
            subsystemLabel: entry.subsystemLabel,
            externalPurchase: Math.round(entry.externalPurchase * 100) / 100,
          };
        });
      }

      function collectSubsystemSummaryOperationalExternalValues(project, description, sourceSubsystems, phase, periodType, projectCurrency) {
        const toolsConsumables = Object.assign({}, project.wbsToolsConsumablesProject || {});
        const vehicles = Object.assign({}, project.wbsVehiclesProject || {});
        let eurValue = 0;
        (sourceSubsystems || []).forEach(function (subsystem) {
          if (description === "Tools") {
            eurValue += ["ind_tools", "coll_tools", "spec_tools"].reduce(function (sum, colKey) {
              return sum + resolveSubsystemSummaryStoredValue(toolsConsumables, phase.key, subsystem, periodType, colKey);
            }, 0);
          } else if (description === "Consumables") {
            eurValue += resolveSubsystemSummaryStoredValue(toolsConsumables, phase.key, subsystem, periodType, "consumables");
          } else if (description === "PPE") {
            eurValue += resolveSubsystemSummaryStoredValue(toolsConsumables, phase.key, subsystem, periodType, "ppe");
          } else if (description === "Vehicles") {
            if (periodType === "mob") {
              eurValue += resolveSubsystemSummaryStoredValue(vehicles, phase.key, subsystem, "mob", "capex");
            } else if (periodType === "rec") {
              eurValue += resolveSubsystemSummaryStoredValue(vehicles, phase.key, subsystem, "rec", "fuel")
                + resolveSubsystemSummaryStoredValue(vehicles, phase.key, subsystem, "rec", "opex");
            } else if (periodType === "dem") {
              eurValue += resolveSubsystemSummaryStoredValue(vehicles, phase.key, subsystem, "dem", "capex");
            }
          }
        });
        if (!(eurValue > 0)) return [];
        return [{
          currency: projectCurrency,
          externalPurchase: convertSubsystemSummaryEurValue(project, eurValue, projectCurrency),
        }];
      }

      function resolveSubsystemSummarySubcontractingMetadata(project, description, phase, periodLabel, sheetSourceSubsystems) {
        const rows = buildGeneratedWbsSubcontractingRows(project);
        const candidates = Array.isArray(sheetSourceSubsystems) ? sheetSourceSubsystems : [];
        const match = rows.find(function (row) {
          if (normalizeWbsText(row.description) !== normalizeWbsText(description)) return false;
          const phaseMatches = normalizeWbsText(row.phase) === normalizeWbsText(phase.label || phase.key)
            || normalizeWbsText(row.phase) === normalizeWbsText(phase.key);
          if (!phaseMatches) return false;
          if (normalizeWbsText(row.period) !== normalizeWbsText(periodLabel)) return false;
          if (!candidates.length) return !String(row.subsystem || "").trim();
          return candidates.some(function (subsystem) {
            return normalizeWbsText(row.subsystem) === normalizeWbsText(subsystem);
          });
        }) || null;
        if (match) return match;

        const resolver = createWbsSubsystemResolver(candidates);
        const imported = (project.wbsSubcontractingImportedRows || []).find(function (row) {
          if (normalizeWbsSubcontractingDescription(row.description) !== description) return false;
          if (!candidates.length) return !String(row.subsystem || "").trim();
          return resolver(row.subsystem).length > 0;
        }) || null;
        return imported || {};
      }

      function collectSubsystemSummaryInfraLegalTrainingValues(project, phase, periodType, projectCurrency) {
        if (!phase || !projectCurrency) return [];
        const totalsByPhase = getMandatoryTrainingYearlyTotalsByPhase(project);
        const phaseKeys = [phase.key, phase.label].map(function (value) { return String(value || ""); }).filter(Boolean);
        let yearlyTotal = null;
        phaseKeys.some(function (key) {
          if (Object.prototype.hasOwnProperty.call(totalsByPhase, key)) {
            yearlyTotal = toNumber(totalsByPhase[key]) || 0;
            return true;
          }
          return false;
        });
        if (yearlyTotal === null) {
          const normalizedPhaseKeys = phaseKeys.map(function (key) { return normalizeWbsText(key); });
          const matchingKey = Object.keys(totalsByPhase).find(function (key) {
            return normalizedPhaseKeys.indexOf(normalizeWbsText(key)) >= 0;
          });
          yearlyTotal = matchingKey ? (toNumber(totalsByPhase[matchingKey]) || 0) : 0;
        }
        const eurValue = periodType === "dem" ? yearlyTotal / 12 : yearlyTotal;
        if (!(eurValue > 0)) return [];
        return [{
          currency: projectCurrency,
          externalServices: convertSubsystemSummaryEurValue(project, eurValue, projectCurrency),
        }];
      }

      function collectSubsystemSummarySubcontractingValues(project, description, sourceSubsystems, periodType) {
        const subsystemKeys = new Set();
        (sourceSubsystems || []).forEach(function (subsystem) {
          const key = normalizeWbsText(subsystem);
          if (!key) return;
          subsystemKeys.add(key);
        });
        const byCurrency = {};
        (project.wbsSynthesisRows || []).forEach(function (row) {
          if (!subsystemKeys.has(normalizeWbsText(getSubsystemSummarySynthesisSubsystem(row)))) return;
          if (!subsystemSummarySubcontractingTypeMatches(getSubsystemSummarySynthesisType(row), description)) return;
          const currency = getSubsystemSummarySynthesisCurrency(row);
          if (!currency) return;
          const rawValue = getSubsystemSummarySynthesisYearlySubcontracting(row);
          if (!(rawValue > 0)) return;
          byCurrency[currency] = (byCurrency[currency] || 0) + (periodType === "dem" ? rawValue / 12 : rawValue);
        });
        return Object.keys(byCurrency).sort().map(function (currency) {
          return { currency: currency, externalServices: Math.round(byCurrency[currency] * 100) / 100 };
        });
      }

      function collectSubsystemSummaryInfraMaterialExternalValues(project, description, phase, periodType, projectCurrency) {
        if (["Tools", "Consumables", "PPE", "Vehicles", "Other Support Costs"].indexOf(description) === -1) return [];
        const toolsConsumables = Object.assign({}, project.wbsToolsConsumablesProject || {});
        const vehicles = Object.assign({}, project.wbsVehiclesProject || {});
        const otherSupportCosts = Object.assign({}, project.wbsOtherSupportCostProject || {});
        let eurValue = 0;
        if (description === "Other Support Costs") {
          if (periodType === "mob") {
            eurValue += toNumber(otherSupportCosts[phase.key + "|mob|capex"]) || 0;
          } else if (periodType === "rec") {
            eurValue += toNumber(otherSupportCosts[phase.key + "|rec|opex"]) || 0;
          } else if (periodType === "dem") {
            eurValue += (toNumber(otherSupportCosts[phase.key + "|dem|capex"]) || 0)
              || (toNumber(otherSupportCosts[phase.key + "|mob|capex"]) || 0);
          }
        } else if (description === "Tools") {
          ["__shared__", "__management__"].forEach(function (subsystem) {
            eurValue += ["ind_tools", "coll_tools", "spec_tools"].reduce(function (sum, colKey) {
              return sum + resolveSubsystemSummaryStoredValue(toolsConsumables, phase.key, subsystem, periodType, colKey);
            }, 0);
          });
        } else if (description === "Consumables") {
          ["__shared__", "__management__"].forEach(function (subsystem) {
            eurValue += resolveSubsystemSummaryStoredValue(toolsConsumables, phase.key, subsystem, periodType, "consumables");
          });
        } else if (description === "PPE") {
          ["__shared__", "__management__"].forEach(function (subsystem) {
            eurValue += resolveSubsystemSummaryStoredValue(toolsConsumables, phase.key, subsystem, periodType, "ppe");
          });
        } else if (description === "Vehicles") {
          if (periodType === "mob") {
            eurValue += resolveSubsystemSummaryStoredValue(vehicles, phase.key, "__project_mgmt__", "mob", "capex");
          } else if (periodType === "rec") {
            eurValue += resolveSubsystemSummaryStoredValue(vehicles, phase.key, "__project_mgmt__", "rec", "fuel")
              + resolveSubsystemSummaryStoredValue(vehicles, phase.key, "__project_mgmt__", "rec", "opex");
          } else if (periodType === "dem") {
            eurValue += resolveSubsystemSummaryStoredValue(vehicles, phase.key, "__project_mgmt__", "dem", "capex");
          }
        }
        if (!(eurValue > 0)) return [];
        return [{
          currency: projectCurrency,
          externalPurchase: convertSubsystemSummaryEurValue(project, eurValue, projectCurrency),
        }];
      }

      function collectSubsystemSummaryGuideOverhaulRenewalRows(project) {
        const guide = project.subsystemSummaryGuidePlanning || {};
        return []
          .concat(Array.isArray(guide.overhaulRenewalRows) ? guide.overhaulRenewalRows : [])
          .concat(Array.isArray(guide.customOverhaulRenewalRows) ? guide.customOverhaulRenewalRows : []);
      }

      function getSubsystemSummarySourceSubsystemKeys(sourceSubsystems) {
        const keys = new Set();
        (sourceSubsystems || []).forEach(function (subsystem) {
          const key = normalizeWbsText(subsystem);
          if (!key) return;
          keys.add(key);
          if (key === "3rd rail" || key === "third rail" || key === "cat") {
            keys.add("feeding system");
          }
        });
        return keys;
      }

      function subsystemSummarySourceMatches(sourceSubsystems, value) {
        const key = normalizeWbsText(value);
        if (!key) return false;
        return getSubsystemSummarySourceSubsystemKeys(sourceSubsystems).has(key);
      }

      function resolveSubsystemSummarySourceSubsystemLabel(sourceSubsystems, value) {
        const rawKey = normalizeWbsText(value);
        const candidates = Array.isArray(sourceSubsystems) ? sourceSubsystems : [];
        const exact = candidates.find(function (subsystem) {
          return normalizeWbsText(subsystem) === rawKey;
        });
        if (exact) return exact;
        if (rawKey === "feeding system") {
          return candidates.find(function (subsystem) {
            const key = normalizeWbsText(subsystem);
            return key === "3rd rail" || key === "third rail" || key === "cat";
          }) || value || "";
        }
        return value || candidates[0] || "";
      }

      function resolveSubsystemSummaryOverhaulRenewalPlanning(project, phase, sourceSubsystems, description) {
        const rows = collectSubsystemSummaryGuideOverhaulRenewalRows(project);
        const match = rows.find(function (row) {
          const phaseMatches = normalizeWbsText(row.phaseLabel) === normalizeWbsText(phase.label || phase.key)
            || normalizeWbsText(row.phaseLabel) === normalizeWbsText(phase.key);
          return phaseMatches && subsystemSummarySourceMatches(sourceSubsystems, row.subsystem);
        }) || null;
        if (!match) return { planningGuide: "", occurrence: 0, allowed: false };
        return {
          planningGuide: description === "Renewal" ? (match.renewalGuidePlanningCode || "") : (match.overhaulGuidePlanningCode || ""),
          occurrence: 1,
          allowed: true,
        };
      }

      function getSubsystemSummaryOvhExportWbsType(exportType) {
        return {
          Ovh_Workload: "Workload",
          Ovh_Material: "Material",
          Renew_Management: "Management",
          "Renew_T&C": "T&C",
          Renew_Material: "Material",
        }[exportType] || "";
      }

      function resolveSubsystemSummaryOverhaulRenewalMetadata(project, description, exportType, phase, sheetSourceSubsystems) {
        const expectedType = getSubsystemSummaryOvhExportWbsType(exportType);
        const candidates = Array.isArray(sheetSourceSubsystems) ? sheetSourceSubsystems : [];
        const rows = buildGeneratedWbsOverhaulRenewalRows(project);
        const match = rows.find(function (row) {
          if (normalizeWbsOverhaulRenewalDescription(row.description) !== description) return false;
          if (normalizeWbsText(row.type) !== normalizeWbsText(expectedType)) return false;
          const phaseMatches = normalizeWbsText(row.phase) === normalizeWbsText(phase.label || phase.key)
            || normalizeWbsText(row.phase) === normalizeWbsText(phase.key);
          if (!phaseMatches) return false;
          return candidates.some(function (subsystem) {
            return normalizeWbsText(row.subsystem) === normalizeWbsText(subsystem);
          });
        }) || null;
        if (match) return match;

        const resolver = createWbsSubsystemResolver(candidates);
        return (project.wbsOverhaulRenewalImportedRows || []).find(function (row) {
          if (normalizeWbsOverhaulRenewalDescription(row.description) !== description) return false;
          if (normalizeWbsText(row.type) !== normalizeWbsText(expectedType)) return false;
          return resolver(row.subsystem).length > 0;
        }) || {};
      }

      function getSubsystemSummaryOvhPlanningYears(project, phase) {
        if (!phase || normalizeWbsText(phase.key) === "total" || normalizeWbsText(phase.label) === "total") return null;
        const startDate = new Date(String(phase.startDate || ""));
        const endDate = new Date(String(phase.endDate || ""));
        if (!Number.isFinite(startDate.getTime()) || !Number.isFinite(endDate.getTime())) return [];
        const datedPhases = (project.phases || []).filter(function (item) {
          return item && normalizeWbsText(item.key) !== "total" && String(item.startDate || "").trim() && String(item.endDate || "").trim();
        });
        const lastPhase = datedPhases[datedPhases.length - 1] || null;
        const isLastPhase = lastPhase && normalizeWbsText(lastPhase.key) === normalizeWbsText(phase.key);
        const years = [];
        for (let year = startDate.getFullYear(); year <= endDate.getFullYear(); year += 1) {
          const julyFirst = new Date(year, 6, 1);
          if ((julyFirst >= startDate && julyFirst <= endDate) || (isLastPhase && year === endDate.getFullYear())) {
            years.push(year);
          }
        }
        return years;
      }

      function getSubsystemSummaryOvhRowType(row) {
        return normalizeWbsText(getWbsRowValueByCandidates(row, ["Type", "type", "renewal_type", "activity_type"]));
      }

      function getSubsystemSummaryOvhRowCurrency(row) {
        return String(getWbsRowValueByCandidates(row, ["Currency", "currency", "curr", "devise"]) || "").trim().toUpperCase();
      }

      function getSubsystemSummaryOvhRowSubsystem(row) {
        return String(getWbsRowValueByCandidates(row, ["Subsystem", "subsystem", "sub_system", "system"]) || "").trim();
      }

      function getSubsystemSummaryOvhRowYear(row) {
        return toNumber(getWbsRowValueByCandidates(row, ["Year of Planning", "year_of_planning", "planning_year", "Year"])) || null;
      }

      function collectSubsystemSummaryOvhSynthesisValues(project, description, exportType, sourceSubsystems, projectCurrency) {
        if (exportType === "Ovh_Workload") {
          const bySubsystem = {};
          (project.wbsSynthesisRows || []).forEach(function (row) {
            const rowSubsystem = getSubsystemSummarySynthesisSubsystem(row);
            if (!subsystemSummarySourceMatches(sourceSubsystems, rowSubsystem)) return;
            if (getSubsystemSummarySynthesisType(row).indexOf("overhaul") === -1) return;
            if (!((toNumber(getWbsRowValueByCandidates(row, ["Total Replacement Time", "total_replacement_time", "replacement_time"])) || 0) > 0)) return;
            const subsystemLabel = resolveSubsystemSummarySourceSubsystemLabel(sourceSubsystems, rowSubsystem);
            bySubsystem[subsystemLabel] = {
              currency: projectCurrency,
              subsystemLabel: subsystemLabel,
              externalPurchase: "",
            };
          });
          return projectCurrency ? Object.keys(bySubsystem).sort().map(function (key) { return bySubsystem[key]; }) : [];
        }
        const byCurrencyAndSubsystem = {};
        (project.wbsSynthesisRows || []).forEach(function (row) {
          const rowSubsystem = getSubsystemSummarySynthesisSubsystem(row);
          if (!subsystemSummarySourceMatches(sourceSubsystems, rowSubsystem)) return;
          const rowType = getSubsystemSummarySynthesisType(row);
          if (description === "Overhaul" && rowType.indexOf("overhaul") === -1) return;
          if (description === "Renewal" && rowType.indexOf("renewal") === -1) return;
          const currency = getSubsystemSummarySynthesisCurrency(row);
          if (!currency) return;
          let value = 0;
          if (description === "Overhaul" && exportType === "Ovh_Material") {
            value = toNumber(getWbsRowValueByCandidates(row, ["Total Global Cost", "total_global_cost", "global_cost", "total_cost"])) || 0;
          } else if (description === "Renewal" && exportType === "Renew_Management") {
            value = toNumber(getWbsRowValueByCandidates(row, ["Total Management Cost", "total_management_cost", "management_cost"])) || 0;
          } else if (description === "Renewal" && exportType === "Renew_T&C") {
            value = toNumber(getWbsRowValueByCandidates(row, ["Total T&C Cost", "total_t_c_cost", "total_tc_cost", "t_c_cost", "tc_cost"])) || 0;
          } else if (description === "Renewal" && exportType === "Renew_Material") {
            value = toNumber(getWbsRowValueByCandidates(row, ["Total Material Cost", "total_material_cost", "material_cost"])) || 0;
          }
          if (!(value > 0)) return;
          const subsystemLabel = resolveSubsystemSummarySourceSubsystemLabel(sourceSubsystems, rowSubsystem);
          const key = currency + "||" + subsystemLabel;
          byCurrencyAndSubsystem[key] = byCurrencyAndSubsystem[key] || {
            currency: currency,
            subsystemLabel: subsystemLabel,
            externalPurchase: 0,
          };
          byCurrencyAndSubsystem[key].externalPurchase += value;
        });
        return Object.keys(byCurrencyAndSubsystem).sort().map(function (key) {
          const entry = byCurrencyAndSubsystem[key];
          return {
            currency: entry.currency,
            subsystemLabel: entry.subsystemLabel,
            externalPurchase: Math.round(entry.externalPurchase * 100) / 100,
          };
        });
      }

      function collectSubsystemSummaryOvhPlanningValues(project, description, exportType, phase, sourceSubsystems) {
        const years = getSubsystemSummaryOvhPlanningYears(project, phase);
        if (!years || !years.length) return [];
        const yearSet = new Set(years.map(function (year) { return Number(year); }));
        const usesDeqVmi = (sourceSubsystems || []).some(function (subsystem) {
          const key = normalizeWbsText(subsystem);
          return key === "deq" || key === "vmi";
        });
        const rows = usesDeqVmi
          ? (Array.isArray(project.wbsDeqVmiPlanningRows) ? project.wbsDeqVmiPlanningRows : [])
          : (Array.isArray(project.wbsOverhaulRenewalPlanningRows) ? project.wbsOverhaulRenewalPlanningRows : []);
        const byCurrencyAndSubsystem = {};
        rows.forEach(function (row) {
          const year = getSubsystemSummaryOvhRowYear(row);
          if (!yearSet.has(Number(year))) return;
          const rowSubsystem = getSubsystemSummaryOvhRowSubsystem(row);
          if (!subsystemSummarySourceMatches(sourceSubsystems, rowSubsystem)) return;
          const rowType = getSubsystemSummaryOvhRowType(row);
          if (description === "Overhaul" && rowType.indexOf("overhaul") === -1) return;
          if (description === "Renewal" && rowType.indexOf("renewal") === -1) return;
          const currency = getSubsystemSummaryOvhRowCurrency(row);
          if (!currency) return;
          let value = 0;
          if (usesDeqVmi) {
            const unitCost = toNumber(getWbsRowValueByCandidates(row, ["Unit Cost", "unit_cost", "global_cost", "material_cost"])) || 0;
            if (description === "Overhaul" && exportType === "Ovh_Material") value = unitCost;
            if (description === "Renewal" && exportType === "Renew_Material") value = unitCost * 0.8;
            if (description === "Renewal" && exportType === "Renew_T&C") value = unitCost * 0.15;
            if (description === "Renewal" && exportType === "Renew_Management") value = unitCost * 0.05;
          } else if (description === "Overhaul" && exportType === "Ovh_Material") {
            value = toNumber(getWbsRowValueByCandidates(row, ["Global Cost", "global_cost", "Total Global Cost", "total_global_cost"])) || 0;
          } else if (description === "Renewal" && exportType === "Renew_Management") {
            value = toNumber(getWbsRowValueByCandidates(row, ["Management Cost", "management_cost"])) || 0;
          } else if (description === "Renewal" && exportType === "Renew_T&C") {
            value = toNumber(getWbsRowValueByCandidates(row, ["T&C Cost", "t_c_cost", "tc_cost"])) || 0;
          } else if (description === "Renewal" && exportType === "Renew_Material") {
            value = toNumber(getWbsRowValueByCandidates(row, ["Material Cost", "material_cost"])) || 0;
          }
          if (!(value > 0)) return;
          const subsystemLabel = resolveSubsystemSummarySourceSubsystemLabel(sourceSubsystems, rowSubsystem);
          const key = currency + "||" + subsystemLabel;
          byCurrencyAndSubsystem[key] = byCurrencyAndSubsystem[key] || {
            currency: currency,
            subsystemLabel: subsystemLabel,
            externalPurchase: 0,
          };
          byCurrencyAndSubsystem[key].externalPurchase += value;
        });
        return Object.keys(byCurrencyAndSubsystem).sort().map(function (key) {
          const entry = byCurrencyAndSubsystem[key];
          return {
            currency: entry.currency,
            subsystemLabel: entry.subsystemLabel,
            externalPurchase: Math.round(entry.externalPurchase * 100) / 100,
          };
        });
      }

      function collectSubsystemSummaryOverhaulRenewalValues(project, description, exportType, phase, sourceSubsystems, projectCurrency) {
        const isTotalPhase = normalizeWbsText(phase && phase.key) === "total" || normalizeWbsText(phase && phase.label) === "total";
        return isTotalPhase || exportType === "Ovh_Workload"
          ? collectSubsystemSummaryOvhSynthesisValues(project, description, exportType, sourceSubsystems, projectCurrency)
          : collectSubsystemSummaryOvhPlanningValues(project, description, exportType, phase, sourceSubsystems);
      }

      function buildSubsystemSummaryMaterialsRows(project, sheetDefs) {
        const costCenterProject = project.subsystemSummaryCostCenters || {};
        const firmingProject = project.subsystemSummaryFirming || {};
        const pioProject = project.subsystemSummaryPio || {};
        const projectCurrency = String(costCenterProject.projectCurrency || "").trim().toUpperCase();
        const projectCaratUnit = getSubsystemSummaryProjectCaratUnit(project);
        const guideRows = collectSubsystemSummaryGuideMaterialRows(project);
        const rowsBySheetKey = {};
        const seen = new Set();

        guideRows.forEach(function (guideRow) {
          const description = normalizeSubsystemSummaryMaterialDescription(guideRow.materialType);
          if (!description) return;
          const phase = findSubsystemSummaryPhase(project, guideRow.phaseLabel);
          if (!phase) return;
          const planning = resolveSubsystemSummaryMaterialPlanning(project, guideRow, phase, description);
          if (!planning.allowed) return;

          (sheetDefs || []).forEach(function (sheet) {
            if (!sheet || sheet.key === "Infra_Management" || !sheet.sourceSubsystems.length) return;
            const materialRate = resolveSubsystemSummaryMaterialRate(project, phase, sheet.sourceSubsystems, guideRow.periodType);
            let valueEntries = [];
            let quantity = 1;
            if (description === "Preventive spares" || description === "Corrective spares" || description === "Repair") {
              quantity = Math.round((materialRate / 100) * 100) / 100;
              if (!(quantity > 0)) return;
              valueEntries = collectSubsystemSummarySynthesisExternalValues(project, description, sheet.sourceSubsystems, guideRow.periodType);
            } else {
              valueEntries = collectSubsystemSummaryOperationalExternalValues(project, description, sheet.sourceSubsystems, phase, guideRow.periodType, projectCurrency);
            }
            valueEntries.filter(function (entry) {
              return (toNumber(entry.externalPurchase) || 0) > 0;
            }).forEach(function (entry) {
              const currency = String(entry.currency || projectCurrency || "").trim().toUpperCase();
              const externalPurchase = Math.round((toNumber(entry.externalPurchase) || 0) * 100) / 100;
              const rowQuantity = (description === "Preventive spares" || description === "Corrective spares" || description === "Repair") ? quantity : 1;
              if (!(rowQuantity > 0) || !(externalPurchase > 0)) return;
              const metadata = resolveSubsystemSummaryMaterialMetadata(project, description, phase, guideRow.periodLabel, sheet.sourceSubsystems);
              const onOffshore = currency && projectCurrency
                ? (currency === projectCurrency ? "Onshore" : "Offshore")
                : "";
              const freightPercent = onOffshore === "Onshore"
                ? (toNumber(pioProject.onshoreFreightPercent) || 0)
                : (toNumber(pioProject.offshoreFreightPercent) || 0);
              const customDutyPercent = getSubsystemSummaryCustomDutyPercent(project, sheet.key, sheet.sourceSubsystems);
              const freightValue = Math.round((externalPurchase * freightPercent / 100) * 100) / 100;
              const dutyValue = onOffshore === "Offshore"
                ? Math.round((externalPurchase * customDutyPercent / 100) * 100) / 100
                : "";
              const longDescriptionSubsystem = entry.subsystemLabel || sheet.label;
              const longDescription = (description === "Preventive spares" || description === "Corrective spares")
                ? [longDescriptionSubsystem, description, currency, guideRow.periodLabel].join("_")
                : [longDescriptionSubsystem, description, guideRow.periodLabel].join("_");
              const outputRow = {
                "Phase": phase.label || phase.key,
                "Period": guideRow.periodLabel,
                "Type": "Materials",
                "Description": description,
                "Long_Description": longDescription,
                "Quantity": rowQuantity,
                "Unit": "",
                "External Purchase – Variable": externalPurchase,
                "External Services Variable Cost": "",
                "Shift": "",
                "Cat 1 (Hours or Months)": "",
                "Cost Centre": "",
                "Currency": currency,
                "Planning Guide": planning.planningGuide || "",
                "Nb Tot. of Occurency": planning.occurrence || "",
                "Costs Type": metadata.costsType || "",
                "Carat Unit": projectCaratUnit,
                "Unit Role": resolveSubsystemSummaryUnitRole(project, projectCaratUnit, null),
                "On/Off Shore": onOffshore,
                "PBS/IBS": metadata.pbsIbs || "",
                "ABS": metadata.abs || "",
                "Associated WP": metadata.associatedWp || "",
                "Tasks": metadata.tasks || "",
                "Delegated person": "INFRA",
                "Firming rule": currency ? ((firmingProject.firmingTexts || {})[currency] || "") : "",
                "Freight per Unit": freightValue,
                "Insurances-Rates & Taxes": dutyValue,
                "Price List Code 1": guideRow.periodLabel,
                "Price List Code 2": "Spares and Material",
                "Price List Code 3": sheet.label,
              };
              const uniqueKey = SUBSYSTEM_SUMMARY_HEADERS.map(function (header) {
                return normalizeWbsText(outputRow[header]);
              }).join("|");
              if (seen.has(uniqueKey)) return;
              seen.add(uniqueKey);
              if (!rowsBySheetKey[sheet.key]) rowsBySheetKey[sheet.key] = [];
              rowsBySheetKey[sheet.key].push(outputRow);
            });
          });

          if (["Tools", "Consumables", "PPE", "Vehicles", "Other Support Costs"].indexOf(description) === -1) return;
          collectSubsystemSummaryInfraMaterialExternalValues(project, description, phase, guideRow.periodType, projectCurrency).filter(function (entry) {
            return (toNumber(entry.externalPurchase) || 0) > 0;
          }).forEach(function (entry) {
            const currency = String(entry.currency || projectCurrency || "").trim().toUpperCase();
            const externalPurchase = Math.round((toNumber(entry.externalPurchase) || 0) * 100) / 100;
            if (!(externalPurchase > 0)) return;
            const metadata = resolveSubsystemSummaryMaterialMetadata(project, description, phase, guideRow.periodLabel, []);
            const onOffshore = currency && projectCurrency
              ? (currency === projectCurrency ? "Onshore" : "Offshore")
              : "";
            const freightPercent = onOffshore === "Onshore"
              ? (toNumber(pioProject.onshoreFreightPercent) || 0)
              : (toNumber(pioProject.offshoreFreightPercent) || 0);
            const freightValue = Math.round((externalPurchase * freightPercent / 100) * 100) / 100;
            const outputRow = {
              "Phase": phase.label || phase.key,
              "Period": guideRow.periodLabel,
              "Type": "Materials",
              "Description": description,
              "Long_Description": ["Infra_Management", description, guideRow.periodLabel].join("_"),
              "Quantity": 1,
              "Unit": "",
              "External Purchase – Variable": externalPurchase,
              "External Services Variable Cost": "",
              "Shift": "",
              "Cat 1 (Hours or Months)": "",
              "Cost Centre": "",
              "Currency": currency,
              "Planning Guide": planning.planningGuide || "",
              "Nb Tot. of Occurency": planning.occurrence || "",
              "Costs Type": metadata.costsType || "",
              "Carat Unit": projectCaratUnit,
              "Unit Role": resolveSubsystemSummaryUnitRole(project, projectCaratUnit, null),
              "On/Off Shore": onOffshore,
              "PBS/IBS": metadata.pbsIbs || "",
              "ABS": metadata.abs || "",
              "Associated WP": metadata.associatedWp || "",
              "Tasks": metadata.tasks || "",
              "Delegated person": "INFRA",
              "Firming rule": currency ? ((firmingProject.firmingTexts || {})[currency] || "") : "",
              "Freight per Unit": freightValue,
              "Insurances-Rates & Taxes": "",
              "Price List Code 1": guideRow.periodLabel,
              "Price List Code 2": "Spares and Material",
              "Price List Code 3": "Infra_Management",
            };
            const uniqueKey = SUBSYSTEM_SUMMARY_HEADERS.map(function (header) {
              return normalizeWbsText(outputRow[header]);
            }).join("|");
            if (seen.has(uniqueKey)) return;
            seen.add(uniqueKey);
            if (!rowsBySheetKey.Infra_Management) rowsBySheetKey.Infra_Management = [];
            rowsBySheetKey.Infra_Management.push(outputRow);
          });
        });
        return rowsBySheetKey;
      }

      function buildSubsystemSummarySubcontractingRows(project, sheetDefs) {
        const costCenterProject = project.subsystemSummaryCostCenters || {};
        const firmingProject = project.subsystemSummaryFirming || {};
        const projectCurrency = String(costCenterProject.projectCurrency || "").trim().toUpperCase();
        const projectCaratUnit = getSubsystemSummaryProjectCaratUnit(project);
        const guideRows = collectSubsystemSummaryGuideSubcontractingRows(project);
        const rowsBySheetKey = {};
        const seen = new Set();

        guideRows.forEach(function (guideRow) {
          const guideType = String(guideRow.subcontractingType || "").trim();
          const description = normalizeSubsystemSummarySubcontractingDescription(guideType);
          if (!description) return;
          const phase = findSubsystemSummaryPhase(project, guideRow.phaseLabel);
          if (!phase) return;
          const planning = resolveSubsystemSummarySubcontractingPlanning(project, guideRow, phase, guideType);
          if (!planning.allowed) return;

          if (description === "Legal_Training") {
            collectSubsystemSummaryInfraLegalTrainingValues(project, phase, guideRow.periodType, projectCurrency).filter(function (entry) {
              return (toNumber(entry.externalServices) || 0) > 0;
            }).forEach(function (entry) {
              const currency = String(entry.currency || projectCurrency || "").trim().toUpperCase();
              const externalServices = Math.round((toNumber(entry.externalServices) || 0) * 100) / 100;
              if (!currency || !(externalServices > 0)) return;
              const metadata = resolveSubsystemSummarySubcontractingMetadata(project, description, phase, guideRow.periodLabel, []);
              const onOffshore = currency && projectCurrency
                ? (currency === projectCurrency ? "Onshore" : "Offshore")
                : "";
              const outputRow = {
                "Phase": phase.label || phase.key,
                "Period": guideRow.periodLabel,
                "Type": "Subcontracting",
                "Description": description,
                "Long_Description": ["Infra_Management", description, guideRow.periodLabel].join("_"),
                "Quantity": 1,
                "Unit": "",
                "External Purchase – Variable": "",
                "External Services Variable Cost": externalServices,
                "Shift": "",
                "Cat 1 (Hours or Months)": "",
                "Cost Centre": "",
                "Currency": currency,
                "Planning Guide": planning.planningGuide || "",
                "Nb Tot. of Occurency": planning.occurrence || "",
                "Costs Type": metadata.costsType || "",
                "Carat Unit": projectCaratUnit,
                "Unit Role": resolveSubsystemSummaryUnitRole(project, projectCaratUnit, null),
                "On/Off Shore": onOffshore,
                "PBS/IBS": metadata.pbsIbs || "",
                "ABS": metadata.abs || "",
                "Associated WP": metadata.associatedWp || "",
                "Tasks": metadata.tasks || "",
                "Delegated person": "INFRA",
                "Firming rule": currency ? ((firmingProject.firmingTexts || {})[currency] || "") : "",
                "Freight per Unit": "",
                "Insurances-Rates & Taxes": "",
                "Price List Code 1": guideRow.periodLabel,
                "Price List Code 2": "External Services",
                "Price List Code 3": "Infra_Management",
              };
              const uniqueKey = SUBSYSTEM_SUMMARY_HEADERS.map(function (header) {
                return normalizeWbsText(outputRow[header]);
              }).join("|");
              if (seen.has(uniqueKey)) return;
              seen.add(uniqueKey);
              if (!rowsBySheetKey.Infra_Management) rowsBySheetKey.Infra_Management = [];
              rowsBySheetKey.Infra_Management.push(outputRow);
            });
            return;
          }

          (sheetDefs || []).forEach(function (sheet) {
            if (!sheet || sheet.key === "Infra_Management" || !sheet.sourceSubsystems.length) return;
            const valueEntries = collectSubsystemSummarySubcontractingValues(project, description, sheet.sourceSubsystems, guideRow.periodType)
              .filter(function (entry) { return (toNumber(entry.externalServices) || 0) > 0; });
            if (!valueEntries.length) return;
            const hasMultipleCurrencies = valueEntries.length > 1;
            valueEntries.forEach(function (entry) {
              const currency = String(entry.currency || "").trim().toUpperCase();
              const externalServices = Math.round((toNumber(entry.externalServices) || 0) * 100) / 100;
              if (!currency || !(externalServices > 0)) return;
              const metadata = resolveSubsystemSummarySubcontractingMetadata(project, description, phase, guideRow.periodLabel, sheet.sourceSubsystems);
              const onOffshore = currency && projectCurrency
                ? (currency === projectCurrency ? "Onshore" : "Offshore")
                : "";
              const longDescription = hasMultipleCurrencies
                ? [sheet.label, description, currency, guideRow.periodLabel].join("_")
                : [sheet.label, description, guideRow.periodLabel].join("_");
              const outputRow = {
                "Phase": phase.label || phase.key,
                "Period": guideRow.periodLabel,
                "Type": "Subcontracting",
                "Description": description,
                "Long_Description": longDescription,
                "Quantity": 1,
                "Unit": "",
                "External Purchase – Variable": "",
                "External Services Variable Cost": externalServices,
                "Shift": "",
                "Cat 1 (Hours or Months)": "",
                "Cost Centre": "",
                "Currency": currency,
                "Planning Guide": planning.planningGuide || "",
                "Nb Tot. of Occurency": planning.occurrence || "",
                "Costs Type": metadata.costsType || "",
                "Carat Unit": projectCaratUnit,
                "Unit Role": resolveSubsystemSummaryUnitRole(project, projectCaratUnit, null),
                "On/Off Shore": onOffshore,
                "PBS/IBS": metadata.pbsIbs || "",
                "ABS": metadata.abs || "",
                "Associated WP": metadata.associatedWp || "",
                "Tasks": metadata.tasks || "",
                "Delegated person": "INFRA",
                "Firming rule": currency ? ((firmingProject.firmingTexts || {})[currency] || "") : "",
                "Freight per Unit": "",
                "Insurances-Rates & Taxes": "",
                "Price List Code 1": guideRow.periodLabel,
                "Price List Code 2": "External Services",
                "Price List Code 3": sheet.label,
              };
              const uniqueKey = SUBSYSTEM_SUMMARY_HEADERS.map(function (header) {
                return normalizeWbsText(outputRow[header]);
              }).join("|");
              if (seen.has(uniqueKey)) return;
              seen.add(uniqueKey);
              if (!rowsBySheetKey[sheet.key]) rowsBySheetKey[sheet.key] = [];
              rowsBySheetKey[sheet.key].push(outputRow);
            });
          });
        });
        return rowsBySheetKey;
      }

      function buildSubsystemSummaryOverhaulRenewalRows(project, sheetDefs) {
        const costCenterProject = project.subsystemSummaryCostCenters || {};
        const firmingProject = project.subsystemSummaryFirming || {};
        const pioProject = project.subsystemSummaryPio || {};
        const projectCurrency = String(costCenterProject.projectCurrency || "").trim().toUpperCase();
        const projectCaratUnit = getSubsystemSummaryProjectCaratUnit(project);
        const rowsBySheetKey = {};
        const seen = new Set();
        const definitions = [
          { description: "Overhaul", exportType: "Ovh_Workload" },
          { description: "Overhaul", exportType: "Ovh_Material" },
          { description: "Renewal", exportType: "Renew_Management" },
          { description: "Renewal", exportType: "Renew_T&C" },
          { description: "Renewal", exportType: "Renew_Material" },
        ];

        (sheetDefs || []).forEach(function (sheet) {
          if (!sheet || sheet.key === "Infra_Management" || !sheet.sourceSubsystems.length) return;
          (project.phases || []).forEach(function (phase) {
            definitions.forEach(function (definition) {
              const planning = resolveSubsystemSummaryOverhaulRenewalPlanning(project, phase, sheet.sourceSubsystems, definition.description);
              if (!planning.allowed) return;
              const entries = collectSubsystemSummaryOverhaulRenewalValues(
                project,
                definition.description,
                definition.exportType,
                phase,
                sheet.sourceSubsystems,
                projectCurrency
              );
              entries.forEach(function (entry) {
                const isWorkload = definition.exportType === "Ovh_Workload";
                const currency = String(entry.currency || projectCurrency || "").trim().toUpperCase();
                const externalPurchase = isWorkload ? "" : Math.round((toNumber(entry.externalPurchase) || 0) * 100) / 100;
                if (!currency) return;
                if (!isWorkload && !(externalPurchase > 0)) return;
                const metadata = resolveSubsystemSummaryOverhaulRenewalMetadata(project, definition.description, definition.exportType, phase, sheet.sourceSubsystems);
                const onOffshore = currency && projectCurrency
                  ? (currency === projectCurrency ? "Onshore" : "Offshore")
                  : "";
                const isMaterialType = definition.exportType === "Ovh_Material" || definition.exportType === "Renew_Material";
                const freightPercent = isMaterialType
                  ? (onOffshore === "Onshore" ? (toNumber(pioProject.onshoreFreightPercent) || 0) : (toNumber(pioProject.offshoreFreightPercent) || 0))
                  : 0;
                const freightValue = isMaterialType ? Math.round((externalPurchase * freightPercent / 100) * 100) / 100 : "";
                const dutyPercent = isMaterialType && currency !== projectCurrency
                  ? getSubsystemSummaryCustomDutyPercent(project, sheet.key, sheet.sourceSubsystems)
                  : 0;
                const dutyValue = dutyPercent ? Math.round((externalPurchase * dutyPercent / 100) * 100) / 100 : "";
                const priceListCode1 = definition.description === "Overhaul" ? "OVHL" : "RENEW";
                const priceListCode2 = (definition.exportType === "Ovh_Material" || definition.exportType === "Renew_Material")
                  ? "Spares and Material"
                  : "Labour";
                const longDescriptionSubsystem = entry.subsystemLabel || sheet.label;
                const longDescription = definition.exportType === "Ovh_Workload"
                  ? [longDescriptionSubsystem, definition.description, "Workload"].join("_")
                  : definition.exportType === "Ovh_Material"
                    ? [longDescriptionSubsystem, definition.description, "Material", currency].join("_")
                    : definition.exportType === "Renew_Material"
                      ? [longDescriptionSubsystem, definition.description, "Material", currency].join("_")
                      : definition.exportType === "Renew_Management"
                        ? [longDescriptionSubsystem, definition.description, "Management"].join("_")
                        : [longDescriptionSubsystem, definition.description, "T&C"].join("_");
                const outputRow = {
                  "Phase": phase.label || phase.key,
                  "Period": "",
                  "Type": definition.exportType,
                  "Description": definition.description,
                  "Long_Description": longDescription,
                  "Quantity": 1,
                  "Unit": "",
                  "External Purchase – Variable": externalPurchase,
                  "External Services Variable Cost": "",
                  "Shift": "",
                  "Cat 1 (Hours or Months)": "",
                  "Cost Centre": "",
                  "Currency": currency,
                  "Planning Guide": planning.planningGuide || "",
                  "Nb Tot. of Occurency": 1,
                  "Costs Type": metadata.costsType || "",
                  "Carat Unit": projectCaratUnit,
                  "Unit Role": resolveSubsystemSummaryUnitRole(project, projectCaratUnit, null),
                  "On/Off Shore": onOffshore,
                  "PBS/IBS": metadata.pbsIbs || "",
                  "ABS": metadata.abs || "",
                  "Associated WP": metadata.associatedWp || "",
                  "Tasks": metadata.tasks || "",
                  "Delegated person": "INFRA",
                  "Firming rule": currency ? ((firmingProject.firmingTexts || {})[currency] || "") : "",
                  "Freight per Unit": freightValue,
                  "Insurances-Rates & Taxes": dutyValue,
                  "Price List Code 1": priceListCode1,
                  "Price List Code 2": priceListCode2,
                  "Price List Code 3": sheet.label,
                };
                const uniqueKey = SUBSYSTEM_SUMMARY_HEADERS.map(function (header) {
                  return normalizeWbsText(outputRow[header]);
                }).join("|");
                if (seen.has(uniqueKey)) return;
                seen.add(uniqueKey);
                if (!rowsBySheetKey[sheet.key]) rowsBySheetKey[sheet.key] = [];
                rowsBySheetKey[sheet.key].push(outputRow);
              });
            });
          });
        });
        return rowsBySheetKey;
      }

      function buildSubsystemSummaryVirtualFiles(project) {
        const sheetDefs = getSubsystemSummarySheetDefinitions(project);
        const workloadRowsBySheet = buildSubsystemSummaryWorkloadRows(project);
        const materialRowsBySheet = buildSubsystemSummaryMaterialsRows(project, sheetDefs);
        const subcontractingRowsBySheet = buildSubsystemSummarySubcontractingRows(project, sheetDefs);
        const overhaulRenewalRowsBySheet = buildSubsystemSummaryOverhaulRenewalRows(project, sheetDefs);
        const allSheets = sheetDefs.map(function (sheet) {
          const generatedRows = (workloadRowsBySheet[sheet.key] || [])
            .concat(materialRowsBySheet[sheet.key] || [])
            .concat(subcontractingRowsBySheet[sheet.key] || [])
            .concat(overhaulRenewalRowsBySheet[sheet.key] || []);
          return Object.assign({}, sheet, {
            rows: applySubsystemSummaryTextMappings(project, generatedRows),
          });
        });
        if (!allSheets.some(function (sheet) { return sheet.key === "Infra_Management"; })) {
          allSheets.push({
            key: "Infra_Management",
            label: "Infra_Management",
            sheetName: "Infra_Management_Synthesis",
            sourceSubsystems: [],
            rows: applySubsystemSummaryTextMappings(project, workloadRowsBySheet.Infra_Management || []),
          });
        }
        const phases = Array.isArray(project.phases) ? project.phases : [];
        const textValidationLists = buildSubsystemSummaryTextValidationLists(project);
        const files = [{
          key: "global",
          mode: "global",
          name: sanitizeExportFileName(project.projectName) + "_All_Phases.xlsx",
          label: "Project global file",
          sheets: allSheets,
          textValidationLists: textValidationLists,
        }];
        phases.forEach(function (phase) {
          const phaseLabel = phase.label || phase.key;
          files.push({
            key: "phase|" + phase.key,
            mode: "phase",
            phaseKey: phase.key,
            name: sanitizeExportFileName(project.projectName + "_" + phaseLabel) + ".xlsx",
            label: phaseLabel,
            textValidationLists: textValidationLists,
            sheets: allSheets.map(function (sheet) {
              return Object.assign({}, sheet, {
                rows: sheet.rows.filter(function (row) {
                  return normalizeWbsText(row.Phase) === normalizeWbsText(phaseLabel) || normalizeWbsText(row.Phase) === normalizeWbsText(phase.key);
                }),
              });
            }),
          });
        });
        return files;
      }

      function renderSubsystemSummaryPreview(project, file) {
        const sheetSelect = $("subsystemSummarySheetSelect");
        const previewTitle = $("subsystemSummaryPreviewTitle");
        const previewMeta = $("subsystemSummaryPreviewMeta");
        const previewHead = $("subsystemSummaryPreviewHead");
        const previewBody = $("subsystemSummaryPreviewBody");
        if (!sheetSelect || !previewTitle || !previewMeta || !previewHead || !previewBody || !file) return;

        const infraSheet = file.sheets.find(function (sheet) {
          return sheet.key === "Infra_Management" && sheet.rows.length;
        });
        const currentSheetName = sheetSelect.value && file.sheets.some(function (sheet) { return sheet.sheetName === sheetSelect.value; })
          ? sheetSelect.value
          : (infraSheet ? infraSheet.sheetName : (file.sheets[0] ? file.sheets[0].sheetName : ""));
        sheetSelect.innerHTML = file.sheets.map(function (sheet) {
          return '<option value="' + escapeHtml(sheet.sheetName) + '"' + (sheet.sheetName === currentSheetName ? " selected" : "") + '>' + escapeHtml(sheet.sheetName) + ' (' + sheet.rows.length + ')</option>';
        }).join("");
        const sheet = file.sheets.find(function (entry) { return entry.sheetName === currentSheetName; }) || file.sheets[0] || null;
        previewTitle.textContent = file.name;
        previewMeta.textContent = sheet ? (sheet.sheetName + " | " + sheet.rows.length + " row(s)") : "No sheet available.";
        previewHead.innerHTML = '<tr class="border-b border-slate-200">' + SUBSYSTEM_SUMMARY_HEADERS.map(function (header) {
          return '<th class="text-left py-3 px-3 whitespace-nowrap">' + escapeHtml(header) + '</th>';
        }).join("") + '</tr>';
        previewBody.innerHTML = sheet && sheet.rows.length
          ? sheet.rows.slice(0, 100).map(function (row) {
              return '<tr>' + SUBSYSTEM_SUMMARY_HEADERS.map(function (header) {
                return '<td class="py-2 px-3 whitespace-nowrap">' + escapeHtml(row[header] ?? "") + '</td>';
              }).join("") + '</tr>';
            }).join("")
          : '<tr><td colspan="' + SUBSYSTEM_SUMMARY_HEADERS.length + '" class="py-8 text-center text-sm text-slate-500">No rows yet for this sheet. Headers will still be exported.</td></tr>';
      }

      function buildSubsystemSummaryValidationRanges(workbook, textValidationLists) {
        const lists = textValidationLists || {};
        const activeHeaders = SUBSYSTEM_SUMMARY_TEXT_HEADERS.filter(function (header) {
          return Array.isArray(lists[header]) && lists[header].length;
        });
        if (!activeHeaders.length || typeof ExcelJS === "undefined") return {};
        const sourceSheet = workbook.addWorksheet("_Text_Lists");
        sourceSheet.state = "veryHidden";
        const ranges = {};
        activeHeaders.forEach(function (header, index) {
          const colNumber = index + 1;
          sourceSheet.getCell(1, colNumber).value = header;
          lists[header].forEach(function (value, rowIndex) {
            sourceSheet.getCell(rowIndex + 2, colNumber).value = value;
          });
          const colLetter = sourceSheet.getColumn(colNumber).letter;
          ranges[header] = "'_Text_Lists'!$" + colLetter + "$2:$" + colLetter + "$" + (lists[header].length + 1);
        });
        return ranges;
      }

      function downloadSubsystemSummaryBuffer(buffer, fileName) {
        const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName || "Subsystem_Summary.xlsx";
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
      }

      async function exportSubsystemSummaryFileWithExcelJs(file) {
        const workbook = new ExcelJS.Workbook();
        workbook.creator = "Cost Summary & MI";
        workbook.created = new Date();
        const worksheetEntries = [];
        file.sheets.forEach(function (sheet) {
          const worksheet = workbook.addWorksheet(sheet.sheetName);
          worksheet.addRow(SUBSYSTEM_SUMMARY_HEADERS);
          sheet.rows.forEach(function (row) {
            worksheet.addRow(SUBSYSTEM_SUMMARY_HEADERS.map(function (header) { return row[header] ?? ""; }));
          });
          worksheet.columns = SUBSYSTEM_SUMMARY_HEADERS.map(function (header) {
            return { width: Math.min(Math.max(String(header).length + 2, 12), 28) };
          });
          worksheet.getRow(1).font = { bold: true };
          worksheet.views = [{ state: "frozen", ySplit: 1 }];
          worksheetEntries.push({ worksheet: worksheet, sheet: sheet });
        });
        const validationRanges = buildSubsystemSummaryValidationRanges(workbook, file.textValidationLists || {});
        worksheetEntries.forEach(function (entry) {
          Object.keys(validationRanges).forEach(function (header) {
            const colIndex = SUBSYSTEM_SUMMARY_HEADERS.indexOf(header) + 1;
            if (colIndex <= 0) return;
            const lastRow = Math.max(2, entry.sheet.rows.length + 1);
            for (let rowIndex = 2; rowIndex <= lastRow; rowIndex += 1) {
              entry.worksheet.getCell(rowIndex, colIndex).dataValidation = {
                type: "list",
                allowBlank: true,
                formulae: [validationRanges[header]],
              };
            }
          });
        });
        const buffer = await workbook.xlsx.writeBuffer();
        downloadSubsystemSummaryBuffer(buffer, file.name);
      }

      function applySubsystemSummaryXlsxValidations(worksheet, textValidationLists, sourceRanges, rowCount) {
        const validations = [];
        Object.keys(sourceRanges || {}).forEach(function (header) {
          const colIndex = SUBSYSTEM_SUMMARY_HEADERS.indexOf(header);
          if (colIndex < 0) return;
          const colLetter = XLSX.utils.encode_col(colIndex);
          const sqref = colLetter + "2:" + colLetter + Math.max(2, rowCount + 1);
          validations.push({
            sqref: sqref,
            type: "list",
            allowBlank: true,
            formula1: sourceRanges[header],
            formulae: [sourceRanges[header]],
          });
        });
        if (validations.length) {
          worksheet["!dataValidation"] = validations;
          worksheet["!dataValidations"] = validations;
        }
      }

      function appendSubsystemSummaryXlsxValidationSheet(workbook, textValidationLists) {
        const lists = textValidationLists || {};
        const activeHeaders = SUBSYSTEM_SUMMARY_TEXT_HEADERS.filter(function (header) {
          return Array.isArray(lists[header]) && lists[header].length;
        });
        if (!activeHeaders.length) return {};
        const validationSheetName = "_Text_Lists";
        const maxRows = Math.max.apply(null, activeHeaders.map(function (header) { return lists[header].length; }));
        const aoa = [activeHeaders].concat(Array.from({ length: maxRows }, function (_, rowIndex) {
          return activeHeaders.map(function (header) { return lists[header][rowIndex] || ""; });
        }));
        const worksheet = XLSX.utils.aoa_to_sheet(aoa);
        XLSX.utils.book_append_sheet(workbook, worksheet, validationSheetName);
        return activeHeaders.reduce(function (acc, header, index) {
          const colLetter = XLSX.utils.encode_col(index);
          acc[header] = "'" + validationSheetName + "'!$" + colLetter + "$2:$" + colLetter + "$" + (lists[header].length + 1);
          return acc;
        }, {});
      }

      async function exportSubsystemSummaryFile(file) {
        if (!file) return;
        if (typeof ExcelJS !== "undefined") {
          try {
            await exportSubsystemSummaryFileWithExcelJs(file);
            return;
          } catch (err) {
            console.warn("ExcelJS export failed, falling back to XLSX export.", err);
          }
        }
        if (typeof XLSX === "undefined") {
          window.alert("XLSX library is not available on this page.");
          return;
        }
        const workbook = XLSX.utils.book_new();
        const sourceRanges = appendSubsystemSummaryXlsxValidationSheet(workbook, file.textValidationLists || {});
        file.sheets.forEach(function (sheet) {
          const aoa = [SUBSYSTEM_SUMMARY_HEADERS].concat(sheet.rows.map(function (row) {
            return SUBSYSTEM_SUMMARY_HEADERS.map(function (header) { return row[header] ?? ""; });
          }));
          const worksheet = XLSX.utils.aoa_to_sheet(aoa);
          worksheet["!cols"] = SUBSYSTEM_SUMMARY_HEADERS.map(function (header) {
            return { wch: Math.min(Math.max(String(header).length + 2, 12), 28) };
          });
          applySubsystemSummaryXlsxValidations(worksheet, file.textValidationLists || {}, sourceRanges, sheet.rows.length);
          XLSX.utils.book_append_sheet(workbook, worksheet, sheet.sheetName);
        });
        if (workbook.Workbook && Array.isArray(workbook.Workbook.Sheets)) {
          workbook.Workbook.Sheets.forEach(function (sheetMeta) {
            if (sheetMeta && sheetMeta.name === "_Text_Lists") sheetMeta.Hidden = 2;
          });
        } else if (workbook.SheetNames && workbook.SheetNames.length) {
          workbook.Workbook = {
            Sheets: workbook.SheetNames.map(function (name) {
              return { name: name, Hidden: name === "_Text_Lists" ? 2 : 0 };
            }),
          };
        }
        XLSX.writeFile(workbook, file.name);
      }

      function renderSubsystemSummaryWorkspace() {
        const workspace = $("subsystemSummaryWorkspace");
        const list = $("subsystemSummaryProjectList");
        const empty = $("subsystemSummaryWorkspaceEmpty");
        const content = $("subsystemSummaryWorkspaceContent");
        const status = $("subsystemSummaryWorkspaceStatus");
        const title = $("subsystemSummaryCurrentProjectTitle");
        const meta = $("subsystemSummaryCurrentProjectMeta");
        const missing = $("subsystemSummaryMissingData");
        const fileTree = $("subsystemSummaryFileTree");
        const exportBtn = $("subsystemSummaryExportBtn");
        if (!workspace || !list || !empty || !content || !status || !title || !meta || !missing || !fileTree || !exportBtn) return;

        const projects = buildSubsystemSummaryProjects();
        const currentKey = workspace.dataset.currentProjectKey && projects.some(function (project) { return project.projectKey === workspace.dataset.currentProjectKey; })
          ? workspace.dataset.currentProjectKey
          : (projects[0] ? projects[0].projectKey : "");
        const currentProject = projects.find(function (project) { return project.projectKey === currentKey; }) || null;

        setFallbackDetailWorkspaceActive(true);
        workspace.classList.remove("hidden");
        status.textContent = projects.length ? projects.length + " project(s) available" : "No project available.";
        list.innerHTML = projects.map(function (project) {
          const active = currentProject && project.projectKey === currentProject.projectKey;
          const costCenterRows = project.subsystemSummaryCostCenters && Array.isArray(project.subsystemSummaryCostCenters.rows)
            ? project.subsystemSummaryCostCenters.rows.filter(function (row) { return String(row.position || "").trim(); })
            : [];
          return '<button type="button" data-subsystem-summary-project-select="' + escapeHtml(project.projectKey) + '" class="w-full rounded-xl border px-3 py-3 text-left transition-all ' +
            (active ? "border-cyan-300 bg-cyan-50 shadow-sm ring-1 ring-cyan-200" : "border-slate-200 bg-white hover:bg-slate-100") + '">' +
              '<div class="text-sm font-semibold text-slate-900">' + escapeHtml(project.projectName) + '</div>' +
              '<div class="mt-1 flex items-center gap-1.5">' +
                '<span class="text-[10px] font-bold px-1.5 py-0.5 rounded-full ' + (project.hasPhases ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-400 border border-slate-200") + '">PH</span>' +
                '<span class="text-[10px] font-bold px-1.5 py-0.5 rounded-full ' + (project.hasWbsImport ? "bg-cyan-50 text-cyan-700 border border-cyan-200" : "bg-slate-100 text-slate-400 border border-slate-200") + '">WBS</span>' +
                '<span class="text-[10px] font-bold px-1.5 py-0.5 rounded-full ' + (costCenterRows.length ? "bg-blue-50 text-blue-700 border border-blue-200" : "bg-slate-100 text-slate-400 border border-slate-200") + '">CC</span>' +
                '<span class="text-[10px] font-bold px-1.5 py-0.5 rounded-full ' + (project.subsystemSummaryGuidePlanning ? "bg-violet-50 text-violet-700 border border-violet-200" : "bg-slate-100 text-slate-400 border border-slate-200") + '">GP</span>' +
              '</div>' +
            '</button>';
        }).join("");

        if (!currentProject) {
          empty.classList.remove("hidden");
          content.classList.add("hidden");
          return;
        }

        workspace.dataset.currentProjectKey = currentProject.projectKey;
        empty.classList.add("hidden");
        content.classList.remove("hidden");
        title.textContent = currentProject.projectName;
        meta.textContent = (currentProject.projectType || "No project type") + " | " + (currentProject.projectContext || "No context");

        const missingParts = [];
        if (!currentProject.hasWbsImport) missingParts.push('<div class="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">Import the WBS Workload sheet before generating Workload export rows.</div>');
        const currentCostCenterRows = currentProject.subsystemSummaryCostCenters && Array.isArray(currentProject.subsystemSummaryCostCenters.rows)
          ? currentProject.subsystemSummaryCostCenters.rows.filter(function (row) { return String(row.position || "").trim(); })
          : [];
        if (!currentCostCenterRows.length) missingParts.push('<div class="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">No Cost Center row was found for this project.</div>');
        if (!currentProject.subsystemSummaryGuidePlanning) missingParts.push('<div class="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">Configure Guide Planning to fill Planning Guide and occurrences.</div>');
        missing.classList.toggle("hidden", missingParts.length === 0);
        missing.innerHTML = missingParts.join("");

        const files = buildSubsystemSummaryVirtualFiles(currentProject);
        const currentFileKey = workspace.dataset.currentFileKey && files.some(function (file) { return file.key === workspace.dataset.currentFileKey; })
          ? workspace.dataset.currentFileKey
          : "global";
        const currentFile = files.find(function (file) { return file.key === currentFileKey; }) || files[0] || null;
        workspace.dataset.currentFileKey = currentFile ? currentFile.key : "";
        exportBtn.disabled = !currentFile;
        exportBtn.dataset.subsystemSummaryExport = currentFile ? currentFile.key : "";

        const globalFiles = files.filter(function (file) { return file.mode === "global"; });
        const phaseFiles = files.filter(function (file) { return file.mode === "phase"; });
        function fileButton(file) {
          const active = currentFile && file.key === currentFile.key;
          const rowCount = file.sheets.reduce(function (sum, sheet) { return sum + sheet.rows.length; }, 0);
          return '<button type="button" data-subsystem-summary-file-select="' + escapeHtml(file.key) + '" class="w-full rounded-xl border px-3 py-2.5 text-left transition-all ' +
            (active ? "border-cyan-300 bg-cyan-50 text-cyan-900" : "border-slate-200 bg-white hover:bg-slate-100 text-slate-700") + '">' +
              '<div class="flex items-center gap-2">' +
                '<span class="material-symbols-outlined text-[18px] text-cyan-600">description</span>' +
                '<span class="min-w-0 flex-1 truncate text-sm font-semibold">' + escapeHtml(file.name) + '</span>' +
              '</div>' +
              '<div class="mt-1 pl-7 text-xs text-slate-500">' + file.sheets.length + ' sheet(s) | ' + rowCount + ' row(s)</div>' +
            '</button>';
        }
        fileTree.innerHTML =
          '<details class="rounded-xl border border-slate-200 bg-white p-3" open>' +
            '<summary class="cursor-pointer text-sm font-bold text-slate-700">Global project export</summary>' +
            '<div class="mt-3 space-y-2">' + globalFiles.map(fileButton).join("") + '</div>' +
          '</details>' +
          '<details class="rounded-xl border border-slate-200 bg-white p-3" open>' +
            '<summary class="cursor-pointer text-sm font-bold text-slate-700">Phase exports</summary>' +
            '<div class="mt-3 space-y-2">' + phaseFiles.map(fileButton).join("") + '</div>' +
          '</details>';

        renderSubsystemSummaryPreview(currentProject, currentFile);
      }

      function buildToolsConsumablesProjects() {
        const phaseProjects = buildCombinedProjectPhaseProjects();
        if (!phaseProjects.length) return [];

        const workloadOverrides = readWorkloadOverridesFallbackState();
        const workloadProjects = buildFallbackWorkloadSynthesisProjects();
        const workloadByLookup = buildProjectLookupMap(workloadProjects);
        const subsystemByLookup = buildProjectLookupMap(buildFallbackSubsystemSourceProjects());

        return phaseProjects.map(function (phaseProj) {
          const workloadContext = resolveFallbackWorkloadContext(phaseProj, workloadByLookup, subsystemByLookup, workloadOverrides);

          return {
            projectKey:            phaseProj.projectKey,
            projectName:           phaseProj.projectName,
            projectType:           phaseProj.projectType,
            projectContext:        phaseProj.projectContext,
            persistedKeys:         workloadContext.lookupKeys,
            phases:                phaseProj.phases,
            mobilisationPhaseCode: phaseProj.mobilisationPhaseCode,
            recurrentCode:         phaseProj.recurrentCode,
            demobilisationCode:    phaseProj.demobilisationCode,
            subsystems:            workloadContext.subsystems,
            hasPhases:             phaseProj.phases.length > 0,
            hasSubsystems:         workloadContext.subsystems.length > 0,
          };
        }).filter(function (p) { return p.hasPhases; });
      }

      function closeToolsConsumablesWorkspace() {
        setFallbackDetailWorkspaceActive(false);
        $("toolsConsumablesWorkspace")?.classList.add("hidden");
      }

      function renderFallbackToolsConsumablesWorkspace() {
        const workspace  = $("toolsConsumablesWorkspace");
        const list       = $("tcProjectList");
        const emptyEl    = $("tcWorkspaceEmpty");
        const contentEl  = $("tcWorkspaceContent");
        const statusEl   = $("tcWorkspaceStatus");
        const titleEl    = $("tcCurrentProjectTitle");
        const metaEl     = $("tcCurrentProjectMeta");
        const missingEl  = $("tcMissingData");
        const tableBody  = $("tcTableBody");
        const fileInput  = $("tcExcelFileInput");
        if (!workspace || !list || !emptyEl || !contentEl || !statusEl || !titleEl || !metaEl || !missingEl || !tableBody) return;

        const projects = buildToolsConsumablesProjects();
        const currentKey = workspace.dataset.currentProjectKey && projects.some(function (p) { return p.projectKey === workspace.dataset.currentProjectKey; })
          ? workspace.dataset.currentProjectKey
          : (projects[0] ? projects[0].projectKey : "");
        const cur = projects.find(function (p) { return p.projectKey === currentKey; }) || null;

        workspace.classList.remove("hidden");
        statusEl.textContent = projects.length ? projects.length + " project(s) available" : "No project available.";

        list.innerHTML = projects.map(function (p) {
          const active = cur && p.projectKey === cur.projectKey;
          return (
            '<button type="button" data-tc-project-select="' + escapeHtml(p.projectKey) + '" class="w-full rounded-xl border px-3 py-3 text-left transition-all ' +
              (active ? "border-orange-300 bg-orange-50 shadow-sm ring-1 ring-orange-200" : "border-slate-200 bg-white hover:bg-slate-100") + '">' +
              '<div class="text-sm font-semibold text-slate-900">' + escapeHtml(p.projectName) + '</div>' +
              '<div class="mt-1 flex items-center gap-1.5">' +
                '<span class="text-[10px] font-bold px-1.5 py-0.5 rounded-full ' + (p.hasPhases ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-400 border border-slate-200") + '">PH</span>' +
                '<span class="text-[10px] font-bold px-1.5 py-0.5 rounded-full ' + (p.hasSubsystems ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-400 border border-slate-200") + '">SYS</span>' +
              '</div>' +
            '</button>'
          );
        }).join("");

        if (!cur) {
          emptyEl.classList.remove("hidden");
          contentEl.classList.add("hidden");
          return;
        }

        workspace.dataset.currentProjectKey = cur.projectKey;
        emptyEl.classList.add("hidden");
        contentEl.classList.remove("hidden");
        titleEl.textContent = cur.projectName;
        metaEl.textContent  = (cur.projectType || "No project type") + " | " + (cur.projectContext || "No context");
        if (fileInput) fileInput.dataset.projectKey = cur.projectKey;

        // ── Currency selector ─────────────────────────────────────────────
        const currencyRow    = $("tcCurrencyRow");
        const currencySelect = $("tcCurrencySelect");
        const currencyLabel  = $("tcCurrencyRateLabel");
        const currencyOpts   = buildTcCurrencyOptions(cur.projectKey);
        const savedCurrency  = workspace.dataset.tcCurrency || "EUR";
        const activeCurrency = currencyOpts.find(function (o) { return o.code === savedCurrency; }) || currencyOpts[0];
        const displayRate    = (activeCurrency && activeCurrency.rate !== null) ? activeCurrency.rate : 1;

        if (currencySelect) {
          currencySelect.innerHTML = currencyOpts.map(function (o) {
            return '<option value="' + escapeHtml(o.code) + '"' + (o.code === activeCurrency.code ? " selected" : "") + '>' + escapeHtml(o.code) + '</option>';
          }).join("");
          currencySelect.dataset.projectKey = cur.projectKey;
        }
        if (currencyRow) currencyRow.classList.remove("hidden");
        if (currencyLabel) {
          if (activeCurrency.code === "EUR") {
            currencyLabel.textContent = "Values in EUR (default)";
          } else if (activeCurrency.rate === null) {
            currencyLabel.textContent = "Rate unavailable — values shown in EUR";
          } else {
            currencyLabel.textContent = "1 EUR = " + Number(activeCurrency.rate).toFixed(4) + " " + activeCurrency.code;
          }
        }

        const missingParts = [];
        if (!cur.hasPhases)     missingParts.push('<div class="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"><span class="material-symbols-outlined text-[18px] text-amber-500 shrink-0">info</span>No phases found. Configure Phase Timeline in <strong>Project Phases Workspace</strong>.</div>');
        if (!cur.hasSubsystems) missingParts.push('<div class="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"><span class="material-symbols-outlined text-[18px] text-amber-500 shrink-0">info</span>No subsystems found. Fill the Workload Table in <strong>Workload Synthesis Workspace</strong>.</div>');
        if (missingParts.length) {
          missingEl.classList.remove("hidden");
          missingEl.innerHTML = missingParts.join("");
        } else {
          missingEl.classList.add("hidden");
          missingEl.innerHTML = "";
        }

        const mobCode = cur.mobilisationPhaseCode || "MOB";
        const recCode = cur.recurrentCode         || "REC";
        const demCode = cur.demobilisationCode    || "DEM";
        const PERIODS = [
          { type: "mob", label: mobCode },
          { type: "rec", label: recCode },
          { type: "dem", label: demCode },
        ];

        const TC_COLS = [
          { key: "ind_tools",   label: "Individual tools"  },
          { key: "coll_tools",  label: "Collective tools"  },
          { key: "spec_tools",  label: "Special tools"     },
          { key: "consumables", label: "Consumables"       },
          { key: "ppe",         label: "PPE"               },
        ];

        const PHASE_PALETTE = [
          { border: "#38bdf8", bg: "#f0f9ff", dot: "#0ea5e9" },
          { border: "#34d399", bg: "#f0fdf4", dot: "#10b981" },
          { border: "#fbbf24", bg: "#fffbeb", dot: "#f59e0b" },
          { border: "#a78bfa", bg: "#f5f3ff", dot: "#8b5cf6" },
          { border: "#fb7185", bg: "#fff1f2", dot: "#f43f5e" },
          { border: "#2dd4bf", bg: "#f0fdfa", dot: "#14b8a6" },
          { border: "#93c5fd", bg: "#eff6ff", dot: "#3b82f6" },
          { border: "#86efac", bg: "#f7fef7", dot: "#22c55e" },
        ];
        function phaseCellStyle(phaseIdx) {
          const c = PHASE_PALETTE[phaseIdx % PHASE_PALETTE.length];
          return 'style="border-left: 3px solid ' + c.border + '; background: ' + c.bg + ';"';
        }
        function phaseDot(phaseIdx) {
          const c = PHASE_PALETTE[phaseIdx % PHASE_PALETTE.length];
          return '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:' + c.dot + ';flex-shrink:0;margin-right:2px;"></span>';
        }
        function periodBadge(period) {
          const cls = period.type === "mob"
            ? "bg-sky-50 text-sky-700 border-sky-200"
            : period.type === "rec"
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : "bg-slate-100 text-slate-500 border-slate-200";
          return '<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ' + cls + '">' + escapeHtml(period.label) + '</span>';
        }

        const projData = forceZeroMobWithoutPostWarranty(
          fillMissingImportedPhaseValues(
            readMergedPersistedFallbackProjectState(readToolsConsumablesFallbackState(), getProjectLookupKeys(cur)),
            cur.phases
          ),
          cur.phases
        );

        function isStoredPseudoSubsystem(value, pseudoSubsystem) {
          const key = normalizeWbsText(value);
          if (pseudoSubsystem === "__shared__") {
            return key === "__shared__" || key.indexOf("shared") !== -1 || key.indexOf("depot pool") !== -1;
          }
          if (pseudoSubsystem === "__management__") {
            return key === "__management__" || key.indexOf("management") !== -1;
          }
          return key === normalizeWbsText(pseudoSubsystem);
        }

        function hasStoredPseudoSubsystemData(phaseKey, pseudoSubsystem) {
          const targetPhaseKey = normalizeWbsText(phaseKey);
          return Object.keys(projData).some(function (key) {
            const parts = String(key || "").split("|");
            return parts.length === 4 && normalizeWbsText(parts[0]) === targetPhaseKey && isStoredPseudoSubsystem(parts[1], pseudoSubsystem);
          });
        }

        function resolveCell(phaseKey, subsystem, periodType, colKey) {
          const k = phaseKey + "|" + subsystem + "|" + periodType + "|" + colKey;
          let eurVal = Object.prototype.hasOwnProperty.call(projData, k) ? projData[k] : undefined;
          if (eurVal === undefined) {
            const targetPhaseKey = normalizeWbsText(phaseKey);
            const targetSubsystemKey = normalizeWbsText(subsystem);
            const matchKey = Object.keys(projData).find(function (key) {
              const parts = String(key || "").split("|");
              if (parts.length !== 4) return false;
              if (normalizeWbsText(parts[0]) !== targetPhaseKey || parts[2] !== periodType || parts[3] !== colKey) return false;
              if (subsystem === "__shared__" || subsystem === "__management__") return isStoredPseudoSubsystem(parts[1], subsystem);
              return normalizeWbsText(parts[1]) === targetSubsystemKey;
            });
            eurVal = matchKey ? projData[matchKey] : 0;
          }
          return Math.round(eurVal * displayRate * 100) / 100;
        }

        function tcCellInput(phaseKey, subsystem, periodType, colKey, val, disabled) {
          return (
            '<input type="number" min="0" step="any" ' +
              'data-tc-cell ' +
              'data-project-key="' + escapeHtml(cur.projectKey) + '" ' +
              'data-phase-key="'   + escapeHtml(phaseKey)        + '" ' +
              'data-subsystem="'   + escapeHtml(subsystem)        + '" ' +
              'data-period="'      + escapeHtml(periodType)       + '" ' +
              'data-col="'         + escapeHtml(colKey)           + '" ' +
              'data-tc-rate="'     + escapeHtml(String(displayRate)) + '" ' +
              'value="' + escapeHtml(String(val)) + '" ' +
              (disabled ? 'disabled ' : '') +
              'class="w-full min-w-[80px] rounded-lg border ' + (disabled ? 'border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed' : 'border-slate-200 bg-white') + ' px-2 py-1 text-center text-sm tabular-nums focus:outline-none focus:ring-1 focus:ring-orange-400">'
          );
        }

        let collapsedPhases;
        try { collapsedPhases = new Set(JSON.parse(workspace.dataset.tcCollapsed || "[]")); } catch (_e) { collapsedPhases = new Set(); }

        const rows = [];

        cur.phases.forEach(function (phase, phaseIdx) {
          const subsystems = cur.subsystems.length ? cur.subsystems : [];
          const phaseHasWarranty = !!(phase.postWarrantyStartDate && phase.postWarrantyEndDate);
          const isCollapsed = collapsedPhases.has(phase.key);
          const hasSharedData = hasStoredPseudoSubsystemData(phase.key, "__shared__");
          const hasManagementData = hasStoredPseudoSubsystemData(phase.key, "__management__");

          const collapsedLabel = (function () {
            const parts = [];
            if (subsystems.length) parts.push(subsystems.length + " subsystem(s)");
            if (hasSharedData) parts.push("shared");
            if (hasManagementData) parts.push("management");
            return parts.length ? parts.join(" + ") + " hidden" : "";
          })();

          const phaseToggleBtn =
            '<button type="button" data-tc-phase-toggle="' + escapeHtml(phase.key) + '" ' +
              'class="inline-flex items-center gap-1.5 group w-full text-left">' +
              '<span class="material-symbols-outlined text-[16px] text-slate-400 group-hover:text-orange-600 transition-colors shrink-0" ' +
                'style="transition:transform .15s;' + (isCollapsed ? "" : "transform:rotate(90deg)") + '">' +
                'chevron_right' +
              '</span>' +
              phaseDot(phaseIdx) +
              '<span class="font-bold text-slate-800 group-hover:text-orange-700 transition-colors">' + escapeHtml(phase.label) + '</span>' +
            '</button>' +
            '<div class="mt-0.5 flex items-center gap-1.5 pl-6">' +
              '<span class="text-[10px] text-slate-400 font-mono">' + escapeHtml(phase.phaseCode) + '</span>' +
              (isCollapsed && collapsedLabel ? '<span class="text-[10px] text-slate-400">' + collapsedLabel + '</span>' : '') +
            '</div>';

          if (!subsystems.length && !hasSharedData && !hasManagementData) {
            rows.push(
              '<tr class="border-t border-slate-200 bg-slate-50/60">' +
                '<td class="py-3 pr-3 align-top text-sm" ' + phaseCellStyle(phaseIdx) + '>' + phaseToggleBtn + '</td>' +
                '<td colspan="7" class="py-3 px-3 text-sm text-slate-400 italic">No subsystems defined.</td>' +
              '</tr>'
            );
            return;
          }

          if (isCollapsed) {
            rows.push(
              '<tr class="border-t border-slate-200 bg-slate-50/60">' +
                '<td colspan="8" class="py-2.5 px-3 text-sm" ' + phaseCellStyle(phaseIdx) + '>' + phaseToggleBtn + '</td>' +
              '</tr>'
            );
            return;
          }

          const phaseRowspan = (subsystems.length + (hasSharedData ? 1 : 0) + (hasManagementData ? 1 : 0)) * PERIODS.length;

          subsystems.forEach(function (subsystem, subIdx) {
            PERIODS.forEach(function (period, periodIdx) {
              let rowHtml = '<tr class="' + (subIdx % 2 === 0 ? "" : "bg-slate-50/40") + '">';

              if (subIdx === 0 && periodIdx === 0) {
                rowHtml += '<td rowspan="' + phaseRowspan + '" class="py-3 pr-3 align-top border-t border-slate-200 text-sm" ' + phaseCellStyle(phaseIdx) + '>' + phaseToggleBtn + '</td>';
              }
              if (periodIdx === 0) {
                rowHtml += '<td rowspan="' + PERIODS.length + '" class="py-2 px-3 align-middle ' + (subIdx === 0 ? "border-t border-slate-200" : "") + ' font-medium text-sm whitespace-nowrap">' + escapeHtml(subsystem) + '</td>';
              }

              rowHtml += '<td class="py-2 px-3 whitespace-nowrap">' + periodBadge(period) + '</td>';

              TC_COLS.forEach(function (col, colIdx) {
                const mobForced = period.type === "mob" && !phaseHasWarranty;
                const val = mobForced ? 0 : resolveCell(phase.key, subsystem, period.type, col.key);
                const isLast = colIdx === TC_COLS.length - 1;
                rowHtml += '<td class="py-1.5 ' + (isLast ? "pl-3" : "px-3") + ' text-center">' + tcCellInput(phase.key, subsystem, period.type, col.key, val, mobForced) + '</td>';
              });

              rowHtml += '</tr>';
              rows.push(rowHtml);
            });
          });

          // Shared / Depot Pool pseudo-subsystem rows (amber styling)
          if (hasSharedData) {
            PERIODS.forEach(function (period, periodIdx) {
              const isFirstShared = periodIdx === 0;
              let rowHtml = '<tr class="bg-amber-50/60">';

              // Phase cell: only needed when no regular subsystems already rendered it
              if (subsystems.length === 0 && isFirstShared) {
                rowHtml += '<td rowspan="' + phaseRowspan + '" class="py-3 pr-3 align-top border-t border-slate-200 text-sm" ' + phaseCellStyle(phaseIdx) + '>' + phaseToggleBtn + '</td>';
              }

              if (isFirstShared) {
                rowHtml +=
                  '<td rowspan="' + PERIODS.length + '" class="py-2 px-3 align-middle border-t border-amber-200 text-sm">' +
                    '<div class="flex flex-col gap-1">' +
                      '<span class="italic font-medium text-amber-700 whitespace-nowrap">Shared / Depot Pool</span>' +
                      '<span class="inline-flex items-center self-start px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-700 border border-amber-200">Project-level</span>' +
                    '</div>' +
                  '</td>';
              }

              rowHtml += '<td class="py-2 px-3 whitespace-nowrap' + (isFirstShared ? " border-t border-amber-200" : "") + '">' + periodBadge(period) + '</td>';

              TC_COLS.forEach(function (col, colIdx) {
                const mobForced = period.type === "mob" && !phaseHasWarranty;
                const val = mobForced ? 0 : resolveCell(phase.key, "__shared__", period.type, col.key);
                const isLast = colIdx === TC_COLS.length - 1;
                rowHtml += '<td class="py-1.5 ' + (isLast ? "pl-3" : "px-3") + ' text-center bg-amber-50">' + tcCellInput(phase.key, "__shared__", period.type, col.key, val, mobForced) + '</td>';
              });

              rowHtml += '</tr>';
              rows.push(rowHtml);
            });
          }

          // MANAGEMENT pseudo-subsystem rows (violet styling)
          if (hasManagementData) {
            PERIODS.forEach(function (period, periodIdx) {
              const isFirstManagement = periodIdx === 0;
              let rowHtml = '<tr class="bg-violet-50/60">';

              // Phase cell: only needed when no regular or shared rows already rendered it
              if (subsystems.length === 0 && !hasSharedData && isFirstManagement) {
                rowHtml += '<td rowspan="' + phaseRowspan + '" class="py-3 pr-3 align-top border-t border-slate-200 text-sm" ' + phaseCellStyle(phaseIdx) + '>' + phaseToggleBtn + '</td>';
              }

              if (isFirstManagement) {
                rowHtml +=
                  '<td rowspan="' + PERIODS.length + '" class="py-2 px-3 align-middle border-t border-violet-200 text-sm">' +
                    '<div class="flex flex-col gap-1">' +
                      '<span class="italic font-medium text-violet-700 whitespace-nowrap">MANAGEMENT</span>' +
                      '<span class="inline-flex items-center self-start px-1.5 py-0.5 rounded text-[9px] font-bold bg-violet-100 text-violet-700 border border-violet-200">Project-level</span>' +
                    '</div>' +
                  '</td>';
              }

              rowHtml += '<td class="py-2 px-3 whitespace-nowrap' + (isFirstManagement ? " border-t border-violet-200" : "") + '">' + periodBadge(period) + '</td>';

              TC_COLS.forEach(function (col, colIdx) {
                const mobForced = period.type === "mob" && !phaseHasWarranty;
                const val = mobForced ? 0 : resolveCell(phase.key, "__management__", period.type, col.key);
                const isLast = colIdx === TC_COLS.length - 1;
                rowHtml += '<td class="py-1.5 ' + (isLast ? "pl-3" : "px-3") + ' text-center bg-violet-50">' + tcCellInput(phase.key, "__management__", period.type, col.key, val, mobForced) + '</td>';
              });

              rowHtml += '</tr>';
              rows.push(rowHtml);
            });
          }
        });

        tableBody.innerHTML = rows.length
          ? rows.join("")
          : '<tr><td colspan="8" class="py-6 text-center text-sm text-slate-500">No data available.</td></tr>';
      }

      function importToolsConsumablesFromExcel(projectKey, phases, subsystems, file) {
        if (!file || !projectKey) return;
        if (typeof XLSX === "undefined") { window.alert("XLSX library is not available on this page."); return; }

        function nk(s) {
          return String(s || "").trim().toLowerCase()
            .replace(/[\s/\\-]+/g, "_").replace(/[()]+/g, "").replace(/[^\w]+/g, "_")
            .replace(/^_+|_+$/g, "").replace(/_+/g, "_");
        }

        const reader = new FileReader();
        reader.onload = function (evt) {
          try {
            const data = new Uint8Array(evt.target.result);
            const wb = XLSX.read(data, { type: "array" });

            const sheetName = wb.SheetNames.find(function (n) {
              const nn = nk(n);
              return nn === "project_cost_matrix" || nn.indexOf("cost_matrix") !== -1 || nn.indexOf("project_cost") !== -1;
            });
            if (!sheetName) {
              window.alert("No 'Project Cost Matrix' sheet found in this Excel file.\nAvailable sheets: " + wb.SheetNames.join(", "));
              return;
            }

            const rawRows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: "", raw: false, blankrows: false });
            function num(v) { const f = parseFloat(String(v || "").replace(/\s/g, "").replace(/,/g, ".")); return isNaN(f) ? 0 : f; }

            // Subsystem lookup: normalized Excel name → canonical project name
            const subByNorm = new Map();
            (subsystems || []).forEach(function (sub) { subByNorm.set(nk(sub), sub); });

            // Phase lookup: normalized code/label → { key, hasWarranty }
            const phaseByNorm = new Map();
            phases.forEach(function (ph) {
              const info = { key: ph.key, hasWarranty: !!(ph.postWarrantyStartDate && ph.postWarrantyEndDate) };
              phaseByNorm.set(nk(ph.phaseCode || ""), info);
              phaseByNorm.set(nk(ph.label || ""), info);
            });

            // Accumulate: { [phaseKey]: { [subsystem]: { [colKey]: { mob, rec } } } }
            const accumulated = {};

            rawRows.forEach(function (rawRow) {
              const row = {};
              Object.entries(rawRow).forEach(function (kv) { row[nk(kv[0])] = kv[1]; });

              // Real column names after nk(): cost_bucket, allocation_level,
              //   mobilization_total_cost_eur, recurring_avg_year_eur
              const subsystemRaw = String(
                rawRow["Subsystem"] || rawRow["subsystem"] || rawRow["Sub System"] ||
                rawRow["System"] || row.subsystem || row.sub_system || row.system || ""
              ).trim();
              if (!subsystemRaw) return;

              // Normalize subsystem: detect project-level pseudo-subsystems.
              const normSub = nk(subsystemRaw);
              const isSharedRow = normSub.indexOf("shared") !== -1 || normSub.indexOf("depot_pool") !== -1;
              const isManagementRow = normSub.indexOf("management") !== -1;
              const subsystem = isSharedRow ? "__shared__" : (isManagementRow ? "__management__" : (subByNorm.get(normSub) || subsystemRaw));

              const costBucket = nk(
                rawRow["Cost Bucket"] || rawRow["cost_bucket"] || rawRow["Category"] ||
                row.cost_bucket || row.category || row.type || row.cost_type || ""
              );
              const allocLevel = nk(
                rawRow["Allocation Level"] || rawRow["allocation_level"] || rawRow["Allocation"] ||
                row.allocation_level || row.allocation || row.alloc || ""
              );

              if (!costBucket) return;

              let colKey = null;
              if (costBucket === "tooling" || costBucket.indexOf("tooling") !== -1) {
                if (allocLevel.indexOf("technician") !== -1 || allocLevel.indexOf("manager") !== -1)  colKey = "ind_tools";
                else if (allocLevel.indexOf("team") !== -1)   colKey = "coll_tools";
                else if (allocLevel.indexOf("depot") !== -1)  colKey = "spec_tools";
              } else if (costBucket === "consumables" || costBucket.indexOf("consumable") !== -1) {
                colKey = "consumables";
              } else if (costBucket === "ppe") {
                colKey = "ppe";
              }
              if (!colKey) return;

              // Mob = Mobilization Total Cost; Rec = Recurring Avg / Year
              const mobVal = num(
                rawRow["Mobilization Total Cost (EUR)"] || rawRow["Mobilization Total Cost"] ||
                row.mobilization_total_cost_eur || row.mobilization_total_cost ||
                row.mobilization || row.mob || row.mobilisation || ""
              );
              const recVal = num(
                rawRow["Recurring Avg / Year (EUR)"] || rawRow["Recurring Avg / Year"] ||
                row.recurring_avg_year_eur || row.recurring_avg_year ||
                row.recurring_avg || row.recurring || row.rec || ""
              );

              // No Phase column in this file → apply to all project phases
              const phaseCellRaw = String(row.phase || row.phase_name || row.phase_code || "").trim();
              const phaseInfo = phaseCellRaw ? (phaseByNorm.get(nk(phaseCellRaw)) || null) : null;
              const targetPhases = phaseInfo
                ? [{ key: phaseInfo.key, hasWarranty: phaseInfo.hasWarranty }]
                : phases.map(function (ph) { return { key: ph.key, hasWarranty: !!(ph.postWarrantyStartDate && ph.postWarrantyEndDate) }; });

              targetPhases.forEach(function (ti) {
                if (!accumulated[ti.key]) accumulated[ti.key] = {};
                if (!accumulated[ti.key][subsystem]) accumulated[ti.key][subsystem] = {};
                if (!accumulated[ti.key][subsystem][colKey]) accumulated[ti.key][subsystem][colKey] = { mob: 0, rec: 0 };
                accumulated[ti.key][subsystem][colKey].mob += mobVal;
                accumulated[ti.key][subsystem][colKey].rec += recVal;
              });
            });

            // Build flat storage — Mob = 0 unless phase has warranty; Dem = always 0
            let newProjData = {};
            phases.forEach(function (ph) {
              const phaseHasWarranty = !!(ph.postWarrantyStartDate && ph.postWarrantyEndDate);
              const phaseAcc = accumulated[ph.key] || {};
              Object.keys(phaseAcc).forEach(function (sub) {
                const subAcc = phaseAcc[sub];
                ["ind_tools", "coll_tools", "spec_tools", "consumables", "ppe"].forEach(function (ck) {
                  if (!subAcc[ck]) return;
                  const prefix = ph.key + "|" + sub + "|";
                  newProjData[prefix + "mob|" + ck] = phaseHasWarranty ? Math.round(subAcc[ck].mob * 100) / 100 : 0;
                  newProjData[prefix + "rec|" + ck] = Math.round(subAcc[ck].rec * 100) / 100;
                  newProjData[prefix + "dem|" + ck] = 0;
                });
              });
            });
            newProjData = forceZeroMobWithoutPostWarranty(fillMissingImportedPhaseValues(newProjData, phases), phases);

            if (!Object.keys(newProjData).length) {
              window.alert(
                "Import completed but no matching rows were found.\n\n" +
                "Check that:\n• Cost Bucket column contains 'Tooling' or 'Consumables'\n" +
                "• Allocation Level contains 'Technician', 'Team', or 'Depot'\n" +
                "• Sheet found: " + sheetName
              );
            }

            const allState = readToolsConsumablesFallbackState();
            allState[projectKey] = newProjData;
            writeToolsConsumablesFallbackState(allState);

            renderFallbackToolsConsumablesWorkspace();
          } catch (err) {
            console.error("Tools & Consumables Excel import error:", err);
            window.alert("Failed to parse Excel file: " + (err.message || err));
          }
        };
        reader.readAsArrayBuffer(file);
      }

      // ─── Vehicles ────────────────────────────────────────────────────────────

      function buildVehiclesProjects() {
        const phaseProjects = buildCombinedProjectPhaseProjects();
        if (!phaseProjects.length) return [];

        const workloadOverrides = readWorkloadOverridesFallbackState();
        const workloadProjects  = buildFallbackWorkloadSynthesisProjects();
        const workloadByLookup  = buildProjectLookupMap(workloadProjects);
        const subsystemByLookup = buildProjectLookupMap(buildFallbackSubsystemSourceProjects());

        return phaseProjects.map(function (phaseProj) {
          const workloadContext = resolveFallbackWorkloadContext(phaseProj, workloadByLookup, subsystemByLookup, workloadOverrides);

          return {
            projectKey:            phaseProj.projectKey,
            projectName:           phaseProj.projectName,
            projectType:           phaseProj.projectType,
            projectContext:        phaseProj.projectContext,
            persistedKeys:         workloadContext.lookupKeys,
            phases:                phaseProj.phases,
            mobilisationPhaseCode: phaseProj.mobilisationPhaseCode,
            recurrentCode:         phaseProj.recurrentCode,
            demobilisationCode:    phaseProj.demobilisationCode,
            subsystems:            workloadContext.subsystems,
            hasPhases:             phaseProj.phases.length > 0,
            hasSubsystems:         workloadContext.subsystems.length > 0,
          };
        }).filter(function (p) { return p.hasPhases; });
      }

      function closeVehiclesWorkspace() {
        setFallbackDetailWorkspaceActive(false);
        $("vehiclesWorkspace")?.classList.add("hidden");
      }

      function renderFallbackVehiclesWorkspace() {
        const workspace  = $("vehiclesWorkspace");
        const list       = $("vehiclesProjectList");
        const emptyEl    = $("vehiclesWorkspaceEmpty");
        const contentEl  = $("vehiclesWorkspaceContent");
        const statusEl   = $("vehiclesWorkspaceStatus");
        const titleEl    = $("vehiclesCurrentProjectTitle");
        const metaEl     = $("vehiclesCurrentProjectMeta");
        const tableBody  = $("vehiclesTableBody");
        const currencyRow   = $("vehiclesCurrencyRow");
        const currencySelect = $("vehiclesCurrencySelect");
        const currencyRateLabel = $("vehiclesCurrencyRateLabel");
        const totalQtyRow   = $("vehiclesTotalQuantityRow");
        const totalQtyEl    = $("vehiclesTotalQuantity");
        if (!workspace) return;
        workspace.classList.remove("hidden");

        const projects = buildVehiclesProjects();

        if (list) {
          list.innerHTML = projects.length
            ? projects.map(function (p) {
                const isActive = workspace.dataset.currentProjectKey === p.projectKey;
                return (
                  '<button type="button" data-vehicles-project-select="' + escapeHtml(p.projectKey) + '" ' +
                    'class="w-full text-left rounded-xl border px-3 py-2.5 text-sm transition-all ' +
                    (isActive
                      ? 'border-orange-400 bg-orange-50 text-orange-800 font-semibold shadow-sm'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50') + '">' +
                    '<div class="font-semibold truncate">' + escapeHtml(p.projectName) + '</div>' +
                    '<div class="mt-0.5 text-[11px] text-slate-400 truncate">' + escapeHtml(p.projectType || p.projectContext || "—") + '</div>' +
                  '</button>'
                );
              }).join("")
            : '<p class="text-xs text-slate-400 italic">No projects found.</p>';
        }

        if (!projects.length) {
          if (statusEl) statusEl.textContent = "No projects available.";
          if (emptyEl)  emptyEl.classList.remove("hidden");
          if (contentEl) contentEl.classList.add("hidden");
          return;
        }

        const projectKey = workspace.dataset.currentProjectKey || projects[0].projectKey;
        const cur = projects.find(function (p) { return p.projectKey === projectKey; }) || projects[0];
        if (workspace.dataset.currentProjectKey !== cur.projectKey) {
          workspace.dataset.currentProjectKey = cur.projectKey;
        }

        if (statusEl) statusEl.textContent = cur.projectName;
        if (titleEl)  titleEl.textContent  = cur.projectName;
        if (metaEl)   metaEl.textContent   = [cur.projectType, cur.projectContext].filter(Boolean).join(" — ") || "—";

        // Currency selector
        const currencyOpts    = buildVehiclesCurrencyOptions(cur.projectKey);
        const savedCurrency   = workspace.dataset.vehiclesCurrency || "EUR";
        const activeCurrency  = currencyOpts.find(function (o) { return o.code === savedCurrency; }) || currencyOpts[0];
        const displayRate     = (activeCurrency && activeCurrency.rate !== null) ? activeCurrency.rate : 1;

        if (currencySelect && currencyRow) {
          currencyRow.classList.remove("hidden");
          currencySelect.innerHTML = currencyOpts.map(function (o) {
            return '<option value="' + escapeHtml(o.code) + '"' + (o.code === activeCurrency.code ? " selected" : "") + '>' + escapeHtml(o.code) + '</option>';
          }).join("");
          if (currencyRateLabel) {
            const rateStr = (activeCurrency.rate !== null && activeCurrency.rate !== 1)
              ? "1 EUR = " + Number(activeCurrency.rate).toFixed(4) + " " + activeCurrency.code
              : "";
            currencyRateLabel.textContent = rateStr;
          }
        }

        if (emptyEl)   emptyEl.classList.add("hidden");
        if (contentEl) contentEl.classList.remove("hidden");

        const projData = fillMissingImportedPhaseValues(
          readPersistedFallbackProjectState(readVehiclesFallbackState(), getProjectLookupKeys(cur)),
          cur.phases
        );

        // Total quantity KPI
        const totalQty = projData["__totalQuantity__"];
        if (totalQtyRow && totalQtyEl) {
          if (totalQty !== undefined) {
            totalQtyRow.classList.remove("hidden");
            totalQtyEl.textContent = String(Math.round(totalQty));
          } else {
            totalQtyRow.classList.add("hidden");
          }
        }

        function resolveCell(phaseKey, subsystem, periodType, colKey) {
          const k = phaseKey + "|" + subsystem + "|" + periodType + "|" + colKey;
          const eurVal = Object.prototype.hasOwnProperty.call(projData, k) ? projData[k] : 0;
          return Math.round(eurVal * displayRate * 100) / 100;
        }
        function resolveStrategy(subsystem) {
          return String(projData["__strategy__|" + subsystem] || "");
        }
        function strategyBadge(strategy) {
          const norm = strategy.toLowerCase();
          if (norm.indexOf("rental") !== -1)    return '<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border bg-sky-50 text-sky-700 border-sky-200">' + escapeHtml(strategy) + '</span>';
          if (norm.indexOf("invest") !== -1)    return '<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border bg-amber-50 text-amber-700 border-amber-200">' + escapeHtml(strategy) + '</span>';
          if (!strategy)                         return '<span class="text-slate-300 text-xs">—</span>';
          return '<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border bg-slate-100 text-slate-600 border-slate-200">' + escapeHtml(strategy) + '</span>';
        }

        function vehiclesCellInput(phaseKey, subsystem, periodType, colKey, val) {
          return (
            '<input type="number" step="any" ' +
              'data-vehicles-cell ' +
              'data-project-key="' + escapeHtml(cur.projectKey) + '" ' +
              'data-phase-key="'   + escapeHtml(phaseKey)        + '" ' +
              'data-subsystem="'   + escapeHtml(subsystem)        + '" ' +
              'data-period="'      + escapeHtml(periodType)       + '" ' +
              'data-col="'         + escapeHtml(colKey)           + '" ' +
              'data-vehicles-rate="' + escapeHtml(String(displayRate)) + '" ' +
              'value="' + escapeHtml(String(val)) + '" ' +
              'class="w-full min-w-[90px] rounded-lg border border-slate-200 bg-white px-2 py-1 text-center text-sm tabular-nums focus:outline-none focus:ring-1 focus:ring-orange-400">'
          );
        }

        const PHASE_PALETTE = [
          { border: "#38bdf8", bg: "#f0f9ff", dot: "#0ea5e9" },
          { border: "#34d399", bg: "#f0fdf4", dot: "#10b981" },
          { border: "#fbbf24", bg: "#fffbeb", dot: "#f59e0b" },
          { border: "#a78bfa", bg: "#f5f3ff", dot: "#8b5cf6" },
          { border: "#fb7185", bg: "#fff1f2", dot: "#f43f5e" },
          { border: "#2dd4bf", bg: "#f0fdfa", dot: "#14b8a6" },
          { border: "#93c5fd", bg: "#eff6ff", dot: "#3b82f6" },
          { border: "#86efac", bg: "#f7fef7", dot: "#22c55e" },
        ];
        function phaseCellStyle(phaseIdx) {
          const c = PHASE_PALETTE[phaseIdx % PHASE_PALETTE.length];
          return 'style="border-left: 3px solid ' + c.border + '; background: ' + c.bg + ';"';
        }
        function phaseDot(phaseIdx) {
          const c = PHASE_PALETTE[phaseIdx % PHASE_PALETTE.length];
          return '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:' + c.dot + ';flex-shrink:0;margin-right:2px;"></span>';
        }
        function periodBadge(period) {
          const cls = period.type === "mob"
            ? "bg-sky-50 text-sky-700 border-sky-200"
            : period.type === "rec"
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : "bg-slate-100 text-slate-500 border-slate-200";
          return '<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ' + cls + '">' + escapeHtml(period.label) + '</span>';
        }

        const mobCode = cur.mobilisationPhaseCode  || "MOB";
        const recCode = cur.recurrentCode          || "REC";
        const demCode = cur.demobilisationCode     || "DEM";
        const PERIODS = [
          { type: "mob", label: mobCode },
          { type: "rec", label: recCode },
          { type: "dem", label: demCode },
        ];
        const VEHICLES_COLS = [
          { key: "capex", label: "Capex cost"            },
          { key: "fuel",  label: "Fuel annual cost"       },
          { key: "opex",  label: "Operating annual cost"  },
        ];

        let collapsedPhases;
        try { collapsedPhases = new Set(JSON.parse(workspace.dataset.vehiclesCollapsed || "[]")); } catch (_e) { collapsedPhases = new Set(); }

        // Compute end-of-project year to determine Dem eligibility (mirrors Guide Planning logic)
        const endOfProjectDate = cur.phases.reduce(function (latest, ph) {
          const d = String(ph.endDate || "").trim();
          return (!latest || (d && d > latest)) ? d : latest;
        }, "");
        const endOfProjectYear = endOfProjectDate.slice(0, 4);

        const rows = [];

        cur.phases.forEach(function (phase, phaseIdx) {
          const subsystems   = cur.subsystems.length ? cur.subsystems : [];
          const isCollapsed  = collapsedPhases.has(phase.key);
          const isDemEligible = endOfProjectYear && String(phase.endDate || "").slice(0, 4) === endOfProjectYear;
          const hasProjMgmt  = Object.keys(projData).some(function (k) { return k.indexOf(phase.key + "|__project_mgmt__|") === 0; });

          const collapsedLabel = (function () {
            const parts = [];
            if (subsystems.length) parts.push(subsystems.length + " subsystem(s)");
            if (hasProjMgmt) parts.push("project/mgmt");
            return parts.length ? parts.join(" + ") + " hidden" : "";
          })();

          const phaseToggleBtn =
            '<button type="button" data-vehicles-phase-toggle="' + escapeHtml(phase.key) + '" ' +
              'class="inline-flex items-center gap-1.5 group w-full text-left">' +
              '<span class="material-symbols-outlined text-[16px] text-slate-400 group-hover:text-orange-600 transition-colors shrink-0" ' +
                'style="transition:transform .15s;' + (isCollapsed ? "" : "transform:rotate(90deg)") + '">' +
                'chevron_right' +
              '</span>' +
              phaseDot(phaseIdx) +
              '<span class="font-bold text-slate-800 group-hover:text-orange-700 transition-colors">' + escapeHtml(phase.label) + '</span>' +
            '</button>' +
            '<div class="mt-0.5 flex items-center gap-1.5 pl-6">' +
              '<span class="text-[10px] text-slate-400 font-mono">' + escapeHtml(phase.phaseCode) + '</span>' +
              (isCollapsed && collapsedLabel ? '<span class="text-[10px] text-slate-400">' + collapsedLabel + '</span>' : '') +
            '</div>';

          if (!subsystems.length && !hasProjMgmt) {
            rows.push(
              '<tr class="border-t border-slate-200 bg-slate-50/60">' +
                '<td class="py-3 pr-3 align-top text-sm" ' + phaseCellStyle(phaseIdx) + '>' + phaseToggleBtn + '</td>' +
                '<td colspan="6" class="py-3 px-3 text-sm text-slate-400 italic">No subsystems defined.</td>' +
              '</tr>'
            );
            return;
          }

          if (isCollapsed) {
            rows.push(
              '<tr class="border-t border-slate-200 bg-slate-50/60">' +
                '<td colspan="7" class="py-2.5 px-3 text-sm" ' + phaseCellStyle(phaseIdx) + '>' + phaseToggleBtn + '</td>' +
              '</tr>'
            );
            return;
          }

          const phaseRowspan = (subsystems.length + (hasProjMgmt ? 1 : 0)) * PERIODS.length;

          subsystems.forEach(function (subsystem, subIdx) {
            const strategy = resolveStrategy(subsystem);
            PERIODS.forEach(function (period, periodIdx) {
              const demForced = period.type === "dem" && !isDemEligible;
              let rowHtml = '<tr class="' + (subIdx % 2 === 0 ? "" : "bg-slate-50/40") + '">';

              if (subIdx === 0 && periodIdx === 0) {
                rowHtml += '<td rowspan="' + phaseRowspan + '" class="py-3 pr-3 align-top border-t border-slate-200 text-sm" ' + phaseCellStyle(phaseIdx) + '>' + phaseToggleBtn + '</td>';
              }
              if (periodIdx === 0) {
                rowHtml += '<td rowspan="' + PERIODS.length + '" class="py-2 px-3 align-middle ' + (subIdx === 0 ? "border-t border-slate-200" : "") + ' font-medium text-sm whitespace-nowrap">' + escapeHtml(subsystem) + '</td>';
                rowHtml += '<td rowspan="' + PERIODS.length + '" class="py-2 px-3 align-middle ' + (subIdx === 0 ? "border-t border-slate-200" : "") + ' whitespace-nowrap">' + strategyBadge(strategy) + '</td>';
              }

              rowHtml += '<td class="py-2 px-3 whitespace-nowrap">' + periodBadge(period) + '</td>';

              VEHICLES_COLS.forEach(function (col, colIdx) {
                const val    = demForced ? 0 : resolveCell(phase.key, subsystem, period.type, col.key);
                const isLast = colIdx === VEHICLES_COLS.length - 1;
                const tdCss  = 'py-1.5 ' + (isLast ? "pl-3" : "px-3") + ' text-center' + (demForced ? " bg-slate-50" : "");
                rowHtml += '<td class="' + tdCss + '">' + (demForced
                  ? '<input type="number" value="0" disabled class="w-full min-w-[90px] rounded-lg border border-slate-100 bg-slate-50 px-2 py-1 text-center text-sm tabular-nums text-slate-300 cursor-not-allowed">'
                  : vehiclesCellInput(phase.key, subsystem, period.type, col.key, val)
                ) + '</td>';
              });

              rowHtml += '</tr>';
              rows.push(rowHtml);
            });
          });

          // Project / Management pseudo-subsystem rows (indigo styling)
          if (hasProjMgmt) {
            const pmStrategy = resolveStrategy("__project_mgmt__");
            PERIODS.forEach(function (period, periodIdx) {
              const isFirst   = periodIdx === 0;
              const demForced = period.type === "dem" && !isDemEligible;
              let rowHtml = '<tr class="bg-indigo-50/60">';

              // Phase cell only when no regular subsystems rendered it
              if (subsystems.length === 0 && isFirst) {
                rowHtml += '<td rowspan="' + phaseRowspan + '" class="py-3 pr-3 align-top border-t border-slate-200 text-sm" ' + phaseCellStyle(phaseIdx) + '>' + phaseToggleBtn + '</td>';
              }

              if (isFirst) {
                rowHtml +=
                  '<td rowspan="' + PERIODS.length + '" class="py-2 px-3 align-middle border-t border-indigo-200 text-sm">' +
                    '<div class="flex flex-col gap-1">' +
                      '<span class="italic font-medium text-indigo-700 whitespace-nowrap">Project / Management</span>' +
                      '<span class="inline-flex items-center self-start px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-100 text-indigo-700 border border-indigo-200">Project-level</span>' +
                    '</div>' +
                  '</td>' +
                  '<td rowspan="' + PERIODS.length + '" class="py-2 px-3 align-middle border-t border-indigo-200 whitespace-nowrap">' + strategyBadge(pmStrategy) + '</td>';
              }

              rowHtml += '<td class="py-2 px-3 whitespace-nowrap' + (isFirst ? " border-t border-indigo-200" : "") + '">' + periodBadge(period) + '</td>';

              VEHICLES_COLS.forEach(function (col, colIdx) {
                const val    = demForced ? 0 : resolveCell(phase.key, "__project_mgmt__", period.type, col.key);
                const isLast = colIdx === VEHICLES_COLS.length - 1;
                const tdCss  = 'py-1.5 ' + (isLast ? "pl-3" : "px-3") + ' text-center' + (demForced ? " bg-slate-100" : " bg-indigo-50");
                rowHtml += '<td class="' + tdCss + '">' + (demForced
                  ? '<input type="number" value="0" disabled class="w-full min-w-[90px] rounded-lg border border-slate-100 bg-slate-50 px-2 py-1 text-center text-sm tabular-nums text-slate-300 cursor-not-allowed">'
                  : vehiclesCellInput(phase.key, "__project_mgmt__", period.type, col.key, val)
                ) + '</td>';
              });

              rowHtml += '</tr>';
              rows.push(rowHtml);
            });
          }
        });

        if (tableBody) {
          tableBody.innerHTML = rows.length
            ? rows.join("")
            : '<tr><td colspan="7" class="py-6 text-center text-sm text-slate-500">No data available.</td></tr>';
        }
      }

      function importVehiclesFromExcel(projectKey, phases, subsystems, file) {
        if (!file || !projectKey) return;
        if (typeof XLSX === "undefined") { window.alert("XLSX library is not available on this page."); return; }

        function nk(s) {
          return String(s || "").trim().toLowerCase()
            .replace(/[\s/\\-]+/g, "_").replace(/[()]+/g, "").replace(/[^\w]+/g, "_")
            .replace(/^_+|_+$/g, "").replace(/_+/g, "_");
        }

        const reader = new FileReader();
        reader.onload = function (evt) {
          try {
            const data = new Uint8Array(evt.target.result);
            const wb   = XLSX.read(data, { type: "array" });

            const sheetName = wb.SheetNames.find(function (n) {
              const nn = nk(n);
              return nn === "fleet_cost_matrix" || nn.indexOf("fleet_cost") !== -1 || nn.indexOf("fleet") !== -1;
            });
            if (!sheetName) {
              window.alert("No 'Fleet Cost Matrix' sheet found in this Excel file.\nAvailable sheets: " + wb.SheetNames.join(", "));
              return;
            }

            const rawRows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: "", raw: false, blankrows: false });
            function num(v) { const f = parseFloat(String(v || "").replace(/\s/g, "").replace(/,/g, ".")); return isNaN(f) ? 0 : f; }

            // Subsystem lookup: normalized Excel name → canonical project name
            const subByNorm = new Map();
            (subsystems || []).forEach(function (sub) { subByNorm.set(nk(sub), sub); });

            // Accumulate per subsystem
            const accumulated = {}; // { [canonicalSub]: { strategy, quantity, mobCapex, annualRenewalCapex, endResidual, annualFuel, annualOp } }
            let totalQuantity  = 0;

            rawRows.forEach(function (rawRow) {
              const row = {};
              Object.entries(rawRow).forEach(function (kv) { row[nk(kv[0])] = kv[1]; });

              const subsystemRaw = String(
                rawRow["Subsystem"] || rawRow["subsystem"] || rawRow["Sub System"] ||
                rawRow["System"] || row.subsystem || row.sub_system || row.system || ""
              ).trim();
              if (!subsystemRaw) return;

              const normSub  = nk(subsystemRaw);
              const isProjMgmt = normSub.indexOf("project") !== -1 && normSub.indexOf("management") !== -1;
              const subsystem = isProjMgmt ? "__project_mgmt__" : (subByNorm.get(normSub) || subsystemRaw);

              const strategy = String(
                rawRow["Strategy"] || rawRow["strategy"] || row.strategy || ""
              ).trim();

              const qty       = num(rawRow["Quantity"] || rawRow["quantity"] || row.quantity || "");
              const mobCapex  = num(rawRow["Mobilization CAPEX (EUR)"] || rawRow["Mobilization CAPEX"] || row.mobilization_capex_eur || row.mobilization_capex || "");
              const renewal   = num(rawRow["Avg Annual Renewal CAPEX (EUR)"] || rawRow["Avg Annual Renewal CAPEX"] || row.avg_annual_renewal_capex_eur || row.avg_annual_renewal_capex || "");
              const endCredit = num(rawRow["End Residual Credit (EUR)"] || rawRow["End Residual Credit"] || row.end_residual_credit_eur || row.end_residual_credit || "");
              const annFuel   = num(rawRow["Annual Fuel Cost (EUR)"] || rawRow["Annual Fuel Cost"] || row.annual_fuel_cost_eur || row.annual_fuel_cost || "");
              const annOp     = num(rawRow["Annual Operating Cost (EUR)"] || rawRow["Annual Operating Cost"] || row.annual_operating_cost_eur || row.annual_operating_cost || "");

              totalQuantity += qty;

              if (!accumulated[subsystem]) {
                accumulated[subsystem] = { strategy: strategy, quantity: 0, mobCapex: 0, annualRenewalCapex: 0, endResidualCredit: 0, annualFuelCost: 0, annualOpCost: 0 };
              }
              const acc = accumulated[subsystem];
              if (!acc.strategy && strategy) acc.strategy = strategy;
              acc.quantity          += qty;
              acc.mobCapex          += mobCapex;
              acc.annualRenewalCapex += renewal;
              acc.endResidualCredit  += endCredit;
              acc.annualFuelCost    += annFuel;
              acc.annualOpCost      += annOp;
            });

            if (!Object.keys(accumulated).length) {
              window.alert(
                "Import completed but no rows were found.\n\nCheck that:\n" +
                "• Sheet found: " + sheetName + "\n" +
                "• 'Subsystem' column is present and non-empty"
              );
              return;
            }

            // Build flat storage
            let newProjData = {};
            newProjData["__totalQuantity__"] = Math.round(totalQuantity);

            phases.forEach(function (ph) {
              Object.keys(accumulated).forEach(function (sub) {
                const acc      = accumulated[sub];
                const strategy = String(acc.strategy || "").toLowerCase();
                const isRental = strategy.indexOf("rental") !== -1;
                const prefix   = ph.key + "|" + sub + "|";

                if (isRental) {
                  newProjData[prefix + "mob|capex"] = 0;
                  newProjData[prefix + "mob|fuel"]  = 0;
                  newProjData[prefix + "mob|opex"]  = 0;
                  newProjData[prefix + "rec|capex"] = 0;
                  newProjData[prefix + "rec|fuel"]  = Math.round(acc.annualFuelCost * 100) / 100;
                  newProjData[prefix + "rec|opex"]  = Math.round((acc.annualOpCost - acc.annualFuelCost) * 100) / 100;
                  newProjData[prefix + "dem|capex"] = 0;
                  newProjData[prefix + "dem|fuel"]  = 0;
                  newProjData[prefix + "dem|opex"]  = 0;
                } else {
                  // Investment (default if not rental)
                  newProjData[prefix + "mob|capex"] = Math.round(acc.mobCapex * 100) / 100;
                  newProjData[prefix + "mob|fuel"]  = 0;
                  newProjData[prefix + "mob|opex"]  = 0;
                  newProjData[prefix + "rec|capex"] = 0;
                  newProjData[prefix + "rec|fuel"]  = Math.round(acc.annualFuelCost * 100) / 100;
                  newProjData[prefix + "rec|opex"]  = Math.round((acc.annualOpCost + acc.annualRenewalCapex - acc.annualFuelCost) * 100) / 100;
                  newProjData[prefix + "dem|capex"] = Math.round(-acc.endResidualCredit * 100) / 100;
                  newProjData[prefix + "dem|fuel"]  = 0;
                  newProjData[prefix + "dem|opex"]  = 0;
                }

                newProjData["__strategy__|" + sub] = acc.strategy || "Investment";
              });
            });
            newProjData = fillMissingImportedPhaseValues(newProjData, phases);

            const allState = readVehiclesFallbackState();
            allState[projectKey] = newProjData;
            writeVehiclesFallbackState(allState);

            renderFallbackVehiclesWorkspace();
          } catch (err) {
            console.error("Vehicles Excel import error:", err);
            window.alert("Failed to parse Excel file: " + (err.message || err));
          }
        };
        reader.readAsArrayBuffer(file);
      }

      // ─── Other Support Costs ─────────────────────────────────────────────────

      function buildOscProjects() {
        const phaseProjects = buildCombinedProjectPhaseProjects();
        return phaseProjects.filter(function (p) { return p.phases.length > 0; }).map(function (p) {
          return {
            projectKey:            p.projectKey,
            projectName:           p.projectName,
            projectType:           p.projectType,
            projectContext:        p.projectContext,
            persistedKeys:         getProjectLookupKeys(p),
            phases:                p.phases,
            mobilisationPhaseCode: p.mobilisationPhaseCode,
            recurrentCode:         p.recurrentCode,
          };
        });
      }

      function closeOscWorkspace() {
        setFallbackDetailWorkspaceActive(false);
        $("oscWorkspace")?.classList.add("hidden");
      }

      function renderFallbackOscWorkspace() {
        const workspace      = $("oscWorkspace");
        const list           = $("oscProjectList");
        const emptyEl        = $("oscWorkspaceEmpty");
        const contentEl      = $("oscWorkspaceContent");
        const statusEl       = $("oscWorkspaceStatus");
        const titleEl        = $("oscCurrentProjectTitle");
        const metaEl         = $("oscCurrentProjectMeta");
        const refBody        = $("oscRefTableBody");
        const refSection     = $("oscRefSection");
        const tableBody      = $("oscTableBody");
        const currencyRow    = $("oscCurrencyRow");
        const currencySelect = $("oscCurrencySelect");
        const currencyRateLabel = $("oscCurrencyRateLabel");
        if (!workspace) return;
        workspace.classList.remove("hidden");

        const projects = buildOscProjects();

        if (list) {
          list.innerHTML = projects.length
            ? projects.map(function (p) {
                const isActive = workspace.dataset.currentProjectKey === p.projectKey;
                return (
                  '<button type="button" data-osc-project-select="' + escapeHtml(p.projectKey) + '" ' +
                    'class="w-full text-left rounded-xl border px-3 py-2.5 text-sm transition-all ' +
                    (isActive
                      ? 'border-orange-400 bg-orange-50 text-orange-800 font-semibold shadow-sm'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50') + '">' +
                    '<div class="font-semibold truncate">' + escapeHtml(p.projectName) + '</div>' +
                    '<div class="mt-0.5 text-[11px] text-slate-400 truncate">' + escapeHtml(p.projectType || p.projectContext || "—") + '</div>' +
                  '</button>'
                );
              }).join("")
            : '<p class="text-xs text-slate-400 italic">No projects found.</p>';
        }

        if (!projects.length) {
          if (statusEl)  statusEl.textContent = "No projects available.";
          if (emptyEl)   emptyEl.classList.remove("hidden");
          if (contentEl) contentEl.classList.add("hidden");
          return;
        }

        const projectKey = workspace.dataset.currentProjectKey || projects[0].projectKey;
        const cur = projects.find(function (p) { return p.projectKey === projectKey; }) || projects[0];
        if (workspace.dataset.currentProjectKey !== cur.projectKey) {
          workspace.dataset.currentProjectKey = cur.projectKey;
        }

        if (statusEl) statusEl.textContent = cur.projectName;
        if (titleEl)  titleEl.textContent  = cur.projectName;
        if (metaEl)   metaEl.textContent   = [cur.projectType, cur.projectContext].filter(Boolean).join(" — ") || "—";

        // Currency selector
        const currencyOpts   = buildOscCurrencyOptions(cur.projectKey);
        const savedCurrency  = workspace.dataset.oscCurrency || "EUR";
        const activeCurrency = currencyOpts.find(function (o) { return o.code === savedCurrency; }) || currencyOpts[0];
        const displayRate    = (activeCurrency && activeCurrency.rate !== null) ? activeCurrency.rate : 1;

        if (currencySelect && currencyRow) {
          currencyRow.classList.remove("hidden");
          currencySelect.innerHTML = currencyOpts.map(function (o) {
            return '<option value="' + escapeHtml(o.code) + '"' + (o.code === activeCurrency.code ? " selected" : "") + '>' + escapeHtml(o.code) + '</option>';
          }).join("");
          if (currencyRateLabel) {
            currencyRateLabel.textContent = (activeCurrency.rate !== null && activeCurrency.rate !== 1)
              ? "1 EUR = " + Number(activeCurrency.rate).toFixed(4) + " " + activeCurrency.code
              : "";
          }
        }

        if (emptyEl)   emptyEl.classList.add("hidden");
        if (contentEl) contentEl.classList.remove("hidden");

        const projData   = fillMissingImportedPhaseValues(
          readPersistedFallbackProjectState(readOscFallbackState(), getProjectLookupKeys(cur)),
          cur.phases
        );
        const synthRows  = Array.isArray(projData["__synthesis_rows__"]) ? projData["__synthesis_rows__"] : [];

        // ── Bloc 1 : reference table (read-only Synthesis import) ──────────────
        if (refSection && refBody) {
          if (synthRows.length) {
            refSection.classList.remove("hidden");
            refBody.innerHTML = synthRows.map(function (row) {
              return (
                '<tr class="border-t border-slate-100">' +
                  '<td class="py-2 px-3 text-sm">' + escapeHtml(String(row.module || "—")) + '</td>' +
                  '<td class="py-2 px-3 text-sm text-slate-600">' + escapeHtml(String(row.scope || "—")) + '</td>' +
                  '<td class="py-2 px-3 text-sm text-right tabular-nums">' + escapeHtml(String(row.capex !== undefined ? row.capex : "—")) + '</td>' +
                  '<td class="py-2 px-3 text-sm text-right tabular-nums">' + escapeHtml(String(row.annual !== undefined ? row.annual : "—")) + '</td>' +
                  '<td class="py-2 px-3 text-sm text-center">' + escapeHtml(String(row.currency || "—")) + '</td>' +
                '</tr>'
              );
            }).join("");
          } else {
            refSection.classList.add("hidden");
          }
        }

        // ── Bloc 2 : Phase × Period cost table ────────────────────────────────
        function resolveCell(phaseKey, periodType, colKey) {
          const k = phaseKey + "|" + periodType + "|" + colKey;
          const eurVal = Object.prototype.hasOwnProperty.call(projData, k) ? projData[k] : 0;
          return Math.round(eurVal * displayRate * 100) / 100;
        }

        function oscCellInput(phaseKey, periodType, colKey, val) {
          return (
            '<input type="number" min="0" step="any" ' +
              'data-osc-cell ' +
              'data-project-key="' + escapeHtml(cur.projectKey) + '" ' +
              'data-phase-key="'   + escapeHtml(phaseKey)       + '" ' +
              'data-period="'      + escapeHtml(periodType)      + '" ' +
              'data-col="'         + escapeHtml(colKey)          + '" ' +
              'data-osc-rate="'    + escapeHtml(String(displayRate)) + '" ' +
              'value="' + escapeHtml(String(val)) + '" ' +
              'class="w-full min-w-[100px] rounded-lg border border-slate-200 bg-white px-2 py-1 text-center text-sm tabular-nums focus:outline-none focus:ring-1 focus:ring-orange-400">'
          );
        }

        const PHASE_PALETTE = [
          { border: "#38bdf8", bg: "#f0f9ff", dot: "#0ea5e9" },
          { border: "#34d399", bg: "#f0fdf4", dot: "#10b981" },
          { border: "#fbbf24", bg: "#fffbeb", dot: "#f59e0b" },
          { border: "#a78bfa", bg: "#f5f3ff", dot: "#8b5cf6" },
          { border: "#fb7185", bg: "#fff1f2", dot: "#f43f5e" },
          { border: "#2dd4bf", bg: "#f0fdfa", dot: "#14b8a6" },
          { border: "#93c5fd", bg: "#eff6ff", dot: "#3b82f6" },
          { border: "#86efac", bg: "#f7fef7", dot: "#22c55e" },
        ];
        function phaseCellStyle(idx) {
          const c = PHASE_PALETTE[idx % PHASE_PALETTE.length];
          return 'style="border-left:3px solid ' + c.border + ';background:' + c.bg + ';"';
        }
        function phaseDot(idx) {
          const c = PHASE_PALETTE[idx % PHASE_PALETTE.length];
          return '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:' + c.dot + ';flex-shrink:0;margin-right:2px;"></span>';
        }
        function periodBadge(type, label) {
          const cls = type === "mob"
            ? "bg-sky-50 text-sky-700 border-sky-200"
            : "bg-emerald-50 text-emerald-700 border-emerald-200";
          return '<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ' + cls + '">' + escapeHtml(label) + '</span>';
        }

        const mobCode = cur.mobilisationPhaseCode || "MOB";
        const recCode = cur.recurrentCode         || "REC";
        const PERIODS = [
          { type: "mob", label: mobCode },
          { type: "rec", label: recCode },
        ];

        const disabledInput = '<input type="number" value="0" disabled class="w-full min-w-[100px] rounded-lg border border-slate-100 bg-slate-50 px-2 py-1 text-center text-sm tabular-nums text-slate-300 cursor-not-allowed">';

        const rows = [];
        cur.phases.forEach(function (phase, phaseIdx) {
          const phaseHasWarranty = !!(phase.postWarrantyStartDate && phase.postWarrantyEndDate);
          const phaseRowspan = PERIODS.length;

          PERIODS.forEach(function (period, periodIdx) {
            const mobForced = period.type === "mob" && !phaseHasWarranty;
            let rowHtml = '<tr class="' + (periodIdx % 2 === 0 ? "" : "bg-slate-50/40") + '">';

            if (periodIdx === 0) {
              rowHtml +=
                '<td rowspan="' + phaseRowspan + '" class="py-3 pr-3 align-middle border-t border-slate-200 text-sm" ' + phaseCellStyle(phaseIdx) + '>' +
                  '<div class="inline-flex items-center gap-1.5">' +
                    phaseDot(phaseIdx) +
                    '<span class="font-bold text-slate-800">' + escapeHtml(phase.label) + '</span>' +
                  '</div>' +
                  '<div class="mt-0.5 pl-4"><span class="text-[10px] text-slate-400 font-mono">' + escapeHtml(phase.phaseCode) + '</span></div>' +
                '</td>';
            }

            rowHtml += '<td class="py-2 px-3 whitespace-nowrap border-t border-slate-100">' + periodBadge(period.type, period.label) + '</td>';

            if (mobForced) {
              rowHtml += '<td class="py-1.5 px-3 text-center border-t border-slate-100 bg-slate-50">' + disabledInput + '</td>';
              rowHtml += '<td class="py-1.5 pl-3 text-center border-t border-slate-100 bg-slate-50">' + disabledInput + '</td>';
            } else {
              const capexVal = resolveCell(phase.key, period.type, "capex");
              const opexVal  = resolveCell(phase.key, period.type, "opex");
              rowHtml += '<td class="py-1.5 px-3 text-center border-t border-slate-100">' + oscCellInput(phase.key, period.type, "capex", capexVal) + '</td>';
              rowHtml += '<td class="py-1.5 pl-3 text-center border-t border-slate-100">'  + oscCellInput(phase.key, period.type, "opex",  opexVal)  + '</td>';
            }

            rowHtml += '</tr>';
            rows.push(rowHtml);
          });
        });

        if (tableBody) {
          tableBody.innerHTML = rows.length
            ? rows.join("")
            : '<tr><td colspan="4" class="py-6 text-center text-sm text-slate-500">No phases available.</td></tr>';
        }
      }

      function importOscFromExcel(projectKey, phases, file) {
        if (!file || !projectKey) return;
        if (typeof XLSX === "undefined") { window.alert("XLSX library is not available on this page."); return; }

        function nk(s) {
          return String(s || "").trim().toLowerCase()
            .replace(/[\s/\\-]+/g, "_").replace(/[()]+/g, "").replace(/[^\w]+/g, "_")
            .replace(/^_+|_+$/g, "").replace(/_+/g, "_");
        }

        const reader = new FileReader();
        reader.onload = function (evt) {
          try {
            const data = new Uint8Array(evt.target.result);
            const wb   = XLSX.read(data, { type: "array" });

            const sheetName = wb.SheetNames.find(function (n) {
              return nk(n) === "synthesis" || nk(n).indexOf("synthesis") !== -1;
            });
            if (!sheetName) {
              window.alert("No 'Synthesis' sheet found in this Excel file.\nAvailable sheets: " + wb.SheetNames.join(", "));
              return;
            }

            const rawRows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: "", raw: false, blankrows: false });
            function num(v) { const f = parseFloat(String(v || "").replace(/\s/g, "").replace(/,/g, ".")); return isNaN(f) ? 0 : f; }

            // Build reference rows and accumulate totals
            const synthRows = [];
            let totalCapex  = 0;
            let totalAnnual = 0;

            rawRows.forEach(function (rawRow) {
              const row = {};
              Object.entries(rawRow).forEach(function (kv) { row[nk(kv[0])] = kv[1]; });

              const module   = String(rawRow["Module"]   || rawRow["module"]   || row.module   || "").trim();
              const scope    = String(rawRow["Scope"]    || rawRow["scope"]    || row.scope    || "").trim();
              const capex    = num(rawRow["Capex"]   || rawRow["capex"]   || rawRow["CAPEX"]  || row.capex  || "");
              const annual   = num(rawRow["Annual"]  || rawRow["annual"]  || rawRow["ANNUAL"] || row.annual || "");
              const currency = String(rawRow["Currency"] || rawRow["currency"] || row.currency || "").trim();

              if (!module && !scope && !capex && !annual) return;

              synthRows.push({ module: module, scope: scope, capex: capex, annual: annual, currency: currency });
              totalCapex  += capex;
              totalAnnual += annual;
            });

            if (!synthRows.length) {
              window.alert("Import completed but no rows were found.\nCheck that the 'Synthesis' sheet has Module, Scope, Capex, Annual, Currency columns.");
              return;
            }

            // Store reference rows + flat phase values (all phases get same values, EUR)
            let newProjData = { "__synthesis_rows__": synthRows };
            phases.forEach(function (ph) {
              newProjData[ph.key + "|mob|capex"] = Math.round(totalCapex  * 100) / 100;
              newProjData[ph.key + "|mob|opex"]  = 0;
              newProjData[ph.key + "|rec|capex"] = 0;
              newProjData[ph.key + "|rec|opex"]  = Math.round(totalAnnual * 100) / 100;
            });
            newProjData = fillMissingImportedPhaseValues(newProjData, phases);

            const allState = readOscFallbackState();
            allState[projectKey] = newProjData;
            writeOscFallbackState(allState);

            renderFallbackOscWorkspace();
          } catch (err) {
            console.error("Other Support Costs Excel import error:", err);
            window.alert("Failed to parse Excel file: " + (err.message || err));
          }
        };
        reader.readAsArrayBuffer(file);
      }

      // ─── Mandatory Training ───────────────────────────────────────────────────

      function buildMandatoryTrainingProjects() {
        const phaseProjects = buildCombinedProjectPhaseProjects();
        if (!phaseProjects.length) return [];

        const workloadOverrides = readWorkloadOverridesFallbackState();
        const workloadProjects  = buildFallbackWorkloadSynthesisProjects();
        const workloadByLookup = buildProjectLookupMap(workloadProjects);
        const subsystemByLookup = buildProjectLookupMap(buildFallbackSubsystemSourceProjects());

        return phaseProjects.filter(function (p) { return p.phases.length > 0; }).map(function (phaseProj) {
          const workloadContext = resolveFallbackWorkloadContext(phaseProj, workloadByLookup, subsystemByLookup, workloadOverrides);

          const ccProj = readCombinedCostCenterProject(phaseProj.projectKey, phaseProj.persistedKeys);
          const selectedPositions = Array.isArray(ccProj.selectedPositions) ? ccProj.selectedPositions : [];
          const EXCLUDED_KW = ["technician", "supervisor", "worker"];
          const whiteCollarPositions = selectedPositions.filter(function (pos) {
            const l = pos.toLowerCase();
            return !EXCLUDED_KW.some(function (kw) { return l.indexOf(kw) !== -1; });
          });
          const engPositions = whiteCollarPositions.filter(function (pos) {
            const l = pos.toLowerCase();
            return l.indexOf("engineer") !== -1 && l.indexOf("manager") === -1;
          });
          const mgrPositions = whiteCollarPositions.filter(function (pos) {
            const l = pos.toLowerCase();
            return !(l.indexOf("engineer") !== -1 && l.indexOf("manager") === -1);
          });

          return {
            projectKey:            phaseProj.projectKey,
            projectName:           phaseProj.projectName,
            projectType:           phaseProj.projectType,
            projectContext:        phaseProj.projectContext,
            persistedKeys:         workloadContext.lookupKeys,
            phases:                phaseProj.phases,
            mobilisationPhaseCode: phaseProj.mobilisationPhaseCode,
            recurrentCode:         phaseProj.recurrentCode,
            subsystems:            workloadContext.subsystems,
            workloadRows:          workloadContext.workloadRows,
            engPositions:          engPositions,
            mgrPositions:          mgrPositions,
          };
        });
      }

      const MT_DEFAULT_ROWS = [
        { id: "mt_d_0",  personnelConcerned: "POS; Track; 3rd Rail; CAT",                  legalTraining: "Electrical Habilitation B2V",               periodicity: 3, costPerPerson: 450,  costPerGroup: 3500, maxPersPerGroup: 12, currency: "EUR" },
        { id: "mt_d_1",  personnelConcerned: "PSD, AFC, DEQ, VMI, MEP",                    legalTraining: "Electrical Habilitation B1V",               periodicity: 3, costPerPerson: 350,  costPerGroup: 2500, maxPersPerGroup: 12, currency: "EUR" },
        { id: "mt_d_2",  personnelConcerned: "Management, Engineers",                      legalTraining: "Electrical Habilitation B0V / H0V",         periodicity: 3, costPerPerson: 200,  costPerGroup: 1500, maxPersPerGroup: 12, currency: "EUR" },
        { id: "mt_d_3",  personnelConcerned: "DEQ, VMI, MEP",                              legalTraining: "Forklift Driving - CACES R489",             periodicity: 5, costPerPerson: 300,  costPerGroup: 700,  maxPersPerGroup: 5,  currency: "EUR" },
        { id: "mt_d_4",  personnelConcerned: "DEQ, VMI, PSD, 3rd Rail; CAT, MEP",         legalTraining: "Working at Height - CACES R486 PEMP",       periodicity: 5, costPerPerson: 600,  costPerGroup: 2500, maxPersPerGroup: 8,  currency: "EUR" },
        { id: "mt_d_5",  personnelConcerned: "ALL",                                        legalTraining: "Railway Safety (Securite Ferroviaire)",     periodicity: 2, costPerPerson: 200,  costPerGroup: 1800, maxPersPerGroup: 10, currency: "EUR" },
        { id: "mt_d_6",  personnelConcerned: "Track, DEQ, VMI",                            legalTraining: "Railroad Vehicle Driving",                  periodicity: 5, costPerPerson: 2000, costPerGroup: 0,    maxPersPerGroup: 0,  currency: "EUR" },
        { id: "mt_d_7",  personnelConcerned: "ALL",                                        legalTraining: "First Aid - SST / PSC1",                    periodicity: 2, costPerPerson: 200,  costPerGroup: 1250, maxPersPerGroup: 10, currency: "EUR" },
        { id: "mt_d_8",  personnelConcerned: "ALL",                                        legalTraining: "Drug & Alcohol Detection - Medical Testing", periodicity: 1, costPerPerson: 188,  costPerGroup: 0,    maxPersPerGroup: 0,  currency: "EUR" },
        { id: "mt_d_9",  personnelConcerned: "ALL",                                        legalTraining: "Fire Safety & Evacuation - EPI/ERP",        periodicity: 1, costPerPerson: 120,  costPerGroup: 800,  maxPersPerGroup: 12, currency: "EUR" },
        { id: "mt_d_10", personnelConcerned: "DEQ, VMI, PSD, Track, MEP",                 legalTraining: "Chemical Risk / CMR Products",              periodicity: 3, costPerPerson: 250,  costPerGroup: 1500, maxPersPerGroup: 10, currency: "EUR" },
        { id: "mt_d_11", personnelConcerned: "Track, DEQ, VMI, 3rd Rail; CAT, PSD, MEP", legalTraining: "Manual Handling - PRAP / Gestes & Postures", periodicity: 3, costPerPerson: 200,  costPerGroup: 1200, maxPersPerGroup: 12, currency: "EUR" },
        { id: "mt_d_12", personnelConcerned: "Track, POS, DEQ, VMI",                      legalTraining: "Confined Space Entry (Espaces Confines)",   periodicity: 3, costPerPerson: 350,  costPerGroup: 2000, maxPersPerGroup: 8,  currency: "EUR" },
        { id: "mt_d_13", personnelConcerned: "Track, DEQ, POS, 3rd Rail; CAT; MEP",       legalTraining: "AIPR - Proximity to Underground Networks",  periodicity: 5, costPerPerson: 200,  costPerGroup: 1000, maxPersPerGroup: 12, currency: "EUR" },
      ];

      function cloneMandatoryTrainingRow(row) {
        return Object.assign({}, row || {});
      }

      function resolveMandatoryTrainingProjectRows(projectKey) {
        const projects = buildMandatoryTrainingProjects();
        const project = findProjectByStoredKey(projects, projectKey);
        const lookupKeys = project ? getProjectLookupKeys(project) : [projectKey];
        const state = readMandatoryTrainingFallbackState();
        const storageKey = lookupKeys.find(function (key) {
          return key && Array.isArray(state[key]);
        }) || (project ? project.projectKey : projectKey);
        const persistedRows = storageKey ? state[storageKey] : null;
        const rows = Array.isArray(persistedRows) ? persistedRows : MT_DEFAULT_ROWS;
        return {
          state: state,
          storageKey: storageKey,
          rows: rows.map(cloneMandatoryTrainingRow),
        };
      }

      function closeMandatoryTrainingWorkspace() {
        setFallbackDetailWorkspaceActive(false);
        $("mandatoryTrainingWorkspace")?.classList.add("hidden");
      }

      function renderFallbackMandatoryTrainingWorkspace() {
        const workspace      = $("mandatoryTrainingWorkspace");
        const list           = $("mtProjectList");
        const emptyEl        = $("mtWorkspaceEmpty");
        const contentEl      = $("mtWorkspaceContent");
        const statusEl       = $("mtWorkspaceStatus");
        const titleEl        = $("mtCurrentProjectTitle");
        const metaEl         = $("mtCurrentProjectMeta");
        const tableContainer = $("mtTableContainer");
        const currencyRow    = $("mtCurrencyRow");
        const currencySelect = $("mtCurrencySelect");
        const currencyRateLabel = $("mtCurrencyRateLabel");
        if (!workspace) return;
        workspace.classList.remove("hidden");

        const projects = buildMandatoryTrainingProjects();

        if (list) {
          list.innerHTML = projects.length
            ? projects.map(function (p) {
                const isActive = workspace.dataset.currentProjectKey === p.projectKey;
                return (
                  '<button type="button" data-mt-project-select="' + escapeHtml(p.projectKey) + '" ' +
                    'class="w-full text-left rounded-xl border px-3 py-2.5 text-sm transition-all ' +
                    (isActive ? 'border-orange-400 bg-orange-50 text-orange-800 font-semibold shadow-sm'
                              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50') + '">' +
                    '<div class="font-semibold truncate">' + escapeHtml(p.projectName) + '</div>' +
                    '<div class="mt-0.5 text-[11px] text-slate-400 truncate">' + escapeHtml(p.projectType || p.projectContext || "—") + '</div>' +
                  '</button>'
                );
              }).join("")
            : '<p class="text-xs text-slate-400 italic">No projects found.</p>';
        }

        if (!projects.length) {
          if (statusEl)  statusEl.textContent = "No projects available.";
          if (emptyEl)   emptyEl.classList.remove("hidden");
          if (contentEl) contentEl.classList.add("hidden");
          return;
        }

        const projectKey = workspace.dataset.currentProjectKey || projects[0].projectKey;
        const cur = projects.find(function (p) { return p.projectKey === projectKey; }) || projects[0];
        if (workspace.dataset.currentProjectKey !== cur.projectKey) workspace.dataset.currentProjectKey = cur.projectKey;

        if (statusEl) statusEl.textContent = cur.projectName;
        if (titleEl)  titleEl.textContent  = cur.projectName;
        if (metaEl)   metaEl.textContent   = [cur.projectType, cur.projectContext].filter(Boolean).join(" — ") || "—";

        // Currency selector
        const currencyOpts   = buildMtCurrencyOptions(cur.projectKey);
        const savedCurrency  = workspace.dataset.mtCurrency || "EUR";
        const activeCurrency = currencyOpts.find(function (o) { return o.code === savedCurrency; }) || currencyOpts[0];
        const displayRate    = (activeCurrency && activeCurrency.rate !== null) ? activeCurrency.rate : 1;

        if (currencySelect && currencyRow) {
          currencyRow.classList.remove("hidden");
          currencySelect.innerHTML = currencyOpts.map(function (o) {
            return '<option value="' + escapeHtml(o.code) + '"' + (o.code === activeCurrency.code ? " selected" : "") + '>' + escapeHtml(o.code) + '</option>';
          }).join("");
          if (currencyRateLabel) {
            currencyRateLabel.textContent = (activeCurrency.rate !== null && activeCurrency.rate !== 1)
              ? "1 EUR = " + Number(activeCurrency.rate).toFixed(4) + " " + activeCurrency.code : "";
          }
        }

        if (emptyEl)   emptyEl.classList.add("hidden");
        if (contentEl) contentEl.classList.remove("hidden");

        // Training rows for this project
        const projState    = readMandatoryTrainingFallbackState();
        const persistedTrainingRows = readPersistedFallbackProjectState(projState, getProjectLookupKeys(cur));
        const trainingRows = Array.isArray(persistedTrainingRows) ? persistedTrainingRows : MT_DEFAULT_ROWS;

        // White-collar overrides for headcount calculation
        const wcOverrides = readPersistedFallbackProjectState(readWhiteCollarFallbackState(), getProjectLookupKeys(cur));

        function nkMt(s) {
          return String(s || "").trim().toLowerCase()
            .replace(/[\s/_\-]+/g, "").replace(/[^\w]/g, "");
        }

        // Build wlBySub: totalTechs and totalSupervisors per subsystem
        const wlBySub = {};
        (cur.workloadRows || []).forEach(function (row) {
          const sub = String(row.subsystem || "").trim();
          if (!sub) return;
          if (!wlBySub[sub]) wlBySub[sub] = { totalTechs: 0, totalSupervisors: 0 };
          wlBySub[sub].totalTechs       += (toNumber(row.preventiveTechs) || 0) + (toNumber(row.correctiveTechs) || 0);
          wlBySub[sub].totalSupervisors += (toNumber(row.preventiveSupervisors) || 0) + (toNumber(row.correctiveSupervisors) || 0);
        });

        function resolveRate(phaseKey, subsystem, colKey, phaseHasWarranty) {
          const k = phaseKey + "|" + subsystem + "|rec|" + colKey;
          if (Object.prototype.hasOwnProperty.call(wcOverrides, k)) return wcOverrides[k];
          // Mirror defaultRate() from White Collar workspace — for Rec, rates are always 100 regardless of warranty
          if (colKey === "workerRate") return 0;
          if (colKey === "technicianRate" || colKey === "supervisorRate") return 100;
          return 0;
        }

        function resolveQtyMt(phaseKey, pos) {
          const k = "wct|" + phaseKey + "|rec|" + pos;
          return Object.prototype.hasOwnProperty.call(wcOverrides, k) ? wcOverrides[k] : 1;
        }

        function headcountForSubsystem(sub, phaseKey, phaseHasWarranty) {
          const wl = wlBySub[sub] || { totalTechs: 0, totalSupervisors: 0 };
          const techRate = resolveRate(phaseKey, sub, "technicianRate", phaseHasWarranty) / 100;
          const wkrRate  = resolveRate(phaseKey, sub, "workerRate",     phaseHasWarranty) / 100;
          const supRate  = resolveRate(phaseKey, sub, "supervisorRate", phaseHasWarranty) / 100;
          return wl.totalTechs * (techRate + wkrRate) + wl.totalSupervisors * supRate;
        }

        function computeWorkload(personnelConcerned, phaseKey, phaseHasWarranty) {
          // Split on both ";" and "," as the Excel uses both interchangeably
          const entries = String(personnelConcerned || "").split(/[;,]/).map(function (s) { return s.trim(); }).filter(Boolean);
          if (!entries.length) return 0;

          const isAll = entries.some(function (e) { return e.toLowerCase() === "all"; });
          if (isAll) {
            let total = 0;
            cur.subsystems.forEach(function (sub) { total += headcountForSubsystem(sub, phaseKey, phaseHasWarranty); });
            cur.engPositions.forEach(function (pos) { total += resolveQtyMt(phaseKey, pos); });
            cur.mgrPositions.forEach(function (pos) { total += resolveQtyMt(phaseKey, pos); });
            return Math.round(total * 10) / 10;
          }

          let total = 0;
          const addedSubs = new Set();
          entries.forEach(function (entry) {
            const normEntry = nkMt(entry);
            const lEntry    = entry.toLowerCase();

            // White-collar: "Engineers" → eng positions, "Management"/"Managers" → mgr positions
            if (lEntry.indexOf("engineer") !== -1) {
              cur.engPositions.forEach(function (pos) { total += resolveQtyMt(phaseKey, pos, phaseHasWarranty); });
              return;
            }
            if (lEntry.indexOf("management") !== -1 || lEntry.indexOf("manager") !== -1) {
              cur.mgrPositions.forEach(function (pos) { total += resolveQtyMt(phaseKey, pos, phaseHasWarranty); });
              return;
            }

            // Blue-collar: match against project subsystem names
            cur.subsystems.forEach(function (sub) {
              if (addedSubs.has(sub)) return;
              if (nkMt(sub) === normEntry || nkMt(sub).indexOf(normEntry) !== -1 || normEntry.indexOf(nkMt(sub)) !== -1) {
                total += headcountForSubsystem(sub, phaseKey, phaseHasWarranty);
                addedSubs.add(sub);
              }
            });
          });
          return Math.round(total * 10) / 10;
        }

        function computeYearlyCost(row, workload) {
          const C = toNumber(row.periodicity)    || 0;
          const D = toNumber(row.costPerPerson)  || 0;
          const E = toNumber(row.costPerGroup)   || 0;
          const F = toNumber(row.maxPersPerGroup) || 0;
          const G = workload;
          if (!C) return 0;
          if (E > 0 && F > 0) {
            const full      = Math.floor(G / F);
            const remaining = G - full * F;
            const costCycle = full * E + (remaining > 0 ? Math.min(remaining * D, E) : 0);
            return Math.round(costCycle / C * 100) / 100;
          }
          return Math.round(G * D / C * 100) / 100;
        }

        function computeSessions(row, workload) {
          const F = toNumber(row.maxPersPerGroup) || 0;
          if (!F) return null;
          return Math.ceil(workload / F);
        }

        // Phase colour palette
        const PHASE_PALETTE = [
          { border: "#38bdf8", bg: "#f0f9ff", dot: "#0ea5e9" },
          { border: "#34d399", bg: "#f0fdf4", dot: "#10b981" },
          { border: "#fbbf24", bg: "#fffbeb", dot: "#f59e0b" },
          { border: "#a78bfa", bg: "#f5f3ff", dot: "#8b5cf6" },
          { border: "#fb7185", bg: "#fff1f2", dot: "#f43f5e" },
          { border: "#2dd4bf", bg: "#f0fdfa", dot: "#14b8a6" },
          { border: "#93c5fd", bg: "#eff6ff", dot: "#3b82f6" },
          { border: "#86efac", bg: "#f7fef7", dot: "#22c55e" },
        ];
        function phaseBorderStyle(idx) {
          const c = PHASE_PALETTE[idx % PHASE_PALETTE.length];
          return 'border-left:3px solid ' + c.border + ';';
        }
        function phaseDotHtml(idx) {
          const c = PHASE_PALETTE[idx % PHASE_PALETTE.length];
          return '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:' + c.dot + ';flex-shrink:0;margin-right:4px;"></span>';
        }

        function numCell(v, extraClass) {
          const rounded = Math.round(v * 100) / 100;
          const disp = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2).replace(/\.?0+$/, "");
          return '<span class="tabular-nums font-semibold ' + (extraClass || "") + '">' + disp + '</span>';
        }

        function editableCell(rowId, field, val, type) {
          const isNum = type === "number";
          return '<input type="' + (isNum ? "number" : "text") + '" ' +
            (isNum ? 'min="0" step="any" ' : '') +
            'data-mt-cell data-project-key="' + escapeHtml(cur.projectKey) + '" ' +
            'data-row-id="' + escapeHtml(rowId) + '" ' +
            'data-field="' + escapeHtml(field) + '" ' +
            'value="' + escapeHtml(String(val !== null && val !== undefined ? val : "")) + '" ' +
            'class="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm ' +
            (isNum ? 'text-center tabular-nums min-w-[70px]' : 'min-w-[120px]') +
            ' focus:outline-none focus:ring-1 focus:ring-orange-400">';
        }

        // Build HTML
        let html = "";

        cur.phases.forEach(function (phase, phaseIdx) {
          const phaseHasWarranty = !!(phase.postWarrantyStartDate && phase.postWarrantyEndDate);
          const recLabel = cur.recurrentCode || "REC";

          html +=
            '<div class="rounded-2xl border border-slate-200 bg-white overflow-hidden">' +
              '<div class="flex items-center gap-2 px-5 py-3 border-b border-slate-100" style="' + phaseBorderStyle(phaseIdx) + '">' +
                phaseDotHtml(phaseIdx) +
                '<span class="font-bold text-slate-800">' + escapeHtml(phase.label) + '</span>' +
                '<span class="ml-2 text-[10px] text-slate-400 font-mono">' + escapeHtml(phase.phaseCode) + '</span>' +
                '<span class="ml-auto inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border bg-emerald-50 text-emerald-700 border-emerald-200">' + escapeHtml(recLabel) + ' only</span>' +
              '</div>' +
              '<div class="overflow-x-auto custom-scrollbar">' +
                '<table class="min-w-full text-sm">' +
                  '<thead class="text-[10px] uppercase tracking-wider text-slate-400 bg-slate-50">' +
                    '<tr class="border-b border-slate-200">' +
                      '<th class="text-left py-2 px-3 whitespace-nowrap">Personnel Concerned</th>' +
                      '<th class="text-left py-2 px-3 whitespace-nowrap min-w-[200px]">Legal Training</th>' +
                      '<th class="text-center py-2 px-3 whitespace-nowrap">Periodicity<br><span class="normal-case text-slate-300">(Years)</span></th>' +
                      '<th class="text-center py-2 px-3 whitespace-nowrap">Cost/Person<br><span class="normal-case text-slate-300">(€ HT)</span></th>' +
                      '<th class="text-center py-2 px-3 whitespace-nowrap">Cost/Group<br><span class="normal-case text-slate-300">(€ HT)</span></th>' +
                      '<th class="text-center py-2 px-3 whitespace-nowrap">Max/Group</th>' +
                      '<th class="text-center py-2 px-3 whitespace-nowrap">Workload<br><span class="normal-case text-slate-300">(Persons)</span></th>' +
                      '<th class="text-center py-2 px-3 whitespace-nowrap">Sessions/<br>Cycle</th>' +
                      '<th class="text-center py-2 px-3 whitespace-nowrap">Yearly Cost<br><span class="normal-case text-slate-300">(HT)</span></th>' +
                      '<th class="text-center py-2 px-3 whitespace-nowrap">Currency</th>' +
                      '<th class="py-2 px-3"></th>' +
                    '</tr>' +
                  '</thead>' +
                  '<tbody class="divide-y divide-slate-100">';

          if (!trainingRows.length) {
            html += '<tr><td colspan="11" class="py-4 px-3 text-sm text-slate-400 italic text-center">No training rows. Import from Excel or add a row.</td></tr>';
          } else {
            trainingRows.forEach(function (row, rowIdx) {
              const workload     = computeWorkload(row.personnelConcerned, phase.key, phaseHasWarranty);
              const sessions     = computeSessions(row, workload);
              const yearlyCostEur = computeYearlyCost(row, workload);
              const yearlyCostDisp = Math.round(yearlyCostEur * displayRate * 100) / 100;
              const bgClass = rowIdx % 2 === 0 ? "" : "bg-slate-50/40";

              html +=
                '<tr class="' + bgClass + '">' +
                  '<td class="py-1.5 px-3">' + editableCell(row.id, "personnelConcerned", row.personnelConcerned, "text") + '</td>' +
                  '<td class="py-1.5 px-3">' + editableCell(row.id, "legalTraining",      row.legalTraining,      "text") + '</td>' +
                  '<td class="py-1.5 px-3">' + editableCell(row.id, "periodicity",         row.periodicity,        "number") + '</td>' +
                  '<td class="py-1.5 px-3">' + editableCell(row.id, "costPerPerson",       row.costPerPerson,      "number") + '</td>' +
                  '<td class="py-1.5 px-3">' + editableCell(row.id, "costPerGroup",        row.costPerGroup,       "number") + '</td>' +
                  '<td class="py-1.5 px-3">' + editableCell(row.id, "maxPersPerGroup",     row.maxPersPerGroup,    "number") + '</td>' +
                  '<td class="py-1.5 px-3 text-center">' + numCell(workload, "text-slate-700") + '</td>' +
                  '<td class="py-1.5 px-3 text-center">' + (sessions !== null ? numCell(sessions, "text-slate-700") : '<span class="text-slate-300">—</span>') + '</td>' +
                  '<td class="py-1.5 px-3 text-center">' + numCell(yearlyCostDisp, "text-orange-700") + '</td>' +
                  '<td class="py-1.5 px-3">' + editableCell(row.id, "currency", row.currency, "text") + '</td>' +
                  '<td class="py-1.5 px-3 text-center">' +
                    '<button type="button" data-mt-delete-row data-project-key="' + escapeHtml(cur.projectKey) + '" data-row-id="' + escapeHtml(row.id) + '" ' +
                      'class="inline-flex items-center justify-center size-7 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-colors">' +
                      '<span class="material-symbols-outlined text-[16px]">delete</span>' +
                    '</button>' +
                  '</td>' +
                '</tr>';
            });
          }

          html +=
                  '</tbody>' +
                '</table>' +
              '</div>' +
              '<div class="px-5 py-3 border-t border-slate-100 flex items-center justify-between gap-3">' +
                '<button type="button" data-mt-add-row data-project-key="' + escapeHtml(cur.projectKey) + '" ' +
                  'class="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-dashed border-slate-300 text-sm text-slate-500 hover:border-orange-400 hover:text-orange-600 hover:bg-orange-50 transition-all">' +
                  '<span class="material-symbols-outlined text-[16px]">add</span>Add row' +
                '</button>' +
                (trainingRows.length
                  ? '<span class="text-xs text-slate-400">' + trainingRows.length + ' training(s) · Yearly total: <strong class="text-orange-700">' +
                      numCell(trainingRows.reduce(function (acc, row) {
                        return acc + computeYearlyCost(row, computeWorkload(row.personnelConcerned, phase.key, phaseHasWarranty)) * displayRate;
                      }, 0), "") +
                    ' ' + escapeHtml(activeCurrency.code) + '</strong></span>'
                  : ''
                ) +
              '</div>' +
            '</div>';
        });

        if (tableContainer) {
          tableContainer.innerHTML = html || '<p class="text-sm text-slate-400 italic">No phases available.</p>';
        }
      }

      function importMandatoryTrainingFromExcel(projectKey, file) {
        if (!file || !projectKey) return;
        if (typeof XLSX === "undefined") { window.alert("XLSX library is not available on this page."); return; }

        function nk(s) {
          return String(s || "").trim().toLowerCase()
            .replace(/[\s/\\-]+/g, "_").replace(/[()]+/g, "").replace(/[^\w]+/g, "_")
            .replace(/^_+|_+$/g, "").replace(/_+/g, "_");
        }

        const reader = new FileReader();
        reader.onload = function (evt) {
          try {
            const data = new Uint8Array(evt.target.result);
            const wb   = XLSX.read(data, { type: "array" });

            const sheetName = wb.SheetNames[0];
            const rawRows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: "", raw: false, blankrows: false });
            function num(v) { const f = parseFloat(String(v || "").replace(/\s/g, "").replace(/,/g, ".")); return isNaN(f) ? 0 : f; }

            const newRows = [];
            rawRows.forEach(function (rawRow) {
              const row = {};
              Object.entries(rawRow).forEach(function (kv) { row[nk(kv[0])] = kv[1]; });

              const personnelConcerned = String(
                rawRow["Personnel\nConcerned"] || rawRow["Personnel Concerned"] || rawRow["personnel_concerned"] ||
                row.personnel_concerned || row.personnel || ""
              ).trim();
              const legalTraining = String(
                rawRow["Legal Training"] || rawRow["legal_training"] || row.legal_training || row.training || ""
              ).trim();
              const periodicity    = num(rawRow["Periodicity\n(Years)"] || rawRow["Periodicity (Years)"] || rawRow["Periodicity"] || row.periodicity_years || row.periodicity || "");
              const costPerPerson  = num(rawRow["Cost / Person\n(€ HT)"] || rawRow["Cost / Person (€ HT)"] || rawRow["Cost / Person"] || row.cost_person_eur_ht || row.cost_person || "");
              const costPerGroup   = num(rawRow["Cost / Group\n(€ HT)"] || rawRow["Cost / Group (€ HT)"] || rawRow["Cost / Group"] || row.cost_group_eur_ht || row.cost_group || "");
              const maxPersPerGroup = num(rawRow["Max Pers.\n/ Group"] || rawRow["Max Pers. / Group"] || rawRow["Max Pers./Group"] || row.max_pers_group || row.max_pers || "");
              const currency       = String(rawRow["Currency"] || rawRow["currency"] || row.currency || "EUR").trim();

              if (!legalTraining) return;

              newRows.push({
                id:               "mt_" + Date.now() + "_" + newRows.length,
                personnelConcerned: personnelConcerned,
                legalTraining:    legalTraining,
                periodicity:      periodicity,
                costPerPerson:    costPerPerson,
                costPerGroup:     costPerGroup,
                maxPersPerGroup:  maxPersPerGroup,
                currency:         currency,
              });
            });

            if (!newRows.length) {
              window.alert("No training rows found. Check that the file has Legal Training column.");
              return;
            }

            const allState = readMandatoryTrainingFallbackState();
            allState[projectKey] = newRows;
            writeMandatoryTrainingFallbackState(allState);
            renderFallbackMandatoryTrainingWorkspace();
          } catch (err) {
            console.error("Mandatory Training Excel import error:", err);
            window.alert("Failed to parse Excel file: " + (err.message || err));
          }
        };
        reader.readAsArrayBuffer(file);
      }

      function closeWhiteCollarDefinitionWorkspace() {
        setFallbackDetailWorkspaceActive(false);
        $("whiteCollarDefinitionWorkspace")?.classList.add("hidden");
      }

      function closeWbsWorkspace() {
        setFallbackDetailWorkspaceActive(false);
        $("wbsWorkspace")?.classList.add("hidden");
      }

      function renderFallbackWhiteCollarWorkspace() {
        const workspace   = $("whiteCollarDefinitionWorkspace");
        const list        = $("whiteCollarProjectList");
        const emptyEl     = $("whiteCollarWorkspaceEmpty");
        const contentEl   = $("whiteCollarWorkspaceContent");
        const statusEl    = $("whiteCollarWorkspaceStatus");
        const titleEl     = $("whiteCollarCurrentProjectTitle");
        const metaEl      = $("whiteCollarCurrentProjectMeta");
        const missingEl   = $("whiteCollarMissingData");
        const tableBody   = $("whiteCollarTableBody");
        if (!workspace || !list || !emptyEl || !contentEl || !statusEl || !titleEl || !metaEl || !missingEl || !tableBody) return;

        const projects = buildWhiteCollarProjects();
        const currentKey = workspace.dataset.currentProjectKey && projects.some(function (p) { return p.projectKey === workspace.dataset.currentProjectKey; })
          ? workspace.dataset.currentProjectKey
          : (projects[0] ? projects[0].projectKey : "");
        const cur = projects.find(function (p) { return p.projectKey === currentKey; }) || null;

        workspace.classList.remove("hidden");
        statusEl.textContent = projects.length ? projects.length + " project(s) available" : "No project available.";

        // project list
        list.innerHTML = projects.map(function (p) {
          const active = cur && p.projectKey === cur.projectKey;
          return (
            '<button type="button" data-wc-project-select="' + escapeHtml(p.projectKey) + '" class="w-full rounded-xl border px-3 py-3 text-left transition-all ' +
              (active ? "border-violet-300 bg-violet-50 shadow-sm ring-1 ring-violet-200" : "border-slate-200 bg-white hover:bg-slate-100") + '">' +
              '<div class="text-sm font-semibold text-slate-900">' + escapeHtml(p.projectName) + '</div>' +
              '<div class="mt-1 flex items-center gap-1.5">' +
                '<span class="text-[10px] font-bold px-1.5 py-0.5 rounded-full ' + (p.hasPhases ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-400 border border-slate-200") + '">PH</span>' +
                '<span class="text-[10px] font-bold px-1.5 py-0.5 rounded-full ' + (p.hasSubsystems ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-400 border border-slate-200") + '">SYS</span>' +
              '</div>' +
            '</button>'
          );
        }).join("");

        if (!cur) {
          emptyEl.classList.remove("hidden");
          contentEl.classList.add("hidden");
          return;
        }

        workspace.dataset.currentProjectKey = cur.projectKey;
        emptyEl.classList.add("hidden");
        contentEl.classList.remove("hidden");
        titleEl.textContent = cur.projectName;
        metaEl.textContent  = (cur.projectType || "No project type") + " | " + (cur.projectContext || "No context");

        // missing data warnings
        const missingParts = [];
        if (!cur.hasPhases)     missingParts.push('<div class="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"><span class="material-symbols-outlined text-[18px] text-amber-500 shrink-0">info</span>No phases found. Configure Phase Timeline in <strong>Project Phases Workspace</strong>.</div>');
        if (!cur.hasSubsystems) missingParts.push('<div class="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"><span class="material-symbols-outlined text-[18px] text-amber-500 shrink-0">info</span>No subsystems found. Fill the Workload Table in <strong>Workload Synthesis Workspace</strong>.</div>');
        if (missingParts.length) {
          missingEl.classList.remove("hidden");
          missingEl.innerHTML = missingParts.join("");
        } else {
          missingEl.classList.add("hidden");
          missingEl.innerHTML = "";
        }

        // period codes
        const mobCode = cur.mobilisationPhaseCode || "MOB";
        const recCode = cur.recurrentCode         || "REC";
        const demCode = cur.demobilisationCode    || "DEM";
        const PERIODS = [
          { type: "mob", label: mobCode },
          { type: "rec", label: recCode },
          { type: "dem", label: demCode },
        ];

        // Phase colour palette — border / cell-bg / dot
        const PHASE_PALETTE = [
          { border: "#38bdf8", bg: "#f0f9ff", dot: "#0ea5e9" },  // sky
          { border: "#34d399", bg: "#f0fdf4", dot: "#10b981" },  // emerald
          { border: "#fbbf24", bg: "#fffbeb", dot: "#f59e0b" },  // amber
          { border: "#a78bfa", bg: "#f5f3ff", dot: "#8b5cf6" },  // violet
          { border: "#fb7185", bg: "#fff1f2", dot: "#f43f5e" },  // rose
          { border: "#2dd4bf", bg: "#f0fdfa", dot: "#14b8a6" },  // teal
          { border: "#93c5fd", bg: "#eff6ff", dot: "#3b82f6" },  // blue
          { border: "#86efac", bg: "#f7fef7", dot: "#22c55e" },  // green
        ];
        function phaseColor(phaseIdx) {
          return PHASE_PALETTE[phaseIdx % PHASE_PALETTE.length];
        }
        function phaseCellStyle(phaseIdx) {
          const c = phaseColor(phaseIdx);
          return 'style="border-left: 3px solid ' + c.border + '; background: ' + c.bg + ';"';
        }
        function phaseDot(phaseIdx) {
          const c = phaseColor(phaseIdx);
          return '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:' + c.dot + ';flex-shrink:0;margin-right:2px;"></span>';
        }

        // rate columns
        const RATE_COLS = [
          { key: "supervisorRate",   label: "Supervisor" },
          { key: "technicianRate",   label: "Technician" },
          { key: "workerRate",       label: "Worker" },
          { key: "engineerRate",     label: "Engineer" },
          { key: "managerRate",      label: "Manager" },
          { key: "materialRate",     label: "Material" },
          { key: "subcontractRate",  label: "Subcontract" },
        ];

        // Values stored and displayed as percentages (0–100)
        function defaultRate(col, periodType, phaseHasWarranty) {
          if (col === "workerRate") return 0;
          if (col === "materialRate" || col === "subcontractRate") {
            return periodType === "rec" ? 100 : 0;
          }
          if (periodType === "mob") return phaseHasWarranty ? 100 : 0;
          if (periodType === "rec") return 100;
          return 0; // dem
        }

        const projOverrides = readPersistedFallbackProjectState(readWhiteCollarFallbackState(), getProjectLookupKeys(cur));

        function resolveRateWithWarranty(phaseKey, subsystem, periodType, col, phaseHasWarranty) {
          const k = phaseKey + "|" + subsystem + "|" + periodType + "|" + col;
          return Object.prototype.hasOwnProperty.call(projOverrides, k)
            ? projOverrides[k]
            : defaultRate(col, periodType, phaseHasWarranty);
        }

        function rateInput(phaseKey, subsystem, periodType, col, val) {
          return (
            '<div class="flex items-center gap-0.5">' +
              '<input type="number" min="0" max="100" step="any" ' +
                'data-wc-cell ' +
                'data-project-key="' + escapeHtml(cur.projectKey) + '" ' +
                'data-phase-key="'   + escapeHtml(phaseKey)        + '" ' +
                'data-subsystem="'   + escapeHtml(subsystem)        + '" ' +
                'data-period="'      + escapeHtml(periodType)       + '" ' +
                'data-col="'         + escapeHtml(col)              + '" ' +
                'value="' + escapeHtml(String(val)) + '" ' +
                'class="w-full min-w-[60px] rounded-lg border border-slate-200 bg-white px-1.5 py-1 text-center text-sm tabular-nums focus:outline-none focus:ring-1 focus:ring-violet-400">' +
              '<span class="text-[11px] text-slate-400 shrink-0">%</span>' +
            '</div>'
          );
        }

        function periodBadge(period) {
          const cls = period.type === "mob"
            ? "bg-sky-50 text-sky-700 border-sky-200"
            : period.type === "rec"
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : "bg-slate-100 text-slate-500 border-slate-200";
          return '<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ' + cls + '">' + escapeHtml(period.label) + '</span>';
        }

        // Collapsed phases — stored as JSON array in workspace dataset
        let collapsedPhases;
        try { collapsedPhases = new Set(JSON.parse(workspace.dataset.wcCollapsed || "[]")); } catch (_e) { collapsedPhases = new Set(); }

        const rows = [];

        cur.phases.forEach(function (phase, phaseIdx) {
          const phaseHasWarranty = !!(phase.postWarrantyStartDate && phase.postWarrantyEndDate);
          const subsystems = cur.subsystems.length ? cur.subsystems : [];
          const isCollapsed = collapsedPhases.has(phase.key);

          // ── Phase header / toggle row ────────────────────────────────────
          const phaseToggleBtn =
            '<button type="button" data-wc-phase-toggle="' + escapeHtml(phase.key) + '" ' +
              'class="inline-flex items-center gap-1.5 group w-full text-left">' +
              '<span class="material-symbols-outlined text-[16px] text-slate-400 group-hover:text-violet-600 transition-colors shrink-0" ' +
                'style="transition:transform .15s;' + (isCollapsed ? "" : "transform:rotate(90deg)") + '">' +
                'chevron_right' +
              '</span>' +
              phaseDot(phaseIdx) +
              '<span class="font-bold text-slate-800 group-hover:text-violet-700 transition-colors">' + escapeHtml(phase.label) + '</span>' +
            '</button>' +
            '<div class="mt-0.5 flex items-center gap-1.5 pl-6">' +
              '<span class="text-[10px] text-slate-400 font-mono">' + escapeHtml(phase.phaseCode) + '</span>' +
              (phaseHasWarranty ? '<span class="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200 font-bold">PW</span>' : '') +
              (isCollapsed && subsystems.length ? '<span class="text-[10px] text-slate-400">' + subsystems.length + ' subsystem(s) hidden</span>' : '') +
            '</div>';

          if (!subsystems.length) {
            rows.push(
              '<tr class="border-t border-slate-200 bg-slate-50/60">' +
                '<td class="py-3 pr-3 align-top text-sm" ' + phaseCellStyle(phaseIdx) + '>' + phaseToggleBtn + '</td>' +
                '<td colspan="9" class="py-3 px-3 text-sm text-slate-400 italic">No subsystems defined.</td>' +
              '</tr>'
            );
            return;
          }

          if (isCollapsed) {
            rows.push(
              '<tr class="border-t border-slate-200 bg-slate-50/60">' +
                '<td colspan="10" class="py-2.5 px-3 text-sm" ' + phaseCellStyle(phaseIdx) + '>' + phaseToggleBtn + '</td>' +
              '</tr>'
            );
            return;
          }

          // ── Expanded rows ────────────────────────────────────────────────
          const phaseRowspan = subsystems.length * PERIODS.length;

          subsystems.forEach(function (subsystem, subIdx) {
            PERIODS.forEach(function (period, periodIdx) {
              let rowHtml = '<tr class="' + (subIdx % 2 === 0 ? "" : "bg-slate-50/40") + '">';

              // Phase cell — only on the very first row of this phase
              if (subIdx === 0 && periodIdx === 0) {
                rowHtml +=
                  '<td rowspan="' + phaseRowspan + '" class="py-3 pr-3 align-top border-t border-slate-200 text-sm" ' + phaseCellStyle(phaseIdx) + '>' +
                    phaseToggleBtn +
                  '</td>';
              }

              // Subsystem cell — only on the first period row of this subsystem
              if (periodIdx === 0) {
                rowHtml +=
                  '<td rowspan="' + PERIODS.length + '" class="py-2 px-3 align-middle ' + (subIdx === 0 ? "border-t border-slate-200" : "") + ' font-medium text-sm whitespace-nowrap">' +
                    escapeHtml(subsystem) +
                  '</td>';
              }

              // Period badge
              rowHtml += '<td class="py-2 px-3 whitespace-nowrap">' + periodBadge(period) + '</td>';

              // Rate cells
              RATE_COLS.forEach(function (col, colIdx) {
                const val = resolveRateWithWarranty(phase.key, subsystem, period.type, col.key, phaseHasWarranty);
                const isLast = colIdx === RATE_COLS.length - 1;
                rowHtml += '<td class="py-1.5 ' + (isLast ? "pl-3" : "px-3") + ' text-center">' +
                  rateInput(phase.key, subsystem, period.type, col.key, val) +
                '</td>';
              });

              rowHtml += '</tr>';
              rows.push(rowHtml);
            });
          });
        });

        tableBody.innerHTML = rows.length
          ? rows.join("")
          : '<tr><td colspan="10" class="py-6 text-center text-sm text-slate-500">No data available.</td></tr>';

        // ── White Collar Table (positions) ────────────────────────────────
        const posTableBody = $("whiteCollarPositionsTableBody");
        if (!posTableBody) return;

        const positions = cur.whiteCollarPositions || [];

        if (!positions.length) {
          posTableBody.innerHTML =
            '<tr><td colspan="4" class="py-6 text-center text-sm text-slate-500">' +
              'No white-collar positions defined. Add positions in <strong>Cost Centers Workspace</strong> ' +
              '(excluding Technician, Supervisor, Worker).' +
            '</td></tr>';
        }

        // Collapsed phases for positions table (shared with optimization table)
        let collapsedPosPhases;
        try { collapsedPosPhases = new Set(JSON.parse(workspace.dataset.wcCollapsed || "[]")); } catch (_e) { collapsedPosPhases = new Set(); }

        function defaultQty(periodType, phaseHasWarranty) {
          if (periodType === "mob") return phaseHasWarranty ? 1 : 0;
          if (periodType === "rec") return 1;
          return 0; // dem
        }

        function resolveQty(phaseKey, periodType, position, phaseHasWarranty) {
          const k = "wct|" + phaseKey + "|" + periodType + "|" + position;
          return Object.prototype.hasOwnProperty.call(projOverrides, k)
            ? projOverrides[k]
            : defaultQty(periodType, phaseHasWarranty);
        }

        function qtyInput(phaseKey, periodType, position, val) {
          return '<input type="number" min="0" step="any" ' +
            'data-wct-cell ' +
            'data-project-key="' + escapeHtml(cur.projectKey) + '" ' +
            'data-phase-key="'   + escapeHtml(phaseKey)       + '" ' +
            'data-period="'      + escapeHtml(periodType)      + '" ' +
            'data-position="'    + escapeHtml(position)         + '" ' +
            'value="' + escapeHtml(String(val)) + '" ' +
            'class="w-full min-w-[60px] rounded-lg border border-slate-200 bg-white px-2 py-1 text-center text-sm tabular-nums focus:outline-none focus:ring-1 focus:ring-violet-400">';
        }

        const posRows = [];

        cur.phases.forEach(function (phase, phaseIdx) {
          const phaseHasWarranty = !!(phase.postWarrantyStartDate && phase.postWarrantyEndDate);
          const isCollapsed = collapsedPosPhases.has(phase.key);

          // Phase toggle button (same style as optimization table)
          const posPhaseToggleBtn =
            '<button type="button" data-wc-phase-toggle="' + escapeHtml(phase.key) + '" ' +
              'class="inline-flex items-center gap-1.5 group w-full text-left">' +
              '<span class="material-symbols-outlined text-[16px] text-slate-400 group-hover:text-violet-600 transition-colors shrink-0" ' +
                'style="transition:transform .15s;' + (isCollapsed ? "" : "transform:rotate(90deg)") + '">' +
                'chevron_right' +
              '</span>' +
              phaseDot(phaseIdx) +
              '<span class="font-bold text-slate-800 group-hover:text-violet-700 transition-colors">' + escapeHtml(phase.label) + '</span>' +
            '</button>' +
            '<div class="mt-0.5 flex items-center gap-1.5 pl-6">' +
              '<span class="text-[10px] text-slate-400 font-mono">' + escapeHtml(phase.phaseCode) + '</span>' +
              (phaseHasWarranty ? '<span class="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200 font-bold">PW</span>' : '') +
              (isCollapsed && positions.length ? '<span class="text-[10px] text-slate-400">' + positions.length + ' position(s) hidden</span>' : '') +
            '</div>';

          if (isCollapsed) {
            posRows.push(
              '<tr class="border-t border-slate-200 bg-slate-50/60">' +
                '<td colspan="4" class="py-2.5 px-3 text-sm" ' + phaseCellStyle(phaseIdx) + '>' + posPhaseToggleBtn + '</td>' +
              '</tr>'
            );
            return;
          }

          const phaseRowspan = PERIODS.length * positions.length;

          PERIODS.forEach(function (period, periodIdx) {
            positions.forEach(function (position, posIdx) {
              let rowHtml = '<tr class="' + (posIdx % 2 === 0 ? "" : "bg-slate-50/40") + '">';

              // Phase cell — first row only
              if (periodIdx === 0 && posIdx === 0) {
                rowHtml +=
                  '<td rowspan="' + phaseRowspan + '" class="py-3 pr-3 align-top border-t border-slate-200 text-sm" ' + phaseCellStyle(phaseIdx) + '>' +
                    posPhaseToggleBtn +
                  '</td>';
              }

              // Period cell — first position of each period
              if (posIdx === 0) {
                rowHtml +=
                  '<td rowspan="' + positions.length + '" class="py-2 px-3 align-middle ' + (periodIdx === 0 ? "border-t border-slate-200" : "") + ' whitespace-nowrap">' +
                    periodBadge(period) +
                  '</td>';
              }

              // Position name
              rowHtml += '<td class="py-1.5 px-3 text-sm font-medium">' + escapeHtml(position) + '</td>';

              // Quantity input
              const qty = resolveQty(phase.key, period.type, position, phaseHasWarranty);
              rowHtml += '<td class="py-1.5 pl-3 text-center">' + qtyInput(phase.key, period.type, position, qty) + '</td>';

              rowHtml += '</tr>';
              posRows.push(rowHtml);
            });
          });
        });

        posTableBody.innerHTML = posRows.length
          ? posRows.join("")
          : '<tr><td colspan="4" class="py-6 text-center text-sm text-slate-500">No white-collar positions defined. Add positions in <strong>Cost Centers Workspace</strong> (excluding Technician, Supervisor, Worker).</td></tr>';

        // ── Headcount Summary Table ────────────────────────────────────────────
        const hcTableBody = $("headcountSummaryTableBody");
        if (!hcTableBody) return;

        // Aggregate workload by subsystem
        const wlBySub = {};
        (cur.workloadRows || []).forEach(function (row) {
          const sub = String(row.subsystem || "").trim();
          if (!sub) return;
          if (!wlBySub[sub]) wlBySub[sub] = { totalTechs: 0, totalSupervisors: 0 };
          wlBySub[sub].totalTechs       += (toNumber(row.preventiveTechs)       || 0) + (toNumber(row.correctiveTechs)       || 0);
          wlBySub[sub].totalSupervisors += (toNumber(row.preventiveSupervisors) || 0) + (toNumber(row.correctiveSupervisors) || 0);
        });

        // Classify white-collar positions: Engineer vs Manager
        const engPositions = (cur.whiteCollarPositions || []).filter(function (pos) {
          const l = pos.toLowerCase();
          return l.indexOf("engineer") !== -1 && l.indexOf("manager") === -1;
        });
        const mgrPositions = (cur.whiteCollarPositions || []).filter(function (pos) {
          const l = pos.toLowerCase();
          return !(l.indexOf("engineer") !== -1 && l.indexOf("manager") === -1);
        });

        function hcNumCell(v, extraCls) {
          const s = v.toFixed(1);
          const disp = s.endsWith('.0') ? String(Math.round(v)) : s;
          return '<td class="py-2 px-3 text-center tabular-nums ' + (extraCls || "") + '">' +
            (v > 0
              ? '<span class="font-semibold">' + disp + '</span>'
              : '<span class="text-slate-300">—</span>') +
          '</td>';
        }

        const hcRows = [];

        cur.phases.forEach(function (phase, phaseIdx) {
          const phaseHasWarranty = !!(phase.postWarrantyStartDate && phase.postWarrantyEndDate);
          const subs = cur.subsystems;
          const isCollapsed = collapsedPhases.has(phase.key);

          const hcPhaseToggleBtn =
            '<button type="button" data-wc-phase-toggle="' + escapeHtml(phase.key) + '" ' +
              'class="inline-flex items-center gap-1.5 group w-full text-left">' +
              '<span class="material-symbols-outlined text-[16px] text-slate-400 group-hover:text-violet-600 transition-colors shrink-0" ' +
                'style="transition:transform .15s;' + (isCollapsed ? "" : "transform:rotate(90deg)") + '">' +
                'chevron_right' +
              '</span>' +
              phaseDot(phaseIdx) +
              '<span class="font-bold text-slate-800 group-hover:text-violet-700 transition-colors">' + escapeHtml(phase.label) + '</span>' +
            '</button>' +
            '<div class="mt-0.5 flex items-center gap-1.5 pl-6">' +
              '<span class="text-[10px] text-slate-400 font-mono">' + escapeHtml(phase.phaseCode) + '</span>' +
              (phaseHasWarranty ? '<span class="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200 font-bold">PW</span>' : '') +
            '</div>';

          if (isCollapsed) {
            hcRows.push(
              '<tr class="border-t border-slate-200 bg-slate-50/60">' +
                '<td colspan="8" class="py-2.5 px-3 text-sm" ' + phaseCellStyle(phaseIdx) + '>' + hcPhaseToggleBtn + '</td>' +
              '</tr>'
            );
            return;
          }

          if (!subs.length) {
            hcRows.push(
              '<tr class="border-t border-slate-200 bg-slate-50/60">' +
                '<td class="py-3 pr-3 align-top text-sm" ' + phaseCellStyle(phaseIdx) + '>' + hcPhaseToggleBtn + '</td>' +
                '<td colspan="7" class="py-3 px-3 text-sm text-slate-400 italic">No subsystems defined.</td>' +
              '</tr>'
            );
            return;
          }

          // phaseRowspan = (subsystems + 1 project-total block) × PERIODS
          const phaseRowspan = (subs.length + 1) * PERIODS.length;

          // Subsystem rows
          subs.forEach(function (subsystem, subIdx) {
            const wl = wlBySub[subsystem] || { totalTechs: 0, totalSupervisors: 0 };
            PERIODS.forEach(function (period, periodIdx) {
              const techRate  = resolveRateWithWarranty(phase.key, subsystem, period.type, "technicianRate",  phaseHasWarranty) / 100;
              const wkrRate   = resolveRateWithWarranty(phase.key, subsystem, period.type, "workerRate",      phaseHasWarranty) / 100;
              const supRate   = resolveRateWithWarranty(phase.key, subsystem, period.type, "supervisorRate",  phaseHasWarranty) / 100;

              let rowHtml = '<tr class="' + (subIdx % 2 === 0 ? "" : "bg-slate-50/40") + '">';

              if (subIdx === 0 && periodIdx === 0) {
                rowHtml += '<td rowspan="' + phaseRowspan + '" class="py-3 pr-3 align-top border-t border-slate-200 text-sm" ' + phaseCellStyle(phaseIdx) + '>' + hcPhaseToggleBtn + '</td>';
              }
              if (periodIdx === 0) {
                rowHtml += '<td rowspan="' + PERIODS.length + '" class="py-2 px-3 align-middle ' + (subIdx === 0 ? "border-t border-slate-200" : "") + ' font-medium text-sm whitespace-nowrap">' + escapeHtml(subsystem) + '</td>';
              }

              rowHtml += '<td class="py-2 px-3 whitespace-nowrap">' + periodBadge(period) + '</td>';
              rowHtml += hcNumCell(wl.totalTechs * techRate);
              rowHtml += hcNumCell(wl.totalTechs * wkrRate);
              rowHtml += hcNumCell(wl.totalSupervisors * supRate);
              rowHtml += '<td class="py-2 px-3 text-center text-slate-200 text-xs">—</td>';
              rowHtml += '<td class="py-2 px-3 text-center text-slate-200 text-xs">—</td>';
              rowHtml += '</tr>';
              hcRows.push(rowHtml);
            });
          });

          // Project total rows — one per period
          PERIODS.forEach(function (period, periodIdx) {
            // Sum Techs / Workers / Supervisors across all subsystems
            var sumTechs = 0, sumWorkers = 0, sumSupervisors = 0;
            subs.forEach(function (sub) {
              const wl = wlBySub[sub] || { totalTechs: 0, totalSupervisors: 0 };
              sumTechs      += wl.totalTechs * resolveRateWithWarranty(phase.key, sub, period.type, "technicianRate",  phaseHasWarranty) / 100;
              sumWorkers    += wl.totalTechs * resolveRateWithWarranty(phase.key, sub, period.type, "workerRate",      phaseHasWarranty) / 100;
              sumSupervisors += wl.totalSupervisors * resolveRateWithWarranty(phase.key, sub, period.type, "supervisorRate",  phaseHasWarranty) / 100;
            });

            // Engineer qty × average engineer rate across subsystems
            const engQty = engPositions.reduce(function (s, pos) { return s + resolveQty(phase.key, period.type, pos, phaseHasWarranty); }, 0);
            const mgrQty = mgrPositions.reduce(function (s, pos) { return s + resolveQty(phase.key, period.type, pos, phaseHasWarranty); }, 0);
            const avgEngRate = subs.length
              ? subs.reduce(function (s, sub) { return s + resolveRateWithWarranty(phase.key, sub, period.type, "engineerRate", phaseHasWarranty); }, 0) / subs.length / 100
              : 0;
            const avgMgrRate = subs.length
              ? subs.reduce(function (s, sub) { return s + resolveRateWithWarranty(phase.key, sub, period.type, "managerRate",  phaseHasWarranty); }, 0) / subs.length / 100
              : 0;

            let rowHtml = '<tr class="bg-violet-50/70">';
            if (periodIdx === 0) {
              rowHtml += '<td rowspan="' + PERIODS.length + '" class="py-2 px-3 align-middle border-t border-violet-200">' +
                '<span class="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 border border-violet-200 whitespace-nowrap">Project total</span>' +
              '</td>';
            }
            rowHtml += '<td class="py-2 px-3 whitespace-nowrap">' + periodBadge(period) + '</td>';
            rowHtml += hcNumCell(sumTechs,       "text-violet-800");
            rowHtml += hcNumCell(sumWorkers,     "text-violet-800");
            rowHtml += hcNumCell(sumSupervisors, "text-violet-800");
            rowHtml += hcNumCell(engQty * avgEngRate, "text-violet-800");
            rowHtml += hcNumCell(mgrQty * avgMgrRate, "text-violet-800");
            rowHtml += '</tr>';
            hcRows.push(rowHtml);
          });
        });

        hcTableBody.innerHTML = hcRows.length
          ? hcRows.join("")
          : '<tr><td colspan="8" class="py-6 text-center text-sm text-slate-500">No data available.</td></tr>';
      }

      function openDrawer(groupKey, itemKey) {
        const group = moduleDefinitions[groupKey];
        const item = group && group.items ? group.items[itemKey] : null;
        if (!group || !item) return;

        if (
          window.__costSummaryModuleReady &&
          (itemKey === "project_phases" || itemKey === "cost_centers" || itemKey === "currency_exchange_rates" || itemKey === "firming_rules" || itemKey === "pio_definition_freight_customs" || itemKey === "workload_synthesis" || itemKey === "white_collar_definition")
        ) {
          return;
        }

        if (itemKey !== "subsystem_summary") {
          closeSubsystemSummaryWorkspace();
        }
        if (itemKey !== "price_lists") {
          closePriceListsWorkspace();
        }

        if (itemKey === "subsystem_summary") {
          window.__costSummaryUseFallbackProjectPhases = false;
          window.__costSummaryUseFallbackCostCenters = false;
          window.__costSummaryUseFallbackPioDefinition = false;
          window.__costSummaryUseFallbackGuidePlanning = false;
          closeProjectPhasesWorkspace();
          closeCostCentersWorkspace();
          closeGuidePlanningWorkspace();
          closeCurrencyExchangeWorkspace();
          closeFirmingRulesWorkspace();
          closePioDefinitionWorkspace();
          closeWorkloadSynthesisWorkspace();
          closeWhiteCollarDefinitionWorkspace();
          closeWbsWorkspace();
          closeToolsConsumablesWorkspace();
          closeVehiclesWorkspace();
          closeOscWorkspace();
          closeMandatoryTrainingWorkspace();
          closePriceListsWorkspace();
          closeDrawer();
          renderSubsystemSummaryWorkspace();
          return;
        }

        if (itemKey === "price_lists") {
          window.__costSummaryUseFallbackProjectPhases = false;
          window.__costSummaryUseFallbackCostCenters = false;
          window.__costSummaryUseFallbackPioDefinition = false;
          window.__costSummaryUseFallbackGuidePlanning = false;
          closeProjectPhasesWorkspace();
          closeCostCentersWorkspace();
          closeGuidePlanningWorkspace();
          closeCurrencyExchangeWorkspace();
          closeFirmingRulesWorkspace();
          closePioDefinitionWorkspace();
          closeWorkloadSynthesisWorkspace();
          closeWhiteCollarDefinitionWorkspace();
          closeWbsWorkspace();
          closeToolsConsumablesWorkspace();
          closeVehiclesWorkspace();
          closeOscWorkspace();
          closeMandatoryTrainingWorkspace();
          closeDrawer();
          renderFallbackPriceListsWorkspace();
          return;
        }

        if (itemKey === "project_phases") {
          window.__costSummaryUseFallbackProjectPhases = true;
          window.__costSummaryUseFallbackCostCenters = false;
          window.__costSummaryUseFallbackPioDefinition = false;
          closeCostCentersWorkspace();
          closeGuidePlanningWorkspace();
          closeFirmingRulesWorkspace();
          closePioDefinitionWorkspace();
          closeWorkloadSynthesisWorkspace();
          closeWhiteCollarDefinitionWorkspace();
          closeWbsWorkspace();
          closeToolsConsumablesWorkspace();
          closeVehiclesWorkspace();
          closeOscWorkspace();
          closeMandatoryTrainingWorkspace();
          closeDrawer();
          renderFallbackProjectPhasesDrawer(group, item);
          return;
        }

        if (itemKey === "guide_planning_definition") {
          window.__costSummaryUseFallbackProjectPhases = false;
          window.__costSummaryUseFallbackCostCenters = false;
          window.__costSummaryUseFallbackPioDefinition = false;
          window.__costSummaryUseFallbackGuidePlanning = false;
          closeProjectPhasesWorkspace();
          closeCostCentersWorkspace();
          closeCurrencyExchangeWorkspace();
          closeFirmingRulesWorkspace();
          closePioDefinitionWorkspace();
          closeWorkloadSynthesisWorkspace();
          closeWhiteCollarDefinitionWorkspace();
          closeWbsWorkspace();
          closeToolsConsumablesWorkspace();
          closeVehiclesWorkspace();
          closeOscWorkspace();
          closeMandatoryTrainingWorkspace();
          closeDrawer();
          if (typeof window.__costSummaryOpenGuidePlanningWorkspace === "function") {
            window.__costSummaryOpenGuidePlanningWorkspace();
            return;
          }
          window.__costSummaryUseFallbackGuidePlanning = true;
          renderFallbackGuidePlanningWorkspace();
          return;
        }

        if (itemKey === "cost_centers") {
          window.__costSummaryUseFallbackProjectPhases = false;
          window.__costSummaryUseFallbackCostCenters = true;
          window.__costSummaryUseFallbackPioDefinition = false;
          closeProjectPhasesWorkspace();
          closeGuidePlanningWorkspace();
          closeCurrencyExchangeWorkspace();
          closeFirmingRulesWorkspace();
          closePioDefinitionWorkspace();
          closeWorkloadSynthesisWorkspace();
          closeWhiteCollarDefinitionWorkspace();
          closeToolsConsumablesWorkspace();
          closeVehiclesWorkspace();
          closeOscWorkspace();
          closeMandatoryTrainingWorkspace();
          closeDrawer();
          renderFallbackCostCentersWorkspace();
          return;
        }

        if (itemKey === "currency_exchange_rates") {
          window.__costSummaryUseFallbackProjectPhases = false;
          window.__costSummaryUseFallbackCostCenters = false;
          window.__costSummaryUseFallbackPioDefinition = false;
          closeProjectPhasesWorkspace();
          closeCostCentersWorkspace();
          closeGuidePlanningWorkspace();
          closeFirmingRulesWorkspace();
          closePioDefinitionWorkspace();
          closeWorkloadSynthesisWorkspace();
          closeWhiteCollarDefinitionWorkspace();
          closeToolsConsumablesWorkspace();
          closeVehiclesWorkspace();
          closeOscWorkspace();
          closeMandatoryTrainingWorkspace();
          closeDrawer();
          renderFallbackCurrencyExchangeWorkspace();
          return;
        }

        if (itemKey === "firming_rules") {
          window.__costSummaryUseFallbackProjectPhases = false;
          window.__costSummaryUseFallbackCostCenters = false;
          window.__costSummaryUseFallbackPioDefinition = false;
          closeProjectPhasesWorkspace();
          closeCostCentersWorkspace();
          closeGuidePlanningWorkspace();
          closeCurrencyExchangeWorkspace();
          closePioDefinitionWorkspace();
          closeWorkloadSynthesisWorkspace();
          closeWhiteCollarDefinitionWorkspace();
          closeToolsConsumablesWorkspace();
          closeVehiclesWorkspace();
          closeOscWorkspace();
          closeMandatoryTrainingWorkspace();
          closeDrawer();
          renderFallbackFirmingRulesWorkspace();
          return;
        }

        if (itemKey === "pio_definition_freight_customs") {
          window.__costSummaryUseFallbackProjectPhases = false;
          window.__costSummaryUseFallbackCostCenters = false;
          window.__costSummaryUseFallbackPioDefinition = true;
          closeProjectPhasesWorkspace();
          closeCostCentersWorkspace();
          closeGuidePlanningWorkspace();
          closeCurrencyExchangeWorkspace();
          closeFirmingRulesWorkspace();
          closeWorkloadSynthesisWorkspace();
          closeWhiteCollarDefinitionWorkspace();
          closeWbsWorkspace();
          closeToolsConsumablesWorkspace();
          closeVehiclesWorkspace();
          closeOscWorkspace();
          closeMandatoryTrainingWorkspace();
          closeDrawer();
          renderFallbackPioDefinitionWorkspace();
          return;
        }

        if (itemKey === "workload_synthesis") {
          window.__costSummaryUseFallbackProjectPhases = false;
          window.__costSummaryUseFallbackCostCenters = false;
          window.__costSummaryUseFallbackPioDefinition = false;
          closeProjectPhasesWorkspace();
          closeCostCentersWorkspace();
          closeGuidePlanningWorkspace();
          closeCurrencyExchangeWorkspace();
          closeFirmingRulesWorkspace();
          closePioDefinitionWorkspace();
          closeWhiteCollarDefinitionWorkspace();
          closeToolsConsumablesWorkspace();
          closeVehiclesWorkspace();
          closeOscWorkspace();
          closeMandatoryTrainingWorkspace();
          closeDrawer();
          renderFallbackWorkloadSynthesisWorkspace();
          return;
        }

        if (itemKey === "white_collar_definition") {
          window.__costSummaryUseFallbackProjectPhases = false;
          window.__costSummaryUseFallbackCostCenters = false;
          window.__costSummaryUseFallbackPioDefinition = false;
          closeProjectPhasesWorkspace();
          closeCostCentersWorkspace();
          closeGuidePlanningWorkspace();
          closeCurrencyExchangeWorkspace();
          closeFirmingRulesWorkspace();
          closePioDefinitionWorkspace();
          closeWorkloadSynthesisWorkspace();
          closeToolsConsumablesWorkspace();
          closeVehiclesWorkspace();
          closeOscWorkspace();
          closeMandatoryTrainingWorkspace();
          closeDrawer();
          renderFallbackWhiteCollarWorkspace();
          return;
        }

        if (itemKey === "tools_consumables") {
          window.__costSummaryUseFallbackProjectPhases = false;
          window.__costSummaryUseFallbackCostCenters = false;
          window.__costSummaryUseFallbackPioDefinition = false;
          closeProjectPhasesWorkspace();
          closeCostCentersWorkspace();
          closeGuidePlanningWorkspace();
          closeCurrencyExchangeWorkspace();
          closeFirmingRulesWorkspace();
          closePioDefinitionWorkspace();
          closeWorkloadSynthesisWorkspace();
          closeWhiteCollarDefinitionWorkspace();
          closeVehiclesWorkspace();
          closeOscWorkspace();
          closeMandatoryTrainingWorkspace();
          closeDrawer();
          renderFallbackToolsConsumablesWorkspace();
          return;
        }

        if (itemKey === "vehicles") {
          window.__costSummaryUseFallbackProjectPhases = false;
          window.__costSummaryUseFallbackCostCenters = false;
          window.__costSummaryUseFallbackPioDefinition = false;
          closeProjectPhasesWorkspace();
          closeCostCentersWorkspace();
          closeGuidePlanningWorkspace();
          closeCurrencyExchangeWorkspace();
          closeFirmingRulesWorkspace();
          closePioDefinitionWorkspace();
          closeWorkloadSynthesisWorkspace();
          closeWhiteCollarDefinitionWorkspace();
          closeToolsConsumablesWorkspace();
          closeOscWorkspace();
          closeMandatoryTrainingWorkspace();
          closeDrawer();
          renderFallbackVehiclesWorkspace();
          return;
        }

        if (itemKey === "other_support_costs") {
          window.__costSummaryUseFallbackProjectPhases = false;
          window.__costSummaryUseFallbackCostCenters = false;
          window.__costSummaryUseFallbackPioDefinition = false;
          closeProjectPhasesWorkspace();
          closeCostCentersWorkspace();
          closeGuidePlanningWorkspace();
          closeCurrencyExchangeWorkspace();
          closeFirmingRulesWorkspace();
          closePioDefinitionWorkspace();
          closeWorkloadSynthesisWorkspace();
          closeWhiteCollarDefinitionWorkspace();
          closeToolsConsumablesWorkspace();
          closeVehiclesWorkspace();
          closeMandatoryTrainingWorkspace();
          closeDrawer();
          renderFallbackOscWorkspace();
          return;
        }

        if (itemKey === "mandatory_training") {
          window.__costSummaryUseFallbackProjectPhases = false;
          window.__costSummaryUseFallbackCostCenters = false;
          window.__costSummaryUseFallbackPioDefinition = false;
          closeProjectPhasesWorkspace();
          closeCostCentersWorkspace();
          closeGuidePlanningWorkspace();
          closeCurrencyExchangeWorkspace();
          closeFirmingRulesWorkspace();
          closePioDefinitionWorkspace();
          closeWorkloadSynthesisWorkspace();
          closeWhiteCollarDefinitionWorkspace();
          closeToolsConsumablesWorkspace();
          closeVehiclesWorkspace();
          closeOscWorkspace();
          closeDrawer();
          renderFallbackMandatoryTrainingWorkspace();
          return;
        }

        window.__costSummaryUseFallbackProjectPhases = false;
        window.__costSummaryUseFallbackCostCenters = false;
        window.__costSummaryUseFallbackPioDefinition = false;
        closeProjectPhasesWorkspace();
        closeCostCentersWorkspace();
        closeGuidePlanningWorkspace();
        closeCurrencyExchangeWorkspace();
        closeFirmingRulesWorkspace();
        closePioDefinitionWorkspace();
        closeWorkloadSynthesisWorkspace();
        closeWhiteCollarDefinitionWorkspace();
        closeToolsConsumablesWorkspace();
        closeVehiclesWorkspace();
        closeOscWorkspace();
        closeMandatoryTrainingWorkspace();

        const badge = $("moduleDrawerSectionBadge");
        const title = $("moduleDrawerTitle");
        const subtitle = $("moduleDrawerSubtitle");
        const description = $("moduleDrawerDescription");
        const groupLabel = $("moduleDrawerGroup");
        const inputs = $("moduleDrawerInputs");
        const steps = $("moduleDrawerSteps");

        if (badge) {
          badge.innerHTML = '<span class="material-symbols-outlined text-[16px]">' + escapeHtml(group.icon) + '</span>' + escapeHtml(group.label);
        }
        if (title) title.textContent = item.label;
        if (subtitle) subtitle.textContent = "Configuration placeholder. Detailed business fields will be defined later.";
        if (description) description.textContent = item.description;
        if (groupLabel) groupLabel.textContent = group.label;
        if (inputs) {
          inputs.innerHTML = item.inputs.map((entry) => (
            '<div class="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">' +
              '<div class="flex items-start gap-3">' +
                '<span class="material-symbols-outlined text-primary text-[18px]">subdirectory_arrow_right</span>' +
                '<div>' +
                  '<p class="text-sm font-semibold">' + escapeHtml(entry) + '</p>' +
                  '<p class="mt-1 text-xs text-slate-500">Placeholder field block. Business content to be defined in the next step.</p>' +
                '</div>' +
              '</div>' +
            '</div>'
          )).join("");
        }
        if (steps) {
          steps.innerHTML = buildSteps.map((entry, index) => (
            '<div class="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">' +
              '<span class="inline-flex items-center justify-center size-6 rounded-full bg-white border border-slate-200 text-[11px] font-bold text-slate-500">' + (index + 1) + '</span>' +
              '<p class="text-sm text-slate-600">' + escapeHtml(entry) + '</p>' +
            '</div>'
          )).join("");
        }

        $("moduleDrawerBackdrop")?.classList.remove("hidden");
        $("moduleDrawer")?.classList.remove("translate-x-full");
        document.body.classList.add("overflow-hidden");
      }

      window.__costSummaryFallback = {
        closeDetailWorkspacesFromMain: function () {
          closeGuidePlanningWorkspace();
          closeFirmingRulesWorkspace();
          closeWorkloadSynthesisWorkspace();
          closeWhiteCollarDefinitionWorkspace();
          closeWbsWorkspace();
          closeToolsConsumablesWorkspace();
          closeVehiclesWorkspace();
          closeOscWorkspace();
          closeMandatoryTrainingWorkspace();
          closePriceListsWorkspace();
          closeSubsystemSummaryWorkspace();
          setFallbackDetailWorkspaceActive(false);
        },
        openProjectPhases: function () {
          if (window.__costSummaryModuleReady) return;
          window.__costSummaryUseFallbackProjectPhases = true;
          window.__costSummaryUseFallbackCostCenters = false;
          window.__costSummaryUseFallbackPioDefinition = false;
          closeMenus();
          closeCostCentersWorkspace();
          closeCurrencyExchangeWorkspace();
          closeFirmingRulesWorkspace();
          closePioDefinitionWorkspace();
          closeSubsystemSummaryWorkspace();
          closeDrawer();
          renderFallbackProjectPhasesDrawer(moduleDefinitions.study_setup, moduleDefinitions.study_setup.items.project_phases);
        },
        closeProjectPhases: closeProjectPhasesWorkspace,
        openCostCenters: function () {
          if (window.__costSummaryModuleReady) return;
          window.__costSummaryUseFallbackProjectPhases = false;
          window.__costSummaryUseFallbackCostCenters = true;
          window.__costSummaryUseFallbackPioDefinition = false;
          closeMenus();
          closeProjectPhasesWorkspace();
          closeCurrencyExchangeWorkspace();
          closeFirmingRulesWorkspace();
          closePioDefinitionWorkspace();
          closeSubsystemSummaryWorkspace();
          closeDrawer();
          renderFallbackCostCentersWorkspace();
        },
        closeCostCenters: closeCostCentersWorkspace,
        openCurrencyExchange: function () {
          if (window.__costSummaryModuleReady) return;
          closeMenus();
          closeProjectPhasesWorkspace();
          closeCostCentersWorkspace();
          closeFirmingRulesWorkspace();
          closePioDefinitionWorkspace();
          closeSubsystemSummaryWorkspace();
          closeDrawer();
          renderFallbackCurrencyExchangeWorkspace();
        },
        closeCurrencyExchange: closeCurrencyExchangeWorkspace,
        openFirmingRules: function () {
          if (window.__costSummaryModuleReady) return;
          closeMenus();
          closeProjectPhasesWorkspace();
          closeCostCentersWorkspace();
          closeCurrencyExchangeWorkspace();
          closePioDefinitionWorkspace();
          closeSubsystemSummaryWorkspace();
          closeDrawer();
          renderFallbackFirmingRulesWorkspace();
        },
        closeFirmingRules: closeFirmingRulesWorkspace,
        openPioDefinition: function () {
          if (window.__costSummaryModuleReady) return;
          window.__costSummaryUseFallbackProjectPhases = false;
          window.__costSummaryUseFallbackCostCenters = false;
          window.__costSummaryUseFallbackPioDefinition = true;
          closeMenus();
          closeProjectPhasesWorkspace();
          closeCostCentersWorkspace();
          closeCurrencyExchangeWorkspace();
          closeFirmingRulesWorkspace();
          closeSubsystemSummaryWorkspace();
          closeDrawer();
          renderFallbackPioDefinitionWorkspace();
        },
        closePioDefinition: closePioDefinitionWorkspace,
        openGuidePlanning: function () {
          if (window.__costSummaryModuleReady) return;
          window.__costSummaryUseFallbackProjectPhases = false;
          window.__costSummaryUseFallbackCostCenters = false;
          window.__costSummaryUseFallbackPioDefinition = false;
          window.__costSummaryUseFallbackGuidePlanning = true;
          closeMenus();
          closeProjectPhasesWorkspace();
          closeCostCentersWorkspace();
          closeCurrencyExchangeWorkspace();
          closeFirmingRulesWorkspace();
          closePioDefinitionWorkspace();
          closeWbsWorkspace();
          closeSubsystemSummaryWorkspace();
          closeDrawer();
          renderFallbackGuidePlanningWorkspace();
        },
        closeGuidePlanning: closeGuidePlanningWorkspace,
        openWorkspaceFromMain: function (itemKey) {
          window.__costSummaryUseFallbackProjectPhases = false;
          window.__costSummaryUseFallbackCostCenters = false;
          window.__costSummaryUseFallbackPioDefinition = false;
          window.__costSummaryUseFallbackGuidePlanning = false;
          closeMenus();
          closeProjectPhasesWorkspace();
          closeCostCentersWorkspace();
          closeCurrencyExchangeWorkspace();
          closeFirmingRulesWorkspace();
          closePioDefinitionWorkspace();
          closeGuidePlanningWorkspace();
          closeWorkloadSynthesisWorkspace();
          closeWhiteCollarDefinitionWorkspace();
          closeWbsWorkspace();
          closeToolsConsumablesWorkspace();
          closeVehiclesWorkspace();
          closeOscWorkspace();
          closeMandatoryTrainingWorkspace();
          closePriceListsWorkspace();
          closeSubsystemSummaryWorkspace();
          closeDrawer();
          setFallbackDetailWorkspaceActive(true);

          if (itemKey === "firming_rules") {
            renderFallbackFirmingRulesWorkspace();
            return true;
          }
          if (itemKey === "workload_synthesis") {
            renderFallbackWorkloadSynthesisWorkspace();
            return true;
          }
          if (itemKey === "white_collar_definition") {
            renderFallbackWhiteCollarWorkspace();
            return true;
          }
          if (itemKey === "wbs") {
            renderFallbackWbsWorkspace();
            return true;
          }
          if (itemKey === "tools_consumables") {
            renderFallbackToolsConsumablesWorkspace();
            return true;
          }
          if (itemKey === "vehicles") {
            renderFallbackVehiclesWorkspace();
            return true;
          }
          if (itemKey === "other_support_costs") {
            renderFallbackOscWorkspace();
            return true;
          }
          if (itemKey === "mandatory_training") {
            renderFallbackMandatoryTrainingWorkspace();
            return true;
          }
          if (itemKey === "price_lists") {
            renderFallbackPriceListsWorkspace();
            return true;
          }
          if (itemKey === "subsystem_summary") {
            renderSubsystemSummaryWorkspace();
            return true;
          }
          return false;
        },
        openWorkloadSynthesis: function () {
          if (window.__costSummaryModuleReady) return;
          window.__costSummaryUseFallbackProjectPhases = false;
          window.__costSummaryUseFallbackCostCenters = false;
          window.__costSummaryUseFallbackPioDefinition = false;
          closeMenus();
          closeProjectPhasesWorkspace();
          closeCostCentersWorkspace();
          closeCurrencyExchangeWorkspace();
          closeFirmingRulesWorkspace();
          closePioDefinitionWorkspace();
          closeGuidePlanningWorkspace();
          closeSubsystemSummaryWorkspace();
          closeDrawer();
          renderFallbackWorkloadSynthesisWorkspace();
        },
        closeWorkloadSynthesis: closeWorkloadSynthesisWorkspace
      };

      // ── Toolbar completion status dots ────────────────────────────────────
      function _readStatusSlice(storageKey) {
        try {
          var raw = localStorage.getItem(storageKey);
          if (!raw) return {};
          var all = JSON.parse(raw);
          var studyId = getFallbackStudyId();
          return all[studyId] || {};
        } catch (e) { return {}; }
      }

      function _computeModuleStatus(moduleKey) {
        switch (moduleKey) {
          case "cost_centers": {
            var s = _readStatusSlice("cost-summary-mi-cost-centers-fallback-v1");
            var pp = Object.values(s);
            var hasPos  = pp.some(function(p) { return Array.isArray(p && p.selectedPositions) && p.selectedPositions.length > 0; });
            var hasRate = pp.some(function(p) { return p && p.rowOverrides && Object.keys(p.rowOverrides).length > 0; });
            return (hasPos && hasRate) ? "filled" : hasPos ? "partial" : "empty";
          }
          case "pio_definition_freight_customs": {
            var s = _readStatusSlice("cost-summary-mi-pio-definition-fallback-v1");
            return Object.values(s).some(function(p) { return Array.isArray(p && p.rows) && p.rows.length > 0; }) ? "filled" : "empty";
          }
          case "project_phases": {
            var s = _readStatusSlice("cost-summary-mi-project-phases-fallback-v1");
            var pp = Object.values(s);
            var hasActive = pp.some(function(p) {
              return p && p.phases && Object.values(p.phases).some(function(ph) { return ph && ph.enabled && (toNumber(ph.durationYears) || 0) > 0; });
            });
            if (hasActive) return "filled";
            var hasAny = pp.some(function(p) { return p && p.phases && Object.keys(p.phases).length > 0; });
            return hasAny ? "partial" : "empty";
          }
          case "guide_planning_definition": {
            var s = _readStatusSlice("cost-summary-mi-guide-planning-fallback-v1");
            var pp = Object.values(s);
            var hasMob  = pp.some(function(p) { return p && p.mobilizationWorkloadMonthsByPosition && Object.keys(p.mobilizationWorkloadMonthsByPosition).length > 0; });
            var hasDemob = pp.some(function(p) { return p && p.demobilizationWorkloadMonthsByPosition && Object.keys(p.demobilizationWorkloadMonthsByPosition).length > 0; });
            var hasCustom = pp.some(function(p) {
              return (Array.isArray(p && p.customRecurrentWorkloadRows) && p.customRecurrentWorkloadRows.length > 0) ||
                     (Array.isArray(p && p.customDemobilizationWorkloadRows) && p.customDemobilizationWorkloadRows.length > 0);
            });
            return (hasMob || hasDemob || hasCustom) ? "filled" : "empty";
          }
          case "currency_exchange_rates": {
            var s = _readStatusSlice("cost-summary-mi-currency-exchange-fallback-v1");
            var pp = Object.values(s);
            var hasOvr = pp.some(function(p) { return p && p.manualOverrides && Object.keys(p.manualOverrides).length > 0; });
            var hasCur = pp.some(function(p) { return Array.isArray(p && p.customCurrencies) && p.customCurrencies.length > 0; });
            return (hasOvr || hasCur) ? "filled" : "empty";
          }
          case "firming_rules": {
            var s = _readStatusSlice("cost-summary-mi-firming-rules-fallback-v1");
            var hasR = Object.values(s).some(function(p) {
              if (!p) return false;
              return (p.firmingTexts && Object.values(p.firmingTexts).some(function(t) { return String(t || "").trim(); })) ||
                     (p.importedOptions && Object.keys(p.importedOptions).length > 0);
            });
            return hasR ? "filled" : "empty";
          }
          case "workload_synthesis": {
            var s = _readStatusSlice("cost-summary-mi-workload-overrides-fallback-v1");
            return Object.values(s).some(function(p) { return p && Object.keys(p).length > 0; }) ? "filled" : "empty";
          }
          case "white_collar_definition": {
            var s = _readStatusSlice("cost-summary-mi-white-collar-fallback-v1");
            return Object.values(s).some(function(p) { return p && Object.keys(p).length > 0; }) ? "filled" : "empty";
          }
          case "tools_consumables": {
            var s = _readStatusSlice("cost-summary-mi-tools-consumables-fallback-v1");
            return Object.values(s).some(function(p) { return p && Object.keys(p).length > 0; }) ? "filled" : "empty";
          }
          case "vehicles": {
            var s = _readStatusSlice("cost-summary-mi-vehicles-fallback-v1");
            return Object.values(s).some(function(p) { return p && Object.keys(p).length > 0; }) ? "filled" : "empty";
          }
          case "other_support_costs": {
            var s = _readStatusSlice("cost-summary-mi-osc-fallback-v1");
            return Object.values(s).some(function(p) { return p && Object.keys(p).length > 0; }) ? "filled" : "empty";
          }
          case "mandatory_training": {
            var s = _readStatusSlice("cost-summary-mi-mandatory-training-fallback-v1");
            return Object.values(s).some(function(p) { return p && Object.keys(p).length > 0; }) ? "filled" : "empty";
          }
          case "price_lists": {
            var s = _readStatusSlice("cost-summary-mi-price-lists-fallback-v1");
            var projects = Object.values(s);
            var statuses = projects.map(function(p) {
              return {
                hasCount: p && Number(p.count || 0) > 0,
                hasRows: p && Array.isArray(p.rows) && p.rows.some(function(row) {
                  return row && row.values && Object.values(row.values).some(function(value) { return String(value || "").trim(); });
                }),
                hasMappings: p && Array.isArray(p.textMappings) && p.textMappings.some(function(value) {
                  return String(value || "").trim() && String(value || "") !== "Not applicable";
                })
              };
            });
            var hasCount = statuses.some(function(status) { return status.hasCount; });
            var isFilled = statuses.some(function(status) {
              return status.hasCount && status.hasRows && status.hasMappings;
            });
            return isFilled ? "filled" : hasCount ? "partial" : "empty";
          }
          default: return "na";
        }
      }
      // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      function _statusDot(status) {
        if (status === "na") return "";
        var colors = { empty: "#cbd5e1", partial: "#fcd34d", filled: "#6ee7b7" };
        var titles = { empty: "Not configured", partial: "Partially configured", filled: "Fields present \u2014 review recommended" };
        return '<span title="' + (titles[status] || "") + '" style="display:inline-block;width:8px;height:8px;border-radius:50%;background:' + (colors[status] || colors.empty) + ';flex-shrink:0;margin-left:2px;"></span>';
      }

      function updateToolbarStatusDots() {
        document.querySelectorAll("[data-status-dot-group]").forEach(function(el) {
          var groupKey = el.getAttribute("data-status-dot-group");
          // derive group status from its item dots already computed
          var itemEls = document.querySelectorAll("[data-status-dot-item][data-toolbar-group='" + groupKey + "']");
          // find via toolbar item buttons
          var groupItems = [];
          document.querySelectorAll("[data-toolbar-item][data-toolbar-group='" + groupKey + "']").forEach(function(btn) {
            groupItems.push(_computeModuleStatus(btn.getAttribute("data-toolbar-item")));
          });
          var implemented = groupItems.filter(function(s) { return s !== "na"; });
          var groupStatus = "na";
          if (implemented.length) {
            if (implemented.every(function(s) { return s === "filled"; })) groupStatus = "filled";
            else if (implemented.some(function(s) { return s === "filled" || s === "partial"; })) groupStatus = "partial";
            else groupStatus = "empty";
          }
          el.innerHTML = _statusDot(groupStatus);
        });
        document.querySelectorAll("[data-status-dot-item]").forEach(function(el) {
          el.innerHTML = _statusDot(_computeModuleStatus(el.getAttribute("data-status-dot-item")));
        });
      }
      window.updateToolbarStatusDots = updateToolbarStatusDots;
      // ─────────────────────────────────────────────────────────────────────

      document.addEventListener("DOMContentLoaded", function () {
        updateToolbarStatusDots();
        document.addEventListener("click", function (event) {
          if (event.target.closest("#exportConfigJsonBtn")) {
            event.preventDefault();
            exportCostSummaryConfigJson();
            return;
          }

          if (event.target.closest("#importConfigJsonBtn")) {
            event.preventDefault();
            const input = $("importConfigJsonInput");
            if (input) {
              input.value = "";
              input.click();
            }
            return;
          }

          if (window.__costSummaryModuleReady && !fallbackInteractionIsActive()) return;

          const trigger = event.target.closest("[data-toolbar-trigger]");
          if (trigger) {
            event.preventDefault();
            event.stopPropagation();
            toggleMenu(trigger.getAttribute("data-toolbar-trigger"));
            return;
          }

          const item = event.target.closest("[data-toolbar-item]");
          if (item) {
            event.preventDefault();
            event.stopPropagation();
            closeMenus();
            openDrawer(item.getAttribute("data-toolbar-group"), item.getAttribute("data-toolbar-item"));
            return;
          }

          const selectProjectBtn = event.target.closest("[data-fallback-project-select]");
          if (selectProjectBtn) {
            event.preventDefault();
            $("projectPhasesWorkspace").dataset.currentProjectKey = selectProjectBtn.getAttribute("data-fallback-project-select") || "";
            renderFallbackProjectPhasesDrawer(moduleDefinitions.study_setup, moduleDefinitions.study_setup.items.project_phases);
            return;
          }

          const selectGuidePlanningProjectBtn = event.target.closest("[data-fallback-guide-planning-project-select]");
          if (selectGuidePlanningProjectBtn) {
            event.preventDefault();
            $("guidePlanningWorkspace").dataset.currentProjectKey = selectGuidePlanningProjectBtn.getAttribute("data-fallback-guide-planning-project-select") || "";
            renderFallbackGuidePlanningWorkspace();
            return;
          }

          const editGuidePlanningBtn = event.target.closest("[data-fallback-guide-planning-edit]");
          if (editGuidePlanningBtn) {
            event.preventDefault();
            const field = editGuidePlanningBtn.getAttribute("data-fallback-guide-planning-edit") || "";
            const label = field === "guidePlanningCode" ? "Guide planning code" : (field === "startDate" ? "Start date (YYYY-MM-DD)" : "End date (YYYY-MM-DD)");
            const input = window.prompt(label, editGuidePlanningBtn.getAttribute("data-current-value") || "");
            if (input === null) return;
            saveFallbackGuidePlanningRowField(
              editGuidePlanningBtn.getAttribute("data-project-key") || "",
              editGuidePlanningBtn.getAttribute("data-row-key") || "",
              field,
              input.trim()
            );
            $("guidePlanningWorkspace").dataset.currentProjectKey = editGuidePlanningBtn.getAttribute("data-project-key") || "";
            renderFallbackGuidePlanningWorkspace();
            return;
          }

          const editGuidePlanningMaterialBtn = event.target.closest("[data-fallback-guide-planning-material-edit]");
          if (editGuidePlanningMaterialBtn) {
            event.preventDefault();
            const field = editGuidePlanningMaterialBtn.getAttribute("data-fallback-guide-planning-material-edit") || "";
            const label = field === "guidePlanningCode" ? "Guide planning code" : (field === "startDate" ? "Start date (YYYY-MM-DD)" : "End date (YYYY-MM-DD)");
            const input = window.prompt(label, editGuidePlanningMaterialBtn.getAttribute("data-current-value") || "");
            if (input === null) return;
            saveFallbackGuidePlanningRowField(
              editGuidePlanningMaterialBtn.getAttribute("data-project-key") || "",
              editGuidePlanningMaterialBtn.getAttribute("data-row-key") || "",
              field,
              input.trim()
            );
            $("guidePlanningWorkspace").dataset.currentProjectKey = editGuidePlanningMaterialBtn.getAttribute("data-project-key") || "";
            renderFallbackGuidePlanningWorkspace();
            return;
          }

          const editGuidePlanningSubcontractingBtn = event.target.closest("[data-fallback-guide-planning-subcontracting-edit]");
          if (editGuidePlanningSubcontractingBtn) {
            event.preventDefault();
            const field = editGuidePlanningSubcontractingBtn.getAttribute("data-fallback-guide-planning-subcontracting-edit") || "";
            const label = field === "guidePlanningCode" ? "Guide planning code" : (field === "startDate" ? "Start date (YYYY-MM-DD)" : "End date (YYYY-MM-DD)");
            const input = window.prompt(label, editGuidePlanningSubcontractingBtn.getAttribute("data-current-value") || "");
            if (input === null) return;
            saveFallbackGuidePlanningRowField(
              editGuidePlanningSubcontractingBtn.getAttribute("data-project-key") || "",
              editGuidePlanningSubcontractingBtn.getAttribute("data-row-key") || "",
              field,
              input.trim()
            );
            $("guidePlanningWorkspace").dataset.currentProjectKey = editGuidePlanningSubcontractingBtn.getAttribute("data-project-key") || "";
            renderFallbackGuidePlanningWorkspace();
            return;
          }

          const editGuidePlanningOverhaulBtn = event.target.closest("[data-fallback-guide-planning-overhaul-edit]");
          if (editGuidePlanningOverhaulBtn) {
            event.preventDefault();
            const field = editGuidePlanningOverhaulBtn.getAttribute("data-fallback-guide-planning-overhaul-edit") || "";
            const label = field === "overhaulGuidePlanningCode" ? "Overhaul guide planning code" : "Renewal guide planning code";
            const input = window.prompt(label, editGuidePlanningOverhaulBtn.getAttribute("data-current-value") || "");
            if (input === null) return;
            saveFallbackGuidePlanningRowField(
              editGuidePlanningOverhaulBtn.getAttribute("data-project-key") || "",
              editGuidePlanningOverhaulBtn.getAttribute("data-row-key") || "",
              field,
              input.trim()
            );
            $("guidePlanningWorkspace").dataset.currentProjectKey = editGuidePlanningOverhaulBtn.getAttribute("data-project-key") || "";
            renderFallbackGuidePlanningWorkspace();
            return;
          }

          const addGuideCustomRowBtn = event.target.closest("[data-guide-custom-row-add]");
          if (addGuideCustomRowBtn) {
            event.preventDefault();
            const rowType = addGuideCustomRowBtn.getAttribute("data-guide-custom-row-add") || "";
            const projectKey = addGuideCustomRowBtn.getAttribute("data-project-key") || "";
            addFallbackGuidePlanningCustomRow(projectKey, rowType);
            $("guidePlanningWorkspace").dataset.currentProjectKey = projectKey;
            renderFallbackGuidePlanningWorkspace();
            return;
          }

          const addGuideRiskRowBtn = event.target.closest("[data-fallback-guide-risk-row-add]");
          if (addGuideRiskRowBtn) {
            event.preventDefault();
            const projectKey = addGuideRiskRowBtn.getAttribute("data-project-key") || "";
            addFallbackGuidePlanningRiskRow(projectKey);
            $("guidePlanningWorkspace").dataset.currentProjectKey = projectKey;
            renderFallbackGuidePlanningWorkspace();
            return;
          }

          const removeGuideCustomRowBtn = event.target.closest("[data-fallback-guide-custom-row-remove]");
          if (removeGuideCustomRowBtn) {
            event.preventDefault();
            const rowType = removeGuideCustomRowBtn.getAttribute("data-fallback-guide-custom-row-remove") || "";
            const projectKey = removeGuideCustomRowBtn.getAttribute("data-project-key") || "";
            const rowId = removeGuideCustomRowBtn.getAttribute("data-row-id") || "";
            removeFallbackGuidePlanningCustomRow(projectKey, rowType, rowId);
            $("guidePlanningWorkspace").dataset.currentProjectKey = projectKey;
            renderFallbackGuidePlanningWorkspace();
            return;
          }

          const removeGuideRiskRowBtn = event.target.closest("[data-fallback-guide-risk-row-remove]");
          if (removeGuideRiskRowBtn) {
            event.preventDefault();
            const projectKey = removeGuideRiskRowBtn.getAttribute("data-project-key") || "";
            const rowId = removeGuideRiskRowBtn.getAttribute("data-row-id") || "";
            removeFallbackGuidePlanningRiskRow(projectKey, rowId);
            $("guidePlanningWorkspace").dataset.currentProjectKey = projectKey;
            renderFallbackGuidePlanningWorkspace();
            return;
          }

          const selectCostCenterProjectBtn = event.target.closest("[data-fallback-cost-center-project-select]");
          if (selectCostCenterProjectBtn) {
            event.preventDefault();
            $("costCentersWorkspace").dataset.currentProjectKey = selectCostCenterProjectBtn.getAttribute("data-fallback-cost-center-project-select") || "";
            renderFallbackCostCentersWorkspace();
            return;
          }

          const selectCurrencyProjectBtn = event.target.closest("[data-fallback-currency-project-select]");
          if (selectCurrencyProjectBtn) {
            event.preventDefault();
            $("currencyExchangeWorkspace").dataset.currentProjectKey = selectCurrencyProjectBtn.getAttribute("data-fallback-currency-project-select") || "";
            renderFallbackCurrencyExchangeWorkspace();
            return;
          }

          const selectFirmingProjectBtn = event.target.closest("[data-fallback-firming-project-select]");
          if (selectFirmingProjectBtn) {
            event.preventDefault();
            $("firmingRulesWorkspace").dataset.currentProjectKey = selectFirmingProjectBtn.getAttribute("data-fallback-firming-project-select") || "";
            renderFallbackFirmingRulesWorkspace();
            return;
          }

          const selectPriceListsProjectBtn = event.target.closest("[data-fallback-price-lists-project-select]");
          if (selectPriceListsProjectBtn) {
            event.preventDefault();
            $("priceListsWorkspace").dataset.currentProjectKey = selectPriceListsProjectBtn.getAttribute("data-fallback-price-lists-project-select") || "";
            renderFallbackPriceListsWorkspace();
            return;
          }

          const selectWorkloadProjectBtn = event.target.closest("[data-fallback-workload-project-select]");
          if (selectWorkloadProjectBtn) {
            event.preventDefault();
            $("workloadSynthesisWorkspace").dataset.currentProjectKey = selectWorkloadProjectBtn.getAttribute("data-fallback-workload-project-select") || "";
            renderFallbackWorkloadSynthesisWorkspace();
            return;
          }

          const selectPioProjectBtn = event.target.closest("[data-fallback-pio-project-select]");
          if (selectPioProjectBtn) {
            event.preventDefault();
            $("pioDefinitionWorkspace").dataset.currentProjectKey = selectPioProjectBtn.getAttribute("data-fallback-pio-project-select") || "";
            renderFallbackPioDefinitionWorkspace();
            return;
          }

          const addPhaseBtn = event.target.closest("[data-fallback-project-phase-add]");
          if (addPhaseBtn) {
            event.preventDefault();
            const projectKey = addPhaseBtn.getAttribute("data-fallback-project-phase-add");
            const projects = buildFallbackProjectPhaseProjects();
            const project = projects.find(function (entry) { return entry.projectKey === projectKey; });
            if (project && project.nextPhaseKey) {
              addFallbackPhase(projectKey, project.nextPhaseKey);
              $("projectPhasesWorkspace").dataset.currentProjectKey = projectKey;
              renderFallbackProjectPhasesDrawer(moduleDefinitions.study_setup, moduleDefinitions.study_setup.items.project_phases);
            }
            return;
          }

          const addCustomPhaseBtn = event.target.closest("[data-fallback-project-custom-phase-add]");
          if (addCustomPhaseBtn) {
            event.preventDefault();
            const projectKey = addCustomPhaseBtn.getAttribute("data-fallback-project-custom-phase-add");
            const projects = buildFallbackProjectPhaseProjects();
            const project = projects.find(function (entry) { return entry.projectKey === projectKey; });
            if (project && project.nextCustomPhaseKey) {
              addFallbackCustomPhase(projectKey, project.nextCustomPhaseKey);
              $("projectPhasesWorkspace").dataset.currentProjectKey = projectKey;
              renderFallbackProjectPhasesDrawer(moduleDefinitions.study_setup, moduleDefinitions.study_setup.items.project_phases);
            }
            return;
          }

          const removePhaseBtn = event.target.closest("[data-fallback-project-phase-remove]");
          if (removePhaseBtn) {
            event.preventDefault();
            removeFallbackPhase(
              removePhaseBtn.getAttribute("data-fallback-project-phase-remove"),
              removePhaseBtn.getAttribute("data-phase-key")
            );
            $("projectPhasesWorkspace").dataset.currentProjectKey = removePhaseBtn.getAttribute("data-fallback-project-phase-remove") || "";
            renderFallbackProjectPhasesDrawer(moduleDefinitions.study_setup, moduleDefinitions.study_setup.items.project_phases);
            return;
          }

          if (event.target.closest("#closeProjectPhasesWorkspaceBtn")) {
            closeProjectPhasesWorkspace();
            return;
          }

          if (event.target.closest("#closeCostCentersWorkspaceBtn")) {
            closeCostCentersWorkspace();
            return;
          }

          if (event.target.closest("#closeCurrencyExchangeWorkspaceBtn")) {
            closeCurrencyExchangeWorkspace();
            return;
          }

          if (event.target.closest("#closeFirmingRulesWorkspaceBtn")) {
            closeFirmingRulesWorkspace();
            return;
          }

          if (event.target.closest("#closePriceListsWorkspaceBtn")) {
            closePriceListsWorkspace();
            return;
          }

          if (event.target.closest("#closePioDefinitionWorkspaceBtn")) {
            closePioDefinitionWorkspace();
            return;
          }

          if (event.target.closest("#closeGuidePlanningWorkspaceBtn")) {
            closeGuidePlanningWorkspace();
            return;
          }

          const addCurrencyBtn = event.target.closest("#costCentersAddCurrencyBtn");
          if (addCurrencyBtn) {
            event.preventDefault();
            addFallbackCostCenterCurrency(addCurrencyBtn.getAttribute("data-project-key") || "");
            renderFallbackCostCentersWorkspace();
            return;
          }

          const addPositionBtn = event.target.closest("#costCentersAddPositionBtn");
          if (addPositionBtn) {
            event.preventDefault();
            addFallbackCostCenterPosition($("costCentersWorkspace")?.dataset.currentProjectKey || "");
            renderFallbackCostCentersWorkspace();
            return;
          }

          const removePositionBtn = event.target.closest("[data-fallback-cost-center-remove-position]");
          if (removePositionBtn) {
            event.preventDefault();
            removeFallbackCostCenterPosition(
              removePositionBtn.getAttribute("data-project-key") || "",
              removePositionBtn.getAttribute("data-fallback-cost-center-remove-position") || ""
            );
            renderFallbackCostCentersWorkspace();
            return;
          }

          if (event.target.closest("#costCentersImportRatesBtn")) {
            event.preventDefault();
            $("costCentersHourlyRateImportInput")?.click();
            return;
          }

          if (event.target.closest("#refreshCostCentersWorkspaceBtn")) {
            event.preventDefault();
            renderFallbackCostCentersWorkspace();
            return;
          }

          if (event.target.closest("#refreshCurrencyExchangeWorkspaceBtn")) {
            event.preventDefault();
            renderFallbackCurrencyExchangeWorkspace();
            return;
          }

          if (event.target.closest("#refreshFirmingRulesWorkspaceBtn")) {
            event.preventDefault();
            renderFallbackFirmingRulesWorkspace();
            return;
          }

          if (event.target.closest("#refreshPriceListsWorkspaceBtn")) {
            event.preventDefault();
            renderFallbackPriceListsWorkspace();
            return;
          }

          const addPriceListRowBtn = event.target.closest("#priceListsAddRowBtn");
          if (addPriceListRowBtn) {
            event.preventDefault();
            const projectKey = addPriceListRowBtn.getAttribute("data-project-key") || "";
            saveFallbackPriceListsProjectConfig(projectKey, function (config) {
              if (config.count <= 0) return config;
              return Object.assign({}, config, { rows: config.rows.concat([createFallbackPriceListRow()]) });
            });
            $("priceListsWorkspace").dataset.currentProjectKey = projectKey;
            renderFallbackPriceListsWorkspace();
            return;
          }

          const removePriceListRowBtn = event.target.closest("[data-fallback-price-list-row-remove]");
          if (removePriceListRowBtn) {
            event.preventDefault();
            const projectKey = removePriceListRowBtn.getAttribute("data-project-key") || "";
            const rowId = removePriceListRowBtn.getAttribute("data-row-id") || "";
            saveFallbackPriceListsProjectConfig(projectKey, function (config) {
              return Object.assign({}, config, {
                rows: config.rows.filter(function (row) { return row.id !== rowId; }),
              });
            });
            $("priceListsWorkspace").dataset.currentProjectKey = projectKey;
            renderFallbackPriceListsWorkspace();
            return;
          }

          if (event.target.closest("#closeWorkloadSynthesisWorkspaceBtn")) {
            const tog = $("workloadSynthesisEditToggle");
            if (tog) tog.dataset.active = "false";
            closeWorkloadSynthesisWorkspace();
            return;
          }

          if (event.target.closest("#refreshWorkloadSynthesisWorkspaceBtn")) {
            event.preventDefault();
            renderFallbackWorkloadSynthesisWorkspace();
            return;
          }

          if (event.target.closest("#workloadSynthesisEditToggle")) {
            event.preventDefault();
            const tog = $("workloadSynthesisEditToggle");
            if (tog) tog.dataset.active = tog.dataset.active === "true" ? "false" : "true";
            renderFallbackWorkloadSynthesisWorkspace();
            return;
          }

          if (event.target.closest("#workloadSynthesisAddRowBtn")) {
            event.preventDefault();
            const ws = $("workloadSynthesisWorkspace");
            const projKey = ws && ws.dataset.currentProjectKey;
            if (!projKey) return;
            addWorkloadExtraRow(projKey);
            renderFallbackWorkloadSynthesisWorkspace();
            return;
          }

          const deleteExtraBtn = event.target.closest("[data-fallback-workload-delete-extra]");
          if (deleteExtraBtn) {
            event.preventDefault();
            const projKey = deleteExtraBtn.getAttribute("data-project-key") || "";
            const rowId   = deleteExtraBtn.getAttribute("data-row-id") || "";
            if (projKey && rowId) {
              deleteWorkloadExtraRow(projKey, rowId);
              renderFallbackWorkloadSynthesisWorkspace();
            }
            return;
          }

          const workloadImportBtn = event.target.closest("[data-fallback-workload-import-btn]");
          if (workloadImportBtn) {
            event.preventDefault();
            const fileInput = $("workloadExcelFileInput");
            if (!fileInput) return;
            fileInput.dataset.projectKey = workloadImportBtn.getAttribute("data-project-key") || "";
            fileInput.value = "";
            fileInput.click();
            return;
          }

          const workloadResetBtn = event.target.closest("[data-fallback-workload-reset-import]");
          if (workloadResetBtn) {
            event.preventDefault();
            const projKey = workloadResetBtn.getAttribute("data-project-key") || "";
            if (projKey) {
              const allOverrides = readWorkloadOverridesFallbackState();
              const projOverrides = Object.assign({}, allOverrides[projKey] || {});
              delete projOverrides.importedRows;
              allOverrides[projKey] = projOverrides;
              writeWorkloadOverridesFallbackState(allOverrides);
              renderFallbackWorkloadSynthesisWorkspace();
            }
            return;
          }

          if (event.target.closest("#closeWhiteCollarWorkspaceBtn")) {
            closeWhiteCollarDefinitionWorkspace();
            return;
          }

          if (event.target.closest("#closeWbsWorkspaceBtn")) {
            closeWbsWorkspace();
            return;
          }

          if (event.target.closest("#closeSubsystemSummaryWorkspaceBtn")) {
            closeSubsystemSummaryWorkspace();
            return;
          }

          if (event.target.closest("#refreshWbsWorkspaceBtn")) {
            event.preventDefault();
            renderFallbackWbsWorkspace();
            return;
          }

          if (event.target.closest("#refreshSubsystemSummaryWorkspaceBtn")) {
            event.preventDefault();
            renderSubsystemSummaryWorkspace();
            return;
          }

          const subsystemSummaryProjectBtn = event.target.closest("[data-subsystem-summary-project-select]");
          if (subsystemSummaryProjectBtn) {
            event.preventDefault();
            const ws = $("subsystemSummaryWorkspace");
            if (ws) {
              ws.dataset.currentProjectKey = subsystemSummaryProjectBtn.getAttribute("data-subsystem-summary-project-select") || "";
              ws.dataset.currentFileKey = "global";
            }
            renderSubsystemSummaryWorkspace();
            return;
          }

          const subsystemSummaryFileBtn = event.target.closest("[data-subsystem-summary-file-select]");
          if (subsystemSummaryFileBtn) {
            event.preventDefault();
            const ws = $("subsystemSummaryWorkspace");
            if (ws) ws.dataset.currentFileKey = subsystemSummaryFileBtn.getAttribute("data-subsystem-summary-file-select") || "";
            renderSubsystemSummaryWorkspace();
            return;
          }

          if (event.target.closest("#subsystemSummaryExportBtn")) {
            event.preventDefault();
            const ws = $("subsystemSummaryWorkspace");
            const projects = buildSubsystemSummaryProjects();
            const project = projects.find(function (entry) { return ws && entry.projectKey === ws.dataset.currentProjectKey; }) || projects[0] || null;
            if (!project) return;
            const files = buildSubsystemSummaryVirtualFiles(project);
            const fileKey = ws ? (ws.dataset.currentFileKey || "global") : "global";
            const file = files.find(function (entry) { return entry.key === fileKey; }) || files[0] || null;
            exportSubsystemSummaryFile(file);
            return;
          }

          if (event.target.closest("#wbsWorkloadToggleBtn")) {
            event.preventDefault();
            const ws = $("wbsWorkspace");
            if (ws) ws.dataset.wbsWorkloadCollapsed = ws.dataset.wbsWorkloadCollapsed === "true" ? "false" : "true";
            renderFallbackWbsWorkspace();
            return;
          }

          if (event.target.closest("#wbsMaterialsToggleBtn")) {
            event.preventDefault();
            const ws = $("wbsWorkspace");
            if (ws) ws.dataset.wbsMaterialsCollapsed = ws.dataset.wbsMaterialsCollapsed === "true" ? "false" : "true";
            renderFallbackWbsWorkspace();
            return;
          }

          if (event.target.closest("#wbsSubcontractingToggleBtn")) {
            event.preventDefault();
            const ws = $("wbsWorkspace");
            if (ws) ws.dataset.wbsSubcontractingCollapsed = ws.dataset.wbsSubcontractingCollapsed === "true" ? "false" : "true";
            renderFallbackWbsWorkspace();
            return;
          }

          if (event.target.closest("#wbsOverhaulRenewalsToggleBtn")) {
            event.preventDefault();
            const ws = $("wbsWorkspace");
            if (ws) ws.dataset.wbsOverhaulRenewalsCollapsed = ws.dataset.wbsOverhaulRenewalsCollapsed === "true" ? "false" : "true";
            renderFallbackWbsWorkspace();
            return;
          }

          const wbsProjectBtn = event.target.closest("[data-wbs-project-select]");
          if (wbsProjectBtn) {
            event.preventDefault();
            const ws = $("wbsWorkspace");
            if (ws) ws.dataset.currentProjectKey = wbsProjectBtn.getAttribute("data-wbs-project-select") || "";
            renderFallbackWbsWorkspace();
            return;
          }

          if (event.target.closest("#refreshWhiteCollarWorkspaceBtn")) {
            event.preventDefault();
            renderFallbackWhiteCollarWorkspace();
            return;
          }

          const wcProjectBtn = event.target.closest("[data-wc-project-select]");
          if (wcProjectBtn) {
            event.preventDefault();
            const ws = $("whiteCollarDefinitionWorkspace");
            if (ws) ws.dataset.currentProjectKey = wcProjectBtn.getAttribute("data-wc-project-select") || "";
            renderFallbackWhiteCollarWorkspace();
            return;
          }

          const wcPhaseToggle = event.target.closest("[data-wc-phase-toggle]");
          if (wcPhaseToggle) {
            event.preventDefault();
            const ws = $("whiteCollarDefinitionWorkspace");
            if (!ws) return;
            const phaseKey = wcPhaseToggle.getAttribute("data-wc-phase-toggle") || "";
            let collapsed;
            try { collapsed = new Set(JSON.parse(ws.dataset.wcCollapsed || "[]")); } catch (_e) { collapsed = new Set(); }
            if (collapsed.has(phaseKey)) { collapsed.delete(phaseKey); } else { collapsed.add(phaseKey); }
            ws.dataset.wcCollapsed = JSON.stringify(Array.from(collapsed));
            renderFallbackWhiteCollarWorkspace();
            return;
          }

          if (event.target.closest("#closeTcWorkspaceBtn")) {
            closeToolsConsumablesWorkspace();
            return;
          }

          if (event.target.closest("#refreshTcWorkspaceBtn")) {
            event.preventDefault();
            renderFallbackToolsConsumablesWorkspace();
            return;
          }

          const tcProjectBtn = event.target.closest("[data-tc-project-select]");
          if (tcProjectBtn) {
            event.preventDefault();
            const ws = $("toolsConsumablesWorkspace");
            if (ws) ws.dataset.currentProjectKey = tcProjectBtn.getAttribute("data-tc-project-select") || "";
            renderFallbackToolsConsumablesWorkspace();
            return;
          }

          const tcPhaseToggle = event.target.closest("[data-tc-phase-toggle]");
          if (tcPhaseToggle) {
            event.preventDefault();
            const ws = $("toolsConsumablesWorkspace");
            if (!ws) return;
            const phaseKey = tcPhaseToggle.getAttribute("data-tc-phase-toggle") || "";
            let collapsed;
            try { collapsed = new Set(JSON.parse(ws.dataset.tcCollapsed || "[]")); } catch (_e) { collapsed = new Set(); }
            if (collapsed.has(phaseKey)) { collapsed.delete(phaseKey); } else { collapsed.add(phaseKey); }
            ws.dataset.tcCollapsed = JSON.stringify(Array.from(collapsed));
            renderFallbackToolsConsumablesWorkspace();
            return;
          }

          if (event.target.closest("#closeVehiclesWorkspaceBtn")) {
            closeVehiclesWorkspace();
          closeOscWorkspace();
            return;
          }

          if (event.target.closest("#refreshVehiclesWorkspaceBtn")) {
            event.preventDefault();
            renderFallbackVehiclesWorkspace();
            return;
          }

          const vehiclesProjectBtn = event.target.closest("[data-vehicles-project-select]");
          if (vehiclesProjectBtn) {
            event.preventDefault();
            const ws = $("vehiclesWorkspace");
            if (ws) ws.dataset.currentProjectKey = vehiclesProjectBtn.getAttribute("data-vehicles-project-select") || "";
            renderFallbackVehiclesWorkspace();
            return;
          }

          const vehiclesPhaseToggle = event.target.closest("[data-vehicles-phase-toggle]");
          if (vehiclesPhaseToggle) {
            event.preventDefault();
            const ws = $("vehiclesWorkspace");
            if (!ws) return;
            const phaseKey = vehiclesPhaseToggle.getAttribute("data-vehicles-phase-toggle") || "";
            let collapsed;
            try { collapsed = new Set(JSON.parse(ws.dataset.vehiclesCollapsed || "[]")); } catch (_e) { collapsed = new Set(); }
            if (collapsed.has(phaseKey)) { collapsed.delete(phaseKey); } else { collapsed.add(phaseKey); }
            ws.dataset.vehiclesCollapsed = JSON.stringify(Array.from(collapsed));
            renderFallbackVehiclesWorkspace();
            return;
          }

          if (event.target.closest("#closeOscWorkspaceBtn")) {
            closeOscWorkspace();
            return;
          }

          if (event.target.closest("#refreshOscWorkspaceBtn")) {
            event.preventDefault();
            renderFallbackOscWorkspace();
            return;
          }

          const oscProjectBtn = event.target.closest("[data-osc-project-select]");
          if (oscProjectBtn) {
            event.preventDefault();
            const ws = $("oscWorkspace");
            if (ws) ws.dataset.currentProjectKey = oscProjectBtn.getAttribute("data-osc-project-select") || "";
            renderFallbackOscWorkspace();
            return;
          }

          if (event.target.closest("#closeMtWorkspaceBtn")) {
            closeMandatoryTrainingWorkspace();
            return;
          }

          if (event.target.closest("#refreshMtWorkspaceBtn")) {
            event.preventDefault();
            renderFallbackMandatoryTrainingWorkspace();
            return;
          }

          const mtProjectBtn = event.target.closest("[data-mt-project-select]");
          if (mtProjectBtn) {
            event.preventDefault();
            const ws = $("mandatoryTrainingWorkspace");
            if (ws) ws.dataset.currentProjectKey = mtProjectBtn.getAttribute("data-mt-project-select") || "";
            renderFallbackMandatoryTrainingWorkspace();
            return;
          }

          const mtAddRowBtn = event.target.closest("[data-mt-add-row]");
          if (mtAddRowBtn) {
            event.preventDefault();
            const projectKey = mtAddRowBtn.getAttribute("data-project-key") || "";
            if (!projectKey) return;
            const resolved = resolveMandatoryTrainingProjectRows(projectKey);
            const rows = resolved.rows;
            rows.push({ id: "mt_" + Date.now(), personnelConcerned: "", legalTraining: "", periodicity: 1, costPerPerson: 0, costPerGroup: 0, maxPersPerGroup: 0, currency: "EUR" });
            resolved.state[resolved.storageKey] = rows;
            writeMandatoryTrainingFallbackState(resolved.state);
            renderFallbackMandatoryTrainingWorkspace();
            return;
          }

          const mtDeleteRowBtn = event.target.closest("[data-mt-delete-row]");
          if (mtDeleteRowBtn) {
            event.preventDefault();
            const projectKey = mtDeleteRowBtn.getAttribute("data-project-key") || "";
            const rowId      = mtDeleteRowBtn.getAttribute("data-row-id") || "";
            if (!projectKey || !rowId) return;
            const resolved = resolveMandatoryTrainingProjectRows(projectKey);
            resolved.state[resolved.storageKey] = resolved.rows.filter(function (r) { return r.id !== rowId; });
            writeMandatoryTrainingFallbackState(resolved.state);
            renderFallbackMandatoryTrainingWorkspace();
            return;
          }

          const firmingImportBtn = event.target.closest("[data-fallback-firming-import]");
          if (firmingImportBtn) {
            event.preventDefault();
            const fileInput = $("firmingRulesExcelFileInput");
            if (!fileInput) return;
            fileInput.dataset.projectKey = firmingImportBtn.getAttribute("data-project-key") || "";
            fileInput.dataset.bidYear = firmingImportBtn.getAttribute("data-bid-year") || "";
            fileInput.dataset.currencies = firmingImportBtn.getAttribute("data-currencies") || "[]";
            fileInput.value = "";
            fileInput.click();
            return;
          }

          const addCurrencyExchangeBtn = event.target.closest("#currencyExchangeAddCurrencyBtn");
          if (addCurrencyExchangeBtn) {
            event.preventDefault();
            addFallbackCurrencyExchangeCurrency(addCurrencyExchangeBtn.getAttribute("data-project-key") || "");
            renderFallbackCurrencyExchangeWorkspace();
            return;
          }

          if (event.target.closest("#refreshPioDefinitionWorkspaceBtn")) {
            event.preventDefault();
            renderFallbackPioDefinitionWorkspace();
            return;
          }

          if (event.target.closest("#refreshGuidePlanningWorkspaceBtn")) {
            event.preventDefault();
            renderFallbackGuidePlanningWorkspace();
            return;
          }

          if (event.target.closest("#pioDefinitionAddOriginBtn")) {
            event.preventDefault();
            addFallbackPioDefinitionOrigin($("pioDefinitionWorkspace")?.dataset.currentProjectKey || "");
            renderFallbackPioDefinitionWorkspace();
            return;
          }

          if (event.target.closest("#closeModuleDrawerBtn") || event.target.closest("#moduleDrawerBackdrop")) {
            closeDrawer();
            return;
          }

          if (!event.target.closest("[data-toolbar-root]")) {
            closeMenus();
          }
        });

        document.addEventListener("keydown", function (event) {
          if (window.__costSummaryModuleReady && !fallbackInteractionIsActive()) return;
          if (event.key === "Escape") {
            closeMenus();
            closeDrawer();
            closeProjectPhasesWorkspace();
            closeGuidePlanningWorkspace();
            closeCostCentersWorkspace();
            closeCurrencyExchangeWorkspace();
            closeFirmingRulesWorkspace();
            closePioDefinitionWorkspace();
            closeWorkloadSynthesisWorkspace();
            closeWbsWorkspace();
            closePriceListsWorkspace();
            closeSubsystemSummaryWorkspace();
          }
        });

        document.addEventListener("change", function (event) {
          if (event.target.id === "importConfigJsonInput") {
            const fileInput = event.target;
            const file = fileInput.files && fileInput.files[0];
            importCostSummaryConfigJsonFile(file);
            fileInput.value = "";
            return;
          }

          if (window.__costSummaryModuleReady && !fallbackInteractionIsActive()) return;

          if (event.target.id === "subsystemSummarySheetSelect") {
            const ws = $("subsystemSummaryWorkspace");
            const projects = buildSubsystemSummaryProjects();
            const project = projects.find(function (entry) { return ws && entry.projectKey === ws.dataset.currentProjectKey; }) || projects[0] || null;
            if (!project) return;
            const files = buildSubsystemSummaryVirtualFiles(project);
            const file = files.find(function (entry) { return ws && entry.key === ws.dataset.currentFileKey; }) || files[0] || null;
            renderSubsystemSummaryPreview(project, file);
            return;
          }

          if (event.target.id === "priceListsCountSelect") {
            const projectKey = event.target.getAttribute("data-project-key") || "";
            const count = Math.max(0, Math.min(9, Math.round(toNumber(event.target.value) || 0)));
            saveFallbackPriceListsProjectConfig(projectKey, function (config) {
              const mappings = config.textMappings.map(function (mapping) {
                const clientMatch = String(mapping || "").match(/^Client Price List\s+(\d+)$/i);
                if (clientMatch && Number(clientMatch[1]) > count) return "Not applicable";
                return mapping || "Not applicable";
              });
              return Object.assign({}, config, { count: count, textMappings: mappings });
            });
            $("priceListsWorkspace").dataset.currentProjectKey = projectKey;
            renderFallbackPriceListsWorkspace();
            return;
          }

          const priceListTextMap = event.target.closest("[data-fallback-price-list-text-map]");
          if (priceListTextMap) {
            const projectKey = priceListTextMap.getAttribute("data-project-key") || "";
            const index = Math.max(0, Math.min(8, Math.round(toNumber(priceListTextMap.getAttribute("data-index")) || 0)));
            saveFallbackPriceListsProjectConfig(projectKey, function (config) {
              const textMappings = config.textMappings.slice();
              textMappings[index] = priceListTextMap.value || "Not applicable";
              return Object.assign({}, config, { textMappings: textMappings });
            });
            return;
          }

          const priceListCell = event.target.closest("[data-fallback-price-list-cell]");
          if (priceListCell) {
            const projectKey = priceListCell.getAttribute("data-project-key") || "";
            const rowId = priceListCell.getAttribute("data-row-id") || "";
            const field = priceListCell.getAttribute("data-field") || "";
            saveFallbackPriceListsProjectConfig(projectKey, function (config) {
              return Object.assign({}, config, {
                rows: config.rows.map(function (row) {
                  if (row.id !== rowId) return row;
                  const values = Object.assign({}, row.values || {});
                  values[field] = priceListCell.value || "";
                  return Object.assign({}, row, { values: values });
                }),
              });
            });
            return;
          }

          const projectField = event.target.closest("[data-fallback-project-field]");
          if (projectField) {
            const projectKey = projectField.getAttribute("data-project-key");
            const field = projectField.getAttribute("data-fallback-project-field");
            const rawValue = projectField.value;
            saveFallbackProjectField(
              projectKey,
              field,
              (field === "maxMobilisationMonths" || field === "warrantyDurationMonths") ? (toNumber(rawValue) || 0) : rawValue
            );
            $("projectPhasesWorkspace").dataset.currentProjectKey = projectKey || "";
            renderFallbackProjectPhasesDrawer(moduleDefinitions.study_setup, moduleDefinitions.study_setup.items.project_phases);
            return;
          }

          const phaseField = event.target.closest("[data-fallback-phase-field]");
          if (phaseField) {
            const projectKey = phaseField.getAttribute("data-project-key");
            const phaseKey = phaseField.getAttribute("data-phase-key");
            const field = phaseField.getAttribute("data-fallback-phase-field");
            const rawValue = phaseField.value;
            saveFallbackPhaseField(
              projectKey,
              phaseKey,
              field,
              field === "durationYears" ? (toNumber(rawValue) || 0) : rawValue
            );
            $("projectPhasesWorkspace").dataset.currentProjectKey = projectKey || "";
            renderFallbackProjectPhasesDrawer(moduleDefinitions.study_setup, moduleDefinitions.study_setup.items.project_phases);
          }

          const guideMobilisationMonthsField = event.target.closest("[data-fallback-guide-mobilisation-months]");
          if (guideMobilisationMonthsField) {
            saveFallbackGuidePlanningMonths(
              guideMobilisationMonthsField.getAttribute("data-project-key") || "",
              guideMobilisationMonthsField.getAttribute("data-position") || "",
              Math.max(0, toNumber(guideMobilisationMonthsField.value) || 0)
            );
            $("guidePlanningWorkspace").dataset.currentProjectKey = guideMobilisationMonthsField.getAttribute("data-project-key") || "";
            renderFallbackGuidePlanningWorkspace();
            return;
          }

          const guideDemobilisationMonthsField = event.target.closest("[data-fallback-guide-demobilisation-months]");
          if (guideDemobilisationMonthsField) {
            saveFallbackGuidePlanningDemobilisationMonths(
              guideDemobilisationMonthsField.getAttribute("data-project-key") || "",
              guideDemobilisationMonthsField.getAttribute("data-position") || "",
              Math.max(0, toNumber(guideDemobilisationMonthsField.value) || 0)
            );
            $("guidePlanningWorkspace").dataset.currentProjectKey = guideDemobilisationMonthsField.getAttribute("data-project-key") || "";
            renderFallbackGuidePlanningWorkspace();
            return;
          }

          const guideDemobilisationMaterialMonthsField = event.target.closest("[data-fallback-guide-demobilisation-material-months]");
          if (guideDemobilisationMaterialMonthsField) {
            saveFallbackGuidePlanningDemobilisationMaterialMonths(
              guideDemobilisationMaterialMonthsField.getAttribute("data-project-key") || "",
              guideDemobilisationMaterialMonthsField.getAttribute("data-material-type") || "",
              Math.max(0, toNumber(guideDemobilisationMaterialMonthsField.value) || 0)
            );
            $("guidePlanningWorkspace").dataset.currentProjectKey = guideDemobilisationMaterialMonthsField.getAttribute("data-project-key") || "";
            renderFallbackGuidePlanningWorkspace();
            return;
          }

          const guideDemobilisationSubcontractingMonthsField = event.target.closest("[data-fallback-guide-demobilisation-subcontracting-months]");
          if (guideDemobilisationSubcontractingMonthsField) {
            saveFallbackGuidePlanningDemobilisationSubcontractingMonths(
              guideDemobilisationSubcontractingMonthsField.getAttribute("data-project-key") || "",
              guideDemobilisationSubcontractingMonthsField.getAttribute("data-subcontracting-type") || "",
              Math.max(0, toNumber(guideDemobilisationSubcontractingMonthsField.value) || 0)
            );
            $("guidePlanningWorkspace").dataset.currentProjectKey = guideDemobilisationSubcontractingMonthsField.getAttribute("data-project-key") || "";
            renderFallbackGuidePlanningWorkspace();
            return;
          }

          const guideMaterialTypeField = event.target.closest("[data-fallback-guide-material-type]");
          if (guideMaterialTypeField) {
            const projectKey = guideMaterialTypeField.getAttribute("data-project-key") || "";
            const selectedMaterialTypes = Array.from(document.querySelectorAll('[data-fallback-guide-material-type][data-project-key="' + projectKey + '"]:checked'))
              .map(function (input) { return input.getAttribute("data-fallback-guide-material-type") || ""; })
              .filter(Boolean);
            const current = readGuidePlanningFallbackState();
            const nextProject = Object.assign({}, current[projectKey] || {});
            nextProject.selectedMaterialTypes = selectedMaterialTypes;
            current[projectKey] = nextProject;
            writeGuidePlanningFallbackState(current);
            $("guidePlanningWorkspace").dataset.currentProjectKey = projectKey;
            renderFallbackGuidePlanningWorkspace();
            return;
          }

          const guideRecurrentMaterialTypeField = event.target.closest("[data-fallback-guide-recurrent-material-type]");
          if (guideRecurrentMaterialTypeField) {
            const projectKey = guideRecurrentMaterialTypeField.getAttribute("data-project-key") || "";
            const selectedRecurrentMaterialTypes = Array.from(document.querySelectorAll('[data-fallback-guide-recurrent-material-type][data-project-key="' + projectKey + '"]:checked'))
              .map(function (input) { return input.getAttribute("data-fallback-guide-recurrent-material-type") || ""; })
              .filter(Boolean);
            const current = readGuidePlanningFallbackState();
            const nextProject = Object.assign({}, current[projectKey] || {});
            nextProject.selectedRecurrentMaterialTypes = selectedRecurrentMaterialTypes;
            current[projectKey] = nextProject;
            writeGuidePlanningFallbackState(current);
            $("guidePlanningWorkspace").dataset.currentProjectKey = projectKey;
            renderFallbackGuidePlanningWorkspace();
            return;
          }

          const guideRecurrentMaterialToggleAll = event.target.closest("[data-fallback-guide-recurrent-material-toggle-all]");
          if (guideRecurrentMaterialToggleAll) {
            const projectKey = guideRecurrentMaterialToggleAll.getAttribute("data-project-key") || "";
            const project = buildFallbackGuidePlanningProjects().find(function (item) { return item.projectKey === projectKey; });
            const current = readGuidePlanningFallbackState();
            const nextProject = Object.assign({}, current[projectKey] || {});
            nextProject.selectedRecurrentMaterialTypes = guideRecurrentMaterialToggleAll.checked && project
              ? project.recurrentMaterialCatalog.slice()
              : [];
            current[projectKey] = nextProject;
            writeGuidePlanningFallbackState(current);
            $("guidePlanningWorkspace").dataset.currentProjectKey = projectKey;
            renderFallbackGuidePlanningWorkspace();
            return;
          }

          const guideRecurrentSubcontractingTypeField = event.target.closest("[data-fallback-guide-recurrent-subcontracting-type]");
          if (guideRecurrentSubcontractingTypeField) {
            const projectKey = guideRecurrentSubcontractingTypeField.getAttribute("data-project-key") || "";
            const selectedRecurrentSubcontractingTypes = Array.from(document.querySelectorAll('[data-fallback-guide-recurrent-subcontracting-type][data-project-key="' + projectKey + '"]:checked'))
              .map(function (input) { return input.getAttribute("data-fallback-guide-recurrent-subcontracting-type") || ""; })
              .filter(Boolean);
            const current = readGuidePlanningFallbackState();
            const nextProject = Object.assign({}, current[projectKey] || {});
            nextProject.selectedRecurrentSubcontractingTypes = selectedRecurrentSubcontractingTypes;
            current[projectKey] = nextProject;
            writeGuidePlanningFallbackState(current);
            $("guidePlanningWorkspace").dataset.currentProjectKey = projectKey;
            renderFallbackGuidePlanningWorkspace();
            return;
          }

          const guideRecurrentSubcontractingToggleAll = event.target.closest("[data-fallback-guide-recurrent-subcontracting-toggle-all]");
          if (guideRecurrentSubcontractingToggleAll) {
            const projectKey = guideRecurrentSubcontractingToggleAll.getAttribute("data-project-key") || "";
            const project = buildFallbackGuidePlanningProjects().find(function (item) { return item.projectKey === projectKey; });
            const current = readGuidePlanningFallbackState();
            const nextProject = Object.assign({}, current[projectKey] || {});
            nextProject.selectedRecurrentSubcontractingTypes = guideRecurrentSubcontractingToggleAll.checked && project
              ? project.recurrentSubcontractingCatalog.slice()
              : [];
            current[projectKey] = nextProject;
            writeGuidePlanningFallbackState(current);
            $("guidePlanningWorkspace").dataset.currentProjectKey = projectKey;
            renderFallbackGuidePlanningWorkspace();
            return;
          }

          const guideSubcontractingTypeField = event.target.closest("[data-fallback-guide-subcontracting-type]");
          if (guideSubcontractingTypeField) {
            const projectKey = guideSubcontractingTypeField.getAttribute("data-project-key") || "";
            const selectedSubcontractingTypes = Array.from(document.querySelectorAll('[data-fallback-guide-subcontracting-type][data-project-key="' + projectKey + '"]:checked'))
              .map(function (input) { return input.getAttribute("data-fallback-guide-subcontracting-type") || ""; })
              .filter(Boolean);
            const current = readGuidePlanningFallbackState();
            const nextProject = Object.assign({}, current[projectKey] || {});
            nextProject.selectedSubcontractingTypes = selectedSubcontractingTypes;
            current[projectKey] = nextProject;
            writeGuidePlanningFallbackState(current);
            $("guidePlanningWorkspace").dataset.currentProjectKey = projectKey;
            renderFallbackGuidePlanningWorkspace();
            return;
          }

          const guideCustomRowField = event.target.closest("[data-fallback-guide-custom-row-field]");
          if (guideCustomRowField) {
            const projectKey = guideCustomRowField.getAttribute("data-project-key") || "";
            const rowType = guideCustomRowField.getAttribute("data-row-type") || "";
            const rowId = guideCustomRowField.getAttribute("data-row-id") || "";
            const field = guideCustomRowField.getAttribute("data-fallback-guide-custom-row-field") || "";
            saveFallbackGuidePlanningCustomRowField(projectKey, rowType, rowId, field, guideCustomRowField.value || "");
            return;
          }

          const guideRiskField = event.target.closest("[data-fallback-guide-risk-field]");
          if (guideRiskField) {
            const projectKey = guideRiskField.getAttribute("data-project-key") || "";
            const rowId = guideRiskField.getAttribute("data-row-id") || "";
            const field = guideRiskField.getAttribute("data-fallback-guide-risk-field") || "";
            saveFallbackGuidePlanningRiskField(projectKey, rowId, field, guideRiskField.value || "");
            $("guidePlanningWorkspace").dataset.currentProjectKey = projectKey;
            renderFallbackGuidePlanningWorkspace();
            return;
          }

          const projectCurrencySelect = event.target.closest("#costCentersProjectCurrencySelect");
          if (projectCurrencySelect) {
            saveFallbackCostCenterProjectField(projectCurrencySelect.getAttribute("data-project-key") || "", "projectCurrency", projectCurrencySelect.value || "EUR");
            renderFallbackCostCentersWorkspace();
            return;
          }

          const currencyExchangeTargetSelect = event.target.closest("#currencyExchangeTargetCurrencySelect");
          if (currencyExchangeTargetSelect) {
            saveFallbackCurrencyExchangeProjectField(
              currencyExchangeTargetSelect.getAttribute("data-project-key") || "",
              "targetCurrency",
              String(currencyExchangeTargetSelect.value || "EUR").toUpperCase()
            );
            renderFallbackCurrencyExchangeWorkspace();
            return;
          }

          const currencyExchangeManualInput = event.target.closest("[data-fallback-currency-manual]");
          if (currencyExchangeManualInput) {
            saveFallbackCurrencyExchangeManualOverride(
              currencyExchangeManualInput.getAttribute("data-project-key") || "",
              String(currencyExchangeManualInput.getAttribute("data-currency") || "").toUpperCase(),
              toNumber(currencyExchangeManualInput.value)
            );
            renderFallbackCurrencyExchangeWorkspace();
            return;
          }

          const workloadCellInput = event.target.closest("[data-fallback-workload-cell]");
          if (workloadCellInput) {
            saveWorkloadCellOverride(
              workloadCellInput.getAttribute("data-project-key") || "",
              workloadCellInput.getAttribute("data-row-key") || "",
              workloadCellInput.getAttribute("data-col") || "",
              workloadCellInput.value,
              workloadCellInput.getAttribute("data-is-pct") === "1"
            );
            const wcWs = $("whiteCollarDefinitionWorkspace");
            if (wcWs && !wcWs.classList.contains("hidden")) renderFallbackWhiteCollarWorkspace();
            return;
          }

          const extraCellInput = event.target.closest("[data-fallback-workload-extra-cell]");
          if (extraCellInput) {
            const projKey = extraCellInput.getAttribute("data-project-key") || "";
            const rowId   = extraCellInput.getAttribute("data-row-id") || "";
            const col     = extraCellInput.getAttribute("data-col") || "";
            saveWorkloadExtraRowField(projKey, rowId, col, extraCellInput.value);
            // Re-render only when shift changes (to update badge colour), otherwise save silently
            if (col === "shift") {
              renderFallbackWorkloadSynthesisWorkspace();
            }
            return;
          }

          const wcCellInput = event.target.closest("[data-wc-cell]");
          if (wcCellInput) {
            saveWhiteCollarCellOverride(
              wcCellInput.getAttribute("data-project-key") || "",
              wcCellInput.getAttribute("data-phase-key")  || "",
              wcCellInput.getAttribute("data-subsystem")  || "",
              wcCellInput.getAttribute("data-period")     || "",
              wcCellInput.getAttribute("data-col")        || "",
              wcCellInput.value
            );
            renderFallbackWhiteCollarWorkspace();
            return;
          }

          const wctCellInput = event.target.closest("[data-wct-cell]");
          if (wctCellInput) {
            saveWhiteCollarQuantityOverride(
              wctCellInput.getAttribute("data-project-key") || "",
              wctCellInput.getAttribute("data-phase-key")   || "",
              wctCellInput.getAttribute("data-period")      || "",
              wctCellInput.getAttribute("data-position")    || "",
              wctCellInput.value
            );
            renderFallbackWhiteCollarWorkspace();
            return;
          }

          const wbsRowField = event.target.closest("[data-wbs-row-field]");
          if (wbsRowField) {
            saveWbsRowField(
              wbsRowField.getAttribute("data-project-key") || "",
              wbsRowField.getAttribute("data-row-key") || "",
              wbsRowField.getAttribute("data-wbs-row-field") || "",
              wbsRowField.value || ""
            );
            return;
          }

          const wbsMaterialRowField = event.target.closest("[data-wbs-material-row-field]");
          if (wbsMaterialRowField) {
            saveWbsMaterialRowField(
              wbsMaterialRowField.getAttribute("data-project-key") || "",
              wbsMaterialRowField.getAttribute("data-row-key") || "",
              wbsMaterialRowField.getAttribute("data-wbs-material-row-field") || "",
              wbsMaterialRowField.value || ""
            );
            return;
          }

          const wbsSubcontractingRowField = event.target.closest("[data-wbs-subcontracting-row-field]");
          if (wbsSubcontractingRowField) {
            saveWbsSubcontractingRowField(
              wbsSubcontractingRowField.getAttribute("data-project-key") || "",
              wbsSubcontractingRowField.getAttribute("data-row-key") || "",
              wbsSubcontractingRowField.getAttribute("data-wbs-subcontracting-row-field") || "",
              wbsSubcontractingRowField.value || ""
            );
            return;
          }

          const wbsOverhaulRenewalRowField = event.target.closest("[data-wbs-overhaul-renewal-row-field]");
          if (wbsOverhaulRenewalRowField) {
            saveWbsOverhaulRenewalRowField(
              wbsOverhaulRenewalRowField.getAttribute("data-project-key") || "",
              wbsOverhaulRenewalRowField.getAttribute("data-row-key") || "",
              wbsOverhaulRenewalRowField.getAttribute("data-wbs-overhaul-renewal-row-field") || "",
              wbsOverhaulRenewalRowField.value || ""
            );
            return;
          }

          const tcCellInput = event.target.closest("[data-tc-cell]");
          if (tcCellInput) {
            saveTcCellOverride(
              tcCellInput.getAttribute("data-project-key") || "",
              tcCellInput.getAttribute("data-phase-key")   || "",
              tcCellInput.getAttribute("data-subsystem")   || "",
              tcCellInput.getAttribute("data-period")      || "",
              tcCellInput.getAttribute("data-col")         || "",
              tcCellInput.value,
              tcCellInput.getAttribute("data-tc-rate")     || "1"
            );
            return;
          }

          if (event.target.id === "tcCurrencySelect") {
            const ws = $("toolsConsumablesWorkspace");
            if (ws) ws.dataset.tcCurrency = event.target.value || "EUR";
            renderFallbackToolsConsumablesWorkspace();
            return;
          }

          if (event.target.id === "wbsExcelFileInput") {
            const fileInput = event.target;
            const file = fileInput.files && fileInput.files[0];
            if (!file) return;
            const ws = $("wbsWorkspace");
            const projectKey = fileInput.dataset.projectKey || ws?.dataset.currentProjectKey || "";
            const projects = buildWbsProjects();
            const cur = findProjectByStoredKey(projects, projectKey);
            if (!cur) { window.alert("No project selected."); fileInput.value = ""; return; }
            importWbsFromExcel(cur.projectKey, file);
            fileInput.value = "";
            return;
          }

          if (event.target.id === "wbsCombinedExcelFileInput") {
            const fileInput = event.target;
            const file = fileInput.files && fileInput.files[0];
            if (!file) return;
            const ws = $("wbsWorkspace");
            const projectKey = fileInput.dataset.projectKey || ws?.dataset.currentProjectKey || "";
            const projects = buildWbsProjects();
            const cur = findProjectByStoredKey(projects, projectKey);
            if (!cur) { window.alert("No project selected."); fileInput.value = ""; return; }
            importWbsCombinedFromExcel(cur.projectKey, file);
            fileInput.value = "";
            return;
          }

          if (event.target.id === "wbsMaterialsExcelFileInput") {
            const fileInput = event.target;
            const file = fileInput.files && fileInput.files[0];
            if (!file) return;
            const ws = $("wbsWorkspace");
            const projectKey = fileInput.dataset.projectKey || ws?.dataset.currentProjectKey || "";
            const projects = buildWbsProjects();
            const cur = findProjectByStoredKey(projects, projectKey);
            if (!cur) { window.alert("No project selected."); fileInput.value = ""; return; }
            importWbsMaterialsFromExcel(cur.projectKey, file);
            fileInput.value = "";
            return;
          }

          if (event.target.id === "wbsSubcontractingExcelFileInput") {
            const fileInput = event.target;
            const file = fileInput.files && fileInput.files[0];
            if (!file) return;
            const ws = $("wbsWorkspace");
            const projectKey = fileInput.dataset.projectKey || ws?.dataset.currentProjectKey || "";
            const projects = buildWbsProjects();
            const cur = findProjectByStoredKey(projects, projectKey);
            if (!cur) { window.alert("No project selected."); fileInput.value = ""; return; }
            importWbsSubcontractingFromExcel(cur.projectKey, file);
            fileInput.value = "";
            return;
          }

          if (event.target.id === "wbsOverhaulRenewalsExcelFileInput") {
            const fileInput = event.target;
            const file = fileInput.files && fileInput.files[0];
            if (!file) return;
            const ws = $("wbsWorkspace");
            const projectKey = fileInput.dataset.projectKey || ws?.dataset.currentProjectKey || "";
            const projects = buildWbsProjects();
            const cur = findProjectByStoredKey(projects, projectKey);
            if (!cur) { window.alert("No project selected."); fileInput.value = ""; return; }
            importWbsOverhaulRenewalFromExcel(cur.projectKey, file);
            fileInput.value = "";
            return;
          }

          if (event.target.id === "tcExcelFileInput") {
            const fileInput = event.target;
            const file = fileInput.files && fileInput.files[0];
            if (!file) return;
            const ws = $("toolsConsumablesWorkspace");
            const projectKey = fileInput.dataset.projectKey || ws?.dataset.currentProjectKey || "";
            const projects = buildToolsConsumablesProjects();
            const cur = findProjectByStoredKey(projects, projectKey);
            if (!cur) { window.alert("No project selected."); fileInput.value = ""; return; }
            importToolsConsumablesFromExcel(cur.projectKey, cur.phases, cur.subsystems, file);
            fileInput.value = "";
            return;
          }

          const vehiclesCellInput = event.target.closest("[data-vehicles-cell]");
          if (vehiclesCellInput) {
            saveVehiclesCellOverride(
              vehiclesCellInput.getAttribute("data-project-key") || "",
              vehiclesCellInput.getAttribute("data-phase-key")   || "",
              vehiclesCellInput.getAttribute("data-subsystem")   || "",
              vehiclesCellInput.getAttribute("data-period")      || "",
              vehiclesCellInput.getAttribute("data-col")         || "",
              vehiclesCellInput.value,
              vehiclesCellInput.getAttribute("data-vehicles-rate") || "1"
            );
            return;
          }

          if (event.target.id === "vehiclesCurrencySelect") {
            const ws = $("vehiclesWorkspace");
            if (ws) ws.dataset.vehiclesCurrency = event.target.value || "EUR";
            renderFallbackVehiclesWorkspace();
            return;
          }

          if (event.target.id === "vehiclesExcelFileInput") {
            const fileInput = event.target;
            const file = fileInput.files && fileInput.files[0];
            if (!file) return;
            const ws = $("vehiclesWorkspace");
            const projectKey = ws?.dataset.currentProjectKey || "";
            const projects = buildVehiclesProjects();
            const cur = findProjectByStoredKey(projects, projectKey);
            if (!cur) { window.alert("No project selected."); fileInput.value = ""; return; }
            importVehiclesFromExcel(cur.projectKey, cur.phases, cur.subsystems, file);
            fileInput.value = "";
            return;
          }

          const oscCellInput = event.target.closest("[data-osc-cell]");
          if (oscCellInput) {
            saveOscCellOverride(
              oscCellInput.getAttribute("data-project-key") || "",
              oscCellInput.getAttribute("data-phase-key")   || "",
              oscCellInput.getAttribute("data-period")      || "",
              oscCellInput.getAttribute("data-col")         || "",
              oscCellInput.value,
              oscCellInput.getAttribute("data-osc-rate")    || "1"
            );
            return;
          }

          if (event.target.id === "oscCurrencySelect") {
            const ws = $("oscWorkspace");
            if (ws) ws.dataset.oscCurrency = event.target.value || "EUR";
            renderFallbackOscWorkspace();
            return;
          }

          if (event.target.id === "oscExcelFileInput") {
            const fileInput = event.target;
            const file = fileInput.files && fileInput.files[0];
            if (!file) return;
            const ws = $("oscWorkspace");
            const projectKey = ws?.dataset.currentProjectKey || "";
            const projects = buildOscProjects();
            const cur = findProjectByStoredKey(projects, projectKey);
            if (!cur) { window.alert("No project selected."); fileInput.value = ""; return; }
            importOscFromExcel(cur.projectKey, cur.phases, file);
            fileInput.value = "";
            return;
          }

          const mtCellInput = event.target.closest("[data-mt-cell]");
          if (mtCellInput) {
            const projectKey = mtCellInput.getAttribute("data-project-key") || "";
            const rowId      = mtCellInput.getAttribute("data-row-id")      || "";
            const field      = mtCellInput.getAttribute("data-field")       || "";
            if (!projectKey || !rowId || !field) return;
            const resolved = resolveMandatoryTrainingProjectRows(projectKey);
            const rows = resolved.rows;
            const idx  = rows.findIndex(function (r) { return r.id === rowId; });
            if (idx === -1) return;
            const isNumField = ["periodicity","costPerPerson","costPerGroup","maxPersPerGroup"].indexOf(field) !== -1;
            rows[idx] = Object.assign({}, rows[idx]);
            rows[idx][field] = isNumField ? (toNumber(mtCellInput.value) || 0) : mtCellInput.value;
            resolved.state[resolved.storageKey] = rows;
            writeMandatoryTrainingFallbackState(resolved.state);
            renderFallbackMandatoryTrainingWorkspace();
            return;
          }

          if (event.target.id === "mtCurrencySelect") {
            const ws = $("mandatoryTrainingWorkspace");
            if (ws) ws.dataset.mtCurrency = event.target.value || "EUR";
            renderFallbackMandatoryTrainingWorkspace();
            return;
          }

          if (event.target.id === "mtExcelFileInput") {
            const fileInput = event.target;
            const file = fileInput.files && fileInput.files[0];
            if (!file) return;
            const ws = $("mandatoryTrainingWorkspace");
            const projectKey = ws?.dataset.currentProjectKey || "";
            if (!projectKey) { window.alert("No project selected."); fileInput.value = ""; return; }
            importMandatoryTrainingFromExcel(projectKey, file);
            fileInput.value = "";
            return;
          }

          if (event.target.id === "workloadExcelFileInput") {
            const fileInput = event.target;
            const file = fileInput.files && fileInput.files[0];
            if (!file) return;
            importWorkloadFromExcel(fileInput.dataset.projectKey || "", file);
            return;
          }

          if (event.target.id === "firmingRulesExcelFileInput") {
            const fileInput = event.target;
            const file = fileInput.files && fileInput.files[0];
            if (!file) return;
            const projectKey = fileInput.dataset.projectKey || "";
            const bidYear = fileInput.dataset.bidYear || "";
            let currencies = [];
            try { currencies = JSON.parse(fileInput.dataset.currencies || "[]"); } catch (ex) { currencies = []; }
            importFallbackFirmingRulesFromExcel(projectKey, bidYear, currencies, file);
            return;
          }

          const firmingRuleTextInput = event.target.closest("[data-fallback-firming-rule-text]");
          if (firmingRuleTextInput) {
            saveFallbackFirmingRuleText(
              firmingRuleTextInput.getAttribute("data-project-key") || "",
              String(firmingRuleTextInput.getAttribute("data-currency") || "").toUpperCase(),
              firmingRuleTextInput.value
            );
            return;
          }

          const annualHoursInput = event.target.closest("#costCentersAnnualHoursInput");
          if (annualHoursInput) {
            saveFallbackCostCenterProjectField(annualHoursInput.getAttribute("data-project-key") || "", "annualWorkingHours", toNumber(annualHoursInput.value) !== null ? toNumber(annualHoursInput.value) : 0);
            renderFallbackCostCentersWorkspace();
            if (window.__costSummaryUseFallbackPioDefinition) {
              renderFallbackPioDefinitionWorkspace();
            }
            return;
          }

          const nightPremiumToggle = event.target.closest("#costCentersNightPremiumToggle");
          if (nightPremiumToggle) {
            saveFallbackCostCenterProjectField(nightPremiumToggle.getAttribute("data-project-key") || "", "nightPremiumEnabled", !!nightPremiumToggle.checked);
            renderFallbackCostCentersWorkspace();
            return;
          }

          const nightPremiumPercent = event.target.closest("#costCentersNightPremiumPercent");
          if (nightPremiumPercent) {
            saveFallbackCostCenterProjectField(nightPremiumPercent.getAttribute("data-project-key") || "", "nightPremiumPercent", toNumber(nightPremiumPercent.value) !== null ? toNumber(nightPremiumPercent.value) : 0);
            renderFallbackCostCentersWorkspace();
            return;
          }

          const positionField = event.target.closest("[data-fallback-cost-center-position]");
          if (positionField) {
            const posProjectKey = positionField.getAttribute("data-project-key") || "";
            const checkedPositions = Array.from(
              document.querySelectorAll('[data-fallback-cost-center-position][data-project-key="' + posProjectKey + '"]:checked')
            ).map(function (cb) { return cb.value; });
            const posCurrent = readCostCentersFallbackState();
            const posNextProject = Object.assign({}, posCurrent[posProjectKey] || {});
            posNextProject.selectedPositions = Array.from(new Set(checkedPositions.filter(Boolean)));
            posCurrent[posProjectKey] = posNextProject;
            writeCostCentersFallbackState(posCurrent);
            renderFallbackCostCentersWorkspace();
            return;
          }

          const generalPeriodField = event.target.closest("[data-fallback-cost-center-general-period]");
          if (generalPeriodField) {
            const genProjectKey = generalPeriodField.getAttribute("data-project-key") || "";
            const checkedGeneralPeriods = Array.from(
              document.querySelectorAll('[data-fallback-cost-center-general-period][data-project-key="' + genProjectKey + '"]:checked')
            ).map(function (cb) { return cb.value; });
            const genCurrent = readCostCentersFallbackState();
            const genNextProject = Object.assign({}, genCurrent[genProjectKey] || {});
            genNextProject.generalTimePeriods = checkedGeneralPeriods.length ? checkedGeneralPeriods : ["Day"];
            genCurrent[genProjectKey] = genNextProject;
            writeCostCentersFallbackState(genCurrent);
            renderFallbackCostCentersWorkspace();
            return;
          }

          const engineerPeriodField = event.target.closest("[data-fallback-cost-center-engineer-period]");
          if (engineerPeriodField) {
            const engProjectKey = engineerPeriodField.getAttribute("data-project-key") || "";
            const checkedEngineerPeriods = Array.from(
              document.querySelectorAll('[data-fallback-cost-center-engineer-period][data-project-key="' + engProjectKey + '"]:checked')
            ).map(function (cb) { return cb.value; });
            const engCurrent = readCostCentersFallbackState();
            const engNextProject = Object.assign({}, engCurrent[engProjectKey] || {});
            engNextProject.engineerTimePeriods = checkedEngineerPeriods.length ? checkedEngineerPeriods : ["Day"];
            engCurrent[engProjectKey] = engNextProject;
            writeCostCentersFallbackState(engCurrent);
            renderFallbackCostCentersWorkspace();
            return;
          }

          const rowField = event.target.closest("[data-fallback-cost-center-row-field]");
          if (rowField) {
            saveFallbackCostCenterRowField(
              rowField.getAttribute("data-project-key") || "",
              rowField.getAttribute("data-row-key") || "",
              rowField.getAttribute("data-fallback-cost-center-row-field") || "",
              rowField.value || ""
            );
            renderFallbackCostCentersWorkspace();
            return;
          }

          const pioOriginField = event.target.closest("[data-fallback-pio-origin]");
          if (pioOriginField) {
            toggleFallbackPioDefinitionOrigin(pioOriginField.getAttribute("data-project-key") || "", pioOriginField.value || "", !!pioOriginField.checked);
            renderFallbackPioDefinitionWorkspace();
            return;
          }

          const onshoreFreightInput = event.target.closest("#pioDefinitionOnshoreFreightInput");
          if (onshoreFreightInput) {
            saveFallbackPioDefinitionProjectField(
              onshoreFreightInput.getAttribute("data-project-key") || "",
              "onshoreFreightPercent",
              toNumber(onshoreFreightInput.value) !== null ? toNumber(onshoreFreightInput.value) : 0
            );
            renderFallbackPioDefinitionWorkspace();
            return;
          }

          const offshoreFreightInput = event.target.closest("#pioDefinitionOffshoreFreightInput");
          if (offshoreFreightInput) {
            saveFallbackPioDefinitionProjectField(
              offshoreFreightInput.getAttribute("data-project-key") || "",
              "offshoreFreightPercent",
              toNumber(offshoreFreightInput.value) !== null ? toNumber(offshoreFreightInput.value) : 0
            );
            renderFallbackPioDefinitionWorkspace();
            return;
          }

          const customDutyField = event.target.closest("[data-fallback-pio-custom-duty]");
          if (customDutyField) {
            saveFallbackPioDefinitionCustomDuty(
              customDutyField.getAttribute("data-project-key") || "",
              customDutyField.getAttribute("data-subsystem") || "",
              toNumber(customDutyField.value) !== null ? toNumber(customDutyField.value) : 0
            );
            renderFallbackPioDefinitionWorkspace();
            return;
          }

          const pioRowField = event.target.closest("[data-fallback-pio-row-field]");
          if (pioRowField) {
            saveFallbackPioDefinitionRowField(
              pioRowField.getAttribute("data-project-key") || "",
              pioRowField.getAttribute("data-origin") || "",
              pioRowField.getAttribute("data-fallback-pio-row-field") || "",
              pioRowField.value || ""
            );
            renderFallbackPioDefinitionWorkspace();
            return;
          }

          const hourlyRateImportInput = event.target.closest("#costCentersHourlyRateImportInput");
          if (hourlyRateImportInput && hourlyRateImportInput.files && hourlyRateImportInput.files[0]) {
            importFallbackCostCenterHourlyRates($("costCentersWorkspace")?.dataset.currentProjectKey || "", hourlyRateImportInput.files[0]);
            hourlyRateImportInput.value = "";
          }
        });
      });
    })();
