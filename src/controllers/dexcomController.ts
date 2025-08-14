import { Request, Response } from 'express';
import axios from 'axios';
import { exec } from 'child_process';
import util from 'util';
import { supabase } from '../config/database';

const execAsync = util.promisify(exec);

interface DexcomTokenRequest {
  code: string;
  client_id: string;
  client_secret: string;
  redirect_uri: string;
  grant_type: 'authorization_code';
}

interface DexcomRefreshRequest {
  refresh_token: string;
  client_id: string;
  client_secret: string;
  grant_type: 'refresh_token';
}

export class DexcomController {
  private static getDexcomBaseUrl(): string {
    // Use sandbox for development, production for production
    return process.env['NODE_ENV'] === 'production'
      ? 'https://api.dexcom.com'
      : 'https://sandbox-api.dexcom.com';
  }

  static async exchangeToken(req: Request, res: Response): Promise<void> {
    try {
      console.log('🔄 Dexcom token exchange request received');
      
      const { code, client_id, client_secret, redirect_uri, grant_type }: DexcomTokenRequest = req.body;

      // Validate required fields
      if (!code || !client_id || !client_secret || !redirect_uri || grant_type !== 'authorization_code') {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: code, client_id, client_secret, redirect_uri, grant_type'
        });
        return;
      }

      console.log('📤 Making token exchange request to Dexcom API:', {
        baseUrl: DexcomController.getDexcomBaseUrl(),
        client_id: client_id.substring(0, 8) + '...',
        redirect_uri,
        grant_type,
        hasCode: !!code,
        hasClientSecret: !!client_secret
      });

      // Make request to Dexcom API
      const dexcomResponse = await axios.post(
        `${DexcomController.getDexcomBaseUrl()}/v2/oauth2/token`,
        new URLSearchParams({
          client_id,
          client_secret,
          code,
          grant_type,
          redirect_uri,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'Glucify-Backend/1.0'
          },
          timeout: 30000 // 30 second timeout
        }
      );

      console.log('✅ Dexcom token exchange successful:', {
        hasAccessToken: !!dexcomResponse.data.access_token,
        hasRefreshToken: !!dexcomResponse.data.refresh_token,
        expiresIn: dexcomResponse.data.expires_in
      });

