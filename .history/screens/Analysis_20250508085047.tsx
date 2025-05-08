import React, { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Image,
  Alert,
  PanResponder,
  Dimensions,
} from 'react-native';
import {
  Text,
  Button,
  Card,
  Portal,
  Modal,
  IconButton,
  SegmentedButtons,
  Menu,
} from 'react-native-paper';
import Slider from '@react-native-community/slider';
import { Camera } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { SafeAreaView } from 'react-native-safe-area-context';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
import Svg, { Path, G } from 'react-native-svg';

interface DrawingPath {
  path: string;
  color: string;
  strokeWidth: number;
}

interface VideoFilter {
  name: string;
  brightness: number;
  contrast: number;
  saturation: number;
}

const FILTERS: VideoFilter[] = [
  { name: 'Normal', brightness: 1, contrast: 1, saturation: 1 },
  { name: 'Bright', brightness: 1.2, contrast: 1.1, saturation: 1.1 },
  { name: 'Contrast', brightness: 1, contrast: 1.3, saturation: 1 },
  { name: 'Warm', brightness: 1.1, contrast: 1, saturation: 1.2 },
  { name: 'Cool', brightness: 0.9, contrast: 1.1, saturation: 0.8 },
];

const Analysis = () => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [videoSource, setVideoSource] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentFrame, setCurrentFrame] = useState<string | null>(null);
  const [savedFrames, setSavedFrames] = useState<string[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showFrameModal, setShowFrameModal] = useState(false);
  const [selectedFrame, setSelectedFrame] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [showTrimmer, setShowTrimmer] = useState(false);
  const [paths, setPaths] = useState<DrawingPath[]>([]);
  const [currentPath, setCurrentPath] = useState<string>('');
  const [drawingMode, setDrawingMode] = useState(false);
  const [drawingColor, setDrawingColor] = useState('#FF0000');
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [selectedFilter, setSelectedFilter] = useState<VideoFilter>(FILTERS[0]);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  
  const videoRef = useRef<Video>(null);
  const cameraRef = useRef<Camera>(null);
  const [isCameraVisible, setIsCameraVisible] = useState(false);
  const videoPlayerRef = useRef<View | null>(null);
  const viewShotRef = useRef<View>(null);

  React.useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      const mediaStatus = await MediaLibrary.requestPermissionsAsync();
      setHasPermission(status === 'granted' && mediaStatus.status === 'granted');
    })();
  }, []);

  const pickVideo = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        quality: 1,
      });

      if (!result.canceled) {
        setVideoSource(result.assets[0].uri);
        // Reset states when new video is picked
        setSavedFrames([]);
        setCurrentFrame(null);
        setTrimStart(0);
        setTrimEnd(0);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick video');
    }
  };

  const captureFrame = async () => {
    if (!videoRef.current) return;

    try {
      setIsProcessing(true);
      
      // Pause the video
      await videoRef.current.pauseAsync();
      
      // Get the current position of the video
      const status = await videoRef.current.getStatusAsync();
      if (!status.isLoaded) return;

      // Create a directory for frames if it doesn't exist
      const framesDir = `${FileSystem.documentDirectory}frames/`;
      await FileSystem.makeDirectoryAsync(framesDir, { intermediates: true }).catch(() => {});

      // Generate a unique filename for the frame
      const timestamp = new Date().getTime();
      const frameFilename = `${framesDir}frame_${timestamp}.jpg`;

      // Take a snapshot of the current frame
      const snapshot = await videoRef.current.takeSnapshotAsync({
        quality: 1.0,
        format: 'jpg'
      });

      // Move the snapshot to our frames directory
      await FileSystem.moveAsync({
        from: snapshot.uri,
        to: frameFilename,
      });

      // Add to saved frames
      setSavedFrames(prev => [...prev, frameFilename]);
      setCurrentFrame(frameFilename);
    } catch (error) {
      console.error('Frame capture error:', error);
      Alert.alert('Error', 'Failed to capture frame');
    } finally {
      setIsProcessing(false);
    }
  };

  const saveToGallery = async (uri: string) => {
    try {
      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert('Success', 'Saved to gallery');
    } catch (error) {
      Alert.alert('Error', 'Failed to save to gallery');
    }
  };

  const handleFramePress = (frame: string) => {
    setSelectedFrame(frame);
    setShowFrameModal(true);
  };

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (evt) => {
      const { locationX, locationY } = evt.nativeEvent;
      setCurrentPath(`M ${locationX} ${locationY}`);
    },
    onPanResponderMove: (evt) => {
      const { locationX, locationY } = evt.nativeEvent;
      setCurrentPath(prev => `${prev} L ${locationX} ${locationY}`);
    },
    onPanResponderRelease: () => {
      if (currentPath) {
        setPaths([...paths, { path: currentPath, color: drawingColor, strokeWidth }]);
        setCurrentPath('');
      }
    },
  });

  const handleFrameNavigation = async (direction: 'prev' | 'next') => {
    if (!videoRef.current) return;
    
    const status = await videoRef.current.getStatusAsync();
    if (!status.isLoaded) return;

    const frameStep = 1/30; // Assuming 30fps
    const newTime = direction === 'next' 
      ? Math.min(status.positionMillis/1000 + frameStep, duration)
      : Math.max(status.positionMillis/1000 - frameStep, 0);

    await videoRef.current.setPositionAsync(newTime * 1000);
    setCurrentTime(newTime);
  };

  const handleVideoTrim = async () => {
    if (!videoSource) return;
    setIsProcessing(true);

    try {
      const status = await videoRef.current?.getStatusAsync();
      if (!status?.isLoaded) return;

      // Get video duration in milliseconds
      const duration = status.durationMillis || 0;
      
      // Convert trim points to milliseconds
      const startMs = trimStart * 1000;
      const endMs = trimEnd * 1000;

      if (startMs >= endMs || startMs < 0 || endMs > duration) {
        throw new Error('Invalid trim points');
      }

      // Create output directory if it doesn't exist
      const outputDir = `${FileSystem.documentDirectory}trimmed/`;
      await FileSystem.makeDirectoryAsync(outputDir, { intermediates: true }).catch(() => {});

      const timestamp = new Date().getTime();
      const outputUri = `${outputDir}trimmed_${timestamp}.mp4`;

      // For now, we'll just show a message since actual video trimming requires additional setup
      Alert.alert(
        'Trimming Info',
        `Video will be trimmed from ${trimStart.toFixed(1)}s to ${trimEnd.toFixed(1)}s\n\nNote: Full video trimming functionality requires additional native modules.`
      );
    } catch (error) {
      console.error('Video trim error:', error);
      Alert.alert('Error', 'Failed to trim video');
    } finally {
      setIsProcessing(false);
      setShowTrimmer(false);
    }
  };

  const exportFrame = async () => {
    if (!viewShotRef.current || !selectedFrame) return;

    try {
      const uri = await captureRef(viewShotRef.current, {
        format: 'jpg',
        quality: 0.9,
      });

      const sharing = await Sharing.isAvailableAsync();
      if (sharing) {
        await Sharing.shareAsync(uri);
      } else {
        await saveToGallery(uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to export frame');
    }
  };

  const applyFilter = async () => {
    if (!videoSource) return;
    setIsProcessing(true);

    try {
      // Here you would implement filter application logic
      // This is a placeholder for actual video filter implementation
      Alert.alert('Success', 'Filter applied successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to apply filter');
    } finally {
      setIsProcessing(false);
    }
  };

  if (hasPermission === null) {
    return <View />;
  }

  if (hasPermission === false) {
    return <Text>No access to camera or media library</Text>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.title}>Video Analysis</Text>
            <Button
              mode="contained"
              onPress={pickVideo}
              style={styles.button}
            >
              Pick Video
            </Button>

            {videoSource && (
              <View style={styles.videoContainer} ref={videoPlayerRef}>
                <Video
                  ref={videoRef}
                  source={{ uri: videoSource }}
                  style={styles.video}
                  useNativeControls
                  resizeMode={ResizeMode.CONTAIN}
                  isLooping
                  onPlaybackStatusUpdate={(status: AVPlaybackStatus) => {
                    if (status.isLoaded) {
                      setIsPlaying(status.isPlaying);
                      setCurrentTime(status.positionMillis / 1000);
                      const videoDuration = status.durationMillis ? status.durationMillis / 1000 : 0;
                      setDuration(videoDuration);
                      if (trimEnd === 0) {
                        setTrimEnd(videoDuration);
                      }
                    }
                  }}
                />
                
                {/* Hidden camera for frame capture */}
                <Camera
                  ref={cameraRef}
                  style={{ width: 1, height: 1, opacity: 0 }}
                  type={Camera.Constants.Type.back}
                />
                
                <View style={styles.controlsContainer}>
                  <IconButton icon="step-backward" onPress={() => handleFrameNavigation('prev')} />
                  <Button
                    mode="contained"
                    onPress={captureFrame}
                    loading={isProcessing}
                    disabled={isProcessing}
                    style={styles.button}
                  >
                    Capture Frame
                  </Button>
                  <IconButton icon="step-forward" onPress={() => handleFrameNavigation('next')} />
                </View>

                <View style={styles.toolbarContainer}>
                  <Button
                    mode="outlined"
                    onPress={() => setShowTrimmer(true)}
                    style={styles.toolButton}
                  >
                    Trim Video
                  </Button>
                  <Button
                    mode="outlined"
                    onPress={() => setShowFilterMenu(true)}
                    style={styles.toolButton}
                  >
                    Filters
                  </Button>
                </View>
              </View>
            )}
          </Card.Content>
        </Card>

        {savedFrames.length > 0 && (
          <Card style={styles.card}>
            <Card.Content>
              <Text style={styles.subtitle}>Saved Frames</Text>
              <ScrollView horizontal style={styles.framesContainer}>
                {savedFrames.map((frame, index) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => handleFramePress(frame)}
                    style={styles.frameThumb}
                  >
                    <Image source={{ uri: frame }} style={styles.frameImage} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </Card.Content>
          </Card>
        )}
      </ScrollView>

      <Portal>
        {/* Frame Editor Modal */}
        <Modal
          visible={showFrameModal}
          onDismiss={() => setShowFrameModal(false)}
          contentContainerStyle={styles.modalContent}
        >
          {selectedFrame && (
            <View ref={viewShotRef}>
              <View style={styles.editorContainer}>
                <Image source={{ uri: selectedFrame }} style={styles.modalImage} />
                {drawingMode && (
                  <Svg style={StyleSheet.absoluteFill}>
                    <G>
                      {paths.map((path, index) => (
                        <Path
                          key={index}
                          d={path.path}
                          stroke={path.color}
                          strokeWidth={path.strokeWidth}
                          fill="none"
                        />
                      ))}
                      {currentPath && (
                        <Path
                          d={currentPath}
                          stroke={drawingColor}
                          strokeWidth={strokeWidth}
                          fill="none"
                        />
                      )}
                    </G>
                  </Svg>
                )}
              </View>

              <View style={styles.editorToolbar}>
                <SegmentedButtons
                  value={drawingMode ? 'draw' : 'view'}
                  onValueChange={value => setDrawingMode(value === 'draw')}
                  buttons={[
                    { value: 'view', label: 'View' },
                    { value: 'draw', label: 'Draw' },
                  ]}
                />
                {drawingMode && (
                  <View style={styles.drawingTools}>
                    <IconButton icon="palette" onPress={() => {/* Color picker */}} />
                    <Slider
                      value={strokeWidth}
                      onValueChange={(value: number) => setStrokeWidth(value)}
                      minimumValue={1}
                      maximumValue={10}
                      style={styles.slider}
                    />
                  </View>
                )}
              </View>

              <View style={styles.modalButtons}>
                <Button
                  mode="contained"
                  onPress={exportFrame}
                  style={styles.button}
                >
                  Export
                </Button>
                <Button
                  mode="outlined"
                  onPress={() => setShowFrameModal(false)}
                  style={styles.button}
                >
                  Close
                </Button>
              </View>
            </View>
          )}
        </Modal>

        {/* Video Trimmer Modal */}
        <Modal
          visible={showTrimmer}
          onDismiss={() => setShowTrimmer(false)}
          contentContainerStyle={styles.modalContent}
        >
          <Text style={styles.subtitle}>Trim Video</Text>
          <View style={styles.trimmerContainer}>
            <Slider
              value={trimStart}
              onValueChange={(value: number) => setTrimStart(value)}
              minimumValue={0}
              maximumValue={duration}
              style={styles.slider}
            />
            <Text>Start: {trimStart.toFixed(1)}s</Text>
            <Slider
              value={trimEnd}
              onValueChange={(value: number) => setTrimEnd(value)}
              minimumValue={0}
              maximumValue={duration}
              style={styles.slider}
            />
            <Text>End: {trimEnd.toFixed(1)}s</Text>
          </View>
          <Button
            mode="contained"
            onPress={handleVideoTrim}
            loading={isProcessing}
            disabled={isProcessing}
            style={styles.button}
          >
            Trim Video
          </Button>
          <Button
            mode="outlined"
            onPress={() => setShowTrimmer(false)}
            style={styles.button}
          >
            Cancel
          </Button>
        </Modal>

        {/* Filter Menu */}
        <Menu
          visible={showFilterMenu}
          onDismiss={() => setShowFilterMenu(false)}
          anchor={<View />}
        >
          {FILTERS.map(filter => (
            <Menu.Item
              key={filter.name}
              onPress={() => {
                setSelectedFilter(filter);
                setShowFilterMenu(false);
                applyFilter();
              }}
              title={filter.name}
            />
          ))}
        </Menu>
      </Portal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  scrollView: {
    flex: 1,
  },
  card: {
    margin: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  button: {
    marginVertical: 8,
  },
  videoContainer: {
    marginTop: 16,
  },
  video: {
    width: '100%',
    height: 300,
    backgroundColor: '#000',
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginTop: 8,
  },
  toolbarContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  toolButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  framesContainer: {
    flexDirection: 'row',
    marginTop: 8,
  },
  frameThumb: {
    marginRight: 8,
  },
  frameImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 8,
    maxHeight: '80%',
  },
  modalImage: {
    width: '100%',
    height: 300,
    resizeMode: 'contain',
    marginBottom: 16,
  },
  editorContainer: {
    position: 'relative',
  },
  editorToolbar: {
    marginVertical: 8,
  },
  drawingTools: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  slider: {
    flex: 1,
    marginHorizontal: 8,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
  },
  trimmerContainer: {
    padding: 16,
  },
});

export default Analysis; 