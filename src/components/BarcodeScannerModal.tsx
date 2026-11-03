import React, { useEffect, useRef, useState } from 'react';
import {
  Camera,
  X,
  RefreshCw,
  Zap,
  Keyboard,
  AlertCircle,
  Check,
  Upload,
  SwitchCamera,
  ScanLine,
  Image as ImageIcon,
  Cable,
  Repeat,
} from 'lucide-react';
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';
import { Product } from '../types';
import { decodeBarcodeFromImageFile } from '../services/barcodeDecoder';
import { playBarcodeBeep } from '../services/barcodeGenerator';
import {
  useHardwareBarcodeScanner,
  cleanBarcodeString,
  matchProductBarcode,
  useWindowFocusStatus,
} from '../services/hardwareScanner';

type ScanMode = 'hardware' | 'upload' | 'camera';

interface BarcodeScannerModalProps {
  products: Product[];
  onDetected: (barcode: string) => void;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  initialMode?: ScanMode;
  allowContinuous?: boolean;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  products,
  onDetected,
  onClose,
  title = 'Pindai Barcode (Mesin Kabel / Kamera)',
  subtitle = 'Gunakan mesin scanner kabel USB/OTG, unggah gambar barcode, atau kamera HP',
  initialMode = 'hardware',
  allowContinuous = false,
}) => {
  const [activeMode, setActiveMode] = useState<ScanMode>(initialMode);
  const [continuousMode, setContinuousMode] = useState<boolean>(allowContinuous);

  // Camera States
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | undefined>(undefined);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);

  // Upload States
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [uploadedImagePreview, setUploadedImagePreview] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Hardware Cable Scanner States (kept strictly separate from manual input to avoid re-render conflicts)
  const hardwareInputRef = useRef<HTMLInputElement | null>(null);
  const [scannerBoxValue, setScannerBoxValue] = useState('');
  const [isScannerBoxFocused, setIsScannerBoxFocused] = useState(true);
  const [liveSignal, setLiveSignal] = useState<string>('');
  const { isWindowFocused, activateScannerFocus } = useWindowFocusStatus();

  // Manual Fallback Input State
  const [manualCode, setManualCode] = useState('');

  // Scan Feedback States
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [lastScannedName, setLastScannedName] = useState<string | null>(null);
  const [scanCount, setScanCount] = useState<number>(0);
  const [scanSuccessAnim, setScanSuccessAnim] = useState(false);
  const lockRef = useRef(false);

  const focusHardwareBox = () => {
    if (activeMode === 'hardware' && hardwareInputRef.current) {
      hardwareInputRef.current.focus({ preventScroll: true });
      setIsScannerBoxFocused(true);
    }
  };

  // Auto-focus hardware scanner box whenever modal opens or switches to hardware mode
  useEffect(() => {
    lockRef.current = false;
    if (activeMode === 'hardware') {
      const t1 = setTimeout(focusHardwareBox, 40);
      const t2 = setTimeout(focusHardwareBox, 180);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [activeMode]);

  const handleBarcodeFound = (rawCode: string) => {
    if (lockRef.current) return;
    const cleanCode = cleanBarcodeString(rawCode);
    if (!cleanCode) return;

    lockRef.current = true;
    playBarcodeBeep();

    const matched = matchProductBarcode(products, cleanCode);
    setLastScanned(cleanCode);
    setLastScannedName(matched ? matched.name : 'Barang Belum Terdaftar');
    setScanCount((prev) => prev + 1);
    setScannerBoxValue('');
    setLiveSignal('');

    if (continuousMode && activeMode === 'hardware') {
      // Continuous wired scanning: emit immediately, flash non-blocking indicator, and stay ready!
      onDetected(cleanCode);
      setScanSuccessAnim(true);
      setTimeout(() => {
        setScanSuccessAnim(false);
      }, 650);
      setTimeout(() => {
        lockRef.current = false;
        focusHardwareBox();
      }, 180);
      return;
    }

    // Single scan mode: stop camera if active, emit barcode, and close modal cleanly
    setScanSuccessAnim(true);
    if (codeReaderRef.current) {
      codeReaderRef.current.reset();
    }

    setTimeout(() => {
      onDetected(cleanCode);
      onClose();
    }, 280);
  };

  // Global wired USB / OTG / Bluetooth scanner listener inside modal
  useHardwareBarcodeScanner({
    enabled: true,
    minLength: 3,
    onKeyActivity: (partial) => {
      setLiveSignal(partial);
    },
    onScan: (scanned) => {
      handleBarcodeFound(scanned);
    },
  });

  // Initialize camera only when camera mode is active
  useEffect(() => {
    if (activeMode !== 'camera') {
      if (codeReaderRef.current) {
        codeReaderRef.current.reset();
      }
      setCameraActive(false);
      return;
    }

    lockRef.current = false;
    const codeReader = new BrowserMultiFormatReader();
    codeReaderRef.current = codeReader;

    const initCamera = async () => {
      try {
        setCameraError(null);
        const videoInputDevices = await codeReader.listVideoInputDevices();
        setAvailableDevices(videoInputDevices);

        let chosenDeviceId = selectedDeviceId;
        if (!chosenDeviceId && videoInputDevices.length > 0) {
          const backCam = videoInputDevices.find(
            (d) =>
              d.label.toLowerCase().includes('back') ||
              d.label.toLowerCase().includes('rear') ||
              d.label.toLowerCase().includes('environment')
          );
          chosenDeviceId = backCam ? backCam.deviceId : videoInputDevices[0].deviceId;
        }

        if (videoRef.current) {
          setCameraActive(true);
          await codeReader.decodeFromVideoDevice(
            chosenDeviceId || null,
            videoRef.current,
            (result, error) => {
              if (result) {
                handleBarcodeFound(result.getText());
              }
              if (error && !(error instanceof NotFoundException)) {
                // Ignore routine NotFound frames
              }
            }
          );
        }
      } catch (err: any) {
        console.error('Camera access error:', err);
        setCameraActive(false);
        setCameraError(
          err.name === 'NotAllowedError'
            ? 'Izin akses kamera ditolak browser. Gunakan tab "Scanner Kabel USB" atau "Upload Gambar".'
            : 'Kamera tidak tersedia di perangkat ini. Gunakan tab "Scanner Kabel USB" atau "Upload Gambar".'
        );
      }
    };

    initCamera();

    return () => {
      if (codeReaderRef.current) {
        codeReaderRef.current.reset();
      }
    };
  }, [activeMode, selectedDeviceId]);

  const handleFileUpload = async (file: File) => {
    setIsProcessingImage(true);
    setUploadError(null);
    try {
      const previewUrl = URL.createObjectURL(file);
      setUploadedImagePreview(previewUrl);

      const barcodeText = await decodeBarcodeFromImageFile(file);
      if (barcodeText) {
        handleBarcodeFound(barcodeText);
      }
    } catch (err: any) {
      setUploadError(
        err.message ||
          'Garis barcode tidak terdeteksi pada gambar. Pastikan gambar jelas dan tidak terpotong.'
      );
    } finally {
      setIsProcessingImage(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      const code = manualCode.trim();
      setManualCode('');
      handleBarcodeFound(code);
    }
  };

  const handleSwitchDevice = () => {
    if (availableDevices.length <= 1) return;
    const currentIndex = availableDevices.findIndex((d) => d.deviceId === selectedDeviceId);
    const nextIndex = (currentIndex + 1) % availableDevices.length;
    if (codeReaderRef.current) {
      codeReaderRef.current.reset();
    }
    setCameraActive(false);
    setSelectedDeviceId(availableDevices[nextIndex].deviceId);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 my-4">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
              <ScanLine className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm">{title}</h3>
              <p className="text-[10px] text-slate-400 leading-tight">{subtitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="grid grid-cols-3 p-2 bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 gap-1.5 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveMode('hardware')}
            className={`py-2 px-2 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeMode === 'hardware'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800'
            }`}
          >
            <Cable className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Scanner Kabel USB</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMode('upload')}
            className={`py-2 px-2 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeMode === 'upload'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Upload Gambar</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMode('camera')}
            className={`py-2 px-2 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeMode === 'camera'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800'
            }`}
          >
            <Camera className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Kamera HP</span>
          </button>
        </div>

        <div className="p-5">
          {/* Window / Iframe Focus Warning if focus is outside */}
          {!isWindowFocused && (
            <button
              type="button"
              onClick={() => activateScannerFocus(hardwareInputRef.current)}
              className="w-full mb-3 p-3 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-600 dark:text-amber-300 text-xs font-bold flex items-center justify-between gap-2 cursor-pointer animate-pulse"
            >
              <span className="flex items-center gap-2 text-left">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Klik di sini sekali agar sinyal Mesin Scanner Kabel masuk ke layar!</span>
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-amber-500 text-slate-950 font-black text-[10px] shrink-0">
                AKTIFKAN
              </span>
            </button>
          )}

          {/* TAB 1: WIRED USB / HARDWARE SCANNER */}
          {activeMode === 'hardware' && (
            <div className="space-y-3.5">
              {allowContinuous && (
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs">
                  <div className="flex items-center gap-2">
                    <Repeat className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span className="font-bold text-slate-700 dark:text-slate-200">
                      Mode Scan Beruntun (Banyak Barang)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setContinuousMode((prev) => !prev);
                      setTimeout(focusHardwareBox, 30);
                    }}
                    className={`px-3 py-1 rounded-lg text-[11px] font-black transition-all cursor-pointer ${
                      continuousMode
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {continuousMode ? 'AKTIF' : 'MATI (1x Scan)'}
                  </button>
                </div>
              )}

              <div
                onClick={focusHardwareBox}
                className={`relative p-5 rounded-2xl border-2 border-dashed text-center transition-all cursor-pointer ${
                  isScannerBoxFocused && isWindowFocused
                    ? 'bg-gradient-to-b from-emerald-500/10 via-emerald-500/5 to-transparent border-emerald-500/60'
                    : 'bg-amber-500/5 border-amber-500/50'
                }`}
              >
                <div className="w-14 h-14 mx-auto mb-2.5 rounded-2xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center relative">
                  <Cable className="w-7 h-7" />
                  <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
                </div>
                <h4 className="font-black text-slate-800 dark:text-white text-sm sm:text-base">
                  Mesin Scanner Barcode Kabel Siap Digunakan
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
                  Colokkan kabel USB / OTG mesin barcode, arahkan laser ke barcode barang, lalu tekan pelatuk scanner.
                </p>

                <div className="mt-3.5 max-w-sm mx-auto">
                  <input
                    ref={hardwareInputRef}
                    type="text"
                    inputMode="none"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                    data-barcode-input="true"
                    placeholder="Area tangkap sinyal mesin barcode kabel..."
                    value={scannerBoxValue}
                    onFocus={() => setIsScannerBoxFocused(true)}
                    onBlur={() => setIsScannerBoxFocused(false)}
                    onChange={(e) => setScannerBoxValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (
                        (e.key === 'Enter' || e.code === 'NumpadEnter' || e.keyCode === 13) &&
                        scannerBoxValue.trim()
                      ) {
                        e.preventDefault();
                        e.stopPropagation();
                        handleBarcodeFound(scannerBoxValue.trim());
                      }
                    }}
                    className="barcode-input-field w-full px-4 py-2.5 text-center font-mono font-bold text-sm bg-white dark:bg-slate-950 border-2 border-emerald-500 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500/40 text-slate-900 dark:text-white"
                  />

                  <div className="mt-2 flex items-center justify-center gap-2 text-[11px] font-bold">
                    {isScannerBoxFocused && isWindowFocused ? (
                      <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span>Fokus Terkunci — Siap Menerima Sinyal Kabel USB</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={focusHardwareBox}
                        className="text-amber-500 underline cursor-pointer"
                      >
                        Klik kotak ini untuk mengembalikan fokus scanner kabel
                      </button>
                    )}
                  </div>

                  {liveSignal && (
                    <div className="mt-2 px-3 py-1 rounded-lg bg-emerald-500/15 text-emerald-500 font-mono text-xs font-bold">
                      Sinyal masuk: {liveSignal}
                    </div>
                  )}
                </div>
              </div>

              {/* Continuous Scan Feedback Banner */}
              {lastScanned && continuousMode && (
                <div className="p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                    <div className="truncate">
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        Scan #{scanCount}: {lastScanned}
                      </span>
                      <span className="text-slate-500 dark:text-slate-300 ml-1.5">
                        ({lastScannedName})
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] shrink-0 cursor-pointer"
                  >
                    Selesai ({scanCount})
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: UPLOAD IMAGE */}
          {activeMode === 'upload' && (
            <div className="space-y-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files?.[0];
                  if (file) handleFileUpload(file);
                }}
                className="relative p-6 rounded-2xl bg-slate-50 dark:bg-slate-850 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-400 text-center cursor-pointer transition-colors"
              >
                {uploadedImagePreview ? (
                  <div className="relative inline-block max-h-48 rounded-xl overflow-hidden shadow-md">
                    <img
                      src={uploadedImagePreview}
                      alt="Pratinjau Barcode"
                      className="max-h-48 object-contain rounded-xl mx-auto"
                    />
                    {isProcessingImage && (
                      <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white text-xs font-bold gap-2">
                        <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" />
                        <span>Menganalisis garis barcode...</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                      <Upload className="w-7 h-7" />
                    </div>
                    <h4 className="font-bold text-slate-800 dark:text-white text-sm">
                      Pilih atau Seret Foto Gambar Barcode
                    </h4>
                    <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                      Ambil foto kemasan dari galeri HP, unduhan gambar barcode, atau tangkapan layar.
                    </p>
                    <span className="inline-block mt-3 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors">
                      Pilih dari Galeri / Berkas
                    </span>
                  </>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file);
                  }}
                  className="hidden"
                />
              </div>

              {uploadError && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-500 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span className="flex-1">{uploadError}</span>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="underline font-bold text-xs cursor-pointer"
                  >
                    Coba Gambar Lain
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CAMERA STREAM */}
          {activeMode === 'camera' && (
            <div className="space-y-3">
              <div className="relative bg-black rounded-2xl aspect-video flex items-center justify-center overflow-hidden">
                {cameraActive ? (
                  <>
                    <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                      <div className="relative w-64 h-36 border-2 border-emerald-400/90 rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]">
                        <div className="absolute left-0 right-0 h-0.5 bg-red-500 shadow-[0_0_10px_#ef4444] animate-laser top-1/2 -translate-y-1/2" />
                        <div className="absolute top-2 left-2 text-[10px] bg-black/75 text-emerald-300 font-mono px-2 py-0.5 rounded-lg">
                          Arahkan Garis Barcode ke Sini
                        </div>
                      </div>
                    </div>
                    {availableDevices.length > 1 && (
                      <button
                        type="button"
                        onClick={handleSwitchDevice}
                        className="absolute bottom-3 right-3 p-2 bg-black/60 text-white rounded-xl hover:bg-black/80 transition-colors cursor-pointer"
                        title="Ganti Kamera (Depan / Belakang)"
                      >
                        <SwitchCamera className="w-4 h-4" />
                      </button>
                    )}
                  </>
                ) : (
                  <div className="p-6 text-center text-slate-400 max-w-xs">
                    {cameraError ? (
                      <>
                        <AlertCircle className="w-10 h-10 mx-auto text-amber-400 mb-2" />
                        <p className="text-xs text-amber-200 leading-relaxed mb-3">{cameraError}</p>
                        <button
                          type="button"
                          onClick={() => setActiveMode('hardware')}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                        >
                          <Cable className="w-3.5 h-3.5" />
                          <span>Gunakan Scanner Kabel USB</span>
                        </button>
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-8 h-8 mx-auto animate-spin mb-2 text-emerald-400" />
                        <p className="text-xs">Menghubungkan ke pemindai kamera...</p>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Success Flash Feedback (Full Overlay only in single-scan mode) */}
          {scanSuccessAnim && !continuousMode && (
            <div className="absolute inset-0 bg-emerald-600/95 flex items-center justify-center text-white font-bold text-base flex-col gap-1 backdrop-blur-xs animate-in fade-in z-20">
              <Check className="w-12 h-12 animate-bounce" />
              <span>Barcode Berhasil Terdeteksi!</span>
              <span className="text-sm font-mono bg-black/40 px-3 py-1 rounded-xl mt-1 tracking-wider">
                {lastScanned}
              </span>
            </div>
          )}

          {/* Manual Barcode Input Fallback */}
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              <Keyboard className="w-3.5 h-3.5 text-slate-400" />
              <span>Ketik Manual Kode Barcode / SKU:</span>
            </div>
            <form onSubmit={handleManualSubmit} className="flex gap-2">
              <input
                type="text"
                placeholder="Contoh: 8999999195041 lalu tekan Gunakan..."
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                className="flex-1 px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-mono bg-white dark:bg-slate-850 text-slate-900 dark:text-white"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-colors whitespace-nowrap cursor-pointer shadow-xs"
              >
                Gunakan
              </button>
            </form>
          </div>

          {/* Quick Demo Barcodes from Store Catalog */}
          {products.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800">
              <div className="text-[11px] text-slate-500 font-bold mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Zap className="w-3 h-3 text-amber-500" />
                  <span>Pilih cepat dari katalog:</span>
                </span>
                <span className="text-[10px] text-slate-400 font-normal">Klik untuk pilih</span>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                {products.slice(0, 8).map((prod) => (
                  <button
                    key={prod.id}
                    type="button"
                    onClick={() => handleBarcodeFound(prod.barcode)}
                    className="px-2.5 py-1 bg-white dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-slate-700 hover:border-emerald-400 border border-slate-200 dark:border-slate-700 rounded-lg text-[10px] text-slate-700 dark:text-slate-300 text-left transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                  >
                    <span className="font-mono font-bold text-emerald-500">{prod.barcode}</span>
                    <span className="text-slate-400 truncate max-w-[120px]">({prod.name})</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
