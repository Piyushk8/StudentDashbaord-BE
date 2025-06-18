// models/ContestParticipation.ts
import mongoose, { Schema, HydratedDocument, Model } from "mongoose";
import { IContestParticipation } from "../types/student";

const contestParticipationSchema = new Schema<IContestParticipation>(
  {
    studentId: {
      type: Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    contestId: {
      type: Number,
      required: true,
    },
    contestName: {
      type: String,
      maxlength: 255,
    },
    rank: {
      type: Number,
      required: true,
      min: [1, "Rank must be a positive number"],
    },
    oldRating: {
      type: Number,
      default: 0,
      min: [0, "Old rating must be non-negative"],
    },
    newRating: {
      type: Number,
      default: 0,
      min: [0, "New rating must be non-negative"],
    },
    problemsSolved: {
      type: Number,
      default: 0,
      min: 0,
    },
    contestTime: {
      type: Date,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
  }
);


const ContestParticipation: Model<IContestParticipation> = mongoose.model(
  "ContestParticipation",
  contestParticipationSchema
);

export default ContestParticipation;
