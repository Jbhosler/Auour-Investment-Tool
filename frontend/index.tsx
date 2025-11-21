// PHASE 1 DIAGNOSTIC: Page load diagnostics
console.error('🚀🚀🚀 PAGE LOADING - index.tsx executing 🚀🚀🚀');
try {
    localStorage.setItem('page_load_start', JSON.stringify({
        timestamp: new Date().toISOString(),
        message: 'Page load started - index.tsx executing',
        userAgent: navigator.userAgent,
        url: window.location.href
    }));
    console.error('✅ Stored page load start to localStorage');
} catch (e) {
    console.error('❌ Failed to store page load start:', e);
}

// Catch any errors during module loading
window.addEventListener('error', (event) => {
    console.error('❌❌❌ GLOBAL ERROR CAUGHT ❌❌❌');
    console.error('Error message:', event.message);
    console.error('Error source:', event.filename, 'Line:', event.lineno, 'Col:', event.colno);
    console.error('Error object:', event.error);
    try {
        localStorage.setItem('global_error', JSON.stringify({
            timestamp: new Date().toISOString(),
            message: event.message,
            source: event.filename,
            line: event.lineno,
            col: event.colno,
            error: event.error?.toString()
        }));
    } catch (e) {
        console.error('Failed to store global error:', e);
    }
});

// Catch unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
    console.error('❌❌❌ UNHANDLED PROMISE REJECTION ❌❌❌');
    console.error('Reason:', event.reason);
    try {
        localStorage.setItem('unhandled_rejection', JSON.stringify({
            timestamp: new Date().toISOString(),
            reason: event.reason?.toString()
        }));
    } catch (e) {
        console.error('Failed to store unhandled rejection:', e);
    }
});

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

console.error('✅ React imports successful');

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

console.error('✅ Root element found');

const root = ReactDOM.createRoot(rootElement);
console.error('✅ React root created');

try {
    root.render(
        <React.StrictMode>
            <App />
        </React.StrictMode>
    );
    console.error('✅ React render called successfully');
    try {
        localStorage.setItem('react_render_complete', JSON.stringify({
            timestamp: new Date().toISOString(),
            message: 'React render completed successfully'
        }));
    } catch (e) {
        console.error('Failed to store render complete:', e);
    }
} catch (renderError: any) {
    console.error('❌❌❌ REACT RENDER ERROR ❌❌❌');
    console.error('Render error:', renderError);
    console.error('Render error message:', renderError?.message);
    console.error('Render error stack:', renderError?.stack);
    try {
        localStorage.setItem('react_render_error', JSON.stringify({
            timestamp: new Date().toISOString(),
            error: renderError?.toString(),
            message: renderError?.message,
            stack: renderError?.stack
        }));
    } catch (e) {
        console.error('Failed to store render error:', e);
    }
    throw renderError;
}
