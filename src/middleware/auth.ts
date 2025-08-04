import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../config/database';

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

    console.log('🔐 Auth middleware debug:', {
      hasAuthHeader: !!authHeader,
      authHeaderType: authHeader?.split(' ')[0],
      hasToken: !!token,
      tokenLength: token?.length || 0,
      endpoint: req.path,
      method: req.method
    });

    if (!token) {
      console.log('❌ No token provided in Authorization header');
      res.status(401).json({
        success: false,
        error: 'Access token required'
      });
      return;
    }

    console.log('🔐 Attempting to validate token...');

    // Try to get user session using the token
    const { data, error } = await supabaseAdmin.auth.getUser(token);

    console.log('🔐 Token validation result:', {
      hasData: !!data,
      hasUser: !!data?.user,
      hasError: !!error,
      errorMessage: error?.message,
      errorCode: error?.status
    });

    if (error) {
      console.error('❌ Token verification failed:', error);
      
      // If it's a 401 error, it means the token is invalid
      if (error.status === 401) {
        res.status(401).json({
          success: false,
          error: 'Invalid or expired token'
        });
        return;
      }
      
      // For other errors, return a generic error
      res.status(500).json({
        success: false,
        error: 'Authentication service error'
      });
      return;
    }

    if (!data?.user) {
      console.error('❌ No user found for token');
      res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      });
      return;
    }

    // Add user information to the request object
    req.user = {
      id: data.user.id,
      email: data.user.email || ''
    };

    console.log('✅ Authentication successful for user:', data.user.id);
    next();
  } catch (error) {
    console.error('❌ Authentication middleware error:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication failed'
    });
  }
}; 