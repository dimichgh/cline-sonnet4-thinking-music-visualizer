import * as THREE from 'three';
import { BaseVisualizationMode, VisualizationData } from '../types';
import { VisualizationMode } from '../../../shared/types';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { FilmPass } from 'three/examples/jsm/postprocessing/FilmPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

interface WireframeConfig {
  activePaletteIndex: number;
  isMorphed: boolean;
  morphProgress: number;
}

interface MorphableGeometries {
  sphereNodePositions: number[];
  starNodePositions: number[];
  sphereConnectionPositions: Float32Array;
  starConnectionPositions: Float32Array;
}

export class WireframeGeometryMode extends BaseVisualizationMode {
  private config: WireframeConfig = {
    activePaletteIndex: 1,
    isMorphed: false,
    morphProgress: 0,
  };

  private colorPalettes: THREE.Color[][] = [
    [new THREE.Color(0x4F46E5), new THREE.Color(0x7C3AED), new THREE.Color(0xC026D3), new THREE.Color(0xDB2777)],
    [new THREE.Color(0xF59E0B), new THREE.Color(0xF97316), new THREE.Color(0xDC2626), new THREE.Color(0x7F1D1D)],
    [new THREE.Color(0x10B981), new THREE.Color(0xA3E635), new THREE.Color(0xFACC15), new THREE.Color(0xFB923C)]
  ];

  private starField: THREE.Points | null = null;
  private composer: EffectComposer | null = null;
  private morphableGeometries: MorphableGeometries | null = null;
  private nodesMesh: THREE.Points | null = null;
  private connectionsMesh: THREE.LineSegments | null = null;
  private clock: THREE.Clock = new THREE.Clock();
  
  // Audio-driven pulse system
  private lastPulseIndex: number = 0;
  private lastBeatTime: number = 0;
  private lastAmbientPulse: number = 0;
  private ambientPulseInterval: number = 3000; // 3 seconds
  
  private pulseUniforms = {
    uTime: { value: 0.0 },
    uPulsePositions: { value: [new THREE.Vector3(1e3, 1e3, 1e3), new THREE.Vector3(1e3, 1e3, 1e3), new THREE.Vector3(1e3, 1e3, 1e3)] },
    uPulseTimes: { value: [-1e3, -1e3, -1e3] },
    uPulseSpeed: { value: 15.0 },
  };

  private sharedShaderCode = `
    uniform float uTime;
    uniform vec3 uPulsePositions[3];
    uniform float uPulseTimes[3];
    uniform float uPulseSpeed;
    float getPulseIntensity(vec3 worldPos) {
      float totalIntensity = 0.0;
      for (int i = 0; i < 3; i++) {
        if (uPulseTimes[i] < 0.0) continue;
        float timeSinceClick = uTime - uPulseTimes[i];
        if (timeSinceClick < 0.0 || timeSinceClick > 3.5) continue;
        float pulseRadius = timeSinceClick * uPulseSpeed;
        float distToClick = distance(worldPos, uPulsePositions[i]);
        float pulseThickness = 4.0;
        float waveProximity = abs(distToClick - pulseRadius);
        totalIntensity += smoothstep(pulseThickness, 0.0, waveProximity) * smoothstep(3.5, 0.0, timeSinceClick);
      }
      return min(totalIntensity, 1.0);
    }`;

  private nodeShader = {
    vertexShader: `
      ${this.sharedShaderCode}
      attribute vec3 color;
      varying vec3 vColor;
      varying float vPulseIntensity;
      #include <morphtarget_pars_vertex>
      void main() {
        vColor = color;
        vec3 transformed = vec3(position);
        #include <morphtarget_vertex>
        vec3 worldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
        vPulseIntensity = getPulseIntensity(worldPos);
        float pointSize = 1.0 + vPulseIntensity * 5.0;
        vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.0);
        gl_PointSize = pointSize * (200.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
      }`,
    fragmentShader: `
      varying vec3 vColor;
      varying float vPulseIntensity;
      void main() {
        float dist = length(gl_PointCoord - vec2(0.5));
        if (dist > 0.5) discard;
        vec3 finalColor = vColor;
        if (vPulseIntensity > 0.0) {
          finalColor = mix(vColor, vec3(1.0), vPulseIntensity);
          finalColor *= (1.0 + vPulseIntensity * 0.5);
        }
        float alpha = (1.0 - dist * 2.0) * (1.0 + vPulseIntensity);
        gl_FragColor = vec4(finalColor, alpha);
      }`
  };

