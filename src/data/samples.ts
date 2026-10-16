import { SampleImage, SampleVideo } from '../types';

export const SAMPLE_IMAGES: SampleImage[] = [
  {
    id: 'sample-img-1',
    name: 'Elena Vance',
    label: 'Studio Editorial',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80',
    gender: 'Female',
    mood: 'Neutral / Confident',
    faceCount: 1
  },
  {
    id: 'sample-img-2',
    name: 'Marcus Cole',
    label: 'Corporate Portrait',
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80',
    gender: 'Male',
    mood: 'Warm / Smiling',
    faceCount: 1
  },
  {
    id: 'sample-img-3',
    name: 'Maya Lin',
    label: 'Cinematic Golden Hour',
    url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=600&q=80',
    gender: 'Female',
    mood: 'Expressive / Natural',
    faceCount: 1
  },
  {
    id: 'sample-img-4',
    name: 'David Silva',
    label: 'Bearded Dramatic',
    url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=600&q=80',
    gender: 'Male',
    mood: 'Intense / Direct',
    faceCount: 1
  },
  {
    id: 'sample-img-5',
    name: 'Chloe Monet',
    label: 'Creative Minimal',
    url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=600&q=80',
    gender: 'Female',
    mood: 'Vibrant / Radiant',
    faceCount: 1
  },
  {
    id: 'sample-img-multi',
    name: 'Group Friends (Multi-Face Test)',
    label: 'Multi-Face Rejection Test',
    url: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=600&q=80',
    gender: 'Group',
    mood: 'Social Group',
    faceCount: 4 // specifically to demonstrate single-face requirement rejection!
  }
];

export const SAMPLE_VIDEOS: SampleVideo[] = [
  {
    id: 'video-1',
    name: 'Cinematic Keynote Speaker',
    label: 'Speaking & Gestures',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    durationStr: '0:15',
    description: 'Dynamic front-facing presenter speaking with natural head turns and expressions.',
    posterUrl: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&w=600&q=80',
    actorGender: 'Male'
  },
  {
    id: 'video-2',
    name: 'Urban Creator Dialogue',
    label: 'Vlog Talking Head',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    durationStr: '0:15',
    description: 'Actor talking toward camera with lively facial expressions and head tilting.',
    posterUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=600&q=80',
    actorGender: 'Male'
  },
  {
    id: 'video-3',
    name: 'Studio Lifestyle Motion',
    label: 'Commercial Model',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4',
    durationStr: '0:15',
    description: 'Actor smiling and looking directly at camera with clear facial visibility.',
    posterUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=600&q=80',
    actorGender: 'Female'
  }
];
