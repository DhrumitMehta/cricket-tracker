import React from 'react';
import { View, StyleSheet } from 'react-native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { Text, IconButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import TrainingTracker from './TrainingTracker';
import Drills from './Drills';

const Tab = createMaterialTopTabNavigator();

const Training = () => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Training</Text>
        <IconButton
          icon="account-circle"
          size={24}
          onPress={() => {
            // Handle profile button press
          }}
        />
      </View>
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
});

export default Training; 