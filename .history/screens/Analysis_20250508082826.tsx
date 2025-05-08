import React, { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Image,
  Alert,
} from 'react-native';
import { Text, Button, Card, Portal, Modal } from 'react-native-paper';
import { Camera } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import { Video } from 'expo-av';
import { SafeAreaView } from 'react-native-safe-area-context';
import { manipulateAsync } from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';

const Analysis = () => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [videoSource, setVideoSource] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentFrame, setCurrentFrame] = useState<string | null>(null);
  const [savedFrames, setSavedFrames] = useState<string[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showFrameModal, setShowFrameModal] = useState(false);
  const [selectedFrame, setSelectedFrame] = useState<string | null>(null);
  
  const videoRef = useRef<Video | null>(null);

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
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick video');
    }
  };

  const captureFrame = async () => {
    if (!videoRef.current) return;

    try {
      setIsProcessing(true);
      
      // Get the current position of the video
      const status = await videoRef.current.getStatusAsync();
      if (!status.isLoaded) return;

      // Create a directory for frames if it doesn't exist
      const framesDir = `${FileSystem.documentDirectory}frames/`;
      await FileSystem.makeDirectoryAsync(framesDir, { intermediates: true }).catch(() => {});

      // Generate a unique filename for the frame
      const timestamp = new Date().getTime();
      const frameFilename = `${framesDir}frame_${timestamp}.jpg`;

      // Save the frame
      const frame = await manipulateAsync(
        videoSource!,
        [{ resize: { width: 720 } }],
        { compress: 0.7, format: 'jpeg' }
      );

      await FileSystem.moveAsync({
        from: frame.uri,
        to: frameFilename,
      });

      // Add to saved frames
      setSavedFrames(prev => [...prev, frameFilename]);
      setCurrentFrame(frameFilename);
    } catch (error) {
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
              <View style={styles.videoContainer}>
                <Video
                  ref={videoRef}
                  source={{ uri: videoSource }}
                  style={styles.video}
                  useNativeControls
                  resizeMode="contain"
                  isLooping
                  onPlaybackStatusUpdate={status => {
                    if (status.isLoaded) {
                      setIsPlaying(status.isPlaying);
                    }
                  }}
                />
                <Button
                  mode="contained"
                  onPress={captureFrame}
                  loading={isProcessing}
                  disabled={isProcessing}
                  style={styles.button}
                >
                  Capture Frame
                </Button>
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
                onPress={() => saveToGallery(selectedFrame)}
                style={styles.button}
              >
                Save to Gallery
              </Button>
              <Button
                mode="outlined"
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
  },
  modalImage: {
    width: '100%',
    height: 300,
    resizeMode: 'contain',
    marginBottom: 16,
  },
});

export default Analysis; 