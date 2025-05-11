import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import {
  TextInput,
  Button,
  Text,
  Chip,
  Surface,
  useTheme,
  Snackbar,
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
  content: string;
  link?: string;
  created_at: string;
}

const Study = () => {
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const [notes, setNotes] = useState<StudyNote[]>([]);
  const [source, setSource] = useState('');
  const [content, setContent] = useState('');
  const [link, setLink] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<StudyNote['category'] | null>(null);
  const [errors, setErrors] = useState<{
    source?: string;
    category?: string;
    content?: string;
  }>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const categories: StudyNote['category'][] = [
    'batting',
    'bowling',
    'fielding',
    'fitness',
    'captaincy',
  ];

  useEffect(() => {
    fetchNotes();
  }, []);

  const fetchNotes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('study_notes')
        .select('*')
        .order('created_at', { ascending: false });

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
    if (!source.trim()) {
      newErrors.source = 'Source is required';
    }
    if (!selectedCategory) {
      newErrors.category = 'Please select a category';
    }
    if (!content.trim()) {
      newErrors.content = 'Content is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (validateForm()) {
      try {
        setSaving(true);
        const { data, error } = await supabase
          .from('study_notes')
          .insert([
            {
              source: source.trim(),
              category: selectedCategory,
              content: content.trim(),
              link: link.trim() || null,
            },
          ])
          .select()
          .single();

        if (error) throw error;

        setNotes([data, ...notes]);
        // Reset form
        setSource('');
        setContent('');
        setLink('');
        setSelectedCategory(null);
        setErrors({});
        setSnackbarMessage('Note saved successfully');
        setSnackbarVisible(true);
      } catch (error: any) {
        console.error('Error saving note:', error.message);
        setSnackbarMessage('Failed to save note');
        setSnackbarVisible(true);
      } finally {
        setSaving(false);
      }
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView style={styles.scrollView}>
          <Surface style={styles.formContainer} elevation={1}>
            <Text style={styles.title}>Add Study Note</Text>

            <TextInput
              label="Source"
              value={source}
              onChangeText={setSource}
              style={styles.input}
              error={!!errors.source}
            />
            {errors.source && (
              <Text style={styles.errorText}>{errors.source}</Text>
            )}

            <Text style={styles.label}>Category</Text>
            <View style={styles.categoriesContainer}>
              {categories.map((category) => (
                <Chip
                  key={category}
                  selected={selectedCategory === category}
                  onPress={() => setSelectedCategory(category)}
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

            <TextInput
              label="Content"
              value={content}
              onChangeText={setContent}
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
              value={link}
              onChangeText={setLink}
              style={styles.input}
            />

            <Button
              mode="contained"
              onPress={handleSubmit}
              style={styles.submitButton}
              loading={saving}
              disabled={saving}
            >
              Save Note
            </Button>
          </Surface>

          <View style={styles.notesContainer}>
            <Text style={styles.notesTitle}>Your Notes</Text>
            {notes.map((note) => (
              <Surface key={note.id} style={styles.noteCard} elevation={1}>
                <View style={styles.noteHeader}>
                  <Text style={styles.noteSource}>{note.source}</Text>
                  <Chip mode="outlined" style={styles.noteCategory}>
                    {note.category}
                  </Chip>
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
              </Surface>
            ))}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

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
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  formContainer: {
    margin: 16,
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
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
  submitButton: {
    marginTop: 16,
  },
  notesContainer: {
    padding: 16,
  },
  notesTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  noteCard: {
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  noteSource: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  noteCategory: {
    backgroundColor: '#f0f0f0',
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
});

export default Study; 