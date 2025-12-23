const pool = require('./src/config/db');

const duzelt = async () => {
    try {
        console.log("🛠️ Kullanıcı durumları düzeltiliyor...");

        // 1. Tüm personelleri AKTİF yap (aktif = true)
        // 2. Ayrılma nedenlerini ve tarihlerini temizle (NULL yap)
        await pool.query(`
            UPDATE personeller 
            SET aktif = TRUE, 
                ayrilma_nedeni = NULL, 
                ayrilma_tarihi = NULL;
        `);
        
        console.log("✅ BÜTÜN KULLANICILAR AKTİF EDİLDİ!");
        console.log("✅ Ayrılma nedenleri temizlendi.");
        process.exit(0);

    } catch (err) {
        console.error("❌ Hata:", err.message);
        process.exit(1);
    }
};

duzelt();