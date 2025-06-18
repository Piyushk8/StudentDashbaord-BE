import mongoose, { Schema, Document } from "mongoose";
import { z } from "zod";

export interface ISubmission extends Document {
  cfSubmissionId: number;
  studentId: mongoose.Types.ObjectId;
  contestId?: number;
  problemId: string;
  problemName: string;
  problemRating: number;
  problemTags: string[];
  submissionTime: Date;
  verdict: string;
  language: string;
  timeMs?: number;
  memoryConsumedBytes?: number;
  isContestSubmission?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  passedTestCount:Number
}

const submissionSchema = new Schema<ISubmission>(
  {
    cfSubmissionId: { type: Number, required: true, unique: true },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    passedTestCount: { type: Number },
    contestId: { type: Number },
    problemId: { type: String, required: true },
    problemName: { type: String, required: true },
    problemRating: { type: Number,required:true },
    problemTags: { type: [String], default: [] },
    submissionTime: { type: Date, required: true },
    verdict: { type: String, required: true },
    language: { type: String, required: true },
    timeMs: { type: Number, default: 0 },
    memoryConsumedBytes: { type: Number, default: 0 },
    isContestSubmission: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<ISubmission>("Submission", submissionSchema);
