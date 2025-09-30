// Copyright 2025 Amazon.com, Inc. or its affiliates.
// SPDX-License-Identifier: MIT-0

import { Router, Request, Response, NextFunction } from 'express';
import { GetPersonasResponse } from '@group-chat-ai/shared';
import { PERSONA_DEFINITIONS, getPersonaById } from '@group-chat-ai/shared/personas';
import { createLogger } from '../config/logger';

const router = Router();
const logger = createLogger();

/**
 * @swagger
 * /api/personas:
 *   get:
 *     summary: Get all available personas
 *     description: Retrieve a list of all available AI personas
 *     tags: [Personas]
 *     responses:
 *       200:
 *         description: List of available personas
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PersonasResponse'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    logger.info('Fetching available personas');

    const response: GetPersonasResponse = {
      personas: PERSONA_DEFINITIONS.map(persona => ({
        personaId: persona.personaId,
        name: persona.name,
        role: persona.role,
        description: persona.details,
      })),
    };

    res.json(response);
  } catch (error) {
    logger.error('Error fetching personas:', error);
    next(error);
  }
});

/**
 * @swagger
 * /api/personas/{personaId}:
 *   get:
 *     summary: Get specific persona details
 *     description: Retrieve detailed information about a specific persona
 *     tags: [Personas]
 *     parameters:
 *       - in: path
 *         name: personaId
 *         required: true
 *         schema:
 *           type: string
 *         description: Unique identifier of the persona
 *     responses:
 *       200:
 *         description: Persona details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Persona'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.get('/:personaId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { personaId } = req.params;

    logger.info('Fetching persona details', { personaId });

    const persona = getPersonaById(personaId);

    if (!persona) {
      return res.status(404).json({
        error: 'ResourceNotFoundException',
        message: `Persona with ID '${personaId}' not found`,
        resourceType: 'persona',
        resourceId: personaId,
        statusCode: 404,
        timestamp: Date.now(),
      });
    }

    res.json({
      personaId: persona.personaId,
      name: persona.name,
      role: persona.role,
      description: persona.details,
    });
  } catch (error) {
    logger.error('Error fetching persona details:', error);
    next(error);
  }
});

export { router as personaRoutes };
