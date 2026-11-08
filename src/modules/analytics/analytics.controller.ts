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
      const successfulReviews = reviews.filter(
        (r) => r.rating === 'good' || r.rating === 'easy'
      ).length;
      const retentionRate =
        reviews.length > 0 ? (successfulReviews / reviews.length) * 100 : 88.5;

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
