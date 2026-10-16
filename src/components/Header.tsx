import React from 'react';
import { Sparkles, HelpCircle, Smartphone, Monitor } from 'lucide-react';
import { ScreenRatio } from '../types';

interface HeaderProps {
  onOpenHelp: () => void;
  faceAspectRatio: ScreenRatio;
  videoAspectRatio: ScreenRatio;
  hasImage: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenHelp,
  faceAspectRatio,
  videoAspectRatio,
  hasImage
}) => {
  return (
    <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-sm">
            <Sparkles className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">AI Face Swap Studio</h1>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                Independent Sizing
              </span>
            </div>
            <p className="text-xs text-slate-500 hidden sm:block">
              Swap any face into any video &bull; Separate 9:16 &amp; 16:9 for face target &amp; video
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* Dual Aspect Ratio Badges */}
          <div className="hidden sm:flex items-center space-x-2 text-xs font-semibold">
            <span className="px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200/70 text-indigo-700 flex items-center space-x-1">
              <span>Face:</span>
              <span className="font-mono">{faceAspectRatio}</span>
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-violet-50 border border-violet-200/70 text-violet-700 flex items-center space-x-1">
              <span>Video:</span>
              <span className="font-mono">{videoAspectRatio}</span>
            </span>
          </div>

          <button
            id="help-guide-btn"
            onClick={onOpenHelp}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            title="How it works & creative guidelines"
          >
            <HelpCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Guide</span>
          </button>
        </div>
      </div>
    </header>
  );
};
