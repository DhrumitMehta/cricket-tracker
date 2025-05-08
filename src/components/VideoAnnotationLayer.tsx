import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  PanResponder,
  GestureResponderEvent,
  PanResponderGestureState,
  Text,
} from 'react-native';
import Svg, { Line, Circle, Text as SvgText } from 'react-native-svg';

interface Annotation {
  id: string;
  type: 'line' | 'circle' | 'text';
  points: { x: number; y: number }[];
  text?: string;
  timestamp: number;
}

interface Props {
  width: number;
  height: number;
  currentTime: number;
  annotations: Annotation[];
  onAddAnnotation: (annotation: Annotation) => void;
  isDrawingMode: boolean;
}

const VideoAnnotationLayer: React.FC<Props> = ({
  width,
  height,
  currentTime,
  annotations,
  onAddAnnotation,
  isDrawingMode,
}) => {
  const [currentDrawing, setCurrentDrawing] = useState<{
    type: 'line' | 'circle';
    points: { x: number; y: number }[];
  } | null>(null);

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => isDrawingMode,
    onMoveShouldSetPanResponder: () => isDrawingMode,
    onPanResponderGrant: (event: GestureResponderEvent) => {
      if (!isDrawingMode) return;

      const { locationX, locationY } = event.nativeEvent;
      setCurrentDrawing({
        type: 'line',
        points: [{ x: locationX, y: locationY }],
      });
    },
    onPanResponderMove: (
      event: GestureResponderEvent,
      gestureState: PanResponderGestureState
    ) => {
      if (!isDrawingMode || !currentDrawing) return;

      const { locationX, locationY } = event.nativeEvent;
      setCurrentDrawing({
        ...currentDrawing,
        points: [...currentDrawing.points, { x: locationX, y: locationY }],
      });
    },
    onPanResponderRelease: () => {
      if (!isDrawingMode || !currentDrawing) return;

      const newAnnotation: Annotation = {
        id: Date.now().toString(),
        type: currentDrawing.type,
        points: currentDrawing.points,
        timestamp: currentTime,
      };
      onAddAnnotation(newAnnotation);
      setCurrentDrawing(null);
    },
  });

  const renderAnnotation = (annotation: Annotation) => {
    if (annotation.type === 'line') {
      return annotation.points.map((point, index) => {
        if (index === 0) return null;
        const prevPoint = annotation.points[index - 1];
        return (
          <Line
            key={`${annotation.id}-${index}`}
            x1={prevPoint.x}
            y1={prevPoint.y}
            x2={point.x}
            y2={point.y}
            stroke="red"
            strokeWidth="2"
          />
        );
      });
    }

    if (annotation.type === 'circle') {
      const [center] = annotation.points;
      return (
        <Circle
          cx={center.x}
          cy={center.y}
          r="5"
          fill="none"
          stroke="red"
          strokeWidth="2"
        />
      );
    }

    return null;
  };

  return (
    <View
      style={[styles.container, { width, height }]}
      {...panResponder.panHandlers}
    >
      <Svg width={width} height={height}>
        {annotations
          .filter((a) => Math.abs(a.timestamp - currentTime) < 0.1)
          .map(renderAnnotation)}
        {currentDrawing && renderAnnotation({ ...currentDrawing, id: 'current', timestamp: currentTime })}
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

export default VideoAnnotationLayer; 