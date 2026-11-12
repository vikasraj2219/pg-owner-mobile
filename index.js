import * as SplashScreen from 'expo-splash-screen';

// Prevent native splash screen from auto-hiding immediately before any router or components load
SplashScreen.preventAutoHideAsync().catch(() => {});

import 'expo-router/entry';

