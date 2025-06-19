import { Router } from "express";
import mongoose from "mongoose";
import {
    checkContestSyncStatus,
    checkSyncStatus,
  getAllStudents,
  getStudentById,
  getStudentContestHistory,
  getStudentContestStats,
  getStudentProblemStats,
  getStudentRecentProblems,
} from "../controllers/student";
export const StudentRouter = Router();
// const studentController = require('../controllers/studentController');

// CRUD operations
StudentRouter.get("/", getAllStudents);
StudentRouter.get("/:id", getStudentById);
StudentRouter.get("/:id/sync",checkSyncStatus)
StudentRouter.get("/:id/syncContest",checkContestSyncStatus)

StudentRouter.get("/:id/contests", getStudentContestHistory);
StudentRouter.get("/:id/contests/stats", getStudentContestStats);
StudentRouter.get("/:id/pstats", getStudentProblemStats);
StudentRouter.get("/:id/p", getStudentRecentProblems);

// router.post('/', studentController.createStudent);
// router.put('/:id', studentController.updateStudent);
// router.delete('/:id', studentController.deleteStudent);

// // Download CSV
// router.get('/download/csv', studentController.downloadCSV);
