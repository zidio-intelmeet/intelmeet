import mongoose, { Document, Model, Schema } from "mongoose";

export interface Organization extends Document {
  _id: mongoose.Types.ObjectId;
  tenantId: string;
  name: string;
  slug: string;
  description: string | null;
  owner: mongoose.Types.ObjectId;
  members: Array<{
    userId: mongoose.Types.ObjectId;
    role: "Admin" | "Member" | "Viewer";
    status: "pending" | "active";
    joinedAt: Date;
  }>;
  invitations: Array<{
    email: string;
    role: "Admin" | "Member" | "Viewer";
    invitedBy: mongoose.Types.ObjectId;
    invitedAt: Date;
    status: "pending" | "accepted" | "declined";
  }>;
  settings: {
    isPrivate: boolean;
    allowPublicJoin: boolean;
    defaultMeetingDuration: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const organizationSchema = new Schema<Organization>(
  {
    tenantId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    name: {
      type: String,
      required: [true, "Organization name is required"],
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: /^[a-z0-9-]+$/,
    },
    description: {
      type: String,
      trim: true,
      maxLength: [500, "Description cannot exceed 500 characters"],
      default: null,
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Owner is required"],
    },
    members: [
      {
        userId: {
          type: Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        role: {
          type: String,
          enum: ["Admin", "Member", "Viewer"],
          default: "Member",
        },
        status: {
          type: String,
          enum: ["pending", "active"],
          default: "active",
        },
        joinedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    invitations: [
      {
        email: { type: String, required: true, lowercase: true, trim: true },
        role: { type: String, enum: ["Admin", "Member", "Viewer"], default: "Member" },
        invitedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
        invitedAt: { type: Date, default: Date.now },
        status: { type: String, enum: ["pending", "accepted", "declined"], default: "pending" },
      },
    ],
    settings: {
      isPrivate: { type: Boolean, default: true },
      allowPublicJoin: { type: Boolean, default: false },
      defaultMeetingDuration: { type: Number, default: 60, min: 15, max: 480 },
    },
  },
  { timestamps: true }
);

// 🚀 FIX: Removed duplicate schema.index() calls that caused the warnings.
// unique: true inside the field definitions automatically handles these.
organizationSchema.index({ owner: 1 });

const Organization: Model<Organization> = mongoose.model<Organization>(
  "Organization",
  organizationSchema
);

export default Organization;