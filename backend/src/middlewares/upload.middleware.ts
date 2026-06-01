import { v2 as cloudinary } from "cloudinary";
// @ts-ignore - multer-storage-cloudinary doesn't have type definitions
import CloudinaryStorage from "multer-storage-cloudinary";
import multer from "multer";
import type { Request } from "express";
import type { Express } from "express";
import env from "../configs/env";
import { ApiError } from "../utils/api-error";

// 1. Configure Cloudinary with your credentials
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// 2. Set up the Cloudinary Storage engine for Multer
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req: any, file: any) => {
    // Determine the folder based on the user's tenant ID if possible,
    // otherwise default to a general profiles folder
    const folderName = req.tenantId ? `intellmeet/${req.tenantId}/profiles` : 'intellmeet/profiles';
    
    return {
      folder: folderName,
      allowed_formats: ["jpg", "jpeg", "png", "webp"], // Restrict file types
      public_id: `${req.user?.id || 'unknown'}-${Date.now()}`, // Create a unique filename
      transformation: [{ width: 500, height: 500, crop: "fill" }], // Automatically crop/resize
    };
  },
});

// 3. Create the Multer upload instance
export const uploadAvatar = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB file size limit
  },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new ApiError(400, "Only image files are allowed"));
    }
    cb(null, true);
  },
});

// 4. Create local storage for video recordings
import fs from "fs";
import path from "path";

const localDiskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, "../../uploads/recordings");
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${req.params.id || 'meeting'}-${uniqueSuffix}${path.extname(file.originalname) || '.webm'}`);
  }
});

export const uploadRecording = multer({
  storage: localDiskStorage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  }
});