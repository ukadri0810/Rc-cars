const DEFAULT_DATA = {
  packages: [
    { id: "p1", name: "Quick Ride", minutes: 5, price: 200, active: true },
    { id: "p2", name: "Standard", minutes: 10, price: 350, active: true },
    { id: "p3", name: "Long Ride", minutes: 15, price: 500, active: true }
  ],
  cars: [
    { id: "car1", name: "Car 01", ride: null },
    { id: "car2", name: "Car 02", ride: null }
  ],
  rides: [],
  settings: { alarmRepeat: 1, alarmLength: 5000 }
};

let data = loadData();
let selectedCarId = null;
let selectedPackageId = data.packages.find(p => p.active)?.id || null;
let selectedPayment = "UPI";
let extendCarId = null;
let extendPackageId = null;
let audioContext = null;
let alarmBusy = false;

function loadData() {
  const raw = localStorage.getItem("rcRentalData");
  if (!raw) return structuredClone(DEFAULT_DATA);
  try {
    const parsed = JSON.parse(raw);
    return {
      ...structuredClone(DEFAULT_DATA),
      ...parsed,
      settings: { ...DEFAULT_DATA.settings, ...(parsed.settings || {}) }
    };
  } catch {
    return structuredClone(DEFAULT_DATA);
  }
}

function saveData() {
  localStorage.setItem("rcRentalData", JSON.stringify(data));
}

function money(n) {
  return "₹" + Number(n || 0).toLocaleString("en-IN");
}

