// Copyright 2025 Amazon.com, Inc. or its affiliates.
// SPDX-License-Identifier: MIT-0

import { createLogger } from './logger';
import { getParameterStoreService } from '../services/ParameterStoreService';

const logger = createLogger();

export interface ModelDefaults {
  readonly personaModel: string;
  readonly routingModel: string;
  readonly personaProvider: string;
  readonly routingProvider: string;
}

export class ModelConfig {
  private static instance: ModelConfig;
  private config: ModelDefaults | null = null;
  private configLoaded: Promise<ModelDefaults>;

  // SINGLE SOURCE OF TRUTH FOR MODEL DEFAULTS
  private static readonly DEFAULT_MODELS: ModelDefaults = {
    personaModel: 'openai.gpt-oss-120b-1:0',  // Keep OpenAI for personas
    routingModel: 'us.anthropic.claude-sonnet-4-20250514-v1:0',
    personaProvider: 'bedrock',
    routingProvider: 'bedrock',
  };

  private constructor() {
    this.configLoaded = this.loadConfiguration();
  }

  public static getInstance(): ModelConfig {
    if (!ModelConfig.instance) {
      ModelConfig.instance = new ModelConfig();
    }
    return ModelConfig.instance;
  }

  private async loadConfiguration(): Promise<ModelDefaults> {
    if (this.config) {
      return this.config;
    }

    try {
      // Try Parameter Store first (if configured)
      const parameterStore = getParameterStoreService();
      const parameterNames: string[] = [];

      const personaModelParam = process.env.LLM_MODEL_PARAM;
      const personaProviderParam = process.env.LLM_PROVIDER_PARAM;
      const routingModelParam = process.env.ROUTING_MODEL_PARAM;
      const routingProviderParam = process.env.ROUTING_PROVIDER_PARAM;

      if (personaModelParam) {
        parameterNames.push(personaModelParam);
      }
      if (personaProviderParam) {
        parameterNames.push(personaProviderParam);
      }
      if (routingModelParam) {
        parameterNames.push(routingModelParam);
      }
      if (routingProviderParam) {
        parameterNames.push(routingProviderParam);
      }

      let parameterValues: Record<string, string | null> = {};

      if (parameterNames.length > 0) {
        logger.info('Loading model configuration from Parameter Store', { parameterNames });
        parameterValues = await parameterStore.getParameters(parameterNames);
      }

      // Build final configuration with precedence: Parameter Store > Environment > Defaults
      this.config = {
        personaModel:
          (personaModelParam && parameterValues[personaModelParam]) ||
          process.env.LLM_MODEL ||
          ModelConfig.DEFAULT_MODELS.personaModel,

        routingModel:
          (routingModelParam && parameterValues[routingModelParam]) ||
          process.env.ROUTING_MODEL ||
          ModelConfig.DEFAULT_MODELS.routingModel,

        personaProvider:
          (personaProviderParam && parameterValues[personaProviderParam]) ||
          process.env.LLM_PROVIDER ||
          ModelConfig.DEFAULT_MODELS.personaProvider,

        routingProvider:
          (routingProviderParam && parameterValues[routingProviderParam]) ||
          process.env.ROUTING_PROVIDER ||
          ModelConfig.DEFAULT_MODELS.routingProvider,
      };

      logger.info('Model configuration loaded', this.config);
      return this.config;

    } catch (error) {
      logger.error('Failed to load model configuration, using defaults', {
        error: error instanceof Error ? error.message : String(error)
      });

      // Fallback to environment variables + defaults
      this.config = {
        personaModel: process.env.LLM_MODEL || ModelConfig.DEFAULT_MODELS.personaModel,
        routingModel: process.env.ROUTING_MODEL || ModelConfig.DEFAULT_MODELS.routingModel,
        personaProvider: process.env.LLM_PROVIDER || ModelConfig.DEFAULT_MODELS.personaProvider,
        routingProvider: process.env.ROUTING_PROVIDER || ModelConfig.DEFAULT_MODELS.routingProvider,
      };

      return this.config;
    }
  }

  public async getPersonaModel(): Promise<string> {
    const config = await this.configLoaded;
    return config.personaModel;
  }

  public async getRoutingModel(): Promise<string> {
    const config = await this.configLoaded;
    return config.routingModel;
  }

  public async getPersonaProvider(): Promise<string> {
    const config = await this.configLoaded;
    return config.personaProvider;
  }

  public async getRoutingProvider(): Promise<string> {
    const config = await this.configLoaded;
    return config.routingProvider;
  }

  public async getFullConfig(): Promise<ModelDefaults> {
    return await this.configLoaded;
  }

  // For testing/debugging
  public static getDefaults(): ModelDefaults {
    return { ...ModelConfig.DEFAULT_MODELS };
  }
}