const { contextBridge, ipcRenderer } = require('electron');

console.log('🔌 Preload script loaded');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Tab management
  createTab: () => {
    console.log('📞 IPC: createTab called');
    return ipcRenderer.invoke('tab:create');
  },
  closeTab: (id) => {
    console.log('📞 IPC: closeTab called', id);
    return ipcRenderer.invoke('tab:close', id);
  },
  switchTab: (id) => {
    console.log('📞 IPC: switchTab called', id);
    return ipcRenderer.invoke('tab:switch', id);
  },

  // Navigation
  navigate: (id, url) => {
    console.log('📞 IPC: navigate called', id, url);
    return ipcRenderer.invoke('navigate', id, url);
  },
  goBack: (id) => {
    console.log('📞 IPC: goBack called', id);
    return ipcRenderer.invoke('go-back', id);
  },
  goForward: (id) => {
    console.log('📞 IPC: goForward called', id);
    return ipcRenderer.invoke('go-forward', id);
  },
  reload: (id) => {
    console.log('📞 IPC: reload called', id);
    return ipcRenderer.invoke('reload', id);
  },

  // Listeners
  onTabsUpdate: (callback) => {
    console.log('📞 IPC: onTabsUpdate listener registered');
    ipcRenderer.on('tabs-update', (_, data) => {
      console.log('📞 IPC: tabs-update received', data);
      callback(data);
    });
  },
});