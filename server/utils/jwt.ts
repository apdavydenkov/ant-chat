import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import dotenv from 'dotenv';

// Ensure env is loaded
dotenv.config();

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is required in environment variables');
}

if (!process.env.JWT_EXPIRES_IN) {
  throw new Error('JWT_EXPIRES_IN is required in environment variables');
}

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN;

export interface JWTPayload {
  userId: string;
  telegramId?: number;
  username: string;
  iat: number;
  exp: number;
}

export const generateJWT = (userId: string, username: string, telegramId?: number, customExpiresIn?: string | number): string => {
  return jwt.sign(
    { 
      userId, 
      username, 
      telegramId 
    },
    JWT_SECRET,
    { 
      expiresIn: customExpiresIn !== undefined ? customExpiresIn : JWT_EXPIRES_IN,
      issuer: 'ant-chat'
    }
  );
};

export const verifyJWT = (token: string): JWTPayload => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return decoded;
  } catch (error) {
    throw new Error('Invalid token');
  }
};

export const verifyTelegramData = (data: any, botToken: string): boolean => {
  const { hash, ...userData } = data;
  
  const dataCheckString = Object.keys(userData)
    .sort()
    .map(key => `${key}=${userData[key]}`)
    .join('\n');
  
  const secretKey = crypto.createHash('sha256').update(botToken).digest();
  const hmac = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
  
  return hmac === hash;
};