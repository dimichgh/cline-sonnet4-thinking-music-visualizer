/**
 * Handles DOM initialization, canvas management, and resizing
 */
export class DOMManager {
  private canvas!: HTMLCanvasElement;

  constructor() {
    this.initializeDOM();
  }

  public getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  private initializeDOM(): void {
    // Get canvas element
    this.canvas = document.getElementById('visualization-canvas') as HTMLCanvasElement;
    if (!this.canvas) {
      throw new Error('Visualization canvas not found');
    }

    // Set initial canvas size
    this.resizeCanvas();
    
    // Handle window resize
    window.addEventListener('resize', () => this.resizeCanvas());
  }

  public resizeCanvas(): void {
    const container = this.canvas.parentElement;
    if (!container) return;

    const width = Math.max(container.clientWidth, 800);
    const height = Math.max(container.clientHeight, 600);
    
    this.canvas.width = width;
    this.canvas.height = height;
    this.canvas.style.width = width + 'px';
    this.canvas.style.height = height + 'px';

    console.log('Canvas resized to:', width, 'x', height);

    // Update camera and renderer if they exist
    if ((window as any).visualizationCamera && (window as any).visualizationRenderer) {
      (window as any).visualizationCamera.aspect = width / height;
      (window as any).visualizationCamera.updateProjectionMatrix();
      (window as any).visualizationRenderer.setSize(width, height);
      
      // Update composer for post-processing
      if ((window as any).visualizationComposer) {
        (window as any).visualizationComposer.setSize(width, height);
      }
      
      console.log('Camera, renderer, and composer updated for new size');
    }
  }

  public showLoading(message: string): void {
    const loading = document.getElementById('loading');
    if (loading) {
      loading.innerHTML = `<div class="loading-text">${message}</div><div>Please wait while we process your request</div>`;
      loading.style.display = 'block';
    }
  }

  public hideLoading(): void {
    const loading = document.getElementById('loading');
    if (loading) {
      loading.style.display = 'none';
    }
  }

  public showError(message: string): void {
    const loading = document.getElementById('loading');
    if (loading) {
      loading.innerHTML = `<div class="loading-text">Error</div><div>${message}</div>`;
      loading.style.display = 'block';
    }
  }
}
