import { Router } from 'express';
import { StudySessionController } from './study-session.controller';
import { authenticateJwt } from '../../middleware/auth.middleware';

const router = Router();

router.use(authenticateJwt);

router.post('/', StudySessionController.startSession);
router.post('/:id/complete', StudySessionController.completeSession);
router.patch('/:id/complete', StudySessionController.completeSession);
router.get('/', StudySessionController.listSessions);

export default router;
