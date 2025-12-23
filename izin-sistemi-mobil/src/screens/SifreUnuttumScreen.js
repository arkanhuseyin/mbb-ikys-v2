import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../config'; // Merkezi Link Dosyası

export default function SifreUnuttumScreen({ navigation }) {
  const [tcNo, setTcNo] = useState('');
  const [email, setEmail] = useState('');
  const [yukleniyor, setYukleniyor] = useState(false);

  const talepGonder = async () => {
    if (!tcNo || !email) { 
        Alert.alert("Uyarı", "Lütfen TC Kimlik No ve E-Posta alanlarını doldurunuz."); 
        return; 
    }

    setYukleniyor(true);
    try {
        // Merkezi linkten isteği gönderiyoruz
        await axios.post(`${API_URL}/api/auth/sifremi-unuttum`, { 
            tc_no: tcNo, 
            email: email 
        }, {
            headers: { 'bypass-tunnel-reminder': 'true' }
        });

        Alert.alert("Başarılı", "Sıfırlama talebiniz Admin'e iletildi. Size dönüş yapılacaktır.", [
            { text: "Tamam", onPress: () => navigation.goBack() }
        ]);

    } catch (error) {
        if (error.response && error.response.status === 404) {
            Alert.alert("Hata", "Bu bilgilere ait kayıt bulunamadı.");
        } else {
            Alert.alert("Hata", "İşlem başarısız. Sunucu hatası.");
        }
    } finally {
        setYukleniyor(false);
    }
  };

  return (
    <View style={styles.container}>
      
      {/* Geri Dön Butonu */}
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={24} color="#333" />
      </TouchableOpacity>

      <View style={styles.content}>
        <Ionicons name="lock-open-outline" size={60} color="#0d6efd" style={{marginBottom: 20}} />
        
        <Text style={styles.title}>Şifre Sıfırlama</Text>
        
        <Text style={styles.desc}>
            Lütfen sisteme kayıtlı TC Kimlik Numaranızı ve E-Posta adresinizi giriniz. 
            Talebiniz yöneticiye iletilecektir.
        </Text>

        <TextInput 
            style={styles.input} 
            placeholder="TC Kimlik No" 
            placeholderTextColor="#999"
            value={tcNo} 
            onChangeText={setTcNo} 
            keyboardType="number-pad" 
        />
        
        <TextInput 
            style={styles.input} 
            placeholder="E-Posta Adresi" 
            placeholderTextColor="#999"
            value={email} 
            onChangeText={setEmail} 
            keyboardType="email-address" 
            autoCapitalize="none"
        />

        <TouchableOpacity 
            style={[styles.button, yukleniyor && {backgroundColor:'#ccc'}]} 
            onPress={talepGonder}
            disabled={yukleniyor}
        >
            {yukleniyor ? (
                <ActivityIndicator size="small" color="white" />
            ) : (
                <Text style={styles.buttonText}>Talep Gönder</Text>
            )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa', padding: 20 },
  backButton: { marginTop: 30, marginBottom: 20 },
  content: { alignItems: 'center', marginTop: 30 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 10 },
  desc: { textAlign: 'center', color: '#666', marginBottom: 30, lineHeight: 20, paddingHorizontal: 10 },
  input: { width: '100%', backgroundColor: 'white', borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 15, marginBottom: 15, fontSize: 16 },
  button: { width: '100%', backgroundColor: '#0d6efd', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  buttonText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});