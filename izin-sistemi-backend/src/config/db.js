const { Pool } = require('pg');
require('dotenv').config();

// Veritabanı bağlantı ayarı
// Render.com veya .env dosyasındaki DATABASE_URL'i kullanır.
const connectionString = process.env.DATABASE_URL;

const pool = new Pool({
    connectionString: connectionString,
    ssl: {
        rejectUnauthorized: false // Neon.tech ve Render için bu SSL ayarı ZORUNLUDUR!
    }
});

pool.on('connect', () => {
    console.log('✅ Canlı Veritabanına (Neon) başarıyla bağlanıldı!');
});

pool.on('error', (err) => {
    console.error('❌ Veritabanı bağlantı hatası:', err);
    process.exit(-1);
});

module.exports = pool;