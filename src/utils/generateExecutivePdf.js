import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Generates and directly triggers the download of an executive PDF report.
 *
 * @param {Object} options
 * @param {Object} options.reportData - Normalized report data object
 * @param {string} options.businessName - Name of the organization
 * @param {Function} [options.fmtCurr] - Currency formatting helper
 */
export function generateExecutivePdf({
  reportData,
  businessName = 'Inventory Management System',
  fmtCurr,
}) {
  if (!reportData) return;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const {
    meta = {},
    financials = {},
    sales = {},
    inventory = {},
    receivables = {},
    topItems = [],
    branchBreakdown = [],
    isOverall = true,
  } = reportData;

  const formatMoney = (val) => {
    if (fmtCurr) {
      try {
        const res = fmtCurr(val);
        // Strip non-ASCII or unsupported symbols if any to ensure clean PDF rendering
        return String(res).replace(/[^\x00-\x7F]/g, 'Rs. ');
      } catch {
        // fallback
      }
    }
    const num = Number(val || 0);
    return `Rs. ${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  let currentY = 16;

  // ── Header Banner ──────────────────────────────────────────────────────────
  doc.setFillColor(15, 60, 45); // Deep emerald executive brand color
  doc.rect(margin, currentY, pageWidth - margin * 2, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text((businessName || 'Business Organization').toUpperCase(), margin + 6, currentY + 9);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('EXECUTIVE BUSINESS & FINANCIAL AUDIT REPORT', margin + 6, currentY + 16);
  doc.setFontSize(7.5);
  doc.setTextColor(180, 220, 200);
  doc.text('STRICTLY CONFIDENTIAL — FOR EXECUTIVE MANAGEMENT ONLY', margin + 6, currentY + 22);

  // Right-aligned header metadata
  doc.setFontSize(7.5);
  doc.setTextColor(220, 240, 230);
  const rightX = pageWidth - margin - 6;
  const scopeText = isOverall ? 'Overall Business (Consolidated)' : `Branch: ${meta.branch?.name || 'Single Branch'}`;
  doc.text(scopeText, rightX, currentY + 9, { align: 'right' });
  doc.text(`Period: ${meta.periodLabel || 'Custom Range'}`, rightX, currentY + 15, { align: 'right' });
  doc.text(`Generated: ${new Date(meta.generatedAt || Date.now()).toLocaleDateString()}`, rightX, currentY + 21, { align: 'right' });

  currentY += 34;

  // ── 1. Executive Financial Summary Cards (Table Grid) ──────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(20, 30, 25);
  doc.text('1. EXECUTIVE FINANCIAL SUMMARY', margin, currentY);
  currentY += 4;

  const totalRev = financials.totalRevenue ?? financials.revenue ?? 0;
  const totalCogs = financials.totalCOGS ?? financials.cogs ?? 0;
  const grossProf = financials.grossProfit ?? (totalRev - totalCogs);
  const grossMargin = financials.grossMarginPct ?? (totalRev > 0 ? ((grossProf / totalRev) * 100).toFixed(1) : 0);
  const expenses = financials.totalExpenses ?? financials.expenses ?? 0;
  const salaries = financials.totalSalaries ?? financials.salaries ?? 0;
  const netProf = financials.netProfit ?? (grossProf - expenses - salaries);
  const netMargin = financials.netMarginPct ?? (totalRev > 0 ? ((netProf / totalRev) * 100).toFixed(1) : 0);

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    theme: 'grid',
    head: [['Key Metric', 'Amount (PKR)', 'Key Metric', 'Amount (PKR)']],
    body: [
      [
        'Total Gross Revenue',
        formatMoney(totalRev),
        'Cost of Goods Sold (COGS)',
        formatMoney(totalCogs),
      ],
      [
        'Gross Operating Profit',
        `${formatMoney(grossProf)} (${grossMargin}%)`,
        'Operating Expenses',
        formatMoney(expenses),
      ],
      [
        'Salaries & Payroll',
        formatMoney(salaries),
        'Total Operating Overhead',
        formatMoney(expenses + salaries),
      ],
      [
        'Net Operating Profit (P&L)',
        {
          content: `${formatMoney(netProf)} (${netMargin}% Net Margin)`,
          styles: {
            fontStyle: 'bold',
            textColor: netProf >= 0 ? [16, 120, 60] : [190, 30, 30],
            fillColor: netProf >= 0 ? [240, 253, 244] : [254, 242, 242],
          },
        },
        'Profit Status',
        netProf >= 0 ? 'NET PROFITABLE' : 'NET OPERATING LOSS',
      ],
    ],
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
    },
    styles: {
      fontSize: 8,
      cellPadding: 2.2,
      textColor: [30, 41, 59],
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 48 },
      1: { cellWidth: 43 },
      2: { fontStyle: 'bold', cellWidth: 48 },
      3: { cellWidth: 43 },
    },
  });

  currentY = doc.lastAutoTable.finalY + 7;

  // ── 2. Sales, Inventory & Receivables Breakdown ────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(20, 30, 25);
  doc.text('2. OPERATIONAL, INVENTORY & CREDIT HEALTH', margin, currentY);
  currentY += 4;

  const saleCount = sales.saleCount ?? sales.totalTransactions ?? 0;
  const totalUnits = sales.totalUnitsSold ?? 0;
  const avgTicket = sales.averageTicketSize ?? sales.avgTicketSize ?? 0;
  const cashSales = sales.totalCashSales ?? sales.cashSalesTotal ?? 0;
  const creditSales = sales.totalCreditSales ?? sales.creditSalesTotal ?? 0;

  const stockCost = inventory.valuationAtCost ?? inventory.stockValueAtCost ?? 0;
  const stockRetail = inventory.valuationAtRetail ?? inventory.stockValueAtRetail ?? 0;
  const unitsInStock = inventory.totalUnitsInStock ?? inventory.totalUnits ?? 0;
  const lowStock = inventory.lowStockCount ?? inventory.lowStockItemsCount ?? 0;

  const debtTotal = receivables.totalOutstandingCredit ?? receivables.totalOutstandingDebt ?? 0;
  const debtIssued = receivables.periodCreditIssued ?? receivables.creditIssuedInPeriod ?? 0;
  const debtCollected = receivables.periodDebtCollected ?? receivables.debtCollectedInPeriod ?? 0;

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    theme: 'grid',
    head: [['Sales Volume & Cash Flow', 'Value', 'Inventory & Receivables', 'Value']],
    body: [
      [
        'Total Sales Transactions',
        `${saleCount} orders`,
        'Stock Valuation at Cost',
        formatMoney(stockCost),
      ],
      [
        'Total Product Units Sold',
        `${totalUnits} units`,
        'Stock Valuation at Retail',
        formatMoney(stockRetail),
      ],
      [
        'Average Ticket Size',
        formatMoney(avgTicket),
        'Total Units On-Hand',
        `${unitsInStock} units (${lowStock} low-stock alerts)`,
      ],
      [
        'Cash Collections',
        formatMoney(cashSales),
        'Outstanding Customer Debt',
        formatMoney(debtTotal),
      ],
      [
        'Credit (Receivable) Sales',
        formatMoney(creditSales),
        'Debt Recovered in Period',
        formatMoney(debtCollected),
      ],
    ],
    headStyles: {
      fillColor: [51, 65, 85],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
    },
    styles: {
      fontSize: 8,
      cellPadding: 2.2,
      textColor: [30, 41, 59],
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 50 },
      1: { cellWidth: 41 },
      2: { fontStyle: 'bold', cellWidth: 50 },
      3: { cellWidth: 41 },
    },
  });

  currentY = doc.lastAutoTable.finalY + 7;

  // ── 3. Multi-Branch Contribution Table (If Consolidated Overall Mode) ─────
  if (isOverall && branchBreakdown && branchBreakdown.length > 0) {
    // Check if new page is needed
    if (currentY > 230) {
      doc.addPage();
      currentY = 16;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(20, 30, 25);
    doc.text('3. MULTI-BRANCH CONTRIBUTION BREAKDOWN', margin, currentY);
    currentY += 4;

    autoTable(doc, {
      startY: currentY,
      margin: { left: margin, right: margin },
      theme: 'striped',
      head: [['Branch', 'Revenue', 'COGS', 'Gross Profit', 'Expenses', 'Salaries', 'Net Profit', 'Share %']],
      body: branchBreakdown.map((b) => [
        `${b.name || 'Branch'} (${b.code || '—'})`,
        formatMoney(b.revenue),
        formatMoney(b.cogs),
        formatMoney(b.grossProfit),
        formatMoney(b.expenses),
        formatMoney(b.salaries),
        {
          content: formatMoney(b.netProfit),
          styles: {
            fontStyle: 'bold',
            textColor: (b.netProfit ?? 0) >= 0 ? [16, 120, 60] : [190, 30, 30],
          },
        },
        `${b.contributionPct ?? 0}%`,
      ]),
      headStyles: {
        fillColor: [15, 60, 45],
        textColor: [255, 255, 255],
        fontSize: 7.5,
        fontStyle: 'bold',
      },
      styles: {
        fontSize: 7.5,
        cellPadding: 2,
        textColor: [30, 41, 59],
      },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 42 },
        1: { halign: 'right' },
        2: { halign: 'right' },
        3: { halign: 'right' },
        4: { halign: 'right' },
        5: { halign: 'right' },
        6: { halign: 'right' },
        7: { halign: 'right', fontStyle: 'bold' },
      },
    });

    currentY = doc.lastAutoTable.finalY + 7;
  }

  // ── 4. Top 5 Best-Selling Products Table ──────────────────────────────────
  if (topItems && topItems.length > 0) {
    if (currentY > 235) {
      doc.addPage();
      currentY = 16;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(20, 30, 25);
    doc.text(isOverall ? '4. TOP 5 BEST-SELLING PRODUCTS' : '3. TOP 5 BEST-SELLING PRODUCTS', margin, currentY);
    currentY += 4;

    autoTable(doc, {
      startY: currentY,
      margin: { left: margin, right: margin },
      theme: 'striped',
      head: [['#', 'Item Name', 'SKU', 'Category', 'Quantity Sold', 'Revenue Generated']],
      body: topItems.map((it, idx) => [
        idx + 1,
        it.name || 'Item',
        it.sku || '—',
        it.categoryName || 'General',
        `${it.quantitySold ?? it.totalQty ?? 0} ${it.unit || 'pcs'}`,
        formatMoney(it.revenueGenerated ?? it.totalRevenue ?? 0),
      ]),
      headStyles: {
        fillColor: [51, 65, 85],
        textColor: [255, 255, 255],
        fontSize: 8,
        fontStyle: 'bold',
      },
      styles: {
        fontSize: 8,
        cellPadding: 2,
      },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center', fontStyle: 'bold' },
        1: { fontStyle: 'bold', cellWidth: 60 },
        2: { cellWidth: 28 },
        3: { cellWidth: 30 },
        4: { halign: 'center', cellWidth: 26 },
        5: { halign: 'right', fontStyle: 'bold', cellWidth: 30 },
      },
    });

    currentY = doc.lastAutoTable.finalY + 12;
  }

  // ── 5. Official Signatory Section ──────────────────────────────────────────
  if (currentY > 240) {
    doc.addPage();
    currentY = 30;
  }

  const signWidth = 48;
  const gap = (pageWidth - margin * 2 - signWidth * 3) / 2;

  const signCol1 = margin;
  const signCol2 = margin + signWidth + gap;
  const signCol3 = margin + (signWidth + gap) * 2;

  doc.setDrawColor(120, 130, 140);
  doc.setLineWidth(0.4);
  doc.line(signCol1, currentY + 12, signCol1 + signWidth, currentY + 12);
  doc.line(signCol2, currentY + 12, signCol2 + signWidth, currentY + 12);
  doc.line(signCol3, currentY + 12, signCol3 + signWidth, currentY + 12);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(40, 50, 60);
  doc.text('Prepared By', signCol1 + signWidth / 2, currentY + 16, { align: 'center' });
  doc.text('Verified By', signCol2 + signWidth / 2, currentY + 16, { align: 'center' });
  doc.text('Authorized Signatory', signCol3 + signWidth / 2, currentY + 16, { align: 'center' });

  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(110, 120, 130);
  doc.text('Finance / Accounts', signCol1 + signWidth / 2, currentY + 20, { align: 'center' });
  doc.text('Internal Audit Team', signCol2 + signWidth / 2, currentY + 20, { align: 'center' });
  doc.text('Executive Administration', signCol3 + signWidth / 2, currentY + 20, { align: 'center' });

  // ── Page Numbers & Footer ──────────────────────────────────────────────────
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(140, 150, 160);

    // Footer rule
    doc.setDrawColor(220, 225, 230);
    doc.setLineWidth(0.2);
    doc.line(margin, 287, pageWidth - margin, 287);

    doc.text(
      `${businessName} • Executive Financial Report • Strictly Private & Confidential`,
      margin,
      291
    );
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, 291, { align: 'right' });
  }

  // Generate clean filename and trigger browser download directly
  const dateStamp = new Date().toISOString().slice(0, 10);
  const scopeTag = isOverall ? 'Overall' : (meta.branch?.name || 'Branch').replace(/\s+/g, '_');
  const intervalTag = meta.interval || 'report';
  const fileName = `Executive_Report_${scopeTag}_${intervalTag}_${dateStamp}.pdf`;

  doc.save(fileName);
  return fileName;
}
