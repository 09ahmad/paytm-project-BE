import express, { Request, Response } from "express";
import { authMiddleware } from "../middleware";
import { Account, UserModel, Transaction } from "../db";
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

router.post("/transfer", authMiddleware, async (req: Request, res: Response) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    
    const { amount, to, description } = req.body;
    const fromUserId = req.userId;

    // Validation: Check if user is authenticated
    if (!fromUserId) {
      await session.abortTransaction();
      res.status(401).json({
        message: "Unauthorized",
      });
      return;
    }

    // Validation: Check if amount is provided and valid
    if (!amount || typeof amount !== "number" || amount <= 0) {
      await session.abortTransaction();
      res.status(400).json({
        message: "Invalid amount. Amount must be a positive number.",
      });
      return;
    }

    // Validation: Check if receiver ID is provided
    if (!to || typeof to !== "string") {
      await session.abortTransaction();
      res.status(400).json({
        message: "Invalid receiver ID",
      });
      return;
    }

    // Validation: Prevent self-transfer
    if (fromUserId.toString() === to.toString()) {
      await session.abortTransaction();
      res.status(400).json({
        message: "Cannot transfer money to yourself",
      });
      return;
    }

    // Step 1: Verify receiver user exists in database
    const toUser = await UserModel.findById(to).session(session);
    if (!toUser) {
      await session.abortTransaction();
      res.status(404).json({
        message: "Receiver user does not exist",
      });
      return;
    }

    // Step 2: Get sender account and verify balance
    const fromAccount = await Account.findOne({ userId: fromUserId }).session(session);
    if (!fromAccount) {
      await session.abortTransaction();
      res.status(404).json({
        message: "Sender account does not exist",
      });
      return;
    }

    if (fromAccount.balance < amount) {
      await session.abortTransaction();
      res.status(400).json({
        message: "Insufficient balance",
      });
      return;
    }

    // Step 3: Get receiver account (must exist)
    const toAccount = await Account.findOne({ userId: to }).session(session);
    if (!toAccount) {
      await session.abortTransaction();
      res.status(404).json({
        message: "Receiver account does not exist",
      });
      return;
    }

    // Step 4: Get sender user details for transaction record
    const fromUser = await UserModel.findById(fromUserId).session(session);
    if (!fromUser) {
      await session.abortTransaction();
      res.status(404).json({
        message: "Sender user does not exist",
      });
      return;
    }

    // Step 5: Perform the money transfer (deduct from sender, add to receiver)
    await Account.updateOne(
      { userId: fromUserId },
      { $inc: { balance: -amount } }
    ).session(session);

    await Account.updateOne(
      { userId: to },
      { $inc: { balance: amount } }
    ).session(session);

    // Step 6: Create transaction records (both sent and received)
    await Transaction.create(
      [
        {
          fromUserId: fromUserId,
          toUserId: to,
          amount: amount,
          type: "sent",
          description: description || `Sent to ${toUser.firstName} ${toUser.lastName}`,
          timestamp: new Date(),
        },
        {
          fromUserId: fromUserId,
          toUserId: to,
          amount: amount,
          type: "received",
          description: description || `Received from ${fromUser.firstName} ${fromUser.lastName}`,
          timestamp: new Date(),
        },
      ],
      { session }
    );

    // Step 7: Verify the transfer was successful by checking updated balances
    const updatedFromAccount = await Account.findOne({ userId: fromUserId }).session(session);
    const updatedToAccount = await Account.findOne({ userId: to }).session(session);

    if (!updatedFromAccount || !updatedToAccount) {
      await session.abortTransaction();
      res.status(500).json({
        message: "Transaction verification failed",
      });
      return;
    }

    // Commit transaction - all operations succeed together or fail together
    await session.commitTransaction();

    res.status(200).json({
      message: "Transaction successful",
      data: {
        fromBalance: updatedFromAccount.balance,
        toBalance: updatedToAccount.balance,
        amount: amount,
        receiver: {
          name: `${toUser.firstName} ${toUser.lastName}`,
          username: toUser.username,
        },
      },
    });
  } catch (error: any) {
    await session.abortTransaction();
    console.error("Transfer error:", error);
    res.status(500).json({
      message: "Transaction failed",
      error: error.message || "An unexpected error occurred",
    });
  } finally {
    session.endSession();
  }
});

// Get transaction history
router.get("/transactions", authMiddleware, async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    const type = req.query.type as string | undefined;

    const query: { $or: Array<{ fromUserId: mongoose.Types.ObjectId; type?: string } | { toUserId: mongoose.Types.ObjectId; type?: string }> } = {
      $or: [
        { fromUserId: req.userId as unknown as mongoose.Types.ObjectId },
        { toUserId: req.userId as unknown as mongoose.Types.ObjectId },
      ],
    };

    if (type) {
      query.$or = query.$or.map((q) => ({ ...q, type }));
    }

    const transactions = await Transaction.find(query)
      .populate("fromUserId", "firstName lastName username")
      .populate("toUserId", "firstName lastName username")
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Transaction.countDocuments(query);

    res.status(200).json({
      transactions: transactions.map((t: any) => ({
        _id: t._id,
        fromUser: {
          _id: (t.fromUserId as any)._id,
          firstName: (t.fromUserId as any).firstName,
          lastName: (t.fromUserId as any).lastName,
          username: (t.fromUserId as any).username,
        },
        toUser: {
          _id: (t.toUserId as any)._id,
          firstName: (t.toUserId as any).firstName,
          lastName: (t.toUserId as any).lastName,
          username: (t.toUserId as any).username,
        },
        amount: t.amount,
        type: t.type,
        description: t.description,
        timestamp: t.timestamp,
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch transactions",
    });
  }
});

// Get transaction statistics
router.get("/stats", authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.userId as unknown as mongoose.Types.ObjectId;

    const sentTransactions = await Transaction.find({
      fromUserId: userId,
      type: "sent",
    });
    const receivedTransactions = await Transaction.find({
      toUserId: userId,
      type: "received",
    });

    const totalSent = sentTransactions.reduce((sum: number, t: any) => sum + t.amount, 0);
    const totalReceived = receivedTransactions.reduce((sum: number, t: any) => sum + t.amount, 0);
    const transactionCount = sentTransactions.length + receivedTransactions.length;

    // Get recent transactions count (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentCount = await Transaction.countDocuments({
      $or: [
        { fromUserId: userId },
        { toUserId: userId },
      ],
      timestamp: { $gte: thirtyDaysAgo },
    });

    res.status(200).json({
      totalSent,
      totalReceived,
      transactionCount,
      recentCount,
      netAmount: totalReceived - totalSent,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch statistics",
    });
  }
});

export default router;
