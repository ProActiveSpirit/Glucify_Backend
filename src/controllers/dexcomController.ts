import { Request, Response } from 'express';
import axios from 'axios';

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

interface DexcomGlucoseRequest {
  access_token: string;
  start_date?: string;
  end_date?: string;
}

export class DexcomController {
  private static getDexcomBaseUrl(): string {
    // Use sandbox for development, production for production
    return process.env.NODE_ENV === 'production' 
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
}
