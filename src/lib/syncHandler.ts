import axios from "axios";
import { Types } from "mongoose";
import Student from "../models/student";
import { IStudent } from "../types/student";
import submissions, { ISubmission } from "../models/submissions";

export interface SyncResult {
  success: boolean;
  newSubmissions: number;
  dataOutdated?: boolean;
  message?: string;
  error?: string;
}

export async function syncStudentSubmissions(
  studentId: string
): Promise<SyncResult> {
  try {
    const student = await Student.findById(studentId);
    if (!student || !student.cfHandle) {
      return {
        success: false,
        newSubmissions: 0,
        error: "Student or Codeforces handle not found",
      };
    }

    // to Determine last stored submission ID
    const lastSub = await submissions
      .findOne({ studentId: student._id })
      .sort({ cfSubmissionId: -1 })
      .lean();
    const lastStoredId = lastSub?.cfSubmissionId ?? 0;

    //  first page with latest CF submission
    const firstPage = await axios.get(
      "https://codeforces.com/api/user.status",
      {
        params: { handle: student.cfHandle, from: 1, count: 100 },
        timeout: 10000,
      }
    );
    if (firstPage.data.status !== "OK") {
      return {
        success: false,
        newSubmissions: 0,
        error: `CF API error: ${firstPage.data.comment || "Unknown"}`,
      };
    }
    const firstSubs = firstPage.data.result as any[];
    if (firstSubs.length === 0) {
      student.lastSync = new Date();
      await student.save();
      return {
        success: true,
        newSubmissions: 0,
        message: "No CF submissions found.",
      };
    }

    const latestCfId = firstSubs[0].id as number;
    console.log(student);
    console.log("latest CF", latestCfId);
    console.log("latest Data Sub", lastStoredId);

    if (lastStoredId > 0 && latestCfId < lastStoredId) {
      return {
        success: false,
        newSubmissions: 0,
        dataOutdated: true,
        message: `Data mismatch: latest CF ID ${latestCfId} < stored ID ${lastStoredId}`,
      };
    }

    // No new submissions
    if (latestCfId === lastStoredId) {
      student.lastSync = new Date();
      await student.save();
      return {
        success: true,
        newSubmissions: 0,
        message: "Already up-to-date.",
      };
    }

    // Fetch only new submissions 
    const toInsert = [];

    
    const batchSize = 100;
    let from = 1;
    let totalFetched = 0;

    while (true) {
      console.log(`Fetching batch starting from position ${from}`);

      const response =
        from === 1
          ? { data: { result: firstSubs } }
          : await axios.get("https://codeforces.com/api/user.status", {
              params: { handle: student.cfHandle, from, count: batchSize },
              timeout: 10000,
            });

      const subsBatch = response.data.result as any[];
      console.log(`Fetched ${subsBatch.length} submissions in this batch`);
      totalFetched += subsBatch.length;

      if (subsBatch.length === 0) {
        console.log("No more submissions available");
        break;
      }

      let foundNewSubmissions = false;

      for (const s of subsBatch) {
        if (s.id <= lastStoredId) {
          console.log(
            `Hit existing submission ID ${s.id} (stored: ${lastStoredId}), stopping`
          );
          foundNewSubmissions = false;
          break;
        }

        foundNewSubmissions = true;

        const submissionData = {
          studentId: student._id,
          cfSubmissionId: Number(s.id),
          problemId: `${s.problem.contestId}${s.problem.index}`,
          problemName: String(s.problem.name || "Unknown Problem"),
          problemRating: s.problem.rating ? Number(s.problem.rating) : 0,
          submissionTime: new Date(s.creationTimeSeconds * 1000),
          verdict: String(s.verdict || "UNKNOWN"),
          contestId: s.problem.contestId
            ? Number(s.problem.contestId)
            : undefined,
          problemTags: Array.isArray(s.problem.tags) ? s.problem.tags : [],
          language: String(s.programmingLanguage || "Unknown"),
          timeMs: s.timeConsumedMillis ? Number(s.timeConsumedMillis) : 0,
          memoryConsumedBytes: s.memoryConsumedBytes
            ? Number(s.memoryConsumedBytes)
            : 0,
          isContestSubmission: s.author?.participantType === "CONTESTANT",
          passedTestCount: s.passedTestCount
            ? Number(s.passedTestCount)
            : undefined,
        };

        toInsert.push(submissionData);
      }

      if (!foundNewSubmissions) {
        console.log("No new submissions found in this batch, stopping");
        break;
      }
      //unitl latest submission in our local DB
      if (subsBatch.length < batchSize) {
        console.log("Reached end of all submissions");
        break;
      }

      from += batchSize;
  if (totalFetched >= 1000) {
        console.log("Safety limit reached - fetched 1000 submissions");
        break;
      }
    }


    let insertedCount = 0;
    if (toInsert.length) {
      console.log(`Attempting to insert ${toInsert.length} new submissions`);

    //   console.log(
    //     "Sample submissions:",
    //     toInsert.slice(0, 3).map((s) => ({
    //       cfSubmissionId: s.cfSubmissionId,
    //       problemId: s.problemId,
    //       problemRating: s.problemRating,
    //       verdict: s.verdict,
    //     }))
    //   );

      try {
        const bulk = toInsert.map((doc) => ({ insertOne: { document: doc } }));
        const result = await submissions.bulkWrite(bulk, { ordered: false });
        console.log("Bulk insert result:", result);

        insertedCount = result.insertedCount || 0;

      } catch (err: any) {
        console.error("Bulk insert error:", err);


        // Get actual inserted count from the error result if available
        if (err.result) {
          insertedCount = err.result.insertedCount || 0;
          console.log(
            `Partial success: ${insertedCount} out of ${toInsert.length} inserted`
          );
        }

        if (insertedCount === 0) {
          return {
            success: false,
            newSubmissions: 0,
            error: `Bulk insert failed: ${err.message}`,
          };
        }
      }

      console.log(
        `Successfully inserted ${insertedCount} out of ${toInsert.length} submissions`
      );
    }

    student.lastSync = new Date();
    await student.save();

    return {
      success: true,
      newSubmissions: insertedCount,
      message: insertedCount
        ? `Synced ${insertedCount} new submissions.`
        : "No new submissions synced.",
    };
  } catch (err: any) {
    console.error("Sync error:", err);
    return {
      success: false,
      newSubmissions: 0,
      error: err.message || "Unknown sync failure",
    };
  }
}



