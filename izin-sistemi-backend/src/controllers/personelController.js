const pool = require('../config/db');

// 1. TÜM BİRİMLERİ GETİR (Dropdown İçin)
exports.birimleriGetir = async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM birimler ORDER BY birim_id ASC');
        if (!result.rows) return res.json([]);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).send('Birim listesi alınamadı.');
    }
};

// 2. PERSONEL TRANSFER ET
exports.birimGuncelle = async (req, res) => {
    if (!['admin', 'ik', 'yazici', 'filo'].includes(req.user.rol)) {
        return res.status(403).json({ mesaj: 'Yetkisiz işlem' });
    }
    const { personel_id, yeni_birim_id } = req.body;
    try {
        await pool.query('UPDATE personeller SET birim_id = $1 WHERE personel_id = $2', [yeni_birim_id, personel_id]);
        const birimRes = await pool.query('SELECT birim_adi FROM birimler WHERE birim_id = $1', [yeni_birim_id]);
        res.json({ mesaj: `Personel '${birimRes.rows[0]?.birim_adi}' birimine transfer edildi.` });
    } catch (err) { res.status(500).json({ mesaj: 'Hata oluştu.' }); }
};

// 3. PERSONELİ DONDUR (Pasife Al)
exports.personelDondur = async (req, res) => {
    if (!['admin', 'ik', 'filo'].includes(req.user.rol)) return res.status(403).json({ mesaj: 'Yetkisiz işlem' });
    
    const { personel_id, neden } = req.body;
    try {
        await pool.query(
            `UPDATE personeller SET aktif = FALSE, ayrilma_nedeni = $1, ayrilma_tarihi = NOW() WHERE personel_id = $2`,
            [neden, personel_id]
        );
        res.json({ mesaj: 'Personel üyeliği donduruldu (Pasife Alındı).' });
    } catch (err) { 
        console.error(err);
        res.status(500).json({ mesaj: 'Hata oluştu.' }); 
    }
};

// 4. PERSONELİ AKTİF ET
exports.personelAktifEt = async (req, res) => {
    if (!['admin', 'ik', 'filo'].includes(req.user.rol)) return res.status(403).json({ mesaj: 'Yetkisiz işlem' });
    
    const { personel_id } = req.body;
    try {
        await pool.query(
            `UPDATE personeller SET aktif = TRUE, ayrilma_nedeni = NULL, ayrilma_tarihi = NULL WHERE personel_id = $1`,
            [personel_id]
        );
        res.json({ mesaj: 'Personel tekrar aktif edildi.' });
    } catch (err) { res.status(500).json({ mesaj: 'Hata' }); }
};

