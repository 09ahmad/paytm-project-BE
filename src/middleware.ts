import express, { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { JWT_SECRET_KEY } from "./config";
const app = express();
app.use(express.json());

declare module "express" {
  interface Request {
    userId?: string;
  }
}
export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const token = req.headers.authorization;
  if (!token || !token.startsWith("Bearer ")) {
    res.status(403).json({
      error: "Unauthorized",
    });
    return;
  }
  try {
    const decode = jwt.verify(token, JWT_SECRET_KEY) as { id: string };
    if (decode && decode.id) {
      req.userId = decode.id;
      next();
    } else {
      res.status(403).json({
        message: "Invalid token payload",
      });
    }
  } catch (error) {
    console.error(error);
  }
};
