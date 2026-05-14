import mongoose, { Document, Model, Schema } from "mongoose";

export interface Task extends Document {
  _id: mongoose.Types.ObjectId;
  tenantId: string;
  meetingId: mongoose.Types.ObjectId;
  title: string;
  description: string | null;
  assignee: mongoose.Types.ObjectId; // User ID
  creator: mongoose.Types.ObjectId; // User ID (who created the task)
  status: "Open" | "In Progress" | "Completed" | "Cancelled";
  priority: "Low" | "Medium" | "High" | "Urgent";
  dueDate: Date | null;
  completedAt: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const taskSchema = new Schema<Task>(
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
      default: null,
    },
    title: {
      type: String,
      required: [true, "Task title is required"],
      trim: true,
      maxLength: [200, "Title cannot exceed 200 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxLength: [1000, "Description cannot exceed 1000 characters"],
      default: null,
    },
    assignee: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Assignee is required"],
    },
    creator: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Creator is required"],
    },
    status: {
      type: String,
      enum: ["Open", "In Progress", "Completed", "Cancelled"],
      default: "Open",
    },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High", "Urgent"],
      default: "Medium",
    },
    dueDate: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    notes: {
      type: String,
      trim: true,
      default: null,
    },
  },
  { timestamps: true }
);

// Indexes
taskSchema.index({ tenantId: 1, meetingId: 1 });
taskSchema.index({ tenantId: 1, assignee: 1 });
taskSchema.index({ tenantId: 1, status: 1 });
taskSchema.index({ dueDate: 1 });

const Task: Model<Task> = mongoose.model<Task>("Task", taskSchema);

export default Task;
