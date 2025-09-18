// Copyright 2025 Amazon.com, Inc. or its affiliates.
// SPDX-License-Identifier: MIT-0

import {
  VoiceSettings,
  AudioPlaybackSettings,
  PersonaAudioMessage,
  AudioErrorMessage,
} from '@group-chat-ai/shared';

export interface AudioQueueItem {
  messageId: string;
  personaId: string;
  audioUrl: string;
  duration?: number;
  voiceId: string;
  audio: HTMLAudioElement;
}

export interface AudioCallbacks {
  onAudioStarted?: (messageId: string, personaId: string) => void;
  onAudioFinished?: (messageId: string, personaId: string) => void;
}

export class AudioService {
  private audioQueue: Map<string, AudioQueueItem> = new Map();
  private currentlyPlaying: string | null = null;
  private currentlySpeakingPersona: string | null = null;
  private voiceSettings: VoiceSettings | null = null;
  private audioContext: AudioContext | null = null;
  private audioCallbacks: AudioCallbacks = {};

  constructor() {
    // Initialize audio context for better browser compatibility
    this.initializeAudioContext();
  }

  /**
   * Initialize audio context
   */
  private initializeAudioContext(): void {
    try {
      // Create audio context for better browser support
      this.audioContext = new (window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)();

      // Resume audio context on user interaction (required by browsers)
      const resumeAudioContext = () => {
        if (this.audioContext?.state === 'suspended') {
          this.audioContext.resume();
        }
        document.removeEventListener('click', resumeAudioContext);
        document.removeEventListener('touchstart', resumeAudioContext);
      };

      document.addEventListener('click', resumeAudioContext);
      document.addEventListener('touchstart', resumeAudioContext);
    } catch (error) {
      console.warn('Audio context not supported:', error);
    }
  }

  /**
   * Set voice settings for the session
   */
  setVoiceSettings(settings: VoiceSettings): void {
    this.voiceSettings = settings;
  }

  /**
   * Get current voice settings
   */
  getVoiceSettings(): VoiceSettings | null {
    return this.voiceSettings;
  }

  /**
   * Set audio callbacks for speaking state management
   */
  setAudioCallbacks(callbacks: AudioCallbacks): void {
    this.audioCallbacks = callbacks;
  }

  /**
   * Get currently speaking persona ID
   */
  getCurrentlySpeakingPersona(): string | null {
    return this.currentlySpeakingPersona;
  }

  /**
   * Check if a specific persona is currently speaking
   */
  isPersonaSpeaking(personaId: string): boolean {
    return this.currentlySpeakingPersona === personaId;
  }

  /**
   * Handle incoming persona audio message
   */
  async handlePersonaAudio(
    audioMessage: PersonaAudioMessage,
    onAudioFinished?: (messageId: string, personaId: string) => void
  ): Promise<void> {
    if (!this.voiceSettings?.enabled) {
      return;
    }

    try {
      // Create audio element
      const audio = new Audio();
      audio.src = audioMessage.audioUrl;
      audio.volume = this.voiceSettings.playbackSettings.volume;
      audio.playbackRate = this.voiceSettings.playbackSettings.speed;

      // Preload audio
      audio.preload = 'auto';

      // Create queue item
      const queueItem: AudioQueueItem = {
        messageId: audioMessage.messageId,
        personaId: audioMessage.personaId,
        audioUrl: audioMessage.audioUrl,
        duration: audioMessage.duration,
        voiceId: audioMessage.voiceId,
        audio,
      };

      // Set up audio completion callback for queuing system
      audio.addEventListener('ended', () => {
        this.currentlyPlaying = null;

        // Notify backend that audio has finished for queue management
        if (onAudioFinished) {
          onAudioFinished(audioMessage.messageId, audioMessage.personaId);
        }

        console.log('Audio playback finished:', {
          messageId: audioMessage.messageId,
          personaId: audioMessage.personaId,
        });
      });

      // Add to queue
      this.audioQueue.set(audioMessage.messageId, queueItem);

      // Auto-play if enabled
      if (this.voiceSettings.playbackSettings.autoPlay) {
        await this.playAudio(audioMessage.messageId);
      }

      console.log('Persona audio ready for playback:', {
        messageId: audioMessage.messageId,
        personaId: audioMessage.personaId,
        voiceId: audioMessage.voiceId,
        duration: audioMessage.duration,
        autoPlay: this.voiceSettings.playbackSettings.autoPlay,
      });
    } catch (error) {
      console.error('Error handling persona audio:', error);
      throw error;
    }
  }

