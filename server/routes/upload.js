const express = require('express');
const multer = require('multer');
const busboy = require('busboy');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const os = require('os');
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
      .rotate() // Apply EXIF orientation (fixes landscape photos from phone cameras)
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

// POST /api/upload/video – multipart form field: "video" (streamed to Cloudinary, no full buffering)
// Optional form fields: "trimStartTime" and "trimEndTime" (in seconds) for video trimming
router.post('/video', authMiddleware, (req, res) => {
  if (!process.env.CLOUDINARY_CLOUD_NAME) {
    return res.status(503).json({ error: 'Upload not configured. Set CLOUDINARY_* in .env' });
  }

  const bb = busboy({ headers: req.headers });
  let resolved = false;
  let videoReceived = false;
  let trimStartTime = null;
  let trimEndTime = null;

  function finish(err, url) {
    if (resolved) return;
    resolved = true;
    if (err) return res.status(500).json({ error: err.message || 'Video upload failed' });
    res.json({ url });
  }

  // Parse trim parameters from form fields
  bb.on('field', (fieldname, value) => {
    if (fieldname === 'trimStartTime') {
      trimStartTime = parseFloat(value);
    } else if (fieldname === 'trimEndTime') {
      trimEndTime = parseFloat(value);
    }
  });

  bb.on('file', (fieldname, file, info) => {
    if (fieldname !== 'video') {
      file.resume();
      return;
    }
    videoReceived = true;

    const uploadOptions = {
      folder: 'runbarbie/reels',
      resource_type: 'video',
    };
    const useTrim = trimStartTime !== null && trimEndTime !== null && trimEndTime > trimStartTime;
    if (useTrim) {
      const startSec = Math.round(trimStartTime);
      const endSec = Math.round(trimEndTime);
      // Cloudinary: offset.start and offset.end for video trim
      uploadOptions.eager = [{ offset: { start: startSec, end: endSec } }];
      uploadOptions.eager_async = false;
    }

    // upload_stream does NOT support eager transformations.
    // When trimming, stream to temp file then use upload() which supports eager.
    if (useTrim) {
      const tmpPath = path.join(os.tmpdir(), `reel-${Date.now()}-${Math.random().toString(36).slice(2)}.mp4`);
      const writeStream = fs.createWriteStream(tmpPath);
      file.pipe(writeStream);
      writeStream.on('finish', async () => {
        try {
          const result = await cloudinary.uploader.upload(tmpPath, uploadOptions);
          fs.unlink(tmpPath, () => {});
          const finalUrl = result.eager && result.eager.length > 0
            ? result.eager[0].secure_url
            : result.secure_url;
          finish(null, finalUrl);
        } catch (err) {
          try { fs.unlinkSync(tmpPath); } catch (_) {}
          finish(err);
        }
      });
      writeStream.on('error', (err) => {
        try { fs.unlinkSync(tmpPath); } catch (_) {}
        finish(err);
      });
      file.on('error', (err) => {
        try { fs.unlinkSync(tmpPath); } catch (_) {}
        finish(err);
      });
    } else {
      const uploadStream = cloudinary.uploader.upload_stream(
        uploadOptions,
        (err, result) => {
          if (err) return finish(err);
          finish(null, result.secure_url);
        }
      );
      file.pipe(uploadStream);
    }
  });

  bb.on('error', (err) => finish(err));
  bb.on('close', () => {
    if (!resolved && !videoReceived) finish(new Error('Video file is required'));
  });

  req.pipe(bb);
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
