import mongoose, { model } from "mongoose";
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
    require: true,
    trim: true,
    masLength: 20,
  },
  lastName: {
    type: String,
    require: true,
    trim: true,
    maxLength: 20,
  },
  username: {
    type: String,
    require: true,
    trim: true,
    unique: true,
    minLength: 5,
    maxLength: 20,
  },
  password: {
    type: String,
    require: true,
    minLength: 6,
  },
});

export const UserModel = model("User", UserSchema);
