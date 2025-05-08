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
import Video, { VideoRef } from 'react-native-video';
import Slider from '@react-native-community/slider';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import * as ImagePicker from 'react-native-image-picker';

interface Note {
  id: string;
  timestamp: number;
  text: string;
}

interface VideoAnnotation {
  id: string;
  timestamp: number;
  position: { x: number; y: number };
  text: string;
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
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [notes, setNotes] = useState<Note[]>([]);
  const [annotations, setAnnotations] = useState<VideoAnnotation[]>([]);
  const [selectedArea, setSelectedArea] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const [isSideBySide, setIsSideBySide] = useState(false);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [primaryVideoUri, setPrimaryVideoUri] = useState<string | null>(null);
  const [secondaryVideoUri, setSecondaryVideoUri] = useState<string | null>(null);

  const primaryVideoRef = useRef<VideoRef>(null);
  const secondaryVideoRef = useRef<VideoRef>(null);
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  const videoHeight = isSideBySide ? screenHeight * 0.4 : screenHeight * 0.5;

  const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      try {
        console.log('Requesting permissions...');
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
        ]);
        console.log('Permission results:', granted);
        const hasPermissions = Object.values(granted).every(
          (permission) => permission === PermissionsAndroid.RESULTS.GRANTED
        );
        console.log('Has all permissions:', hasPermissions);
        return hasPermissions;
      } catch (err) {
        console.warn('Error requesting permissions:', err);
        return false;
      }
    }
    return true;
  };

  const selectVideo = async (isSecondary: boolean = false) => {
    try {
      console.log('Starting video selection...');
      
      const options = {
        mediaType: 'video',
        selectionLimit: 1,
        quality: 1,
        videoQuality: 'high',
        presentationStyle: 'fullScreen',
        durationLimit: 0,
      };

      console.log('Launching image library with options:', options);
      const result = await ImagePicker.launchImageLibrary(options);

      console.log('Image picker result:', result);

      if (result.didCancel) {
        console.log('User cancelled video selection');
        return;
      }

      if (result.errorCode) {
        console.log('ImagePicker Error:', result.errorMessage);
        return;
      }

      if (result.assets && result.assets[0]?.uri) {
        const uri = result.assets[0].uri;
        console.log('Selected video URI:', uri);
        if (isSecondary) {
          setSecondaryVideoUri(uri);
        } else {
          setPrimaryVideoUri(uri);
        }
      } else {
        console.log('No video URI found in result');
      }
    } catch (error) {
      console.error('Error selecting video:', error);
    }
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleSliderChange = (value: number) => {
    setCurrentTime(value);
    primaryVideoRef.current?.seek(value);
    if (isSideBySide) {
      secondaryVideoRef.current?.seek(value);
    }
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackRate(speed);
  };

  const handleFrameStep = (forward: boolean) => {
    const frameTime = 1/30; // Assuming 30fps
    const newTime = currentTime + (forward ? frameTime : -frameTime);
    handleSliderChange(Math.max(0, Math.min(newTime, duration)));
  };

  const addNote = () => {
    if (noteText.trim()) {
      const newNote: Note = {
        id: Date.now().toString(),
        timestamp: currentTime,
        text: noteText,
      };
      setNotes([...notes, newNote]);
      setNoteText('');
      setShowNoteInput(false);
    }
  };

  const handleAddAnnotation = (annotation: any) => {
    setAnnotations([...annotations, {
      ...annotation,
      id: Date.now().toString(),
      timestamp: currentTime,
    }]);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.videoContainer, { height: videoHeight }]}>
        <View style={styles.videoWrapper}>
          {primaryVideoUri ? (
            <Video
              ref={primaryVideoRef}
              source={{ uri: primaryVideoUri }}
              style={styles.video}
              resizeMode="contain"
              paused={!isPlaying}
              rate={playbackRate}
              onProgress={({ currentTime: time }) => setCurrentTime(time)}
              onLoad={({ duration: d }) => setDuration(d)}
            />
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
                resizeMode="contain"
                paused={!isPlaying}
                rate={playbackRate}
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
        <TouchableOpacity onPress={() => handleFrameStep(false)} disabled={!primaryVideoUri}>
          <Icon name="skip-backward" size={24} color={primaryVideoUri ? '#000' : '#999'} />
        </TouchableOpacity>
        <TouchableOpacity onPress={handlePlayPause} disabled={!primaryVideoUri}>
          <Icon name={isPlaying ? "pause" : "play"} size={24} color={primaryVideoUri ? '#000' : '#999'} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleFrameStep(true)} disabled={!primaryVideoUri}>
          <Icon name="skip-forward" size={24} color={primaryVideoUri ? '#000' : '#999'} />
        </TouchableOpacity>
        <Slider
          style={styles.slider}
          value={currentTime}
          maximumValue={duration}
          minimumValue={0}
          onValueChange={handleSliderChange}
          disabled={!primaryVideoUri}
        />
      </View>

      <View style={styles.speedControls}>
        {[0.25, 0.5, 1, 1.5, 2].map((speed) => (
          <TouchableOpacity
            key={speed}
            style={[
              styles.speedButton,
              playbackRate === speed && styles.activeSpeedButton,
            ]}
            onPress={() => handleSpeedChange(speed)}
            disabled={!primaryVideoUri}
          >
            <Text style={[
              styles.speedButtonText,
              { color: primaryVideoUri ? (playbackRate === speed ? '#fff' : '#000') : '#999' }
            ]}>
              {speed}x
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.notesContainer}>
        {notes.map((note) => (
          <TouchableOpacity
            key={note.id}
            style={styles.noteItem}
            onPress={() => handleSliderChange(note.timestamp)}
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
                onPress={addNote}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  videoContainer: {
    flexDirection: 'row',
  },
  videoWrapper: {
    flex: 1,
    backgroundColor: '#000',
  },
  video: {
    flex: 1,
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
});

export default Analysis; 