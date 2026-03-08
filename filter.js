const STORAGE_KEYS = {
  objKind: "json_filter_objKind",
  purpose: "json_filter_purpose",
  dateFrom: "json_filter_date_from",
  dateTo: "json_filter_date_to",
  result: "json_filter_result",
  fileNames: "json_filter_file_names",
};

let jsonData = [];
let loadedFileNames = [];
let lastFilteredResult = [];

const fileInput = document.getElementById("fileInput");
const objKindInput = document.getElementById("objKindInput");
const purposeInput = document.getElementById("purposeInput");
const dateFromInput = document.getElementById("dateFromInput");
const dateToInput = document.getElementById("dateToInput");
const runBtn = document.getElementById("runBtn");
const downloadBtn = document.getElementById("downloadBtn");
const resetBtn = document.getElementById("resetBtn");
const clearAllBtn = document.getElementById("clearAllBtn");

const statusEl = document.getElementById("status");
const filesCountEl = document.getElementById("filesCount");
const objectsCountEl = document.getElementById("objectsCount");
const countEl = document.getElementById("count");
const currentObjKindEl = document.getElementById("currentObjKind");
const currentPurposeEl = document.getElementById("currentPurpose");
const currentDateRangeEl = document.getElementById("currentDateRange");
const fileListEl = document.getElementById("fileList");
const resultsEl = document.getElementById("results");

const toggleFilesBtn = document.getElementById("toggleFilesBtn");
const fileListWrapper = document.getElementById("fileListWrapper");

function updateStatus(text) {
  statusEl.textContent = text;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function saveFiltersToStorage() {
  localStorage.setItem(STORAGE_KEYS.objKind, objKindInput.value);
  localStorage.setItem(STORAGE_KEYS.purpose, purposeInput.value);
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
  currentPurposeEl.textContent = purposeInput.value.trim() || "—";

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
    address.street,
  ]
    .filter(Boolean)
    .join(", ");
}

function getRegMonth(obj) {
  if (obj.regDate) {
    return String(obj.regDate).slice(0, 7);
  }

  if (obj.right?.regDateStr) {
    return String(obj.right.regDateStr).slice(0, 7);
  }

  return null;
}

function resetVisualResult() {
  lastFilteredResult = [];
  setSummary(0);
  resultsEl.innerHTML = `<div class="empty">Здесь появится результат...</div>`;
}

function getDownloadableResult() {
  return lastFilteredResult.map(({ __sourceFile, ...rest }) => ({
    ...rest,
    sourceFile: __sourceFile || "",
  }));
}

