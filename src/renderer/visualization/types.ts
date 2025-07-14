import { Scene, Camera, WebGLRenderer } from 'three';
import { AudioAnalysisData, VisualizationMode } from '../../shared/types';

export interface VisualizationConfig {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  pixelRatio: number;
}

export interface VisualizationData {
  audio: AudioAnalysisData;
  deltaTime: number;
  totalTime: number;
}

export interface ModeTransition {
  from: VisualizationMode;
  to: VisualizationMode;
  progress: number; // 0 to 1
  duration: number; // in milliseconds
}

export interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  memoryUsage: number;
  drawCalls: number;
  triangles: number;
}

export abstract class BaseVisualizationMode {
  protected scene: Scene;
  protected camera: Camera;
  protected renderer: WebGLRenderer;
  protected isActive: boolean = false;

  constructor(scene: Scene, camera: Camera, renderer: WebGLRenderer) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
  }

  abstract init(): Promise<void>;
  abstract update(data: VisualizationData): void;
  abstract resize(width: number, height: number): void;
  abstract dispose(): void;

  activate(): void {
    this.isActive = true;
    this.onActivate();
  }

  deactivate(): void {
    this.isActive = false;
    this.onDeactivate();
  }

  protected onActivate(): void {
    // Override in subclasses if needed
  }

  protected onDeactivate(): void {
    // Override in subclasses if needed
  }

  getMode(): VisualizationMode {
    return this.getModeType();
  }

  protected abstract getModeType(): VisualizationMode;
}

export interface VisualizationManagerEvents {
  modeChanged: (mode: VisualizationMode) => void;
  performanceUpdate: (metrics: PerformanceMetrics) => void;
  error: (error: Error) => void;
}
