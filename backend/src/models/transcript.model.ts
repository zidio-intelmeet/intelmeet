import mongoose, { Document, Model, Schema } from "mongoose";

export interface Transcript extends Document {
  _id: mongoose.Types.ObjectId;
  tenantId: string;
  meetingId: mongoose.Types.ObjectId;
  speaker: mongoose.Types.ObjectId; // User ID
  text: string;
  startTime: number; // Milliseconds into meeting
  endTime: number;
  language: string;
  confidence: number; // 0-1 from Whisper
  createdAt: Date;
  updatedAt: Date;
}

const transcriptSchema = new Schema<Transcript>(
  {
    tenantId: {
      type: String,
      required: [true, "Tenant ID is required"],
      trim: true,
      lowercase: true,
    },
    meetingId: {
      type: Schema.Types.ObjectId,
      ref: "Meeting",
      required: [true, "Meeting ID is required"],
    },
    speaker: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Speaker ID is required"],
    },
    text: {
      type: String,
      required: [true, "Transcript text is required"],
      trim: true,
    },
    startTime: {
      type: Number,
      required: true,
      min: 0,
    },
    endTime: {
      type: Number,
      required: true,
      min: 0,
    },
    language: {
      type: String,
      default: "en",
      enum: ["en", "es", "fr", "de", "it", "ja", "zh", "pt", "ru", "ar"],
    },
    confidence: {
      type: Number,
      default: 1,
      min: 0,
      max: 1,
    },
  },
  { timestamps: true }
);

// Indexes for fast queries
transcriptSchema.index({ tenantId: 1, meetingId: 1 });
transcriptSchema.index({ tenantId: 1, speaker: 1 });
transcriptSchema.index({ createdAt: -1 });

const Transcript: Model<Transcript> = mongoose.model<Transcript>(
  "Transcript",
  transcriptSchema
);

export default Transcript;
