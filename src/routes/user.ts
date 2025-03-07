import express, { Request, Response } from "express";
import jwt from "jsonwebtoken";
export const userRouter = express.Router();
import cors from "cors";
import { passwordSchema, usernameSchema } from "../validation";
import { UserModel } from "../db";
import dotenv from "dotenv";
import { router } from ".";
import { JWT_SECRET_KEY } from "../config";
import { authMiddleware } from "../middleware";
dotenv.config();
const app = express();
app.use(express.json());
app.use(cors());
app.use("/api/v1", router);

if (!process.env.PORT) {
  throw new Error("either PORT is undefined or JWT_SECRET is undefined");
}
const port = process.env.PORT || 3000;
router.post("/signup", async (req: Request, res: Response) => {
  try {
    const validateUsername = usernameSchema.safeParse(req.body.username);
    const validatePassword = passwordSchema.safeParse(req.body.password);

    if (!validateUsername.success || !validatePassword.success) {
      res.json({
        message: "Validation faild",
      });
      return;
    }

    const { firstName, lastName, username, password } = req.body;

    const existingUser = await UserModel.findOne({
      username: username,
    });
    if (existingUser) {
      res.json({
        message: "user already exist",
      });
      return;
    }

    const dbUser = await UserModel.create({
      firstName: firstName,
      lastName: lastName,
      username: username,
      password: password,
    });
    const token = jwt.sign(
      {
        userId: dbUser._id,
      },
      JWT_SECRET_KEY,
      {
        expiresIn: "1h",
      },
    );
    res.status(200).json({
      message: "User created successfully",
      token: token,
    });
  } catch (error) {
    console.error("Error while creating new user", error);
  }
});

router.post("/signin", authMiddleware, async (req: Request, res: Response) => {
  const body = req.body;
  const username = body.username;
  const password = body.password;

  const validateUsername = usernameSchema.safeParse(username);
  const validatePassword = passwordSchema.safeParse(password);
  if (!validateUsername.success || !validatePassword.success) {
    res.json({
      message: "User validation failed due to incorrect input token ",
    });
    return;
  }
  try {
    const user = await UserModel.findOne({
      username,
    });
    if (!user?._id) {
      res.status(411).json({
        message: "User does not exist",
      });
      return;
    }
    const token = jwt.sign({ userId: user._id }, JWT_SECRET_KEY);
    res.status(200).json({
      message: "signed in ",
      token: token,
    });
  } catch (error) {
    console.error("Error while signup", error);
  }
});

router.post("/update", async (req: Request, res: Response) => {});

app.listen(port, () => {
  console.log("http://localhost:", port);
});
