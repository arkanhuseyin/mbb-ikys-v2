import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../config'; // Merkezi Link Dosyası

export default function GecmisIzinlerScreen({ route, navigation }) {
  const { user, token } = route.params;
  const [izinler, setIzinler] = useState([]);
  const [yukleniyor, setYukleniyor] = useState(false);

  useEffect(() => {
    // Bu ekrana her dönüldüğünde (Detaydan geri gelince) listeyi yenile
    // Böylece iptal edilen izinler listeden silinmiş olur.
    const unsubscribe = navigation.addListener('focus', () => {
      izinleriCek();
    });
    return unsubscribe;
  }, [navigation]);

  const izinleriCek = async () => {
    setYukleniyor(true);
    try {
      const response = await axios.get(`${API_URL}/api/izin/listele`, {
        headers: { 
            'Authorization': `Bearer ${token}`, 
            'bypass-tunnel-reminder': 'true' 
        }
      });
      setIzinler(response.data);
    } catch (error) {
      console.log("Geçmiş izinler hatası:", error);
    } finally {
      setYukleniyor(false);
    }
  };

  const durumAnaliz = (durum) => {
    switch(durum) {
        case 'ONAY_BEKLIYOR': return { renk: '#ffc107', metin: 'Amir Onayı Bekliyor', ikon: 'hourglass' };
        case 'AMIR_ONAYLADI': return { renk: '#17a2b8', metin: 'Yazıcı Onayı Bekliyor', ikon: 'create' };
        case 'YAZICI_ONAYLADI': return { renk: '#6f42c1', metin: 'İK Onayı Bekliyor', ikon: 'business' };
        case 'IK_ONAYLADI': return { renk: '#28a745', metin: 'Onaylandı (Tamamlandı)', ikon: 'checkmark-circle' };
        case 'REDDEDILDI': return { renk: '#dc3545', metin: 'Reddedildi ❌', ikon: 'close-circle' };
        default: return { renk: '#6c757d', metin: durum, ikon: 'help-circle' };
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>📂 Geçmiş Taleplerim</Text>

      {yukleniyor && <ActivityIndicator size="large" color="#0d6efd" />}

      <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
        
        {izinler.length === 0 && !yukleniyor && (
            <Text style={styles.bosMesaj}>Henüz bir izin talebiniz yok.</Text>
        )}

        {izinler.map((izin) => {
            const durumBilgi = durumAnaliz(izin.durum);
            
            return (
                <TouchableOpacity 
                    key={izin.talep_id} 
                    style={[styles.card, { borderLeftColor: durumBilgi.renk }]}
                    // Tıklayınca Detay/İptal ekranına git
                    onPress={() => navigation.navigate('IzinDetay', { talep: izin, user, token })}
                >
                    <View style={styles.row}>
                        <Text style={styles.type}>{izin.izin_turu} İzni</Text>
                        <Text style={styles.days}>{izin.kac_gun} Gün</Text>
                    </View>
                    
                    <Text style={styles.dates}>
                        {new Date(izin.baslangic_tarihi).toLocaleDateString('tr-TR')} - {new Date(izin.bitis_tarihi).toLocaleDateString('tr-TR')}
                    </Text>

                    <View style={styles.statusRow}>
                        <Ionicons name={durumBilgi.ikon} size={18} color={durumBilgi.renk} />
                        <Text style={[styles.statusText, { color: durumBilgi.renk }]}>
                            {durumBilgi.metin}
                        </Text>
                    </View>
                </TouchableOpacity>
            );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa', padding: 20 },
  header: { fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 20, textAlign:'center', marginTop:20 },
  bosMesaj: { textAlign: 'center', color: '#999', marginTop: 50, fontSize: 16 },
  card: { backgroundColor: 'white', padding: 15, borderRadius: 10, marginBottom: 15, elevation: 3, borderLeftWidth: 5 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  type: { fontWeight: 'bold', fontSize: 16, color: '#333' },
  days: { fontWeight: 'bold', color: '#666' },
  dates: { fontSize: 14, color: '#555', marginBottom: 10 },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 5 },
  statusText: { marginLeft: 5, fontWeight: 'bold', fontSize: 13 }
});