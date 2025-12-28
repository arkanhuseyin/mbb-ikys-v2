const pool = require('../config/db');

// --- YARDIMCI: Excel Tarihini Düzeltme Fonksiyonu ---
// Excel bazen tarihleri 44562 gibi sayılar olarak verir. Bunu düzeltir.
function excelDateToJSDate(serial) {
    if (!serial) return null;
    // Eğer zaten String formatındaysa (1990-05-20) dokunma
    if (typeof serial === 'string' && serial.includes('-')) return serial;
    
    // Sayı ise (Excel Serial Date)
    const utc_days  = Math.floor(serial - 25569);
    const utc_value = utc_days * 86400;                                        
    const date_info = new Date(utc_value * 1000);
    return date_info.toISOString().split('T')[0]; // YYYY-MM-DD formatına çevir
}

// 1. TOPLU PERSONEL YÜKLEME (EXCEL)
exports.topluYukle = async (req, res) => {
    const personeller = req.body; // Excel'den gelen JSON verisi
    
    if (!Array.isArray(personeller) || personeller.length === 0) {
        return res.status(400).json({ mesaj: 'Yüklenecek veri bulunamadı.' });
    }

    const client = await pool.connect(); // Transaction başlatıyoruz
    
    try {
        await client.query('BEGIN'); // İşlemi başlat

        let eklenenSayisi = 0;
        let guncellenenSayisi = 0;

        for (const p of personeller) {
            // Zorunlu alan kontrolü
            if (!p.TC) continue; // TC yoksa o satırı atla

            // 1. BİRİM BUL VEYA OLUŞTUR (Metni ID'ye çevir)
            let birimId = null;
            if (p.GOREVLI_OLDUGU_BIRIM) {
                const birimRes = await client.query(
                    'SELECT birim_id FROM birimler WHERE birim_adi = $1', 
                    [p.GOREVLI_OLDUGU_BIRIM.trim()]
                );
                
                if (birimRes.rows.length > 0) {
                    birimId = birimRes.rows[0].birim_id;
                } else {
                    // Birim yoksa otomatik ekle
                    const yeniBirim = await client.query(
                        'INSERT INTO birimler (birim_adi) VALUES ($1) RETURNING birim_id',
                        [p.GOREVLI_OLDUGU_BIRIM.trim()]
                    );
                    birimId = yeniBirim.rows[0].birim_id;
                }
            }

            // 2. ROL BELİRLE (Varsayılan: personel)
            // Excel'de rol sütunu yoksa otomatik 'personel' yaparız.
            // Eğer "UNVANI" içinde "Müdür" geçiyorsa 'amir' yapabiliriz (Opsiyonel zeka)
            let rolId = 2; // Varsayılan: personel ID'si (SQL'de 2 olarak eklemiştik)
            
            // 3. TARİHLERİ DÜZELT
            const dogumTarihi = excelDateToJSDate(p.DOGUM_TARIHI);
            const iseGiris = excelDateToJSDate(p.ISE_GIRIS_TARIHI);
            const ehliyetBitis = excelDateToJSDate(p.EHLIYET_BITIS_TARIHI);

            // 4. VERİTABANINA KAYDET (UPSERT: Varsa Güncelle, Yoksa Ekle)
            // Şifre varsayılan: 123456 (Hashli hali)
            const defaultPass = '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWrn96pzvPedTRcnogv3P1mtZhm.bm';

            const insertQuery = `
                INSERT INTO personeller (
                    tc_no, ad, soyad, gorevi, unvani, telefon, 
                    adres, email, ise_giris_tarihi, 
                    birim_id, rol_id, sifre_hash, aktif
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, 
                    $7, $8, $9, 
                    $10, $11, $12, TRUE
                )
                ON CONFLICT (tc_no) DO UPDATE SET
                    ad = EXCLUDED.ad,
                    soyad = EXCLUDED.soyad,
                    gorevi = EXCLUDED.gorevi,
                    unvani = EXCLUDED.unvani,
                    birim_id = EXCLUDED.birim_id,
                    ise_giris_tarihi = EXCLUDED.ise_giris_tarihi;
            `;

            await client.query(insertQuery, [
                String(p.TC), 
                p.ADI, 
                p.SOYADI, 
                p.GOREVI, 
                p.UNVANI, 
                String(p.TELEFON || ''), 
                p.ADRES, 
                p.EMAIL || '', // Excel'de email sütunu yoksa boş geç
                iseGiris,
                birimId,
                rolId,
                defaultPass
            ]);
            
            eklenenSayisi++;
        }

        await client.query('COMMIT'); // Hata yoksa işlemi onayla
        res.json({ mesaj: `İşlem Başarılı! Toplam ${eklenenSayisi} kişi işlendi.` });

    } catch (err) {
        await client.query('ROLLBACK'); // Hata varsa her şeyi geri al
        console.error("Toplu Yükleme Hatası:", err);
        res.status(500).json({ mesaj: 'Veri yüklenirken hata oluştu: ' + err.message });
    } finally {
        client.release();
    }
};

