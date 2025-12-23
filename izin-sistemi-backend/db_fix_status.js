const pool = require('./src/config/db');
const bcrypt = require('bcrypt');

const tamKurulum = async () => {
    const client = await pool.connect();
    try {
        console.log("⏳ SİSTEM SIFIRLANIYOR VE FABRİKA AYARLARINA DÖNÜYOR...");

        // 1. TEMİZLİK (Eski tabloları sil)
        await client.query("DROP TABLE IF EXISTS profil_degisiklikleri CASCADE");
        await client.query("DROP TABLE IF EXISTS bildirimler CASCADE");
        await client.query("DROP TABLE IF EXISTS imzalar CASCADE");
        await client.query("DROP TABLE IF EXISTS izin_talepleri CASCADE");
        await client.query("DROP TABLE IF EXISTS personeller CASCADE");
        await client.query("DROP TABLE IF EXISTS roller CASCADE");
        await client.query("DROP TABLE IF EXISTS birimler CASCADE");
        await client.query("DROP TABLE IF EXISTS resmi_tatiller CASCADE");
        
        console.log("🧹 Tablolar temizlendi.");

        // 2. TABLOLARI OLUŞTUR
        await client.query(`CREATE TABLE birimler (birim_id SERIAL PRIMARY KEY, birim_adi VARCHAR(100) NOT NULL)`);
        await client.query(`CREATE TABLE roller (rol_id SERIAL PRIMARY KEY, rol_adi VARCHAR(50) UNIQUE NOT NULL)`);

        await client.query(`
            CREATE TABLE personeller (
                personel_id SERIAL PRIMARY KEY,
                tc_no VARCHAR(11) NOT NULL UNIQUE,
                ad VARCHAR(50) NOT NULL,
                soyad VARCHAR(50) NOT NULL,
                sifre_hash TEXT NOT NULL,
                rol_id INT REFERENCES roller(rol_id),
                birim_id INT REFERENCES birimler(birim_id),
                
                email VARCHAR(100),
                telefon VARCHAR(15),
                adres TEXT,
                
                src_tarih DATE,
                psiko_tarih DATE,
                ehliyet_tarih DATE,
                
                adres_belgesi_yol TEXT,
                src_belgesi_yol TEXT,
                psiko_belgesi_yol TEXT,
                ehliyet_belgesi_yol TEXT,

                -- ÖNEMLİ: Varsayılan değer TRUE (Çalışıyor)
                aktif BOOLEAN DEFAULT TRUE,
                ayrilma_nedeni VARCHAR(100),
                ayrilma_tarihi DATE,

                izin_gunu VARCHAR(10)
            );
        `);

        // Diğer tablolar (Aynı)
        await client.query(`CREATE TABLE izin_talepleri (talep_id SERIAL PRIMARY KEY, personel_id INT REFERENCES personeller(personel_id) ON DELETE CASCADE, baslangic_tarihi DATE NOT NULL, bitis_tarihi DATE NOT NULL, kac_gun INT NOT NULL, izin_turu VARCHAR(50) NOT NULL, aciklama TEXT, durum VARCHAR(30) DEFAULT 'ONAY_BEKLIYOR', olusturma_tarihi TIMESTAMP DEFAULT NOW(), haftalik_izin_gunu VARCHAR(20), ise_baslama_tarihi DATE, izin_adresi TEXT, personel_imza TEXT);`);
        await client.query(`CREATE TABLE imzalar (imza_id SERIAL PRIMARY KEY, personel_id INT REFERENCES personeller(personel_id), talep_id INT, imza_data TEXT NOT NULL, tarih TIMESTAMP DEFAULT NOW());`);
        await client.query(`CREATE TABLE bildirimler (id SERIAL PRIMARY KEY, personel_id INT REFERENCES personeller(personel_id), baslik VARCHAR(100), mesaj TEXT, okundu BOOLEAN DEFAULT FALSE, tarih TIMESTAMP DEFAULT NOW());`);
        await client.query(`CREATE TABLE profil_degisiklikleri (id SERIAL PRIMARY KEY, personel_id INT REFERENCES personeller(personel_id), yeni_veri JSONB, dosya_yollari JSONB, durum VARCHAR(20) DEFAULT 'BEKLIYOR', talep_tarihi TIMESTAMP DEFAULT NOW());`);
        await client.query(`CREATE TABLE resmi_tatiller (id SERIAL PRIMARY KEY, tarih DATE NOT NULL UNIQUE, aciklama VARCHAR(100));`);

        console.log("🏗️ Tablolar oluşturuldu.");

        // 3. VERİLERİ EKLE
        await client.query(`INSERT INTO roller (rol_adi) VALUES ('personel'), ('amir'), ('yazici'), ('ik'), ('admin')`);

        const birimler = ['İDARİ PERSONEL', 'MEŞOT', 'KARACAİLYAS', 'ESKİ MEZİTLİ', 'TECE', 'KOCAVİLAYET', 'ŞOFÖR HAVUZU'];
        for (let b of birimler) await client.query(`INSERT INTO birimler (birim_adi) VALUES ($1)`, [b]);

        const sifre = await bcrypt.hash('123456', 10);
        
        // KULLANICI LİSTESİ (SENİN LİSTEN)
        const users = [
            { tc: '12345678912', ad: 'Hüseyin', soyad: 'ARKAN', rol: 'personel', birim: 'MEŞOT' },
            { tc: '12345678913', ad: 'Halil', soyad: 'YALÇIN', rol: 'yazici', birim: 'MEŞOT' },
            { tc: '12345678914', ad: 'Seyhun', soyad: 'ÖZER', rol: 'amir', birim: 'MEŞOT' },
            { tc: '12345678915', ad: 'Dilek', soyad: 'YILMAZ', rol: 'ik', birim: 'İDARİ PERSONEL' },
            { tc: '12345678919', ad: 'Emine', soyad: 'ŞİMŞEK', rol: 'ik', birim: 'İDARİ PERSONEL' },
            { tc: '12345678916', ad: 'Oğuzhan', soyad: 'ÖZLÜ', rol: 'personel', birim: 'KARACAİLYAS' },
            { tc: '12345678917', ad: 'Okan', soyad: 'ÇELİK', rol: 'yazici', birim: 'KARACAİLYAS' },
            { tc: '12345678918', ad: 'Abuzer', soyad: 'KAYİ', rol: 'amir', birim: 'KARACAİLYAS' },
            { tc: '12345678920', ad: 'Bahar', soyad: 'CANATAN', rol: 'personel', birim: 'ESKİ MEZİTLİ' },
            { tc: '12345678924', ad: 'Rıza', soyad: 'GÜNEŞ', rol: 'yazici', birim: 'ESKİ MEZİTLİ' },
            { tc: '12345678925', ad: 'Muhammed', soyad: 'BACANAK', rol: 'amir', birim: 'ESKİ MEZİTLİ' },
            { tc: '12345678923', ad: 'Nisa Nur', soyad: 'CEBİŞ', rol: 'personel', birim: 'TECE' },
            { tc: '12345678921', ad: 'Karayel', soyad: 'MİMAROĞLU', rol: 'yazici', birim: 'TECE' },
            { tc: '12345678922', ad: 'Burhan', soyad: 'CEYLAN', rol: 'amir', birim: 'TECE' },
            { tc: '12345678926', ad: 'Caner', soyad: 'AÇIKGÜL', rol: 'personel', birim: 'KOCAVİLAYET' },
            { tc: '12345678927', ad: 'Ferhat', soyad: 'CİVCİK', rol: 'yazici', birim: 'KOCAVİLAYET' },
            { tc: '12345678928', ad: 'Mehmet Özgür', soyad: 'YALÇIN', rol: 'amir', birim: 'KOCAVİLAYET' },
            { tc: '12345678929', ad: 'Ali', soyad: 'KALENDER', rol: 'personel', birim: 'ŞOFÖR HAVUZU' },
            { tc: '12345678930', ad: 'Kemal', soyad: 'KARACAN', rol: 'amir', birim: 'ŞOFÖR HAVUZU' },
            { tc: '12345678931', ad: 'Deniz', soyad: 'DEMİREL', rol: 'yazici', birim: 'ŞOFÖR HAVUZU' },
            { tc: '11111111111', ad: 'Sistem', soyad: 'ADMIN', rol: 'admin', birim: 'İDARİ PERSONEL' }
        ];

        console.log("👥 Personeller ekleniyor...");
        for (let u of users) {
            const rolId = (await client.query("SELECT rol_id FROM roller WHERE rol_adi = $1", [u.rol])).rows[0].rol_id;
            const birimId = (await client.query("SELECT birim_id FROM birimler WHERE birim_adi = $1", [u.birim])).rows[0].birim_id;

            // 🔥 KRİTİK: aktif sütununa 'TRUE' değerini zorla gönderiyoruz
            await client.query(`
                INSERT INTO personeller (tc_no, ad, soyad, sifre_hash, rol_id, birim_id, aktif)
                VALUES ($1, $2, $3, $4, $5, $6, TRUE)
            `, [u.tc, u.ad, u.soyad, sifre, rolId, birimId]);
        }

        console.log("✅ KURULUM TAMAMLANDI! TÜM PERSONEL 'ÇALIŞIYOR' (AKTİF) DURUMDA.");

    } catch (err) {
        console.error("❌ Hata:", err);
    } finally {
        client.release();
        process.exit();
    }
};

tamKurulum();