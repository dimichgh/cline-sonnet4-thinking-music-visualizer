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

  constructor() {
    this.setupEventListeners();
    this.setupDragAndDrop();
    this.setupIPC();
    this.setupKeyboard();
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
}
