import { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma';
import { AuthRequest } from '../../middleware/auth.middleware';

const startSessionSchema = z.object({
  deckId: z.string().uuid(),
});

const completeSessionSchema = z.object({
  cardsReviewed: z.number().int().nonnegative(),
  correctCount: z.number().int().nonnegative(),
  durationSeconds: z.number().int().nonnegative(),
});

export class StudySessionController {
  public static async startSession(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const parsed = startSessionSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ success: false, errors: parsed.error.errors });
      }

      const { deckId } = parsed.data;

      const deck = await prisma.deck.findFirst({
        where: { id: deckId, userId },
      });

      if (!deck) {
        return res.status(404).json({ success: false, message: 'Deck not found or unauthorized.' });
      }

      const session = await prisma.studySession.create({
        data: {
          userId,
          deckId,
        },
      });

      return res.status(201).json({
        success: true,
        message: 'Study session started.',
        data: session,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  public static async completeSession(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      const parsed = completeSessionSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ success: false, errors: parsed.error.errors });
      }

      const session = await prisma.studySession.findFirst({
        where: { id, userId },
      });

      if (!session) {
        return res.status(404).json({ success: false, message: 'Session not found.' });
      }

      const updated = await prisma.studySession.update({
        where: { id },
        data: {
          cardsReviewed: parsed.data.cardsReviewed,
          correctCount: parsed.data.correctCount,
          durationSeconds: parsed.data.durationSeconds,
          completedAt: new Date(),
        },
      });

      return res.json({
        success: true,
        message: 'Study session recorded successfully.',
        data: updated,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  public static async listSessions(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const sessions = await prisma.studySession.findMany({
        where: { userId },
        include: {
          deck: {
            select: { id: true, title: true, colorHex: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 30,
      });

      return res.json({ success: true, data: sessions });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
}
