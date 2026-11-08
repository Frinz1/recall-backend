import { Router } from 'express';
import { ReviewController } from './review.controller';
import { authenticateJwt } from '../../middleware/auth.middleware';

const router = Router();

router.use(authenticateJwt);

router.post('/', ReviewController.recordReview);
router.get('/due', ReviewController.getDueCards);

export default router;
