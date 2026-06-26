/* =========================================================================
   AMBER CALCULATOR — script.js
   Vanilla JavaScript only. No eval(). No inline handlers.
   Every interactive element is wired with addEventListener().
   ========================================================================= */

// ---- Grab references to the DOM elements we need -----------------------
const displayEl    = document.getElementById('display');
const expressionEl = document.getElementById('expression');

const numberButtons = document.querySelectorAll('.key--num[data-num]');
const decimalButton = document.getElementById('key-decimal');
const clearButton   = document.getElementById('key-clear');
const backspaceButton = document.getElementById('key-backspace');
const percentButton  = document.getElementById('key-percent');
const equalsButton   = document.getElementById('key-equals');

const operatorButtons = {
  add:      document.getElementById('key-add'),
  subtract: document.getElementById('key-subtract'),
  multiply: document.getElementById('key-multiply'),
  divide:   document.getElementById('key-divide'),
};

// ---- Calculator state ----------------------------------------------------
// currentInput   : the string of digits/decimal the user is currently typing
// previousValue  : the number that was committed before the current operator
// activeOperator : one of 'add' | 'subtract' | 'multiply' | 'divide' | null
// justEvaluated  : true right after "=" — lets a fresh digit start clean
let currentInput   = '0';
let previousValue  = null;
let activeOperator = null;
let justEvaluated  = false;
let isErrorState   = false;

// Maps internal operator names to their display symbol
const OPERATOR_SYMBOLS = {
  add: '+',
  subtract: '−',
  multiply: '×',
  divide: '÷',
};

// =========================================================================
// DISPLAY HELPERS
// =========================================================================

/**
 * Renders currentInput onto the LED screen and re-triggers the
 * "flicker" animation so every change feels like a real digital readout.
 */
function updateDisplay() {
  displayEl.textContent = currentInput;
  displayEl.classList.remove('is-error');

  // Restart the flicker animation by toggling the class off then on
  displayEl.classList.remove('flicker');
  // Reflow trick so the browser registers the class removal before re-adding
  void displayEl.offsetWidth;
  displayEl.classList.add('flicker');
}

/**
 * Updates the small "expression" line above the main display,
 * e.g. "12 +" while the user is mid-calculation.
 */
function updateExpression() {
  if (previousValue === null || activeOperator === null) {
    expressionEl.textContent = '';
    return;
  }
  expressionEl.textContent = `${formatNumber(previousValue)} ${OPERATOR_SYMBOLS[activeOperator]}`;
}

/**
 * Shows a clear, instrument-style error on the display and locks
 * the calculator in an error state until Clear is pressed.
 */
function showError(message) {
  isErrorState = true;
  displayEl.textContent = message;
  displayEl.classList.add('is-error');
  expressionEl.textContent = '';
}

/**
 * Formats a number for display: trims floating point noise and
 * avoids showing things like "3.0000000000000004".
 */
function formatNumber(value) {
  if (!isFinite(value)) return 'Error';
  // Round to 10 significant decimal places to clean up float drift,
  // then strip any trailing zeros.
  const rounded = parseFloat(value.toPrecision(12));
  return rounded.toString();
}

// =========================================================================
// CORE INPUT HANDLERS
// =========================================================================

/**
 * Appends a digit to the current input.
 * Handles leading-zero cleanup and the "start fresh after =" case.
 */
function inputDigit(digit) {
  if (isErrorState) resetAll();

  if (justEvaluated) {
    // Starting a brand-new calculation after pressing "="
    currentInput = digit;
    justEvaluated = false;
    previousValue = null;
    activeOperator = null;
  } else if (currentInput === '0') {
    // Replace the lone leading zero rather than appending to it
    currentInput = digit;
  } else {
    // Basic input validation: cap length so the display can't overflow
    // into something unreadable (instrument displays have finite digits).
    if (currentInput.replace('-', '').length >= 12) return;
    currentInput += digit;
  }

  updateExpression();
  updateDisplay();
}

/**
 * Appends a decimal point — but only if currentInput doesn't already
 * have one, which is the key validation rule for decimal numbers.
 */
function inputDecimal() {
  if (isErrorState) resetAll();

  if (justEvaluated) {
    currentInput = '0.';
    justEvaluated = false;
    previousValue = null;
    activeOperator = null;
  } else if (!currentInput.includes('.')) {
    currentInput += '.';
  }
  // If a decimal point already exists, silently ignore the extra
  // press — this IS the input validation for malformed numbers.

  updateDisplay();
}

/**
 * Records the chosen operator. If an operator (and previous value)
 * is already pending, this first resolves that pending calculation —
 * which is what makes operator chaining like "5 + 3 × 2" work.
 */
function chooseOperator(operatorName) {
  if (isErrorState) return; // must Clear before continuing

  const inputValue = parseFloat(currentInput);

  if (activeOperator !== null && !justEvaluated) {
    // There's already a pending operation — resolve it first, then
    // chain the new operator onto the running result.
    const result = calculate(previousValue, inputValue, activeOperator);
    if (result === null) return; // calculate() already showed the error

    previousValue = result;
    currentInput = formatNumber(result);
  } else {
    previousValue = inputValue;
  }

  activeOperator = operatorName;
  justEvaluated = false;
  currentInput = '0'; // ready for the next number to be typed in fresh

  highlightActiveOperator(operatorName);
  updateExpression();
}

