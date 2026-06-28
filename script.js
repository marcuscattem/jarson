const variables = [
  { key: "braco_relaxado", label: "Braço relaxado", protocol: "", unit: "cm", type: "perimeter" },
  { key: "braco_contraido", label: "Braço contraído", protocol: "", unit: "cm", type: "perimeter" },
  { key: "braco_isak", label: "Braço — ISAK", protocol: "ISAK", unit: "cm", type: "perimeter" },
  { key: "braco_lohman", label: "Braço — Lohman", protocol: "Lohman", unit: "cm", type: "perimeter" },
  { key: "cintura", label: "Cintura", protocol: "", unit: "cm", type: "perimeter" },
  { key: "abdomen", label: "Abdômen", protocol: "", unit: "cm", type: "perimeter" },
  { key: "quadril", label: "Quadril", protocol: "", unit: "cm", type: "perimeter" },
  { key: "panturrilha", label: "Panturrilha", protocol: "", unit: "cm", type: "perimeter" },
  { key: "triceps", label: "Tríceps", protocol: "", unit: "mm", type: "skinfold" }
];

let triplicateResults = [];
let studyResults = [];

const byId = (id) => document.getElementById(id);

function parseNumber(value) {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim().replace(",", ".");
  if (!normalized) return null;
  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
}

function formatNumber(value, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return Number(value).toLocaleString("pt-BR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  });
}

function mean(values) {
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function sampleSd(values, avg) {
  if (values.length < 2) return 0;
  const variance = values.reduce((total, value) => total + (value - avg) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

function getVariable(key) {
  return variables.find((item) => item.key === key);
}

function currentTriplicateLimits() {
  return {
    perimeterCv: parseNumber(byId("limitPerimeterCv").value) ?? 1,
    perimeterAmp: parseNumber(byId("limitPerimeterAmp").value) ?? 0.5,
    skinfoldCv: parseNumber(byId("limitSkinfoldCv").value) ?? 5,
    skinfoldAmp: parseNumber(byId("limitSkinfoldAmp").value) ?? 2
  };
}

function currentEtmLimits() {
  return {
    perimeter: parseNumber(byId("limitEtmPerimeter").value) ?? 1,
    skinfold: parseNumber(byId("limitEtmSkinfold").value) ?? 5
  };
}

function renderTabs() {
  document.querySelectorAll(".tab").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach((tab) => tab.classList.remove("active"));
      document.querySelectorAll(".panel").forEach((panel) => panel.classList.remove("active"));
      button.classList.add("active");
      byId(button.dataset.tab).classList.add("active");
      if (button.dataset.tab === "exportacao") updateSummary();
    });
  });
}

function renderTriplicateCards() {
  byId("triplicateCards").innerHTML = variables.map((variable) => `
    <article class="measure-card" data-card="${variable.key}">
      <div>
        <h3>${variable.label}</h3>
        <div class="measure-meta">
          <span>${variable.unit}</span>
          <span>${variable.protocol || "Protocolo geral"}</span>
        </div>
      </div>
      <div class="input-row">
        <label>Medida 1<input inputmode="decimal" data-trip="${variable.key}" data-field="m1"></label>
        <label>Medida 2<input inputmode="decimal" data-trip="${variable.key}" data-field="m2"></label>
        <label>Medida 3<input inputmode="decimal" data-trip="${variable.key}" data-field="m3"></label>
      </div>
      <div class="optional-row">
        <label>Ponto anatômico<input data-trip="${variable.key}" data-field="point"></label>
        <label>Momento 1<input inputmode="decimal" data-trip="${variable.key}" data-field="t1"></label>
        <label>Momento 2<input inputmode="decimal" data-trip="${variable.key}" data-field="t2"></label>
      </div>
      <div class="result-box" data-result="${variable.key}">Preencha duas ou três medidas para calcular.</div>
    </article>
  `).join("");
}

function getTriplicateInput(variableKey, field) {
  return document.querySelector(`[data-trip="${variableKey}"][data-field="${field}"]`);
}

