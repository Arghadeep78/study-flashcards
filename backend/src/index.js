import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB } from './db.js';
import cardRoutes from './routes/cards.js';
import statsRoutes from './routes/stats.js';
import pdfNoteRoutes from './routes/pdfNotes.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.resolve(__dirname, '../uploads');
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Serve uploaded/downloaded PDFs.
app.use('/uploads', express.static(UPLOADS_DIR));

app.use('/api/cards', cardRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/pdf-notes', pdfNoteRoutes);

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// Surface multer / upload errors as JSON instead of HTML stack traces.
app.use((err, _req, res, _next) => {
  res.status(400).json({ error: err.message || 'Request failed' });
});

connectDB().then(() => {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});
