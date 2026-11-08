import { Router } from 'express';
import { FlashcardController } from './flashcard.controller';
import { authenticateJwt } from '../../middleware/auth.middleware';

const router = Router();

router.use(authenticateJwt);

router.post('/', FlashcardController.createCard);
router.delete('/:id', FlashcardController.deleteCard);

export default router;
