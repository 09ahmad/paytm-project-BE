import express, { Request, Response } from "express";
import jwt from "jsonwebtoken";
const router = express.Router();
import cors from "cors";
import { passwordSchema, usernameSchema } from "../validation";
import { Account, UserModel } from "../db";
import { JWT_SECRET_KEY } from "../config";
import { authMiddleware } from "../middleware";
import { z } from "zod";
const app = express();
app.use(express.json());
app.use(cors());

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
    /// ----- Create new account ------

    const userId = dbUser._id;
    await Account.create({
      userId,
      balance: 1 + Math.random() * 10000,
    });

    /// -----  ------
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

router.post("/signin", async (req: Request, res: Response) => {
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

const updateBody = z.object({
  password: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

router.put("/", authMiddleware, async (req: Request, res: Response) => {
  const { success } = updateBody.safeParse(req.body);
  if (!success) {
    res.status(411).json({
      message: "User validation failded",
    });
    return;
  }
  try {
    await UserModel.updateOne({ _id: req.userId }, req.body);
    res.status(200).json({
      message: "Updated successfully",
    });
  } catch (error) {
    res.json({
      message: "Something went wrong while updating the information ",
    });
  }
});

router.get("/bulk", async (req: Request, res: Response) => {
  const filter = req.query.filter || "";
  try {
    const users = await UserModel.find({
      $or: [
        {
          firstName: { $regex: { filter } },
          lastName: { $regex: { filter } },
        },
      ],
    });
    if (!users) {
      res.status(404).json({
        message: "no user found for the name",
      });
      return;
    }
    res.json({
      user: users.map((user) => ({
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        _id: user._id,
      })),
    });
  } catch (error) {
    res.status(403).json({
      message: "unable to search",
    });
  }
});

export default router;
