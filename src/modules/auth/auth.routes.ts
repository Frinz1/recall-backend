import { Router } from 'express';
import { AuthController } from './auth.controller';
import { authenticateJwt } from '../../middleware/auth.middleware';

const router = Router();

router.post('/register/request-otp', AuthController.requestRegistrationOtp);
router.post('/register/verify-otp', AuthController.verifyRegistrationOtp);
router.post('/google', AuthController.googleAuth);
router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.post('/refresh', AuthController.refreshToken);
router.post('/logout', AuthController.logout);
router.get('/me', authenticateJwt, AuthController.getProfile);

export default router;
