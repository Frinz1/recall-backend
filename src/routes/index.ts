import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes';
import subjectRoutes from '../modules/subjects/subject.routes';
import deckRoutes from '../modules/decks/deck.routes';
import cardRoutes from '../modules/flashcards/flashcard.routes';
import reviewRoutes from '../modules/reviews/review.routes';
import sessionRoutes from '../modules/study-sessions/study-session.routes';
import analyticsRoutes from '../modules/analytics/analytics.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/subjects', subjectRoutes);
router.use('/decks', deckRoutes);
router.use('/cards', cardRoutes);
router.use('/reviews', reviewRoutes);
router.use('/study-sessions', sessionRoutes);
router.use('/analytics', analyticsRoutes);

export default router;
