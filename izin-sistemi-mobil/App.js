import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

import LoginScreen from './src/screens/LoginScreen';
import SifreUnuttumScreen from './src/screens/SifreUnuttumScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import IzinTalepScreen from './src/screens/IzinTalepScreen';
import GecmisIzinlerScreen from './src/screens/GecmisIzinlerScreen';
import IzinDetayScreen from './src/screens/IzinDetayScreen';
import BildirimScreen from './src/screens/BildirimScreen';
import ProfilScreen from './src/screens/ProfilScreen';
import OnayListesiScreen from './src/screens/OnayListesiScreen';
import OnayDetayScreen from './src/screens/OnayDetayScreen';

const Stack = createStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="SifreUnuttum" component={SifreUnuttumScreen} />
        <Stack.Screen name="Dashboard" component={DashboardScreen} />
        <Stack.Screen name="IzinTalep" component={IzinTalepScreen} />
        <Stack.Screen name="GecmisIzinler" component={GecmisIzinlerScreen} />
        <Stack.Screen name="IzinDetay" component={IzinDetayScreen} />
        <Stack.Screen name="Bildirimler" component={BildirimScreen} />
        <Stack.Screen name="Profil" component={ProfilScreen} />
        <Stack.Screen name="OnayListesi" component={OnayListesiScreen} />
        <Stack.Screen name="OnayDetay" component={OnayDetayScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}