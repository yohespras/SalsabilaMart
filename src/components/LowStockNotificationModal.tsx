import React, { useState } from 'react';
import { AlertTriangle, X, Plus, CheckCircle, Check } from 'lucide-react';
import { Product, UserRole } from '../types';

interface LowStockNotificationModalProps {
  products: Product[];
  userRole: UserRole;
  onRestock: (productId: string, addQuantity: number) => void;
  onClose: () => void;
}

export const LowStockNotificationModal: React.FC<LowStockNotificationModalProps> = ({
  products,
  userRole,
  onRestock,
  onClose,
}) => {
  const [restockInputs, setRestockInputs] = useState<Record<string, number>>({});
  const [successRestocked, setSuccessRestocked] = useState<string | null>(null);

  const lowStockProducts = products.filter((p) => p.stock <= p.minStock);

  const handleApplyRestock = (productId: string) => {
    const qty = restockInputs[productId] || 10;
    if (qty > 0) {
      onRestock(productId, qty);
      setSuccessRestocked(productId);
      setTimeout(() => setSuccessRestocked(null), 1500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-950/15 rounded-2xl">
              <AlertTriangle className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <h3 className="font-black text-sm">Peringatan Batas Minimum Stok</h3>
              <p className="text-xs text-slate-900 font-medium">
                {lowStockProducts.length} barang memerlukan pengadaan / restock segera
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-950/80 hover:text-slate-950 hover:bg-black/10 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content List */}
        <div className="p-6 overflow-y-auto flex-1 space-y-3 bg-slate-50/50 dark:bg-slate-950/40">
          {lowStockProducts.length === 0 ? (
            <div className="text-center py-10">
              <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
              <p className="font-bold text-slate-800 dark:text-white text-sm">Semua Stok Aman!</p>
              <p className="text-xs text-slate-400 mt-1">
                Tidak ada barang yang berada di bawah ambang batas minimum.
              </p>
            </div>
          ) : (
            lowStockProducts.map((p) => {
              const isZero = p.stock <= 0;
              const isSuccess = successRestocked === p.id;
              return (
                <div
                  key={p.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    isZero
                      ? 'bg-rose-500/10 border-rose-500/30'
                      : 'bg-amber-500/10 border-amber-500/30'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            isZero
                              ? 'bg-rose-600 text-white'
                              : 'bg-amber-500 text-slate-950'
                          }`}
                        >
                          {isZero ? 'HABIS' : 'KRITIS'}
                        </span>
                        <h4 className="font-bold text-xs truncate leading-snug">
                          {p.name}
                        </h4>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1.5">
                        <span className="font-mono text-emerald-500 font-semibold">{p.barcode}</span>
                        <span>•</span>
                        <span>
                          Sisa:{' '}
                          <strong
                            className={
                              isZero
                                ? 'text-rose-500 font-black'
                                : 'text-amber-500 font-black'
                            }
                          >
                            {p.stock} {p.unit}
                          </strong>
                        </span>
                        <span>•</span>
                        <span>Batas Min: {p.minStock} {p.unit}</span>
                      </div>
                    </div>

                    {userRole === 'admin' ? (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <input
                          type="number"
                          min="1"
                          placeholder="+10"
                          value={restockInputs[p.id] || ''}
                          onChange={(e) =>
                            setRestockInputs({
                              ...restockInputs,
                              [p.id]: parseInt(e.target.value, 10) || 0,
                            })
                          }
                          className="w-16 px-2 py-1 text-xs border rounded-xl text-center font-mono font-bold bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 focus:outline-hidden"
                        />
                        <button
                          type="button"
                          onClick={() => handleApplyRestock(p.id)}
                          className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                            isSuccess
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-950'
                          }`}
                        >
                          {isSuccess ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                          <span>{isSuccess ? 'Ditambah' : 'Restock'}</span>
                        </button>
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-400 italic">
                        Hubungi Admin
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-100 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 dark:text-slate-950 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
