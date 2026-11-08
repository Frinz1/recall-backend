import { Router } from 'express';
import { DeckController } from './deck.controller';
import { authenticateJwt } from '../../middleware/auth.middleware';

const router = Router();

router.use(authenticateJwt);

router.get('/', DeckController.listDecks);
router.get('/:id', DeckController.getDeck);
router.post('/', DeckController.createDeck);
router.patch('/:id', DeckController.updateDeck);
router.patch('/:id/favorite', DeckController.toggleFavorite);
router.post('/:id/reset', DeckController.resetDeckProgress);
router.delete('/:id', DeckController.deleteDeck);

export default router;
