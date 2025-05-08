import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Image,
  Alert,
  Dimensions,
} from 'react-native';
import {
  Text,
  Button,
  Card,
  Portal,
  Modal,
  ActivityIndicator,
} from 'react-native-paper';
import { Camera, useCameraDevice, useFrameProcessor } from 'react-native-vision-camera';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { runOnJS } from 'react-native-reanimated';

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
  const [showFrameModal, setShowFrameModal] = useState(false);
  const [selectedFrame, setSelectedFrame] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  const camera = useRef<Camera>(null);
  const device = useCameraDevice('back');

  // Request camera permissions
  const requestCameraPermission = useCallback(async () => {
    const permission = await Camera.requestCameraPermission();
    if (permission !== 'authorized') {
      Alert.alert('Permission required', 'Please grant camera permission to use this feature');
    }
  }, []);

  // Frame processor for real-time video analysis
  const frameProcessor = useFrameProcessor((frame) => {
    'worklet';
    // Here you can add frame processing logic
    // For example, motion detection, object detection, etc.
    
    runOnJS(setCurrentFrame)(frame.toString());
  }, []);

  const startRecording = async () => {
    try {
      if (camera.current) {
        setIsRecording(true);
        const video = await camera.current.startRecording({
          onRecordingFinished: (video) => {
            setVideoSource(video.path);
            setIsRecording(false);
          },
          onRecordingError: (error) => {
            console.error(error);
            setIsRecording(false);
            Alert.alert('Error', 'Failed to record video');
          },
        });
      }
    } catch (error) {
      console.error(error);
      setIsRecording(false);
      Alert.alert('Error', 'Failed to start recording');
    }
  };

  const stopRecording = async () => {
    try {
      if (camera.current) {
        await camera.current.stopRecording();
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to stop recording');
    }
  };

  const pickVideo = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        quality: 1,
      });

      if (!result.canceled && result.assets[0]) {
        const uri = result.assets[0].uri;
        setVideoSource(uri);
        // Get video metadata here if needed
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

  if (!device) {
    return (
      <View style={styles.container}>
        <Text>Camera device not available</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.title}>Video Analysis</Text>

            <View style={styles.cameraContainer}>
              <Camera
                ref={camera}
                style={styles.camera}
                device={device}
                isActive={true}
                frameProcessor={frameProcessor}
                frameProcessorFps={5}
              />

              <View style={styles.controlsContainer}>
                <Button
                  mode="contained"
                  onPress={isRecording ? stopRecording : startRecording}
                  style={styles.button}
                >
                  {isRecording ? 'Stop Recording' : 'Start Recording'}
                </Button>
                <Button
                  mode="contained"
                  onPress={pickVideo}
                  style={styles.button}
                >
                  Pick Video
                </Button>
              </View>
            </View>

            {videoSource && (
              <View style={styles.videoInfo}>
                <Text>Video loaded: {videoSource}</Text>
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
  cameraContainer: {
    marginTop: 16,
    borderRadius: 8,
    overflow: 'hidden',
  },
  camera: {
    width: '100%',
    height: 300,
  },
  button: {
    marginVertical: 8,
  },
  videoInfo: {
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