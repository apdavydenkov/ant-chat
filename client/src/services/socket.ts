import { io, Socket } from 'socket.io-client';

class SocketService {
  private socket: Socket | null = null;
  
  connect() {
    if (this.socket?.connected) return;
    
    this.socket = io('http://localhost:3001', {
      transports: ['websocket']
    });
    
    this.socket.on('connect', () => {
      console.log('WebSocket connected');
    });
    
    this.socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
    });
  }
  
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
  
  joinChannel(channelId: string) {
    this.socket?.emit('join-channel', channelId);
  }
  
  leaveChannel(channelId: string) {
    this.socket?.emit('leave-channel', channelId);
  }
  
  sendMessage(data: any) {
    this.socket?.emit('new-message', data);
  }
  
  onMessageReceived(callback: (data: any) => void) {
    this.socket?.on('message-received', callback);
  }
  
  onMessageDeleted(callback: (data: any) => void) {
    this.socket?.on('message-deleted', callback);
  }
  
  onMessagePinned(callback: (data: any) => void) {
    this.socket?.on('message-pinned', callback);
  }
  
  onChannelCreated(callback: (data: any) => void) {
    this.socket?.on('channel-created', callback);
  }
  
  onChannelDeleted(callback: (data: any) => void) {
    this.socket?.on('channel-deleted', callback);
  }
  
  removeAllListeners() {
    this.socket?.removeAllListeners();
  }
}

export const socketService = new SocketService();