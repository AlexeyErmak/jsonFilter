const STORAGE_KEYS = {
  objKind: "json_filter_objKind",
  dateFrom: "json_filter_date_from",
  dateTo: "json_filter_date_to",
  result: "json_filter_result",
  fileNames: "json_filter_file_names"
};

let jsonData = [];
let loadedFileNames = [];

const fileInput = document.getElementById("fileInput");
const objKindInput = document.getElementById("objKindInput");
const dateFromInput = document.getElementById("dateFromInput");
const dateToInput = document.getElementById("dateToInput");
const runBtn = document.getElementById("runBtn");
const resetBtn = document.getElementById("resetBtn");
const clearAllBtn = document.getElementById("clearAllBtn");

const statusEl = document.getElementById("status");
const filesCountEl = document.getElementById("filesCount");
const objectsCountEl = document.getElementById("objectsCount");
const countEl = document.getElementById("count");
const currentObjKindEl = document.getElementById("currentObjKind");
const currentDateRangeEl = document.getElementById("currentDateRange");
const fileListEl = document.getElementById("fileList");
const resultsEl = document.getElementById("results");

function updateStatus(text) {
  statusEl.textContent = text;
}

function saveFiltersToStorage() {
  localStorage.setItem(STORAGE_KEYS.objKind, objKindInput.value);
  localStorage.setItem(STORAGE_KEYS.dateFrom, dateFromInput.value);
  localStorage.setItem(STORAGE_KEYS.dateTo, dateToInput.value);
}

function saveResultToStorage(result) {
  localStorage.setItem(STORAGE_KEYS.result, JSON.stringify(result));
}

function saveFileNamesToStorage() {
  localStorage.setItem(STORAGE_KEYS.fileNames, JSON.stringify(loadedFileNames));
}

function updateTopCounters() {
  filesCountEl.textContent = String(loadedFileNames.length);
  objectsCountEl.textContent = String(jsonData.length);
}

function setSummary(resultLength) {
  countEl.textContent = String(resultLength);
  currentObjKindEl.textContent = objKindInput.value.trim() || "—";

  const from = dateFromInput.value || "—";
  const to = dateToInput.value || "—";
  currentDateRangeEl.textContent = `${from} — ${to}`;
}

function renderFileList() {
  if (!loadedFileNames.length) {
    fileListEl.className = "file-list empty-list";
    fileListEl.textContent = "Список пока пуст";
    return;
  }

  fileListEl.className = "file-list";
  fileListEl.innerHTML = loadedFileNames
    .map((name) => `<span class="file-chip">${escapeHtml(name)}</span>`)
    .join("");
}

