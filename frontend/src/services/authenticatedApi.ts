// Copyright 2025 Amazon.com, Inc. or its affiliates.
// SPDX-License-Identifier: MIT-0

import { User } from 'oidc-client-ts';
import { getApiConfig } from './authConfig';
import {
  CreateSessionRequest,
  CreateSessionResponse,
  SendMessageRequest,
  SendMessageResponse,
  Session,
  GetPersonasResponse,
  SessionSummaryResponse,
  VoiceSettings,
  PollyVoice,
  UploadFileRequest,
  UploadFileResponse,
  CompleteFileUploadRequest,
  CompleteFileUploadResponse,
  ListFilesResponse,
  UpdateFileAssociationsRequest,
  UpdateFileAssociationsResponse,
} from '@group-chat-ai/shared';

export class AuthenticatedApiService {
  private baseUrl: string = '/api';
  
  constructor(private getUser: () => User | null) {}

  async initialize() {
    try {
      const config = await getApiConfig();
      this.baseUrl = config.baseUrl;
    } catch (error) {
      console.warn('Failed to load API config, using default:', error);
    }
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const user = this.getUser();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers as Record<string, string>,
    };

    if (user?.access_token) {
      headers['Authorization'] = `Bearer ${user.access_token}`;
    }

    const config: RequestInit = {
      ...options,
      headers,
    };

    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, config);

    if (!response.ok) {
      if (response.status === 401) {
        // Token might be expired, let the auth provider handle it
        throw new Error('Unauthorized - token may be expired');
      }
      
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    // Handle empty responses (like 204 No Content)
    if (response.status === 204 || response.headers.get('content-length') === '0') {
      return undefined as T;
    }

    // Check if response has content
    const text = await response.text();
    if (!text) {
      return undefined as T;
    }

    return JSON.parse(text);
  }

  // Health check
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return this.request('/health');
  }

  // Session management
  async createSession(request: CreateSessionRequest): Promise<CreateSessionResponse> {
    const user = this.getUser();
    const requestWithUserId = {
      ...request,
      userId: user?.profile?.sub || user?.profile?.email, // Use sub (subject) or email as userId
    };

    return this.request('/sessions', {
      method: 'POST',
      body: JSON.stringify(requestWithUserId),
    });
  }

  async getSession(sessionId: string): Promise<Session> {
    const user = this.getUser();
    const userId = user?.profile?.sub || user?.profile?.email;

    if (!userId) {
      throw new Error('User ID not available');
    }

    return this.request(`/user-sessions/${userId}/${sessionId}`);
  }

  async sendMessage(sessionId: string, request: SendMessageRequest): Promise<SendMessageResponse> {
    return this.request(`/sessions/${sessionId}/messages`, {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async getSessionSummary(sessionId: string): Promise<SessionSummaryResponse> {
    return this.request(`/sessions/${sessionId}/summary`);
  }

  async resetSessionPersonas(sessionId: string): Promise<{ message: string }> {
    return this.request(`/sessions/${sessionId}/personas`, {
      method: 'DELETE',
    });
  }

  // Persona management
  async getPersonas(): Promise<GetPersonasResponse> {
    return this.request('/personas');
  }


  // Voice management
  async getAvailableVoices(): Promise<PollyVoice[]> {
    return this.request('/voices');
  }

  async generateVoicePreview(voiceId: string, personaId?: string): Promise<{ audioUrl: string; duration?: number }> {
    return this.request('/voices/preview', {
      method: 'POST',
      body: JSON.stringify({ voiceId, personaId }),
    });
  }

  async getVoiceSettings(sessionId: string): Promise<VoiceSettings> {
    return this.request(`/sessions/${sessionId}/voice-settings`);
  }

  async updateVoiceSettings(sessionId: string, settings: VoiceSettings): Promise<VoiceSettings> {
    return this.request(`/sessions/${sessionId}/voice-settings`, {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  }

  // User session management
  async getUserSessions(userId: string, limit?: number, offset?: number): Promise<any> {
    const params = new URLSearchParams();
    if (limit !== undefined) {
      params.append('limit', limit.toString());
    }
    if (offset !== undefined) {
      params.append('offset', offset.toString());
    }
    
    const queryString = params.toString();
    const endpoint = `/user-sessions/${userId}${queryString ? `?${queryString}` : ''}`;
    
    return this.request(endpoint);
  }

  async resumeUserSession(userId: string, sessionId: string): Promise<any> {
    return this.request(`/user-sessions/${userId}/${sessionId}/resume`, {
      method: 'POST',
    });
  }

  async deleteUserSession(userId: string, sessionId: string): Promise<void> {
    return this.request(`/user-sessions/${userId}/${sessionId}`, {
      method: 'DELETE',
    });
  }

  // File upload management
  async initiateFileUpload(sessionId: string, request: UploadFileRequest): Promise<UploadFileResponse> {
    return this.request(`/sessions/${sessionId}/files/initiate`, {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async uploadFileToS3(uploadUrl: string, file: File): Promise<void> {
    // Don't include auth headers for S3 presigned URL
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': file.type,
      },
      body: file,
    });

    if (!response.ok) {
      throw new Error('Failed to upload file to S3');
    }
  }

  async completeFileUpload(
    sessionId: string,
    fileId: string,
    request: CompleteFileUploadRequest
  ): Promise<CompleteFileUploadResponse> {
    return this.request(`/sessions/${sessionId}/files/${fileId}/complete`, {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async listSessionFiles(sessionId: string, personaId?: string): Promise<ListFilesResponse> {
    const queryParams = personaId ? `?personaId=${personaId}` : '';
    return this.request(`/sessions/${sessionId}/files${queryParams}`);
  }

  async deleteFile(sessionId: string, fileId: string): Promise<{ success: boolean; message: string }> {
    return this.request(`/sessions/${sessionId}/files/${fileId}`, {
      method: 'DELETE',
    });
  }

  async updateFileAssociations(
    sessionId: string,
    fileId: string,
    request: UpdateFileAssociationsRequest
  ): Promise<UpdateFileAssociationsResponse> {
    return this.request(`/sessions/${sessionId}/files/${fileId}/associations`, {
      method: 'PATCH',
      body: JSON.stringify(request),
    });
  }
}
