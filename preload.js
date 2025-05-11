const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
  'api', {
    getNotes: () => ipcRenderer.invoke('get-notes'),
    createNote: (title) => ipcRenderer.invoke('create-note', title),
    saveNote: (note) => ipcRenderer.invoke('save-note', note),
    readNote: (title) => ipcRenderer.invoke('read-note', title),
    deleteNote: (title) => ipcRenderer.invoke('delete-note', title)
  }
);
