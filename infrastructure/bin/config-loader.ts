import * as fs from 'fs';
import * as path from 'path';

/**
 * Configuration interface for custom domain settings
 */
export interface CustomDomainConfig {
  domainName: string;
  certificateArn: string;
}

/**
 * Frontend-specific configuration options
 */
export interface FrontendConfig {
  customDomain?: CustomDomainConfig;
}

/**
 * Model configuration for AI services
 */
export interface ModelConfig {
  personaModel?: string;
  routingModel?: string;
  llmProvider?: string;
  routingProvider?: string;
}

/**
 * Backend-specific configuration options (for future extensions)
 */
export interface BackendConfig {
  scaling?: {
    minCapacity?: number;
    maxCapacity?: number;
  };
  environment?: {
    [key: string]: string;
  };
  models?: ModelConfig;
}

/**
 * Environment-specific configuration
 */
export interface EnvironmentConfig {
  frontend?: FrontendConfig;
  backend?: BackendConfig;
}

/**
 * Root configuration structure
 */
export interface GroupChatAIConfig {
  environments: {
    [environment: string]: EnvironmentConfig;
  };
}

/**
 * Configuration loader class
 */
export class ConfigLoader {
  private static instance: ConfigLoader;
  private config: GroupChatAIConfig | null = null;
  private configPath: string;

  private constructor() {
    this.configPath = path.join(__dirname, 'config.json');
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): ConfigLoader {
    if (!ConfigLoader.instance) {
      ConfigLoader.instance = new ConfigLoader();
    }
    return ConfigLoader.instance;
  }

