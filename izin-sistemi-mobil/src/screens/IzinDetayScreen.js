import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Linking } from 'react-native';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../config'; 

export default function IzinDetayScreen({ route, navigation }) {
  const { talep, user, token } = route.params;
  const [yukleniyor, setYukleniyor] = useState(false);
  const [timeline, setTimeline] = useState([]);

  useEffect(() => {
    fetchTimeline();
  }, []);

  const fetchTimeline = async () => {
    try {
        const res = await axios.get(`${API_URL}/api/izin/timeline/${talep.talep_id}`, {
            headers: { 'Authorization': `Bearer ${token}`, 'bypass-tunnel-reminder': 'true' }
        });
        setTimeline(res.data);
    } catch (e) {
        console.log("Timeline çekilemedi:", e);
    }
  };

  const getStatusColor = (durum) => {
    if (durum === 'ONAY_BEKLIYOR') return '#ffc107';
    if (durum === 'IK_ONAYLADI' || durum === 'TAMAMLANDI') return '#28a745';
    if (durum === 'REDDEDILDI' || durum === 'IPTAL_EDILDI') return '#dc3545';
    return '#17a2b8'; 
  };

  const iptalEt = () => {
    Alert.alert(
        "İptal Et",
        "Bu izin talebini silmek istediğinize emin misiniz?",
        [
            { text: "Vazgeç", style: "cancel" },
            { 
                text: "Evet, Sil", 
                style: 'destructive',
                onPress: async () => {
                    setYukleniyor(true);
                    try {
                        await axios.delete(`${API_URL}/api/izin/iptal/${talep.talep_id}`, {
                            headers: { 'Authorization': `Bearer ${token}`, 'bypass-tunnel-reminder': 'true' }
                        });
                        Alert.alert("Başarılı", "İzin talebiniz iptal edildi.");
                        navigation.goBack();
                    } catch (error) {
                        const mesaj = error.response?.data?.mesaj || "İşlem başarısız.";
                        Alert.alert("Hata", mesaj);
                    } finally {
                        setYukleniyor(false);
                    }
                }
            }
        ]
    );
  };

  const pdfIndir = (tip) => {
      const url = `${API_URL}/api/izin/pdf/${tip}/${talep.talep_id}`;
      Linking.openURL(url); 
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      
      {/* BAŞLIK */}
      <View style={styles.headerBox}>
        <Ionicons name="document-text-outline" size={50} color="#0d6efd" />
        <Text style={styles.title}>İzin Detayı</Text>
        <View style={[styles.badge, { backgroundColor: getStatusColor(talep.durum) }]}>
            <Text style={styles.badgeText}>{talep.durum.replace(/_/g, ' ')}</Text>
        </View>
      </View>

      {/* BİLGİ KARTI */}
      <View style={styles.infoCard}>
        <Text style={styles.label}>İzin Türü:</Text>
        <Text style={styles.value}>{talep.izin_turu}</Text>
        
        <Text style={styles.label}>Tarihler:</Text>
        <Text style={styles.value}>
            {new Date(talep.baslangic_tarihi).toLocaleDateString('tr-TR')} - {new Date(talep.bitis_tarihi).toLocaleDateString('tr-TR')}
        </Text>

        <Text style={styles.label}>Gün Sayısı:</Text>
        <Text style={styles.value}>{talep.kac_gun} Gün</Text>

        <Text style={styles.label}>Açıklama:</Text>
        <Text style={styles.value}>{talep.aciklama}</Text>
      </View>

      {/* KARGO TAKİP (TIMELINE) */}
      <View style={styles.timelineBox}>
          <Text style={styles.timelineHeader}>📌 İşlem Geçmişi</Text>
          {timeline.length === 0 ? (
              <Text style={{color:'#999', fontStyle:'italic'}}>Henüz işlem kaydı yok.</Text>
          ) : (
              timeline.map((t, i) => (
                  <View key={i} style={styles.timelineRow}>
                      <View style={styles.dot} />
                      {/* Çizgi sadece son eleman değilse görünsün */}
                      {i !== timeline.length - 1 ? <View style={styles.line} /> : null}
                      
                      <View style={{flex: 1}}>
                          <Text style={styles.timelineTitle}>{t.islem_turu.replace(/_/g, ' ')}</Text>
                          <Text style={styles.timelineUser}>
                              {t.ad} {t.soyad} <Text style={{fontWeight:'normal', color:'#777'}}>({t.rol_adi})</Text>
                          </Text>
                          <Text style={styles.timelineDate}>{new Date(t.tarih).toLocaleString('tr-TR')}</Text>
                      </View>
                  </View>
              ))
          )}
      </View>

      {/* PDF İNDİRME ALANI */}
      <View style={styles.pdfBox}>
          <Text style={styles.pdfHeader}>📄 Belge İşlemleri</Text>
          <View style={styles.pdfRow}>
              {/* FORM 1: HERKES GÖREBİLİR */}
              <TouchableOpacity style={styles.pdfBtn} onPress={() => pdfIndir('form1')}>
                  <Text style={styles.pdfBtnText}>Form 1 (Dijital)</Text>
              </TouchableOpacity>
              
              {/* FORM 2: SADECE YETKİLİLER GÖRÜR (Personel göremez) */}
              {['admin', 'ik', 'filo', 'amir', 'yazici'].includes(user.rol) && talep.durum === 'IK_ONAYLADI' ? (
                  <TouchableOpacity style={[styles.pdfBtn, {backgroundColor: '#dc3545'}]} onPress={() => pdfIndir('form2')}>
                      <Text style={styles.pdfBtnText}>Form 2 (Islak)</Text>
                  </TouchableOpacity>
              ) : null}
          </View>
      </View>

      {/* İPTAL BUTONU */}
      {talep.durum !== 'IK_ONAYLADI' && talep.durum !== 'REDDEDILDI' && talep.durum !== 'TAMAMLANDI' && talep.durum !== 'IPTAL_EDILDI' ? (
          <TouchableOpacity 
            style={[styles.cancelButton, yukleniyor && {backgroundColor:'#ccc'}]} 
            onPress={iptalEt}
            disabled={yukleniyor}
          >
            {yukleniyor ? (
                <ActivityIndicator color="white"/>
            ) : (
                <View style={{flexDirection:'row', alignItems:'center'}}>
                    <Ionicons name="trash-outline" size={20} color="white" style={{marginRight:5}} />
                    <Text style={styles.cancelText}>Talebi İptal Et</Text>
                </View>
            )}
          </TouchableOpacity>
      ) : null}

      {(talep.durum === 'IK_ONAYLADI' || talep.durum === 'TAMAMLANDI') ? (
          <Text style={styles.warningText}>⚠️ Onaylanmış izinler buradan iptal edilemez.</Text>
      ) : null}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: '#f8f9fa', flexGrow: 1 },
  headerBox: { alignItems: 'center', marginBottom: 20, marginTop: 10 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#333', marginVertical: 10 },
  badge: { paddingHorizontal: 15, paddingVertical: 5, borderRadius: 20 },
  badgeText: { color: 'white', fontWeight: 'bold', fontSize: 12 },
  
  infoCard: { width: '100%', backgroundColor: 'white', padding: 20, borderRadius: 15, elevation: 3, marginBottom: 20 },
  label: { fontSize: 12, color: '#999', marginTop: 10 },
  value: { fontSize: 16, fontWeight: 'bold', color: '#333' },

  timelineBox: { width: '100%', backgroundColor: 'white', padding: 20, borderRadius: 15, elevation: 2, marginBottom: 20 },
  timelineHeader: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 15, borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 10 },
  timelineRow: { flexDirection: 'row', marginBottom: 20, position: 'relative' },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#28a745', marginTop: 4, marginRight: 15, zIndex: 2 },
  line: { position: 'absolute', left: 5, top: 15, bottom: -25, width: 2, backgroundColor: '#e9ecef', zIndex: 1 },
  timelineTitle: { fontWeight: 'bold', fontSize: 14, color: '#333' },
  timelineUser: { fontSize: 13, color: '#555', marginTop: 2 },
  timelineDate: { fontSize: 11, color: '#999', marginTop: 2 },

  pdfBox: { width: '100%', backgroundColor: '#e9ecef', padding: 15, borderRadius: 10, marginBottom: 30 },
  pdfHeader: { fontSize: 12, fontWeight: 'bold', color: '#666', marginBottom: 10 },
  pdfRow: { flexDirection: 'row', justifyContent: 'space-between' },
  pdfBtn: { flex: 0.48, backgroundColor: '#6c757d', padding: 10, borderRadius: 5, alignItems: 'center' },
  pdfBtnText: { color: 'white', fontSize: 12, fontWeight: 'bold' },

  cancelButton: { 
      flexDirection: 'row', backgroundColor: '#dc3545', padding: 15, borderRadius: 10, 
      width: '100%', justifyContent: 'center', alignItems: 'center', marginBottom: 20
  },
  cancelText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  warningText: { color: '#856404', backgroundColor: '#fff3cd', padding: 10, borderRadius: 5, textAlign: 'center', marginTop: 10 }
});