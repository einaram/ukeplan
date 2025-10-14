// Mobile-optimized navigation system for PDF page viewer

// Handle URL parameters for backward compatibility
let urlParams = new URLSearchParams(window.location.search);
let kid = urlParams.get('kid');

if (kid === 'A') {
  window.location.href = 'A0.html';
} else if (kid === 'H') {
  window.location.href = 'index.html';
}

// Mobile navigation functionality
document.addEventListener('DOMContentLoaded', function() {
  initializeNavigation();
  setupTouchNavigation();
  setupKeyboardNavigation();
  preloadAdjacentPages();
  initializePWA();
  preventZoom();
});

function initializeNavigation() {
  // Add loading state
  document.body.classList.add('loading');
  
  // Remove loading state once image is loaded
  const mainImage = document.querySelector('.slideshow-container img');
  if (mainImage) {
    if (mainImage.complete) {
      document.body.classList.remove('loading');
    } else {
      mainImage.addEventListener('load', () => {
        document.body.classList.remove('loading');
      });
    }
  }
  
  // Add visual feedback for touch interactions
  addTouchFeedback();
}

// PWA Functionality
let deferredPrompt;

function initializePWA() {
  // Register service worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then(registration => {
          console.log('SW registered: ', registration);
          
          // Check for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                showUpdateBanner();
              }
            });
          });
        })
        .catch(registrationError => {
          console.log('SW registration failed: ', registrationError);
        });
    });
  }
  
  // Handle install prompt
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    showInstallBanner();
  });
  
  // Handle successful installation
  window.addEventListener('appinstalled', () => {
    console.log('PWA was installed');
    hideInstallBanner();
    deferredPrompt = null;
  });
  
  // Show install banner if not in standalone mode
  if (!window.matchMedia('(display-mode: standalone)').matches && !localStorage.getItem('installDismissed')) {
    setTimeout(showInstallBanner, 3000);
  }
}

function showInstallBanner() {
  const banner = document.getElementById('installBanner');
  if (banner && !window.matchMedia('(display-mode: standalone)').matches) {
    banner.style.display = 'block';
    setTimeout(() => banner.classList.add('show'), 100);
  }
}

function hideInstallBanner() {
  const banner = document.getElementById('installBanner');
  if (banner) {
    banner.classList.remove('show');
    setTimeout(() => banner.style.display = 'none', 300);
  }
}

function installPWA() {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the install prompt');
      } else {
        console.log('User dismissed the install prompt');
      }
      deferredPrompt = null;
      hideInstallBanner();
    });
  }
}

function dismissInstall() {
  hideInstallBanner();
  localStorage.setItem('installDismissed', 'true');
}

function showUpdateBanner() {
  // Create update notification
  const updateBanner = document.createElement('div');
  updateBanner.innerHTML = `
    <div style="position: fixed; top: 0; left: 0; right: 0; background: #4CAF50; color: white; padding: 1rem; text-align: center; z-index: 1001;">
      📱 New version available! <button onclick="updateApp()" style="background: white; color: #4CAF50; border: none; padding: 0.5rem 1rem; border-radius: 15px; margin-left: 1rem; cursor: pointer;">Update</button>
    </div>
  `;
  document.body.appendChild(updateBanner);
}

function updateApp() {
  if (navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ action: 'skipWaiting' });
  }
  window.location.reload();
}

function switchToKid(kidPrefix) {
  // Find the first page for the selected kid
  const targetPage = kidPrefix === 'H' ? 'index.html' : kidPrefix + '0.html';
  
  // Add haptic feedback if available
  if (navigator.vibrate) {
    navigator.vibrate(50);
  }
  
  // Add transition effect
  document.body.style.opacity = '0.8';
  
  setTimeout(() => {
    window.location.href = targetPage;
  }, 100);
}

function navigateToPage(pageFile) {
  // Add haptic feedback for navigation
  if (navigator.vibrate) {
    navigator.vibrate(30);
  }
  
  // Add smooth transition
  document.body.style.transition = 'opacity 0.15s ease';
  document.body.style.opacity = '0.9';
  
  setTimeout(() => {
    window.location.href = pageFile;
  }, 75);
}

function setupKeyboardNavigation() {
  document.addEventListener('keydown', function(event) {
    if (!window.pageData) return;
    
    // Don't interfere with form inputs or when modifiers are pressed
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA' || 
        event.ctrlKey || event.metaKey || event.altKey) {
      return;
    }
    
    switch(event.key) {
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault();
        navigateToPage(window.pageData.prev);
        break;
        
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault();
        navigateToPage(window.pageData.next);
        break;
        
      case 'Home':
        event.preventDefault();
        navigateToPage('index.html');
        break;
        
      case 'a':
      case 'A':
        event.preventDefault();
        switchToKid('A');
        break;
        
      case 'h':
      case 'H':
        event.preventDefault();
        switchToKid('H');
        break;
    }
  });
}

