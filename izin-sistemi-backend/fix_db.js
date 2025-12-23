const pool = require('./src/config/db');

const duzelt = async () => {
    try {
        // İmzalar tablosuna talep_id ekliyoruz
        await pool.query(`
            ALTER TABLE imzalar 
            ADD COLUMN IF NOT EXISTS talep_id INT;
        `);
        console.log("✅ Tablo güncellendi: talep_id eklendi.");
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};
duzelt();