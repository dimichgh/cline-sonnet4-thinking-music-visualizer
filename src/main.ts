import { app, BrowserWindow, Menu, dialog, ipcMain } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { AudioFile, IPC_CHANNELS } from './shared/types';

class MusicVisualizerApp {
  private mainWindow: BrowserWindow | null = null;
  private isDevelopment = process.env.NODE_ENV !== 'production';

  constructor() {
    this.initializeApp();
  }

  private initializeApp(): void {
    // Set memory limits before app is ready
    app.commandLine.appendSwitch('max-old-space-size', '16384');
    app.commandLine.appendSwitch('max-semi-space-size', '2048');
    app.commandLine.appendSwitch('js-flags', '--max-old-space-size=16384');
    
    // Handle app events
    app.whenReady().then(() => {
      this.createWindow();
      this.setupMenu();
      this.setupIPC();
    });

    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        this.createWindow();
      }
    });
  }

  private createWindow(): void {
    // Create the browser window
    this.mainWindow = new BrowserWindow({
      width: 1400,
      height: 900,
      minWidth: 1000,
      minHeight: 600,
      title: 'Music Visualizer',
      icon: path.join(__dirname, '../assets/icon.png'),
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js'),
        webSecurity: !this.isDevelopment,
        additionalArguments: [
          '--max-old-space-size=16384',
          '--max-semi-space-size=2048'
        ]
      },
      titleBarStyle: 'hiddenInset',
      backgroundColor: '#000000',
      show: false
    });

    // Load the app
    const indexPath = `file://${path.join(__dirname, 'index.html')}`;
    
    this.mainWindow.loadURL(indexPath);

    // Show window when ready
    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow?.show();
      
      if (this.isDevelopment) {
        this.mainWindow?.webContents.openDevTools();
      }
    });

    // Handle window closed
    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });
  }

  private setupMenu(): void {
    const template: Electron.MenuItemConstructorOptions[] = [
      {
        label: 'File',
        submenu: [
          {
            label: 'Open Audio File',
            accelerator: 'CmdOrCtrl+O',
            click: () => this.openAudioFile()
          },
          { type: 'separator' },
          {
            label: 'Exit',
            accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
            click: () => app.quit()
          }
        ]
      },
      {
        label: 'View',
        submenu: [
          {
            label: 'Psychedelic Mode',
            accelerator: 'CmdOrCtrl+1',
            click: () => this.switchVisualizationMode('psychedelic')
          },
          {
            label: 'Digital Earth Mode',
            accelerator: 'CmdOrCtrl+2',
            click: () => this.switchVisualizationMode('digital_earth')
          },
          {
            label: 'Black Hole Mode',
            accelerator: 'CmdOrCtrl+3',
            click: () => this.switchVisualizationMode('black_hole')
          },
          {
            label: 'Tron City Mode',
            accelerator: 'CmdOrCtrl+4',
            click: () => this.switchVisualizationMode('tron_city')
          },
          { type: 'separator' },
          {
            label: 'Toggle Fullscreen',
            accelerator: 'F11',
            click: () => {
              if (this.mainWindow) {
                this.mainWindow.setFullScreen(!this.mainWindow.isFullScreen());
              }
            }
          }
        ]
      },
      {
        label: 'Playback',
        submenu: [
          {
            label: 'Play/Pause',
            accelerator: 'Space',
            click: () => this.sendPlaybackControl('toggle')
          },
          {
            label: 'Stop',
            accelerator: 'CmdOrCtrl+.',
            click: () => this.sendPlaybackControl('stop')
          }
        ]
      }
    ];

    if (process.platform === 'darwin') {
      template.unshift({
        label: app.getName(),
        submenu: [
          { role: 'about' },
          { type: 'separator' },
          { role: 'services' },
          { type: 'separator' },
          { role: 'hide' },
          { role: 'hideOthers' },
          { role: 'unhide' },
          { type: 'separator' },
          { role: 'quit' }
        ]
      });
    }

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  }

  private setupIPC(): void {
    // Handle file loading requests
    ipcMain.handle(IPC_CHANNELS.LOAD_AUDIO_FILE, async () => {
      return await this.openAudioFile();
    });

    // Handle window control requests
    ipcMain.handle(IPC_CHANNELS.WINDOW_CONTROLS, async (event, action: string) => {
      if (!this.mainWindow) return;

      switch (action) {
        case 'minimize':
          this.mainWindow.minimize();
          break;
        case 'maximize':
          if (this.mainWindow.isMaximized()) {
            this.mainWindow.unmaximize();
          } else {
            this.mainWindow.maximize();
          }
          break;
        case 'close':
          this.mainWindow.close();
          break;
        case 'fullscreen':
          this.mainWindow.setFullScreen(!this.mainWindow.isFullScreen());
          break;
      }
    });
  }

  private async openAudioFile(): Promise<AudioFile | null> {
    if (!this.mainWindow) return null;

    try {
      const result = await dialog.showOpenDialog(this.mainWindow, {
        title: 'Select Audio File',
        filters: [
          { name: 'Audio Files', extensions: ['wav', 'mp3', 'flac', 'aac', 'm4a'] },
          { name: 'WAV Files', extensions: ['wav'] },
          { name: 'All Files', extensions: ['*'] }
        ],
        properties: ['openFile']
      });

      if (result.canceled || result.filePaths.length === 0) {
        return null;
      }

      const filePath = result.filePaths[0];
      if (!filePath) {
        return null;
      }

      const fileName = path.basename(filePath);
      const stats = fs.statSync(filePath);
      const fileData = fs.readFileSync(filePath);

      // Create AudioFile object with file data
      const audioFile: AudioFile = {
        name: fileName,
        path: filePath,
        data: fileData.buffer.slice(fileData.byteOffset, fileData.byteOffset + fileData.byteLength),
        size: stats.size,
        type: path.extname(filePath).toLowerCase()
      };

      // Send to renderer process
      this.mainWindow?.webContents.send(IPC_CHANNELS.AUDIO_FILE_LOADED, audioFile);
      
      return audioFile;
    } catch (error) {
      console.error('Error opening audio file:', error);
      return null;
    }
  }

  private switchVisualizationMode(mode: string): void {
    if (this.mainWindow) {
      this.mainWindow.webContents.send(IPC_CHANNELS.VISUALIZATION_SETTINGS, {
        mode
      });
    }
  }

  private sendPlaybackControl(action: string): void {
    if (this.mainWindow) {
      this.mainWindow.webContents.send(IPC_CHANNELS.PLAYBACK_CONTROL, {
        action
      });
    }
  }
}

// Initialize the application
new MusicVisualizerApp();
