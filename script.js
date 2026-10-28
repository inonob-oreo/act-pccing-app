const STORAGE_KEY = "yorimichi-daily-records";
const dateInput = document.querySelector("#record-date");
const saveMessage = document.querySelector("#save-message");
const activityList = document.querySelector("#activity-list");
const medicationList = document.querySelector("#medication-list");
const activityForm = document.querySelector("#activity-form");
const vitalsForm = document.querySelector("#vitals-form");
const medicationForm = document.querySelector("#medication-form");

let records = {};
let activeDate = "";

function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function emptyRecord() {
  return { activities: [], vitals: {}, medications: [] };
}

function showMessage(message, isError = false) {
  saveMessage.textContent = message;
  saveMessage.classList.toggle("error", isError);
}

function saveRecords() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    showMessage("この端末に保存しました。");
    return true;
  } catch (error) {
    console.error("記録を保存できませんでした。", error);
    showMessage("記録を保存できませんでした。端末の空き容量をご確認ください。", true);
    return false;
  }
}

function getCurrentRecord() {
  if (!records[activeDate]) records[activeDate] = emptyRecord();
  return records[activeDate];
}

function createTextElement(tag, className, text) {
  const element = document.createElement(tag);
  element.className = className;
  element.textContent = text;
  return element;
}

function renderActivities(activities) {
  activityList.replaceChildren();
  if (activities.length === 0) {
    activityList.append(createTextElement("div", "empty-state", "活動を記録すると、ここに表示されます。"));
    return;
  }

  activities.forEach((activity) => {
    const entry = document.createElement("div");
    entry.className = "entry";
    const main = document.createElement("div");
    main.className = "entry-main";
    main.append(createTextElement("div", "entry-title", activity.name));
    const details = [`${activity.duration} 分`, activity.effort, activity.effect].filter(Boolean).join(" ・ ");
    main.append(createTextElement("div", "entry-detail", details));
    const remove = createTextElement("button", "icon-button", "削除");
    remove.type = "button";
    remove.setAttribute("aria-label", `${activity.name}の記録を削除`);
    remove.addEventListener("click", () => {
      const record = getCurrentRecord();
      record.activities = record.activities.filter((item) => item.id !== activity.id);
      saveRecords();
      render();
    });
    entry.append(main, remove);
    activityList.append(entry);
  });
}

function renderMedications(medications) {
  medicationList.replaceChildren();
  if (medications.length === 0) {
    medicationList.append(createTextElement("div", "empty-state", "お薬を追加してください。"));
    return;
  }

  medications.forEach((medication) => {
    const entry = document.createElement("div");
    entry.className = `medication-entry${medication.taken ? " is-taken" : ""}`;
    const label = document.createElement("label");
    label.className = "medication-check";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = medication.taken;
    checkbox.setAttribute("aria-label", `${medication.name}を服用済みにする`);
    checkbox.addEventListener("change", () => {
      const record = getCurrentRecord();
      const target = record.medications.find((item) => item.id === medication.id);
      if (target) target.taken = checkbox.checked;
      saveRecords();
      render();
    });
    const main = document.createElement("span");
    main.className = "medication-main";
    main.append(createTextElement("span", "medication-name", medication.name));
    if (medication.time) main.append(createTextElement("span", "medication-time", medication.time));
    label.append(checkbox, main);
    const remove = createTextElement("button", "icon-button", "削除");
    remove.type = "button";
    remove.setAttribute("aria-label", `${medication.name}を削除`);
    remove.addEventListener("click", () => {
      const record = getCurrentRecord();
      record.medications = record.medications.filter((item) => item.id !== medication.id);
      saveRecords();
      render();
    });
    entry.append(label, remove);
    medicationList.append(entry);
  });
}

function renderVitals(vitals) {
  vitalsForm.reset();
  for (const [name, value] of Object.entries(vitals)) {
    const input = vitalsForm.elements.namedItem(name);
    if (input && "value" in input) input.value = value;
  }
}

function renderSummary(record) {
  document.querySelector("#activity-summary").textContent = `${record.activities.length} 件`;
  const vitalCount = Object.values(record.vitals).filter((value) => value !== "").length;
  document.querySelector("#vital-summary").textContent = vitalCount ? `${vitalCount} 項目` : "未記録";
  const takenCount = record.medications.filter((medication) => medication.taken).length;
  document.querySelector("#medication-summary").textContent = record.medications.length
    ? `${takenCount} / ${record.medications.length} 件`
    : "0 件";
}

function render() {
  const record = getCurrentRecord();
  renderActivities(record.activities);
  renderMedications(record.medications);
  renderVitals(record.vitals);
  renderSummary(record);
}

function makeId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

activityForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(activityForm);
  getCurrentRecord().activities.push({
    id: makeId(),
    name: data.get("name").trim(),
    duration: Number(data.get("duration")),
    effort: data.get("effort"),
    effect: data.get("effect").trim()
  });
  saveRecords();
  activityForm.reset();
  render();
});

vitalsForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(vitalsForm);
  const vitals = Object.fromEntries(data.entries());
  getCurrentRecord().vitals = vitals;
  saveRecords();
  render();
});

medicationForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(medicationForm);
  getCurrentRecord().medications.push({
    id: makeId(),
    name: data.get("name").trim(),
    time: data.get("time"),
    taken: false
  });
  saveRecords();
  medicationForm.reset();
  render();
});

dateInput.addEventListener("change", () => {
  if (!dateInput.value) dateInput.value = localDateString();
  activeDate = dateInput.value;
  showMessage("");
  render();
});

try {
  const storedRecords = localStorage.getItem(STORAGE_KEY);
  if (storedRecords) records = JSON.parse(storedRecords);
} catch (error) {
  console.error("保存された記録を読み込めませんでした。", error);
  showMessage("保存された記録を読み込めませんでした。ブラウザーの保存データをご確認ください。", true);
}

activeDate = localDateString();
dateInput.value = activeDate;
render();
