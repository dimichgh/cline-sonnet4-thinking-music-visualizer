import { AudioAnalysisData } from '@shared/types';

/**
 * Handles circular rings around earth creation and music-reactive updates
 */
export class ElectricalArcsEffect {
  private musicRings: any[] = [];
  private maxRings = 8; // Maximum number of concurrent rings

  public updateElectricalArcs(THREE: any, scene: any, audio: AudioAnalysisData | null, time: number): void {
    // Music-reactive ring generation
    let ringProbability = 0.01; // Base probability for new rings
    
    if (audio) {
      // Increase ring frequency based on music intensity
      ringProbability = 0.01 + audio.volume * 0.15;
      
      // Additional rings on beats
      if (audio.beat) {
        ringProbability += 0.3;
      }
      
      // High frequency sounds trigger more rings
      if (audio.frequencyBins && audio.frequencyBins.length > 0) {
        const highFreq = audio.frequencyBins[Math.floor(audio.frequencyBins.length * 0.8)] || 0;
        if (highFreq > 150) { // Lower threshold for more activity
          ringProbability += 0.2;
        }
      }
    }
    
    // Generate new rings based on music
    if (Math.random() < ringProbability && this.musicRings.length < this.maxRings) {
      const instrumentColor = this.getInstrumentColor(audio);
      this.createMusicRing(THREE, scene, instrumentColor, audio);
    }

    // Update existing rings
    for (let i = this.musicRings.length - 1; i >= 0; i--) {
      const ring = this.musicRings[i];
      ring.lifetime += 0.016;
      
      // Expand ring outward
      ring.currentRadius += ring.expansionSpeed;
      ring.mesh.scale.setScalar(ring.currentRadius / ring.baseRadius);
      
      // Fade out ring as it expands
      const fadeProgress = ring.lifetime / ring.maxLifetime;
      const baseOpacity = audio ? 0.8 + audio.volume * 0.4 : 0.6;
      const opacity = baseOpacity * (1 - fadeProgress);
      ring.mesh.material.opacity = Math.max(0, opacity);
      
      // Update ring color based on music
      if (audio && audio.frequencyBins) {
        const freqIndex = Math.floor((ring.frequencyBand * audio.frequencyBins.length));
        const frequency = audio.frequencyBins[freqIndex] || 0;
        const intensity = Math.min(frequency / 255, 1);
        
        // Modulate ring brightness based on its frequency band
        ring.mesh.material.opacity = Math.max(0, opacity * (0.3 + intensity * 0.7));
      }
      
      // Remove rings that are too expanded or faded
      if (ring.lifetime >= ring.maxLifetime || ring.currentRadius > 15) {
        scene.remove(ring.mesh);
        ring.mesh.geometry.dispose();
        ring.mesh.material.dispose();
        this.musicRings.splice(i, 1);
      }
    }
  }

  private createElectricalArc(THREE: any, scene: any, instrumentColor?: number): void {
    // Create PERFECT HALF-CIRCLE arc between two points on earth surface
    const earthRadius = 3.0;
    
    // Start point - EXACTLY on sphere surface
    const startTheta = Math.random() * Math.PI * 2;
    const startPhi = Math.random() * Math.PI;
    const startPoint = new THREE.Vector3(
      earthRadius * Math.sin(startPhi) * Math.cos(startTheta),
      earthRadius * Math.sin(startPhi) * Math.sin(startTheta),
      earthRadius * Math.cos(startPhi)
    );
    
    // End point - EXACTLY on sphere surface, ensure reasonable distance
    let endPoint: any;
    let distance: number;
    do {
      const endTheta = Math.random() * Math.PI * 2;
      const endPhi = Math.random() * Math.PI;
      endPoint = new THREE.Vector3(
        earthRadius * Math.sin(endPhi) * Math.cos(endTheta),
        earthRadius * Math.sin(endPhi) * Math.sin(endTheta),
        earthRadius * Math.cos(endPhi)
      );
      distance = startPoint.distanceTo(endPoint);
    } while (distance < 1.5 || distance > 8); // Ensure good arc distance
    
    // Create PERFECT SEMICIRCLE
    const midPoint = new THREE.Vector3().addVectors(startPoint, endPoint).multiplyScalar(0.5);
    const chordLength = startPoint.distanceTo(endPoint);
    const arcRadius = chordLength * 0.4; // Control arc height
    
    // Create semicircle points
    const segments = 32;
    const points = [];
    
    // Calculate perpendicular vector for arc plane
    const chordVector = new THREE.Vector3().subVectors(endPoint, startPoint);
    const upVector = midPoint.clone().normalize(); // Points away from earth center
    const perpVector = new THREE.Vector3().crossVectors(chordVector, upVector).normalize();
    
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const angle = Math.PI * t; // Half circle: 0 to π
      
      // Perfect semicircle calculation
      const x = Math.cos(angle) - 1; // -1 to 1, starting at -1
      const y = Math.sin(angle);     // 0 to 1 to 0
      
      // Transform to world space
      const localPoint = new THREE.Vector3(
        x * chordLength * 0.5,  // Along chord direction
        0,                       // No side displacement
        y * arcRadius           // Arc height
      );
      
      // Rotate to correct orientation
      const worldPoint = new THREE.Vector3();
      const chordDir = chordVector.clone().normalize();
      const arcUpDir = upVector.clone();
      
      worldPoint.copy(midPoint);
      worldPoint.add(chordDir.clone().multiplyScalar(localPoint.x));
      worldPoint.add(arcUpDir.clone().multiplyScalar(localPoint.z));
      
      points.push(worldPoint);
    }
    
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    
    // Use instrument color but make it MUCH BRIGHTER for bloom effect
    let arcColor = instrumentColor || 0x00ccff;
    
