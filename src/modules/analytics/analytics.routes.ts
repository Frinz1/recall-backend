import { Router } from 'express';
import { AnalyticsController } from './analytics.controller';
import { authenticateJwt } from '../../middleware/auth.middleware';

const router = Router();

router.use(authenticateJwt);

router.get('/overview', AnalyticsController.getOverview);

export default router;
