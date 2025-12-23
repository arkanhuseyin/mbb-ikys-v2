const pool = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// 1. GİRİŞ YAP (LOGIN)
exports.login = async (req, res) => {
    const { tc_no, sifre } = req.body;

    try {
        // Kullanıcıyı bul ve Rol/Birim bilgilerini getir
        const userResult = await pool.query(
            `SELECT p.*, r.rol_adi, b.birim_adi 
             FROM personeller p 
             JOIN roller r ON p.rol_id = r.rol_id
             LEFT JOIN birimler b ON p.birim_id = b.birim_id
             WHERE p.tc_no = $1`, 
            [tc_no]
        );

        if (userResult.rows.length === 0) {
            return res.status(401).json({ mesaj: 'Kullanıcı bulunamadı!' });
        }

        const user = userResult.rows[0];

        // --- DONDURULMUŞ HESAP KONTROLÜ ---
        if (!user.aktif) {
            return res.status(403).json({ 
                mesaj: `Üyeliğiniz dondurulmuştur. (Sebep: ${user.ayrilma_nedeni || 'Belirtilmemiş'}) Lütfen İK ile iletişime geçiniz.` 
            });
        }

        // Şifre Kontrolü
        const validPassword = await bcrypt.compare(sifre, user.sifre_hash);
        if (!validPassword) {
            return res.status(401).json({ mesaj: 'Hatalı şifre!' });
        }

        // Token Oluştur (Kimlik Kartı)
        const token = jwt.sign(
            { id: user.personel_id, rol: user.rol_adi, birim: user.birim_id },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Cevap Dön
        res.json({
            mesaj: 'Giriş başarılı',
            token: token,
            kullanici: {
                ad: user.ad,
                soyad: user.soyad,
                rol: user.rol_adi,
                birim_id: user.birim_id,
                birim_adi: user.birim_adi,
                tc_no: user.tc_no,
                email: user.email,
                telefon: user.telefon,
                adres: user.adres,
                src_tarih: user.src_tarih,
                psiko_tarih: user.psiko_tarih,
                ehliyet_tarih: user.ehliyet_tarih
            }
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ mesaj: 'Sunucu hatası' });
    }
};

// 2. ŞİFRE SIFIRLAMA TALEBİ (MOBİL - PERSONEL İÇİN)
exports.sifreUnuttum = async (req, res) => {
    const { tc_no, email } = req.body;

    try {
        const userResult = await pool.query('SELECT * FROM personeller WHERE tc_no = $1 AND email = $2', [tc_no, email]);

        if (userResult.rows.length === 0) {
            return res.status(404).json({ mesaj: 'Bu bilgilerle eşleşen kayıt bulunamadı.' });
        }

        const user = userResult.rows[0];

        // Admin'i bul ve bildirim at
        const adminResult = await pool.query("SELECT personel_id FROM personeller WHERE rol_id = (SELECT rol_id FROM roller WHERE rol_adi = 'admin') LIMIT 1");
        
        if (adminResult.rows.length > 0) {
            const adminId = adminResult.rows[0].personel_id;
            const mesaj = `🚨 ŞİFRE SIFIRLAMA TALEBİ: \nPersonel: ${user.ad} ${user.soyad} (${user.tc_no}) \nŞifresini unuttuğunu belirtti. Lütfen Web Panelinden şifresini sıfırlayınız.`;
            
            await pool.query(
                `INSERT INTO bildirimler (personel_id, baslik, mesaj) VALUES ($1, $2, $3)`,
                [adminId, '🔑 Şifre Sıfırlama Talebi', mesaj]
            );
        }

        res.json({ mesaj: 'Talebiniz alındı. Yöneticinize bildirim gönderildi.' });

    } catch (err) {
        console.error(err);
        res.status(500).json({ mesaj: 'Sunucu hatası' });
    }
};

// 3. ADMİN TARAFINDAN ŞİFRE SIFIRLAMA (WEB - ADMİN İÇİN)
exports.adminSifirla = async (req, res) => {
    try {
        if (req.user.rol !== 'admin') return res.status(403).json({ mesaj: 'Yetkisiz işlem' });

        const { hedef_tc, yeni_sifre } = req.body;
        const hash = await bcrypt.hash(yeni_sifre, 10);

        await pool.query('UPDATE personeller SET sifre_hash = $1 WHERE tc_no = $2', [hash, hedef_tc]);

        res.json({ mesaj: `Şifre başarıyla '${yeni_sifre}' olarak güncellendi.` });

    } catch (err) {
        console.error(err);
        res.status(500).send('Hata');
    }
};

// 4. YENİ PERSONEL EKLEME (WEB - ADMİN/İK İÇİN)
exports.register = async (req, res) => {
    // Sadece Admin, İK ve Filo ekleyebilir
    if (!['admin', 'ik', 'filo'].includes(req.user.rol)) return res.status(403).json({ mesaj: 'Yetkisiz işlem' });

    const { tc_no, ad, soyad, sifre, rol_adi, birim_id } = req.body;

    try {
        const hash = await bcrypt.hash(sifre, 10);

        // Rol ID'sini bul
        const rolRes = await pool.query('SELECT rol_id FROM roller WHERE rol_adi = $1', [rol_adi]);
        if (rolRes.rows.length === 0) return res.status(400).json({ mesaj: 'Geçersiz Rol Seçimi' });
        
        // Kaydet (Varsayılan olarak aktif: TRUE ekliyoruz)
        await pool.query(
            `INSERT INTO personeller (tc_no, ad, soyad, sifre_hash, rol_id, birim_id, aktif) VALUES ($1, $2, $3, $4, $5, $6, TRUE)`,
            [tc_no, ad, soyad, hash, rolRes.rows[0].rol_id, birim_id]
        );

        res.json({ mesaj: 'Yeni personel başarıyla oluşturuldu.' });

    } catch (err) {
        console.error(err);
        if (err.code === '23505') {
            return res.status(400).json({ mesaj: 'Bu TC Kimlik No zaten kayıtlı.' });
        }
        res.status(500).json({ mesaj: 'Kayıt sırasında hata oluştu.' });
    }
};

// 5. TÜM KULLANICILARI LİSTELE (WEB - ADMİN/İK/YAZICI/FİLO İÇİN)
exports.getUsers = async (req, res) => {
    // Yetki kontrolü
    if (!['admin', 'ik', 'yazici', 'filo'].includes(req.user.rol)) {
        return res.status(403).json({ mesaj: 'Yetkisiz işlem' });
    }

    try {
        let query = `
            SELECT p.personel_id, p.tc_no, p.ad, p.soyad, p.aktif, p.ayrilma_nedeni, p.birim_id, r.rol_adi, b.birim_adi 
            FROM personeller p
            JOIN roller r ON p.rol_id = r.rol_id
            LEFT JOIN birimler b ON p.birim_id = b.birim_id
        `;
        
        let params = [];

        // YAZICI FİLTRESİ: Sadece Kendi Birimi + Havuz
        if (req.user.rol === 'yazici') {
            query += ` WHERE p.birim_id = $1 OR b.birim_adi LIKE '%HAVUZ%'`;
            params.push(req.user.birim);
        }

        query += ` ORDER BY p.ad ASC`;

        const result = await pool.query(query, params);
        res.json(result.rows);

    } catch (err) {
        console.error(err);
        res.status(500).send('Hata');
    }
};