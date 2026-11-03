#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { AwsSolutionsChecks } from 'cdk-nag';
import { addNagSuppressions } from '../lib/nag-suppressions';
import { GroupChatAIStack } from '../lib/group-chat-ai-stack';
import { GroupChatAIFrontendStack } from '../lib/group-chat-ai-frontend-stack';
import { getConfigLoader } from './config-loader';

const app = new cdk.App();

// Get environment configuration
const account = process.env.CDK_DEFAULT_ACCOUNT;
const region = process.env.CDK_DEFAULT_REGION || 'us-west-2';

// Environment configurations
const envConfig = {
  account,
  region,
};

// cdk-nag v3 reports the CDK assets bucket with the concrete account and region
// when the stack environment is known, so acknowledge that exact finding too.
const cdkAssetsBucketFinding = account
  ? `Resource::arn:aws:s3:::cdk-hnb659fds-assets-${account}-${region}/*`
  : 'Resource::arn:aws:s3:::cdk-hnb659fds-assets-*-*/*';

// Determine which environment to deploy based on DEPLOY_ENV environment variable
const deployEnv = process.env.DEPLOY_ENV;
console.log('🎯 Deploy environment from DEPLOY_ENV:', deployEnv);

// Load configuration
const configLoader = getConfigLoader();
try {
  const config = configLoader.loadConfig();
  if (config) {
    console.log('✅ Configuration loaded successfully');
  } else {
    console.log('ℹ️  Using default configuration (no config.json found)');
  }
} catch (error) {
  console.error('❌ Configuration error:', error);
  process.exit(1);
}

// Helper function to check if we should create stacks for an environment
const shouldCreateEnvironment = (env: string): boolean => {
  // If no DEPLOY_ENV is set, create all environments (backwards compatibility)
  if (!deployEnv) {
    return true;
  }
  
  // Only create stacks for the specified environment
  const shouldCreate = env === deployEnv;
  return shouldCreate;
};

// Development environment
if (shouldCreateEnvironment('dev')) {
  console.log('🏗️  Creating development stacks...');
  const devBackendStack = new GroupChatAIStack(app, 'GroupChatAIDev', {
    env: envConfig,
    environment: 'dev',
    description: 'Group Chat AI - Multi-Persona AI Group Chats - Development',
  });

  const devFrontendStack = new GroupChatAIFrontendStack(app, 'GroupChatAIFrontendDev', {
    env: envConfig,
    environment: 'dev',
    albDnsName: devBackendStack.service.loadBalancer.loadBalancerDnsName,
    customDomainConfig: configLoader.getCustomDomainConfig('dev'),
    description: 'Group Chat AI Frontend - CloudFront and S3 deployment - Development',
  });

  // Add environment-specific tags
  cdk.Tags.of(devBackendStack).add('Environment', 'Development');
  cdk.Tags.of(devFrontendStack).add('Environment', 'Development');

  // Add CDK Nag suppressions for CDK-managed resources
  addNagSuppressions(devBackendStack, [
    {
      id: 'AwsSolutions-IAM4',
      reason: 'CDK-generated custom resource Lambdas use AWSLambdaBasicExecutionRole which is the AWS standard',
      appliesTo: ['Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole']
    }
  ]);

  addNagSuppressions(devFrontendStack, [
    {
      id: 'AwsSolutions-IAM4',
      reason: 'CDK-generated custom resource Lambdas use AWSLambdaBasicExecutionRole which is the AWS standard',
      appliesTo: ['Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole']
    },
    {
      id: 'AwsSolutions-IAM5',
      reason: 'CDK BucketDeployment requires S3 wildcard permissions for dynamic bucket operations during deployment',
      appliesTo: [
        'Action::s3:GetBucket*',
        'Action::s3:GetObject*',
        'Action::s3:List*',
        'Action::s3:Abort*',
        'Action::s3:DeleteObject*',
        'Action::s3:PutObject*',
        'Resource::*',
        'Resource::arn:aws:s3:::cdk-hnb659fds-assets-*-*/*',
        cdkAssetsBucketFinding,
        'Resource::<FrontendBucketEFE2E19C.Arn>/*'
      ]
    },
    {
      id: 'AwsSolutions-L1',
      reason: 'CDK-managed Lambda functions use runtime versions managed by AWS CDK'
    }
  ]);
}

