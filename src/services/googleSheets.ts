import { PaymentMethod, Product, StoreProfile, Transaction, TransactionItem, UserRole } from '../types';
import { clearCachedAccessToken, ensureAccessToken } from './auth';
import { getLocalDateString } from './storage';

export interface SheetSyncResult {
  success: boolean;
  message: string;
  spreadsheetId?: string;
  spreadsheetUrl?: string;
}

export interface PullSheetStateResult {
  success: boolean;
  message: string;
  products: Product[] | null;
  transactions: Transaction[] | null;
}

// Google Apps Script (Code.gs) template for user reference & standalone deployment
export const APPS_SCRIPT_CODE = `/**
 * =========================================================================
 * KASIRPINTAR POS - GOOGLE APPS SCRIPT DATABASE & WEBHOOK (Code.gs v2.0)
 * =========================================================================
 * Mendukung Sinkronisasi 2 Arah Penuh: Dashboard, Transaksi (termasuk Reset 0),
 * Detail_Transaksi, dan Inventaris Produk secara Real-Time.
 */

function doGet(e) {
  var action = e && e.parameter ? e.parameter.action : "";
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  if (action === "getProducts") {
    return jsonResponse({ success: true, data: readProductsFromSheet(ss) });
  }

  if (action === "getTransactions") {
    return jsonResponse({ success: true, data: readTransactionsFromSheet(ss) });
  }

  if (action === "getAll") {
    var products = readProductsFromSheet(ss);
    var transactions = readTransactionsFromSheet(ss);
    return jsonResponse({
      success: true,
      products: products,
      transactions: transactions,
      totalTransactions: transactions.length
    });
  }

  if (action === "getSummary") {
    var trxSheet = ss.getSheetByName("Transaksi");
    var totalTrx = trxSheet ? Math.max(0, trxSheet.getLastRow() - 1) : 0;
    return jsonResponse({ success: true, totalTransactions: totalTrx });
  }

  return HtmlService.createHtmlOutput(
    '<!DOCTYPE html><html><head><title>KasirPintar Backend</title><meta charset="utf-8"></head>' +
    '<body style="font-family:sans-serif;padding:24px;background:#f8fafc;color:#1e293b;">' +
    '<h2>📊 KasirPintar - Google Sheets REST API & Webhook v2.0</h2>' +
    '<p>Status: <strong>Aktif & Terhubung 2 Arah (Dashboard + Transaksi + Produk)</strong></p>' +
    '<p>Spreadsheet: ' + ss.getName() + '</p>' +
    '</body></html>'
  ).setTitle("KasirPintar POS Server");
}

function doPost(e) {
  try {
    var rawData = e.postData ? e.postData.contents : "";
    var body = JSON.parse(rawData);
    var action = body.action;
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    if (action === "ping") {
      getOrCreateSheet(ss, "Dashboard", ["Metrik Dashboard", "Nilai", "Keterangan"]);
      return jsonResponse({ success: true, message: "Koneksi Webhook Google Sheets aktif!" });
    }

    if (action === "recordTransaction") {
      var trx = body.transaction;
      var trxSheet = getOrCreateSheet(ss, "Transaksi", getTrxHeaders());
      var detailSheet = getOrCreateSheet(ss, "Detail_Transaksi", getDetailHeaders());

      // Cegah duplikasi ID Transaksi
      var existingIds = getExistingTrxIds(trxSheet);
      if (!existingIds[String(trx.id)]) {
        trxSheet.appendRow([
          trx.id, trx.date, trx.cashierName, trx.cashierRole, trx.paymentMethod,
          trx.subtotal, trx.discount, trx.total, trx.amountPaid, trx.change, trx.qrisRef || ""
        ]);

        var prodSheet = ss.getSheetByName("Produk");
        var prodData = prodSheet ? prodSheet.getDataRange().getValues() : [];

        for (var j = 0; j < (trx.items || []).length; j++) {
          var itm = trx.items[j];
          detailSheet.appendRow([
            trx.id, itm.barcode, itm.name, itm.quantity, itm.price, itm.subtotal
          ]);
          if (prodSheet) {
            for (var r = 1; r < prodData.length; r++) {
              if (String(prodData[r][0]) === String(itm.productId) || String(prodData[r][1]) === String(itm.barcode)) {
                var currStock = Number(prodData[r][6]) || 0;
                var newStock = Math.max(0, currStock - itm.quantity);
                prodSheet.getRange(r + 1, 7).setValue(newStock);
                prodSheet.getRange(r + 1, 10).setValue(new Date().toISOString());
                break;
              }
            }
          }
        }
      }

      updateDashboardSheet(ss, body.storeName || ss.getName());
      return jsonResponse({ success: true, message: "Transaksi berhasil dicatat & Dashboard diperbarui" });
    }

    if (action === "batchRecordTransactions") {
      var trxs = body.transactions || [];
      var trxSheet = getOrCreateSheet(ss, "Transaksi", getTrxHeaders());
      var detailSheet = getOrCreateSheet(ss, "Detail_Transaksi", getDetailHeaders());
      var existingMap = getExistingTrxIds(trxSheet);

      for (var t = 0; t < trxs.length; t++) {
        var tx = trxs[t];
        if (existingMap[String(tx.id)]) continue;
        trxSheet.appendRow([
          tx.id, tx.date, tx.cashierName, tx.cashierRole, tx.paymentMethod,
          tx.subtotal, tx.discount, tx.total, tx.amountPaid, tx.change, tx.qrisRef || ""
        ]);
        for (var k = 0; k < (tx.items || []).length; k++) {
          var item = tx.items[k];
          detailSheet.appendRow([
            tx.id, item.barcode, item.name, item.quantity, item.price, item.subtotal
          ]);
        }
      }

      if (body.products && Array.isArray(body.products)) {
        overwriteProductsSheet(ss, body.products);
      }

      updateDashboardSheet(ss, body.storeName || ss.getName());
      return jsonResponse({ success: true, count: trxs.length, message: "Sinkronisasi batch berhasil" });
    }

    if (action === "syncFullState") {
      var allTrxs = body.transactions || [];
      var trxSh = getOrCreateSheet(ss, "Transaksi", getTrxHeaders());
      var detSh = getOrCreateSheet(ss, "Detail_Transaksi", getDetailHeaders());

      // Bersihkan seluruh baris transaksi lama di bawah header (termasuk saat di-0-kan)
      if (trxSh.getLastRow() > 1) {
        trxSh.getRange(2, 1, trxSh.getLastRow() - 1, 11).clearContent();
      }
      if (detSh.getLastRow() > 1) {
        detSh.getRange(2, 1, detSh.getLastRow() - 1, 6).clearContent();
      }

      if (allTrxs.length > 0) {
        var trxRows = [];
        var detRows = [];
        for (var idx = 0; idx < allTrxs.length; idx++) {
          var rowTx = allTrxs[idx];
          trxRows.push([
            rowTx.id, rowTx.date, rowTx.cashierName, rowTx.cashierRole, rowTx.paymentMethod,
            rowTx.subtotal, rowTx.discount, rowTx.total, rowTx.amountPaid, rowTx.change, rowTx.qrisRef || ""
          ]);
          var items = rowTx.items || [];
          for (var m = 0; m < items.length; m++) {
            var di = items[m];
            detRows.push([rowTx.id, di.barcode, di.name, di.quantity, di.price, di.subtotal]);
          }
        }
        trxSh.getRange(2, 1, trxRows.length, 11).setValues(trxRows);
        if (detRows.length > 0) {
          detSh.getRange(2, 1, detRows.length, 6).setValues(detRows);
        }
      }

      if (body.products && Array.isArray(body.products)) {
        overwriteProductsSheet(ss, body.products);
      }

      updateDashboardSheet(ss, body.storeName || ss.getName());
      return jsonResponse({
        success: true,
        count: allTrxs.length,
        message: "Sinkronisasi penuh berhasil (" + allTrxs.length + " transaksi)"
      });
    }

    return jsonResponse({ error: "Action tidak dikenali" });
  } catch (err) {
    return jsonResponse({ error: err.toString() });
  }
}

function getTrxHeaders() {
  return [
    "ID Transaksi", "Waktu Transaksi", "Nama Kasir", "Peran Kasir", "Metode Pembayaran",
    "Subtotal (Rp)", "Diskon (Rp)", "Total Belanja (Rp)", "Uang Diterima (Rp)",
    "Kembalian (Rp)", "Ref / Catatan QRIS"
  ];
}

function getDetailHeaders() {
  return ["ID Transaksi", "Barcode", "Nama Barang", "Jumlah (Qty)", "Harga Satuan (Rp)", "Subtotal (Rp)"];
}

function getProductHeaders() {
  return [
    "ID Produk", "Barcode / SKU", "Nama Produk", "Kategori", "Harga Jual (Rp)",
    "Harga Modal / HPP (Rp)", "Sisa Stok", "Batas Minimum Stok", "Satuan", "Terakhir Diperbarui"
  ];
}

function getExistingTrxIds(trxSheet) {
  var map = {};
  var lastRow = trxSheet.getLastRow();
  if (lastRow <= 1) return map;
  var ids = trxSheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (ids[i][0]) map[String(ids[i][0])] = true;
  }
  return map;
}

function overwriteProductsSheet(ss, products) {
  var prodSheet = getOrCreateSheet(ss, "Produk", getProductHeaders());
  if (prodSheet.getLastRow() > 1) {
    prodSheet.getRange(2, 1, prodSheet.getLastRow() - 1, 10).clearContent();
  }
  if (products.length > 0) {
    var rows = [];
    for (var i = 0; i < products.length; i++) {
      var p = products[i];
      rows.push([
        p.id, p.barcode, p.name, p.category, p.price, p.costPrice,
        p.stock, p.minStock, p.unit, p.updatedAt || new Date().toISOString()
      ]);
    }
    prodSheet.getRange(2, 1, rows.length, 10).setValues(rows);
  }
}

function readProductsFromSheet(ss) {
  var sheet = ss.getSheetByName("Produk");
  if (!sheet || sheet.getLastRow() <= 1) return [];
  var data = sheet.getDataRange().getValues();
  var products = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (!row[0] && !row[2]) continue;
    products.push({
      id: String(row[0] || ("p-" + i)),
      barcode: String(row[1] || ""),
      name: String(row[2] || ""),
      category: String(row[3] || "Umum"),
      price: Number(row[4]) || 0,
      costPrice: Number(row[5]) || 0,
      stock: Number(row[6]) || 0,
      minStock: Number(row[7]) || 5,
      unit: String(row[8] || "pcs"),
      updatedAt: row[9] ? String(row[9]) : new Date().toISOString()
    });
  }
  return products;
}

function readTransactionsFromSheet(ss) {
  var trxSheet = ss.getSheetByName("Transaksi");
  if (!trxSheet || trxSheet.getLastRow() <= 1) return [];
  var trxData = trxSheet.getDataRange().getValues();

  var detSheet = ss.getSheetByName("Detail_Transaksi");
  var detData = (detSheet && detSheet.getLastRow() > 1) ? detSheet.getDataRange().getValues() : [];
  var prodList = readProductsFromSheet(ss);
  var prodByBarcode = {};
  for (var p = 0; p < prodList.length; p++) {
    prodByBarcode[String(prodList[p].barcode)] = prodList[p];
  }

  var itemsByTrx = {};
  for (var d = 1; d < detData.length; d++) {
    var dRow = detData[d];
    var trxId = String(dRow[0] || "");
    if (!trxId) continue;
    if (!itemsByTrx[trxId]) itemsByTrx[trxId] = [];
    var bc = String(dRow[1] || "");
    var matchedProd = prodByBarcode[bc];
    itemsByTrx[trxId].push({
      productId: matchedProd ? matchedProd.id : ("item-" + d),
      barcode: bc,
      name: String(dRow[2] || "Item"),
      quantity: Number(dRow[3]) || 1,
      price: Number(dRow[4]) || 0,
      costPrice: matchedProd ? (Number(matchedProd.costPrice) || 0) : 0,
      subtotal: Number(dRow[5]) || 0
    });
  }

  var result = [];
  for (var i = 1; i < trxData.length; i++) {
    var r = trxData[i];
    var id = String(r[0] || "");
    if (!id || id.indexOf("TEST-") === 0) continue;
    result.push({
      id: id,
      date: r[1] ? String(r[1]) : new Date().toISOString(),
      cashierName: String(r[2] || "Kasir"),
      cashierRole: String(r[3] || "kasir") === "admin" ? "admin" : "kasir",
      paymentMethod: String(r[4] || "TUNAI") === "QRIS" ? "QRIS" : "TUNAI",
      subtotal: Number(r[5]) || 0,
      discount: Number(r[6]) || 0,
      total: Number(r[7]) || 0,
      amountPaid: Number(r[8]) || 0,
      change: Number(r[9]) || 0,
      qrisRef: r[10] ? String(r[10]) : "",
      items: itemsByTrx[id] || [],
      syncedToSheet: true
    });
  }
  return result;
}

function updateDashboardSheet(ss, storeName) {
  var dash = getOrCreateSheet(ss, "Dashboard", ["Metrik Dashboard", "Nilai", "Keterangan"]);
  var trxs = readTransactionsFromSheet(ss);
  var prods = readProductsFromSheet(ss);

  var now = new Date();
  var tz = ss.getSpreadsheetTimeZone() || "Asia/Jakarta";
  var todayStr = Utilities.formatDate(now, tz, "yyyy-MM-dd");

  var todayCount = 0;
  var todayOmset = 0;
  var todayTunai = 0;
  var todayQris = 0;
  var allOmset = 0;

  for (var i = 0; i < trxs.length; i++) {
    var t = trxs[i];
    allOmset += Number(t.total) || 0;
    if (String(t.date).indexOf(todayStr) === 0) {
      todayCount++;
      todayOmset += Number(t.total) || 0;
      if (t.paymentMethod === "QRIS") todayQris += Number(t.total) || 0;
      else todayTunai += Number(t.total) || 0;
    }
  }

  var lowStock = 0;
  for (var j = 0; j < prods.length; j++) {
    if (Number(prods[j].stock) <= Number(prods[j].minStock)) lowStock++;
  }

  if (dash.getLastRow() > 1) {
    dash.getRange(2, 1, dash.getLastRow() - 1, 3).clearContent();
  }

  var summaryRows = [
    ["Nama Toko", storeName, "Identitas Toko"],
    ["Tanggal Hari Ini", todayStr, "Zona waktu: " + tz],
    ["Terakhir Disinkronkan", Utilities.formatDate(now, tz, "yyyy-MM-dd HH:mm:ss"), "Real-time Sync"],
    ["Omset Hari Ini (Rp)", todayOmset, todayCount + " transaksi hari ini"],
    ["Transaksi Hari Ini", todayCount, "Jumlah struk hari ini"],
    ["Tunai Hari Ini (Rp)", todayTunai, "Pembayaran Cash"],
    ["QRIS Hari Ini (Rp)", todayQris, "Pembayaran QRIS Digital"],
    ["Total Seluruh Transaksi", trxs.length, trxs.length === 0 ? "Data transaksi telah di-0-kan / kosong" : "Total riwayat di sheet Transaksi"],
    ["Total Seluruh Omset (Rp)", allOmset, "Akumulasi seluruh transaksi di sheet"],
    ["Total Jenis Produk", prods.length, "Jumlah SKU terdaftar"],
    ["Produk Stok Menipis", lowStock, "Stok <= batas minimum"]
  ];

  dash.getRange(2, 1, summaryRows.length, 3).setValues(summaryRows);
}

function getOrCreateSheet(ss, name, headers) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    if (headers && headers.length > 0) {
      sheet.appendRow(headers);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#e2e8f0");
    }
  }
  return sheet;
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
`;