      res.json({
        success: true,
        data: dexcomResponse.data
      });

    } catch (error: any) {
      console.error('❌ Dexcom token exchange failed:', error);
      
      // Handle Dexcom API errors
      if (error.response) {
        console.error('Dexcom API error response:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        });

        res.status(error.response.status).json({
          success: false,
          error: error.response.data?.error_description || error.response.data?.error || 'Dexcom API error',
          details: error.response.data
        });
      } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        res.status(503).json({
          success: false,
          error: 'Unable to connect to Dexcom API. Please check your internet connection.'
        });
      } else if (error.code === 'ETIMEDOUT') {
        res.status(504).json({
          success: false,
          error: 'Dexcom API request timed out. Please try again.'
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Internal server error during token exchange'
        });
      }
    }
  }

  static async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      console.log('🔄 Dexcom token refresh request received');
      
      const { refresh_token, client_id, client_secret, grant_type }: DexcomRefreshRequest = req.body;

      // Validate required fields
      if (!refresh_token || !client_id || !client_secret || grant_type !== 'refresh_token') {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: refresh_token, client_id, client_secret, grant_type'
        });
        return;
      }

      // Make request to Dexcom API
      const dexcomResponse = await axios.post(
        `${DexcomController.getDexcomBaseUrl()}/v2/oauth2/token`,
        new URLSearchParams({
          client_id,
          client_secret,
          refresh_token,
          grant_type,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'Glucify-Backend/1.0'
          },
          timeout: 30000
        }
      );

      console.log('✅ Dexcom token refresh successful');

      res.json({
        success: true,
        data: dexcomResponse.data
      });

    } catch (error: any) {
      console.error('❌ Dexcom token refresh failed:', error);
      
      if (error.response) {
        res.status(error.response.status).json({
          success: false,
          error: error.response.data?.error_description || error.response.data?.error || 'Dexcom API error',
          details: error.response.data
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Internal server error during token refresh'
        });
      }
    }
  }

  static async getGlucoseReadings(req: Request, res: Response): Promise<void> {
    try {
      console.log('📊 Dexcom glucose readings request received');
      
      const { access_token, start_date, end_date } = req.query as any;

      if (!access_token) {
        res.status(400).json({
          success: false,
          error: 'Missing required parameter: access_token'
        });
        return;
      }

      // Build query parameters
      const params = new URLSearchParams();
      if (start_date) params.append('startDate', start_date);
      if (end_date) params.append('endDate', end_date);

      const url = `${DexcomController.getDexcomBaseUrl()}/v2/users/self/egvs${params.toString() ? '?' + params.toString() : ''}`;

      // Make request to Dexcom API
      const dexcomResponse = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json',
          'User-Agent': 'Glucify-Backend/1.0'
        },
        timeout: 30000
      });

      console.log('✅ Dexcom glucose readings retrieved:', {
        count: dexcomResponse.data.egvs?.length || 0
      });

      res.json({
        success: true,
        data: dexcomResponse.data.egvs || dexcomResponse.data || []
      });

    } catch (error: any) {
      console.error('❌ Dexcom glucose readings failed:', error);
      
      if (error.response) {
        res.status(error.response.status).json({
          success: false,
          error: error.response.data?.error_description || error.response.data?.error || 'Dexcom API error',
          details: error.response.data
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Internal server error during glucose data fetch'
        });
      }
    }
  }

  static async validateToken(req: Request, res: Response): Promise<void> {
    try {
      const { access_token } = req.body;

      if (!access_token) {
        res.status(400).json({
          success: false,
          error: 'Missing required field: access_token'
        });
        return;
      }

      // Try to make a simple request to validate the token
      await axios.get(`${DexcomController.getDexcomBaseUrl()}/v2/users/self/egvs`, {
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      res.json({
        success: true,
        valid: true
      });

    } catch (error: any) {
      if (error.response?.status === 401) {
        res.json({
          success: true,
          valid: false
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Error validating token'
        });
      }
    }
  }

  // POST /api/dexcom/bridge/apply
  // Sets Railway env vars for Nightscout project and triggers redeploy
  static async applyBridgeEnvAndRedeploy(req: Request, res: Response): Promise<void> {
    try {
      const { railway_project_id, bridge_username, bridge_password } = req.body || {};

      if (!railway_project_id || !bridge_username || !bridge_password) {
        res.status(400).json({ success: false, error: 'Missing required fields: railway_project_id, bridge_username, bridge_password' });
        return;
      }

      const RAILWAY_TOKEN = process.env['RAILWAY_TOKEN'];
      if (!RAILWAY_TOKEN) {
        res.status(500).json({ success: false, error: 'RAILWAY_TOKEN not configured on backend' });
        return;
      }
      console.log('🔄 Applying Railway env vars and redeploying project:', {
        railway_project_id,
        bridge_username: '[REDACTED]'
      });
      // Use Railway GraphQL API to set variables (CLI 'variables set' is not supported)
      const graphqlUrl = 'https://backboard.railway.app/graphql/v2';
      const headers = { Authorization: `Bearer ${RAILWAY_TOKEN}`, 'Content-Type': 'application/json' } as any;

      const gql = async (query: string, variables: any) => {
        try {
          const resp = await axios.post(graphqlUrl, { query, variables }, { headers, timeout: 15000 });
          if (resp.data?.errors) {
            throw new Error(resp.data.errors[0]?.message || 'Railway GraphQL error');
          }
          return resp.data?.data;
        } catch (err: any) {
          const msg = err?.response?.data?.errors?.[0]?.message || err?.message || 'Railway GraphQL request failed';
          throw new Error(`Railway GraphQL: ${msg}`);
        }
      };

      // Preflight: verify token and project access, then fetch environments
      try {
        await gql('query { viewer { id email } }', {});
      } catch (e: any) {
        throw new Error('Railway token invalid or lacks access');
      }

      const proj = await gql('query q($projectId: String!) { project(id: $projectId) { id name environments { id name } } }', { projectId: railway_project_id });
      const environmentId: string | undefined = proj?.project?.environments?.[0]?.id;
      if (!proj?.project?.id) {
        throw new Error('Railway project not found or not accessible by this token');
      }
      if (!environmentId) {
        throw new Error('No Railway environment found for project');
      }

      const upsertMutation = 'mutation up($projectId: String!, $environmentId: String!, $name: String!, $value: String!) { variableUpsert(input: { projectId: $projectId, environmentId: $environmentId, name: $name, value: $value }) { id } }';
      await gql(upsertMutation, { projectId: railway_project_id, environmentId, name: 'BRIDGE_USER_NAME', value: bridge_username });
      await gql(upsertMutation, { projectId: railway_project_id, environmentId, name: 'BRIDGE_PASSWORD', value: bridge_password });

      // Try redeploy via CLI (best effort). If it fails, return 202 so client knows not to close modal
      try {
        await execAsync(`railway redeploy -y`, { env: { ...process.env, RAILWAY_TOKEN } });
        // After redeploy, test Nightscout
        const userId = req.user?.id;
        if (!userId) {
          res.status(500).json({ success: false, error: 'No user in request' });
          return;
        }

        // Get assigned domain for user
        const { data: conn } = await supabase
          .from('user_nightscout_connections')
          .select('id, nightscout_domain_id')
          .eq('user_id', userId)
          .limit(1)
          .maybeSingle();

        if (!conn?.nightscout_domain_id) {
          res.status(500).json({ success: false, error: 'No Nightscout domain assigned' });
          return;
        }

        const { data: domainRow } = await supabase
          .from('nightscout_domains')
          .select('domain')
          .eq('id', conn.nightscout_domain_id)
          .maybeSingle();

        const domain = domainRow?.domain;
        if (!domain) {
          res.status(500).json({ success: false, error: 'Nightscout domain not found' });
          return;
        }

        const baseUrl = domain.startsWith('http') ? domain : `https://${domain}`;

        // Poll Nightscout status a few times
        let ok = false;
        for (let i = 0; i < 6; i++) {
          try {
            const statusResp = await axios.get(`${baseUrl}/api/v1/status.json`, { timeout: 5000 });
            if (statusResp.status === 200) { ok = true; break; }
          } catch {}
          await new Promise(r => setTimeout(r, 3000));
        }

        if (!ok) {
          res.status(202).json({ success: false, redeployed: true, error: 'Nightscout not reachable after redeploy' });
          return;
        }

        // Save connected status in DB
        await supabase
          .from('user_nightscout_connections')
          .update({ connection_status: 'active', updated_at: new Date().toISOString() })
          .eq('user_id', userId);

        await supabase
          .from('user_diabetes_profiles')
          .update({ dexcom_connect: true, updated_at: new Date().toISOString() })
          .eq('user_id', userId);

        res.json({ success: true, redeployed: true });
      } catch (cliErr) {
        console.warn('Railway redeploy failed', cliErr);
        res.status(202).json({ success: false, redeployed: false, error: 'Variables set but redeploy failed' });
      }
    } catch (error: any) {
      console.error('❌ Failed to apply Railway env/redeploy:', error);
      const msg = error?.message || '';
      const status = /Railway token invalid|lacks access/i.test(msg)
        ? 401
        : /Railway GraphQL/i.test(msg)
          ? 400
          : 500;
      res.status(status).json({ success: false, error: msg || 'Failed to apply Railway settings' });
    }
  }

  // POST /api/dexcom/bridge/disconnect - mark disconnected and release domain
  static async disconnectBridge(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const { data: conns } = await supabase
        .from('user_nightscout_connections')
        .select('id, nightscout_domain_id')
        .eq('user_id', userId)
        .limit(1);
      const conn = conns && conns[0];

      if (conn?.nightscout_domain_id) {
        await supabase
          .from('nightscout_domains')
          .update({ is_available: true, assigned_user_id: null, assigned_at: null })
          .eq('id', conn.nightscout_domain_id);
      }

      await supabase
        .from('user_nightscout_connections')
        .update({
          dexcom_username: null,
          dexcom_password: null,
          connection_status: 'disconnected',
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      await supabase
        .from('user_diabetes_profiles')
        .update({ dexcom_connect: false, updated_at: new Date().toISOString() })
        .eq('user_id', userId);

      res.json({ success: true });
    } catch (error: any) {
      console.error('❌ Failed to disconnect bridge:', error);
      res.status(500).json({ success: false, error: error?.message || 'Failed to disconnect' });
    }
  }

  // POST /api/dexcom/bridge/clear
  // Clears Railway env vars for Nightscout project and triggers redeploy (does NOT change Supabase state)
  static async clearBridgeEnvAndRedeploy(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }
      console.log('User ', userId, ' clearing bridge env and redeploying');
      // Look up user's assigned Nightscout domain to get ailway project id
      const { data: conn } = await supabase
        .from('user_nightscout_connections')
        .select('id, nightscout_domain_id')
        .eq('user_id', userId)
        .limit(1)
        .maybeSingle();
      console.log('🔄 Clearing bridge env and redeploying for user:', userId, 'with conn:', conn);
      if (!conn?.nightscout_domain_id) {
        res.status(400).json({ success: false, error: 'No Nightscout domain assigned to user' });
        return;
      }

      const { data: domainRow } = await supabase
        .from('nightscout_domains')
        .select('railway_project_id, domain')
        .eq('id', conn.nightscout_domain_id)
        .maybeSingle();

      const railway_project_id = domainRow?.railway_project_id;
      if (!railway_project_id) {
        res.status(400).json({ success: false, error: 'Nightscout domain missing Railway project id' });
        return;
      }

      const RAILWAY_TOKEN = process.env['RAILWAY_TOKEN'];
      if (!RAILWAY_TOKEN) {
        res.status(500).json({ success: false, error: 'RAILWAY_TOKEN not configured on backend' });
        return;
      }

      // GraphQL helper
      const graphqlUrl = 'https://backboard.railway.app/graphql/v2';
      const headers = { Authorization: `Bearer ${RAILWAY_TOKEN}`, 'Content-Type': 'application/json' } as any;
      const gql = async (query: string, variables: any) => {
        try {
          const resp = await axios.post(graphqlUrl, { query, variables }, { headers, timeout: 15000 });
          if (resp.data?.errors) {
            throw new Error(resp.data.errors[0]?.message || 'Railway GraphQL error');
          }
          return resp.data?.data;
        } catch (err: any) {
          const msg = err?.response?.data?.errors?.[0]?.message || err?.message || 'Railway GraphQL request failed';
          throw new Error(`Railway GraphQL: ${msg}`);
        }
      };

      // Determine environment id with preflight
      try {
        await gql('query { viewer { id email } }', {});
      } catch (e: any) {
        res.status(400).json({ success: false, error: 'Railway token invalid or lacks access' });
        return;
      }

      const proj = await gql('query q($projectId: String!) { project(id: $projectId) { id name environments { id name } } }', { projectId: railway_project_id });
      const environmentId: string | undefined = proj?.project?.environments?.[0]?.id;
      if (!proj?.project?.id) {
        res.status(400).json({ success: false, error: 'Railway project not found or not accessible by this token' });
        return;
      }
      if (!environmentId) {
        res.status(400).json({ success: false, error: 'No Railway environment found for project' });
        return;
      }

      // Clear variables by setting empty strings (safer than delete without ids)
      const upsertMutation = 'mutation up($projectId: String!, $environmentId: String!, $name: String!, $value: String!) { variableUpsert(input: { projectId: $projectId, environmentId: $environmentId, name: $name, value: $value }) { id } }';
      await gql(upsertMutation, { projectId: railway_project_id, environmentId, name: 'BRIDGE_USER_NAME', value: '' });
      await gql(upsertMutation, { projectId: railway_project_id, environmentId, name: 'BRIDGE_PASSWORD', value: '' });

      // Trigger redeploy
      try {
        await execAsync(`railway redeploy -y`, { env: { ...process.env, RAILWAY_TOKEN } });

        // Optionally verify Nightscout responds (should still be up even without creds)
        const domain = domainRow?.domain;
        const baseUrl = domain?.startsWith('http') ? domain : `https://${domain}`;
        let ok = false;
        if (baseUrl) {
          for (let i = 0; i < 4; i++) {
            try {
              const statusResp = await axios.get(`${baseUrl}/api/v1/status.json`, { timeout: 5000 });
              if (statusResp.status === 200) { ok = true; break; }
            } catch {}
            await new Promise(r => setTimeout(r, 3000));
          }
        }

        res.json({ success: true, redeployed: true, statusOk: ok });
      } catch (cliErr) {
        console.warn('Railway redeploy failed (clear vars):', cliErr);
        res.status(202).json({ success: false, redeployed: false, error: 'Cleared vars but redeploy failed' });
      }
    } catch (error: any) {
      console.error('❌ Failed to clear Railway env/redeploy:', error);
      const msg = error?.message || '';
      const status = /Railway token invalid|lacks access/i.test(msg)
        ? 401
        : /Railway GraphQL/i.test(msg)
          ? 400
          : 500;
      res.status(status).json({ success: false, error: msg || 'Failed to clear Railway settings' });
    }
  }
}
