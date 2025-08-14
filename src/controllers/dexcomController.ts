import { Request, Response } from 'express';
import axios from 'axios';
// import { supabase } from '../config/database';


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

      // Public API only (no Supabase and no project token)
      const RAILWAY_TOKEN = process.env['RAILWAY_TOKEN'];
      if (!RAILWAY_TOKEN) {
        res.status(500).json({ success: false, error: 'RAILWAY_TOKEN not configured on backend' });
        return;
      }
      console.log('🔄 Applying Railway env vars and redeploying project:', {
        railway_project_id,
        bridge_username: '[REDACTED]'
      });
      // Use Railway Public API
      const graphqlUrl = 'https://backboard.railway.com/graphql/v2';
      const headers = { Authorization: `Bearer ${RAILWAY_TOKEN}`, 'Content-Type': 'application/json' } as any;

      const gql = async (query: string, variables: any) => {
        try {
          console.log('🔄 Railway gql query:', query);
          console.log('🔄 Railway gql variables:', variables);
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

      // Preflight: verify token and project access, then fetch environment and service
      // Fetch project details directly using the provided project ID
      try {
        await gql('query { me { email } }', {});
      } catch (e: any) {
        throw new Error('Railway token invalid or lacks access');
      }
      const projResp = await gql(
        'query q($projectId: String!) { project(id: $projectId) { id name environments { edges { node { id name } } } services { edges { node { id name } } } } }',
        { projectId: railway_project_id }
      );
      const project = projResp?.project;
      if (!project?.id) throw new Error('Railway project not found or not accessible by this token');
      const envEdges = project?.environments?.edges || [];
      const environmentId: string | undefined = envEdges[0]?.node?.id;
      const svcEdges = project?.services?.edges || [];
      const svcNodes = svcEdges.map((e: any) => e?.node).filter(Boolean);
      const serviceId: string | undefined = (svcNodes.length === 1 ? svcNodes[0]?.id : (svcNodes.find((s: any) => /nightscout/i.test(s?.name || ''))?.id)) || undefined;
      if (!environmentId) throw new Error('No Railway environment found for project');

      // Upsert variables using Public API (can omit serviceId to create shared variables)
      const upsertMutation = 'mutation up($input: VariableUpsertInput!) { variableUpsert(input: $input) }';
      console.log('🔄 Railway upsert for project:', railway_project_id, 'env:', environmentId, 'service:', serviceId || '[shared]');
      const mkInput = (name: string, value: string) => ({
        projectId: railway_project_id,
        environmentId,
        name,
        value,
        ...(serviceId ? { serviceId } : {}),
      });
      try {
        await gql(upsertMutation, { input: mkInput('BRIDGE_USER_NAME', bridge_username) });
        await gql(upsertMutation, { input: mkInput('BRIDGE_PASSWORD', bridge_password) });
      } catch (err) {
        // If service-specific upsert fails, fallback to shared variables
        if (serviceId) {
          console.warn('Variable upsert with serviceId failed, falling back to shared variables');
          const mkShared = (name: string, value: string) => ({ projectId: railway_project_id, environmentId, name, value });
          await gql(upsertMutation, { input: mkShared('BRIDGE_USER_NAME', bridge_username) });
          await gql(upsertMutation, { input: mkShared('BRIDGE_PASSWORD', bridge_password) });
        } else {
          throw err;
        }
      }

      // Explicitly restart latest deployment of the selected service (if serviceId is available)
      if (serviceId) {
        const depQuery = 'query deps($projectId: String!, $environmentId: String!, $serviceId: String!) { deployments(first: 1, input: { projectId: $projectId, environmentId: $environmentId, serviceId: $serviceId }) { edges { node { id staticUrl } } } }';
        const depResp = await gql(depQuery, {
          projectId: railway_project_id,
          environmentId,
          serviceId
        });
        const deploymentId = depResp?.deployments?.edges?.[0]?.node?.id as string | undefined;
        if (deploymentId) {
          const restartMutation = 'mutation restart($id: String!) { deploymentRestart(id: $id) }';
          try {
            await gql(restartMutation, { id: deploymentId });
            res.json({ success: true, redeployed: true, restartedDeploymentId: deploymentId });
            return;
          } catch (e: any) {
            if ((e?.message || '').toLowerCase().includes('not restartable')) {
              // Some deployments cannot be restarted; variableUpsert already triggers a new deploy
              res.json({ success: true, redeployed: true, restartedDeploymentId: null, note: 'Deployment not restartable; relying on auto-deploy from variableUpsert' });
              return;
            }
            throw e;
          }
        }
        // If no deployment found, still return success since variableUpsert schedules deploys
        res.json({ success: true, redeployed: true, restartedDeploymentId: null });
        return;
      }

      // No serviceId selected – variables were upserted as shared variables
      res.json({ success: true, redeployed: true, restartedDeploymentId: null, note: 'No serviceId provided; restart skipped' });
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
      const { railway_project_id } = req.body || {};
      if (!railway_project_id) {
        res.status(400).json({ success: false, error: 'Missing required field: railway_project_id' });
        return;
      }

      const RAILWAY_TOKEN = process.env['RAILWAY_TOKEN'];
      if (!RAILWAY_TOKEN) {
        res.status(500).json({ success: false, error: 'RAILWAY_TOKEN not configured on backend' });
        return;
      }

      // GraphQL helper (Public API)
      const graphqlUrl = 'https://backboard.railway.com/graphql/v2';
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

      // Fetch project env and optional service
      await gql('query { me { email } }', {});
      const projResp = await gql(
        'query q($projectId: String!) { project(id: $projectId) { id name environments { edges { node { id name } } } services { edges { node { id name } } } } }',
        { projectId: railway_project_id }
      );
      const project = projResp?.project;
      if (!project?.id) {
        res.status(404).json({ success: false, error: 'Railway project not found or not accessible by this token' });
        return;
      }
      const envEdges = project?.environments?.edges || [];
      const environmentId: string | undefined = envEdges[0]?.node?.id;
      const svcEdges = project?.services?.edges || [];
      const svcNodes = svcEdges.map((e: any) => e?.node).filter(Boolean);
      const serviceId: string | undefined = (svcNodes.length === 1 ? svcNodes[0]?.id : (svcNodes.find((s: any) => /nightscout/i.test(s?.name || ''))?.id)) || undefined;
      if (!environmentId) {
        res.status(400).json({ success: false, error: 'No Railway environment found for project' });
        return;
      }

      // Delete variables if supported; fallback to upsert empty values
      const deleteMutation = 'mutation del($input: VariableDeleteInput!) { variableDelete(input: $input) }';
      const mkDelete = (name: string) => ({ projectId: railway_project_id, environmentId, name, ...(serviceId ? { serviceId } : {}) });
      const upsertMutation = 'mutation up($input: VariableUpsertInput!) { variableUpsert(input: $input) }';
      const mkUpsert = (name: string) => ({ projectId: railway_project_id, environmentId, name, value: '', ...(serviceId ? { serviceId } : {}) });

      const deleteOrClear = async (name: string) => {
        try {
          await gql(deleteMutation, { input: mkDelete(name) });
        } catch (e) {
          await gql(upsertMutation, { input: mkUpsert(name) });
        }
      };

      await deleteOrClear('BRIDGE_USER_NAME');
      await deleteOrClear('BRIDGE_PASSWORD');

      // Optionally restart latest deployment
      if (serviceId) {
        const depQuery = 'query deps($projectId: String!, $environmentId: String!, $serviceId: String!) { deployments(first: 1, input: { projectId: $projectId, environmentId: $environmentId, serviceId: $serviceId }) { edges { node { id staticUrl } } } }';
        const depResp = await gql(depQuery, { projectId: railway_project_id, environmentId, serviceId });
        const deploymentId = depResp?.deployments?.edges?.[0]?.node?.id as string | undefined;
        if (deploymentId) {
          const restartMutation = 'mutation restart($id: String!) { deploymentRestart(id: $id) }';
          try {
            await gql(restartMutation, { id: deploymentId });
            res.json({ success: true, redeployed: true, restartedDeploymentId: deploymentId });
            return;
          } catch (e: any) {
            if ((e?.message || '').toLowerCase().includes('not restartable')) {
              res.json({ success: true, redeployed: true, restartedDeploymentId: null, note: 'Deployment not restartable; relying on auto-deploy from variable changes' });
              return;
            }
            throw e;
          }
        }
      }

      res.json({ success: true, redeployed: true, restartedDeploymentId: null });
    } catch (error: any) {
      console.error('❌ Failed to disconnect bridge:', error);
      const msg = error?.message || '';
      const status = /Railway token invalid|lacks access/i.test(msg)
        ? 401
        : /Railway GraphQL/i.test(msg)
          ? 400
          : 500;
      res.status(status).json({ success: false, error: msg || 'Failed to disconnect' });
    }
  }
}