const STANDARD_HEADERS = {
  Dashboard: [['Metrik Dashboard', 'Nilai', 'Keterangan']],
  Produk: [
    [
      'ID Produk',
      'Barcode / SKU',
      'Nama Produk',
      'Kategori',
      'Harga Jual (Rp)',
      'Harga Modal / HPP (Rp)',
      'Sisa Stok',
      'Batas Minimum Stok',
      'Satuan',
      'Terakhir Diperbarui',
    ],
  ],
  Transaksi: [
    [
      'ID Transaksi',
      'Waktu Transaksi',
      'Nama Kasir',
      'Peran Kasir',
      'Metode Pembayaran',
      'Subtotal (Rp)',
      'Diskon (Rp)',
      'Total Belanja (Rp)',
      'Uang Diterima (Rp)',
      'Kembalian (Rp)',
      'Ref / Catatan QRIS',
    ],
  ],
  Detail_Transaksi: [
    [
      'ID Transaksi',
      'Barcode',
      'Nama Barang',
      'Jumlah (Qty)',
      'Harga Satuan (Rp)',
      'Subtotal (Rp)',
    ],
  ],
  Pengaturan: [['Kunci Konfigurasi', 'Nilai']],
};

/**
 * Helper fetch dengan auto-refresh OAuth token jika 401 saat aksi interaktif
 */
