import { formatCurrency } from './currency';

/**
 * Escapes special HTML characters to prevent XSS in print popups.
 */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Generates and triggers an 80mm thermal receipt print window.
 *
 * @param {Object} options
 * @param {string} options.businessName - Business name to display on receipt header
 * @param {Object} options.sale - Sale transaction object
 * @param {string} options.currencySymbol - Currency symbol (e.g. 'Rs.', '$')
 */
export function printThermalReceipt({
  businessName = 'Inventory Manager',
  sale,
  currencySymbol = 'Rs.',
}) {
  if (!sale) return;

  const items = sale.lineItems || sale.items || [];
  const saleDate = sale.createdAt ? new Date(sale.createdAt).toLocaleString() : new Date().toLocaleString();
  const isCash = sale.paymentType === 'cash';
  const receiptNumber = sale._id ? sale._id.slice(-8).toUpperCase() : 'N/A';
  const customerName =
    sale.customerName ||
    (typeof sale.customerId === 'object' ? sale.customerId?.name : null) ||
    '';

  const rowsHtml = items
    .map((it) => {
      const qty = it.quantity || 0;
      const unitPrice =
        it.sellingPrice ??
        it.unitPrice ??
        (qty > 0 ? (it.lineTotal || 0) / qty : 0);
      const lineTotal = it.lineTotal ?? qty * unitPrice;
      const unitLabel = it.unit ? ` ${it.unit}` : '';

      return `
        <tr>
          <td class="col-item">${escapeHtml(it.itemName || 'Item')}</td>
          <td class="col-qty">${qty}${escapeHtml(unitLabel)}</td>
          <td class="col-price">${formatCurrency(unitPrice, currencySymbol)}</td>
          <td class="col-total">${formatCurrency(lineTotal, currencySymbol)}</td>
        </tr>
      `;
    })
    .join('');

  const discountHtml =
    sale.discount > 0
      ? `
    <div class="row">
      <span>Discount</span>
      <span>- ${formatCurrency(sale.discount, currencySymbol)}</span>
    </div>
  `
      : '';

  const cashDetailsHtml = isCash
    ? `
    <div class="row" style="margin-top: 4px;">
      <span>Cash Given</span>
      <span>${formatCurrency(sale.tenderedCash ?? sale.totalAmount, currencySymbol)}</span>
    </div>
    ${
      (sale.changeDue ?? 0) > 0
        ? `
      <div class="change-box">
        <div class="label">Change Due</div>
        <div class="amount">${formatCurrency(sale.changeDue, currencySymbol)}</div>
      </div>
    `
        : ''
    }
  `
    : `
    <div class="row" style="margin-top: 4px; color: #c00;">
      <span>Balance Due</span>
      <span>${formatCurrency(sale.balance ?? sale.totalAmount, currencySymbol)}</span>
    </div>
  `;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Receipt #${receiptNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 11px;
      line-height: 1.35;
      color: #000;
      background: #fff;
      width: 80mm;
      max-width: 80mm;
      margin: 0 auto;
      padding: 8px 6px;
    }
    .receipt-header { text-align: center; margin-bottom: 8px; }
    .receipt-header h1 { font-size: 15px; font-weight: 900; letter-spacing: 0.5px; text-transform: uppercase; }
    .receipt-header p { font-size: 10px; color: #444; margin-top: 2px; }
    .divider { border: none; border-top: 1px dashed #666; margin: 8px 0; }
    .divider-solid { border: none; border-top: 1px solid #000; margin: 8px 0; }
    .badge-wrap { text-align: center; margin: 6px 0; }
    .badge { display: inline-block; border: 1px solid #000; padding: 2px 6px; font-size: 10px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; border-radius: 2px; }
    .customer-info { font-size: 11px; margin-bottom: 6px; }

    /* Receipt Items Table */
    .receipt-table { width: 100%; border-collapse: collapse; margin-top: 2px; }
    .receipt-table th {
      border-bottom: 1px solid #000;
      padding: 4px 1px;
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
    }
    .receipt-table td {
      padding: 4px 1px;
      vertical-align: top;
      font-size: 11px;
    }
    .col-item { text-align: left; word-break: break-word; }
    .col-qty { text-align: center; white-space: nowrap; padding: 4px 3px; }
    .col-price { text-align: right; white-space: nowrap; padding: 4px 3px; }
    .col-total { text-align: right; white-space: nowrap; font-weight: 700; }

    /* Totals Breakdown */
    .totals { margin-top: 4px; }
    .totals .row { display: flex; justify-content: space-between; margin-bottom: 2px; font-size: 11px; }
    .totals .total-row {
      display: flex;
      justify-content: space-between;
      font-size: 13px;
      font-weight: 900;
      margin-top: 4px;
      border-top: 1px solid #000;
      padding-top: 4px;
    }
    .change-box { border: 1px solid #000; text-align: center; padding: 6px; margin-top: 8px; }
    .change-box .label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; }
    .change-box .amount { font-size: 18px; font-weight: 900; }
    .footer { text-align: center; margin-top: 10px; font-size: 10px; color: #444; }

    @media print {
      body { width: 80mm; padding: 4px 0; }
      @page { margin: 0; size: auto; }
    }
  </style>
</head>
<body>
  <div class="receipt-header">
    <h1>${escapeHtml(businessName)}</h1>
    <p>${saleDate}</p>
  </div>
  <hr class="divider" />
  <div class="badge-wrap">
    <span class="badge">${isCash ? 'CASH SALE' : 'CREDIT SALE'}</span>
  </div>
  ${customerName ? `<div class="customer-info">Customer: <strong>${escapeHtml(customerName)}</strong></div>` : ''}
  <hr class="divider" />

  <table class="receipt-table">
    <thead>
      <tr>
        <th class="col-item">Item</th>
        <th class="col-qty">Qty</th>
        <th class="col-price">Unit Price</th>
        <th class="col-total">Total</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
  </table>

  <hr class="divider-solid" />

  <div class="totals">
    ${discountHtml}
    <div class="total-row">
      <span>TOTAL</span>
      <span>${formatCurrency(sale.totalAmount, currencySymbol)}</span>
    </div>
    ${cashDetailsHtml}
  </div>

  <hr class="divider" />
  <div class="footer">
    <p>Thank you for your business!</p>
    <p style="margin-top: 3px;">Receipt #${receiptNumber}</p>
  </div>
</body>
</html>`;

  const printWin = window.open('', '_blank', 'width=420,height=650');
  if (!printWin) {
    window.print();
    return;
  }

  printWin.document.open();
  printWin.document.write(html);
  printWin.document.close();
  printWin.focus();

  setTimeout(() => {
    try {
      printWin.print();
      printWin.close();
    } catch {
      // ignore
    }
  }, 350);
}
