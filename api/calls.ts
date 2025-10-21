import api from './axiosInstance';
import ENDPOINTS from './endPoints';

export interface CreateCallPayload {
  participants: string[];
  callType: 'voice' | 'video';
  groupId?: string | null;
}

const CallsApi = {
  create: (payload: CreateCallPayload) => api.post(ENDPOINTS.calls.create, payload),
  join: (callId: string) => api.post(ENDPOINTS.calls.join(callId)),
  leave: (callId: string) => api.post(ENDPOINTS.calls.leave(callId)),
  decline: (callId: string) => api.post(ENDPOINTS.calls.decline(callId)),
  end: (callId: string) => api.post(ENDPOINTS.calls.end(callId)),
  toggleMedia: (callId: string, mediaType: 'audio' | 'video', enabled: boolean) =>
    api.post(ENDPOINTS.calls.toggleMedia(callId), { mediaType, enabled }),
  activeForUser: () => api.get(ENDPOINTS.calls.activeForUser),
  historyForUser: (page = 1, limit = 20) =>
    api.get(ENDPOINTS.calls.historyForUser, { params: { page, limit } }),
  details: (callId: string) => api.get(ENDPOINTS.calls.details(callId)),
  logs: (callId: string) => api.get(ENDPOINTS.calls.logs(callId)),
  updateQuality: (callId: string, quality: 'low' | 'medium' | 'high') =>
    api.post(ENDPOINTS.calls.updateQuality(callId), { quality }),
  toggleRecording: (callId: string, enabled: boolean) =>
    api.post(ENDPOINTS.calls.toggleRecording(callId), { enabled }),
  stats: () => api.get(ENDPOINTS.calls.stats),
};

export default CallsApi;


