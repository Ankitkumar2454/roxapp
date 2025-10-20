export interface loginPayload {
  username: string;
  password: string;
}

export interface user {
  id: string;
  username: string;
  fullName: string;
  role: "admin" | "user" | string;
  profileImage: string;
  userId: string;
}

export interface loginResponseData {
  accessToken: string;
  refreshToken: string;
  user: user;
}

export interface loginResponse {
  success: boolean;
  data: loginResponseData;
  message: string;
}

export interface Contact {
  id: string;
  name: string;
  status?: string;
  avatar?: string;
  initial?: string;
  bgColor?: string;
  isYou?: boolean;
  username?: string;
}

export interface createContactData {
  id: string;
  username: string;
  fullName: string;
  profileImage: string;
  role: "user" | "admin" | string;
  isFirstLogin: boolean;
}

export interface createContactResponse {
  success: boolean;
  message: string;
  code?: string;
  data?: createContactData;
}

export interface PendingRequest {
  id: string;
  name: string;
  username: string;
  avatar?: string;
  initial?: string;
  bgColor?: string;
  requestDate: string;
  status: "pending" | "accepted" | "rejected";
}

export interface groupChatResponse {
  message: string;
  data: any;
  success: boolean;
}

export interface Friend {
  id: string;
  name: string;
  username: string;
  avatar?: string;
  initial: string;
  bgColor: string;
  isActive: boolean;
  lastMessage?: string;
  lastMessageTime?: string;
  unread?: boolean;
}


export interface UserData {
  _id: string;
  fullName: string;
  username: string;
  profileImage: string;
  role: string;
  isFirstLogin: boolean;
  isActive: boolean;
  lastLogin: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse {
  success: boolean;
  data: UserData;
  message: string;
}

export interface InfoItem {
  label: string;
  value: string;
  icon: string;
}

export interface Member {
    _id: string;
    username: string;
    fullName: string;
    profileImage?: string;
    isActive?: boolean;
}

export interface GroupData {
    _id: string;
    name: string;
    description?: string;
    groupImage?: string;
    createdBy: Member;
    members: Member[];
    admins: Member[];
    createdAt: string;
    updatedAt: string;
}

export interface Message {
    _id?: string;
    id: string;
    senderId: string;
    senderName?: string;
    sender?: {
        _id: string;
        username: string;
        fullName: string;
        profileImage?: string;
    };
    avatar?: string;
    text: string;
    content?: string;
    time: string;
    isSent: boolean;
    isDelivered?: boolean;
    isRead?: boolean;
    messageType?: 'text' | 'image' | 'voice' | 'system';
    mediaUrl?: string;
    mediaThumbnail?: string;
    voiceDuration?: number;
    readBy?: Array<{
        user: string;
        readAt: Date;
    }>;
    isSystemMessage?: boolean;
}

export interface FriendGroupChat {
    _id: string;
    fullName: string;
    username: string;
    profileImage?: string;
    isActive: boolean;
}

export interface GlobalLoaderProps {
    visible: boolean;
    message?: string;
}