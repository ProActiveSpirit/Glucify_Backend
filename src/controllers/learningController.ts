import { Request, Response } from 'express';
import { LearningService } from '../services/learningService';

export class LearningController {
  static async getState(req: Request, res: Response) {
    try {
      const { user_id } = req.query as any;
      if (!user_id) return res.status(400).json({ success: false, error: 'user_id required' });
      const state = await LearningService.getState(user_id);
      return res.json({ success: true, data: state });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e.message || 'Internal error' });
    }
  }

  static async upsertState(req: Request, res: Response) {
    try {
      const { user_id, state } = req.body || {};
      if (!user_id || !state) return res.status(400).json({ success: false, error: 'user_id and state required' });
      const saved = await LearningService.upsertState(user_id, state);
      return res.json({ success: true, data: saved });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e.message || 'Internal error' });
    }
  }

  static async getFoodImpacts(req: Request, res: Response) {
    try {
      const { user_id } = req.query as any;
      if (!user_id) return res.status(400).json({ success: false, error: 'user_id required' });
      const list = await LearningService.getFoodImpacts(user_id);
      return res.json({ success: true, data: list });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e.message || 'Internal error' });
    }
  }

  static async upsertFoodImpact(req: Request, res: Response) {
    try {
      const { user_id, food_key, impact } = req.body || {};
      if (!user_id || !food_key || !impact) return res.status(400).json({ success: false, error: 'user_id, food_key, impact required' });
      const saved = await LearningService.upsertFoodImpact(user_id, food_key, impact);
      return res.json({ success: true, data: saved });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e.message || 'Internal error' });
    }
  }
}

