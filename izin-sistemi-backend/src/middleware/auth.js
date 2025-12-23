const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    // 1. Header'dan token'ı al
    const token = req.header('Authorization');

    // 2. Token yoksa içeri alma
    if (!token) {
        return res.status(401).json({ mesaj: 'Erişim reddedildi. Token yok.' });
    }

    try {
        // 3. Token geçerli mi diye bak (Bearer temizliği)
        const tokenClean = token.replace('Bearer ', '');
        const decoded = jwt.verify(tokenClean, process.env.JWT_SECRET);
        
        // 4. Geçerliyse kullanıcı bilgisini isteğe ekle
        req.user = decoded; 
        next(); // Devam et
    } catch (err) {
        res.status(400).json({ mesaj: 'Geçersiz Token.' });
    }
};