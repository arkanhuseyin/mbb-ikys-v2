const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path'); // Dosya yolları için gerekli
const pool = require('./src/config/db');

// --- ROTA DOSYALARI ---
const authRoutes = require('./src/routes/authRoutes');
const izinRoutes = require('./src/routes/izinRoutes');
const personelRoutes = require('./src/routes/personelRoutes'); // <--- YENİ EKLENDİ (Profil için)

dotenv.config();

const app = express();

// --- MIDDLEWARE (Ara Katmanlar) ---
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Yüklenen dosyaların (PDF, Resim) tarayıcıdan erişilebilir olması için klasörü dışa açıyoruz
// Örn: http://localhost:5000/uploads/belgeler/dosya.pdf
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- ROTALAR ---
app.use('/api/auth', authRoutes);       // Giriş işlemleri
app.use('/api/izin', izinRoutes);       // İzin, Onay, Bildirim, PDF
app.use('/api/personel', personelRoutes); // <--- YENİ: Profil Güncelleme ve Dosya Yükleme

// Test Rotası
app.get('/', (req, res) => {
    res.send('Mersin BB İzin & Görev Sistemi API Çalışıyor! 🚀');
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`🚀 Sunucu ${PORT} portunda çalışıyor...`);
});