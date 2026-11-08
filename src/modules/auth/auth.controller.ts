import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../../config/prisma';
import { ENV } from '../../config/env';
import { AuthRequest } from '../../middleware/auth.middleware';
import { MailerService } from '../../services/mailer.service';

const registerSchema = z.object({
  name: z
    .string({ required_error: 'Name is required' })
    .trim()
    .min(2, 'Name must be at least 2 characters'),
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .toLowerCase()
    .email('Please enter a valid email address'),
  password: z
    .string({ required_error: 'Password is required' })
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

const verifyOtpSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .toLowerCase()
    .email('Please enter a valid email address'),
  otp: z
    .string({ required_error: 'Verification code is required' })
    .trim()
    .regex(/^\d{6}$/, 'Verification code must be an exact 6-digit number'),
});

const googleAuthSchema = z.object({
  email: z
    .string({ required_error: 'Google email is required' })
    .trim()
    .toLowerCase()
    .email('Invalid Google email address'),
  name: z
    .string({ required_error: 'Google display name is required' })
    .trim()
    .min(1, 'Name is required'),
  googleId: z.string().optional(),
  mode: z.enum(['login', 'register']).optional().default('login'),
});

const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .toLowerCase()
    .email('Please enter a valid email address'),
  password: z.string({ required_error: 'Password is required' }).min(1, 'Password is required'),
});

const refreshSchema = z
  .object({
    rc_rt: z.string().min(1).optional(),
    refreshToken: z.string().min(1).optional(),
  })
  .refine((data) => data.rc_rt || data.refreshToken, {
    message: 'rc_rt or refreshToken is required',
  });

const SEED_ALLOWED_EMAIL = 'charles.biasora@gmail.com';

async function provisionStarterContentForUser(userId: string, userEmail: string): Promise<void> {
  if (userEmail.trim().toLowerCase() !== SEED_ALLOWED_EMAIL) {
    return;
  }

  const existingSubjectCount = await prisma.subject.count({ where: { userId } });
  if (existingSubjectCount > 0) {
    return;
  }

  const netSubject = await prisma.subject.create({
    data: {
      userId,
      name: 'Networking',
      colorHex: '#3B82F6',
    },
  });

  const osSubject = await prisma.subject.create({
    data: {
      userId,
      name: 'Operating Systems',
      colorHex: '#A855F7',
    },
  });

  const dbSubject = await prisma.subject.create({
    data: {
      userId,
      name: 'Databases',
      colorHex: '#10B981',
    },
  });

  await prisma.subject.create({
    data: {
      userId,
      name: 'Algorithms',
      colorHex: '#F59E0B',
    },
  });

  const netDeck = await prisma.deck.create({
    data: {
      userId,
      subjectId: netSubject.id,
      title: 'TCP/IP & Routing Architecture',
      description: 'Transport layer handshakes, CIDR subnetting, ARP, and TLS 1.3.',
      colorHex: '#3B82F6',
      isFavorite: true,
    },
  });

  const osDeck = await prisma.deck.create({
    data: {
      userId,
      subjectId: osSubject.id,
      title: 'Kernel & Concurrency Primitives',
      description: 'Deadlock conditions, mutex vs. semaphore, and virtual memory paging.',
      colorHex: '#A855F7',
      isFavorite: true,
    },
  });

  const dbDeck = await prisma.deck.create({
    data: {
      userId,
      subjectId: dbSubject.id,
      title: 'Database Internals & Indexing',
      description: 'ACID isolation levels, B+Tree storage engines, and WAL recovery.',
      colorHex: '#10B981',
      isFavorite: false,
    },
  });

  const now = new Date();
  const pastDue = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  const futureDue = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);

  await prisma.flashcard.createMany({
    data: [
      {
        deckId: netDeck.id,
        question: 'Explain the difference between TCP 3-Way Handshake and 4-Way Teardown.',
        answer:
            'Handshake establishes reliable connection (SYN -> SYN-ACK -> ACK). Teardown gracefully closes both simplex channels (FIN -> ACK -> FIN -> ACK).',
        explanation:
            'Because TCP is full-duplex, each direction must be terminated independently by sending a FIN packet.',
        tags: ['Transport Layer', 'TCP/IP'],
        repetitions: 3,
        intervalDays: 6,
        easeFactor: 2.4,
        nextReviewDate: pastDue,
        timesReviewed: 4,
        timesForgot: 1,
        masteryStatus: 'reviewing',
      },
      {
        deckId: netDeck.id,
        question: 'What is CIDR Subnetting and why was it introduced to replace classful addressing?',
        answer:
            'Classless Inter-Domain Routing (CIDR) uses variable-length subnet masking (/24, /27) to allocate IP addresses efficiently and reduce BGP routing table bloat.',
        explanation: 'Replaced rigid Class A, B, and C address blocks.',
        tags: ['IP Addressing', 'Subnets'],
        repetitions: 1,
        intervalDays: 1,
        easeFactor: 1.7,
        nextReviewDate: pastDue,
        timesReviewed: 3,
        timesForgot: 2,
        masteryStatus: 'learning',
      },
      {
        deckId: netDeck.id,
        question: 'How does TLS 1.3 handshake improve latency over TLS 1.2?',
        answer:
            'TLS 1.3 reduces the handshake to a single round-trip (1-RTT) by combining key exchange with cipher suite negotiation in ClientHello.',
        explanation: 'It also introduces 0-RTT resumption for returning clients.',
        tags: ['Security', 'TLS/SSL'],
        repetitions: 4,
        intervalDays: 14,
        easeFactor: 2.6,
        nextReviewDate: futureDue,
        timesReviewed: 5,
        timesForgot: 0,
        masteryStatus: 'mastered',
      },
      {
        deckId: osDeck.id,
        question: 'What are the 4 Coffman conditions required for a Deadlock to occur?',
        answer: '1. Mutual Exclusion\n2. Hold and Wait\n3. No Preemption\n4. Circular Wait',
        explanation:
            'Breaking any single one of these four conditions mathematically guarantees that deadlock cannot occur.',
        tags: ['Concurrency', 'Deadlocks'],
        repetitions: 1,
        intervalDays: 1,
        easeFactor: 1.6,
        nextReviewDate: pastDue,
        timesReviewed: 4,
        timesForgot: 3,
        masteryStatus: 'learning',
      },
      {
        deckId: osDeck.id,
        question: 'Compare Mutex vs. Counting Semaphore in thread synchronization.',
        answer:
            'A Mutex is a locking mechanism with ownership (only the thread that locked it can unlock it). A Semaphore is a signaling mechanism without ownership.',
        explanation:
            'Counting semaphores allow up to N concurrent threads access to a finite pool of shared resources.',
        tags: ['Threads', 'Synchronization'],
        repetitions: 3,
        intervalDays: 7,
        easeFactor: 2.5,
        nextReviewDate: futureDue,
        timesReviewed: 3,
        timesForgot: 0,
        masteryStatus: 'mastered',
      },
      {
        deckId: dbDeck.id,
        question: 'Define the 4 ACID properties of database transactions.',
        answer:
            'Atomicity (all-or-nothing), Consistency (valid state invariants), Isolation (concurrent serializability), Durability (WAL persistence after commit).',
        explanation: 'Write-Ahead Logging (WAL) ensures Atomicity and Durability across power failures.',
        tags: ['Transactions', 'ACID'],
        repetitions: 5,
        intervalDays: 21,
        easeFactor: 2.7,
        nextReviewDate: futureDue,
        timesReviewed: 5,
        timesForgot: 0,
        masteryStatus: 'mastered',
      },
      {
        deckId: dbDeck.id,
        question: 'Why do relational databases prefer B+Trees over Binary Search Trees for disk indexes?',
        answer:
            'B+Trees have a high fan-out (hundreds of keys per 4KB/16KB page), minimizing tree height and disk I/O seeks, and link leaf nodes sequentially for fast range scans.',
        explanation: 'All data pointers reside strictly in the leaf nodes of a B+Tree.',
        tags: ['Indexing', 'B+Tree'],
        repetitions: 1,
        intervalDays: 1,
        easeFactor: 1.75,
        nextReviewDate: pastDue,
        timesReviewed: 3,
        timesForgot: 2,
        masteryStatus: 'learning',
      },
    ],
  });
}

