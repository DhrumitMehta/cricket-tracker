import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { IconButton } from 'react-native-paper';
import TrainingTracker from '../screens/TrainingTracker';
import AddTrainingSession from '../screens/AddTrainingSession';
import PlayerProfile from '../screens/PlayerProfile';
import Login from '../screens/Login';
import SignUp from '../screens/SignUp';
import Matches from '../screens/Matches';
import BottomTabNavigator from './BottomTabNavigator';
import { supabase } from '../lib/supabase';
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
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return null;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator>
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