function clearDiscrepantMarks(variableKey) {
  ["m1", "m2", "m3"].forEach((field) => getTriplicateInput(variableKey, field).classList.remove("discrepant"));
}

function matchingEtm(variable) {
  const exact = studyResults.find((item) => item.variableKey === variable.key);
  if (exact) return exact;
  return studyResults.find((item) => item.variable === variable.label && item.protocol === variable.protocol);
}

function calculateTriplicates() {
  const limits = currentTriplicateLimits();
  const participant = byId("tripParticipant").value.trim();
  triplicateResults = [];

  variables.forEach((variable) => {
    clearDiscrepantMarks(variable.key);
    const raw = ["m1", "m2", "m3"].map((field) => getTriplicateInput(variable.key, field).value);
    const measures = raw.map(parseNumber).filter((value) => value !== null);
    const resultBox = document.querySelector(`[data-result="${variable.key}"]`);
    const point = getTriplicateInput(variable.key, "point").value.trim();
    const moment1 = parseNumber(getTriplicateInput(variable.key, "t1").value);
    const moment2 = parseNumber(getTriplicateInput(variable.key, "t2").value);

    if (measures.length === 0) {
      resultBox.className = "result-box";
      resultBox.textContent = "Sem medidas preenchidas.";
      return;
    }

    if (measures.length === 1) {
      resultBox.className = "result-box warn";
      resultBox.textContent = "Informe ao menos duas medidas para avaliar a repetibilidade.";
      return;
    }

    const avg = mean(measures);
    const sd = sampleSd(measures, avg);
    const cv = avg !== 0 ? (sd / Math.abs(avg)) * 100 : null;
    const amplitude = Math.max(...measures) - Math.min(...measures);
    const cvLimit = variable.type === "skinfold" ? limits.skinfoldCv : limits.perimeterCv;
    const ampLimit = variable.type === "skinfold" ? limits.skinfoldAmp : limits.perimeterAmp;
    const acceptable = cv !== null && cv <= cvLimit && amplitude <= ampLimit;
    const onlyTwo = measures.length === 2;
    const status = acceptable ? "Triplicata aceitável" : "Repetir medida ou revisar ponto anatômico";

    raw.forEach((value, index) => {
      const numeric = parseNumber(value);
      if (numeric === null) return;
      const isExtreme = amplitude > ampLimit && (numeric === Math.max(...measures) || numeric === Math.min(...measures));
      const isFar = sd > 0 && Math.abs(numeric - avg) > 1.5 * sd;
      if (isExtreme || isFar) getTriplicateInput(variable.key, `m${index + 1}`).classList.add("discrepant");
    });

    const longitudinal = interpretLongitudinal(moment1, moment2, variable, sd);
    const row = {
      module: "Triplicatas individuais",
      participant,
      variableKey: variable.key,
      variable: variable.label,
      protocol: variable.protocol,
      unit: variable.unit,
      point,
      measures: raw,
      mean: avg,
      sd,
      cv,
      amplitude,
      cvLimit,
      ampLimit,
      classification: status,
      moment1,
      moment2,
      ...longitudinal
    };
    triplicateResults.push(row);

    resultBox.className = `result-box ${acceptable ? "ok" : "bad"}`;
    resultBox.innerHTML = `
      <strong>${status}</strong><br>
      Média: ${formatNumber(avg)} ${variable.unit} · DP: ${formatNumber(sd)} ${variable.unit}<br>
      CV: ${formatNumber(cv)}% · Amplitude: ${formatNumber(amplitude)} ${variable.unit}<br>
      ${onlyTwo ? "<span>Aviso: cálculo feito com duas medidas; três medidas são preferíveis.</span><br>" : ""}
      ${longitudinal.interpretation ? `<span>${longitudinal.interpretation}</span>` : ""}
    `;
  });

  updateSummary();
}

