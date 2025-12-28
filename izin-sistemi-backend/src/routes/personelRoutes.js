const express = require('express');
const router = express.Router();
const personelController = require('../controllers/personelController');
const authMiddleware = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// --- MULTER AYARLARI (Dosya Yükleme İçin) ---
// Uploads klasörü yoksa oluştur
const uploadDir = 'uploads/belgeler';
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Dosya ismini benzersiz yap: tc_tarih.uzanti
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// --- ROTALAR ---

// 1. Toplu Personel Yükleme (Excel)
router.post('/toplu-yukle', authMiddleware, personelController.topluYukle);

// 2. Birim Listesi Getir
router.get('/birimler', authMiddleware, personelController.getBirimler);

// 3. Profil Güncelleme Talebi Oluştur (Dosyalı)
// Frontend'den gelen dosya isimleri buradaki 'name' alanlarıyla aynı olmalı
router.post('/talep-olustur', authMiddleware, upload.fields([
    { name: 'adres_belgesi', maxCount: 1 },
    { name: 'src_belgesi', maxCount: 1 },
    { name: 'psiko_belgesi', maxCount: 1 },
    { name: 'ehliyet_belgesi', maxCount: 1 }
]), personelController.talepOlustur);

// 4. Talepleri Listele (Admin/İK/Filo)
router.get('/talepler', authMiddleware, personelController.getTalepler);

// 5. Talep İşlem (Onayla / Reddet)
router.post('/talep-islem', authMiddleware, personelController.talepIslem);

// 6. Personel Transfer (Birim Değiştir)
router.post('/transfer', authMiddleware, personelController.transferPersonel);

// 7. Rol Değiştir
router.post('/rol-degistir', authMiddleware, personelController.rolDegistir);

// 8. Personel Dondur (Pasife Al)
router.post('/dondur', authMiddleware, personelController.dondurPersonel);

// 9. Personel Aktif Et
router.post('/aktif-et', authMiddleware, personelController.aktifEtPersonel);

// 10. Personel Sil (Kalıcı)
router.delete('/sil/:id', authMiddleware, personelController.silPersonel);

module.exports = router;