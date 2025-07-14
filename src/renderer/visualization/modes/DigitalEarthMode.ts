import * as THREE from 'three';
import { BaseVisualizationMode, VisualizationData } from '../types';
import { VisualizationMode } from '../../../shared/types';

interface DigitalEarthConfig {
  earthRadius: number;
  subdivisions: number;
  pulseIntensity: number;
  moonDistance: number;
  orbitSpeed: number;
}

interface ElectricalArc {
  line: THREE.Line;
  startVertex: THREE.Vector3;
  endVertex: THREE.Vector3;
  intensity: number;
  lifetime: number;
  maxLifetime: number;
}

export class DigitalEarthMode extends BaseVisualizationMode {
  private config: DigitalEarthConfig = {
    earthRadius: 3,
    subdivisions: 1, // Reduced for better performance
    pulseIntensity: 1.0,
    moonDistance: 8,
    orbitSpeed: 0.01
  };

  // Core Earth geometry
  private earthSphere: THREE.Mesh | null = null;
  private wireframe: THREE.LineSegments | null = null;
  private vertices: THREE.Vector3[] = [];
  
  // Electrical system
  private electricalArcs: ElectricalArc[] = [];
  private arcContainer: THREE.Group | null = null;
  private maxArcs: number = 15; // Limit concurrent arcs
  
  // Moon satellite
  private moon: THREE.Mesh | null = null;
  private moonWireframe: THREE.LineSegments | null = null;
  private moonOrbitAngle: number = 0;
  
  // Data streams
  private dataStreams: THREE.Points[] = [];
  private streamContainer: THREE.Group | null = null;
  
  // Animation state
  private time: number = 0;
  private lastBeatTime: number = 0;

  protected getModeType(): VisualizationMode {
    return VisualizationMode.DIGITAL_EARTH;
  }

  public async init(): Promise<void> {
    try {
      console.log('DigitalEarthMode: Starting full initialization with WebGL memory optimization...');
      
      console.log('DigitalEarthMode: Creating geodesic Earth sphere...');
      this.createEarthSphere();
      console.log('DigitalEarthMode: Earth sphere created successfully');
      
      console.log('DigitalEarthMode: Creating moon satellite...');
      this.createMoon();
      console.log('DigitalEarthMode: Moon created successfully');
      
      console.log('DigitalEarthMode: Creating data streams...');
      this.createDataStreams();
      console.log('DigitalEarthMode: Data streams created successfully');
      
      console.log('DigitalEarthMode: Setting up electrical system...');
      this.setupElectricalSystem();
      console.log('DigitalEarthMode: Electrical system setup successfully');
      
      console.log('DigitalEarthMode initialized successfully with full cyberpunk features!');
    } catch (error) {
      console.error('DigitalEarthMode initialization failed:', error);
      throw error;
    }
  }

