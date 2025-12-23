const pool = require('./src/config/db');

const tarihEkle = async () => {
    try {
        console.log("📅 İşe giriş tarihleri güncelleniyor...");
        
        // Herkese varsayılan tarih ata (Daha sonra admin panelinden düzenlenebilir)
        await pool.query("UPDATE personeller SET ise_giris_tarihi = '2020-01-01' WHERE ise_giris_tarihi IS NULL");
        
        console.log("✅ Tarihler eklendi!");
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};
tarihEkle();