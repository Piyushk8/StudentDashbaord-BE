import { Request, Response } from "express";
import Student from "../models/student";
import { HydratedDocument } from "mongoose";
import { parseISO, subDays } from "date-fns";
import submissions from "../models/submissions";
import { IStudent } from "../types/student";
import ContestParticipation from "../models/contest";

export const getAllStudents = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const students: HydratedDocument<IStudent>[] = await Student.find().sort({
      createdAt: -1,
    });
    res.status(200).json(students);
  } catch (err) {
    res.status(500).json({ error: "Server Error" });
  }
};

export const getStudentById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const student: HydratedDocument<IStudent> | null = await Student.findById(
      req.params.id
    );
    if (!student) {
      res.status(404).json({ error: "Student not found" });
      return;
    }
    res.status(200).json(student);
  } catch (err) {
    res.status(500).json({ error: "Server Error" });
  }
};

export const getStudentContestHistory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const days = parseInt(req.query.days as string) || 365;
    const fromDate = subDays(new Date(), days);

    const history = await ContestParticipation.find({
      studentId: id,
      contestTime: { $gte: fromDate },
    }).sort({ contestTime: -1 });

    res.json(history);
  } catch (err) {
    console.error("Contest History Error:", err);
    res.status(500).json({ error: "Failed to fetch contest history." });
  }
};
export const getStudentContestStats = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const days = parseInt(req.query.days as string) || 365;
    const fromDate = subDays(new Date(), days);

    const contests = await ContestParticipation.find({
      studentId: id,
      contestTime: { $gte: fromDate },
    }).sort({ contestTime: 1 }); // chronological order for rating graph
    
    const ratings = contests.map((c) => c.newRating || c.oldRating || 0);
    const ratingGraph = contests.map((c) => ({
      time: c.contestTime,
      rating: c.newRating || c.oldRating || 0,
      contest: c.contestName || 'Unknown Contest',
      rank: c.rank
    }));

    const avgRating = ratings.length
      ? Math.round(ratings.reduce((a, b) => a + b, 0) / ratings.length)
      : 0;

    const avgRank = contests.length
      ? Math.round(contests.reduce((a, b) => a + b.rank, 0) / contests.length)
      : 0;

    const totalProblemsSolved = contests.reduce(
      (sum, c) => sum + (c.problemsSolved || 0),
      0
    );

    // Calculate rating improvement
    const firstRating = contests.length > 0 ? (contests[0].oldRating || contests[0].newRating || 0) : 0;
    const lastRating = contests.length > 0 ? (contests[contests.length - 1].newRating || 0) : 0;
    const ratingImprovement = lastRating - firstRating;

    res.json({
      totalContests: contests.length,
      ratingGraph,
      avgRating,
      avgRank,
      totalProblemsSolved,
      ratingImprovement,
      currentRating: lastRating
    });
  } catch (err) {
    console.error("Contest Stats Error:", err);
    res.status(500).json({ error: "Failed to calculate contest statistics." });
  }
};

export const getStudentProblemStats = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const days = parseInt(req.query.days as string) || 30;
    const fromDate = subDays(new Date(), days);

    const solvedProblems = await submissions.find({
      studentId: id,
      verdict: 'OK',
      submissionTime: { $gte: fromDate },
    }).sort({ submissionTime: 1 });
    const uniqueProblems = solvedProblems.reduce((acc, submission) => {
      const key = submission.problemId;
      if (!acc[key] || submission.submissionTime > acc[key].submissionTime) {
        acc[key] = submission;
      }
      return acc;
    }, {} as Record<string, any>);

    const uniqueSolvedProblems = Object.values(uniqueProblems);
    const totalSolved = uniqueSolvedProblems.length;

    const problemsWithRating = uniqueSolvedProblems.filter(p => p.problemRating && p.problemRating > 0);
    const ratingsSum = problemsWithRating.reduce((sum, problem) => sum + problem.problemRating, 0);
    const averageRating = problemsWithRating.length > 0 ? Math.round(ratingsSum / problemsWithRating.length) : 0;

    const daysDiff = Math.max(1, Math.ceil((new Date().getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)));
    const avgProblemsPerDay = Math.round((totalSolved / daysDiff) * 10) / 10;

    const mostDifficult = problemsWithRating.reduce((max, problem) => {
      return (problem.problemRating || 0) > (max?.problemRating || 0) ? problem : max;
    }, null as any);

    // Calculates rating distribution for bar chart
    const ratingDistribution: Record<string, number> = {
      "800-999": 0,
      "1000-1199": 0,
      "1200-1399": 0,
      "1400-1599": 0,
      "1600-1799": 0,
      "1800-1999": 0,
      "2000+": 0,
    };

    problemsWithRating.forEach(problem => {
      const rating = problem.problemRating;
      if (rating >= 800 && rating <= 999) ratingDistribution["800-999"]++;
      else if (rating >= 1000 && rating <= 1199) ratingDistribution["1000-1199"]++;
      else if (rating >= 1200 && rating <= 1399) ratingDistribution["1200-1399"]++;
      else if (rating >= 1400 && rating <= 1599) ratingDistribution["1400-1599"]++;
      else if (rating >= 1600 && rating <= 1799) ratingDistribution["1600-1799"]++;
      else if (rating >= 1800 && rating <= 1999) ratingDistribution["1800-1999"]++;
      else if (rating >= 2000) ratingDistribution["2000+"]++;
    });

    // Generates submission heatmap
    const heatmap: Record<string, number> = {};
    
    const currentDate = new Date(fromDate);
    while (currentDate <= new Date()) {
      const dateStr = currentDate.toISOString().split('T')[0];
      heatmap[dateStr] = 0;
      currentDate.setDate(currentDate.getDate() + 1);
    }

    solvedProblems.forEach(submission => {
      const dateStr = submission.submissionTime.toISOString().split('T')[0];
      if (heatmap.hasOwnProperty(dateStr)) {
        heatmap[dateStr]++;
      }
    });

    // Calculates language distribution
    const languageStats: Record<string, number> = {};
    solvedProblems.forEach(submission => {
      const lang = submission.language;
      languageStats[lang] = (languageStats[lang] || 0) + 1;
    });

    const response = {
      totalSolved,
      averageRating,
      avgProblemsPerDay,
      mostDifficult: mostDifficult ? {
        name: mostDifficult.problemName,
        rating: mostDifficult.problemRating,
        problemId: mostDifficult.problemId
      } : null,
      ratingDistribution,
      heatmap,
      languageStats,
      totalSubmissions: solvedProblems.length
    };
    // console.log("----------")
    // console.log("----------")
    // console.log("----------")
    // console.log(response)
    // console.log("----------")
    res.json(response);
  } catch (err) {
    console.error("Problem Stats Error:", err);
    res.status(500).json({ error: "Failed to calculate problem statistics." });
  }
};


export const getStudentRecentProblems = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const days = parseInt(req.query.days as string) || 30;
    const limit = parseInt(req.query.limit as string) || 50;
    const fromDate = subDays(new Date(), days);

    const recentProblems = await submissions.find({
      studentId: id,
      verdict: 'OK',
      submissionTime: { $gte: fromDate },
    })
    .sort({ submissionTime: -1 })
    .limit(limit)
    .select('problemId problemName problemRating problemTags submissionTime language timeMs memoryBytes');
    console.log(recentProblems)
    res.json(recentProblems);
  } catch (err) {
    console.error("Recent Problems Error:", err);
    res.status(500).json({ error: "Failed to fetch recent problems." });
  }
};