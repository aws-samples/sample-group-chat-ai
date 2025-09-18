#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const CONFIG_PATH = path.join(__dirname, '..', 'infrastructure', 'bin', 'config.json');

const SAMPLE_CONFIG = {
  environments: {
    dev: {
      backend: {
        models: {
          personaModel: 'anthropic.claude-sonnet-4-20250514-v1:0',
          routingModel: 'openai.gpt-oss-20b-1:0',
          llmProvider: 'bedrock',
          routingProvider: 'bedrock'
        }
      },
      frontend: {
        customDomain: {
          domainName: 'dev.yourapp.com',
          certificateArn: 'arn:aws:acm:us-west-2:123456789012:certificate/your-cert-id'
        }
      }
    },
    staging: {
      backend: {
        models: {
          personaModel: 'anthropic.claude-sonnet-4-20250514-v1:0',
          routingModel: 'amazon.nova-pro-v1:0',
          llmProvider: 'bedrock',
          routingProvider: 'bedrock'
        }
      }
    },
    prod: {
      backend: {
        models: {
          personaModel: 'anthropic.claude-sonnet-4-20250514-v1:0',
          routingModel: 'amazon.nova-pro-v1:0',
          llmProvider: 'bedrock',
          routingProvider: 'bedrock'
        }
      }
    }
  }
};

function showHelp() {
  console.log(`
Group Chat AI Configuration Manager

Usage:
  npm run config              Interactive configuration setup (recommended)
  npm run config:status       Show current configuration status
  npm run config:init         Create sample config.json file
  npm run config:validate     Validate existing config.json

Configuration File Location:
  ${CONFIG_PATH}

Model Configuration Options:
  - personaModel: Model ID for AI persona responses (default: anthropic.claude-sonnet-4-20250514-v1:0)
  - routingModel: Model ID for conversation routing (default: openai.gpt-oss-20b-1:0)
  - llmProvider: Provider for persona models (bedrock|openai|anthropic|ollama)
  - routingProvider: Provider for routing model (bedrock|openai|anthropic|ollama)

Examples:
  # Bedrock models
  "personaModel": "anthropic.claude-sonnet-4-20250514-v1:0"
  "routingModel": "amazon.nova-pro-v1:0"
  
  # OpenAI models
  "personaModel": "gpt-4"
  "routingModel": "gpt-3.5-turbo"
  
  # Mixed providers
  "llmProvider": "bedrock"
  "routingProvider": "openai"
`);
}

function configExists() {
  return fs.existsSync(CONFIG_PATH);
}

function loadConfig() {
  try {
    const content = fs.readFileSync(CONFIG_PATH, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`Failed to load config: ${error.message}`);
  }
}

function validateConfig(config) {
  const errors = [];
  
  if (!config || typeof config !== 'object') {
    errors.push('Configuration must be an object');
    return errors;
  }

  if (!config.environments || typeof config.environments !== 'object') {
    errors.push('Configuration must have an "environments" object');
    return errors;
  }

  const validProviders = ['bedrock', 'openai', 'anthropic', 'ollama'];
  
  for (const [envName, envConfig] of Object.entries(config.environments)) {
    if (typeof envConfig !== 'object' || envConfig === null) {
      errors.push(`Environment "${envName}" configuration must be an object`);
      continue;
    }

    // Validate backend models
    if (envConfig.backend?.models) {
      const models = envConfig.backend.models;
      
      if (models.llmProvider && !validProviders.includes(models.llmProvider)) {
        errors.push(`llmProvider for "${envName}" must be one of: ${validProviders.join(', ')}`);
      }

      if (models.routingProvider && !validProviders.includes(models.routingProvider)) {
        errors.push(`routingProvider for "${envName}" must be one of: ${validProviders.join(', ')}`);
      }

      if (models.personaModel && typeof models.personaModel !== 'string') {
        errors.push(`personaModel for "${envName}" must be a string`);
      }

      if (models.routingModel && typeof models.routingModel !== 'string') {
        errors.push(`routingModel for "${envName}" must be a string`);
      }
    }

    // Validate frontend custom domain
    if (envConfig.frontend?.customDomain) {
      const domain = envConfig.frontend.customDomain;
      
      if (!domain.domainName || typeof domain.domainName !== 'string') {
        errors.push(`Custom domain for "${envName}" must have a valid "domainName" string`);
      }

      if (!domain.certificateArn || typeof domain.certificateArn !== 'string') {
        errors.push(`Custom domain for "${envName}" must have a valid "certificateArn" string`);
      }

      // Validate certificate ARN format
      const certArnRegex = /^arn:aws:acm:us-west-2:\d{12}:certificate\/[a-f0-9-]+$/;
      if (domain.certificateArn && !certArnRegex.test(domain.certificateArn)) {
        errors.push(`Certificate ARN for "${envName}" must be a valid ACM certificate ARN in us-west-2 region`);
      }
    }
  }

  return errors;
}

