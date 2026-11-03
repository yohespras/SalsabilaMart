import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { QrCode, CheckCircle2, Clock, X } from 'lucide-react';
import { StoreProfile } from '../types';
import { formatRupiah } from '../services/storage';

interface QRISModalProps {
  total: number;
  transactionId: string;
  storeProfile: StoreProfile;
  onSuccess: (qrisRef: string) => void;
  onCancel: () => void;
}

export const QRISModal: React.FC<QRISModalProps> = ({
  total,
  transactionId,
  storeProfile,
  onSuccess,
  onCancel,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [countdown, setCountdown] = useState(300); // 5 minutes
  const [isVerifying, setIsVerifying] = useState(false);
  const qrisRef = `QRIS-${Date.now().toString().slice(-8)}`;

  useEffect(() => {
    // Generate QRIS standard payload string
    const payload = `00020101021226590014ID.LINKAJA.WWW011893600999${
      storeProfile.qrisNmid || '102003040506'
    }0215${transactionId}520454115303360540${total}5802ID59${storeProfile.name.slice(
      0,
      15
    )}6007JAKARTA62190115${transactionId}6304ABCD`;

    QRCode.toDataURL(payload, {
      width: 280,
      margin: 1,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('Error generating QRIS code:', err));

    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [total, transactionId, storeProfile]);

  const minutes = Math.floor(countdown / 60);
  const seconds = countdown % 60;

  const handleSimulatePayment = () => {
    setIsVerifying(true);
    setTimeout(() => {
      setIsVerifying(false);
      onSuccess(qrisRef);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95">
        {/* Header QRIS Resmi */}
        <div className="bg-red-600 text-white p-4 text-center relative">
          <button
            onClick={onCancel}
            className="absolute top-3.5 right-3.5 text-white/80 hover:text-white p-1 rounded-xl hover:bg-black/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center justify-center gap-2 font-black tracking-wider text-base">
            <span className="bg-white text-red-600 px-2 py-0.5 rounded text-xs font-black shadow-xs">
              QRIS
            </span>
            <span>PEMBAYARAN DIGITAL</span>
          </div>
          <p className="text-[11px] text-red-100 mt-0.5 font-medium">
            National Standard Quick Response Code
          </p>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col items-center">
          {/* Merchant info */}
          <div className="text-center mb-3">
            <h4 className="font-black text-sm text-slate-900 dark:text-white uppercase tracking-tight">
              {storeProfile.name}
            </h4>
            <p className="text-[10px] text-slate-400 font-mono mt-0.5">
              NMID: {storeProfile.qrisNmid || 'ID1020030405060'} • Trx: {transactionId}
            </p>
          </div>

          {/* QR Code Container */}
          <div className="p-3 bg-white rounded-2xl shadow-inner border border-slate-200 flex items-center justify-center">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="QRIS Code" className="w-56 h-56 object-contain" />
            ) : (
              <div className="w-56 h-56 flex items-center justify-center text-slate-400 text-xs">
                Memuat QR Code...
              </div>
            )}
          </div>

          {/* Amount Showcase */}
          <div className="mt-4 text-center">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              TOTAL NOMINAL PEMBAYARAN
            </span>
            <div className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 tracking-tight">
              {formatRupiah(total)}
            </div>
          </div>

          {/* Countdown timer */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-2">
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <span>
              Berlaku dalam:{' '}
              <strong className="font-mono text-slate-700 dark:text-slate-300">
                {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
              </strong>
            </span>
          </div>

          {/* Supported Wallets Pills */}
          <div className="mt-3 flex items-center justify-center gap-1.5 flex-wrap">
            {['BCA Mobile', 'GoPay', 'OVO', 'Dana', 'ShopeePay', 'Livin'].map((w) => (
              <span
                key={w}
                className="text-[9px] font-bold px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-full"
              >
                {w}
              </span>
            ))}
          </div>

          {/* Payment Confirmation Button */}
          <button
            onClick={handleSimulatePayment}
            disabled={isVerifying}
            className="mt-5 w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
          >
            {isVerifying ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Memverifikasi Pembayaran...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Konfirmasi Pembayaran Diterima</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
