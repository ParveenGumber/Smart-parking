// ============================================
// PARKSMART - SMART PARKING MANAGEMENT SYSTEM
// Frontend connected to C++ backend
// ============================================

const RATES = {
  car: 40,
  motorcycle: 20,
};

const state = {
  slots: [],
  records: [],
  revenue: 0,
};

let toastTimer;

// ============================================
// API COMMUNICATION
// ============================================

async function apiRequest(endpoint, options = {}) {
  const response = await fetch(endpoint, {
    cache: "no-store",
    ...options,
  });

  let data;

  try {
    data = await response.json();
  } catch {
    throw new Error(`Invalid server response. Status: ${response.status}`);
  }

  if (!response.ok) {
    throw new Error(data.error || data.message || "Request failed.");
  }

  return data;
}

// ============================================
// CONNECTION STATUS
// ============================================

function setConnectionStatus(connected) {
  const statusTexts = ["Demo Mode", "Live Mode", "Connected", "Disconnected"];

  document.querySelectorAll("body *").forEach((element) => {
    if (
      element.children.length === 0 &&
      statusTexts.includes(element.textContent.trim())
    ) {
      element.textContent = connected ? "Live Mode" : "Disconnected";
    }
  });
}

// ============================================
// LOAD DATA FROM C++ BACKEND
// ============================================

async function refreshFromBackend(showErrorToast = false) {
  try {
    const [dashboard, slotsData, historyData] = await Promise.all([
      apiRequest("/api/dashboard"),
      apiRequest("/api/slots"),
      apiRequest("/api/history"),
    ]);

    // Update parking slots.
    state.slots = slotsData.slots.map((slot) => ({
      id: slot.id,
      occupied: Boolean(slot.occupied),
      vehicleNumber: slot.vehicleNumber || null,
    }));

    // Update parking history.
    state.records = historyData.records.map((record, index) => ({
      id: `backend-${index}`,
      vehicleNumber: record.vehicleNumber,
      vehicleType: record.vehicleType,
      slot: record.slot,
      entryTime: Number(record.entryTime) * 1000,
      exitTime:
        Number(record.exitTime) > 0 ? Number(record.exitTime) * 1000 : null,
      durationMinutes: Number(record.durationMinutes) || 0,
      fee: Number(record.fee) || 0,
      status: record.status,
    }));

    // Update revenue from the backend.
    state.revenue = Number(dashboard.totalRevenue) || 0;

    renderAll();
    setConnectionStatus(true);

    return true;
  } catch (error) {
    console.error("Backend connection failed:", error);

    setConnectionStatus(false);

    if (showErrorToast) {
      showToast(
        error.message || "Could not connect to the parking server.",
        true,
      );
    }

    return false;
  }
}

// ============================================
// NOTIFICATION MESSAGE
// ============================================

function showToast(message, isError = false) {
  const toast = document.getElementById("toast");

  if (!toast) {
    alert(message);
    return;
  }

  toast.textContent = message;
  toast.classList.toggle("error", isError);
  toast.classList.add("show");

  clearTimeout(toastTimer);

  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}

// ============================================
// FORMAT CURRENCY
// ============================================

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

// ============================================
// FORMAT DATE AND TIME
// ============================================

function formatDateTime(timestamp) {
  if (!timestamp) {
    return "—";
  }

  return new Date(timestamp).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ============================================
// FORMAT PARKING DURATION
// ============================================

function formatDuration(minutes) {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours === 0) {
    return `${remainingMinutes} min`;
  }

  if (remainingMinutes === 0) {
    return `${hours} hr`;
  }

  return `${hours} hr ${remainingMinutes} min`;
}

// ============================================
// CALCULATE DISPLAYED PARKING FEE
// ============================================

function calculateFee(durationMinutes, vehicleType) {
  const rate = RATES[vehicleType];

  if (
    !Number.isFinite(durationMinutes) ||
    durationMinutes < 0 ||
    rate === undefined
  ) {
    return 0;
  }

  const hours = Math.max(1, Math.ceil(durationMinutes / 60));

  return hours * rate;
}

// ============================================
// FIND ACTIVE PARKING RECORD
// ============================================

function getActiveRecord(vehicleNumber) {
  const normalized = vehicleNumber.trim().toUpperCase();

  return state.records.find(
    (record) =>
      record.vehicleNumber === normalized && record.status === "parked",
  );
}

// ============================================
// DASHBOARD
// ============================================

