//import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Buffer } from 'buffer';

// Polyfill Buffer and process for browser
if (!(window as any).Buffer) (window as any).Buffer = Buffer;
if (!(window as any).process) (window as any).process = { env: {} };
import './index.css'
import App from './App.tsx'
import './index.css'
createRoot(document.getElementById('root')!).render(
    <App />,
)
