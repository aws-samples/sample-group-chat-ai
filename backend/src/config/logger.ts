// Copyright 2025 Amazon.com, Inc. or its affiliates.
// SPDX-License-Identifier: MIT-0

import winston from 'winston';

// Singleton logger instance
let loggerInstance: winston.Logger | null = null;

export function createLogger(): winston.Logger {
  // Return existing logger if already created
  if (loggerInstance) {
    return loggerInstance;
  }

  // Create logger only once
  // eslint-disable-next-line no-console
  console.log('🔧 Creating winston logger...');

  loggerInstance = winston.createLogger({
    level: 'debug',
    transports: [
      new winston.transports.Console({
        level: 'debug',
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.timestamp({ format: 'HH:mm:ss' }),
          winston.format.printf(({ level, message, timestamp, ...meta }) => {
            const metaStr = Object.keys(meta).filter(k => k !== 'service').length 
              ? ` ${JSON.stringify(meta, null, 0)}` 
              : '';
            return `${timestamp} [${level}]: ${message}${metaStr}`;
          })
        ),
      }),
    ],
  });

  // Test the logger immediately
  loggerInstance.info('✅ Winston logger initialized successfully');
  // eslint-disable-next-line no-console
  console.log('🔧 Winston logger created and tested');

  return loggerInstance;
}
