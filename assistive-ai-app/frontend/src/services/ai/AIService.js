import api from '../../data/api/apiClient';
import { useStore } from '../../store/useStore';

export const analyzeImage = async (imageBase64) => {
  try {
    const res = await api.post('/analyze', {
      image: imageBase64,
    });

    useStore.getState().setAIResponse(res.data);

    return res.data;
  } catch (e) {
    console.log('AI Error', e);
  }
};