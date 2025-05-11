import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  TextInput,
  Button,
  Text,
  Chip,
  Surface,
  useTheme,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

interface StudyNote {
  id: string;
  source: string;
  category: 'batting' | 'bowling' | 'fielding' | 'fitness' | 'captaincy';
  content: string;
  link?: string;
  createdAt: Date;
}

const Study = () => {
  const theme = useTheme();
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

  const categories: StudyNote['category'][] = [
    'batting',
    'bowling',
    'fielding',
    'fitness',
    'captaincy',
  ];

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

  const handleSubmit = () => {
    if (validateForm()) {
      const newNote: StudyNote = {
        id: Date.now().toString(),
        source: source.trim(),
        category: selectedCategory!,
        content: content.trim(),
        link: link.trim() || undefined,
        createdAt: new Date(),
      };

      setNotes([newNote, ...notes]);
      // Reset form
      setSource('');
      setContent('');
      setLink('');
      setSelectedCategory(null);
      setErrors({});
    }
  };

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
                  {note.createdAt.toLocaleDateString()}
                </Text>
              </Surface>
            ))}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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