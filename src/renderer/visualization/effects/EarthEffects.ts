import { AudioAnalysisData } from '@shared/types';

/**
 * Handles Earth-specific effects including continent bars and meridian signals
 */
export class EarthEffects {
  private continentBars: any[] = [];
  private meridianSignals: any[] = [];

  public createEarthSphere(THREE: any): any {
    const earthGroup = new THREE.Group();
    
    // Earth core - higher detail for digital effects
    const earthGeometry = new THREE.IcosahedronGeometry(3, 2); // More complex geodesic
    
    // Digital earth material with glow effect
    const earthMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x001155,  // Deep blue
      transparent: true,
      opacity: 0.4
    });
    const earthSphere = new THREE.Mesh(earthGeometry, earthMaterial);
    earthGroup.add(earthSphere);

    // Digital wireframe overlay - geodesic pattern
    const wireframeGeometry = new THREE.WireframeGeometry(earthGeometry);
    const wireframeMaterial = new THREE.LineBasicMaterial({ 
      color: 0x00ccff,
      transparent: true,
      opacity: 0.8
    });
    const wireframe = new THREE.LineSegments(wireframeGeometry, wireframeMaterial);
    earthGroup.add(wireframe);

    // Add glowing outer shell for digital effect
    const glowGeometry = new THREE.SphereGeometry(3.1, 32, 16);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0x0088ff,
      transparent: true,
      opacity: 0.2,
      side: THREE.BackSide // Glow from inside
    });
    const glowSphere = new THREE.Mesh(glowGeometry, glowMaterial);
    earthGroup.add(glowSphere);

    // Digital grid lines - latitude/longitude style
    this.addDigitalGridLines(THREE, earthGroup);

    // Store references for animation
    (earthGroup as any).earthSphere = earthSphere;
    (earthGroup as any).wireframe = wireframe;
    (earthGroup as any).glowSphere = glowSphere;

    console.log('Digital Earth sphere created with geodesic geometry and glow effects');
    return earthGroup;
  }

  public createContinentBars(THREE: any, earthGroup: any): void {
    const earthRadius = 3.0;
    
    // Create music equalizer bars spread across Earth surface
    // Generate bars in a grid pattern around the sphere
    const latSteps = 6; // Number of latitude rings (reduced for better visibility)
    const lonSteps = 12; // Number of longitude divisions per ring
    
    for (let latStep = 0; latStep < latSteps; latStep++) {
      // Avoid poles, spread evenly between -60 and +60 degrees
      const lat = -60 + (latStep / (latSteps - 1)) * 120;
      const latRad = (lat * Math.PI) / 180;
      
      // Vary number of bars per latitude to account for sphere curvature
      const barsAtThisLat = Math.max(6, Math.floor(lonSteps * Math.cos(latRad)));
      
      for (let lonStep = 0; lonStep < barsAtThisLat; lonStep++) {
        const lon = (lonStep / barsAtThisLat) * 360;
        const lonRad = (lon * Math.PI) / 180;
        
        // Calculate position on sphere surface
        const x = earthRadius * Math.cos(latRad) * Math.cos(lonRad);
        const y = earthRadius * Math.sin(latRad);
        const z = earthRadius * Math.cos(latRad) * Math.sin(lonRad);
        
        // Create LARGER equalizer bar geometry for better visibility
        const barHeight = 0.3; // Larger base height
        const barWidth = 0.15; // Much wider bars
        const barGeometry = new THREE.CylinderGeometry(barWidth, barWidth, barHeight, 8);
        
        // Create BRIGHT material for better visibility
        const hue = (lonStep / barsAtThisLat + latStep * 0.15) % 1;
        const barMaterial = new THREE.MeshBasicMaterial({
          color: new THREE.Color().setHSL(hue, 1.0, 0.7), // Brighter colors
          transparent: true,
          opacity: 0.9, // More opaque
          blending: THREE.AdditiveBlending
        });
        
        const bar = new THREE.Mesh(barGeometry, barMaterial);
        
        // Position bar OUTSIDE earth surface for visibility
        const surfaceNormal = new THREE.Vector3(x, y, z).normalize();
        const barPosition = surfaceNormal.clone().multiplyScalar(earthRadius + barHeight / 2);
        bar.position.copy(barPosition);
        
        // Orient bar to point away from earth center
        bar.lookAt(new THREE.Vector3().addVectors(bar.position, surfaceNormal));
        bar.rotateX(Math.PI / 2); // Adjust orientation so bar extends outward
        
        // Store bar data for music reactivity
        (bar as any).barData = {
          baseHeight: barHeight,
          baseColor: new THREE.Color().setHSL(hue, 1.0, 0.7),
          surfaceNormal: surfaceNormal,
          frequencyIndex: (latStep * barsAtThisLat + lonStep) % 32, // Map to frequency bins
          latStep: latStep,
          lonStep: lonStep,
          originalPosition: barPosition.clone(),
          basePosition: barPosition.clone()
        };
        
        // ADD TO EARTH GROUP so bars rotate with earth
        earthGroup.add(bar);
        this.continentBars.push(bar);
      }
    }
    
    console.log(`Created ${this.continentBars.length} VISIBLE music equalizer bars attached to Earth`);
  }

  public updateContinentBars(THREE: any, audio: AudioAnalysisData, time: number): void {
    if (!this.continentBars.length || !audio || !audio.frequencyBins) return;
    
    const beatBoost = audio.beat ? 2.0 : 1.0;
    const globalVolume = audio.volume || 0;
    
    this.continentBars.forEach((bar, index) => {
      const data = bar.barData;
      if (!data) return;
      
      // Get frequency data for this specific bar
      const freqIndex = Math.min(data.frequencyIndex, audio.frequencyBins.length - 1);
      const rawFrequency = audio.frequencyBins[freqIndex] || 0;
      
      // Normalize frequency value (0-1)
      const intensity = Math.min(rawFrequency / 255, 1) * beatBoost;
      
      // Scale bar height based on frequency intensity
      const maxBarHeight = 2.0; // Maximum bar extension
      const newHeight = data.baseHeight + intensity * maxBarHeight;
      bar.scale.y = Math.max(0.1, newHeight / data.baseHeight);
      
      // Update color based on frequency intensity and position
      const hue = (data.latStep / 8 + time * 0.1) % 1; // Slowly rotating hue
      const saturation = 0.8 + intensity * 0.2;
      const lightness = 0.4 + intensity * 0.5;
      
      bar.material.color.setHSL(hue, saturation, lightness);
      
      // Update brightness for bloom effect
      bar.material.opacity = Math.min(0.3 + intensity * 0.7, 1.0);
      
      // Keep bars attached to earth surface as it rotates
      // The bars should maintain their relative position to the earth
      // This is automatically handled since they're children of the scene
      // and positioned relative to the earth center
    });
  }

  public updateMeridianSignals(THREE: any, scene: any, audio: AudioAnalysisData, time: number): void {
    if (!audio) return;
    
    // Create traveling signals on meridians when music is playing
    const bassLevel = this.getFrequencyAverage(audio.frequencyBins, 0, 0.15);
    const midLevel = this.getFrequencyAverage(audio.frequencyBins, 0.15, 0.6);
    const highLevel = this.getFrequencyAverage(audio.frequencyBins, 0.6, 1.0);
    
    // Trigger new signals based on music intensity
    const signalProbability = (bassLevel + midLevel + highLevel) / (3 * 255) * 0.3; // Max 30% chance
    
    if (Math.random() < signalProbability && this.meridianSignals.length < 8) {
      this.createMeridianSignal(THREE, scene, audio);
    }
    
    // Update existing signals
    for (let i = this.meridianSignals.length - 1; i >= 0; i--) {
      const signal = this.meridianSignals[i];
      signal.progress += signal.speed;
      
      // Update signal position along meridian
      if (signal.points && signal.progress < signal.points.length - 1) {
        const pointIndex = Math.floor(signal.progress);
        const nextIndex = Math.min(pointIndex + 1, signal.points.length - 1);
        const t = signal.progress - pointIndex;
        
        // Interpolate position
        const currentPos = signal.points[pointIndex];
        const nextPos = signal.points[nextIndex];
        signal.mesh.position.lerpVectors(currentPos, nextPos, t);
      } else {
        // Signal reached end, remove it
        scene.remove(signal.mesh);
        signal.mesh.geometry.dispose();
        signal.mesh.material.dispose();
        this.meridianSignals.splice(i, 1);
      }
    }
  }

  private addDigitalGridLines(THREE: any, earthGroup: any): void {
    const radius = 3.05;
    
    // Latitude lines
    for (let lat = -80; lat <= 80; lat += 20) {
      const latRad = (lat * Math.PI) / 180;
      const latRadius = radius * Math.cos(latRad);
      const latY = radius * Math.sin(latRad);
      
      const latGeometry = new THREE.RingGeometry(latRadius - 0.01, latRadius + 0.01, 32);
      const latMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ffaa,
        transparent: true,
        opacity: 0.6,
        side: THREE.DoubleSide
      });
      const latRing = new THREE.Mesh(latGeometry, latMaterial);
      latRing.position.y = latY;
      latRing.rotation.x = Math.PI / 2;
      earthGroup.add(latRing);
    }

    // Longitude lines (meridians)
    for (let lon = 0; lon < 360; lon += 30) {
      const lonRad = (lon * Math.PI) / 180;
      const points = [];
      
      for (let lat = -90; lat <= 90; lat += 5) {
        const latRad = (lat * Math.PI) / 180;
        const x = radius * Math.cos(latRad) * Math.cos(lonRad);
        const y = radius * Math.sin(latRad);
        const z = radius * Math.cos(latRad) * Math.sin(lonRad);
        points.push(new THREE.Vector3(x, y, z));
      }
      
      const lonGeometry = new THREE.BufferGeometry().setFromPoints(points);
      const lonMaterial = new THREE.LineBasicMaterial({
        color: 0x00ffaa,
        transparent: true,
        opacity: 0.5
      });
      const lonLine = new THREE.Line(lonGeometry, lonMaterial);
      earthGroup.add(lonLine);
    }
  }

  private createMeridianSignal(THREE: any, scene: any, audio: AudioAnalysisData): void {
    const radius = 3.05;
    const longitude = Math.random() * 360; // Random meridian
    const lonRad = (longitude * Math.PI) / 180;
    
    // Create meridian path points
    const points = [];
    for (let lat = -90; lat <= 90; lat += 5) {
      const latRad = (lat * Math.PI) / 180;
      const x = radius * Math.cos(latRad) * Math.cos(lonRad);
      const y = radius * Math.sin(latRad);
      const z = radius * Math.cos(latRad) * Math.sin(lonRad);
      points.push(new THREE.Vector3(x, y, z));
    }
    
    // Create signal geometry and material
    const signalGeometry = new THREE.SphereGeometry(0.02, 8, 8);
    
    // Color based on frequency dominance
    const bassLevel = this.getFrequencyAverage(audio.frequencyBins, 0, 0.2);
    const midLevel = this.getFrequencyAverage(audio.frequencyBins, 0.2, 0.6);
    const highLevel = this.getFrequencyAverage(audio.frequencyBins, 0.6, 1.0);
    
    let signalColor = 0x00ffff; // Default cyan
    if (bassLevel > midLevel && bassLevel > highLevel) {
      signalColor = 0xff4400; // Orange for bass
    } else if (midLevel > bassLevel && midLevel > highLevel) {
      signalColor = 0x44ff00; // Green for mids
    } else if (highLevel > bassLevel && highLevel > midLevel) {
      signalColor = 0x0044ff; // Blue for highs
    }
    
    const signalMaterial = new THREE.MeshBasicMaterial({
      color: signalColor,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    });
    
    const signalMesh = new THREE.Mesh(signalGeometry, signalMaterial);
    
    // Start at south pole
    signalMesh.position.copy(points[0]);
    
    // Random direction (some go north, some go south)
    const direction = Math.random() > 0.5 ? 1 : -1;
    if (direction < 0) {
      points.reverse();
    }
    
    const signal = {
      mesh: signalMesh,
      points: points,
      progress: 0,
      speed: 0.5 + Math.random() * 1.0, // Variable speed
      color: signalColor
    };
    
    scene.add(signalMesh);
    this.meridianSignals.push(signal);
  }

  private getFrequencyAverage(frequencyBins: number[], startPercent: number, endPercent: number): number {
    const startIndex = Math.floor(frequencyBins.length * startPercent);
    const endIndex = Math.floor(frequencyBins.length * endPercent);
    const slice = frequencyBins.slice(startIndex, endIndex);
    
    if (slice.length === 0) return 0;
    
    return slice.reduce((sum, val) => sum + val, 0) / slice.length;
  }
}
