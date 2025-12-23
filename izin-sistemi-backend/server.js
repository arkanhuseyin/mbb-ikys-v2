const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// 1. ADIM: Ayarları EN BAŞTA yükle (KRİTİK DÜZELTME)
// Bu satır aşağıdayken veritabanı şifreyi göremiyordu.
dotenv.config(); 

// 2. ADIM: Ayarlar yüklendikten sonra veritabanını çağır
const pool = require('./src/config/db');

// --- ROTA DOSYALARI ---
const authRoutes = require('./src/routes/authRoutes');
const izinRoutes = require('./src/routes/izinRoutes');
const personelRoutes = require('./src/routes/personelRoutes');

const app = express();

// --- MIDDLEWARE (Ara Katmanlar) ---
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Yüklenen dosyaların (PDF, Resim) tarayıcıdan erişilebilir olması için klasörü dışa açıyoruz
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- ROTALAR ---
app.use('/api/auth', authRoutes);       // Giriş işlemleri
app.use('/api/izin', izinRoutes);       // İzin, Onay, Bildirim
app.use('/api/personel', personelRoutes); // Profil işlemleri

// Test Rotası (Vercel'de çalıştığını anlamak için)
app.get('/', (req, res) => {
    res.send('Mersin BB İzin & Görev Sistemi API Çalışıyor! 🚀 (Veritabanı Bağlantısı: Aktif)');
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`🚀 Sunucu ${PORT} portunda çalışıyor...`);
});