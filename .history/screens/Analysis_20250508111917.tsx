import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Dimensions,
  Modal,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import { Video } from 'expo-av';
import Slider from '@react-native-community/slider';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text as PaperText, Button, Card } from 'react-native-paper';
import VideoAnnotationLayer from '../components/VideoAnnotationLayer';
import VideoWorkingArea from '../components/VideoWorkingArea';

interface Note {
  id: string;
  timestamp: number;
  text: string;
}

interface VideoAnnotation {
  id: string;
  type: 'line' | 'circle';
  points: { x: number; y: number }[];
  timestamp: number;
}

interface VideoProgress {
  currentTime: number;
  playableDuration: number;
  seekableDuration: number;
}

interface VideoLoad {
  duration: number;
  naturalSize: {
    width: number;
    height: number;
  };
}

const Analysis = () => {
  const [primaryVideoUri, setPrimaryVideoUri] = useState<string | null>(null);
  const [secondaryVideoUri, setSecondaryVideoUri] = useState<string | null>(null);
  const [isSideBySide, setIsSideBySide] = useState(false);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [annotations, setAnnotations] = useState<VideoAnnotation[]>([]);
  const [noteText, setNoteText] = useState('');
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [videoLayout, setVideoLayout] = useState({
    width: 0,
    height: 0,
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const primaryVideoRef = useRef<Video>(null);
  const secondaryVideoRef = useRef<Video>(null);
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  const videoHeight = isSideBySide ? screenHeight * 0.4 : screenHeight * 0.5;

  const selectVideo = async (isSecondary: boolean = false) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        quality: 1,
      });

      if (!result.canceled) {
        if (isSecondary) {
          setSecondaryVideoUri(result.assets[0].uri);
        } else {
          setPrimaryVideoUri(result.assets[0].uri);
        }
      }
    } catch (error) {
      console.error('Error selecting video:', error);
    }
  };

  const handleAddAnnotation = (annotation: VideoAnnotation) => {
    setAnnotations([...annotations, annotation]);
  };

  const handlePlaybackStatusUpdate = (status: Video.PlaybackStatus) => {
    if (status.isLoaded) {
      setCurrentTime(status.positionMillis / 1000);
      if (status.durationMillis) {
        setDuration(status.durationMillis / 1000);
      }
    }
  };

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleSliderChange = async (value: number) => {
    try {
      const videoRef = primaryVideoRef.current;
      if (!videoRef) return;

      const wasPlaying = isPlaying;
      if (wasPlaying) {
        setIsPlaying(false);
      }

      await videoRef.setPositionAsync(Math.floor(value * 1000));
      setCurrentTime(value);

      if (wasPlaying) {
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Error seeking video:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.videoContainer, { height: videoHeight }]}>
        <View style={styles.videoWrapper}>
          {primaryVideoUri ? (
            <View
              style={styles.videoContainer}
              onLayout={(event) => {
                const { width, height } = event.nativeEvent.layout;
                setVideoLayout({ width, height });
              }}
            >
              <Video
                ref={primaryVideoRef}
                source={{ uri: primaryVideoUri }}
                style={styles.video}
                resizeMode={Video.RESIZE_MODE.CONTAIN}
                useNativeControls={false}
                shouldPlay={isPlaying}
                onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
                progressUpdateIntervalMillis={16}
                isMuted={false}
              />
              {isDrawingMode && (
                <VideoAnnotationLayer
                  width={videoLayout.width}
                  height={videoLayout.height}
                  currentTime={currentTime}
                  annotations={annotations}
                  onAddAnnotation={handleAddAnnotation}
                  isDrawingMode={isDrawingMode}
                />
              )}
            </View>
          ) : (
            <TouchableOpacity
              style={styles.selectVideoButton}
              onPress={() => selectVideo(false)}
            >
              <Icon name="video-plus" size={48} color="#666" />
              <Text style={styles.selectVideoText}>Select Primary Video</Text>
            </TouchableOpacity>
          )}
        </View>
        {isSideBySide && (
          <View style={styles.videoWrapper}>
            {secondaryVideoUri ? (
              <Video
                ref={secondaryVideoRef}
                source={{ uri: secondaryVideoUri }}
                style={styles.video}
                resizeMode={Video.RESIZE_MODE.CONTAIN}
                useNativeControls={false}
                shouldPlay={isPlaying}
              />
            ) : (
              <TouchableOpacity
                style={styles.selectVideoButton}
                onPress={() => selectVideo(true)}
              >
                <Icon name="video-plus" size={48} color="#666" />
                <Text style={styles.selectVideoText}>Select Secondary Video</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      <View style={styles.toolbar}>
        <TouchableOpacity
          style={[styles.toolButton, isDrawingMode && styles.activeToolButton]}
          onPress={() => setIsDrawingMode(!isDrawingMode)}
          disabled={!primaryVideoUri}
        >
          <Icon name="pencil" size={24} color={isDrawingMode ? '#fff' : primaryVideoUri ? '#000' : '#999'} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.toolButton}
          onPress={() => setShowNoteInput(true)}
          disabled={!primaryVideoUri}
        >
          <Icon name="note-text" size={24} color={primaryVideoUri ? '#000' : '#999'} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toolButton, isSideBySide && styles.activeToolButton]}
          onPress={() => setIsSideBySide(!isSideBySide)}
          disabled={!primaryVideoUri}
        >
          <Icon name="compare" size={24} color={isSideBySide ? '#fff' : primaryVideoUri ? '#000' : '#999'} />
        </TouchableOpacity>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity 
          onPress={togglePlayPause} 
          disabled={!primaryVideoUri}
        >
          <Icon 
            name={isPlaying ? "pause" : "play"} 
            size={24} 
            color={primaryVideoUri ? '#000' : '#999'} 
          />
        </TouchableOpacity>
        <View style={styles.timeInfo}>
          <Text>{Math.floor(currentTime / 60)}:{Math.floor(currentTime % 60).toString().padStart(2, '0')}</Text>
        </View>
        <Slider
          style={styles.slider}
          value={currentTime}
          maximumValue={duration}
          minimumValue={0}
          onValueChange={handleSliderChange}
          disabled={!primaryVideoUri}
        />
        <View style={styles.timeInfo}>
          <Text>{Math.floor(duration / 60)}:{Math.floor(duration % 60).toString().padStart(2, '0')}</Text>
        </View>
      </View>

      {/* Notes section */}
      <ScrollView style={styles.notesContainer}>
        {notes.map((note) => (
          <TouchableOpacity
            key={note.id}
            style={styles.noteItem}
          >
            <Text style={styles.noteTimestamp}>
              {Math.floor(note.timestamp / 60)}:{Math.floor(note.timestamp % 60)
                .toString()
                .padStart(2, '0')}
            </Text>
            <Text style={styles.noteText}>{note.text}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Modal
        visible={showNoteInput}
        transparent
        animationType="slide"
        onRequestClose={() => setShowNoteInput(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <TextInput
              style={styles.noteInput}
              multiline
              placeholder="Enter note..."
              value={noteText}
              onChangeText={setNoteText}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setShowNoteInput(false)}
              >
                <Text>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={() => {
                  if (noteText.trim()) {
                    setNotes([...notes, {
                      id: Date.now().toString(),
                      timestamp: 0,
                      text: noteText,
                    }]);
                    setNoteText('');
                    setShowNoteInput(false);
                  }
                }}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  videoContainer: {
    position: 'relative',
    flex: 1,
    overflow: 'hidden',
  },
  videoWrapper: {
    flex: 1,
    backgroundColor: '#000',
    position: 'relative',
  },
  video: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'center',
    padding: 10,
    backgroundColor: '#f5f5f5',
  },
  toolButton: {
    padding: 10,
    marginHorizontal: 5,
    borderRadius: 5,
    backgroundColor: '#e0e0e0',
  },
  activeToolButton: {
    backgroundColor: '#007AFF',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#f5f5f5',
  },
  slider: {
    flex: 1,
    marginHorizontal: 10,
  },
  timeInfo: {
    marginHorizontal: 10,
  },
  notesContainer: {
    maxHeight: 200,
    padding: 10,
    backgroundColor: '#f9f9f9',
  },
  noteItem: {
    flexDirection: 'row',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  noteTimestamp: {
    marginRight: 10,
    color: '#666',
  },
  noteText: {
    flex: 1,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    width: '80%',
  },
  noteInput: {
    height: 100,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    marginBottom: 10,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  modalButton: {
    padding: 10,
    marginLeft: 10,
  },
  saveButton: {
    backgroundColor: '#007AFF',
    borderRadius: 5,
  },
  saveButtonText: {
    color: '#fff',
  },
  selectVideoButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  selectVideoText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
  },
});

export default Analysis; 