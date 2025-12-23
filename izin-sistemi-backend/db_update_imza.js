const pool = require('./src/config/db');

const guncelle = async () => {
    try {
        console.log("🛠️ Tablo güncelleniyor...");
        // İzin Adresi ve Personel İmzası sütunlarını ekle
        await pool.query(`ALTER TABLE izin_talepleri ADD COLUMN IF NOT EXISTS izin_adresi TEXT;`);
        await pool.query(`ALTER TABLE izin_talepleri ADD COLUMN IF NOT EXISTS personel_imza TEXT;`);
        
        console.log("✅ Sütunlar eklendi!");
        process.exit(0);
    } catch (err) {
        console.error("❌ Hata:", err.message);
        process.exit(1);
    }
};
guncelle();