  private connectionShader = {
    vertexShader: `
      ${this.sharedShaderCode}
      attribute vec3 color;
      varying vec3 vColor;
      varying float vPulseIntensity;
      #include <morphtarget_pars_vertex>
      void main() {
        vColor = color;
        vec3 transformed = vec3(position);
        #include <morphtarget_vertex>
        vec3 worldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
        vPulseIntensity = getPulseIntensity(worldPos);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
      }`,
    fragmentShader: `
      varying vec3 vColor;
      varying float vPulseIntensity;
      void main() {
        vec3 finalColor = vColor;
        if (vPulseIntensity > 0.0) {
          finalColor = mix(vColor, vec3(1.0), vPulseIntensity);
          finalColor *= (1.0 + vPulseIntensity * 0.5);
        }
        gl_FragColor = vec4(finalColor, 0.3 + vPulseIntensity * 0.7);
      }`
  };

  protected getModeType(): VisualizationMode {
    return VisualizationMode.WIREFRAME_GEOMETRY;
  }

  public async init(): Promise<void> {
    try {
      // Set up fog
      this.scene.fog = new THREE.FogExp2(0x000000, 0.002);
      
      // Create star field
      this.createStarField();
      
      // Create post-processing
      this.setupPostProcessing();
      
      // Create morphable geometries
      this.createMorphableGeometries();
      
      // Create visualization
      this.createVisualization();
      
      console.log('WireframeGeometryMode initialized');
    } catch (error) {
      console.error('Failed to initialize WireframeGeometryMode:', error);
      throw error;
    }
  }

