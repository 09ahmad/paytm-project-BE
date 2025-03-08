import mongoose, { isObjectIdOrHexString, model, SchemaTypes } from "mongoose";
import { Schema } from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const config = {
  MONGODB_URL: process.env.MONGODB_URL,
};

if (!config.MONGODB_URL) {
  throw new Error("something wrong with MONGODB_URL");
}

mongoose
  .connect(config.MONGODB_URL)
  .then(() => console.log("Connected to mongodb "))
  .catch((error) => console.log("MONGODB connection error ", error));

const UserSchema = new Schema({
  firstName: {
    type: String,
    required: true,
    trim: true,
    masLength: 20,
  },
  lastName: {
    type: String,
    required: true,
    trim: true,
    maxLength: 20,
  },
  username: {
    type: String,
    required: true,
    trim: true,
    unique: true,
    minLength: 5,
    maxLength: 20,
  },
  password: {
    type: String,
    required: true,
    minLength: 6,
  },
});

const AccountSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  balance: {
    type: Number,
    required: true,
  },
});

export const UserModel = model("User", UserSchema);
export const Account = model("Accoun", AccountSchema);
