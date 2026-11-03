import JsBarcode from 'jsbarcode';
import { Product } from '../types';
import { formatRupiah } from './storage';

/**
 * Web Audio Retail Beep Feedback on Scan
 */
export const playBarcodeBeep = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const audioCtx = new AudioContextClass();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1850, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.12);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.12);
  } catch {
    // Ignore audio autoplay restrictions if user has not interacted
  }
};

/**
 * Menghasilkan Data URL gambar Barcode murni (PNG)
 */
export const generateBarcodeDataUrl = (
  barcode: string,
  options?: {
    width?: number;
    height?: number;
    displayValue?: boolean;
    fontSize?: number;
    background?: string;
    lineColor?: string;
  }
): string => {
  const canvas = document.createElement('canvas');
  try {
    JsBarcode(canvas, barcode.trim() || '000000', {
      format: 'CODE128',
      width: options?.width ?? 2.2,
      height: options?.height ?? 85,
      displayValue: options?.displayValue ?? true,
      font: 'monospace',
      fontSize: options?.fontSize ?? 16,
      textMargin: 6,
      background: options?.background ?? '#ffffff',
      lineColor: options?.lineColor ?? '#000000',
      margin: 12,
    });
    return canvas.toDataURL('image/png');
  } catch (err) {
    console.warn('JsBarcode render error, fallback to generic barcode:', err);
    // Fallback if specific chars fail in CODE128
    try {
      const sanitized = barcode.replace(/[^a-zA-Z0-9]/g, '') || '000000';
      JsBarcode(canvas, sanitized, {
        format: 'CODE128',
        width: 2,
        height: 80,
        displayValue: true,
        font: 'monospace',
        fontSize: 14,
        background: '#ffffff',
        lineColor: '#000000',
        margin: 10,
      });
      return canvas.toDataURL('image/png');
    } catch {
      return '';
    }
  }
};

/**
 * Menghasilkan Data URL Label Stiker Lengkap (Toko, Nama Barang, Harga Rupiah, Barcode)
 */
export const generateBarcodeStickerDataUrl = (
  product: Product,
  storeName: string = 'Salsabila Mart'
): string => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const width = 440;
  const height = 260;
  canvas.width = width;
  canvas.height = height;

  // Background Putih Bersih
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // Border Garis Putus-putus Stiker
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 2;
  ctx.strokeRect(6, 6, width - 12, height - 12);

  // 1. Nama Toko (Header)
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(storeName.toUpperCase(), width / 2, 28);

  // Garis Pemisah Tipis
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(20, 36);
  ctx.lineTo(width - 20, 36);
  ctx.stroke();

  // 2. Nama Barang
  ctx.fillStyle = '#1e293b';
  ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  let displayName = product.name;
  if (displayName.length > 28) {
    displayName = displayName.substring(0, 26) + '...';
  }
  ctx.fillText(displayName, width / 2, 60);

  // 3. Render Barcode Image ke tengah
  const barcodeCanvas = document.createElement('canvas');
  try {
    JsBarcode(barcodeCanvas, product.barcode || '000000', {
      format: 'CODE128',
      width: 2.1,
      height: 70,
      displayValue: true,
      font: 'monospace',
      fontSize: 14,
      textMargin: 4,
      background: '#ffffff',
      margin: 4,
    });
    ctx.drawImage(barcodeCanvas, (width - barcodeCanvas.width) / 2, 75);
  } catch (err) {
    console.warn('Failed rendering barcode inside sticker:', err);
  }

  // 4. Harga Jual (Paling Menonjol)
  ctx.fillStyle = '#047857'; // Emerald / Hijau Retail
  ctx.font = '900 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(formatRupiah(product.price), width / 2, 215);

  // Keterangan Satuan & Kategori
  ctx.fillStyle = '#64748b';
  ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(`Kategori: ${product.category} | Satuan: ${product.unit}`, width / 2, 238);

  return canvas.toDataURL('image/png');
};

/**
 * Download file gambar barcode ke perangkat komputer / HP
 */
export const downloadBarcodeImageFile = (
  product: Product,
  mode: 'pure_barcode' | 'sticker' = 'pure_barcode',
  storeName: string = 'Salsabila Mart'
) => {
  const dataUrl =
    mode === 'pure_barcode'
      ? generateBarcodeDataUrl(product.barcode)
      : generateBarcodeStickerDataUrl(product, storeName);

  if (!dataUrl) {
    alert('Gagal menghasilkan gambar barcode.');
    return;
  }

  const cleanName = product.name.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20);
  const fileName =
    mode === 'pure_barcode'
      ? `BARCODE_${product.barcode}_${cleanName}.png`
      : `LABEL_${product.barcode}_${cleanName}.png`;

  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Download batch / massal beberapa barcode produk
 */
export const downloadMultipleBarcodeImages = async (
  products: Product[],
  mode: 'pure_barcode' | 'sticker' = 'pure_barcode',
  storeName: string = 'Salsabila Mart'
) => {
  for (let i = 0; i < products.length; i++) {
    const prod = products[i];
    downloadBarcodeImageFile(prod, mode, storeName);
    // Beri jeda 300ms agar browser tidak memblokir multiple download otomatis
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
};

/**
 * Membuka jendela cetak / print label stiker barcode (thermal atau A4 kertas stiker)
 */
export const printBarcodeStickers = (
  products: Product[],
  storeName: string = 'Salsabila Mart'
) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Jendela pop-up cetak terblokir oleh browser. Izinkan pop-up untuk mencetak barcode.');
    return;
  }

  const labelImagesHtml = products
    .map((prod) => {
      const stickerUrl = generateBarcodeStickerDataUrl(prod, storeName);
      return `
        <div class="label-item">
          <img src="${stickerUrl}" alt="${prod.barcode}" />
        </div>
      `;
    })
    .join('');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Cetak Label Barcode - ${storeName}</title>
        <style>
          @page {
            size: auto;
            margin: 8mm;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            margin: 0;
            padding: 10px;
            background: #f8fafc;
          }
          .no-print {
            background: #ffffff;
            padding: 12px 16px;
            margin-bottom: 20px;
            border-radius: 12px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            display: flex;
            align-items: center;
            justify-content: space-between;
          }
          .btn-print {
            background: #059669;
            color: #ffffff;
            border: none;
            padding: 8px 16px;
            font-size: 13px;
            font-weight: bold;
            border-radius: 8px;
            cursor: pointer;
          }
          .grid-container {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
            gap: 12px;
          }
          .label-item {
            background: #ffffff;
            border: 1px dashed #cbd5e1;
            padding: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            page-break-inside: avoid;
          }
          .label-item img {
            max-width: 100%;
            height: auto;
            display: block;
          }
          @media print {
            .no-print {
              display: none !important;
            }
            body {
              background: #ffffff;
              padding: 0;
            }
            .grid-container {
              display: flex;
              flex-wrap: wrap;
              gap: 8px;
            }
            .label-item {
              border: 1px dashed #e2e8f0;
              width: 48%;
              box-sizing: border-box;
            }
          }
        </style>
      </head>
      <body>
        <div class="no-print">
          <div>
            <strong>Label Barcode ${storeName}</strong>
            <span style="color: #64748b; font-size: 12px; margin-left: 8px;">Total: ${products.length} label barang</span>
          </div>
          <button class="btn-print" onclick="window.print()">🖨️ Cetak / Print Label</button>
        </div>
        <div class="grid-container">
          ${labelImagesHtml}
        </div>
        <script>
          // Auto trigger print setelah gambar termuat
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 500);
          };
        </script>
      </body>
    </html>
  `);

  printWindow.document.close();
};
