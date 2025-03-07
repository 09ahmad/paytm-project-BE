import express, { Request, Response } from "express";
import cors from "cors";
import { passwordSchema, usernameSchema } from "./validation";
import { UserModel } from "./db";
import dotenv from "dotenv";
import { router } from "./routes";
dotenv.config();
const app = express();
app.use(express.json());
app.use(cors());
app.use("/api/v1", router);

if (!process.env.PORT && !process.env.JWT_SECRET) {
  throw new Error("either PORT is undefined or JWT_SECRET is undefined");
}
const port = process.env.PORT || 3000;
const secret = process.env.JWT_SECRET;
router.post("/signup", async (req: Request, res: Response) => {
  try {
    const existingUser = await UserModel.findOne({
      username: req.body.username,
    });
    if (existingUser) {
      res.json({
        message: "user already exist",
      });
      return;
    }
    const validateUsername = usernameSchema.safeParse(req.body.username);
    const validatePassword = passwordSchema.safeParse(req.body.password);

    if (!validateUsername.success && !validatePassword.success) {
      res.json({
        message: "Validation faild",
      });
      return;
    }
    console.log(req.body);
    const { firstName, lastName, username, password } = req.body;

    const newUser = await UserModel.create({
      firstName: firstName,
      lastName: lastName,
      username: username,
      password: password,
    });
  } catch (error) {
    console.error("Error while creating new user", error);
  }
  res.json({
    message: "User created successfully",
  });
});

router.post("/signin", async (req: Request, res: Response) => {});

router.post("/update", async (req: Request, res: Response) => {});

app.listen(port, () => {
  console.log("http://localhost:", port);
});
