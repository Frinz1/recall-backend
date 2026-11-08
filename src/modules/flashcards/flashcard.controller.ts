import { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma';
import { AuthRequest } from '../../middleware/auth.middleware';

const cardSchema = z.object({
  deckId: z.string().min(1),
  question: z.string().min(1),
  answer: z.string().min(1),
  explanation: z.string().optional().default(''),
  tags: z.array(z.string()).optional().default([]),
  cardType: z.string().optional().default('standard'),
});

const updateCardSchema = z.object({
  question: z.string().min(1).optional(),
  answer: z.string().min(1).optional(),
  explanation: z.string().optional(),
  tags: z.array(z.string()).optional(),
  cardType: z.string().optional(),
});

export class FlashcardController {
  public static async createCard(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const parsed = cardSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ success: false, errors: parsed.error.errors });
      }

      // Verify user owns the deck
      const deck = await prisma.deck.findFirst({
        where: { id: parsed.data.deckId, userId },
      });

      if (!deck) {
        return res.status(403).json({ success: false, message: 'Unauthorized deck access.' });
      }

      const card = await prisma.flashcard.create({
        data: {
          deckId: parsed.data.deckId,
          question: parsed.data.question,
          answer: parsed.data.answer,
          explanation: parsed.data.explanation,
          tags: parsed.data.tags,
          cardType: parsed.data.cardType,
          nextReviewDate: new Date(), // Due immediately
        },
      });

      return res.status(201).json({ success: true, data: card });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  public static async deleteCard(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      const card = await prisma.flashcard.findUnique({
        where: { id },
        include: { deck: true },
      });

      if (!card || card.deck.userId !== userId) {
        return res.status(404).json({ success: false, message: 'Card not found or unauthorized.' });
      }

      await prisma.flashcard.delete({ where: { id } });

      return res.json({ success: true, message: 'Flashcard deleted successfully.' });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  public static async updateCard(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      const parsed = updateCardSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ success: false, errors: parsed.error.errors });
      }

      const card = await prisma.flashcard.findUnique({
        where: { id },
        include: { deck: true },
      });

      if (!card || card.deck.userId !== userId) {
        return res.status(404).json({ success: false, message: 'Card not found or unauthorized.' });
      }

      const updated = await prisma.flashcard.update({
        where: { id },
        data: parsed.data,
      });

      return res.json({ success: true, data: updated });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
}
