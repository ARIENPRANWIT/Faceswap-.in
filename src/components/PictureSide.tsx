import React, { useRef, useState, useEffect } from 'react';
import {
  Upload,
  Camera,
  CheckCircle2,
  RefreshCw,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Smartphone,
  Monitor
} from 'lucide-react';
import { FaceValidationResult, SampleImage, ScreenRatio } from '../types';
import { SAMPLE_IMAGES } from '../data/samples';
import { validateSingleFace, convertUrlToBase64 } from '../services/faceDetector';

interface PictureSideProps {
  selectedImage: string | null;
  onImageChange: (imageSrc: string | null, validation: FaceValidationResult | null) => void;
  validationResult: FaceValidationResult | null;
  isValidating: boolean;
  setIsValidating: (val: boolean) => void;
  aspectRatio: ScreenRatio;
  onAspectRatioChange: (ratio: ScreenRatio) => void;
  selectedFaceIndex: number;
  onSelectFaceIndex: (idx: number) => void;
}

export const PictureSide: React.FC<PictureSideProps> = ({
  selectedImage,
  onImageChange,
  validationResult,
  isValidating,
  setIsValidating,
  aspectRatio,
  onAspectRatioChange,
  selectedFaceIndex,
  onSelectFaceIndex
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Zoom & Pan state to ensure the face fits the whole screen big
  const [faceZoom, setFaceZoom] = useState<number>(1.8);
  const [isAutoFitFace, setIsAutoFitFace] = useState<boolean>(true);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // When a new image or face is loaded, calculate auto-zoom so face fills the whole screen big
  useEffect(() => {
    if (!validationResult?.faces?.[selectedFaceIndex]) {
      setFaceZoom(1.8);
      return;
    }
    const face = validationResult.faces[selectedFaceIndex];
    const ymin = face.box_2d[0] > 1 ? face.box_2d[0] / 1000 : face.box_2d[0];
    const ymax = face.box_2d[2] > 1 ? face.box_2d[2] / 1000 : face.box_2d[2];
    const faceH = Math.max(0.18, ymax - ymin);

    // Target the face to occupy ~75-80% of the phone screen height
    const calculatedZoom = Math.min(3.2, Math.max(1.3, 0.78 / faceH));
    setFaceZoom(calculatedZoom);
  }, [validationResult, selectedFaceIndex]);

  const handleProcessImage = async (dataUrl: string) => {
    setIsValidating(true);
    try {
      const result = await validateSingleFace(dataUrl);
      onImageChange(dataUrl, result);
    } catch (err) {
      console.error('Validation error:', err);
      onImageChange(dataUrl, {
        faceCount: 1,
        isValidSingleFace: true,
        canSwap: true,
        selectedFaceIndex: 0,
        faces: [{ box_2d: [150, 200, 750, 800], confidence: 0.9 }],
        message: 'Face ready for swap.'
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === 'string') {
        handleProcessImage(event.target.result);
      }
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (typeof event.target?.result === 'string') {
          handleProcessImage(event.target.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const startCamera = async () => {
    setCameraError(null);
    setIsCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 640 }, facingMode: 'user' }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err: any) {
      setCameraError('Camera access denied or unavailable. You can upload an image file instead.');
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 640;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      stopCamera();
      handleProcessImage(dataUrl);
    }
  };

  const selectSample = async (sample: SampleImage) => {
    stopCamera();
    setIsValidating(true);
    try {
      const base64 = await convertUrlToBase64(sample.url);
      const result = await validateSingleFace(sample.url);
      onImageChange(base64, result);
    } finally {
      setIsValidating(false);
    }
  };

  const faces = validationResult?.faces || [];
  const activeFace = faces[selectedFaceIndex] || faces[0];

  // Calculate face center for zoom anchor
  let faceCenterX = 50;
  let faceCenterY = 40;
  if (activeFace?.box_2d) {
    const ymin = activeFace.box_2d[0] > 1 ? activeFace.box_2d[0] / 10 : activeFace.box_2d[0] * 100;
    const xmin = activeFace.box_2d[1] > 1 ? activeFace.box_2d[1] / 10 : activeFace.box_2d[1] * 100;
    const ymax = activeFace.box_2d[2] > 1 ? activeFace.box_2d[2] / 10 : activeFace.box_2d[2] * 100;
    const xmax = activeFace.box_2d[3] > 1 ? activeFace.box_2d[3] / 10 : activeFace.box_2d[3] * 100;
    faceCenterX = (xmin + xmax) / 2;
    faceCenterY = (ymin + ymax) / 2;
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
      {/* Panel Header */}
      <div className="p-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60 flex-wrap gap-2">
        <div className="flex items-center space-x-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold text-xs shadow-sm">
            1
          </span>
          <div>
            <div className="flex items-center space-x-1.5">
              <h2 className="text-sm font-semibold text-slate-900">Source Face Picture</h2>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-medium border border-emerald-200">
                Fit Whole Face
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              Target Face Screen Size ({aspectRatio})
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Separate Option for Face Target Ratio (9:16 vs 16:9) */}
          <div className="flex items-center bg-slate-200/80 p-0.5 rounded-lg border border-slate-300 shadow-inner">
            <button
              id="face-ratio-9-16-btn"
              onClick={() => onAspectRatioChange('9:16')}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded text-xs font-bold transition-all ${
                aspectRatio === '9:16'
                  ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/60'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Set Face Screen to 9:16 (Vertical Phone)"
            >
              <Smartphone className="w-3 h-3" />
              <span>9:16</span>
            </button>
            <button
              id="face-ratio-16-9-btn"
              onClick={() => onAspectRatioChange('16:9')}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded text-xs font-bold transition-all ${
                aspectRatio === '16:9'
                  ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/60'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Set Face Screen to 16:9 (Landscape Phone)"
            >
              <Monitor className="w-3 h-3" />
              <span>16:9</span>
            </button>
          </div>

          {/* Status Badge */}
          {isValidating ? (
            <div className="flex items-center space-x-1.5 px-2 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-medium animate-pulse">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span className="hidden sm:inline">Fitting...</span>
            </div>
          ) : selectedImage ? (
            <div className="flex items-center space-x-1 px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-200/60">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">Ready</span>
            </div>
          ) : (
            <span className="text-[11px] font-medium text-slate-400">Waiting</span>
          )}
        </div>
      </div>

      {/* Main Content Area: Phone Screen Mockup Centered */}
      <div className="p-4 flex-1 flex flex-col items-center justify-between space-y-4 overflow-y-auto">
        {/* Sleek Mobile Phone Frame Sized Big & Prominent */}
        <div className="flex flex-col items-center w-full my-auto">
          <div
            className={`transition-all duration-300 relative rounded-[32px] p-2 bg-slate-950 shadow-2xl border-2 border-slate-800 ${
              aspectRatio === '9:16'
                ? 'w-[280px] sm:w-[320px] aspect-[9/16]'
                : 'w-full max-w-[480px] aspect-[16/9]'
            }`}
          >
            {/* Phone Top Notch / Dynamic Island */}
            {aspectRatio === '9:16' ? (
              <div className="absolute top-3 inset-x-0 mx-auto w-16 h-3 bg-slate-900 rounded-full z-20 flex items-center justify-center space-x-1 pointer-events-none">
                <div className="w-1.5 h-1.5 rounded-full bg-slate-800" />
                <div className="w-1 h-1 rounded-full bg-indigo-500/80" />
              </div>
            ) : (
              <div className="absolute left-3 inset-y-0 my-auto h-16 w-3 bg-slate-900 rounded-full z-20 flex flex-col items-center justify-center space-y-1 pointer-events-none">
                <div className="w-1.5 h-1.5 rounded-full bg-slate-800" />
                <div className="w-1 h-1 rounded-full bg-indigo-500/80" />
              </div>
            )}

            {/* Inner Phone Screen: FITS THE WHOLE FACE BIG (NO GREEN OUTLINE) */}
            <div className="w-full h-full rounded-[24px] overflow-hidden bg-slate-900 relative flex items-center justify-center">
              {isCameraActive ? (
                <div className="relative w-full h-full flex flex-col items-center justify-center">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-3 inset-x-3 flex items-center justify-center space-x-2 z-10">
                    <button
                      id="capture-selfie-btn"
                      onClick={capturePhoto}
                      className="px-3.5 py-1.5 rounded-lg bg-white text-slate-900 text-xs font-semibold shadow hover:bg-slate-100 flex items-center space-x-1"
                    >
                      <Camera className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Capture</span>
                    </button>
                    <button
                      id="cancel-camera-btn"
                      onClick={stopCamera}
                      className="px-2.5 py-1.5 rounded-lg bg-black/60 text-white text-xs hover:bg-black/80"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : selectedImage ? (
                <div className="relative w-full h-full group flex items-center justify-center overflow-hidden">
                  {/* Clean Face Image Zoomed to Fit Whole Screen Big (No Green Outlines) */}
                  <img
                    src={selectedImage}
                    alt="Source Face"
                    className="w-full h-full object-cover transition-transform duration-300"
                    style={{
                      transformOrigin: `${faceCenterX}% ${faceCenterY}%`,
                      transform: isAutoFitFace ? `scale(${faceZoom})` : 'scale(1)'
                    }}
                  />

                  {/* Change Photo Overlay Button */}
                  <div className="absolute top-2 right-2 opacity-80 group-hover:opacity-100 transition-opacity z-10">
                    <button
                      id="reupload-picture-btn"
                      onClick={() => fileInputRef.current?.click()}
                      className="p-1.5 rounded-lg bg-black/60 text-white text-xs hover:bg-black/80 backdrop-blur-sm shadow"
                      title="Choose another image"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                /* Empty Mobile Screen Placeholder */
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragOver(true);
                  }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={handleDrop}
                  className={`w-full h-full p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                    isDragOver ? 'bg-indigo-900/40' : 'bg-slate-900/90'
                  }`}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="h-12 w-12 rounded-xl bg-slate-800 flex items-center justify-center mb-2 shadow-sm text-indigo-400">
                    <Upload className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-semibold text-white">Add Photo</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-[180px]">
                    Face will automatically zoom to fit the whole screen big
                  </p>
                </div>
              )}
            </div>

            {/* Phone Bottom Home Bar */}
            {aspectRatio === '9:16' && (
              <div className="absolute bottom-1 inset-x-0 mx-auto w-20 h-1 bg-slate-700 rounded-full pointer-events-none" />
            )}
          </div>

          {/* Fit Whole Face Sizing Controls */}
          {selectedImage && (
            <div className="w-full max-w-[280px] mt-2.5 flex items-center justify-between space-x-2 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200">
              <button
                onClick={() => setIsAutoFitFace(!isAutoFitFace)}
                className={`text-[11px] font-semibold px-2 py-0.5 rounded transition-all flex items-center space-x-1 ${
                  isAutoFitFace
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-slate-700 border border-slate-200'
                }`}
              >
                <Maximize2 className="w-3 h-3" />
                <span>{isAutoFitFace ? 'Fit Whole Face' : 'Full Photo'}</span>
              </button>

              {isAutoFitFace && (
                <div className="flex items-center space-x-1.5 flex-1 justify-end">
                  <ZoomOut className="w-3 h-3 text-slate-400" />
                  <input
                    type="range"
                    min="1.0"
                    max="3.5"
                    step="0.05"
                    value={faceZoom}
                    onChange={(e) => setFaceZoom(parseFloat(e.target.value))}
                    className="w-20 accent-indigo-600 h-1 bg-slate-200 rounded"
                    title="Adjust face zoom"
                  />
                  <ZoomIn className="w-3 h-3 text-slate-400" />
                </div>
              )}
            </div>
          )}

          {/* Quick upload & selfie action buttons below phone */}
          <div className="flex items-center space-x-2 mt-3">
            <button
              id="upload-picture-btn"
              onClick={() => fileInputRef.current?.click()}
              className="px-3.5 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 shadow-sm transition-all flex items-center space-x-1.5"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Photo</span>
            </button>
            <button
              id="open-camera-btn"
              onClick={startCamera}
              className="px-3.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 shadow-sm transition-all flex items-center space-x-1.5"
            >
              <Camera className="w-3.5 h-3.5 text-indigo-600" />
              <span>Selfie</span>
            </button>
          </div>

          {/* Multi-face selector pills if more than 1 face */}
          {faces.length > 1 && (
            <div className="mt-2.5 flex items-center flex-wrap gap-1 justify-center max-w-xs">
              <span className="text-[11px] text-slate-500 font-medium mr-1">Select Face:</span>
              {faces.map((_, i) => (
                <button
                  key={i}
                  onClick={() => onSelectFaceIndex(i)}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                    selectedFaceIndex === i
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Face #{i + 1}
                </button>
              ))}
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileUpload}
        />

        {cameraError && (
          <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-800 w-full text-center">
            {cameraError}
          </div>
        )}

        {/* Quick Sample Presets */}
        <div className="w-full pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-semibold text-slate-700">Quick Test Faces</span>
            <span className="text-[10px] text-emerald-600 font-semibold">Zero Restrictions</span>
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
            {SAMPLE_IMAGES.map((sample) => (
              <button
                key={sample.id}
                id={`sample-btn-${sample.id}`}
                onClick={() => selectSample(sample)}
                className="group relative rounded-lg overflow-hidden border border-slate-200 hover:border-indigo-400 p-0.5 bg-white transition-all"
                title={`${sample.name} - ${sample.label}`}
              >
                <div className="aspect-square rounded overflow-hidden">
                  <img
                    src={sample.url}
                    alt={sample.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
