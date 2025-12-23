const pool = require('./src/config/db');

const verileriDuzelt = async () => {
    try {
        console.log("🛠️ Veriler onarılıyor...");
        
        // 1. İşe giriş tarihi boş olanlara varsayılan tarih ata
        await pool.query("UPDATE personeller SET ise_giris_tarihi = '2020-01-01' WHERE ise_giris_tarihi IS NULL");
        
        // 2. Birimi olmayanlara varsayılan birim ata
        await pool.query("UPDATE personeller SET birim_id = 1 WHERE birim_id IS NULL");

        console.log("✅ Veriler düzeltildi! Web sayfasını yenileyin.");
        process.exit(0);
    } catch (e) {
        console.error("Hata:", e);
        process.exit(1);
    }
};

verileriDuzelt();