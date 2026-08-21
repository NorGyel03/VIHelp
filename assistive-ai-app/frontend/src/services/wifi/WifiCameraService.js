const DEFAULT_URL =
  process.env.EXPO_PUBLIC_AI_SERVICE_URL || 'http://192.168.1.100:5000';

class WifiCameraService {
  constructor() {
    this.baseUrl = DEFAULT_URL;
  }

  setBaseUrl(url) {
    this.baseUrl = url.replace(/\/+$/, '');
  }

  getVideoFeedUrl() {
    return `${this.baseUrl}/video_feed`;
  }

  getFrameUrl() {
    return `${this.baseUrl}/api/frame?t=${Date.now()}`;
  }

  async getStatus() {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 5000);
    try {
      const res = await fetch(`${this.baseUrl}/api/status`, {
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`Status ${res.status}`);
      return await res.json();
    } catch (err) {
      console.log('[API] getStatus error:', err.message);
      throw err;
    } finally {
      clearTimeout(id);
    }
  }

  async getDetections() {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 5000);
    try {
      const res = await fetch(`${this.baseUrl}/api/detections`, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) throw new Error(`Status ${res.status}`);
      return await res.json();
    } catch (err) {
      console.log('[API] getDetections error:', err.message);
      throw err;
    } finally {
      clearTimeout(id);
    }
  }

  async updateEsp32Url(esp32Url) {
    const res = await fetch(`${this.baseUrl}/api/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ esp32_url: esp32Url }),
    });
    if (!res.ok) throw new Error(`Status ${res.status}`);
    return res.json();
  }
}

export default new WifiCameraService();
