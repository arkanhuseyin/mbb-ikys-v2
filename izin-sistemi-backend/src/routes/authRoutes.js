const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middleware/auth'); // Güvenlik (Token kontrolü)

// ============================================================
// 🔓 HERKESİN ERİŞEBİLECEĞİ ROTALAR (Token Gerektirmez)
// ============================================================

// 1. Giriş Yapma
router.post('/login', authController.login);

// 2. Şifre Sıfırlama Talebi (Giriş yapamayan personel için)
router.post('/sifremi-unuttum', authController.sifreUnuttum);


// ============================================================
// 🔒 SADECE GİRİŞ YAPMIŞ YETKİLİLERİN (Admin/İK) ERİŞEBİLECEĞİ ROTALAR
// ============================================================

// 3. Admin Tarafından Şifre Sıfırlama (Web Panelinden)
router.post('/admin-sifirla', auth, authController.adminSifirla);

// 4. Yeni Personel Ekleme / Üyelik Açma (Sadece Admin)
router.post('/register', auth, authController.register);

// 5. Tüm Personelleri Listeleme (Ayarlar Sayfası İçin)
router.get('/users', auth, authController.getUsers);

module.exports = router;