function downloadResultJson() {
  if (!lastFilteredResult.length) {
    updateStatus("Нечего скачивать. Сначала выполните фильтр.");
    return;
  }

  const cleanResult = getDownloadableResult();
  const jsonString = JSON.stringify(cleanResult, null, 2);
  const blob = new Blob([jsonString], {
    type: "application/json;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);

  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const fileName = `filtered-result-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}-${pad(now.getMinutes())}.json`;

  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
  updateStatus(`Результат скачан: ${fileName}`);
}

function renderResults(result) {
  if (!result.length) {
    resultsEl.innerHTML = `<div class="empty">Ничего не найдено.</div>`;
    return;
  }

  resultsEl.innerHTML = result
    .map((item) => {
      const sourceFile = escapeHtml(item.__sourceFile || "—");
      const cadBlockNum = escapeHtml(item.cadBlockNum || "—");
      const objKind = escapeHtml(item.objKind || "—");
      const regDate = escapeHtml(item.regDate || item.right?.regDateStr || "—");
      const type = escapeHtml(item.type || "—");
      const status = escapeHtml(item.status || "—");
      const area = escapeHtml(item.area ?? "—");
      const purpose = escapeHtml(item.purpose?.text || "—");
      const address = escapeHtml(formatAddress(item.address) || "—");

      return `
        <div class="result-card">
          <div class="source-file">Файл: ${sourceFile}</div>
          <div class="result-row"><span class="result-label">cadBlockNum:</span> ${cadBlockNum}</div>
          <div class="result-row"><span class="result-label">objKind:</span> ${objKind}</div>
          <div class="result-row"><span class="result-label">regDate:</span> ${regDate}</div>
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

function loadFromStorage() {
  const savedObjKind = localStorage.getItem(STORAGE_KEYS.objKind);
  const savedPurpose = localStorage.getItem(STORAGE_KEYS.purpose);
  const savedDateFrom = localStorage.getItem(STORAGE_KEYS.dateFrom);
  const savedDateTo = localStorage.getItem(STORAGE_KEYS.dateTo);
  const savedResult = localStorage.getItem(STORAGE_KEYS.result);
  const savedFileNames = localStorage.getItem(STORAGE_KEYS.fileNames);

  if (savedObjKind) objKindInput.value = savedObjKind;
  if (savedPurpose) purposeInput.value = savedPurpose;
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
      lastFilteredResult = parsedResult;
      setSummary(parsedResult.length);
      renderResults(parsedResult);
    } catch {
      resetVisualResult();
    }
  } else {
    resetVisualResult();
  }

  if (loadedFileNames.length) {
    updateStatus(
      "Имена файлов и результат восстановлены. Сами JSON нужно загрузить заново.",
    );
  } else {
    updateStatus("Файлы пока не загружены");
  }
}

async function handleFilesChange(event) {
  const files = Array.from(event.target.files || []);

  if (!files.length) return;

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

      const parsedWithSource = parsed.map((item) => ({
        ...item,
        __sourceFile: file.name,
      }));

      allData.push(...parsedWithSource);
      names.push(file.name);
    }

    jsonData = allData;
    loadedFileNames = names;

    saveFileNamesToStorage();
    updateTopCounters();
    renderFileList();

    localStorage.removeItem(STORAGE_KEYS.result);
    resetVisualResult();

    updateStatus(
      `Загружено файлов: ${files.length}. Всего объектов: ${jsonData.length}`,
    );
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
  const purposeValue = purposeInput.value.trim().toLowerCase();
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

  const fromMonth = dateFromValue.slice(0, 7);
  const toMonth = dateToValue.slice(0, 7);

  const result = jsonData.filter((obj) => {
    if (obj.objKind !== objKindValue) {
      return false;
    }

    const regMonth = getRegMonth(obj);
    if (!regMonth) {
      return false;
    }

    if (regMonth < fromMonth || regMonth > toMonth) {
      return false;
    }

    if (purposeValue) {
      const purposeText = (obj.purpose?.text || "").toLowerCase();
      if (!purposeText.includes(purposeValue)) {
        return false;
      }
    }

    return true;
  });

  lastFilteredResult = result;
  saveResultToStorage(result);
  setSummary(result.length);
  renderResults(result);
  updateStatus(`Фильтр выполнен. Найдено объектов: ${result.length}`);
}

function resetFilters() {
  objKindInput.value = "";
  purposeInput.value = "";
  dateFromInput.value = "";
  dateToInput.value = "";

  localStorage.removeItem(STORAGE_KEYS.objKind);
  localStorage.removeItem(STORAGE_KEYS.purpose);
  localStorage.removeItem(STORAGE_KEYS.dateFrom);
  localStorage.removeItem(STORAGE_KEYS.dateTo);
  localStorage.removeItem(STORAGE_KEYS.result);

  resetVisualResult();
  resultsEl.innerHTML = `<div class="empty">Фильтры очищены. Загруженные файлы остались в памяти текущей страницы.</div>`;
  updateStatus("Фильтры сброшены");
}

function clearAllData() {
  jsonData = [];
  loadedFileNames = [];
  lastFilteredResult = [];

  fileInput.value = "";
  objKindInput.value = "";
  purposeInput.value = "";
  dateFromInput.value = "";
  dateToInput.value = "";

  localStorage.removeItem(STORAGE_KEYS.objKind);
  localStorage.removeItem(STORAGE_KEYS.purpose);
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
purposeInput.addEventListener("input", saveFiltersToStorage);
dateFromInput.addEventListener("input", saveFiltersToStorage);
dateToInput.addEventListener("input", saveFiltersToStorage);

runBtn.addEventListener("click", filterData);
downloadBtn.addEventListener("click", downloadResultJson);
resetBtn.addEventListener("click", resetFilters);
clearAllBtn.addEventListener("click", clearAllData);

toggleFilesBtn.addEventListener("click", () => {
  const isHidden = fileListWrapper.classList.contains("hidden");

  if (isHidden) {
    fileListWrapper.classList.remove("hidden");
    toggleFilesBtn.textContent = "Скрыть";
  } else {
    fileListWrapper.classList.add("hidden");
    toggleFilesBtn.textContent = "Показать";
  }
});

loadFromStorage();

if (!dateFromInput.value && !dateToInput.value) {
  dateFromInput.value = "2020-01-01";
  dateToInput.value = "2020-12-31";
  saveFiltersToStorage();
  setSummary(0);
}
