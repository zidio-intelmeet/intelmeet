import mongoose, { Document, Model, Schema } from "mongoose";

export interface Organization extends Document {
  _id: mongoose.Types.ObjectId;
  tenantId: string; // Same as org slug for now
  name: string;
  slug: string;
  description: string | null;
  owner: mongoose.Types.ObjectId; // User ID
  members: Array<{
    userId: mongoose.Types.ObjectId;
    role: "Admin" | "Manager" | "Member";
    joinedAt: Date;
  }>;
  settings: {
    isPrivate: boolean;
    allowPublicJoin: boolean;
    defaultMeetingDuration: number; // Minutes
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
          enum: ["Admin", "Manager", "Member"],
          default: "Member",
        },
        joinedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    settings: {
      isPrivate: {
        type: Boolean,
        default: true,
      },
      allowPublicJoin: {
        type: Boolean,
        default: false,
      },
      defaultMeetingDuration: {
        type: Number,
        default: 60,
        min: 15,
        max: 480, // 8 hours max
      },
    },
  },
  { timestamps: true }
);

// Indexes
organizationSchema.index({ tenantId: 1 });
organizationSchema.index({ slug: 1 });
organizationSchema.index({ owner: 1 });

const Organization: Model<Organization> = mongoose.model<Organization>(
  "Organization",
  organizationSchema
);

export default Organization;
