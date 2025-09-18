// Copyright 2025 Amazon.com, Inc. or its affiliates.
// SPDX-License-Identifier: MIT-0

import { Request, Response } from 'express';
import { ConversationOrchestrator } from '../services/ConversationOrchestrator';
import { SessionService } from '../services/SessionService';
import { SharedServices } from '../services/SharedServices';
import { createLogger } from '../config/logger';
import { VoiceSettings, ValidationException } from '@group-chat-ai/shared';

const logger = createLogger();

export class VoiceController {
  private conversationOrchestrator: ConversationOrchestrator;
  private sessionService: SessionService;

  constructor(sessionService: SessionService) {
    this.conversationOrchestrator = SharedServices.getConversationOrchestrator();
    this.sessionService = sessionService;
  }

  /**
   * POST /api/voices/preview
   * Generate a voice preview for testing
   */
  async generateVoicePreview(req: Request, res: Response): Promise<void> {
    try {
      const { voiceId, personaId } = req.body;

      if (!voiceId) {
        res.status(400).json({
          error: 'Validation error',
          message: 'Voice ID is required',
        });
        return;
      }

      logger.info('Generating voice preview', { voiceId, personaId });

      // Standard preview text
      const previewText =
        "Hello, this is how I sound. I'm ready to provide feedback on your presentation.";

      // Check if this persona should use newscaster style
      const availableVoices = this.conversationOrchestrator.getAvailableVoices();
      const voice = availableVoices.find(v => v.voiceId === voiceId);

      if (!voice) {
        res.status(400).json({
          error: 'Validation error',
          message: `Invalid voice ID: ${voiceId}`,
        });
        return;
      }

      // Generate audio preview using orchestrator method
      const previewResult = await this.conversationOrchestrator.generateVoicePreview(
        previewText,
        voiceId,
        personaId
      );

      logger.info('Voice preview generated successfully', {
        voiceId,
        personaId,
        duration: previewResult.duration,
        useNewscasterStyle: previewResult.useNewscasterStyle,
      });

      res.json({
        voiceId,
        personaId,
        audioUrl: previewResult.audioUrl,
        duration: previewResult.duration,
        useNewscasterStyle: previewResult.useNewscasterStyle,
        previewText,
      });
    } catch (error) {
      logger.error('Error generating voice preview:', error);

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to generate voice preview',
      });
    }
  }

  /**
   * GET /api/voices
   * Get available Polly voices
   */
  async getAvailableVoices(req: Request, res: Response): Promise<void> {
    try {
      const { language } = req.query;
      logger.info('Getting available Polly voices', { language });

      let voices;
      if (language && typeof language === 'string') {
        // Get voices for specific language
        voices = this.conversationOrchestrator.getAvailableVoices().filter(voice => 
          voice.language.toLowerCase().includes(language.toLowerCase())
        );
      } else {
        // Get all voices
        voices = this.conversationOrchestrator.getAvailableVoices();
      }

      logger.info('Successfully retrieved available voices', {
        voiceCount: voices.length,
        language: language || 'all',
      });

      res.json(voices);
    } catch (error) {
      logger.error('Error getting available voices:', error);

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to retrieve available voices',
      });
    }
  }

  /**
   * GET /api/sessions/:sessionId/voice-settings
   * Get voice settings for a session
   */
  async getVoiceSettings(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;

      logger.info('Getting voice settings for session', { sessionId });

      const session = await this.sessionService.getSession(sessionId);
      if (!session) {
        res.status(404).json({
          error: 'Session not found',
          message: `Session with ID '${sessionId}' not found`,
        });
        return;
      }

      // Return default voice settings if none exist
      const defaultSettings: VoiceSettings = {
        enabled: false,
        personaVoices: {},
        playbackSettings: {
          autoPlay: true,
          volume: 0.8,
          speed: 1.0,
        },
      };

      const voiceSettings = session.voiceSettings || defaultSettings;

      logger.info('Successfully retrieved voice settings', {
        sessionId,
        enabled: voiceSettings.enabled,
        personaVoiceCount: Object.keys(voiceSettings.personaVoices).length,
      });

      res.json(voiceSettings);
    } catch (error) {
      logger.error('Error getting voice settings:', error);

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to retrieve voice settings',
      });
    }
  }

  /**
   * PUT /api/sessions/:sessionId/voice-settings
   * Update voice settings for a session
   */
  async updateVoiceSettings(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;
      const voiceSettings: VoiceSettings = req.body;

      logger.info('Updating voice settings for session', {
        sessionId,
        enabled: voiceSettings.enabled,
        personaVoiceCount: Object.keys(voiceSettings.personaVoices || {}).length,
      });

      // Validate voice settings
      this.validateVoiceSettings(voiceSettings);

      const session = await this.sessionService.getSession(sessionId);
      if (!session) {
        res.status(404).json({
          error: 'Session not found',
          message: `Session with ID '${sessionId}' not found`,
        });
        return;
      }

      // Update voice settings in session
      const updatedSession = await this.sessionService.updateVoiceSettings(
        sessionId,
        voiceSettings
      );

      logger.info('Successfully updated voice settings', {
        sessionId,
        enabled: voiceSettings.enabled,
        personaVoiceCount: Object.keys(voiceSettings.personaVoices).length,
      });

      res.json(updatedSession.voiceSettings);
    } catch (error) {
      if (error instanceof ValidationException) {
        logger.warn('Voice settings validation failed:', error);
        res.status(400).json({
          error: 'Validation error',
          message: error.message,
          field: error.field,
        });
        return;
      }

      logger.error('Error updating voice settings:', error);

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to update voice settings',
      });
    }
  }

  /**
   * Validate voice settings
   */
  private validateVoiceSettings(voiceSettings: VoiceSettings): void {
    if (typeof voiceSettings.enabled !== 'boolean') {
      throw new ValidationException('Voice settings enabled must be a boolean', 'enabled');
    }

    if (!voiceSettings.personaVoices || typeof voiceSettings.personaVoices !== 'object') {
      throw new ValidationException(
        'Voice settings must include personaVoices object',
        'personaVoices'
      );
    }

    if (!voiceSettings.playbackSettings) {
      throw new ValidationException(
        'Voice settings must include playbackSettings',
        'playbackSettings'
      );
    }

    const { playbackSettings } = voiceSettings;

    if (typeof playbackSettings.autoPlay !== 'boolean') {
      throw new ValidationException(
        'Playback settings autoPlay must be a boolean',
        'playbackSettings.autoPlay'
      );
    }

    if (
      typeof playbackSettings.volume !== 'number' ||
      playbackSettings.volume < 0 ||
      playbackSettings.volume > 1
    ) {
      throw new ValidationException(
        'Playback settings volume must be a number between 0 and 1',
        'playbackSettings.volume'
      );
    }

    if (
      typeof playbackSettings.speed !== 'number' ||
      playbackSettings.speed < 0.5 ||
      playbackSettings.speed > 2.0
    ) {
      throw new ValidationException(
        'Playback settings speed must be a number between 0.5 and 2.0',
        'playbackSettings.speed'
      );
    }

    // Validate persona voices
    const availableVoices = this.conversationOrchestrator.getAvailableVoices();
    const validVoiceIds = availableVoices.map(voice => voice.voiceId);

    for (const [personaId, voiceId] of Object.entries(voiceSettings.personaVoices)) {
      if (typeof voiceId !== 'string' || !validVoiceIds.includes(voiceId)) {
        throw new ValidationException(
          `Invalid voice ID '${voiceId}' for persona '${personaId}'`,
          `personaVoices.${personaId}`
        );
      }
    }

    logger.debug('Voice settings validation passed', {
      enabled: voiceSettings.enabled,
      personaVoiceCount: Object.keys(voiceSettings.personaVoices).length,
      validVoiceIds: validVoiceIds.length,
    });
  }
}
