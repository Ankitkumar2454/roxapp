const ENDPOINTS = {
  auth: {
    login: "/api/auth/login",
    create: "/api/users",
    resetPassword: "/api/auth/reset-mpin",
    profile: "/api/auth/profile",
  },
  users: {
    getAll: "/api/users",
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
    markAsRead: "/api/messages/",
  },
  socket: "wss://polobet247.in",
  whatsappchats: {
    getAllChats: "/api/whatsapp-messages/conversations",
    getChatHistory:"/api/whatsapp-messages/history"
  },
};

export default ENDPOINTS;
