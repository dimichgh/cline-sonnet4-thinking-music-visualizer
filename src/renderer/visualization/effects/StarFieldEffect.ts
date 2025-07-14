import { AudioAnalysisData } from '@shared/types';

/**
 * Handles dual-layer star field creation and music-reactive updates
 */
export class StarFieldEffect {
  private bloomStars: any = null;
  private backgroundStars: any = null;

  public createDualLayerStarField(THREE: any): { bloomStars: any, backgroundStars: any } {
    const starCount = 1000;
    
    // LAYER 1: Background stars that change color/size (NO bloom, behind bloom stars)
    const bgGeometry = new THREE.BufferGeometry();
    const bgPositions = new Float32Array(starCount * 3);
    const bgColors = new Float32Array(starCount * 3);
    
    // LAYER 2: Bloom stars that stay constant for glow (static, in front)
    const bloomGeometry = new THREE.BufferGeometry();
    const bloomPositions = new Float32Array(starCount * 3);
    const bloomColors = new Float32Array(starCount * 3);
    
    for (let i = 0; i < starCount * 3; i += 3) {
      // SAME positions for both layers (almost identical)
      const x = (Math.random() - 0.5) * 400;
      const y = (Math.random() - 0.5) * 400;
      const z = (Math.random() - 0.5) * 400;
      
      // Background positions (slightly offset so they show behind bloom)
      bgPositions[i] = x + (Math.random() - 0.5) * 0.5;     // Tiny offset
      bgPositions[i + 1] = y + (Math.random() - 0.5) * 0.5;
      bgPositions[i + 2] = z - 0.1; // Slightly behind
      
      // Bloom positions (front layer)
      bloomPositions[i] = x;
      bloomPositions[i + 1] = y;
      bloomPositions[i + 2] = z;
      
      // Background colors (dimmer, for music reactivity)
      const bgIntensity = 0.3 + Math.random() * 0.4; // Much dimmer
      const starType = Math.random();
      
      let bgR, bgG, bgB;
      if (starType < 0.2) {
        bgR = bgIntensity * 0.4; bgG = bgIntensity * 0.7; bgB = bgIntensity;
      } else if (starType < 0.4) {
        bgR = bgIntensity; bgG = bgIntensity * 0.6; bgB = bgIntensity * 0.3;
      } else if (starType < 0.6) {
        bgR = bgIntensity * 0.3; bgG = bgIntensity; bgB = bgIntensity * 0.8;
      } else if (starType < 0.8) {
        bgR = bgIntensity * 0.9; bgG = bgIntensity * 0.4; bgB = bgIntensity;
      } else {
        bgR = bgIntensity * 0.8; bgG = bgIntensity * 0.8; bgB = bgIntensity * 0.8;
      }
      
      bgColors[i] = bgR;
      bgColors[i + 1] = bgG;
      bgColors[i + 2] = bgB;
      
      // Bloom colors (bright, static for glow)
      const bloomIntensity = 2.5 + Math.random() * 1.0; // Very bright
      bloomColors[i] = bloomIntensity * 0.9;
      bloomColors[i + 1] = bloomIntensity * 0.9;
      bloomColors[i + 2] = bloomIntensity * 0.9; // White for pure glow
    }
    
    // Setup geometries
    bgGeometry.setAttribute('position', new THREE.BufferAttribute(bgPositions, 3));
    bgGeometry.setAttribute('color', new THREE.BufferAttribute(bgColors, 3));
    
    bloomGeometry.setAttribute('position', new THREE.BufferAttribute(bloomPositions, 3));
    bloomGeometry.setAttribute('color', new THREE.BufferAttribute(bloomColors, 3));
    
    // Background material (NO bloom, normal blending) - BIGGER for visibility
    const bgMaterial = new THREE.PointsMaterial({
      size: 4.0,  // Much bigger so color changes are visible
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      sizeAttenuation: false,
      blending: THREE.NormalBlending // No additive = no bloom pickup
    });
    
    // Bloom material (gets bloom effect)
    const bloomMaterial = new THREE.PointsMaterial({
      size: 2,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      sizeAttenuation: false,
      blending: THREE.AdditiveBlending // Bloom glow
    });
    
    const backgroundStars = new THREE.Points(bgGeometry, bgMaterial);
    const bloomStars = new THREE.Points(bloomGeometry, bloomMaterial);
    
    // Store for music reactivity
    (backgroundStars as any).originalColors = new Float32Array(bgColors);
    
    this.backgroundStars = backgroundStars;
    this.bloomStars = bloomStars;
    
    console.log('Dual-layer star field created - background (reactive) + bloom (static)');
    return { bloomStars, backgroundStars };
  }

