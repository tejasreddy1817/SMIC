import express from "express";
import multer from "multer";
import { ensureAuth, ensurePermission, AuthRequest } from "../middleware/auth";
import { Media } from "../models/Media";
import { Job } from "../models/Job";
import { buildS3Key, uploadToS3, getSignedUrl, deleteFromS3 } from "../services/s3.service";
import { addMediaJob } from "../services/queue.service";

const router = express.Router();
router.use(ensureAuth, ensurePermission("app:use"));

const MAX_UPLOAD_MB = parseInt(process.env.MAX_UPLOAD_MB || "50", 10);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_MB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = /^(video|audio)\//;
    if (allowed.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only video and audio files are allowed"));
    }
  },
});

// POST /api/media/upload — Upload video/audio, store in S3, queue processing
router.post("/upload", upload.single("file"), async (req: AuthRequest, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const userId = req.userId!;
    const s3Key = buildS3Key(userId, req.file.originalname);

    // Upload to S3
    await uploadToS3(req.file.buffer, s3Key, req.file.mimetype);

    // Create Media document
    const media = await Media.create({
      userId,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      sizeBytes: req.file.size,
      s3Key,
      status: "uploaded",
    });

    // Create Job document and queue media processing
    const jobDoc = await Job.create({
      bullJobId: "pending",
      queue: "mediaProcessing",
      userId,
      mediaId: media._id,
      status: "queued",
      progress: 0,
    });

    const bullJob = await addMediaJob({
      mediaId: media._id.toString(),
      userId,
      s3Key,
      mimeType: req.file.mimetype,
      jobDocId: jobDoc._id.toString(),
    });

    await Job.findByIdAndUpdate(jobDoc._id, { bullJobId: String(bullJob.id) });

    res.status(201).json({
      media: {
        id: media._id,
        originalName: media.originalName,
        mimeType: media.mimeType,
        sizeBytes: media.sizeBytes,
        status: media.status,
      },
      jobId: jobDoc._id,
    });
  } catch (err: any) {
    console.error("[media/upload] Error:", err.message);
    if (err.message === "Only video and audio files are allowed") {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: "Upload failed" });
  }
});

// GET /api/media — List user's media files
router.get("/", async (req: AuthRequest, res) => {
  try {
    const media = await Media.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .select("-s3Key -audioS3Key");
    res.json({ media });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch media" });
  }
});

// GET /api/media/:id — Get single media with signed URL
router.get("/:id", async (req: AuthRequest, res) => {
  try {
    const media = await Media.findOne({ _id: req.params.id, userId: req.userId });
    if (!media) return res.status(404).json({ error: "Media not found" });

    const url = await getSignedUrl(media.s3Key);
    res.json({
      media: {
        id: media._id,
        originalName: media.originalName,
        mimeType: media.mimeType,
        sizeBytes: media.sizeBytes,
        duration: media.duration,
        resolution: media.resolution,
        status: media.status,
        createdAt: media.createdAt,
      },
      url,
    });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch media" });
  }
});

// DELETE /api/media/:id — Delete media and associated S3 objects
router.delete("/:id", async (req: AuthRequest, res) => {
  try {
    const media = await Media.findOne({ _id: req.params.id, userId: req.userId });
    if (!media) return res.status(404).json({ error: "Media not found" });

    // Clean up S3
    await deleteFromS3(media.s3Key).catch(() => {});
    if (media.audioS3Key) {
      await deleteFromS3(media.audioS3Key).catch(() => {});
    }

    await Media.findByIdAndDelete(media._id);
    res.json({ deleted: true });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to delete media" });
  }
});

export default router;
