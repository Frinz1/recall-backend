import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../../config/prisma';
import { ENV } from '../../config/env';
import { AuthRequest } from '../../middleware/auth.middleware';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const refreshSchema = z
  .object({
    rc_rt: z.string().min(1).optional(),
    refreshToken: z.string().min(1).optional(),
  })
  .refine((data) => data.rc_rt || data.refreshToken, {
    message: 'rc_rt or refreshToken is required',
  });

export class AuthController {
  public static async register(req: Request, res: Response) {
    try {
      const parsed = registerSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ success: false, errors: parsed.error.errors });
      }

      const { email, password, name } = parsed.data;

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        return res.status(400).json({ success: false, message: 'Email is already registered.' });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const user = await prisma.user.create({
        data: {
          email,
          passwordHash,
          name,
        },
      });

      // Default Subject & Deck
      const defaultSubject = await prisma.subject.create({
        data: {
          userId: user.id,
          name: 'Computer Science',
          colorHex: '#6366F1',
        },
      });

      const defaultDeck = await prisma.deck.create({
        data: {
          userId: user.id,
          subjectId: defaultSubject.id,
          title: 'Networking & Protocols',
          description: 'Transport layer, TCP/IP, CIDR subnetting, and TLS handshakes.',
          colorHex: '#3B82F6',
        },
      });

      await prisma.flashcard.createMany({
        data: [
          {
            deckId: defaultDeck.id,
            question: 'Explain the difference between TCP 3-Way Handshake and 4-Way Teardown.',
            answer: 'Handshake establishes connection (SYN -> SYN-ACK -> ACK). Teardown gracefully closes both simplex channels (FIN -> ACK -> FIN -> ACK).',
            explanation: 'Because TCP is full-duplex, each direction must be terminated independently.',
            tags: ['Networking', 'TCP'],
          },
          {
            deckId: defaultDeck.id,
            question: 'What is CIDR Subnetting and why was it introduced?',
            answer: 'Classless Inter-Domain Routing uses variable-length subnet masks (/24, /27) to allocate IP addresses efficiently and mitigate routing table explosion.',
            explanation: 'Replaced rigid Class A, B, and C addressing.',
            tags: ['Networking', 'IP'],
          },
        ],
      });

      const token = jwt.sign({ id: user.id, email: user.email }, ENV.JWT_SECRET, {
        expiresIn: '7d',
      });

      const refreshTokenString = jwt.sign({ id: user.id }, ENV.JWT_SECRET, {
        expiresIn: '30d',
      });

      await prisma.refreshToken.create({
        data: {
          userId: user.id,
          token: refreshTokenString,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      return res.status(201).json({
        success: true,
        message: 'Account registered successfully.',
        data: {
          rc_at: token,
          rc_rt: refreshTokenString,
          user: { id: user.id, email: user.email, name: user.name },
        },
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  public static async login(req: Request, res: Response) {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ success: false, errors: parsed.error.errors });
      }

      const { email, password } = parsed.data;

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        return res.status(401).json({ success: false, message: 'Invalid email or password.' });
      }

      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Invalid email or password.' });
      }

      const token = jwt.sign({ id: user.id, email: user.email }, ENV.JWT_SECRET, {
        expiresIn: '7d',
      });

      const refreshTokenString = jwt.sign({ id: user.id }, ENV.JWT_SECRET, {
        expiresIn: '30d',
      });

      await prisma.refreshToken.create({
        data: {
          userId: user.id,
          token: refreshTokenString,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      return res.json({
        success: true,
        message: 'Login successful.',
        data: {
          rc_at: token,
          rc_rt: refreshTokenString,
          user: { id: user.id, email: user.email, name: user.name },
        },
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  public static async refreshToken(req: Request, res: Response) {
    try {
      const parsed = refreshSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ success: false, errors: parsed.error.errors });
      }

      const refreshToken = parsed.data.rc_rt || parsed.data.refreshToken!;

      const tokenRecord = await prisma.refreshToken.findUnique({
        where: { token: refreshToken },
        include: { user: true },
      });

      if (!tokenRecord || new Date() > tokenRecord.expiresAt) {
        return res.status(401).json({ success: false, message: 'Invalid or expired refresh token.' });
      }

      const newAccessToken = jwt.sign(
        { id: tokenRecord.user.id, email: tokenRecord.user.email },
        ENV.JWT_SECRET,
        { expiresIn: '7d' }
      );

      return res.json({
        success: true,
        data: {
          rc_at: newAccessToken,
        },
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  public static async logout(req: Request, res: Response) {
    try {
      const { rc_rt, refreshToken } = req.body;
      const tokenToDelete = rc_rt || refreshToken;
      if (tokenToDelete) {
        await prisma.refreshToken.deleteMany({
          where: { token: tokenToDelete },
        });
      }
      return res.json({ success: true, message: 'Logged out successfully.' });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  public static async getProfile(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, name: true, createdAt: true },
      });

      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found.' });
      }

      return res.json({ success: true, data: user });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
}
