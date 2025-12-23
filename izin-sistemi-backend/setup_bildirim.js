const pool = require('./src/config/db');

const tabloyuKur = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS bildirimler (
                id SERIAL PRIMARY KEY,
                personel_id INT,
                baslik VARCHAR(100),
                mesaj TEXT,
                okundu BOOLEAN DEFAULT FALSE,
                tarih TIMESTAMP DEFAULT NOW()
            );
        `);
        console.log("✅ Bildirim tablosu eklendi.");
    } catch (err) {
        console.error(err);
    }
};
tabloyuKur();