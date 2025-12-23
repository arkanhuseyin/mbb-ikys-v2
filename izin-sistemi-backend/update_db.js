const pool = require('./src/config/db');

const guncelle = async () => {
    try {
        await pool.query(`
            ALTER TABLE personeller 
            ADD COLUMN IF NOT EXISTS email VARCHAR(100),
            ADD COLUMN IF NOT EXISTS telefon VARCHAR(15),
            ADD COLUMN IF NOT EXISTS adres TEXT,
            ADD COLUMN IF NOT EXISTS adres_belgesi_yol TEXT,
            ADD COLUMN IF NOT EXISTS src_tarih DATE,
            ADD COLUMN IF NOT EXISTS src_belgesi_yol TEXT,
            ADD COLUMN IF NOT EXISTS psiko_tarih DATE,
            ADD COLUMN IF NOT EXISTS psiko_belgesi_yol TEXT,
            ADD COLUMN IF NOT EXISTS ehliyet_tarih DATE,
            ADD COLUMN IF NOT EXISTS ehliyet_belgesi_yol TEXT;
        `);
        console.log("✅ Tablo sütunları eklendi!");
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};
guncelle();