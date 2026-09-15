import { useAuth } from '../context/AuthContext';

export const SUPPORTED_CURRENCIES = [
  { code: 'PKR', symbol: 'Rs.', label: 'PKR — Pakistani Rupee (Rs.)' },
  { code: 'USD', symbol: '$', label: 'USD — US Dollar ($)' },
  { code: 'EUR', symbol: '€', label: 'EUR — Euro (€)' },
  { code: 'GBP', symbol: '£', label: 'GBP — British Pound (£)' },
  { code: 'AED', symbol: 'AED', label: 'AED — UAE Dirham (AED)' },
  { code: 'SAR', symbol: 'SAR', label: 'SAR — Saudi Riyal (SAR)' },
  { code: 'INR', symbol: '₹', label: 'INR — Indian Rupee (₹)' },
  { code: 'CAD', symbol: 'CA$', label: 'CAD — Canadian Dollar (CA$)' },
  { code: 'AUD', symbol: 'AU$', label: 'AUD — Australian Dollar (AU$)' },
  { code: 'QAR', symbol: 'QAR', label: 'QAR — Qatari Riyal (QAR)' },
  { code: 'KWD', symbol: 'KWD', label: 'KWD — Kuwaiti Dinar (KWD)' },
  { code: 'OMR', symbol: 'OMR', label: 'OMR — Omani Rial (OMR)' },
  { code: 'BHD', symbol: 'BHD', label: 'BHD — Bahraini Dinar (BHD)' },
  { code: 'BDT', symbol: '৳', label: 'BDT — Bangladeshi Taka (৳)' },
  { code: 'TRY', symbol: '₺', label: 'TRY — Turkish Lira (₺)' },
  { code: 'MYR', symbol: 'RM', label: 'MYR — Malaysian Ringgit (RM)' },
  { code: 'SGD', symbol: 'SG$', label: 'SGD — Singapore Dollar (SG$)' },
];

export const DEFAULT_CURRENCY = SUPPORTED_CURRENCIES[0]; // PKR / Rs.

/**
 * Returns the configured currency symbol for the active user or localStorage fallback.
 */
export function getCurrencySymbol(user = null) {
  if (user?.currency?.symbol) return user.currency.symbol;
  if (user?.currencySymbol) return user.currencySymbol;

  try {
    const raw = localStorage.getItem('user');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.currency?.symbol) return parsed.currency.symbol;
      if (parsed?.currencySymbol) return parsed.currencySymbol;
    }
  } catch {
    // ignore parse error
  }

  return DEFAULT_CURRENCY.symbol;
}

/**
 * Returns the configured currency code (e.g. 'PKR', 'USD') for the active user.
 */
export function getCurrencyCode(user = null) {
  if (user?.currency?.code) return user.currency.code;
  if (user?.currencyCode) return user.currencyCode;

  try {
    const raw = localStorage.getItem('user');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.currency?.code) return parsed.currency.code;
      if (parsed?.currencyCode) return parsed.currencyCode;
    }
  } catch {
    // ignore parse error
  }

  return DEFAULT_CURRENCY.code;
}

/**
 * Formats a numeric value with the appropriate currency symbol.
 * e.g. formatCurrency(1250, '$') -> '$1,250.00'
 *      formatCurrency(1250, 'Rs.') -> 'Rs. 1,250.00'
 *      formatCurrency(1250, 'AED') -> 'AED 1,250.00'
 */
export function formatCurrency(amount, customSymbol = null, decimals = 2) {
  const symbol = customSymbol !== null ? customSymbol : getCurrencySymbol();
  const num = Number(amount ?? 0);

  const formatted = num.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  if (!symbol) return formatted;

  // Add space if symbol is alphabetic or multi-character like 'Rs.' or 'AED'
  const isMulti = symbol.length > 1;
  return isMulti ? `${symbol} ${formatted}` : `${symbol}${formatted}`;
}

/**
 * React hook to access current currency information and formatters.
 */
export function useCurrency() {
  const { user } = useAuth();
  const symbol = getCurrencySymbol(user);
  const code = getCurrencyCode(user);

  const fmt = (amount, decimals = 2) => formatCurrency(amount, symbol, decimals);

  return {
    symbol,
    code,
    currency: user?.currency || { code, symbol },
    formatCurrency: fmt,
  };
}