function showCurrentConfig() {
  console.log('📋 Group Chat AI Configuration Status\n');
  
  if (!configExists()) {
    console.log('❌ No configuration file found');
    console.log(`   Expected location: ${CONFIG_PATH}`);
    console.log('\n💡 Run "npm run config:init" to create a sample configuration file');
    return;
  }

  try {
    const config = loadConfig();
    const errors = validateConfig(config);
    
    if (errors.length > 0) {
      console.log('⚠️  Configuration file exists but has validation errors:');
      errors.forEach(error => console.log(`   - ${error}`));
      console.log('\n💡 Run "npm run config:validate" for detailed validation');
      return;
    }

    console.log('✅ Configuration file is valid');
    console.log(`   Location: ${CONFIG_PATH}`);
    
    // Show environment summary
    const environments = Object.keys(config.environments);
    console.log(`   Environments: ${environments.join(', ')}`);
    
    // Show model configurations
    console.log('\n🤖 Model Configurations:');
    for (const [env, envConfig] of Object.entries(config.environments)) {
      const models = envConfig.backend?.models;
      if (models) {
        console.log(`   ${env}:`);
        console.log(`     Persona Model: ${models.personaModel || 'default'}`);
        console.log(`     Routing Model: ${models.routingModel || 'default'}`);
        console.log(`     LLM Provider: ${models.llmProvider || 'default'}`);
        console.log(`     Routing Provider: ${models.routingProvider || 'default'}`);
      } else {
        console.log(`   ${env}: Using defaults`);
      }
    }

  } catch (error) {
    console.log('❌ Failed to load configuration file');
    console.log(`   Error: ${error.message}`);
  }
}

function initConfig() {
  if (configExists()) {
    console.log('⚠️  Configuration file already exists');
    console.log(`   Location: ${CONFIG_PATH}`);
    console.log('\n💡 Delete the existing file first if you want to recreate it');
    return;
  }

  try {
    const configDir = path.dirname(CONFIG_PATH);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    fs.writeFileSync(CONFIG_PATH, JSON.stringify(SAMPLE_CONFIG, null, 2));
    
    console.log('✅ Sample configuration file created successfully!');
    console.log(`   Location: ${CONFIG_PATH}`);
    console.log('\n📝 Next steps:');
    console.log('   1. Edit the configuration file to match your requirements');
    console.log('   2. Update domain names and certificate ARNs for custom domains');
    console.log('   3. Adjust model IDs and providers as needed');
    console.log('   4. Run "npm run config:validate" to verify your changes');
    console.log('   5. Deploy with "npm run deploy:dev" or other environment');
    
  } catch (error) {
    console.log('❌ Failed to create configuration file');
    console.log(`   Error: ${error.message}`);
  }
}

