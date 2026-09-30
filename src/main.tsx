import {createRoot} from 'react-dom/client';
import {ClerkProvider} from '@clerk/react';
import App from './App.tsx';
import './index.css';

// Linked Clerk Application: app_3K0GFtslkGHTmSBGO2kYp3S8qNI (divine-sole-1210.clerk.accounts.dev)
const APP_PUBLISHABLE_KEY = 'pk_test_ZGl2aW5lLXNvbGUtMTIxMC5jbGVyay5hY2NvdW50cy5kZXYk';
const envKey =
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY ||
  import.meta.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

const PUBLISHABLE_KEY =
  envKey && !envKey.includes('YWNjdXJhdGUtZm93bC0yOTU5')
    ? envKey
    : APP_PUBLISHABLE_KEY;

createRoot(document.getElementById('root')!).render(
  <ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/">
    <App />
  </ClerkProvider>
);


