
import { Request } from 'express';

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      admin?: {
        id: number;
        username: string;
      };
      adminToken?: string;
      person?: {
        id: number;
        user_id: number;
        name: string;
        role: string;
      };
      personToken?: string;
    }
  }
}
