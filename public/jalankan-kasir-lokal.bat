@echo off
title Salsabila Mart - Server Kasir Mandiri (Tanpa Hosting)
color 0A
cls
echo ================================================================
echo           SALSABILA MART - KASIR PINTAR POS & INVENTARIS
echo                   MODE LOKAL (TANPA HOSTING)
echo ================================================================
echo.
echo Aplikasi ini berjalan secara lokal di laptop / komputer toko Anda.
echo Tidak memerlukan hosting cloud, Vercel, Firebase, atau kuota internet!
echo.
echo Memeriksa lingkungan perangkat kasir...
where node >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [OK] Node.js terdeteksi di komputer Anda.
    echo Menjalankan server lokal Vite Preview pada port 3000...
    echo Browser akan otomatis terbuka ke: http://localhost:3000
    echo.
    echo Tekan Ctrl+C jika ingin mematikan kasir.
    echo.
    start "" http://localhost:3000
    call npm run preview
) else (
    echo [INFO] Node.js tidak terdeteksi secara global.
    echo Membuka aplikasi kasir di browser Anda...
    start "" index.html
)
pause