function interpretLongitudinal(moment1, moment2, variable, fallbackSd) {
  if (moment1 === null || moment2 === null) {
    return { deltaAbs: null, deltaPct: null, interpretation: "" };
  }

  const deltaAbs = moment2 - moment1;
  const deltaPct = moment1 !== 0 ? (deltaAbs / moment1) * 100 : null;
  const etm = matchingEtm(variable);
  const reference = etm ? etm.etm : fallbackSd;
  let interpretation = "";

  if (!reference || reference <= 0) {
    interpretation = "Interpretação longitudinal indisponível: calcule o ETM clássico ou informe triplicatas variáveis.";
  } else if (Math.abs(deltaAbs) <= reference) {
    interpretation = etm
      ? "Mudança compatível com erro técnico."
      : "Interpretação provisória baseada na variabilidade da triplicata; recomenda-se calcular o ETM clássico do estudo. Mudança compatível com erro técnico.";
  } else if (Math.abs(deltaAbs) <= 2 * reference) {
    interpretation = etm
      ? "Possível mudança real."
      : "Interpretação provisória baseada na variabilidade da triplicata; recomenda-se calcular o ETM clássico do estudo. Possível mudança real.";
  } else {
    interpretation = etm
      ? "Mudança provavelmente real."
      : "Interpretação provisória baseada na variabilidade da triplicata; recomenda-se calcular o ETM clássico do estudo. Mudança provavelmente real.";
  }

  return { deltaAbs, deltaPct, interpretation };
}

function addStudyRow(values = {}) {
  const tbody = byId("studyRows");
  const row = document.createElement("tr");
  const selectedKey = values.variableKey || values.variable || "braco_relaxado";
  const variable = getVariable(selectedKey) || variables.find((item) => item.label === selectedKey) || variables[0];
  row.innerHTML = `
    <td><input data-col="participant" value="${values.participant || ""}"></td>
    <td>
      <select data-col="variableKey">
        ${variables.map((item) => `<option value="${item.key}" ${item.key === variable.key ? "selected" : ""}>${item.label}</option>`).join("")}
      </select>
    </td>
    <td><input data-col="protocol" value="${values.protocol ?? variable.protocol}"></td>
    <td><input inputmode="decimal" data-col="m1" value="${values.m1 || ""}"></td>
    <td><input inputmode="decimal" data-col="m2" value="${values.m2 || ""}"></td>
    <td>
      <select data-col="unit">
        <option value="cm" ${variable.unit === "cm" ? "selected" : ""}>cm</option>
        <option value="mm" ${variable.unit === "mm" ? "selected" : ""}>mm</option>
      </select>
    </td>
    <td><button class="remove-row" type="button" title="Remover linha">×</button></td>
  `;
  row.querySelector('[data-col="variableKey"]').addEventListener("change", (event) => {
    const nextVariable = getVariable(event.target.value);
    row.querySelector('[data-col="protocol"]').value = nextVariable.protocol;
    row.querySelector('[data-col="unit"]').value = nextVariable.unit;
  });
  row.querySelector(".remove-row").addEventListener("click", () => row.remove());
  tbody.appendChild(row);
}

function getStudyRows() {
  return [...byId("studyRows").querySelectorAll("tr")].map((row) => {
    const variableKey = row.querySelector('[data-col="variableKey"]').value;
    const variable = getVariable(variableKey);
    return {
      participant: row.querySelector('[data-col="participant"]').value.trim(),
      variableKey,
      variable: variable.label,
      type: variable.type,
      protocol: row.querySelector('[data-col="protocol"]').value.trim(),
      m1: parseNumber(row.querySelector('[data-col="m1"]').value),
      m2: parseNumber(row.querySelector('[data-col="m2"]').value),
      unit: row.querySelector('[data-col="unit"]').value
    };
  });
}

