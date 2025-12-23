const pool = require('./src/config/db');

const tabloyuKur = async () => {
    try {
        // Bu tablo, personelin değiştirmek istediği verileri geçici olarak tutar
        await pool.query(`
            CREATE TABLE IF NOT EXISTS profil_degisiklikleri (
                id SERIAL PRIMARY KEY,
                personel_id INT REFERENCES personeller(personel_id),
                yeni_veri JSONB, -- Telefon, adres, email gibi veriler burada JSON olarak duracak
                dosya_yollari JSONB, -- Yüklenen PDF yolları burada duracak
                durum VARCHAR(20) DEFAULT 'BEKLIYOR', -- BEKLIYOR, ONAYLANDI, REDDEDILDI
                talep_tarihi TIMESTAMP DEFAULT NOW()
            );
        `);
        console.log("✅ Profil Onay Havuzu tablosu kuruldu!");
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};
tabloyuKur();