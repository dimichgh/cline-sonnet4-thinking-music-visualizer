import { SceneManager } from './SceneManager';
import { BaseVisualizationMode, VisualizationConfig, VisualizationData, VisualizationManagerEvents, ModeTransition, PerformanceMetrics } from './types';
import { VisualizationMode, AudioAnalysisData } from '../../shared/types';

export class VisualizationManager extends EventTarget {
  private sceneManager: SceneManager;
  private modes: Map<VisualizationMode, BaseVisualizationMode> = new Map();
  private currentMode: BaseVisualizationMode | null = null;
  private activeMode: VisualizationMode = VisualizationMode.PSYCHEDELIC;
  private isInitialized: boolean = false;
  private isRunning: boolean = false;
  private animationFrameId: number | null = null;
  private lastFrameTime: number = 0;
  private transition: ModeTransition | null = null;

  constructor(config: VisualizationConfig) {
    super();
    this.sceneManager = new SceneManager(config);
    this.setupPerformanceMonitoring();
  }

  private setupPerformanceMonitoring(): void {
    this.sceneManager.setPerformanceCallback((metrics: PerformanceMetrics) => {
      this.dispatchEvent(new CustomEvent('performanceUpdate', { detail: metrics }));
    });
  }

  public async init(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Setup basic lighting for all modes
      this.sceneManager.addLighting();

      // Register all visualization modes
      await this.registerAllModes();
      
      // Set initial mode
      await this.setMode(VisualizationMode.PSYCHEDELIC);
      
      this.isInitialized = true;
      console.log('VisualizationManager initialized successfully');
    } catch (error) {
      console.error('Failed to initialize VisualizationManager:', error);
      this.dispatchEvent(new CustomEvent('error', { detail: error as Error }));
      throw error;
    }
  }

  private async registerAllModes(): Promise<void> {
    // Test with just one simple mode first to isolate memory issues
    const { PsychedelicMode } = await import('./modes/PsychedelicMode');

    // Create and register only the simplest mode
    const scene = this.sceneManager.getScene();
    const camera = this.sceneManager.getCamera();
    const renderer = this.sceneManager.getRenderer();

    this.registerMode(new PsychedelicMode(scene, camera, renderer));

    console.log('Single mode registered for memory testing with Electron 37.2.0');
  }

  public registerMode(mode: BaseVisualizationMode): void {
    const modeType = mode.getMode();
    this.modes.set(modeType, mode);
    console.log(`Registered visualization mode: ${modeType}`);
  }

  public async setMode(mode: VisualizationMode): Promise<void> {
    if (!this.isInitialized) {
      await this.init();
    }

    if (mode === this.activeMode) {
      return; // Already in this mode
    }

    const newMode = this.modes.get(mode);
    if (!newMode) {
      throw new Error(`Visualization mode '${mode}' is not registered`);
    }

    try {
      // Start transition
      this.transition = {
        from: this.activeMode,
        to: mode,
        progress: 0,
        duration: 1000 // 1 second transition
      };

      // Deactivate current mode
      if (this.currentMode) {
        this.currentMode.deactivate();
        this.sceneManager.clear();
      }

      // Initialize and activate new mode
      await newMode.init();
      newMode.activate();
      
      this.currentMode = newMode;
      this.activeMode = mode;
      this.transition = null;

      this.dispatchEvent(new CustomEvent('modeChanged', { detail: mode }));
      console.log(`Switched to visualization mode: ${mode}`);
    } catch (error) {
      console.error(`Failed to switch to mode '${mode}':`, error);
      this.dispatchEvent(new CustomEvent('error', { detail: error as Error }));
      throw error;
    }
  }

  public getCurrentMode(): VisualizationMode {
    return this.activeMode;
  }

  public start(): void {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.lastFrameTime = performance.now();
    this.animate();
    console.log('Visualization started');
  }

  public stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    console.log('Visualization stopped');
  }

  public update(audioData: AudioAnalysisData): void {
    if (!this.currentMode || !this.isRunning) {
      return;
    }

    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastFrameTime;

    const visualizationData: VisualizationData = {
      audio: audioData,
      deltaTime: deltaTime,
      totalTime: currentTime
    };

    // Update current mode
    this.currentMode.update(visualizationData);

    // Handle transitions if in progress
    if (this.transition) {
      this.updateTransition(deltaTime);
    }
  }

  private updateTransition(deltaTime: number): void {
    if (!this.transition) {
      return;
    }

    this.transition.progress += deltaTime / this.transition.duration;
    
    if (this.transition.progress >= 1) {
      // Transition complete
      this.transition = null;
    }
  }

  private animate = (): void => {
    if (!this.isRunning) {
      return;
    }

    const currentTime = performance.now();
    this.lastFrameTime = currentTime;

    // Render the scene
    this.sceneManager.render();

    // Schedule next frame
    this.animationFrameId = requestAnimationFrame(this.animate);
  };

  public resize(width: number, height: number): void {
    this.sceneManager.resize(width, height);
    
    // Notify current mode of resize
    if (this.currentMode) {
      this.currentMode.resize(width, height);
    }
  }

  public dispose(): void {
    this.stop();

    // Dispose all modes
    for (const mode of this.modes.values()) {
      mode.dispose();
    }
    this.modes.clear();

    // Dispose scene manager
    this.sceneManager.dispose();

    this.currentMode = null;
    this.isInitialized = false;
    
    console.log('VisualizationManager disposed');
  }

  // Convenience methods for mode switching
  public switchToPsychedelic(): Promise<void> {
    return this.setMode(VisualizationMode.PSYCHEDELIC);
  }

  public switchToDigitalEarth(): Promise<void> {
    return this.setMode(VisualizationMode.DIGITAL_EARTH);
  }

  public switchToBlackHole(): Promise<void> {
    return this.setMode(VisualizationMode.BLACK_HOLE);
  }

  public switchToTronCity(): Promise<void> {
    return this.setMode(VisualizationMode.TRON_CITY);
  }

  // Debug and utility methods
  public getSceneManager(): SceneManager {
    return this.sceneManager;
  }

  public getRegisteredModes(): VisualizationMode[] {
    return Array.from(this.modes.keys());
  }

  public isTransitioning(): boolean {
    return this.transition !== null;
  }
}

// Type-safe event emitter interface
export interface VisualizationManager {
  on<U extends keyof VisualizationManagerEvents>(
    event: U, 
    listener: VisualizationManagerEvents[U]
  ): this;
  
  emit<U extends keyof VisualizationManagerEvents>(
    event: U, 
    ...args: Parameters<VisualizationManagerEvents[U]>
  ): boolean;
}
