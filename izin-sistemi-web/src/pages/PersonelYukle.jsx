import { useState } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { UploadCloud, FileSpreadsheet, CheckCircle, AlertTriangle } from 'lucide-react';

export default function PersonelYukle() {
    const [loading, setLoading] = useState(false);
    const [sonuc, setSonuc] = useState(null);

    const dosyaOku = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setLoading(true);
        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const wb = XLSX.read(evt.target.result, { type: 'binary' });
                const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
                const token = localStorage.getItem('token');
                // GÜNCEL URL
                await axios.post('https://mbb-ikys-v2.onrender.com/api/personel/toplu-yukle', data, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setSonuc({ tur: 'basarili', mesaj: `İşlem Tamamlandı! ${data.length} kişi işlendi.` });
            } catch (err) { setSonuc({ tur: 'hata', mesaj: 'Hata oluştu.' }); } 
            finally { setLoading(false); }
        };
        reader.readAsBinaryString(file);
    };

    return (
        <div className="container p-5 text-center">
            <h2 className="mb-4">Toplu Personel Yükleme</h2>
            <div className="card p-5 shadow-sm">
                <UploadCloud size={48} className="mx-auto text-primary mb-3"/>
                <input type="file" accept=".xlsx" onChange={dosyaOku} className="form-control w-50 mx-auto" disabled={loading} />
                {loading && <p className="mt-3">Yükleniyor...</p>}
                {sonuc && <div className={`alert mt-3 ${sonuc.tur === 'basarili' ? 'alert-success' : 'alert-danger'}`}>{sonuc.mesaj}</div>}
            </div>
        </div>
    );
}