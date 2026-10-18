/**
 * Google Sheets API Integration Layer
 */

const SHEETS_CONFIG = {
  // Published CSV fallback URL
  publishedCsvUrl: "https://docs.google.com/spreadsheets/d/1EGECGE82Uzswp8M1FsloOzQoEIrlRN-_u1ocoIDVu4o/export?format=csv&gid=540164446",
  
  // Apps Script Web App Endpoint (Handles both GET reads and POST writes)
  appsScriptUrl: "https://script.google.com/macros/s/AKfycbxzZ-GBtvKvFbj_zKtxHMG8uFVmnf53KghDkXyjIIP0bYZLYXd9jgokmG5iqHvnLhk_/exec"
};

// Global cache for live campaign data
let hexDataCache = {};
let playerNotesCache = {};

/**
 * Robust CSV parser fallback
 */
function parseCSV(text) {
  const result = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (c === '"' && next === '"') {
        field += '"';
        i++;
      } else if (c === '"') {
        inQuotes = false;
      } else {
        field += c;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
      } else if (c === ',') {
        row.push(field.trim());
        field = '';
      } else if (c === '\r') {
        // skip
      } else if (c === '\n') {
        row.push(field.trim());
        result.push(row);
        row = [];
        field = '';
      } else {
        field += c;
      }
    }
  }
  if (field || row.length > 0) {
    row.push(field.trim());
    result.push(row);
  }
  return result;
}

/**
 * Main Data Loader — Tries Apps Script doGet JSON endpoint first, falls back to CSV
 */
async function loadSheetData() {
  console.log("[Sheets API] Initiating data load...");

  // Primary Approach: Fetch directly from Apps Script Web App (doGet)
  if (SHEETS_CONFIG.appsScriptUrl) {
    try {
      console.log("[Sheets API] Fetching from Apps Script Web App...");
      const response = await fetch(SHEETS_CONFIG.appsScriptUrl, { redirect: "follow" });
      
      if (response.ok) {
        const jsonData = await response.json();
        console.log("[Sheets API] Received raw JSON from Apps Script:", jsonData);

        // Populate cache
        hexDataCache = jsonData;
        console.log("Successfully cached Google Sheets hex data:", Object.keys(hexDataCache).length, "hexes");
        return hexDataCache;
      } else {
        console.warn(`[Sheets API] Apps Script returned HTTP ${response.status}. Attempting CSV fallback...`);
      }
    } catch (err) {
      console.warn("[Sheets API] Apps Script fetch failed/blocked. Attempting CSV fallback...", err);
    }
  }

  // Fallback Approach: Fetch published CSV stream
  try {
    console.log("[Sheets API] Fetching CSV fallback stream...");
    const response = await fetch(SHEETS_CONFIG.publishedCsvUrl);
    const csvText = await response.text();

    if (csvText.trim().startsWith("<!DOCTYPE") || csvText.trim().startsWith("<html")) {
      console.error("[Sheets API Error] Google returned HTML login page. Check sheet link permissions or Publish to Web!");
      return hexDataCache;
    }

    const rows = parseCSV(csvText);
    for (let r = 0; r < rows.length && r < GRID_CONFIG.rows; r++) {
      for (let c = 0; c < rows[r].length && c < GRID_CONFIG.cols; c++) {
        const colLabel = getColumnLabel(c);
        const rowLabel = r + 1;
        const hexId = `${colLabel}${rowLabel}`;
        const rawContent = rows[r][c] || "";

        hexDataCache[hexId] = {
          hexId: hexId,
          content: rawContent,
          status: rawContent ? "Visited" : "Unknown"
        };
      }
    }
    console.log("Successfully cached Google Sheets hex data via CSV fallback:", Object.keys(hexDataCache).length, "hexes");
    return hexDataCache;

  } catch (error) {
    console.error("[Sheets API Error] Failed to load hex data from both JSON and CSV endpoints:", error);
    return hexDataCache;
  }
}

/**
 * Saves a player note update to Google Sheets via Apps Script POST
 */
async function apiSavePlayerNote(hexId, noteText) {
  playerNotesCache[hexId] = noteText;

  if (!SHEETS_CONFIG.appsScriptUrl) {
    console.log(`[Offline Mode] Note saved locally for ${hexId}:`, noteText);
    return { success: true, offline: true };
  }

  try {
    const payload = JSON.stringify({
      action: "saveNote",
      hexId: hexId,
      note: noteText,
      timestamp: new Date().toISOString()
    });

    await fetch(SHEETS_CONFIG.appsScriptUrl, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/json" },
      body: payload
    });

    console.log(`Successfully sent note for ${hexId} to Google Sheets API.`);
    return { success: true };
  } catch (error) {
    console.error(`Error saving note for ${hexId}:`, error);
    return { success: false, error };
  }
}

/**
 * Sends a GM status update (Unknown / Rumored / Visited) to Google Sheets
 */
async function apiUpdateHexStatus(hexId, newStatus) {
  if (hexDataCache[hexId]) {
    hexDataCache[hexId].status = newStatus;
  }

  if (!SHEETS_CONFIG.appsScriptUrl) {
    console.log(`[Offline Mode] Status updated locally for ${hexId}: ${newStatus}`);
    return { success: true, offline: true };
  }

  try {
    const payload = JSON.stringify({
      action: "updateStatus",
      hexId: hexId,
      status: newStatus
    });

    await fetch(SHEETS_CONFIG.appsScriptUrl, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/json" },
      body: payload
    });

    console.log(`Successfully updated status for ${hexId} to ${newStatus}.`);
    return { success: true };
  } catch (error) {
    console.error(`Error updating status for ${hexId}:`, error);
    return { success: false, error };
  }
}