function formatTime(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60).toString().padStart(2, "0");
  const s = (total % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function todayRides() {
  return data.rides.filter(r => r.date === todayKey());
}

function render() {
  renderStats();
  renderCars();
  renderActivity();
}

function renderStats() {
  const rides = todayRides();
  document.getElementById("rideCount").textContent = rides.length;
  document.getElementById("revenue").textContent = money(rides.reduce((sum, r) => sum + r.total, 0));
}

function renderCars() {
  const grid = document.getElementById("carsGrid");
  grid.innerHTML = "";

  data.cars.forEach(car => {
    const ride = car.ride;
    const card = document.createElement("div");
    let state = "available";

    if (ride) {
      if (ride.ended) state = "timeup";
      else if (ride.endsAt - Date.now() <= 60000) state = "ending";
      else state = "running";
    }

    card.className = `car-card ${state}`;

    if (!ride) {
      card.innerHTML = `
        <div class="car-top">
          <div>
            <div class="eyebrow">RC CAR</div>
            <div class="car-name">${escapeHtml(car.name)}</div>
          </div>
          <span class="status available">AVAILABLE</span>
        </div>
        <div class="empty" style="text-align:center;padding:28px 0;">Ready for next customer</div>
        <button class="primary-btn full" data-start="${car.id}">NEW RIDE</button>
      `;
    } else {
      const remaining = Math.max(0, ride.endsAt - Date.now());
      const label = ride.ended ? "TIME OVER" : remaining <= 60000 ? "ENDING SOON" : "REMAINING";
      const customer = ride.customer || "Walk-in customer";
      card.innerHTML = `
        <div class="car-top">
          <div>
            <div class="eyebrow">RC CAR</div>
            <div class="car-name">${escapeHtml(car.name)}</div>
          </div>
          <span class="status ${state}">${label}</span>
        </div>
        <div class="customer">${escapeHtml(customer)} • ${escapeHtml(ride.packageName)}</div>
        <div class="timer">${ride.ended ? "00:00" : formatTime(remaining)}</div>
        <div class="timer-label">${ride.ended ? "PLEASE RETURN CAR" : "TIME REMAINING"}</div>
        <div class="meta">
          <span>${money(ride.total)}</span>
          <span>${ride.payment}</span>
        </div>
        <div class="actions">
          ${ride.ended ? `<button class="primary-btn" data-end="${car.id}">END RIDE</button>` : `<button class="secondary-btn" data-extend="${car.id}">+ EXTEND</button><button class="danger-btn" data-end="${car.id}">END RIDE</button>`}
        </div>
      `;
    }
    grid.appendChild(card);
  });

  grid.querySelectorAll("[data-start]").forEach(b => b.onclick = () => openRideModal(b.dataset.start));
  grid.querySelectorAll("[data-extend]").forEach(b => b.onclick = () => openExtendModal(b.dataset.extend));
  grid.querySelectorAll("[data-end]").forEach(b => b.onclick = () => endRide(b.dataset.end));
}

function renderActivity() {
  const el = document.getElementById("activityList");
  const rides = todayRides().slice().reverse().slice(0, 10);
  if (!rides.length) {
    el.innerHTML = `<div class="empty">No rides yet today.</div>`;
    return;
  }
  el.innerHTML = rides.map(r => `
    <div class="activity">
      <div><strong>${escapeHtml(r.customer || "Walk-in")}</strong><br><small>${escapeHtml(r.carName)} • ${escapeHtml(r.packageName)}</small></div>
      <div style="text-align:right"><strong>${money(r.total)}</strong><br><small>${r.payment}</small></div>
    </div>
  `).join("");
}

function openRideModal(carId) {
  selectedCarId = carId;
  selectedPackageId = data.packages.find(p => p.active)?.id || null;
  selectedPayment = "UPI";
  document.getElementById("modalCarName").textContent = data.cars.find(c => c.id === carId)?.name || "";
  document.getElementById("customerName").value = "";
  renderPackageOptions();
  document.querySelectorAll(".payment-btn").forEach(b => b.classList.toggle("active", b.dataset.payment === selectedPayment));
  showModal("rideModal");
}

function renderPackageOptions() {
  const el = document.getElementById("packageOptions");
  el.innerHTML = data.packages.filter(p => p.active).map(p => `
    <button class="package-option ${p.id === selectedPackageId ? "selected" : ""}" data-package="${p.id}">
      <div><strong>${escapeHtml(p.name)}</strong><span>${p.minutes} minutes</span></div>
      <strong>${money(p.price)}</strong>
    </button>
  `).join("");
  el.querySelectorAll("[data-package]").forEach(b => b.onclick = () => {
    selectedPackageId = b.dataset.package;
    renderPackageOptions();
  });
}

function startRide() {
  const car = data.cars.find(c => c.id === selectedCarId);
  const pkg = data.packages.find(p => p.id === selectedPackageId);
  if (!car || !pkg || car.ride) return;

  // Unlock audio after an explicit user gesture.
  ensureAudio();

  const now = Date.now();
  car.ride = {
    id: crypto.randomUUID ? crypto.randomUUID() : String(now),
    customer: document.getElementById("customerName").value.trim(),
    packageId: pkg.id,
    packageName: pkg.name,
    minutes: pkg.minutes,
    total: pkg.price,
    payment: selectedPayment,
    startedAt: now,
    endsAt: now + pkg.minutes * 60000,
    ended: false,
    alarmPlayed: false
  };

  saveData();
  closeModal("rideModal");
  toast(`${car.name} ride started`);
  render();
}

function openExtendModal(carId) {
  extendCarId = carId;
  extendPackageId = data.packages.find(p => p.active)?.id || null;
  document.getElementById("extendCarName").textContent = data.cars.find(c => c.id === carId)?.name || "";
  renderExtensionOptions();
  showModal("extendModal");
}

function renderExtensionOptions() {
  const el = document.getElementById("extensionOptions");
  el.innerHTML = data.packages.filter(p => p.active).map(p => `
    <button class="package-option ${p.id === extendPackageId ? "selected" : ""}" data-ext="${p.id}">
      <div><strong>+ ${p.minutes} minutes</strong><span>Add to current ride</span></div>
      <strong>${money(p.price)}</strong>
    </button>
  `).join("");
  el.querySelectorAll("[data-ext]").forEach(b => b.onclick = () => {
    extendPackageId = b.dataset.ext;
    renderExtensionOptions();
  });
}

function confirmExtend() {
  const car = data.cars.find(c => c.id === extendCarId);
  const pkg = data.packages.find(p => p.id === extendPackageId);
  if (!car?.ride || !pkg) return;

  car.ride.endsAt += pkg.minutes * 60000;
  car.ride.total += pkg.price;
  car.ride.alarmPlayed = false;
  car.ride.ended = false;

  saveData();
  closeModal("extendModal");
  toast(`Added ${pkg.minutes} minutes`);
  render();
}

function endRide(carId) {
  const car = data.cars.find(c => c.id === carId);
  if (!car?.ride) return;

  const ride = car.ride;
  data.rides.push({
    ...ride,
    carId: car.id,
    carName: car.name,
    date: todayKey(),
    completedAt: Date.now()
  });
  car.ride = null;
  saveData();
  toast("Ride completed");
  render();
}

function checkTimers() {
  let changed = false;

  data.cars.forEach(car => {
    const ride = car.ride;
    if (!ride || ride.ended) return;

    if (Date.now() >= ride.endsAt) {
      ride.ended = true;
      changed = true;
      if (!ride.alarmPlayed) {
        ride.alarmPlayed = true;
        saveData();
        triggerAlarm(car);
      }
    }
  });

  if (changed) saveData();
  render();
}

function ensureAudio() {
  try {
    if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
    if (audioContext.state === "suspended") audioContext.resume();
  } catch {}
}

function playTone(start, duration, frequency) {
  if (!audioContext) return;
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(0.42, start + 0.05);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain);
  gain.connect(audioContext.destination);
  osc.start(start);
  osc.stop(start + duration + 0.05);
}

