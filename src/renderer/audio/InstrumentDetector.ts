import { AudioEngineConfig, InstrumentDetection, InstrumentType, SpectralFeatures } from '@shared/types';

export class InstrumentDetector {
  private config: AudioEngineConfig;

  constructor(config: AudioEngineConfig) {
    this.config = config;
  }

  detectInstruments(frequencyData: Float32Array, spectralFeatures: SpectralFeatures): InstrumentDetection[] {
    const detections: InstrumentDetection[] = [];
    const currentTime = performance.now();

    // Simple heuristic-based instrument detection
    // This is a simplified version - real implementation would use ML models

    // Detect drums based on low frequency energy
    const drumConfidence = this.detectDrums(frequencyData);
    if (drumConfidence > this.config.instrumentDetectionThreshold) {
      detections.push({
        instrument: InstrumentType.DRUMS,
        confidence: drumConfidence,
        amplitude: drumConfidence,
        frequency: 60, // Low frequency
        startTime: currentTime,
        duration: 100
      });
    }

    // Detect bass based on low-mid frequency energy
    const bassConfidence = this.detectBass(frequencyData);
    if (bassConfidence > this.config.instrumentDetectionThreshold) {
      detections.push({
        instrument: InstrumentType.BASS,
        confidence: bassConfidence,
        amplitude: bassConfidence,
        frequency: 80,
        startTime: currentTime,
        duration: 200
      });
    }

    // Detect guitar based on mid frequency energy
    const guitarConfidence = this.detectGuitar(frequencyData, spectralFeatures);
    if (guitarConfidence > this.config.instrumentDetectionThreshold) {
      detections.push({
        instrument: InstrumentType.GUITAR,
        confidence: guitarConfidence,
        amplitude: guitarConfidence,
        frequency: 200,
        startTime: currentTime,
        duration: 150
      });
    }

    // Detect vocals based on spectral centroid and mid-high frequencies
    const vocalConfidence = this.detectVocals(frequencyData, spectralFeatures);
    if (vocalConfidence > this.config.instrumentDetectionThreshold) {
      detections.push({
        instrument: InstrumentType.VOCALS,
        confidence: vocalConfidence,
        amplitude: vocalConfidence,
        frequency: spectralFeatures.centroid,
        startTime: currentTime,
        duration: 300
      });
    }

    return detections;
  }

  private detectDrums(frequencyData: Float32Array): number {
    // Focus on low frequencies (0-100 Hz range)
    const lowFreqStart = 0;
    const lowFreqEnd = Math.min(10, frequencyData.length);
    
    let energy = 0;
    for (let i = lowFreqStart; i < lowFreqEnd; i++) {
      const value = frequencyData[i] ?? -60;
      energy += this.dbToLinear(value);
    }
    
    return Math.min(energy / (lowFreqEnd - lowFreqStart), 1);
  }

  private detectBass(frequencyData: Float32Array): number {
    // Focus on low-mid frequencies (50-200 Hz range)
    const start = Math.floor(frequencyData.length * 0.02);
    const end = Math.floor(frequencyData.length * 0.08);
    
    let energy = 0;
    for (let i = start; i < end; i++) {
      const value = frequencyData[i] ?? -60;
      energy += this.dbToLinear(value);
    }
    
    return Math.min(energy / (end - start), 1);
  }

  private detectGuitar(frequencyData: Float32Array, spectralFeatures: SpectralFeatures): number {
    // Focus on mid frequencies with harmonic content
    const start = Math.floor(frequencyData.length * 0.1);
    const end = Math.floor(frequencyData.length * 0.4);
    
    let energy = 0;
    for (let i = start; i < end; i++) {
      const value = frequencyData[i] ?? -60;
      energy += this.dbToLinear(value);
    }
    
    // Factor in spectral complexity
    const harmonicComplexity = spectralFeatures.flux * 0.1;
    return Math.min((energy / (end - start)) + harmonicComplexity, 1);
  }

  private detectVocals(frequencyData: Float32Array, spectralFeatures: SpectralFeatures): number {
    // Focus on mid-high frequencies where vocals typically sit
    const start = Math.floor(frequencyData.length * 0.2);
    const end = Math.floor(frequencyData.length * 0.6);
    
    let energy = 0;
    for (let i = start; i < end; i++) {
      const value = frequencyData[i] ?? -60;
      energy += this.dbToLinear(value);
    }
    
    // Vocals tend to have specific spectral centroid ranges
    const centroidFactor = spectralFeatures.centroid > 1000 && spectralFeatures.centroid < 4000 ? 1.2 : 0.8;
    
    return Math.min((energy / (end - start)) * centroidFactor, 1);
  }

  private dbToLinear(db: number): number {
    return Math.pow(10, db / 20);
  }

  updateConfig(config: AudioEngineConfig): void {
    this.config = config;
  }
}