  public updateStarField(THREE: any, starField: any, audio: AudioAnalysisData): void {
    if (!starField || !audio || !audio.frequencyBins) return;
    
    const colors = starField.geometry.attributes.color.array;
    const originalColors = (starField as any).originalColors;
    
    if (!originalColors) return;
    
    // Analyze audio for different frequency bands
    const bassLevel = this.getFrequencyAverage(audio.frequencyBins, 0, 0.15);
    const midLevel = this.getFrequencyAverage(audio.frequencyBins, 0.15, 0.6);
    const highLevel = this.getFrequencyAverage(audio.frequencyBins, 0.6, 1.0);
    
    // Normalize levels with thresholds for constellation activation
    const bassNorm = Math.min(bassLevel / 255, 1);
    const midNorm = Math.min(midLevel / 255, 1);
    const highNorm = Math.min(highLevel / 255, 1);
    
    // CONSTELLATION-BASED activation thresholds
    const bassThreshold = 0.1;  // Bass needs to be above 10% to activate constellation
    const midThreshold = 0.1;   
    const highThreshold = 0.1;
    
    const beatBoost = audio.beat ? 1.5 : 1.0;
    const time = Date.now() * 0.001; // For wave effects
    
    console.log('Constellation update - Bass:', bassNorm.toFixed(2), 'Mid:', midNorm.toFixed(2), 'High:', highNorm.toFixed(2));
    
    // Create CONSTELLATION GROUPS (20 constellations of ~50 stars each)
    const totalStars = colors.length / 3;
    const constellationSize = 50; // Stars per constellation
    const numConstellations = Math.ceil(totalStars / constellationSize);
    
    for (let constellation = 0; constellation < numConstellations; constellation++) {
      const startStar = constellation * constellationSize;
      const endStar = Math.min(startStar + constellationSize, totalStars);
      
      // Assign constellation type based on position (creates spatial patterns)
      const constellationType = constellation % 3;
      let isActive = false;
      let colorShift = { r: 1, g: 1, b: 1 };
      let intensityMultiplier = 1.0;
      
      // Add wave effect - constellations activate in waves across space
      const wavePhase = (constellation / numConstellations) * Math.PI * 2;
      const waveOffset = Math.sin(time * 2 + wavePhase) * 0.5 + 0.5; // 0-1
      
      if (constellationType === 0) {
        // Bass constellations - RED waves
        if (bassNorm > bassThreshold) {
          isActive = true;
          const waveIntensity = bassNorm * waveOffset;
          intensityMultiplier = 1 + waveIntensity * 1.2 * beatBoost;
          colorShift = { 
            r: 1 + waveIntensity * 2.0,   // Strong red boost
            g: 1 + waveIntensity * 0.3,   
            b: 1 + waveIntensity * 0.1    
          };
        }
      } else if (constellationType === 1) {
        // Mid constellations - GREEN waves  
        if (midNorm > midThreshold) {
          isActive = true;
          const waveIntensity = midNorm * waveOffset;
          intensityMultiplier = 1 + waveIntensity * 1.0 * beatBoost;
          colorShift = { 
            r: 1 + waveIntensity * 0.2,   
            g: 1 + waveIntensity * 2.0,   // Strong green boost
            b: 1 + waveIntensity * 0.3    
          };
        }
      } else {
        // High constellations - BLUE waves
        if (highNorm > highThreshold) {
          isActive = true;
          const waveIntensity = highNorm * waveOffset;
          intensityMultiplier = 1 + waveIntensity * 1.5 * beatBoost;
          colorShift = { 
            r: 1 + waveIntensity * 0.1,   
            g: 1 + waveIntensity * 0.4,   
            b: 1 + waveIntensity * 2.0    // Strong blue boost
          };
        }
      }
      
      // Update stars in this constellation
      for (let starIndex = startStar; starIndex < endStar; starIndex++) {
        const i = starIndex * 3;
        
        if (isActive) {
          // Apply constellation effect
          const newR = Math.min(originalColors[i] * colorShift.r * intensityMultiplier, 3.0);
          const newG = Math.min(originalColors[i + 1] * colorShift.g * intensityMultiplier, 3.0);
          const newB = Math.min(originalColors[i + 2] * colorShift.b * intensityMultiplier, 3.0);
          
          colors[i] = Math.max(newR, originalColors[i] * 0.7);     
          colors[i + 1] = Math.max(newG, originalColors[i + 1] * 0.7); 
          colors[i + 2] = Math.max(newB, originalColors[i + 2] * 0.7); 
        } else {
          // Fade back to original (inactive constellation)
          colors[i] = originalColors[i] * 0.6;     // Dimmed when not active
          colors[i + 1] = originalColors[i + 1] * 0.6; 
          colors[i + 2] = originalColors[i + 2] * 0.6; 
        }
      }
    }
    
    // Mark colors for update
    starField.geometry.attributes.color.needsUpdate = true;
    
    // Update material size based on overall intensity
    const avgIntensity = (bassNorm + midNorm + highNorm) / 3;
    const newSize = Math.max(3.0, Math.min(6.0, 4 + avgIntensity * 2 * beatBoost)); // Bigger size range
    starField.material.size = newSize;
  }

  public rotateStarFields(): void {
    if (this.bloomStars) {
      this.bloomStars.rotation.y += 0.001;
      this.bloomStars.rotation.x += 0.0005;
    }
    if (this.backgroundStars) {
      this.backgroundStars.rotation.y += 0.001;
      this.backgroundStars.rotation.x += 0.0005;
    }
  }

  public rotateWithAudio(audio: AudioAnalysisData): void {
    if (audio && this.bloomStars && this.backgroundStars) {
      this.bloomStars.rotation.y += audio.volume * 0.002;
      this.backgroundStars.rotation.y += audio.volume * 0.002;
    }
  }

  private getFrequencyAverage(frequencyBins: number[], startPercent: number, endPercent: number): number {
    const startIndex = Math.floor(frequencyBins.length * startPercent);
    const endIndex = Math.floor(frequencyBins.length * endPercent);
    const slice = frequencyBins.slice(startIndex, endIndex);
    
    if (slice.length === 0) return 0;
    
    return slice.reduce((sum, val) => sum + val, 0) / slice.length;
  }
}
