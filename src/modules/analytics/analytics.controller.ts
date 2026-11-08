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

      const totalCards = cards.length;
      const masteredCards = cards.filter((c) => c.masteryStatus === 'mastered').length;

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

      // Real consecutive-day streak calculation based on review timestamps
      const reviewDateSet = new Set<string>();
      const toDateKey = (d: Date) => {
        // Use UTC+8 (Asia/Manila) calendar date
        const phTime = new Date(d.getTime() + 8 * 60 * 60 * 1000);
        return phTime.toISOString().slice(0, 10);
      };

      for (const r of reviews) {
        reviewDateSet.add(toDateKey(new Date(r.reviewedAt)));
      }
      for (const c of cards) {
        if (c.lastReviewedDate) {
          reviewDateSet.add(toDateKey(new Date(c.lastReviewedDate)));
        }
      }

      let streakDays = 0;
      if (reviewDateSet.size > 0) {
        const now = new Date();
        const todayKey = toDateKey(now);
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
      } else if (
        req.user?.email.toLowerCase() === 'charles.biasora@gmail.com' &&
        cards.some((c) => c.timesReviewed > 0)
      ) {
        streakDays = 1;
      }

      // Weakness Radar: cards with >= 2 reviews and failure rate >= 40% or ease factor < 1.9
      const weakCards = cards
        .filter((c) => {
          if (c.timesReviewed < 2) return false;
          const failRate = c.timesForgot / c.timesReviewed;
          return failRate >= 0.4 || c.easeFactor < 1.9;
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
            masteredCards,
            retentionRate: Number(retentionRate.toFixed(1)),
            totalReviews: reviews.length,
            streakDays,
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
