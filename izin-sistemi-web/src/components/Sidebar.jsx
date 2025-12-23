import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, FileText, UserCog, Settings, LogOut, BusFront, PlusCircle, FileBarChart } from 'lucide-react';

export default function Sidebar() {
    const navigate = useNavigate();
    const location = useLocation();
    
    let user = null;
    try {
        user = JSON.parse(localStorage.getItem('user'));
    } catch (e) { console.error("Kullanıcı verisi okunamadı"); }

    const isActive = (path) => location.pathname === path ? 'bg-primary text-white shadow' : 'text-secondary hover-bg-light';

    const menuItems = [
        { 
            title: 'Genel Bakış', 
            path: '/dashboard/home', 
            icon: <LayoutDashboard size={20}/>, 
            show: true 
        },
        { 
            title: 'Yeni İzin Talebi', 
            path: '/dashboard/create-leave', 
            icon: <PlusCircle size={20}/>, 
            show: true 
        },
        { 
            title: 'İzin Talepleri', 
            path: '/dashboard/leaves',  // <--- BURASI DOĞRU: leaves (Onay Listesi)
            icon: <FileText size={20}/>, 
            show: true 
        },
        { 
            title: 'İzin Takip Raporu', // <--- YENİ: Rapor Sayfası
            path: '/dashboard/reports', 
            icon: <FileBarChart size={20}/>, 
            show: (user && ['admin', 'ik'].includes(user.rol)) // Sadece İK/Admin Görsün
        },
        { 
            title: 'Profil Onayları', 
            path: '/dashboard/profile-requests', 
            icon: <UserCog size={20}/>, 
            show: (user && ['admin', 'ik', 'filo'].includes(user.rol)) 
        },
        { 
            title: 'Ayarlar & Şifre', 
            path: '/dashboard/settings', 
            icon: <Settings size={20}/>, 
            show: true 
        },
    ];

    const handleLogout = () => {
        localStorage.clear();
        navigate('/login');
    };

    return (
        <div className="d-flex flex-column bg-white border-end h-100 p-3" style={{width: '260px', minWidth:'260px'}}>
            <div className="d-flex align-items-center gap-2 mb-5 px-2 text-primary">
                <BusFront size={32} strokeWidth={2.5} />
                <div>
                    <h5 className="m-0 fw-bold" style={{letterSpacing: '-0.5px'}}>MERSİN BB</h5>
                    <small className="text-muted text-uppercase fw-bold" style={{fontSize:'10px'}}>FİLO YÖNETİMİ</small>
                </div>
            </div>

            <div className="flex-grow-1">
                <small className="text-uppercase text-muted fw-bold ms-2 mb-2 d-block" style={{fontSize:'11px', letterSpacing:'1px'}}>MENÜ</small>
                <div className="d-flex flex-column gap-2">
                    {menuItems.map((item, index) => item.show && (
                        <button 
                            key={index} 
                            onClick={() => navigate(item.path)} 
                            className={`btn text-start d-flex align-items-center gap-3 py-2 border-0 ${isActive(item.path)}`} 
                            style={{borderRadius: '10px', transition: 'all 0.2s'}}
                        >
                            {item.icon}
                            <span className="fw-medium">{item.title}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="mt-auto border-top pt-3">
                <div className="d-flex align-items-center gap-2 mb-3 px-2">
                    <div className="bg-light rounded-circle d-flex align-items-center justify-content-center fw-bold text-primary border" style={{width:40, height:40}}>
                        {user?.ad ? user.ad[0] : '?'}
                    </div>
                    <div style={{lineHeight: '1.2', overflow: 'hidden'}}>
                        <div className="fw-bold text-dark small text-truncate">{user?.ad} {user?.soyad}</div>
                        <div className="text-muted small" style={{fontSize:'10px'}}>{user?.rol ? user.rol.toUpperCase() : 'PERSONEL'}</div>
                    </div>
                </div>
                <button onClick={handleLogout} className="btn btn-light w-100 text-danger d-flex align-items-center justify-content-center gap-2 btn-sm border-0 hover-shadow">
                    <LogOut size={16}/> Çıkış Yap
                </button>
            </div>
        </div>
    );
}