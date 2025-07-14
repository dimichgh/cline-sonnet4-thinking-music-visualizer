import * as THREE from 'three';
import { BaseVisualizationMode, VisualizationData } from '../types';
import { VisualizationMode } from '../../../shared/types';

export class BlackHoleMode extends BaseVisualizationMode {
  private blackHole: THREE.Mesh | null = null;
  private accretionDisk: THREE.Mesh | null = null;

  protected getModeType(): VisualizationMode {
    return VisualizationMode.BLACK_HOLE;
  }

  public async init(): Promise<void> {
    // Create black hole (dark sphere in center)
    const holeGeometry = new THREE.SphereGeometry(1, 32, 16);
    const holeMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x000000,
      transparent: true,
      opacity: 0.9
    });
    this.blackHole = new THREE.Mesh(holeGeometry, holeMaterial);
    this.scene.add(this.blackHole);

    // Create accretion disk (rotating ring)
    const diskGeometry = new THREE.RingGeometry(2, 4, 32);
    const diskMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xff6600,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide
    });
    this.accretionDisk = new THREE.Mesh(diskGeometry, diskMaterial);
    this.accretionDisk.rotation.x = Math.PI / 2; // Lay flat
    this.scene.add(this.accretionDisk);

    console.log('BlackHoleMode initialized');
  }

  public update(data: VisualizationData): void {
    if (!this.blackHole || !this.accretionDisk || !this.isActive) {
      return;
    }

    const { audio } = data;
    const volume = audio.volume;
    const beat = audio.beat;

    // Rotate accretion disk
    this.accretionDisk.rotation.z += 0.02 * (1 + volume);

    // Pulse black hole on beat
    if (beat) {
      this.blackHole.scale.setScalar(1.3 + volume);
    } else {
      this.blackHole.scale.setScalar(1 + volume * 0.3);
    }

    // Change accretion disk color based on audio
    const hue = (audio.spectralCentroid * 0.0001) % 1;
    (this.accretionDisk.material as THREE.MeshBasicMaterial).color.setHSL(hue * 0.2, 1, 0.5);

    // Scale accretion disk with volume
    const diskScale = 1 + volume * 0.5;
    this.accretionDisk.scale.setScalar(diskScale);
  }

  public resize(width: number, height: number): void {
    // No specific resize logic needed
  }

  protected onActivate(): void {
    console.log('BlackHoleMode activated');
  }

  protected onDeactivate(): void {
    console.log('BlackHoleMode deactivated');
  }

  public dispose(): void {
    if (this.blackHole) {
      this.scene.remove(this.blackHole);
      this.blackHole.geometry.dispose();
      (this.blackHole.material as THREE.Material).dispose();
      this.blackHole = null;
    }
    
    if (this.accretionDisk) {
      this.scene.remove(this.accretionDisk);
      this.accretionDisk.geometry.dispose();
      (this.accretionDisk.material as THREE.Material).dispose();
      this.accretionDisk = null;
    }
    
    console.log('BlackHoleMode disposed');
  }
}
