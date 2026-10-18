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
  console.log("[Sheets API] Initiating fresh data load...");

  if (SHEETS_CONFIG.appsScriptUrl) {
    try {
      const cacheBustUrl = `${SHEETS_CONFIG.appsScriptUrl}?t=${Date.now()}`;
      console.log("[Sheets API] Fetching live data from Apps Script...");
      
      const response = await fetch(cacheBustUrl, { redirect: "follow" });
      if (response.ok) {
        const jsonData = await response.json();

        if (jsonData.hexes) {
          hexDataCache = jsonData.hexes;
          playerNotesCache = jsonData.playerNotes || {};
        } else {
          hexDataCache = jsonData;
        }

        console.log("[Sheets API] Hexes cached:", Object.keys(hexDataCache).length);
        console.log("[Sheets API] Player notes cached:", playerNotesCache);
        return hexDataCache;
      }
    } catch (err) {
      console.warn("[Sheets API] Apps Script JSON fetch failed. Trying CSV fallback...", err);
    }
  }

  // Fallback: CSV stream
  try {
    const response = await fetch(SHEETS_CONFIG.publishedCsvUrl);
    const csvText = await response.text();

    if (csvText.trim().startsWith("<!DOCTYPE") || csvText.trim().startsWith("<html")) {
      console.error("[Sheets API Error] Check sheet permissions.");
      return hexDataCache;
    }

    const rows = parseCSV(csvText);
    for (let r = 0; r < rows.length && r < GRID_CONFIG.rows; r++) {
      for (let c = 0; c < rows[r].length && c < GRID_CONFIG.cols; c++) {
        const colLabel = getColumnLabel(c);
        const rowLabel = r + 1;
        const hexId = `${colLabel}${rowLabel}`.toUpperCase();
        const rawContent = rows[r][c] || "";

        hexDataCache[hexId] = {
          hexId: hexId,
          content: rawContent,
          status: "Unknown"
        };
      }
    }
    return hexDataCache;

  } catch (error) {
    console.error("[Sheets API Error] Failed to fetch hex data:", error);
    return hexDataCache;
  }
}

async function apiSavePlayerNote(hexId, noteText) {
  const cleanHexId = String(hexId).toUpperCase();
  playerNotesCache[cleanHexId] = noteText;

  if (!SHEETS_CONFIG.appsScriptUrl) {
    return { success: true, offline: true };
  }

  try {
    const payload = JSON.stringify({
      action: "saveNote",
      hexId: cleanHexId,
      note: noteText,
      timestamp: new Date().toISOString()
    });

    await fetch(SHEETS_CONFIG.appsScriptUrl, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain" },
      body: payload
    });

    console.log(`[Sheets API] Sent note for ${cleanHexId} to Google Sheets.`);
    return { success: true };
  } catch (error) {
    console.error(`[Sheets API Error] Saving note for ${cleanHexId}:`, error);
    return { success: false, error };
  }
}

async function apiUpdateHexStatus(hexId, newStatus) {
  const cleanHexId = String(hexId).toUpperCase();
  if (hexDataCache[cleanHexId]) {
    hexDataCache[cleanHexId].status = newStatus;
  }

  if (!SHEETS_CONFIG.appsScriptUrl) {
    return { success: true, offline: true };
  }

  try {
    const payload = JSON.stringify({
      action: "updateStatus",
      hexId: cleanHexId,
      status: newStatus
    });

    await fetch(SHEETS_CONFIG.appsScriptUrl, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain" },
      body: payload
    });

    console.log(`[Sheets API] Sent status update for ${cleanHexId} to Google Sheets.`);
    return { success: true };
  } catch (error) {
    console.error(`[Sheets API Error] Updating status for ${cleanHexId}:`, error);
    return { success: false, error };
  }
}

// Auto-run loadSheetData on script load
loadSheetData();