# Group Chat AI Infrastructure Configuration

This directory contains the CDK application configuration system that supports environment-specific settings for the Group Chat AI application infrastructure.

## Configuration System

The configuration system uses an optional `config.json` file to define environment-specific settings. If no configuration file is provided, the infrastructure uses sensible defaults.

### Configuration File Location

Place your configuration file at: `infrastructure/bin/config.json`

### Configuration Structure

```json
{
  "environments": {
    "dev": {
      "frontend": {
        "customDomain": {
          "domainName": "dev.group-chat-ai.com",
          "certificateArn": "arn:aws:acm:us-east-1:123456789012:certificate/12345678-1234-1234-1234-123456789012"
        }
      }
    },
    "staging": {
      "frontend": {
        "customDomain": {
          "domainName": "staging.group-chat-ai.com",
          "certificateArn": "arn:aws:acm:us-east-1:123456789012:certificate/87654321-4321-4321-4321-210987654321"
        }
      }
    },
    "prod": {
      "frontend": {
        "customDomain": {
          "domainName": "app.group-chat-ai.com",
          "certificateArn": "arn:aws:acm:us-east-1:123456789012:certificate/abcdef12-3456-7890-abcd-ef1234567890"
        }
      }
    }
  }
}
```

## Custom Domain Setup

### Prerequisites

1. **Domain Ownership**: You must own the domain you want to use
2. **ACM Certificate**: Create an SSL certificate in AWS Certificate Manager
3. **DNS Access**: Ability to modify DNS records for your domain

### Step 1: Create ACM Certificate

1. Go to AWS Certificate Manager in the **us-east-1** region (required for CloudFront)
2. Request a public certificate
3. Add your domain name (e.g., `app.group-chat-ai.com`)
4. Choose DNS validation
5. Complete the DNS validation process
6. Copy the certificate ARN

### Step 2: Configure Infrastructure

1. Copy the example configuration:
   ```bash
   cp infrastructure/bin/config.example.json infrastructure/bin/config.json
   ```

2. Edit `config.json` with your settings:
   - Replace `domainName` with your actual domain
   - Replace `certificateArn` with your ACM certificate ARN

### Step 3: Deploy Infrastructure

Deploy your environment:
```bash
npm run deploy:dev # or deploy:staging or deploy:prod
```

### Step 4: Configure DNS

After deployment, you'll see output with DNS instructions:
```
DnsSetupInstructions = Configure DNS: app.group-chat-ai.com CNAME d1234567890abc.cloudfront.net
```

Create a CNAME record in your DNS provider:
- **Name**: `app` (or your subdomain)
- **Type**: `CNAME`
- **Value**: `d1234567890abc.cloudfront.net` (from deployment output)

## Configuration Options

### Frontend Configuration

#### Custom Domain

```json
{
  "frontend": {
    "customDomain": {
      "domainName": "app.group-chat-ai.com",
      "certificateArn": "arn:aws:acm:us-east-1:123456789012:certificate/abc123..."
    }
  }
}
```

**Required fields:**
- `domainName`: The fully qualified domain name
- `certificateArn`: ACM certificate ARN (must be in us-east-1)

### Backend Configuration (Future)

```json
{
  "backend": {
    "scaling": {
      "minCapacity": 2,
      "maxCapacity": 20
    },
    "environment": {
      "LOG_LEVEL": "warn"
    }
  }
}
```

## Validation

The configuration system includes comprehensive validation:

- **JSON Structure**: Validates configuration file format
- **Domain Names**: Checks domain name format
- **Certificate ARNs**: Validates ACM certificate ARN format and region
- **Required Fields**: Ensures all required fields are present

## Usage Examples

### Default Deployment (No Custom Domain)

```bash
# No config.json needed
npm run deploy:dev
# Uses: https://d1234567890abc.cloudfront.net
```

### Custom Domain Deployment

```bash
# Create config.json with custom domain settings
npm run deploy:dev
# Uses: https://app.group-chat-ai.com
```

### Environment-Specific Domains

```json
{
  "environments": {
    "dev": {
      "frontend": {
        "customDomain": {
          "domainName": "dev.group-chat-ai.com",
          "certificateArn": "arn:aws:acm:us-east-1:123456789012:certificate/dev-cert"
        }
      }
    },
    "prod": {
      "frontend": {
        "customDomain": {
          "domainName": "app.group-chat-ai.com",
          "certificateArn": "arn:aws:acm:us-east-1:123456789012:certificate/prod-cert"
        }
      }
    }
  }
}
```

## Troubleshooting

### Certificate Validation Errors

**Error**: `Certificate ARN must be a valid ACM certificate ARN in us-east-1 region`

**Solution**: Ensure your certificate is created in the `us-east-1` region, which is required for CloudFront.

### Domain Validation Errors

**Error**: `Domain name "example.com" is not valid`

**Solution**: Use a fully qualified domain name (e.g., `app.example.com`, not just `example.com`).

### DNS Propagation

After configuring DNS, it may take up to 48 hours for changes to propagate globally. You can check DNS propagation using tools like:
- `dig app.group-chat-ai.com`
- Online DNS propagation checkers

## Security Considerations

### Certificate Management

- Store certificate ARNs in configuration files
- Ensure certificates are validated and active
- Set up certificate renewal monitoring

### Configuration File Security

- Add `config.json` to `.gitignore` if it contains sensitive information
- Consider using AWS Systems Manager Parameter Store for sensitive values in production

## Support and Extension

The configuration system is designed to be extensible. Future capabilities may include:

- Backend scaling parameters
- Environment variables
- Monitoring and alerting configuration
- Additional CloudFront behaviors
- Custom cache policies

To add new configuration options, extend the TypeScript interfaces in `config-loader.ts` and update the validation logic accordingly.