  private createStarField(): void {
    const starGeometry = new THREE.BufferGeometry();
    const starPositions = new Float32Array(5000 * 3);
    
    for (let i = 0; i < starPositions.length; i += 3) {
      starPositions[i] = THREE.MathUtils.randFloatSpread(200);
      starPositions[i + 1] = THREE.MathUtils.randFloatSpread(200);
      starPositions[i + 2] = THREE.MathUtils.randFloatSpread(200);
    }
    
    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
    
    const starMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.15,
      sizeAttenuation: true,
      depthWrite: false,
      opacity: 0.8,
      transparent: true
    });
    
    this.starField = new THREE.Points(starGeometry, starMaterial);
    this.scene.add(this.starField);
  }

  private setupPostProcessing(): void {
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      1.3,
      0.3,
      0.7
    );
    this.composer.addPass(bloomPass);
    
    this.composer.addPass(new FilmPass(0.25, false));
    this.composer.addPass(new OutputPass());
  }

  private createMorphableGeometries(): void {
    const scale = 15;
    const baseGeometry = new THREE.IcosahedronGeometry(scale, 5);
    const sphereVertices: THREE.Vector3[] = [];
    const spherePositions = baseGeometry.attributes.position.array;

    const uniqueVerticesMap = new Map<string, THREE.Vector3>();
    for (let i = 0; i < spherePositions.length; i += 3) {
      const key = `${spherePositions[i].toFixed(3)},${spherePositions[i+1].toFixed(3)},${spherePositions[i+2].toFixed(3)}`;
      if (!uniqueVerticesMap.has(key)) {
        const vertex = new THREE.Vector3(spherePositions[i], spherePositions[i+1], spherePositions[i+2]);
        uniqueVerticesMap.set(key, vertex);
        sphereVertices.push(vertex);
      }
    }
    
    const starVertices = sphereVertices.map(v => {
      const v_clone = v.clone();
      const spherical = new THREE.Spherical().setFromVector3(v_clone);
      const spikeFactor = 0.4 * Math.sin(spherical.phi * 6) * Math.sin(spherical.theta * 6);
      spherical.radius *= 1 + spikeFactor;
      return new THREE.Vector3().setFromSpherical(spherical);
    });
    
    const edgeGeometry = new THREE.EdgesGeometry(baseGeometry, 1);
    const sphereConnectionPositions = edgeGeometry.attributes.position.array as Float32Array;
    const starConnectionPositions = new Float32Array(sphereConnectionPositions.length);
    
    const tempVec = new THREE.Vector3();
    for (let i = 0; i < sphereConnectionPositions.length; i += 3) {
      tempVec.set(sphereConnectionPositions[i], sphereConnectionPositions[i+1], sphereConnectionPositions[i+2]);
      const spherical = new THREE.Spherical().setFromVector3(tempVec);
      const spikeFactor = 0.4 * Math.sin(spherical.phi * 6) * Math.sin(spherical.theta * 6);
      spherical.radius *= 1 + spikeFactor;
      tempVec.setFromSpherical(spherical);
      starConnectionPositions[i] = tempVec.x;
      starConnectionPositions[i+1] = tempVec.y;
      starConnectionPositions[i+2] = tempVec.z;
    }

    this.morphableGeometries = {
      sphereNodePositions: sphereVertices.flatMap(v => [v.x, v.y, v.z]),
      starNodePositions: starVertices.flatMap(v => [v.x, v.y, v.z]),
      sphereConnectionPositions,
      starConnectionPositions
    };
  }

  private createVisualization(): void {
    if (!this.morphableGeometries) return;
    
    if (this.nodesMesh) this.scene.remove(this.nodesMesh);
    if (this.connectionsMesh) this.scene.remove(this.connectionsMesh);

    const palette = this.colorPalettes[this.config.activePaletteIndex];
    
    // Create nodes
    const nodeGeometry = new THREE.BufferGeometry();
    nodeGeometry.setAttribute('position', new THREE.Float32BufferAttribute(this.morphableGeometries.sphereNodePositions, 3));
    nodeGeometry.morphAttributes.position = [new THREE.Float32BufferAttribute(this.morphableGeometries.starNodePositions, 3)];
    
    const nodeColors = new Float32Array(this.morphableGeometries.sphereNodePositions.length);
    for (let i = 0; i < this.morphableGeometries.sphereNodePositions.length / 3; i++) {
      const color = palette[Math.floor(Math.random() * palette.length)];
      nodeColors[i*3] = color.r;
      nodeColors[i*3+1] = color.g;
      nodeColors[i*3+2] = color.b;
    }
    nodeGeometry.setAttribute('color', new THREE.Float32BufferAttribute(nodeColors, 3));
    
    const nodeMaterial = new THREE.ShaderMaterial({
      uniforms: this.pulseUniforms,
      vertexShader: this.nodeShader.vertexShader,
      fragmentShader: this.nodeShader.fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    
    this.nodesMesh = new THREE.Points(nodeGeometry, nodeMaterial);
    this.nodesMesh.morphTargetInfluences = [0];
    this.scene.add(this.nodesMesh);

    // Create connections
    const connectionGeometry = new THREE.BufferGeometry();
    connectionGeometry.setAttribute('position', new THREE.Float32BufferAttribute(this.morphableGeometries.sphereConnectionPositions, 3));
    connectionGeometry.morphAttributes.position = [new THREE.Float32BufferAttribute(this.morphableGeometries.starConnectionPositions, 3)];
    
    const connectionColors = [];
    for(let i = 0; i < this.morphableGeometries.sphereConnectionPositions.length / 6; i++) {
      const color = palette[Math.floor(Math.random() * palette.length)];
      connectionColors.push(color.r, color.g, color.b, color.r, color.g, color.b);
    }
    connectionGeometry.setAttribute('color', new THREE.Float32BufferAttribute(connectionColors, 3));
    
    const connectionMaterial = new THREE.ShaderMaterial({
      uniforms: this.pulseUniforms,
      vertexShader: this.connectionShader.vertexShader,
      fragmentShader: this.connectionShader.fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    
    this.connectionsMesh = new THREE.LineSegments(connectionGeometry, connectionMaterial);
    this.connectionsMesh.morphTargetInfluences = [0];
    this.scene.add(this.connectionsMesh);
  }

  private triggerPulse(intensity: number = 1.0): void {
    // Generate random position on sphere surface
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const radius = 15; // Match geometry scale
    
    const pulsePosition = new THREE.Vector3(
      radius * Math.sin(phi) * Math.cos(theta),
      radius * Math.sin(phi) * Math.sin(theta),
      radius * Math.cos(phi)
    );
    
    const time = this.clock.getElapsedTime();
    this.lastPulseIndex = (this.lastPulseIndex + 1) % 3;
    this.pulseUniforms.uPulsePositions.value[this.lastPulseIndex].copy(pulsePosition);
    this.pulseUniforms.uPulseTimes.value[this.lastPulseIndex] = time;
    
    // Adjust pulse speed based on intensity
    this.pulseUniforms.uPulseSpeed.value = 15.0 * (0.5 + intensity * 0.5);
  }

  private updateTheme(paletteIndex: number): void {
    this.config.activePaletteIndex = paletteIndex;
    if (!this.nodesMesh || !this.connectionsMesh) return;
    
    const palette = this.colorPalettes[this.config.activePaletteIndex];
    
    // Update node colors
    const nodeColors = this.nodesMesh.geometry.attributes.color.array as Float32Array;
    for (let i = 0; i < nodeColors.length / 3; i++) {
      const color = palette[Math.floor(Math.random() * palette.length)];
      nodeColors[i*3] = color.r;
      nodeColors[i*3+1] = color.g;
      nodeColors[i*3+2] = color.b;
    }
    this.nodesMesh.geometry.attributes.color.needsUpdate = true;
    
    // Update connection colors
    const connectionColors = this.connectionsMesh.geometry.attributes.color.array as Float32Array;
    for(let i = 0; i < connectionColors.length / 6; i++) {
      const color = palette[Math.floor(Math.random() * palette.length)];
      connectionColors[i*6] = connectionColors[i*6+3] = color.r;
      connectionColors[i*6+1] = connectionColors[i*6+4] = color.g;
      connectionColors[i*6+2] = connectionColors[i*6+5] = color.b;
    }
    this.connectionsMesh.geometry.attributes.color.needsUpdate = true;
  }

  public update(data: VisualizationData): void {
    if (!this.isActive) return;
    
    const { audio, totalTime } = data;
    const t = this.clock.getElapsedTime();
    
    // Update uniforms
    this.pulseUniforms.uTime.value = t;
    
    // Audio-driven pulse generation
    this.handleAudioPulses(audio, totalTime);
    
    // Handle morphing based on audio intensity
    this.handleMorphing(audio);
    
    // Handle theme changes based on spectral features
    this.handleThemeChanges(audio);
    
    // Rotate star field slowly
    if (this.starField) {
      this.starField.rotation.y += 0.0001;
    }
  }

  private handleAudioPulses(audio: any, totalTime: number): void {
    // Beat-driven pulses
    if (audio.beat && audio.confidence > 0.7 && totalTime - this.lastBeatTime > 200) {
      this.triggerPulse(audio.volume * 2.0);
      this.lastBeatTime = totalTime;
    }
    
    // Volume-based pulses
    if (audio.volume > 0.6 && Math.random() < 0.3) {
      this.triggerPulse(audio.volume);
    }
    
    // Ambient pulses for visual interest
    if (totalTime - this.lastAmbientPulse > this.ambientPulseInterval) {
      this.triggerPulse(0.3);
      this.lastAmbientPulse = totalTime;
      this.ambientPulseInterval = 2000 + Math.random() * 3000; // 2-5 seconds
    }
  }

  private handleMorphing(audio: any): void {
    // Morph based on high-frequency content
    const highFreqEnergy = audio.spectralCentroid / 4000; // Normalize
    const targetMorph = highFreqEnergy > 0.5 ? 1 : 0;
    this.config.isMorphed = targetMorph === 1;
    
    // Smooth morphing
    const morphTarget = this.config.isMorphed ? 1 : 0;
    this.config.morphProgress = THREE.MathUtils.lerp(this.config.morphProgress, morphTarget, 0.05);
    
    if (this.nodesMesh && this.connectionsMesh) {
      this.nodesMesh.morphTargetInfluences![0] = this.config.morphProgress;
      this.connectionsMesh.morphTargetInfluences![0] = this.config.morphProgress;
    }
  }

  private handleThemeChanges(audio: any): void {
    // Change theme based on spectral rolloff
    const rolloffNormalized = (audio.spectralRolloff / 8000); // Normalize to 0-1
    const newPaletteIndex = Math.floor(rolloffNormalized * this.colorPalettes.length) % this.colorPalettes.length;
    
    if (newPaletteIndex !== this.config.activePaletteIndex && Math.random() < 0.01) {
      this.updateTheme(newPaletteIndex);
    }
  }

  public resize(width: number, height: number): void {
    if (this.composer) {
      this.composer.setSize(width, height);
    }
  }

  protected onActivate(): void {
    console.log('WireframeGeometryMode activated');
  }

  protected onDeactivate(): void {
    console.log('WireframeGeometryMode deactivated');
  }

  public dispose(): void {
    // Dispose geometries and materials
    if (this.nodesMesh) {
      this.scene.remove(this.nodesMesh);
      this.nodesMesh.geometry.dispose();
      (this.nodesMesh.material as THREE.Material).dispose();
      this.nodesMesh = null;
    }
    
    if (this.connectionsMesh) {
      this.scene.remove(this.connectionsMesh);
      this.connectionsMesh.geometry.dispose();
      (this.connectionsMesh.material as THREE.Material).dispose();
      this.connectionsMesh = null;
    }
    
    if (this.starField) {
      this.scene.remove(this.starField);
      this.starField.geometry.dispose();
      (this.starField.material as THREE.Material).dispose();
      this.starField = null;
    }
    
    if (this.composer) {
      this.composer.dispose();
      this.composer = null;
    }
    
    console.log('WireframeGeometryMode disposed');
  }

  // Override the render method to use composer
  public render(): void {
    if (this.composer) {
      this.composer.render();
    }
  }
}
