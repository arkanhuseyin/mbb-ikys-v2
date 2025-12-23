const pool = require('../config/db');
const { logKaydet, hareketKaydet } = require('../utils/logger');

// --- YARDIMCI: Tarih Formatı Düzeltici ---
const tarihFormatla = (tarihStr) => {
    if (!tarihStr) return null;
    if (tarihStr.includes('-')) return tarihStr;
    if (tarihStr.includes('.')) {
        const [gun, ay, yil] = tarihStr.split('.');
        return `${yil}-${ay}-${gun}`;
    }
    return tarihStr;
};

// --- YARDIMCI: Yıllık İzin Bakiyesi Hesapla (DÜZELTİLDİ) ---
const hesaplaBakiye = async (personel_id) => {
    // 1. Personelin giriş tarihini çek
    const pRes = await pool.query("SELECT ise_giris_tarihi FROM personeller WHERE personel_id = $1", [personel_id]);
    if (pRes.rows.length === 0) return 0;
    
    const giris = new Date(pRes.rows[0].ise_giris_tarihi || '2024-01-01');
    const bugun = new Date();
    
    // Çalışılan Yıl
    const workedYears = Math.floor((bugun - giris) / (1000 * 60 * 60 * 24 * 365));
    const startYear = giris.getFullYear();
    
    // Toplam Hakedişi Hesapla
    let hakedis = 0;
    if (startYear < 2018) {
        if (workedYears < 1) hakedis = 0; else if (workedYears <= 5) hakedis = 14; else if (workedYears <= 15) hakedis = 19; else hakedis = 25;
    } else if (startYear < 2024) {
        if (workedYears < 1) hakedis = 0; else if (startYear < 2019) { if (workedYears <= 5) hakedis = 14; else if (workedYears <= 15) hakedis = 19; else hakedis = 25; } else { if (workedYears <= 3) hakedis = 16; else if (workedYears <= 5) hakedis = 18; else if (workedYears <= 15) hakedis = 25; else hakedis = 30; }
    } else { 
        if (workedYears < 1) hakedis = 0; else if (startYear < 2025) { if (workedYears <= 3) hakedis = 16; else if (workedYears <= 5) hakedis = 18; else if (workedYears <= 15) hakedis = 25; else hakedis = 30; } else { if (workedYears <= 3) hakedis = 18; else if (workedYears <= 5) hakedis = 20; else if (workedYears <= 15) hakedis = 27; else hakedis = 32; }
    }

    // 2. Kullanılan İzinleri Çek (DÜZELTİLDİ: TAMAMLANDI durumu eklendi)
    // Hem 'IK_ONAYLADI' (İmza Bekleyen) hem 'TAMAMLANDI' (Biten) izinleri düşüyoruz.
    const uRes = await pool.query(`
        SELECT COALESCE(SUM(kac_gun), 0) as used 
        FROM izin_talepleri 
        WHERE personel_id = $1 
        AND izin_turu = 'YILLIK İZİN' 
        AND durum IN ('IK_ONAYLADI', 'TAMAMLANDI') 
        AND baslangic_tarihi >= date_trunc('year', CURRENT_DATE)
    `, [personel_id]);

    const used = parseInt(uRes.rows[0].used);
    
    return hakedis - used; // Kalan Bakiye
};


