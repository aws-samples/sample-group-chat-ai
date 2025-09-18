// Copyright 2025 Amazon.com, Inc. or its affiliates.
// SPDX-License-Identifier: MIT-0

import { SSMClient, GetParameterCommand, GetParametersCommand } from '@aws-sdk/client-ssm';
import { createLogger } from '../config/logger';

const logger = createLogger();

export class ParameterStoreService {
  private ssmClient: SSMClient;
  private cache: Map<string, { value: string; timestamp: number }> = new Map();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.ssmClient = new SSMClient({
      region: process.env.AWS_REGION || 'us-west-2',
      credentials: process.env.AWS_ACCESS_KEY_ID
        ? {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
          }
        : undefined, // Use default credential chain if not provided
    });
  }

  /**
   * Get a single parameter value with caching
   */
  async getParameter(parameterName: string, useCache: boolean = true): Promise<string | null> {
    // Check cache first if enabled
    if (useCache) {
      const cached = this.cache.get(parameterName);
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
        logger.debug('Parameter retrieved from cache', { parameterName });
        return cached.value;
      }
    }

    try {
      const command = new GetParameterCommand({
        Name: parameterName,
        WithDecryption: false, // These are not encrypted parameters
      });

      const response = await this.ssmClient.send(command);
      const value = response.Parameter?.Value || null;

      if (value && useCache) {
        this.cache.set(parameterName, {
          value,
          timestamp: Date.now(),
        });
      }

      logger.debug('Parameter retrieved from SSM', { 
        parameterName,
        hasValue: !!value 
      });

      return value;
    } catch (error) {
      logger.warn('Failed to get parameter from SSM', {
        parameterName,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Get multiple parameters at once with caching
   */
  async getParameters(parameterNames: string[], useCache: boolean = true): Promise<Record<string, string | null>> {
    const result: Record<string, string | null> = {};
    const parametersToFetch: string[] = [];

    // Check cache for each parameter
    for (const parameterName of parameterNames) {
      if (useCache) {
        const cached = this.cache.get(parameterName);
        if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
          result[parameterName] = cached.value;
          continue;
        }
      }
      parametersToFetch.push(parameterName);
    }

    if (parametersToFetch.length === 0) {
      logger.debug('All parameters retrieved from cache', { parameterNames });
      return result;
    }

    try {
      const command = new GetParametersCommand({
        Names: parametersToFetch,
        WithDecryption: false,
      });

      const response = await this.ssmClient.send(command);

      // Process successful parameters
      if (response.Parameters) {
        for (const param of response.Parameters) {
          const name = param.Name!;
          const value = param.Value!;
          
          result[name] = value;
          
          if (useCache) {
            this.cache.set(name, {
              value,
              timestamp: Date.now(),
            });
          }
        }
      }

      // Handle invalid parameters
      if (response.InvalidParameters && response.InvalidParameters.length > 0) {
        logger.warn('Some parameters were invalid', {
          invalidParameters: response.InvalidParameters,
        });
        
        for (const invalidParam of response.InvalidParameters) {
          result[invalidParam] = null;
        }
      }

      logger.debug('Parameters retrieved from SSM', {
        requestedCount: parametersToFetch.length,
        successCount: response.Parameters?.length || 0,
        invalidCount: response.InvalidParameters?.length || 0,
      });

      return result;
    } catch (error) {
      logger.error('Failed to get parameters from SSM', {
        parameterNames: parametersToFetch,
        error: error instanceof Error ? error.message : String(error),
      });

      // Return null for all requested parameters
      for (const parameterName of parametersToFetch) {
        result[parameterName] = null;
      }

      return result;
    }
  }

  /**
   * Clear the parameter cache
   */
  clearCache(): void {
    this.cache.clear();
    logger.debug('Parameter cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; entries: string[] } {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys()),
    };
  }
}

// Singleton instance
let parameterStoreService: ParameterStoreService | null = null;

export function getParameterStoreService(): ParameterStoreService {
  if (!parameterStoreService) {
    parameterStoreService = new ParameterStoreService();
  }
  return parameterStoreService;
}