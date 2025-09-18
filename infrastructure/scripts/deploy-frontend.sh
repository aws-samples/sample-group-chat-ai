#!/bin/bash

# Deploy Frontend Infrastructure Script
# This script deploys the Group Chat AI frontend infrastructure (S3 + CloudFront)

set -e

echo "🚀 Deploying Group Chat AI Frontend Infrastructure..."

# Check if AWS CLI is configured
if ! aws sts get-caller-identity > /dev/null 2>&1; then
    echo "❌ AWS CLI is not configured. Please run 'aws configure' first."
    exit 1
fi

# Get current directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRASTRUCTURE_DIR="$(dirname "$SCRIPT_DIR")"

# Change to infrastructure directory
cd "$INFRASTRUCTURE_DIR"

echo "📦 Building CDK infrastructure..."
npm run build

echo "🔍 Synthesizing CDK templates..."
npm run synth

echo "🚀 Deploying backend stack first..."
cdk deploy GroupChatAIDev --require-approval never

echo "🌐 Deploying frontend stack..."
cdk deploy GroupChatAIFrontendDev --require-approval never

echo "✅ Deployment completed successfully!"

# Get the CloudFront URL
CLOUDFRONT_URL=$(aws cloudformation describe-stacks \
    --stack-name GroupChatAIFrontendDev \
    --query 'Stacks[0].Outputs[?OutputKey==`WebsiteUrl`].OutputValue' \
    --output text 2>/dev/null || echo "")

if [ -n "$CLOUDFRONT_URL" ]; then
    echo ""
    echo "🌍 Frontend URL: $CLOUDFRONT_URL"
    echo ""
    echo "📝 Note: CloudFront distribution may take 10-15 minutes to fully deploy."
    echo "    You can check the status in the AWS Console."
else
    echo ""
    echo "⚠️  Could not retrieve CloudFront URL. Check AWS Console for deployment status."
fi

echo ""
echo "🎉 Frontend deployment complete!"