function renderDashboard() {
  const total = state.slots.length;

  const occupied = state.slots.filter((slot) => slot.occupied).length;

  const available = total - occupied;

  const occupancy = total > 0 ? Math.round((occupied / total) * 100) : 0;

  document.getElementById("totalSlots").textContent = total;

  document.getElementById("availableSlots").textContent = available;

  document.getElementById("occupiedSlots").textContent = occupied;

  document.getElementById("totalRevenue").textContent = formatCurrency(
    state.revenue,
  );

  document.getElementById("availableProgress").style.width =
    `${total > 0 ? (available / total) * 100 : 0}%`;

  document.getElementById("occupiedProgress").style.width = `${occupancy}%`;

  document.getElementById("occupancyText").textContent =
    `${occupancy}% occupied`;
}

// ============================================
// PARKING SLOT LAYOUT
// ============================================

function renderSlots() {
  const container = document.getElementById("parkingSlots");

  container.replaceChildren();

  state.slots.forEach((slot) => {
    const card = document.createElement("div");

    card.className = `slot ${slot.occupied ? "occupied" : "available"}`;

    const number = document.createElement("span");

    number.className = "slot-number";
    number.textContent = slot.id;

    const icon = document.createElement("span");

    icon.className = "slot-icon";
    icon.textContent = slot.occupied ? "🚗" : "P";

    const status = document.createElement("span");

    status.className = "slot-status";

    status.textContent = slot.occupied ? "OCCUPIED" : "AVAILABLE";

    card.append(number, icon, status);

    if (slot.occupied && slot.vehicleNumber) {
      const vehicle = document.createElement("span");

      vehicle.className = "slot-vehicle";
      vehicle.textContent = slot.vehicleNumber;

      card.appendChild(vehicle);
    }

    container.appendChild(card);
  });
}

// ============================================
// PARKING HISTORY
// ============================================

function renderHistory() {
  const tbody = document.getElementById("historyTable");

  const search = document
    .getElementById("searchInput")
    .value.trim()
    .toUpperCase();

  const filter = document.getElementById("filterStatus").value;

  const filteredRecords = [...state.records].reverse().filter((record) => {
    const matchesSearch = record.vehicleNumber.includes(search);

    const matchesFilter = filter === "all" || record.status === filter;

    return matchesSearch && matchesFilter;
  });

  tbody.replaceChildren();

  if (filteredRecords.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");

    cell.colSpan = 7;
    cell.className = "empty-state";

    cell.textContent =
      state.records.length === 0
        ? "No parking records yet. Register a vehicle to begin."
        : "No records match your search.";

    row.appendChild(cell);
    tbody.appendChild(row);
  }

  filteredRecords.forEach((record) => {
    const row = document.createElement("tr");

    // Vehicle number.
    const vehicleCell = document.createElement("td");

    const vehicleNumber = document.createElement("div");

    vehicleNumber.className = "vehicle-number";
    vehicleNumber.textContent = record.vehicleNumber;

    const subtitle = document.createElement("div");

    subtitle.className = "vehicle-subtitle";
    subtitle.textContent = `ID: ${record.id.slice(-6)}`;

    vehicleCell.append(vehicleNumber, subtitle);

    // Vehicle type.
    const typeCell = document.createElement("td");

    const typeBadge = document.createElement("span");

    typeBadge.className = "type-badge";

    typeBadge.textContent = record.vehicleType === "car" ? "Car" : "Motorcycle";

    typeCell.appendChild(typeBadge);

    // Parking slot.
    const slotCell = document.createElement("td");

    slotCell.textContent = record.slot;

    // Entry time.
    const entryCell = document.createElement("td");

    entryCell.textContent = formatDateTime(record.entryTime);

    // Duration.
    const durationCell = document.createElement("td");

    const elapsedMinutes =
      record.status === "parked"
        ? Math.max(0, Math.floor((Date.now() - record.entryTime) / 60000))
        : record.durationMinutes;

    durationCell.textContent = formatDuration(elapsedMinutes);

    // Fee.
    const feeCell = document.createElement("td");

    feeCell.className = "fee-value";

    const currentFee =
      record.status === "parked"
        ? calculateFee(elapsedMinutes, record.vehicleType)
        : record.fee;

    feeCell.textContent = formatCurrency(currentFee);

    // Status.
    const statusCell = document.createElement("td");

    const statusBadge = document.createElement("span");

    statusBadge.className = `status-badge ${record.status}`;

    statusBadge.textContent =
      record.status === "parked" ? "PARKED" : "COMPLETED";

    statusCell.appendChild(statusBadge);

    row.append(
      vehicleCell,
      typeCell,
      slotCell,
      entryCell,
      durationCell,
      feeCell,
      statusCell,
    );

    tbody.appendChild(row);
  });

  document.getElementById("recordCount").textContent =
    `Showing ${filteredRecords.length} of ${state.records.length} records`;
}

// ============================================
// RENDER ALL SECTIONS
// ============================================

