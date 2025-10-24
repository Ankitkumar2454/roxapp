const ENDPOINTS = {
  auth: {
    login: "/api/auth/login",
    create: "/api/users",
    resetPassword: "/api/auth/reset-mpin",
    profile: "/api/auth/profile",
  },
  users: {
    getAll: "/api/users",
    all_chats : "/api/messages/messages/chat-partners"
  },
  friends: {
    add: "/api/friends/request",
    getAll: "/api/friends/",
    getPending: "/api/friends/requests/pending",
    accept: "/api/friends/request/accept",
    reject: "/api/friends/request/reject",
    sent: "/api/friends/requests/sent",
  },
  groups: {
    get: "/api/groups/",
    create: "/api/groups/",
    removeAdmin: "",
    removeMember: "/api/groups/members/remove",
    addMember: "/api/groups/members/add",
    makeAdmin: "/api/groups/members/promote",
    leaveGroup: "/api/groups/",
    messages: {
      send: "/api/group-messages/groups",
      getHistory: "/api/group-messages/groups",
      markAsRead: "/api/group-messages/groups",
      markAllAsRead: "/api/group-messages/groups",
      getUnreadCount: "/api/group-messages/groups",
    },
  },
  chat: {
    previous_message: "api/messages/messages",
    markAsRead: (messageId: string) => `/api/messages/${messageId}/read`,
    markAllAsRead: (friendId: string) => `/api/messages/messages/${friendId}/read-all`,
  },
    calls: {
    create: "/api/calls",
    join: (callId: string) => `/api/calls/${callId}/join`,
    leave: (callId: string) => `/api/calls/${callId}/leave`,
    decline: (callId: string) => `/api/calls/${callId}/decline`,
    end: (callId: string) => `/api/calls/${callId}/end`,
    toggleMedia: (callId: string) => `/api/calls/${callId}/media`,
    activeForUser: "/api/calls/active",
    historyForUser: "/api/calls/history",
    details: (callId: string) => `/api/calls/${callId}`,
    logs: (callId: string) => `/api/calls/${callId}/logs`,
    updateQuality: (callId: string) => `/api/calls/${callId}/quality`,
    toggleRecording: (callId: string) => `/api/calls/${callId}/recording`,
    stats: "/api/calls/stats",
  },
  socket: "ws://192.168.0.80:8000",
  whatsappchats: {
    getAllChats: "/api/whatsapp-messages/conversations",
    getChatHistory: "/api/whatsapp-messages/history"
  },
  upload: {
    documents: "/api/upload/documents",
    delete: "/api/upload/delete",
  },
};

export default ENDPOINTS;
