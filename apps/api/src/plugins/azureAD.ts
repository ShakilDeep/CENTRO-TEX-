import fp from 'fastify-plugin';
import { ConfidentialClientApplication } from '@azure/msal-node';
import { FastifyInstance, FastifyRequest } from 'fastify';

declare module 'fastify' {
  interface FastifyInstance {
    azureAD: {
      getAuthUrl(state?: string): Promise<string>;
      exchangeCodeForToken(code: string): Promise<{ accessToken: string; idToken: string }>;
      getUserProfile(accessToken: string): Promise<{ email: string; name?: string; department?: string }>;
    };
  }

  interface FastifyRequest {
    azureADUser?: { email: string; name?: string; department?: string };
  }
}

interface AzureADConfig {
  clientId: string;
  clientSecret: string;
  tenantId: string;
  redirectUri: string;
  scopes: string[];
}

export default fp(async function azureADPlugin(fastify: FastifyInstance) {
  const config: AzureADConfig = {
    clientId: process.env.AZURE_AD_CLIENT_ID || '',
    clientSecret: process.env.AZURE_AD_CLIENT_SECRET || '',
    tenantId: process.env.AZURE_AD_TENANT_ID || '',
    redirectUri: process.env.AZURE_AD_REDIRECT_URI || 'http://localhost:3000/auth/sso/callback',
    scopes: (process.env.AZURE_AD_SCOPES || 'https://graph.microsoft.com/.default').split(',')
  };

  if (!config.clientId || !config.clientSecret || !config.tenantId) {
    fastify.log.warn('Azure AD plugin loaded but credentials not configured. Set AZURE_AD_CLIENT_ID, AZURE_AD_CLIENT_SECRET, and AZURE_AD_TENANT_ID environment variables.');

    fastify.decorate('azureAD', {
      getAuthUrl: async (): Promise<string> => {
        throw new Error('Azure AD credentials not configured');
      },
      exchangeCodeForToken: async (): Promise<{ accessToken: string; idToken: string }> => {
        throw new Error('Azure AD credentials not configured');
      },
      getUserProfile: async (): Promise<{ email: string; name?: string; department?: string }> => {
        throw new Error('Azure AD credentials not configured');
      }
    });

    fastify.log.info('Azure AD plugin registered successfully (disabled mode)');
    return;
  }

  const msalConfig = {
    auth: {
      clientId: config.clientId,
      authority: `https://login.microsoftonline.com/${config.tenantId}`,
      clientSecret: config.clientSecret
    }
  };

  const pca = new ConfidentialClientApplication(msalConfig);

  fastify.decorate('azureAD', {
    getAuthUrl: async (state?: string): Promise<string> => {
      if (!config.clientId) {
        throw new Error('Azure AD client ID not configured');
      }

      const authCodeUrlParameters = {
        scopes: config.scopes,
        redirectUri: config.redirectUri,
        state: state || crypto.randomUUID()
      };

      try {
        const url = await pca.getAuthCodeUrl(authCodeUrlParameters);
        return url;
      } catch (error) {
        fastify.log.error({ error }, 'Failed to generate Azure AD auth URL');
        throw new Error('Failed to generate Azure AD authorization URL');
      }
    },

    exchangeCodeForToken: async (code: string): Promise<{ accessToken: string; idToken: string }> => {
      if (!config.clientId || !config.clientSecret) {
        throw new Error('Azure AD credentials not configured');
      }

      const tokenRequest = {
        code,
        scopes: config.scopes,
        redirectUri: config.redirectUri
      };

      try {
        const response = await pca.acquireTokenByCode(tokenRequest);

        if (!response.accessToken) {
          throw new Error('No access token received from Azure AD');
        }

        return {
          accessToken: response.accessToken,
          idToken: response.idToken || ''
        };
      } catch (error) {
        fastify.log.error({ error }, 'Failed to exchange code for token with Azure AD');
        throw new Error('Failed to exchange authorization code for tokens');
      }
    },

    getUserProfile: async (accessToken: string): Promise<{ email: string; name?: string; department?: string }> => {
      try {
        const response = await fetch('https://graph.microsoft.com/v1.0/me', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          const errorText = await response.text();
          fastify.log.error({ status: response.status, errorText }, 'Failed to fetch user profile from Microsoft Graph');
          throw new Error('Failed to retrieve user profile from Microsoft Graph API');
        }

        const profile: any = await response.json();

        return {
          email: profile.mail || profile.userPrincipalName,
          name: profile.displayName || profile.givenName && profile.surname ? `${profile.givenName} ${profile.surname}` : undefined,
          department: profile.department || undefined
        };
      } catch (error) {
        fastify.log.error({ error }, 'Error fetching user profile from Microsoft Graph');
        throw new Error('Failed to retrieve user profile');
      }
    }
  });


  fastify.log.info('Azure AD plugin registered successfully');
}, {
  name: 'azure-ad-plugin',
  dependencies: []
});
