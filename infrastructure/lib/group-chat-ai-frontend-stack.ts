import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as cr from 'aws-cdk-lib/custom-resources';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';
import { CustomDomainConfig } from '../bin/config-loader';

export interface GroupChatAIFrontendStackProps extends cdk.StackProps {
  environment: string;
  albDnsName?: string;
  customDomainConfig?: CustomDomainConfig;
}

export class GroupChatAIFrontendStack extends cdk.Stack {
  public readonly bucket: s3.Bucket;
  public readonly distribution: cloudfront.Distribution;
  public readonly deployment: s3deploy.BucketDeployment;

  constructor(scope: Construct, id: string, props: GroupChatAIFrontendStackProps) {
    super(scope, id, props);

    console.log(`🔧 Starting frontend stack construction for ${props.environment}`);
    const { environment } = props;

    // Get ALB information from Parameter Store for CloudFront origin configuration
    const albDnsName = props.albDnsName ?? ssm.StringParameter.valueForStringParameter(
      this,
      `/group-chat-ai/${environment}/alb-dns`
    );


    // Create S3 bucket for frontend assets
    this.bucket = new s3.Bucket(this, 'FrontendBucket', {
      publicReadAccess: false, // CloudFront will handle access
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      versioned: true,
      enforceSSL: true, // Require HTTPS/TLS
      encryption: s3.BucketEncryption.S3_MANAGED,
      cors: [
        {
          allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.HEAD],
          allowedOrigins: ['*'],
          allowedHeaders: ['*'],
          maxAge: 3000,
        },
      ],
    });

    // Suppress CDK Nag for S3 access logs - frontend asset bucket doesn't need server access logs
    NagSuppressions.addResourceSuppressions(this.bucket, [
      {
        id: 'AwsSolutions-S1',
        reason: 'Frontend S3 bucket does not require server access logging - CloudFront provides access logs and this bucket only serves static assets'
      }
    ]);

    // Create Origin Access Identity for CloudFront to access S3
    const originAccessIdentity = new cloudfront.OriginAccessIdentity(this, 'OAI', {
      comment: `OAI for Group Chat AI Frontend ${environment}`,
    });


    const apiOrigin = new origins.HttpOrigin(albDnsName, {
      protocolPolicy: cloudfront.OriginProtocolPolicy.HTTP_ONLY,
      httpPort: 80,
      customHeaders: {
        'x-origin-verify': 'group-chat-ai-frontend',
      },
    });

    // Configure custom domain if provided
    let domainConfig: {
      domainNames?: string[];
      certificate?: acm.ICertificate;
    } = {};

    if (props.customDomainConfig) {
      console.log(`🌐 Configuring custom domain for ${environment}: ${props.customDomainConfig.domainName}`);
      
      // Import existing certificate from ACM
      const certificate = acm.Certificate.fromCertificateArn(
        this,
        'FrontendCertificate',
        props.customDomainConfig.certificateArn
      );

      domainConfig = {
        domainNames: [props.customDomainConfig.domainName],
        certificate: certificate,
      };
    }

