const STORAGE_KEYS = {
  jsonData: "json_filter_data",
  fileName: "json_filter_file_name",
  objKind: "json_filter_objKind",
  dateFrom: "json_filter_date_from",
  dateTo: "json_filter_date_to",
  result: "json_filter_result",
};

let jsonData = [];

const fileInput = document.getElementById("fileInput");
const objKindInput = document.getElementById("objKindInput");
const dateFromInput = document.getElementById("dateFromInput");
const dateToInput = document.getElementById("dateToInput");
const runBtn = document.getElementById("runBtn");
const resetBtn = document.getElementById("resetBtn");
const clearAllBtn = document.getElementById("clearAllBtn");

const statusEl = document.getElementById("status");
const countEl = document.getElementById("count");
const currentObjKindEl = document.getElementById("currentObjKind");
const currentDateRangeEl = document.getElementById("currentDateRange");
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

function setSummary(resultLength) {
  countEl.textContent = String(resultLength);
  currentObjKindEl.textContent = objKindInput.value.trim() || "—";

  const from = dateFromInput.value || "—";
  const to = dateToInput.value || "—";
  currentDateRangeEl.textContent = `${from} — ${to}`;
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

function renderResults(result) {
  if (!result.length) {
    resultsEl.innerHTML = `<div class="empty">Ничего не найдено.</div>`;
    return;
  }

  resultsEl.innerHTML = result
    .map(
      (item) => `
        <div class="result-card">
          <div class="result-row"><span class="result-label">cadBlockNum:</span> ${item.cadBlockNum || "—"}</div>
          <div class="result-row"><span class="result-label">objKind:</span> ${item.objKind || "—"}</div>
          <div class="result-row"><span class="result-label">regDateStr:</span> ${item.right?.regDateStr || "—"}</div>
          <div class="result-row"><span class="result-label">type:</span> ${item.type || "—"}</div>
          <div class="result-row"><span class="result-label">status:</span> ${item.status || "—"}</div>
          <div class="result-row"><span class="result-label">area:</span> ${item.area ?? "—"}</div>
          <div class="result-row"><span class="result-label">purpose:</span> ${item.purpose?.text || "—"}</div>
          <div class="result-row"><span class="result-label">address:</span> ${formatAddress(item.address) || "—"}</div>
        </div>
      `,
    )
    .join("");
}

function loadFromStorage() {
  const savedObjKind = localStorage.getItem(STORAGE_KEYS.objKind);
  const savedDateFrom = localStorage.getItem(STORAGE_KEYS.dateFrom);
  const savedDateTo = localStorage.getItem(STORAGE_KEYS.dateTo);
  const savedJsonData = localStorage.getItem(STORAGE_KEYS.jsonData);
  const savedFileName = localStorage.getItem(STORAGE_KEYS.fileName);
  const savedResult = localStorage.getItem(STORAGE_KEYS.result);

  if (savedObjKind) objKindInput.value = savedObjKind;
  if (savedDateFrom) dateFromInput.value = savedDateFrom;
  if (savedDateTo) dateToInput.value = savedDateTo;

  if (savedJsonData) {
    try {
      jsonData = JSON.parse(savedJsonData);
      updateStatus(
        savedFileName
          ? `Загружен сохраненный файл: ${savedFileName}`
          : "JSON восстановлен из localStorage",
      );
    } catch (error) {
      jsonData = [];
      updateStatus("Не удалось восстановить JSON из localStorage");
    }
  }

  if (savedResult) {
    try {
      const parsedResult = JSON.parse(savedResult);
      setSummary(parsedResult.length);
      renderResults(parsedResult);
    } catch (error) {
      setSummary(0);
    }
  } else {
    setSummary(0);
  }
}

function normalizeDate(dateString) {
  if (!dateString) return null;
  const dateOnly = String(dateString).slice(0, 10);
  const date = new Date(dateOnly);
  return Number.isNaN(date.getTime()) ? null : date;
}

function filterData() {
  if (!Array.isArray(jsonData)) {
    updateStatus("Ошибка: JSON должен быть массивом объектов");
    renderResults([]);
    setSummary(0);
    return;
  }

  const objKindValue = objKindInput.value.trim();
  const dateFromValue = dateFromInput.value;
  const dateToValue = dateToInput.value;

  saveFiltersToStorage();

  if (!objKindValue) {
    updateStatus("Заполни поле objKind");
    return;
  }

  if (!dateFromValue || !dateToValue) {
    updateStatus("Выбери обе даты: с и по");
    return;
  }

  if (dateFromValue > dateToValue) {
    updateStatus("Дата 'с' не может быть больше даты 'по'");
    return;
  }

  const fromDate = new Date(dateFromValue);
  const toDate = new Date(dateToValue);

  const result = jsonData.filter((obj) => {
    if (obj.objKind !== objKindValue) return false;

    const regDate = normalizeDate(obj.right?.regDateStr);
    if (!regDate) return false;

    return regDate >= fromDate && regDate <= toDate;
  });

  updateStatus("Фильтр выполнен");
  setSummary(result.length);
  renderResults(result);
  saveResultToStorage(result);
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
  resultsEl.innerHTML = `<div class="empty">Фильтры очищены. JSON остался загруженным.</div>`;
  updateStatus("Поля фильтра очищены");
}

function clearAllData() {
  localStorage.removeItem(STORAGE_KEYS.jsonData);
  localStorage.removeItem(STORAGE_KEYS.fileName);
  localStorage.removeItem(STORAGE_KEYS.objKind);
  localStorage.removeItem(STORAGE_KEYS.dateFrom);
  localStorage.removeItem(STORAGE_KEYS.dateTo);
  localStorage.removeItem(STORAGE_KEYS.result);

  jsonData = [];
  fileInput.value = "";
  objKindInput.value = "";
  dateFromInput.value = "";
  dateToInput.value = "";

  setSummary(0);
  resultsEl.innerHTML = `<div class="empty">Все данные удалены.</div>`;
  updateStatus("localStorage очищен, JSON удален");
}

fileInput.addEventListener("change", function (e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = function (event) {
    try {
      const parsed = JSON.parse(event.target.result);

      if (!Array.isArray(parsed)) {
        updateStatus("Ошибка: JSON должен быть массивом");
        resultsEl.innerHTML = `<div class="empty">Загруженный JSON должен быть массивом объектов.</div>`;
        return;
      }

      jsonData = parsed;

      localStorage.setItem(STORAGE_KEYS.jsonData, JSON.stringify(parsed));
      localStorage.setItem(STORAGE_KEYS.fileName, file.name);

      updateStatus(`Файл загружен и сохранен: ${file.name}`);
      resultsEl.innerHTML = `<div class="empty">JSON успешно загружен. Теперь запусти фильтр.</div>`;
    } catch (error) {
      jsonData = [];
      updateStatus("Ошибка чтения JSON");
      resultsEl.innerHTML = `<div class="empty">Файл не является корректным JSON.</div>`;
    }
  };

  reader.readAsText(file);
});

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
