const pool = require('./src/config/db');

const kur = async () => {
    try {
        console.log("🛠️ Log ve Takip tabloları kuruluyor...");

        // 1. İZİN HAREKETLERİ (Kargo Takip İçin)
        // Hangi izin, ne zaman, kim tarafından, hangi duruma getirildi?
        await pool.query(`
            CREATE TABLE IF NOT EXISTS izin_hareketleri (
                hareket_id SERIAL PRIMARY KEY,
                talep_id INT REFERENCES izin_talepleri(talep_id) ON DELETE CASCADE,
                islem_yapan_id INT REFERENCES personeller(personel_id),
                islem_turu VARCHAR(50), -- BAŞVURU, AMİR_ONAY, İK_ONAY, RED
                aciklama TEXT,
                tarih TIMESTAMP DEFAULT NOW()
            );
        `);

        // 2. SİSTEM LOGLARI (Admin Denetimi İçin)
        // Kim, ne zaman, hangi IP'den, ne yaptı?
        await pool.query(`
            CREATE TABLE IF NOT EXISTS sistem_loglari (
                log_id SERIAL PRIMARY KEY,
                personel_id INT REFERENCES personeller(personel_id),
                islem VARCHAR(100), -- "Giriş Yaptı", "Personel Eklendi"
                detay TEXT,
                ip_adresi VARCHAR(50),
                tarih TIMESTAMP DEFAULT NOW()
            );
        `);

        console.log("✅ Tablolar hazır!");
        process.exit(0);
    } catch (e) { console.error(e); process.exit(1); }
};
kur();