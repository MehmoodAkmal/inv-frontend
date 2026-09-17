import { describe, it, expect, vi, beforeEach } from 'vitest';
import { printThermalReceipt } from '../utils/printReceipt';

describe('printThermalReceipt utility', () => {
  let mockPrintWin;

  beforeEach(() => {
    mockPrintWin = {
      document: {
        open: vi.fn(),
        write: vi.fn(),
        close: vi.fn(),
      },
      focus: vi.fn(),
      print: vi.fn(),
      close: vi.fn(),
    };
    vi.spyOn(window, 'open').mockReturnValue(mockPrintWin);
  });

  it('generates thermal receipt with Unit Price column and no-wrap styling', () => {
    const mockSale = {
      _id: 'sale66e850b91234567890abcdef',
      createdAt: '2026-09-18T00:30:00.000Z',
      paymentType: 'cash',
      customerName: 'Ahmad Khan',
      totalAmount: 4750,
      tenderedCash: 5000,
      changeDue: 250,
      lineItems: [
        {
          itemName: 'Red chilli',
          quantity: 5,
          unit: 'kg',
          sellingPrice: 950,
          lineTotal: 4750,
        },
      ],
    };

    printThermalReceipt({
      businessName: 'Super Mart POS',
      sale: mockSale,
      currencySymbol: 'Rs.',
    });

    expect(window.open).toHaveBeenCalledWith('', '_blank', 'width=420,height=650');
    expect(mockPrintWin.document.write).toHaveBeenCalled();

    const printedHtml = mockPrintWin.document.write.mock.calls[0][0];

    // Header & Meta
    expect(printedHtml).toContain('Super Mart POS');
    expect(printedHtml).toContain('CASH SALE');
    expect(printedHtml).toContain('Ahmad Khan');
    expect(printedHtml).toContain('Receipt #90ABCDEF');

    // Table Headers: verify Unit Price column exists
    expect(printedHtml).toContain('<th class="col-item">Item</th>');
    expect(printedHtml).toContain('<th class="col-qty">Qty</th>');
    expect(printedHtml).toContain('<th class="col-price">Unit Price</th>');
    expect(printedHtml).toContain('<th class="col-total">Total</th>');

    // Item row data: verify 5 kg, unit price Rs. 950.00, line total Rs. 4,750.00
    expect(printedHtml).toContain('Red chilli');
    expect(printedHtml).toContain('5 kg');
    expect(printedHtml).toContain('Rs. 950.00');
    expect(printedHtml).toContain('Rs. 4,750.00');

    // Totals & Cash breakdown
    expect(printedHtml).toContain('Change Due');
    expect(printedHtml).toContain('Rs. 250.00');
  });

  it('computes unitPrice correctly from lineTotal / quantity when sellingPrice is omitted', () => {
    const mockSale = {
      _id: 'sale123',
      paymentType: 'credit',
      totalAmount: 1000,
      balance: 1000,
      items: [
        {
          itemName: 'Bulk Sugar',
          quantity: 4,
          lineTotal: 1000,
        },
      ],
    };

    printThermalReceipt({
      businessName: 'Grocery POS',
      sale: mockSale,
      currencySymbol: '$',
    });

    const printedHtml = mockPrintWin.document.write.mock.calls[0][0];
    expect(printedHtml).toContain('CREDIT SALE');
    expect(printedHtml).toContain('Bulk Sugar');
    // 1000 / 4 = 250
    expect(printedHtml).toContain('$250.00');
    expect(printedHtml).toContain('$1,000.00');
    expect(printedHtml).toContain('Balance Due');
  });
});