  /**
   * Play audio by message ID
   */
  async playAudio(messageId: string): Promise<void> {
    const queueItem = this.audioQueue.get(messageId);
    if (!queueItem) {
      console.warn('Audio not found for message:', messageId);
      return;
    }

    try {
      // Stop currently playing audio
      if (this.currentlyPlaying) {
        await this.stopAudio(this.currentlyPlaying);
      }

      // Resume audio context if needed
      if (this.audioContext?.state === 'suspended') {
        await this.audioContext.resume();
      }

      // Update playing state
      this.currentlyPlaying = messageId;
      this.currentlySpeakingPersona = queueItem.personaId;

      // Set up event listeners for audio completion
      const handleAudioEnded = () => {
        this.currentlyPlaying = null;
        this.currentlySpeakingPersona = null;

        // Call audio finished callback
        if (this.audioCallbacks.onAudioFinished) {
          this.audioCallbacks.onAudioFinished(messageId, queueItem.personaId);
        }

        console.log('Audio speaking finished:', {
          messageId,
          personaId: queueItem.personaId,
        });

        // Remove event listeners to prevent memory leaks
        queueItem.audio.removeEventListener('ended', handleAudioEnded);
        queueItem.audio.removeEventListener('error', handleAudioError);
      };

      const handleAudioError = (error: Event) => {
        console.error('Audio playback error:', error);
        this.currentlyPlaying = null;
        this.currentlySpeakingPersona = null;

        // Remove event listeners to prevent memory leaks
        queueItem.audio.removeEventListener('ended', handleAudioEnded);
        queueItem.audio.removeEventListener('error', handleAudioError);
      };

      queueItem.audio.addEventListener('ended', handleAudioEnded);
      queueItem.audio.addEventListener('error', handleAudioError);

      // Start audio playback
      await queueItem.audio.play();

      // Call audio started callback
      if (this.audioCallbacks.onAudioStarted) {
        this.audioCallbacks.onAudioStarted(messageId, queueItem.personaId);
      }

      console.log('Audio speaking started:', {
        messageId,
        personaId: queueItem.personaId,
        voiceId: queueItem.voiceId,
      });
    } catch (error) {
      console.error('Error playing audio:', error);
      this.currentlyPlaying = null;
      this.currentlySpeakingPersona = null;
      throw error;
    }
  }

  /**
   * Stop audio by message ID
   */
  async stopAudio(messageId: string): Promise<void> {
    const queueItem = this.audioQueue.get(messageId);
    if (!queueItem) {
      return;
    }

    try {
      queueItem.audio.pause();
      queueItem.audio.currentTime = 0;

      if (this.currentlyPlaying === messageId) {
        this.currentlyPlaying = null;
      }

      console.log('Stopped audio:', messageId);
    } catch (error) {
      console.error('Error stopping audio:', error);
    }
  }

  /**
   * Stop all audio playback
   */
  async stopAllAudio(): Promise<void> {
    for (const [messageId] of this.audioQueue) {
      await this.stopAudio(messageId);
    }
  }

  /**
   * Check if audio is currently playing
   */
  isPlaying(messageId?: string): boolean {
    if (messageId) {
      return this.currentlyPlaying === messageId;
    }
    return this.currentlyPlaying !== null;
  }

  /**
   * Get currently playing message ID
   */
  getCurrentlyPlaying(): string | null {
    return this.currentlyPlaying;
  }

  /**
   * Update playback settings
   */
  updatePlaybackSettings(settings: AudioPlaybackSettings): void {
    if (!this.voiceSettings) {
      return;
    }

    this.voiceSettings.playbackSettings = settings;

    // Update all queued audio elements
    for (const queueItem of this.audioQueue.values()) {
      queueItem.audio.volume = settings.volume;
      queueItem.audio.playbackRate = settings.speed;
    }
  }

  /**
   * Clear audio queue
   */
  clearQueue(): void {
    this.stopAllAudio();

    // Dispose of audio elements
    for (const queueItem of this.audioQueue.values()) {
      queueItem.audio.src = '';
      queueItem.audio.remove();
    }

    this.audioQueue.clear();
    this.currentlyPlaying = null;
  }

  /**
   * Handle audio error
   */
  handleAudioError(errorMessage: AudioErrorMessage): void {
    console.error('Audio generation error:', {
      messageId: errorMessage.messageId,
      personaId: errorMessage.personaId,
      error: errorMessage.error,
      timestamp: errorMessage.timestamp,
    });

    // Remove from queue if it exists
    this.audioQueue.delete(errorMessage.messageId);

    // Stop if currently playing
    if (this.currentlyPlaying === errorMessage.messageId) {
      this.currentlyPlaying = null;
    }
  }

  /**
   * Get audio queue status
   */
  getQueueStatus(): {
    totalItems: number;
    currentlyPlaying: string | null;
    queuedItems: string[];
  } {
    return {
      totalItems: this.audioQueue.size,
      currentlyPlaying: this.currentlyPlaying,
      queuedItems: Array.from(this.audioQueue.keys()),
    };
  }

  /**
   * Dispose of audio service
   */
  dispose(): void {
    this.clearQueue();

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

// Export singleton instance
export const audioService = new AudioService();