function renderAll() {
  renderDashboard();
  renderSlots();
  renderHistory();
}

// ============================================
// VEHICLE ENTRY
// ============================================

async function registerVehicle(event) {
  event.preventDefault();

  const vehicleInput = document.getElementById("vehicleNumber");

  const vehicleNumber = vehicleInput.value.trim().toUpperCase();

  const vehicleType = document.getElementById("vehicleType").value;

  // Validate registration number.
  if (!/^[A-Z0-9 -]{4,15}$/.test(vehicleNumber)) {
    showToast("Enter a valid vehicle registration number.", true);
    return;
  }

  // Validate vehicle type.
  if (!Object.hasOwn(RATES, vehicleType)) {
    showToast("Select a valid vehicle type.", true);
    return;
  }

  try {
    const body = new URLSearchParams({
      vehicleNumber,
      vehicleType,
    });

    // Send the vehicle to the C++ backend.
    const result = await apiRequest("/api/entry", {
      method: "POST",

      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
      },

      body,
    });

    // Refresh dashboard with actual backend data.
    await refreshFromBackend();

    event.target.reset();

    showToast(`${vehicleNumber} assigned to slot ${result.slot}.`);
  } catch (error) {
    showToast(error.message || "Could not register vehicle.", true);
  }
}

// ============================================
// VEHICLE EXIT
// ============================================

async function processVehicleExit(event) {
  event.preventDefault();

  const input = document.getElementById("exitVehicleNumber");

  const vehicleNumber = input.value.trim().toUpperCase();

  if (!vehicleNumber) {
    showToast("Enter a vehicle registration number.", true);
    return;
  }

  try {
    const body = new URLSearchParams({
      vehicleNumber,
    });

    // Ask the C++ backend to process vehicle exit.
    // The C fee calculator determines the parking fee.
    const result = await apiRequest("/api/exit", {
      method: "POST",

      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
      },

      body,
    });

    // Refresh slots, revenue, and history.
    await refreshFromBackend();

    input.value = "";

    const duration = Number(result.durationMinutes) || 0;
    const fee = Number(result.fee) || 0;

    showToast(
      `${vehicleNumber} exited. Duration: ${formatDuration(
        duration,
      )}. Fee: ${formatCurrency(fee)}.`,
    );
  } catch (error) {
    showToast(error.message || "Could not process vehicle exit.", true);
  }
}

// ============================================
// EXPORT PARKING HISTORY TO CSV
// ============================================

function exportHistory() {
  if (state.records.length === 0) {
    showToast("There are no records to export.", true);
    return;
  }

  const headers = [
    "Vehicle Number",
    "Vehicle Type",
    "Slot",
    "Entry Time",
    "Exit Time",
    "Duration Minutes",
    "Fee",
    "Status",
  ];

  const rows = state.records.map((record) => {
    const elapsedMinutes =
      record.status === "parked"
        ? Math.max(0, Math.floor((Date.now() - record.entryTime) / 60000))
        : record.durationMinutes;

    const fee =
      record.status === "parked"
        ? calculateFee(elapsedMinutes, record.vehicleType)
        : record.fee;

    return [
      record.vehicleNumber,
      record.vehicleType,
      record.slot,
      formatDateTime(record.entryTime),
      record.exitTime ? formatDateTime(record.exitTime) : "",
      elapsedMinutes,
      fee,
      record.status,
    ];
  });

  const escapeCSV = (value) => `"${String(value).replace(/"/g, '""')}"`;

  const csv = [headers, ...rows]
    .map((row) => row.map(escapeCSV).join(","))
    .join("\r\n");

  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });

  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");

  link.href = url;
  link.download = "parksmart-parking-history.csv";

  document.body.appendChild(link);

  link.click();
  link.remove();

  URL.revokeObjectURL(url);

  showToast("Parking history exported successfully.");
}

// ============================================
// INITIALIZE APPLICATION
// ============================================

function initializeApp() {
  // Display today's date.
  document.getElementById("currentDate").textContent =
    new Date().toLocaleDateString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  // Vehicle entry form.
  document
    .getElementById("entryForm")
    .addEventListener("submit", registerVehicle);

  // Vehicle exit form.
  document
    .getElementById("exitForm")
    .addEventListener("submit", processVehicleExit);

  // Parking history search.
  document
    .getElementById("searchInput")
    .addEventListener("input", renderHistory);

  // Parking history filter.
  document
    .getElementById("filterStatus")
    .addEventListener("change", renderHistory);

  // Export history.
  document.getElementById("exportBtn").addEventListener("click", exportHistory);

  // Load real data from the C++ backend.
  refreshFromBackend(true);
}

// Start the application.
initializeApp();
