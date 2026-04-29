import mongoose, { Document, Model, Schema } from "mongoose";

export interface User extends Document {
  _id: mongoose.Types.ObjectId;
  tenantId: string;
  name: string;
  email: string;
  password: string | null;
  googleId: string | null;
  avatar: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<User>(
  {
    tenantId: {
      type: String,
      required: [true, "Tenant ID is required"],
      trim: true,
      lowercase: true,
    },
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      select: false,
      default: null,
    },
    googleId: {
      type: String,
      default: null,
      trim: true,
    },
    avatar: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

userSchema.index(
  { tenantId: 1, email: 1 },
  {
    unique: true,
    name: "tenant_email_unique",
  }
);

userSchema.index(
  { tenantId: 1, googleId: 1 },
  {
    unique: true,
    name: "tenant_google_id_unique",
    partialFilterExpression: {
      googleId: { $type: "string" },
    },
  }
);

userSchema.index({ tenantId: 1 }, { name: "tenant_lookup" });

const User: Model<User> = mongoose.model<User>("User", userSchema);

export const syncUserIndexes = async () => User.syncIndexes();

export default User;
