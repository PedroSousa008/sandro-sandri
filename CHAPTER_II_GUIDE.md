# Chapter II Development Guide

## How to Work on Chapter II Without Visitors Seeing It

### Overview
The website uses a **date-based feature flag system** that automatically shows/hides chapters based on their launch dates. Chapter II is set to launch on **June 13, 2026**.

### Current Setup

1. **Feature Flags** (`js/feature-flags.js`)
   - Chapter I: Already launched (visible to all)
   - Chapter II: Launch date: June 13, 2026 (hidden until then)

2. **Product Assignment**
   - Chapter I: Products with IDs 1-5 (current t-shirts)
   - Chapter II: Products with IDs 6+ (add when ready)

### How to Add Chapter II Products

1. **Add products to `js/products.js`**
   ```javascript
   {
       id: 6,  // Start from 6 for Chapter II
       name: "Your Product Name",
       // ... rest of product data
   }
   ```

2. **Update inventory in `lib/storage.js`**
   - Add inventory entries for new product IDs in `getDefaultInventory()`

3. **Test in Preview Mode**
   - Add `?preview=true` to any URL to see unpublished chapters
   - Example: `https://yoursite.com/collection.html?preview=true`
   - Or set `localStorage.setItem('sandroSandriPreviewMode', 'true')` in browser console

### Testing Options

#### Option 1: Preview Mode (Recommended)
- Add `?preview=true` to URLs to see Chapter II
- Works on any deployment (main or preview)
- No code changes needed

#### Option 2: Vercel Preview Deployments
- Create a branch: `git checkout -b chapter-ii`
- Make your changes
- Push to GitHub
- Vercel automatically creates a preview URL
- Test on preview URL (Chapter II will be visible in preview mode)

#### Option 3: Local Development
- Run locally
- Use preview mode: `http://localhost:3000/collection.html?preview=true`

### Automatic Launch

On **June 13, 2026**, Chapter II will automatically:
- ✅ Appear in the chapter filter buttons
- ✅ Be visible to all visitors
- ✅ Products will be accessible
- ✅ No code deployment needed on launch day

### Important Notes

- **Never change the launch date** in `feature-flags.js` unless you want to launch early
- **All Chapter II products must have IDs 6+** (update `filterByChapter` in `collection.js` if needed)
- **Test thoroughly in preview mode** before launch date
- **Inventory must be set** for all new products

### Quick Commands

**Enable preview mode:**
```javascript
localStorage.setItem('sandroSandriPreviewMode', 'true');
location.reload();
```

**Disable preview mode:**
```javascript
localStorage.removeItem('sandroSandriPreviewMode');
location.reload();
```

**Check available chapters:**
```javascript
window.FeatureFlags.getAvailableChapters();
```

