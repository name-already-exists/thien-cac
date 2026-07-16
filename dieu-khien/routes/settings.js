import express from 'express';
import { getSettings, updateSettings } from '../settings.js';

const router = express.Router();

router.get('/settings', (req, res) => {
  res.json(getSettings());
});

router.put('/settings', (req, res) => {
  res.json(updateSettings(req.body || {}));
});

export default router;
