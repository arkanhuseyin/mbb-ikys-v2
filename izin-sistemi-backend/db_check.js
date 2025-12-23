const pool = require('./src/config/db');

const kontrolEt = async () => {
    try {
        const res = await pool.query('SELECT * FROM birimler');
        console.log("📊 VERİTABANINDAKİ BİRİMLER:");
        console.table(res.rows);
        process.exit();
    } catch (e) {
        console.error("❌ HATA:", e);
        process.exit(1);
    }
};
kontrolEt();