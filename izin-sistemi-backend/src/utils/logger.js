const pool = require('../config/db');

// Sistem Logu Kaydet
exports.logKaydet = async (personel_id, islem, detay, req = null) => {
    try {
        const ip = req ? (req.headers['x-forwarded-for'] || req.socket.remoteAddress) : '::1';
        await pool.query(
            'INSERT INTO sistem_loglari (personel_id, islem, detay, ip_adresi) VALUES ($1, $2, $3, $4)',
            [personel_id, islem, detay, ip]
        );
    } catch (e) { console.error("Log hatası:", e); }
};

// İzin Hareketi Kaydet (Kargo Takip)
exports.hareketKaydet = async (talep_id, islem_yapan_id, islem_turu, aciklama) => {
    try {
        await pool.query(
            'INSERT INTO izin_hareketleri (talep_id, islem_yapan_id, islem_turu, aciklama) VALUES ($1, $2, $3, $4)',
            [talep_id, islem_yapan_id, islem_turu, aciklama]
        );
    } catch (e) { console.error("Hareket hatası:", e); }
};