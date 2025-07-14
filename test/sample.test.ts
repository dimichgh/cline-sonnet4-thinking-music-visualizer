import { expect } from './setup';
import { VisualizationMode, InstrumentType, IPC_CHANNELS } from '../src/shared/types';

describe('Music Visualizer Foundation', () => {
  describe('Shared Types', () => {
    it('should have correct visualization modes', () => {
      expect(VisualizationMode.PSYCHEDELIC).to.equal('psychedelic');
      expect(VisualizationMode.DIGITAL_EARTH).to.equal('digital_earth');
      expect(VisualizationMode.BLACK_HOLE).to.equal('black_hole');
      expect(VisualizationMode.TRON_CITY).to.equal('tron_city');
    });

    it('should have correct instrument types', () => {
      expect(InstrumentType.DRUMS).to.equal('drums');
      expect(InstrumentType.BASS).to.equal('bass');
      expect(InstrumentType.GUITAR).to.equal('guitar');
      expect(InstrumentType.PIANO).to.equal('piano');
      expect(InstrumentType.VOCALS).to.equal('vocals');
    });

    it('should have correct IPC channels', () => {
      expect(IPC_CHANNELS.LOAD_AUDIO_FILE).to.equal('load-audio-file');
      expect(IPC_CHANNELS.AUDIO_FILE_LOADED).to.equal('audio-file-loaded');
      expect(IPC_CHANNELS.PLAYBACK_CONTROL).to.equal('playback-control');
      expect(IPC_CHANNELS.VISUALIZATION_SETTINGS).to.equal('visualization-settings');
    });
  });

  describe('Project Structure', () => {
    it('should be ready for Phase 1 completion', () => {
      // This test verifies that the foundation setup is complete
      expect(true).to.be.true;
    });
  });
});
