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
  Alert,
} from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import Slider from '@react-native-community/slider';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
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

const VideoLoopSlider = ({
  duration,
  loopStartTime,
  loopEndTime,
  onRangeChange,
  formatTime,
}: {
  duration: number;
  loopStartTime: number;
  loopEndTime: number | null;
  onRangeChange: (start: number, end: number) => void;
  formatTime: (time: number) => string;
}) => {
  const [startSliderValue, setStartSliderValue] = useState(loopStartTime);
  const [endSliderValue, setEndSliderValue] = useState(loopEndTime || duration);

  useEffect(() => {
    setStartSliderValue(loopStartTime);
    setEndSliderValue(loopEndTime || duration);
  }, [loopStartTime, loopEndTime, duration]);

  const handleStartChange = (value: number) => {
    const newStart = Math.min(value, endSliderValue - 0.1);
    setStartSliderValue(newStart);
    onRangeChange(newStart, endSliderValue);
  };

  const handleEndChange = (value: number) => {
    const newEnd = Math.max(value, startSliderValue + 0.1);
    setEndSliderValue(newEnd);
    onRangeChange(startSliderValue, newEnd);
  };

  const handleReset = () => {
    onRangeChange(0, duration);
  };

  return (
    <View style={styles.loopSliderContainer}>
      <View style={styles.loopSliderHeader}>
        <Text style={styles.loopSliderTitle}>Loop Range</Text>
        <TouchableOpacity onPress={handleReset} style={styles.resetButton}>
          <Text style={styles.buttonText}>Reset</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.loopSliderRow}>
        <Text style={styles.timeText}>{formatTime(startSliderValue)}</Text>
        <View style={styles.slidersContainer}>
          <Slider
            style={styles.rangeSlider}
            minimumValue={0}
            maximumValue={duration}
            value={startSliderValue}
            onValueChange={handleStartChange}
            minimumTrackTintColor="#666"
            maximumTrackTintColor="#007AFF"
            thumbTintColor="#007AFF"
          />
          <Slider
            style={[styles.rangeSlider, styles.endSlider]}
            minimumValue={0}
            maximumValue={duration}
            value={endSliderValue}
            onValueChange={handleEndChange}
            minimumTrackTintColor="#007AFF"
            maximumTrackTintColor="#666"
            thumbTintColor="#007AFF"
          />
        </View>
        <Text style={styles.timeText}>{formatTime(endSliderValue)}</Text>
      </View>
    </View>
  );
};

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
      onStartShouldSetPanResponder: () => {
        return !isDrawingMode && !isTextMode && !isEraserMode;
      },
      onMoveShouldSetPanResponder: () => {
        return !isDrawingMode && !isTextMode && !isEraserMode;
      },
      onPanResponderGrant: () => {
        if (isDrawingMode || isTextMode || isEraserMode) return;
        lastScale.current = scale;
      },
      onPanResponderMove: (_, gestureState) => {
        if (isDrawingMode || isTextMode || isEraserMode) return;
        const newScale = lastScale.current * (1 + gestureState.dx / 200);
        const limitedScale = Math.min(Math.max(newScale, 0.5), 3);
        setScale(limitedScale);
      },
    })
  ).current;

  const primaryVideoRef = useRef<Video>(null);
  const secondaryVideoRef = useRef<Video>(null);
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  const videoHeight = isSideBySide ? screenHeight * 0.8 : screenHeight * 0.8;
  const controlsHeight = screenHeight * 0.2;

  const videoStyle = {
    transform: [{ scale }],
  };

  const [isExporting, setIsExporting] = useState(false);
  const [loopStartTime, setLoopStartTime] = useState<number>(0);
  const [loopEndTime, setLoopEndTime] = useState<number | null>(null);
  const [videoDuration, setVideoDuration] = useState<number>(0);

  useEffect(() => {
    if (primaryVideoRef.current) {
      primaryVideoRef.current.setIsLoopingAsync(false);
    }
  }, [primaryVideoUri]);

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
          // Reset annotations and related states when new video is selected
          setAnnotations([]);
          setCurrentTime(0);
          setIsDrawingMode(false);
          setIsTextMode(false);
          setIsEraserMode(false);
          setShowTextInput(false);
          setTextPosition(null);
          setTextAnnotation('');
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

  const handleExportVideo = async () => {
    try {
      setIsExporting(true);

      // Request permissions if needed
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant permission to save videos to your device.');
        return;
      }

      // Get the current video status to pause it
      if (primaryVideoRef.current) {
        await primaryVideoRef.current.pauseAsync();
      }

      // Create a unique filename
      const timestamp = new Date().getTime();
      const filename = `annotated_video_${timestamp}.mp4`;

      // Save the video with annotations
      // Note: This is a placeholder for the actual video processing
      // In a real implementation, we would need to:
      // 1. Process each frame of the video
      // 2. Draw annotations on each frame
      // 3. Combine frames back into a video
      // 4. Save the final video
      
      Alert.alert(
        'Export Video',
        'Video export functionality is coming soon! This will allow you to save videos with annotations.',
        [{ text: 'OK' }]
      );

    } catch (error) {
      console.error('Error exporting video:', error);
      Alert.alert('Export Failed', 'Failed to export video. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleReplaceVideo = () => {
    Alert.alert(
      'Replace Video',
      'Do you want to replace the current video? Your annotations will be preserved.',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Replace',
          onPress: () => selectVideo(false)
        }
      ]
    );
  };

  const handleLoopRangeChange = async (start: number, end: number) => {
    console.log('handleLoopRangeChange called with:', { start, end, currentTime, videoDuration });
    
    try {
      if (primaryVideoRef.current) {
        if (start === 0 && end === videoDuration) {
          // Reset to normal playback
          console.log('Resetting loop to full video');
          await primaryVideoRef.current.setIsLoopingAsync(true);
          setLoopStartTime(0);
          setLoopEndTime(null);
        } else {
          // Set custom loop points
          console.log('Setting new loop points');
          await primaryVideoRef.current.setIsLoopingAsync(false);
          setLoopStartTime(start);
          setLoopEndTime(end);
          
          // Seek to start if current position is outside the loop range
          const status = await primaryVideoRef.current.getStatusAsync();
          if (status.isLoaded) {
            const currentPos = status.positionMillis / 1000;
            if (currentPos < start || currentPos > end) {
              console.log('Seeking to start position:', start);
              await primaryVideoRef.current.setPositionAsync(start * 1000);
            }
            // Ensure video is playing
            if (!status.isPlaying) {
              await primaryVideoRef.current.playAsync();
            }
          }
        }
      }
    } catch (error) {
      console.error('Error in handleLoopRangeChange:', error);
    }
  };

  const handlePlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;

    const newTime = status.positionMillis / 1000;
    setCurrentTime(newTime);
    setIsPlaying(status.isPlaying);
    
    if (status.durationMillis !== undefined) {
      setVideoDuration(status.durationMillis / 1000);
    }

    // Handle custom loop range
    if (loopEndTime !== null && primaryVideoRef.current) {
      if (newTime >= loopEndTime) {
        console.log('Reached loop end, seeking to:', {
          currentTime: newTime,
          loopEndTime,
          loopStartTime
        });
        
        // Use a more reliable way to handle the loop
        (async () => {
          try {
            await primaryVideoRef.current.setPositionAsync(loopStartTime * 1000);
            if (status.isPlaying) {
              await primaryVideoRef.current.playAsync();
            }
          } catch (error) {
            console.error('Error in loop handling:', error);
          }
        })();
      }
    }
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
                  {...(!isDrawingMode && !isTextMode && !isEraserMode ? panResponder.panHandlers : {})}
            >
              <Video
                ref={primaryVideoRef}
                source={{ uri: primaryVideoUri }}
                style={styles.video}
                resizeMode={ResizeMode.CONTAIN}
                useNativeControls={true}
                isLooping={false}
                onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
              />
                <View 
                  style={[
                    styles.annotationLayer, 
                    { 
                      pointerEvents: isDrawingMode || isTextMode || isEraserMode ? 'auto' : 'none',
                    }
                  ]}
                >
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
                <TouchableOpacity
                  style={styles.replaceVideoButton}
                  onPress={handleReplaceVideo}
                >
                  <Icon name="file-replace" size={24} color="#fff" />
                </TouchableOpacity>
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

        <View style={[styles.controlsContainer, { height: controlsHeight }]}>
          {/* Loop Range Control */}
          {primaryVideoUri && (
            <VideoLoopSlider
              duration={videoDuration}
              loopStartTime={loopStartTime}
              loopEndTime={loopEndTime}
              onRangeChange={handleLoopRangeChange}
              formatTime={formatTime}
            />
          )}

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
          <TouchableOpacity
              style={[styles.toolButton, isExporting && styles.processingButton]}
              onPress={handleExportVideo}
              disabled={!primaryVideoUri || isExporting}
            >
              <Icon 
                name={isExporting ? "loading" : "export"} 
                size={24} 
                color={!primaryVideoUri ? '#999' : isExporting ? '#666' : '#000'} 
              />
          </TouchableOpacity>
          </View>
        </View>

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
  controlsContainer: {
    backgroundColor: '#f5f5f5',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    flexDirection: 'column',
  },
  speedControl: {
    padding: 5,
    backgroundColor: '#f5f5f5',
  },
  speedLabel: {
    fontSize: 12,
    color: '#333',
    marginBottom: 2,
    textAlign: 'center',
  },
  speedSlider: {
    width: '100%',
    height: 30,
  },
  annotationTimestamps: {
    flex: 1,
    padding: 5,
    backgroundColor: '#f5f5f5',
  },
  timestampsTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  timestampsList: {
    flex: 1,
  },
  timestampItem: {
    paddingVertical: 2,
    paddingHorizontal: 4,
    borderRadius: 4,
  },
  timestampText: {
    fontSize: 12,
    color: '#007AFF',
    textDecorationLine: 'underline',
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'center',
    padding: 5,
    backgroundColor: '#f5f5f5',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    marginTop: 'auto',
  },
  toolButton: {
    padding: 8,
    marginHorizontal: 4,
    borderRadius: 5,
    backgroundColor: '#e0e0e0',
  },
  activeToolButton: {
    backgroundColor: '#007AFF',
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
  processingButton: {
    backgroundColor: '#f0f0f0',
    opacity: 0.7,
  },
  replaceVideoButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: 8,
    zIndex: 10,
    elevation: 5, // for Android
  },
  loopSliderContainer: {
    padding: 10,
    backgroundColor: '#f5f5f5',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  loopSliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  loopSliderTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  loopSliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  slidersContainer: {
    flex: 1,
    marginHorizontal: 10,
    height: 40,
  },
  rangeSlider: {
    position: 'absolute',
    width: '100%',
  },
  endSlider: {
    transform: [{ scaleY: -1 }], // Flip the slider upside down
  },
  timeText: {
    fontSize: 12,
    color: '#666',
    width: 45,
    textAlign: 'center',
  },
  resetButton: {
    backgroundColor: '#f44336',
    padding: 6,
    borderRadius: 4,
  },
  buttonText: {
    color: 'white',
    fontSize: 12,
  },
});

export default Analysis; 