import React, { useState } from 'react';
import { View, StyleSheet, StatusBar, Modal, TouchableOpacity } from 'react-native';
import { Text, IconButton, Divider } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import TrainingTracker from './TrainingTracker';
import Drills from './Drills';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Main'>;

const Training = () => {
  const navigation = useNavigation<NavigationProp>();
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedScreen, setSelectedScreen] = useState<'TrainingTracker' | 'Drills'>('TrainingTracker');

  const handleScreenSelect = (screen: 'TrainingTracker' | 'Drills') => {
    setSelectedScreen(screen);
    setShowDropdown(false);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="white" />
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>{selectedScreen === 'TrainingTracker' ? 'Training Tracker' : 'Drills'}</Text>
          <IconButton
            icon="chevron-down"
            size={20}
            onPress={() => setShowDropdown(true)}
          />
        </View>
        <IconButton
          icon="account"
          size={24}
          onPress={() => navigation.navigate('PlayerProfile')}
        />
      </View>

      <Modal
        visible={showDropdown}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDropdown(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowDropdown(false)}
        >
          <View style={styles.dropdownContainer}>
            <TouchableOpacity
              style={[
                styles.dropdownItem,
                selectedScreen === 'TrainingTracker' && styles.selectedItem
              ]}
              onPress={() => handleScreenSelect('TrainingTracker')}
            >
              <Text style={[
                styles.dropdownText,
                selectedScreen === 'TrainingTracker' && styles.selectedText
              ]}>Training Tracker</Text>
            </TouchableOpacity>
            <Divider />
            <TouchableOpacity
              style={[
                styles.dropdownItem,
                selectedScreen === 'Drills' && styles.selectedItem
              ]}
              onPress={() => handleScreenSelect('Drills')}
            >
              <Text style={[
                styles.dropdownText,
                selectedScreen === 'Drills' && styles.selectedText
              ]}>Drills</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {selectedScreen === 'TrainingTracker' ? <TrainingTracker /> : <Drills />}
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 60,
  },
  dropdownContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    width: '80%',
    maxWidth: 300,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  dropdownItem: {
    padding: 16,
  },
  selectedItem: {
    backgroundColor: '#f0f0f0',
  },
  dropdownText: {
    fontSize: 16,
    color: '#333',
  },
  selectedText: {
    color: '#2196F3',
    fontWeight: 'bold',
  },
});

export default Training; 