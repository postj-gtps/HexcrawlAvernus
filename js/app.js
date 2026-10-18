/**
 * Application Controller & Sidebar Renderer
 */

const GM_PIN = "0326";
let isGMModeActive = false;
let currentSelectedHexId = null;

// Initialize app controls
function initApp() {
  setupGmToggle();
  
  // Check if GM mode was requested via URL parameter
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get("view") === "gm") {
    isGMModeActive = true;
    updateGmUiState();
  }
}

/**
 * Configure GM PIN Lock Button & Modal Logic
 */
function setupGmToggle() {
  const btnGmToggle = document.getElementById("btn-gm-toggle");
  const pinModal = document.getElementById("pin-modal");
  const pinInput = document.getElementById("pin-input");
  const pinError = document.getElementById("pin-error");
  const btnPinSubmit = document.getElementById("btn-pin-submit");
  const btnPinCancel = document.getElementById("btn-pin-cancel");

  if (!btnGmToggle) return;

  btnGmToggle.addEventListener("click", () => {
    if (isGMModeActive) {
      isGMModeActive = false;
      updateGmUiState();
    } else {
      pinInput.value = "";
      pinError.classList.add("hidden");
      pinModal.classList.remove("hidden");
      pinInput.focus();
    }
  });

  btnPinSubmit.addEventListener("click", () => verifyPin());

  pinInput.addEventListener("keyup", (e) => {
    if (e.key === "Enter") verifyPin();
  });

  btnPinCancel.addEventListener("click", () => {
    pinModal.classList.add("hidden");
  });

  function verifyPin() {
    if (pinInput.value.trim() === GM_PIN) {
      isGMModeActive = true;
      pinModal.classList.add("hidden");
      updateGmUiState();
    } else {
      pinError.classList.remove("hidden");
      pinInput.value = "";
      pinInput.focus();
    }
  }
}

/**
 * Updates UI styling based on current GM status
 */
function updateGmUiState() {
  const btnGmToggle = document.getElementById("btn-gm-toggle");
  const lockIcon = document.getElementById("gm-lock-icon");
  const lockText = document.getElementById("gm-lock-text");

  if (isGMModeActive) {
    btnGmToggle.classList.add("active-gm");
    lockIcon.textContent = "🔓";
    lockText.textContent = "GM Mode Active (Exit)";
  } else {
    btnGmToggle.classList.remove("active-gm");
    lockIcon.textContent = "🔒";
    lockText.textContent = "Enter GM Mode";
  }

  // Refresh sidebar display if a hex is selected
  if (currentSelectedHexId) {
    window.handleHexClick(currentSelectedHexId);
  }
}

function formatLoreText(text) {
  if (!text) return "";
  return text.replace(/\n/g, "<br>");
}

/**
 * Render selected Hex details inside the sidebar
 */
window.handleHexClick = function(hexId) {
  currentSelectedHexId = hexId;
  const sidebarContent = document.getElementById("sidebar-content");
  if (!sidebarContent) return;

  const hexData = hexDataCache[hexId] || { content: "", status: "Unknown" };
  const playerNote = playerNotesCache[hexId] || "";
  const currentStatus = hexData.status || "Unknown";

  let htmlContent = `
    <h2 class="hex-title">Hex ${hexId} ${isGMModeActive ? "(GM View)" : ""}</h2>
    <span class="status-badge status-${currentStatus.toLowerCase()}">Status: ${currentStatus}</span>
  `;

  if (isGMModeActive) {
    // --- GM SIDEBAR INTERFACE ---
    // Includes GM Status Controls, Master Key Lore from Sheets, and Party Notes
    htmlContent += `
      <div class="gm-controls">
        <label><strong>GM Status Override:</strong></label>
        <select id="gm-status-select">
          <option value="Unknown" ${currentStatus === "Unknown" ? "selected" : ""}>0: Unknown</option>
          <option value="Rumored" ${currentStatus === "Rumored" ? "selected" : ""}>1: Rumored</option>
          <option value="Visited" ${currentStatus === "Visited" ? "selected" : ""}>2: Visited</option>
        </select>
        <button id="btn-save-status" class="btn-primary">Update Status</button>
      </div>
      <hr class="modal-divider">
      <div class="gm-master-lore">
        <h3 class="section-title">Master Lore / Encounter Notes</h3>
        <div class="lore-box">${formatLoreText(hexData.content || "No master entry for this hex.")}</div>
      </div>
      <hr class="modal-divider">
      <div class="player-journal-section">
        <h3 class="section-title">Party Travel Journal (Shared)</h3>
        <textarea id="player-journal-input" placeholder="Type notes, NPCs met, or loot found here...">${playerNote}</textarea>
        <button id="btn-save-journal" class="btn-secondary">Save Journal Note</button>
        <span id="journal-save-status" class="save-status-msg"></span>
      </div>
    `;
  } else {
    // --- PLAYER SIDEBAR INTERFACE ---
    // Strictly hides Master Lore. Displays party journal for reading/writing notes.
    htmlContent += `
      <div class="player-journal-section">
        <h3 class="section-title">Party Travel Journal</h3>
        <p class="info-text" style="font-size: 0.85rem; color: #aaa; margin-bottom: 12px;">
          Record party discoveries, rumors, NPCs met, or encounters for Hex ${hexId}.
        </p>
        <textarea id="player-journal-input" placeholder="Type notes, rumors, or discoveries here...">${playerNote}</textarea>
        <button id="btn-save-journal" class="btn-secondary">Save Journal Note</button>
        <span id="journal-save-status" class="save-status-msg"></span>
      </div>
    `;
  }

  sidebarContent.innerHTML = htmlContent;
  attachSidebarEventListeners(hexId);
};

function attachSidebarEventListeners(hexId) {
  const btnSaveStatus = document.getElementById("btn-save-status");
  if (btnSaveStatus) {
    btnSaveStatus.addEventListener("click", async () => {
      const select = document.getElementById("gm-status-select");
      const newStatus = select.value;
      btnSaveStatus.disabled = true;
      btnSaveStatus.textContent = "Updating...";

      await apiUpdateHexStatus(hexId, newStatus);

      btnSaveStatus.disabled = false;
      btnSaveStatus.textContent = "Updated!";
      
      window.handleHexClick(hexId);
    });
  }

  const btnSaveJournal = document.getElementById("btn-save-journal");
  if (btnSaveJournal) {
    btnSaveJournal.addEventListener("click", async () => {
      const noteInput = document.getElementById("player-journal-input");
      const statusMsg = document.getElementById("journal-save-status");
      const noteText = noteInput.value;

      btnSaveJournal.disabled = true;
      if (statusMsg) statusMsg.textContent = "Saving...";

      const result = await apiSavePlayerNote(hexId, noteText);

      btnSaveJournal.disabled = false;
      if (statusMsg) {
        statusMsg.textContent = result.offline ? "Saved locally!" : "Saved to Google Sheet!";
        setTimeout(() => { statusMsg.textContent = ""; }, 3000);
      }
    });
  }
}

// Initialize on DOM load
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp);
} else {
  initApp();
}