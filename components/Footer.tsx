'use client';

import { APP_VERSION, APP_BRANCH } from '@/lib/version';

export function AppFooter() {
  return (
    <div className="fixed bottom-2 right-4 text-xs text-slate-500 z-50">
      v{APP_VERSION} • {APP_BRANCH}
    </div>
  );
}