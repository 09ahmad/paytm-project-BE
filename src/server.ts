import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import  mainRouter  from "./routes/index";
dotenv.config();
const app = express();
app.use(express.json());
app.use(cors());
app.use("/api/v1", mainRouter);

if (!process.env.PORT && !process.env.JWT_SECRET) {
  throw new Error("either PORT is undefined or JWT_SECRET is undefined");
}
const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log("http://localhost:", port);
});