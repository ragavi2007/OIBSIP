/* =========================================================================
   TEMPERATURE CONVERTER — SCRIPT
   Handles: input validation, unit conversion, result rendering,
   absolute-zero guarding, and the live "thermal gauge" visual feedback.
   No frameworks. No inline JS — this file is loaded via <script src>.
   ========================================================================= */

// ---------- 1. CONSTANTS ----------

// Absolute zero expressed in each scale, used for validation.
const ABSOLUTE_ZERO = {
  celsius: -273.15,
  fahrenheit: -459.67,
  kelvin: 0,
};

// Range used purely to drive the live gauge fill / accent color.
// Not a validation boundary — just a sensible "everyday temperature" window
// so the gauge has a meaningful 0–1 position for typical inputs.
const GAUGE_RANGE_CELSIUS = { min: -40, max: 50 };

// ---------- 2. ELEMENT REFERENCES ----------

const form = document.getElementById('converterForm');
const tempInput = document.getElementById('tempInput');
const unitSelect = document.getElementById('unitSelect');
const formError = document.getElementById('formError');

const resultsPlaceholder = document.getElementById('resultsPlaceholder');
const resultsGrid = document.getElementById('resultsGrid');
const celsiusValueEl = document.getElementById('celsiusValue');
const fahrenheitValueEl = document.getElementById('fahrenheitValue');
const kelvinValueEl = document.getElementById('kelvinValue');

const gaugeFill = document.getElementById('gaugeFill');

// ---------- 3. CONVERSION HELPERS ----------

/**
 * Converts a temperature value from a given unit into Celsius.
 * Celsius is used as the common intermediate scale for all conversions.
 */
function toCelsius(value, fromUnit) {
  switch (fromUnit) {
    case 'celsius':
      return value;
    case 'fahrenheit':
      return (value - 32) * (5 / 9);
    case 'kelvin':
      return value - 273.15;
    default:
      throw new Error('Unknown unit: ' + fromUnit);
  }
}

/**
 * Given a Celsius value, returns an object with the equivalent value
 * in all three supported scales.
 */
function fromCelsius(celsius) {
  return {
    celsius: celsius,
    fahrenheit: (celsius * 9 / 5) + 32,
    kelvin: celsius + 273.15,
  };
}

/**
 * Rounds a number to 2 decimal places and trims trailing zeroes,
 * so "25.00" displays as "25" but "25.46" stays precise.
 */
function formatTemp(value) {
  const rounded = Math.round(value * 100) / 100;
  return rounded.toString();
}

// ---------- 4. VALIDATION ----------

/**
 * Validates raw user input. Returns an object: { valid, value, message }.
 * - Rejects empty input.
 * - Rejects non-numeric input.
 * - Rejects values below absolute zero for the selected unit.
 */
function validateInput(rawValue, unit) {
  const trimmed = rawValue.trim();

  if (trimmed === '') {
    return { valid: false, message: 'Please enter a valid temperature value.' };
  }

  const numericValue = Number(trimmed);

  if (Number.isNaN(numericValue) || !Number.isFinite(numericValue)) {
    return { valid: false, message: 'Please enter a valid temperature value.' };
  }

  const minForUnit = ABSOLUTE_ZERO[unit];

  if (numericValue < minForUnit) {
    return { valid: false, message: 'Temperature cannot be below absolute zero.' };
  }

  return { valid: true, value: numericValue };
}

// ---------- 5. ERROR DISPLAY ----------

function showError(message) {
  formError.textContent = message;
  formError.classList.add('visible');
  tempInput.classList.add('input-error');

  // Hide results while an error is showing, so stale values aren't confusing.
  resultsGrid.hidden = true;
  resultsPlaceholder.hidden = false;
  resultsPlaceholder.textContent = 'Fix the error above to see your converted values.';
}

function clearError() {
  formError.textContent = '';
  formError.classList.remove('visible');
  tempInput.classList.remove('input-error');
}

