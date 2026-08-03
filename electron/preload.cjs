const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('dorkADesktop', {
  openSearch: (url) => ipcRenderer.invoke('dorka:open-search', url),
});
