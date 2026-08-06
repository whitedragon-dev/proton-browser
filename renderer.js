console.log('🚀 Renderer script loaded');

// ===== STATE =====
let tabs = [];
let activeTabId = null;

// ===== DOM REFS =====
const tabBar = document.getElementById('tab-bar');
const emptyState = document.getElementById('empty-state');
const urlBar = document.getElementById('url-bar');
const goBtn = document.getElementById('go-btn');
const backBtn = document.getElementById('back-btn');
const forwardBtn = document.getElementById('forward-btn');
const reloadBtn = document.getElementById('reload-btn');
const newTabBtn = document.getElementById('new-tab-btn');

// ===== CHECK ELECTRON API =====
if (typeof window.electronAPI === 'undefined') {
  console.error('❌ electronAPI is undefined!');
  document.body.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;color:red;padding:20px;text-align:center;">
      <div>
        <h2>⚠️ Error: electronAPI not available</h2>
        <p>Preload script may not be loading correctly.</p>
        <p style="font-size:12px;color:#999;">Check main.js webPreferences preload path</p>
      </div>
    </div>
  `;
} else {
  console.log('✅ electronAPI available');
}

// ===== RENDER FUNCTION =====
function renderTabs(tabData) {
  console.log('📋 Rendering tabs:', tabData);
  tabs = tabData || [];
  
  const active = tabs.find(t => t.isActive);
  activeTabId = active ? active.id : (tabs[0]?.id || null);
  
  if (active) {
    urlBar.value = active.url && active.url !== 'about:blank' ? active.url : '';
  }
  
  // Update empty state
  if (tabs.length === 0) {
    emptyState.classList.add('visible');
  } else {
    emptyState.classList.remove('visible');
  }
  
  // Rebuild tab bar (keep new tab button)
  const newTabBtn = document.getElementById('new-tab-btn');
  tabBar.innerHTML = '';
  tabBar.appendChild(newTabBtn);
  
  // Render each tab
  tabs.forEach(tab => {
    const tabEl = document.createElement('button');
    tabEl.className = `tab ${tab.isActive ? 'active' : ''}`;
    tabEl.dataset.id = tab.id;
    
    // Loading spinner
    if (tab.isLoading) {
      const spinner = document.createElement('span');
      spinner.className = 'tab-loading';
      tabEl.appendChild(spinner);
    }
    
    // Title
    const title = document.createElement('span');
    title.className = 'tab-title';
    title.textContent = tab.title || 'New Tab';
    tabEl.appendChild(title);
    
    // Close button with DIRECT event binding
    const close = document.createElement('span');
    close.className = 'tab-close';
    close.textContent = '✕';
    close.addEventListener('click', function(e) {
      e.stopPropagation();
      console.log('🗑️ Closing tab:', tab.id);
      if (window.electronAPI) {
        window.electronAPI.closeTab(tab.id);
      }
    });
    tabEl.appendChild(close);
    
    // Tab click with DIRECT event binding
    tabEl.addEventListener('click', function() {
      console.log('🔄 Switching to tab:', tab.id);
      if (window.electronAPI) {
        window.electronAPI.switchTab(tab.id);
      }
    });
    
    tabBar.insertBefore(tabEl, newTabBtn);
  });
}

// ===== NAVIGATION FUNCTIONS =====
function navigate() {
  const url = urlBar.value.trim();
  if (!url) {
    console.log('❌ Empty URL');
    return;
  }
  if (!activeTabId) {
    console.log('❌ No active tab');
    return;
  }
  console.log('🌐 Navigating to:', url);
  if (window.electronAPI) {
    window.electronAPI.navigate(activeTabId, url);
  }
}

function goBack() {
  if (!activeTabId) return;
  console.log('⬅️ Going back');
  if (window.electronAPI) window.electronAPI.goBack(activeTabId);
}

function goForward() {
  if (!activeTabId) return;
  console.log('➡️ Going forward');
  if (window.electronAPI) window.electronAPI.goForward(activeTabId);
}

function reload() {
  if (!activeTabId) return;
  console.log('🔄 Reloading');
  if (window.electronAPI) window.electronAPI.reload(activeTabId);
}

function addTab() {
  console.log('➕ Creating new tab');
  if (window.electronAPI) window.electronAPI.createTab();
}

// ===== DIRECT EVENT BINDINGS =====
console.log('📌 Binding events...');

// URL Bar - Enter key
urlBar.addEventListener('keydown', function(e) {
  if (e.key === 'Enter') {
    console.log('⌨️ Enter pressed in URL bar');
    navigate();
  }
});

// Go button
goBtn.addEventListener('click', function() {
  console.log('🖱️ Go button clicked');
  navigate();
});

// Navigation buttons
backBtn.addEventListener('click', function() {
  console.log('🖱️ Back button clicked');
  goBack();
});

forwardBtn.addEventListener('click', function() {
  console.log('🖱️ Forward button clicked');
  goForward();
});

reloadBtn.addEventListener('click', function() {
  console.log('🖱️ Reload button clicked');
  reload();
});

// New tab button
newTabBtn.addEventListener('click', function() {
  console.log('🖱️ New tab button clicked');
  addTab();
});

// Shortcuts
document.querySelectorAll('.shortcut').forEach(function(el) {
  el.addEventListener('click', function() {
    const url = this.dataset.url;
    console.log('🖱️ Shortcut clicked:', url);
    if (url) {
      urlBar.value = url;
      navigate();
    }
  });
});

// ===== KEYBOARD SHORTCUTS =====
document.addEventListener('keydown', function(e) {
  // Ctrl+T: New tab
  if (e.ctrlKey && e.key === 't') {
    e.preventDefault();
    addTab();
  }
  
  // Ctrl+W: Close tab
  if (e.ctrlKey && e.key === 'w') {
    e.preventDefault();
    if (activeTabId && window.electronAPI) {
      window.electronAPI.closeTab(activeTabId);
    }
  }
  
  // Ctrl+Tab: Next tab
  if (e.ctrlKey && e.key === 'Tab' && !e.shiftKey) {
    e.preventDefault();
    if (tabs.length > 0 && window.electronAPI) {
      const currentIndex = tabs.findIndex(t => t.id === activeTabId);
      const nextIndex = (currentIndex + 1) % tabs.length;
      window.electronAPI.switchTab(tabs[nextIndex].id);
    }
  }
  
  // Ctrl+Shift+Tab: Previous tab
  if (e.ctrlKey && e.shiftKey && e.key === 'Tab') {
    e.preventDefault();
    if (tabs.length > 0 && window.electronAPI) {
      const currentIndex = tabs.findIndex(t => t.id === activeTabId);
      const prevIndex = (currentIndex - 1 + tabs.length) % tabs.length;
      window.electronAPI.switchTab(tabs[prevIndex].id);
    }
  }
  
  // F5: Reload
  if (e.key === 'F5') {
    e.preventDefault();
    reload();
  }
  
  // Alt+Left: Back
  if (e.altKey && e.key === 'ArrowLeft') {
    e.preventDefault();
    goBack();
  }
  
  // Alt+Right: Forward
  if (e.altKey && e.key === 'ArrowRight') {
    e.preventDefault();
    goForward();
  }
  
  // Ctrl+L: Focus URL bar
  if (e.ctrlKey && e.key === 'l') {
    e.preventDefault();
    urlBar.focus();
    urlBar.select();
  }
});

// ===== IPC LISTENER =====
if (window.electronAPI) {
  console.log('📡 Registering IPC listener...');
  window.electronAPI.onTabsUpdate(function(tabData) {
    console.log('📨 Received tabs update:', tabData);
    renderTabs(tabData);
  });
}

// ===== INITIAL STATE =====
console.log('✅ Proton Browser ready!');
urlBar.focus();