// 2. TALEP OLUŞTURMA (Profil Güncelleme İsteği)
exports.talepOlustur = async (req, res) => {
    const { personel_id } = req.user; // Token'dan gelen ID
    const { telefon, email, adres, src_tarih, psiko_tarih, ehliyet_tarih, sifre } = req.body;
    
    // Dosya yolları (Eğer dosya yüklendiyse)
    const files = req.files || {};
    const dosya_yollari = {
        adres_belgesi_yol: files.adres_belgesi ? files.adres_belgesi[0].path : null,
        src_belgesi_yol: files.src_belgesi ? files.src_belgesi[0].path : null,
        psiko_belgesi_yol: files.psiko_belgesi ? files.psiko_belgesi[0].path : null,
        ehliyet_belgesi_yol: files.ehliyet_belgesi ? files.ehliyet_belgesi[0].path : null
    };

    // Şifre değişikliği istenmişse hashle
    let sifre_hash = null;
    if (sifre) {
        const bcrypt = require('bcrypt');
        const salt = await bcrypt.genSalt(10);
        sifre_hash = await bcrypt.hash(sifre, salt);
    }

    const yeni_veri = { telefon, email, adres, src_tarih, psiko_tarih, ehliyet_tarih, sifre_hash };

    try {
        await pool.query(
            `INSERT INTO profil_guncelleme_talepleri (personel_id, yeni_veri, dosya_yollari) 
             VALUES ($1, $2, $3)`,
            [personel_id, yeni_veri, dosya_yollari]
        );
        res.json({ mesaj: 'Güncelleme talebiniz başarıyla gönderildi.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ mesaj: 'Talep oluşturulurken hata.' });
    }
};

// 3. TALEPLERİ LİSTELE (Sadece Admin/İK/Filo)
exports.getTalepler = async (req, res) => {
    if (!['admin', 'ik', 'filo'].includes(req.user.rol)) return res.status(403).json({ mesaj: 'Yetkisiz' });

    try {
        const result = await pool.query(`
            SELECT t.*, p.ad, p.soyad, p.tc_no 
            FROM profil_guncelleme_talepleri t
            JOIN personeller p ON t.personel_id = p.personel_id
            WHERE t.durum = 'BEKLIYOR'
            ORDER BY t.talep_tarihi DESC
        `);
        res.json(result.rows);
    } catch (err) { console.error(err); res.status(500).json({ mesaj: 'Hata' }); }
};

// 4. TALEP ONAYLA / REDDET
exports.talepIslem = async (req, res) => {
    if (!['admin', 'ik', 'filo'].includes(req.user.rol)) return res.status(403).json({ mesaj: 'Yetkisiz' });
    const { id, islem } = req.body; // islem: 'ONAYLA' veya 'REDDET'

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Talebi bul
        const talepRes = await client.query('SELECT * FROM profil_guncelleme_talepleri WHERE id = $1', [id]);
        if (talepRes.rows.length === 0) throw new Error('Talep bulunamadı');
        const talep = talepRes.rows[0];

        if (islem === 'ONAYLA') {
            const veri = talep.yeni_veri;
            // Personel tablosunu güncelle
            // Dinamik query oluşturmak yerine basitçe alanları kontrol edip güncelliyoruz
            if(veri.telefon) await client.query('UPDATE personeller SET telefon = $1 WHERE personel_id = $2', [veri.telefon, talep.personel_id]);
            if(veri.email) await client.query('UPDATE personeller SET email = $1 WHERE personel_id = $2', [veri.email, talep.personel_id]);
            if(veri.adres) await client.query('UPDATE personeller SET adres = $1 WHERE personel_id = $2', [veri.adres, talep.personel_id]);
            if(veri.sifre_hash) await client.query('UPDATE personeller SET sifre_hash = $1 WHERE personel_id = $2', [veri.sifre_hash, talep.personel_id]);
            // Not: SRC, Ehliyet tarihleri için personeller tablosunda sütun varsa güncellenmeli.
            
            await client.query("UPDATE profil_guncelleme_talepleri SET durum = 'ONAYLANDI' WHERE id = $1", [id]);
        } else {
            await client.query("UPDATE profil_guncelleme_talepleri SET durum = 'REDDEDILDI' WHERE id = $1", [id]);
        }

        await client.query('COMMIT');
        res.json({ mesaj: 'İşlem başarılı.' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ mesaj: 'İşlem başarısız.' });
    } finally {
        client.release();
    }
};

// 5. BİRİMLERİ GETİR
exports.getBirimler = async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM birimler ORDER BY birim_adi ASC');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ mesaj: 'Birimler çekilemedi' });
    }
};

