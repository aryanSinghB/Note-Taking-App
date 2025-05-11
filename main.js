const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

// Store the main application window
let mainWindow;

// Path to store notes
let notesDirectory = path.join(app.getPath('documents'), 'NoteTakingApp');

// Ensure notes directory exists
if (!fs.existsSync(notesDirectory)) {
  fs.mkdirSync(notesDirectory, { recursive: true });
}

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Load the index.html of the app
  mainWindow.loadFile('index.html');

  // Optional: Open DevTools for debugging
  // mainWindow.webContents.openDevTools();
}

// Create the app window when Electron is ready
app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// IPC handlers for file operations
ipcMain.handle('get-notes', async () => {
  const notes = fs.readdirSync(notesDirectory)
    .filter(file => file.endsWith('.md'))
    .map(file => {
      return {
        filename: file,
        title: file.replace('.md', '')
      };
    });
  return notes;
});

ipcMain.handle('create-note', async (event, title) => {
  const filePath = path.join(notesDirectory, `${title}.md`);
  fs.writeFileSync(filePath, `# ${title}\n\nStart writing your note here...`);
  return { success: true, title };
});

ipcMain.handle('save-note', async (event, { title, content }) => {
  const filePath = path.join(notesDirectory, `${title}.md`);
  fs.writeFileSync(filePath, content);
  return { success: true };
});

ipcMain.handle('read-note', async (event, title) => {
  const filePath = path.join(notesDirectory, `${title}.md`);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    return { success: true, content };
  }
  return { success: false, error: 'Note not found' };
});

ipcMain.handle('delete-note', async (event, title) => {
  const filePath = path.join(notesDirectory, `${title}.md`);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    return { success: true };
  }
  return { success: false, error: 'Note not found' };
});
