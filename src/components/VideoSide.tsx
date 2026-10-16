import React, { useRef, useState, useEffect } from 'react';
import {
  Upload,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Camera,
  Sparkles,
  Film,
  Smartphone,
  Monitor
} from 'lucide-react';
import { SampleVideo, ScreenRatio } from '../types';
import { SAMPLE_VIDEOS } from '../data/samples';
import { createProceduralActorVideo } from '../services/videoFaceSwapper';

interface VideoSideProps {
  selectedVideoUrl: string | null;
  onVideoChange: (videoUrl: string | null, isCustom: boolean) => void;
  videoElementRef: React.RefObject<HTMLVideoElement | null>;
  currentTime: number;
  setCurrentTime: (time: number) => void;
  aspectRatio: ScreenRatio;
  onAspectRatioChange: (ratio: ScreenRatio) => void;
}

export const VideoSide: React.FC<VideoSideProps> = ({
  selectedVideoUrl,
  onVideoChange,
  videoElementRef,
  currentTime,
  setCurrentTime,
  aspectRatio,
  onAspectRatioChange
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isGeneratingDemo, setIsGeneratingDemo] = useState(false);

  useEffect(() => {
    if (!selectedVideoUrl && SAMPLE_VIDEOS.length > 0) {
      onVideoChange(SAMPLE_VIDEOS[0].url, false);
    }
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    onVideoChange(url, true);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('video/')) {
      const url = URL.createObjectURL(file);
      onVideoChange(url, true);
    }
  };

  const togglePlay = () => {
    const v = videoElementRef.current;
    if (!v) return;
    if (v.paused) {
      v.play().catch(() => {});
      setIsPlaying(true);
    } else {
      v.pause();
      setIsPlaying(false);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (videoElementRef.current) {
      videoElementRef.current.currentTime = time;
    }
  };

  const toggleMute = () => {
    if (videoElementRef.current) {
      videoElementRef.current.muted = !videoElementRef.current.muted;
      setIsMuted(videoElementRef.current.muted);
    }
  };

  const startRecordingSelfieVideo = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
        audio: true
      });

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      recordedChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        onVideoChange(url, true);
        stream.getTracks().forEach((t) => t.stop());
        setIsRecording(false);
      };

      recorder.start();
      setIsRecording(true);

      setTimeout(() => {
        if (recorder.state === 'recording') {
          recorder.stop();
        }
      }, 6000);
    } catch (err) {
      alert('Camera access needed to record video clip.');
    }
  };

  const handleGenerateProceduralDemo = async () => {
    setIsGeneratingDemo(true);
    try {
      const { url } = await createProceduralActorVideo();
      onVideoChange(url, true);
    } finally {
      setIsGeneratingDemo(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
      {/* Panel Header */}
      <div className="p-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60 flex-wrap gap-2">
        <div className="flex items-center space-x-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold text-xs shadow-sm">
            2
          </span>
          <div>
            <div className="flex items-center space-x-1.5">
              <h2 className="text-sm font-semibold text-slate-900">Target Video</h2>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 font-medium border border-indigo-200">
                Fit Whole Screen
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              Video Screen Size ({aspectRatio})
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Separate Option for Video Ratio (9:16 vs 16:9) */}
          <div className="flex items-center bg-slate-200/80 p-0.5 rounded-lg border border-slate-300 shadow-inner">
            <button
              id="video-ratio-9-16-btn"
              onClick={() => onAspectRatioChange('9:16')}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded text-xs font-bold transition-all ${
                aspectRatio === '9:16'
                  ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/60'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Set Video Screen to 9:16 (Vertical Phone)"
            >
              <Smartphone className="w-3 h-3" />
              <span>9:16</span>
            </button>
            <button
              id="video-ratio-16-9-btn"
              onClick={() => onAspectRatioChange('16:9')}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded text-xs font-bold transition-all ${
                aspectRatio === '16:9'
                  ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/60'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Set Video Screen to 16:9 (Landscape Phone)"
            >
              <Monitor className="w-3 h-3" />
              <span>16:9</span>
            </button>
          </div>

          <span className="text-[11px] text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60 hidden sm:inline">
            Clean View
          </span>
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

            {/* Inner Phone Screen with Video: FITS WHOLE SCREEN (NO GREEN OUTLINE) */}
            <div className="w-full h-full rounded-[24px] overflow-hidden bg-slate-900 relative flex items-center justify-center group">
              {selectedVideoUrl ? (
                <>
                  <video
                    ref={videoElementRef}
                    src={selectedVideoUrl}
                    crossOrigin="anonymous"
                    playsInline
                    loop
                    muted={isMuted}
                    onLoadedMetadata={(e) => {
                      setDuration(e.currentTarget.duration);
                    }}
                    onTimeUpdate={(e) => {
                      setCurrentTime(e.currentTarget.currentTime);
                    }}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    className="w-full h-full object-cover"
                  />

                  {/* Play / Pause Center Overlay Button */}
                  <button
                    id="floating-play-btn"
                    onClick={togglePlay}
                    className="absolute inset-0 m-auto w-12 h-12 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-sm text-white flex items-center justify-center shadow-lg transition-transform active:scale-95 group-hover:scale-105"
                  >
                    {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
                  </button>

                  {/* Mute toggle button */}
                  <div className="absolute top-2 right-2 flex items-center space-x-1 opacity-80 group-hover:opacity-100 transition-opacity">
                    <button
                      id="mute-video-btn"
                      onClick={toggleMute}
                      className="p-1.5 rounded-lg bg-black/60 text-white hover:bg-black/80 transition-colors shadow"
                      title={isMuted ? 'Unmute' : 'Mute'}
                    >
                      {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </>
              ) : (
                /* Empty Video Placeholder */
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
                    <Film className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-semibold text-white">Add Video</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-[180px]">
                    Upload any video to swap faces with
                  </p>
                </div>
              )}
            </div>

            {/* Phone Bottom Home Bar */}
            {aspectRatio === '9:16' && (
              <div className="absolute bottom-1 inset-x-0 mx-auto w-20 h-1 bg-slate-700 rounded-full pointer-events-none" />
            )}
          </div>

          {/* Quick upload & record action buttons */}
          <div className="flex items-center space-x-2 mt-3">
            <button
              id="upload-video-btn"
              onClick={() => fileInputRef.current?.click()}
              className="px-3.5 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 shadow-sm transition-all flex items-center space-x-1.5"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Video</span>
            </button>
            <button
              id="record-video-btn"
              onClick={startRecordingSelfieVideo}
              disabled={isRecording}
              className="px-3.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 shadow-sm transition-all flex items-center space-x-1.5"
            >
              <Camera className="w-3.5 h-3.5 text-indigo-600" />
              <span>{isRecording ? 'Recording (6s)...' : 'Record Video'}</span>
            </button>
          </div>

          {/* Scrubber & playback progress */}
          {selectedVideoUrl && (
            <div className="w-full max-w-[280px] mt-2.5 flex items-center space-x-2 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200">
              <button
                onClick={togglePlay}
                className="text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              </button>
              <input
                type="range"
                min="0"
                max={duration || 10}
                step="0.05"
                value={currentTime}
                onChange={handleSeek}
                className="w-full accent-indigo-600 cursor-pointer h-1 bg-slate-200 rounded"
              />
              <span className="text-[10px] font-mono text-slate-500 font-semibold shrink-0">
                {currentTime.toFixed(1)}s
              </span>
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={handleFileUpload}
        />

        {/* Quick Sample Videos & Procedural generator */}
        <div className="w-full pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-semibold text-slate-700">Quick Test Videos</span>
            <button
              id="gen-procedural-demo-btn"
              onClick={handleGenerateProceduralDemo}
              disabled={isGeneratingDemo}
              className="text-[10px] text-indigo-600 hover:text-indigo-800 font-semibold flex items-center space-x-1 transition-colors"
            >
              <Sparkles className="w-2.5 h-2.5" />
              <span>{isGeneratingDemo ? 'Generating...' : 'Live Actor'}</span>
            </button>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            {SAMPLE_VIDEOS.map((sample) => (
              <button
                key={sample.id}
                id={`sample-vid-btn-${sample.id}`}
                onClick={() => onVideoChange(sample.url, false)}
                className={`group relative rounded-lg overflow-hidden border p-0.5 text-left transition-all ${
                  selectedVideoUrl === sample.url
                    ? 'border-indigo-600 bg-indigo-50/30 ring-2 ring-indigo-500/20'
                    : 'border-slate-200 bg-white hover:border-indigo-300'
                }`}
              >
                <div className="aspect-video rounded overflow-hidden relative bg-slate-900">
                  <img
                    src={sample.posterUrl}
                    alt={sample.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform opacity-90"
                  />
                  <div className="absolute bottom-0.5 right-0.5 bg-black/70 text-white text-[8px] font-mono px-1 rounded">
                    {sample.durationStr}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
