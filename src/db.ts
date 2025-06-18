import mongoose from "mongoose";

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGO_URI || "";
    if (!mongoURI) throw new Error("no uri provided");
    await mongoose.connect(mongoURI);
    console.log("✅ MongoDB Connected");
  } catch (err) {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  }
};

export default connectDB;
