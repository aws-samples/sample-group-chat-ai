// Copyright 2025 Amazon.com, Inc. or its affiliates.
// SPDX-License-Identifier: MIT-0

import {
  PollyClient,
  SynthesizeSpeechCommand,
  SynthesizeSpeechCommandInput,
  VoiceId,
} from '@aws-sdk/client-polly';
import { createLogger } from '../config/logger';
import {
  DEFAULT_PERSONA_VOICES,
  DEFAULT_PERSONA_VOICES_BY_LANGUAGE,
  NEWSCASTER_STYLE_PERSONAS,
  POLLY_NEURAL_VOICES,
  VOICES_BY_LANGUAGE,
} from '@group-chat-ai/shared';
import crypto from 'crypto';
import { Readable } from 'stream';

const logger = createLogger();

export interface PollyConfig {
  region: string;
  enableStreaming: boolean;
  cacheAudioMinutes: number;
}

export interface AudioResult {
  audioBuffer: Buffer;
  audioBase64: string;
  duration?: number;
  voiceId: string;
  contentType: string;
}

export interface StreamingAudioChunk {
  chunk: Buffer;
  isComplete: boolean;
  sequenceNumber: number;
  totalSize?: number;
}

export class PollyService {
  private pollyClient: PollyClient;
  private config: PollyConfig;
  private audioCache: Map<string, AudioResult> = new Map();
  private cacheTimestamps: Map<string, number> = new Map();

  constructor(config: PollyConfig) {
    this.config = config;
    this.pollyClient = new PollyClient({ region: config.region });

    // Start cleanup timer for expired cache entries
    this.startCacheCleanup();

    logger.info('PollyService initialized with streaming support', {
      region: config.region,
      streamingEnabled: config.enableStreaming,
      cacheMinutes: config.cacheAudioMinutes,
    });
  }

  /**
   * Synthesize text to speech with streaming support
   */
  async synthesizeWithStreaming(
    text: string,
    voiceId: string,
    personaId?: string,
    useNewscasterStyle: boolean = false,
    _conversationLanguage?: string
  ): Promise<AudioResult> {
    try {
      // Generate cache key
      const cacheKey = this.generateCacheKey(text, voiceId, useNewscasterStyle);

      // Check cache first
      const cachedResult = this.audioCache.get(cacheKey);
      if (cachedResult && this.isCacheValid(cacheKey)) {
        logger.debug('Audio cache hit', { cacheKey, voiceId });
        return cachedResult;
      }

      // Validate voice
      if (!this.isValidVoice(voiceId)) {
        throw new Error(`Invalid voice ID: ${voiceId}`);
      }

      // Prepare text with SSML if needed
      const synthesisText = this.prepareSynthesisText(text, voiceId, useNewscasterStyle);
      const textType = useNewscasterStyle ? 'ssml' : 'text';

      // Synthesize speech with streaming
      const synthesisParams: SynthesizeSpeechCommandInput = {
        Text: synthesisText,
        VoiceId: voiceId as VoiceId,
        OutputFormat: 'mp3',
        Engine: 'neural',
        TextType: textType,
        SampleRate: '22050', // Good quality, reasonable file size
      };

      logger.debug('Synthesizing speech with streaming', {
        voiceId,
        textLength: text.length,
        useNewscasterStyle,
        streamingEnabled: this.config.enableStreaming,
      });

      const command = new SynthesizeSpeechCommand(synthesisParams);
      const response = await this.pollyClient.send(command);

      if (!response.AudioStream) {
        throw new Error('No audio stream received from Polly');
      }

      // Convert stream to buffer
      const audioBuffer = await this.streamToBuffer(response.AudioStream);
      const audioBase64 = audioBuffer.toString('base64');

      // Estimate duration (rough calculation: ~125 words per minute, ~5 chars per word)
      const estimatedDuration = this.estimateAudioDuration(text);

      const result: AudioResult = {
        audioBuffer,
        audioBase64,
        duration: estimatedDuration,
        voiceId,
        contentType: 'audio/mpeg',
      };

      // Cache the result
      this.audioCache.set(cacheKey, result);
      this.cacheTimestamps.set(cacheKey, Date.now());

      logger.info('Audio synthesized successfully with streaming', {
        voiceId,
        duration: estimatedDuration,
        audioSize: audioBuffer.length,
        cacheKey,
      });

      return result;
    } catch (error) {
      logger.error('Error synthesizing speech', {
        error: error instanceof Error ? error.message : 'Unknown error',
        voiceId,
        textLength: text.length,
      });
      throw error;
    }
  }

