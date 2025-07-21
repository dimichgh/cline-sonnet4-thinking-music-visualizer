import { VisualizationMode, AudioFile } from '@shared/types';

/**
 * Handles all event management including keyboard shortcuts, drag/drop, and IPC
 */
export class EventManager {
  private callbacks: {
    onModeSwitch?: (mode: VisualizationMode) => void;
    onLoadFile?: () => void;
    onTogglePlayback?: () => void;
    onStopPlayback?: () => void;
    onSeek?: (time: number) => void;
    onAudioFileLoaded?: (audioFile: AudioFile) => void;
    onDroppedFile?: (file: File) => void;
  } = {};

  // Auto-hide control panel state
  private isPinned = false;
  private hideTimeout: NodeJS.Timeout | null = null;
  private controlsPanel: HTMLElement | null = null;
  private pinButton: HTMLElement | null = null;
  private hoverZone: HTMLElement | null = null;
  private justUnpinned = false; // Flag to prevent immediate show after unpin

  constructor() {
    this.setupEventListeners();
    this.setupDragAndDrop();
    this.setupIPC();
    this.setupKeyboard();
    this.setupAutoHideControls();
  }

  public setCallbacks(callbacks: typeof this.callbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  private setupEventListeners(): void {
    // Mode selector buttons
    const modeButtons = document.querySelectorAll('.mode-button');
    modeButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const target = e.target as HTMLButtonElement;
        const mode = target.dataset.mode as VisualizationMode;
        if (mode && this.callbacks.onModeSwitch) {
          this.callbacks.onModeSwitch(mode);
        }
      });
    });

    // Control buttons
    const loadFileBtn = document.getElementById('load-file-btn');
    loadFileBtn?.addEventListener('click', () => {
      if (this.callbacks.onLoadFile) {
        this.callbacks.onLoadFile();
      }
    });

    const playPauseBtn = document.getElementById('play-pause-btn');
    playPauseBtn?.addEventListener('click', () => {
      if (this.callbacks.onTogglePlayback) {
        this.callbacks.onTogglePlayback();
      }
    });

    const stopBtn = document.getElementById('stop-btn');
    stopBtn?.addEventListener('click', () => {
      if (this.callbacks.onStopPlayback) {
        this.callbacks.onStopPlayback();
      }
    });

    // Progress bar
    const progressContainer = document.getElementById('progress-container');
    progressContainer?.addEventListener('click', (e) => {
      if (this.callbacks.onSeek) {
        // Delegate to the main app which will use UIController
        this.callbacks.onSeek(e as any); // Pass the event, will be handled by main app
      }
    });
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
        if (file && this.callbacks.onDroppedFile) {
          this.callbacks.onDroppedFile(file);
        }
      }
    });
  }

  private setupIPC(): void {
    // Listen for audio file loaded from main process
    window.electronAPI?.onAudioFileLoaded((audioFile: AudioFile) => {
      if (this.callbacks.onAudioFileLoaded) {
        this.callbacks.onAudioFileLoaded(audioFile);
      }
    });

    // Listen for visualization mode changes
    window.electronAPI?.onVisualizationSettings((settings: any) => {
      if (settings.mode && this.callbacks.onModeSwitch) {
        this.callbacks.onModeSwitch(settings.mode);
      }
    });

    // Listen for playback control messages
    window.electronAPI?.onPlaybackControl((control: any) => {
      switch (control.action) {
        case 'toggle':
          if (this.callbacks.onTogglePlayback) {
            this.callbacks.onTogglePlayback();
          }
          break;
        case 'stop':
          if (this.callbacks.onStopPlayback) {
            this.callbacks.onStopPlayback();
          }
          break;
      }
    });
  }

  private setupKeyboard(): void {
    document.addEventListener('keydown', (e) => this.handleKeyboard(e));
  }

  private handleKeyboard(e: KeyboardEvent): void {
    switch (e.key) {
      case ' ':
        e.preventDefault();
        if (this.callbacks.onTogglePlayback) {
          this.callbacks.onTogglePlayback();
        }
        break;
      case '1':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          if (this.callbacks.onModeSwitch) {
            this.callbacks.onModeSwitch(VisualizationMode.PSYCHEDELIC);
          }
        }
        break;
      case '2':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          if (this.callbacks.onModeSwitch) {
            this.callbacks.onModeSwitch(VisualizationMode.DIGITAL_EARTH);
          }
        }
        break;
      case '3':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          if (this.callbacks.onModeSwitch) {
            this.callbacks.onModeSwitch(VisualizationMode.BLACK_HOLE);
          }
        }
        break;
      case '4':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          if (this.callbacks.onModeSwitch) {
            this.callbacks.onModeSwitch(VisualizationMode.TRON_CITY);
          }
        }
        break;
      case '5':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          if (this.callbacks.onModeSwitch) {
            this.callbacks.onModeSwitch(VisualizationMode.WIREFRAME_GEOMETRY);
          }
        }
        break;
      case 'o':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          if (this.callbacks.onLoadFile) {
            this.callbacks.onLoadFile();
          }
        }
        break;
      case 'F11':
        e.preventDefault();
        window.electronAPI?.windowControls('fullscreen');
        break;
    }
  }

  public updateModeButtons(activeMode: VisualizationMode): void {
    const modeButtons = document.querySelectorAll('.mode-button');
    modeButtons.forEach(button => {
      const buttonElement = button as HTMLButtonElement;
      if (buttonElement.dataset.mode === activeMode) {
        buttonElement.classList.add('active');
      } else {
        buttonElement.classList.remove('active');
      }
    });
  }

  private setupAutoHideControls(): void {
    this.controlsPanel = document.getElementById('controls');
    this.pinButton = document.getElementById('pin-button');
    this.hoverZone = document.getElementById('hover-zone');

    if (!this.controlsPanel || !this.pinButton || !this.hoverZone) {
      console.warn('Auto-hide controls setup failed - missing elements');
      return;
    }

    // Set up pin button functionality
    this.pinButton.addEventListener('click', () => {
      this.togglePin();
    });

    // Set up mouse events for auto-hide
    this.setupMouseEvents();

    // Start with controls visible for a few seconds, then auto-hide
    this.scheduleHide(3000); // Hide after 3 seconds initially
  }

  private setupMouseEvents(): void {
    if (!this.controlsPanel || !this.hoverZone) return;

    // Show controls when hovering over the bottom area
    this.hoverZone.addEventListener('mouseenter', () => {
      this.showControls();
    });

    // Show controls when hovering over the controls themselves
    this.controlsPanel.addEventListener('mouseenter', () => {
      this.showControls();
    });

    // Hide controls when leaving the control area (unless pinned)
    this.controlsPanel.addEventListener('mouseleave', () => {
      if (!this.isPinned) {
        this.scheduleHide(1000); // Hide after 1 second delay
      }
    });

    // Also show controls on any mouse movement near the bottom
    document.addEventListener('mousemove', (e) => {
      const windowHeight = window.innerHeight;
      const mouseY = e.clientY;
      
      // If mouse is in bottom 20% of screen, show controls
      if (mouseY > windowHeight * 0.8) {
        this.showControls();
      } else if (!this.isPinned && mouseY < windowHeight * 0.6) {
        // If mouse is in top 60% of screen and not pinned, schedule hide
        this.scheduleHide(2000);
      }
    });
  }

  private togglePin(): void {
    this.isPinned = !this.isPinned;
    
    if (!this.pinButton || !this.controlsPanel) return;

    if (this.isPinned) {
      // Pin the controls
      this.justUnpinned = false; // Clear the flag when pinning
      this.pinButton.classList.add('pinned');
      this.controlsPanel.classList.add('pinned');
      this.controlsPanel.classList.remove('hidden');
      this.clearHideTimeout();
    } else {
      // Unpin the controls
      this.justUnpinned = true; // Set flag to prevent immediate show
      this.pinButton.classList.remove('pinned');
      this.controlsPanel.classList.remove('pinned');
      
      // Force hide immediately to prevent hover interference
      this.hideControls();
      
      // Clear the flag after a short delay
      setTimeout(() => {
        this.justUnpinned = false;
      }, 500); // 500ms cooldown after unpinning
    }
  }

  private showControls(): void {
    if (!this.controlsPanel) return;
    
    // Don't show if we just unpinned (prevents immediate show from hover)
    if (this.justUnpinned) return;

    this.controlsPanel.classList.remove('hidden');
    this.clearHideTimeout();
    
    // If not pinned, schedule auto-hide
    if (!this.isPinned) {
      this.scheduleHide(3000);
    }
  }

  private hideControls(): void {
    if (!this.controlsPanel || this.isPinned) return;

    this.controlsPanel.classList.add('hidden');
  }

  private scheduleHide(delay: number): void {
    if (this.isPinned) return;

    this.clearHideTimeout();
    this.hideTimeout = setTimeout(() => {
      this.hideControls();
    }, delay);
  }

  private clearHideTimeout(): void {
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
      this.hideTimeout = null;
    }
  }
}
