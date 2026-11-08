import { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma';
import { AuthRequest } from '../../middleware/auth.middleware';

const createSubjectSchema = z.object({
  name: z.string().min(1, 'Subject name is required'),
  colorHex: z.string().optional().default('#6366F1'),
});

const updateSubjectSchema = z.object({
  name: z.string().min(1).optional(),
  colorHex: z.string().optional(),
});

export class SubjectController {
  public static async listSubjects(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const subjects = await prisma.subject.findMany({
        where: { userId },
        include: {
          _count: {
            select: { decks: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return res.json({
        success: true,
        data: subjects.map((s) => ({
          id: s.id,
          name: s.name,
          colorHex: s.colorHex,
          deckCount: s._count.decks,
          createdAt: s.createdAt,
        })),
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  public static async getSubject(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      const subject = await prisma.subject.findFirst({
        where: { id, userId },
        include: {
          decks: {
            include: {
              _count: {
                select: { cards: true },
              },
            },
          },
        },
      });

      if (!subject) {
        return res.status(404).json({ success: false, message: 'Subject not found.' });
      }

      return res.json({ success: true, data: subject });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  public static async createSubject(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const parsed = createSubjectSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ success: false, errors: parsed.error.errors });
      }

      const subject = await prisma.subject.create({
        data: {
          userId,
          name: parsed.data.name,
          colorHex: parsed.data.colorHex,
        },
      });

      return res.status(201).json({ success: true, data: subject });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  public static async updateSubject(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      const parsed = updateSubjectSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ success: false, errors: parsed.error.errors });
      }

      const subject = await prisma.subject.findFirst({ where: { id, userId } });
      if (!subject) {
        return res.status(404).json({ success: false, message: 'Subject not found.' });
      }

      const updated = await prisma.subject.update({
        where: { id },
        data: parsed.data,
      });

      return res.json({ success: true, data: updated });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  public static async deleteSubject(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      const subject = await prisma.subject.findFirst({ where: { id, userId } });
      if (!subject) {
        return res.status(404).json({ success: false, message: 'Subject not found.' });
      }

      await prisma.subject.delete({ where: { id } });

      return res.json({ success: true, message: 'Subject deleted successfully.' });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
}
