import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Modal, TouchableOpacity, Alert, RefreshControl, ActivityIndicator, StatusBar } from 'react-native';
import { Button, Text, FAB, Divider, IconButton, Card, Portal, Dialog, TextInput, Chip } from 'react-native-paper';
import { supabase } from '../lib/supabase';
import { useNavigation } from '@react-navigation/native';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Main'>;

interface TrainingSession {
  id: string;
  date: string;
  duration: number;
  focus_area: string;
  notes: string;
  training_day_id?: string;
  training_day?: {
    name: string;
    type: string;
  };
}

const FOCUS_AREAS = ['Batting', 'Bowling', 'Fielding', 'Fitness'];

const DURATION_RANGES = [
  { label: 'All Durations', value: '' },
  { label: '0-30 mins', value: '0-30' },
  { label: '31-60 mins', value: '31-60' },
  { label: '61-90 mins', value: '61-90' },
  { label: '91-120 mins', value: '91-120' },
  { label: '> 120 mins', value: '121-' },
];

export default function TrainingTracker() {
  const navigation = useNavigation<NavigationProp>();
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const [showFocusDropdown, setShowFocusDropdown] = useState(false);
  const [showDurationDropdown, setShowDurationDropdown] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filters, setFilters] = useState({
    date: '',
    focus_area: '',
    duration: '',
  });
  const [loading, setLoading] = useState(true);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await fetchSessions();
    setRefreshing(false);
  }, [filters]);

  useEffect(() => {
    fetchSessions();
  }, [filters, sortOrder]);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('training_sessions')
        .select(`
          *,
          training_day:training_days!training_day_id (
            id,
            name,
            type
          )
        `)
        .order('date', { ascending: false });

      if (error) throw error;
      setSessions(data || []);
    } catch (error: any) {
      console.error('Error fetching sessions:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const getMonthYearOptions = () => {
    const options = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      options.push({
        label: `${date.toLocaleString('default', { month: 'long' })} ${year}`,
        value: `${year}-${month}`,
      });
    }
    return options;
  };

  const formatFilterLabel = () => {
    if (!filters.date && !filters.focus_area && !filters.duration) return 'All Sessions';
    
    const parts = [];
    if (filters.date) {
      const [year, month] = filters.date.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1);
      parts.push(date.toLocaleString('default', { month: 'long', year: 'numeric' }));
    }
    if (filters.focus_area) {
      parts.push(filters.focus_area);
    }
    if (filters.duration) {
      const range = DURATION_RANGES.find(r => r.value === filters.duration);
      if (range) {
        parts.push(range.label);
      }
    }
    return parts.join(' - ');
  };

  const handleDeleteSession = async (sessionId: string) => {
    Alert.alert(
      'Delete Session',
      'Are you sure you want to delete this training session?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase
              .from('training_sessions')
              .delete()
              .eq('id', sessionId);

            if (error) {
              console.error('Error deleting session:', error);
              Alert.alert('Error', 'Failed to delete the session');
              return;
            }

            // Update local state
            setSessions(sessions.filter(session => session.id !== sessionId));
          },
        },
      ],
    );
  };

  const handleEditSession = (session: TrainingSession) => {
    navigation.navigate('AddTrainingSession', { session });
  };

  const renderSession = ({ item }: { item: TrainingSession }) => (
    <Card style={styles.sessionCard}>
      <Card.Content>
        <View style={styles.sessionHeader}>
          <Text style={styles.date}>{formatDate(item.date)}</Text>
          <Text style={styles.duration}>{item.duration} mins</Text>
        </View>
        <Text style={styles.focusArea}>{item.focus_area}</Text>
        {item.training_day && (
          <Chip
            mode="outlined"
            style={styles.trainingDayChip}
            icon="calendar"
          >
            {item.training_day.name} ({item.training_day.type})
          </Chip>
        )}
        {item.notes && <Text style={styles.notes}>{item.notes}</Text>}
      </Card.Content>
      <Card.Actions>
        <Button onPress={() => handleEditSession(item)}>Edit</Button>
        <Button onPress={() => handleDeleteSession(item.id)}>Delete</Button>
      </Card.Actions>
    </Card>
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.filtersContainer}>
        <View style={styles.filterRow}>
          <View style={styles.filterButtonContainer}>
            <Button
              mode={filters.date ? "contained" : "outlined"}
              onPress={() => setShowDateDropdown(true)}
              style={styles.filterButton}
              labelStyle={filters.date ? styles.activeFilterLabel : undefined}
            >
              {filters.date 
                ? new Date(filters.date + '-01').toLocaleString('default', { month: 'long', year: 'numeric' }) 
                : 'All Dates'}
            </Button>
            <Modal
              visible={showDateDropdown}
              transparent={true}
              animationType="fade"
              onRequestClose={() => setShowDateDropdown(false)}
            >
              <TouchableOpacity 
                style={styles.modalOverlay}
                activeOpacity={1}
                onPress={() => setShowDateDropdown(false)}
              >
                <View style={styles.dropdownContainer}>
                  <TouchableOpacity
                    style={styles.dropdownItem}
                    onPress={() => {
                      setFilters({ ...filters, date: '' });
                      setShowDateDropdown(false);
                    }}
                  >
                    <Text>All Dates</Text>
                  </TouchableOpacity>
                  <Divider />
                  {getMonthYearOptions().map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={styles.dropdownItem}
                      onPress={() => {
                        setFilters({ ...filters, date: option.value });
                        setShowDateDropdown(false);
                      }}
                    >
                      <Text>{option.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </TouchableOpacity>
            </Modal>
          </View>

          <View style={styles.filterButtonContainer}>
            <Button
              mode={filters.focus_area ? "contained" : "outlined"}
              onPress={() => setShowFocusDropdown(true)}
              style={styles.filterButton}
              labelStyle={filters.focus_area ? styles.activeFilterLabel : undefined}
            >
              {filters.focus_area || 'All Focus Areas'}
            </Button>
            <Modal
              visible={showFocusDropdown}
              transparent={true}
              animationType="fade"
              onRequestClose={() => setShowFocusDropdown(false)}
            >
              <TouchableOpacity 
                style={styles.modalOverlay}
                activeOpacity={1}
                onPress={() => setShowFocusDropdown(false)}
              >
                <View style={styles.dropdownContainer}>
                  <TouchableOpacity
                    style={styles.dropdownItem}
                    onPress={() => {
                      setFilters({ ...filters, focus_area: '' });
                      setShowFocusDropdown(false);
                    }}
                  >
                    <Text>All Focus Areas</Text>
                  </TouchableOpacity>
                  <Divider />
                  {FOCUS_AREAS.map((area) => (
                    <TouchableOpacity
                      key={area}
                      style={styles.dropdownItem}
                      onPress={() => {
                        setFilters({ ...filters, focus_area: area });
                        setShowFocusDropdown(false);
                      }}
                    >
                      <Text>{area}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </TouchableOpacity>
            </Modal>
          </View>

          <View style={styles.filterButtonContainer}>
            <Button
              mode={filters.duration ? "contained" : "outlined"}
              onPress={() => setShowDurationDropdown(true)}
              style={styles.filterButton}
              labelStyle={filters.duration ? styles.activeFilterLabel : undefined}
            >
              {filters.duration 
                ? DURATION_RANGES.find(r => r.value === filters.duration)?.label 
                : 'All Durations'}
            </Button>
            <Modal
              visible={showDurationDropdown}
              transparent={true}
              animationType="fade"
              onRequestClose={() => setShowDurationDropdown(false)}
            >
              <TouchableOpacity 
                style={styles.modalOverlay}
                activeOpacity={1}
                onPress={() => setShowDurationDropdown(false)}
              >
                <View style={styles.dropdownContainer}>
                  {DURATION_RANGES.map((range) => (
                    <TouchableOpacity
                      key={range.value}
                      style={styles.dropdownItem}
                      onPress={() => {
                        setFilters({ ...filters, duration: range.value });
                        setShowDurationDropdown(false);
                      }}
                    >
                      <Text>{range.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </TouchableOpacity>
            </Modal>
          </View>
        </View>
        <Text style={styles.filterLabel}>{formatFilterLabel()}</Text>
        <View style={styles.sortContainer}>
          <Text style={styles.sortLabel}>Sort by date:</Text>
          <View style={styles.sortButtons}>
            <Button
              mode={sortOrder === 'asc' ? "contained" : "outlined"}
              onPress={() => setSortOrder('asc')}
              style={styles.sortButton}
              labelStyle={sortOrder === 'asc' ? styles.activeFilterLabel : undefined}
            >
              Oldest First
            </Button>
            <Button
              mode={sortOrder === 'desc' ? "contained" : "outlined"}
              onPress={() => setSortOrder('desc')}
              style={styles.sortButton}
              labelStyle={sortOrder === 'desc' ? styles.activeFilterLabel : undefined}
            >
              Newest First
            </Button>
          </View>
        </View>
      </View>

      <ScrollView 
        style={styles.sessionsContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#2196F3']}
            tintColor="#2196F3"
          />
        }
      >
        {sessions.map((session) => (
          <Card key={session.id} style={styles.sessionCard}>
            <View style={styles.sessionHeader}>
              <View>
                <Text style={styles.sessionDate}>
                  {session.date.split('-').reverse().join('-')}
                </Text>
                <Text style={styles.sessionDay}>
                  {new Date(session.date).toLocaleDateString('en-US', { weekday: 'long' })}
                </Text>
                {session.training_day && (
                  <Text style={styles.trainingDayName}>
                    {session.training_day.name} ({session.training_day.type})
                  </Text>
                )}
              </View>
              <View style={styles.sessionActions}>
                <IconButton
                  icon="pencil"
                  size={20}
                  onPress={() => handleEditSession(session)}
                />
                <IconButton
                  icon="delete"
                  size={20}
                  onPress={() => handleDeleteSession(session.id)}
                />
              </View>
            </View>
            <Text>Duration: {session.duration} minutes</Text>
            <Text>Focus: {session.focus_area}</Text>
            {session.notes && <Text>Notes: {session.notes}</Text>}
          </Card>
        ))}
      </ScrollView>

      <FAB
        style={styles.fab}
        icon="plus"
        onPress={() => navigation.navigate('AddTrainingSession', {})}
      />
    </View>
  );
}

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
  filtersContainer: {
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  filterButtonContainer: {
    flex: 1,
    position: 'relative',
  },
  filterButton: {
    width: '100%',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 8,
    width: '80%',
    maxHeight: '80%',
  },
  dropdownItem: {
    padding: 16,
  },
  filterLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  sessionsContainer: {
    flex: 1,
    padding: 16,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sessionActions: {
    flexDirection: 'row',
  },
  sessionCard: {
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    elevation: 2,
  },
  sessionDate: {
    fontWeight: 'bold',
    fontSize: 15,
  },
  sessionDay: {
    color: '#666',
    fontSize: 12,
    marginTop: 2,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#2196F3',
  },
  activeFilterLabel: {
    color: 'white',
  },
  sortContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  sortLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  sortButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  sortButton: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  scrollView: {
    flex: 1,
  },
  trainingDayChip: {
    marginTop: 8,
    marginBottom: 8,
  },
  date: {
    fontWeight: 'bold',
    fontSize: 15,
  },
  duration: {
    color: '#666',
    fontSize: 12,
    marginTop: 2,
  },
  focusArea: {
    fontWeight: 'bold',
    fontSize: 15,
  },
  notes: {
    color: '#666',
    fontSize: 12,
    marginTop: 2,
  },
  trainingDayName: {
    color: '#2196F3',
    fontSize: 12,
    marginTop: 2,
    fontStyle: 'italic',
  },
}); 