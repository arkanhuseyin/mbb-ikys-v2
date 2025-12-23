const pool = require('./src/config/db');

const ekle = async () => {
    try {
        // 'filo' rolünü ekle (Eğer yoksa)
        await pool.query(`INSERT INTO roller (rol_adi) VALUES ('filo') ON CONFLICT (rol_adi) DO NOTHING`);
        console.log("✅ 'filo' rolü eklendi.");
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};
ekle();