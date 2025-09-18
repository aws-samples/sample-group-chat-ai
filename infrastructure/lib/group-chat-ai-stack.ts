import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecsPatterns from 'aws-cdk-lib/aws-ecs-patterns';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as cr from 'aws-cdk-lib/custom-resources';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';
import { getConfigLoader } from '../bin/config-loader';

export interface GroupChatAIStackProps extends cdk.StackProps {
  environment: string;
  frontendDomain?: string;
}

export class GroupChatAIStack extends cdk.Stack {
  public readonly vpc: ec2.Vpc;
  public readonly cluster: ecs.Cluster;
  public readonly service: ecsPatterns.ApplicationLoadBalancedFargateService;
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;
  public readonly userPoolDomain: cognito.UserPoolDomain;
  public readonly userSessionsTable: dynamodb.Table;

  constructor(scope: Construct, id: string, props: GroupChatAIStackProps) {
    super(scope, id, props);

    const { environment, frontendDomain } = props;

    // Create DynamoDB table for user sessions
    this.userSessionsTable = new dynamodb.Table(this, 'UserSessionsTable', {
      partitionKey: {
        name: 'userId',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'sessionId',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      pointInTimeRecoverySpecification: {
        pointInTimeRecoveryEnabled: true,
        recoveryPeriodInDays: 30,
      },
      removalPolicy: environment === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      timeToLiveAttribute: 'ttl',
    });

    // Add GSI for querying sessions by status
    this.userSessionsTable.addGlobalSecondaryIndex({
      indexName: 'UserIdStatusIndex',
      partitionKey: {
        name: 'userId',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'status',
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // Add GSI for querying by lastActivity for cleanup
    this.userSessionsTable.addGlobalSecondaryIndex({
      indexName: 'LastActivityIndex',
      partitionKey: {
        name: 'userId',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'lastActivity',
        type: dynamodb.AttributeType.NUMBER,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // Create Cognito User Pool
    this.userPool = new cognito.UserPool(this, 'GroupChatAIUserPool', {
      userPoolName: `group-chat-ai-${environment}`,
      selfSignUpEnabled: true,
      signInAliases: {
        email: true,
      },
      autoVerify: {
        email: true,
      },
      standardAttributes: {
        email: {
          required: true,
          mutable: true,
        },
        givenName: {
          required: true,
          mutable: true,
        },
        familyName: {
          required: true,
          mutable: true,
        },
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: environment === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    // Suppress CDK Nag findings for Cognito as requested
    NagSuppressions.addResourceSuppressions(this.userPool, [
      {
        id: 'AwsSolutions-COG2',
        reason: 'MFA requirement suppressed per business requirements - application handles authentication flow without mandatory MFA'
      },
      {
        id: 'AwsSolutions-COG3',
        reason: 'Advanced Security Mode enforcement suppressed per business requirements - basic security sufficient for current use case'
      }
    ]);

    // Create User Pool Client
    this.userPoolClient = new cognito.UserPoolClient(this, 'GroupChatAIUserPoolClient', {
      userPool: this.userPool,
      userPoolClientName: `group-chat-ai-client-${environment}`,
      generateSecret: false, // For frontend applications
      authFlows: {
        userSrp: true,
        userPassword: false,
        adminUserPassword: false,
      },
      oAuth: {
        flows: {
          authorizationCodeGrant: true,
        },
        scopes: [
          cognito.OAuthScope.EMAIL,
          cognito.OAuthScope.OPENID,
          cognito.OAuthScope.PROFILE,
        ],
        callbackUrls: [
          'http://localhost:5173/callback', // For local development
          'https://localhost:5173/callback', // For local development with HTTPS
          ...(frontendDomain ? [`https://${frontendDomain}/callback`] : []),
        ],
        logoutUrls: [
          'http://localhost:5173/', // For local development
          'https://localhost:5173/', // For local development with HTTPS
          ...(frontendDomain ? [`https://${frontendDomain}/`] : []),
        ],
      },
      supportedIdentityProviders: [
        cognito.UserPoolClientIdentityProvider.COGNITO,
      ],
      refreshTokenValidity: cdk.Duration.days(30),
      accessTokenValidity: cdk.Duration.hours(1),
      idTokenValidity: cdk.Duration.hours(1),
    });

    // Create User Pool Domain with custom prefix
    this.userPoolDomain = new cognito.UserPoolDomain(this, 'GroupChatAIUserPoolDomain', {
      userPool: this.userPool,
      cognitoDomain: {
        domainPrefix: `group-chat-ai-${environment}`,
      },
    });

    // Create CloudWatch Log Group for ECS application logs
    const ecsLogGroup = new logs.LogGroup(this, 'GroupChatAIECSLogGroup', {
      logGroupName: `/aws/ecs/group-chat-ai-backend-${environment}`,
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Create separate CloudWatch Log Group for VPC Flow Logs
    const vpcFlowLogGroup = new logs.LogGroup(this, 'GroupChatAIVpcFlowLogGroup', {
      logGroupName: `/aws/vpc/flowlogs/group-chat-ai-vpc-${environment}`,
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Create VPC with public and private subnets
    this.vpc = new ec2.Vpc(this, 'GroupChatAIVpc', {
      maxAzs: 2,
      natGateways: 1,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
      ],
      flowLogs: {
        'GroupChatAIVpcFlowLog': {
          destination: ec2.FlowLogDestination.toCloudWatchLogs(vpcFlowLogGroup),
          trafficType: ec2.FlowLogTrafficType.ALL,
        },
      },
    });

    // Create ECS Cluster
    this.cluster = new ecs.Cluster(this, 'GroupChatAICluster', {
      vpc: this.vpc,
      clusterName: `group-chat-ai-${environment}`,
      containerInsightsV2: ecs.ContainerInsights.ENABLED,
    });

    // Create task role with necessary permissions
    const taskRole = new iam.Role(this, 'GroupChatAITaskRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      description: 'Task role for Group Chat AI ECS service',
    });

    // Add permissions for CloudWatch Logs
    taskRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'logs:CreateLogStream',
        'logs:PutLogEvents',
      ],
      resources: [ecsLogGroup.logGroupArn],
    }));

    // Add permissions to read Parameter Store parameters
    taskRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'ssm:GetParameter',
        'ssm:GetParameters',
      ],
      resources: [
        `arn:aws:ssm:${this.region}:${this.account}:parameter/group-chat-ai/${environment}/persona-model`,
        `arn:aws:ssm:${this.region}:${this.account}:parameter/group-chat-ai/${environment}/routing-model`,
        `arn:aws:ssm:${this.region}:${this.account}:parameter/group-chat-ai/${environment}/llm-provider`,
        `arn:aws:ssm:${this.region}:${this.account}:parameter/group-chat-ai/${environment}/routing-provider`,
      ],
    }));

    // Add permissions for Amazon Bedrock Claude 4 (specific models only)
    const bedrockPolicyStatement = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'bedrock:InvokeModel',
        'bedrock:InvokeModelWithResponseStream',
      ],
      resources: [
        `*`,
      ],
    });
    taskRole.addToPolicy(bedrockPolicyStatement);

    // Add permissions for Amazon Polly Text-to-Speech (with specific voices)
    const pollyPolicyStatement = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'polly:SynthesizeSpeech',
      ],
      resources: ['*'], // Polly SynthesizeSpeech is not resource-specific but we limit actions
    });
    taskRole.addToPolicy(pollyPolicyStatement);

    // Add permissions for DynamoDB user sessions table
    const dynamodbPolicyStatement = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'dynamodb:GetItem',
        'dynamodb:PutItem',
        'dynamodb:UpdateItem',
        'dynamodb:DeleteItem',
        'dynamodb:Query',
        'dynamodb:Scan',
        'dynamodb:BatchGetItem',
        'dynamodb:BatchWriteItem',
      ],
      resources: [
        this.userSessionsTable.tableArn,
        `${this.userSessionsTable.tableArn}/index/*`,
      ],
    });
    taskRole.addToPolicy(dynamodbPolicyStatement);

    // Suppress CDK Nag for legitimate Polly and Bedrock wildcard usage
    NagSuppressions.addResourceSuppressions(taskRole, [
      {
        id: 'AwsSolutions-IAM5',
        reason: 'Polly SynthesizeSpeech requires wildcard resource as it is not resource-specific by AWS design',
        appliesTo: ['Resource::*'],
      },
      {
        id: 'AwsSolutions-IAM5',
        reason: 'Bedrock foundation models require wildcard access as specific model ARNs are not predictable and AWS Bedrock service design requires wildcard for foundation-model access',
        appliesTo: [`Resource::arn:aws:bedrock:*`],
      },
      {
        id: 'AwsSolutions-IAM5',
        reason: 'Bedrock inference profiles require wildcard access as profile ARNs are dynamically generated and AWS Bedrock service design requires wildcard for inference-profile access',
        appliesTo: [`Resource::arn:aws:bedrock:${this.region}:${this.account}:inference-profile/*`],
      },
      {
        id: 'AwsSolutions-IAM5',
        reason: 'Full access to user session table and index',
        appliesTo: ['Resource::<UserSessionsTable6F92E803.Arn>/index/*', 'Resource::<UserSessionsTable6F92E803.Arn>']
      }
    ], true);



    // Get model configuration from config.json or use defaults
    const configLoader = getConfigLoader();
    const modelConfig = configLoader.getModelConfig(environment);

    if(!modelConfig.llmProvider){
      console.log('llmProvider not set')
    }
    if(!modelConfig.personaModel){
      console.log('personaModel not set')
    }
    if(!modelConfig.routingModel){
      console.log('routingModel not set')
    }
    if(!modelConfig.routingProvider){
      console.log('routingProvider not set')
    }


    new ssm.StringParameter(this, 'LlmProviderParameter', {
      parameterName: `/group-chat-ai/${environment}/llm-provider`,
      stringValue: modelConfig.llmProvider || 'bedrock',
      description: `LLM Provider configuration for Group Chat AI ${environment} environment`,
      tier: ssm.ParameterTier.STANDARD,
    });

    new ssm.StringParameter(this, 'PersonaModelParameter', {
      parameterName: `/group-chat-ai/${environment}/persona-model`,
      stringValue: modelConfig.personaModel || 'openai.gpt-oss-200b-1:0',
      description: `Persona Model configuration for Group Chat AI ${environment} environment`,
      tier: ssm.ParameterTier.STANDARD,
    });

    new ssm.StringParameter(this, 'RoutingModelParameter', {
      parameterName: `/group-chat-ai/${environment}/routing-model`,
      stringValue: modelConfig.routingModel || 'us.anthropic.claude-sonnet-4-20250514-v1:0',
      description: `Routing Model configuration for Group Chat AI ${environment} environment`,
      tier: ssm.ParameterTier.STANDARD,
    });


    new ssm.StringParameter(this, 'RoutingProviderParameter', {
      parameterName: `/group-chat-ai/${environment}/routing-provider`,
      stringValue: modelConfig.routingProvider || 'bedrock',
      description: `Routing Provider configuration for Group Chat AI ${environment} environment`,
      tier: ssm.ParameterTier.STANDARD,
    });

    // Create S3 bucket for ALB access logs
    const albLogsBucket = new s3.Bucket(this, 'AlbAccessLogsBucket', {
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      versioned: true,
      lifecycleRules: [
        {
          id: 'DeleteOldLogs',
          enabled: true,
          expiration: cdk.Duration.days(90),
        },
      ],
      removalPolicy: environment === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    // Suppress CDK Nag for S3 access logs - ALB log bucket doesn't need its own access logs
    NagSuppressions.addResourceSuppressions(albLogsBucket, [
      {
        id: 'AwsSolutions-S1',
        reason: 'ALB access logs bucket does not require additional server access logging - this is the logging destination itself'
      }
    ]);

    // Dynamically lookup CloudFront managed prefix list for current region
    const cloudFrontPrefixListLookup = new cr.AwsCustomResource(this, 'CloudFrontPrefixListLookup', {
      onUpdate: {
        service: 'EC2',
        action: 'describeManagedPrefixLists',
        parameters: {
          Filters: [
            {
              Name: 'prefix-list-name',
              Values: ['com.amazonaws.global.cloudfront.origin-facing']
            }
          ]
        },
        region: this.region,
        physicalResourceId: cr.PhysicalResourceId.of('cloudfront-prefix-list-lookup')
      },
      policy: cr.AwsCustomResourcePolicy.fromSdkCalls({
        resources: cr.AwsCustomResourcePolicy.ANY_RESOURCE
      })
    });

    // Suppress CDK Nag for CloudFront prefix list lookup - requires wildcard for EC2 describe operations
    NagSuppressions.addResourceSuppressions(cloudFrontPrefixListLookup, [
      {
        id: 'AwsSolutions-IAM5',
        reason: 'EC2 DescribeManagedPrefixLists requires wildcard resource as prefix list IDs are dynamic and cannot be known at deployment time',
        appliesTo: ['Resource::*']
      },
      {
        id: 'AwsSolutions-IAM4',
        reason: 'Custom resource Lambda uses AWSLambdaBasicExecutionRole which is the standard AWS managed policy for Lambda execution',
        appliesTo: ['Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole']
      }
    ], true);

    // Get the CloudFront prefix list ID from the lookup result
    const cloudFrontPrefixListId = cloudFrontPrefixListLookup.getResponseField('PrefixLists.0.PrefixListId');

    // Create Fargate service with Application Load Balancer
    this.service = new ecsPatterns.ApplicationLoadBalancedFargateService(this, 'GroupChatAIService', {
      cluster: this.cluster,
      serviceName: `group-chat-ai-${environment}`,
      cpu: 1024,
      memoryLimitMiB: 2048,
      desiredCount: 1,
      minHealthyPercent: 50,
      taskImageOptions: {
        image: ecs.ContainerImage.fromAsset('..', {
          file: 'backend/Dockerfile',
          exclude: [
            'cdk.out',
            'node_modules',
            'frontend',
            'backend/.env',
            'infrastructure/cdk.out/',
          ],
        }),
        containerPort: 3000,
        environment: {
          NODE_ENV: environment,
          PORT: '3000',
          LLM_TEMPERATURE: '0.7',
          LLM_MAX_TOKENS: '500',
          LLM_TIMEOUT: '10000',
          AWS_REGION: this.region,
          USER_SESSIONS_TABLE: this.userSessionsTable.tableName,
          // Parameter Store parameter names for runtime lookup
          LLM_PROVIDER_PARAM: `/group-chat-ai/${environment}/llm-provider`,
          LLM_MODEL_PARAM: `/group-chat-ai/${environment}/persona-model`,
          ROUTING_PROVIDER_PARAM: `/group-chat-ai/${environment}/routing-provider`,
          ROUTING_MODEL_PARAM: `/group-chat-ai/${environment}/routing-model`,
        },
        logDriver: ecs.LogDrivers.awsLogs({
          streamPrefix: 'group-chat-ai',
          logGroup: ecsLogGroup,
        }),
        taskRole: taskRole,
      },
      publicLoadBalancer: true,
      listenerPort: 80,
      protocol: elbv2.ApplicationProtocol.HTTP,
    });

    // Remove the default security group rule that allows access from anywhere
    const albSecurityGroup = this.service.loadBalancer.connections.securityGroups[0];

    // Clear all ingress rules
    const cfnSecurityGroup = albSecurityGroup.node.defaultChild as ec2.CfnSecurityGroup;
    cfnSecurityGroup.addPropertyOverride('SecurityGroupIngress', []);

    // Add specific rule for CloudFront access only
    albSecurityGroup.addIngressRule(
      ec2.Peer.prefixList(cloudFrontPrefixListId),
      ec2.Port.tcp(80),
      'Allow CloudFront access only'
    );

    // Enable ALB access logs
    this.service.loadBalancer.logAccessLogs(albLogsBucket, 'alb-access-logs');

    // Suppress CDK Nag for ECS task execution role - uses AWS managed policy for basic execution
    NagSuppressions.addResourceSuppressions(this.service.taskDefinition.executionRole!, [
      {
        id: 'AwsSolutions-IAM4',
        reason: 'Task execution role uses standard AWS managed policy for ECS execution which provides minimal required permissions for ECR and CloudWatch Logs',
        appliesTo: ['Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy']
      },
      {
        id: 'AwsSolutions-IAM5',
        reason: 'ECS task execution role requires wildcard permissions for ECR and CloudWatch Logs as resource names are dynamic during container execution',
        appliesTo: ['Resource::*']
      }
    ], true);

    // Suppress CDK Nag for ECS Task Definition environment variables - using secrets for sensitive data
    NagSuppressions.addResourceSuppressions(this.service.taskDefinition, [
      {
        id: 'AwsSolutions-ECS2',
        reason: 'Environment variables used are non-sensitive configuration values (NODE_ENV, PORT, etc). Sensitive values like LLM_MODEL and LLM_PROVIDER are moved to Parameter Store secrets'
      },
      {
        id: 'AwsSolutions-IAM5',
        reason: 'ECS task execution role requires wildcard permissions for ECR and CloudWatch Logs as resource names are dynamic during container execution',
        appliesTo: ['Resource::*']
      }
    ]);

    // Suppress CDK Nag for ALB security group - CloudFront access is intentional and secure
    NagSuppressions.addResourceSuppressions(albSecurityGroup, [
      {
        id: 'AwsSolutions-EC23',
        reason: 'ALB security group allows access from CloudFront managed prefix list, which is a secure and recommended pattern for CloudFront origins'
      }
    ]);

    // Configure health check
    this.service.targetGroup.configureHealthCheck({
      path: '/health',
      healthyHttpCodes: '200',
      interval: cdk.Duration.seconds(30),
      timeout: cdk.Duration.seconds(5),
      healthyThresholdCount: 2,
      unhealthyThresholdCount: 3,
    });

    // Configure auto-scaling
    const scalableTarget = this.service.service.autoScaleTaskCount({
      minCapacity: 1,
      maxCapacity: 10,
    });

    scalableTarget.scaleOnCpuUtilization('CpuScaling', {
      targetUtilizationPercent: 70,
      scaleInCooldown: cdk.Duration.minutes(5),
      scaleOutCooldown: cdk.Duration.minutes(2),
    });

    scalableTarget.scaleOnMemoryUtilization('MemoryScaling', {
      targetUtilizationPercent: 80,
      scaleInCooldown: cdk.Duration.minutes(5),
      scaleOutCooldown: cdk.Duration.minutes(2),
    });

    // Store ALB information in Parameter Store for CloudFront integration
    new ssm.StringParameter(this, 'LoadBalancerDnsParameter', {
      parameterName: `/group-chat-ai/${environment}/alb-dns`,
      stringValue: this.service.loadBalancer.loadBalancerDnsName,
      description: `ALB DNS name for Group Chat AI ${environment} environment`,
      tier: ssm.ParameterTier.STANDARD,
    });

    new ssm.StringParameter(this, 'LoadBalancerUrlParameter', {
      parameterName: `/group-chat-ai/${environment}/alb-url`,
      stringValue: `http://${this.service.loadBalancer.loadBalancerDnsName}`,
      description: `ALB URL for Group Chat AI ${environment} environment`,
      tier: ssm.ParameterTier.STANDARD,
    });

    // Output important values
    new cdk.CfnOutput(this, 'LoadBalancerDNS', {
      value: this.service.loadBalancer.loadBalancerDnsName,
      description: 'DNS name of the load balancer',
      exportName: `GroupChatAI-ALB-DNS-${environment}`,
    });

    new cdk.CfnOutput(this, 'LoadBalancerUrl', {
      value: `http://${this.service.loadBalancer.loadBalancerDnsName}`,
      description: 'Application Load Balancer URL',
      exportName: `GroupChatAI-ALB-URL-${environment}`,
    });

    new cdk.CfnOutput(this, 'ClusterName', {
      value: this.cluster.clusterName,
      description: 'ECS Cluster name',
    });

    new cdk.CfnOutput(this, 'ServiceName', {
      value: this.service.service.serviceName,
      description: 'ECS Service name',
    });

    new cdk.CfnOutput(this, 'CloudFrontPrefixListId', {
      value: cloudFrontPrefixListId,
      description: 'CloudFront managed prefix list ID for this region',
      exportName: `GroupChatAI-CloudFront-PrefixList-${environment}`,
    });

    // Cognito outputs
    new cdk.CfnOutput(this, 'UserPoolId', {
      value: this.userPool.userPoolId,
      description: 'Cognito User Pool ID',
      exportName: `GroupChatAI-UserPoolId-${environment}`,
    });

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: this.userPoolClient.userPoolClientId,
      description: 'Cognito User Pool Client ID',
      exportName: `GroupChatAI-UserPoolClientId-${environment}`,
    });

    new cdk.CfnOutput(this, 'UserPoolDomain', {
      value: this.userPoolDomain.domainName,
      description: 'Cognito User Pool Domain',
      exportName: `GroupChatAI-UserPoolDomain-${environment}`,
    });

    new cdk.CfnOutput(this, 'CognitoIssuer', {
      value: `https://cognito-idp.${this.region}.amazonaws.com/${this.userPool.userPoolId}`,
      description: 'Cognito OIDC Issuer URL',
      exportName: `GroupChatAI-CognitoIssuer-${environment}`,
    });

    new cdk.CfnOutput(this, 'UserSessionsTableName', {
      value: this.userSessionsTable.tableName,
      description: 'DynamoDB User Sessions Table Name',
      exportName: `GroupChatAI-UserSessionsTable-${environment}`,
    });

    // Store Cognito configuration in Parameter Store
    new ssm.StringParameter(this, 'CognitoUserPoolIdParameter', {
      parameterName: `/group-chat-ai/${environment}/cognito-user-pool-id`,
      stringValue: this.userPool.userPoolId,
      description: `Cognito User Pool ID for Group Chat AI ${environment} environment`,
      tier: ssm.ParameterTier.STANDARD,
    });

    new ssm.StringParameter(this, 'CognitoUserPoolClientIdParameter', {
      parameterName: `/group-chat-ai/${environment}/cognito-user-pool-client-id`,
      stringValue: this.userPoolClient.userPoolClientId,
      description: `Cognito User Pool Client ID for GroupChatAI ${environment} environment`,
      tier: ssm.ParameterTier.STANDARD,
    });

    new ssm.StringParameter(this, 'CognitoUserPoolDomainParameter', {
      parameterName: `/group-chat-ai/${environment}/cognito-user-pool-domain`,
      stringValue: this.userPoolDomain.domainName,
      description: `Cognito User Pool Domain for GroupChatAI ${environment} environment`,
      tier: ssm.ParameterTier.STANDARD,
    });

    new ssm.StringParameter(this, 'CognitoIssuerParameter', {
      parameterName: `/group-chat-ai/${environment}/cognito-issuer`,
      stringValue: `https://cognito-idp.${this.region}.amazonaws.com/${this.userPool.userPoolId}`,
      description: `Cognito OIDC Issuer URL for GroupChatAI ${environment} environment`,
      tier: ssm.ParameterTier.STANDARD,
    });
  }
}
