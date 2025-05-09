import React, { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  PanResponder,
  GestureResponderEvent,
  PanResponderGestureState,
  Text,
} from 'react-native';
import Svg, { Line, Circle, Text as SvgText } from 'react-native-svg';

interface VideoAnnotation {
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
  annotations: VideoAnnotation[];
  onAddAnnotation: (annotation: VideoAnnotation) => void;
  onRemoveAnnotation: (annotationId: string) => void;
  isDrawingMode: boolean;
  isTextMode: boolean;
  isEraserMode: boolean;
  isZoomMode: boolean;
  scale: number;
  onScaleChange: (scale: number) => void;
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
  isZoomMode,
  scale,
  onScaleChange,
  onAddTextAnnotation,
}) => {
  const [currentDrawing, setCurrentDrawing] = useState<{
    type: 'line' | 'circle';
    points: { x: number; y: number }[];
  } | null>(null);
  const [draggedAnnotation, setDraggedAnnotation] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [zoomStart, setZoomStart] = useState<number | null>(null);

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: (event: GestureResponderEvent) => {
      if (isZoomMode) {
        setZoomStart(scale);
        return true;
      }
      
      if (isEraserMode || isTextMode || isDrawingMode) return true;

      // Check if we're starting to drag a text annotation
      const { locationX, locationY } = event.nativeEvent;
      const textAnnotation = annotations
        .filter(a => Math.abs(a.timestamp - currentTime) < 0.1 && a.type === 'text')
        .find(a => {
          const point = a.points[0];
          const distance = Math.sqrt(
            Math.pow(point.x - locationX, 2) + Math.pow(point.y - locationY, 2)
          );
          return distance < 30; // 30px hit area for text annotations
        });

      if (textAnnotation) {
        setDraggedAnnotation(textAnnotation.id);
        const point = textAnnotation.points[0];
        setDragOffset({
          x: locationX - point.x,
          y: locationY - point.y,
        });
        return true;
      }

      return false;
    },
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (event: GestureResponderEvent) => {
      const { locationX, locationY } = event.nativeEvent;

      if (isZoomMode) {
        return;
      }

      if (isDrawingMode) {
        setCurrentDrawing({
          type: 'line',
          points: [{ x: locationX, y: locationY }],
        });
      } else if (isTextMode) {
        onAddTextAnnotation({ x: locationX, y: locationY });
      } else if (isEraserMode) {
        // Find and remove the annotation that was clicked
        const clickedAnnotation = annotations.find(annotation => {
          if (annotation.type === 'text') {
            const [point] = annotation.points;
            const distance = Math.sqrt(
              Math.pow(point.x - locationX, 2) + Math.pow(point.y - locationY, 2)
            );
            return distance < 30;
          } else if (annotation.type === 'line') {
            return annotation.points.some(point => {
              const distance = Math.sqrt(
                Math.pow(point.x - locationX, 2) + Math.pow(point.y - locationY, 2)
              );
              return distance < 10;
            });
          } else if (annotation.type === 'circle') {
            const [center] = annotation.points;
            const distance = Math.sqrt(
              Math.pow(center.x - locationX, 2) + Math.pow(center.y - locationY, 2)
            );
            return distance < 10;
          }
          return false;
        });

        if (clickedAnnotation) {
          onRemoveAnnotation(clickedAnnotation.id);
        }
      }
    },
    onPanResponderMove: (event: GestureResponderEvent, gestureState: PanResponderGestureState) => {
      const { locationX, locationY } = event.nativeEvent;

      if (isZoomMode && zoomStart !== null) {
        const newScale = zoomStart * (1 + gestureState.dx / 200);
        const limitedScale = Math.min(Math.max(newScale, 0.5), 3);
        onScaleChange(limitedScale);
        return;
      }

      if (isDrawingMode && currentDrawing) {
        setCurrentDrawing({
          ...currentDrawing,
          points: [...currentDrawing.points, { x: locationX, y: locationY }],
        });
      } else if (draggedAnnotation) {
        // Update the position of the dragged text annotation
        const newAnnotations = annotations.map(annotation => {
          if (annotation.id === draggedAnnotation) {
            return {
              ...annotation,
              points: [{ 
                x: locationX - dragOffset.x,
                y: locationY - dragOffset.y
              }]
            };
          }
          return annotation;
        });
        // Update annotations through the parent
        onAddAnnotation({ ...newAnnotations.find(a => a.id === draggedAnnotation)! });
      }
    },
    onPanResponderRelease: () => {
      if (isZoomMode) {
        setZoomStart(null);
        return;
      }

      if (isDrawingMode && currentDrawing) {
        onAddAnnotation({
          id: Date.now().toString(),
          type: currentDrawing.type,
          points: currentDrawing.points,
          timestamp: currentTime,
        });
        setCurrentDrawing(null);
      }
      // Reset drag state
      setDraggedAnnotation(null);
      setDragOffset({ x: 0, y: 0 });
    },
  });

  const renderAnnotation = (annotation: VideoAnnotation) => {
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
      style={[
        styles.container,
        { width, height, transform: [{ scale: scale }] }
      ]}
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