async function sheetsFetchWithAuth(
  url: string,
  init: RequestInit,
  interactive = false
): Promise<Response> {
  let token = await ensureAccessToken(interactive);
  if (!token) {
    throw new Error('Sesi Google berakhir atau belum login. Klik tombol sinkronisasi untuk otorisasi ulang.');
  }

  let res = await fetch(url, {
    ...init,
    headers: {
      ...(init.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  });

  if (res.status === 401) {
    clearCachedAccessToken();
    if (interactive) {
      token = await ensureAccessToken(true);
      if (token) {
        res = await fetch(url, {
          ...init,
          headers: {
            ...(init.headers || {}),
            Authorization: `Bearer ${token}`,
          },
        });
      }
    }
  }

  return res;
}

/**
 * Memastikan tab Dashboard, Produk, Transaksi, Detail_Transaksi, dan Pengaturan tersedia di Spreadsheet
 * sesuai best practice Google Sheets API (cek metadata sebelum menulis ke range).
 */
export async function ensureSpreadsheetTabs(
  spreadsheetId: string,
  interactive = false
): Promise<boolean> {
  const metaRes = await sheetsFetchWithAuth(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`,
    { method: 'GET' },
    interactive
  );

  if (!metaRes.ok) {
    const errText = await metaRes.text();
    throw new Error(`Tidak dapat mengakses Spreadsheet (${metaRes.status}): ${errText}`);
  }

  const meta = await metaRes.json();
  const existingTitles = new Set<string>(
    (meta.sheets || []).map((s: any) => String(s?.properties?.title || ''))
  );

  const requiredTabs: Array<keyof typeof STANDARD_HEADERS> = [
    'Dashboard',
    'Produk',
    'Transaksi',
    'Detail_Transaksi',
    'Pengaturan',
  ];

  const missingTabs = requiredTabs.filter((t) => !existingTitles.has(t));

  if (missingTabs.length > 0) {
    const requests = missingTabs.map((title) => ({
      addSheet: {
        properties: {
          title,
          gridProperties: { frozenRowCount: 1 },
        },
      },
    }));

    const addRes = await sheetsFetchWithAuth(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requests }),
      },
      interactive
    );

    if (!addRes.ok) {
      console.warn('Could not add missing tabs:', await addRes.text());
    }

    // Inisialisasi header hanya pada tab yang baru dibuat
    const headerUpdates = missingTabs.map((title) => {
      const colEnd = String.fromCharCode(64 + STANDARD_HEADERS[title][0].length);
      return {
        range: `${title}!A1:${colEnd}1`,
        values: STANDARD_HEADERS[title],
      };
    });

    await sheetsFetchWithAuth(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          valueInputOption: 'USER_ENTERED',
          data: headerUpdates,
        }),
      },
      interactive
    );
  }

  return true;
}

/**
 * Direct Google Sheets API v4 & Drive API Client
 */
export async function searchOrCreateSpreadsheet(
  storeName: string
): Promise<{ id: string; url: string; isNew: boolean }> {
  const token = await ensureAccessToken(true);
  if (!token) {
    throw new Error('Belum login dengan akun Google. Silakan klik Masuk dengan Google.');
  }

  const fileName = `KasirPintar - ${storeName || 'Database Toko'}`;

  // 1. Search Google Drive for existing spreadsheet
  try {
    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=name='${encodeURIComponent(
      fileName
    )}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false&fields=files(id,name,webViewLink)`;
    const searchRes = await sheetsFetchWithAuth(searchUrl, { method: 'GET' }, true);
    if (searchRes.ok) {
      const searchData = await searchRes.json();
      if (searchData.files && searchData.files.length > 0) {
        const file = searchData.files[0];
        await ensureSpreadsheetTabs(file.id, true);
        return {
          id: file.id,
          url: file.webViewLink || `https://docs.google.com/spreadsheets/d/${file.id}/edit`,
          isNew: false,
        };
      }
    }
  } catch (err) {
    console.warn('Could not search existing file in Drive, proceeding to create:', err);
  }

  // 2. Create new Spreadsheet with standard sheets including Dashboard
  const createUrl = 'https://sheets.googleapis.com/v4/spreadsheets';
  const body = {
    properties: {
      title: fileName,
    },
    sheets: [
      { properties: { title: 'Dashboard', gridProperties: { frozenRowCount: 1 } } },
      { properties: { title: 'Produk', gridProperties: { frozenRowCount: 1 } } },
      { properties: { title: 'Transaksi', gridProperties: { frozenRowCount: 1 } } },
      { properties: { title: 'Detail_Transaksi', gridProperties: { frozenRowCount: 1 } } },
      { properties: { title: 'Pengaturan', gridProperties: { frozenRowCount: 1 } } },
    ],
  };

  const createRes = await sheetsFetchWithAuth(
    createUrl,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
    true
  );

  if (!createRes.ok) {
    const errorText = await createRes.text();
    throw new Error(`Gagal membuat spreadsheet: ${errorText}`);
  }

  const newSheetData = await createRes.json();
  const spreadsheetId = newSheetData.spreadsheetId;
  const spreadsheetUrl =
    newSheetData.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  await initSpreadsheetHeaders(spreadsheetId);

  return {
    id: spreadsheetId,
    url: spreadsheetUrl,
    isNew: true,
  };
}

async function initSpreadsheetHeaders(spreadsheetId: string) {
  const headers = [
    { range: 'Dashboard!A1:C1', values: STANDARD_HEADERS.Dashboard },
    { range: 'Produk!A1:J1', values: STANDARD_HEADERS.Produk },
    { range: 'Transaksi!A1:K1', values: STANDARD_HEADERS.Transaksi },
    { range: 'Detail_Transaksi!A1:F1', values: STANDARD_HEADERS.Detail_Transaksi },
    { range: 'Pengaturan!A1:B1', values: STANDARD_HEADERS.Pengaturan },
  ];

  await sheetsFetchWithAuth(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: headers,
      }),
    },
    true
  );
}

