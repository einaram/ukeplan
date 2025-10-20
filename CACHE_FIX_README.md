# PWA Image Cache Fix

## Problem
The PWA was aggressively caching images, causing old week plan images to be displayed even after new ones were generated.

## Solution
Implemented cache-busting using timestamps on all image URLs.

## Changes Made

### 1. Template Updates (`templates/index.html`)
- Added `?v={{ timestamp }}` query parameter to all image URLs:
  - Main slideshow image
  - Current prefix thumbnails
  - Other prefix thumbnails
- Added timestamp to JavaScript pageData object

### 2. Python Script Updates (`get_pdfs.py`)
- Imported `time` module
- Generate Unix timestamp at the start of template rendering
- Pass timestamp to template context for all pages
- All pages generated in a single run share the same timestamp

### 3. Service Worker Updates (`sw.js`)
- Incremented cache version from `v3` to `v4` to force cache refresh
- Added special handling for images with timestamp query parameters:
  - Always fetch fresh from network when `?v=` is present in weekplan images
  - Cache the fresh response for offline access
  - Fall back to cached version (without query string) if network fails
- Added message handler for `skipWaiting` action
- Added `self.clients.claim()` in activate event for immediate control

### 4. Existing HTML Files
- Updated all existing HTML files (index.html, A*.html, H*.html) with current timestamp
- All image URLs now include `?v=1760981684` query parameter

## How It Works

1. **Generation Time**: When `get_pdfs.py` runs, it generates a single timestamp (Unix epoch)
2. **URL Modification**: All image URLs are appended with `?v=<timestamp>`
3. **Cache Strategy**: 
   - Service worker detects images with timestamp parameters
   - Forces network fetch for images with `?v=` parameter
   - Caches the fresh response
   - Falls back to cache if offline
4. **Cache Invalidation**: When new week plans are generated with a new timestamp, browsers will request fresh images

## Testing

To test the fix:
1. Clear browser cache or use incognito mode
2. Open the PWA
3. Verify images load with timestamp parameters (check DevTools Network tab)
4. Go offline and verify images still work (from cache)
5. Generate new week plans (run `get_pdfs.py`)
6. Reload - new images should appear with new timestamp

## Next Week Plan Generation

When generating next week's plans:
```bash
python get_pdfs.py
```

The script will automatically:
- Generate a new timestamp
- Create new HTML files with the new timestamp
- Old cached images will be bypassed due to different timestamp values

## Notes

- The timestamp ensures cache invalidation on every new generation
- Service worker version should be incremented if SW logic changes
- Images remain available offline after first fetch
- The fix is backward compatible with existing behavior
