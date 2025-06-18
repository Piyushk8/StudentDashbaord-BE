// types/contestParticipation.ts
import { Types } from "mongoose";
// types/student.ts
export interface IStudent {
  name: string;
  email: string;
  phone?: string;
  cfHandle: string;
  currentRating?: number;
  maxRating?: number;
  lastSyncedAt?: Date;
  reminderCount?: number;
  autoReminder?: boolean;
  isActive:boolean;
  lastSync:Date;
  lastUpdated:Date
}


export interface IContestParticipation {
  studentId: Types.ObjectId; // or string if you prefer
  contestId: number;
  contestName?: string;
  rank: number;
  oldRating?: number;
  newRating?: number;
  problemsSolved?: number;
  contestTime: Date;
  createdAt?: Date;
}

