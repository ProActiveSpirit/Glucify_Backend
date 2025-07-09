import { Request, Response } from 'express';
import { ChatService } from '../services/chatService';

export class ChatController {
  static async analyzeMessage(req: Request, res: Response): Promise<void> {
    try {
      const { user_id, message, glucoseContext } = req.body;

      if (!user_id) {
        res.status(400).json({
          success: false,
          error: 'user_id is required in request body'
        });
        return;
      }

      if (!message) {
        res.status(400).json({
          success: false,
          error: 'Message is required'
        });
        return;
      }

      const response = await ChatService.analyzeMessage(user_id, message, glucoseContext);

      res.json({
        success: true,
        data: {
          response
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  static async getConversations(req: Request, res: Response): Promise<void> {
    try {
      const { user_id } = req.query;
      
      if (!user_id) {
        res.status(400).json({
          success: false,
          error: 'user_id parameter is required'
        });
        return;
      }

      const limit = parseInt(req.query['limit'] as string) || 50;
      const conversations = await ChatService.getConversations(user_id as string, limit);

      res.json({
        success: true,
        data: conversations
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  static async logConversation(req: Request, res: Response): Promise<void> {
    try {
      const { user_id, message, ai_response, auto_logged_data, glucose_context } = req.body;

      if (!user_id) {
        res.status(400).json({
          success: false,
          error: 'user_id is required in request body'
        });
        return;
      }

      if (!message || !ai_response) {
        res.status(400).json({
          success: false,
          error: 'Message and AI response are required'
        });
        return;
      }

      const conversation = await ChatService.logConversation({
        user_id,
        message,
        ai_response,
        auto_logged_data,
        glucose_context
      });

      if (!conversation) {
        res.status(400).json({
          success: false,
          error: 'Failed to log conversation'
        });
        return;
      }

      res.status(201).json({
        success: true,
        data: conversation
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
} 