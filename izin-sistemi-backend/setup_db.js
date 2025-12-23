const pool = require('./src/config/db');
const bcrypt = require('bcrypt');

const sistemiKur = async () => {
    const client = await pool.connect();
    try {
        console.log("⏳ SİSTEM SIFIRLANIYOR...");

        // 1. TEMİZLİK
        await client.query("TRUNCATE TABLE birimler RESTART IDENTITY CASCADE");
        await client.query("TRUNCATE TABLE roller RESTART IDENTITY CASCADE");
        
        console.log("🧹 Tablolar temizlendi.");

        // 2. ROLLER
        await client.query(`INSERT INTO roller (rol_adi) VALUES ('personel'), ('amir'), ('yazici'), ('ik'), ('admin')`);

        // 3. AMİRLİKLER (İSTEDİĞİN 7 BİRİM)
        const birimler = [
            'İDARİ PERSONEL', // ID: 1
            'MEŞOT',          // ID: 2
            'KARACAİLYAS',    // ID: 3
            'ESKİ MEZİTLİ',   // ID: 4
            'TECE',           // ID: 5
            'KOCAVİLAYET',    // ID: 6
            'ŞOFÖR HAVUZU'    // ID: 7
        ];

        for (let birim of birimler) {
            await client.query(`INSERT INTO birimler (birim_adi) VALUES ($1)`, [birim]);
        }
        console.log("🏢 7 Amirlik oluşturuldu.");

        // 4. KULLANICILAR
        const sifre = await bcrypt.hash('123456', 10);
        
        const users = [
            // MEŞOT
            { tc: '12345678912', ad: 'Hüseyin', soyad: 'ARKAN', rol: 'personel', birim: 'MEŞOT' },
            { tc: '12345678913', ad: 'Halil', soyad: 'YALÇIN', rol: 'yazici', birim: 'MEŞOT' },
            { tc: '12345678914', ad: 'Seyhun', soyad: 'ÖZER', rol: 'amir', birim: 'MEŞOT' },

            // İDARİ PERSONEL (İK & ADMİN)
            { tc: '12345678915', ad: 'Dilek', soyad: 'YILMAZ', rol: 'ik', birim: 'İDARİ PERSONEL' },
            { tc: '12345678919', ad: 'Emine', soyad: 'ŞİMŞEK', rol: 'ik', birim: 'İDARİ PERSONEL' },
            { tc: '11111111111', ad: 'Sistem', soyad: 'ADMIN', rol: 'admin', birim: 'İDARİ PERSONEL' },

            // KARACAİLYAS
            { tc: '12345678916', ad: 'Oğuzhan', soyad: 'ÖZLÜ', rol: 'personel', birim: 'KARACAİLYAS' },
            { tc: '12345678917', ad: 'Okan', soyad: 'ÇELİK', rol: 'yazici', birim: 'KARACAİLYAS' },
            { tc: '12345678918', ad: 'Abuzer', soyad: 'KAYİ', rol: 'amir', birim: 'KARACAİLYAS' },

            // ESKİ MEZİTLİ
            { tc: '12345678920', ad: 'Bahar', soyad: 'CANATAN', rol: 'personel', birim: 'ESKİ MEZİTLİ' },
            { tc: '12345678924', ad: 'Rıza', soyad: 'GÜNEŞ', rol: 'yazici', birim: 'ESKİ MEZİTLİ' },
            { tc: '12345678925', ad: 'Muhammed', soyad: 'BACANAK', rol: 'amir', birim: 'ESKİ MEZİTLİ' },

            // TECE
            { tc: '12345678923', ad: 'Nisa Nur', soyad: 'CEBİŞ', rol: 'personel', birim: 'TECE' },
            { tc: '12345678921', ad: 'Karayel', soyad: 'MİMAROĞLU', rol: 'yazici', birim: 'TECE' },
            { tc: '12345678922', ad: 'Burhan', soyad: 'CEYLAN', rol: 'amir', birim: 'TECE' },

            // KOCAVİLAYET
            { tc: '12345678926', ad: 'Caner', soyad: 'AÇIKGÜL', rol: 'personel', birim: 'KOCAVİLAYET' },
            { tc: '12345678927', ad: 'Ferhat', soyad: 'CİVCİK', rol: 'yazici', birim: 'KOCAVİLAYET' },
            { tc: '12345678928', ad: 'Mehmet Özgür', soyad: 'YALÇIN', rol: 'amir', birim: 'KOCAVİLAYET' },

            // ŞOFÖR HAVUZU
            { tc: '12345678929', ad: 'Ali', soyad: 'KALENDER', rol: 'personel', birim: 'ŞOFÖR HAVUZU' },
            { tc: '12345678930', ad: 'Kemal', soyad: 'KARACAN', rol: 'amir', birim: 'ŞOFÖR HAVUZU' },
            { tc: '12345678931', ad: 'Deniz', soyad: 'DEMİREL', rol: 'yazici', birim: 'ŞOFÖR HAVUZU' }
        ];

        console.log("👥 Personeller ekleniyor...");
        for (let u of users) {
            // ID'leri bul
            const rolId = (await client.query("SELECT rol_id FROM roller WHERE rol_adi = $1", [u.rol])).rows[0].rol_id;
            const birimId = (await client.query("SELECT birim_id FROM birimler WHERE birim_adi = $1", [u.birim])).rows[0].birim_id;

            // Ekle
            await client.query(`
                INSERT INTO personeller (tc_no, ad, soyad, sifre_hash, rol_id, birim_id)
                VALUES ($1, $2, $3, $4, $5, $6)
            `, [u.tc, u.ad, u.soyad, sifre, rolId, birimId]);
        }

        console.log("✅ TÜM KURULUM TAMAMLANDI! SİSTEM HAZIR.");

    } catch (err) {
        console.error("❌ Hata:", err);
    } finally {
        client.release();
        process.exit();
    }
};

sistemiKur();