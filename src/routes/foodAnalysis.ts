import express from 'express';
import { FoodAnalysisService } from '../services/foodAnalysisService';

const router = express.Router();

// Middleware to handle base64 image data and capture media type
const parseImageData = (req: express.Request, res: express.Response, next: express.NextFunction): void => {
  try {
    const { imageData } = req.body;
    
    if (!imageData) {
      res.status(400).json({
        success: false,
        error: 'Image data is required'
      });
      return;
    }

    let base64Data: string = imageData;
    let mediaType: string | undefined;

    // If data URL is provided, extract media type and base64 payload
    if (typeof imageData === 'string' && imageData.startsWith('data:image/')) {
      const match = imageData.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.*)$/);
      if (!match || !match[2]) {
        res.status(400).json({
          success: false,
          error: 'Invalid data URL for image'
        });
        return;
      }
      mediaType = match[1];
      base64Data = match[2];
    }
    
    // Validate base64 format
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(base64Data)) {
      res.status(400).json({
        success: false,
        error: 'Invalid base64 image data'
      });
      return;
    }

    req.body.processedImageData = base64Data;
    req.body.mediaType = mediaType; // optional; service can auto-detect if missing
    next();
  } catch (error) {
    console.error('Error parsing image data:', error);
    res.status(400).json({
      success: false,
      error: 'Failed to process image data'
    });
  }
};

// Analyze food image
router.post('/analyze', parseImageData, async (req: express.Request, res: express.Response) => {
  try {
    const { processedImageData, mediaType } = req.body as { processedImageData: string; mediaType?: string };
    const userId = req.headers['user-id'] as string; // Optional user ID for logging

    console.log('Received food analysis request');

    const analysisResult = await FoodAnalysisService.analyzeFoodImage(processedImageData, userId, mediaType);

    res.json({
      success: true,
      data: analysisResult
    });
  } catch (error) {
    console.error('Food analysis error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Food analysis failed'
    });
  }
});

// Get analysis history for a user
router.get('/history', async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const userId = req.headers['user-id'] as string;
    const limit = parseInt(req.query['limit'] as string) || 10;

    if (!userId) {
      res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
      return;
    }

    const history = await FoodAnalysisService.getAnalysisHistory(userId, limit);

    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    console.error('Error fetching analysis history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch analysis history'
    });
  }
});

// Health check endpoint for food analysis service
router.get('/health', (_req: express.Request, res: express.Response) => {
  res.json({
    success: true,
    status: 'Food analysis service is healthy',
    timestamp: new Date().toISOString()
  });
});

export default router; 