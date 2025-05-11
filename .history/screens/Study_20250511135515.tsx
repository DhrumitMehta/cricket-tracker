import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Modal,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import {
  TextInput,
  Button,
  Text,
  Chip,
  Surface,
  useTheme,
  Snackbar,
  SegmentedButtons,
  FAB,
  IconButton,
  Card,
  Portal,
  Dialog,
  Divider,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useNavigation } from '@react-navigation/native';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Study'>;

interface StudyNote {
  id: string;
  source: string;
  category: 'batting' | 'bowling' | 'fielding' | 'fitness' | 'captaincy';
  type: 'tactical' | 'technical';
  content: string;
  link?: string;
  impact: number;
  created_at: string;
}

const CATEGORIES = ['batting', 'bowling', 'fielding', 'fitness', 'captaincy'];
const TYPES = ['tactical', 'technical'];
const IMPACT_RANGES = [
  { label: 'All Impact', value: '' },
  { label: 'High Impact (4-5)', value: '4-5' },
  { label: 'Medium Impact (3)', value: '3' },
  { label: 'Low Impact (1-2)', value: '1-2' },
];

const Study = () => {
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const [notes, setNotes] = useState<StudyNote[]>([]);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [showImpactDropdown, setShowImpactDropdown] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filters, setFilters] = useState({
    category: '',
    type: '',
    impact: '',
  });
  const [loading, setLoading] = useState(true);
  const [showAddNoteDialog, setShowAddNoteDialog] = useState(false);
  const [newNote, setNewNote] = useState({
    source: '',
    category: null as StudyNote['category'] | null,
    type: null as StudyNote['type'] | null,
    content: '',
    link: '',
    impact: 3,
  });
  const [errors, setErrors] = useState<{
    source?: string;
    category?: string;
    type?: string;
    content?: string;
  }>({});
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await fetchNotes();
    setRefreshing(false);
  }, [filters]);

  useEffect(() => {
    fetchNotes();
  }, [filters, sortOrder]);

  const fetchNotes = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('study_notes')
        .select('*')
        .order('impact', { ascending: sortOrder === 'asc' });

      if (filters.category) {
        query = query.eq('category', filters.category);
      }
      if (filters.type) {
        query = query.eq('type', filters.type);
      }
      if (filters.impact) {
        const [min, max] = filters.impact.split('-');
        if (min) {
          query = query.gte('impact', parseInt(min));
        }
        if (max) {
          query = query.lte('impact', parseInt(max));
        }
      }

      const { data, error } = await query;

      if (error) throw error;
      setNotes(data || []);
    } catch (error: any) {
      console.error('Error fetching notes:', error.message);
      setSnackbarMessage('Failed to load notes');
      setSnackbarVisible(true);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors: typeof errors = {};
    if (!newNote.source.trim()) {
      newErrors.source = 'Source is required';
    }
    if (!newNote.category) {
      newErrors.category = 'Please select a category';
    }
    if (!newNote.type) {
      newErrors.type = 'Please select a type';
    }
    if (!newNote.content.trim()) {
      newErrors.content = 'Content is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (validateForm()) {
      try {
        const { data, error } = await supabase
          .from('study_notes')
          .insert([
            {
              source: newNote.source.trim(),
              category: newNote.category,
              type: newNote.type,
              content: newNote.content.trim(),
              link: newNote.link.trim() || null,
              impact: newNote.impact,
            },
          ])
          .select()
          .single();

        if (error) throw error;

        setNotes([data, ...notes]);
        setShowAddNoteDialog(false);
        setNewNote({
          source: '',
          category: null,
          type: null,
          content: '',
          link: '',
          impact: 3,
        });
        setErrors({});
        setSnackbarMessage('Note saved successfully');
        setSnackbarVisible(true);
      } catch (error: any) {
        console.error('Error saving note:', error.message);
        setSnackbarMessage('Failed to save note');
        setSnackbarVisible(true);
      }
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    Alert.alert(
      'Delete Note',
      'Are you sure you want to delete this note?',
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
              .from('study_notes')
              .delete()
              .eq('id', noteId);

            if (error) {
              console.error('Error deleting note:', error);
              Alert.alert('Error', 'Failed to delete the note');
              return;
            }

            setNotes(notes.filter(note => note.id !== noteId));
          },
        },
      ],
    );
  };

  const formatFilterLabel = () => {
    if (!filters.category && !filters.type && !filters.impact) return 'All Notes';
    
    const parts = [];
    if (filters.category) {
      parts.push(filters.category.charAt(0).toUpperCase() + filters.category.slice(1));
    }
    if (filters.type) {
      parts.push(filters.type.charAt(0).toUpperCase() + filters.type.slice(1));
    }
    if (filters.impact) {
      const range = IMPACT_RANGES.find(r => r.value === filters.impact);
      if (range) {
        parts.push(range.label);
      }
    }
    return parts.join(' - ');
  };

  const getImpactLabel = (value: number) => {
    switch (value) {
      case 1: return 'Low';
      case 2: return 'Low-Medium';
      case 3: return 'Medium';
      case 4: return 'Medium-High';
      case 5: return 'High';
      default: return 'Medium';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="white" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Study Notes</Text>
      </View>

      <View style={styles.filtersContainer}>
        <View style={styles.filterRow}>
          <View style={styles.filterButtonContainer}>
            <Button
              mode={filters.category ? "contained" : "outlined"}
              onPress={() => setShowCategoryDropdown(true)}
              style={styles.filterButton}
              labelStyle={filters.category ? styles.activeFilterLabel : undefined}
            >
              {filters.category 
                ? filters.category.charAt(0).toUpperCase() + filters.category.slice(1)
                : 'All Categories'}
            </Button>
            <Modal
              visible={showCategoryDropdown}
              transparent={true}
              animationType="fade"
              onRequestClose={() => setShowCategoryDropdown(false)}
            >
              <TouchableOpacity 
                style={styles.modalOverlay}
                activeOpacity={1}
                onPress={() => setShowCategoryDropdown(false)}
              >
                <View style={styles.dropdownContainer}>
                  <TouchableOpacity
                    style={styles.dropdownItem}
                    onPress={() => {
                      setFilters({ ...filters, category: '' });
                      setShowCategoryDropdown(false);
                    }}
                  >
                    <Text>All Categories</Text>
                  </TouchableOpacity>
                  <Divider />
                  {CATEGORIES.map((category) => (
                    <TouchableOpacity
                      key={category}
                      style={styles.dropdownItem}
                      onPress={() => {
                        setFilters({ ...filters, category });
                        setShowCategoryDropdown(false);
                      }}
                    >
                      <Text>{category.charAt(0).toUpperCase() + category.slice(1)}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </TouchableOpacity>
            </Modal>
          </View>

          <View style={styles.filterButtonContainer}>
            <Button
              mode={filters.type ? "contained" : "outlined"}
              onPress={() => setShowTypeDropdown(true)}
              style={styles.filterButton}
              labelStyle={filters.type ? styles.activeFilterLabel : undefined}
            >
              {filters.type 
                ? filters.type.charAt(0).toUpperCase() + filters.type.slice(1)
                : 'All Types'}
            </Button>
            <Modal
              visible={showTypeDropdown}
              transparent={true}
              animationType="fade"
              onRequestClose={() => setShowTypeDropdown(false)}
            >
              <TouchableOpacity 
                style={styles.modalOverlay}
                activeOpacity={1}
                onPress={() => setShowTypeDropdown(false)}
              >
                <View style={styles.dropdownContainer}>
                  <TouchableOpacity
                    style={styles.dropdownItem}
                    onPress={() => {
                      setFilters({ ...filters, type: '' });
                      setShowTypeDropdown(false);
                    }}
                  >
                    <Text>All Types</Text>
                  </TouchableOpacity>
                  <Divider />
                  {TYPES.map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={styles.dropdownItem}
                      onPress={() => {
                        setFilters({ ...filters, type });
                        setShowTypeDropdown(false);
                      }}
                    >
                      <Text>{type.charAt(0).toUpperCase() + type.slice(1)}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </TouchableOpacity>
            </Modal>
          </View>

          <View style={styles.filterButtonContainer}>
            <Button
              mode={filters.impact ? "contained" : "outlined"}
              onPress={() => setShowImpactDropdown(true)}
              style={styles.filterButton}
              labelStyle={filters.impact ? styles.activeFilterLabel : undefined}
            >
              {filters.impact 
                ? IMPACT_RANGES.find(r => r.value === filters.impact)?.label 
                : 'All Impact'}
            </Button>
            <Modal
              visible={showImpactDropdown}
              transparent={true}
              animationType="fade"
              onRequestClose={() => setShowImpactDropdown(false)}
            >
              <TouchableOpacity 
                style={styles.modalOverlay}
                activeOpacity={1}
                onPress={() => setShowImpactDropdown(false)}
              >
                <View style={styles.dropdownContainer}>
                  {IMPACT_RANGES.map((range) => (
                    <TouchableOpacity
                      key={range.value}
                      style={styles.dropdownItem}
                      onPress={() => {
                        setFilters({ ...filters, impact: range.value });
                        setShowImpactDropdown(false);
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
          <Text style={styles.sortLabel}>Sort by impact:</Text>
          <View style={styles.sortButtons}>
            <Button
              mode={sortOrder === 'asc' ? "contained" : "outlined"}
              onPress={() => setSortOrder('asc')}
              style={styles.sortButton}
              labelStyle={sortOrder === 'asc' ? styles.activeFilterLabel : undefined}
            >
              Low to High
            </Button>
            <Button
              mode={sortOrder === 'desc' ? "contained" : "outlined"}
              onPress={() => setSortOrder('desc')}
              style={styles.sortButton}
              labelStyle={sortOrder === 'desc' ? styles.activeFilterLabel : undefined}
            >
              High to Low
            </Button>
          </View>
        </View>
      </View>

      <ScrollView 
        style={styles.notesContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#2196F3']}
            tintColor="#2196F3"
          />
        }
      >
        {notes.map((note) => (
          <Card key={note.id} style={styles.noteCard}>
            <View style={styles.noteHeader}>
              <View>
                <Text style={styles.noteSource}>{note.source}</Text>
                <View style={styles.noteTags}>
                  <Chip mode="outlined" style={styles.noteCategory}>
                    {note.category}
                  </Chip>
                  <Chip mode="outlined" style={styles.noteCategory}>
                    {note.type}
                  </Chip>
                </View>
              </View>
              <View style={styles.noteActions}>
                <IconButton
                  icon="delete"
                  size={20}
                  onPress={() => handleDeleteNote(note.id)}
                />
              </View>
            </View>
            <View style={styles.noteImpactContainer}>
              <Text style={styles.noteImpact}>
                Impact: {note.impact} - {getImpactLabel(note.impact)}
              </Text>
            </View>
            <Text style={styles.noteContent}>{note.content}</Text>
            {note.link && (
              <Text style={styles.noteLink} numberOfLines={1}>
                Link: {note.link}
              </Text>
            )}
            <Text style={styles.noteDate}>
              {new Date(note.created_at).toLocaleDateString()}
            </Text>
          </Card>
        ))}
      </ScrollView>

      <Portal>
        <Dialog visible={showAddNoteDialog} onDismiss={() => setShowAddNoteDialog(false)}>
          <Dialog.Title>Add Study Note</Dialog.Title>
          <Dialog.Content>
            <ScrollView>
              <TextInput
                label="Source"
                value={newNote.source}
                onChangeText={(text) => setNewNote({ ...newNote, source: text })}
                style={styles.input}
                error={!!errors.source}
              />
              {errors.source && (
                <Text style={styles.errorText}>{errors.source}</Text>
              )}

              <Text style={styles.label}>Category</Text>
              <View style={styles.categoriesContainer}>
                {CATEGORIES.map((category) => (
                  <Chip
                    key={category}
                    selected={newNote.category === category}
                    onPress={() => setNewNote({ ...newNote, category: category as StudyNote['category'] })}
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

              <Text style={styles.label}>Type</Text>
              <View style={styles.categoriesContainer}>
                {TYPES.map((type) => (
                  <Chip
                    key={type}
                    selected={newNote.type === type}
                    onPress={() => setNewNote({ ...newNote, type: type as StudyNote['type'] })}
                    style={styles.categoryChip}
                    mode="outlined"
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Chip>
                ))}
              </View>
              {errors.type && (
                <Text style={styles.errorText}>{errors.type}</Text>
              )}

              <Text style={styles.label}>Impact</Text>
              <View style={styles.impactContainer}>
                <SegmentedButtons
                  value={newNote.impact.toString()}
                  onValueChange={(value) => setNewNote({ ...newNote, impact: parseInt(value) })}
                  buttons={[
                    { value: '1', label: '1', style: styles.impactButton },
                    { value: '2', label: '2', style: styles.impactButton },
                    { value: '3', label: '3', style: styles.impactButton },
                    { value: '4', label: '4', style: styles.impactButton },
                    { value: '5', label: '5', style: styles.impactButton },
                  ]}
                  style={styles.impactButtons}
                />
                <Text style={styles.impactLabel}>{getImpactLabel(newNote.impact)} Impact</Text>
              </View>

              <TextInput
                label="Content"
                value={newNote.content}
                onChangeText={(text) => setNewNote({ ...newNote, content: text })}
                multiline
                numberOfLines={4}
                style={styles.input}
                error={!!errors.content}
              />
              {errors.content && (
                <Text style={styles.errorText}>{errors.content}</Text>
              )}

              <TextInput
                label="Link (optional)"
                value={newNote.link}
                onChangeText={(text) => setNewNote({ ...newNote, link: text })}
                style={styles.input}
              />
            </ScrollView>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowAddNoteDialog(false)}>Cancel</Button>
            <Button onPress={handleSubmit}>Save</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <FAB
        style={styles.fab}
        icon="plus"
        onPress={() => setShowAddNoteDialog(true)}
      />

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
      >
        {snackbarMessage}
      </Snackbar>
    </SafeAreaView>
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
  activeFilterLabel: {
    color: 'white',
  },
  notesContainer: {
    flex: 1,
    padding: 16,
  },
  noteCard: {
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    elevation: 2,
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  noteSource: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  noteTags: {
    flexDirection: 'row',
    gap: 8,
  },
  noteCategory: {
    backgroundColor: '#f0f0f0',
  },
  noteActions: {
    flexDirection: 'row',
  },
  noteImpactContainer: {
    marginBottom: 8,
  },
  noteImpact: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  noteContent: {
    fontSize: 14,
    marginBottom: 8,
    lineHeight: 20,
  },
  noteLink: {
    fontSize: 12,
    color: '#007AFF',
    marginBottom: 8,
  },
  noteDate: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
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
  impactContainer: {
    marginBottom: 12,
  },
  impactButtons: {
    marginBottom: 8,
  },
  impactButton: {
    minWidth: 40,
    paddingHorizontal: 4,
  },
  impactLabel: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
  },
});

export default Study; 