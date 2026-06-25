let referenceBase = null;
const referencePrefix = 0;

function euro(value) {
  const n = Number(value) || 0;

  return n.toLocaleString('fi-FI', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }) + ' €';
}

function todayISO() {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60000);

  return local.toISOString().slice(0, 10);
}

function todayFI() {
  const d = new Date();

  return d.toLocaleDateString('fi-FI');
}

function formatDateFI(dateISO) {
  if (!dateISO) return '';

  const parts = dateISO.split('-');

  if (parts.length !== 3) return '';

  const year = parts[0];
  const month = Number(parts[1]);
  const day = Number(parts[2]);

  return `${day}.${month}.${year}`;
}

function parseFI(dateStr) {
  if (!dateStr) return todayISO();

  const cleaned = dateStr.trim();
  const parts = cleaned.split('.');

  if (parts.length !== 3) return todayISO();

  const day = parts[0].trim();
  const month = parts[1].trim();
  const year = parts[2].trim();

  if (!day || !month || !year) return todayISO();

  const dayNumber = Number(day);
  const monthNumber = Number(month);
  const yearNumber = Number(year);

  if (
    Number.isNaN(dayNumber) ||
    Number.isNaN(monthNumber) ||
    Number.isNaN(yearNumber)
  ) {
    return todayISO();
  }

  const dd = String(dayNumber).padStart(2, '0');
  const mm = String(monthNumber).padStart(2, '0');
  const yyyy = String(yearNumber);

  return `${yyyy}-${mm}-${dd}`;
}

function addDaysISO(dateISO, days) {
  const d = new Date(dateISO + 'T00:00:00');
  d.setDate(d.getDate() + days);

  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60000);

  return local.toISOString().slice(0, 10);
}

function getPaymentDays() {
  const term = document.getElementById('paymentTerm').value.toLowerCase();

  /*
    Tukee esimerkiksi:
    - 14 pv netto
    - 14 pv
    - 14 päivää netto
    - 30 päivää
    - netto 14
  */

  const numberMatch = term.match(/\d+/);

  if (numberMatch) {
    return Number(numberMatch[0]);
  }

  return 14;
}

function setDueDate() {
  const invoiceDateFI = document.getElementById('invoiceDate').value;
  const invoiceDateISO = parseFI(invoiceDateFI);

  const paymentDays = getPaymentDays();
  const dueDateISO = addDaysISO(invoiceDateISO, paymentDays);

  document.getElementById('dueDateFI').textContent = formatDateFI(dueDateISO);

  return dueDateISO;
}

function updateDates() {
  setDueDate();
  calculateAll();
}

function generateReferenceBase() {
  referenceBase = Math.floor(Math.random() * 9000) + 1000;
}

function finnishReference(prefix, base) {
  const g9 = Math.max(0, parseInt(prefix || '0', 10) || 0);
  const g8 = Math.max(0, parseInt(base || '0', 10) || 0);

  const bodyNumber = (g9 * 1000000) + g8;
  const body = String(bodyNumber);

  const weights = [7, 3, 1];
  let sum = 0;

  for (let i = 0; i < body.length; i++) {
    const digit = parseInt(body[body.length - 1 - i], 10);
    sum += digit * weights[i % 3];
  }

  const check = (10 - (sum % 10)) % 10;

  return String((g9 * 10000000) + (g8 * 10) + check);
}

function groupReference(ref) {
  const digits = String(ref || '').replace(/\D/g, '');

  if (!digits) return '';

  return digits.replace(/\B(?=(\d{5})+(?!\d))/g, ' ');
}

function updateReference() {
  if (referenceBase === null) {
    generateReferenceBase();
  }

  const ref = finnishReference(referencePrefix, referenceBase);

  document.getElementById('referenceNumber').textContent = groupReference(ref);
}

function addRow(description = '', qty = '', unit = 'kpl', price = '') {
  const tbody = document.getElementById('linesBody');
  const tr = document.createElement('tr');

  tr.innerHTML = `
    <td>
      <input
        list="partsList"
        class="desc"
        value="${description}"
        oninput="calculateAll()"
      >
    </td>

    <td>
      <input
        class="qty"
        type="number"
        step="0.01"
        min="0"
        value="${qty}"
        oninput="calculateAll()"
      >
    </td>

    <td>
      <input
        class="unit"
        value="${unit}"
        oninput="calculateAll()"
      >
    </td>

    <td>
      <input
        class="price"
        type="number"
        step="0.01"
        min="0"
        value="${price}"
        oninput="calculateAll()"
      >
    </td>

    <td class="num">
      <input
        class="money lineVat"
        readonly
        value="0,00 €"
      >
    </td>

    <td class="num">
      <input
        class="money lineTotal"
        readonly
        value="0,00 €"
      >
    </td>

    <td class="remove-cell no-print">
      <button
        type="button"
        class="removeBtn"
        onclick="removeRow(this)"
      >
        Poista
      </button>
    </td>
  `;

  tbody.appendChild(tr);

  calculateAll();
}

function removeRow(button) {
  const tbody = document.getElementById('linesBody');

  if (tbody.rows.length > 1) {
    button.closest('tr').remove();
  } else {
    const row = button.closest('tr');

    row.querySelectorAll('input').forEach(input => {
      if (!input.readOnly) {
        input.value = input.classList.contains('unit') ? 'kpl' : '';
      }
    });
  }

  calculateAll();
}

function calculateAll() {
  const vatPercent = Number(document.getElementById('vatPercent').value) || 0;
  const vatRate = vatPercent / 100;

  let grossTotal = 0;

  document.querySelectorAll('#linesBody tr').forEach(row => {
    const qty = Number(row.querySelector('.qty').value) || 0;
    const price = Number(row.querySelector('.price').value) || 0;

    const lineGross = qty * price;
    const lineVat = vatRate > 0
      ? lineGross * vatRate / (1 + vatRate)
      : 0;

    grossTotal += lineGross;

    row.querySelector('.lineVat').value = euro(lineVat);
    row.querySelector('.lineTotal').value = euro(lineGross);
  });

  const discount = Math.max(
    0,
    Number(document.getElementById('discount').value) || 0
  );

  const finalGross = Math.max(0, grossTotal - discount);

  const vatTotal = vatRate > 0
    ? finalGross * vatRate / (1 + vatRate)
    : 0;

  const netTotal = finalGross - vatTotal;

  document.getElementById('netTotal').textContent = euro(netTotal);
  document.getElementById('vatTotal').textContent = euro(vatTotal);
  document.getElementById('discountShown').textContent = euro(discount);
  document.getElementById('grandTotal').textContent = euro(finalGross);

  updateReference();
}

function clearForm() {
  document.querySelectorAll('input, textarea').forEach(el => {
    if (el.id === 'vatPercent') {
      el.value = '25.5';
    } else if (el.id === 'invoiceNo') {
      el.value = '';
    } else if (el.id === 'paymentTerm') {
      el.value = '14 pv netto';
    } else if (el.id === 'interest') {
      el.value = '8 %';
    } else if (el.id === 'invoiceDate') {
      el.value = todayFI();
    } else if (!el.readOnly) {
      el.value = '';
    }
  });

  generateReferenceBase();

  document.getElementById('linesBody').innerHTML = '';

  addRow('', 1, 'kpl', '');
  updateDates();
  calculateAll();
}

document.addEventListener('DOMContentLoaded', () => {
  generateReferenceBase();

  document.getElementById('invoiceDate').value = todayFI();

  addRow('', 1, 'kpl', '');

  updateDates();
  calculateAll();
});
