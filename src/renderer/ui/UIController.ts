import { PlaybackState, AudioFile } from '@shared/types';

/**
 * Handles UI updates for playback controls, progress bars, and time display
 */
export class UIController {
  private playbackState: PlaybackState = {
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 1.0,
    loop: false
  };

  private audioFile: AudioFile | null = null;
  private updateTimer: number | null = null;

  public setPlaybackState(state: PlaybackState): void {
    this.playbackState = state;
    this.updateUI();
  }

  public setAudioFile(audioFile: AudioFile | null): void {
    this.audioFile = audioFile;
    this.updateSongName();
  }

  public getCurrentTime(): number {
    return this.playbackState.currentTime;
  }

  public setCurrentTime(time: number): void {
    this.playbackState.currentTime = time;
    this.updateProgressBar();
    this.updateTimeInfo();
  }

  public startUpdateTimer(getCurrentTimeCallback: () => number): void {
    this.stopUpdateTimer(); // Clear any existing timer
    this.updateTimer = window.setInterval(() => {
      // Update current time from audio engine
      this.playbackState.currentTime = getCurrentTimeCallback();
      this.updateProgressBar();
      this.updateTimeInfo();
    }, 100); // Update every 100ms for smooth progress
  }

  public stopUpdateTimer(): void {
    if (this.updateTimer !== null) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }
  }

  public handleProgressClick(e: MouseEvent): number | null {
    if (!this.audioFile || !this.audioFile.duration || this.audioFile.duration === 0) return null;

    const progressContainer = e.currentTarget as HTMLElement;
    const rect = progressContainer.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    
    return percentage * this.audioFile.duration;
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
}