// Staging environment
if (shouldCreateEnvironment('staging')) {
  console.log('🏗️  Creating staging stacks...');
  const stagingBackendStack = new GroupChatAIStack(app, 'GroupChatAIStaging', {
    env: envConfig,
    environment: 'staging',
    description: 'Group Chat AI - Multi-Persona AI Group Chats - Staging',
  });

  const stagingFrontendStack = new GroupChatAIFrontendStack(app, 'GroupChatAIFrontendStaging', {
    env: envConfig,
    environment: 'staging',
    albDnsName: stagingBackendStack.service.loadBalancer.loadBalancerDnsName,
    customDomainConfig: configLoader.getCustomDomainConfig('staging'),
    description: 'Group Chat AI Frontend - CloudFront and S3 deployment - Staging',
  });

  // Add environment-specific tags
  cdk.Tags.of(stagingBackendStack).add('Environment', 'Staging');
  cdk.Tags.of(stagingFrontendStack).add('Environment', 'Staging');

  // Add CDK Nag suppressions for staging environment
  addNagSuppressions(stagingBackendStack, [
    {
      id: 'AwsSolutions-IAM4',
      reason: 'CDK-generated custom resource Lambdas use AWSLambdaBasicExecutionRole which is the AWS standard',
      appliesTo: ['Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole']
    }
  ]);

  addNagSuppressions(stagingFrontendStack, [
    {
      id: 'AwsSolutions-IAM4',
      reason: 'CDK-generated custom resource Lambdas use AWSLambdaBasicExecutionRole which is the AWS standard',
      appliesTo: ['Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole']
    },
    {
      id: 'AwsSolutions-IAM5',
      reason: 'CDK BucketDeployment requires S3 wildcard permissions for dynamic bucket operations during deployment',
      appliesTo: [
        'Action::s3:GetBucket*',
        'Action::s3:GetObject*',
        'Action::s3:List*',
        'Action::s3:Abort*',
        'Action::s3:DeleteObject*',
        'Action::s3:PutObject*',
        'Resource::*',
        'Resource::arn:aws:s3:::cdk-hnb659fds-assets-*-*/*',
        cdkAssetsBucketFinding,
        'Resource::<FrontendBucketEFE2E19C.Arn>/*'
      ]
    },
    {
      id: 'AwsSolutions-L1',
      reason: 'CDK-managed Lambda functions use runtime versions managed by AWS CDK'
    }
  ]);
}

// Production environment
if (shouldCreateEnvironment('prod')) {
  console.log('🏗️  Creating production stacks...');
  const prodBackendStack = new GroupChatAIStack(app, 'GroupChatAIProd', {
    env: envConfig,
    environment: 'prod',
    description: 'Group Chat AI - Multi-Persona AI Group Chats - Production',
  });

  const prodFrontendStack = new GroupChatAIFrontendStack(app, 'GroupChatAIFrontendProd', {
    env: envConfig,
    environment: 'prod',
    albDnsName: prodBackendStack.service.loadBalancer.loadBalancerDnsName,
    customDomainConfig: configLoader.getCustomDomainConfig('prod'),
    description: 'Group Chat AI Frontend - CloudFront and S3 deployment - Production',
  });

  // Add environment-specific tags
  cdk.Tags.of(prodBackendStack).add('Environment', 'Production');
  cdk.Tags.of(prodFrontendStack).add('Environment', 'Production');

  // Add CDK Nag suppressions for production environment
  addNagSuppressions(prodBackendStack, [
    {
      id: 'AwsSolutions-IAM4',
      reason: 'CDK-generated custom resource Lambdas use AWSLambdaBasicExecutionRole which is the AWS standard',
      appliesTo: ['Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole']
    }
  ]);

  addNagSuppressions(prodFrontendStack, [
    {
      id: 'AwsSolutions-IAM4',
      reason: 'CDK-generated custom resource Lambdas use AWSLambdaBasicExecutionRole which is the AWS standard',
      appliesTo: ['Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole']
    },
    {
      id: 'AwsSolutions-IAM5',
      reason: 'CDK BucketDeployment requires S3 wildcard permissions for dynamic bucket operations during deployment',
      appliesTo: [
        'Action::s3:GetBucket*',
        'Action::s3:GetObject*',
        'Action::s3:List*',
        'Action::s3:Abort*',
        'Action::s3:DeleteObject*',
        'Action::s3:PutObject*',
        'Resource::*',
        'Resource::arn:aws:s3:::cdk-hnb659fds-assets-*-*/*',
        cdkAssetsBucketFinding,
        'Resource::<FrontendBucketEFE2E19C.Arn>/*'
      ]
    },
    {
      id: 'AwsSolutions-L1',
      reason: 'CDK-managed Lambda functions use runtime versions managed by AWS CDK'
    }
  ]);
}


// Apply CDK Nag checks for security and best practices
console.log('🔍 Applying CDK Nag security and best practices checks...');
cdk.Validations.of(app).addPlugins(new AwsSolutionsChecks(app, { verbose: true }));

