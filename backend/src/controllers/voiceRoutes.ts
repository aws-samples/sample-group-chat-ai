// Copyright 2025 Amazon.com, Inc. or its affiliates.
// SPDX-License-Identifier: MIT-0

import { Router } from 'express';
import { VoiceController } from './voiceController';
import { SessionService } from '../services/SessionService';

// Factory function to create voice routes with dependencies
export function createVoiceRoutes(sessionService: SessionService): Router {
  const router = Router();
  const voiceController = new VoiceController(sessionService);

  /**
   * @swagger
   * /api/voices:
   *   get:
   *     summary: Get available voices
   *     description: Retrieve all available Amazon Polly text-to-speech voices
   *     tags: [Voices]
   *     responses:
   *       200:
   *         description: List of available voices
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 voices:
   *                   type: array
   *                   items:
   *                     type: object
   *                     properties:
   *                       id:
   *                         type: string
   *                       name:
   *                         type: string
   *                       gender:
   *                         type: string
   *                       language:
   *                         type: string
   *                       languageCode:
   *                         type: string
   *                       engine:
   *                         type: string
   *       500:
   *         $ref: '#/components/responses/InternalError'
   */
  router.get('/', voiceController.getAvailableVoices.bind(voiceController));

  /**
   * @swagger
   * /api/voices/preview:
   *   post:
   *     summary: Generate voice preview
   *     description: Generate a text-to-speech preview using specified voice settings
   *     tags: [Voices]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - text
   *               - voiceId
   *             properties:
   *               text:
   *                 type: string
   *                 maxLength: 200
   *                 description: Text to synthesize (max 200 characters)
   *               voiceId:
   *                 type: string
   *                 description: Amazon Polly voice ID
   *               engine:
   *                 type: string
   *                 enum: [standard, neural]
   *                 default: neural
   *                 description: Voice synthesis engine
   *     responses:
   *       200:
   *         description: Voice preview generated successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 audioUrl:
   *                   type: string
   *                   description: URL to the generated audio file
   *                 duration:
   *                   type: number
   *                   description: Audio duration in seconds
   *       400:
   *         $ref: '#/components/responses/ValidationError'
   *       500:
   *         $ref: '#/components/responses/InternalError'
   */
  router.post('/preview', voiceController.generateVoicePreview.bind(voiceController));

  /**
   * @swagger
   * /api/voices/sessions/{sessionId}/voice-settings:
   *   get:
   *     summary: Get session voice settings
   *     description: Retrieve voice settings for a specific conversation session
   *     tags: [Voices]
   *     parameters:
   *       - in: path
   *         name: sessionId
   *         required: true
   *         schema:
   *           type: string
   *         description: Unique identifier of the session
   *     responses:
   *       200:
   *         description: Voice settings retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 sessionId:
   *                   type: string
   *                 voiceSettings:
   *                   type: object
   *                   properties:
   *                     defaultVoiceId:
   *                       type: string
   *                     engine:
   *                       type: string
   *                     personaVoices:
   *                       type: object
   *       404:
   *         $ref: '#/components/responses/NotFound'
   *       500:
   *         $ref: '#/components/responses/InternalError'
   */
  router.get(
    '/sessions/:sessionId/voice-settings',
    voiceController.getVoiceSettings.bind(voiceController)
  );

  /**
   * @swagger
   * /api/voices/sessions/{sessionId}/voice-settings:
   *   put:
   *     summary: Update session voice settings
   *     description: Update voice settings for a specific conversation session
   *     tags: [Voices]
   *     parameters:
   *       - in: path
   *         name: sessionId
   *         required: true
   *         schema:
   *           type: string
   *         description: Unique identifier of the session
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               defaultVoiceId:
   *                 type: string
   *                 description: Default voice ID for the session
   *               engine:
   *                 type: string
   *                 enum: [standard, neural]
   *                 description: Voice synthesis engine
   *               personaVoices:
   *                 type: object
   *                 additionalProperties:
   *                   type: string
   *                 description: Voice ID mappings for specific personas
   *     responses:
   *       200:
   *         description: Voice settings updated successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 sessionId:
   *                   type: string
   *                 message:
   *                   type: string
   *                 updatedAt:
   *                   type: number
   *       400:
   *         $ref: '#/components/responses/ValidationError'
   *       404:
   *         $ref: '#/components/responses/NotFound'
   *       500:
   *         $ref: '#/components/responses/InternalError'
   */
  router.put(
    '/sessions/:sessionId/voice-settings',
    voiceController.updateVoiceSettings.bind(voiceController)
  );

  return router;
}

// Backward compatibility export
export { createVoiceRoutes as voiceRoutes };
