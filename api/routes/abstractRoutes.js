import express from 'express';
import { authenticateToken } from '../middlewares/authMiddleware.js';
import {
  submitAbstract,
  getUserAbstracts,
  getAbstractById
} from '../controllers/abstractController.js';

const router = express.Router();

router.post('/', authenticateToken, submitAbstract);
router.get('/my', authenticateToken, getUserAbstracts);
router.get('/:id', authenticateToken, getAbstractById);

export default router;
