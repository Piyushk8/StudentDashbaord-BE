// models/CronSettings.js
import mongoose from "mongoose";

const cronSettingsSchema = new mongoose.Schema({
  syncTime: { type: String, default: "0 2 * * *" }, // default: 2 AM daily (cron syntax)
  frequency: { type: String, enum: ["daily", "weekly"], default: "daily" },
});

module.exports = mongoose.model("CronSettings", cronSettingsSchema);
