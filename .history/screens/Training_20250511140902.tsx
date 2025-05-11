import React from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { Text, IconButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import TrainingTracker from './TrainingTracker';
import Drills from './Drills';

const Tab = createMaterialTopTabNavigator();
type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Main'>;

const Training = () => {
  const navigation = useNavigation<NavigationProp>();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="white" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Training</Text>
        <IconButton
          icon="account"
          size={24}
          onPress={() => navigation.navigate('PlayerProfile')}
        />
      </View>
      <Tab.Navigator
        screenOptions={{
          tabBarLabelStyle: { 
            fontSize: 14, 
            textTransform: 'none',
            color: '#666'
          },
          tabBarStyle: { 
            backgroundColor: 'white',
            elevation: 0,
            shadowOpacity: 0,
            borderBottomWidth: 1,
            borderBottomColor: '#eee'
          },
          tabBarIndicatorStyle: { 
            backgroundColor: '#2196F3',
            height: 2
          },
          tabBarActiveTintColor: '#2196F3',
          tabBarInactiveTintColor: '#666',
        }}
      >
        <Tab.Screen 
          name="TrainingTracker" 
          component={TrainingTracker}
          options={{ 
            title: 'Training Tracker',
            tabBarLabel: 'Training Tracker'
          }}
        />
        <Tab.Screen 
          name="Drills" 
          component={Drills}
          options={{ 
            title: 'Drills',
            tabBarLabel: 'Drills'
          }}
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
    fontSize: 20,
    fontWeight: 'bold',
  },
});

export default Training; 