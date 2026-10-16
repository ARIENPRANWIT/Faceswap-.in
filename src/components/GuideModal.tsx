import React from 'react';
import { X, CheckCircle2, Sparkles, Smartphone, ShieldCheck } from 'lucide-react';

interface GuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GuideModal: React.FC<GuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">AI Face Swap Studio Guide</h3>
            <p className="text-xs text-slate-500">Phone screen sizes (9:16 &amp; 16:9) &bull; Zero restrictions</p>
          </div>
        </div>

        <div className="space-y-4 text-xs text-slate-600 leading-relaxed">
          {/* Rule 1 */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start space-x-3">
            <Smartphone className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-slate-900">1. Separate 9:16 &amp; 16:9 Options for Face &amp; Video</h4>
              <p className="mt-0.5 text-slate-600">
                You have separate ratio controls on both panels. Switch the <span className="font-semibold text-slate-800">Face Target Picture</span> between 9:16 and 16:9, and independently switch the <span className="font-semibold text-slate-800">Target Video</span> between 9:16 and 16:9. The swapped video result can also be output in your chosen format.
              </p>
            </div>
          </div>

          {/* Rule 2 */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start space-x-3">
            <Sparkles className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-slate-900">2. Zero Restrictions in Uploading</h4>
              <p className="mt-0.5 text-slate-600">
                Upload any picture (selfies, single portraits, group photos, artistic illustrations) and any video. If multiple faces exist, the primary face is automatically selected, or click any face to swap it directly.
              </p>
            </div>
          </div>

          {/* Rule 3 */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start space-x-3">
            <CheckCircle2 className="w-5 h-5 text-violet-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-slate-900">3. Unrestricted Creative Expression</h4>
              <p className="mt-0.5 text-slate-600">
                You can swap any face into any video without restriction. Adjust face scale, vertical/horizontal alignment, edge feathering, and artistic filters (Natural, Cinematic 35mm, Vibrant, Monochrome, Cyber) to match your creative vision.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors shadow-sm"
          >
            Got it, let's create
          </button>
        </div>
      </div>
    </div>
  );
};