  /**
   * Stream audio synthesis in chunks for real-time playback
   */
  async *synthesizeStream(
    text: string,
    voiceId: string,
    personaId?: string,
    useNewscasterStyle: boolean = false,
    _conversationLanguage?: string
  ): AsyncGenerator<StreamingAudioChunk, void, unknown> {
    try {
      // Check if streaming is enabled
      if (!this.config.enableStreaming) {
        // Fallback to regular synthesis
        const result = await this.synthesizeWithStreaming(
          text,
          voiceId,
          personaId,
          useNewscasterStyle
        );
        yield {
          chunk: result.audioBuffer,
          isComplete: true,
          sequenceNumber: 0,
          totalSize: result.audioBuffer.length,
        };
        return;
      }

      // Generate cache key
      const cacheKey = this.generateCacheKey(text, voiceId, useNewscasterStyle);

      // Check cache first
      const cachedResult = this.audioCache.get(cacheKey);
      if (cachedResult && this.isCacheValid(cacheKey)) {
        logger.debug('Audio cache hit for streaming', { cacheKey, voiceId });

        // Stream cached result in chunks
        const chunkSize = 8192; // 8KB chunks
        const totalSize = cachedResult.audioBuffer.length;
        let offset = 0;
        let sequenceNumber = 0;

        while (offset < totalSize) {
          const remainingBytes = totalSize - offset;
          const currentChunkSize = Math.min(chunkSize, remainingBytes);
          const chunk = cachedResult.audioBuffer.subarray(offset, offset + currentChunkSize);

          yield {
            chunk,
            isComplete: offset + currentChunkSize >= totalSize,
            sequenceNumber: sequenceNumber++,
            totalSize,
          };

          offset += currentChunkSize;
        }
        return;
      }

      // Validate voice
      if (!this.isValidVoice(voiceId)) {
        throw new Error(`Invalid voice ID: ${voiceId}`);
      }

      // Prepare text with SSML if needed
      const synthesisText = this.prepareSynthesisText(text, voiceId, useNewscasterStyle);
      const textType = useNewscasterStyle ? 'ssml' : 'text';

      // Synthesize speech
      const synthesisParams: SynthesizeSpeechCommandInput = {
        Text: synthesisText,
        VoiceId: voiceId as VoiceId,
        OutputFormat: 'mp3',
        Engine: 'neural',
        TextType: textType,
        SampleRate: '22050',
      };

      logger.debug('Starting streaming synthesis', { voiceId, textLength: text.length });

      const command = new SynthesizeSpeechCommand(synthesisParams);
      const response = await this.pollyClient.send(command);

      if (!response.AudioStream) {
        throw new Error('No audio stream received from Polly');
      }

      // Stream the audio in chunks
      const audioStream = response.AudioStream as Readable;
      const chunks: Buffer[] = [];
      let sequenceNumber = 0;
      // const chunkSize = 8192; // 8KB chunks for streaming

      for await (const chunk of audioStream) {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        chunks.push(buffer);

        // Stream chunk immediately
        yield {
          chunk: buffer,
          isComplete: false,
          sequenceNumber: sequenceNumber++,
        };
      }

      // Combine all chunks for caching
      const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
      const resultArray = new Uint8Array(totalLength);
      let offset = 0;
      
      for (const chunk of chunks) {
        resultArray.set(new Uint8Array(chunk), offset);
        offset += chunk.length;
      }
      
      const fullAudioBuffer = Buffer.from(resultArray);
      const totalSize = fullAudioBuffer.length;

      // Send final chunk with completion flag
      yield {
        chunk: Buffer.alloc(0), // Empty chunk to signal completion
        isComplete: true,
        sequenceNumber: sequenceNumber,
        totalSize,
      };

      // Cache the complete result
      const result: AudioResult = {
        audioBuffer: fullAudioBuffer,
        audioBase64: fullAudioBuffer.toString('base64'),
        duration: this.estimateAudioDuration(text),
        voiceId,
        contentType: 'audio/mpeg',
      };

      this.audioCache.set(cacheKey, result);
      this.cacheTimestamps.set(cacheKey, Date.now());

      logger.info('Streaming synthesis completed', {
        voiceId,
        totalSize,
        chunksStreamed: sequenceNumber,
        cacheKey,
      });
    } catch (error) {
      logger.error('Error streaming speech synthesis', {
        error: error instanceof Error ? error.message : 'Unknown error',
        voiceId,
        textLength: text.length,
      });
      throw error;
    }
  }

  /**
   * Get default voice for persona
   */
  getDefaultVoiceForPersona(personaId: string): string {
    return DEFAULT_PERSONA_VOICES[personaId] || 'Joanna';
  }

  /**
   * Get voice for persona in specific language
   */
  getVoiceForPersonaAndLanguage(personaId: string, language: string = 'en'): string {
    // Check if we have language-specific mapping for this persona
    const languageMapping = DEFAULT_PERSONA_VOICES_BY_LANGUAGE[language];
    if (languageMapping && languageMapping[personaId]) {
      return languageMapping[personaId];
    }

    // Fallback to general language voices
    const languageVoices = VOICES_BY_LANGUAGE[language];
    if (languageVoices && languageVoices.length > 0) {
      // Use first available voice for this language
      return languageVoices[0].voiceId;
    }

    // Final fallback to English default
    return this.getDefaultVoiceForPersona(personaId);
  }

