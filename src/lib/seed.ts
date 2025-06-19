// seedCFData.ts
import axios from "axios";
import mongoose from "mongoose";
import dotenv from "dotenv";
import Student from "../models/student";
import ContestParticipation from "../models/contest";
import submissions from "../models/submissions";
dotenv.config();

const CF_HANDLES = [
  "tourist",
  "Benq",
  "Petr",
  "maroonrk",
  "Radewoosh",
  "Um_nik",
  "ecnerwala",
  "neal",
  "krijgertje",
];

const DB_URI =
  process.env.MONGO_URI || "mongodb://localhost:27017/student-progress";

// async function seedCFUsers() {
//   const res = await axios.get(
//     `https://codeforces.com/api/user.info?handles=${CF_HANDLES.join(";")}`
//   );
//   console.log("hanldes",res)
//   for (const user of res.data.result) {
//     const existing = await Student.findOne({ cfHandle: user.handle });
//     if (!existing) {
//       await Student.create({
//         name: user.firstName || user.handle,
//         email: `${user.handle}@cf.test`,
//         phone: "0000000000",
//         cfHandle: user.handle,
//         currentRating: user.rating || 0,
//         maxRating: user.maxRating || 0,
//         lastSync: new Date(),
//       });
//       console.log(`Created ${user.handle}`);
//     }
//   }
// }

// async function seedCFContestData() {
//   const students = await Student.find({ cfHandle: { $exists: true } });
//   for (const student of students) {
//     const res = await axios.get(
//       `https://codeforces.com/api/user.rating?handle=${student.cfHandle}`
//     );
//     for (const entry of res.data.result) {
//       const exists = await ContestParticipation.findOne({
//         studentId: student._id,
//         contestId: entry.contestId,
//       });
//       if (!exists) {
//         await ContestParticipation.create({
//           studentId: student._id,
//           contestId: entry.contestId,
//           contestName: entry.contestName,
//           rank: entry.rank,
//           oldRating: entry.oldRating,
//           newRating: entry.newRating,
//           contestTime: new Date(entry.ratingUpdateTimeSeconds * 1000),
//           problemsSolved: Math.floor(Math.random() * 7) + 1, // mock value
//         });
//       }
//     }
//     console.log(`Seeded contests for ${student.cfHandle}`);
//   }
// }

export const seedCFSubmissions = async () => {
  const students = await Student.find({
    cfHandle: { $exists: true, $ne: null },
  });

  for (const student of students) {
    try {
      const { cfHandle } = student;
      const response = await axios.get(
        `https://codeforces.com/api/user.status?handle=${cfHandle}&from=1&count=100`
      );
      const { result: submissionsFetched } = response.data;

      const filtered = submissionsFetched
        .filter((s: any) => s.verdict === "OK" && s.problem)
        .map((s: any) => ({
          studentId: student._id,
          cfSubmissionId: s.id,
          problemId: `${s.problem.contestId}${s.problem.index}`, // e.g., 1234A
          problemName: s.problem.name,
          problemRating: s.problem.rating,
          submissionTime: new Date(s.creationTimeSeconds * 1000),
          verdict: s.verdict,
          contestId:s.problem.contestId,
          problemTags: s.problem.tags,
          language: s.programmingLanguage,
          timeMs: s.timeConsumedMillis,
          memoryConsumedBytes: s.memoryConsumedBytes,
          isContestSubmission: s.author.participantType === "CONTESTANT",
        }));
      for (const sub of filtered) {
        try {
          // Upsert to prevent duplicate submissions
          await submissions.updateOne(
            { studentId: sub.studentId, cfSubmissionId: sub.cfSubmissionId },
            { $setOnInsert: sub },
            { upsert: true }
          );
        } catch (err: unknown) {
          if (err instanceof Error) {
            console.error(
              `Failed to insert submission ${sub.cfSubmissionId}:`,
              err.message
            );
          } else {
            console.error("failed to insert", JSON.stringify(err));
          }
        }
      }

      console.log(`✅ Synced ${filtered.length} submissions for ${cfHandle}`);
    } catch (err: any) {
      console.error(
        `❌ Error fetching submissions for ${student.cfHandle}: ${err.message}`
      );
    }
  }
};
(async () => {
  try {
    await mongoose.connect(DB_URI);
    console.log("MongoDB connected");
    // await seedCFUsers();
    // await seedCFContestData();
    await seedCFSubmissions();
    console.log("✅ All data seeded.");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error seeding data", err);
    process.exit(1);
  }
})();