  private createBasicEarthSphere(): void {
    console.log('Creating most basic sphere geometry...');
    
    // Start with the most basic sphere possible
    const geometry = new THREE.SphereGeometry(this.config.earthRadius, 8, 6); // Very low poly
    console.log('Basic sphere geometry created');
    
    // Simple solid material
    const earthMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x0066cc,
      wireframe: true  // Use wireframe to reduce complexity
    });
    console.log('Basic material created');
    
    this.earthSphere = new THREE.Mesh(geometry, earthMaterial);
    console.log('Basic mesh created');
    
    this.scene.add(this.earthSphere);
    console.log('Basic sphere added to scene');
  }

  private createEarthSphere(): void {
    // Create geodesic sphere using icosahedron subdivision
    const geometry = new THREE.IcosahedronGeometry(this.config.earthRadius, this.config.subdivisions);
    
    // Store vertices for electrical arc connections
    const positions = geometry.attributes.position;
    this.vertices = [];
    for (let i = 0; i < positions.count; i++) {
      this.vertices.push(new THREE.Vector3(
        positions.getX(i),
        positions.getY(i),
        positions.getZ(i)
      ));
    }
    
    // Semi-transparent Earth core
    const earthMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x001133,
      transparent: true,
      opacity: 0.2
    });
    this.earthSphere = new THREE.Mesh(geometry, earthMaterial);
    this.scene.add(this.earthSphere);

    // Glowing wireframe overlay
    const wireframeGeometry = new THREE.WireframeGeometry(geometry);
    const wireframeMaterial = new THREE.LineBasicMaterial({ 
      color: 0x00ccff,
      transparent: true,
      opacity: 0.8
    });
    this.wireframe = new THREE.LineSegments(wireframeGeometry, wireframeMaterial);
    this.scene.add(this.wireframe);
  }

  private createMoon(): void {
    // Smaller geodesic moon
    const moonGeometry = new THREE.IcosahedronGeometry(0.3, 1);
    
    // Moon core
    const moonMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x003366,
      transparent: true,
      opacity: 0.3
    });
    this.moon = new THREE.Mesh(moonGeometry, moonMaterial);
    this.scene.add(this.moon);

    // Moon wireframe
    const moonWireframeGeometry = new THREE.WireframeGeometry(moonGeometry);
    const moonWireframeMaterial = new THREE.LineBasicMaterial({ 
      color: 0x0099cc,
      transparent: true,
      opacity: 0.6
    });
    this.moonWireframe = new THREE.LineSegments(moonWireframeGeometry, moonWireframeMaterial);
    this.scene.add(this.moonWireframe);
  }

  private createDataStreams(): void {
    this.streamContainer = new THREE.Group();
    this.scene.add(this.streamContainer);

    // Create orbital particle streams
    for (let i = 0; i < 2; i++) { // Reduced stream count
      const streamGeometry = new THREE.BufferGeometry();
      const particleCount = 50; // Reduced particle count
      const positions = new Float32Array(particleCount * 3);
      
      // Create orbital ring of particles
      const radius = this.config.earthRadius + 1 + i * 0.5;
      const angleOffset = (i * Math.PI * 2) / 3;
      
      for (let j = 0; j < particleCount; j++) {
        const angle = (j / particleCount) * Math.PI * 2 + angleOffset;
        positions[j * 3] = Math.cos(angle) * radius;
        positions[j * 3 + 1] = Math.sin(angle) * radius * 0.1 * Math.sin(angle * 3);
        positions[j * 3 + 2] = Math.sin(angle) * radius;
      }
      
      streamGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      
      const streamMaterial = new THREE.PointsMaterial({
        color: 0x00ffaa,
        size: 0.05,
        transparent: true,
        opacity: 0.8
      });
      
      const stream = new THREE.Points(streamGeometry, streamMaterial);
      this.dataStreams.push(stream);
      this.streamContainer.add(stream);
    }
  }

  private setupElectricalSystem(): void {
    this.arcContainer = new THREE.Group();
    this.scene.add(this.arcContainer);
  }

  private generateElectricalArc(intensity: number): void {
    if (this.vertices.length < 2) return;
    
    // Limit the number of concurrent arcs to prevent memory issues
    if (this.electricalArcs.length >= this.maxArcs) {
      return;
    }

    // Select random vertices for arc connection
    const startIdx = Math.floor(Math.random() * this.vertices.length);
    let endIdx = Math.floor(Math.random() * this.vertices.length);
    while (endIdx === startIdx) {
      endIdx = Math.floor(Math.random() * this.vertices.length);
    }

    const startVertex = this.vertices[startIdx].clone();
    const endVertex = this.vertices[endIdx].clone();
    
    // Create curved arc path
    const arcPoints: THREE.Vector3[] = [];
    const segments = 8; // Reduced segments for better performance
    
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const point = new THREE.Vector3().lerpVectors(startVertex, endVertex, t);
      
      // Add some curvature and randomness
      const midPoint = new THREE.Vector3().lerpVectors(startVertex, endVertex, 0.5);
      const perpendicular = new THREE.Vector3().crossVectors(midPoint, new THREE.Vector3(0, 1, 0)).normalize();
      const curve = Math.sin(t * Math.PI) * 0.3;
      point.add(perpendicular.multiplyScalar(curve));
      
      // Add electrical noise
      point.add(new THREE.Vector3(
        (Math.random() - 0.5) * 0.1,
        (Math.random() - 0.5) * 0.1,
        (Math.random() - 0.5) * 0.1
      ));
      
      arcPoints.push(point);
    }

    const arcGeometry = new THREE.BufferGeometry().setFromPoints(arcPoints);
    const arcMaterial = new THREE.LineBasicMaterial({
      color: new THREE.Color().setHSL(0.55 + Math.random() * 0.1, 1, 0.5 + intensity * 0.5),
      transparent: true,
      opacity: 0.8 + intensity * 0.2
    });

    const arcLine = new THREE.Line(arcGeometry, arcMaterial);
    
    const arc: ElectricalArc = {
      line: arcLine,
      startVertex,
      endVertex,
      intensity,
      lifetime: 0,
      maxLifetime: 0.5 + Math.random() * 1.0
    };

    this.electricalArcs.push(arc);
    this.arcContainer?.add(arcLine);
  }

  private updateElectricalSystem(deltaTime: number, audioData: any): void {
    // Update existing arcs
    for (let i = this.electricalArcs.length - 1; i >= 0; i--) {
      const arc = this.electricalArcs[i];
      arc.lifetime += deltaTime;
      
      // Fade out arc
      const fadeProgress = arc.lifetime / arc.maxLifetime;
      const opacity = Math.max(0, 1 - fadeProgress);
      (arc.line.material as THREE.LineBasicMaterial).opacity = opacity;
      
      // Remove expired arcs
      if (arc.lifetime >= arc.maxLifetime) {
        this.arcContainer?.remove(arc.line);
        arc.line.geometry.dispose();
        (arc.line.material as THREE.Material).dispose();
        this.electricalArcs.splice(i, 1);
      }
    }

    // Generate new arcs based on audio
    const { frequencyBands, beat, volume } = audioData;
    
    // Trigger arcs on frequency peaks (reduced frequency)
    if (frequencyBands && this.electricalArcs.length < this.maxArcs) {
      for (let i = 0; i < Math.min(frequencyBands.length, 4); i++) {
        if (frequencyBands[i] > 0.8 && Math.random() < 0.1) { // Higher threshold, lower probability
          this.generateElectricalArc(frequencyBands[i]);
        }
      }
    }
    
    // Major pulse on beat (reduced count)
    if (beat && this.time - this.lastBeatTime > 0.3 && this.electricalArcs.length < this.maxArcs - 1) {
      this.generateElectricalArc(volume);
      this.lastBeatTime = this.time;
    }
  }

  public update(data: VisualizationData): void {
    if (!this.earthSphere || !this.wireframe || !this.isActive) {
      return;
    }

    const { audio } = data;
    const deltaTime = 0.016; // Approximate 60fps
    this.time += deltaTime;

    // Rotate Earth
    const rotationSpeed = 0.002 + audio.volume * 0.003;
    this.earthSphere.rotation.y += rotationSpeed;
    this.wireframe.rotation.y += rotationSpeed;
    this.wireframe.rotation.x += rotationSpeed * 0.5;

    // Update electrical system
    this.updateElectricalSystem(deltaTime, audio);

    // Update moon orbit
    this.moonOrbitAngle += this.config.orbitSpeed * (1 + audio.volume * 0.5);
    if (this.moon && this.moonWireframe) {
      const moonX = Math.cos(this.moonOrbitAngle) * this.config.moonDistance;
      const moonZ = Math.sin(this.moonOrbitAngle) * this.config.moonDistance;
      const moonY = Math.sin(this.moonOrbitAngle * 2) * 0.5;
      
      this.moon.position.set(moonX, moonY, moonZ);
      this.moonWireframe.position.set(moonX, moonY, moonZ);
      
      // Rotate moon
      this.moon.rotation.y += 0.01;
      this.moonWireframe.rotation.y += 0.01;
    }

    // Update data streams
    this.dataStreams.forEach((stream, index) => {
      stream.rotation.y += (0.005 + audio.volume * 0.01) * (index + 1);
      stream.rotation.x += 0.002 * Math.sin(this.time + index);
      
      // Modulate particle opacity with audio
      (stream.material as THREE.PointsMaterial).opacity = 0.5 + audio.volume * 0.5;
    });

    // Pulse effect on beat
    if (audio.beat) {
      const scale = 1.1 + audio.volume * 0.3;
      this.earthSphere.scale.setScalar(scale);
      this.wireframe.scale.setScalar(scale);
    } else {
      const scale = 1 + audio.volume * 0.1;
      this.earthSphere.scale.setScalar(scale);
      this.wireframe.scale.setScalar(scale);
    }

    // Dynamic wireframe color based on spectral centroid
    if (audio.spectralCentroid) {
      const intensity = audio.spectralCentroid * 0.0001;
      const hue = 0.5 + intensity;
      (this.wireframe.material as THREE.LineBasicMaterial).color.setHSL(hue, 1, 0.5 + audio.volume * 0.3);
    }
  }

  public resize(width: number, height: number): void {
    // No specific resize logic needed
  }

  protected onActivate(): void {
    console.log('DigitalEarthMode activated - Cyberpunk Earth online');
  }

  protected onDeactivate(): void {
    console.log('DigitalEarthMode deactivated');
  }

  public dispose(): void {
    // Dispose Earth
    if (this.earthSphere) {
      this.scene.remove(this.earthSphere);
      this.earthSphere.geometry.dispose();
      (this.earthSphere.material as THREE.Material).dispose();
      this.earthSphere = null;
    }
    
    if (this.wireframe) {
      this.scene.remove(this.wireframe);
      this.wireframe.geometry.dispose();
      (this.wireframe.material as THREE.Material).dispose();
      this.wireframe = null;
    }

    // Dispose moon
    if (this.moon) {
      this.scene.remove(this.moon);
      this.moon.geometry.dispose();
      (this.moon.material as THREE.Material).dispose();
      this.moon = null;
    }
    
    if (this.moonWireframe) {
      this.scene.remove(this.moonWireframe);
      this.moonWireframe.geometry.dispose();
      (this.moonWireframe.material as THREE.Material).dispose();
      this.moonWireframe = null;
    }

    // Dispose electrical arcs
    this.electricalArcs.forEach(arc => {
      arc.line.geometry.dispose();
      (arc.line.material as THREE.Material).dispose();
    });
    this.electricalArcs = [];
    
    if (this.arcContainer) {
      this.scene.remove(this.arcContainer);
      this.arcContainer = null;
    }

    // Dispose data streams
    this.dataStreams.forEach(stream => {
      stream.geometry.dispose();
      (stream.material as THREE.Material).dispose();
    });
    this.dataStreams = [];
    
    if (this.streamContainer) {
      this.scene.remove(this.streamContainer);
      this.streamContainer = null;
    }
    
    console.log('DigitalEarthMode disposed');
  }
}
