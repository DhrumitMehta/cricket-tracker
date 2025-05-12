import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import {
  Text,
  Card,
  FAB,
  Portal,
  Dialog,
  TextInput,
  Button,
  Chip,
  IconButton,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';

interface Drill {
  id: string;
  name: string;
  category: 'batting' | 'bowling' | 'fielding' | 'fitness';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  description: string;
  equipment_needed: string[];
}

interface TrainingDay {
  id: string;
  name: string;
  type: 'Tactical' | 'Technical' | 'Fun';
  drills: Drill[];
  created_at: string;
}

const TRAINING_TYPES = ['Tactical', 'Technical', 'Fun'];

const TrainingDays = () => {
  const [trainingDays, setTrainingDays] = useState<TrainingDay[]>([]);
  const [filteredDays, setFilteredDays] = useState<TrainingDay[]>([]);
  const [selectedType, setSelectedType] = useState<TrainingDay['type'] | 'All'>('All');
  const [drills, setDrills] = useState<Drill[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingDay, setEditingDay] = useState<TrainingDay | null>(null);
  const [newDay, setNewDay] = useState({
    name: '',
    type: null as TrainingDay['type'] | null,
    drills: [] as Drill[],
  });
  const [errors, setErrors] = useState<{
    name?: string;
    type?: string;
    drills?: string;
  }>({});

  useEffect(() => {
    fetchTrainingDays();
    fetchDrills();
  }, []);

  useEffect(() => {
    if (selectedType === 'All') {
      setFilteredDays(trainingDays);
    } else {
      setFilteredDays(trainingDays.filter(day => day.type === selectedType));
    }
  }, [selectedType, trainingDays]);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchTrainingDays(), fetchDrills()]);
    setRefreshing(false);
  }, []);

  const fetchTrainingDays = async () => {
    try {
      const { data, error } = await supabase
        .from('training_days')
        .select(`
          *,
          drills:training_day_drills(
            drill:drills(*)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform the data to match our interface
      const transformedData = data.map(day => ({
        ...day,
        drills: day.drills.map((d: any) => d.drill),
      }));

      setTrainingDays(transformedData);
    } catch (error: any) {
      console.error('Error fetching training days:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchDrills = async () => {
    try {
      const { data, error } = await supabase
        .from('drills')
        .select('*')
        .order('name');

      if (error) throw error;
      setDrills(data || []);
    } catch (error: any) {
      console.error('Error fetching drills:', error.message);
    }
  };

  const validateForm = () => {
    const newErrors: typeof errors = {};
    if (!newDay.name.trim()) {
      newErrors.name = 'Name is required';
    }
    if (!newDay.type) {
      newErrors.type = 'Please select a type';
    }
    if (newDay.drills.length === 0) {
      newErrors.drills = 'Please select at least one drill';
    }
    if (newDay.drills.length > 10) {
      newErrors.drills = 'Maximum 10 drills allowed';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleEditDay = (day: TrainingDay) => {
    setEditingDay(day);
    setNewDay({
      name: day.name,
      type: day.type,
      drills: day.drills,
    });
    setShowAddDialog(true);
  };

  const handleSubmit = async () => {
    if (validateForm()) {
      try {
        if (editingDay) {
          // Update existing training day
          const { data, error } = await supabase
            .from('training_days')
            .update({
              name: newDay.name.trim(),
              type: newDay.type,
            })
            .eq('id', editingDay.id)
            .select()
            .single();

          if (error) throw error;

          // Update drills
          await supabase
            .from('training_day_drills')
            .delete()
            .eq('training_day_id', editingDay.id);

          await supabase
            .from('training_day_drills')
            .insert(
              newDay.drills.map(drill => ({
                training_day_id: editingDay.id,
                drill_id: drill.id,
              }))
            );

          // Update local state
          const updatedDay = {
            ...data,
            drills: newDay.drills,
          };
          setTrainingDays(trainingDays.map(d => d.id === editingDay.id ? updatedDay : d));
        } else {
          // Create new training day
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error('User not authenticated');

          const { data, error } = await supabase
            .from('training_days')
            .insert([
              {
                name: newDay.name.trim(),
                type: newDay.type,
                user_id: user.id,
              },
            ])
            .select()
            .single();

          if (error) throw error;

          // Add drills
          await supabase
            .from('training_day_drills')
            .insert(
              newDay.drills.map(drill => ({
                training_day_id: data.id,
                drill_id: drill.id,
              }))
            );

          // Update local state
          const newTrainingDay = {
            ...data,
            drills: newDay.drills,
          };
          setTrainingDays([newTrainingDay, ...trainingDays]);
        }

        setShowAddDialog(false);
        setEditingDay(null);
        setNewDay({
          name: '',
          type: null,
          drills: [],
        });
        setErrors({});
      } catch (error: any) {
        console.error('Error saving training day:', error.message);
      }
    }
  };

  const handleDeleteDay = async (dayId: string) => {
    try {
      // Delete associated drills first
      await supabase
        .from('training_day_drills')
        .delete()
        .eq('training_day_id', dayId);

      // Delete the training day
      const { error } = await supabase
        .from('training_days')
        .delete()
        .eq('id', dayId);

      if (error) throw error;

      setTrainingDays(trainingDays.filter(day => day.id !== dayId));
    } catch (error: any) {
      console.error('Error deleting training day:', error.message);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.filterContainer}>
        <Text style={styles.filterLabel}>Filter by Type:</Text>
        <View style={styles.filterChips}>
          <Chip
            selected={selectedType === 'All'}
            onPress={() => setSelectedType('All')}
            style={styles.filterChip}
            mode="outlined"
          >
            All
          </Chip>
          {TRAINING_TYPES.map((type) => (
            <Chip
              key={type}
              selected={selectedType === type}
              onPress={() => setSelectedType(type as TrainingDay['type'])}
              style={styles.filterChip}
              mode="outlined"
            >
              {type}
            </Chip>
          ))}
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredDays.map((day) => (
          <Card key={day.id} style={styles.dayCard}>
            <Card.Content>
              <View style={styles.dayHeader}>
                <View>
                  <Text style={styles.dayName}>{day.name}</Text>
                  <Chip mode="outlined" style={styles.dayType}>
                    {day.type}
                  </Chip>
                </View>
                <View style={styles.dayActions}>
                  <IconButton
                    icon="pencil"
                    size={20}
                    onPress={() => handleEditDay(day)}
                  />
                  <IconButton
                    icon="delete"
                    size={20}
                    onPress={() => handleDeleteDay(day.id)}
                  />
                </View>
              </View>
              <Text style={styles.drillsTitle}>Drills:</Text>
              <View style={styles.drillsList}>
                {day.drills.map((drill, index) => (
                  <View key={drill.id} style={styles.drillItem}>
                    <Text style={styles.drillNumber}>{index + 1}.</Text>
                    <View style={styles.drillContent}>
                      <View style={styles.drillHeader}>
                        <Text style={styles.drillName}>{drill.name}</Text>
                        <Chip 
                          mode="outlined" 
                          style={[
                            styles.difficultyChip,
                            styles[`${drill.difficulty}Difficulty`]
                          ]}
                        >
                          {drill.difficulty.charAt(0).toUpperCase() + drill.difficulty.slice(1)}
                        </Chip>
                      </View>
                      <Text style={styles.drillDescription}>{drill.description}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </Card.Content>
          </Card>
        ))}
      </ScrollView>

      <Portal>
        <Dialog 
          visible={showAddDialog} 
          onDismiss={() => {
            setShowAddDialog(false);
            setEditingDay(null);
            setNewDay({
              name: '',
              type: null,
              drills: [],
            });
            setErrors({});
          }}
        >
          <Dialog.Title>{editingDay ? 'Edit Training Day' : 'Add New Training Day'}</Dialog.Title>
          <Dialog.Content>
            <ScrollView>
              <TextInput
                label="Training Day Name"
                value={newDay.name}
                onChangeText={(text) => setNewDay({ ...newDay, name: text })}
                style={styles.input}
                error={!!errors.name}
              />
              {errors.name && (
                <Text style={styles.errorText}>{errors.name}</Text>
              )}

              <Text style={styles.label}>Type</Text>
              <View style={styles.typesContainer}>
                {TRAINING_TYPES.map((type) => (
                  <Chip
                    key={type}
                    selected={newDay.type === type}
                    onPress={() => setNewDay({ ...newDay, type: type as TrainingDay['type'] })}
                    style={styles.typeChip}
                    mode="outlined"
                  >
                    {type}
                  </Chip>
                ))}
              </View>
              {errors.type && (
                <Text style={styles.errorText}>{errors.type}</Text>
              )}

              <Text style={styles.label}>Select Drills (max 10)</Text>
              <View style={styles.drillsContainer}>
                {drills.map((drill) => (
                  <Chip
                    key={drill.id}
                    selected={newDay.drills.some(d => d.id === drill.id)}
                    onPress={() => {
                      const isSelected = newDay.drills.some(d => d.id === drill.id);
                      if (isSelected) {
                        setNewDay({
                          ...newDay,
                          drills: newDay.drills.filter(d => d.id !== drill.id),
                        });
                      } else if (newDay.drills.length < 10) {
                        setNewDay({
                          ...newDay,
                          drills: [...newDay.drills, drill],
                        });
                      }
                    }}
                    style={styles.drillChip}
                    mode="outlined"
                  >
                    {drill.name}
                  </Chip>
                ))}
              </View>
              {errors.drills && (
                <Text style={styles.errorText}>{errors.drills}</Text>
              )}
            </ScrollView>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowAddDialog(false)}>Cancel</Button>
            <Button onPress={handleSubmit}>Save</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <FAB
        style={styles.fab}
        icon="plus"
        onPress={() => setShowAddDialog(true)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  dayCard: {
    marginBottom: 12,
    elevation: 2,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  dayName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  dayType: {
    backgroundColor: '#f0f0f0',
  },
  dayActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  drillsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 4,
  },
  drillsList: {
    marginTop: 8,
  },
  drillItem: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  drillNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    marginRight: 8,
    color: '#666',
    width: 20,
  },
  drillContent: {
    flex: 1,
  },
  drillHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  drillName: {
    fontSize: 14,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 8,
  },
  difficultyChip: {
    height: 24,
  },
  beginnerDifficulty: {
    backgroundColor: '#E8F5E9',
    borderColor: '#81C784',
  },
  intermediateDifficulty: {
    backgroundColor: '#FFF3E0',
    borderColor: '#FFB74D',
  },
  advancedDifficulty: {
    backgroundColor: '#FFEBEE',
    borderColor: '#E57373',
  },
  drillDescription: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
  drillChip: {
    backgroundColor: '#f0f0f0',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#2196F3',
  },
  input: {
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: '#666',
  },
  typesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  typeChip: {
    margin: 4,
  },
  drillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  errorText: {
    color: '#B00020',
    fontSize: 12,
    marginTop: -8,
    marginBottom: 8,
  },
  filterContainer: {
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  filterChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    marginRight: 8,
    marginBottom: 8,
  },
});

export default TrainingDays; 