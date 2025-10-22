import { Socket } from 'socket.io-client';

export interface CallEventData {
  callId: string;
  initiator?: any;
  callType: 'voice' | 'video';
  isGroupCall?: boolean;
  groupId?: string;
  participants?: string[];
}

export interface MessageEventData {
  receiverId?: string;
  content: string;
  messageType?: 'text' | 'image' | 'voice' | 'video' | 'document';
  groupId?: string;
  mediaData?: string;
  duration?: number;
}

export interface MessageReactionData {
  messageId: string;
  reaction: string;
  userId: string;
  groupId?: string;
}

export interface PendingMessageData {
  messageId: string;
  content: string;
  senderId: string;
  receiverId?: string;
  groupId?: string;
  timestamp: string;
}

export interface TypingEventData {
  receiverId?: string;
  conversationId?: string;
  groupId?: string;
}

export interface MediaToggleEventData {
  callId: string;
  mediaType: 'audio' | 'video';
  enabled: boolean;
}

class SocketService {
  private socket: Socket | null = null;
  private eventListeners: Map<string, Set<Function>> = new Map();

  setSocket(socket: Socket | null) {
    this.socket = socket;
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  emit(event: string, data?: any): void {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
      console.log(`📤 Socket emit: ${event}`, data);
    } else {
      console.warn(`Cannot emit event '${event}' - socket not connected`);
    }
  }

  on(event: string, callback: (...args: any[]) => void): void {
    if (this.socket) {
      this.socket.on(event, callback);
      
      if (!this.eventListeners.has(event)) {
        this.eventListeners.set(event, new Set());
      }
      this.eventListeners.get(event)!.add(callback);
    }
  }

  off(event: string, callback?: (...args: any[]) => void): void {
    if (this.socket) {
      if (callback) {
        this.socket.off(event, callback);
        this.eventListeners.get(event)?.delete(callback);
      } else {
        this.socket.off(event);
        this.eventListeners.delete(event);
      }
    }
  }

  // Message Events
  sendMessage(data: MessageEventData): void {
    this.emit('message:send', data);
  }

  onMessageReceive(callback: (message: any) => void): void {
    this.on('message:receive', callback);
  }

  onMessageSent(callback: (message: any) => void): void {
    this.on('message:sent', callback);
  }

  onMessageDelivered(callback: (data: any) => void): void {
    this.on('message:delivered', callback);
  }

  onMessageRead(callback: (data: any) => void): void {
    this.on('message:read', callback);
  }

  onMessageError(callback: (error: any) => void): void {
    this.on('message:error', callback);
  }

  markMessageAsRead(messageId: string, senderId: string): void {
    this.emit('message:read', { messageId, senderId });
  }

  // Message Reactions
  addMessageReaction(data: MessageReactionData): void {
    this.emit('message:reaction:add', data);
  }

  removeMessageReaction(data: MessageReactionData): void {
    this.emit('message:reaction:remove', data);
  }

  onMessageReactionAdded(callback: (data: any) => void): void {
    this.on('message:reaction:added', callback);
  }

  onMessageReactionRemoved(callback: (data: any) => void): void {
    this.on('message:reaction:removed', callback);
  }

  // Pending Messages
  getPendingMessages(): void {
    this.emit('messages:pending:get');
  }

  onPendingMessages(callback: (messages: PendingMessageData[]) => void): void {
    this.on('messages:pending', callback);
  }

  markPendingMessageAsRead(messageId: string): void {
    this.emit('messages:pending:read', { messageId });
  }

  // Group Message Events
  sendGroupMessage(data: MessageEventData): void {
    this.emit('group:message:send', data);
  }

  onGroupMessageReceive(callback: (message: any) => void): void {
    this.on('group:message:receive', callback);
  }

  onGroupMessageSent(callback: (message: any) => void): void {
    this.on('group:message:sent', callback);
  }

  onGroupMessageRead(callback: (data: any) => void): void {
    this.on('group:message:read', callback);
  }

  onGroupMessageError(callback: (error: any) => void): void {
    this.on('group:message:error', callback);
  }

  markGroupMessageAsRead(messageId: string, groupId: string): void {
    this.emit('group:message:read', { messageId, groupId });
  }

  // Group Events
  joinGroup(groupId: string): void {
    this.emit('group:join', groupId);
  }

  leaveGroup(groupId: string): void {
    this.emit('group:leave', groupId);
  }

  // Call Events
  initiateCall(data: CallEventData): void {
    this.emit('call:initiate', data);
  }

  answerCall(callId: string): void {
    this.emit('call:answer', { callId });
  }

  declineCall(callId: string): void {
    this.emit('call:decline', { callId });
  }

  endCall(callId: string): void {
    this.emit('call:end', { callId });
  }

  leaveCall(callId: string): void {
    this.emit('call:leave', { callId });
  }

