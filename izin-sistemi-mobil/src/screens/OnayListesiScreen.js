import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../config'; // Merkezi Link Dosyası

export default function OnayListesiScreen({ route, navigation }) {
  const { user, token, mod } = route.params; // mod: 'BEKLEYEN' veya 'GECMIS'
  const [talepler, setTalepler] = useState([]);
  const [yukleniyor, setYukleniyor] = useState(false);

  useEffect(() => {
    // Bu ekrana her dönüldüğünde listeyi yenile (İmza atıp dönünce güncellensin)
    const unsubscribe = navigation.addListener('focus', () => {
      verileriCek();
    });
    return unsubscribe;
  }, [navigation]);

  const verileriCek = async () => {
    setYukleniyor(true);
    try {
      // Merkezi linkten verileri çekiyoruz
      const response = await axios.get(`${API_URL}/api/izin/listele`, {
        headers: { 
            'Authorization': `Bearer ${token}`, 
            'bypass-tunnel-reminder': 'true' 
        }
      });

      // Backend tüm veriyi gönderiyor, burada rolümüze göre filtreliyoruz
      const filtrelenmis = response.data.filter(item => {
        
        // 1. GEÇMİŞ MODU (Onaylanmış veya Reddedilmişler)
        if (mod === 'GECMIS') {
            return item.durum === 'IK_ONAYLADI' || item.durum === 'REDDEDILDI';
        }

        // 2. BEKLEYEN MODU (İmza Sırası Bende mi?)
        
        // Admin her şeyi görür
        if (user.rol === 'admin') return true; 
        
        // Amir: Sadece 'ONAY_BEKLIYOR' olanları görür
        if (user.rol === 'amir' && item.durum === 'ONAY_BEKLIYOR') return true;
        
        // Yazıcı: Sadece Amir onaylamışsa ('AMIR_ONAYLADI') görür
        if (user.rol === 'yazici' && item.durum === 'AMIR_ONAYLADI') return true;
        
        // İK: Sadece Yazıcı onaylamışsa ('YAZICI_ONAYLADI') görür
        if ((user.rol === 'ik') && item.durum === 'YAZICI_ONAYLADI') return true;
        
        return false;
      });

      setTalepler(filtrelenmis);
    } catch (error) {
      console.log(error);
    } finally {
      setYukleniyor(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>
        {mod === 'BEKLEYEN' ? '🔴 Onay Bekleyenler' : '📂 Birim Geçmişi'}
      </Text>

      {yukleniyor && <ActivityIndicator size="large" color="#0d6efd" />}

      <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
        
        {talepler.length === 0 && !yukleniyor && (
            <Text style={styles.bosMesaj}>Dosya bulunamadı.</Text>
        )}

        {talepler.map((item) => (
          <TouchableOpacity 
            key={item.talep_id} 
            style={styles.card}
            onPress={() => {
                if(mod === 'BEKLEYEN') {
                    // Bekleyen iş ise Detay/İmza ekranına git
                    navigation.navigate('OnayDetay', { talep: item, user, token });
                } else {
                    // Geçmiş iş ise sadece bilgi ver (İleride salt okunur detay yapılabilir)
                    alert("Bu işlem zaten tamamlanmış.");
                }
            }}
          >
            {/* Üst Satır: İsim ve Tür */}
            <View style={styles.row}>
                <Text style={styles.name}>{item.ad} {item.soyad}</Text>
                <Text style={styles.type}>{item.izin_turu}</Text>
            </View>
            
            {/* Tarih ve Gün */}
            <Text style={styles.dates}>
                {new Date(item.baslangic_tarihi).toLocaleDateString('tr-TR')} - {item.kac_gun} Gün
            </Text>
            
            {/* Açıklama */}
            <Text style={styles.desc} numberOfLines={2}>{item.aciklama}</Text>
            
            {/* Durum Rozeti */}
            {mod === 'BEKLEYEN' && (
                <View style={styles.actionBadge}>
                    <Text style={{color:'white', fontWeight:'bold'}}>İmza Bekliyor ✍️</Text>
                </View>
            )}
             {mod === 'GECMIS' && (
                <View style={[styles.actionBadge, {backgroundColor: item.durum==='REDDEDILDI' ? '#dc3545' : '#28a745'}]}>
                    <Text style={{color:'white', fontWeight:'bold'}}>{item.durum}</Text>
                </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa', padding: 20 },
  header: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, color: '#333', marginTop: 10 },
  
  bosMesaj: { textAlign: 'center', color: '#999', marginTop: 50, fontSize: 16 },
  
  card: { 
      backgroundColor: 'white', padding: 15, borderRadius: 10, marginBottom: 15, elevation: 3,
      borderLeftWidth: 5, borderLeftColor: '#0d6efd' 
  },
  
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  name: { fontWeight: 'bold', fontSize: 16, color: '#333' },
  type: { color: '#0d6efd', fontWeight: 'bold' },
  
  dates: { color: '#666', marginBottom: 5, fontSize: 13 },
  desc: { fontStyle: 'italic', color: '#888', marginBottom: 10 },
  
  actionBadge: { 
      backgroundColor: '#ffc107', padding: 8, borderRadius: 5, alignItems: 'center', marginTop: 5 
  }
});