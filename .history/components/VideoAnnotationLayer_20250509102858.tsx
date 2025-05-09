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
  timestamp: number;
  text?: string;
}

interface Props {
  width: number;
  height: number;
  currentTime: number;
  annotations: Annotation[];
  onAddAnnotation: (annotation: Annotation) => void;
  onRemoveAnnotation: (annotationId: string) => void;
  isDrawingMode: boolean;
  isTextMode: boolean;
  isEraserMode: boolean;
  onAddTextAnnotation: (position: { x: number; y: number }) => void;
}

const VideoAnnotationLayer: React.FC<Props> = ({
  width,
  height,
  currentTime,
  annotations,
  onAddAnnotation,
  onRemoveAnnotation,
  isDrawingMode,
  isTextMode,
  isEraserMode,
  onAddTextAnnotation,
}) => {
  const [currentDrawing, setCurrentDrawing] = useState<{
    type: 'line' | 'circle';
    points: { x: number; y: number }[];
  } | null>(null);

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => isDrawingMode || isTextMode || isEraserMode,
    onMoveShouldSetPanResponder: () => isDrawingMode || isEraserMode,
    onPanResponderGrant: (event: GestureResponderEvent) => {
      if (!isDrawingMode && !isTextMode && !isEraserMode) return;

      const { locationX, locationY } = event.nativeEvent;
      
      if (isTextMode) {
        onAddTextAnnotation({ x: locationX, y: locationY });
        return;
      }

      if (isEraserMode) {
        // Find and remove the annotation that was clicked
        const clickedAnnotation = annotations.find(annotation => {
          if (annotation.type === 'text') {
            const [point] = annotation.points;
            // For text, we need to check a larger area since text is rendered from the baseline
            const distance = Math.sqrt(
              Math.pow(point.x - locationX, 2) + Math.pow((point.y - 20) - locationY, 2)
            );
            return distance < 30; // Increased radius for text to make it easier to select
          } else if (annotation.type === 'line') {
            // Check if click is near any point in the line
            return annotation.points.some(point => {
              const distance = Math.sqrt(
                Math.pow(point.x - locationX, 2) + Math.pow(point.y - locationY, 2)
              );
              return distance < 10; // 10 pixel radius for lines
            });
          } else if (annotation.type === 'circle') {
            const [center] = annotation.points;
            const distance = Math.sqrt(
              Math.pow(center.x - locationX, 2) + Math.pow(center.y - locationY, 2)
            );
            return distance < 10; // 10 pixel radius for circles
          }
          return false;
        });

        if (clickedAnnotation) {
          onRemoveAnnotation(clickedAnnotation.id);
        }
        return;
      }

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

    if (annotation.type === 'text' && annotation.text) {
      const [position] = annotation.points;
      return (
        <SvgText
          key={annotation.id}
          x={position.x}
          y={position.y}
          fill="red"
          fontSize="20"
          fontWeight="bold"
          stroke="black"
          strokeWidth="0.5"
        >
          {annotation.text}
        </SvgText>
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