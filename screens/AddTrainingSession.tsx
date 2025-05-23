import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Button, Text, TextInput, Chip } from 'react-native-paper';
import { supabase } from '../lib/supabase';
import { Calendar } from 'react-native-calendars';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'AddTrainingSession'>;
type AddTrainingSessionRouteProp = RouteProp<RootStackParamList, 'AddTrainingSession'>;

interface TrainingDay {
  id: string;
  name: string;
  type: 'Tactical' | 'Technical' | 'Fun';
}

const FOCUS_AREAS = ['Batting', 'Bowling', 'Fielding', 'Fitness'];

export default function AddTrainingSession() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<AddTrainingSessionRouteProp>();
  const isEditing = !!route.params?.session;

  const [showCalendar, setShowCalendar] = useState(false);
  const [trainingDays, setTrainingDays] = useState<TrainingDay[]>([]);
  const [selectedTrainingDay, setSelectedTrainingDay] = useState<TrainingDay | null>(null);
  const [newSession, setNewSession] = useState({
    date: new Date().toISOString().split('T')[0],
    duration: '',
    focus_area: '',
    technical_notes: '',
    tactical_notes: '',
  });

  useEffect(() => {
    fetchTrainingDays();
    if (isEditing && route.params?.session) {
      const session = route.params.session;
      setNewSession({
        date: session.date,
        duration: session.duration.toString(),
        focus_area: session.focus_area,
        technical_notes: session.technical_notes || '',
        tactical_notes: session.tactical_notes || '',
      });
      if (session.training_day_id) {
        fetchTrainingDay(session.training_day_id);
      }
    }
  }, [isEditing, route.params?.session]);

  const fetchTrainingDays = async () => {
    try {
      const { data, error } = await supabase
        .from('training_days')
        .select('*')
        .order('name');

      if (error) throw error;
      setTrainingDays(data || []);
    } catch (error: any) {
      console.error('Error fetching training days:', error.message);
    }
  };

  const fetchTrainingDay = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('training_days')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setSelectedTrainingDay(data);
    } catch (error: any) {
      console.error('Error fetching training day:', error.message);
    }
  };

  const handleSaveSession = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('No authenticated user');

      const sessionData = {
        date: newSession.date,
        duration: parseInt(newSession.duration),
        focus_area: newSession.focus_area,
        technical_notes: newSession.technical_notes,
        tactical_notes: newSession.tactical_notes,
        training_day_id: selectedTrainingDay?.id || null,
        user_id: user.id,
      };

      if (isEditing && route.params?.session) {
        const { error } = await supabase
          .from('training_sessions')
          .update(sessionData)
          .eq('id', route.params.session.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('training_sessions')
          .insert([sessionData]);

        if (error) throw error;
      }

      navigation.goBack();
    } catch (error: any) {
      console.error('Error saving session:', error.message);
      Alert.alert('Error', 'Failed to save training session');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.formContainer}>
        <Text style={styles.title}>{isEditing ? 'Edit Training Session' : 'New Training Session'}</Text>
        
        <Button 
          mode="outlined" 
          onPress={() => setShowCalendar(true)}
          style={styles.dateButton}
        >
          {newSession.date}
        </Button>

        {showCalendar && (
          <View style={styles.calendarOverlay}>
            <View style={styles.calendarContainer}>
              <Calendar
                onDayPress={(day) => {
                  setNewSession({ ...newSession, date: day.dateString });
                  setShowCalendar(false);
                }}
                markedDates={{
                  [newSession.date]: { selected: true, selectedColor: '#2196F3' }
                }}
                style={styles.calendar}
              />
              <Button onPress={() => setShowCalendar(false)}>Close</Button>
            </View>
          </View>
        )}

        <TextInput
          label="Duration (minutes)"
          value={newSession.duration}
          onChangeText={(text) => setNewSession({ ...newSession, duration: text })}
          keyboardType="numeric"
          style={styles.input}
        />

        <View style={styles.focusAreaContainer}>
          <Text style={styles.focusAreaLabel}>Focus Area</Text>
          <View style={styles.focusAreaButtons}>
            {FOCUS_AREAS.map((area) => (
              <Button
                key={area}
                mode={newSession.focus_area === area ? "contained" : "outlined"}
                onPress={() => setNewSession({ ...newSession, focus_area: area })}
                style={styles.focusAreaButton}
                labelStyle={styles.focusAreaButtonLabel}
              >
                {area}
              </Button>
            ))}
          </View>
        </View>

        <View style={styles.trainingDayContainer}>
          <Text style={styles.trainingDayLabel}>Training Day</Text>
          <View style={styles.trainingDayButtons}>
            {trainingDays.map((day) => (
              <Chip
                key={day.id}
                selected={selectedTrainingDay?.id === day.id}
                onPress={() => setSelectedTrainingDay(day)}
                style={styles.trainingDayChip}
                mode="outlined"
              >
                {day.name} ({day.type})
              </Chip>
            ))}
          </View>
        </View>

        <TextInput
          label="Technical Notes"
          value={newSession.technical_notes}
          onChangeText={(text) => setNewSession({ ...newSession, technical_notes: text })}
          multiline
          style={styles.input}
        />

        <TextInput
          label="Tactical Notes"
          value={newSession.tactical_notes}
          onChangeText={(text) => setNewSession({ ...newSession, tactical_notes: text })}
          multiline
          style={styles.input}
        />

        <Button mode="contained" onPress={handleSaveSession} style={styles.button}>
          {isEditing ? 'Update Session' : 'Add Session'}
        </Button>
        <Button mode="outlined" onPress={() => navigation.goBack()} style={styles.button}>
          Cancel
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  formContainer: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  input: {
    marginBottom: 12,
  },
  button: {
    marginTop: 16,
  },
  dateButton: {
    marginBottom: 12,
    padding: 8,
  },
  calendarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  calendarContainer: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    width: '90%',
  },
  calendar: {
    borderRadius: 10,
    elevation: 4,
    marginBottom: 10,
  },
  focusAreaContainer: {
    marginBottom: 12,
  },
  focusAreaLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  focusAreaButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  focusAreaButton: {
    flex: 1,
    minWidth: '22%',
  },
  focusAreaButtonLabel: {
    fontSize: 12,
  },
  trainingDayContainer: {
    marginBottom: 12,
  },
  trainingDayLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  trainingDayButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  trainingDayChip: {
    marginBottom: 8,
  },
}); 