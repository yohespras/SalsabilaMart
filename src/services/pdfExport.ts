import { jsPDF } from 'jspdf';
import { StoreProfile, Transaction } from '../types';
import { formatRupiah } from './storage';

export function exportDailyReportPDF(
  dateStr: string,
  transactions: Transaction[],
  storeProfile: StoreProfile
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 16;

  // Header Toko
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(30, 41, 59);
  doc.text(storeProfile.name.toUpperCase(), pageWidth / 2, y, { align: 'center' });
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(storeProfile.address, pageWidth / 2, y, { align: 'center' });
  y += 4;
  doc.text(
    `Telp: ${storeProfile.phone} | Jam Ops: ${storeProfile.operatingHours} | Email: ${storeProfile.email}`,
    pageWidth / 2,
    y,
    { align: 'center' }
  );
  y += 6;

  // Garis Pemisah
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.5);
  doc.line(14, y, pageWidth - 14, y);
  y += 8;

  // Judul Laporan
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text('LAPORAN PENJUALAN & KEUANGAN HARIAN', 14, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  const formattedDate = new Date(dateStr).toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  doc.text(
    `Periode Tanggal: ${formattedDate} | Waktu Cetak: ${new Date().toLocaleTimeString('id-ID')}`,
    14,
    y
  );
  y += 8;

  // Perhitungan Keuangan
  const totalOmset = transactions.reduce((acc, t) => acc + t.total, 0);
  const totalHPP = transactions.reduce((acc, t) => {
    return acc + t.items.reduce((sum, item) => sum + (item.costPrice || 0) * item.quantity, 0);
  }, 0);
  const labaKotor = totalOmset - totalHPP;
  const countTunai = transactions.filter((t) => t.paymentMethod === 'TUNAI');
  const countQRIS = transactions.filter((t) => t.paymentMethod === 'QRIS');
  const totalTunai = countTunai.reduce((acc, t) => acc + t.total, 0);
  const totalQRIS = countQRIS.reduce((acc, t) => acc + t.total, 0);

  // Kotak Ringkasan KPI Keuangan
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, y, pageWidth - 28, 30, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, y, pageWidth - 28, 30, 2, 2, 'D');

  const colW = (pageWidth - 28) / 4;

  // Col 1: Total Omset
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('TOTAL OMSET PENDAPATAN', 14 + 4, y + 8);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(16, 185, 129); // emerald
  doc.text(formatRupiah(totalOmset), 14 + 4, y + 16);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`${transactions.length} Transaksi`, 14 + 4, y + 23);

  // Col 2: Total Modal (HPP)
  doc.setFontSize(8);
  doc.text('TOTAL MODAL (HPP)', 14 + colW + 4, y + 8);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text(formatRupiah(totalHPP), 14 + colW + 4, y + 16);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('Biaya Pokok Barang', 14 + colW + 4, y + 23);

  // Col 3: Estimasi Laba Kotor
  doc.setFontSize(8);
  doc.text('ESTIMASI LABA KOTOR', 14 + colW * 2 + 4, y + 8);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(37, 99, 235); // blue
  doc.text(formatRupiah(labaKotor), 14 + colW * 2 + 4, y + 16);
  const marginPct = totalOmset > 0 ? Math.round((labaKotor / totalOmset) * 100) : 0;
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Margin: ${marginPct}%`, 14 + colW * 2 + 4, y + 23);

  // Col 4: Pembagian Metode
  doc.setFontSize(8);
  doc.text('PEMBAGIAN METODE', 14 + colW * 3 + 4, y + 8);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(51, 65, 85);
  doc.text(`Tunai: ${formatRupiah(totalTunai)} (${countTunai.length})`, 14 + colW * 3 + 4, y + 15);
  doc.text(`QRIS:  ${formatRupiah(totalQRIS)} (${countQRIS.length})`, 14 + colW * 3 + 4, y + 21);

  y += 38;

  // Header Tabel Transaksi
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text('RINCIAN STRUK TRANSAKSI', 14, y);
  y += 5;

  // Table Columns Header
  doc.setFillColor(241, 245, 249);
  doc.rect(14, y, pageWidth - 28, 7, 'F');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text('WAKTU', 16, y + 5);
  doc.text('ID TRANSAKSI', 38, y + 5);
  doc.text('KASIR', 75, y + 5);
  doc.text('ITEM BELANJA', 105, y + 5);
  doc.text('METODE', 148, y + 5);
  doc.text('TOTAL', pageWidth - 16, y + 5, { align: 'right' });

  y += 9;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);

  if (transactions.length === 0) {
    doc.setTextColor(148, 163, 184);
    doc.text('Tidak ada transaksi tercatat pada tanggal ini.', pageWidth / 2, y + 6, {
      align: 'center',
    });
    y += 14;
  } else {
    for (let i = 0; i < transactions.length; i++) {
      const t = transactions[i];

      // Page break check
      if (y > 270) {
        doc.addPage();
        y = 16;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setFillColor(241, 245, 249);
        doc.rect(14, y, pageWidth - 28, 7, 'F');
        doc.text('WAKTU', 16, y + 5);
        doc.text('ID TRANSAKSI', 38, y + 5);
        doc.text('KASIR', 75, y + 5);
        doc.text('ITEM BELANJA', 105, y + 5);
        doc.text('METODE', 148, y + 5);
        doc.text('TOTAL', pageWidth - 16, y + 5, { align: 'right' });
        y += 9;
        doc.setFont('helvetica', 'normal');
      }

      const timeStr = new Date(t.date).toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
      });
      const itemsSummary = t.items.map((it) => `${it.name} (${it.quantity})`).join(', ');
      const truncatedItems =
        itemsSummary.length > 28 ? itemsSummary.substring(0, 26) + '...' : itemsSummary;

      // Zebra striping
      if (i % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(14, y - 3.5, pageWidth - 28, 7, 'F');
      }

      doc.setTextColor(71, 85, 105);
      doc.text(timeStr, 16, y);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text(t.id, 38, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text(t.cashierName.split(' ')[0], 75, y);
      doc.text(truncatedItems, 105, y);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(
        t.paymentMethod === 'QRIS' ? 37 : 16,
        t.paymentMethod === 'QRIS' ? 99 : 185,
        t.paymentMethod === 'QRIS' ? 235 : 129
      );
      doc.text(t.paymentMethod, 148, y);
      doc.setTextColor(15, 23, 42);
      doc.text(formatRupiah(t.total), pageWidth - 16, y, { align: 'right' });

      y += 7;
    }
  }

  // Footer & Tanda Tangan
  y = Math.min(y + 12, 260);
  if (y > 250) {
    doc.addPage();
    y = 20;
  }

  doc.setDrawColor(226, 232, 240);
  doc.line(14, y, pageWidth - 14, y);
  y += 8;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Mengetahui / Pemilik Toko,', 20, y);
  doc.text('Petugas Kasir / Pelapor,', pageWidth - 70, y);
  y += 20;

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('( .......................................... )', 20, y);
  doc.text('( .......................................... )', pageWidth - 70, y);
  y += 4;
  doc.setFont('helvetica', 'normal');
  doc.text(storeProfile.name, 20, y);
  doc.text('Kasir Bertugas', pageWidth - 70, y);

  // Save PDF
  const safeFilename = `Laporan_${storeProfile.name.replace(/[^a-zA-Z0-9]/g, '_')}_${dateStr}.pdf`;
  doc.save(safeFilename);
}