// ---------- 6. RESULTS RENDERING ----------

function renderResults(celsius, sourceUnit) {
  const values = fromCelsius(celsius);

  celsiusValueEl.textContent = formatTemp(values.celsius);
  fahrenheitValueEl.textContent = formatTemp(values.fahrenheit);
  kelvinValueEl.textContent = formatTemp(values.kelvin);

  resultsPlaceholder.hidden = true;
  resultsGrid.hidden = false;

  // Highlight whichever pill corresponds to the unit the user converted *from*.
  document.querySelectorAll('.result-pill').forEach((pill) => {
    pill.classList.toggle('is-source', pill.dataset.scale === sourceUnit);
  });
}

// ---------- 7. LIVE THERMAL GAUGE ----------

/**
 * Updates the gauge fill width and the live accent color based on the
 * Celsius-equivalent of whatever is currently typed (valid or not yet
 * submitted). This is a visual aid only — it never blocks submission
 * and silently does nothing if the current input can't be parsed.
 */
function updateGaugeFromInput() {
  const unit = unitSelect.value;
  const numericValue = Number(tempInput.value.trim());

  if (tempInput.value.trim() === '' || Number.isNaN(numericValue)) {
    return; // leave the gauge at its last known position
  }

  let celsius;
  try {
    celsius = toCelsius(numericValue, unit);
  } catch (e) {
    return;
  }

  // Position within the gauge's everyday range, clamped to [0, 1].
  const t = (celsius - GAUGE_RANGE_CELSIUS.min) / (GAUGE_RANGE_CELSIUS.max - GAUGE_RANGE_CELSIUS.min);
  const clampedT = Math.min(1, Math.max(0, t));

  gaugeFill.style.width = (8 + clampedT * 92) + '%'; // keep a small visible sliver at minimum
  gaugeFill.style.backgroundPosition = (clampedT * 100) + '% 0';

  // Push the same position into the live accent custom property so the
  // button, focus rings, and glow all shift together.
  const accentHex = interpolateThermalColor(clampedT);
  document.documentElement.style.setProperty('--accent-live', accentHex);
}

/**
 * Interpolates between the three thermal stops (cold / mid / hot) based on
 * t in [0, 1], returning a hex color string. Implemented manually so it
 * works without relying on browser support for color-mix() in JS.
 */
function interpolateThermalColor(t) {
  const cold = { r: 0x3D, g: 0xD6, b: 0xF5 };
  const mid  = { r: 0xFF, g: 0x8A, b: 0x3D };
  const hot  = { r: 0xFF, g: 0x52, b: 0x52 };

  let start, end, localT;
  if (t < 0.5) {
    start = cold;
    end = mid;
    localT = t / 0.5;
  } else {
    start = mid;
    end = hot;
    localT = (t - 0.5) / 0.5;
  }

  const r = Math.round(start.r + (end.r - start.r) * localT);
  const g = Math.round(start.g + (end.g - start.g) * localT);
  const b = Math.round(start.b + (end.b - start.b) * localT);

  return `rgb(${r}, ${g}, ${b})`;
}

// ---------- 8. EVENT WIRING ----------

form.addEventListener('submit', (event) => {
  event.preventDefault();

  const unit = unitSelect.value;
  const validation = validateInput(tempInput.value, unit);

  if (!validation.valid) {
    showError(validation.message);
    return;
  }

  clearError();
  const celsius = toCelsius(validation.value, unit);
  renderResults(celsius, unit);
  updateGaugeFromInput();
});

// Clear the error as soon as the user starts correcting their input,
// and keep the gauge reacting live as they type or change unit.
tempInput.addEventListener('input', () => {
  if (formError.classList.contains('visible')) {
    clearError();
  }
  updateGaugeFromInput();
});

unitSelect.addEventListener('change', () => {
  updateGaugeFromInput();
});

// Initialize the gauge at a neutral default position on page load.
gaugeFill.style.width = '50%';
gaugeFill.style.backgroundPosition = '50% 0';