  /**
   * Get available voices for a specific language
   */
  getVoicesForLanguage(language: string): Array<{
    voiceId: string;
    name: string;
    gender: string;
    language: string;
    supportsNewscaster: boolean;
  }> {
    const languageVoices = VOICES_BY_LANGUAGE[language] || [];
    return languageVoices.map(voice => ({
      voiceId: voice.voiceId,
      name: voice.name,
      gender: voice.gender,
      language: voice.language,
      supportsNewscaster: voice.supportsNewscaster || false,
    }));
  }

  /**
   * Check if persona should use newscaster style
   */
  shouldUseNewscasterStyle(personaId: string, voiceId: string): boolean {
    const supportsNewscaster = POLLY_NEURAL_VOICES.find(
      v => v.voiceId === voiceId
    )?.supportsNewscaster;
    return NEWSCASTER_STYLE_PERSONAS.includes(personaId) && supportsNewscaster === true;
  }

  /**
   * Get available voices
   */
  getAvailableVoices(): Array<{
    voiceId: string;
    name: string;
    gender: string;
    language: string;
    supportsNewscaster: boolean;
  }> {
    return POLLY_NEURAL_VOICES.map(voice => ({
      voiceId: voice.voiceId,
      name: voice.name,
      gender: voice.gender,
      language: voice.language,
      supportsNewscaster: voice.supportsNewscaster || false,
    }));
  }

  /**
   * Validate voice ID
   */
  private isValidVoice(voiceId: string): boolean {
    return POLLY_NEURAL_VOICES.some(voice => voice.voiceId === voiceId);
  }

  /**
   * Check if cache is still valid
   */
  private isCacheValid(cacheKey: string): boolean {
    const timestamp = this.cacheTimestamps.get(cacheKey);
    if (!timestamp) {return false;}

    const ageMinutes = (Date.now() - timestamp) / (1000 * 60);
    return ageMinutes < this.config.cacheAudioMinutes;
  }

  /**
   * Prepare synthesis text with SSML if needed
   */
  private prepareSynthesisText(text: string, voiceId: string, useNewscasterStyle: boolean): string {
    if (!useNewscasterStyle) {
      return text;
    }

    // Clean text for SSML
    const cleanText = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');

    return `<speak><amazon:domain name="news">${cleanText}</amazon:domain></speak>`;
  }

  /**
   * Generate cache key for audio
   */
  private generateCacheKey(text: string, voiceId: string, useNewscasterStyle: boolean): string {
    const content = `${text}|${voiceId}|${useNewscasterStyle}`;
    return crypto.createHash('sha256').update(content).digest('hex').substring(0, 16);
  }

  /**
   * Convert stream to buffer
   */
  private async streamToBuffer(stream: Readable | unknown): Promise<Buffer> {
    const chunks: Buffer[] = [];

    // Handle AWS SDK stream types
    if (stream && typeof stream === 'object' && 'transformToByteArray' in stream) {
      // AWS SDK v3 stream with transformToByteArray method
      const bytes = await (stream as { transformToByteArray: () => Promise<Uint8Array> }).transformToByteArray();
      return Buffer.from(bytes);
    } else {
      // Standard Node.js Readable stream
      for await (const chunk of stream as Readable) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      
      // Manually concatenate buffers to avoid TypeScript type issues
      if (chunks.length === 0) {
        return Buffer.alloc(0);
      }
      if (chunks.length === 1) {
        return chunks[0];
      }
      
      const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
      const resultArray = new Uint8Array(totalLength);
      let offset = 0;
      
      for (const chunk of chunks) {
        resultArray.set(new Uint8Array(chunk), offset);
        offset += chunk.length;
      }
      
      return Buffer.from(resultArray);
    }
  }

  /**
   * Estimate audio duration based on text length
   */
  private estimateAudioDuration(text: string): number {
    // Rough estimation: ~125 words per minute, ~5 characters per word
    const wordsPerMinute = 125;
    const charsPerWord = 5;
    const estimatedWords = text.length / charsPerWord;
    const durationMinutes = estimatedWords / wordsPerMinute;
    return Math.max(1, Math.round(durationMinutes * 60)); // At least 1 second
  }

  /**
   * Start cache cleanup timer
   */
  private startCacheCleanup(): void {
    // Clean up cache every 10 minutes
    setInterval(
      () => {
        const now = Date.now();
        const expiredKeys: string[] = [];

        for (const [key, timestamp] of this.cacheTimestamps.entries()) {
          const ageMinutes = (now - timestamp) / (1000 * 60);
          if (ageMinutes > this.config.cacheAudioMinutes) {
            expiredKeys.push(key);
          }
        }

        for (const key of expiredKeys) {
          this.audioCache.delete(key);
          this.cacheTimestamps.delete(key);
        }

        if (expiredKeys.length > 0) {
          logger.debug('Cleaned up expired audio cache entries', {
            expiredCount: expiredKeys.length,
          });
        }
      },
      10 * 60 * 1000
    ); // 10 minutes
  }
}
