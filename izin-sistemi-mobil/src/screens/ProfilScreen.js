import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import { API_URL } from '../config'; 

export default function ProfilScreen({ route, navigation }) {
  const { user: initialUser, token } = route.params;
  const [profilData, setProfilData] = useState(initialUser);
  const [sayfaYukleniyor, setSayfaYukleniyor] = useState(true);
  const [kaydetYukleniyor, setKaydetYukleniyor] = useState(false);

  const [email, setEmail] = useState('');
  const [telefon, setTelefon] = useState('');
  const [adres, setAdres] = useState('');
  const [sifre, setSifre] = useState('');
   
  const [srcTarih, setSrcTarih] = useState('');
  const [psikoTarih, setPsikoTarih] = useState('');
  const [ehliyetTarih, setEhliyetTarih] = useState('');

  const [files, setFiles] = useState({ adres: null, src: null, psiko: null, ehliyet: null });

  useEffect(() => { guncelBilgileriGetir(); }, []);

  const guncelBilgileriGetir = async () => {
    try {
        const response = await axios.get(`${API_URL}/api/personel/bilgi`, {
            headers: { 'Authorization': `Bearer ${token}`, 'bypass-tunnel-reminder': 'true' }
        });
        const gelenVeri = response.data;
        setProfilData(gelenVeri);
        setEmail(gelenVeri.email || '');
        setTelefon(gelenVeri.telefon || '');
        setAdres(gelenVeri.adres || '');
        setSrcTarih(gelenVeri.src_tarih ? gelenVeri.src_tarih.split('T')[0] : '');
        setPsikoTarih(gelenVeri.psiko_tarih ? gelenVeri.psiko_tarih.split('T')[0] : '');
        setEhliyetTarih(gelenVeri.ehliyet_tarih ? gelenVeri.ehliyet_tarih.split('T')[0] : '');
    } catch (error) { console.log("Veri çekme hatası"); } finally { setSayfaYukleniyor(false); }
  };

  const pickDoc = async (tur) => {
    let result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf' });
    if (!result.canceled) setFiles({ ...files, [tur]: result.assets[0] });
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images, // Düzeltilmiş syntax
      quality: 0.5,
    });
    if (!result.canceled) setFiles({ ...files, ehliyet: result.assets[0] });
  };

  const kaydet = async () => {
    setKaydetYukleniyor(true);
    try {
        const formData = new FormData();
        formData.append('email', email); 
        formData.append('telefon', telefon); 
        formData.append('adres', adres);
        formData.append('src_tarih', srcTarih); 
        formData.append('psiko_tarih', psikoTarih); 
        formData.append('ehliyet_tarih', ehliyetTarih);
        if(sifre) formData.append('yeni_sifre', sifre);

        if(files.adres) formData.append('adres_belgesi', { uri: files.adres.uri, name: 'adres.pdf', type: 'application/pdf' });
        if(files.src) formData.append('src_belgesi', { uri: files.src.uri, name: 'src.pdf', type: 'application/pdf' });
        if(files.psiko) formData.append('psiko_belgesi', { uri: files.psiko.uri, name: 'psiko.pdf', type: 'application/pdf' });
        
        if(files.ehliyet) {
             let type = files.ehliyet.mimeType || 'image/jpeg';
             let name = files.ehliyet.fileName || 'ehliyet.jpg';
             formData.append('ehliyet_belgesi', { uri: files.ehliyet.uri, name, type });
        }

        // BAĞLANTI AYARLARINA DOKUNMADIM (Senin kodun)
        await axios.post(`${API_URL}/api/personel/guncelle`, formData, {
            headers: { 
                'Authorization': `Bearer ${token}`, 
                'bypass-tunnel-reminder': 'true', 
                'Content-Type': 'multipart/form-data' 
            }
        });

        Alert.alert("Başarılı", "Değişiklik talebiniz yönetici onayına gönderildi.");
        setSifre(''); setFiles({ adres: null, src: null, psiko: null, ehliyet: null }); guncelBilgileriGetir();
    } catch (error) { Alert.alert("Hata", "Güncelleme başarısız."); } finally { setKaydetYukleniyor(false); }
  };

  if (sayfaYukleniyor) return <View style={styles.center}><ActivityIndicator size="large" color="#0d6efd" /></View>;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{paddingBottom: 50}}>
      <View style={styles.readOnlyBox}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{profilData.ad ? profilData.ad[0] : '?'}</Text></View>
        <Text style={styles.name}>{profilData.ad} {profilData.soyad}</Text>
        <Text style={styles.tc}>TC: {profilData.tc_no}</Text>
        <Text style={styles.rol}>{profilData.rol_adi ? profilData.rol_adi.toUpperCase() : 'PERSONEL'}</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.header}>📝 Kişisel Bilgiler</Text>
        
        {/* BOŞLUK HATASI BURADA DÜZELTİLDİ: Componentler alt alta alındı */}
        <Text style={styles.label}>Telefon Numarası</Text> 
        <TextInput style={styles.input} value={telefon} onChangeText={setTelefon} placeholder="05XX" keyboardType="phone-pad" />
        
        <Text style={styles.label}>E-Posta Adresi</Text> 
        <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="email@..." keyboardType="email-address" autoCapitalize="none" />
        
        <Text style={styles.label}>Yeni Şifre</Text> 
        <TextInput style={styles.input} value={sifre} onChangeText={setSifre} placeholder="******" secureTextEntry />
        
        <View style={styles.divider} />
        
        <Text style={styles.header}>📄 Belgeler ve Tarihler</Text>
        
        <Text style={styles.label}>Açık Adres</Text> 
        <TextInput style={[styles.input, {height: 60}]} value={adres} onChangeText={setAdres} multiline />
        <TouchableOpacity style={[styles.fileBtn, files.adres && styles.fileBtnSuccess]} onPress={() => pickDoc('adres')}>
            <Text style={styles.fileBtnText}>{files.adres ? "İkametgah Seçildi" : "İkametgah Yükle (PDF)"}</Text>
        </TouchableOpacity>
        
        <Text style={styles.label}>SRC Tarihi</Text> 
        <TextInput style={styles.input} value={srcTarih} onChangeText={setSrcTarih} />
        <TouchableOpacity style={[styles.fileBtn, files.src && styles.fileBtnSuccess]} onPress={() => pickDoc('src')}>
            <Text style={styles.fileBtnText}>{files.src ? "SRC Seçildi" : "SRC Belgesi (PDF)"}</Text>
        </TouchableOpacity>
        
        <Text style={styles.label}>Psikoteknik</Text> 
        <TextInput style={styles.input} value={psikoTarih} onChangeText={setPsikoTarih} />
        <TouchableOpacity style={[styles.fileBtn, files.psiko && styles.fileBtnSuccess]} onPress={() => pickDoc('psiko')}>
            <Text style={styles.fileBtnText}>{files.psiko ? "Psiko. Seçildi" : "Psikoteknik (PDF)"}</Text>
        </TouchableOpacity>
        
        <Text style={styles.label}>Ehliyet Tarihi</Text> 
        <TextInput style={styles.input} value={ehliyetTarih} onChangeText={setEhliyetTarih} />
        
        <TouchableOpacity style={[styles.fileBtn, files.ehliyet && styles.fileBtnSuccess]} onPress={pickImage}>
            <Ionicons name={files.ehliyet ? "checkmark-circle" : "camera"} size={20} color="white" />
            <Text style={styles.fileBtnText}>{files.ehliyet ? "Ehliyet Seçildi" : "Ehliyet Yükle (Foto/PDF)"}</Text>
        </TouchableOpacity>

        <View style={styles.divider} />
        
        {kaydetYukleniyor ? (
            <ActivityIndicator size="large" color="#0d6efd" />
        ) : (
            <TouchableOpacity style={styles.saveBtn} onPress={kaydet}>
                <Text style={styles.saveBtnText}>Değişiklik Talebi Gönder</Text>
            </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  readOnlyBox: { alignItems: 'center', padding: 30, backgroundColor: '#0d6efd', borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  avatarText: { fontSize: 30, color: '#0d6efd', fontWeight: 'bold' },
  name: { fontSize: 22, fontWeight: 'bold', color: 'white' },
  tc: { color: '#e0e0e0', marginTop: 5, fontSize: 16, fontWeight: 'bold' },
  rol: { color: '#ffc107', fontWeight: 'bold', marginTop: 5 },
  form: { padding: 20 },
  header: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 15, marginTop: 10 },
  label: { fontSize: 14, color: '#666', marginBottom: 5, marginTop: 10 },
  input: { backgroundColor: 'white', borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 12, fontSize: 16 },
  fileBtn: { flexDirection: 'row', backgroundColor: '#6c757d', padding: 12, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  fileBtnSuccess: { backgroundColor: '#198754' },
  fileBtnText: { color: 'white', marginLeft: 10, fontWeight: 'bold' },
  saveBtn: { backgroundColor: '#0d6efd', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 30, marginBottom: 50, elevation: 5 },
  saveBtnText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  divider: { height: 1, backgroundColor: '#ccc', marginVertical: 20 }
});