// Copyright 2025 Amazon.com, Inc. or its affiliates.
// SPDX-License-Identifier: MIT-0

import {
  Session,
  Persona,
  ConversationMessage,
  CreateSessionRequest,
  CreateSessionResponse,
  SendMessageRequest,
  SendMessageResponse,
  GetPersonasResponse,
  SessionSummaryResponse,
  ResetSessionPersonasResponse,
  PollyVoice,
  VoiceSettings,
  UploadFileRequest,
  UploadFileResponse,
  CompleteFileUploadRequest,
  CompleteFileUploadResponse,
  ListFilesResponse,
  UpdateFileAssociationsRequest,
  UpdateFileAssociationsResponse,
} from '@group-chat-ai/shared';

const API_BASE_URL = (import.meta as { env?: Record<string, string> }).env?.VITE_API_BASE_URL || 'http://localhost:3000/api';

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

class ApiService {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new ApiError(
          errorData.message || `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          errorData.code
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      // Network or other errors
      throw new ApiError(error instanceof Error ? error.message : 'Network error occurred', 0);
    }
  }

  // Health check
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return this.request('/health');
  }

  // Session management
  async createSession(request: CreateSessionRequest): Promise<CreateSessionResponse> {
    return this.request('/sessions', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async getSession(sessionId: string): Promise<Session> {
    return this.request(`/sessions/${sessionId}`);
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

  async resetSessionPersonas(sessionId: string): Promise<ResetSessionPersonasResponse> {
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

  async generateVoicePreview(
    voiceId: string,
    personaId?: string
  ): Promise<{
    voiceId: string;
    personaId?: string;
    audioUrl: string;
    duration?: number;
    useNewscasterStyle: boolean;
    previewText: string;
  }> {
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

  // File upload management
  async initiateFileUpload(sessionId: string, request: UploadFileRequest): Promise<UploadFileResponse> {
    return this.request(`/sessions/${sessionId}/files/initiate`, {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async uploadFileToS3(uploadUrl: string, file: File): Promise<void> {
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': file.type,
      },
      body: file,
    });

    if (!response.ok) {
      throw new ApiError('Failed to upload file to S3', response.status);
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

// Create singleton instance
export const apiService = new ApiService();

// Export types for convenience
export { ApiError };
export type {
  Session,
  Persona,
  ConversationMessage,
  CreateSessionRequest,
  CreateSessionResponse,
  SendMessageRequest,
  SendMessageResponse,
  GetPersonasResponse,
  SessionSummaryResponse,
};
