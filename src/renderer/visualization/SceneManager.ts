import * as THREE from 'three';
import { VisualizationConfig, PerformanceMetrics } from './types';

export class SceneManager {
  private canvas: HTMLCanvasElement;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private clock!: THREE.Clock;
  private frameCount: number = 0;
  private lastPerformanceUpdate: number = 0;
  private performanceCallback: ((metrics: PerformanceMetrics) => void) | undefined = undefined;

  constructor(config: VisualizationConfig) {
    console.log('SceneManager: Constructor started');
    this.canvas = config.canvas;
    console.log('SceneManager: Canvas assigned, about to call initThreeJS');
    this.initThreeJS(config);
    console.log('SceneManager: Constructor completed successfully');
  }

  private initThreeJS(config: VisualizationConfig): void {
    // Create scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);

    // Create camera
    this.camera = new THREE.PerspectiveCamera(
      75, // FOV
      config.width / config.height, // aspect ratio
      0.1, // near plane
      1000 // far plane
    );
    this.camera.position.set(0, 0, 5);

    // Try WebGL first, fallback to Canvas if OOM
    console.log('SceneManager: Attempting WebGL renderer with ultra-conservative settings...');
    try {
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        alpha: false,              
        antialias: false,          
        powerPreference: 'low-power', 
        preserveDrawingBuffer: false,  
        stencil: false,            
        depth: false,              // Disable depth buffer to save memory
        logarithmicDepthBuffer: false,
        precision: 'lowp'          // Use low precision
      });
      console.log('SceneManager: WebGL renderer created successfully with ultra-conservative settings');
    } catch (error) {
      console.log('SceneManager: WebGL failed, falling back to basic renderer:', (error as Error).message);
      // Fallback to minimal renderer
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        alpha: false,
        antialias: false,
        powerPreference: 'low-power'
      });
    }

    this.renderer.setSize(config.width, config.height);
    // Cap pixel ratio to reduce memory usage
    this.renderer.setPixelRatio(Math.min(config.pixelRatio, 2));
    console.log('SceneManager: Renderer size and pixel ratio set');
    
    // Start with basic settings, enable advanced features later if needed
    this.renderer.shadowMap.enabled = false; // Disable initially to save memory
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1;
    console.log('SceneManager: Basic renderer features configured');

    // Create clock for timing
    this.clock = new THREE.Clock();

    // Setup performance monitoring
    this.setupPerformanceMonitoring();
  }

  private setupPerformanceMonitoring(): void {
    // Monitor performance every second
    setInterval(() => {
      if (this.performanceCallback) {
        const metrics = this.getPerformanceMetrics();
        this.performanceCallback(metrics);
      }
    }, 1000);
  }

  public getScene(): THREE.Scene {
    return this.scene;
  }

  public getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }

  public getRenderer(): THREE.WebGLRenderer {
    return this.renderer;
  }

  public getClock(): THREE.Clock {
    return this.clock;
  }

  public resize(width: number, height: number): void {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  public render(): void {
    this.renderer.render(this.scene, this.camera);
    this.frameCount++;
  }

  public clear(): void {
    // Remove all objects from scene
    while (this.scene.children.length > 0) {
      const child = this.scene.children[0];
      if (child) {
        this.scene.remove(child);
        
        // Dispose of geometries and materials
        if (child instanceof THREE.Mesh) {
          if (child.geometry) {
            child.geometry.dispose();
          }
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach(material => material.dispose());
            } else {
              child.material.dispose();
            }
          }
        }
      }
    }
  }

  public setPerformanceCallback(callback: (metrics: PerformanceMetrics) => void): void {
    this.performanceCallback = callback;
  }

  private getPerformanceMetrics(): PerformanceMetrics {
    const now = performance.now();
    const timeDelta = now - this.lastPerformanceUpdate;
    const fps = timeDelta > 0 ? (this.frameCount * 1000) / timeDelta : 0;
    
    // Reset counters
    this.frameCount = 0;
    this.lastPerformanceUpdate = now;

    const info = this.renderer.info;
    
    return {
      fps: Math.round(fps),
      frameTime: timeDelta / 60, // approximate frame time
      memoryUsage: this.getMemoryUsage(),
      drawCalls: info.render.calls,
      triangles: info.render.triangles
    };
  }

  private getMemoryUsage(): number {
    // @ts-ignore - performance.memory is not in standard TypeScript types
    if (performance.memory) {
      // @ts-ignore
      return performance.memory.usedJSHeapSize / 1024 / 1024; // MB
    }
    return 0;
  }

  public dispose(): void {
    this.clear();
    this.renderer.dispose();
    this.performanceCallback = undefined;
  }

  // Utility methods for common setup tasks
  public addLighting(): void {
    // Ambient light for general illumination
    const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
    this.scene.add(ambientLight);

    // Directional light for shadows and definition
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    this.scene.add(directionalLight);
  }

  public setCameraPosition(x: number, y: number, z: number): void {
    this.camera.position.set(x, y, z);
  }

  public setCameraTarget(x: number, y: number, z: number): void {
    this.camera.lookAt(x, y, z);
  }
}
