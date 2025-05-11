import React from 'react';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import TrainingTracker from './TrainingTracker';
import Drills from './Drills';

const Tab = createMaterialTopTabNavigator();

const Training = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarLabelStyle: { fontSize: 14, textTransform: 'none' },
        tabBarStyle: { backgroundColor: 'white' },
        tabBarIndicatorStyle: { backgroundColor: '#2196F3' },
        tabBarActiveTintColor: '#2196F3',
        tabBarInactiveTintColor: 'gray',
      }}
    >
      <Tab.Screen 
        name="TrainingTracker" 
        component={TrainingTracker}
        options={{ title: 'Training Tracker' }}
      />
      <Tab.Screen 
        name="Drills" 
        component={Drills}
        options={{ title: 'Drills' }}
      />
    </Tab.Navigator>
  );
};

export default Training; 