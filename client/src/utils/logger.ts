export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  source: 'client' | 'server';
  action: string;
  data?: any;
}

class Logger {
  private logs: LogEntry[] = [];
  private maxLogs = 1000;

  log(level: LogEntry['level'], source: LogEntry['source'], action: string, data?: any) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      source,
      action,
      data
    };
    
    this.logs.push(entry);
    
    // Ограничиваем количество логов
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
    
    // Дублируем в console для отладки
    const logFn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
    logFn(`[${source.toUpperCase()}] ${action}`, data || '');
  }

  info(source: LogEntry['source'], action: string, data?: any) {
    this.log('info', source, action, data);
  }

  warn(source: LogEntry['source'], action: string, data?: any) {
    this.log('warn', source, action, data);
  }

  error(source: LogEntry['source'], action: string, data?: any) {
    this.log('error', source, action, data);
  }

  getLogs() {
    return [...this.logs];
  }

  getFilteredLogs(sources: LogEntry['source'][] = ['client', 'server']) {
    return this.logs.filter(log => sources.includes(log.source));
  }

  clear() {
    this.logs = [];
  }

  exportLogs(sources: LogEntry['source'][] = ['client', 'server']) {
    const filteredLogs = this.getFilteredLogs(sources);
    return filteredLogs.map(log => 
      `[${log.timestamp}] [${log.level.toUpperCase()}] [${log.source.toUpperCase()}] ${log.action}` +
      (log.data ? ` - ${typeof log.data === 'object' ? JSON.stringify(log.data) : log.data}` : '')
    ).join('\n');
  }
}

export const logger = new Logger();