/**
 * Performs the actual arithmetic using a switch statement.
 * Returns the numeric result, or null if a division-by-zero
 * error was shown instead.
 */
function calculate(a, b, operator) {
  let result;

  switch (operator) {
    case 'add':
      result = a + b;
      break;
    case 'subtract':
      result = a - b;
      break;
    case 'multiply':
      result = a * b;
      break;
    case 'divide':
      // ---- Divide-by-zero guard: the app must never crash here ----
      if (b === 0) {
        showError('Error: Cannot divide by zero');
        return null;
      }
      result = a / b;
      break;
    default:
      return null;
  }

  return result;
}

/**
 * Handles the "=" key: resolves the pending operator/operand pair
 * and shows the final result.
 */
function evaluateExpression() {
  if (isErrorState) return;
  if (activeOperator === null || previousValue === null) return;

  const inputValue = parseFloat(currentInput);
  const result = calculate(previousValue, inputValue, activeOperator);
  if (result === null) return; // division-by-zero already handled

  currentInput = formatNumber(result);
  previousValue = null;
  activeOperator = null;
  justEvaluated = true;

  clearOperatorHighlight();
  expressionEl.textContent = '';
  updateDisplay();
}

/**
 * Removes the last character from the current input (backspace).
 * Falls back to "0" if everything has been deleted.
 */
function backspace() {
  if (isErrorState) {
    resetAll();
    return;
  }
  if (justEvaluated) {
    // Backspacing right after a result just clears it, rather than
    // editing a finished calculation.
    resetAll();
    return;
  }

  currentInput = currentInput.slice(0, -1);
  if (currentInput === '' || currentInput === '-') {
    currentInput = '0';
  }
  updateDisplay();
}

/**
 * Converts the current input to a percentage (divides by 100),
 * a common quality-of-life calculator feature.
 */
function applyPercent() {
  if (isErrorState) resetAll();
  const value = parseFloat(currentInput);
  currentInput = formatNumber(value / 100);
  updateDisplay();
}

/**
 * Full reset — the "C" button. Returns the calculator to its
 * just-powered-on state.
 */
function resetAll() {
  currentInput   = '0';
  previousValue  = null;
  activeOperator = null;
  justEvaluated  = false;
  isErrorState   = false;

  clearOperatorHighlight();
  expressionEl.textContent = '';
  updateDisplay();
}

// =========================================================================
// VISUAL FEEDBACK HELPERS
// =========================================================================

/** Lights up whichever operator key is currently "armed". */
function highlightActiveOperator(operatorName) {
  clearOperatorHighlight();
  if (operatorButtons[operatorName]) {
    operatorButtons[operatorName].classList.add('is-active');
  }
}

function clearOperatorHighlight() {
  Object.values(operatorButtons).forEach((btn) => btn.classList.remove('is-active'));
}

/** Brief visual "press" feedback, used for both click and keyboard input. */
function flashKey(button) {
  if (!button) return;
  button.classList.add('is-pressed');
  setTimeout(() => button.classList.remove('is-pressed'), 100);
}

// =========================================================================
// EVENT WIRING — every button uses addEventListener(), no inline JS
// =========================================================================

numberButtons.forEach((button) => {
  button.addEventListener('click', () => {
    inputDigit(button.dataset.num);
    flashKey(button);
  });
});

decimalButton.addEventListener('click', () => {
  inputDecimal();
  flashKey(decimalButton);
});

clearButton.addEventListener('click', () => {
  resetAll();
  flashKey(clearButton);
});

backspaceButton.addEventListener('click', () => {
  backspace();
  flashKey(backspaceButton);
});

percentButton.addEventListener('click', () => {
  applyPercent();
  flashKey(percentButton);
});

equalsButton.addEventListener('click', () => {
  evaluateExpression();
  flashKey(equalsButton);
});

Object.entries(operatorButtons).forEach(([name, button]) => {
  button.addEventListener('click', () => {
    chooseOperator(name);
    flashKey(button);
  });
});

// =========================================================================
// OPTIONAL: KEYBOARD SUPPORT
// Mirrors the on-screen buttons so the instrument also works with a
// physical keyboard — purely additive, doesn't change any core logic.
// =========================================================================
window.addEventListener('keydown', (event) => {
  const { key } = event;

  if (key >= '0' && key <= '9') {
    inputDigit(key);
    flashKey(document.querySelector(`.key--num[data-num="${key}"]`));
  } else if (key === '.') {
    inputDecimal();
    flashKey(decimalButton);
  } else if (key === '+') {
    chooseOperator('add');
    flashKey(operatorButtons.add);
  } else if (key === '-') {
    chooseOperator('subtract');
    flashKey(operatorButtons.subtract);
  } else if (key === '*') {
    chooseOperator('multiply');
    flashKey(operatorButtons.multiply);
  } else if (key === '/') {
    event.preventDefault(); // stop the browser's quick-find from opening
    chooseOperator('divide');
    flashKey(operatorButtons.divide);
  } else if (key === 'Enter' || key === '=') {
    evaluateExpression();
    flashKey(equalsButton);
  } else if (key === 'Backspace') {
    backspace();
    flashKey(backspaceButton);
  } else if (key === 'Escape') {
    resetAll();
    flashKey(clearButton);
  } else if (key === '%') {
    applyPercent();
    flashKey(percentButton);
  }
});

// ---- Initial paint -------------------------------------------------------
updateDisplay();