    // MASSIVE brightness boost for bloom threshold (multiply RGB values)
    const color = new THREE.Color(arcColor);
    const brightColor = new THREE.Color(
      Math.min(color.r * 5, 1), // 5x brighter red (increased from 3x)
      Math.min(color.g * 5, 1), // 5x brighter green  
      Math.min(color.b * 5, 1)  // 5x brighter blue
    );
    
    // BRIGHT BLOOM-READY MATERIALS
    
    // Layer 1: Ultra-bright core for bloom effect
    const coreMaterial = new THREE.LineBasicMaterial({
      color: brightColor,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending  // Additive + bright color = bloom glow!
    });
    const line = new THREE.Line(geometry, coreMaterial);
    
    // Layer 2: Medium glow 
    const glowMaterial1 = new THREE.LineBasicMaterial({
      color: brightColor,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending
    });
    const glow1 = new THREE.Line(geometry.clone(), glowMaterial1);
    glow1.scale.setScalar(1.05); // Slightly larger
    
    // Layer 3: Soft outer glow
    const glowMaterial2 = new THREE.LineBasicMaterial({
      color: brightColor,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending
    });
    const glow2 = new THREE.Line(geometry.clone(), glowMaterial2);
    glow2.scale.setScalar(1.1); // Larger outer glow

    // Create arc object with enhanced properties
    const arcObject = {
      line: line,
      glow1: glow1,
      glow2: glow2,
      lifetime: 0,
      maxLifetime: 0.4 + Math.random() * 0.6, // Longer lifetime
      color: arcColor,
      brightColor: brightColor
    };

