import express from 'express';
import { protect, restrictTo } from '../middleware/auth.js';
import {
  createWallet,
  getWallet,
  getTransactionHistory,
  addFunds,
  confirmTopUp,
  requestWithdrawal,
  getWithdrawals,
  processWithdrawal,
  transferFunds,
  setWalletPIN
} from '../controllers/walletController.js';

const router = express.Router();

router.use(protect);

router.post('/', createWallet);
router.get('/', getWallet);
router.get('/transactions', getTransactionHistory);
router.post('/topup', addFunds);
router.post('/topup/confirm', confirmTopUp);
router.post('/withdraw', requestWithdrawal);
router.get('/withdrawals', getWithdrawals);
router.post('/transfer', transferFunds);
router.post('/pin', setWalletPIN);

router.post('/withdrawals/process', restrictTo('admin', 'super_admin'), processWithdrawal);

export default router;
