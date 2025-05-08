import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Dimensions,
} from 'react-native';
import Video from 'react-native-video';
import Slider from '@react-native-community/slider';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

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

  const primaryVideoRef = useRef<Video>(null);
  const secondaryVideoRef = useRef<Video>(null);

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

  const addNote = (text: string) => {
    const newNote: Note = {
      id: Date.now().toString(),
      timestamp: currentTime,
      text,
    };
    setNotes([...notes, newNote]);
  };

  const addAnnotation = (x: number, y: number, text: string) => {
    const newAnnotation: VideoAnnotation = {
      id: Date.now().toString(),
      timestamp: currentTime,
      position: { x, y },
      text,
    };
    setAnnotations([...annotations, newAnnotation]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.videoContainer}>
        <Video
          ref={primaryVideoRef}
          style={styles.video}
          resizeMode="contain"
          paused={!isPlaying}
          rate={playbackRate}
          onProgress={({ currentTime: time }) => setCurrentTime(time)}
          onLoad={({ duration: d }) => setDuration(d)}
        />
        {isSideBySide && (
          <Video
            ref={secondaryVideoRef}
            style={styles.video}
            resizeMode="contain"
            paused={!isPlaying}
            rate={playbackRate}
          />
        )}
      </View>

      <View style={styles.controls}>
        <TouchableOpacity onPress={() => handleFrameStep(false)}>
          <Icon name="skip-backward" size={24} />
        </TouchableOpacity>
        <TouchableOpacity onPress={handlePlayPause}>
          <Icon name={isPlaying ? "pause" : "play"} size={24} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleFrameStep(true)}>
          <Icon name="skip-forward" size={24} />
        </TouchableOpacity>
        <Slider
          style={styles.slider}
          value={currentTime}
          maximumValue={duration}
          minimumValue={0}
          onValueChange={handleSliderChange}
        />
        <TouchableOpacity onPress={() => setIsSideBySide(!isSideBySide)}>
          <Icon name="compare" size={24} />
        </TouchableOpacity>
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
          >
            <Text style={styles.speedButtonText}>{speed}x</Text>
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  videoContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  video: {
    flex: 1,
    backgroundColor: '#000',
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
});

export default Analysis; 