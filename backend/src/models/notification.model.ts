import mongoose, { Document, Model, Schema } from "mongoose";

export interface Notification extends Document {
  _id: mongoose.Types.ObjectId;
  tenantId: string;
  userId: mongoose.Types.ObjectId; // Recipient
  type: "mention" | "task_assigned" | "meeting_started" | "meeting_summary" | "system";
  title: string;
  message: string;
  relatedId: mongoose.Types.ObjectId | null; // Meeting/Task/User ID
  isRead: boolean;
  readAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<Notification>(
  {
    tenantId: {
      type: String,
      required: [true, "Tenant ID is required"],
      trim: true,
      lowercase: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
    },
    type: {
      type: String,
      enum: ["mention", "task_assigned", "meeting_started", "meeting_summary", "system"],
      required: true,
    },
    title: {
      type: String,
      required: [true, "Notification title is required"],
      trim: true,
    },
    message: {
      type: String,
      required: [true, "Message is required"],
      trim: true,
    },
    relatedId: {
      type: Schema.Types.ObjectId,
      default: null,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Indexes
notificationSchema.index({ tenantId: 1, userId: 1 });
notificationSchema.index({ tenantId: 1, userId: 1, isRead: 1 });
notificationSchema.index({ createdAt: -1 });

const Notification: Model<Notification> = mongoose.model<Notification>(
  "Notification",
  notificationSchema
);

export default Notification;