    this.musicRings.push(arcObject);
    scene.add(line);
    scene.add(glow1);
    scene.add(glow2);
  }

  private createMusicRing(THREE: any, scene: any, instrumentColor?: number, audio?: AudioAnalysisData | null): void {
    // Create circular ring around earth at random distance
    const baseRadius = 4 + Math.random() * 3; // Random distance from earth (4-7 units)
    const ringThickness = 0.05 + Math.random() * 0.05; // Variable thickness
    
    // Create ring geometry
    const ringGeometry = new THREE.RingGeometry(
      baseRadius - ringThickness,
      baseRadius + ringThickness,
      32, // Smooth circle
      1
    );
    
    // Use instrument color or default
    const ringColor = instrumentColor || this.getInstrumentColor(audio || null);
    
    // Calculate audio-reactive brightness like Earth bars
    let intensity = 1.0; // Default intensity when no audio
    if (audio && audio.frequencyBins && audio.frequencyBins.length > 0) {
      // Sample a random frequency for this ring
      const freqIndex = Math.floor(Math.random() * audio.frequencyBins.length);
      const rawFrequency = audio.frequencyBins[freqIndex] || -120;
      
      // Use same logic as Earth bars for brightness
      const dbRange = 60; // Same 60 dB range as bars
      const threshold = -80; // Same -80 dB threshold as bars
      intensity = Math.max(0, Math.min((rawFrequency - threshold) / dbRange, 1));
      
      // Apply beat boost like bars
      const beatBoost = audio.beat ? 2.0 : 1.0;
      intensity *= beatBoost;
    }
    
    // Create EXTREMELY bright material for bloom effect - scale with intensity
    const color = new THREE.Color(ringColor);
    const brightnessMultiplier = 3 + intensity * 7; // 3x to 10x brightness based on audio
    const brightColor = new THREE.Color(
      Math.min(color.r * brightnessMultiplier, 1),
      Math.min(color.g * brightnessMultiplier, 1),
      Math.min(color.b * brightnessMultiplier, 1)
    );
    
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: brightColor,
      transparent: true,
      opacity: 0.4 + intensity * 0.6, // 40% to 100% opacity based on audio
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    });
    
    const ringMesh = new THREE.Mesh(ringGeometry, ringMaterial);
    
    // Random orientation around earth
    ringMesh.rotation.x = Math.random() * Math.PI * 2;
    ringMesh.rotation.y = Math.random() * Math.PI * 2;
    ringMesh.rotation.z = Math.random() * Math.PI * 2;
    
    // Create ring object
    const ringObject = {
      mesh: ringMesh,
      baseRadius: baseRadius,
      currentRadius: baseRadius,
      expansionSpeed: 0.05 + Math.random() * 0.1, // How fast ring expands
      lifetime: 0,
      maxLifetime: 3 + Math.random() * 2, // Ring lasts 3-5 seconds
      color: ringColor,
      frequencyBand: Math.random() // Which frequency band this ring reacts to (0-1)
    };
    
    this.musicRings.push(ringObject);
    scene.add(ringMesh);
  }

  private getInstrumentColor(audio: AudioAnalysisData | null): number {
    // When no music - use time-based rainbow
    if (!audio || !audio.frequencyBins || audio.frequencyBins.length === 0) {
      const time = Date.now() * 0.001;
      const hue = ((time * 0.3) % 1) * 360;
      return this.hslToHex(hue, 1, 0.7);
    }
    
    const time = Date.now() * 0.001;
    
    // Create rhythm-responsive colors that change frequently
    let baseHue = 0;
    
    // Beat-driven color shifts
    if (audio.beat) {
      // On beats, jump to a new color based on volume and RMS
      baseHue = ((audio.volume * 360) + (audio.rms * 180) + (time * 60)) % 360;
    } else {
      // Between beats, create flowing color changes based on spectral content
      const totalBins = audio.frequencyBins.length;
      
      // Sample different frequency regions for color variation
      const lowFreq = audio.frequencyBins[Math.floor(totalBins * 0.1)] || -120;
      const midFreq = audio.frequencyBins[Math.floor(totalBins * 0.4)] || -120;
      const highFreq = audio.frequencyBins[Math.floor(totalBins * 0.8)] || -120;
      
      // Convert decibels to intensity and use for color mixing
      const lowIntensity = Math.max(0, (lowFreq + 120) / 120);
      const midIntensity = Math.max(0, (midFreq + 120) / 120);
      const highIntensity = Math.max(0, (highFreq + 120) / 120);
      
      // Create dynamic hue based on frequency distribution + time
      baseHue = (
        lowIntensity * 0 +      // Red component
        midIntensity * 120 +    // Green component  
        highIntensity * 240 +   // Blue component
        time * 20               // Slow time drift
      ) % 360;
    }
    
    // Add volume-based variation to prevent monotony
    const volumeShift = (audio.volume || 0) * 60;
    const finalHue = (baseHue + volumeShift) % 360;
    
    // Use higher saturation and lightness for more vibrant colors
    const saturation = 0.9 + (audio.rms || 0) * 0.1; // 90-100% saturation
    const lightness = 0.6 + (audio.peak || 0) * 0.3;  // 60-90% lightness
    
    return this.hslToHex(finalHue, saturation, lightness);
  }
  
  private hslToHex(h: number, s: number, l: number): number {
    h = h / 360;
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    const r = hue2rgb(p, q, h + 1/3);
    const g = hue2rgb(p, q, h);
    const b = hue2rgb(p, q, h - 1/3);
    
    return (Math.round(r * 255) << 16) + (Math.round(g * 255) << 8) + Math.round(b * 255);
  }
}
