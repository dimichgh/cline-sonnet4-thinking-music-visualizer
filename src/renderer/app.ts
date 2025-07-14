import { VisualizationMode, AudioFile, PlaybackState, IPC_CHANNELS, AudioAnalysisData } from '@shared/types';
import { AudioEngine } from '@audio/AudioEngine';

class MusicVisualizerRenderer {
  private canvas!: HTMLCanvasElement;
  private currentMode: VisualizationMode = VisualizationMode.PSYCHEDELIC;
  private audioFile: AudioFile | null = null;
  private audioEngine: AudioEngine = new AudioEngine();
  private visualizationManager: any = null;
  private currentAnalysisData: AudioAnalysisData | null = null;
  private updateTimer: number | null = null;
  private playbackState: PlaybackState = {
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 1.0,
    loop: false
  };

  constructor() {
    this.audioEngine = new AudioEngine();
    this.setupAudioEngine();
    this.initializeDOM();
    this.setupEventListeners();
    this.setupIPC();
    // Initialize visualization system after DOM is ready
    this.initializeVisualization();
    console.log('MusicVisualizerRenderer initialized');
  }

  private setupAudioEngine(): void {
    // Setup audio engine event listeners
    this.audioEngine.onAnalysisData((data: AudioAnalysisData) => {
      this.currentAnalysisData = data;
      // Update visualization with audio data
      if (this.visualizationManager) {
        this.visualizationManager.update(data);
      }
    });

    this.audioEngine.onPlaybackStateChange((state: PlaybackState) => {
      this.playbackState = state;
      this.updateUI();
    });
  }

  private updateUI(): void {
    // Update playback controls
    const playPauseBtn = document.getElementById('play-pause-btn');
    if (playPauseBtn) {
      playPauseBtn.textContent = this.playbackState.isPlaying ? 'Pause' : 'Play';
      playPauseBtn.classList.toggle('active', this.playbackState.isPlaying);
    }

    // Update progress bar
    this.updateProgressBar();
    
    // Update time info
    this.updateTimeInfo();
  }

  private initializeDOM(): void {
    // Get canvas element
    this.canvas = document.getElementById('visualization-canvas') as HTMLCanvasElement;
    if (!this.canvas) {
      throw new Error('Visualization canvas not found');
    }

    // Set canvas size
    this.resizeCanvas();
    
    // Handle window resize
    window.addEventListener('resize', () => this.resizeCanvas());
  }

  private resizeCanvas(): void {
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

  private setupEventListeners(): void {
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

    // Control buttons
    const loadFileBtn = document.getElementById('load-file-btn');
    loadFileBtn?.addEventListener('click', () => this.loadAudioFile());

    const playPauseBtn = document.getElementById('play-pause-btn');
    playPauseBtn?.addEventListener('click', () => this.togglePlayback());

    const stopBtn = document.getElementById('stop-btn');
    stopBtn?.addEventListener('click', () => this.stopPlayback());

    // Progress bar
    const progressContainer = document.getElementById('progress-container');
    progressContainer?.addEventListener('click', (e) => this.seekTo(e));

    // Drag and drop
    this.setupDragAndDrop();

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => this.handleKeyboard(e));
  }