  /**
   * Load configuration from config.json
   */
  public loadConfig(): GroupChatAIConfig | null {
    if (this.config !== null) {
      return this.config;
    }

    try {
      if (!fs.existsSync(this.configPath)) {
        console.log('No config.json found. Using default configuration.');
        return null;
      }

      const configContent = fs.readFileSync(this.configPath, 'utf8');
      const parsedConfig = JSON.parse(configContent) as GroupChatAIConfig;
      
      this.validateConfig(parsedConfig);
      this.config = parsedConfig;
      
      console.log('Configuration loaded successfully from config.json');
      return this.config;
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error(`Invalid JSON in config.json: ${error.message}`);
      } else if (error instanceof Error) {
        throw new Error(`Failed to load config.json: ${error.message}`);
      } else {
        throw new Error(`Unknown error loading config.json: ${String(error)}`);
      }
    }
  }

  /**
   * Get configuration for a specific environment
   */
  public getEnvironmentConfig(environment: string): EnvironmentConfig {
    const config = this.loadConfig();
    
    if (!config || !config.environments[environment]) {
      return {};
    }
    
    return config.environments[environment];
  }

  /**
   * Get frontend configuration for a specific environment
   */
  public getFrontendConfig(environment: string): FrontendConfig {
    const envConfig = this.getEnvironmentConfig(environment);
    return envConfig.frontend || {};
  }

  /**
   * Get backend configuration for a specific environment
   */
  public getBackendConfig(environment: string): BackendConfig {
    const envConfig = this.getEnvironmentConfig(environment);
    return envConfig.backend || {};
  }

  /**
   * Check if custom domain is configured for an environment
   */
  public hasCustomDomain(environment: string): boolean {
    const frontendConfig = this.getFrontendConfig(environment);
    return !!(frontendConfig.customDomain?.domainName && frontendConfig.customDomain?.certificateArn);
  }

  /**
   * Get custom domain configuration for an environment
   */
  public getCustomDomainConfig(environment: string): CustomDomainConfig | undefined {
    const frontendConfig = this.getFrontendConfig(environment);
    return frontendConfig.customDomain;
  }

  /**
   * Get model configuration for an environment with defaults
   */
  public getModelConfig(environment: string): ModelConfig {
    const backendConfig = this.getBackendConfig(environment);
    return {
      personaModel: backendConfig.models?.personaModel || 'us.anthropic.claude-sonnet-4-20250514-v1:0',
      routingModel: backendConfig.models?.routingModel || 'us.anthropic.claude-3-5-haiku-20241022-v1:0',
      llmProvider: backendConfig.models?.llmProvider || 'bedrock',
      routingProvider: backendConfig.models?.routingProvider || 'bedrock',
      ...backendConfig.models
    };
  }

  /**
   * Validate configuration structure
   */
  private validateConfig(config: any): void {
    if (!config || typeof config !== 'object') {
      throw new Error('Configuration must be an object');
    }

    if (!config.environments || typeof config.environments !== 'object') {
      throw new Error('Configuration must have an "environments" object');
    }

    // Validate each environment configuration
    for (const [envName, envConfig] of Object.entries(config.environments)) {
      if (typeof envConfig !== 'object' || envConfig === null) {
        throw new Error(`Environment "${envName}" configuration must be an object`);
      }

      const env = envConfig as any;

      // Validate frontend configuration
      if (env.frontend) {
        this.validateFrontendConfig(envName, env.frontend);
      }

      // Validate backend configuration
      if (env.backend) {
        this.validateBackendConfig(envName, env.backend);
      }
    }
  }

  /**
   * Validate frontend configuration
   */
  private validateFrontendConfig(envName: string, frontendConfig: any): void {
    if (typeof frontendConfig !== 'object' || frontendConfig === null) {
      throw new Error(`Frontend configuration for "${envName}" must be an object`);
    }

    // Validate custom domain configuration
    if (frontendConfig.customDomain) {
      const customDomain = frontendConfig.customDomain;
      
      if (typeof customDomain !== 'object' || customDomain === null) {
        throw new Error(`Custom domain configuration for "${envName}" must be an object`);
      }

      if (!customDomain.domainName || typeof customDomain.domainName !== 'string') {
        throw new Error(`Custom domain configuration for "${envName}" must have a valid "domainName" string`);
      }

      if (!customDomain.certificateArn || typeof customDomain.certificateArn !== 'string') {
        throw new Error(`Custom domain configuration for "${envName}" must have a valid "certificateArn" string`);
      }

      // Validate certificate ARN format
      const certArnRegex = /^arn:aws:acm:us-west-2:\d{12}:certificate\/[a-f0-9-]+$/;
      if (!certArnRegex.test(customDomain.certificateArn)) {
        throw new Error(`Certificate ARN for "${envName}" must be a valid ACM certificate ARN in us-west-2 region`);
      }

      // Validate domain name format (basic validation)
      const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.([a-zA-Z]{2,}\.)*[a-zA-Z]{2,}$/;
      if (!domainRegex.test(customDomain.domainName)) {
        throw new Error(`Domain name "${customDomain.domainName}" for "${envName}" is not valid`);
      }
    }
  }

  /**
   * Validate backend configuration
   */
  private validateBackendConfig(envName: string, backendConfig: any): void {
    if (typeof backendConfig !== 'object' || backendConfig === null) {
      throw new Error(`Backend configuration for "${envName}" must be an object`);
    }

    // Validate scaling configuration
    if (backendConfig.scaling) {
      const scaling = backendConfig.scaling;
      
      if (typeof scaling !== 'object' || scaling === null) {
        throw new Error(`Scaling configuration for "${envName}" must be an object`);
      }

      if (scaling.minCapacity !== undefined) {
        if (typeof scaling.minCapacity !== 'number' || scaling.minCapacity < 1) {
          throw new Error(`minCapacity for "${envName}" must be a positive number`);
        }
      }

      if (scaling.maxCapacity !== undefined) {
        if (typeof scaling.maxCapacity !== 'number' || scaling.maxCapacity < 1) {
          throw new Error(`maxCapacity for "${envName}" must be a positive number`);
        }
      }

      if (scaling.minCapacity && scaling.maxCapacity && scaling.minCapacity > scaling.maxCapacity) {
        throw new Error(`minCapacity cannot be greater than maxCapacity for "${envName}"`);
      }
    }

    // Validate environment variables
    if (backendConfig.environment) {
      const environment = backendConfig.environment;
      
      if (typeof environment !== 'object' || environment === null) {
        throw new Error(`Environment variables for "${envName}" must be an object`);
      }

      for (const [key, value] of Object.entries(environment)) {
        if (typeof value !== 'string') {
          throw new Error(`Environment variable "${key}" for "${envName}" must be a string`);
        }
      }
    }

    // Validate model configuration
    if (backendConfig.models) {
      const models = backendConfig.models;
      
      if (typeof models !== 'object' || models === null) {
        throw new Error(`Model configuration for "${envName}" must be an object`);
      }

      const validProviders = ['bedrock', 'openai', 'anthropic'];
      
      if (models.llmProvider && !validProviders.includes(models.llmProvider)) {
        throw new Error(`llmProvider for "${envName}" must be one of: ${validProviders.join(', ')}`);
      }

      if (models.routingProvider && !validProviders.includes(models.routingProvider)) {
        throw new Error(`routingProvider for "${envName}" must be one of: ${validProviders.join(', ')}`);
      }

      if (models.personaModel && typeof models.personaModel !== 'string') {
        throw new Error(`personaModel for "${envName}" must be a string`);
      }

      if (models.routingModel && typeof models.routingModel !== 'string') {
        throw new Error(`routingModel for "${envName}" must be a string`);
      }
    }
  }

  /**
   * Get the path to the config file
   */
  public getConfigPath(): string {
    return this.configPath;
  }

  /**
   * Check if config file exists
   */
  public configExists(): boolean {
    return fs.existsSync(this.configPath);
  }
}

/**
 * Helper function to get configuration loader instance
 */
export function getConfigLoader(): ConfigLoader {
  return ConfigLoader.getInstance();
}

/**
 * Helper function to load and get environment configuration
 */
export function getEnvironmentConfig(environment: string): EnvironmentConfig {
  return getConfigLoader().getEnvironmentConfig(environment);
}

/**
 * Helper function to check if custom domain is configured
 */
export function hasCustomDomain(environment: string): boolean {
  return getConfigLoader().hasCustomDomain(environment);
}

/**
 * Helper function to get custom domain configuration
 */
export function getCustomDomainConfig(environment: string): CustomDomainConfig | undefined {
  return getConfigLoader().getCustomDomainConfig(environment);
}