    // Create CloudFront distribution
    this.distribution = new cloudfront.Distribution(this, 'FrontendDistribution', {
      comment: `Group Chat AI Frontend Distribution - ${environment}`,
      defaultRootObject: 'index.html',
      ...domainConfig, // Spread custom domain configuration
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.minutes(5),
        },
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.minutes(5),
        },
      ],
      priceClass: environment === 'prod'
        ? cloudfront.PriceClass.PRICE_CLASS_ALL
        : cloudfront.PriceClass.PRICE_CLASS_100,
      enabled: true,
      httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
      // webAclId can be added later if needed
      geoRestriction: cloudfront.GeoRestriction.allowlist('US', 'CA'), // Restrict to US and Canada for now
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessIdentity(this.bucket, {
          originAccessIdentity,
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        originRequestPolicy: cloudfront.OriginRequestPolicy.CORS_S3_ORIGIN,
        responseHeadersPolicy: cloudfront.ResponseHeadersPolicy.CORS_ALLOW_ALL_ORIGINS,
        compress: true,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
        cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD,
      },
      additionalBehaviors: {
        // Cache static assets (JS, CSS, images) for longer
        '/assets/*': {
          origin: origins.S3BucketOrigin.withOriginAccessIdentity(this.bucket, {
            originAccessIdentity,
          }),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
          originRequestPolicy: cloudfront.OriginRequestPolicy.CORS_S3_ORIGIN,
          responseHeadersPolicy: cloudfront.ResponseHeadersPolicy.CORS_ALLOW_ALL_ORIGINS,
          compress: true,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
          cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD,
        },
        // Proxy API and WebSocket requests directly to ALB
        '/api/*': {
          origin: apiOrigin,
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED, // API responses should not be cached
          originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD,
        },
        // Route WebSocket connections directly to ALB
        '/ws/*': {
          origin: apiOrigin,
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED, // WebSocket connections should not be cached
          originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD,
        },
      },
    });

    // Suppress CDK Nag findings for CloudFront configuration
    NagSuppressions.addResourceSuppressions(this.distribution, [
      {
        id: 'AwsSolutions-CFR1',
        reason: 'Geo restriction is enabled for US and Canada. WAF can be added in future iterations if additional security is required'
      },
      {
        id: 'AwsSolutions-CFR2',
        reason: 'AWS WAF is not required for this application at this time. Standard CloudFront security features are sufficient for current use case'
      },
      {
        id: 'AwsSolutions-CFR3',
        reason: 'Access logging is handled by ALB for API requests. CloudFront access logging can be enabled if detailed analysis is required'
      },
      {
        id: 'AwsSolutions-CFR4',
        reason: 'Default CloudFront viewer certificate is acceptable for non-production environments. Custom domain with ACM certificate is used for production'
      },
      {
        id: 'AwsSolutions-CFR5',
        reason: 'TLS 1.2 is enforced by default in CloudFront. Origin protocol policy is HTTP only for ALB communication which is acceptable within AWS network'
      },
      {
        id: 'AwsSolutions-CFR7',
        reason: 'Using Origin Access Identity (OAI) for S3 access which is the standard approach. Origin Access Control (OAC) can be migrated in future if needed'
      }
    ]);

    // Grant CloudFront OAI access to S3 bucket
    this.bucket.addToResourcePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      principals: [originAccessIdentity.grantPrincipal],
      actions: ['s3:GetObject'],
      resources: [this.bucket.arnForObjects('*')],
    }));

    // Deploy frontend build to S3
    this.deployment = new s3deploy.BucketDeployment(this, 'FrontendDeployment', {
      sources: [
        s3deploy.Source.asset('..', {
          bundling: {
            image: cdk.DockerImage.fromRegistry('node:20-alpine'),
            local: {
              tryBundle(outputDir: string, options: cdk.BundlingOptions): boolean {
                try {
                  console.log('Attempting local bundling...');

                  // Get the project root directory (parent of infrastructure)
                  const projectRoot = path.resolve(__dirname, '../../');
                  console.log(`Project root: ${projectRoot}`);

                  // Check if required directories exist
                  const frontendDir = path.join(projectRoot, 'frontend');
                  const sharedDir = path.join(projectRoot, 'shared');

                  if (!fs.existsSync(frontendDir) || !fs.existsSync(sharedDir)) {
                    console.log('Required directories not found, falling back to Docker');
                    return false;
                  }

                  // Set environment variables for the build
                  const buildEnv = {
                    ...process.env,
                    NODE_ENV: 'production',
                    VITE_API_BASE_URL: '/api',
                  };

                  // console.log('Installing dependencies...');
                  // execSync('npm run install:all', {
                  //   cwd: projectRoot,
                  //   stdio: 'inherit',
                  //   env: buildEnv,
                  // });
                  // // Install dependencies for all workspaces
                  //  execSync('npm install typescript', {
                  //   cwd: projectRoot,
                  //   stdio: 'inherit',
                  //   env: buildEnv,
                  // });

                  console.log('Building shared package...');
                  // Build shared package first
                  execSync('npm run build:shared', {
                    cwd: projectRoot,
                    stdio: 'inherit',
                    env: buildEnv,
                  });

                  console.log('Building frontend...');
                  // Build frontend
                  execSync('npm run build:frontend', {
                    cwd: projectRoot,
                    stdio: 'inherit',
                    env: buildEnv,
                  });

                  // Copy built files to output directory
                  const frontendDistDir = path.join(frontendDir, 'dist');
                  if (!fs.existsSync(frontendDistDir)) {
                    console.log('Frontend dist directory not found after build');
                    return false;
                  }

                  console.log(`Copying files from ${frontendDistDir} to ${outputDir}`);
                  // Copy all files from frontend/dist to output directory using spawn for safety
                  const { spawnSync } = require('child_process');
                  const result = spawnSync('cp', ['-r', `${frontendDistDir}/.`, outputDir], {
                    stdio: 'inherit',
                  });
                  
                  if (result.error || result.status !== 0) {
                    throw new Error(`Failed to copy files: ${result.error?.message || 'Unknown error'}`);
                  }

                  console.log('Local bundling completed successfully');
                  return true;
                } catch (error) {
                  console.log('Local bundling failed:', error);
                  console.log('Falling back to Docker bundling...');
                  return false;
                }
              },
            },
            // Docker fallback configuration with improved npm cache handling
            command: [
              'sh', '-c', [
                'export npm_config_cache=/tmp/.npm',
                'mkdir -p /tmp/.npm',
                'cd /asset-input',
                'npm ci --workspaces --include=dev --cache /tmp/.npm --prefer-offline --no-audit --no-fund',
                'npm run build:shared',
                'npm run build:frontend',
                'cp -r frontend/dist/* /asset-output/',
              ].join(' && '),
            ],
            environment: {
              NODE_ENV: 'production',
              VITE_API_BASE_URL: '/api',
            },
          },
        }),
      ],
      exclude: [
        "cdk.out",
        ".git"
      ],
      destinationBucket: this.bucket,
      distribution: this.distribution,
      distributionPaths: ['/*'],
      prune: true,
      retainOnDelete: environment === 'prod',
    });

    // Suppress CDK Nag findings for S3 deployment Lambda
    NagSuppressions.addResourceSuppressions(this.deployment.handlerRole, [
      {
        id: 'AwsSolutions-IAM4',
        reason: 'S3 deployment uses AWSLambdaBasicExecutionRole which is the standard AWS managed policy for Lambda execution',
        appliesTo: ['Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole']
      },
      {
        id: 'AwsSolutions-IAM5',
        reason: 'S3 deployment Lambda requires wildcard permissions for S3 operations as bucket contents are dynamic',
      },
      {
        id: 'AwsSolutions-L1',
        reason: 'S3 deployment Lambda runtime is managed by CDK and uses the latest available version'
      }
    ], true);

    // Create custom resource to generate and deploy config.json
    const configJsonLambda = new lambda.Function(this, 'ConfigJsonFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
        const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
        const { SSMClient, GetParameterCommand } = require('@aws-sdk/client-ssm');
        const { CloudFrontClient, GetDistributionCommand } = require('@aws-sdk/client-cloudfront');
        const response = require('cfn-response');
        
        exports.handler = async (event, context) => {
          console.log('=== ConfigJsonFunction START ===');
          console.log('Event:', JSON.stringify(event, null, 2));
          console.log('Context:', JSON.stringify(context, null, 2));
          
          // Log manual response URL for troubleshooting
          if (event.ResponseURL) {
            console.log('🚨 MANUAL RESPONSE URL (if needed):', event.ResponseURL);
            console.log('📝 MANUAL SUCCESS PAYLOAD:', JSON.stringify({
              Status: 'SUCCESS',
              Reason: 'Manual success response - config.json created',
              PhysicalResourceId: event.PhysicalResourceId || context.logStreamName,
              StackId: event.StackId,
              RequestId: event.RequestId,
              LogicalResourceId: event.LogicalResourceId,
              Data: { ConfigUrl: 'https://DISTRIBUTION_DOMAIN/config.json' }
            }, null, 2));
            console.log('📝 MANUAL FAILED PAYLOAD:', JSON.stringify({
              Status: 'FAILED',
              Reason: 'Manual failure response - check logs for details',
              PhysicalResourceId: event.PhysicalResourceId || context.logStreamName,
              StackId: event.StackId,
              RequestId: event.RequestId,
              LogicalResourceId: event.LogicalResourceId,
              Data: {}
            }, null, 2));
            console.log('💡 To manually resolve: curl -X PUT -H "Content-Type:" -d "PAYLOAD_JSON" "RESPONSE_URL"');
          }
          
          try {
            const { RequestType, ResourceProperties } = event;
            const { BucketName, Environment, DistributionId } = ResourceProperties;
            
            console.log('🔧 Processing request:', RequestType, 'for environment:', Environment);
            
            if (RequestType === 'Delete') {
              await response.send(event, context, response.SUCCESS);
              return;
            }
            
            const s3 = new S3Client({});
            const ssm = new SSMClient({});
            const cloudfront = new CloudFrontClient({});
            
            // Get Cognito configuration from Parameter Store
            const [userPoolId, userPoolClientId, userPoolDomain, issuer] = await Promise.all([
              ssm.send(new GetParameterCommand({ Name: \`/group-chat-ai/\${Environment}/cognito-user-pool-id\` })),
              ssm.send(new GetParameterCommand({ Name: \`/group-chat-ai/\${Environment}/cognito-user-pool-client-id\` })),
              ssm.send(new GetParameterCommand({ Name: \`/group-chat-ai/\${Environment}/cognito-user-pool-domain\` })),
              ssm.send(new GetParameterCommand({ Name: \`/group-chat-ai/\${Environment}/cognito-issuer\` })),
            ]);
            
            // Get CloudFront distribution domain
            const distribution = await cloudfront.send(new GetDistributionCommand({ Id: DistributionId }));
            const distributionDomain = distribution.Distribution.DomainName;
            
            // Generate config.json content
            const config = {
              auth: {
                authority: issuer.Parameter.Value,
                client_id: userPoolClientId.Parameter.Value,
                redirect_uri: \`https://\${distributionDomain}/callback\`,
                post_logout_redirect_uri: \`https://\${distributionDomain}/\`,
                response_type: 'code',
                scope: 'openid email profile',
                automaticSilentRenew: true,
                loadUserInfo: true
              },
              api: {
                baseUrl: '/api'
              },
              environment: Environment
            };
            
            // Upload config.json to S3
            await s3.send(new PutObjectCommand({
              Bucket: BucketName,
              Key: 'config.json',
              Body: JSON.stringify(config, null, 2),
              ContentType: 'application/json',
              CacheControl: 'no-cache'
            }));
            
            console.log('✅ Config.json uploaded successfully to:', \`https://\${distributionDomain}/config.json\`);
            await response.send(event, context, response.SUCCESS, { ConfigUrl: \`https://\${distributionDomain}/config.json\` });
            console.log('=== ConfigJsonFunction SUCCESS ===');
            
          } catch (error) {
            console.error('❌ ConfigJsonFunction ERROR:', error);
            console.error('Error details:', JSON.stringify(error, null, 2));
            console.log('🚨 Use the MANUAL RESPONSE URL above to resolve this deployment!');
            await response.send(event, context, response.FAILED, { Error: error.message });
          }
        };
      `),
      timeout: cdk.Duration.minutes(5),
    });

    // Grant permissions to the Lambda function
    configJsonLambda.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        's3:PutObject',
        's3:PutObjectAcl',
      ],
      resources: [this.bucket.arnForObjects('*')],
    }));

    configJsonLambda.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'ssm:GetParameter',
      ],
      resources: [
        `arn:aws:ssm:${this.region}:${this.account}:parameter/group-chat-ai/${environment}/*`,
      ],
    }));

    configJsonLambda.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'cloudfront:GetDistribution',
      ],
      resources: ['*'],
    }));

    // Suppress CDK Nag findings for legitimate wildcard usage in configJsonLambda
    NagSuppressions.addResourceSuppressions(configJsonLambda, [
      {
        id: 'AwsSolutions-IAM5',
        reason: 'CloudFront GetDistribution requires wildcard resource as distributions are accessed by ID which is dynamic',
        appliesTo: ['Resource::*']
      },
      {
        id: 'AwsSolutions-IAM5',
        reason: 'S3 PutObject requires wildcard for bucket objects as file names are dynamic',
        appliesTo: ['Resource::<FrontendBucketEFE2E19C.Arn>/*']
      },
      {
        id: 'AwsSolutions-IAM5',
        reason: 'SSM GetParameter uses path-based wildcard which is scoped to environment-specific parameters',
        appliesTo: [`Resource::arn:aws:ssm:${this.region}:${this.account}:parameter/group-chat-ai/${environment}/*`]
      },
      {
        id: 'AwsSolutions-IAM4',
        reason: 'AWSLambdaBasicExecutionRole is the standard AWS managed policy for Lambda execution and provides minimal required permissions for CloudWatch Logs',
        appliesTo: ['Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole']
      },
      {
        id: 'AwsSolutions-L1',
        reason: 'Lambda function uses NODEJS_20_X which is the latest available runtime version'
      }
    ], true);

    // Create custom resource
    const configJsonResource = new cdk.CustomResource(this, 'ConfigJsonResource', {
      serviceToken: configJsonLambda.functionArn,
      properties: {
        BucketName: this.bucket.bucketName,
        Environment: environment,
        DistributionId: this.distribution.distributionId,
        // Force update when these change
        Timestamp: Date.now(),
      },
    });

    // Ensure the custom resource runs after the deployment
    configJsonResource.node.addDependency(this.deployment);

    // Create custom resource to update Cognito User Pool Client with CloudFront URLs
    const updateCognitoLambda = new lambda.Function(this, 'UpdateCognitoFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
        const { SSMClient, GetParameterCommand } = require('@aws-sdk/client-ssm');
        const { CognitoIdentityProviderClient, UpdateUserPoolClientCommand, DescribeUserPoolClientCommand } = require('@aws-sdk/client-cognito-identity-provider');
        const response = require('cfn-response');
        
        exports.handler = async (event, context) => {
          console.log('=== UpdateCognitoFunction START ===');
          console.log('Event:', JSON.stringify(event, null, 2));
          console.log('Context:', JSON.stringify(context, null, 2));
          
          // Log manual response URL for troubleshooting
          if (event.ResponseURL) {
            console.log('🚨 MANUAL RESPONSE URL (if needed):', event.ResponseURL);
            console.log('📝 MANUAL SUCCESS PAYLOAD:', JSON.stringify({
              Status: 'SUCCESS',
              Reason: 'Manual success response - Cognito URLs updated',
              PhysicalResourceId: event.PhysicalResourceId || context.logStreamName,
              StackId: event.StackId,
              RequestId: event.RequestId,
              LogicalResourceId: event.LogicalResourceId,
              Data: {}
            }, null, 2));
            console.log('📝 MANUAL FAILED PAYLOAD:', JSON.stringify({
              Status: 'FAILED',
              Reason: 'Manual failure response - check logs for details',
              PhysicalResourceId: event.PhysicalResourceId || context.logStreamName,
              StackId: event.StackId,
              RequestId: event.RequestId,
              LogicalResourceId: event.LogicalResourceId,
              Data: {}
            }, null, 2));
            console.log('💡 To manually resolve: curl -X PUT -H "Content-Type:" -d "PAYLOAD_JSON" "RESPONSE_URL"');
          }
          
          try {
            const { RequestType, ResourceProperties } = event;
            const { Environment, DistributionDomain } = ResourceProperties;
            
            console.log('🔧 Processing request:', RequestType, 'for environment:', Environment, 'domain:', DistributionDomain);
            
            if (RequestType === 'Delete') {
              await response.send(event, context, response.SUCCESS);
              return;
            }
            
            const ssm = new SSMClient({});
            const cognito = new CognitoIdentityProviderClient({});
            
            // Get Cognito configuration from Parameter Store
            const [userPoolId, userPoolClientId] = await Promise.all([
              ssm.send(new GetParameterCommand({ Name: \`/group-chat-ai/\${Environment}/cognito-user-pool-id\` })),
              ssm.send(new GetParameterCommand({ Name: \`/group-chat-ai/\${Environment}/cognito-user-pool-client-id\` })),
            ]);
            
            // Get current User Pool Client configuration
            const currentClient = await cognito.send(new DescribeUserPoolClientCommand({
              UserPoolId: userPoolId.Parameter.Value,
              ClientId: userPoolClientId.Parameter.Value,
            }));
            
            const currentCallbackURLs = currentClient.UserPoolClient.CallbackURLs || [];
            const currentLogoutURLs = currentClient.UserPoolClient.LogoutURLs || [];
            
            // Create new URLs to add
            // nosemgrep: missing-template-string-indicator
            const newCallbackUrl = \`https://\${DistributionDomain}/callback\`;
            // nosemgrep: missing-template-string-indicator
            const newLogoutUrl = \`https://\${DistributionDomain}/\`;
            
            // Append CloudFront URLs if they don't already exist
            const updatedCallbackURLs = currentCallbackURLs.includes(newCallbackUrl) 
              ? currentCallbackURLs 
              : [...currentCallbackURLs, newCallbackUrl];
              
            const updatedLogoutURLs = currentLogoutURLs.includes(newLogoutUrl)
              ? currentLogoutURLs
              : [...currentLogoutURLs, newLogoutUrl];
            
            console.log('Current callback URLs:', currentCallbackURLs);
            console.log('Updated callback URLs:', updatedCallbackURLs);
            console.log('Current logout URLs:', currentLogoutURLs);
            console.log('Updated logout URLs:', updatedLogoutURLs);
            
            // Update User Pool Client with appended URLs
            await cognito.send(new UpdateUserPoolClientCommand({
              UserPoolId: userPoolId.Parameter.Value,
              ClientId: userPoolClientId.Parameter.Value,
              CallbackURLs: updatedCallbackURLs,
              LogoutURLs: updatedLogoutURLs,
              // Preserve other existing settings
              ClientName: currentClient.UserPoolClient.ClientName,
              GenerateSecret: currentClient.UserPoolClient.GenerateSecret,
              RefreshTokenValidity: currentClient.UserPoolClient.RefreshTokenValidity,
              AccessTokenValidity: currentClient.UserPoolClient.AccessTokenValidity,
              IdTokenValidity: currentClient.UserPoolClient.IdTokenValidity,
              ExplicitAuthFlows: currentClient.UserPoolClient.ExplicitAuthFlows,
              SupportedIdentityProviders: currentClient.UserPoolClient.SupportedIdentityProviders,
              AllowedOAuthFlows: currentClient.UserPoolClient.AllowedOAuthFlows,
              AllowedOAuthScopes: currentClient.UserPoolClient.AllowedOAuthScopes,
              AllowedOAuthFlowsUserPoolClient: currentClient.UserPoolClient.AllowedOAuthFlowsUserPoolClient,
            }));
            
            console.log('✅ Cognito User Pool Client updated successfully');
            console.log('📋 Final callback URLs:', updatedCallbackURLs);
            console.log('📋 Final logout URLs:', updatedLogoutURLs);
            await response.send(event, context, response.SUCCESS);
            console.log('=== UpdateCognitoFunction SUCCESS ===');
            
          } catch (error) {
            console.error('❌ UpdateCognitoFunction ERROR:', error);
            console.error('Error details:', JSON.stringify(error, null, 2));
            console.log('🚨 Use the MANUAL RESPONSE URL above to resolve this deployment!');
            await response.send(event, context, response.FAILED, { Error: error.message });
          }
        };
      `),
      timeout: cdk.Duration.minutes(5),
    });

    // Grant permissions to the Lambda function
    updateCognitoLambda.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'ssm:GetParameter',
      ],
      resources: [
        `arn:aws:ssm:${this.region}:${this.account}:parameter/group-chat-ai/${environment}/*`,
      ],
    }));

    updateCognitoLambda.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'cognito-idp:UpdateUserPoolClient',
        'cognito-idp:DescribeUserPoolClient',
      ],
      resources: ['*'],
    }));

    // Suppress CDK Nag findings for legitimate wildcard usage in updateCognitoLambda
    NagSuppressions.addResourceSuppressions(updateCognitoLambda, [
      {
        id: 'AwsSolutions-IAM5',
        reason: 'Cognito UpdateUserPoolClient and DescribeUserPoolClient require wildcard resource as User Pool IDs are dynamic',
        appliesTo: ['Resource::*']
      },
      {
        id: 'AwsSolutions-IAM5',
        reason: 'SSM GetParameter uses path-based wildcard which is more restrictive than full wildcard - scoped to environment-specific parameters',
        appliesTo: [`Resource::arn:aws:ssm:${this.region}:${this.account}:parameter/group-chat-ai/${environment}/*`]
      },
      {
        id: 'AwsSolutions-IAM4',
        reason: 'AWSLambdaBasicExecutionRole is the standard AWS managed policy for Lambda execution and provides minimal required permissions for CloudWatch Logs',
        appliesTo: ['Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole']
      },
      {
        id: 'AwsSolutions-L1',
        reason: 'Lambda function uses NODEJS_20_X which is the latest available runtime version'
      }
    ], true);


    // Create custom resource
    const updateCognitoResource = new cdk.CustomResource(this, 'UpdateCognitoResource', {
      serviceToken: updateCognitoLambda.functionArn,
      properties: {
        Environment: environment,
        DistributionDomain: this.distribution.distributionDomainName,
        // Force update when distribution changes
        Timestamp: Date.now(),
      },
    });

    // Ensure the custom resource runs after the distribution is created
    updateCognitoResource.node.addDependency(this.distribution);

    // Create CloudWatch alarms for monitoring
    const errorRateAlarm = new cloudwatch.Alarm(this, 'HighErrorRateAlarm', {
      alarmName: `group-chat-ai-frontend-high-error-rate-${environment}`,
      alarmDescription: 'High error rate on CloudFront distribution',
      metric: new cloudwatch.Metric({
        namespace: 'AWS/CloudFront',
        metricName: '4xxErrorRate',
        dimensionsMap: {
          DistributionId: this.distribution.distributionId,
        },
        statistic: 'Average',
        period: cdk.Duration.minutes(5),
      }),
      threshold: 5, // 5% error rate
      evaluationPeriods: 2,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    const cacheHitRateAlarm = new cloudwatch.Alarm(this, 'LowCacheHitRateAlarm', {
      alarmName: `group-chat-ai-frontend-low-cache-hit-rate-${environment}`,
      alarmDescription: 'Low cache hit rate on CloudFront distribution',
      metric: new cloudwatch.Metric({
        namespace: 'AWS/CloudFront',
        metricName: 'CacheHitRate',
        dimensionsMap: {
          DistributionId: this.distribution.distributionId,
        },
        statistic: 'Average',
        period: cdk.Duration.minutes(15),
      }),
      threshold: 80, // 80% cache hit rate
      evaluationPeriods: 3,
      comparisonOperator: cloudwatch.ComparisonOperator.LESS_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    // Output important values
    new cdk.CfnOutput(this, 'BucketName', {
      value: this.bucket.bucketName,
      description: 'S3 bucket name for frontend assets',
      exportName: `GroupChatAI-Frontend-Bucket-${environment}`,
    });

    new cdk.CfnOutput(this, 'DistributionId', {
      value: this.distribution.distributionId,
      description: 'CloudFront distribution ID',
      exportName: `GroupChatAI-Frontend-DistributionId-${environment}`,
    });

    new cdk.CfnOutput(this, 'DistributionDomainName', {
      value: this.distribution.distributionDomainName,
      description: 'CloudFront distribution domain name',
      exportName: `GroupChatAI-Frontend-Domain-${environment}`,
    });

    new cdk.CfnOutput(this, 'WebsiteUrl', {
      value: `https://${this.distribution.distributionDomainName}`,
      description: 'Frontend website URL (CloudFront)',
      exportName: `GroupChatAI-Frontend-URL-${environment}`,
    });

    // Conditional outputs for custom domain
    if (props.customDomainConfig) {
      new cdk.CfnOutput(this, 'CustomDomainName', {
        value: props.customDomainConfig.domainName,
        description: 'Custom domain name configured for the frontend',
        exportName: `GroupChatAI-Frontend-CustomDomain-${environment}`,
      });

      new cdk.CfnOutput(this, 'CustomDomainUrl', {
        value: `https://${props.customDomainConfig.domainName}`,
        description: 'Frontend website URL (Custom Domain)',
        exportName: `GroupChatAI-Frontend-CustomURL-${environment}`,
      });

      new cdk.CfnOutput(this, 'CertificateArn', {
        value: props.customDomainConfig.certificateArn,
        description: 'ACM Certificate ARN used for custom domain',
        exportName: `GroupChatAI-Frontend-CertArn-${environment}`,
      });

      // DNS setup guidance
      new cdk.CfnOutput(this, 'DnsSetupInstructions', {
        value: `Configure DNS: ${props.customDomainConfig.domainName} CNAME ${this.distribution.distributionDomainName}`,
        description: 'DNS configuration instructions for custom domain',
      });
    }

    // Add tags
    cdk.Tags.of(this).add('Component', 'Frontend');
    cdk.Tags.of(this).add('Service', 'CloudFront-S3');
    
    // Add custom domain tag if configured
    if (props.customDomainConfig) {
      cdk.Tags.of(this).add('CustomDomain', props.customDomainConfig.domainName);
    }
  }
}
