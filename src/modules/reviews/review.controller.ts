import { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma';
import { AuthRequest } from '../../middleware/auth.middleware';
import { SM2Service, RecallRating } from '../../services/sm2.service';

const reviewSchema = z.object({
  cardId: z.string().uuid(),
  rating: z.enum(['again', 'hard', 'good', 'easy']),
});

export class ReviewController {
  public static async recordReview(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const parsed = reviewSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ success: false, errors: parsed.error.errors });
      }

      const { cardId, rating } = parsed.data;

      const card = await prisma.flashcard.findUnique({
        where: { id: cardId },
        include: { deck: true },
      });

      if (!card || card.deck.userId !== userId) {
        return res.status(404).json({ success: false, message: 'Card not found or unauthorized.' });
      }

      // Execute SM-2 Algorithm calculation
      const sm2 = SM2Service.calculate(
        rating as RecallRating,
        card.repetitions,
        card.intervalDays,
        card.easeFactor
      );

      const isForgot = rating === 'again';

      // Update card in transaction with review log
      const [updatedCard, reviewLog] = await prisma.$transaction([
        prisma.flashcard.update({
          where: { id: cardId },
          data: {
            repetitions: sm2.repetitions,
            intervalDays: sm2.intervalDays,
            easeFactor: sm2.easeFactor,
            nextReviewDate: sm2.nextReviewDate,
            lastReviewedDate: new Date(),
            timesReviewed: card.timesReviewed + 1,
            timesForgot: isForgot ? card.timesForgot + 1 : card.timesForgot,
            masteryStatus: sm2.masteryStatus,
          },
        }),
        prisma.cardReview.create({
          data: {
            cardId,
            userId,
            rating,
          },
        }),
      ]);

      return res.json({
        success: true,
        message: 'Review recorded and next interval computed via SM-2.',
        data: {
          card: updatedCard,
          review: reviewLog,
          sm2Result: sm2,
        },
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  public static async getDueCards(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const now = new Date();

      const dueCards = await prisma.flashcard.findMany({
        where: {
          deck: { userId },
          nextReviewDate: { lte: now },
        },
        include: {
          deck: {
            select: { id: true, title: true, colorHex: true },
          },
        },
        orderBy: { nextReviewDate: 'asc' },
      });

      return res.json({
        success: true,
        data: dueCards,
        count: dueCards.length,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
}
