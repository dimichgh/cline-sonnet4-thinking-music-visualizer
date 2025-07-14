import { AudioEngineConfig, SpectralFeatures } from '@shared/types';

export class FrequencyAnalyzer {
  private analyzerNode: AnalyserNode;
  private config: AudioEngineConfig;
  private frequencyData: Float32Array;
  private timeDomainData: Float32Array;
  private previousFrequencyData: Float32Array;

  constructor(analyzerNode: AnalyserNode, config: AudioEngineConfig) {
    this.analyzerNode = analyzerNode;
    this.config = config;
    
    // Initialize data arrays
    const bufferLength = this.analyzerNode.frequencyBinCount;
    this.frequencyData = new Float32Array(bufferLength);
    this.timeDomainData = new Float32Array(bufferLength);
    this.previousFrequencyData = new Float32Array(bufferLength);
  }

  getFrequencyData(): Float32Array {
    this.analyzerNode.getFloatFrequencyData(this.frequencyData);
    return this.frequencyData;
  }

  getTimeDomainData(): Float32Array {
    this.analyzerNode.getFloatTimeDomainData(this.timeDomainData);
    return this.timeDomainData;
  }

  getSpectralFeatures(): SpectralFeatures {
    // Update frequency data
    this.previousFrequencyData.set(this.frequencyData);
    this.getFrequencyData();

    // Calculate basic spectral features
    const centroid = this.calculateSpectralCentroid();
    const rolloff = this.calculateSpectralRolloff();
    const flux = this.calculateSpectralFlux();
    
    return {
      centroid,
      rolloff,
      flux,
      flatness: 0.5, // Simplified
      crest: 2.0, // Simplified
      bandwidth: centroid * 0.5, // Simplified
      mfccs: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] // Simplified
    };
  }

  private calculateSpectralCentroid(): number {
    let weightedSum = 0;
    let magnitudeSum = 0;
    
    const nyquist = this.config.sampleRate / 2;
    const binWidth = nyquist / this.frequencyData.length;
    
    for (let i = 0; i < this.frequencyData.length; i++) {
      const frequencyValue = this.frequencyData[i];
      const magnitude = this.dbToLinear(frequencyValue !== undefined ? frequencyValue : -60);
      const frequency = i * binWidth;
      
      weightedSum += frequency * magnitude;
      magnitudeSum += magnitude;
    }
    
    return magnitudeSum > 0 ? weightedSum / magnitudeSum : 0;
  }

  private calculateSpectralRolloff(): number {
    const magnitudes = Array.from(this.frequencyData).map(db => this.dbToLinear(db ?? -60));
    const totalEnergy = magnitudes.reduce((sum, mag) => sum + mag * mag, 0);
    const targetEnergy = totalEnergy * 0.85;
    
    let cumulativeEnergy = 0;
    const nyquist = this.config.sampleRate / 2;
    const binWidth = nyquist / this.frequencyData.length;
    
    for (let i = 0; i < magnitudes.length; i++) {
      cumulativeEnergy += magnitudes[i] * magnitudes[i];
      if (cumulativeEnergy >= targetEnergy) {
        return i * binWidth;
      }
    }
    
    return nyquist;
  }

  private calculateSpectralFlux(): number {
    let flux = 0;
    
    for (let i = 0; i < this.frequencyData.length; i++) {
      const currentValue = this.frequencyData[i];
      const previousValue = this.previousFrequencyData[i];
      const current = this.dbToLinear(currentValue ?? -60);
      const previous = this.dbToLinear(previousValue ?? -60);
      const diff = current - previous;
      
      if (diff > 0) {
        flux += diff * diff;
      }
    }
    
    return Math.sqrt(flux);
  }

  private dbToLinear(db: number): number {
    return Math.pow(10, db / 20);
  }

  updateConfig(config: AudioEngineConfig): void {
    this.config = config;
  }
}
