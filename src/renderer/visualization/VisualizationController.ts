import { AudioAnalysisData, VisualizationMode } from '@shared/types';
import { WireframeGeometryMode } from './modes/WireframeGeometryMode';
import { StarFieldEffect } from './effects/StarFieldEffect';
import { ElectricalArcsEffect } from './effects/ElectricalArcsEffect';
import { EarthEffects } from './effects/EarthEffects';

/**
 * Main visualization controller that orchestrates Three.js scene and effects
 */
export class VisualizationController {
  private canvas: HTMLCanvasElement;
  private scene: any = null;
  private camera: any = null;
  private renderer: any = null;
  private composer: any = null;
  
  // Effect modules
  private starFieldEffect = new StarFieldEffect();
  private electricalArcsEffect = new ElectricalArcsEffect();
  private earthEffects = new EarthEffects();
  
  // Scene objects
  private earthGroup: any = null;
  private bloomStars: any = null;
  private backgroundStars: any = null;
  
  // Mode management
  private currentMode: VisualizationMode = VisualizationMode.DIGITAL_EARTH;
  private wireframeMode: WireframeGeometryMode | null = null;
  
  // Animation state
  private time = 0;
  private animationId: number | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }

  public async initialize(): Promise<void> {
    try {
      console.log('Initializing Three.js visualization controller...');
      
      // Import Three.js and post-processing modules
      const THREE = await import('three');
      const { EffectComposer } = await import('three/examples/jsm/postprocessing/EffectComposer.js');
      const { RenderPass } = await import('three/examples/jsm/postprocessing/RenderPass.js');
      const { UnrealBloomPass } = await import('three/examples/jsm/postprocessing/UnrealBloomPass.js');
      console.log('Three.js modules imported successfully');
      
      // Create scene
      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(0x000005);
      console.log('Scene created');
      
      // Create camera
      this.camera = new THREE.PerspectiveCamera(
        75,
        this.canvas.width / this.canvas.height,
        0.1,
        1000
      );
      this.camera.position.set(0, 0, 10);
      this.camera.lookAt(0, 0, 0);
      console.log('Camera created and positioned');
      
      // Create renderer
      this.renderer = new THREE.WebGLRenderer({ 
        canvas: this.canvas,
        antialias: true,
        powerPreference: 'high-performance'
      });
      this.renderer.setSize(this.canvas.width, this.canvas.height);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      this.renderer.setClearColor(0x000005, 1);
      console.log('WebGL Renderer created successfully');
      
      // Set up post-processing pipeline for bloom glow
      this.composer = new EffectComposer(this.renderer);
      
      // Main render pass
      const renderPass = new RenderPass(this.scene, this.camera);
      this.composer.addPass(renderPass);
      
      // Bloom pass for glow effect
      const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(this.canvas.width, this.canvas.height),
        4.0,  // strength - high for intense glow
        1.2,  // radius - larger for softer spread
        0.01  // threshold - low to catch bright areas
      );
      this.composer.addPass(bloomPass);
      console.log('Post-processing bloom pipeline initialized');
      
      // Store globally for resize handling
      (window as any).visualizationCamera = this.camera;
      (window as any).visualizationRenderer = this.renderer;
      (window as any).visualizationComposer = this.composer;
      (window as any).visualizationBloomPass = bloomPass;
      
      // Create scene objects
      await this.createSceneObjects(THREE);
      
      // Start animation loop
      this.startAnimation();
      
      console.log('Visualization controller initialized successfully!');
      
    } catch (error) {
      console.error('Failed to initialize visualization controller:', error);
      throw error;
    }
  }

  public updateAudioData(audioData: AudioAnalysisData | null): void {
    // This will be used in the animation loop
    (this as any).currentAudioData = audioData;
  }

  public start(): void {
    if (!this.animationId) {
      this.startAnimation();
    }
  }

  public stop(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  public async setMode(mode: VisualizationMode): Promise<void> {
    console.log('VisualizationController switching to mode:', mode);
    this.currentMode = mode;
    
    if (mode === VisualizationMode.WIREFRAME_GEOMETRY) {
      // Clear existing scene objects
      this.clearEarthObjects();
      
      // Initialize wireframe mode if not already created
      if (!this.wireframeMode) {
        this.wireframeMode = new WireframeGeometryMode(this.scene, this.camera, this.renderer);
        await this.wireframeMode.init();
      }
      
      // Activate wireframe mode
      this.wireframeMode.activate();
      console.log('Switched to WireframeGeometryMode');
    } else {
      // Deactivate wireframe mode if active
      if (this.wireframeMode) {
        this.wireframeMode.deactivate();
      }
      
      // Restore earth visualization
      await this.restoreEarthObjects();
      console.log('Switched to Digital Earth mode');
    }
  }

  private clearEarthObjects(): void {
    if (this.earthGroup) {
      this.scene.remove(this.earthGroup);
    }
  }

  private async restoreEarthObjects(): Promise<void> {
    if (!this.earthGroup) {
      // Re-create earth objects if they don't exist
      const THREE = await import('three');
      this.earthGroup = this.earthEffects.createEarthSphere(THREE);
      this.earthEffects.createContinentBars(THREE, this.earthGroup);
    }
    
    if (this.earthGroup && !this.scene.children.includes(this.earthGroup)) {
      this.scene.add(this.earthGroup);
    }
  }

  public destroy(): void {
    this.stop();
    
    // Clean up wireframe mode
    if (this.wireframeMode) {
      this.wireframeMode.dispose();
      this.wireframeMode = null;
    }
    
    // Clean up Three.js resources
    if (this.scene) {
      this.scene.clear();
    }
    if (this.renderer) {
      this.renderer.dispose();
    }
    if (this.composer) {
      this.composer.dispose();
    }
  }

  private async createSceneObjects(THREE: any): Promise<void> {
    console.log('Creating scene objects...');
    
    // 1. Create dual-layer star system
    const { bloomStars, backgroundStars } = this.starFieldEffect.createDualLayerStarField(THREE);
    this.scene.add(backgroundStars); // Add background first (behind)
    this.scene.add(bloomStars);      // Add bloom on top
    this.bloomStars = bloomStars;
    this.backgroundStars = backgroundStars;
    console.log('Dual-layer star field added');
    
    // 2. Create Earth sphere with effects
    this.earthGroup = this.earthEffects.createEarthSphere(THREE);
    this.scene.add(this.earthGroup);
    console.log('Earth sphere added');
    
    // 3. Create continent bars for music visualization
    this.earthEffects.createContinentBars(THREE, this.earthGroup);
    console.log('Continent bars added');
  }

  private updateWireframeMode(audioData: AudioAnalysisData | null): void {
    if (this.wireframeMode) {
      // Create default audio data if none provided (for ambient mode)
      const defaultAudioData: AudioAnalysisData = {
        frequencies: new Float32Array(128),
        timeDomain: new Float32Array(128),
        frequencyBins: [],
        volume: 0.1,
        rms: 0.05,
        peak: 0.1,
        beat: false,
        tempo: 0,
        confidence: 0,
        spectralCentroid: 0,
        spectralRolloff: 0,
        zeroCrossingRate: 0,
        detectedInstruments: [],
        timestamp: Date.now()
      };

      const visualizationData = {
        audio: audioData || defaultAudioData,
        deltaTime: 16.67, // ~60fps
        totalTime: this.time * 1000
      };
      this.wireframeMode.update(visualizationData);
    }
  }

  private updateEarthMode(audioData: AudioAnalysisData | null): void {
    // Earth rotation
    if (this.earthGroup) {
      this.earthGroup.rotation.y += 0.005;
    }
    
    // Import THREE for effects
    const THREE = (window as any).THREE || require('three');
    
    if (audioData) {
      // Scale earth on beat
      const scale = 1 + audioData.volume * 0.2;
      if (this.earthGroup) {
        this.earthGroup.scale.setScalar(scale);
        this.earthGroup.rotation.y += audioData.volume * 0.01;
      }
      
      // Update star field with music reactivity
      this.starFieldEffect.rotateWithAudio(audioData);
      if (this.backgroundStars) {
        this.starFieldEffect.updateStarField(THREE, this.backgroundStars, audioData);
      }
      
      // Update electrical arcs (now circular rings)
      this.electricalArcsEffect.updateElectricalArcs(THREE, this.scene, audioData, this.time);
      
      // Update continent bars with music rhythm
      this.earthEffects.updateContinentBars(THREE, audioData, this.time);
      
      // Update meridian signals
      this.earthEffects.updateMeridianSignals(THREE, this.scene, audioData, this.time);
    } else {
      // Update effects without audio
      this.electricalArcsEffect.updateElectricalArcs(THREE, this.scene, null, this.time);
    }
  }

  private startAnimation(): void {
    const animate = () => {
      this.animationId = requestAnimationFrame(animate);
      this.time += 0.01;
      
      const audioData = (this as any).currentAudioData as AudioAnalysisData | null;
      
      // Route updates based on current mode
      if (this.currentMode === VisualizationMode.WIREFRAME_GEOMETRY) {
        this.updateWireframeMode(audioData);
      } else {
        this.updateEarthMode(audioData);
      }
      
      // Always update star field
      this.starFieldEffect.rotateStarFields();
      if (audioData) {
        this.starFieldEffect.rotateWithAudio(audioData);
        if (this.backgroundStars) {
          this.starFieldEffect.updateStarField(THREE, this.backgroundStars, audioData);
        }
      }
      
      // Render with post-processing
      if (this.composer) {
        this.composer.render();
      }
    };
    
    // Import THREE for the animation loop (it's available globally after initialization)
    const THREE = (window as any).THREE || require('three');
    animate();
  }
}
