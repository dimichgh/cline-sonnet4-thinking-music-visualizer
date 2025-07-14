import { AudioEngineConfig, BeatDetectionResult, SpectralFeatures } from '@shared/types';

export class BeatDetector {
  private config: AudioEngineConfig;
  private lastBeatTime: number = 0;
  private energyHistory: number[] = [];

  constructor(config: AudioEngineConfig) {
    this.config = config;
  }

  detectBeat(frequencyData: Float32Array, timeDomainData: Float32Array, spectralFeatures: SpectralFeatures): BeatDetectionResult {
    // Simple beat detection based on energy
    const currentTime = performance.now();
    const energy = this.calculateEnergy(timeDomainData);
    
    // Store energy history
    this.energyHistory.push(energy);
    if (this.energyHistory.length > 43) { // ~1 second at 43fps
      this.energyHistory.shift();
    }

    // Calculate average energy
    const avgEnergy = this.energyHistory.reduce((sum, e) => sum + e, 0) / this.energyHistory.length;
    
    // Beat detection: current energy is significantly higher than average
    const threshold = avgEnergy * (1 + this.config.beatDetectionSensitivity);
    const isBeat = energy > threshold && (currentTime - this.lastBeatTime) > 200; // Min 200ms between beats
    
    if (isBeat) {
      this.lastBeatTime = currentTime;
    }

    // Simple tempo estimation (placeholder)
    const tempo = 120; // Default BPM
    const confidence = isBeat ? Math.min(energy / threshold, 1) : 0;

    return {
      isBeat,
      confidence,
      tempo,
      beatTime: currentTime,
      energy,
      onsetStrength: energy - avgEnergy
    };
  }

  private calculateEnergy(timeDomainData: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < timeDomainData.length; i++) {
      const value = timeDomainData[i] ?? 0;
      sum += value * value;
    }
    return sum / timeDomainData.length;
  }

  updateConfig(config: AudioEngineConfig): void {
    this.config = config;
  }
}
