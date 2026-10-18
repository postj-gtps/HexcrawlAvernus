/**
 * Interactive Hex Grid Renderer & Calibration Engine
 */

const GRID_CONFIG = {
  rows: 17,
  cols: 30,
  radius: 27.5,          // Restored from calibration settings
  offsetX: 70,         // Restored from calibration settings
  offsetY: 154,         // Restored from calibration settings
  borderColor: "#000000",
  showBorders: true
};

function getColumnLabel(index) {
  let label = "";
  let i = index;
  while (i >= 0) {
    label = String.fromCharCode((i % 26) + 65) + label;
    i = Math.floor(i / 26) - 1;
  }
  return label;
}

// Calculates pointy-topped hex polygon coordinates
function getHexPoints(centerX, centerY, r) {
  const points = [];
  for (let i = 0; i < 6; i++) {
    const angleRad = (Math.PI / 180) * (60 * i - 30);
    const x = centerX + r * Math.cos(angleRad);
    const y = centerY + r * Math.sin(angleRad);
    points.push(`${x.toFixed(2)},${y.toFixed(2)}`);
  }
  return points.join(" ");
}

window.renderHexGrid = function() {
  const svgOverlay = document.getElementById("hex-svg-overlay");
  const mapImage = document.getElementById("map-image");
  if (!svgOverlay || !mapImage) return;

  svgOverlay.innerHTML = "";

  const r = parseFloat(GRID_CONFIG.radius);
  const horizDist = Math.sqrt(3) * r;
  const vertDist = 1.5 * r;

  for (let row = 0; row < GRID_CONFIG.rows; row++) {
    for (let col = 0; col < GRID_CONFIG.cols; col++) {
      const colLabel = getColumnLabel(col);
      const rowLabel = row + 1;
      const hexId = `${colLabel}${rowLabel}`.toUpperCase();

      const hexData = (typeof hexDataCache !== "undefined" && hexDataCache[hexId]) ? hexDataCache[hexId] : { status: "Unknown" };
      const currentStatus = (hexData.status || "Unknown").toLowerCase();

      // Stagger odd rows for hex grid alignment
      const xOffset = (row % 2 === 1) ? horizDist / 2 : 0;
      const cx = GRID_CONFIG.offsetX + col * horizDist + xOffset;
      const cy = GRID_CONFIG.offsetY + row * vertDist;

      const polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
      polygon.setAttribute("points", getHexPoints(cx, cy, r));
      polygon.setAttribute("class", `hex-cell status-fill-${currentStatus} ${GRID_CONFIG.showBorders ? 'active-border' : 'hidden-border'}`);
      polygon.setAttribute("data-hex-id", hexId);
      polygon.style.stroke = GRID_CONFIG.borderColor;

      polygon.addEventListener("click", () => {
        if (typeof window.handleHexClick === "function") {
          window.handleHexClick(hexId);
        }
      });

      svgOverlay.appendChild(polygon);
    }
  }
};

function initCalibrationUI() {
  const urlParams = new URLSearchParams(window.location.search);
  const isCalibrating = urlParams.get("calibrate") === "true";
  const calPanel = document.getElementById("calibration-panel");

  if (isCalibrating && calPanel) {
    calPanel.classList.add("visible");
  }

  const inputRadius = document.getElementById("input-radius");
  const inputOffsetX = document.getElementById("input-offset-x");
  const inputOffsetY = document.getElementById("input-offset-y");
  const inputColor = document.getElementById("input-color");
  const toggleBorders = document.getElementById("toggle-borders");
  const btnExport = document.getElementById("btn-export-config");

  if (!inputRadius) return;

  inputRadius.value = GRID_CONFIG.radius;
  inputOffsetX.value = GRID_CONFIG.offsetX;
  inputOffsetY.value = GRID_CONFIG.offsetY;
  inputColor.value = GRID_CONFIG.borderColor;
  toggleBorders.checked = GRID_CONFIG.showBorders;

  document.getElementById("val-radius").textContent = GRID_CONFIG.radius;
  document.getElementById("val-offset-x").textContent = GRID_CONFIG.offsetX;
  document.getElementById("val-offset-y").textContent = GRID_CONFIG.offsetY;

  inputRadius.addEventListener("input", (e) => {
    GRID_CONFIG.radius = parseFloat(e.target.value);
    document.getElementById("val-radius").textContent = GRID_CONFIG.radius;
    window.renderHexGrid();
  });

  inputOffsetX.addEventListener("input", (e) => {
    GRID_CONFIG.offsetX = parseFloat(e.target.value);
    document.getElementById("val-offset-x").textContent = GRID_CONFIG.offsetX;
    window.renderHexGrid();
  });

  inputOffsetY.addEventListener("input", (e) => {
    GRID_CONFIG.offsetY = parseFloat(e.target.value);
    document.getElementById("val-offset-y").textContent = GRID_CONFIG.offsetY;
    window.renderHexGrid();
  });

  inputColor.addEventListener("input", (e) => {
    GRID_CONFIG.borderColor = e.target.value;
    window.renderHexGrid();
  });

  toggleBorders.addEventListener("change", (e) => {
    GRID_CONFIG.showBorders = e.target.checked;
    window.renderHexGrid();
  });

  if (btnExport) {
    btnExport.addEventListener("click", () => {
      const exportStr = `Configuration exported to Console! Radius: ${GRID_CONFIG.radius}, OffsetX: ${GRID_CONFIG.offsetX}, OffsetY: ${GRID_CONFIG.offsetY}, Color: ${GRID_CONFIG.borderColor}`;
      console.log(exportStr);
      alert(exportStr);
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  window.renderHexGrid();
  initCalibrationUI();
  window.addEventListener("resize", window.renderHexGrid);
});