/**
 * Menyinkronkan metrik ringkasan Dashboard aplikasi ke lembar "Dashboard" di Google Sheets
 * (Termasuk menampilkan Rp 0 dan 0 transaksi ketika data transaksi telah di-0-kan)
 */
export async function syncDashboardSummaryToSheet(
  spreadsheetId: string,
  storeProfile: StoreProfile | undefined,
  products: Product[],
  transactions: Transaction[],
  interactive = false
): Promise<boolean> {
  if (!spreadsheetId) return false;

  try {
    await ensureSpreadsheetTabs(spreadsheetId, interactive);

    const todayStr = getLocalDateString();
    const todayTxs = transactions.filter((t) => getLocalDateString(t.date) === todayStr);
    const todayOmset = todayTxs.reduce((acc, t) => acc + t.total, 0);
    const todayHPP = todayTxs.reduce(
      (acc, t) =>
        acc + t.items.reduce((sum, item) => sum + (item.costPrice || 0) * item.quantity, 0),
      0
    );
    const todayGrossProfit = todayOmset - todayHPP;
    const todayTunai = todayTxs
      .filter((t) => t.paymentMethod === 'TUNAI')
      .reduce((acc, t) => acc + t.total, 0);
    const todayQris = todayTxs
      .filter((t) => t.paymentMethod === 'QRIS')
      .reduce((acc, t) => acc + t.total, 0);

    const totalAllOmset = transactions.reduce((acc, t) => acc + t.total, 0);
    const lowStockCount = products.filter((p) => p.stock <= p.minStock).length;
    const totalStockUnits = products.reduce((acc, p) => acc + (Number(p.stock) || 0), 0);

    // Top 5 products today
    const salesMap: Record<string, { name: string; qty: number; rev: number }> = {};
    todayTxs.forEach((tx) => {
      tx.items.forEach((it) => {
        const key = it.productId || it.barcode || it.name;
        if (!salesMap[key]) salesMap[key] = { name: it.name, qty: 0, rev: 0 };
        salesMap[key].qty += it.quantity;
        salesMap[key].rev += it.subtotal;
      });
    });
    const top5 = Object.values(salesMap)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);

    const rows: Array<[string, string | number, string]> = [
      ['Metrik Dashboard', 'Nilai', 'Keterangan'],
      ['Nama Toko', storeProfile?.name || 'Salsabila Mart', storeProfile?.address || '-'],
      ['Tanggal Laporan (Lokal)', todayStr, 'Zona waktu perangkat kasir'],
      [
        'Terakhir Disinkronkan',
        new Date().toLocaleString('id-ID'),
        transactions.length === 0 ? 'Status: Data Transaksi 0 (Kosong)' : 'Status: Aktif & Sinkron',
      ],
      ['Omset Hari Ini (Rp)', todayOmset, `${todayTxs.length} transaksi hari ini`],
      ['Estimasi Laba Kotor Hari Ini (Rp)', todayGrossProfit, `HPP Modal: Rp ${todayHPP}`],
      ['Jumlah Transaksi Hari Ini', todayTxs.length, 'Total struk hari ini'],
      ['Penerimaan Tunai Hari Ini (Rp)', todayTunai, 'Pembayaran Cash'],
      ['Penerimaan QRIS Hari Ini (Rp)', todayQris, 'Pembayaran QRIS Digital'],
      [
        'Total Seluruh Transaksi Tersimpan',
        transactions.length,
        transactions.length === 0 ? 'Sudah di-0-kan / bersih' : 'Total riwayat transaksi',
      ],
      ['Total Akumulasi Omset (Rp)', totalAllOmset, 'Total seluruh transaksi aktif'],
      ['Total Jenis Produk (SKU)', products.length, `${totalStockUnits} total unit stok`],
      ['Produk Stok Menipis / Habis', lowStockCount, 'Stok <= batas minimum'],
      ['--- PRODUK TERLARIS HARI INI ---', '--- QTY ---', '--- OMSET (Rp) ---'],
    ];

    if (top5.length === 0) {
      rows.push(['Belum ada penjualan hari ini', 0, 'Rp 0']);
    } else {
      top5.forEach((item, idx) => {
        rows.push([`${idx + 1}. ${item.name}`, item.qty, `${item.rev}`]);
      });
    }

    await sheetsFetchWithAuth(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Dashboard!A1:C30:clear`,
      { method: 'POST' },
      interactive
    );

    const putRes = await sheetsFetchWithAuth(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Dashboard!A1?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ values: rows }),
      },
      interactive
    );

    return putRes.ok;
  } catch (err) {
    console.warn('Could not update Dashboard summary sheet:', err);
    return false;
  }
}

/**
 * Push all products to Google Sheet
 */
export async function pushProductsToSheet(
  spreadsheetId: string,
  products: Product[],
  interactive = false
): Promise<boolean> {
  if (!spreadsheetId) return false;

  await ensureSpreadsheetTabs(spreadsheetId, interactive);

  const rows = products.map((p) => [
    p.id,
    p.barcode,
    p.name,
    p.category,
    p.price,
    p.costPrice,
    p.stock,
    p.minStock,
    p.unit,
    p.updatedAt,
  ]);

  // Clear existing product rows below header
  await sheetsFetchWithAuth(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Produk!A2:J2000:clear`,
    { method: 'POST' },
    interactive
  );

  // Ensure header row is intact
  await sheetsFetchWithAuth(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Produk!A1:J1?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: STANDARD_HEADERS.Produk }),
    },
    interactive
  );

  if (rows.length === 0) return true;

  // Write new rows
  const res = await sheetsFetchWithAuth(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Produk!A2?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: rows }),
    },
    interactive
  );

  return res.ok;
}

