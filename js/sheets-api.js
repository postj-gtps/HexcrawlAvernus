/**
 * Google Sheets API Integration Layer
 */

const SHEETS_CONFIG = {
  publishedCsvUrl: "https://docs.google.com/spreadsheets/d/1EGECGE82Uzswp8M1FsloOzQoEIrlRN-_u1ocoIDVu4o/export?format=csv&gid=540164446",
  appsScriptUrl: "https://script.google.com/macros/s/AKfycbxzZ-GBtvKvFbj_zKtxHMG8uFVmnf53KghDkXyjIIP0bYZLYXd9jgokmG5iqHvnLhk_/exec"
};

let hexDataCache = {};
let playerNotesCache = {};

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
        // ignore
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

async function loadSheetData() {
  console.log("[Sheets API] Initiating data load...");

  // Primary: Apps Script JSON
  if (SHEETS_CONFIG.appsScriptUrl) {
    try {
      console.log("[Sheets API] Fetching from Apps Script Web App...");
      const response = await fetch(SHEETS_CONFIG.appsScriptUrl, { redirect: "follow" });
      if (response.ok) {
        const jsonData = await response.json();
        hexDataCache = jsonData;
        console.log("Successfully cached Google Sheets hex data:", Object.keys(hexDataCache).length, "hexes");
        return hexDataCache;
      }
    } catch (err) {
      console.warn("[Sheets API] Apps Script JSON fetch failed. Trying CSV fallback...", err);
    }
  }

  // Fallback: CSV export stream
  try {
    console.log("[Sheets API] Fetching CSV stream...");
    const response = await fetch(SHEETS_CONFIG.publishedCsvUrl);
    const csvText = await response.text();

    if (csvText.trim().startsWith("<!DOCTYPE") || csvText.trim().startsWith("<html")) {
      console.error("[Sheets API Error] Google returned HTML. Ensure sheet is set to 'Anyone with the link'!");
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
    console.error("[Sheets API Error] Failed to fetch hex data:", error);
    return hexDataCache;
  }
}

async function apiSavePlayerNote(hexId, noteText) {
  playerNotesCache[hexId] = noteText;

  if (!SHEETS_CONFIG.appsScriptUrl) {
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

    return { success: true };
  } catch (error) {
    console.error(`Error saving note for ${hexId}:`, error);
    return { success: false, error };
  }
}

async function apiUpdateHexStatus(hexId, newStatus) {
  if (hexDataCache[hexId]) {
    hexDataCache[hexId].status = newStatus;
  }

  if (!SHEETS_CONFIG.appsScriptUrl) {
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

    return { success: true };
  } catch (error) {
    console.error(`Error updating status for ${hexId}:`, error);
    return { success: false, error };
  }
}

// Auto-run loadSheetData as soon as script executes
loadSheetData();