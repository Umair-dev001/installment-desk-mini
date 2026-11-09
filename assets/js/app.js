"use strict";

// No APIs, accounts, customer information, localStorage, or saved data.
// Amounts are calculated as integer paisa to avoid floating-point discrepancies.

const priceInput = document.getElementById("sellingPrice");
const advanceInput = document.getElementById("advancePayment");
const monthsSelect = document.getElementById("months");
const validation = document.getElementById("validation");
const scheduleBody = document.getElementById("scheduleBody");
const scheduleFooter = document.getElementById("scheduleFooter");
const roundingNote = document.getElementById("roundingNote");

const output = {
  tag: document.getElementById("planTag"),
  monthly: document.getElementById("monthlyAmount"),
  subtitle: document.getElementById("monthlySubtitle"),
  sale: document.getElementById("summarySale"),
  advance: document.getElementById("summaryAdvance"),
  balance: document.getElementById("summaryBalance"),
  count: document.getElementById("scheduleCount"),
  total: document.getElementById("totalInstallments"),
  final: document.getElementById("finalBalance")
};

const formatter = new Intl.NumberFormat("en-PK", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2
});

function toPaisa(value) {
  const normalized = value.trim().replace(/,/g, "");
  if (!/^\d+(?:\.\d{0,2})?$/.test(normalized) || normalized === "") return null;
  const [rupees, fractions = ""] = normalized.split(".");
  const amount = Number(rupees) * 100 + Number(fractions.padEnd(2, "0"));
  return Number.isSafeInteger(amount) ? amount : null;
}

function money(paisa) {
  const amount = paisa / 100;
  return "Rs. " + formatter.format(amount);
}

function splitInstallments(totalPaisa, months) {
  // Keep each monthly payment the same where possible, then adjust the last.
  // If the total is exceptionally small, fall back to flooring so last is never negative.
  let regular = Math.round(totalPaisa / months);
  if (regular * (months - 1) > totalPaisa) regular = Math.floor(totalPaisa / months);

  const plan = [];
  let balance = totalPaisa;
  for (let month = 1; month <= months; month += 1) {
    const installment = month === months ? balance : regular;
    balance -= installment;
    plan.push({ month, installment, balance });
  }
  return plan;
}

function showEmpty(message, error = "") {
  output.tag.textContent = "READY TO CALCULATE";
  output.tag.classList.remove("is-ready");
  output.monthly.textContent = "—";
  output.subtitle.textContent = message;
  output.sale.textContent = "—";
  output.advance.textContent = "—";
  output.balance.textContent = "—";
  output.count.textContent = "0 payments";
  scheduleFooter.hidden = true;
  roundingNote.hidden = true;
  scheduleBody.innerHTML = `
    <tr class="empty-row"><td colspan="3"><div class="empty-content">
      <span class="empty-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8 9h8M8 13h8m-8 4h4"/></svg></span>
      <strong>Your plan will appear here</strong><small>Fill in the three fields on the left.</small>
    </div></td></tr>`;
  validation.textContent = error;
  validation.hidden = !error;
}

function update() {
  priceInput.setAttribute("aria-invalid", "false");
  advanceInput.setAttribute("aria-invalid", "false");

  const rawPrice = priceInput.value.trim();
  const rawAdvance = advanceInput.value.trim();
  const months = Number(monthsSelect.value);

  if (!rawPrice) {
    showEmpty("Enter your selling price to get started");
    return;
  }
  const sale = toPaisa(rawPrice);
  if (sale === null || sale <= 0) {
    priceInput.setAttribute("aria-invalid", "true");
    showEmpty("Check the selling price", "Enter a valid selling price greater than zero (up to 2 decimal places).");
    return;
  }

  const advance = toPaisa(rawAdvance);
  if (advance === null) {
    advanceInput.setAttribute("aria-invalid", "true");
    showEmpty("Check the advance amount", "Enter a valid advance payment (use 0 if there is no advance).");
    return;
  }
  if (advance > sale) {
    advanceInput.setAttribute("aria-invalid", "true");
    showEmpty("Check the advance amount", "Advance cannot be greater than the total selling price.");
    return;
  }
  if (!Number.isInteger(months) || months < 1 || months > 12) {
    showEmpty("Select the installment duration");
    return;
  }

  const balance = sale - advance;
  const schedule = splitInstallments(balance, months);
  const ordinaryMonthly = schedule[0].installment;
  const hasDifference = schedule.some(item => item.installment !== ordinaryMonthly);

  validation.hidden = true;
  validation.textContent = "";
  output.tag.textContent = `${months} MONTH${months > 1 ? "S" : ""} PLAN`;
  output.tag.classList.add("is-ready");
  output.monthly.textContent = money(ordinaryMonthly);
  output.monthly.classList.remove("bump");
  // Restart just the small number animation after an update.
  void output.monthly.offsetWidth;
  output.monthly.classList.add("bump");
  output.subtitle.textContent = hasDifference
    ? `Regular payment · last month ${money(schedule.at(-1).installment)}`
    : `Every month for ${months} month${months > 1 ? "s" : ""}`;
  output.sale.textContent = money(sale);
  output.advance.textContent = money(advance);
  output.balance.textContent = money(balance);
  output.count.textContent = `${months} payment${months > 1 ? "s" : ""}`;
  scheduleBody.innerHTML = schedule.map(item => `
    <tr>
      <td><span class="month-pill">Month ${item.month}</span></td>
      <td>${money(item.installment)}</td>
      <td>${money(item.balance)}</td>
    </tr>`).join("");
  output.total.textContent = money(balance);
  output.final.textContent = money(schedule.at(-1).balance);
  scheduleFooter.hidden = false;
  roundingNote.hidden = !hasDifference;
}

// No form submission or reloads; update on every keystroke and selection.
document.getElementById("calculatorForm").addEventListener("submit", event => event.preventDefault());
priceInput.addEventListener("input", update);
advanceInput.addEventListener("input", update);
monthsSelect.addEventListener("change", update);
update();
