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
        // Yazıcı Kısıtlaması
        if (req.user.rol === 'yazici') {
            const hedefBirimRes = await pool.query('SELECT birim_adi FROM birimler WHERE birim_id = $1', [yeni_birim_id]);
            const hedefBirimAdi = hedefBirimRes.rows[0]?.birim_adi || '';
            const kendiBirimId = req.user.birim; 
            
            const isHavuz = hedefBirimAdi.includes('HAVUZ');
            // (Burada kendi birim kontrolünü şimdilik es geçiyoruz, gerekirse eklenir)
        }

        await pool.query('UPDATE personeller SET birim_id = $1 WHERE personel_id = $2', [yeni_birim_id, personel_id]);
        const birimRes = await pool.query('SELECT birim_adi FROM birimler WHERE birim_id = $1', [yeni_birim_id]);
        res.json({ mesaj: `Personel '${birimRes.rows[0]?.birim_adi}' birimine transfer edildi.` });
    } catch (err) { res.status(500).json({ mesaj: 'Hata oluştu.' }); }
};

// 3. PERSONELİ DONDUR (Pasife Al) - DÜZELTİLDİ ✅
exports.personelDondur = async (req, res) => {
    if (!['admin', 'ik', 'filo'].includes(req.user.rol)) return res.status(403).json({ mesaj: 'Yetkisiz işlem' });
    
    const { personel_id, neden } = req.body;
    try {
        // BURADAKİ 'active = FALSE' silindi.
        await pool.query(
            `UPDATE personeller SET aktif = FALSE, ayrilma_nedeni = $1, ayrilma_tarihi = NOW() WHERE personel_id = $2`,
            [neden, personel_id]
        );
        res.json({ mesaj: 'Personel üyeliği donduruldu (Pasife Alındı).' });
    } catch (err) { 
        console.error(err); // Hatayı görmek için log ekledim
        res.status(500).json({ mesaj: 'Hata oluştu.' }); 
    }
};

// 4. PERSONELİ AKTİF ET (Geri Döndür) - DÜZELTİLDİ ✅
exports.personelAktifEt = async (req, res) => {
    if (!['admin', 'ik', 'filo'].includes(req.user.rol)) return res.status(403).json({ mesaj: 'Yetkisiz işlem' });
    
    const { personel_id } = req.body;
    try {
        // BURADAKİ 'active = TRUE' silindi.
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

// 6. PERSONEL SİL
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

        if (user.aktif) {
            await client.query('ROLLBACK');
            return res.status(400).json({ 
                mesaj: `GÜVENLİK UYARISI: ${user.ad} ${user.soyad} şu an AKTİF durumda! Silmek için önce 'Dondur' butonuna basarak pasife almalısınız.` 
            });
        }

        await client.query('DELETE FROM bildirimler WHERE personel_id = $1', [personel_id]);
        await client.query('DELETE FROM imzalar WHERE personel_id = $1', [personel_id]);
        await client.query('DELETE FROM profil_degisiklikleri WHERE personel_id = $1', [personel_id]);
        await client.query('DELETE FROM izin_talepleri WHERE personel_id = $1', [personel_id]);
        await client.query('DELETE FROM personeller WHERE personel_id = $1', [personel_id]);

        await client.query('COMMIT');
        res.json({ mesaj: 'Pasif personel ve tüm verileri başarıyla silindi.' });

    } catch (err) { 
        await client.query('ROLLBACK');
        console.error("Silme Hatası:", err);
        res.status(500).json({ mesaj: 'Silme işlemi sırasında hata oluştu.' }); 
    } finally {
        client.release();
    }
};