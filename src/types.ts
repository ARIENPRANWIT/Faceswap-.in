export interface FaceLandmarks {
  leftEye?: [number, number];
  rightEye?: [number, number];
  nose?: [number, number];
  mouth?: [number, number];
}

export interface DetectedFace {
  box_2d: [number, number, number, number]; // [ymin, xmin, ymax, xmax] 0-1000 or absolute
  confidence: number;
  description?: string;
  landmarks?: FaceLandmarks;
}

export type ScreenRatio = '9:16' | '16:9';

export interface FaceValidationResult {
  faceCount: number;
  isValidSingleFace: boolean;
  faces: DetectedFace[];
  message: string;
  selectedFaceIndex?: number;
  canSwap?: boolean;
}

export interface SampleImage {
  id: string;
  name: string;
  label: string;
  url: string;
  gender: string;
  mood: string;
  faceCount: number; // 1
}

export interface SampleVideo {
  id: string;
  name: string;
  label: string;
  url: string;
  durationStr: string;
  description: string;
  posterUrl: string;
  actorGender: string;
}

export interface SwapSettings {
  aspectRatio: ScreenRatio; // '9:16' | '16:9'
  featherRadius: number; // 10 to 60px
  toneMatching: boolean;
  blendOpacity: number; // 0.5 to 1.0
  faceScale: number; // 0.8 to 1.4
  verticalOffset: number; // -50 to 50
  horizontalOffset: number; // -50 to 50
  colorTransfer: boolean;
  expressionSync?: boolean; // transfers video facial expressions and mouth articulation
  expressionStrength?: number; // 0.0 to 1.0
  swapMode?: 'reface' | 'seamless'; // Reface / FaceApp inner-face injection
  preserveActorHairAndJaw?: boolean; // keeps actor's real hair, ears, chin, and jawline intact
  creativeFilter: 'natural' | 'cinematic' | 'vibrant' | 'monochrome' | 'cyber';
}
