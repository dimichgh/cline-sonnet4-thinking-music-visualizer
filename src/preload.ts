import { contextBridge, ipcRenderer } from 'electron';

// Define channel constants inline to avoid import issues
const IPC_CHANNELS = {
  LOAD_AUDIO_FILE: 'load-audio-file',
  AUDIO_FILE_LOADED: 'audio-file-loaded',
  WINDOW_CONTROLS: 'window-controls',
  VISUALIZATION_SETTINGS: 'visualization-settings',
  PLAYBACK_CONTROL: 'playback-control',
  AUDIO_ANALYSIS_DATA: 'audio-analysis-data'
};

// Define AudioFile interface inline
interface AudioFile {
  name: string;
  path: string;
  data: ArrayBuffer;
  size: number;
  type: string;
}

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // File operations
  loadAudioFile: (): Promise<AudioFile> => {
    return ipcRenderer.invoke(IPC_CHANNELS.LOAD_AUDIO_FILE);
  },

  // Window controls
  windowControls: (action: string): Promise<void> => {
    return ipcRenderer.invoke(IPC_CHANNELS.WINDOW_CONTROLS, action);
  },

  // Event listeners
  onAudioFileLoaded: (callback: (audioFile: AudioFile) => void): void => {
    ipcRenderer.on(IPC_CHANNELS.AUDIO_FILE_LOADED, (event, audioFile) => {
      callback(audioFile);
    });
  },

  onVisualizationSettings: (callback: (settings: any) => void): void => {
    ipcRenderer.on(IPC_CHANNELS.VISUALIZATION_SETTINGS, (event, settings) => {
      callback(settings);
    });
  },

  onPlaybackControl: (callback: (control: any) => void): void => {
    ipcRenderer.on(IPC_CHANNELS.PLAYBACK_CONTROL, (event, control) => {
      callback(control);
    });
  },

  onAudioAnalysisData: (callback: (data: any) => void): void => {
    ipcRenderer.on(IPC_CHANNELS.AUDIO_ANALYSIS_DATA, (event, data) => {
      callback(data);
    });
  },

  // Remove event listeners (cleanup)
  removeAllListeners: (channel: string): void => {
    ipcRenderer.removeAllListeners(channel);
  }
});
