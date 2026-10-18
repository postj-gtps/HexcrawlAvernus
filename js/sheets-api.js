/**
 * Google Sheets API Integration Layer
 */

const SHEETS_CONFIG = {
  // Published CSV URL for the "Hexcrawl in a reconfiguration" tab
  publishedCsvUrl: "https://docs.google.com/spreadsheets/d/1EGECGE82Uzswp8M1FsloOzQoEIrlRN-_u1ocoIDVu4o/export?format=csv&gid=540164446",
  
  // Deployed Google Apps Script Web App Endpoint for POST requests
  appsScriptUrl: "https://script.google.com/macros/s/AKfycbxzZ-GBtvKvFbj_zKtxHMG8uFVmnf53KghDkXyjIIP0bYZLYXd9jgokmG5iqHvnLhk_/exec"
};

// Global cache for live campaign data
let hexDataCache = {};
let playerNotesCache = {};

/**
 * Robust CSV parser handling multi-line strings, quoted fields, and embedded commas
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
        i++; // skip escaped quote
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
        // skip carriage return
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
 * Fetches the published Google Sheet CSV and populates hexDataCache keyed by Hex ID (e.g., 'A1', 'B2', 'AC17')
 */
async function loadSheetData() {
  if (!SHEETS_CONFIG.publishedCsvUrl) {
    console.warn("Google Sheets CSV URL is missing.");
    return hexDataCache;
  }

  try {
    const response = await fetch(SHEETS_CONFIG.publishedCsvUrl);
    const csvText = await response.text();
    const rows = parseCSV(csvText);

    // Map the 17x30 matrix cells to coordinate IDs
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
    console.log("Successfully cached Google Sheets hex data:", Object.keys(hexDataCache).length, "hexes");
    return hexDataCache;
  } catch (error) {
    console.error("Error loading Google Sheets CSV:", error);
    return hexDataCache;
  }
}

/**
 * Sends a player note update to Google Sheets via Google Apps Script
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