function validateConfigFile() {
  console.log('🔍 Validating Configuration File\n');
  
  if (!configExists()) {
    console.log('❌ No configuration file found');
    console.log(`   Expected location: ${CONFIG_PATH}`);
    console.log('\n💡 Run "npm run config:init" to create a sample configuration file');
    return;
  }

  try {
    const config = loadConfig();
    const errors = validateConfig(config);
    
    if (errors.length === 0) {
      console.log('✅ Configuration file is valid!');
      
      // Show detailed configuration
      console.log('\n📋 Configuration Details:');
      for (const [env, envConfig] of Object.entries(config.environments)) {
        console.log(`\n🌍 Environment: ${env}`);
        
        if (envConfig.backend?.models) {
          console.log('  🤖 Models:');
          const models = envConfig.backend.models;
          console.log(`     Persona Model: ${models.personaModel || 'anthropic.claude-sonnet-4-20250514-v1:0 (default)'}`);
          console.log(`     Routing Model: ${models.routingModel || 'openai.gpt-oss-20b-1:0 (default)'}`);
          console.log(`     LLM Provider: ${models.llmProvider || 'bedrock (default)'}`);
          console.log(`     Routing Provider: ${models.routingProvider || 'bedrock (default)'}`);
        } else {
          console.log('  🤖 Models: Using all defaults');
        }

        if (envConfig.frontend?.customDomain) {
          console.log('  🌐 Custom Domain:');
          console.log(`     Domain: ${envConfig.frontend.customDomain.domainName}`);
          console.log(`     Certificate: ${envConfig.frontend.customDomain.certificateArn}`);
        } else {
          console.log('  🌐 Custom Domain: Not configured');
        }
      }
      
    } else {
      console.log('❌ Configuration validation failed:');
      errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
      console.log('\n💡 Please fix these issues and run validation again');
    }
    
  } catch (error) {
    console.log('❌ Failed to validate configuration file');
    console.log(`   Error: ${error.message}`);
  }
}

function createReadlineInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
}