function setupTouchNavigation() {
  let touchStartX = 0;
  let touchEndX = 0;
  let touchStartY = 0;
  let touchEndY = 0;
  let touchStartTime = 0;
  
  const container = document.querySelector('.slideshow-container');
  if (!container) return;

  container.addEventListener('touchstart', function(event) {
    touchStartX = event.changedTouches[0].screenX;
    touchStartY = event.changedTouches[0].screenY;
    touchStartTime = Date.now();
  }, { passive: true });

  container.addEventListener('touchend', function(event) {
    if (!window.pageData) return;
    
    touchEndX = event.changedTouches[0].screenX;
    touchEndY = event.changedTouches[0].screenY;
    
    const deltaX = Math.abs(touchStartX - touchEndX);
    const deltaY = Math.abs(touchStartY - touchEndY);
    const timeDelta = Date.now() - touchStartTime;
    const threshold = 50; // Minimum swipe distance
    const maxTime = 500; // Maximum swipe time
    
    // Only process horizontal swipes that are quick and more significant than vertical
    if (deltaX > threshold && deltaX > deltaY && timeDelta < maxTime) {
      event.preventDefault();
      
      if (touchEndX < touchStartX) {
        // Swipe left - next page
        navigateToPage(window.pageData.next);
      } else {
        // Swipe right - previous page
        navigateToPage(window.pageData.prev);
      }
    }
  }, { passive: false });
  
  // Add visual swipe indicator
  let swipeIndicator = null;
  
  container.addEventListener('touchmove', function(event) {
    const touch = event.changedTouches[0];
    const currentX = touch.screenX;
    const deltaX = currentX - touchStartX;
    const timeDelta = Date.now() - touchStartTime;
    
    if (Math.abs(deltaX) > 20 && timeDelta < 300) {
      if (!swipeIndicator) {
        swipeIndicator = document.createElement('div');
        swipeIndicator.style.cssText = `
          position: fixed;
          top: 50%;
          transform: translateY(-50%);
          background: rgba(102, 126, 234, 0.8);
          color: white;
          padding: 0.5rem 1rem;
          border-radius: 20px;
          font-size: 0.8rem;
          font-weight: 600;
          z-index: 1000;
          pointer-events: none;
          transition: opacity 0.2s ease;
        `;
        document.body.appendChild(swipeIndicator);
      }
      
      if (deltaX > 0) {
        swipeIndicator.textContent = '‹ Previous';
        swipeIndicator.style.left = '1rem';
        swipeIndicator.style.right = 'auto';
      } else {
        swipeIndicator.textContent = 'Next ›';
        swipeIndicator.style.right = '1rem';
        swipeIndicator.style.left = 'auto';
      }
      
      swipeIndicator.style.opacity = Math.min(Math.abs(deltaX) / 100, 1);
    }
  }, { passive: true });
  
  container.addEventListener('touchend', function() {
    if (swipeIndicator) {
      swipeIndicator.style.opacity = '0';
      setTimeout(() => {
        if (swipeIndicator && swipeIndicator.parentNode) {
          swipeIndicator.parentNode.removeChild(swipeIndicator);
        }
        swipeIndicator = null;
      }, 200);
    }
  }, { passive: true });
}

function addTouchFeedback() {
  // Add touch feedback to all interactive elements
  const interactiveElements = document.querySelectorAll('.nav-arrow, .nav-btn, .kid-btn, .thumbnail');
  
  interactiveElements.forEach(element => {
    element.addEventListener('touchstart', function() {
      this.style.transform = this.style.transform.replace(/scale\([^)]*\)/g, '') + ' scale(0.95)';
    }, { passive: true });
    
    element.addEventListener('touchend', function() {
      this.style.transform = this.style.transform.replace(/scale\([^)]*\)/g, '');
    }, { passive: true });
    
    element.addEventListener('touchcancel', function() {
      this.style.transform = this.style.transform.replace(/scale\([^)]*\)/g, '');
    }, { passive: true });
  });
}

function preventZoom() {
  // Prevent double-tap zoom on buttons and images
  const preventZoomElements = document.querySelectorAll('.nav-arrow, .nav-btn, .kid-btn, .slideshow-container img');
  
  preventZoomElements.forEach(element => {
    element.addEventListener('touchend', function(event) {
      event.preventDefault();
    });
  });
}

// Preload adjacent pages for faster navigation
function preloadAdjacentPages() {
  if (!window.pageData) return;
  
  const preloadPages = [window.pageData.prev, window.pageData.next];
  
  preloadPages.forEach(page => {
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = page;
    document.head.appendChild(link);
  });
}

// Add smooth page transitions
window.addEventListener('beforeunload', function() {
  document.body.style.opacity = '0.8';
});

// Optimize for mobile performance
if ('serviceWorker' in navigator) {
  // Register service worker for offline caching if needed
  // navigator.serviceWorker.register('/sw.js');
}

// Handle orientation changes
window.addEventListener('orientationchange', function() {
  setTimeout(() => {
    // Recalculate layout after orientation change
    window.scrollTo(0, 0);
  }, 100);
});

