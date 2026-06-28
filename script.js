const perimeterMeasures = [
  { key: "arm_lohman", label: "Perímetro de braço - Lohman", protocol: "Lohman", unit: "cm", type: "perimeter" },
  { key: "arm_isak", label: "Perímetro de braço - ISAK", protocol: "ISAK", unit: "cm", type: "perimeter" },
  { key: "waist", label: "Perímetro da cintura", protocol: "", unit: "cm", type: "perimeter" },
  { key: "abdomen", label: "Perímetro abdominal", protocol: "", unit: "cm", type: "perimeter" },
  { key: "hip", label: "Perímetro do quadril", protocol: "", unit: "cm", type: "perimeter" },
  { key: "calf", label: "Perímetro da panturrilha", protocol: "", unit: "cm", type: "perimeter" }
];

const skinfoldMeasures = [
  { key: "triceps_lohman", label: "Dobra cutânea tricipital - Lohman", protocol: "Lohman", unit: "mm", type: "skinfold" },
  { key: "triceps_isak", label: "Dobra cutânea tricipital - ISAK", protocol: "ISAK", unit: "mm", type: "skinfold" }
];

const measures = [...perimeterMeasures, ...skinfoldMeasures];
const state = Object.fromEntries(measures.map((measure) => [measure.key, { m1: "", m2: "" }]));
let lastObjectUrl = "";

const byId = (id) => document.getElementById(id);

