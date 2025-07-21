# 🎵 Music Visualizer

A powerful Electron-based music visualizer that transforms your audio into stunning real-time 3D visualizations.

## 📸 Demo

| Digital Earth Mode | Wireframe Geometry Mode |
|:------------------:|:----------------------:|
| ![Digital Earth](./assets/digital-earth-demo.png) | ![Wireframe](./assets/wireframe-demo.png) |

*Immersive 3D visualizations that react dynamically to your music's rhythm, frequency, and intensity*

## ✨ Features

### 🎨 Visualization Modes
- **Digital Earth** - 3D Earth with audio-reactive continent bars and electrical rings
- **Wireframe Geometry** - Morphing geometric shapes with pulsing effects
- **Psychedelic** - Abstract flowing patterns and colors
- **Black Hole** - Gravitational effects with particle systems
- **Tron City** - Futuristic grid-based visualizations

### 🎵 Audio Analysis
- **Real-time frequency analysis** with 1024-bin FFT
- **Beat detection** for rhythm-synchronized effects
- **Instrument detection** for color-coded visualizations
- **Dynamic intensity scaling** based on decibel levels (-80 dB threshold)
- **Support for multiple formats**: WAV, MP3, FLAC, AAC, M4A

### 🎮 Interactive Controls
- **Auto-hide control panel** with pin/unpin functionality
- **Smooth animations** with 0.3s CSS transitions
- **Keyboard shortcuts** for all major functions
- **Drag & drop** audio file loading
- **Progress bar** with click-to-seek

### 🌟 Visual Effects
- **Bloom post-processing** for intense glow effects
- **Audio-reactive brightness** (3x to 10x scaling)
- **Dynamic color system** with spectral frequency mapping
- **Beat-driven color shifts** for dramatic visual impact
- **Smooth morphing transitions** between visualization states

## 🚀 Getting Started

### Prerequisites
- Node.js 16.x or higher
- npm or yarn package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/music-visualizer.git
   cd music-visualizer
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the application**
   ```bash
   npm run build
   ```

4. **Start the application**
   ```bash
   npm start
   ```

### Development

For development with hot reload:
```bash
npm run dev
```

## 🎹 Usage

### Loading Music
- **File Menu**: Use `Ctrl+O` (Windows/Linux) or `Cmd+O` (Mac)
- **Drag & Drop**: Simply drag audio files into the application window
- **Control Panel**: Click the "Load File" button

### Playback Controls
- **Spacebar**: Play/Pause
- **Stop Button**: Stop playback and reset position
- **Progress Bar**: Click to seek to any position

### Visualization Modes
- **Ctrl/Cmd + 1-5**: Switch between different visualization modes
- **Mode Buttons**: Click visualization mode buttons in control panel

### Control Panel
- **Auto-Hide**: Moves mouse to bottom 20% of screen to show controls
- **Pin/Unpin**: Click 📌 button to lock controls in place
- **Hover Detection**: Controls appear when hovering over bottom area

## 🛠️ Technical Details

### Architecture
- **Electron** - Cross-platform desktop framework
- **TypeScript** - Type-safe JavaScript development
- **Three.js** - 3D graphics and WebGL rendering
- **Web Audio API** - Real-time audio analysis
- **Modular Design** - Separated concerns with dedicated managers

### Audio Processing
```typescript
// Example: Real-time frequency analysis
const analyser = audioContext.createAnalyser();
analyser.fftSize = 2048;
const frequencyData = new Float32Array(analyser.frequencyBinCount);
analyser.getFloatFrequencyData(frequencyData);
```

### Visualization Pipeline
1. **Audio Analysis** - FFT processing and beat detection
2. **Data Processing** - Decibel-to-intensity conversion
3. **Effect Updates** - Geometry morphing and color changes
4. **Rendering** - Three.js scene with bloom post-processing

### Performance Optimizations
- **60 FPS target** with efficient animation loops
- **WebGL hardware acceleration** for 3D rendering
- **Selective audio thresholds** to prevent constant brightness
- **Memory management** with proper resource disposal

## 📁 Project Structure

```
src/
├── main.ts                 # Electron main process
├── preload.ts             # Secure IPC bridge
├── renderer/              # Frontend application
│   ├── app.ts            # Main application orchestrator
│   ├── audio/            # Audio processing modules
│   ├── ui/               # User interface controllers
│   ├── visualization/    # 3D visualization system
│   └── index.html        # Application UI
├── shared/               # Shared types and interfaces
test/                     # Unit tests
docs/                     # Documentation
plans/                    # Development planning
```

## 🧪 Testing

Run the test suite:
```bash
npm test
```

Technologies used:
- **Mocha** - Test framework
- **Chai** - Assertion library  
- **Sinon** - Test spies and mocks

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Three.js** community for excellent 3D graphics library
- **Web Audio API** specification contributors
- **Electron** team for cross-platform desktop development

---

*Built with ❤️ for music lovers and visual art enthusiasts*
