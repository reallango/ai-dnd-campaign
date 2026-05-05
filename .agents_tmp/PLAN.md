# 1. OBJECTIVE

Consolidate the updates and portainer pages into tabs on the main admin page, pulling version/build info from the API.

# 2. CONTEXT SUMMARY

Current state:- `/app/admin/page.tsx` - main admin page with some tabs (settings, users, tokens, email, updates)
- `/app/admin/updates/page.tsx` - separate page (not used)
- `/app/admin/portainer/page.tsx` - separate page (not used)Both separate pages aren't linked/used. User wants them as tabs on main admin page.

# 3. APPROACH OVERVIEW

1. Add Portainer as a new tab on admin page
2. Move version/build display from the updates page to the updates tab  
3. Fetch actual build hash from `/api/version` API

# 4. IMPLEMENTATION STEPS

**In `/app/admin/page.tsx`:**

1. **Add Portainer tab to the tabs list:**
```tsx
const [activeTab, setActiveTab] = useState<'settings' | 'users' | 'tokens' | 'email' | 'updates' | 'portainer'>('settings');
```

2. **Add state to fetch build hash:**
```tsx
const [buildInfo, setBuildInfo] = useState<{version: string; build: string; buildHash: string} | null>(null);

useEffect(() => {
  fetch('/api/version')
    .then(r => r.json())
    .then(data => setBuildInfo(data))
    .catch(() => setBuildInfo(null));
}, []);
```

3. **Update the Updates tab to show API data:**
```tsx
<div className="mb-6 p-4 bg-slate-700 rounded-lg">
  <div className="text-slate-400 text-sm mb-1">App Version</div>
  <div className="text-white text-lg font-mono">{buildInfo?.version || 'unknown'}</div>
  <div className="text-slate-400 text-sm mt-2">Build</div>
  <div className="text-white font-mono">{buildInfo?.build || buildInfo?.buildHash || 'unknown'}</div>
</div>
```

4. **Add content to Portainer tab** (move from app/admin/portainer/page.tsx):
- Include the Portainer branch selection and deploy functionality
- Show current deploy status

5. **Remove the now-unused separate pages** (optional - can delete):
- `app/admin/updates/page.tsx`
- `app/admin/portainer/page.tsx`

Also ensure the API route has `export const dynamic = 'force-dynamic'` so it runs at runtime.

# 5. TESTING AND VALIDATION

- Rebuild and deploy
- Check admin page has new "Updates" and "Portainer" tabs
- Each tab displays correct information from API
