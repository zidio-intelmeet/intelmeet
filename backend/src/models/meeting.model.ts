import mongoose, { Document, Model, Schema } from "mongoose";

export interface Meeting extends Document {
  _id: mongoose.Types.ObjectId;
  tenantId: string;
  meetingId: string; 
  title: string;
  description: string | null;
  host: mongoose.Types.ObjectId; 
  participants: mongoose.Types.ObjectId[]; 
  status: "Scheduled" | "Ongoing" | "Completed" | "Cancelled";
  scheduledStartTime: Date;
  scheduledEndTime: Date;
  createdAt: Date;
  updatedAt: Date;
}

const meetingSchema = new Schema<Meeting>(
  {
    tenantId: {
      type: String,
      required: [true, "Tenant ID is required"],
      trim: true,
      lowercase: true,
    },
    meetingId: {
      // The unique URL slug for joining the video room
      type: String,
      required: true,
      trim: true,
    },
    title: {
      type: String,
      required: [true, "Meeting title is required"],
      trim: true,
    },
    description: {
      type: String,
      default: null,
      trim: true,
    },
    host: {
      type: Schema.Types.ObjectId,
      ref: "User", // Links directly to your User model
      required: [true, "A meeting must have a host"],
    },
    participants: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    status: {
      type: String,
      enum: ["Scheduled", "Ongoing", "Completed", "Cancelled"],
      default: "Scheduled",
    },
    scheduledStartTime: {
      type: Date,
      required: [true, "Start time is required"],
    },
    scheduledEndTime: {
      type: Date,
      required: [true, "End time is required"],
    },
  },
  { timestamps: true }
);

// --- PERFORMANCE INDEXES ---
// Ensures no two meetings in the same tenant can have the same join link
meetingSchema.index(
  { tenantId: 1, meetingId: 1 }, 
  { unique: true, name: "tenant_meeting_id_unique" }
);
meetingSchema.index({ tenantId: 1, host: 1 });
meetingSchema.index({ tenantId: 1, status: 1 });

const Meeting: Model<Meeting> = mongoose.model<Meeting>("Meeting", meetingSchema);

export const syncMeetingIndexes = async () => Meeting.syncIndexes();

export default Meeting;