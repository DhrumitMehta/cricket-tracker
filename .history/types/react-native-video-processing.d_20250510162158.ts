declare module 'react-native-video-processing' {
  export interface VideoProcessingOptions {
    source: string;
    outputPath: string;
    fps?: number;
    quality?: number;
  }

  export interface DrawAnnotationsOptions {
    image: string;
    annotations: any[];
    width: number;
    height: number;
  }

  export class VideoProcessingManager {
    static extractFrames(options: VideoProcessingOptions): Promise<void>;
    static combineFrames(options: VideoProcessingOptions): Promise<void>;
    static drawAnnotations(options: DrawAnnotationsOptions): Promise<string>;
  }
} 