// 6. PERSONEL TRANSFER ET (Birim Değiştir)
exports.transferPersonel = async (req, res) => {
    if (!['admin', 'ik'].includes(req.user.rol)) return res.status(403).json({ mesaj: 'Yetkisiz' });
    const { personel_id, yeni_birim_id } = req.body;
    try {
        await pool.query('UPDATE personeller SET birim_id = $1 WHERE personel_id = $2', [yeni_birim_id, personel_id]);
        res.json({ mesaj: 'Transfer başarılı.' });
    } catch (err) { res.status(500).json({ mesaj: 'Hata' }); }
};

// 7. ROL DEĞİŞTİR
exports.rolDegistir = async (req, res) => {
    if (req.user.rol !== 'admin') return res.status(403).json({ mesaj: 'Sadece Admin yapabilir.' });
    const { personel_id, yeni_rol_adi } = req.body;
    try {
        const rolRes = await pool.query('SELECT rol_id FROM roller WHERE rol_adi = $1', [yeni_rol_adi]);
        if (rolRes.rows.length === 0) return res.status(400).json({ mesaj: 'Geçersiz rol.' });
        
        await pool.query('UPDATE personeller SET rol_id = $1 WHERE personel_id = $2', [rolRes.rows[0].rol_id, personel_id]);
        res.json({ mesaj: 'Rol güncellendi.' });
    } catch (err) { res.status(500).json({ mesaj: 'Hata' }); }
};

// 8. PERSONEL DONDUR / PASİF AL
exports.dondurPersonel = async (req, res) => {
    if (!['admin', 'ik'].includes(req.user.rol)) return res.status(403).json({ mesaj: 'Yetkisiz' });
    const { personel_id, neden } = req.body;
    try {
        await pool.query('UPDATE personeller SET aktif = FALSE, ayrilma_nedeni = $1 WHERE personel_id = $2', [neden, personel_id]);
        res.json({ mesaj: 'Personel pasife alındı.' });
    } catch (err) { res.status(500).json({ mesaj: 'Hata' }); }
};

// 9. PERSONEL AKTİF ET
exports.aktifEtPersonel = async (req, res) => {
    if (!['admin', 'ik'].includes(req.user.rol)) return res.status(403).json({ mesaj: 'Yetkisiz' });
    const { personel_id } = req.body;
    try {
        await pool.query('UPDATE personeller SET aktif = TRUE, ayrilma_nedeni = NULL WHERE personel_id = $2', [personel_id]);
        res.json({ mesaj: 'Personel tekrar aktif edildi.' });
    } catch (err) { res.status(500).json({ mesaj: 'Hata' }); }
};

// 10. PERSONEL SİL (Kalıcı)
exports.silPersonel = async (req, res) => {
    if (req.user.rol !== 'admin') return res.status(403).json({ mesaj: 'Sadece Admin silebilir.' });
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM personeller WHERE personel_id = $1', [id]);
        res.json({ mesaj: 'Personel silindi.' });
    } catch (err) { res.status(500).json({ mesaj: 'Hata: Bağlı kayıtlar olabilir.' }); }
};