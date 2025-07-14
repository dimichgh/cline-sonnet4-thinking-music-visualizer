import * as THREE from 'three';
import { BaseVisualizationMode, VisualizationData } from '../types';
import { VisualizationMode } from '../../../shared/types';

export class PsychedelicMode extends BaseVisualizationMode {
  private cube: THREE.Mesh | null = null;

  protected getModeType(): VisualizationMode {
    return VisualizationMode.PSYCHEDELIC;
  }

  public async init(): Promise<void> {
    // Create a simple rotating cube for now
    const geometry = new THREE.BoxGeometry(2, 2, 2);
    const material = new THREE.MeshBasicMaterial({ 
      color: 0xff00ff,
      transparent: true,
      opacity: 0.7
    });
    this.cube = new THREE.Mesh(geometry, material);
    this.scene.add(this.cube);
    console.log('PsychedelicMode initialized');
  }

  public update(data: VisualizationData): void {
    if (!this.cube || !this.isActive) {
      return;
    }

    const { audio } = data;
    const volume = audio.volume;
    const beat = audio.beat;

    // Rotate cube based on audio
    this.cube.rotation.x += 0.01 * (1 + volume);
    this.cube.rotation.y += 0.01 * (1 + volume);

    // Scale on beat
    if (beat) {
      this.cube.scale.setScalar(1.5 + volume);
    } else {
      this.cube.scale.setScalar(1 + volume * 0.5);
    }

    // Change color based on spectral centroid
    const hue = (audio.spectralCentroid * 0.001) % 1;
    (this.cube.material as THREE.MeshBasicMaterial).color.setHSL(hue, 1, 0.5);
  }

  public resize(width: number, height: number): void {
    // No specific resize logic needed
  }

  protected onActivate(): void {
    console.log('PsychedelicMode activated');
  }

  protected onDeactivate(): void {
    console.log('PsychedelicMode deactivated');
  }

  public dispose(): void {
    if (this.cube) {
      this.scene.remove(this.cube);
      this.cube.geometry.dispose();
      (this.cube.material as THREE.Material).dispose();
      this.cube = null;
    }
    console.log('PsychedelicMode disposed');
  }
}
