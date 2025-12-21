import jwt, { SignOptions } from 'jsonwebtoken';

export const generateToken = (userId: number, role: string): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not defined in environment variables');
  }
  
  const payload: { userId: number; role: string } = { userId, role };
  const secretKey: string = secret;
  const expiresInValue = process.env.JWT_EXPIRES_IN || '7d';
  
  return jwt.sign(
    payload,
    secretKey,
    {
      expiresIn: expiresInValue
    } as SignOptions
  );
};

export const verifyToken = (token: string): any => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not defined in environment variables');
  }
  return jwt.verify(token, secret);
};


