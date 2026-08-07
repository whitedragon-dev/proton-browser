console.log('🚀 Renderer script loaded');

let tabs = [];
let activeTabId = null;

const tabBar = document.getElementById('tab-bar');
const emptyState = document.getElementById('empty-state');
const urlBar = document.getElementById('url-bar');
const goBtn = document.getElementById('go-btn');
const backBtn = document.getElementById('back-btn');
const forwardBtn = document.getElementById('forward-btn');
const reloadBtn = document.getElementById('reload-btn');
const newTabBtn = document.getElementById('new-tab-btn');

if (typeof window.electronAPI === 'undefined') {
  console.error('❌ electronAPI is undefined!');
  document.body.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;color:#dc3251;padding:20px;text-align:center;">
      <div>
        <h2 style="color:#0c0c14;">⚠ Error</h2>
        <p>electronAPI not available. Check preload.js.</p>
        <p style="font-size:12px;color:#8f8d8a;">Press Ctrl+Shift+I to open DevTools</p>
      </div>
    </div>
  `;
} else {
  console.log('✅ electronAPI available');
}

function renderTabs(tabData) {
  console.log('📋 Rendering tabs:', tabData);
  tabs = tabData || [];
  
  const active = tabs.find(t => t.isActive);
  activeTabId = active ? active.id : (tabs[0]?.id || null);
  
  if (active) {
    urlBar.value = active.url && active.url !== 'about:blank' ? active.url : '';
  }
  
  if (tabs.length === 0) {
    emptyState.classList.add('visible');
  } else {
    emptyState.classList.remove('visible');
  }
  
  const newTabBtn = document.getElementById('new-tab-btn');
  tabBar.innerHTML = '';
  tabBar.appendChild(newTabBtn);
  
  tabs.forEach(tab => {
    const tabEl = document.createElement('button');
    tabEl.className = `tab ${tab.isActive ? 'active' : ''}`;
    tabEl.dataset.id = tab.id;
    
    if (tab.isLoading) {
      const spinner = document.createElement('span');
      spinner.className = 'tab-loading';
      tabEl.appendChild(spinner);
    }
    
    const title = document.createElement('span');
    title.className = 'tab-title';
    title.textContent = tab.title || 'New Tab';
    tabEl.appendChild(title);
    
    const close = document.createElement('span');
    close.className = 'tab-close';
    close.textContent = '✕';
    close.addEventListener('click', function(e) {
      e.stopPropagation();
      console.log('🗑 Closing tab:', tab.id);
      if (window.electronAPI) window.electronAPI.closeTab(tab.id);
    });
    tabEl.appendChild(close);
    
    tabEl.addEventListener('click', function() {
      console.log('🔄 Switching to tab:', tab.id);
      if (window.electronAPI) window.electronAPI.switchTab(tab.id);
    });
    
    tabBar.insertBefore(tabEl, newTabBtn);
  });
}

function navigate() {
  const url = urlBar.value.trim();
  if (!url || !activeTabId) return;
  console.log('🌐 Navigating to:', url);
  if (window.electronAPI) window.electronAPI.navigate(activeTabId, url);
}

function goBack() {
  if (activeTabId && window.electronAPI) {
    console.log('⬅ Going back');
    window.electronAPI.goBack(activeTabId);
  }
}

function goForward() {
  if (activeTabId && window.electronAPI) {
    console.log('➡ Going forward');
    window.electronAPI.goForward(activeTabId);
  }
}

function reload() {
  if (activeTabId && window.electronAPI) {
    console.log('🔄 Reloading');
    window.electronAPI.reload(activeTabId);
  }
}

function addTab() {
  console.log('➕ Creating new tab');
  if (window.electronAPI) window.electronAPI.createTab();
}

urlBar.addEventListener('keydown', function(e) {
  if (e.key === 'Enter') navigate();
});

goBtn.addEventListener('click', function() {
  console.log('🖱 Go button clicked');
  navigate();
});

backBtn.addEventListener('click', function() {
  console.log('🖱 Back button clicked');
  goBack();
});

forwardBtn.addEventListener('click', function() {
  console.log('🖱 Forward button clicked');
  goForward();
});

reloadBtn.addEventListener('click', function() {
  console.log('🖱 Reload button clicked');
  reload();
});

newTabBtn.addEventListener('click', function() {
  console.log('🖱 New tab button clicked');
  addTab();
});

document.querySelectorAll('.shortcut').forEach(function(el) {
  el.addEventListener('click', function() {
    const url = this.dataset.url;
    console.log('🖱 Shortcut clicked:', url);
    if (url) {
      urlBar.value = url;
      navigate();
    }
  });
});

document.addEventListener('keydown', function(e) {
  if (e.ctrlKey && e.key === 't') {
    e.preventDefault();
    addTab();
  }
  if (e.ctrlKey && e.key === 'w') {
    e.preventDefault();
    if (activeTabId && window.electronAPI) window.electronAPI.closeTab(activeTabId);
  }
  if (e.ctrlKey && e.key === 'Tab' && !e.shiftKey) {
    e.preventDefault();
    if (tabs.length > 0 && window.electronAPI) {
      const currentIndex = tabs.findIndex(t => t.id === activeTabId);
      const nextIndex = (currentIndex + 1) % tabs.length;
      window.electronAPI.switchTab(tabs[nextIndex].id);
    }
  }
  if (e.ctrlKey && e.shiftKey && e.key === 'Tab') {
    e.preventDefault();
    if (tabs.length > 0 && window.electronAPI) {
      const currentIndex = tabs.findIndex(t => t.id === activeTabId);
      const prevIndex = (currentIndex - 1 + tabs.length) % tabs.length;
      window.electronAPI.switchTab(tabs[prevIndex].id);
    }
  }
  if (e.key === 'F5') {
    e.preventDefault();
    reload();
  }
  if (e.altKey && e.key === 'ArrowLeft') {
    e.preventDefault();
    goBack();
  }
  if (e.altKey && e.key === 'ArrowRight') {
    e.preventDefault();
    goForward();
  }
  if (e.ctrlKey && e.key === 'l') {
    e.preventDefault();
    urlBar.focus();
    urlBar.select();
  }
});

if (window.electronAPI) {
  window.electronAPI.onTabsUpdate(function(tabData) {
    console.log('📨 Received tabs update:', tabData);
    renderTabs(tabData);
  });
}

console.log('✅ Proton Browser ready!');
urlBar.focus();