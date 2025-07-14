import * as THREE from 'three';
import { BaseVisualizationMode, VisualizationData } from '../types';
import { VisualizationMode } from '../../../shared/types';

export class TronCityMode extends BaseVisualizationMode {
  private grid: THREE.Group | null = null;
  private lightCycle: THREE.Mesh | null = null;

  protected getModeType(): VisualizationMode {
    return VisualizationMode.TRON_CITY;
  }

  public async init(): Promise<void> {
    this.grid = new THREE.Group();
    
    // Create grid lines
    const gridSize = 20;
    const divisions = 20;
    const gridHelper = new THREE.GridHelper(gridSize, divisions, 0x00ffff, 0x004080);
    this.grid.add(gridHelper);
    
    // Create light cycle (simple box for now)
    const cycleGeometry = new THREE.BoxGeometry(0.5, 0.3, 1);
    const cycleMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x00ffff,
      transparent: true,
      opacity: 0.8
    });
    this.lightCycle = new THREE.Mesh(cycleGeometry, cycleMaterial);
    this.lightCycle.position.set(0, 0.5, 0);
    this.grid.add(this.lightCycle);
    
    this.scene.add(this.grid);
    console.log('TronCityMode initialized');
  }

  public update(data: VisualizationData): void {
    if (!this.grid || !this.lightCycle || !this.isActive) {
      return;
    }

    const { audio } = data;
    const volume = audio.volume;
    const beat = audio.beat;
    const time = data.totalTime * 0.001;

    // Move light cycle in a circle
    const radius = 5 + volume * 3;
    const speed = 0.5 + volume;
    this.lightCycle.position.x = Math.cos(time * speed) * radius;
    this.lightCycle.position.z = Math.sin(time * speed) * radius;
    
    // Rotate light cycle to face movement direction
    this.lightCycle.rotation.y = time * speed + Math.PI / 2;

    // Pulse light cycle on beat
    if (beat) {
      this.lightCycle.scale.setScalar(1.5 + volume);
    } else {
      this.lightCycle.scale.setScalar(1 + volume * 0.3);
    }

    // Change color based on spectral centroid
    const hue = (audio.spectralCentroid * 0.0001) % 1;
    (this.lightCycle.material as THREE.MeshBasicMaterial).color.setHSL(hue * 0.7 + 0.5, 1, 0.5);
  }

  public resize(width: number, height: number): void {
    // No specific resize logic needed
  }

  protected onActivate(): void {
    console.log('TronCityMode activated');
  }

  protected onDeactivate(): void {
    console.log('TronCityMode deactivated');
  }

  public dispose(): void {
    if (this.grid) {
      this.scene.remove(this.grid);
      
      // Dispose of all children
      this.grid.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach(mat => mat.dispose());
            } else {
              child.material.dispose();
            }
          }
        }
      });
      
      this.grid = null;
    }
    
    this.lightCycle = null;
    console.log('TronCityMode disposed');
  }
}