// 1. YENİ İZİN TALEBİ OLUŞTUR
exports.talepOlustur = async (req, res) => {
    let { 
        baslangic_tarihi, bitis_tarihi, kac_gun, izin_turu, aciklama, 
        haftalik_izin, ise_baslama, izin_adresi, personel_imza 
    } = req.body;
    
    const belge_yolu = req.file ? req.file.path : null;
    const personel_id = req.user.id; 
    const userRole = req.user.rol;
    const userBirimId = req.user.birim;

    try {
        // --- BAKİYE KONTROLÜ ---
        if (izin_turu === 'YILLIK İZİN') {
            const kalanHak = await hesaplaBakiye(personel_id);
            if (parseInt(kac_gun) > kalanHak) {
                return res.status(400).json({ 
                    mesaj: `Yetersiz Bakiye! Kalan yıllık izin hakkınız: ${kalanHak} gün. Talep edilen: ${kac_gun} gün.` 
                });
            }
        }

        baslangic_tarihi = tarihFormatla(baslangic_tarihi);
        bitis_tarihi = tarihFormatla(bitis_tarihi);
        ise_baslama = tarihFormatla(ise_baslama);

        let baslangicDurumu = 'ONAY_BEKLIYOR';
        if (userRole === 'filo') baslangicDurumu = 'YAZICI_ONAYLADI';
        const birimRes = await pool.query('SELECT birim_adi FROM birimler WHERE birim_id = $1', [userBirimId]);
        if (birimRes.rows.length > 0 && birimRes.rows[0].birim_adi === 'İDARİ PERSONEL') baslangicDurumu = 'YAZICI_ONAYLADI';

        const yeniTalep = await pool.query(
            `INSERT INTO izin_talepleri 
            (personel_id, baslangic_tarihi, bitis_tarihi, kac_gun, izin_turu, aciklama, 
             haftalik_izin_gunu, ise_baslama_tarihi, izin_adresi, personel_imza, durum, belge_yolu) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
            [personel_id, baslangic_tarihi, bitis_tarihi, kac_gun, izin_turu, aciklama, 
             haftalik_izin, ise_baslama, izin_adresi, personel_imza, baslangicDurumu, belge_yolu]
        );
        
        const talepId = yeniTalep.rows[0].talep_id;

        await hareketKaydet(talepId, personel_id, 'BAŞVURU', 'İzin talebi oluşturuldu.');
        await logKaydet(personel_id, 'İZİN_TALEBİ', `Yeni talep oluşturdu. ID: ${talepId}`, req);

        res.json({ mesaj: 'İzin talebi başarıyla oluşturuldu', talep: yeniTalep.rows[0] });

    } catch (err) {
        console.error('İzin Oluşturma Hatası:', err);
        res.status(500).json({ mesaj: 'İzin oluşturulurken hata çıktı.' });
    }
};

// 2. İZİNLERİ LİSTELE
exports.izinleriGetir = async (req, res) => {
    try {
        let query = `SELECT t.*, p.ad, p.soyad, p.tc_no, p.birim_id FROM izin_talepleri t JOIN personeller p ON t.personel_id = p.personel_id`;
        let params = [];

        if (['admin', 'ik', 'filo'].includes(req.user.rol)) { } 
        else if (['amir', 'yazici'].includes(req.user.rol)) {
            query += ` WHERE p.birim_id = $1`;
            params.push(req.user.birim);
        } else {
            query += ` WHERE t.personel_id = $1`;
            params.push(req.user.id);
        }
        query += ` ORDER BY t.olusturma_tarihi DESC`;
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) { res.status(500).json({ mesaj: 'Veri çekilemedi' }); }
};

// 3. TALEBİ ONAYLA / REDDET
exports.talepOnayla = async (req, res) => {
    const { talep_id, imza_data, yeni_durum } = req.body;
    const onaylayan_id = req.user.id;
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        if (imza_data) {
             await client.query(`INSERT INTO imzalar (personel_id, imza_data, talep_id) VALUES ($1, $2, $3)`, [onaylayan_id, imza_data, talep_id]);
        }

        await client.query(`UPDATE izin_talepleri SET durum = $1 WHERE talep_id = $2`, [yeni_durum, talep_id]);

        let islemBaslik = '';
        let aciklama = '';
        if (yeni_durum === 'AMIR_ONAYLADI') { islemBaslik = 'AMİR ONAYI'; aciklama = 'Amir tarafından onaylandı.'; }
        else if (yeni_durum === 'YAZICI_ONAYLADI') { islemBaslik = 'YAZICI ONAYI'; aciklama = 'Yazıcı tarafından kontrol edildi.'; }
        else if (yeni_durum === 'IK_ONAYLADI') { islemBaslik = 'İK ONAYI'; aciklama = 'İK tarafından onaylandı (Süreç Tamamlandı).'; }
        else if (yeni_durum === 'REDDEDILDI') { islemBaslik = 'RED'; aciklama = 'Talep reddedildi.'; }

        await hareketKaydet(talep_id, onaylayan_id, islemBaslik, aciklama);
        await logKaydet(onaylayan_id, 'İZİN_İŞLEMİ', `Talep ${talep_id} durumu: ${yeni_durum}`, req);

        if (yeni_durum === 'IK_ONAYLADI') {
            const talepSonuc = await client.query('SELECT t.personel_id, t.baslangic_tarihi, p.ad, p.soyad FROM izin_talepleri t JOIN personeller p ON t.personel_id = p.personel_id WHERE t.talep_id = $1', [talep_id]);
            const pid = talepSonuc.rows[0].personel_id;
            const adSoyad = `${talepSonuc.rows[0].ad} ${talepSonuc.rows[0].soyad}`;
            const tarih = new Date(talepSonuc.rows[0].baslangic_tarihi).toLocaleDateString('tr-TR');
            const ozelMesaj = `Sayın Personelimiz ${adSoyad}, ${tarih} başlangıç tarihli izin talebiniz onaylanmıştır.\n\nDikkat : Yasal Prosedür gereği , izninizin başlayacağı tarihten 1 gün önce Personel İşleri (İK) birimine gelerek ISLAK İMZA atmanız gerekmektedir. ISLAK İMZAYA gelmediğiniz takdirde izin talebiniz iptal olacaktır.`;
            await client.query(`INSERT INTO bildirimler (personel_id, baslik, mesaj) VALUES ($1, $2, $3)`, [pid, '🚨 Onay ve Islak İmza Çağrısı', ozelMesaj]);
        }
        else if (yeni_durum === 'REDDEDILDI') {
            const tRes = await client.query('SELECT personel_id FROM izin_talepleri WHERE talep_id = $1', [talep_id]);
            const pid = tRes.rows[0].personel_id;
            await client.query(`INSERT INTO bildirimler (personel_id, baslik, mesaj) VALUES ($1, $2, $3)`, [pid, '❌ İzin Talebi Reddedildi', 'İzin talebiniz reddedilmiştir.']);
        }

        await client.query('COMMIT');
        res.json({ mesaj: 'İşlem tamamlandı.' });

    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ mesaj: 'Hata oluştu.' });
    } finally {
        client.release();
    }
};

// 4. YILLIK İZİN HAKEDİŞ RAPORU (DÜZELTİLDİ)
exports.izinDurumRaporu = async (req, res) => {
    if (!['admin', 'ik'].includes(req.user.rol)) return res.status(403).json({ mesaj: 'Yetkisiz' });

    try {
        // DÜZELTME: Hem IK_ONAYLADI hem TAMAMLANDI durumlarını 'Kullanılmış' sayıyoruz
        const query = `
            SELECT 
                p.personel_id, p.ad, p.soyad, p.tc_no, p.ise_giris_tarihi, b.birim_adi,
                COALESCE(SUM(it.kac_gun), 0) as kullanilan_izin
            FROM personeller p
            LEFT JOIN birimler b ON p.birim_id = b.birim_id
            LEFT JOIN izin_talepleri it ON p.personel_id = it.personel_id 
                AND it.durum IN ('IK_ONAYLADI', 'TAMAMLANDI') -- BURASI DÜZELDİ
                AND it.izin_turu = 'YILLIK İZİN'
                AND it.baslangic_tarihi >= date_trunc('year', CURRENT_DATE)
            WHERE p.aktif = TRUE
            GROUP BY p.personel_id, b.birim_adi, p.ad, p.soyad, p.tc_no, p.ise_giris_tarihi
            ORDER BY p.ad ASC
        `;
        
        const result = await pool.query(query);
        const rapor = await Promise.all(result.rows.map(async (p) => {
            const giris = p.ise_giris_tarihi ? new Date(p.ise_giris_tarihi) : new Date('2024-01-01');
            const bugun = new Date();
            const workedYears = Math.floor((bugun - giris) / (1000 * 60 * 60 * 24 * 365));
            const startYear = giris.getFullYear();
            
            let hakedis = 0;
            if (startYear < 2018) {
                if (workedYears < 1) hakedis = 0; else if (workedYears <= 5) hakedis = 14; else if (workedYears <= 15) hakedis = 19; else hakedis = 25;
            } else if (startYear < 2024) {
                if (workedYears < 1) hakedis = 0; else if (startYear < 2019) { if (workedYears <= 5) hakedis = 14; else if (workedYears <= 15) hakedis = 19; else hakedis = 25; } else { if (workedYears <= 3) hakedis = 16; else if (workedYears <= 5) hakedis = 18; else if (workedYears <= 15) hakedis = 25; else hakedis = 30; }
            } else { 
                if (workedYears < 1) hakedis = 0; else if (startYear < 2025) { if (workedYears <= 3) hakedis = 16; else if (workedYears <= 5) hakedis = 18; else if (workedYears <= 15) hakedis = 25; else hakedis = 30; } else { if (workedYears <= 3) hakedis = 18; else if (workedYears <= 5) hakedis = 20; else if (workedYears <= 15) hakedis = 27; else hakedis = 32; }
            }

            return {
                ...p,
                hakedis: hakedis,
                kalan: hakedis - parseInt(p.kullanilan_izin),
                uyari: (hakedis - parseInt(p.kullanilan_izin)) > 50
            };
        }));
        res.json(rapor);
    } catch (err) {
        console.error(err);
        res.status(500).send('Rapor hatası');
    }
};

// 5. ISLAK İMZA DURUMU
exports.islakImzaDurumu = async (req, res) => {
    if (!['admin', 'ik'].includes(req.user.rol)) return res.status(403).json({ mesaj: 'Yetkisiz' });
    
    const { talep_id, durum } = req.body; 

    try {
        const talepRes = await pool.query('SELECT personel_id FROM izin_talepleri WHERE talep_id = $1', [talep_id]);
        if(talepRes.rows.length === 0) return res.status(404).json({mesaj: 'Bulunamadı'});
        const pid = talepRes.rows[0].personel_id;

        if (durum === 'GELDI') {
            await pool.query("UPDATE izin_talepleri SET durum = 'TAMAMLANDI' WHERE talep_id = $1", [talep_id]);
            await pool.query(`INSERT INTO bildirimler (personel_id, baslik, mesaj) VALUES ($1, $2, $3)`, [pid, '✅ İşlem Tamamlandı', 'Islak imzanız alınmıştır. İyi tatiller dileriz.']);
            res.json({ mesaj: 'Personel izne ayrıldı.' });
        } 
        else if (durum === 'GELMEDI') {
            await pool.query("UPDATE izin_talepleri SET durum = 'IPTAL_EDILDI' WHERE talep_id = $1", [talep_id]);
            const tutanakMesaji = `Islak imzaya gelmediğiniz tespit edilmiştir. İzin talebiniz İPTAL edilmiştir.`;
            await pool.query(`INSERT INTO bildirimler (personel_id, baslik, mesaj) VALUES ($1, $2, $3)`, [pid, '⚠️ İPTAL ve UYARI', tutanakMesaji]);
            res.json({ mesaj: 'İzin iptal edildi.' });
        }
    } catch (e) { res.status(500).send('Hata'); }
};

// ... (Timeline, Loglar ve Geçmiş fonksiyonları aynı)
exports.getTimeline = async (req, res) => { try { const result = await pool.query(`SELECT h.*, p.ad, p.soyad, r.rol_adi FROM izin_hareketleri h JOIN personeller p ON h.islem_yapan_id = p.personel_id JOIN roller r ON p.rol_id = r.rol_id WHERE h.talep_id = $1 ORDER BY h.tarih ASC`, [req.params.talep_id]); res.json(result.rows); } catch (e) { res.status(500).send('Hata'); } };
exports.getSystemLogs = async (req, res) => { try { const result = await pool.query(`SELECT l.*, p.ad, p.soyad, p.tc_no FROM sistem_loglari l LEFT JOIN personeller p ON l.personel_id = p.personel_id ORDER BY l.tarih DESC LIMIT 100`); res.json(result.rows); } catch (e) { res.status(500).send('Hata'); } };
exports.getPersonelGecmis = async (req, res) => { const { tc_no } = req.query; try { const result = await pool.query(`SELECT t.*, p.ad, p.soyad, p.tc_no FROM izin_talepleri t JOIN personeller p ON t.personel_id = p.personel_id WHERE p.tc_no LIKE $1 OR LOWER(p.ad) LIKE $2 OR LOWER(p.soyad) LIKE $2 ORDER BY t.olusturma_tarihi DESC`, [`%${tc_no}%`, `%${tc_no.toLowerCase()}%`]); res.json(result.rows); } catch(e) { res.status(500).send('Hata'); } };