function parseNumber(value) {
  const normalized = String(value ?? "").trim().replace(",", ".");
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

function targetFor(measure) {
  const field = measure.type === "skinfold" ? "targetSkinfold" : "targetPerimeter";
  return parseNumber(byId(field).value) ?? (measure.type === "skinfold" ? 5 : 1);
}

function hasAnyMeasureOne() {
  return measures.some((measure) => parseNumber(state[measure.key].m1) !== null);
}

function hasAnyPairedMeasure() {
  return measures.some((measure) => {
    const values = state[measure.key];
    return parseNumber(values.m1) !== null && parseNumber(values.m2) !== null;
  });
}

function renderInputs(containerId, list, round) {
  byId(containerId).innerHTML = list.map((measure) => `
    <label class="measure-field">
      <span>
        ${measure.label}
        <small>${measure.protocol || "Protocolo geral"} · ${measure.unit}</small>
      </span>
      <input
        inputmode="decimal"
        autocomplete="off"
        data-input="${measure.key}"
        data-round="${round}"
        aria-label="${measure.label}, medida ${round}">
    </label>
  `).join("");
}

function bindMeasureInputs() {
  document.querySelectorAll("[data-input]").forEach((input) => {
    input.addEventListener("input", () => {
      const key = input.dataset.input;
      const round = input.dataset.round === "1" ? "m1" : "m2";
      state[key][round] = input.value;
      mirrorInputs(key, round, input.value, input);
      if (round === "m1" && hasAnyMeasureOne()) revealMeasureTwo();
      updateResults();
    });
  });
}

function mirrorInputs(key, round, value, source) {
  document.querySelectorAll(`[data-input="${key}"][data-round="${round === "m1" ? "1" : "2"}"]`).forEach((input) => {
    if (input !== source) input.value = value;
  });
}

function revealMeasureTwo() {
  byId("measureTwoSection").classList.add("active");
}

function revealResults() {
  byId("measureTwoSection").classList.add("active");
  byId("resultsSection").classList.add("active");
  updateResults();
  byId("resultsSection").scrollIntoView({ behavior: "smooth", block: "start" });
}

function calculateEtm(measure) {
  const m1 = parseNumber(state[measure.key].m1);
  const m2 = parseNumber(state[measure.key].m2);
  if (m1 === null && m2 === null) return { measure, status: "empty" };
  if (m1 === null || m2 === null) return { measure, m1, m2, status: "partial" };

  const difference = m1 - m2;
  const etm = Math.sqrt((difference ** 2) / 2);
  const avg = mean([m1, m2]);
  const etmPct = avg !== 0 ? (etm / Math.abs(avg)) * 100 : null;
  const target = targetFor(measure);
  const ok = etmPct !== null && etmPct <= target;

  return {
    measure,
    m1,
    m2,
    difference,
    etm,
    etmPct,
    target,
    status: ok ? "ok" : "bad",
    classification: ok ? "Dentro do alvo" : "Fora do alvo"
  };
}

function getResults() {
  return measures.map(calculateEtm);
}

function meanPair(key) {
  const values = state[key];
  const parsed = [parseNumber(values.m1), parseNumber(values.m2)].filter((value) => value !== null);
  return parsed.length ? mean(parsed) : null;
}

function calculateArmMuscle(protocol) {
  const armKey = protocol === "Lohman" ? "arm_lohman" : "arm_isak";
  const skinfoldKey = protocol === "Lohman" ? "triceps_lohman" : "triceps_isak";
  const arm = meanPair(armKey);
  const skinfoldMm = meanPair(skinfoldKey);
  if (arm === null || skinfoldMm === null) return null;
  return arm - Math.PI * (skinfoldMm / 10);
}

function renderMuscleResults() {
  const lohman = calculateArmMuscle("Lohman");
  const isak = calculateArmMuscle("ISAK");
  byId("muscleResults").innerHTML = `
    <article class="pmb-card">
      <span>Perímetro muscular do braço - Lohman</span>
      <strong>${formatNumber(lohman)} cm</strong>
      <small>Perímetro de braço Lohman - π × dobra tricipital Lohman em cm</small>
    </article>
    <article class="pmb-card">
      <span>Perímetro muscular do braço - ISAK</span>
      <strong>${formatNumber(isak)} cm</strong>
      <small>Perímetro de braço ISAK - π × dobra tricipital ISAK em cm</small>
    </article>
  `;
}

function renderReviewRows(results) {
  byId("reviewRows").innerHTML = results.map((result) => {
    const measure = result.measure;
    const statusClass = result.status === "ok" ? "ok" : result.status === "bad" ? "bad" : "warn";
    const statusText = result.status === "empty"
      ? "Sem dados"
      : result.status === "partial"
        ? "Par incompleto"
        : result.classification;

    return `
      <tr>
        <td>${measure.label}</td>
        <td>${measure.unit}</td>
        <td><input inputmode="decimal" autocomplete="off" value="${state[measure.key].m1}" data-review="${measure.key}" data-review-round="m1"></td>
        <td><input inputmode="decimal" autocomplete="off" value="${state[measure.key].m2}" data-review="${measure.key}" data-review-round="m2"></td>
        <td>${result.difference === undefined ? "-" : `${formatNumber(result.difference)} ${measure.unit}`}</td>
        <td>${result.etm === undefined ? "-" : `${formatNumber(result.etm)} ${measure.unit}`}</td>
        <td>${result.etmPct === undefined || result.etmPct === null ? "-" : `${formatNumber(result.etmPct)}%`}</td>
        <td><span class="status-cell ${statusClass}">${statusText}</span></td>
      </tr>
    `;
  }).join("");

  document.querySelectorAll("[data-review]").forEach((input) => {
    input.addEventListener("input", () => {
      const key = input.dataset.review;
      const round = input.dataset.reviewRound;
      state[key][round] = input.value;
      mirrorInputs(key, round, input.value, input);
      updateResults();
    });
  });
}

function updateCompletionStatus(results) {
  const paired = results.filter((result) => result.status === "ok" || result.status === "bad");
  const outOfTarget = results.some((result) => result.status === "bad");
  const partial = results.some((result) => result.status === "partial");
  const status = byId("completionStatus");
  const overrideBox = byId("overrideBox");

  overrideBox.classList.toggle("visible", outOfTarget);

  if (!paired.length && !partial) {
    status.className = "status-chip neutral";
    status.textContent = "Aguardando dados";
  } else if (outOfTarget) {
    status.className = "status-chip bad";
    status.textContent = "ETM fora de alvo";
  } else if (partial) {
    status.className = "status-chip warn";
    status.textContent = "Há pares incompletos";
  } else {
    status.className = "status-chip ok";
    status.textContent = "ETM dentro do alvo";
  }
}

function updateResults() {
  const active = document.activeElement;
  const focusState = active?.dataset?.review
    ? {
        key: active.dataset.review,
        round: active.dataset.reviewRound,
        start: active.selectionStart,
        end: active.selectionEnd
      }
    : null;
  const results = getResults();
  if (hasAnyPairedMeasure()) byId("resultsSection").classList.add("active");
  renderMuscleResults();
  renderReviewRows(results);
  updateCompletionStatus(results);

  if (focusState) {
    const next = document.querySelector(`[data-review="${focusState.key}"][data-review-round="${focusState.round}"]`);
    if (next) {
      next.focus();
      next.setSelectionRange(focusState.start, focusState.end);
    }
  }
}

function syncReviewInputs() {
  measures.forEach((measure) => {
    ["m1", "m2"].forEach((round) => {
      document.querySelectorAll(`[data-review="${measure.key}"][data-review-round="${round}"]`).forEach((input) => {
        input.value = state[measure.key][round];
      });
    });
  });
}

function buildRowsForExport() {
  const meta = {
    participante: byId("participant").value.trim(),
    avaliador: byId("evaluator").value.trim(),
    data: byId("collectionDate").value
  };

  const measurementRows = getResults().map((result) => ({
    ...meta,
    tipo_linha: "medida",
    variavel: result.measure.label,
    protocolo: result.measure.protocol,
    unidade: result.measure.unit,
    medida_1: result.m1 ?? "",
    medida_2: result.m2 ?? "",
    diferenca: result.difference ?? "",
    etm_absoluto: result.etm ?? "",
    etm_percentual: result.etmPct ?? "",
    alvo_etm_percentual: result.target ?? targetFor(result.measure),
    status: result.status === "empty" ? "Sem dados" : result.status === "partial" ? "Par incompleto" : result.classification,
    pmb_cm: ""
  }));

  const muscleRows = [
    ["Perímetro muscular do braço - Lohman", "Lohman", calculateArmMuscle("Lohman")],
    ["Perímetro muscular do braço - ISAK", "ISAK", calculateArmMuscle("ISAK")]
  ].map(([label, protocol, value]) => ({
    ...meta,
    tipo_linha: "calculo",
    variavel: label,
    protocolo: protocol,
    unidade: "cm",
    medida_1: "",
    medida_2: "",
    diferenca: "",
    etm_absoluto: "",
    etm_percentual: "",
    alvo_etm_percentual: "",
    status: value === null ? "Dados insuficientes" : "Calculado",
    pmb_cm: value ?? ""
  }));

  return [...measurementRows, ...muscleRows];
}

function saveExcel() {
  updateResults();
  const results = getResults();
  const hasBad = results.some((result) => result.status === "bad");
  const hasPairs = results.some((result) => result.status === "ok" || result.status === "bad");

  if (!hasPairs) {
    alert("Preencha pelo menos uma variável com medida 1 e medida 2 antes de salvar.");
    return;
  }

  if (hasBad && !byId("overrideOutOfTarget").checked) {
    alert("Há ETM fora de alvo. Marque a caixa de finalização para salvar mesmo assim.");
    return;
  }

  const rows = buildRowsForExport();
  const filename = `coleta-de-dados-${new Date().toISOString().slice(0, 10)}.xlsx`;
  downloadXlsx(filename, rows);
}

function escapeXml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function columnName(index) {
  let name = "";
  let value = index + 1;
  while (value > 0) {
    const remainder = (value - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    value = Math.floor((value - remainder) / 26);
  }
  return name;
}

function sheetXml(headers, rows) {
  const allRows = [headers, ...rows.map((row) => headers.map((header) => row[header]))];
  const rowXml = allRows.map((row, rowIndex) => {
    const cellXml = row.map((value, columnIndex) => {
      const ref = `${columnName(columnIndex)}${rowIndex + 1}`;
      const number = typeof value === "number" && Number.isFinite(value);
      if (number) return `<c r="${ref}"><v>${value}</v></c>`;
      return `<c r="${ref}" t="inlineStr"><is><t>${escapeXml(value)}</t></is></c>`;
    }).join("");
    return `<row r="${rowIndex + 1}">${cellXml}</row>`;
  }).join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>${rowXml}</sheetData>
</worksheet>`;
}

function crc32(bytes) {
  let table = crc32.table;
  if (!table) {
    table = new Uint32Array(256);
    for (let i = 0; i < 256; i += 1) {
      let c = i;
      for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[i] = c >>> 0;
    }
    crc32.table = table;
  }

  let crc = 0xffffffff;
  bytes.forEach((byte) => {
    crc = table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  });
  return (crc ^ 0xffffffff) >>> 0;
}

function writeUint32(array, value) {
  array.push(value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff);
}

function writeUint16(array, value) {
  array.push(value & 0xff, (value >>> 8) & 0xff);
}

function createZip(files) {
  const encoder = new TextEncoder();
  const output = [];
  const central = [];
  let offset = 0;

  files.forEach((file) => {
    const nameBytes = encoder.encode(file.name);
    const dataBytes = encoder.encode(file.content);
    const crc = crc32(dataBytes);

    writeUint32(output, 0x04034b50);
    writeUint16(output, 20);
    writeUint16(output, 0);
    writeUint16(output, 0);
    writeUint16(output, 0);
    writeUint16(output, 0);
    writeUint32(output, crc);
    writeUint32(output, dataBytes.length);
    writeUint32(output, dataBytes.length);
    writeUint16(output, nameBytes.length);
    writeUint16(output, 0);
    output.push(...nameBytes, ...dataBytes);

    writeUint32(central, 0x02014b50);
    writeUint16(central, 20);
    writeUint16(central, 20);
    writeUint16(central, 0);
    writeUint16(central, 0);
    writeUint16(central, 0);
    writeUint16(central, 0);
    writeUint32(central, crc);
    writeUint32(central, dataBytes.length);
    writeUint32(central, dataBytes.length);
    writeUint16(central, nameBytes.length);
    writeUint16(central, 0);
    writeUint16(central, 0);
    writeUint16(central, 0);
    writeUint16(central, 0);
    writeUint32(central, 0);
    writeUint32(central, offset);
    central.push(...nameBytes);

    offset = output.length;
  });

  const centralOffset = output.length;
  output.push(...central);
  writeUint32(output, 0x06054b50);
  writeUint16(output, 0);
  writeUint16(output, 0);
  writeUint16(output, files.length);
  writeUint16(output, files.length);
  writeUint32(output, central.length);
  writeUint32(output, centralOffset);
  writeUint16(output, 0);

  return new Uint8Array(output);
}

function downloadXlsx(filename, rows) {
  const headers = [
    "participante",
    "avaliador",
    "data",
    "tipo_linha",
    "variavel",
    "protocolo",
    "unidade",
    "medida_1",
    "medida_2",
    "diferenca",
    "etm_absoluto",
    "etm_percentual",
    "alvo_etm_percentual",
    "status",
    "pmb_cm"
  ];

  const files = [
    {
      name: "[Content_Types].xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>`
    },
    {
      name: "_rels/.rels",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`
    },
    {
      name: "xl/workbook.xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="Coleta" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`
    },
    {
      name: "xl/_rels/workbook.xml.rels",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>`
    },
    {
      name: "xl/worksheets/sheet1.xml",
      content: sheetXml(headers, rows)
    }
  ];

  const bytes = createZip(files);
  const mime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  let url;

  if (typeof URL !== "undefined" && typeof URL.createObjectURL === "function") {
    const blob = new Blob([bytes], { type: mime });
    url = URL.createObjectURL(blob);
  } else {
    url = `data:${mime};base64,${bytesToBase64(bytes)}`;
  }

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  showDownloadNotice(url, filename);
  link.click();
  link.remove();
}

function bytesToBase64(bytes) {
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

function showDownloadNotice(url, filename) {
  if (lastObjectUrl && lastObjectUrl.startsWith("blob:") && lastObjectUrl !== url) {
    URL.revokeObjectURL(lastObjectUrl);
  }
  lastObjectUrl = url;

  const notice = byId("downloadNotice");
  notice.textContent = "Download iniciado. ";
  const link = document.createElement("a");
  link.id = "manualDownloadLink";
  link.href = url;
  link.download = filename;
  link.textContent = "Baixar Excel";
  notice.appendChild(link);
  notice.classList.add("visible");
}

function clearAll() {
  Object.keys(state).forEach((key) => {
    state[key].m1 = "";
    state[key].m2 = "";
  });
  document.querySelectorAll("[data-input], [data-review]").forEach((input) => {
    input.value = "";
  });
  byId("overrideOutOfTarget").checked = false;
  byId("downloadNotice").classList.remove("visible");
  byId("downloadNotice").textContent = "";
  byId("measureTwoSection").classList.remove("active");
  byId("resultsSection").classList.remove("active");
  updateResults();
  byId("measureOneSection").scrollIntoView({ behavior: "smooth", block: "start" });
}

function init() {
  byId("collectionDate").valueAsDate = new Date();
  renderInputs("perimeterMeasureOne", perimeterMeasures, "1");
  renderInputs("skinfoldMeasureOne", skinfoldMeasures, "1");
  renderInputs("perimeterMeasureTwo", perimeterMeasures, "2");
  renderInputs("skinfoldMeasureTwo", skinfoldMeasures, "2");
  bindMeasureInputs();

  byId("goMeasureTwo").addEventListener("click", () => {
    revealMeasureTwo();
    byId("measureTwoSection").scrollIntoView({ behavior: "smooth", block: "start" });
  });
  byId("goResults").addEventListener("click", revealResults);
  byId("saveExcel").addEventListener("click", saveExcel);
  byId("clearAll").addEventListener("click", clearAll);
  byId("targetPerimeter").addEventListener("input", updateResults);
  byId("targetSkinfold").addEventListener("input", updateResults);

  updateResults();
  syncReviewInputs();
}

init();