  toggleMedia(data: MediaToggleEventData): void {
    this.emit('call:toggle-media', data);
  }

  onCallIncoming(callback: (data: any) => void): void {
    this.on('call:incoming', callback);
  }

  onCallInitiated(callback: (data: any) => void): void {
    this.on('call:initiated', callback);
  }

  onCallAnswered(callback: (data: any) => void): void {
    this.on('call:answered', callback);
  }

  onCallDeclined(callback: (data: any) => void): void {
    this.on('call:declined', callback);
  }

  onCallEnded(callback: (data: any) => void): void {
    this.on('call:ended', callback);
  }

  onCallError(callback: (error: any) => void): void {
    this.on('call:error', callback);
  }

  onCallParticipantLeft(callback: (data: any) => void): void {
    this.on('call:participant_left', callback);
  }

  onCallMediaToggled(callback: (data: any) => void): void {
    this.on('call:media-toggled', callback);
  }

  // WebRTC Signaling Events
  sendIceCandidate(data: { callId: string; candidate: any; targetUserId: string }): void {
    this.emit('call:ice-candidate', data);
  }

  onIceCandidate(callback: (data: any) => void): void {
    this.on('call:ice-candidate', callback);
  }

  sendOffer(data: { callId: string; offer: any; targetUserId: string }): void {
    this.emit('call:offer', data);
  }

  onOffer(callback: (data: any) => void): void {
    this.on('call:offer', callback);
  }

  sendAnswer(data: { callId: string; answer: any; targetUserId: string }): void {
    this.emit('call:answer', data);
  }

  onAnswer(callback: (data: any) => void): void {
    this.on('call:answer', callback);
  }

  // Typing Events
  startTyping(data: TypingEventData): void {
    this.emit('typing:start', data);
  }

  stopTyping(data: TypingEventData): void {
    this.emit('typing:stop', data);
  }

  onTypingStart(callback: (data: any) => void): void {
    this.on('typing:start', callback);
  }

  onTypingStop(callback: (data: any) => void): void {
    this.on('typing:stop', callback);
  }

  // Group Typing Events
  startGroupTyping(data: TypingEventData): void {
    this.emit('group:typing:start', data);
  }

  stopGroupTyping(data: TypingEventData): void {
    this.emit('group:typing:stop', data);
  }

  onGroupTypingStart(callback: (data: any) => void): void {
    this.on('group:typing:start', callback);
  }

  onGroupTypingStop(callback: (data: any) => void): void {
    this.on('group:typing:stop', callback);
  }

  // WhatsApp Events
  linkWhatsApp(whatsappNumber: string): void {
    this.emit('whatsapp:link', { whatsappNumber });
  }

  unlinkWhatsApp(): void {
    this.emit('whatsapp:unlink');
  }

  sendWhatsAppMessage(data: { receiverId: string; content: string; messageType?: string; profileName?: string }): void {
    this.emit('whatsapp:send', data);
  }

  getWhatsAppStatus(): void {
    this.emit('whatsapp:status');
  }

  onWhatsAppLinked(callback: (data: any) => void): void {
    this.on('whatsapp:linked', callback);
  }

  onWhatsAppUnlinked(callback: (data: any) => void): void {
    this.on('whatsapp:unlinked', callback);
  }

  onWhatsAppMessageReceive(callback: (message: any) => void): void {
    this.on('whatsapp:message:receive', callback);
  }

  onWhatsAppStatusUpdate(callback: (status: any) => void): void {
    this.on('whatsapp:status:update', callback);
  }

  onWhatsAppNotification(callback: (notification: any) => void): void {
    this.on('whatsapp:notification', callback);
  }

  onWhatsAppError(callback: (error: any) => void): void {
    this.on('whatsapp:error', callback);
  }

  onWhatsAppStatusResponse(callback: (status: any) => void): void {
    this.on('whatsapp:status:response', callback);
  }

  // Friend Request Events
  sendFriendRequest(data: { receiverId: string; request: any }): void {
    this.emit('friend:request:send', data);
  }

  acceptFriendRequest(data: { senderId: string; request: any }): void {
    this.emit('friend:request:accepted', data);
  }

  onFriendRequestReceive(callback: (request: any) => void): void {
    this.on('friend:request:receive', callback);
  }

  onFriendRequestAccepted(callback: (request: any) => void): void {
    this.on('friend:request:accepted', callback);
  }

  // User Status Events
  onUserOnline(callback: (data: any) => void): void {
    this.on('user:online', callback);
  }

  onUserOffline(callback: (data: any) => void): void {
    this.on('user:offline', callback);
  }

  // Cleanup method
  cleanup(): void {
    this.eventListeners.clear();
    this.socket = null;
  }
}

export const socketService = new SocketService();
export default socketService;