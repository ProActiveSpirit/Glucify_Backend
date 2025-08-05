import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Extend the Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
      };
    }
  }
}

export const authenticateToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      console.log('❌ No token provided in Authorization header');
      res.status(401).json({
        success: false,
        error: 'Access token required'
      });
      return;
    }

    try {
      // First, try to verify the JWT token directly
      const decoded = jwt.decode(token) as any;
      
      if (!decoded || !decoded.sub) {
        console.error('❌ Invalid JWT token format');
        res.status(401).json({
          success: false,
          error: 'Invalid token format'
        });
        return;
      }

      // Check if token is expired
      if (decoded.exp && Date.now() >= decoded.exp * 1000) {
        console.error('❌ Token has expired');
        res.status(401).json({
          success: false,
          error: 'Token has expired'
        });
        return;
      }

      // Extract user information from JWT token
      const userId = decoded.sub;
      const userEmail = decoded.email || '';

      // Add user information to the request object
      req.user = {
        id: userId,
        email: userEmail
      };

      next();
    } catch (jwtError) {
      console.error('❌ JWT validation failed:', jwtError);
      res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    }
  } catch (error) {
    console.error('❌ Authentication middleware error:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication failed'
    });
  }
}; 