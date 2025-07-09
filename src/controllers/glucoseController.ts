import { Request, Response } from 'express';
import { GlucoseService } from '../services/glucoseService';
import { AIService } from '../services/aiService';

export class GlucoseController {
  static async getReadings(req: Request, res: Response): Promise<void> {
    try {
      const { user_id } = req.query;
      
      if (!user_id) {
        res.status(400).json({
          success: false,
          error: 'user_id parameter is required'
        });
        return;
      }

      const limit = parseInt(req.query['limit'] as string) || 100;
      const readings = await GlucoseService.getReadings(user_id as string, limit);

      res.json({
        success: true,
        data: readings
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  static async addReading(req: Request, res: Response): Promise<void> {
    try {
      const readingData = req.body;

      if (!readingData.user_id) {
        res.status(400).json({
          success: false,
          error: 'user_id is required in request body'
        });
        return;
      }

      const reading = await GlucoseService.addReading(readingData);

      if (!reading) {
        res.status(400).json({
          success: false,
          error: 'Failed to add glucose reading'
        });
        return;
      }

      res.status(201).json({
        success: true,
        data: reading
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  static async getReadingsByDateRange(req: Request, res: Response): Promise<void> {
    try {
      const { user_id, startDate, endDate } = req.query;

      if (!user_id) {
        res.status(400).json({
          success: false,
          error: 'user_id parameter is required'
        });
        return;
      }

      if (!startDate || !endDate) {
        res.status(400).json({
          success: false,
          error: 'Start date and end date are required'
        });
        return;
      }

      const readings = await GlucoseService.getReadingsByDateRange(
        user_id as string,
        startDate as string,
        endDate as string
      );

      res.json({
        success: true,
        data: readings
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  static async updateReading(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Reading ID is required'
        });
        return;
      }
      
      const reading = await GlucoseService.updateReading(id, req.body);

      if (!reading) {
        res.status(404).json({
          success: false,
          error: 'Glucose reading not found or update failed'
        });
        return;
      }

      res.json({
        success: true,
        data: reading
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  static async deleteReading(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Reading ID is required'
        });
        return;
      }
      
      const success = await GlucoseService.deleteReading(id);

      if (!success) {
        res.status(404).json({
          success: false,
          error: 'Glucose reading not found or delete failed'
        });
        return;
      }

      res.json({
        success: true,
        message: 'Glucose reading deleted successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  static async getStats(req: Request, res: Response): Promise<void> {
    try {
      const { user_id } = req.query;
      
      if (!user_id) {
        res.status(400).json({
          success: false,
          error: 'user_id parameter is required'
        });
        return;
      }

      const period = (req.query['period'] as 'day' | 'week' | 'month') || 'day';
      const stats = await GlucoseService.getStats(user_id as string, period);

      if (!stats) {
        res.status(404).json({
          success: false,
          error: 'No glucose data found for statistics'
        });
        return;
      }

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  static async getGlucoseAnalysis(req: Request, res: Response): Promise<void> {
    try {
      const { user_id, timeframe, includeContext } = req.body;

      if (!user_id) {
        res.status(400).json({
          success: false,
          error: 'user_id is required in request body'
        });
        return;
      }

      // Get recent glucose readings for analysis
      const readings = await GlucoseService.getReadings(user_id, 50);
      
      if (readings.length === 0) {
        res.json({
          success: true,
          data: {
            analysis: 'No glucose data available for analysis. Please add some readings to get personalized insights.'
          }
        });
        return;
      }

      const analysis = await AIService.analyzeGlucosePatterns(readings);

      res.json({
        success: true,
        data: analysis
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
} 