/**
 * Fetch products from Google Sheet (OAuth or Webhook)
 */
export async function fetchProductsFromSheet(
  spreadsheetId: string,
  webhookUrl?: string,
  interactive = true
): Promise<Product[] | null> {
  if (webhookUrl && !spreadsheetId) {
    try {
      const res = await fetch(`${webhookUrl}${webhookUrl.includes('?') ? '&' : '?'}action=getProducts`);
      if (res.ok) {
        const json = await res.json();
        if (json && Array.isArray(json.data)) {
          return json.data;
        }
      }
    } catch (err) {
      console.warn('Webhook getProducts failed:', err);
    }
  }

  if (!spreadsheetId) return null;

  await ensureSpreadsheetTabs(spreadsheetId, interactive);

  const res = await sheetsFetchWithAuth(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Produk!A2:J2000`,
    { method: 'GET' },
    interactive
  );

  if (!res.ok) return null;
  const data = await res.json();
  if (!data.values || data.values.length === 0) return [];

  return data.values
    .filter((row: any[]) => row && (row[0] || row[2]))
    .map((row: any[], idx: number) => ({
      id: String(row[0] || `p-sheet-${idx + 1}`),
      barcode: String(row[1] || ''),
      name: String(row[2] || ''),
      category: String(row[3] || 'Umum'),
      price: Number(row[4]) || 0,
      costPrice: Number(row[5]) || 0,
      stock: Number(row[6]) || 0,
      minStock: Number(row[7]) || 5,
      unit: String(row[8] || 'pcs'),
      updatedAt: String(row[9] || new Date().toISOString()),
    }));
}

/**
 * Fetch transactions from Google Sheet (mengembalikan [] bila lembar Transaksi kosong / 0 baris!)
 */
export async function fetchTransactionsFromSheet(
  spreadsheetId: string,
  currentProducts: Product[],
  webhookUrl?: string,
  interactive = true
): Promise<Transaction[] | null> {
  // 1. Jika menggunakan mode Webhook tanpa spreadsheetId OAuth
  if (webhookUrl && !spreadsheetId) {
    try {
      const allUrl = `${webhookUrl}${webhookUrl.includes('?') ? '&' : '?'}action=getTransactions`;
      const res = await fetch(allUrl);
      if (res.ok) {
        const text = await res.text();
        try {
          const parsed = JSON.parse(text);
          if (parsed && Array.isArray(parsed.data)) {
            return parsed.data;
          }
        } catch {
          // Lanjut ke fallback getSummary untuk Apps Script versi lama
        }
      }

      // Fallback kompatibilitas Apps Script v1 (mendukung getSummary -> jika totalTransactions === 0 maka kembalikan [])
      const sumUrl = `${webhookUrl}${webhookUrl.includes('?') ? '&' : '?'}action=getSummary`;
      const sumRes = await fetch(sumUrl);
      if (sumRes.ok) {
        const sumJson = await sumRes.json();
        if (sumJson && typeof sumJson.totalTransactions === 'number' && sumJson.totalTransactions === 0) {
          return [];
        }
      }
    } catch (err) {
      console.warn('Webhook fetchTransactions failed:', err);
    }
    return null;
  }

  if (!spreadsheetId) return null;

  await ensureSpreadsheetTabs(spreadsheetId, interactive);

  const [trxRes, detRes] = await Promise.all([
    sheetsFetchWithAuth(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Transaksi!A2:K5000`,
      { method: 'GET' },
      interactive
    ),
    sheetsFetchWithAuth(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Detail_Transaksi!A2:F10000`,
      { method: 'GET' },
      interactive
    ),
  ]);

  if (!trxRes.ok) return null;

  const trxJson = await trxRes.json();
  const trxValues: any[][] = trxJson.values || [];

  // Jika lembar Transaksi kosong (0 baris), kembalikan [] agar Dashboard ikut menjadi 0!
  if (trxValues.length === 0) {
    return [];
  }

  const detJson = detRes.ok ? await detRes.json() : { values: [] };
  const detValues: any[][] = detJson.values || [];

  // Peta produk berdasarkan barcode / nama untuk melengkapi HPP (costPrice)
  const prodByBarcode = new Map<string, Product>();
  const prodByName = new Map<string, Product>();
  currentProducts.forEach((p) => {
    if (p.barcode) prodByBarcode.set(String(p.barcode).trim(), p);
    if (p.name) prodByName.set(p.name.trim().toLowerCase(), p);
  });

  const itemsByTrxId = new Map<string, TransactionItem[]>();
  detValues.forEach((row, idx) => {
    if (!row || !row[0]) return;
    const trxId = String(row[0]).trim();
    const barcode = String(row[1] || '').trim();
    const name = String(row[2] || 'Produk').trim();
    const quantity = Number(row[3]) || 1;
    const price = Number(row[4]) || 0;
    const subtotal = Number(row[5]) || price * quantity;

    const matched = prodByBarcode.get(barcode) || prodByName.get(name.toLowerCase());
    const item: TransactionItem = {
      productId: matched?.id || `item-sheet-${idx + 1}`,
      barcode,
      name,
      price,
      costPrice: matched?.costPrice || 0,
      quantity,
      subtotal,
    };

    const list = itemsByTrxId.get(trxId) || [];
    list.push(item);
    itemsByTrxId.set(trxId, list);
  });

  const transactions: Transaction[] = trxValues
    .filter((row) => row && row[0] && !String(row[0]).startsWith('TEST-'))
    .map((row) => {
      const id = String(row[0]).trim();
      const rawRole = String(row[3] || 'kasir').toLowerCase();
      const cashierRole: UserRole = rawRole === 'admin' ? 'admin' : 'kasir';
      const rawMethod = String(row[4] || 'TUNAI').toUpperCase();
      const paymentMethod: PaymentMethod = rawMethod === 'QRIS' ? 'QRIS' : 'TUNAI';
      const subtotal = Number(row[5]) || 0;
      const discount = Number(row[6]) || 0;
      const total = Number(row[7]) || Math.max(0, subtotal - discount);
      const amountPaid = Number(row[8]) || total;
      const change = Number(row[9]) || 0;
      const qrisRef = row[10] ? String(row[10]) : undefined;

      return {
        id,
        date: row[1] ? String(row[1]) : new Date().toISOString(),
        cashierName: String(row[2] || 'Kasir'),
        cashierRole,
        items: itemsByTrxId.get(id) || [],
        subtotal,
        discount,
        total,
        paymentMethod,
        amountPaid,
        change,
        qrisRef,
        syncedToSheet: true,
      };
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return transactions;
}

/**
 * Tarik seluruh data (Produk + Transaksi) dari Google Sheets ke aplikasi (Sinkronisasi 2 Arah)
 */
export async function pullFullStateFromSheet(
  spreadsheetId: string,
  fallbackProducts: Product[],
  webhookUrl?: string
): Promise<PullSheetStateResult> {
  try {
    // Jika hanya menggunakan Webhook
    if (webhookUrl && !spreadsheetId) {
      try {
        const res = await fetch(`${webhookUrl}${webhookUrl.includes('?') ? '&' : '?'}action=getAll`);
        if (res.ok) {
          const text = await res.text();
          try {
            const parsed = JSON.parse(text);
            if (parsed && parsed.success && Array.isArray(parsed.transactions)) {
              return {
                success: true,
                products: Array.isArray(parsed.products) ? parsed.products : null,
                transactions: parsed.transactions,
                message:
                  parsed.transactions.length === 0
                    ? 'Data di Google Sheets kosong (0 transaksi). Dashboard berhasil disinkronkan menjadi Rp 0!'
                    : `Berhasil menarik ${parsed.transactions.length} transaksi & data produk dari Google Sheets!`,
              };
            }
          } catch {
            // fallback ke endpoint lama
          }
        }
      } catch (err) {
        console.warn('Webhook getAll error:', err);
      }

      const [prods, trxs] = await Promise.all([
        fetchProductsFromSheet('', webhookUrl, true),
        fetchTransactionsFromSheet('', fallbackProducts, webhookUrl, true),
      ]);

      if (prods === null && trxs === null) {
        return {
          success: false,
          products: null,
          transactions: null,
          message:
            'Gagal menarik transaksi via Webhook. Pastikan kode Apps Script (Code.gs) terbaru sudah dipasang & di-deploy ulang di Google Sheets.',
        };
      }

      return {
        success: true,
        products: prods,
        transactions: trxs,
        message:
          trxs && trxs.length === 0
            ? 'Lembar Transaksi di Google Sheets berjumlah 0. Dashboard aplikasi berhasil di-0-kan!'
            : 'Data berhasil ditarik dari Google Sheets via Webhook!',
      };
    }

    if (!spreadsheetId) {
      return {
        success: false,
        products: null,
        transactions: null,
        message: 'Google Sheets belum dihubungkan.',
      };
    }

    const importedProducts = await fetchProductsFromSheet(spreadsheetId, webhookUrl, true);
    const effectiveProducts =
      importedProducts && importedProducts.length > 0 ? importedProducts : fallbackProducts;
    const importedTransactions = await fetchTransactionsFromSheet(
      spreadsheetId,
      effectiveProducts,
      webhookUrl,
      true
    );

    if (importedTransactions === null) {
      return {
        success: false,
        products: importedProducts,
        transactions: null,
        message: 'Gagal membaca lembar Transaksi dari Google Sheets.',
      };
    }

    return {
      success: true,
      products: importedProducts,
      transactions: importedTransactions,
      message:
        importedTransactions.length === 0
          ? 'Lembar Transaksi di Google Sheets kosong (0 baris). Dashboard berhasil disinkronkan menjadi 0!'
          : `Berhasil menyinkronkan ${importedTransactions.length} transaksi${
              importedProducts ? ` & ${importedProducts.length} produk` : ''
            } dari Google Sheets ke Dashboard!`,
    };
  } catch (err: any) {
    return {
      success: false,
      products: null,
      transactions: null,
      message: `Gagal menarik data dari Google Sheets: ${err.message || 'Terjadi kesalahan'}`,
    };
  }
}

/**
 * Menimpa / menyamakan penuh isi Google Sheets (Dashboard, Transaksi, Detail_Transaksi, Produk)
 * dengan kondisi aplikasi saat ini — TERMASUK saat transaksi sudah di-0-kan (transactions = [])!
 */
export async function overwriteFullStateToSheet(
  spreadsheetId: string,
  storeProfile: StoreProfile,
  transactions: Transaction[],
  products: Product[],
  webhookUrl?: string,
  interactive = true
): Promise<{ success: boolean; message: string }> {
  // 1. Jika menggunakan Webhook (tanpa OAuth atau sebagai jalur utama ketika spreadsheetId kosong)
  if (webhookUrl && !spreadsheetId) {
    try {
      const resp = await syncViaWebhook(webhookUrl, {
        action: 'syncFullState',
        storeName: storeProfile.name,
        transactions,
        products,
      });
      if (resp && resp.error) {
        return {
          success: false,
          message:
            'Script Webhook lama di Google Sheets belum mendukung fitur Reset/0-kan otomatis. Salin kode terbaru dari tab "Apps Script (.gs)" lalu Deploy ulang, atau gunakan tab "1. Google OAuth".',
        };
      }
      return {
        success: true,
        message:
          transactions.length === 0
            ? 'Berhasil mengosongkan (0-kan) lembar Transaksi & memperbarui Dashboard Rp 0 di Google Sheets!'
            : `Berhasil menyinkronkan penuh Dashboard, ${transactions.length} transaksi, dan ${products.length} produk ke Google Sheets!`,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Gagal menghubungi Webhook Google Sheets: ${err.message || 'Periksa URL Webhook'}`,
      };
    }
  }

  if (!spreadsheetId) {
    return {
      success: false,
      message: 'Google Sheets belum terhubung. Silakan sambungkan di menu Database Google Sheets.',
    };
  }

  try {
    await ensureSpreadsheetTabs(spreadsheetId, interactive);

    // 1. Bersihkan seluruh baris lama di Transaksi & Detail_Transaksi (di bawah baris header 1)
    await Promise.all([
      sheetsFetchWithAuth(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Transaksi!A2:K5000:clear`,
        { method: 'POST' },
        interactive
      ),
      sheetsFetchWithAuth(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Detail_Transaksi!A2:F10000:clear`,
        { method: 'POST' },
        interactive
      ),
    ]);

    // Pastikan header tetap rapi
    await sheetsFetchWithAuth(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          valueInputOption: 'USER_ENTERED',
          data: [
            { range: 'Transaksi!A1:K1', values: STANDARD_HEADERS.Transaksi },
            { range: 'Detail_Transaksi!A1:F1', values: STANDARD_HEADERS.Detail_Transaksi },
          ],
        }),
      },
      interactive
    );

    // 2. Jika ada transaksi (> 0), tulis ulang secara rapi (kronologis terlama ke terbaru di sheet)
    if (transactions.length > 0) {
      const ordered = [...transactions].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      const trxRows = ordered.map((t) => [
        t.id,
        t.date,
        t.cashierName,
        t.cashierRole,
        t.paymentMethod,
        t.subtotal,
        t.discount,
        t.total,
        t.amountPaid,
        t.change,
        t.qrisRef || '',
      ]);

      const detailRows: any[][] = [];
      ordered.forEach((t) => {
        t.items.forEach((item) => {
          detailRows.push([
            t.id,
            item.barcode,
            item.name,
            item.quantity,
            item.price,
            item.subtotal,
          ]);
        });
      });

      await sheetsFetchWithAuth(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Transaksi!A2?valueInputOption=USER_ENTERED`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ values: trxRows }),
        },
        interactive
      );

      if (detailRows.length > 0) {
        await sheetsFetchWithAuth(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Detail_Transaksi!A2?valueInputOption=USER_ENTERED`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ values: detailRows }),
          },
          interactive
        );
      }
    }

    // 3. Sinkronkan Produk & Ringkasan Dashboard (menulis Rp 0 & 0 Transaksi jika kosong!)
    await pushProductsToSheet(spreadsheetId, products, interactive);
    await syncDashboardSummaryToSheet(
      spreadsheetId,
      storeProfile,
      products,
      transactions,
      interactive
    );

    // Jika webhook juga dipasang bersamaan, kirim update ke webhook secara non-blocking
    if (webhookUrl) {
      syncViaWebhook(webhookUrl, {
        action: 'syncFullState',
        storeName: storeProfile.name,
        transactions,
        products,
      }).catch(() => {});
    }

    return {
      success: true,
      message:
        transactions.length === 0
          ? 'Berhasil! Lembar Transaksi & Detail_Transaksi telah dikosongkan (0) dan lembar Dashboard di Google Sheets diperbarui menjadi Rp 0.'
          : `Sinkronisasi penuh berhasil! Dashboard, ${transactions.length} transaksi, dan ${products.length} produk telah diperbarui di Google Sheets.`,
    };
  } catch (err: any) {
    console.error('Error overwriting full state to Google Sheets:', err);
    return {
      success: false,
      message: `Gagal menyinkronkan ke Google Sheets: ${err.message || 'Periksa izin akun Google Anda'}`,
    };
  }
}

