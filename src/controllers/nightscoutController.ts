import { Request, Response } from 'express';
import axios from 'axios';

export class NightscoutController {
  static async fetchProfile(req: Request, res: Response): Promise<void> {
    try {
      const { url, apiSecret, token } = req.body || {};

      if (!url || typeof url !== 'string') {
        res.status(400).json({ success: false, error: 'Missing or invalid url' });
        return;
      }

      const baseUrl = url.replace(/\/$/, '');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (apiSecret) headers['api-secret'] = String(apiSecret);
      if (token) headers['Authorization'] = `Bearer ${String(token)}`;

      const response = await axios.get(`${baseUrl}/api/v1/profile.json`, { headers });
      res.json({ success: true, data: response.data });
    } catch (error: any) {
      const status = error?.response?.status || 500;
      const message = error?.response?.data || error?.message || 'Failed to fetch Nightscout profile';
      res.status(status).json({ success: false, error: message });
    }
  }

  static async setProfile(req: Request, res: Response): Promise<void> {
    try {
      const { url } = req.body || {};
  
      if (!url || typeof url !== 'string') {
        res.status(400).json({ success: false, error: 'Missing or invalid url' });
        return;
      }
  
      const baseUrl = url.replace(/\/$/, '');
      const apiSecret = process.env['API_SECRET'];
  
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'api-secret': apiSecret ?? ''
      };
  
      const profilePayload = {
        store: {
          Default: {
            defaultProfile: 'Default',
            timezone: 'America/New_York',
            units: 'mg/dL',
            basal: [{ time: '00:00', value: 0.8 }],
            carbratio: [{ time: '00:00', value: 10 }],
            sens: [{ time: '00:00', value: 50 }],
            target_low: [{ time: '00:00', value: 80 }],
            target_high: [{ time: '00:00', value: 120 }],
            dia: 4
          }
        },
        defaultProfile: 'Default',
        startDate: new Date().toISOString()
      };
  
      const response = await axios.post(`${baseUrl}/api/v1/profile.json`, profilePayload, { headers });
      console.log('✅ Nightscout profile set response:', response.data);
      res.json({ success: true, data: response.data });
  
    } catch (error: any) {
      const status = error?.response?.status || 500;
      const message = error?.response?.data || error?.message || 'Failed to set Nightscout profile';
      res.status(status).json({ success: false, error: message });
    }
  }
  
  
}

