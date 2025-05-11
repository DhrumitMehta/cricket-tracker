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
  useTheme,
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
  created_at: string;
}

const CATEGORIES = ['batting', 'bowling', 'fielding', 'fitness'];
const DIFFICULTIES = ['beginner', 'intermediate', 'advanced'];

const Drills = () => {
  const theme = useTheme();
  const [drills, setDrills] = useState<Drill[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddDrillDialog, setShowAddDrillDialog] = useState(false);
  const [editingDrill, setEditingDrill] = useState<Drill | null>(null);
  const [newDrill, setNewDrill] = useState({
    name: '',
    category: null as Drill['category'] | null,
    difficulty: null as Drill['difficulty'] | null,
    description: '',
    equipment_needed: [] as string[],
  });
  const [errors, setErrors] = useState<{
    name?: string;
    category?: string;
    difficulty?: string;
    description?: string;
  }>({});

  useEffect(() => {
    fetchDrills();
  }, []);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await fetchDrills();
    setRefreshing(false);
  }, []);

  const fetchDrills = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('drills')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDrills(data || []);
    } catch (error: any) {
      console.error('Error fetching drills:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors: typeof errors = {};
    if (!newDrill.name.trim()) {
      newErrors.name = 'Name is required';
    }
    if (!newDrill.category) {
      newErrors.category = 'Please select a category';
    }
    if (!newDrill.difficulty) {
      newErrors.difficulty = 'Please select a difficulty';
    }
    if (!newDrill.description.trim()) {
      newErrors.description = 'Description is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleEditDrill = (drill: Drill) => {
    setEditingDrill(drill);
    setNewDrill({
      name: drill.name,
      category: drill.category,
      difficulty: drill.difficulty,
      description: drill.description,
      equipment_needed: drill.equipment_needed,
    });
    setShowAddDrillDialog(true);
  };

  const handleSubmit = async () => {
    if (validateForm()) {
      try {
        if (editingDrill) {
          // Update existing drill
          const { data, error } = await supabase
            .from('drills')
            .update({
              name: newDrill.name.trim(),
              category: newDrill.category,
              difficulty: newDrill.difficulty,
              description: newDrill.description.trim(),
              equipment_needed: newDrill.equipment_needed,
            })
            .eq('id', editingDrill.id)
            .select()
            .single();

          if (error) throw error;

          setDrills(drills.map(d => d.id === editingDrill.id ? data : d));
        } else {
          // Create new drill
          const { data, error } = await supabase
            .from('drills')
            .insert([
              {
                name: newDrill.name.trim(),
                category: newDrill.category,
                difficulty: newDrill.difficulty,
                description: newDrill.description.trim(),
                equipment_needed: newDrill.equipment_needed,
              },
            ])
            .select()
            .single();

          if (error) throw error;

          setDrills([data, ...drills]);
        }

        setShowAddDrillDialog(false);
        setEditingDrill(null);
        setNewDrill({
          name: '',
          category: null,
          difficulty: null,
          description: '',
          equipment_needed: [],
        });
        setErrors({});
      } catch (error: any) {
        console.error('Error saving drill:', error.message);
      }
    }
  };

  const handleDeleteDrill = async (drillId: string) => {
    try {
      const { error } = await supabase
        .from('drills')
        .delete()
        .eq('id', drillId);

      if (error) throw error;

      setDrills(drills.filter(drill => drill.id !== drillId));
    } catch (error: any) {
      console.error('Error deleting drill:', error.message);
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
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {drills.map((drill) => (
          <Card key={drill.id} style={styles.drillCard}>
            <Card.Content>
              <View style={styles.drillHeader}>
                <View>
                  <Text style={styles.drillName}>{drill.name}</Text>
                  <View style={styles.drillTags}>
                    <Chip mode="outlined" style={styles.drillCategory}>
                      {drill.category}
                    </Chip>
                    <Chip mode="outlined" style={styles.drillDifficulty}>
                      {drill.difficulty}
                    </Chip>
                  </View>
                </View>
                <View style={styles.drillActions}>
                  <IconButton
                    icon="pencil"
                    size={20}
                    onPress={() => handleEditDrill(drill)}
                  />
                  <IconButton
                    icon="delete"
                    size={20}
                    onPress={() => handleDeleteDrill(drill.id)}
                  />
                </View>
              </View>
              <Text style={styles.drillDescription}>{drill.description}</Text>
              {drill.equipment_needed.length > 0 && (
                <View style={styles.equipmentContainer}>
                  <Text style={styles.equipmentTitle}>Equipment Needed:</Text>
                  <View style={styles.equipmentList}>
                    {drill.equipment_needed.map((item, index) => (
                      <Chip key={index} style={styles.equipmentChip}>
                        {item}
                      </Chip>
                    ))}
                  </View>
                </View>
              )}
            </Card.Content>
          </Card>
        ))}
      </ScrollView>

      <Portal>
        <Dialog 
          visible={showAddDrillDialog} 
          onDismiss={() => {
            setShowAddDrillDialog(false);
            setEditingDrill(null);
            setNewDrill({
              name: '',
              category: null,
              difficulty: null,
              description: '',
              equipment_needed: [],
            });
            setErrors({});
          }}
        >
          <Dialog.Title>{editingDrill ? 'Edit Drill' : 'Add New Drill'}</Dialog.Title>
          <Dialog.Content>
            <ScrollView>
              <TextInput
                label="Drill Name"
                value={newDrill.name}
                onChangeText={(text) => setNewDrill({ ...newDrill, name: text })}
                style={styles.input}
                error={!!errors.name}
              />
              {errors.name && (
                <Text style={styles.errorText}>{errors.name}</Text>
              )}

              <Text style={styles.label}>Category</Text>
              <View style={styles.categoriesContainer}>
                {CATEGORIES.map((category) => (
                  <Chip
                    key={category}
                    selected={newDrill.category === category}
                    onPress={() => setNewDrill({ ...newDrill, category: category as Drill['category'] })}
                    style={styles.categoryChip}
                    mode="outlined"
                  >
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </Chip>
                ))}
              </View>
              {errors.category && (
                <Text style={styles.errorText}>{errors.category}</Text>
              )}

              <Text style={styles.label}>Difficulty</Text>
              <View style={styles.categoriesContainer}>
                {DIFFICULTIES.map((difficulty) => (
                  <Chip
                    key={difficulty}
                    selected={newDrill.difficulty === difficulty}
                    onPress={() => setNewDrill({ ...newDrill, difficulty: difficulty as Drill['difficulty'] })}
                    style={styles.categoryChip}
                    mode="outlined"
                  >
                    {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                  </Chip>
                ))}
              </View>
              {errors.difficulty && (
                <Text style={styles.errorText}>{errors.difficulty}</Text>
              )}

              <TextInput
                label="Description"
                value={newDrill.description}
                onChangeText={(text) => setNewDrill({ ...newDrill, description: text })}
                multiline
                numberOfLines={4}
                style={styles.input}
                error={!!errors.description}
              />
              {errors.description && (
                <Text style={styles.errorText}>{errors.description}</Text>
              )}

              <TextInput
                label="Equipment Needed (comma-separated)"
                value={newDrill.equipment_needed.join(', ')}
                onChangeText={(text) => setNewDrill({
                  ...newDrill,
                  equipment_needed: text.split(',').map(item => item.trim()).filter(Boolean)
                })}
                style={styles.input}
              />
            </ScrollView>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowAddDrillDialog(false)}>Cancel</Button>
            <Button onPress={handleSubmit}>Save</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <FAB
        style={styles.fab}
        icon="plus"
        onPress={() => setShowAddDrillDialog(true)}
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
  drillCard: {
    marginBottom: 12,
    elevation: 2,
  },
  drillHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  drillName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  drillTags: {
    flexDirection: 'row',
    gap: 8,
  },
  drillCategory: {
    backgroundColor: '#f0f0f0',
  },
  drillDifficulty: {
    backgroundColor: '#f0f0f0',
  },
  drillDescription: {
    fontSize: 14,
    marginBottom: 8,
    lineHeight: 20,
  },
  equipmentContainer: {
    marginTop: 8,
  },
  equipmentTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  equipmentList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  equipmentChip: {
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
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  categoryChip: {
    margin: 4,
  },
  errorText: {
    color: '#B00020',
    fontSize: 12,
    marginTop: -8,
    marginBottom: 8,
  },
  drillActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

export default Drills; 