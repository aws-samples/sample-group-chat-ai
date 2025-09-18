# Configuration Builder Scripts

This directory contains interactive scripts to help build configuration files for the AI Pitch Perfect project.

## build-config.js

An interactive terminal script that helps you build `config.json` files for different environments (dev, staging, prod).

### Features

- 🌐 **Interactive Prompts**: User-friendly questions with validation
- ⚙️  **Environment Configuration**: Configure frontend and backend settings per environment
- 🔍 **Input Validation**: Validates ARNs, domain names, and numeric inputs
- 📦 **Backup Support**: Automatically backs up existing configurations
- 🎯 **Smart Defaults**: Sensible defaults based on environment type
- ✅ **Preview & Confirm**: Shows configuration preview before saving

### Usage

Run the script from the project root:

```bash
# Make the script executable (already done)
chmod +x scripts/build-config.js

# Run the interactive configuration builder
node scripts/build-config.js

# Or run it directly (if executable)
./scripts/build-config.js
```

### Configuration Options

#### Frontend Settings
- **Custom Domain**: Domain name and SSL certificate ARN
- **Environment-specific**: Different domains for dev/staging/prod

#### Backend Settings
- **Scaling**: Min/max capacity for auto-scaling
- **Environment Variables**: 
  - Log levels (debug, info, warn, error)
  - Debug mode (dev environment)
  - Custom variables

### Example Configuration Structure

```json
{
  "environments": {
    "dev": {
      "frontend": {
        "customDomain": {
          "domainName": "dev.example.com",
          "certificateArn": "arn:aws:acm:us-east-1:123456789012:certificate/cert-id"
        }
      },
      "backend": {
        "scaling": {
          "minCapacity": 1,
          "maxCapacity": 5
        },
        "environment": {
          "DEBUG": "true",
          "LOG_LEVEL": "debug"
        }
      }
    },
    "prod": {
      "frontend": {
        "customDomain": {
          "domainName": "app.example.com",
          "certificateArn": "arn:aws:acm:us-east-1:123456789012:certificate/prod-cert-id"
        }
      },
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
  }
}
```

### Input Validation

The script validates:
- **Domain Names**: Must be valid domain format (e.g., app.example.com)
- **Certificate ARNs**: Must match AWS ACM ARN format
- **Scaling Values**: Must be positive integers within reasonable ranges
- **Log Levels**: Must be one of: debug, info, warn, error

### File Output

- Default output: `infrastructure/bin/config.json`
- Custom path: You can specify a different path when prompted
- Backup: Existing configs are automatically backed up with `.backup.json` extension

### Tips

- Press **Enter** to skip optional configurations
- Use **Ctrl+C** to exit at any time
- The script will load existing configuration as a starting point if available
- Review the preview carefully before saving

### Troubleshooting

If you encounter issues:

1. **Permission Denied**: Make sure the script is executable with `chmod +x`
2. **Node.js Not Found**: Ensure Node.js is installed
3. **Write Permission**: Ensure you have write access to the target directory
4. **Invalid Input**: Follow the validation messages for proper formats
