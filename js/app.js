/**
 * Application Controller & Modal Content Renderer
 */

function isGMMode() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get("view") === "gm";
}

function formatLoreText(text) {
  if (!text) return "";
  return text.replace(/\n/g, "<br>");
}

// Explicit global modal trigger function
window.handleHexClick = function(hexId, col, row) {
  console.log(`[App] Interacting with Hex ${hexId} (Col: ${col}, Row: ${row})`);

  const modal = document.getElementById("hex-modal");
  const modalTitle = document.getElementById("modal-hex-id");
  const modalBody = document.getElementById("modal-content-details");
  const modalStatus = document.getElementById("modal-status");

  const isGM = isGMMode();
  const hexData = hexDataCache[hexId] || { content: "", status: "Unknown" };
  const playerNote = playerNotesCache[hexId] || "";

  if (modalTitle) modalTitle.textContent = `Hex ${hexId} ${isGM ? "(GM View)" : ""}`;

  const currentStatus = hexData.status || "Unknown";
  if (modalStatus) {
    modalStatus.textContent = `Status: ${currentStatus}`;
    modalStatus.className = `status-badge status-${currentStatus.toLowerCase()}`;
  }

  let htmlContent = "";

  if (isGM) {
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
        <h3>Master Lore / Encounter Notes</h3>
        <div class="lore-box">${formatLoreText(hexData.content || hexData.Description || "No master entry for this hex.")}</div>
      </div>
    `;
  } else {
    if (currentStatus === "Unknown") {
      htmlContent += `<p class="info-text">Unexplored territory. No rumors or details recorded.</p>`;
    } else if (currentStatus === "Rumored") {
      htmlContent += `
        <div class="player-lore">
          <h3>Rumors & Intelligence</h3>
          <p>${formatLoreText(hexData.content || hexData.Description || "Vague rumors circulate about this location...")}</p>
        </div>
      `;
    } else {
      htmlContent += `
        <div class="player-lore">
          <h3>Location Discoveries</h3>
          <p>${formatLoreText(hexData.content || hexData.Description || "Explored location.")}</p>
        </div>
      `;
    }
  }

  htmlContent += `
    <hr class="modal-divider">
    <div class="player-journal-section">
      <h3>Party Travel Journal</h3>
      <textarea id="player-journal-input" placeholder="Type notes, NPCs met, or loot found here...">${playerNote}</textarea>
      <button id="btn-save-journal" class="btn-secondary">Save Journal Note</button>
      <span id="journal-save-status" class="save-status-msg"></span>
    </div>
  `;

  if (modalBody) modalBody.innerHTML = htmlContent;
  if (modal) modal.classList.remove("hidden");

  attachModalEventListeners(hexId);
};

function attachModalEventListeners(hexId) {
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
      
      const modalStatus = document.getElementById("modal-status");
      if (modalStatus) {
        modalStatus.textContent = `Status: ${newStatus}`;
        modalStatus.className = `status-badge status-${newStatus.toLowerCase()}`;
      }
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