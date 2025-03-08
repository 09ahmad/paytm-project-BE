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
  const authHeader = req.headers.authorization;
  console.log(authHeader)
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
     res.status(403).json({
      error: "Unauthorized",
    });
    return;
  }
  const token = authHeader.split(" ")[1];
  try {
    const decode = jwt.verify(token, JWT_SECRET_KEY) as { userId: string };
    if (decode && decode.userId) {
      req.userId = decode.userId;
      next();
    } else {
       res.status(403).json({
        message: "Invalid token payload",
      });
      return
    }
  } catch (error) {
    res.status(403).json({
      message: "Error in middleware authorization",
    });
    return;
  }
};
