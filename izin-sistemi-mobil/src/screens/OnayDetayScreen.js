import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Linking } from 'react-native';
import SignatureScreen from 'react-native-signature-canvas';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons'; // İkonlar için
import { API_URL } from '../config'; // Merkezi Link Dosyası

export default function OnayDetayScreen({ route, navigation }) {
  const { talep, user, token } = route.params;
  const ref = useRef();
  const [scrollEnabled, setScrollEnabled] = useState(true);

  // --- ONAYLA (İMZALI) ---
  const handleSignature = async (signature) => {
    let yeniDurum = '';
    if (user.rol === 'amir') yeniDurum = 'AMIR_ONAYLADI';
    else if (user.rol === 'yazici') yeniDurum = 'YAZICI_ONAYLADI';
    else if (user.rol === 'ik' || user.rol === 'admin') yeniDurum = 'IK_ONAYLADI';

    try {
      await axios.post(`${API_URL}/api/izin/onayla`, {
        talep_id: talep.talep_id,
        imza_data: signature,
        yeni_durum: yeniDurum
      }, {
        headers: { 
            'Authorization': `Bearer ${token}`, 
            'bypass-tunnel-reminder': 'true' 
        }
      });

      Alert.alert("Başarılı", "Onaylandı ve imzalandı! ✅");
      navigation.goBack();

    } catch (error) {
      Alert.alert("Hata", "İşlem başarısız.");
    }
  };

  // --- REDDET (İMZASIZ) ---
  const handleReject = () => {
    Alert.alert(
        "Reddet",
        "Bu izin talebini REDDETMEK istediğinize emin misiniz?",
        [
            { text: "Vazgeç", style: "cancel" },
            { 
                text: "Evet, Reddet", 
                style: 'destructive',
                onPress: async () => {
                    try {
                        await axios.post(`${API_URL}/api/izin/onayla`, {
                            talep_id: talep.talep_id,
                            imza_data: null,
                            yeni_durum: 'REDDEDILDI'
                        }, {
                            headers: { 
                                'Authorization': `Bearer ${token}`, 
                                'bypass-tunnel-reminder': 'true' 
                            }
                        });
                        Alert.alert("Bilgi", "Talep reddedildi. ❌");
                        navigation.goBack();
                    } catch (err) {
                        Alert.alert("Hata", "Reddetme işlemi başarısız.");
                    }
                }
            }
        ]
    );
  };

  // --- PDF İNDİRME (TARAYICIDA AÇAR) ---
  const pdfIndir = (tip) => {
      // tip: 'form1' veya 'form2'
      const url = `${API_URL}/api/izin/pdf/${tip}/${talep.talep_id}`;
      Linking.openURL(url); // Telefonun tarayıcısını açar
  };

  // İmza Paneli Yardımcıları
  const handleClear = () => { ref.current.clearSignature(); };
  const handleConfirm = () => { ref.current.readSignature(); };

  return (
    <ScrollView scrollEnabled={scrollEnabled} contentContainerStyle={styles.container}>
      <Text style={styles.header}>📝 Talep Detayı</Text>
      
      {/* BİLGİ KUTUSU */}
      <View style={styles.infoBox}>
        <Text style={styles.label}>Personel:</Text>
        <Text style={styles.val}>{talep.ad} {talep.soyad} ({talep.tc_no})</Text>
        
        <Text style={styles.label}>İzin Türü & Süre:</Text>
        <Text style={styles.val}>{talep.izin_turu} - {talep.kac_gun} Gün</Text>
        
        <Text style={styles.label}>Tarihler:</Text>
        <Text style={styles.val}>
            {new Date(talep.baslangic_tarihi).toLocaleDateString('tr-TR')} - {new Date(talep.bitis_tarihi).toLocaleDateString('tr-TR')}
        </Text>

        <Text style={styles.label}>Açıklama:</Text>
        <Text style={styles.val}>{talep.aciklama}</Text>
      </View>

      {/* PDF İNDİRME BUTONLARI */}
      <View style={styles.pdfContainer}>
          <Text style={styles.pdfTitle}>📄 Belge Görüntüle:</Text>
          <View style={{flexDirection:'row', justifyContent:'space-between'}}>
            <TouchableOpacity style={styles.pdfBtn} onPress={() => pdfIndir('form1')}>
                <Text style={styles.pdfBtnText}>Form 1 (Dijital)</Text>
            </TouchableOpacity>
            
            {/* Sadece Yetkililer Form 2 Görebilir */}
            {['ik', 'admin', 'yazici'].includes(user.rol) && (
                <TouchableOpacity style={[styles.pdfBtn, {backgroundColor:'#dc3545'}]} onPress={() => pdfIndir('form2')}>
                    <Text style={styles.pdfBtnText}>Form 2 (Islak)</Text>
                </TouchableOpacity>
            )}
          </View>
      </View>

      <Text style={styles.signLabel}>✍️ Lütfen Aşağıya İmza Atınız:</Text>
      
      {/* İMZA KUTUSU */}
      <View style={styles.signatureBox}>
        <SignatureScreen
            ref={ref}
            onOK={handleSignature} 
            onBegin={() => setScrollEnabled(false)} 
            onEnd={() => setScrollEnabled(true)}
            webStyle={`.m-signature-pad--footer {display: none; margin: 0px;}`} 
        />
      </View>

      {/* ONAY BUTONLARI */}
      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.btnGrey} onPress={handleClear}>
            <Text style={styles.btnText}>Temizle</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnGreen} onPress={handleConfirm}>
            <Text style={styles.btnText}>✅ İmzala ve Onayla</Text>
        </TouchableOpacity>
      </View>

      {/* REDDET BUTONU */}
      <TouchableOpacity style={styles.btnReject} onPress={handleReject}>
        <Text style={styles.btnText}>❌ Bu Talebi Reddet</Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#f8f9fa', padding: 20 },
  header: { fontSize: 22, fontWeight: 'bold', marginBottom: 15, textAlign: 'center', color: '#333' },
  
  infoBox: { backgroundColor: 'white', padding: 15, borderRadius: 10, marginBottom: 20, elevation: 2 },
  label: { fontSize: 12, color: '#999', marginBottom: 2 },
  val: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 10 },
  
  pdfContainer: { marginBottom: 20, padding: 10, backgroundColor: '#e9ecef', borderRadius: 10 },
  pdfTitle: { fontSize: 12, fontWeight: 'bold', marginBottom: 5, color:'#666' },
  pdfBtn: { backgroundColor: '#6c757d', padding: 8, borderRadius: 5, flex: 0.48, alignItems: 'center' },
  pdfBtnText: { color: 'white', fontSize: 12, fontWeight: 'bold' },

  signLabel: { fontWeight: 'bold', marginBottom: 10, color: '#333' },
  signatureBox: { 
      height: 250, borderWidth: 2, borderColor: '#0d6efd', borderRadius: 10, 
      overflow: 'hidden', marginBottom: 20, backgroundColor: 'white' 
  },
  
  buttonRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  btnGrey: { backgroundColor: '#6c757d', padding: 15, borderRadius: 10, width: '30%', alignItems: 'center' },
  btnGreen: { backgroundColor: '#28a745', padding: 15, borderRadius: 10, width: '65%', alignItems: 'center' },
  btnReject: { backgroundColor: '#dc3545', padding: 15, borderRadius: 10, alignItems: 'center', width: '100%', marginBottom: 30 },
  
  btnText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});