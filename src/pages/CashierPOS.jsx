import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import { getItems } from '../services/itemService';
import { getStock } from '../services/stockService';
import { getCategories } from '../services/categoryService';
import { getCustomers, createCustomer } from '../services/customerService';
import { createSale } from '../services/saleService';
import MinimalLayout from '../components/layout/MinimalLayout';
import Modal from '../components/ui/Modal';
import Spinner from '../components/ui/Spinner';

// ── Currency / Number formatting ─────────────────────────────────────────────
const fmt = (n) =>
  Number(n ?? 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const round2 = (n) => Math.round(Number(n || 0) * 100) / 100;

export default function CashierPOS() {

  // ── Data States ────────────────────────────────────────────────────────────
  const [items, setItems] = useState([]);
  const [stockMap, setStockMap] = useState({}); // itemId -> stock quantity
  const [categories, setCategories] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  // ── Filter States ──────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const searchInputRef = useRef(null);

  // ── Cart State ─────────────────────────────────────────────────────────────
  // cart: [ { item, quantity, sellingPrice, lineTotal } ]
  const [cart, setCart] = useState([]);
  const [discount, setDiscount] = useState(0); // dollar discount
  const [discountPercent, setDiscountPercent] = useState(0); // or percentage discount

  // ── Checkout States ────────────────────────────────────────────────────────
  const [paymentType, setPaymentType] = useState('cash'); // 'cash' | 'credit'
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false);
  const [tenderedCash, setTenderedCash] = useState(''); // what customer handed the cashier
  const [partialCreditPaid, setPartialCreditPaid] = useState(0); // optional deposit on credit sale
  const [saleNote, setSaleNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Mobile Cart Sheet Toggle ───────────────────────────────────────────────
  const [mobileCartOpen, setMobileCartOpen] = useState(false);

  // ── Quick Add Customer Modal ───────────────────────────────────────────────
  const [newCustomerOpen, setNewCustomerOpen] = useState(false);
  const [newCustomerForm, setNewCustomerForm] = useState({ name: '', phone: '', address: '' });
  const [creatingCustomer, setCreatingCustomer] = useState(false);

  // ── Transaction Success Confirmation Modal ─────────────────────────────────
  const [lastSale, setLastSale] = useState(null);
  const [successModalOpen, setSuccessModalOpen] = useState(false);

  // ── Load Catalog & Initial Data ────────────────────────────────────────────
  const loadInitialData = useCallback(async () => {
    setLoading(true);
    try {
      const [itemsRes, stockRes, catRes, custRes] = await Promise.all([
        getItems({ includeInactive: false }),
        getStock().catch(() => ({ data: { success: true, data: [] } })),
        getCategories({ includeInactive: false }).catch(() => ({ data: { success: true, data: [] } })),
        getCustomers({ includeInactive: false }).catch(() => ({ data: { success: true, data: [] } })),
      ]);

      const itemsList = itemsRes.data?.data || [];
      setItems(itemsList);

      // Build stock lookup map (itemId -> quantity)
      const sDocs = stockRes.data?.data || [];
      const sMap = {};
      sDocs.forEach((s) => {
        const iId = typeof s.itemId === 'object' ? s.itemId?._id : s.itemId;
        if (iId) {
          sMap[iId] = s.quantity ?? 0;
        }
      });
      setStockMap(sMap);

      if (catRes.data?.data) {
        setCategories(catRes.data.data);
      }
      if (custRes.data?.data) {
        setCustomers(custRes.data.data);
      }
    } catch (err) {
      console.error('Failed to load POS catalog:', err);
      toast.error('Failed to load products. Check network connection.');
    } finally {
      setLoading(false);
      // Auto focus search input for quick barcode scanning
      setTimeout(() => searchInputRef.current?.focus(), 150);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // ── Cart Calculations ──────────────────────────────────────────────────────
  const subtotal = useMemo(() => {
    return round2(cart.reduce((sum, line) => sum + line.quantity * line.sellingPrice, 0));
  }, [cart]);

  // Compute calculated discount
  const calculatedDiscount = useMemo(() => {
    if (discountPercent > 0) {
      return round2((subtotal * discountPercent) / 100);
    }
    return round2(Math.min(Number(discount) || 0, subtotal));
  }, [subtotal, discount, discountPercent]);

  const totalAmount = useMemo(() => {
    return round2(Math.max(0, subtotal - calculatedDiscount));
  }, [subtotal, calculatedDiscount]);

  // Change calculation for Cash
  const cashGiven = Number(tenderedCash) || totalAmount;
  const changeDue = useMemo(() => {
    if (paymentType !== 'cash') return 0;
    return round2(Math.max(0, cashGiven - totalAmount));
  }, [paymentType, cashGiven, totalAmount]);

  // ── Add Item to Cart ───────────────────────────────────────────────────────
  const handleAddToCart = useCallback(
    (item) => {
      const availableStock = stockMap[item._id] ?? 0;
      if (availableStock <= 0) {
        toast.error(`"${item.name}" is out of stock in this branch`);
        return;
      }

      setCart((prev) => {
        const existingIdx = prev.findIndex((line) => line.itemId === item._id);
        if (existingIdx >= 0) {
          const currentQty = prev[existingIdx].quantity;
          if (currentQty + 1 > availableStock) {
            toast.error(`Cannot add more. Only ${availableStock} in stock.`);
            return prev;
          }
          const next = [...prev];
          next[existingIdx] = {
            ...next[existingIdx],
            quantity: currentQty + 1,
            lineTotal: round2((currentQty + 1) * next[existingIdx].sellingPrice),
          };
          return next;
        } else {
          return [
            ...prev,
            {
              itemId: item._id,
              itemName: item.name,
              sku: item.sku,
              unit: item.unit,
              sellingPrice: item.sellingPrice,
              quantity: 1,
              lineTotal: round2(item.sellingPrice),
              availableStock,
            },
          ];
        }
      });
    },
    [stockMap]
  );

  // ── Update Cart Item Quantity ──────────────────────────────────────────────
  const handleUpdateQuantity = (itemId, delta) => {
    setCart((prev) => {
      return prev
        .map((line) => {
          if (line.itemId !== itemId) return line;
          const newQty = line.quantity + delta;
          if (newQty <= 0) return null; // remove
          const maxStock = stockMap[itemId] ?? 9999;
          if (newQty > maxStock) {
            toast.error(`Max available stock is ${maxStock}`);
            return line;
          }
          return {
            ...line,
            quantity: newQty,
            lineTotal: round2(newQty * line.sellingPrice),
          };
        })
        .filter(Boolean);
    });
  };

  const handleRemoveFromCart = (itemId) => {
    setCart((prev) => prev.filter((line) => line.itemId !== itemId));
  };

  const handleClearCart = () => {
    if (cart.length === 0) return;
    setCart([]);
    setDiscount(0);
    setDiscountPercent(0);
    setTenderedCash('');
    setPartialCreditPaid(0);
    setSaleNote('');
    toast('Cart cleared', { icon: '🗑️' });
  };

  // ── Barcode / SKU Scanner Handler ──────────────────────────────────────────
  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      e.preventDefault();
      const q = searchQuery.trim().toLowerCase();
      // Look for exact SKU match first, then exact name match
      const exactMatch =
        items.find((i) => i.sku && i.sku.toLowerCase() === q) ||
        items.find((i) => i.name && i.name.toLowerCase() === q);

      if (exactMatch) {
        handleAddToCart(exactMatch);
        setSearchQuery('');
        toast.success(`Added ${exactMatch.name}`);
      } else {
        // If there's only 1 item visible in filtered items, add it
        if (filteredItems.length === 1) {
          handleAddToCart(filteredItems[0]);
          setSearchQuery('');
          toast.success(`Added ${filteredItems[0].name}`);
        } else if (filteredItems.length === 0) {
          toast.error('No matching product found');
        }
      }
    } else if (e.key === 'Escape') {
      setSearchQuery('');
    }
  };

  // ── Filtered Items ─────────────────────────────────────────────────────────
  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return items.filter((item) => {
      // Category filter
      if (selectedCategory !== 'ALL') {
        const itemCatId =
          typeof item.categoryId === 'object' ? item.categoryId?._id : item.categoryId;
        if (itemCatId !== selectedCategory) return false;
      }
      // Search query (name or sku)
      if (q) {
        const nameMatch = item.name?.toLowerCase().includes(q);
        const skuMatch = item.sku?.toLowerCase().includes(q);
        if (!nameMatch && !skuMatch) return false;
      }
      return true;
    });
  }, [items, searchQuery, selectedCategory]);

  // Selected customer info
  const selectedCustomer = useMemo(() => {
    return customers.find((c) => c._id === selectedCustomerId) || null;
  }, [customers, selectedCustomerId]);

  // Filtered customers for search dropdown
  const filteredCustomers = useMemo(() => {
    const q = customerSearch.trim().toLowerCase();
    if (!q) return customers.slice(0, 8);
    return customers
      .filter((c) => c.name?.toLowerCase().includes(q) || c.phone?.includes(q))
      .slice(0, 8);
  }, [customers, customerSearch]);

  // ── Quick Add Customer ─────────────────────────────────────────────────────
  const handleQuickCreateCustomer = async (e) => {
    e.preventDefault();
    if (!newCustomerForm.name.trim()) {
      toast.error('Customer name is required');
      return;
    }
    setCreatingCustomer(true);
    try {
      const res = await createCustomer({
        name: newCustomerForm.name.trim(),
        phone: newCustomerForm.phone.trim() || undefined,
        address: newCustomerForm.address.trim() || undefined,
      });
      if (res.data?.success) {
        const created = res.data.data;
        setCustomers((prev) => [created, ...prev]);
        setSelectedCustomerId(created._id);
        setCustomerSearch(created.name);
        setNewCustomerOpen(false);
        setNewCustomerForm({ name: '', phone: '', address: '' });
        toast.success(`Customer "${created.name}" created & selected`);
      }
    } catch (err) {
      console.error('Failed to create customer:', err);
      toast.error(err.response?.data?.message || 'Failed to create customer');
    } finally {
      setCreatingCustomer(false);
    }
  };

  // ── Validation Rules ───────────────────────────────────────────────────────
  const validationError = useMemo(() => {
    if (cart.length === 0) return 'Add at least one item to cart';
    if (paymentType === 'credit' && !selectedCustomerId) {
      return 'Please select a customer for credit sales';
    }
    for (const line of cart) {
      const liveStock = stockMap[line.itemId] ?? 0;
      if (line.quantity > liveStock) {
        return `Insufficient stock for "${line.itemName}" (available: ${liveStock})`;
      }
    }
    return null;
  }, [cart, paymentType, selectedCustomerId, stockMap]);

  // ── Complete Sale Execution (POST /sales) ──────────────────────────────────
  const handleCompleteSale = async () => {
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setIsSubmitting(true);
    try {
      // Per backend saleController rules:
      // Cash: amountPaid must equal totalAmount exactly
      // Credit: amountPaid can be 0 or partial deposit (<= totalAmount)
      const finalAmountPaid =
        paymentType === 'cash'
          ? totalAmount
          : round2(Math.min(Number(partialCreditPaid) || 0, totalAmount));

      const payload = {
        paymentType,
        customerId: paymentType === 'credit' ? selectedCustomerId : undefined,
        items: cart.map((line) => ({
          itemId: line.itemId,
          quantity: line.quantity,
          sellingPrice: line.sellingPrice,
        })),
        amountPaid: finalAmountPaid,
        discount: calculatedDiscount,
        note: saleNote.trim() || undefined,
      };

      const res = await createSale(payload);

      if (res.data?.success) {
        const saleDoc = res.data.data;

        // Optimistically update stock map locally so subsequent scans are accurate
        setStockMap((prev) => {
          const next = { ...prev };
          cart.forEach((line) => {
            if (next[line.itemId] !== undefined) {
              next[line.itemId] = Math.max(0, next[line.itemId] - line.quantity);
            }
          });
          return next;
        });

        // Store last sale for immediate receipt modal
        setLastSale({
          ...saleDoc,
          lineItems: [...cart],
          tenderedCash: cashGiven,
          changeDue: paymentType === 'cash' ? changeDue : 0,
        });

        setSuccessModalOpen(true);
        toast.success('Sale completed successfully! 🎉');

        // Reset cart and checkout states for next customer
        setCart([]);
        setDiscount(0);
        setDiscountPercent(0);
        setTenderedCash('');
        setPartialCreditPaid(0);
        setSaleNote('');
        setSelectedCustomerId('');
        setCustomerSearch('');
        setMobileCartOpen(false);
      }
    } catch (err) {
      console.error('Checkout error:', err);
      const msg = err.response?.data?.message || 'Failed to complete sale. Please try again.';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Next Sale / Close Success ──────────────────────────────────────────────
  const handleNextSale = () => {
    setSuccessModalOpen(false);
    setLastSale(null);
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 100);
  };

  return (
    <MinimalLayout>
      <div className="flex-1 flex flex-col lg:flex-row h-[calc(100vh-4rem)] md:h-[calc(100vh-4rem)] overflow-hidden">
        {/* ── LEFT / MAIN: Product Search, Category Tabs, Touch Item Grid ───── */}
        <div className="flex-1 flex flex-col min-w-0 bg-neutral-100/60 dark:bg-neutral-950 p-3 sm:p-4 overflow-hidden">
          {/* Top Search & Barcode Scan Bar */}
          <div className="mb-3 shrink-0">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-neutral-400">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Scan barcode, enter SKU, or search items (Press Enter to add)..."
                className="w-full pl-12 pr-28 py-3.5 text-base sm:text-lg font-medium bg-white dark:bg-neutral-900 border-2 border-neutral-300 dark:border-neutral-700 rounded-2xl text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-brand-accent shadow-sm transition-all"
                autoComplete="off"
                autoFocus
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center gap-1.5">
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      searchInputRef.current?.focus();
                    }}
                    className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
                    title="Clear search"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                ) : (
                  <span className="hidden sm:inline-flex items-center px-2 py-0.5 text-[11px] font-mono text-neutral-400 bg-neutral-100 dark:bg-neutral-800 rounded border border-neutral-200 dark:border-neutral-700">
                    ESC
                  </span>
                )}
                <div className="h-6 w-px bg-neutral-200 dark:border-neutral-700" />
                <span className="text-xs font-semibold text-neutral-400 flex items-center gap-1">
                  <svg className="w-4 h-4 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                  </svg>
                  <span className="hidden md:inline">Scanner Ready</span>
                </span>
              </div>
            </div>
          </div>

          {/* Quick Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-2 no-scrollbar shrink-0">
            <button
              type="button"
              onClick={() => setSelectedCategory('ALL')}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all shadow-xs ${
                selectedCategory === 'ALL'
                  ? 'bg-brand-800 text-brand-accent dark:bg-brand-accent dark:text-brand-900 shadow-sm'
                  : 'bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200/70 dark:hover:bg-neutral-800 border border-neutral-200/80 dark:border-neutral-800'
              }`}
            >
              All Items ({items.length})
            </button>
            {categories.map((cat) => (
              <button
                key={cat._id}
                type="button"
                onClick={() => setSelectedCategory(cat._id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all shadow-xs ${
                  selectedCategory === cat._id
                    ? 'bg-brand-800 text-brand-accent dark:bg-brand-accent dark:text-brand-900 shadow-sm'
                    : 'bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200/70 dark:hover:bg-neutral-800 border border-neutral-200/80 dark:border-neutral-800'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Touch-Friendly Item Grid */}
          <div className="flex-1 overflow-y-auto pr-1">
            {loading ? (
              <div className="h-64 flex flex-col items-center justify-center gap-3">
                <Spinner size="lg" />
                <span className="text-xs font-medium text-neutral-500">Loading catalog items...</span>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-center p-6 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 mt-4">
                <div className="w-12 h-12 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-400 mb-2">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                </div>
                <h4 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">No products found</h4>
                <p className="text-xs text-neutral-400 mt-1 max-w-xs">
                  Try adjusting your search query or selecting a different category.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-2.5 sm:gap-3">
                {filteredItems.map((item) => {
                  const stock = stockMap[item._id] ?? 0;
                  const isOutOfStock = stock <= 0;
                  const isLow = stock > 0 && stock <= (item.reorderLevel || 5);

                  return (
                    <div
                      key={item._id}
                      onClick={() => !isOutOfStock && handleAddToCart(item)}
                      className={`group relative flex flex-col justify-between p-3.5 rounded-2xl border transition-all select-none min-h-[90px] ${
                        isOutOfStock
                          ? 'bg-neutral-100 dark:bg-neutral-900/50 border-neutral-200 dark:border-neutral-800 opacity-60 cursor-not-allowed'
                          : 'bg-white dark:bg-neutral-900 border-neutral-200/90 dark:border-neutral-800 hover:border-brand-500 hover:shadow-md cursor-pointer active:scale-[0.98]'
                      }`}
                    >
                      {/* Top: Item Title & SKU */}
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-bold text-sm text-neutral-900 dark:text-white line-clamp-2 leading-tight">
                            {item.name}
                          </h3>
                          {/* Stock badge */}
                          <span
                            className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              isOutOfStock
                                ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                                : isLow
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                            }`}
                          >
                            {isOutOfStock ? 'Out of Stock' : `${stock} ${item.unit || 'units'}`}
                          </span>
                        </div>

                        {item.sku && (
                          <div className="text-[11px] font-mono text-neutral-400 mt-1 truncate">
                            SKU: {item.sku}
                          </div>
                        )}
                      </div>

                      {/* Bottom: Large Price & Touch "+" Button (min height 56px touch target area) */}
                      <div className="mt-3 flex items-center justify-between pt-2 border-t border-neutral-100 dark:border-neutral-800/80">
                        <div>
                          <span className="font-mono text-lg font-extrabold text-neutral-900 dark:text-neutral-50">
                            ${fmt(item.sellingPrice)}
                          </span>
                          <span className="text-[11px] text-neutral-400 ml-1">/{item.unit || 'ea'}</span>
                        </div>

                        {/* Large tap button target (min 44x44px target) */}
                        <button
                          type="button"
                          disabled={isOutOfStock}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!isOutOfStock) handleAddToCart(item);
                          }}
                          className={`w-11 h-11 rounded-xl flex items-center justify-center font-extrabold text-lg transition-all shadow-xs ${
                            isOutOfStock
                              ? 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
                              : 'bg-brand-50 text-brand-800 group-hover:bg-brand-800 group-hover:text-white dark:bg-brand-900/60 dark:text-brand-accent dark:group-hover:bg-brand-accent dark:group-hover:text-brand-950 active:scale-95'
                          }`}
                          title={isOutOfStock ? 'Item is out of stock' : `Add ${item.name} to cart`}
                        >
                          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Mobile Bottom Bar: Cart Summary & Drawer Trigger (only visible on mobile < lg) */}
          <div className="lg:hidden mt-2 p-3 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-md flex items-center justify-between gap-3 shrink-0">
            <div>
              <div className="text-[11px] uppercase font-bold text-neutral-400">
                Cart ({cart.reduce((s, i) => s + i.quantity, 0)} items)
              </div>
              <div className="font-mono text-xl font-extrabold text-neutral-900 dark:text-white">
                ${fmt(totalAmount)}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setMobileCartOpen(true)}
              className="btn-primary py-2.5 px-5 flex items-center gap-2 text-sm font-bold shadow-md"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              <span>View Cart & Pay</span>
            </button>
          </div>
        </div>

        {/* ── RIGHT: Responsive Cart & Checkout Panel ───────────────────────── */}
        {/* On desktop: fixed right sidebar (w-96 to w-[420px]). On mobile: bottom sheet modal drawer */}
        <div
          className={`fixed inset-0 z-50 lg:relative lg:inset-auto lg:z-0 flex flex-col w-full lg:w-[420px] 2xl:w-[460px] bg-white dark:bg-neutral-900 border-l border-neutral-200 dark:border-neutral-800 shadow-xl lg:shadow-none transition-transform duration-200 ${
            mobileCartOpen ? 'translate-y-0' : 'translate-y-full lg:translate-y-0'
          }`}
        >
          {/* Cart Header */}
          <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between shrink-0 bg-neutral-50/70 dark:bg-neutral-900/90">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-brand-100 text-brand-800 dark:bg-brand-900/60 dark:text-brand-accent flex items-center justify-center font-bold text-sm">
                {cart.reduce((s, i) => s + i.quantity, 0)}
              </div>
              <div>
                <h2 className="font-bold text-base text-neutral-900 dark:text-white leading-tight">
                  Active Cart
                </h2>
                <div className="text-[11px] text-neutral-400">
                  {cart.length} distinct item{cart.length === 1 ? '' : 's'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearCart}
                  className="text-xs font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400 px-2 py-1 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                >
                  Clear
                </button>
              )}
              {/* Close Mobile Drawer */}
              <button
                type="button"
                onClick={() => setMobileCartOpen(false)}
                className="lg:hidden p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Cart Items Scroll Area */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 divide-y divide-neutral-100 dark:divide-neutral-800/80">
            {cart.length === 0 ? (
              <div className="h-full min-h-[220px] flex flex-col items-center justify-center text-center p-6">
                <div className="w-16 h-16 rounded-full bg-neutral-100 dark:bg-neutral-800/80 text-neutral-300 dark:text-neutral-600 flex items-center justify-center mb-3">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                </div>
                <h4 className="text-sm font-bold text-neutral-700 dark:text-neutral-300">Cart is Empty</h4>
                <p className="text-xs text-neutral-400 mt-1 max-w-[220px]">
                  Scan a barcode or tap product cards to add them to this sale transaction.
                </p>
              </div>
            ) : (
              cart.map((line) => (
                <div key={line.itemId} className="py-2.5 flex items-center justify-between gap-3">
                  {/* Item info */}
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-xs sm:text-sm text-neutral-900 dark:text-white truncate">
                      {line.itemName}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-neutral-400">
                      <span className="font-mono text-neutral-600 dark:text-neutral-300 font-medium">
                        ${fmt(line.sellingPrice)}
                      </span>
                      <span>·</span>
                      <span className="font-mono text-[11px]">Sub: ${fmt(line.lineTotal)}</span>
                    </div>
                  </div>

                  {/* Touch-Friendly Quantity Steppers (min 36x36px buttons) */}
                  <div className="flex items-center gap-1.5 bg-neutral-100 dark:bg-neutral-800/90 p-1 rounded-xl border border-neutral-200 dark:border-neutral-700/80 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleUpdateQuantity(line.itemId, -1)}
                      className="w-8 h-8 rounded-lg bg-white dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-neutral-600 flex items-center justify-center font-bold transition-transform active:scale-95 shadow-2xs"
                      title="Decrease quantity"
                    >
                      -
                    </button>
                    <span className="w-8 text-center font-mono font-bold text-sm text-neutral-900 dark:text-white">
                      {line.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleUpdateQuantity(line.itemId, 1)}
                      className="w-8 h-8 rounded-lg bg-white dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-neutral-600 flex items-center justify-center font-bold transition-transform active:scale-95 shadow-2xs"
                      title="Increase quantity"
                    >
                      +
                    </button>
                  </div>

                  {/* Line Total & Remove button */}
                  <div className="flex items-center gap-1 text-right shrink-0">
                    <button
                      type="button"
                      onClick={() => handleRemoveFromCart(line.itemId)}
                      className="p-1 rounded-md text-neutral-300 hover:text-rose-500 dark:hover:text-rose-400 transition-colors"
                      title="Remove item"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* ── Checkout & Totals Summary Area ─────────────────────────────── */}
          <div className="p-4 bg-neutral-50 dark:bg-neutral-900/95 border-t border-neutral-200 dark:border-neutral-800 space-y-3.5 shrink-0">
            {/* Subtotal & Discount rows */}
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400">
                <span>Subtotal</span>
                <span className="font-mono font-semibold text-neutral-800 dark:text-neutral-200">
                  ${fmt(subtotal)}
                </span>
              </div>

              {/* Discount Selector */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-neutral-500 dark:text-neutral-400">Discount</span>
                <div className="flex items-center gap-1.5">
                  {[0, 5, 10].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => {
                        setDiscountPercent(pct);
                        setDiscount(0);
                      }}
                      className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        discountPercent === pct && discount === 0
                          ? 'bg-brand-800 text-brand-accent dark:bg-brand-accent dark:text-brand-900'
                          : 'bg-neutral-200/70 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'
                      }`}
                    >
                      {pct === 0 ? 'None' : `${pct}%`}
                    </button>
                  ))}
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={discount || ''}
                    placeholder="$0"
                    onChange={(e) => {
                      setDiscount(e.target.value);
                      setDiscountPercent(0);
                    }}
                    className="w-16 py-0.5 px-1.5 text-right text-xs bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded font-mono"
                  />
                </div>
              </div>

              {calculatedDiscount > 0 && (
                <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
                  <span>Discount Applied</span>
                  <span className="font-mono">-${fmt(calculatedDiscount)}</span>
                </div>
              )}
            </div>

            {/* Extra Large Running Total */}
            <div className="pt-2 pb-1 border-t border-neutral-200/80 dark:border-neutral-800 flex items-baseline justify-between">
              <span className="text-xs uppercase font-extrabold tracking-wider text-neutral-500 dark:text-neutral-400">
                Total Due
              </span>
              <div className="font-mono text-3xl sm:text-4xl font-black text-neutral-900 dark:text-white tracking-tight">
                ${fmt(totalAmount)}
              </div>
            </div>

            {/* Large Cash / Credit Toggle (Tactile buttons, NOT a small dropdown) */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPaymentType('cash')}
                className={`py-3 px-3 rounded-xl flex items-center justify-center gap-2 font-bold text-sm transition-all border-2 ${
                  paymentType === 'cash'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                    : 'bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 hover:border-neutral-300'
                }`}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span>Cash Payment</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentType('credit')}
                className={`py-3 px-3 rounded-xl flex items-center justify-center gap-2 font-bold text-sm transition-all border-2 ${
                  paymentType === 'credit'
                    ? 'bg-brand-800 text-brand-accent dark:bg-brand-accent dark:text-brand-900 border-brand-800 dark:border-brand-accent shadow-sm'
                    : 'bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 hover:border-neutral-300'
                }`}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                <span>Credit Account</span>
              </button>
            </div>

            {/* Cash Tendered / Change Calculator (when Cash selected) */}
            {paymentType === 'cash' && (
              <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-xl border border-emerald-200/80 dark:border-emerald-800/50 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-emerald-900 dark:text-emerald-200">
                    Cash Tendered
                  </label>
                  <div className="flex items-center gap-1">
                    {[totalAmount, 20, 50, 100].map((amt, idx) => {
                      if (amt < totalAmount && idx > 0) return null;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setTenderedCash(String(amt))}
                          className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-white dark:bg-neutral-800 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100"
                        >
                          {idx === 0 ? 'Exact' : `$${amt}`}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm text-neutral-400">
                      $
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min={totalAmount}
                      value={tenderedCash}
                      onChange={(e) => setTenderedCash(e.target.value)}
                      placeholder={fmt(totalAmount)}
                      className="w-full pl-7 pr-3 py-1.5 text-base font-mono font-bold bg-white dark:bg-neutral-900 border border-emerald-300 dark:border-emerald-700 rounded-lg text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  {/* Change Return display */}
                  <div className="text-right shrink-0">
                    <div className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-300">
                      Change Due
                    </div>
                    <div className="font-mono text-lg font-black text-emerald-700 dark:text-emerald-400">
                      ${fmt(changeDue)}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Credit Customer Selector (when Credit selected) */}
            {paymentType === 'credit' && (
              <div className="p-3 bg-brand-50/70 dark:bg-neutral-800/80 rounded-xl border border-brand-200/80 dark:border-neutral-700 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                    Customer Account <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setNewCustomerOpen(true)}
                    className="text-xs font-bold text-brand-700 dark:text-brand-accent hover:underline flex items-center gap-1"
                  >
                    + New Customer
                  </button>
                </div>

                {/* Customer search select */}
                <div className="relative">
                  <input
                    type="text"
                    value={customerSearch}
                    onChange={(e) => {
                      setCustomerSearch(e.target.value);
                      setCustomerDropdownOpen(true);
                    }}
                    onFocus={() => setCustomerDropdownOpen(true)}
                    placeholder="Type customer name or phone..."
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-brand-accent"
                  />
                  {selectedCustomer && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCustomerId('');
                        setCustomerSearch('');
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700"
                    >
                      ✕
                    </button>
                  )}

                  {/* Dropdown suggestions */}
                  {customerDropdownOpen && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-lg max-h-48 overflow-y-auto z-50 divide-y divide-neutral-100 dark:divide-neutral-800">
                      {filteredCustomers.length === 0 ? (
                        <div className="p-3 text-xs text-neutral-400 text-center">
                          No matching customer found.{' '}
                          <button
                            type="button"
                            onClick={() => {
                              setCustomerDropdownOpen(false);
                              setNewCustomerOpen(true);
                            }}
                            className="text-brand-700 dark:text-brand-accent font-bold underline ml-1"
                          >
                            Add New
                          </button>
                        </div>
                      ) : (
                        filteredCustomers.map((c) => (
                          <div
                            key={c._id}
                            onClick={() => {
                              setSelectedCustomerId(c._id);
                              setCustomerSearch(`${c.name} (${c.phone || 'No phone'})`);
                              setCustomerDropdownOpen(false);
                            }}
                            className="p-2.5 text-xs hover:bg-brand-50/50 dark:hover:bg-neutral-800 cursor-pointer flex items-center justify-between"
                          >
                            <div>
                              <span className="font-bold text-neutral-900 dark:text-white">{c.name}</span>
                              {c.phone && (
                                <span className="text-[11px] text-neutral-400 ml-1.5 font-mono">
                                  {c.phone}
                                </span>
                              )}
                            </div>
                            <div className="font-mono text-[11px] text-neutral-500">
                              Bal: ${fmt(c.currentBalance)}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* Selected customer current balance warning if overdue */}
                {selectedCustomer && (
                  <div className="text-[11px] text-neutral-500 flex items-center justify-between pt-1">
                    <span>Current Outstanding:</span>
                    <span
                      className={`font-mono font-bold ${
                        selectedCustomer.currentBalance > 0
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-neutral-700 dark:text-neutral-300'
                      }`}
                    >
                      ${fmt(selectedCustomer.currentBalance)}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Validation Message Hint */}
            {validationError && cart.length > 0 && (
              <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-400 text-xs font-semibold flex items-center gap-1.5">
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>{validationError}</span>
              </div>
            )}

            {/* FULL-WIDTH COMPLETE SALE BUTTON (Min 56px height) */}
            <button
              type="button"
              disabled={Boolean(validationError) || isSubmitting}
              onClick={handleCompleteSale}
              className={`w-full min-h-[56px] py-3.5 px-4 rounded-2xl font-extrabold text-base sm:text-lg flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.99] ${
                validationError || isSubmitting
                  ? 'bg-neutral-300 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500 cursor-not-allowed shadow-none'
                  : paymentType === 'cash'
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30'
                  : 'bg-brand-800 hover:bg-brand-900 text-brand-accent shadow-brand-900/30'
              }`}
            >
              {isSubmitting ? (
                <>
                  <Spinner size="sm" />
                  <span>Processing Sale...</span>
                </>
              ) : (
                <>
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>
                    Complete Sale • ${fmt(totalAmount)}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── Modal: Quick Add Customer ────────────────────────────────────────── */}
      <Modal
        isOpen={newCustomerOpen}
        onClose={() => !creatingCustomer && setNewCustomerOpen(false)}
        title="Register Quick Customer"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleQuickCreateCustomer} className="space-y-4 mt-2">
          <p className="text-xs text-neutral-500">
            Quickly register a walk-in credit customer without leaving the POS register.
          </p>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
              Customer Full Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              value={newCustomerForm.name}
              onChange={(e) => setNewCustomerForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="e.g. David Miller"
              className="w-full px-3 py-2 text-sm bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
              Phone Number
            </label>
            <input
              type="text"
              value={newCustomerForm.phone}
              onChange={(e) => setNewCustomerForm((p) => ({ ...p, phone: e.target.value }))}
              placeholder="+1 (555) 000-0000"
              className="w-full px-3 py-2 text-sm bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
              Address / Notes
            </label>
            <input
              type="text"
              value={newCustomerForm.address}
              onChange={(e) => setNewCustomerForm((p) => ({ ...p, address: e.target.value }))}
              placeholder="e.g. Suite 4B / Downtown"
              className="w-full px-3 py-2 text-sm bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-200 dark:border-neutral-800">
            <button
              type="button"
              onClick={() => setNewCustomerOpen(false)}
              className="btn-secondary px-4 py-2 text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creatingCustomer}
              className="btn-primary px-4 py-2 text-xs flex items-center gap-2"
            >
              {creatingCustomer && <Spinner size="xs" />}
              <span>Save & Select</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Modal: Transaction Success & Receipt Confirmation ────────────────── */}
      <Modal
        isOpen={successModalOpen}
        onClose={handleNextSale}
        title="Transaction Completed"
        maxWidth="max-w-md"
      >
        <div className="space-y-4 text-center mt-1">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-sm">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <div>
            <div className="text-xs uppercase font-extrabold tracking-wider text-neutral-400">
              Sale Receipt
            </div>
            <div className="font-mono text-3xl font-black text-neutral-900 dark:text-white mt-0.5">
              ${fmt(lastSale?.totalAmount)}
            </div>
            <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase mt-1 bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
              {lastSale?.paymentType === 'cash' ? 'Paid in Cash' : 'Charged to Account'}
            </div>
          </div>

          {/* Change return banner if Cash */}
          {lastSale?.paymentType === 'cash' && lastSale?.changeDue > 0 && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-xl">
              <div className="text-xs font-bold text-emerald-800 dark:text-emerald-200">
                Return Change to Customer:
              </div>
              <div className="font-mono text-2xl font-black text-emerald-600 dark:text-emerald-400">
                ${fmt(lastSale.changeDue)}
              </div>
            </div>
          )}

          {/* Line items mini summary */}
          <div className="bg-neutral-50 dark:bg-neutral-800/60 rounded-xl p-3 text-left space-y-1.5 max-h-36 overflow-y-auto">
            {lastSale?.lineItems?.map((it, idx) => (
              <div key={idx} className="flex justify-between text-xs text-neutral-600 dark:text-neutral-300">
                <span className="truncate max-w-[200px]">
                  {it.quantity}x {it.itemName}
                </span>
                <span className="font-mono font-medium">${fmt(it.lineTotal)}</span>
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="w-full sm:w-auto flex-1 btn-secondary py-3 text-xs font-bold flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              <span>Print Receipt</span>
            </button>

            <button
              type="button"
              autoFocus
              onClick={handleNextSale}
              className="w-full sm:w-auto flex-1 btn-primary py-3 text-xs font-extrabold flex items-center justify-center gap-2"
            >
              <span>Next Sale (Enter)</span>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>
          </div>
        </div>
      </Modal>
    </MinimalLayout>
  );
}