async function issueSessionTokens(user: { id: string; email: string; name: string }) {
  const token = jwt.sign({ id: user.id, email: user.email }, ENV.JWT_SECRET, {
    expiresIn: '7d',
  });

  const refreshTokenString = jwt.sign(
    { id: user.id, jti: `${user.id}_${Date.now()}_${Math.random().toString(36).slice(2)}` },
    ENV.JWT_SECRET,
    { expiresIn: '30d' }
  );

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      token: refreshTokenString,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  return {
    rc_at: token,
    rc_rt: refreshTokenString,
    user: { id: user.id, email: user.email, name: user.name },
  };
}

export class AuthController {
  public static async requestRegistrationOtp(req: Request, res: Response) {
    try {
      const parsed = registerSchema.safeParse(req.body);
      if (!parsed.success) {
        const firstMsg = parsed.error.errors[0]?.message || 'Invalid registration details.';
        return res.status(400).json({
          success: false,
          message: firstMsg,
          errors: parsed.error.errors,
        });
      }

      const { email, password, name } = parsed.data;

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'An account with this email is already registered. Please sign in instead.',
        });
      }

      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const passwordHash = await bcrypt.hash(password, 10);
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      await prisma.emailOtp.upsert({
        where: { email },
        update: {
          name,
          passwordHash,
          otpCode,
          expiresAt,
        },
        create: {
          email,
          name,
          passwordHash,
          otpCode,
          expiresAt,
        },
      });

      const mailResult = await MailerService.sendRegistrationOtp(email, name, otpCode);

      return res.status(200).json({
        success: true,
        message: mailResult.deliveredViaSmtp
          ? `A 6-digit verification code has been sent to ${email}.`
          : `Verification code generated for ${email}. Check your Gmail inbox (ensure SMTP_USER and SMTP_PASS are configured in Vercel).`,
        data: {
          email,
          expiresInSeconds: 600,
          deliveredViaSmtp: mailResult.deliveredViaSmtp,
        },
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  public static async verifyRegistrationOtp(req: Request, res: Response) {
    try {
      const parsed = verifyOtpSchema.safeParse(req.body);
      if (!parsed.success) {
        const firstMsg = parsed.error.errors[0]?.message || 'Invalid verification code.';
        return res.status(400).json({
          success: false,
          message: firstMsg,
          errors: parsed.error.errors,
        });
      }

      const { email, otp } = parsed.data;

      const otpRecord = await prisma.emailOtp.findUnique({ where: { email } });
      if (!otpRecord) {
        return res.status(400).json({
          success: false,
          message: 'No pending verification found for this email. Please request a new code.',
        });
      }

      if (new Date() > otpRecord.expiresAt) {
        return res.status(400).json({
          success: false,
          message: 'Verification code has expired. Please tap Resend Code.',
        });
      }

      if (otpRecord.otpCode !== otp) {
        return res.status(400).json({
          success: false,
          message: 'Incorrect 6-digit verification code. Please check and try again.',
        });
      }

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        await prisma.emailOtp.delete({ where: { email } }).catch(() => {});
        return res.status(400).json({
          success: false,
          message: 'Email is already registered. Please sign in.',
        });
      }

      const user = await prisma.user.create({
        data: {
          email: otpRecord.email,
          name: otpRecord.name,
          passwordHash: otpRecord.passwordHash,
        },
      });

      await prisma.emailOtp.delete({ where: { email } }).catch(() => {});
      await provisionStarterContentForUser(user.id, user.email);

      const sessionData = await issueSessionTokens(user);

      return res.status(201).json({
        success: true,
        message: 'Email verified and account created successfully.',
        data: sessionData,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  public static async googleAuth(req: Request, res: Response) {
    try {
      const parsed = googleAuthSchema.safeParse(req.body);
      if (!parsed.success) {
        const firstMsg = parsed.error.errors[0]?.message || 'Invalid Google account payload.';
        return res.status(400).json({
          success: false,
          message: firstMsg,
          errors: parsed.error.errors,
        });
      }

      const { email, name, mode } = parsed.data;

      const user = await prisma.user.findUnique({ where: { email } });

      if (mode === 'login') {
        if (!user) {
          return res.status(401).json({
            success: false,
            message: `No registered account found for ${email}. Please switch to Create Account to register first.`,
          });
        }

        await provisionStarterContentForUser(user.id, user.email);
        const sessionData = await issueSessionTokens(user);
        return res.status(200).json({
          success: true,
          message: 'Signed in with Google successfully.',
          data: sessionData,
        });
      }

      // mode === 'register'
      if (user) {
        return res.status(400).json({
          success: false,
          message: 'An account with this Google email is already registered. Please sign in instead.',
        });
      }

      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const randomHash = await bcrypt.hash(`google_oauth_${Date.now()}_${Math.random()}`, 10);
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      await prisma.emailOtp.upsert({
        where: { email },
        update: {
          name,
          passwordHash: randomHash,
          otpCode,
          expiresAt,
        },
        create: {
          email,
          name,
          passwordHash: randomHash,
          otpCode,
          expiresAt,
        },
      });

      const mailResult = await MailerService.sendRegistrationOtp(email, name, otpCode);

      return res.status(200).json({
        success: true,
        message: `A 6-digit verification code has been sent to ${email}.`,
        data: {
          requiresOtp: true,
          email,
          expiresInSeconds: 600,
          deliveredViaSmtp: mailResult.deliveredViaSmtp,
        },
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  public static async register(req: Request, res: Response) {
    return AuthController.requestRegistrationOtp(req, res);
  }

  public static async login(req: Request, res: Response) {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        const firstMsg = parsed.error.errors[0]?.message || 'Please enter a valid email and password.';
        return res.status(400).json({
          success: false,
          message: firstMsg,
          errors: parsed.error.errors,
        });
      }

      const { email, password } = parsed.data;

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'No account found with this email address.',
        });
      }

      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Incorrect password. Please try again.',
        });
      }

      await provisionStarterContentForUser(user.id, user.email);
      const sessionData = await issueSessionTokens(user);

      return res.json({
        success: true,
        message: 'Login successful.',
        data: sessionData,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  public static async refreshToken(req: Request, res: Response) {
    try {
      const parsed = refreshSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          message: 'Refresh token is required.',
          errors: parsed.error.errors,
        });
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
          user: {
            id: tokenRecord.user.id,
            email: tokenRecord.user.email,
            name: tokenRecord.user.name,
          },
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

  public static async updateProfile(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
      if (name.length < 2) {
        return res.status(400).json({
          success: false,
          message: 'Display name must be at least 2 characters.',
        });
      }

      const updated = await prisma.user.update({
        where: { id: userId },
        data: { name },
        select: { id: true, email: true, name: true, createdAt: true },
      });

      return res.json({
        success: true,
        message: 'Profile updated.',
        data: updated,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
}
