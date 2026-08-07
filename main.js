const { app, BrowserWindow, WebContentsView, ipcMain, shell } = require('electron');
const path = require('path');

let mainWindow = null;
let tabs = [];
let activeTabId = null;
let tabIdCounter = 0;

// Height of your UI (tab bar + address bar + shortcuts)
const UI_HEIGHT = 145;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 400,
    minHeight: 300,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
    frame: true,
    backgroundColor: '#f4f6f9',
  });

  mainWindow.loadFile('index.html');
  
  mainWindow.on('ready-to-show', () => {
    mainWindow.show();
    console.log('✅ Window ready');
    if (tabs.length === 0) {
      createTab('about:blank', true);
    }
  });

  mainWindow.webContents.openDevTools();

  mainWindow.on('resize', () => {
    if (activeTabId) {
      const tab = tabs.find(t => t.id === activeTabId);
      if (tab) {
        const [width, height] = mainWindow.getContentSize();
        tab.view.setBounds({
          x: 0,
          y: UI_HEIGHT,
          width: width,
          height: height - UI_HEIGHT,
        });
      }
    }
  });

  app.on('web-contents-created', (_, contents) => {
    if (contents.getType() === 'webview') return;
    contents.on('new-window', (e, url) => {
      e.preventDefault();
      shell.openExternal(url);
    });
  });
}

function createTab(url, switchToNewTab = true) {
  console.log('📂 Creating tab:', url, 'switchToNewTab:', switchToNewTab);
  const id = ++tabIdCounter;
  
  const view = new WebContentsView({
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      sandbox: true,
      spellcheck: false,
      nodeIntegration: false,
    },
  });

  const [width, height] = mainWindow.getContentSize();
  view.setBounds({
    x: 0,
    y: UI_HEIGHT,
    width: width,
    height: height - UI_HEIGHT,
  });
  
  mainWindow.contentView.addChildView(view);

  const tab = {
    id,
    view,
    title: url === 'about:blank' ? 'New Tab' : url,
    url: url,
    isLoading: false,
  };

  view.webContents.on('did-start-loading', () => {
    tab.isLoading = true;
    sendTabUpdate();
  });

  view.webContents.on('did-stop-loading', () => {
    tab.isLoading = false;
    sendTabUpdate();
  });

  view.webContents.on('did-navigate', (_, url) => {
    tab.url = url;
    tab.title = url;
    sendTabUpdate();
  });

  view.webContents.on('did-navigate-in-page', (_, url) => {
    tab.url = url;
    sendTabUpdate();
  });

  view.webContents.on('page-title-updated', (_, title) => {
    tab.title = title || url;
    sendTabUpdate();
  });

  view.webContents.on('did-fail-load', () => {
    tab.title = '⚠ Error';
    tab.isLoading = false;
    sendTabUpdate();
  });

  // Open links as background tabs
  view.webContents.setWindowOpenHandler((details) => {
    console.log('🔗 New window requested (background):', details.url);
    createTab(details.url, false);
    return { action: 'deny' };
  });

  tabs.push(tab);
  
  if (switchToNewTab) {
    switchTab(id);
  } else {
    const [width, height] = mainWindow.getContentSize();
    tab.view.setBounds({
      x: 0,
      y: UI_HEIGHT,
      width: width,
      height: height - UI_HEIGHT,
    });
    tab.view.setVisible(false);
    sendTabUpdate();
  }

  if (url && url !== 'about:blank') {
    view.webContents.loadURL(url).catch(() => {});
  }

  sendTabUpdate();
  return id;
}

function switchTab(id) {
  const tab = tabs.find(t => t.id === id);
  if (!tab) return;

  activeTabId = id;
  console.log('🔄 Switching to tab:', id);

  const [width, height] = mainWindow.getContentSize();

  tabs.forEach(t => {
    const isActive = t.id === id;
    if (isActive) {
      t.view.setBounds({
        x: 0,
        y: UI_HEIGHT,
        width: width,
        height: height - UI_HEIGHT,
      });
      t.view.setVisible(true);
    } else {
      t.view.setVisible(false);
    }
  });

  sendTabUpdate();
}

function closeTab(id) {
  console.log('🗑 Closing tab:', id);
  
  if (tabs.length === 1) {
    const tab = tabs[0];
    tab.view.webContents.loadURL('about:blank');
    tab.url = 'about:blank';
    tab.title = 'New Tab';
    sendTabUpdate();
    return;
  }

  const index = tabs.findIndex(t => t.id === id);
  if (index === -1) return;

  const tab = tabs[index];
  tab.view.webContents.destroy();
  mainWindow.contentView.removeChildView(tab.view);
  tabs.splice(index, 1);

  if (activeTabId === id) {
    const newIndex = Math.min(index, tabs.length - 1);
    switchTab(tabs[newIndex].id);
  }

  sendTabUpdate();
}

function navigateTo(id, url) {
  console.log('🌐 navigateTo called:', id, url);
  const tab = tabs.find(t => t.id === id);
  if (!tab) return;

  let sanitizedUrl = url.trim();
  if (!sanitizedUrl) return;

  if (!/^https?:\/\//i.test(sanitizedUrl) && !/^about:/i.test(sanitizedUrl)) {
    sanitizedUrl = 'https://' + sanitizedUrl;
  }

  try {
    const parsed = new URL(sanitizedUrl);
    const blocked = ['file:', 'javascript:', 'data:', 'chrome:', 'chrome-extension:'];
    if (blocked.includes(parsed.protocol)) return;
  } catch {
    sanitizedUrl = 'https://duckduckgo.com/?q=' + encodeURIComponent(url);
  }

  tab.url = sanitizedUrl;
  tab.title = sanitizedUrl;
  tab.view.webContents.loadURL(sanitizedUrl).catch(() => {});
  sendTabUpdate();
}

function goBack(id) {
  const tab = tabs.find(t => t.id === id);
  if (tab && tab.view.webContents.navigationHistory.canGoBack()) {
    tab.view.webContents.navigationHistory.goBack();
  }
}

function goForward(id) {
  const tab = tabs.find(t => t.id === id);
  if (tab && tab.view.webContents.navigationHistory.canGoForward()) {
    tab.view.webContents.navigationHistory.goForward();
  }
}

function reloadTab(id) {
  const tab = tabs.find(t => t.id === id);
  if (tab) {
    tab.view.webContents.reload();
  }
}

function sendTabUpdate() {
  if (!mainWindow) return;
  
  const tabData = tabs.map(t => ({
    id: t.id,
    title: t.title || 'New Tab',
    url: t.url,
    isLoading: t.isLoading,
    isActive: t.id === activeTabId,
  }));

  mainWindow.webContents.send('tabs-update', tabData);
}

// ===== IPC HANDLERS =====
ipcMain.handle('tab:create', () => createTab('about:blank', true));
ipcMain.handle('tab:close', (_, id) => closeTab(id));
ipcMain.handle('tab:switch', (_, id) => switchTab(id));
ipcMain.handle('navigate', (_, id, url) => navigateTo(id, url));
ipcMain.handle('go-back', (_, id) => goBack(id));
ipcMain.handle('go-forward', (_, id) => goForward(id));
ipcMain.handle('reload', (_, id) => reloadTab(id));

// ===== APP LIFECYCLE =====
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

console.log('🚀 Main process started');