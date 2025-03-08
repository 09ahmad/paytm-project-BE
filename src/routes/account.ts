import express, { Request, Response } from "express";
import { authMiddleware } from "../middleware";
import { Account, UserModel } from "../db";
import mongoose from "mongoose";
const router = express.Router();

router.get("/balance", authMiddleware, async (req: Request, res: Response) => {
  try {
    const account = await Account.findOne({
      userId: req.userId,
    });
    if (!account) {
      res.status(404).json({
        message: "balance does not exists",
      });
      return;
    }
    res.status(200).json({
      balance: account?.balance,
    });
  } catch (error) {
    res.json({
      message: "Unable to fetch the balance",
    });
  }
});

router.post("/transfer",authMiddleware,async (req: Request, res: Response) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    const { amount, to } = req.body;
    const account = await Account.findOne({ userId: req.userId }).session(
      session,
    );
    console.log(account?.balance)
    if (!account || !account.balance > amount) {
        await session.abortTransaction();
        res.status(407).json({
            message: " Either account does not exist or Insufficient balance",
          });
          return;
        }
        
    const toAccount = await Account.findOne({
      userId: to,
    }).session(session);
    if (!toAccount) {
      res.status(407).json({
        message: "Invalid account",
      });
      return;
    }

    // Perform Transaction
    await Account.updateOne(
      { userId: req.userId },
      { $inc: { balance: -amount } },
    ).session(session);
    await Account.updateOne(
      { userId: to },
      { $inc: { balance: amount } },
    ).session(session);
    // commit transaction
    session.commitTransaction();
    res.status(200).json({
      message: "Transaction successful",
    });
  },
);
export default router;
