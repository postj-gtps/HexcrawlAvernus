/**
 * Interactive Flat-Topped Hex Grid Overlay Math Engine
 * Grid dimensions: 17 Rows x 30 Columns (Matching sheet configuration)
 */

const GRID_CONFIG = {
  rows: 17,
  cols: 30,
  radius: 24,        // Flat-topped radius (distance from center to corner)
  offsetX: 35,       // Horizontal alignment shift in pixels
  offsetY: 35,       // Vertical alignment shift in pixels
  showBorders: true  // Default visual state for calibration
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
    // Corner angles for flat-topped hex: 0°, 60°, 120°, 180°, 240°, 300°
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

  // Sync SVG overlay dimensions with image container
  svgContainer.setAttribute("viewBox", `0 0 ${img.naturalWidth || img.clientWidth} ${img.naturalHeight || img.clientHeight}`);
  svgContainer.innerHTML = ""; // Clear existing grid

  const r = GRID_CONFIG.radius;
  // Flat-topped geometric spacing math:
  const horizontalSpacing = 1.5 * r;
  const verticalSpacing = Math.sqrt(3) * r;

  for (let col = 0; col < GRID_CONFIG.cols; col++) {
    const colLabel = getColumnLabel(col);

    for (let row = 0; row < GRID_CONFIG.rows; row++) {
      const rowLabel = row + 1;
      const hexId = `${colLabel}${rowLabel}`;

      // Calculate Center X and Y
      const centerX = GRID_CONFIG.offsetX + col * horizontalSpacing;
      
      // Stagger odd columns down by half the height of a hex
      const staggerY = (col % 2 === 1) ? (verticalSpacing / 2) : 0;
      const centerY = GRID_CONFIG.offsetY + row * verticalSpacing + staggerY;

      // Calculate SVG polygon points
      const points = getFlatHexCorners(centerX, centerY, r);

      // Create SVG Polygon Element
      const polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
      polygon.setAttribute("points", points);
      polygon.setAttribute("class", GRID_CONFIG.showBorders ? "hex-cell active-border" : "hex-cell");
      polygon.setAttribute("data-hex-id", hexId);
      polygon.setAttribute("data-row", row);
      polygon.setAttribute("data-col", col);

      // Click Event Callback
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
 * Attach Calibration Controls for live adjustment
 */
function setupCalibrationControls() {
  const inputRadius = document.getElementById("input-radius");
  const inputOffsetX = document.getElementById("input-offset-x");
  const inputOffsetY = document.getElementById("input-offset-y");
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

  toggleBorders.addEventListener("change", (e) => {
    GRID_CONFIG.showBorders = e.target.checked;
    renderHexGrid();
  });

  btnExport.addEventListener("click", () => {
    console.log("Calibrated Hex Configuration:", JSON.stringify(GRID_CONFIG, null, 2));
    alert(`Configuration exported to Browser Console! Radius: ${GRID_CONFIG.radius}, OffsetX: ${GRID_CONFIG.offsetX}, OffsetY: ${GRID_CONFIG.offsetY}`);
  });

  // Modal Close Listener
  document.getElementById("modal-close").addEventListener("click", () => {
    document.getElementById("hex-modal").classList.add("hidden");
  });
}

// Initialize on image load
window.addEventListener("DOMContentLoaded", () => {
  const mapImg = document.getElementById("map-image");
  setupCalibrationControls();

  if (mapImg.complete) {
    renderHexGrid();
  } else {
    mapImg.addEventListener("load", renderHexGrid);
  }
});