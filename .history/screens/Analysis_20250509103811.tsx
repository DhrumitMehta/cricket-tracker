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
  PanResponder,
} from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
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
  type: 'line' | 'circle' | 'text';
  points: { x: number; y: number }[];
  timestamp: number;
  text?: string;
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

interface PinchContext extends Record<string, unknown> {
  startScale: number;
}

const Analysis = () => {
  const [primaryVideoUri, setPrimaryVideoUri] = useState<string | null>(null);
  const [secondaryVideoUri, setSecondaryVideoUri] = useState<string | null>(null);
  const [isSideBySide, setIsSideBySide] = useState(false);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [isTextMode, setIsTextMode] = useState(false);
  const [isEraserMode, setIsEraserMode] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [annotations, setAnnotations] = useState<VideoAnnotation[]>([]);
  const [noteText, setNoteText] = useState('');
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [textAnnotation, setTextAnnotation] = useState<string>('');
  const [showTextInput, setShowTextInput] = useState(false);
  const [textPosition, setTextPosition] = useState<{ x: number; y: number } | null>(null);
  const [videoLayout, setVideoLayout] = useState({
    width: 0,
    height: 0,
  });
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [scale, setScale] = useState(1);
  const lastScale = useRef(1);
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        lastScale.current = scale;
      },
      onPanResponderMove: (_, gestureState) => {
        const newScale = lastScale.current * (1 + gestureState.dx / 200);
        // Limit scale between 0.5 and 3
        const limitedScale = Math.min(Math.max(newScale, 0.5), 3);
        setScale(limitedScale);
      },
    })
  ).current;

  const primaryVideoRef = useRef<Video>(null);
  const secondaryVideoRef = useRef<Video>(null);
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  const videoHeight = isSideBySide ? screenHeight * 0.4 : screenHeight * 0.6;

  const videoStyle = {
    transform: [{ scale }],
  };

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

  const handleAddAnnotation = async (annotation: VideoAnnotation) => {
    try {
      const status = await primaryVideoRef.current?.getStatusAsync();
      const currentTime = status?.isLoaded ? status.positionMillis / 1000 : 0;

      setAnnotations(prevAnnotations => [...prevAnnotations, {
        ...annotation,
        timestamp: currentTime
      }]);
    } catch (error) {
      console.error('Error getting video status:', error);
    }
  };

  const handleAddTextAnnotation = (position: { x: number; y: number }) => {
    setTextPosition(position);
    setShowTextInput(true);
  };

  const handleTextSubmit = async () => {
    if (textPosition && textAnnotation.trim()) {
      try {
        const status = await primaryVideoRef.current?.getStatusAsync();
        const currentTime = status?.isLoaded ? status.positionMillis / 1000 : 0;

        setAnnotations(prevAnnotations => [...prevAnnotations, {
          id: Date.now().toString(),
          type: 'text',
          points: [textPosition],
          timestamp: currentTime,
          text: textAnnotation.trim()
        }]);
        setTextAnnotation('');
        setTextPosition(null);
        setShowTextInput(false);
      } catch (error) {
        console.error('Error adding text annotation:', error);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleTimestampPress = async (timestamp: number) => {
    try {
      if (primaryVideoRef.current) {
        await primaryVideoRef.current.setPositionAsync(timestamp * 1000); // Convert to milliseconds
        await primaryVideoRef.current.pauseAsync();
      }
    } catch (error) {
      console.error('Error seeking to timestamp:', error);
    }
  };

  const handleRemoveAnnotation = (annotationId: string) => {
    setAnnotations(prevAnnotations => 
      prevAnnotations.filter(annotation => annotation.id !== annotationId)
    );
  };

  const handleSpeedChange = async (speed: number) => {
    try {
      if (primaryVideoRef.current) {
        await primaryVideoRef.current.setRateAsync(speed, true);
        setPlaybackSpeed(speed);
      }
    } catch (error) {
      console.error('Error setting playback speed:', error);
    }
  };

  const formatSpeed = (speed: number) => {
    return `${(speed * 100).toFixed(0)}%`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.mainContainer}>
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
                <View 
                  style={[styles.videoContainer, videoStyle]}
                  {...panResponder.panHandlers}
                >
                  <Video
                    ref={primaryVideoRef}
                    source={{ uri: primaryVideoUri }}
                    style={styles.video}
                    resizeMode={ResizeMode.CONTAIN}
                    useNativeControls={true}
                    isLooping={true}
                    onPlaybackStatusUpdate={(status) => {
                      if (status.isLoaded) {
                        setCurrentTime(status.positionMillis / 1000);
                        setIsPlaying(status.isPlaying);
                      }
                    }}
                  />
                </View>
                <View style={[styles.annotationLayer, { pointerEvents: isDrawingMode || isTextMode || isEraserMode ? 'auto' : 'none' }]}>
                  <VideoAnnotationLayer
                    width={videoLayout.width}
                    height={videoLayout.height}
                    currentTime={currentTime}
                    annotations={annotations}
                    onAddAnnotation={handleAddAnnotation}
                    onRemoveAnnotation={handleRemoveAnnotation}
                    isDrawingMode={isDrawingMode}
                    isTextMode={isTextMode}
                    isEraserMode={isEraserMode}
                    onAddTextAnnotation={handleAddTextAnnotation}
                  />
                </View>
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
                  resizeMode={ResizeMode.CONTAIN}
                  useNativeControls={true}
                  isLooping={true}
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

        {/* Speed Control */}
        <View style={styles.speedControl}>
          <Text style={styles.speedLabel}>Speed: {formatSpeed(playbackSpeed)}</Text>
          <Slider
            style={styles.speedSlider}
            minimumValue={0.01}
            maximumValue={2}
            value={playbackSpeed}
            onValueChange={handleSpeedChange}
            minimumTrackTintColor="#007AFF"
            maximumTrackTintColor="#000000"
            thumbTintColor="#007AFF"
          />
        </View>

        {/* Annotation Timestamps Display */}
        <View style={styles.annotationTimestamps}>
          <Text style={styles.timestampsTitle}>Annotation Timestamps:</Text>
          <ScrollView style={styles.timestampsList}>
            {annotations.map((annotation, index) => (
              <TouchableOpacity
                key={annotation.id}
                style={styles.timestampItem}
                onPress={() => handleTimestampPress(annotation.timestamp)}
              >
                <Text style={styles.timestampText}>
                  {index + 1}. {formatTime(annotation.timestamp)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.toolbar}>
          <TouchableOpacity
            style={[styles.toolButton, isDrawingMode && styles.activeToolButton]}
            onPress={() => {
              setIsDrawingMode(!isDrawingMode);
              setIsTextMode(false);
              setIsEraserMode(false);
            }}
            disabled={!primaryVideoUri}
          >
            <Icon name="pencil" size={24} color={isDrawingMode ? '#fff' : primaryVideoUri ? '#000' : '#999'} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toolButton, isTextMode && styles.activeToolButton]}
            onPress={() => {
              setIsTextMode(!isTextMode);
              setIsDrawingMode(false);
              setIsEraserMode(false);
            }}
            disabled={!primaryVideoUri}
          >
            <Icon name="format-text" size={24} color={isTextMode ? '#fff' : primaryVideoUri ? '#000' : '#999'} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toolButton, isEraserMode && styles.activeToolButton]}
            onPress={() => {
              setIsEraserMode(!isEraserMode);
              setIsDrawingMode(false);
              setIsTextMode(false);
            }}
            disabled={!primaryVideoUri}
          >
            <Icon name="eraser" size={24} color={isEraserMode ? '#fff' : primaryVideoUri ? '#000' : '#999'} />
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

        {/* Text Annotation Input Modal */}
        <Modal
          visible={showTextInput}
          transparent
          animationType="slide"
          onRequestClose={() => {
            setShowTextInput(false);
            setTextPosition(null);
            setTextAnnotation('');
          }}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Add Text Annotation</Text>
              <TextInput
                style={styles.textInput}
                multiline
                placeholder="Enter text annotation..."
                value={textAnnotation}
                onChangeText={setTextAnnotation}
                autoFocus
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.modalButton}
                  onPress={() => {
                    setShowTextInput(false);
                    setTextPosition(null);
                    setTextAnnotation('');
                  }}
                >
                  <Text>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.saveButton]}
                  onPress={handleTextSubmit}
                >
                  <Text style={styles.saveButtonText}>Add</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  mainContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
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
  annotationTimestamps: {
    height: 120, // Fixed height for timestamps section
    padding: 10,
    backgroundColor: '#f5f5f5',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  timestampsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  timestampsList: {
    flex: 1,
  },
  timestampItem: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  timestampText: {
    fontSize: 14,
    color: '#007AFF',
    textDecorationLine: 'underline',
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'center',
    padding: 10,
    backgroundColor: '#f5f5f5',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
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
  speedControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    padding: 10,
  },
  speedButton: {
    padding: 8,
    marginHorizontal: 5,
    borderRadius: 5,
    backgroundColor: '#f0f0f0',
  },
  activeSpeedButton: {
    backgroundColor: '#007AFF',
  },
  speedButtonText: {
    fontSize: 12,
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
  timeInfo: {
    marginHorizontal: 10,
  },
  annotationLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  textInput: {
    height: 100,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  speedControl: {
    padding: 10,
    backgroundColor: '#f5f5f5',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  speedLabel: {
    fontSize: 14,
    color: '#333',
    marginBottom: 5,
    textAlign: 'center',
  },
  speedSlider: {
    width: '100%',
    height: 40,
  },
  gestureContainer: {
    flex: 1,
    overflow: 'hidden',
  },
});

export default Analysis; 