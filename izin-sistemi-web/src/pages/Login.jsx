import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { BusFront, Lock, User } from 'lucide-react';

export default function Login() {
    const [tcNo, setTcNo] = useState('');
    const [sifre, setSifre] = useState('');
    const [hata, setHata] = useState('');
    const navigate = useNavigate();

    const handleLogin = async (e) => {
    e.preventDefault();
    try {
        const response = await axios.post('https://mersinbb-izin-sistemi.onrender.com/api/auth/login', { tc_no: tcNo, sifre: sifre });
        
        // 1. Token'ı kaydet
        localStorage.setItem('token', response.data.token);

        // 2. DÜZELTME BURADA: 'kullanici' yerine 'user' yazıyoruz
        // Çünkü Backend (authController.js) veriyi 'user' adıyla gönderiyor.
        localStorage.setItem('user', JSON.stringify(response.data.user)); 

        // 3. Sayfayı YENİLEYEREK yönlendir (Sol menüdeki ismin gelmesi için bu şart)
        window.location.href = '/dashboard/home'; 

    } catch (error) {
        console.error(error); // Hatayı konsola yazdıralım ki görelim
        setHata('Giriş bilgileri hatalı veya sunucu erişilemiyor.');
    }
};

    return (
        <div className="d-flex vh-100" style={{ background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)' }}>
            {/* SOL TARAFTAKİ GÖRSEL ALAN */}
            <div className="d-none d-md-flex col-md-6 col-lg-7 bg-primary align-items-center justify-content-center p-5" 
                 style={{ background: 'linear-gradient(45deg, #004e92, #000428)' }}>
                <div className="text-white text-center">
                    <BusFront size={120} className="mb-4 opacity-75" />
                    <h1 className="display-4 fw-bold">Filo Yönetim Merkezi</h1>
                    <p className="lead opacity-75">Mersin Büyükşehir Belediyesi<br/>Toplu Taşıma Şube Müdürlüğü</p>
					<p className="lead opacity-75">Hüseyin Arkan<br/></p>
                </div>
            </div>

            {/* SAĞ TARAFTAKİ FORM ALANI */}
            <div className="col-12 col-md-6 col-lg-5 d-flex align-items-center justify-content-center bg-white shadow-lg">
                <div className="w-75">
                    <div className="text-center mb-5">
                        <h3 className="fw-bold text-primary">Hoşgeldiniz</h3>
                        <p className="text-muted">Personel Yönetim Sistemine Giriş</p>
                    </div>

                    {hata && <div className="alert alert-danger text-center py-2 small">{hata}</div>}

                    <form onSubmit={handleLogin}>
                        <div className="mb-4">
                            <label className="form-label text-muted small fw-bold">TC KİMLİK NO</label>
                            <div className="input-group input-group-lg">
                                <span className="input-group-text bg-light border-0"><User size={20} color="#666"/></span>
                                <input type="text" className="form-control bg-light border-0" maxLength="11"
                                    value={tcNo} onChange={(e) => setTcNo(e.target.value)} required />
                            </div>
                        </div>

                        <div className="mb-4">
                            <label className="form-label text-muted small fw-bold">ŞİFRE</label>
                            <div className="input-group input-group-lg">
                                <span className="input-group-text bg-light border-0"><Lock size={20} color="#666"/></span>
                                <input type="password" className="form-control bg-light border-0"
                                    value={sifre} onChange={(e) => setSifre(e.target.value)} required />
                            </div>
                        </div>

                        <button type="submit" className="btn btn-primary w-100 btn-lg shadow-sm fw-bold mt-3" 
                                style={{background: 'linear-gradient(to right, #004e92, #000428)', border: 'none'}}>
                            GÜVENLİ GİRİŞ YAP
                        </button>
                    </form>
                    
                    <div className="text-center mt-4 text-muted small">
                        &copy; 2025 MBB Bilgi İşlem Dairesi
                    </div>
                </div>
            </div>
        </div>
    );
}