function alarmSequence() {
  ensureAudio();
  if (!audioContext) return;

  const now = audioContext.currentTime;
  // A longer, unmistakable three-note chime rather than a short notification beep.
  playTone(now, 0.7, 740);
  playTone(now + 0.8, 0.7, 587);
  playTone(now + 1.6, 1.0, 740);
}

function triggerAlarm(car) {
  if (alarmBusy) return;
  alarmBusy = true;

  const repeat = Number(data.settings.alarmRepeat || 1);
  const length = Number(data.settings.alarmLength || 5000);

  for (let i = 0; i < repeat; i++) {
    setTimeout(() => {
      alarmSequence();
      if (navigator.vibrate) navigator.vibrate([300, 150, 300, 150, 500]);
    }, i * (length + 700));
  }

  setTimeout(() => {
    alarmBusy = false;
  }, repeat * (length + 700) + 100);

  toast(`TIME OVER — ${car.name}${car.ride.customer ? " • " + car.ride.customer : ""}`);
}

function testSound() {
  ensureAudio();
  alarmSequence();
  toast("Ride-over sound tested");
}

function renderSettings() {
  const el = document.getElementById("settingsPackages");
  el.innerHTML = data.packages.map((p, i) => `
    <div class="settings-package" data-setting-package="${i}">
      <input class="pkg-name" value="${escapeAttr(p.name)}" placeholder="Package">
      <input class="pkg-min" type="number" min="1" value="${p.minutes}" placeholder="Minutes">
      <input class="pkg-price" type="number" min="0" value="${p.price}" placeholder="Price">
      <button class="danger-btn remove-pkg" type="button">×</button>
    </div>
  `).join("");

  document.getElementById("alarmRepeat").value = String(data.settings.alarmRepeat);
  document.getElementById("alarmLength").value = String(data.settings.alarmLength);

  el.querySelectorAll(".remove-pkg").forEach(btn => {
    btn.onclick = () => {
      const row = btn.closest("[data-setting-package]");
      const index = Number(row.dataset.settingPackage);
      data.packages.splice(index, 1);
      renderSettings();
    };
  });
}

function saveSettings() {
  const rows = [...document.querySelectorAll("[data-setting-package]")];
  data.packages = rows.map((row, i) => ({
    id: data.packages[i]?.id || ("p" + Date.now() + i),
    name: row.querySelector(".pkg-name").value.trim() || `Package ${i + 1}`,
    minutes: Math.max(1, Number(row.querySelector(".pkg-min").value) || 1),
    price: Math.max(0, Number(row.querySelector(".pkg-price").value) || 0),
    active: true
  }));
  data.settings.alarmRepeat = Number(document.getElementById("alarmRepeat").value);
  data.settings.alarmLength = Number(document.getElementById("alarmLength").value);
  saveData();
  closeModal("settingsModal");
  toast("Settings saved");
  render();
}

function addPackage() {
  data.packages.push({
    id: "p" + Date.now(),
    name: "New Package",
    minutes: 5,
    price: 200,
    active: true
  });
  renderSettings();
}

function showModal(id) { document.getElementById(id).classList.remove("hidden"); }
function closeModal(id) { document.getElementById(id).classList.add("hidden"); }
function toast(message) {
  const el = document.getElementById("toast");
  el.textContent = message;
  el.classList.remove("hidden");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.add("hidden"), 2600);
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;" }[c]));
}
function escapeAttr(value) { return escapeHtml(value); }

document.querySelectorAll("[data-close]").forEach(b => b.onclick = () => closeModal(b.dataset.close));
document.getElementById("startRideBtn").onclick = startRide;
document.getElementById("confirmExtendBtn").onclick = confirmExtend;
document.getElementById("soundTestBtn").onclick = testSound;
document.getElementById("settingsBtn").onclick = () => { renderSettings(); showModal("settingsModal"); };
document.getElementById("addPackageBtn").onclick = addPackage;
document.getElementById("saveSettingsBtn").onclick = saveSettings;

document.querySelectorAll(".payment-btn").forEach(b => {
  b.onclick = () => {
    selectedPayment = b.dataset.payment;
    document.querySelectorAll(".payment-btn").forEach(x => x.classList.toggle("active", x === b));
  };
});

document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    checkTimers();
  }
});

render();
setInterval(checkTimers, 500);


if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
  window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}));
}
