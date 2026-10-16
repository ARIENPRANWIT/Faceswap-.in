import React, { useRef, useState, useEffect } from 'react';
import {
  Sparkles,
  Download,
  Play,
  Pause,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Smartphone,
  Monitor,
  CheckCircle2,
  RefreshCw,
  Film,
  User,
  ShieldCheck,
  Eye,
  Smile
} from 'lucide-react';
import { SwapSettings, FaceValidationResult, ScreenRatio, DetectedFace } from '../types';
import {
  prepareSourceFaceBitmap,
  exportSwappedVideo,
  SwapEngineResult,
  PreparedFaceData
} from '../services/videoFaceSwapper';
import { detectFaceInVideo } from '../services/faceDetector';

interface SwapStudioViewProps {
  sourceImageSrc: string | null;
  validationResult: FaceValidationResult | null;
  videoElementRef: React.RefObject<HTMLVideoElement | null>;
  currentTime: number;
  aspectRatio: ScreenRatio;
  onAspectRatioChange: (ratio: ScreenRatio) => void;
  selectedFaceIndex: number;
  targetVideoFace?: DetectedFace | null;
  selectedVideoUrl?: string | null;
}

export const SwapStudioView: React.FC<SwapStudioViewProps> = ({
  sourceImageSrc,
  validationResult,
  videoElementRef,
  currentTime,
  aspectRatio,
  onAspectRatioChange,
  selectedFaceIndex,
  targetVideoFace: initialTargetVideoFace,
  selectedVideoUrl
}) => {
  // Source face prepared anatomical cutout state
  const preparedFaceRef = useRef<PreparedFaceData | null>(null);
  const faceAvgColorRef = useRef<{ r: number; g: number; b: number; lum: number }>({
    r: 180,
    g: 150,
    b: 140,
    lum: 160
  });

  // Target actor face state
  const [targetActorFace, setTargetActorFace] = useState<DetectedFace | null>(initialTargetVideoFace || null);
  const [isLocatingActorFace, setIsLocatingActorFace] = useState(false);

  // Export & Processing states
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [swappedResult, setSwappedResult] = useState<SwapEngineResult | null>(null);

  const [showCreativeSettings, setShowCreativeSettings] = useState(false);

  // Settings for precise face placement & expression sync
  const [settings, setSettings] = useState<SwapSettings>({
    aspectRatio: aspectRatio,
    featherRadius: 20,
    toneMatching: true,
    blendOpacity: 0.98,
    faceScale: 1.05,
    verticalOffset: 0,
    horizontalOffset: 0,
    colorTransfer: true,
    expressionSync: true,
    expressionStrength: 1.0,
    creativeFilter: 'natural'
  });

  // Sync settings.aspectRatio when prop changes
  useEffect(() => {
    setSettings((prev) => ({ ...prev, aspectRatio }));
  }, [aspectRatio]);

  // When video changes, detect the person's face in the video
  useEffect(() => {
    const locateFace = async () => {
      const video = videoElementRef.current;
      if (!video) return;

      setIsLocatingActorFace(true);
      try {
        const detected = await detectFaceInVideo(video, selectedVideoUrl);
        setTargetActorFace(detected);
      } catch (e) {
        console.error('Error locating actor face in video:', e);
      } finally {
        setIsLocatingActorFace(false);
      }
    };

    locateFace();
  }, [selectedVideoUrl, videoElementRef]);

  // Prepare source face anatomical cutout using the active selected face box
  useEffect(() => {
    if (!sourceImageSrc) {
      preparedFaceRef.current = null;
      return;
    }

    const faceBox = validationResult?.faces?.[selectedFaceIndex]?.box_2d || [150, 200, 750, 800];
    prepareSourceFaceBitmap(sourceImageSrc, faceBox, settings)
      .then((res) => {
        preparedFaceRef.current = res;
        faceAvgColorRef.current = res.avgColor;
      })
      .catch((err) => console.error('Error preparing face cutout:', err));
  }, [sourceImageSrc, validationResult, selectedFaceIndex, settings.featherRadius]);

  const canSwap = Boolean(sourceImageSrc && videoElementRef.current);

  // Execute full video swap and render downloadable file with chosen phone aspect ratio
  const handleSwapFaceClick = async () => {
    const video = videoElementRef.current;
    if (!canSwap || !video) return;

    setIsProcessing(true);
    setProgressPercent(0);
    setCurrentStep(1);
    setStatusMessage('1. Locating person\'s face in video frames...');

    try {
      // 1. Locate actor face if not already located
      let actorFace = targetActorFace;
      if (!actorFace) {
        actorFace = await detectFaceInVideo(video, selectedVideoUrl);
        setTargetActorFace(actorFace);
      }

      setCurrentStep(2);
      setStatusMessage('2. Cutting anatomical facial contour from source photo...');
      const faceBox = validationResult?.faces?.[selectedFaceIndex]?.box_2d || [150, 200, 750, 800];
      const prepared = await prepareSourceFaceBitmap(sourceImageSrc!, faceBox, settings);
      preparedFaceRef.current = prepared;

      setCurrentStep(3);
      setStatusMessage('3. Aligning eyes, nose, and mouth directly over the actor...');

      // 2. Export swapped video
      const result = await exportSwappedVideo(
        video,
        prepared,
        faceAvgColorRef.current,
        { ...settings, aspectRatio },
        actorFace,
        (progress, frame, total) => {
          setProgressPercent(progress);
          if (progress > 30 && progress < 70) {
            setCurrentStep(4);
            setStatusMessage(`4. Synchronizing expressions & mouth articulation (${frame}/${total} frames)...`);
          } else if (progress >= 70) {
            setCurrentStep(5);
            setStatusMessage(`5. Harmonizing skin tones & encoding video (${progress}%)...`);
          }
        },
        (msg) => setStatusMessage(msg)
      );

      setSwappedResult(result);
      setStatusMessage('Face swap complete with expression synchronization!');
    } catch (err: any) {
      console.error('Error exporting swapped video:', err);
      setStatusMessage('Export error: ' + (err.message || 'Unknown issue'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!swappedResult) return;
    const a = document.createElement('a');
    a.href = swappedResult.videoUrl;
    a.download = `face-swapped-${aspectRatio === '9:16' ? 'phone-vertical' : 'phone-wide'}-${Date.now()}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="flex flex-col space-y-6">
      {/* Primary Swap Action Card */}
      <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-950 rounded-2xl p-5 sm:p-7 text-white shadow-xl border border-indigo-500/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col space-y-6">
          {/* Header Row */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="space-y-1.5 text-center md:text-left">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold border border-emerald-500/30">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Reface Precision &bull; Output Phone Size ({aspectRatio})</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                Face Swap &amp; Expression Transfer
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
                Cuts out the face cleanly along its anatomical contour and pastes it directly over the person in the video. The actor's speech, mouth articulation, and facial expressions are synchronized seamlessly.
              </p>
            </div>

            {/* Output Aspect Ratio Selector (9:16 vs 16:9) */}
            <div className="flex items-center space-x-2 shrink-0">
              <span className="text-xs text-slate-400 font-medium">Output:</span>
              <div className="flex items-center bg-slate-800/90 p-1 rounded-xl border border-slate-700/80 shadow-inner">
                <button
                  id="toggle-output-9-16"
                  onClick={() => onAspectRatioChange('9:16')}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    aspectRatio === '9:16'
                      ? 'bg-indigo-600 text-white shadow'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>9:16</span>
                </button>

                <button
                  id="toggle-output-16-9"
                  onClick={() => onAspectRatioChange('16:9')}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    aspectRatio === '16:9'
                      ? 'bg-indigo-600 text-white shadow'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <Monitor className="w-3.5 h-3.5" />
                  <span>16:9</span>
                </button>
              </div>
            </div>
          </div>

          {/* Alignment & Status Overview Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-800/50 border border-slate-700/50">
            {/* Step 1: Source Face */}
            <div className="flex items-center space-x-3 p-2.5 rounded-lg bg-slate-900/60 border border-slate-700/40">
              <div className="w-9 h-9 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                <User className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  1. Source Face
                </span>
                <span className="text-xs font-bold text-white truncate block">
                  {sourceImageSrc ? 'Clean Cutout Ready' : 'Select a Photo'}
                </span>
              </div>
            </div>

            {/* Step 2: Target Actor Position */}
            <div className="flex items-center space-x-3 p-2.5 rounded-lg bg-slate-900/60 border border-slate-700/40">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <Film className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  2. Person in Video
                </span>
                <span className="text-xs font-bold text-white truncate block">
                  {isLocatingActorFace
                    ? 'Locating Face...'
                    : targetActorFace
                    ? 'Actor Face Located'
                    : 'Video Ready'}
                </span>
              </div>
            </div>

            {/* Step 3: Expression Transfer */}
            <div className="flex items-center space-x-3 p-2.5 rounded-lg bg-slate-900/60 border border-slate-700/40">
              <div className="w-9 h-9 rounded-lg bg-violet-500/20 text-violet-400 flex items-center justify-center shrink-0">
                <Smile className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  3. Expression Sync
                </span>
                <span className="text-xs font-bold text-white truncate block">
                  Speech &amp; Smiles Active
                </span>
              </div>
            </div>
          </div>

          {/* Action Button & Toggle Settings */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-1">
            <button
              onClick={() => setShowCreativeSettings(!showCreativeSettings)}
              className="text-xs text-indigo-300 hover:text-white font-medium flex items-center space-x-1.5 transition-colors self-start sm:self-center"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>{showCreativeSettings ? 'Hide Settings' : 'Fine-Tune Fit & Expressions'}</span>
              {showCreativeSettings ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            <button
              id="execute-swap-face-btn"
              onClick={handleSwapFaceClick}
              disabled={!canSwap || isProcessing}
              className={`w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold text-sm shadow-xl transition-all duration-200 flex items-center justify-center space-x-2.5 ${
                !canSwap
                  ? 'bg-slate-700 text-slate-400 cursor-not-allowed opacity-60'
                  : isProcessing
                  ? 'bg-indigo-700 text-white cursor-wait animate-pulse'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 hover:shadow-emerald-500/25 active:scale-95'
              }`}
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  <span>Generating Swapped Video ({progressPercent}%)...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-slate-950" />
                  <span>Swap Face &amp; Generate Video</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Processing Progress Bar with Live Milestone Steps */}
        {isProcessing && (
          <div className="mt-6 pt-5 border-t border-slate-700/60 space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-emerald-400 flex items-center space-x-1.5">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>{statusMessage}</span>
              </span>
              <span className="font-mono text-white text-sm">{progressPercent}%</span>
            </div>

            <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden p-0.5 border border-slate-700">
              <div
                className="bg-gradient-to-r from-indigo-500 via-violet-500 to-emerald-400 h-full rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Step Indicators */}
            <div className="grid grid-cols-5 gap-1.5 pt-1 text-[10px] text-center text-slate-400 font-medium">
              <span className={currentStep >= 1 ? 'text-emerald-400 font-bold' : ''}>1. Locate Face</span>
              <span className={currentStep >= 2 ? 'text-emerald-400 font-bold' : ''}>2. Clean Cutout</span>
              <span className={currentStep >= 3 ? 'text-emerald-400 font-bold' : ''}>3. Align on Actor</span>
              <span className={currentStep >= 4 ? 'text-emerald-400 font-bold' : ''}>4. Sync Expression</span>
              <span className={currentStep >= 5 ? 'text-emerald-400 font-bold' : ''}>5. Color Harmonize</span>
            </div>
          </div>
        )}

        {/* Fine-Tuning Drawer */}
        {showCreativeSettings && (
          <div className="mt-6 pt-5 border-t border-slate-700/80 grid grid-cols-1 md:grid-cols-3 gap-5 animate-in fade-in duration-200">
            {/* Column 1: Scale & Alignment */}
            <div className="space-y-3">
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300 font-medium">Face Scale</span>
                  <span className="font-mono text-indigo-300">{settings.faceScale}x</span>
                </div>
                <input
                  type="range"
                  min="0.85"
                  max="1.30"
                  step="0.01"
                  value={settings.faceScale}
                  onChange={(e) => setSettings({ ...settings, faceScale: parseFloat(e.target.value) })}
                  className="w-full accent-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300 font-medium">Edge Softness (Feather)</span>
                  <span className="font-mono text-indigo-300">{settings.featherRadius}px</span>
                </div>
                <input
                  type="range"
                  min="8"
                  max="35"
                  step="1"
                  value={settings.featherRadius}
                  onChange={(e) => setSettings({ ...settings, featherRadius: parseInt(e.target.value) })}
                  className="w-full accent-indigo-500"
                />
              </div>
            </div>

            {/* Column 2: Expression & Tone Controls */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-white block">Expression &amp; Speech Sync</span>
                  <span className="text-[11px] text-slate-400">Syncs mouth, teeth, and smile folds</span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.expressionSync !== false}
                  onChange={(e) => setSettings({ ...settings, expressionSync: e.target.checked })}
                  className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <div>
                  <span className="text-xs font-semibold text-white block">Skin Tone Harmonization</span>
                  <span className="text-[11px] text-slate-400">Matches actor's lighting in video</span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.colorTransfer !== false}
                  onChange={(e) => setSettings({ ...settings, colorTransfer: e.target.checked })}
                  className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                />
              </div>
            </div>

            {/* Column 3: Artistic Filter */}
            <div className="space-y-2">
              <span className="text-xs font-medium text-slate-300 block">Artistic Filter</span>
              <div className="grid grid-cols-2 gap-2">
                {(['natural', 'cinematic', 'vibrant', 'monochrome', 'cyber'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setSettings({ ...settings, creativeFilter: filter })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize border transition-all ${
                      settings.creativeFilter === filter
                        ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                        : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Completed Swapped Video Result Section */}
      {swappedResult ? (
        <div className="bg-white rounded-2xl border-2 border-emerald-500/30 p-6 shadow-xl space-y-5 flex flex-col items-center animate-in fade-in duration-300">
          <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Swapped Video Ready!
                </h3>
                <p className="text-xs text-slate-500">
                  Cutout placed directly over the person in the video with full expression transfer ({swappedResult.width}×{swappedResult.height} &bull; {aspectRatio}).
                </p>
              </div>
            </div>

            <button
              id="download-swapped-video-btn"
              onClick={handleDownload}
              className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center space-x-2 active:scale-95 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Download Video (.webm)</span>
            </button>
          </div>

          {/* Swapped Video Player inside Phone Mockup */}
          <div
            className={`transition-all duration-300 relative rounded-[32px] p-2 bg-slate-950 shadow-2xl border-2 border-slate-800 ${
              aspectRatio === '9:16'
                ? 'w-[290px] sm:w-[330px] aspect-[9/16]'
                : 'w-full max-w-[520px] aspect-[16/9]'
            }`}
          >
            {/* Phone Top Dynamic Island */}
            {aspectRatio === '9:16' ? (
              <div className="absolute top-3 inset-x-0 mx-auto w-16 h-3.5 bg-slate-900 rounded-full z-20 flex items-center justify-center space-x-1 pointer-events-none">
                <div className="w-1.5 h-1.5 rounded-full bg-slate-800" />
                <div className="w-1 h-1 rounded-full bg-emerald-500/80" />
              </div>
            ) : (
              <div className="absolute left-3 inset-y-0 my-auto h-16 w-3.5 bg-slate-900 rounded-full z-20 flex flex-col items-center justify-center space-y-1 pointer-events-none">
                <div className="w-1.5 h-1.5 rounded-full bg-slate-800" />
                <div className="w-1 h-1 rounded-full bg-emerald-500/80" />
              </div>
            )}

            <div className="w-full h-full rounded-[24px] overflow-hidden bg-black relative flex items-center justify-center">
              <video
                src={swappedResult.videoUrl}
                controls
                playsInline
                autoPlay
                loop
                className="w-full h-full object-cover"
              />
            </div>

            {aspectRatio === '9:16' && (
              <div className="absolute bottom-1 inset-x-0 mx-auto w-20 h-1 bg-slate-700 rounded-full pointer-events-none" />
            )}
          </div>
        </div>
      ) : (
        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-6 text-center text-slate-500 text-xs">
          <p className="font-semibold text-slate-700">Ready to Swap</p>
          <p className="mt-1 max-w-md mx-auto text-slate-500">
            Click <strong>"Swap Face &amp; Generate Video"</strong> above to extract the face, paste it directly over the person in the video, and transfer their expressions.
          </p>
        </div>
      )}
    </div>
  );
};
