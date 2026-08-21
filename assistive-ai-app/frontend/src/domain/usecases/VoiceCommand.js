import { analyzeImage } from '../../services/ai/AIService';
import { speak } from '../../services/audio/AudioManager';

export const handleVoiceCommand = async (text) => {
  text = text.toLowerCase();

  if (text.includes('describe')) {
    speak('Analyzing surroundings...');
    await analyzeImage();
  }

  if (text.includes('read')) {
    speak('Reading text...');
  }
};