/**
 * Sync via Apps Script Webhook
 */
export async function syncViaWebhook(webhookUrl: string, body: any): Promise<any> {
  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('Gagal menghubungi Webhook Apps Script');
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { success: true, text };
  }
}

/**
 * Sync single new transaction directly to Google Sheet in real-time + update Dashboard tab
 */
export async function appendTransactionToSheet(
  spreadsheetId: string,
  transaction: Transaction,
  updatedProducts: Product[],
  webhookUrl?: string,
  allTransactionsAfterSale?: Transaction[],
  storeProfile?: StoreProfile
): Promise<boolean> {
  if (webhookUrl) {
    try {
      const resp = await syncViaWebhook(webhookUrl, {
        action: 'recordTransaction',
        storeName: storeProfile?.name,
        transaction,
      });
      if (!resp?.error && !spreadsheetId) {
        return true;
      }
    } catch (err) {
      console.warn('Webhook sync failed:', err);
      if (!spreadsheetId) return false;
    }
  }

  if (!spreadsheetId) return false;

  try {
    await ensureSpreadsheetTabs(spreadsheetId, false);

    const trxRow = [
      transaction.id,
      transaction.date,
      transaction.cashierName,
      transaction.cashierRole,
      transaction.paymentMethod,
      transaction.subtotal,
      transaction.discount,
      transaction.total,
      transaction.amountPaid,
      transaction.change,
      transaction.qrisRef || '',
    ];

    const appendRes = await sheetsFetchWithAuth(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Transaksi!A:K:append?valueInputOption=USER_ENTERED`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ values: [trxRow] }),
      },
      false
    );

    if (!appendRes.ok) return false;

    const detailRows = transaction.items.map((item) => [
      transaction.id,
      item.barcode,
      item.name,
      item.quantity,
      item.price,
      item.subtotal,
    ]);

    if (detailRows.length > 0) {
      await sheetsFetchWithAuth(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Detail_Transaksi!A:F:append?valueInputOption=USER_ENTERED`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ values: detailRows }),
        },
        false
      );
    }

    await pushProductsToSheet(spreadsheetId, updatedProducts, false);
    if (allTransactionsAfterSale) {
      await syncDashboardSummaryToSheet(
        spreadsheetId,
        storeProfile,
        updatedProducts,
        allTransactionsAfterSale,
        false
      );
    }
    return true;
  } catch (err) {
    console.error('Error syncing transaction to Google Sheets:', err);
    return false;
  }
}

