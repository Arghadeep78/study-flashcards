import { Router } from 'express';
import multer from 'multer';
import crypto from 'crypto';
import path from 'path';
import {
  getPdfNotes, getPdfNote, createFromUpload, createFromDrive,
  refreshFromDrive, updatePdfNote, deletePdfNote, UPLOADS_DIR,
  reviewSection, toggleSectionWeak, getDueSections,
  getRandomSections, getSelectiveSections, getWeakSections,
} from '../controllers/pdfNotes.js';

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.pdf';
    cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Only PDF files are allowed'));
  },
});

const router = Router();

router.get('/sections/due', getDueSections);
router.get('/sections/random', getRandomSections);
router.get('/sections/weak', getWeakSections);
router.post('/sections/selective', getSelectiveSections);
router.post('/sections/:sectionId/review', reviewSection);
router.post('/sections/:sectionId/weak', toggleSectionWeak);
router.get('/', getPdfNotes);
router.get('/:id', getPdfNote);
router.post('/upload', upload.single('pdf'), createFromUpload);
router.post('/drive', createFromDrive);
router.post('/:id/refresh', refreshFromDrive);
router.put('/:id', updatePdfNote);
router.delete('/:id', deletePdfNote);

export default router;
