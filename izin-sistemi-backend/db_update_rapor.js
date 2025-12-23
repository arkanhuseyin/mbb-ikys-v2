const pool = require('./src/config/db');

const guncelle = async () => {
    try {
        console.log("🛠️ Tablolar güncelleniyor...");
        
        // 1. İzin Taleplerine 'belge_yolu' ekle (Rapor fotosu için)
        await pool.query(`ALTER TABLE izin_talepleri ADD COLUMN IF NOT EXISTS belge_yolu TEXT;`);

        // 2. Personellere 'ise_giris_tarihi' ekle (Hesaplama için)
        await pool.query(`ALTER TABLE personeller ADD COLUMN IF NOT EXISTS ise_giris_tarihi DATE DEFAULT '2020-01-01';`);
        
        console.log("✅ Sütunlar eklendi!");
        process.exit(0);
    } catch (err) {
        console.error("❌ Hata:", err.message);
        process.exit(1);
    }
};
guncelle();