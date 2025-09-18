// Copyright 2025 Amazon.com, Inc. or its affiliates.
// SPDX-License-Identifier: MIT-0

import { Router } from 'express';
import { VoiceController } from './voiceController';
import { SessionService } from '../services/SessionService';

// Factory function to create voice routes with dependencies
export function createVoiceRoutes(sessionService: SessionService): Router {
  const router = Router();
  const voiceController = new VoiceController(sessionService);

  // GET /api/voices - Get available Polly voices
  router.get('/', voiceController.getAvailableVoices.bind(voiceController));

  // POST /api/voices/preview - Generate voice preview
  router.post('/preview', voiceController.generateVoicePreview.bind(voiceController));

  // GET /api/sessions/:sessionId/voice-settings - Get voice settings for a session
  router.get(
    '/sessions/:sessionId/voice-settings',
    voiceController.getVoiceSettings.bind(voiceController)
  );

  // PUT /api/sessions/:sessionId/voice-settings - Update voice settings for a session
  router.put(
    '/sessions/:sessionId/voice-settings',
    voiceController.updateVoiceSettings.bind(voiceController)
  );

  return router;
}

// Backward compatibility export
export { createVoiceRoutes as voiceRoutes };
