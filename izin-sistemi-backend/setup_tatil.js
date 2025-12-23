const pool = require('./src/config/db');

const guncelle = async () => {
    try {
        // 1. Resmi Tatiller Tablosu
        await pool.query(`
            CREATE TABLE IF NOT EXISTS resmi_tatiller (
                id SERIAL PRIMARY KEY,
                tarih DATE NOT NULL UNIQUE, -- Aynı gün 2 kere eklenemesin
                aciklama VARCHAR(100)
            );
        `);

        // 2. İzin Tablosuna 'Haftalık İzin Günü' ve 'İşe Başlama Tarihi' Ekle
        await pool.query(`
            ALTER TABLE izin_talepleri 
            ADD COLUMN IF NOT EXISTS haftalik_izin_gunu VARCHAR(20),
            ADD COLUMN IF NOT EXISTS ise_baslama_tarihi DATE;
        `);

        console.log("✅ Veritabanı güncellendi (Tatiller ve Sütunlar)");
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};
guncelle();