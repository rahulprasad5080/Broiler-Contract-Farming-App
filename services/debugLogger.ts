type NetworkLog = {
  id: string;
  url: string;
  method: string;
  requestPayload: any;
  responsePayload: any;
  status: number;
  timestamp: string;
};

class DebugLogger {
  private logs: NetworkLog[] = [];
  private listeners: Set<(logs: NetworkLog[]) => void> = new Set();

  log(log: Omit<NetworkLog, 'id'>) {
    const newLog = { ...log, id: Math.random().toString(36).substr(2, 9) };
    this.logs = [newLog, ...this.logs].slice(0, 20); // Keep last 20
    this.listeners.forEach((listener) => listener(this.logs));
  }

  getLogs() {
    return this.logs;
  }

  subscribe(listener: (logs: NetworkLog[]) => void) {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }
}

export const debugLogger = new DebugLogger();
