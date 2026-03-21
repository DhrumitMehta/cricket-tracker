import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as Linking from 'expo-linking';
import TrainingTracker from '../screens/TrainingTracker';
import AddTrainingSession from '../screens/AddTrainingSession';
import PlayerProfile from '../screens/PlayerProfile';
import Login from '../screens/Login';
import SignUp from '../screens/SignUp';
import Matches from '../screens/Matches';
import BottomTabNavigator from './BottomTabNavigator';
import { supabase } from '../lib/supabase';
import { useSession } from '../contexts/SessionContext';
import Stats from '../screens/Stats';
import Analysis from '../screens/Analysis';
import Study from '../screens/Study';

export type RootStackParamList = {
  Login: undefined;
  SignUp: undefined;
  Main: undefined;
  AddTrainingSession: { session?: any };
  PlayerProfile: undefined;
  Stats: undefined;
  Analysis: undefined;
  Study: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const { session, loading } = useSession();

  // Email confirmation / magic-link: open app via cricketos:// and finish session (PKCE or implicit).
  useEffect(() => {
    const handleUrl = async (url: string | null) => {
      if (!url) return;
      try {
        const parsed = Linking.parse(url);
        const code = parsed.queryParams?.code;
        if (typeof code === 'string') {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) console.warn('Auth code exchange:', error.message);
          return;
        }
        const hashIdx = url.indexOf('#');
        if (hashIdx !== -1) {
          const params = new URLSearchParams(url.slice(hashIdx + 1));
          const access_token = params.get('access_token');
          const refresh_token = params.get('refresh_token');
          if (access_token && refresh_token) {
            await supabase.auth.setSession({ access_token, refresh_token });
          }
        }
      } catch (e) {
        console.warn('Auth deep link:', e);
      }
    };

    Linking.getInitialURL().then(handleUrl);
    const sub = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    return () => sub.remove();
  }, []);

  if (loading) {
    return null;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator key={session?.user?.id ?? 'unauthenticated'}>
        {!session ? (
          <>
            <Stack.Screen 
              name="Login" 
              component={Login}
              options={{ headerShown: false }}
            />
            <Stack.Screen 
              name="SignUp" 
              component={SignUp}
              options={{ headerShown: false }}
            />
          </>
        ) : (
          <>
            <Stack.Screen 
              name="Main" 
              component={BottomTabNavigator}
              options={({ navigation }) => ({
                headerShown: false,
              })}
            />
            <Stack.Screen 
              name="AddTrainingSession" 
              component={AddTrainingSession}
              options={{ title: 'Add Training Session' }}
            />
            <Stack.Screen 
              name="PlayerProfile" 
              component={PlayerProfile}
              options={{ title: 'Player Profile' }}
            />
            <Stack.Screen 
              name="Stats" 
              component={Stats}
              options={{
                title: 'Statistics',
              }}
            />
            <Stack.Screen 
              name="Analysis" 
              component={Analysis}
              options={{
                title: 'Video Analysis',
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
} 