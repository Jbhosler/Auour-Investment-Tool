// Diagnostic logger that sends logs to backend API and stores in localStorage

const API_URL = import.meta.env.VITE_API_URL || 'https://backend-phd2mjs6qa-uc.a.run.app/api';

interface LogEntry {
  level: 'info' | 'warn' | 'error';
  message: string;
  data?: any;
  timestamp: string;
}

// Store logs in localStorage (keep last 50 entries)
const MAX_LOCAL_STORAGE_LOGS = 50;

function addToLocalStorage(entry: LogEntry) {
  try {
    const existing = localStorage.getItem('diagnostic_logs');
    const logs: LogEntry[] = existing ? JSON.parse(existing) : [];
    logs.push(entry);
    // Keep only the last N entries
    if (logs.length > MAX_LOCAL_STORAGE_LOGS) {
      logs.shift();
    }
    localStorage.setItem('diagnostic_logs', JSON.stringify(logs));
  } catch (e) {
    // Ignore localStorage errors
  }
}

// Send log to backend API
async function sendToBackend(entry: LogEntry) {
  try {
    // Use a timeout to prevent hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    const response = await fetch(`${API_URL}/diagnostics`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(entry),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      console.warn(`[DIAG] Failed to send log to backend: ${response.status} ${response.statusText}`);
      // Also try to log the failed request details
      console.warn(`[DIAG] Failed entry:`, entry);
    } else {
      // Success - log it so we know it's working
      console.log(`[DIAG] Successfully sent log to backend: ${entry.message.substring(0, 50)}`);
    }
  } catch (e: any) {
    // Log the error so we know if logging is failing
    console.error(`[DIAG] Error sending log to backend:`, e?.message || e);
    console.error(`[DIAG] Failed entry:`, entry);
    console.error(`[DIAG] API_URL:`, API_URL);
  }
}

export const diagnosticLogger = {
  info: (message: string, data?: any) => {
    const entry: LogEntry = {
      level: 'info',
      message,
      data,
      timestamp: new Date().toISOString(),
    };
    
    // Always log to console
    console.log(`[DIAG] ${message}`, data || '');
    
    // Store in localStorage
    addToLocalStorage(entry);
    
    // Send to backend (fire and forget)
    sendToBackend(entry);
  },
  
  warn: (message: string, data?: any) => {
    const entry: LogEntry = {
      level: 'warn',
      message,
      data,
      timestamp: new Date().toISOString(),
    };
    
    // Always log to console
    console.warn(`[DIAG] ${message}`, data || '');
    
    // Store in localStorage
    addToLocalStorage(entry);
    
    // Send to backend (fire and forget)
    sendToBackend(entry);
  },
  
  error: (message: string, data?: any) => {
    const entry: LogEntry = {
      level: 'error',
      message,
      data,
      timestamp: new Date().toISOString(),
    };
    
    // Always log to console
    console.error(`[DIAG] ${message}`, data || '');
    
    // Store in localStorage
    addToLocalStorage(entry);
    
    // Send to backend (fire and forget)
    sendToBackend(entry);
  },
  
  // Get logs from localStorage
  getLogs: (): LogEntry[] => {
    try {
      const existing = localStorage.getItem('diagnostic_logs');
      return existing ? JSON.parse(existing) : [];
    } catch (e) {
      return [];
    }
  },
  
  // Clear logs from localStorage
  clearLogs: () => {
    try {
      localStorage.removeItem('diagnostic_logs');
    } catch (e) {
      // Ignore
    }
  },
};

