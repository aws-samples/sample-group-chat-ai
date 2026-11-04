// Copyright 2025 Amazon.com, Inc. or its affiliates.
// SPDX-License-Identifier: MIT-0

/**
 * Number of trusted proxy hops in front of the app. Behind CloudFront -> ALB
 * there are two. A bounded hop count (NOT `true`) lets the app derive the real
 * client IP from X-Forwarded-For without letting a client spoof the header to
 * escape rate limits. Overridable for other deployment topologies.
 *
 * Shared by Express (`app.set('trust proxy', ...)`) and the WebSocket upgrade
 * path so both read the client IP the same way.
 */
export const TRUST_PROXY_HOPS = Number(process.env.TRUST_PROXY_HOPS) || 2;
