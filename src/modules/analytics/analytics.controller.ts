import { Response } from 'express';
import { prisma } from '../../config/prisma';
import { AuthRequest } from '../../middleware/auth.middleware';

export class AnalyticsController {
  public static async getOverview(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;

      // 1. Fetch user cards
      const cards = await prisma.flashcard.findMany({
        where: { deck: { userId } },
        include: {
          deck: {
            select: { id: true, title: true, colorHex: true },
          },
        },
      });

      // 2. Fetch user review logs
      const reviews = await prisma.cardReview.findMany({
        where: { userId },
        orderBy: { reviewedAt: 'desc' },
      });

      const now = new Date();
      const totalCards = cards.length;
      const masteredCards = cards.filter((c) => c.masteryStatus === 'mastered').length;
      const unmasteredCards = cards.filter((c) => c.masteryStatus !== 'mastered').length;
      const dueToday = cards.filter(
        (c) => new Date(c.nextReviewDate) <= now || c.timesReviewed === 0
      ).length;

      // Retention rate calculation
      let retentionRate = 0;
      if (reviews.length > 0) {
        const successfulReviews = reviews.filter(
          (r) => r.rating === 'good' || r.rating === 'easy'
        ).length;
        retentionRate = (successfulReviews / reviews.length) * 100;
      } else {
        const totalHistoricalReviews = cards.reduce((sum, c) => sum + c.timesReviewed, 0);
        const totalHistoricalForgot = cards.reduce((sum, c) => sum + c.timesForgot, 0);
        if (totalHistoricalReviews > 0) {
          retentionRate =
              ((totalHistoricalReviews - totalHistoricalForgot) / totalHistoricalReviews) * 100;
        }
      }

      // Real consecutive-day streak calculation based on review timestamps (UTC+8 Asia/Manila)
      const reviewDateSet = new Set<string>();
      const toDateKey = (d: Date) => {
        const phTime = new Date(d.getTime() + 8 * 60 * 60 * 1000);
        return phTime.toISOString().slice(0, 10);
      };

      const todayKey = toDateKey(now);

      for (const r of reviews) {
        reviewDateSet.add(toDateKey(new Date(r.reviewedAt)));
      }
      for (const c of cards) {
        if (c.lastReviewedDate) {
          reviewDateSet.add(toDateKey(new Date(c.lastReviewedDate)));
        }
      }

      const reviewsTodayFromLogs = reviews.filter(
        (r) => toDateKey(new Date(r.reviewedAt)) === todayKey
      ).length;
      const reviewsTodayFromCards = cards.filter(
        (c) => c.lastReviewedDate && toDateKey(new Date(c.lastReviewedDate)) === todayKey
      ).length;
      const reviewedToday = Math.max(reviewsTodayFromLogs, reviewsTodayFromCards);

      let streakDays = 0;
      if (reviewDateSet.size > 0) {
        const yesterdayKey = toDateKey(new Date(now.getTime() - 24 * 60 * 60 * 1000));

        // Streak is active if user studied today or yesterday
        if (reviewDateSet.has(todayKey) || reviewDateSet.has(yesterdayKey)) {
          let cursor = reviewDateSet.has(todayKey)
              ? now
              : new Date(now.getTime() - 24 * 60 * 60 * 1000);
          while (reviewDateSet.has(toDateKey(cursor))) {
            streakDays++;
            cursor = new Date(cursor.getTime() - 24 * 60 * 60 * 1000);
          }
        }
      }

      // 4-Stage Learning Funnel & Graduated Progress
      const newCards = cards.filter((c) => c.timesReviewed === 0).length;
      const learningCards = cards.filter((c) => c.timesReviewed > 0 && c.masteryStatus === 'learning').length;
      const reviewingCards = cards.filter((c) => c.masteryStatus === 'reviewing').length;
      const weightedScore = (learningCards * 0.25) + (reviewingCards * 0.60) + (masteredCards * 1.0);
      const graduatedProgress = totalCards > 0 ? Math.min(1.0, Math.max(0.0, weightedScore / totalCards)) : 0.0;
      const graduatedProgressPercentage = Math.round(graduatedProgress * 100);

      // Weakness Radar: unmastered cards with >= 2 reviews and failure rate >= 40% or ease factor < 1.9.
      // Also surface "mastered" cards with EF < 2.0 — these were mastered under old lenient rules
      // and still represent a real knowledge gap despite their status badge.
      const weakCards = cards
        .filter((c) => {
          if (c.masteryStatus === 'mastered' && c.easeFactor >= 2.0) return false; // Genuinely mastered — graduated
          if (c.timesReviewed < 2) return false;
          const failRate = c.timesForgot / c.timesReviewed;
          return (c.timesForgot > 0 && failRate >= 0.4) || c.easeFactor < 1.9;
        })
        .map((c) => ({
          id: c.id,
          deckId: c.deckId,
          deckTitle: c.deck.title,
          question: c.question,
          easeFactor: c.easeFactor,
          timesReviewed: c.timesReviewed,
          timesForgot: c.timesForgot,
          failureRate: Number(((c.timesForgot / c.timesReviewed) * 100).toFixed(0)),
        }));

      // SM-2 distribution
      const shortTerm = cards.filter((c) => c.intervalDays <= 1).length;
      const intermediate = cards.filter((c) => c.intervalDays > 1 && c.intervalDays <= 6).length;
      const mature = cards.filter((c) => c.intervalDays > 6).length;

      return res.json({
        success: true,
        data: {
          metrics: {
            totalCards,
            newCards,
            learningCards,
            reviewingCards,
            masteredCards,
            unmasteredCards,
            graduatedProgress,
            graduatedProgressPercentage,
            dueToday,
            reviewedToday,
            retentionRate: Number(retentionRate.toFixed(1)),
            totalReviews: reviews.length,
            streakDays,
            activeReviewDates: Array.from(reviewDateSet),
          },
          weaknessRadar: weakCards,
          intervalDistribution: {
            shortTerm,
            intermediate,
            mature,
          },
        },
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
}
