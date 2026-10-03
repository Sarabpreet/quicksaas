import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "quicksaas-dev-secret-change-in-production";

export interface TokenPayload {
  userId: string;
  email: string;
  organizationId?: string;
  isSuperadmin?: boolean;
}

export function signToken(payload: TokenPayload, expiresIn: string | number = "7d"): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn } as jwt.SignOptions);
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}
