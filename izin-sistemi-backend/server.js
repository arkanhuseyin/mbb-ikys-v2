const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs'); 

// 1. ADIM: Ayarları EN BAŞTA yükle
dotenv.config(); 

// 2. ADIM: Ayarlar yüklendikten sonra veritabanını çağır
const pool = require('./src/config/db');

// --- ROTA DOSYALARI ---
const authRoutes = require('./src/routes/authRoutes');
const izinRoutes = require('./src/routes/izinRoutes');
const personelRoutes = require('./src/routes/personelRoutes');
const yetkiRoutes = require('./src/routes/yetkiRoutes'); // <--- KRİTİK: Yetki rotası burada

const app = express();

// --- MIDDLEWARE (Ara Katmanlar) ---
// CORS Ayarı: Tüm kaynaklardan gelen isteklere izin ver
app.use(cors({
    origin: '*', 
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- RESİM VE DOSYA KLASÖRÜ AYARLARI ---
// Uploads klasörünü belirle
const uploadsDir = path.join(__dirname, 'uploads');

// Klasör yoksa oluştur (Render'da hata almamak için)
if (!fs.existsSync(uploadsDir)){
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('📂 Uploads klasörü oluşturuldu.');
}

// Klasörü dışarıya aç (Resimlerin görünmesi için şart)
app.use('/uploads', express.static(uploadsDir));

// --- ROTALAR ---
app.use('/api/auth', authRoutes);       // Giriş işlemleri
app.use('/api/izin', izinRoutes);       // İzin işlemleri
app.use('/api/personel', personelRoutes); // Personel işlemleri
app.use('/api/yetki', yetkiRoutes);     // <--- KRİTİK: Yetki işlemleri (Kaydetme hatası buradaydı)

// Test Rotası
app.get('/', (req, res) => {
    res.send('Mersin BB İzin & Görev Sistemi API Çalışıyor! 🚀 (Veritabanı: Aktif)');
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`🚀 Sunucu ${PORT} portunda çalışıyor...`);
});