  private setupDragAndDrop(): void {
    const dropZone = document.getElementById('drop-zone');
    const visualizationContainer = document.getElementById('visualization-container');

    if (!dropZone || !visualizationContainer) return;

    visualizationContainer.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('active');
    });

    visualizationContainer.addEventListener('dragleave', (e) => {
      if (!visualizationContainer.contains(e.relatedTarget as Node)) {
        dropZone.classList.remove('active');
      }
    });

    visualizationContainer.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('active');
      
      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        const file = files[0];
        if (file) {
          this.handleDroppedFile(file);
        }
      }
    });
  }

  private setupIPC(): void {
    // Listen for audio file loaded from main process
    window.electronAPI?.onAudioFileLoaded((audioFile: AudioFile) => {
      this.onAudioFileLoaded(audioFile);
    });

    // Listen for visualization mode changes
    window.electronAPI?.onVisualizationSettings((settings: any) => {
      if (settings.mode) {
        this.switchVisualizationMode(settings.mode);
      }
    });

    // Listen for playback control messages
    window.electronAPI?.onPlaybackControl((control: any) => {
      switch (control.action) {
        case 'toggle':
          this.togglePlayback();
          break;
        case 'stop':
          this.stopPlayback();
          break;
      }
    });
  }

  private handleKeyboard(e: KeyboardEvent): void {
    switch (e.key) {
      case ' ':
        e.preventDefault();
        this.togglePlayback();
        break;
      case '1':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          this.switchVisualizationMode(VisualizationMode.PSYCHEDELIC);
        }
        break;
      case '2':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          this.switchVisualizationMode(VisualizationMode.DIGITAL_EARTH);
        }
        break;
      case '3':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          this.switchVisualizationMode(VisualizationMode.BLACK_HOLE);
        }
        break;
      case '4':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          this.switchVisualizationMode(VisualizationMode.TRON_CITY);
        }
        break;
      case 'o':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          this.loadAudioFile();
        }
        break;
      case 'F11':
        e.preventDefault();
        window.electronAPI?.windowControls('fullscreen');
        break;
    }
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
    
    // Update loading screen to show processing
    const loading = document.getElementById('loading');
    if (loading) {
      loading.innerHTML = '<div class="loading-text">Processing Audio...</div><div>Please wait while we analyze the audio file</div>';
    }

    // Initialize audio engine and start analysis
    this.initializeAudioEngine();
  }

  private handleDroppedFile(file: File): void {
    console.log('File dropped:', file.name);
    // TODO: Handle dropped file processing
    // For now, just log the file info
  }

  private async switchVisualizationMode(mode: VisualizationMode): Promise<void> {
    this.currentMode = mode;
    console.log('Switching to visualization mode:', mode);
    
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

    // Switch visualization mode
    if (this.visualizationManager) {
      try {
        await this.visualizationManager.setMode(mode);
        console.log('Switched to visualization mode:', mode);
      } catch (error) {
        console.error('Failed to switch visualization mode:', error);
      }
    } else {
      console.log('Mode switched to:', mode, '(lightweight mode - no 3D visualization)');
    }
  }

  private togglePlayback(): void {
    if (!this.audioFile) {
      console.warn('No audio file loaded');
      return;
    }

    if (this.playbackState.isPlaying) {
      this.audioEngine.pause();
      this.stopUpdateTimer();
      if (this.visualizationManager) {
        this.visualizationManager.stop();
      }
    } else {
      this.audioEngine.play();
      this.startUpdateTimer();
      if (this.visualizationManager) {
        this.visualizationManager.start();
      }
    }
  }

  private stopPlayback(): void {
    this.audioEngine.stop();
    this.stopUpdateTimer();
    if (this.visualizationManager) {
      this.visualizationManager.stop();
    }
  }

  private startUpdateTimer(): void {
    this.stopUpdateTimer(); // Clear any existing timer
    this.updateTimer = window.setInterval(() => {
      // Update current time from audio engine
      this.playbackState.currentTime = this.audioEngine.getCurrentTime();
      this.updateProgressBar();
      this.updateTimeInfo();
    }, 100); // Update every 100ms for smooth progress
  }

  private stopUpdateTimer(): void {
    if (this.updateTimer !== null) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }
  }

  private seekTo(e: MouseEvent): void {
    if (!this.audioFile || !this.audioFile.duration || this.audioFile.duration === 0) return;

    const progressContainer = e.currentTarget as HTMLElement;
    const rect = progressContainer.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    
    const seekTime = percentage * this.audioFile.duration;
    this.audioEngine.seek(seekTime);
  }

  private updateProgressBar(): void {
    const progressBar = document.getElementById('progress-bar');
    if (progressBar && this.playbackState.duration > 0) {
      const percentage = (this.playbackState.currentTime / this.playbackState.duration) * 100;
      progressBar.style.width = `${percentage}%`;
    }
  }

  private updateTimeInfo(): void {
    const timeInfo = document.getElementById('time-info');
    if (timeInfo) {
      const currentTimeStr = this.formatTime(this.playbackState.currentTime);
      const durationStr = this.formatTime(this.playbackState.duration);
      timeInfo.textContent = `${currentTimeStr} / ${durationStr}`;
    }
  }

  private formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  private updateSongName(): void {
    const songName = document.getElementById('song-name');
    if (songName && this.audioFile) {
      songName.textContent = this.audioFile.name.replace(/\.[^/.]+$/, ''); // Remove file extension
    }
  }

  private async initializeVisualization(): Promise<void> {
    try {
      console.log('Initializing Simple Three.js Scene (based on working project pattern)...');
      
      // Import Three.js and post-processing modules for proper glow
      const THREE = await import('three');
      const { EffectComposer } = await import('three/examples/jsm/postprocessing/EffectComposer.js');
      const { RenderPass } = await import('three/examples/jsm/postprocessing/RenderPass.js');
      const { UnrealBloomPass } = await import('three/examples/jsm/postprocessing/UnrealBloomPass.js');
      console.log('Three.js and post-processing modules imported successfully');
      
      // Create scene (simple approach like working project)
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x000005);
      console.log('Scene created');
      
      // Create camera (same settings as working project)
      const camera = new THREE.PerspectiveCamera(
        75,
        this.canvas.width / this.canvas.height,
        0.1,
        1000
      );
      camera.position.set(0, 0, 10); // Closer to see the earth better
      camera.lookAt(0, 0, 0); // Look at the center where earth will be
      console.log('Camera created and positioned');
      
      // Create renderer (same settings as working project)
      const renderer = new THREE.WebGLRenderer({ 
        canvas: this.canvas,
        antialias: true,
        powerPreference: 'high-performance'
      });
      renderer.setSize(this.canvas.width, this.canvas.height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setClearColor(0x000005, 1);
      console.log('WebGL Renderer created successfully with working project settings');
      
      // Set up post-processing pipeline for PROFESSIONAL GLOW
      const composer = new EffectComposer(renderer);
      
      // Main render pass
      const renderPass = new RenderPass(scene, camera);
      composer.addPass(renderPass);
      
      // Bloom pass for realistic glow effect (ULTRA AGGRESSIVE for visible glow)
      const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(this.canvas.width, this.canvas.height),
        4.0,  // strength - much higher for intense glow
        1.2,  // radius - larger for softer spread
        0.01  // threshold - extremely low to catch all bright areas
      );
      composer.addPass(bloomPass);
      
      console.log('Post-processing bloom pipeline initialized');
      
      // Store globally for resize handling
      (window as any).visualizationCamera = camera;
      (window as any).visualizationRenderer = renderer;
      (window as any).visualizationComposer = composer;
      (window as any).visualizationBloomPass = bloomPass;
      console.log('Camera, renderer, and composer stored globally for resize handling');
      
      // Create Digital Earth components (following working project pattern)
      console.log('Creating Digital Earth visualization...');
      
      // 1. Dual-layer star system - bloom + reactive background
      const { bloomStars, backgroundStars } = this.createDualLayerStarField(THREE);
      scene.add(backgroundStars); // Add background first (behind)
      scene.add(bloomStars);      // Add bloom on top
      console.log('Dual-layer star field added');
      
      // 2. Earth sphere (simple approach)
      const earthGroup = this.createEarthSphere(THREE);
      scene.add(earthGroup);
      console.log('Earth sphere added');
      
      // 3. Simple electrical arcs system
      const electricalArcs: any[] = [];
      console.log('Electrical system initialized');
      
      // Animation state
      let time = 0;
      let beatIntensity = 0;
      
      // Animation loop with Digital Earth effects
      const animate = () => {
        requestAnimationFrame(animate);
        time += 0.01;
        
        // Rotate dual-layer star field
        bloomStars.rotation.y += 0.001;
        bloomStars.rotation.x += 0.0005;
        backgroundStars.rotation.y += 0.001;
        backgroundStars.rotation.x += 0.0005;
        
        // Rotate earth
        earthGroup.rotation.y += 0.005;
        
        // Update electrical arcs
        this.updateElectricalArcs(THREE, scene, electricalArcs, time);
        
        // React to audio if available
        if (this.currentAnalysisData) {
          const audio = this.currentAnalysisData;
          
          // Scale earth on beat
          const scale = 1 + audio.volume * 0.2;
          earthGroup.scale.setScalar(scale);
          
          // Rotate based on audio
          earthGroup.rotation.y += audio.volume * 0.01;
          bloomStars.rotation.y += audio.volume * 0.002;
          backgroundStars.rotation.y += audio.volume * 0.002;
          
          // UPDATE BACKGROUND STARS with full music reactivity
          this.updateStarField(THREE, backgroundStars, audio);
          
          // Keep bloom stars static for consistent glow
        }
        
        // Use post-processing composer for professional bloom glow
        composer.render();
      };
      animate();
      
      console.log('Digital Earth visualization running successfully!');
      
    } catch (error) {
      console.error('Failed to initialize Three.js scene:', error);
    }
  }

  private createStarField(THREE: any): any {
    const starCount = 1000; 
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    const originalColors = new Float32Array(starCount * 3); // Store original colors for music reactivity

    for (let i = 0; i < starCount * 3; i += 3) {
      // Simple random distribution
      positions[i] = (Math.random() - 0.5) * 400;
      positions[i + 1] = (Math.random() - 0.5) * 400;
      positions[i + 2] = (Math.random() - 0.5) * 400;

      // VARIED BRIGHT COLORS for bloom glow effect with more variety
      const intensity = 2.0 + Math.random() * 1.5; // Bright base intensity
      const starType = Math.random();
      
      let r, g, b;
      if (starType < 0.2) {
        // Blue stars
        r = intensity * 0.4;      // Low red
        g = intensity * 0.7;      // Medium green  
        b = intensity;            // High blue
      } else if (starType < 0.4) {
        // Red/Orange stars
        r = intensity;            // High red
        g = intensity * 0.6;      // Medium green
        b = intensity * 0.3;      // Low blue
      } else if (starType < 0.6) {
        // Green/Cyan stars
        r = intensity * 0.3;      // Low red
        g = intensity;            // High green
        b = intensity * 0.8;      // High blue
      } else if (starType < 0.8) {
        // Purple/Magenta stars
        r = intensity * 0.9;      // High red
        g = intensity * 0.4;      // Low green
        b = intensity;            // High blue
      } else {
        // White stars (fewer now)
        r = intensity * 0.9;      // Bright white
        g = intensity * 0.9;      
        b = intensity * 0.9;      
      }
      
      // Set both current and original colors
      colors[i] = r;
      colors[i + 1] = g;
      colors[i + 2] = b;
      
      originalColors[i] = r;
      originalColors[i + 1] = g;
      originalColors[i + 2] = b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // BLOOM-READY material with additive blending
    const material = new THREE.PointsMaterial({
      size: 2,                          // Slightly larger for more glow
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      sizeAttenuation: false,
      blending: THREE.AdditiveBlending  // KEY: Makes stars glow with bloom!
    });

    const starField = new THREE.Points(geometry, material);
    
    // Store original colors for music reactivity
    (starField as any).originalColors = originalColors;
    
    console.log('Star field created with', starCount, 'music-reactive glowing stars');
    return starField;
  }

  private updateStarField(THREE: any, starField: any, audio: any): void {
    if (!starField || !audio || !audio.frequencyBins) return;
    
    const colors = starField.geometry.attributes.color.array;
    const originalColors = (starField as any).originalColors;
    
    if (!originalColors) return;
    
    // Analyze audio for different frequency bands
    const bassLevel = this.getFrequencyAverage(audio.frequencyBins, 0, 0.15);      // 0-15%
    const midLevel = this.getFrequencyAverage(audio.frequencyBins, 0.15, 0.6);     // 15-60%
    const highLevel = this.getFrequencyAverage(audio.frequencyBins, 0.6, 1.0);     // 60-100%
    
    // MUCH LOWER, SAFER intensity calculations
    const bassNorm = Math.min(bassLevel / 255, 1);   // Use 255 as max (typical FFT range)
    const midNorm = Math.min(midLevel / 255, 1);
    const highNorm = Math.min(highLevel / 255, 1);
    
    // Reduced multipliers to prevent stars from disappearing
    const beatBoost = audio.beat ? 1.3 : 1.0;        // Much lower beat boost
    const volumeBoost = 1 + (audio.volume || 0) * 0.5; // Much lower volume boost
    
    console.log('Star update - Bass:', bassNorm.toFixed(2), 'Mid:', midNorm.toFixed(2), 'High:', highNorm.toFixed(2));
    
    // Update each star based on its "frequency assignment"
    for (let i = 0; i < colors.length; i += 3) {
      const starIndex = i / 3;
      const starPercent = starIndex / (colors.length / 3);
      
      // Assign stars to frequency bands based on position
      let intensityMultiplier = 1.0;
      let colorShift = { r: 1, g: 1, b: 1 };
      
      if (starPercent < 0.33) {
        // Bass stars - RED glow on bass (REDUCED multipliers)
        intensityMultiplier = 1 + bassNorm * 0.8 * beatBoost;  // Much smaller multiplier
        colorShift = { 
          r: 1 + bassNorm * 0.5,   // Smaller color shift
          g: 1 + bassNorm * 0.2,   
          b: 1                     
        };
      } else if (starPercent < 0.66) {
        // Mid stars - GREEN glow on mids
        intensityMultiplier = 1 + midNorm * 0.6 * beatBoost;
        colorShift = { 
          r: 1 + midNorm * 0.2,    
          g: 1 + midNorm * 0.5,    // Smaller multipliers
          b: 1 + midNorm * 0.2     
        };
      } else {
        // High stars - BLUE glow on highs
        intensityMultiplier = 1 + highNorm * 1.0 * beatBoost;
        colorShift = { 
          r: 1,                    
          g: 1 + highNorm * 0.3,   
          b: 1 + highNorm * 0.7    // Smaller multiplier
        };
      }
      
      // Apply music reactivity with BLOOM-FRIENDLY clamping
      const newR = Math.min(originalColors[i] * colorShift.r * intensityMultiplier * volumeBoost, 8.0);
      const newG = Math.min(originalColors[i + 1] * colorShift.g * intensityMultiplier * volumeBoost, 8.0);
      const newB = Math.min(originalColors[i + 2] * colorShift.b * intensityMultiplier * volumeBoost, 8.0);
      
      // Ensure values are BRIGHT ENOUGH for bloom glow (much higher minimum)
      colors[i] = Math.max(newR, originalColors[i] * 0.8);     // Red - keep at least 80% of original
      colors[i + 1] = Math.max(newG, originalColors[i + 1] * 0.8); // Green - for bloom effect
      colors[i + 2] = Math.max(newB, originalColors[i + 2] * 0.8); // Blue - maintain glow
    }
    
    // Mark colors for update
    starField.geometry.attributes.color.needsUpdate = true;
    
    // Update material size based on overall intensity (SAFER limits)
    const avgIntensity = (bassNorm + midNorm + highNorm) / 3;
    const newSize = Math.max(1.5, Math.min(4.0, 2 + avgIntensity * 2 * beatBoost)); // Size 1.5-4 based on music
    starField.material.size = newSize;
  }

  private getFrequencyAverage(frequencyBins: number[], startPercent: number, endPercent: number): number {
    const startIndex = Math.floor(frequencyBins.length * startPercent);
    const endIndex = Math.floor(frequencyBins.length * endPercent);
    const slice = frequencyBins.slice(startIndex, endIndex);
    
    if (slice.length === 0) return 0;
    
    return slice.reduce((sum, val) => sum + val, 0) / slice.length;
  }

  private updateStarFieldConservative(THREE: any, starField: any, audio: any): void {
    if (!starField || !audio || !audio.frequencyBins) return;
    
    // Only update SIZE, never touch colors to preserve bloom glow
    const bassLevel = this.getFrequencyAverage(audio.frequencyBins, 0, 0.15);
    const midLevel = this.getFrequencyAverage(audio.frequencyBins, 0.15, 0.6);
    const highLevel = this.getFrequencyAverage(audio.frequencyBins, 0.6, 1.0);
    
    // Calculate overall music intensity (0-1)
    const avgIntensity = (bassLevel + midLevel + highLevel) / (3 * 255); // Normalize by typical FFT max
    const beatBoost = audio.beat ? 1.5 : 1.0;
    const volumeBoost = 1 + (audio.volume || 0) * 0.5;
    
    // Update ONLY the size - preserve all original colors for bloom
    const baseSize = 2;
    const maxSize = 4;
    const newSize = Math.max(baseSize, Math.min(maxSize, baseSize + avgIntensity * 2 * beatBoost * volumeBoost));
    
    starField.material.size = newSize;
    
    console.log('Conservative star update - Size:', newSize.toFixed(2), 'Intensity:', avgIntensity.toFixed(3));
  }

  private createDualLayerStarField(THREE: any): { bloomStars: any, backgroundStars: any } {
    const starCount = 1000;
    
    // LAYER 1: Background stars that change color/size (NO bloom, behind bloom stars)
    const bgGeometry = new THREE.BufferGeometry();
    const bgPositions = new Float32Array(starCount * 3);
    const bgColors = new Float32Array(starCount * 3);
    
    // LAYER 2: Bloom stars that stay constant for glow (static, in front)
    const bloomGeometry = new THREE.BufferGeometry();
    const bloomPositions = new Float32Array(starCount * 3);
    const bloomColors = new Float32Array(starCount * 3);
    
    for (let i = 0; i < starCount * 3; i += 3) {
      // SAME positions for both layers (almost identical)
      const x = (Math.random() - 0.5) * 400;
      const y = (Math.random() - 0.5) * 400;
      const z = (Math.random() - 0.5) * 400;
      
      // Background positions (slightly offset so they show behind bloom)
      bgPositions[i] = x + (Math.random() - 0.5) * 0.5;     // Tiny offset
      bgPositions[i + 1] = y + (Math.random() - 0.5) * 0.5;
      bgPositions[i + 2] = z - 0.1; // Slightly behind
      
      // Bloom positions (front layer)
      bloomPositions[i] = x;
      bloomPositions[i + 1] = y;
      bloomPositions[i + 2] = z;
      
      // Background colors (dimmer, for music reactivity)
      const bgIntensity = 0.3 + Math.random() * 0.4; // Much dimmer
      const starType = Math.random();
      
      let bgR, bgG, bgB;
      if (starType < 0.2) {
        bgR = bgIntensity * 0.4; bgG = bgIntensity * 0.7; bgB = bgIntensity;
      } else if (starType < 0.4) {
        bgR = bgIntensity; bgG = bgIntensity * 0.6; bgB = bgIntensity * 0.3;
      } else if (starType < 0.6) {
        bgR = bgIntensity * 0.3; bgG = bgIntensity; bgB = bgIntensity * 0.8;
      } else if (starType < 0.8) {
        bgR = bgIntensity * 0.9; bgG = bgIntensity * 0.4; bgB = bgIntensity;
      } else {
        bgR = bgIntensity * 0.8; bgG = bgIntensity * 0.8; bgB = bgIntensity * 0.8;
      }
      
      bgColors[i] = bgR;
      bgColors[i + 1] = bgG;
      bgColors[i + 2] = bgB;
      
      // Bloom colors (bright, static for glow)
      const bloomIntensity = 2.5 + Math.random() * 1.0; // Very bright
      bloomColors[i] = bloomIntensity * 0.9;
      bloomColors[i + 1] = bloomIntensity * 0.9;
      bloomColors[i + 2] = bloomIntensity * 0.9; // White for pure glow
    }
    
    // Setup geometries
    bgGeometry.setAttribute('position', new THREE.BufferAttribute(bgPositions, 3));
    bgGeometry.setAttribute('color', new THREE.BufferAttribute(bgColors, 3));
    
    bloomGeometry.setAttribute('position', new THREE.BufferAttribute(bloomPositions, 3));
    bloomGeometry.setAttribute('color', new THREE.BufferAttribute(bloomColors, 3));
    
    // Background material (NO bloom, normal blending)
    const bgMaterial = new THREE.PointsMaterial({
      size: 1.5,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: false,
      blending: THREE.NormalBlending // No additive = no bloom pickup
    });
    
    // Bloom material (gets bloom effect)
    const bloomMaterial = new THREE.PointsMaterial({
      size: 2,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      sizeAttenuation: false,
      blending: THREE.AdditiveBlending // Bloom glow
    });
    
    const backgroundStars = new THREE.Points(bgGeometry, bgMaterial);
    const bloomStars = new THREE.Points(bloomGeometry, bloomMaterial);
    
    // Store for music reactivity
    (backgroundStars as any).originalColors = new Float32Array(bgColors);
    
    console.log('Dual-layer star field created - background (reactive) + bloom (static)');
    return { bloomStars, backgroundStars };
  }

  private createEarthSphere(THREE: any): any {
    const earthGroup = new THREE.Group();
    
    // Earth core - higher detail for digital effects
    const earthGeometry = new THREE.IcosahedronGeometry(3, 2); // More complex geodesic
    
    // Digital earth material with glow effect
    const earthMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x001155,  // Deep blue
      transparent: true,
      opacity: 0.4
    });
    const earthSphere = new THREE.Mesh(earthGeometry, earthMaterial);
    earthGroup.add(earthSphere);

    // Digital wireframe overlay - geodesic pattern
    const wireframeGeometry = new THREE.WireframeGeometry(earthGeometry);
    const wireframeMaterial = new THREE.LineBasicMaterial({ 
      color: 0x00ccff,
      transparent: true,
      opacity: 0.8
    });
    const wireframe = new THREE.LineSegments(wireframeGeometry, wireframeMaterial);
    earthGroup.add(wireframe);

    // Add glowing outer shell for digital effect
    const glowGeometry = new THREE.SphereGeometry(3.1, 32, 16);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0x0088ff,
      transparent: true,
      opacity: 0.2,
      side: THREE.BackSide // Glow from inside
    });
    const glowSphere = new THREE.Mesh(glowGeometry, glowMaterial);
    earthGroup.add(glowSphere);

    // Digital grid lines - latitude/longitude style
    this.addDigitalGridLines(THREE, earthGroup);

    // Store references for animation
    (earthGroup as any).earthSphere = earthSphere;
    (earthGroup as any).wireframe = wireframe;
    (earthGroup as any).glowSphere = glowSphere;

    console.log('Digital Earth sphere created with geodesic geometry and glow effects');
    return earthGroup;
  }

  private addDigitalGridLines(THREE: any, earthGroup: any): void {
    const radius = 3.05;
    
    // Latitude lines
    for (let lat = -80; lat <= 80; lat += 20) {
      const latRad = (lat * Math.PI) / 180;
      const latRadius = radius * Math.cos(latRad);
      const latY = radius * Math.sin(latRad);
      
      const latGeometry = new THREE.RingGeometry(latRadius - 0.01, latRadius + 0.01, 32);
      const latMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ffaa,
        transparent: true,
        opacity: 0.6,
        side: THREE.DoubleSide
      });
      const latRing = new THREE.Mesh(latGeometry, latMaterial);
      latRing.position.y = latY;
      latRing.rotation.x = Math.PI / 2;
      earthGroup.add(latRing);
    }

    // Longitude lines (meridians)
    for (let lon = 0; lon < 360; lon += 30) {
      const lonRad = (lon * Math.PI) / 180;
      const points = [];
      
      for (let lat = -90; lat <= 90; lat += 5) {
        const latRad = (lat * Math.PI) / 180;
        const x = radius * Math.cos(latRad) * Math.cos(lonRad);
        const y = radius * Math.sin(latRad);
        const z = radius * Math.cos(latRad) * Math.sin(lonRad);
        points.push(new THREE.Vector3(x, y, z));
      }
      
      const lonGeometry = new THREE.BufferGeometry().setFromPoints(points);
      const lonMaterial = new THREE.LineBasicMaterial({
        color: 0x00ffaa,
        transparent: true,
        opacity: 0.5
      });
      const lonLine = new THREE.Line(lonGeometry, lonMaterial);
      earthGroup.add(lonLine);
    }
  }

  private updateElectricalArcs(THREE: any, scene: any, electricalArcs: any[], time: number): void {
    const audio = this.currentAnalysisData;
    
    // Music-reactive arc generation - FEWER ARCS
    let arcProbability = 0.005; // Much lower base probability
    let maxArcs = 2; // Fewer base max arcs
    
    if (audio) {
      // Increase arc frequency based on music intensity
      arcProbability = 0.005 + audio.volume * 0.08; // Up to 8.5% chance
      maxArcs = Math.floor(2 + audio.volume * 4); // Up to 6 arcs max
      
      // Additional arcs on beats
      if (audio.beat) {
        arcProbability += 0.2;
      }
      
      // High frequency sounds trigger more arcs
      if (audio.frequencyBins && audio.frequencyBins.length > 0) {
        const highFreq = audio.frequencyBins[Math.floor(audio.frequencyBins.length * 0.8)] || 0;
        if (highFreq > 0.7) {
          arcProbability += 0.1;
        }
      }
    }
    
    // Generate new arcs based on music
    if (Math.random() < arcProbability && electricalArcs.length < maxArcs) {
      const instrumentColor = this.getInstrumentColor(audio);
      this.createElectricalArc(THREE, scene, electricalArcs, instrumentColor);
    }

    // Update existing arcs with enhanced glow effects
    for (let i = electricalArcs.length - 1; i >= 0; i--) {
      const arc = electricalArcs[i];
      arc.lifetime += 0.016;
      
      // Enhanced fade out with music intensity
      const baseOpacity = audio ? 0.8 + audio.volume * 0.4 : 0.8;
      const fadeProgress = arc.lifetime / arc.maxLifetime;
      arc.line.material.opacity = Math.max(0, baseOpacity * (1 - fadeProgress));
      
      // Update both glow layers
      if (arc.glow1) {
        arc.glow1.material.opacity = Math.max(0, (baseOpacity * 0.6) * (1 - fadeProgress));
        arc.glow1.scale.setScalar(2.0 + (audio?.volume || 0) * 0.5);
      }
      
      if (arc.glow2) {
        arc.glow2.material.opacity = Math.max(0, (baseOpacity * 0.3) * (1 - fadeProgress));
        arc.glow2.scale.setScalar(3.0 + (audio?.volume || 0) * 1.0);
      }
      
      // Remove expired arcs
      if (arc.lifetime >= arc.maxLifetime) {
        scene.remove(arc.line);
        arc.line.geometry.dispose();
        arc.line.material.dispose();
        
        if (arc.glow1) {
          scene.remove(arc.glow1);
          arc.glow1.geometry.dispose();
          arc.glow1.material.dispose();
        }
        
        if (arc.glow2) {
          scene.remove(arc.glow2);
          arc.glow2.geometry.dispose();
          arc.glow2.material.dispose();
        }
        
        electricalArcs.splice(i, 1);
      }
    }
  }

  private getInstrumentColor(audio: any): number {
    console.log('Getting instrument color, audio:', audio ? 'exists' : 'null');
    
    // Debug: When no music - use time-based rainbow
    if (!audio || !audio.frequencyBins || audio.frequencyBins.length === 0) {
      const time = Date.now() * 0.001;
      const hue = ((time * 0.3) % 1) * 360;
      console.log('No audio - using rainbow hue:', hue);
      return this.hslToHex(hue, 1, 0.7); // Bright rainbow when no music
    }
    
    console.log('Audio frequency bins length:', audio.frequencyBins.length);
    
    // Simplified frequency analysis with LOWER thresholds for more color variety
    const totalBins = audio.frequencyBins.length;
    const bass = audio.frequencyBins.slice(0, Math.floor(totalBins * 0.2));
    const mids = audio.frequencyBins.slice(Math.floor(totalBins * 0.2), Math.floor(totalBins * 0.6));
    const highs = audio.frequencyBins.slice(Math.floor(totalBins * 0.6));
    
    // Calculate levels WITHOUT normalization (use raw values)
    const bassLevel = bass.reduce((a: number, b: number) => a + b, 0) / bass.length;
    const midLevel = mids.reduce((a: number, b: number) => a + b, 0) / mids.length;
    const highLevel = highs.reduce((a: number, b: number) => a + b, 0) / highs.length;
    
    console.log('Frequency levels - Bass:', bassLevel, 'Mid:', midLevel, 'High:', highLevel);
    
    // MUCH LOWER threshold for more responsive colors
    const threshold = 5; // Very low threshold
    const maxLevel = Math.max(bassLevel, midLevel, highLevel);
    
    // More aggressive color selection
    if (bassLevel > threshold && bassLevel >= midLevel && bassLevel >= highLevel) {
      console.log('Bass dominant - RED');
      return 0xff2200; // Bright red for bass
    } else if (midLevel > threshold && midLevel >= bassLevel && midLevel >= highLevel) {
      console.log('Mid dominant - GREEN');
      return 0x22ff00; // Bright green for mids
    } else if (highLevel > threshold && highLevel >= bassLevel && highLevel >= midLevel) {
      console.log('High dominant - BLUE');
      return 0x0022ff; // Bright blue for highs
    } else if (maxLevel > threshold) {
      // Mixed frequencies - use volume-based colors
      const time = Date.now() * 0.001;
      const volumeHue = ((audio.volume || 0) * 360 + time * 30) % 360;
      console.log('Mixed frequencies - volume hue:', volumeHue);
      return this.hslToHex(volumeHue, 1, 0.7);
    }
    
    // Fallback - rotating colors
    const time = Date.now() * 0.001;
    const hue = ((time * 0.5) % 1) * 360;
    console.log('Fallback - rainbow hue:', hue);
    return this.hslToHex(hue, 1, 0.7);
  }
  
  private hslToHex(h: number, s: number, l: number): number {
    h = h / 360;
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    const r = hue2rgb(p, q, h + 1/3);
    const g = hue2rgb(p, q, h);
    const b = hue2rgb(p, q, h - 1/3);
    
    return (Math.round(r * 255) << 16) + (Math.round(g * 255) << 8) + Math.round(b * 255);
  }

  private createElectricalArc(THREE: any, scene: any, electricalArcs: any[], instrumentColor?: number): void {
    // Create PERFECT HALF-CIRCLE arc between two points on earth surface
    const earthRadius = 3.0;
    
    // Start point - EXACTLY on sphere surface
    const startTheta = Math.random() * Math.PI * 2;
    const startPhi = Math.random() * Math.PI;
    const startPoint = new THREE.Vector3(
      earthRadius * Math.sin(startPhi) * Math.cos(startTheta),
      earthRadius * Math.sin(startPhi) * Math.sin(startTheta),
      earthRadius * Math.cos(startPhi)
    );
    
    // End point - EXACTLY on sphere surface, ensure reasonable distance
    let endPoint: any;
    let distance: number;
    do {
      const endTheta = Math.random() * Math.PI * 2;
      const endPhi = Math.random() * Math.PI;
      endPoint = new THREE.Vector3(
        earthRadius * Math.sin(endPhi) * Math.cos(endTheta),
        earthRadius * Math.sin(endPhi) * Math.sin(endTheta),
        earthRadius * Math.cos(endPhi)
      );
      distance = startPoint.distanceTo(endPoint);
    } while (distance < 1.5 || distance > 8); // Ensure good arc distance
    
    // Create PERFECT SEMICIRCLE
    const midPoint = new THREE.Vector3().addVectors(startPoint, endPoint).multiplyScalar(0.5);
    const chordLength = startPoint.distanceTo(endPoint);
    const arcRadius = chordLength * 0.4; // Control arc height
    
    // Create semicircle points
    const segments = 32;
    const points = [];
    
    // Calculate perpendicular vector for arc plane
    const chordVector = new THREE.Vector3().subVectors(endPoint, startPoint);
    const upVector = midPoint.clone().normalize(); // Points away from earth center
    const perpVector = new THREE.Vector3().crossVectors(chordVector, upVector).normalize();
    
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const angle = Math.PI * t; // Half circle: 0 to π
      
      // Perfect semicircle calculation
      const x = Math.cos(angle) - 1; // -1 to 1, starting at -1
      const y = Math.sin(angle);     // 0 to 1 to 0
      
      // Transform to world space
      const localPoint = new THREE.Vector3(
        x * chordLength * 0.5,  // Along chord direction
        0,                       // No side displacement
        y * arcRadius           // Arc height
      );
      
      // Rotate to correct orientation
      const worldPoint = new THREE.Vector3();
      const chordDir = chordVector.clone().normalize();
      const arcUpDir = upVector.clone();
      
      worldPoint.copy(midPoint);
      worldPoint.add(chordDir.clone().multiplyScalar(localPoint.x));
      worldPoint.add(arcUpDir.clone().multiplyScalar(localPoint.z));
      
      points.push(worldPoint);
    }
    
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    
    // Use instrument color but make it MUCH BRIGHTER for bloom effect
    let arcColor = instrumentColor || 0x00ccff;
    
    // BOOST brightness for bloom threshold (multiply RGB values)
    const color = new THREE.Color(arcColor);
    const brightColor = new THREE.Color(
      Math.min(color.r * 3, 1), // 3x brighter red
      Math.min(color.g * 3, 1), // 3x brighter green  
      Math.min(color.b * 3, 1)  // 3x brighter blue
    );
    
    // BRIGHT BLOOM-READY MATERIALS
    
    // Layer 1: Ultra-bright core for bloom effect
    const coreMaterial = new THREE.LineBasicMaterial({
      color: brightColor,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending  // Additive + bright color = bloom glow!
    });
    const line = new THREE.Line(geometry, coreMaterial);
    
    // Layer 2: Medium glow 
    const glowMaterial1 = new THREE.LineBasicMaterial({
      color: brightColor,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending
    });
    const glow1 = new THREE.Line(geometry.clone(), glowMaterial1);
    glow1.scale.setScalar(1.05); // Slightly larger
    
    // Layer 3: Soft outer glow
    const glowMaterial2 = new THREE.LineBasicMaterial({
      color: brightColor,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending
    });
    const glow2 = new THREE.Line(geometry.clone(), glowMaterial2);
    glow2.scale.setScalar(1.1); // Larger outer glow

    // Create arc object with enhanced properties
    const arcObject = {
      line: line,
      glow1: glow1,
      glow2: glow2,
      lifetime: 0,
      maxLifetime: 0.4 + Math.random() * 0.6, // Longer lifetime
      color: arcColor,
      brightColor: brightColor
    };

    electricalArcs.push(arcObject);
    scene.add(line);
    scene.add(glow1);
    scene.add(glow2);
  }

  private async initializeAudioEngine(): Promise<void> {
    if (!this.audioFile) return;

    try {
      // Load audio file into engine
      await this.audioEngine.loadAudioFile(this.audioFile);
      
      // Update audio file with actual duration and sample rate
      this.audioFile.duration = this.audioEngine.getDuration();
      this.playbackState.duration = this.audioFile.duration;
      
      // Update song name in UI
      this.updateSongName();
      
      // Hide loading screen now that everything is ready
      const loading = document.getElementById('loading');
      if (loading) {
        loading.style.display = 'none';
      }
      
      console.log('Audio engine initialized with file:', this.audioFile.name);
      console.log('Audio ready - duration:', this.audioFile.duration, 'seconds');
    } catch (error) {
      console.error('Failed to initialize audio engine:', error);
      
      // Show error message to user
      const loading = document.getElementById('loading');
      if (loading) {
        loading.innerHTML = '<div class="loading-text">Audio Processing Failed</div><div>Please try a different audio file or reload the app</div>';
      }
    }
  }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new MusicVisualizerRenderer();
});
