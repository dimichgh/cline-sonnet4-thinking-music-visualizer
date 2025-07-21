import * as THREE from 'three';
import { expect } from '../setup';
import { WireframeGeometryMode } from '../../src/renderer/visualization/modes/WireframeGeometryMode';
import { VisualizationMode, AudioAnalysisData, InstrumentType } from '../../src/shared/types';

// Mock Three.js components that aren't available in Node.js
jest.mock('three/examples/jsm/postprocessing/EffectComposer.js', () => ({
  EffectComposer: jest.fn().mockImplementation(() => ({
    addPass: jest.fn(),
    setSize: jest.fn(),
    render: jest.fn(),
    dispose: jest.fn()
  }))
}));

jest.mock('three/examples/jsm/postprocessing/RenderPass.js', () => ({
  RenderPass: jest.fn()
}));

jest.mock('three/examples/jsm/postprocessing/UnrealBloomPass.js', () => ({
  UnrealBloomPass: jest.fn()
}));

jest.mock('three/examples/jsm/postprocessing/FilmPass.js', () => ({
  FilmPass: jest.fn()
}));

jest.mock('three/examples/jsm/postprocessing/OutputPass.js', () => ({
  OutputPass: jest.fn()
}));

function createMockAudioData(overrides: Partial<AudioAnalysisData> = {}): AudioAnalysisData {
  return {
    frequencies: new Float32Array(1024),
    timeDomain: new Float32Array(1024),
    frequencyBins: [0, 100, 200, 300, 400, 500],
    volume: 0.5,
    rms: 0.3,
    peak: 0.8,
    beat: false,
    tempo: 120,
    confidence: 0.7,
    spectralCentroid: 2000,
    spectralRolloff: 4000,
    zeroCrossingRate: 0.1,
    detectedInstruments: [],
    timestamp: Date.now(),
    ...overrides
  };
}

describe('WireframeGeometryMode', () => {
  let scene: THREE.Scene;
  let camera: THREE.Camera;
  let renderer: THREE.WebGLRenderer;
  let mode: WireframeGeometryMode;

  beforeEach(() => {
    // Create mock Three.js objects
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera();
    
    // Mock WebGL renderer
    renderer = {
      domElement: document.createElement('canvas'),
      setSize: jest.fn(),
      render: jest.fn(),
      dispose: jest.fn()
    } as any;

    mode = new WireframeGeometryMode(scene, camera, renderer);
  });

  afterEach(() => {
    if (mode) {
      mode.dispose();
    }
  });

  describe('Basic functionality', () => {
    it('should return correct mode type', () => {
      expect(mode.getMode()).toBe(VisualizationMode.WIREFRAME_GEOMETRY);
    });

    it('should initialize without errors', async () => {
      await expect(mode.init()).resolves.not.toThrow();
    });

    it('should activate and deactivate properly', () => {
      expect(() => {
        mode.activate();
        mode.deactivate();
      }).not.toThrow();
    });
  });

  describe('Audio responsiveness', () => {
    beforeEach(async () => {
      await mode.init();
      mode.activate();
    });

    it('should update without errors when given audio data', () => {
      const mockAudioData = createMockAudioData({
        volume: 0.5,
        beat: true,
        confidence: 0.8,
        spectralCentroid: 2000,
        spectralRolloff: 4000
      });

      const visualizationData = {
        audio: mockAudioData,
        deltaTime: 16.67, // ~60fps
        totalTime: 1000
      };

      expect(() => {
        mode.update(visualizationData);
      }).not.toThrow();
    });

    it('should handle different audio properties gracefully', () => {
      const mockAudioData = createMockAudioData({
        volume: 0.3,
        beat: false,
        confidence: 0.2
      });

      const visualizationData = {
        audio: mockAudioData,
        deltaTime: 16.67,
        totalTime: 1000
      };

      expect(() => {
        mode.update(visualizationData);
      }).not.toThrow();
    });
  });

  describe('Lifecycle', () => {
    it('should handle resize events', () => {
      expect(() => {
        mode.resize(1920, 1080);
      }).not.toThrow();
    });

    it('should dispose cleanly', () => {
      expect(() => {
        mode.dispose();
      }).not.toThrow();
    });

    it('should not update when inactive', () => {
      const mockAudioData = createMockAudioData({
        volume: 0.8,
        beat: true,
        confidence: 0.9,
        spectralCentroid: 3000,
        spectralRolloff: 6000
      });

      const visualizationData = {
        audio: mockAudioData,
        deltaTime: 16.67,
        totalTime: 1000
      };

      // Should not throw even when inactive
      expect(() => {
        mode.update(visualizationData);
      }).not.to.throw();
    });
  });

  describe('Rendering', () => {
    it('should have custom render method', () => {
      expect(typeof mode.render).to.equal('function');
      
      expect(() => {
        mode.render();
      }).not.to.throw();
    });
  });
});