function calculateStudy() {
  const rows = getStudyRows().filter((row) => row.m1 !== null && row.m2 !== null);
  const groups = new Map();
  const limits = currentEtmLimits();

  rows.forEach((row) => {
    const key = `${row.variableKey}|${row.protocol}|${row.unit}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  });

  studyResults = [...groups.values()].map((group) => {
    const first = group[0];
    const diffs = group.map((row) => row.m1 - row.m2);
    const sumDiffSquared = diffs.reduce((total, diff) => total + diff ** 2, 0);
    const etm = Math.sqrt(sumDiffSquared / (2 * group.length));
    const allMeasures = group.flatMap((row) => [row.m1, row.m2]);
    const generalMean = mean(allMeasures);
    const etmPct = generalMean !== 0 ? (etm / Math.abs(generalMean)) * 100 : null;
    const limit = first.type === "skinfold" ? limits.skinfold : limits.perimeter;

    return {
      module: "ETM clássico do estudo",
      variableKey: first.variableKey,
      variable: first.variable,
      protocol: first.protocol,
      unit: first.unit,
      n: group.length,
      mean1: mean(group.map((row) => row.m1)),
      mean2: mean(group.map((row) => row.m2)),
      meanDiff: mean(diffs),
      maxAbsDiff: Math.max(...diffs.map(Math.abs)),
      etm,
      etmPct,
      limit,
      classification: etmPct !== null && etmPct <= limit ? "aceitável" : "acima do recomendado"
    };
  });

  renderStudyResults();
  renderArmComparison();
  updateSummary();
}

function renderStudyResults() {
  const container = byId("studyResults");
  if (!studyResults.length) {
    container.innerHTML = '<div class="result-box warn">Preencha ao menos uma linha completa com medida 1 e medida 2.</div>';
    return;
  }

  container.innerHTML = studyResults.map((result) => `
    <article class="result-card">
      <div class="section-heading">
        <div>
          <h3>${result.variable}${result.protocol ? ` · ${result.protocol}` : ""}</h3>
          <p class="eyebrow">N = ${result.n} · ${result.unit}</p>
        </div>
        <div class="status-chip ${result.classification === "aceitável" ? "ok" : "bad"}">${result.classification}</div>
      </div>
      <div class="metrics">
        ${metric("ETM absoluto", `${formatNumber(result.etm)} ${result.unit}`)}
        ${metric("ETM relativo", `${formatNumber(result.etmPct)}%`)}
        ${metric("Média medida 1", `${formatNumber(result.mean1)} ${result.unit}`)}
        ${metric("Média medida 2", `${formatNumber(result.mean2)} ${result.unit}`)}
        ${metric("Diferença média", `${formatNumber(result.meanDiff)} ${result.unit}`)}
        ${metric("Maior diferença", `${formatNumber(result.maxAbsDiff)} ${result.unit}`)}
      </div>
    </article>
  `).join("");
}

function metric(label, value) {
  return `<div class="metric"><span>${label}</span><strong>${value}</strong></div>`;
}

function renderArmComparison() {
  const isak = studyResults.find((item) => item.variableKey === "braco_isak");
  const lohman = studyResults.find((item) => item.variableKey === "braco_lohman");
  const container = byId("armComparison");

  if (!isak || !lohman) {
    container.className = "comparison-empty";
    container.textContent = "Calcule o ETM clássico com linhas de braço ISAK e braço Lohman para ver a comparação.";
    return;
  }

  const winner = isak.etmPct === lohman.etmPct
    ? "ETM relativo equivalente"
    : isak.etmPct < lohman.etmPct
      ? "ISAK apresentou menor ETM relativo"
      : "Lohman apresentou menor ETM relativo";
  const meanIsak = mean([isak.mean1, isak.mean2]);
  const meanLohman = mean([lohman.mean1, lohman.mean2]);

  container.className = "";
  container.innerHTML = `
    <article class="result-card">
      <div class="section-heading">
        <div>
          <h3>Comparação ISAK vs Lohman</h3>
          <p class="eyebrow">${winner}</p>
        </div>
        <div class="status-chip ok">${winner}</div>
      </div>
      <div class="metrics">
        ${metric("Média ISAK", `${formatNumber(meanIsak)} cm`)}
        ${metric("Média Lohman", `${formatNumber(meanLohman)} cm`)}
        ${metric("Diferença média", `${formatNumber(meanIsak - meanLohman)} cm`)}
        ${metric("ETM ISAK", `${formatNumber(isak.etm)} cm (${formatNumber(isak.etmPct)}%)`)}
        ${metric("ETM Lohman", `${formatNumber(lohman.etm)} cm (${formatNumber(lohman.etmPct)}%)`)}
      </div>
    </article>
  `;
}

function escapeCsv(value) {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\n;]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function downloadText(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function rowsToCsv(headers, rows) {
  return [
    headers.map(escapeCsv).join(";"),
    ...rows.map((row) => headers.map((header) => escapeCsv(row[header])).join(";"))
  ].join("\n");
}

function exportTriplicateCsv() {
  calculateTriplicates();
  const headers = [
    "Módulo", "Participante", "Variável", "Protocolo", "Unidade", "Ponto anatômico", "Medida 1", "Medida 2", "Medida 3",
    "Média", "DP", "CV%", "Amplitude", "Limite CV%", "Limite amplitude", "Classificação triplicata",
    "Momento 1", "Momento 2", "Delta absoluto", "Delta %", "Interpretação longitudinal"
  ];
  const rows = triplicateResults.map((item) => ({
    "Módulo": item.module,
    "Participante": item.participant,
    "Variável": item.variable,
    "Protocolo": item.protocol,
    "Unidade": item.unit,
    "Ponto anatômico": item.point,
    "Medida 1": item.measures[0],
    "Medida 2": item.measures[1],
    "Medida 3": item.measures[2],
    "Média": formatNumber(item.mean),
    "DP": formatNumber(item.sd),
    "CV%": formatNumber(item.cv),
    "Amplitude": formatNumber(item.amplitude),
    "Limite CV%": formatNumber(item.cvLimit),
    "Limite amplitude": formatNumber(item.ampLimit),
    "Classificação triplicata": item.classification,
    "Momento 1": item.moment1 ?? "",
    "Momento 2": item.moment2 ?? "",
    "Delta absoluto": item.deltaAbs !== null ? formatNumber(item.deltaAbs) : "",
    "Delta %": item.deltaPct !== null ? formatNumber(item.deltaPct) : "",
    "Interpretação longitudinal": item.interpretation
  }));
  downloadText("triplicatas-etm-antropometrico.csv", rowsToCsv(headers, rows), "text/csv;charset=utf-8");
}

function exportStudyCsv() {
  calculateStudy();
  const headers = [
    "Módulo", "Variável", "Protocolo", "Unidade", "N", "Média medida 1", "Média medida 2",
    "Diferença média", "Maior diferença absoluta", "ETM absoluto", "ETM relativo %", "Limite ETM%", "Classificação ETM"
  ];
  const rows = studyResults.map((item) => ({
    "Módulo": item.module,
    "Variável": item.variable,
    "Protocolo": item.protocol,
    "Unidade": item.unit,
    "N": item.n,
    "Média medida 1": formatNumber(item.mean1),
    "Média medida 2": formatNumber(item.mean2),
    "Diferença média": formatNumber(item.meanDiff),
    "Maior diferença absoluta": formatNumber(item.maxAbsDiff),
    "ETM absoluto": formatNumber(item.etm),
    "ETM relativo %": formatNumber(item.etmPct),
    "Limite ETM%": formatNumber(item.limit),
    "Classificação ETM": item.classification
  }));
  downloadText("etm-classico-antropometrico.csv", rowsToCsv(headers, rows), "text/csv;charset=utf-8");
}

function exportJson() {
  calculateTriplicates();
  calculateStudy();
  downloadText("etm-antropometrico.json", JSON.stringify({ triplicateResults, studyResults }, null, 2), "application/json;charset=utf-8");
}

function updateSummary() {
  const tripLines = triplicateResults.slice(0, 5).map((item) => [
    `${item.variable}${item.protocol ? ` · ${item.protocol}` : ""}:`,
    `Média: ${formatNumber(item.mean)} ${item.unit}`,
    `DP: ${formatNumber(item.sd)} ${item.unit}`,
    `CV: ${formatNumber(item.cv)}%`,
    `Amplitude: ${formatNumber(item.amplitude)} ${item.unit}`,
    `Classificação: ${item.classification}`
  ].join("\n"));

  const studyLines = studyResults.slice(0, 5).map((item) => [
    `${item.variable}${item.protocol ? ` · ${item.protocol}` : ""}:`,
    `N: ${item.n}`,
    `ETM absoluto: ${formatNumber(item.etm)} ${item.unit}`,
    `ETM relativo: ${formatNumber(item.etmPct)}%`,
    `Classificação: ${item.classification}`
  ].join("\n"));

  byId("summaryText").value = [
    "Resumo ETM Antropométrico",
    "",
    "Triplicatas individuais:",
    tripLines.length ? tripLines.join("\n\n") : "Sem triplicatas calculadas.",
    "",
    "ETM clássico do estudo:",
    studyLines.length ? studyLines.join("\n\n") : "Sem ETM clássico calculado.",
    "",
    "Interpretação:",
    "Mudanças menores ou iguais ao ETM devem ser interpretadas com cautela, pois podem representar erro técnico da medida."
  ].join("\n");
}

async function copyWhatsappSummary() {
  updateSummary();
  const text = byId("summaryText").value;
  try {
    await navigator.clipboard.writeText(text);
    alert("Resumo copiado para a área de transferência.");
  } catch {
    byId("summaryText").select();
    document.execCommand("copy");
    alert("Resumo selecionado e copiado quando permitido pelo navegador.");
  }
}

function parseCsvLine(line) {
  const result = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"' && line[index + 1] === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if ((char === ";" || char === ",") && !quoted) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function importCsv(file) {
  const reader = new FileReader();
  reader.onload = () => {
    const lines = String(reader.result).split(/\r?\n/).filter(Boolean);
    if (!lines.length) return;
    const headers = parseCsvLine(lines[0]).map((header) => header.toLowerCase());
    lines.slice(1).forEach((line) => {
      const cells = parseCsvLine(line);
      const get = (name, fallbackIndex) => {
        const index = headers.findIndex((header) => header.includes(name));
        return cells[index >= 0 ? index : fallbackIndex] || "";
      };
      const label = get("variável", 1);
      const variable = variables.find((item) => item.label.toLowerCase() === label.toLowerCase()) || variables[0];
      addStudyRow({
        participant: get("participante", 0),
        variableKey: variable.key,
        protocol: get("protocolo", 2) || variable.protocol,
        m1: get("medida 1", 3),
        m2: get("medida 2", 4)
      });
    });
  };
  reader.readAsText(file);
}

function bindActions() {
  byId("calculateTriplicates").addEventListener("click", calculateTriplicates);
  byId("clearTriplicates").addEventListener("click", () => {
    document.querySelectorAll("[data-trip]").forEach((input) => {
      input.value = "";
      input.classList.remove("discrepant");
    });
    triplicateResults = [];
    renderTriplicateCards();
    updateSummary();
  });
  byId("calculateStudy").addEventListener("click", calculateStudy);
  byId("addStudyRow").addEventListener("click", () => addStudyRow());
  byId("clearStudyRows").addEventListener("click", () => {
    byId("studyRows").innerHTML = "";
    studyResults = [];
    addStudyRow();
    renderStudyResults();
    renderArmComparison();
    updateSummary();
  });
  byId("importCsvButton").addEventListener("click", () => byId("csvInput").click());
  byId("csvInput").addEventListener("change", (event) => {
    if (event.target.files[0]) importCsv(event.target.files[0]);
  });
  byId("exportTripCsv").addEventListener("click", exportTriplicateCsv);
  byId("exportStudyCsv").addEventListener("click", exportStudyCsv);
  byId("exportJson").addEventListener("click", exportJson);
  byId("copyWhatsapp").addEventListener("click", copyWhatsappSummary);
}

function init() {
  renderTabs();
  renderTriplicateCards();
  addStudyRow();
  bindActions();
  updateSummary();
}

init();
