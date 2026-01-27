// Backend diagnostic logger - mirrors frontend diagnosticLogger pattern
// Logs to console (which Cloud Run captures) with structured data

export const diagnosticLogger = {
  info: (message, data) => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'info',
      message,
      data: data || {}
    };
    console.log(`[DIAG] [${logEntry.timestamp}] [INFO] ${message}`, data ? JSON.stringify(data, null, 2) : '');
  },
  
  warn: (message, data) => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'warn',
      message,
      data: data || {}
    };
    console.warn(`[DIAG] [${logEntry.timestamp}] [WARN] ${message}`, data ? JSON.stringify(data, null, 2) : '');
  },
  
  error: (message, data) => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'error',
      message,
      data: data || {}
    };
    console.error(`[DIAG] [${logEntry.timestamp}] [ERROR] ${message}`, data ? JSON.stringify(data, null, 2) : '');
  }
};
