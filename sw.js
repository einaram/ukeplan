const CACHE_NAME = 'ukeplan-v4'; // Increment version to force cache refresh

// Get the base path dynamically
const getBasePath = () => {
  const path = self.location.pathname;
  return path.substring(0, path.lastIndexOf('/') + 1);
};

const basePath = getBasePath();

const urlsToCache = [
  './',
  './style.css',
  './script.js',
  './manifest.json',
  './A0.html',
  './A1.html', 
  './A2.html',
  './H1.html',
  './H2.html',
  './H3.html',
  './H4.html',
  './offline.html'
].map(url => new URL(url, self.location).href);

// Install service worker and cache resources
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
      .catch(err => {
        console.log('Cache failed:', err);
        // Don't fail installation if cache fails
        return Promise.resolve();
      })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
  const requestUrl = new URL(event.request.url);
  
  // For image requests with timestamp query params, always fetch fresh
  if (requestUrl.pathname.includes('weekplan_') && requestUrl.search.includes('v=')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Cache the fresh image
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseToCache);
            });
          }
          return response;
        })
        .catch(() => {
          // If network fails, try cache without query params
          const urlWithoutQuery = new URL(event.request.url);
          urlWithoutQuery.search = '';
          return caches.match(urlWithoutQuery.href);
        })
    );
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached version or fetch from network
        if (response) {
          return response;
        }
        
        // Clone the request because it's a stream
        const fetchRequest = event.request.clone();
        
        return fetch(fetchRequest).then(response => {
          // Check if response is valid
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          
          // Clone the response because it's a stream
          const responseToCache = response.clone();
          
          // Cache the new response
          caches.open(CACHE_NAME)
            .then(cache => {
              // Only cache images and HTML files
              if (event.request.url.includes('.png') || 
                  event.request.url.includes('.html') ||
                  event.request.url.includes('.css') ||
                  event.request.url.includes('.js')) {
                cache.put(event.request, responseToCache);
              }
            });
          
          return response;
        }).catch(() => {
          // If both cache and network fail, show offline page
          if (event.request.destination === 'document') {
            return caches.match('./offline.html') || caches.match(new URL('./offline.html', self.location).href);
          }
        });
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Take control of all pages immediately
      return self.clients.claim();
    })
  );
});

// Handle messages from the client
self.addEventListener('message', event => {
  if (event.data && event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});

// Background sync for updating content
self.addEventListener('sync', event => {
  if (event.tag === 'update-weekplan') {
    event.waitUntil(updateWeekPlan());
  }
});

async function updateWeekPlan() {
  try {
    // Try to fetch latest content
    const response = await fetch('./');
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(new URL('./', self.location).href, response);
      console.log('Week plan updated');
    }
  } catch (error) {
    console.log('Update failed:', error);
  }
}

// Push notifications (for future use)
self.addEventListener('push', event => {
  const options = {
    body: event.data ? event.data.text() : 'New ukeplan available!',
    icon: './icons/icon-192x192.png',
    badge: './icons/icon-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'View Plan',
        icon: './icons/icon-96x96.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: './icons/icon-96x96.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('Ukeplan', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('./')
    );
  }
});