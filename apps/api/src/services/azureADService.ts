import { ConfidentialClientApplication } from '@azure/msal-node';
import crypto from 'crypto';

interface AzureADConfig {
  clientId: string;
  clientSecret: string;
  tenantId: string;
  redirectUri: string;
  scopes: string[];
}

export interface AzureADUserProfile {
  email: string;
  name?: string;
  department?: string;
}

export class AzureADService {
  private pca: ConfidentialClientApplication | null = null;
  private config: AzureADConfig;
  private initialized: boolean = false;

  constructor(config?: Partial<AzureADConfig>) {
    this.config = {
      clientId: config?.clientId || process.env.AZURE_AD_CLIENT_ID || '',
      clientSecret: config?.clientSecret || process.env.AZURE_AD_CLIENT_SECRET || '',
      tenantId: config?.tenantId || process.env.AZURE_AD_TENANT_ID || '',
      redirectUri: config?.redirectUri || process.env.AZURE_AD_REDIRECT_URI || 'http://localhost:3000/auth/sso/callback',
      scopes: config?.scopes || (process.env.AZURE_AD_SCOPES || 'https://graph.microsoft.com/.default').split(',')
    };

    if (this.config.clientId && this.config.clientSecret && this.config.tenantId) {
      this.initialize();
    }
  }

  private initialize(): void {
    if (this.initialized) return;

    const msalConfig = {
      auth: {
        clientId: this.config.clientId,
        authority: `https://login.microsoftonline.com/${this.config.tenantId}`,
        clientSecret: this.config.clientSecret
      }
    };

    this.pca = new ConfidentialClientApplication(msalConfig);
    this.initialized = true;
  }

  async getAuthUrl(state?: string): Promise<string> {
    if (!this.pca) {
      throw new Error('Azure AD client not configured. Set AZURE_AD_CLIENT_ID, AZURE_AD_CLIENT_SECRET, and AZURE_AD_TENANT_ID environment variables.');
    }

    const authCodeUrlParameters = {
      scopes: this.config.scopes,
      redirectUri: this.config.redirectUri,
      state: state || crypto.randomUUID()
    };

    return await this.pca.getAuthCodeUrl(authCodeUrlParameters);
  }

  async exchangeCodeForToken(code: string): Promise<{ accessToken: string; idToken: string }> {
    if (!this.pca) {
      throw new Error('Azure AD client not configured');
    }

    const tokenRequest = {
      code,
      scopes: this.config.scopes,
      redirectUri: this.config.redirectUri
    };

    const response = await this.pca.acquireTokenByCode(tokenRequest);

    if (!response.accessToken) {
      throw new Error('No access token received from Azure AD');
    }

    return {
      accessToken: response.accessToken,
      idToken: response.idToken || ''
    };
  }

  async getUserProfile(accessToken: string): Promise<AzureADUserProfile> {
    const response = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch user profile from Microsoft Graph: ${response.status} ${errorText}`);
    }

    const profile: any = await response.json();

    return {
      email: profile.mail || profile.userPrincipalName,
      name: profile.displayName || (profile.givenName && profile.surname ? `${profile.givenName} ${profile.surname}` : undefined),
      department: profile.department || undefined
    };
  }

  async exchangeCodeForProfile(code: string): Promise<AzureADUserProfile> {
    const { accessToken } = await this.exchangeCodeForToken(code);
    return this.getUserProfile(accessToken);
  }

  isConfigured(): boolean {
    return this.initialized && !!this.pca;
  }
}
