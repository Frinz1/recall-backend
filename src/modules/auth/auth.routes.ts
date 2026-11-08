import { Router } from 'express';
import { AuthController } from './auth.controller';
import { authenticateJwt } from '../../middleware/auth.middleware';

const router = Router();

router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.post('/refresh', AuthController.refreshToken);
router.post('/logout', AuthController.logout);
router.get('/me', authenticateJwt, AuthController.getProfile);

export default router;
