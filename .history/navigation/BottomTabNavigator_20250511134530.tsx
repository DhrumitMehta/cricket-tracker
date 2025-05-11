import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { IconButton } from 'react-native-paper';
import TrainingTracker from '../screens/TrainingTracker';
import Matches from '../screens/Matches';
import Stats from '../screens/Stats';
import Analysis from '../screens/Analysis';
import Study from '../screens/Study';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const Tab = createBottomTabNavigator();

export default function BottomTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'TrainingTracker') {
            iconName = 'dumbbell';
          } else if (route.name === 'Matches') {
            iconName = 'cricket';
          } else if (route.name === 'Stats') {
            iconName = 'chart-bar';
          } else if (route.name === 'Analysis') {
            iconName = 'video';
          } else if (route.name === 'Study') {
            iconName = 'book-open-variant';
          }

          return <IconButton icon={iconName} size={size} iconColor={color} />;
        },
        tabBarActiveTintColor: '#2196F3',
        tabBarInactiveTintColor: 'gray',
      })}
    >
      <Tab.Screen 
        name="TrainingTracker" 
        component={TrainingTracker}
        options={{ 
          title: 'Training',
          headerShown: false
        }}
      />
      <Tab.Screen 
        name="Matches" 
        component={Matches}
        options={{ 
          title: 'Matches',
          headerShown: false
        }}
      />
      <Tab.Screen 
        name="Stats" 
        component={Stats}
        options={{ 
          title: 'Stats',
          headerShown: false
        }}
      />
      <Tab.Screen 
        name="Analysis" 
        component={Analysis}
        options={{ 
          title: 'Analysis',
          headerShown: false
        }}
      />
      <Tab.Screen 
        name="Study" 
        component={Study}
        options={{ 
          title: 'Study',
          headerShown: false
        }}
      />
    </Tab.Navigator>
  );
} 