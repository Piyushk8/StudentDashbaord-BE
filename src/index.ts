import express from "express";
import dotenv from "dotenv";
import connectDB from "./db";
import cors from "cors"
import { StudentRouter } from "./routes/student";
dotenv.config();
const app = express();
connectDB();

app.use(cors({origin:["http://localhost:5173"]}))

app.use("/s",StudentRouter)
const PORT = 3000;

app.listen(PORT, () => {
  console.log("listen at ", PORT);
});
