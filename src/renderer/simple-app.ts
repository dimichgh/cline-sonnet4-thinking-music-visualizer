import { AudioFile, VisualizationMode } from '@shared/types';

class SimpleAudioPlayer {
  private audio: HTMLAudioElement | null = null;
  private audioFile: AudioFile | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private dataArray: Uint8Array | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private currentMode: VisualizationMode = VisualizationMode.PSYCHEDELIC;
  private animationId: number | null = null;

  constructor() {
    this.setupCanvas();
    this.setupEventListeners();
    console.log('Simple Audio Player with Visualizations initialized');
  }

  private setupCanvas(): void {
    this.canvas = document.getElementById('visualization-canvas') as HTMLCanvasElement;
    if (this.canvas) {
      this.ctx = this.canvas.getContext('2d');
      this.resizeCanvas();
      window.addEventListener('resize', () => this.resizeCanvas());
    }
  }

  private resizeCanvas(): void {
    if (!this.canvas) return;
    const container = this.canvas.parentElement;
    if (container) {
      this.canvas.width = container.clientWidth;
      this.canvas.height = container.clientHeight;
    }
  }

  private setupEventListeners(): void {
    // Control buttons
    const loadFileBtn = document.getElementById('load-file-btn');
    loadFileBtn?.addEventListener('click', () => this.loadAudioFile());

    const playPauseBtn = document.getElementById('play-pause-btn');
    playPauseBtn?.addEventListener('click', () => this.togglePlayback());

    const stopBtn = document.getElementById('stop-btn');
    stopBtn?.addEventListener('click', () => this.stopPlayback());

    // Mode selector buttons
    const modeButtons = document.querySelectorAll('.mode-button');
    modeButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const target = e.target as HTMLButtonElement;
        const mode = target.dataset.mode as VisualizationMode;
        if (mode) {
          this.switchVisualizationMode(mode);
        }
      });
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === ' ') {
        e.preventDefault();
        this.togglePlayback();
      }
      if (e.key === 'o' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        this.loadAudioFile();
      }
      // Mode switching shortcuts
      if (e.key === '1' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        this.switchVisualizationMode(VisualizationMode.PSYCHEDELIC);
      }
      if (e.key === '2' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        this.switchVisualizationMode(VisualizationMode.DIGITAL_EARTH);
      }
      if (e.key === '3' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        this.switchVisualizationMode(VisualizationMode.BLACK_HOLE);
      }
      if (e.key === '4' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        this.switchVisualizationMode(VisualizationMode.TRON_CITY);
      }
    });
  }

  private switchVisualizationMode(mode: VisualizationMode): void {
    this.currentMode = mode;
    console.log('Switched to visualization mode:', mode);
    
    // Update button states
    const modeButtons = document.querySelectorAll('.mode-button');
    modeButtons.forEach(button => {
      const buttonElement = button as HTMLButtonElement;
      if (buttonElement.dataset.mode === mode) {
        buttonElement.classList.add('active');
      } else {
        buttonElement.classList.remove('active');
      }
    });
  }

  private async loadAudioFile(): Promise<void> {
    try {
      const audioFile = await window.electronAPI?.loadAudioFile();
      if (audioFile) {
        this.onAudioFileLoaded(audioFile);
      }
    } catch (error) {
      console.error('Error loading audio file:', error);
    }
  }

  private onAudioFileLoaded(audioFile: AudioFile): void {
    this.audioFile = audioFile;
    console.log('Audio file loaded:', audioFile);

    // Show processing message
    const loading = document.getElementById('loading');
    if (loading) {
      loading.innerHTML = '<div class="loading-text">Setting up playback...</div>';
    }

    // Create audio element from file data
    const blob = new Blob([audioFile.data], { type: 'audio/wav' });
    const audioUrl = URL.createObjectURL(blob);

    this.audio = new Audio(audioUrl);
    
    this.audio.addEventListener('loadedmetadata', () => {
      console.log('Audio metadata loaded - Duration:', this.audio?.duration, 'seconds');
      this.setupAudioAnalysis();
      
      // Hide loading screen
      if (loading) {
        loading.style.display = 'none';
      }
    });

    this.audio.addEventListener('timeupdate', () => {
      this.updateProgressBar();
    });

    this.audio.addEventListener('ended', () => {
      this.updatePlayButton(false);
      this.stopVisualization();
    });

    this.audio.addEventListener('error', (e) => {
      console.error('Audio playback error:', e);
      if (loading) {
        loading.innerHTML = '<div class="loading-text">Playback Error</div><div>Failed to play audio file</div>';
      }
    });

    // Start loading
    this.audio.load();
  }

  private setupAudioAnalysis(): void {
    if (!this.audio) return;

    try {
      this.audioContext = new AudioContext();
      const source = this.audioContext.createMediaElementSource(this.audio);
      this.analyser = this.audioContext.createAnalyser();
      
      this.analyser.fftSize = 256;
      const bufferLength = this.analyser.frequencyBinCount;
      this.dataArray = new Uint8Array(bufferLength);
      
      source.connect(this.analyser);
      this.analyser.connect(this.audioContext.destination);
      
      console.log('Audio analysis setup complete');
    } catch (error) {
      console.error('Failed to setup audio analysis:', error);
    }
  }

  private togglePlayback(): void {
    if (!this.audio) {
      console.warn('No audio loaded');
      return;
    }

    if (this.audio.paused) {
      this.audio.play().catch(e => console.error('Play failed:', e));
      this.updatePlayButton(true);
      this.startVisualization();
    } else {
      this.audio.pause();
      this.updatePlayButton(false);
      this.stopVisualization();
    }
  }

  private startVisualization(): void {
    if (!this.analyser || !this.dataArray || !this.canvas || !this.ctx) return;
    
    this.stopVisualization(); // Stop any existing animation
    this.renderVisualization();
  }

  private stopVisualization(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  private renderVisualization = (): void => {
    if (!this.analyser || !this.dataArray || !this.canvas || !this.ctx) return;
    
    this.animationId = requestAnimationFrame(this.renderVisualization);
    
    this.analyser.getByteFrequencyData(this.dataArray);
    
    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Render based on current mode
    switch (this.currentMode) {
      case VisualizationMode.PSYCHEDELIC:
        this.renderPsychedelicMode();
        break;
      case VisualizationMode.DIGITAL_EARTH:
        this.renderDigitalEarthMode();
        break;
      case VisualizationMode.BLACK_HOLE:
        this.renderBlackHoleMode();
        break;
      case VisualizationMode.TRON_CITY:
        this.renderTronCityMode();
        break;
    }
  }

  private renderPsychedelicMode(): void {
    if (!this.ctx || !this.canvas || !this.dataArray) return;
    
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    const time = Date.now() * 0.001;
    
    // Create psychedelic colors based on audio
    for (let i = 0; i < this.dataArray.length; i++) {
      const amplitude = this.dataArray[i] / 255;
      const angle = (i / this.dataArray.length) * Math.PI * 2;
      const radius = amplitude * 200;
      
      const x = centerX + Math.cos(angle + time) * radius;
      const y = centerY + Math.sin(angle + time) * radius;
      
      this.ctx.fillStyle = `hsl(${(i * 3 + time * 50) % 360}, 80%, ${50 + amplitude * 30}%)`;
      this.ctx.beginPath();
      this.ctx.arc(x, y, amplitude * 10 + 2, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  private renderDigitalEarthMode(): void {
    if (!this.ctx || !this.canvas || !this.dataArray) return;
    
    const barWidth = this.canvas.width / this.dataArray.length;
    
    for (let i = 0; i < this.dataArray.length; i++) {
      const amplitude = this.dataArray[i] / 255;
      const height = amplitude * this.canvas.height;
      
      this.ctx.fillStyle = `rgb(0, ${Math.floor(amplitude * 255)}, ${Math.floor(amplitude * 200)})`;
      this.ctx.fillRect(i * barWidth, this.canvas.height - height, barWidth - 1, height);
    }
  }

  private renderBlackHoleMode(): void {
    if (!this.ctx || !this.canvas || !this.dataArray) return;
    
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    const time = Date.now() * 0.002;
    
    // Create spiral effect
    for (let i = 0; i < this.dataArray.length; i++) {
      const amplitude = this.dataArray[i] / 255;
      const angle = (i / this.dataArray.length) * Math.PI * 8 + time;
      const radius = (i / this.dataArray.length) * 300;
      
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      
      this.ctx.fillStyle = `rgba(255, 255, 255, ${amplitude * 0.8})`;
      this.ctx.beginPath();
      this.ctx.arc(x, y, amplitude * 8 + 1, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  private renderTronCityMode(): void {
    if (!this.ctx || !this.canvas || !this.dataArray) return;
    
    const barWidth = this.canvas.width / this.dataArray.length;
    
    for (let i = 0; i < this.dataArray.length; i++) {
      const amplitude = this.dataArray[i] / 255;
      const height = amplitude * this.canvas.height;
      
      this.ctx.strokeStyle = `rgb(0, ${Math.floor(amplitude * 255)}, 255)`;
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.moveTo(i * barWidth, this.canvas.height);
      this.ctx.lineTo(i * barWidth, this.canvas.height - height);
      this.ctx.stroke();
    }
  }

  private stopPlayback(): void {
    if (!this.audio) return;

    this.audio.pause();
    this.audio.currentTime = 0;
    this.updatePlayButton(false);
    this.updateProgressBar();
  }

  private updatePlayButton(isPlaying: boolean): void {
    const playPauseBtn = document.getElementById('play-pause-btn');
    if (playPauseBtn) {
      playPauseBtn.textContent = isPlaying ? 'Pause' : 'Play';
      playPauseBtn.classList.toggle('active', isPlaying);
    }
  }

  private updateProgressBar(): void {
    if (!this.audio || this.audio.duration === 0) return;

    const progressBar = document.getElementById('progress-bar');
    if (progressBar) {
      const percentage = (this.audio.currentTime / this.audio.duration) * 100;
      progressBar.style.width = `${percentage}%`;
    }
  }
}

// Initialize the simple audio player
document.addEventListener('DOMContentLoaded', () => {
  new SimpleAudioPlayer();
});
