import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  PanResponder,
  GestureResponderEvent,
  PanResponderGestureState,
} from 'react-native';
import Svg, { Rect } from 'react-native-svg';

interface Props {
  width: number;
  height: number;
  onSelectArea: (area: { x: number; y: number; width: number; height: number }) => void;
  selectedArea: { x: number; y: number; width: number; height: number } | null;
  isSelectionMode: boolean;
}

const VideoWorkingArea: React.FC<Props> = ({
  width,
  height,
  onSelectArea,
  selectedArea,
  isSelectionMode,
}) => {
  const [selectionStart, setSelectionStart] = useState<{ x: number; y: number } | null>(null);
  const [currentSelection, setCurrentSelection] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => isSelectionMode,
    onMoveShouldSetPanResponder: () => isSelectionMode,
    onPanResponderGrant: (event: GestureResponderEvent) => {
      if (!isSelectionMode) return;

      const { locationX, locationY } = event.nativeEvent;
      setSelectionStart({ x: locationX, y: locationY });
      setCurrentSelection({
        x: locationX,
        y: locationY,
        width: 0,
        height: 0,
      });
    },
    onPanResponderMove: (
      event: GestureResponderEvent,
      gestureState: PanResponderGestureState
    ) => {
      if (!isSelectionMode || !selectionStart) return;

      const { locationX, locationY } = event.nativeEvent;
      
      const newSelection = {
        x: Math.min(selectionStart.x, locationX),
        y: Math.min(selectionStart.y, locationY),
        width: Math.abs(locationX - selectionStart.x),
        height: Math.abs(locationY - selectionStart.y),
      };

      setCurrentSelection(newSelection);
    },
    onPanResponderRelease: () => {
      if (!isSelectionMode || !currentSelection) return;

      onSelectArea(currentSelection);
      setSelectionStart(null);
      setCurrentSelection(null);
    },
  });

  const renderSelection = (selection: {
    x: number;
    y: number;
    width: number;
    height: number;
  }) => {
    return (
      <Rect
        x={selection.x}
        y={selection.y}
        width={selection.width}
        height={selection.height}
        stroke="yellow"
        strokeWidth="2"
        fill="rgba(255, 255, 0, 0.1)"
      />
    );
  };

  return (
    <View
      style={[styles.container, { width, height }]}
      {...panResponder.panHandlers}
    >
      <Svg width={width} height={height}>
        {selectedArea && renderSelection(selectedArea)}
        {currentSelection && renderSelection(currentSelection)}
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
});

export default VideoWorkingArea; 