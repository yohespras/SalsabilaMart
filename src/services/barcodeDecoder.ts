import { BrowserMultiFormatReader } from '@zxing/library';

/**
 * Robust Barcode Decoder from Image File / Blob
 * Combines Native Web BarcodeDetector API (fastest, high tolerance for phone photos)
 * with ZXing BrowserMultiFormatReader fallback and Canvas pre-processing.
 */
export async function decodeBarcodeFromImageFile(file: Blob | File): Promise<string> {
  // 1. Try Native BarcodeDetector API (Chrome, Edge, Android Chrome, Safari 17+)
  if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
    try {
      const formats = [
        'ean_13',
        'ean_8',
        'code_128',
        'code_39',
        'code_93',
        'upc_a',
        'upc_e',
        'itf',
        'qr_code',
        'data_matrix',
      ];
      const detector = new (window as any).BarcodeDetector({ formats });
      const imageBitmap = await createImageBitmap(file);
      const barcodes = await detector.detect(imageBitmap);
      if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
        return barcodes[0].rawValue.trim();
      }
    } catch {
      // Fall through to ZXing
    }
  }

  // 2. Try ZXing BrowserMultiFormatReader
  const codeReader = new BrowserMultiFormatReader();
  const imageUrl = URL.createObjectURL(file);

  try {
    const img = await loadImage(imageUrl);

    // First attempt: direct image element decode
    try {
      const result = await codeReader.decodeFromImageElement(img);
      if (result && result.getText()) {
        return result.getText().trim();
      }
    } catch {
      // Continue to canvas scaling
    }

    // Second attempt: Pre-process on Canvas (scale down ultra-high-res images, normalize contrast)
    try {
      const processedCanvas = preprocessImageToCanvas(img);
      const processedDataUrl = processedCanvas.toDataURL('image/jpeg', 0.92);
      const processedImg = await loadImage(processedDataUrl);
      const result = await codeReader.decodeFromImageElement(processedImg);
      if (result && result.getText()) {
        return result.getText().trim();
      }
    } catch {
      // Canvas attempt failed
    }

    throw new Error('Barcode tidak dapat terbaca pada gambar. Pastikan gambar jelas, tidak buram, dan garis barcode terlihat utuh.');
  } finally {
    URL.revokeObjectURL(imageUrl);
    codeReader.reset();
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Gagal memuat berkas gambar'));
    img.src = src;
  });
}

function preprocessImageToCanvas(img: HTMLImageElement): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const maxDimension = 1200;
  let width = img.naturalWidth || img.width;
  let height = img.naturalHeight || img.height;

  if (width > maxDimension || height > maxDimension) {
    if (width > height) {
      height = Math.round((height * maxDimension) / width);
      width = maxDimension;
    } else {
      width = Math.round((width * maxDimension) / height);
      height = maxDimension;
    }
  }

  canvas.width = Math.max(width, 300);
  canvas.height = Math.max(height, 300);

  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  }

  return canvas;
}
