const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const isDev = require('electron-is-dev');

let mainWindow;

// Get saves directory
function getSavesDir() {
  const userDataPath = app.getPath('userData');
  const savesDir = path.join(userDataPath, 'saves');

  // Create directory if it doesn't exist
  if (!fs.existsSync(savesDir)) {
    fs.mkdirSync(savesDir, { recursive: true });
  }

  return savesDir;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Maximize window on startup
  mainWindow.maximize();

  // Load React app
  const startUrl = isDev
    ? 'http://localhost:3000'
    : `file://${path.join(__dirname, '../build/index.html')}`;

  mainWindow.loadURL(startUrl);

  // DevTools can be opened with F12 or Ctrl+Shift+I if needed
  // if (isDev) {
  //   mainWindow.webContents.openDevTools();
  // }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// IPC Handlers for file operations

// Save data to timestamped file
ipcMain.handle('save-data', async (event, data) => {
  try {
    const savesDir = getSavesDir();
    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    const filename = `save-${timestamp}.json`;
    const filepath = path.join(savesDir, filename);

    fs.writeFileSync(filepath, data, 'utf-8');

    return { success: true, path: filepath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Load latest save file
ipcMain.handle('load-latest-data', async () => {
  try {
    const savesDir = getSavesDir();

    if (!fs.existsSync(savesDir)) {
      throw new Error('No saves directory found');
    }

    const files = fs.readdirSync(savesDir)
      .filter(file => file.endsWith('.json'))
      .map(file => ({
        name: file,
        path: path.join(savesDir, file),
        mtime: fs.statSync(path.join(savesDir, file)).mtime
      }))
      .sort((a, b) => b.mtime - a.mtime);

    if (files.length === 0) {
      throw new Error('No save files found');
    }

    const latestFile = files[0];
    const data = fs.readFileSync(latestFile.path, 'utf-8');

    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// List all save files
ipcMain.handle('list-saves', async () => {
  try {
    const savesDir = getSavesDir();

    if (!fs.existsSync(savesDir)) {
      return { success: true, files: [] };
    }

    const files = fs.readdirSync(savesDir)
      .filter(file => file.endsWith('.json'))
      .map(file => ({
        name: file,
        path: path.join(savesDir, file),
        mtime: fs.statSync(path.join(savesDir, file)).mtime
      }))
      .sort((a, b) => b.mtime - a.mtime)
      .map(f => f.name);

    return { success: true, files };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Export data to exports folder
ipcMain.handle('export-data', async (event, data) => {
  try {
    const userDataPath = app.getPath('userData');
    const exportsDir = path.join(userDataPath, 'exports');

    // Create exports directory if it doesn't exist
    if (!fs.existsSync(exportsDir)) {
      fs.mkdirSync(exportsDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `course-planner-export-${timestamp}.json`;
    const filepath = path.join(exportsDir, filename);

    fs.writeFileSync(filepath, data, 'utf-8');

    return { success: true, path: filepath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Import data with file dialog starting in saves folder
ipcMain.handle('import-data', async () => {
  try {
    const savesDir = getSavesDir();

    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Import Course Planner Data',
      defaultPath: savesDir,
      filters: [
        { name: 'JSON Files', extensions: ['json'] },
        { name: 'All Files', extensions: ['*'] }
      ],
      properties: ['openFile']
    });

    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, error: 'No file selected' };
    }

    const filepath = result.filePaths[0];
    const data = fs.readFileSync(filepath, 'utf-8');

    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