function askQuestion(rl, question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

async function interactiveConfig() {
  console.log('🔧 Interactive Configuration Setup\n');
  
  const rl = createReadlineInterface();
  let config = {};
  
  // Load existing config if it exists
  if (configExists()) {
    try {
      config = loadConfig();
      console.log('📋 Found existing configuration, you can update it\n');
    } catch (error) {
      console.log('⚠️  Found config file but failed to load it, creating new one\n');
      config = { environments: {} };
    }
  } else {
    console.log('📋 No existing configuration found, creating new one\n');
    config = { environments: {} };
  }

  // Select environment to configure
  console.log('Available environments: dev, staging, prod');
  const environment = await askQuestion(rl, 'Which environment do you want to configure? (dev): ');
  const env = environment || 'dev';
  
  if (!config.environments[env]) {
    config.environments[env] = {};
  }
  if (!config.environments[env].backend) {
    config.environments[env].backend = {};
  }
  if (!config.environments[env].backend.models) {
    config.environments[env].backend.models = {};
  }

  const models = config.environments[env].backend.models;
  
  console.log(`\n🤖 Configuring models for "${env}" environment\n`);
  
  // Configure Persona Model
  console.log('Persona Model (for AI persona responses):');
  console.log('  Examples:');
  console.log('    - anthropic.claude-sonnet-4-20250514-v1:0 (Bedrock Claude 4)');
  console.log('    - us.anthropic.claude-3-5-sonnet-20241022-v2:0 (Bedrock Claude 3.5)');
  console.log('    - gpt-4 (OpenAI)');
  console.log('    - claude-3-sonnet-20240229 (Anthropic Direct)');
  
  const currentPersonaModel = models.personaModel || 'anthropic.claude-sonnet-4-20250514-v1:0';
  const personaModel = await askQuestion(rl, `Enter persona model ID (${currentPersonaModel}): `);
  if (personaModel) {
    models.personaModel = personaModel;
  } else if (!models.personaModel) {
    models.personaModel = currentPersonaModel;
  }

  // Configure Routing Model
  console.log('\nRouting Model (for conversation routing decisions):');
  console.log('  Examples:');
  console.log('    - openai.gpt-oss-20b-1:0 (Bedrock OpenAI)');
  console.log('    - amazon.nova-pro-v1:0 (Bedrock Nova Pro)');
  console.log('    - us.anthropic.claude-3-5-haiku-20241022-v1:0 (Bedrock Claude Haiku)');
  console.log('    - gpt-3.5-turbo (OpenAI)');
  
  const currentRoutingModel = models.routingModel || 'openai.gpt-oss-20b-1:0';
  const routingModel = await askQuestion(rl, `Enter routing model ID (${currentRoutingModel}): `);
  if (routingModel) {
    models.routingModel = routingModel;
  } else if (!models.routingModel) {
    models.routingModel = currentRoutingModel;
  }

  // Configure LLM Provider
  console.log('\nLLM Provider (for persona model):');
  console.log('  Options: bedrock, openai, anthropic, ollama');
  
  const currentLlmProvider = models.llmProvider || 'bedrock';
  const llmProvider = await askQuestion(rl, `Enter LLM provider (${currentLlmProvider}): `);
  if (llmProvider && ['bedrock', 'openai', 'anthropic', 'ollama'].includes(llmProvider)) {
    models.llmProvider = llmProvider;
  } else if (!models.llmProvider) {
    models.llmProvider = currentLlmProvider;
  }

  // Configure Routing Provider
  console.log('\nRouting Provider (for routing model):');
  console.log('  Options: bedrock, openai, anthropic, ollama');
  
  const currentRoutingProvider = models.routingProvider || 'bedrock';
  const routingProvider = await askQuestion(rl, `Enter routing provider (${currentRoutingProvider}): `);
  if (routingProvider && ['bedrock', 'openai', 'anthropic', 'ollama'].includes(routingProvider)) {
    models.routingProvider = routingProvider;
  } else if (!models.routingProvider) {
    models.routingProvider = currentRoutingProvider;
  }

  // Ask about custom domain configuration
  console.log('\n🌐 Custom Domain Configuration (optional)');
  const configureCustomDomain = await askQuestion(rl, 'Do you want to configure a custom domain? (y/N): ');
  
  if (configureCustomDomain.toLowerCase() === 'y' || configureCustomDomain.toLowerCase() === 'yes') {
    if (!config.environments[env].frontend) {
      config.environments[env].frontend = {};
    }
    
    const domainName = await askQuestion(rl, 'Enter your domain name (e.g., dev.yourapp.com): ');
    const certificateArn = await askQuestion(rl, 'Enter your ACM certificate ARN: ');
    
    if (domainName && certificateArn) {
      config.environments[env].frontend.customDomain = {
        domainName: domainName,
        certificateArn: certificateArn
      };
    }
  }

  rl.close();

  // Save the configuration
  try {
    const configDir = path.dirname(CONFIG_PATH);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
    
    console.log('\n✅ Configuration saved successfully!');
    console.log(`   Location: ${CONFIG_PATH}`);
    
    // Show summary of what was configured
    console.log(`\n📋 Configuration Summary for "${env}":`);
    console.log(`   Persona Model: ${models.personaModel}`);
    console.log(`   Routing Model: ${models.routingModel}`);
    console.log(`   LLM Provider: ${models.llmProvider}`);
    console.log(`   Routing Provider: ${models.routingProvider}`);
    
    if (config.environments[env].frontend?.customDomain) {
      console.log(`   Custom Domain: ${config.environments[env].frontend.customDomain.domainName}`);
    }
    
    console.log('\n🚀 Next steps:');
    console.log('   1. Run "npm run config:validate" to verify your configuration');
    console.log(`   2. Deploy with "npm run deploy:${env}"`);
    
  } catch (error) {
    console.log('\n❌ Failed to save configuration');
    console.log(`   Error: ${error.message}`);
  }
}

// Main execution
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  showHelp();
} else if (args.includes('--init')) {
  initConfig();
} else if (args.includes('--validate')) {
  validateConfigFile();
} else if (args.includes('--status')) {
  showCurrentConfig();
} else {
  // Default to interactive configuration
  interactiveConfig().catch(error => {
    console.error('❌ Configuration failed:', error.message);
    process.exit(1);
  });
}