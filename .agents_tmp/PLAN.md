# 1. OBJECTIVE

Two tasks:
1. Fix portainer detection to use https.request instead of fetch
2. Add editable URL input in admin UI

# 2. TASK 1: FIX DETECTION CODE

Replace fetch with https.request in `/src/server/portainerDiscovery.ts`:

Replace the existing fetch call with the working https.request pattern.

# 3. TASK 2: ADMIN UI FOR URL

Add editable Portainer URL field to admin page:
- Input field (pre-filled with saved URL or empty)
- Test button (tests entered URL, or defaults if blank)
- Save button (saves successful URL)

The app may already have a settings table - check existing schema first.

# 4. IMPLEMENTATION STEPS

**Task 1: Fix detection**

Update `/src/server/portainerDiscovery.ts` to use https.request/http.request directly.

**Task 2: Add UI**

Add to admin page Portainer tab:
- Input: `<input value={portainerUrl} onChange={setPortainerUrl} placeholder="https://host.docker.internal:9443" />`
- Test button: calls test endpoint
- Save button: calls save endpoint

**API endpoints needed:**

- GET/POST /api/admin/settings (check if exists, or reuse)

# 5. TESTING AND VALIDATION

- Test detection manually first
- Then test UI buttons
