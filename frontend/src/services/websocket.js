// Real WebSocket service for attendance events in AttendIQ

class AttendanceWebSocketService {
  constructor() {
    this.ws = null;
    this.listeners = new Set();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectInterval = 3000;
  }

  getWsUrl() {
    const host = typeof window !== 'undefined' ? window.location.hostname : '127.0.0.1';
    if (host !== 'localhost' && host !== '127.0.0.1') {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${protocol}//${window.location.host}/ws/attendance`;
    }
    return `ws://${host}:8000/ws/attendance`;
  }

  connect(url = this.getWsUrl()) {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        console.log('[AttendIQ WS] Connected to backend real-time stream.');
        this.reconnectAttempts = 0;
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.notifyListeners(data);
        } catch (e) {
          console.warn('[AttendIQ WS] Received non-JSON message:', event.data);
        }
      };

      this.ws.onerror = (err) => {
        console.warn('[AttendIQ WS] Connection error:', err);
      };

      this.ws.onclose = () => {
        console.log('[AttendIQ WS] Connection closed.');
        this.attemptReconnect(url);
      };
    } catch (err) {
      console.warn('[AttendIQ WS] Connection attempt failed:', err);
    }
  }

  attemptReconnect(url) {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => this.connect(url), this.reconnectInterval);
    }
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notifyListeners(data) {
    this.listeners.forEach((callback) => {
      try {
        callback(data);
      } catch (e) {
        console.error('[AttendIQ WS] Error in subscriber callback:', e);
      }
    });
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export const wsService = new AttendanceWebSocketService();
export default wsService;