export interface ContestSyncResult {
  success: boolean;
  newContests: number;
  dataOutdated?: boolean;
  message?: string;
  error?: string;
}
import { Request, Response } from "express"; // Adjust import path as needed
import ContestParticipation from "../models/contest";

// Sync function for contest participations
export async function syncStudentContests(studentId: string): Promise<ContestSyncResult> {
  try {
    const student = await Student.findById(studentId);
    if (!student || !student.cfHandle) {
      return {
        success: false,
        newContests: 0,
        error: "Student or Codeforces handle not found",
      };
    }

    // Determine the last stored contest participation
    const lastContest = await ContestParticipation.findOne({ studentId: student._id })
      .sort({ contestTime: -1 })
      .lean();
    const lastStoredTime = lastContest ? lastContest.contestTime.getTime() : 0;

    // Fetch contest participations from Codeforces
    const response = await axios.get("https://codeforces.com/api/user.rating", {
      params: { handle: student.cfHandle },
      timeout: 10000,
    });
    if (response.data.status !== "OK") {
      return {
        success: false,
        newContests: 0,
        error: `CF API error: ${response.data.comment || "Unknown"}`,
      };
    }
    const contestParticipations = response.data.result as any[];

    if (contestParticipations.length === 0) {
      student.lastSync = new Date();
      await student.save();
      return {
        success: true,
        newContests: 0,
        message: "No contest participations found.",
      };
    }

    // Filter new contest participations
    const newParticipations = contestParticipations.filter(
      (participation) => new Date(participation.ratingUpdateTimeSeconds * 1000).getTime() > lastStoredTime
    );

    if (newParticipations.length === 0) {
      student.lastSync = new Date();
      await student.save();
      return {
        success: true,
        newContests: 0,
        message: "Already up-to-date.",
      };
    }

    // Prepare data for insertion
    const toInsert = newParticipations.map((participation) => ({
      studentId: student._id,
      contestId: participation.contestId,
      contestName: participation.contestName,
      rank: participation.rank,
      oldRating: participation.oldRating,
      newRating: participation.newRating,
      problemsSolved: participation.problemsSolved || 0, // Adjust if API provides this
      contestTime: new Date(participation.ratingUpdateTimeSeconds * 1000),
    }));

    // Insert new contest participations
    let insertedCount = 0;
    if (toInsert.length) {
      const bulk = toInsert.map((doc) => ({ insertOne: { document: doc } }));
      const result = await ContestParticipation.bulkWrite(bulk, { ordered: false });
      insertedCount = result.insertedCount;
    }

    // Update last sync time
    student.lastSync = new Date();
    await student.save();

    return {
      success: true,
      newContests: insertedCount,
      message: insertedCount
        ? `Synced ${insertedCount} new contest participations.`
        : "No new contest participations synced.",
    };
  } catch (err: any) {
    console.error("Sync error:", err);
    return {
      success: false,
      newContests: 0,
      error: err.message || "Unknown sync failure",
    };
  }
}

