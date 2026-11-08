import { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma';
import { AuthRequest } from '../../middleware/auth.middleware';

const createDeckSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional().default(''),
  subjectId: z.string().optional(),
  colorHex: z.string().optional().default('#6366F1'),
});

const updateDeckSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  subjectId: z.string().optional(),
  colorHex: z.string().optional(),
});

export class DeckController {
  public static async listDecks(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const decks = await prisma.deck.findMany({
        where: { userId },
        include: {
          subject: true,
          cards: {
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      const now = new Date();
      const formatted = decks.map((deck) => {
        const totalCards = deck.cards.length;
        const dueCardsCount = deck.cards.filter((c) => new Date(c.nextReviewDate) <= now).length;
        const masteredCount = deck.cards.filter((c) => c.masteryStatus === 'mastered').length;

        return {
          id: deck.id,
          subjectId: deck.subjectId,
          title: deck.title,
          description: deck.description,
          colorHex: deck.colorHex,
          isFavorite: deck.isFavorite,
          subject: deck.subject,
          cards: deck.cards,
          totalCards,
          dueCardsCount,
          masteredCount,
          createdAt: deck.createdAt,
        };
      });

      return res.json({ success: true, data: formatted });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  public static async getDeck(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      const deck = await prisma.deck.findFirst({
        where: { id, userId },
        include: {
          subject: true,
          cards: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      if (!deck) {
        return res.status(404).json({ success: false, message: 'Deck not found.' });
      }

      const now = new Date();
      const totalCards = deck.cards.length;
      const dueCardsCount = deck.cards.filter((c) => new Date(c.nextReviewDate) <= now).length;
      const masteredCount = deck.cards.filter((c) => c.masteryStatus === 'mastered').length;

      return res.json({
        success: true,
        data: {
          ...deck,
          totalCards,
          dueCardsCount,
          masteredCount,
        },
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  public static async createDeck(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const parsed = createDeckSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ success: false, errors: parsed.error.errors });
      }

      let subjectId = parsed.data.subjectId;
      if (subjectId) {
        const ownedSubject = await prisma.subject.findFirst({
          where: { id: subjectId, userId },
        });
        if (!ownedSubject) {
          subjectId = undefined;
        }
      }

      if (!subjectId) {
        let firstSubject = await prisma.subject.findFirst({ where: { userId } });
        if (!firstSubject) {
          firstSubject = await prisma.subject.create({
            data: { userId, name: 'General Studies', colorHex: '#6366F1' },
          });
        }
        subjectId = firstSubject.id;
      }

      const deck = await prisma.deck.create({
        data: {
          userId,
          subjectId,
          title: parsed.data.title,
          description: parsed.data.description,
          colorHex: parsed.data.colorHex,
        },
        include: {
          subject: true,
          cards: true,
        },
      });

      return res.status(201).json({
        success: true,
        data: {
          ...deck,
          totalCards: 0,
          dueCardsCount: 0,
          masteredCount: 0,
        },
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  public static async toggleFavorite(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      const deck = await prisma.deck.findFirst({ where: { id, userId } });
      if (!deck) {
        return res.status(404).json({ success: false, message: 'Deck not found.' });
      }

      const updated = await prisma.deck.update({
        where: { id },
        data: { isFavorite: !deck.isFavorite },
      });

      return res.json({ success: true, data: updated });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  public static async deleteDeck(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      await prisma.deck.deleteMany({
        where: { id, userId },
      });

      return res.json({ success: true, message: 'Deck deleted successfully.' });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  public static async updateDeck(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      const parsed = updateDeckSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ success: false, errors: parsed.error.errors });
      }

      const existing = await prisma.deck.findFirst({ where: { id, userId } });
      if (!existing) {
        return res.status(404).json({ success: false, message: 'Deck not found.' });
      }

      const dataToUpdate: Record<string, unknown> = {};
      if (parsed.data.title !== undefined) dataToUpdate.title = parsed.data.title;
      if (parsed.data.description !== undefined) dataToUpdate.description = parsed.data.description;
      if (parsed.data.colorHex !== undefined) dataToUpdate.colorHex = parsed.data.colorHex;
      if (parsed.data.subjectId !== undefined) {
        const ownedSub = await prisma.subject.findFirst({
          where: { id: parsed.data.subjectId, userId },
        });
        if (ownedSub) {
          dataToUpdate.subjectId = ownedSub.id;
        }
      }

      const updated = await prisma.deck.update({
        where: { id },
        data: dataToUpdate,
        include: {
          subject: true,
          cards: { orderBy: { createdAt: 'asc' } },
        },
      });

      return res.json({ success: true, data: updated });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  public static async resetDeckProgress(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      const existing = await prisma.deck.findFirst({ where: { id, userId } });
      if (!existing) {
        return res.status(404).json({ success: false, message: 'Deck not found.' });
      }

      await prisma.flashcard.updateMany({
        where: { deckId: id },
        data: {
          repetitions: 0,
          intervalDays: 0,
          easeFactor: 2.5,
          nextReviewDate: new Date(),
          lastReviewedDate: null,
          timesReviewed: 0,
          timesForgot: 0,
          masteryStatus: 'learning',
        },
      });

      const updated = await prisma.deck.findFirst({
        where: { id, userId },
        include: {
          subject: true,
          cards: { orderBy: { createdAt: 'asc' } },
        },
      });

      return res.json({
        success: true,
        message: 'Deck study progress reset.',
        data: updated,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
}
