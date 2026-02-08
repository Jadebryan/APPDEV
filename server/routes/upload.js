const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const cloudinary = require('../utils/cloudinary');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// In-memory storage for multer (no disk write; stream to Cloudinary)
const upload = multer({ storage: multer.memoryStorage() });

const MAX_WIDTH = 1920;
const JPEG_QUALITY = 85;

/** Resize/compress image buffer to stay under Cloudinary 10MB limit. Returns base64 data URI. */
async function resizeImageForUpload(base64DataUri) {
  try {
    const match = base64DataUri.match(/^data:image\/(\w+);base64,(.+)$/);
    const base64 = match ? match[2] : base64DataUri;
    const buffer = Buffer.from(base64, 'base64');
    const resized = await sharp(buffer)
      .resize(MAX_WIDTH, null, { withoutEnlargement: true })
      .jpeg({ quality: JPEG_QUALITY })
      .toBuffer();
    return `data:image/jpeg;base64,${resized.toString('base64')}`;
  } catch (err) {
    return base64DataUri;
  }
}

// POST /api/upload/image – body: { image: "data:image/jpeg;base64,..." }
router.post('/image', authMiddleware, async (req, res) => {
  try {
    const { image } = req.body;
    if (!image || typeof image !== 'string') {
      return res.status(400).json({ error: 'Image (base64) is required' });
    }
    if (!process.env.CLOUDINARY_CLOUD_NAME) {
      return res.status(503).json({ error: 'Upload not configured. Set CLOUDINARY_* in .env' });
    }

    const imageToUpload = await resizeImageForUpload(image);
    const result = await cloudinary.uploader.upload(imageToUpload, {
      folder: 'runbarbie/posts',
      resource_type: 'image',
    });

    res.json({ url: result.secure_url });
  } catch (error) {
    const msg = error.message || '';
    if (msg.toLowerCase().includes('too large') || msg.includes('File size too large') || error.http_code === 413) {
      return res.status(413).json({ error: 'Image is too large for Cloudinary (max 10MB). Use a smaller or compressed photo.' });
    }
    res.status(500).json({ error: error.message });
  }
});

// POST /api/upload/video – multipart form field: "video"
router.post('/video', authMiddleware, upload.single('video'), async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ error: 'Video file is required' });
    }
    if (!process.env.CLOUDINARY_CLOUD_NAME) {
      return res.status(503).json({ error: 'Upload not configured. Set CLOUDINARY_* in .env' });
    }

    const uploadPromise = new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: 'runbarbie/reels',
          resource_type: 'video',
        },
        (err, result) => (err ? reject(err) : resolve(result))
      );
      stream.end(req.file.buffer);
    });

    const result = await uploadPromise;
    res.json({ url: result.secure_url });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/upload/story – body: { image: "data:image/..." } (base64)
router.post('/story', authMiddleware, async (req, res) => {
  try {
    const { image } = req.body;
    if (!image || typeof image !== 'string') {
      return res.status(400).json({ error: 'Image (base64) is required' });
    }
    if (!process.env.CLOUDINARY_CLOUD_NAME) {
      return res.status(503).json({ error: 'Upload not configured. Set CLOUDINARY_* in .env' });
    }

    const imageToUpload = await resizeImageForUpload(image);
    const result = await cloudinary.uploader.upload(imageToUpload, {
      folder: 'runbarbie/stories',
      resource_type: 'image',
    });

    res.json({ url: result.secure_url });
  } catch (error) {
    const msg = error.message || '';
    if (msg.toLowerCase().includes('too large') || msg.includes('File size too large') || error.http_code === 413) {
      return res.status(413).json({ error: 'Image is too large for Cloudinary (max 10MB). Use a smaller or compressed photo.' });
    }
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
