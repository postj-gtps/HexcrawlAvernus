/**
 * Interactive Flat-Topped Hex Grid Overlay Math Engine
 * Grid dimensions: 17 Rows x 30 Columns (Matching sheet configuration)
 */

const GRID_CONFIG = {
  rows: 17,
  cols: 30,
  radius: 31,         // Calibrated radius[cite: 2]
  offsetX: 75,        // Calibrated horizontal shift[cite: 2]
  offsetY: 79,        // Calibrated vertical shift[cite: 2]
  showBorders: true,
  strokeColor: "#000000" // Calibrated black grid lines[cite: 2]
};

// Column Label Generator (A-Z, AA, AB, AC, AD for 30 columns)
function getColumnLabel(index) {
  let label = "";
  let i = index;
  while (i >= 0) {
    label = String.fromCharCode((i % 26) + 65) + label;
    i = Math.floor(i / 26) - 1;
  }
  return label;
}

/**
 * Calculates the 6 corner points of a flat-topped hexagon
 */
function getFlatHexCorners(centerX, centerY, radius) {
  const corners = [];
  for (let i = 0; i < 6; i++) {
    const angleRad = (Math.PI / 180) * (i * 60);
    const x = centerX + radius * Math.cos(angleRad);
    const y = centerY + radius * Math.sin(angleRad);
    corners.push(`${x.toFixed(2)},${y.toFixed(2)}`);
  }
  return corners.join(" ");
}

/**
 * Main function to generate the SVG hex overlay
 */
function renderHexGrid() {
  const svgContainer = document.getElementById("hex-svg-overlay");
  const img = document.getElementById("map-image");

  if (!img) return;

  svgContainer.setAttribute("viewBox", `0 0 ${img.naturalWidth || img.clientWidth} ${img.naturalHeight || img.clientHeight}`);
  svgContainer.innerHTML = "";

  const r = GRID_CONFIG.radius;
  const horizontalSpacing = 1.5 * r;
  const verticalSpacing = Math.sqrt(3) * r;

  for (let col = 0; col < GRID_CONFIG.cols; col++) {
    const colLabel = getColumnLabel(col);

    for (let row = 0; row < GRID_CONFIG.rows; row++) {
      const rowLabel = row + 1;
      const hexId = `${colLabel}${rowLabel}`;

      const centerX = GRID_CONFIG.offsetX + col * horizontalSpacing;
      const staggerY = (col % 2 === 1) ? (verticalSpacing / 2) : 0;
      const centerY = GRID_CONFIG.offsetY + row * verticalSpacing + staggerY;

      const points = getFlatHexCorners(centerX, centerY, r);

      const polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
      polygon.setAttribute("points", points);
      polygon.setAttribute("class", GRID_CONFIG.showBorders ? "hex-cell active-border" : "hex-cell hidden-border");
      polygon.style.stroke = GRID_CONFIG.strokeColor;
      polygon.setAttribute("data-hex-id", hexId);
      polygon.setAttribute("data-row", row);
      polygon.setAttribute("data-col", col);

      polygon.addEventListener("click", () => handleHexClick(hexId, col, row));

      svgContainer.appendChild(polygon);
    }
  }
}

/**
 * Click Handler — Triggered when a player or GM selects a hex
 */
function handleHexClick(hexId, col, row) {
  console.log(`Clicked Hex: ${hexId} (Col: ${col}, Row: ${row})`);
  
  const modal = document.getElementById("hex-modal");
  const modalTitle = document.getElementById("modal-hex-id");
  
  if (modalTitle) modalTitle.textContent = `Hex ${hexId}`;
  if (modal) modal.classList.remove("hidden");
}

/**
 * Reveals calibration panel if ?calibrate=true or ?view=gm is in the URL
 */
function checkUrlModes() {
  const urlParams = new URLSearchParams(window.location.search);
  const isCalibrate = urlParams.get("calibrate") === "true";
  const isGM = urlParams.get("view") === "gm";
  
  const panel = document.getElementById("calibration-panel");
  if (panel && (isCalibrate || isGM)) {
    panel.classList.add("visible");
  }
}

/**
 * Attach Calibration Controls for live adjustment
 */
function setupCalibrationControls() {
  const inputRadius = document.getElementById("input-radius");
  const inputOffsetX = document.getElementById("input-offset-x");
  const inputOffsetY = document.getElementById("input-offset-y");
  const inputColor = document.getElementById("input-color");
  const toggleBorders = document.getElementById("toggle-borders");
  const btnExport = document.getElementById("btn-export-config");

  inputRadius.addEventListener("input", (e) => {
    GRID_CONFIG.radius = parseFloat(e.target.value);
    document.getElementById("val-radius").textContent = GRID_CONFIG.radius;
    renderHexGrid();
  });

  inputOffsetX.addEventListener("input", (e) => {
    GRID_CONFIG.offsetX = parseFloat(e.target.value);
    document.getElementById("val-offset-x").textContent = GRID_CONFIG.offsetX;
    renderHexGrid();
  });

  inputOffsetY.addEventListener("input", (e) => {
    GRID_CONFIG.offsetY = parseFloat(e.target.value);
    document.getElementById("val-offset-y").textContent = GRID_CONFIG.offsetY;
    renderHexGrid();
  });

  inputColor.addEventListener("input", (e) => {
    GRID_CONFIG.strokeColor = e.target.value;
    renderHexGrid();
  });

  toggleBorders.addEventListener("change", (e) => {
    GRID_CONFIG.showBorders = e.target.checked;
    renderHexGrid();
  });

  btnExport.addEventListener("click", () => {
    console.log("Calibrated Hex Configuration:", JSON.stringify(GRID_CONFIG, null, 2));
    alert(`Configuration exported to Console! Radius: ${GRID_CONFIG.radius}, OffsetX: ${GRID_CONFIG.offsetX}, OffsetY: ${GRID_CONFIG.offsetY}, Color: ${GRID_CONFIG.strokeColor}`);
  });

  // Modal Close Listener
  document.getElementById("modal-close").addEventListener("click", () => {
    document.getElementById("hex-modal").classList.add("hidden");
  });
}

// Initialize on image load
window.addEventListener("DOMContentLoaded", () => {
  const mapImg = document.getElementById("map-image");
  checkUrlModes();
  setupCalibrationControls();

  if (mapImg.complete) {
    renderHexGrid();
  } else {
    mapImg.addEventListener("load", renderHexGrid);
  }
});