function formatAddress(address = {}) {
  return [
    address.region,
    address.district,
    address.city,
    address.locality,
    address.street
  ]
    .filter(Boolean)
    .join(", ");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderResults(result) {
  if (!result.length) {
    resultsEl.innerHTML = `<div class="empty">Ничего не найдено.</div>`;
    return;
  }

  resultsEl.innerHTML = result
    .map((item) => {
      const cadBlockNum = escapeHtml(item.cadBlockNum || "—");
      const objKind = escapeHtml(item.objKind || "—");
      const regDateStr = escapeHtml(item.right?.regDateStr || "—");
      const type = escapeHtml(item.type || "—");
      const status = escapeHtml(item.status || "—");
      const area = escapeHtml(item.area ?? "—");
      const purpose = escapeHtml(item.purpose?.text || "—");
      const address = escapeHtml(formatAddress(item.address) || "—");

      return `
        <div class="result-card">
          <div class="result-row"><span class="result-label">cadBlockNum:</span> ${cadBlockNum}</div>
          <div class="result-row"><span class="result-label">objKind:</span> ${objKind}</div>
          <div class="result-row"><span class="result-label">regDateStr:</span> ${regDateStr}</div>
          <div class="result-row"><span class="result-label">type:</span> ${type}</div>
          <div class="result-row"><span class="result-label">status:</span> ${status}</div>
          <div class="result-row"><span class="result-label">area:</span> ${area}</div>
          <div class="result-row"><span class="result-label">purpose:</span> ${purpose}</div>
          <div class="result-row"><span class="result-label">address:</span> ${address}</div>
        </div>
      `;
    })
    .join("");
}

function normalizeDate(dateString) {
  if (!dateString) return null;

  const dateOnly = String(dateString).slice(0, 10);
  const date = new Date(dateOnly);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function resetVisualResult() {
  setSummary(0);
  resultsEl.innerHTML = `<div class="empty">Здесь появится результат...</div>`;
}

function loadFromStorage() {
  const savedObjKind = localStorage.getItem(STORAGE_KEYS.objKind);
  const savedDateFrom = localStorage.getItem(STORAGE_KEYS.dateFrom);
  const savedDateTo = localStorage.getItem(STORAGE_KEYS.dateTo);
  const savedResult = localStorage.getItem(STORAGE_KEYS.result);
  const savedFileNames = localStorage.getItem(STORAGE_KEYS.fileNames);

  if (savedObjKind) objKindInput.value = savedObjKind;
  if (savedDateFrom) dateFromInput.value = savedDateFrom;
  if (savedDateTo) dateToInput.value = savedDateTo;

  if (savedFileNames) {
    try {
      loadedFileNames = JSON.parse(savedFileNames);
    } catch {
      loadedFileNames = [];
    }
  }

  renderFileList();
  updateTopCounters();

  if (savedResult) {
    try {
      const parsedResult = JSON.parse(savedResult);
      setSummary(parsedResult.length);
      renderResults(parsedResult);
    } catch {
      resetVisualResult();
    }
  } else {
    resetVisualResult();
  }

  if (loadedFileNames.length) {
    updateStatus("Имена файлов и результат восстановлены. Сами JSON нужно загрузить заново.");
  } else {
    updateStatus("Файлы пока не загружены");
  }
}

async function handleFilesChange(event) {
  const files = Array.from(event.target.files || []);

  if (!files.length) {
    return;
  }

  updateStatus("Загрузка файлов...");

  try {
    const allData = [];
    const names = [];

    for (const file of files) {
      const text = await file.text();
      const parsed = JSON.parse(text);

      if (!Array.isArray(parsed)) {
        throw new Error(`Файл "${file.name}" должен содержать массив объектов`);
      }

      allData.push(...parsed);
      names.push(file.name);
    }

    jsonData = allData;
    loadedFileNames = names;

    saveFileNamesToStorage();
    updateTopCounters();
    renderFileList();

    localStorage.removeItem(STORAGE_KEYS.result);
    resetVisualResult();

    updateStatus(`Загружено файлов: ${files.length}. Всего объектов: ${jsonData.length}`);
    resultsEl.innerHTML = `<div class="empty">Файлы успешно загружены. Теперь нажмите "Запустить фильтр".</div>`;
  } catch (error) {
    jsonData = [];
    loadedFileNames = [];
    saveFileNamesToStorage();
    updateTopCounters();
    renderFileList();
    resetVisualResult();
    updateStatus(`Ошибка чтения JSON: ${error.message}`);
  }
}

function filterData() {
  if (!jsonData.length) {
    updateStatus("Сначала загрузите хотя бы один JSON-файл");
    return;
  }

  const objKindValue = objKindInput.value.trim();
  const dateFromValue = dateFromInput.value;
  const dateToValue = dateToInput.value;

  saveFiltersToStorage();

  if (!objKindValue) {
    updateStatus("Заполните поле objKind");
    return;
  }

  if (!dateFromValue || !dateToValue) {
    updateStatus("Выберите обе даты: с и по");
    return;
  }

  if (dateFromValue > dateToValue) {
    updateStatus("Дата 'с' не может быть больше даты 'по'");
    return;
  }

  const fromDate = new Date(dateFromValue);
  const toDate = new Date(dateToValue);

  const result = jsonData.filter((obj) => {
    if (obj.objKind !== objKindValue) {
      return false;
    }

    const regDate = normalizeDate(obj.right?.regDateStr);

    if (!regDate) {
      return false;
    }

    return regDate >= fromDate && regDate <= toDate;
  });

  saveResultToStorage(result);
  setSummary(result.length);
  renderResults(result);
  updateStatus(`Фильтр выполнен. Найдено объектов: ${result.length}`);
}

function resetFilters() {
  objKindInput.value = "";
  dateFromInput.value = "";
  dateToInput.value = "";

  localStorage.removeItem(STORAGE_KEYS.objKind);
  localStorage.removeItem(STORAGE_KEYS.dateFrom);
  localStorage.removeItem(STORAGE_KEYS.dateTo);
  localStorage.removeItem(STORAGE_KEYS.result);

  setSummary(0);
  resultsEl.innerHTML = `<div class="empty">Фильтры очищены. Загруженные файлы остались в памяти текущей страницы.</div>`;
  updateStatus("Фильтры сброшены");
}

function clearAllData() {
  jsonData = [];
  loadedFileNames = [];

  fileInput.value = "";
  objKindInput.value = "";
  dateFromInput.value = "";
  dateToInput.value = "";

  localStorage.removeItem(STORAGE_KEYS.objKind);
  localStorage.removeItem(STORAGE_KEYS.dateFrom);
  localStorage.removeItem(STORAGE_KEYS.dateTo);
  localStorage.removeItem(STORAGE_KEYS.result);
  localStorage.removeItem(STORAGE_KEYS.fileNames);

  updateTopCounters();
  renderFileList();
  resetVisualResult();
  updateStatus("Все данные очищены");
}

fileInput.addEventListener("change", handleFilesChange);
objKindInput.addEventListener("input", saveFiltersToStorage);
dateFromInput.addEventListener("input", saveFiltersToStorage);
dateToInput.addEventListener("input", saveFiltersToStorage);

runBtn.addEventListener("click", filterData);
resetBtn.addEventListener("click", resetFilters);
clearAllBtn.addEventListener("click", clearAllData);

loadFromStorage();

if (!dateFromInput.value && !dateToInput.value) {
  dateFromInput.value = "2020-01-01";
  dateToInput.value = "2020-12-31";
  saveFiltersToStorage();
  setSummary(0);
}