/**
 * Batch sync pending transactions created during offline mode to Google Sheet
 */
export async function batchAppendTransactionsToSheet(
  spreadsheetId: string,
  transactionsToAppend: Transaction[],
  updatedProducts: Product[],
  webhookUrl?: string,
  allTransactions?: Transaction[],
  storeProfile?: StoreProfile,
  interactive = false
): Promise<{ success: boolean; syncedCount: number; message: string }> {
  if (transactionsToAppend.length === 0) {
    if (spreadsheetId) {
      try {
        await pushProductsToSheet(spreadsheetId, updatedProducts, interactive);
        await syncDashboardSummaryToSheet(
          spreadsheetId,
          storeProfile,
          updatedProducts,
          allTransactions || [],
          interactive
        );
        return {
          success: true,
          syncedCount: 0,
          message: 'Ringkasan Dashboard & Produk berhasil diperbarui ke Google Sheets!',
        };
      } catch (err: any) {
        return {
          success: false,
          syncedCount: 0,
          message: err.message || 'Gagal memperbarui Dashboard ke Google Sheets.',
        };
      }
    }
    return { success: true, syncedCount: 0, message: 'Tidak ada transaksi tertunda.' };
  }

  // 1. Jika menggunakan Webhook
  if (webhookUrl && !spreadsheetId) {
    try {
      const resp = await syncViaWebhook(webhookUrl, {
        action: 'batchRecordTransactions',
        storeName: storeProfile?.name,
        transactions: transactionsToAppend,
        products: updatedProducts,
      });
      if (resp?.error) {
        throw new Error(resp.error);
      }
      return {
        success: true,
        syncedCount: transactionsToAppend.length,
        message: `Berhasil menyinkronkan ${transactionsToAppend.length} transaksi ke Google Sheets via Webhook!`,
      };
    } catch (err: any) {
      return {
        success: false,
        syncedCount: 0,
        message: `Gagal sinkronisasi Webhook: ${err.message || 'Periksa URL Webhook'}`,
      };
    }
  }

  if (!spreadsheetId) {
    return {
      success: false,
      syncedCount: 0,
      message: 'Belum terhubung ke Spreadsheet Google atau Webhook.',
    };
  }

  try {
    await ensureSpreadsheetTabs(spreadsheetId, interactive);

    // Cek ID yang sudah ada di Transaksi agar tidak duplikat
    const existingIdsRes = await sheetsFetchWithAuth(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Transaksi!A2:A5000`,
      { method: 'GET' },
      interactive
    );
    const existingIds = new Set<string>();
    if (existingIdsRes.ok) {
      const idJson = await existingIdsRes.json();
      (idJson.values || []).forEach((r: any[]) => {
        if (r && r[0]) existingIds.add(String(r[0]).trim());
      });
    }

    const freshTxs = transactionsToAppend.filter((t) => !existingIds.has(t.id));

    if (freshTxs.length > 0) {
      const trxRows = freshTxs.map((t) => [
        t.id,
        t.date,
        t.cashierName,
        t.cashierRole,
        t.paymentMethod,
        t.subtotal,
        t.discount,
        t.total,
        t.amountPaid,
        t.change,
        t.qrisRef || '',
      ]);

      const appRes = await sheetsFetchWithAuth(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Transaksi!A:K:append?valueInputOption=USER_ENTERED`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ values: trxRows }),
        },
        interactive
      );

      if (!appRes.ok) {
        const errTxt = await appRes.text();
        throw new Error(errTxt);
      }

      const detailRows: any[][] = [];
      freshTxs.forEach((t) => {
        t.items.forEach((item) => {
          detailRows.push([
            t.id,
            item.barcode,
            item.name,
            item.quantity,
            item.price,
            item.subtotal,
          ]);
        });
      });

      if (detailRows.length > 0) {
        await sheetsFetchWithAuth(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Detail_Transaksi!A:F:append?valueInputOption=USER_ENTERED`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ values: detailRows }),
          },
          interactive
        );
      }
    }

    await pushProductsToSheet(spreadsheetId, updatedProducts, interactive);
    await syncDashboardSummaryToSheet(
      spreadsheetId,
      storeProfile,
      updatedProducts,
      allTransactions || transactionsToAppend,
      interactive
    );

    return {
      success: true,
      syncedCount: transactionsToAppend.length,
      message: `Berhasil menyinkronkan ${transactionsToAppend.length} transaksi & memperbarui lembar Dashboard di Google Sheets!`,
    };
  } catch (err: any) {
    console.error('Error batch syncing transactions to Google Sheets:', err);
    return {
      success: false,
      syncedCount: 0,
      message: `Gagal sinkronisasi ke Google Sheets: ${err.message || 'Koneksi terganggu'}`,
    };
  }
}
