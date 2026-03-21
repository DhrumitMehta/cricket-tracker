import React from 'react';
import { Provider as PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './navigation/AppNavigator';
import { SessionProvider } from './contexts/SessionContext';
import { AppTheme } from './theme';

export default function App() {
  return (
    <SafeAreaProvider>
      <PaperProvider theme={AppTheme}>
        <SessionProvider>
          <AppNavigator />
        </SessionProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