// 5. ROL DEĞİŞTİR
exports.rolGuncelle = async (req, res) => {
    if (req.user.rol !== 'admin') return res.status(403).json({ mesaj: 'Sadece Admin rol değiştirebilir.' });
    const { personel_id, yeni_rol_adi } = req.body;
    try {
        const rolRes = await pool.query('SELECT rol_id FROM roller WHERE rol_adi = $1', [yeni_rol_adi]);
        if(rolRes.rows.length === 0) return res.status(400).json({mesaj:'Geçersiz rol'});
        await pool.query('UPDATE personeller SET rol_id = $1 WHERE personel_id = $2', [rolRes.rows[0].rol_id, personel_id]);
        res.json({ mesaj: 'Rol başarıyla güncellendi.' });
    } catch (err) { res.status(500).json({ mesaj: 'Hata' }); }
};
// 7. TOPLU PERSONEL YÜKLEME (EXCEL)
exports.topluPersonelYukle = async (req, res) => {
    if (!['admin', 'ik'].includes(req.user.rol)) return res.status(403).json({ mesaj: 'Yetkisiz işlem' });

    const personelListesi = req.body;
    const client = await pool.connect();
    let hatalar = [];

    try {
        await client.query('BEGIN');
        for (const p of personelListesi) {
            const tc = String(p.TC || '').trim();
            if (!tc || tc.length !== 11) { hatalar.push(`Hatalı TC: ${tc}`); continue; }

            const hamSifre = tc.slice(-6);
            const hash = await require('bcrypt').hash(hamSifre, 10);
            const tarih = (val) => (val ? new Date(val) : null);

            // UPSERT SORGUSU
            await client.query(`
                INSERT INTO personeller (
                    tc_no, ad, soyad, gorevi, kadrosu, psiko_tarih, telefon, hareket_merkezi, 
                    surucu_no, kan_grubu, tahsil_durumu, dogum_tarihi, medeni_hali, cinsiyet, 
                    ehliyet_no, src_belge_no, durumu, adres, ehliyet_bitis_tarihi, sira_no, 
                    unvani, referans_no, ise_giris_tarihi, yuzde_dilim, kalan_izin_sayisi, 
                    gorevli_oldugu_birim, izin_turu, hakedilen_izin_gun_sayisi, izne_ait_yil, sifre_hash, aktif, rol_id
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, TRUE, 1)
                ON CONFLICT (tc_no) DO UPDATE SET
                    ad=EXCLUDED.ad, soyad=EXCLUDED.soyad, gorevi=EXCLUDED.gorevi, telefon=EXCLUDED.telefon,
                    hareket_merkezi=EXCLUDED.hareket_merkezi, kalan_izin_sayisi=EXCLUDED.kalan_izin_sayisi,
                    durumu=EXCLUDED.durumu, gorevli_oldugu_birim=EXCLUDED.gorevli_oldugu_birim,
                    yuzde_dilim=EXCLUDED.yuzde_dilim, hakedilen_izin_gun_sayisi=EXCLUDED.hakedilen_izin_gun_sayisi,
                    adres=EXCLUDED.adres, kan_grubu=EXCLUDED.kan_grubu, sira_no=EXCLUDED.sira_no, referans_no=EXCLUDED.referans_no
            `, [
                tc, p.ADI, p.SOYADI, p.GOREVI, p.KADROSU, tarih(p.PSIKOTEKNIK_BITIS_TARIHI),
                p.TELEFON, p.HAREKET_MERKEZI, p.SURUCU_NO, p.KAN_GRUBU, p.TAHSIL_DURUMU,
                tarih(p.DOGUM_TARIHI), p.MEDENI_HALI, p.CINSIYET, p.EHLIYET_NO, p.SRC_BELGE_NO,
                p.DURUMU, p.ADRES, tarih(p.EHLIYET_BITIS_TARIHI), p.SIRA_NO || 0,
                p.UNVANI, p.REFERANS_NO, tarih(p.ISE_GIRIS_TARIHI), p.YUZDE_DILIM,
                p.KALAN_IZIN_SAYISI || 0, p.GOREVLI_OLDUGU_BIRIM, p.IZIN_TURU,
                p.HAKEDILEN_IZIN_GUN_SAYISI || 0, p.IZNE_AIT_OLAN_YIL, hash
            ]);
        }
        await client.query('COMMIT');
        res.json({ mesaj: 'Yükleme tamamlandı.', hatalar });
    } catch (err) { await client.query('ROLLBACK'); console.error(err); res.status(500).json({ mesaj: 'Hata' }); } 
    finally { client.release(); }
};
// 6. PERSONEL SİL (GÜNCELLENDİ - TÜM BAĞIMLILIKLAR EKLENDİ) ✅
exports.personelSil = async (req, res) => {
    if (req.user.rol !== 'admin') return res.status(403).json({ mesaj: 'Sadece Admin silebilir.' });
    
    const { personel_id } = req.params; 
    
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const userRes = await client.query('SELECT aktif, ad, soyad FROM personeller WHERE personel_id = $1', [personel_id]);
        
        if (userRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ mesaj: 'Personel bulunamadı.' });
        }

        const user = userRes.rows[0];

        // Güvenlik: Aktif personel silinemez
        if (user.aktif) {
            await client.query('ROLLBACK');
            return res.status(400).json({ 
                mesaj: `GÜVENLİK UYARISI: ${user.ad} ${user.soyad} şu an AKTİF durumda! Silmek için önce 'Dondur' butonuna basarak pasife almalısınız.` 
            });
        }

        // --- TÜM BAĞIMLI KAYITLARI SİL ---
        await client.query('DELETE FROM bildirimler WHERE personel_id = $1', [personel_id]);
        await client.query('DELETE FROM imzalar WHERE personel_id = $1', [personel_id]);
        await client.query('DELETE FROM profil_degisiklikleri WHERE personel_id = $1', [personel_id]);
        await client.query('DELETE FROM gorevler WHERE personel_id = $1', [personel_id]);
        await client.query('DELETE FROM yetkiler WHERE personel_id = $1', [personel_id]);
        
        // Loglardaki hatayı çözen satır:
        await client.query('DELETE FROM sistem_loglari WHERE personel_id = $1', [personel_id]);

        // İzin taleplerini ve onlara bağlı hareketleri siler (CASCADE varsa hareketlere gerek kalmaz ama garantiye alalım)
        await client.query('DELETE FROM izin_talepleri WHERE personel_id = $1', [personel_id]);
        
        // Son olarak personeli sil
        await client.query('DELETE FROM personeller WHERE personel_id = $1', [personel_id]);

        await client.query('COMMIT');
        res.json({ mesaj: 'Pasif personel ve tüm verileri başarıyla silindi.' });

    } catch (err) { 
        await client.query('ROLLBACK');
        console.error("Silme Hatası Detay:", err); // Render loglarında detay görmek için
        res.status(500).json({ mesaj: `Silme işlemi başarısız: ${err.message}` }); 
    } finally {
        client.release();
    }
};