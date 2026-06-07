import { Router } from 'express';
import {
  getCards, getCard, createCard, updateCard, deleteCard, duplicateCard,
  reviewCard, getDueCards, getTopics, importCards, exportCards,
  getRandomCards, getSelectiveCards, getWeakCards, toggleWeak,
} from '../controllers/cards.js';

const router = Router();

router.get('/due', getDueCards);
router.get('/topics', getTopics);
router.get('/export', exportCards);
router.get('/random', getRandomCards);
router.get('/weak', getWeakCards);
router.post('/import', importCards);
router.post('/selective', getSelectiveCards);
router.get('/', getCards);
router.get('/:id', getCard);
router.post('/', createCard);
router.put('/:id', updateCard);
router.delete('/:id', deleteCard);
router.post('/:id/duplicate', duplicateCard);
router.post('/:id/review', reviewCard);
router.post('/:id/weak', toggleWeak);

export default router;
