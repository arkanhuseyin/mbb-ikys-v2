const pool = require('./src/config/db');
const bcrypt = require('bcrypt');

const sistemiKur = async () => {
    const client = await pool.connect();
    try {
        console.log("⏳ Sistem sıfırlanıyor...");

        // 1. ESKİ TABLOLARI SİL (Hata vermemesi için CASCADE kullanıyoruz)
        await client.query(`
            DROP TABLE IF EXISTS bildirimler CASCADE;
            DROP TABLE IF EXISTS imzalar CASCADE;
            DROP TABLE IF EXISTS izin_talepleri CASCADE;
            DROP TABLE IF EXISTS personeller CASCADE;
            DROP TABLE IF EXISTS roller CASCADE;
            DROP TABLE IF EXISTS birimler CASCADE;
        `);

        console.log("🏗️ Tablolar yeniden oluşturuluyor...");

        // 2. TABLOLARI OLUŞTUR
        await client.query(`
            -- Birimler
            CREATE TABLE birimler (
                birim_id SERIAL PRIMARY KEY,
                birim_adi VARCHAR(100) NOT NULL
            );

            -- Roller
            CREATE TABLE roller (
                rol_id SERIAL PRIMARY KEY,
                rol_adi VARCHAR(50) UNIQUE NOT NULL
            );

            -- Personeller
            CREATE TABLE personeller (
                personel_id SERIAL PRIMARY KEY,
                tc_no VARCHAR(11) NOT NULL UNIQUE,
                ad VARCHAR(50) NOT NULL,
                soyad VARCHAR(50) NOT NULL,
                birim_id INT REFERENCES birimler(birim_id),
                sifre_hash TEXT NOT NULL,
                rol_id INT REFERENCES roller(rol_id),
                izin_gunu VARCHAR(10),
                aktif BOOLEAN DEFAULT TRUE
            );

            -- İzin Talepleri
            CREATE TABLE izin_talepleri (
                talep_id SERIAL PRIMARY KEY,
                personel_id INT REFERENCES personeller(personel_id),
                baslangic_tarihi DATE NOT NULL,
                bitis_tarihi DATE NOT NULL,
                kac_gun INT NOT NULL,
                izin_turu VARCHAR(20) NOT NULL,
                aciklama TEXT,
                durum VARCHAR(30) DEFAULT 'ONAY_BEKLIYOR',
                olusturma_tarihi TIMESTAMP DEFAULT NOW()
            );

            -- İmzalar
            CREATE TABLE imzalar (
                imza_id SERIAL PRIMARY KEY,
                personel_id INT REFERENCES personeller(personel_id),
                imza_data TEXT NOT NULL,
                tarih TIMESTAMP DEFAULT NOW()
            );

            -- Bildirimler
            CREATE TABLE bildirimler (
                id SERIAL PRIMARY KEY,
                personel_id INT REFERENCES personeller(personel_id),
                baslik VARCHAR(100),
                mesaj TEXT,
                okundu BOOLEAN DEFAULT FALSE,
                tarih TIMESTAMP DEFAULT NOW()
            );
        `);

        console.log("👥 Kullanıcılar ekleniyor...");

        // 3. VERİLERİ EKLE
        // Rolleri Ekle
        await client.query(`INSERT INTO roller (rol_adi) VALUES ('personel'), ('amir'), ('yazici'), ('ik'), ('admin')`);
        
        // Birimleri Ekle
        await client.query(`INSERT INTO birimler (birim_id, birim_adi) VALUES (1, 'Karacailyas'), (2, 'Personel İşleri')`);

        // Şifre Oluştur (Hepsi için 123456)
        const sifre = await bcrypt.hash('123456', 10);

        // Kullanıcı Listesi
        const users = [
            { tc: '12345678912', ad: 'Hüseyin', soyad: 'ARKAN', rol: 'personel', birim: 1 },
            { tc: '12345678913', ad: 'Mehmet', soyad: 'BAŞŞOFÖR', rol: 'amir', birim: 1 },
            { tc: '12345678914', ad: 'Ahmet', soyad: 'YAZICI', rol: 'yazici', birim: 1 },
            { tc: '12345678915', ad: 'Ayşe', soyad: 'İK', rol: 'ik', birim: 2 },
            { tc: '11111111111', ad: 'Sistem', soyad: 'ADMIN', rol: 'admin', birim: 1 }
        ];

        for (let u of users) {
            // Rol ID'sini çek
            const rolRes = await client.query("SELECT rol_id FROM roller WHERE rol_adi = $1", [u.rol]);
            const rolId = rolRes.rows[0].rol_id;

            // Kullanıcıyı kaydet
            await client.query(`
                INSERT INTO personeller (tc_no, ad, soyad, sifre_hash, rol_id, birim_id) 
                VALUES ($1, $2, $3, $4, $5, $6)
            `, [u.tc, u.ad, u.soyad, sifre, rolId, u.birim]);
            
            console.log(`➕ Eklendi: ${u.ad} ${u.soyad} (${u.rol})`);
        }

        console.log("✅ KURULUM TAMAMLANDI! TESTE BAŞLAYABİLİRSİN.");
        process.exit(0);

    } catch (err) {
        console.error("❌ Hata:", err);
        process.exit(1);
    } finally {
        client.release();
    }
};

sistemiKur();