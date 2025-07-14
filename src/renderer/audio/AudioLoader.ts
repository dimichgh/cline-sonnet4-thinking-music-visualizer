import { AudioFile } from '@shared/types';

export class AudioLoader {
  async loadFromFile(audioFile: AudioFile, audioContext: AudioContext): Promise<AudioBuffer> {
    try {
      // Use the actual audio file data
      const audioBuffer = await audioContext.decodeAudioData(audioFile.data.slice(0));
      return audioBuffer;
    } catch (error) {
      console.warn('Failed to decode audio file, using test tone:', error);
      
      // Fallback: create a simple tone as a placeholder
      const sampleRate = audioContext.sampleRate;
      const duration = 5; // 5 seconds
      const length = sampleRate * duration;
      
      const buffer = audioContext.createBuffer(2, length, sampleRate);
      
      // Generate a simple tone for testing
      for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        for (let i = 0; i < length; i++) {
          channelData[i] = Math.sin(2 * Math.PI * 440 * i / sampleRate) * 0.1;
        }
      }
      
      return buffer;
    }
  }
}
