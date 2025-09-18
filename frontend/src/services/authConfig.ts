// Copyright 2025 Amazon.com, Inc. or its affiliates.
// SPDX-License-Identifier: MIT-0

import { UserManagerSettings } from 'oidc-client-ts';

interface AuthConfig {
  authority: string;
  client_id: string;
  redirect_uri: string;
  post_logout_redirect_uri: string;
  response_type: string;
  scope: string;
  automaticSilentRenew: boolean;
  loadUserInfo: boolean;
}

interface Config {
  auth: AuthConfig;
  api: {
    baseUrl: string;
  };
  environment: string;
}

let cachedConfig: Config | null = null;

export const fetchConfig = async (): Promise<Config> => {
  if (cachedConfig) {
    return cachedConfig;
  }

  try {
    const response = await fetch('/config.json');
    if (!response.ok) {
      throw new Error(`Failed to fetch config: ${response.statusText}`);
    }
    
    cachedConfig = await response.json();
    return cachedConfig as Config;
  } catch (error) {
    console.error('Failed to load configuration:', error);
    throw error;
  }
};

export const getOidcConfig = async (): Promise<UserManagerSettings> => {
  const config = await fetchConfig();
  
  return {
    authority: config.auth.authority,
    client_id: config.auth.client_id,
    redirect_uri: config.auth.redirect_uri,
    post_logout_redirect_uri: config.auth.post_logout_redirect_uri,
    response_type: config.auth.response_type,
    scope: config.auth.scope,
    automaticSilentRenew: config.auth.automaticSilentRenew,
    loadUserInfo: config.auth.loadUserInfo,
    silent_redirect_uri: `${window.location.origin}/silent-callback.html`
  };
};

export const getApiConfig = async () => {
  const config = await fetchConfig();
  return {
    baseUrl: config.api.baseUrl,
  };
};
