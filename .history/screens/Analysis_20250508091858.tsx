import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Image,
  Alert,
  Dimensions,
  NativeEventEmitter,
  NativeModules,
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
  ActivityIndicator,
} from 'react-native-paper';
import { Video, ResizeMode } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { FFmpegKit, FFmpegKitConfig, ReturnCode, Level } from 'ffmpeg-kit-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface VideoInfo {
  duration: number;
  width: number;
  height: number;
  fps: number;
  format: string;
}

const Analysis = () => {
  const [videoSource, setVideoSource] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentFrame, setCurrentFrame] = useState<string | null>(null);
  const [frames, setFrames] = useState<string[]>([]);
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showFrameModal, setShowFrameModal] = useState(false);
  const [selectedFrame, setSelectedFrame] = useState<string | null>(null);
  const [isFFmpegReady, setIsFFmpegReady] = useState(false);

  const videoRef = useRef<Video>(null);

  // Initialize FFmpeg
  useEffect(() => {
    const initFFmpeg = async () => {
      try {
        // Simple test command to check if FFmpeg is working
        const session = await FFmpegKit.execute('-version');
        const returnCode = await session.getReturnCode();
        
        if (returnCode?.isValueSuccess()) {
          console.log('FFmpeg initialized successfully');
          setIsFFmpegReady(true);
        } else {
          throw new Error('FFmpeg initialization failed');
        }
      } catch (error) {
        console.error('Error initializing FFmpeg:', error);
        Alert.alert('Error', 'Failed to initialize video processing');
      }
    };

    // Add a small delay before initialization
    setTimeout(() => {
      initFFmpeg();
    }, 1000);
  }, []);

  // Get video information using FFprobe
  const getVideoInfo = async (uri: string) => {
    if (!uri || !isFFmpegReady) {
      console.log('FFmpeg not ready or invalid URI');
      return;
    }
    
    try {
      setIsProcessing(true);

      // Clean and encode the URI
      const videoPath = Platform.select({
        android: uri.startsWith('file://') ? uri : `file://${uri}`,
        ios: uri,
      });

      console.log('Processing video path:', videoPath);

      // First, check if the file exists and is accessible
      try {
        const fileInfo = await FileSystem.getInfoAsync(uri.replace('file://', ''));
        console.log('File info:', fileInfo);
        if (!fileInfo.exists) {
          throw new Error('Video file not found');
        }
      } catch (error) {
        console.error('Error checking file:', error);
        throw new Error('Cannot access video file');
      }

      // Use a simple FFprobe command first
      const simpleCommand = `-i "${videoPath}"`;
      console.log('Executing FFprobe command:', simpleCommand);

      const session = await FFmpegKit.execute(simpleCommand);
      if (!session) {
        throw new Error('Failed to create FFmpeg session');
      }

      const returnCode = await session.getReturnCode();
      const output = await session.getOutput();
      const logs = await session.getLogs();

      console.log('FFprobe Return Code:', returnCode?.getValue());
      console.log('FFprobe Output:', output);
      console.log('FFprobe Logs:', logs);

      if (returnCode?.isValueSuccess()) {
        // Parse the output to get video information
        const durationMatch = output?.match(/Duration: (\d{2}):(\d{2}):(\d{2}.\d{2})/);
        const resolutionMatch = output?.match(/(\d{3,})x(\d{3,})/);
        const fpsMatch = output?.match(/(\d{2}.\d{2}|\d{2}) fps/);

        const info = {
          duration: 0,
          width: 0,
          height: 0,
          fps: 30,
          format: 'mp4'
        };

        if (durationMatch) {
          const hours = parseInt(durationMatch[1]);
          const minutes = parseInt(durationMatch[2]);
          const seconds = parseFloat(durationMatch[3]);
          info.duration = hours * 3600 + minutes * 60 + seconds;
        }

        if (resolutionMatch) {
          info.width = parseInt(resolutionMatch[1]);
          info.height = parseInt(resolutionMatch[2]);
        }

        if (fpsMatch) {
          info.fps = parseFloat(fpsMatch[1]);
        }

        setVideoInfo(info);
        console.log('Video info parsed:', info);
      } else {
        console.error('FFprobe failed with return code:', returnCode?.getValue());
        console.error('FFprobe logs:', logs);
        throw new Error('Failed to get video info');
      }
    } catch (error) {
      console.error('Error getting video info:', error);
      Alert.alert('Error', 'Failed to get video information. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Extract frame at specific timestamp
  const extractFrame = async (timestamp: number) => {
    if (!videoSource) return;
    
    try {
      setIsProcessing(true);
      const outputPath = `${FileSystem.cacheDirectory || ''}frame_${timestamp}.jpg`;
      const command = `-ss ${timestamp} -i "${videoSource}" -vframes 1 -q:v 2 "${outputPath}"`;
      
      const session = await FFmpegKit.execute(command);
      const returnCode = await session.getReturnCode();

      if (ReturnCode.isSuccess(returnCode)) {
        setCurrentFrame(outputPath);
        setFrames(prev => [...prev, outputPath]);
      } else {
        const logs = await session.getLogs();
        console.error('FFmpeg logs:', logs);
        throw new Error('Failed to extract frame');
      }
    } catch (error) {
      console.error('Error extracting frame:', error);
      Alert.alert('Error', 'Failed to extract frame');
    } finally {
      setIsProcessing(false);
    }
  };

  // Extract multiple frames for analysis
  const extractFrameSequence = async (startTime: number, duration: number, frameCount: number) => {
    if (!videoSource || !FileSystem.cacheDirectory) return;
    
    try {
      setIsProcessing(true);
      const outputPath = `${FileSystem.cacheDirectory}sequence_%d.jpg`;
      const command = `-ss ${startTime} -t ${duration} -i "${videoSource}" -vf fps=${frameCount/duration} "${outputPath}"`;
      
      const session = await FFmpegKit.execute(command);
      const returnCode = await session.getReturnCode();

      if (ReturnCode.isSuccess(returnCode)) {
        const files = await FileSystem.readDirectoryAsync(FileSystem.cacheDirectory);
        const newFrames = files
          .filter(f => f.startsWith('sequence_'))
          .map(f => `${FileSystem.cacheDirectory}${f}`);
        setFrames(newFrames);
      } else {
        const logs = await session.getLogs();
        console.error('FFmpeg logs:', logs);
        throw new Error('Failed to extract frames');
      }
    } catch (error) {
      console.error('Error extracting frames:', error);
      Alert.alert('Error', 'Failed to extract frame sequence');
    } finally {
      setIsProcessing(false);
    }
  };

  const pickVideo = async () => {
    if (!isFFmpegReady) {
      Alert.alert('Please wait', 'Video processing is initializing...');
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        quality: 1,
      });

      if (!result.canceled && result.assets[0]) {
        const uri = result.assets[0].uri;
        console.log('Selected video URI:', uri);
        setVideoSource(uri);
        await getVideoInfo(uri);
      }
    } catch (error) {
      console.error('Error picking video:', error);
      Alert.alert('Error', 'Failed to pick video');
    }
  };

  const handleFramePress = (frame: string) => {
    setSelectedFrame(frame);
    setShowFrameModal(true);
  };

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
              disabled={isProcessing}
            >
              Pick Video
            </Button>

            {videoSource && (
              <View style={styles.videoContainer}>
                <Video
                  ref={videoRef}
                  source={{ uri: videoSource }}
                  style={styles.video}
                  useNativeControls
                  resizeMode={ResizeMode.CONTAIN}
                  isLooping
                  onPlaybackStatusUpdate={(status: any) => {
                    if (status.isLoaded) {
                      setIsPlaying(status.isPlaying);
                      setCurrentTime(status.positionMillis / 1000);
                    }
                  }}
                />

                {videoInfo && (
                  <View style={styles.infoContainer}>
                    <Text>Duration: {videoInfo.duration.toFixed(2)}s</Text>
                    <Text>Resolution: {videoInfo.width}x{videoInfo.height}</Text>
                    <Text>FPS: {videoInfo.fps}</Text>
                    <Text>Format: {videoInfo.format}</Text>
                  </View>
                )}

                <View style={styles.controlsContainer}>
                  <Button
                    mode="contained"
                    onPress={() => extractFrame(currentTime)}
                    disabled={isProcessing}
                    style={styles.button}
                  >
                    Capture Current Frame
                  </Button>
                  <Button
                    mode="contained"
                    onPress={() => extractFrameSequence(currentTime, 1, 5)}
                    disabled={isProcessing}
                    style={styles.button}
                  >
                    Extract Frame Sequence
                  </Button>
                </View>
              </View>
            )}

            {isProcessing && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" />
                <Text>Processing...</Text>
              </View>
            )}

            {frames.length > 0 && (
              <ScrollView horizontal style={styles.framesContainer}>
                {frames.map((frame, index) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => handleFramePress(frame)}
                    style={styles.frameThumb}
                  >
                    <Image source={{ uri: frame }} style={styles.frameImage} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </Card.Content>
        </Card>
      </ScrollView>

      <Portal>
        <Modal
          visible={showFrameModal}
          onDismiss={() => setShowFrameModal(false)}
          contentContainerStyle={styles.modalContent}
        >
          {selectedFrame && (
            <View>
              <Image source={{ uri: selectedFrame }} style={styles.modalImage} />
              <Button
                mode="contained"
                onPress={() => setShowFrameModal(false)}
                style={styles.button}
              >
                Close
              </Button>
            </View>
          )}
        </Modal>
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
  infoContainer: {
    padding: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    marginVertical: 8,
  },
  controlsContainer: {
    flexDirection: 'column',
    gap: 8,
    marginTop: 8,
  },
  loadingContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
  framesContainer: {
    flexDirection: 'row',
    marginTop: 16,
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
  },
  modalImage: {
    width: '100%',
    height: 300,
    resizeMode: 'contain',
    marginBottom: 16,
  },
});

export default Analysis; 