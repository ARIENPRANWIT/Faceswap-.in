/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { Header } from './components/Header';
import { PictureSide } from './components/PictureSide';
import { VideoSide } from './components/VideoSide';
import { SwapStudioView } from './components/SwapStudioView';
import { GuideModal } from './components/GuideModal';
import { FaceValidationResult, ScreenRatio } from './types';
import { SAMPLE_IMAGES, SAMPLE_VIDEOS } from './data/samples';
import { convertUrlToBase64 } from './services/faceDetector';

export default function App() {
  const [faceAspectRatio, setFaceAspectRatio] = useState<ScreenRatio>('9:16');
  const [videoAspectRatio, setVideoAspectRatio] = useState<ScreenRatio>('16:9');
  const [outputAspectRatio, setOutputAspectRatio] = useState<ScreenRatio>('16:9');
  const [selectedFaceIndex, setSelectedFaceIndex] = useState<number>(0);

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<FaceValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState<boolean>(false);

  const [selectedVideoUrl, setSelectedVideoUrl] = useState<string | null>(null);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);

  const [isHelpOpen, setIsHelpOpen] = useState<boolean>(false);

  // Initialize with the first sample portrait and video
  useEffect(() => {
    const initDefaultSamples = async () => {
      const defaultImg = SAMPLE_IMAGES[0];
      const defaultVid = SAMPLE_VIDEOS[0];

      setSelectedVideoUrl(defaultVid.url);

      try {
        setIsValidating(true);
        const base64 = await convertUrlToBase64(defaultImg.url);
        setSelectedImage(base64);
        setValidationResult({
          faceCount: 1,
          isValidSingleFace: true,
          canSwap: true,
          selectedFaceIndex: 0,
          faces: [
            {
              box_2d: [160, 240, 780, 760],
              confidence: 0.98,
              description: 'Clear frontal studio portrait, face detected.',
              landmarks: {
                leftEye: [380, 390],
                rightEye: [380, 610],
                nose: [500, 500],
                mouth: [630, 500]
              }
            }
          ],
          message: 'Face ready for swap.'
        });
      } catch (e) {
        console.error('Failed to load initial sample:', e);
      } finally {
        setIsValidating(false);
      }
    };

    initDefaultSamples();
  }, []);

  const handleImageChange = (
    imageSrc: string | null,
    validation: FaceValidationResult | null
  ) => {
    setSelectedImage(imageSrc);
    setValidationResult(validation);
    setSelectedFaceIndex(0);
  };

  const handleVideoChange = (videoUrl: string | null) => {
    setSelectedVideoUrl(videoUrl);
    setCurrentTime(0);
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-sans antialiased selection:bg-indigo-500 selection:text-white">
      {/* Top Header */}
      <Header
        onOpenHelp={() => setIsHelpOpen(true)}
        faceAspectRatio={faceAspectRatio}
        videoAspectRatio={videoAspectRatio}
        hasImage={Boolean(selectedImage)}
      />

      {/* Main Studio Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-6">
        {/* Dual-Side Layout (Picture Side vs. Video Side with Independent 9:16 and 16:9) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          {/* Left: Source Picture with its own 9:16 vs 16:9 toggle */}
          <div className="h-full">
            <PictureSide
              selectedImage={selectedImage}
              onImageChange={handleImageChange}
              validationResult={validationResult}
              isValidating={isValidating}
              setIsValidating={setIsValidating}
              aspectRatio={faceAspectRatio}
              onAspectRatioChange={setFaceAspectRatio}
              selectedFaceIndex={selectedFaceIndex}
              onSelectFaceIndex={setSelectedFaceIndex}
            />
          </div>

          {/* Right: Target Video with its own 9:16 vs 16:9 toggle */}
          <div className="h-full">
            <VideoSide
              selectedVideoUrl={selectedVideoUrl}
              onVideoChange={handleVideoChange}
              videoElementRef={videoElementRef}
              currentTime={currentTime}
              setCurrentTime={setCurrentTime}
              aspectRatio={videoAspectRatio}
              onAspectRatioChange={(ratio) => {
                setVideoAspectRatio(ratio);
                setOutputAspectRatio(ratio);
              }}
            />
          </div>
        </div>

        {/* Action & Result Studio Section: Swap Face Button, Creative Tuner, Live Canvas, and Video Export in Phone Sizing */}
        <section className="pt-1">
          <SwapStudioView
            sourceImageSrc={selectedImage}
            validationResult={validationResult}
            videoElementRef={videoElementRef}
            currentTime={currentTime}
            aspectRatio={outputAspectRatio}
            onAspectRatioChange={setOutputAspectRatio}
            selectedFaceIndex={selectedFaceIndex}
            selectedVideoUrl={selectedVideoUrl}
          />
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 bg-white/70 py-5 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>
            AI Face Swap Studio &bull; Independent 9:16 &amp; 16:9 Screen Sizes for Face &amp; Video
          </p>
          <p className="text-slate-400">
            Unrestricted Creative Expression &bull; Swap Any Face Into Any Video
          </p>
        </div>
      </footer>

      {/* Guide Modal */}
      <GuideModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
    </div>
  );
}
