import mongoose, { Schema } from "mongoose";
// import validator from "validator";
import { IStudent } from "../types/student";

// Define schema
const studentSchema = new Schema<IStudent>(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [50, "Name must be at most 50 characters"],
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      match: [/^\S+@\S+\.\S+$/, "Email is invalid"],
      lowercase: true,
      trim: true,
    },

    phone: {
      type: String,
      required: [true, "Phone number is required"],
      validate: {
        validator: function (v: string) {
          return /^\d{10,15}$/.test(v);
        },
        message: "Phone number must be 10 to 15 digits",
      },
    },
    cfHandle: {
      type: String,
      required: [true, "Codeforces handle is required"],
      trim: true,
      unique: true,
      minlength: [3, "Handle must be at least 3 characters"],
      match: [/^[A-Za-z0-9_]+$/, "Invalid Codeforces handle"],
    },

    currentRating: {
      type: Number,
      default: 0,
      min: 0,
    },

    maxRating: {
      type: Number,
      default: 0,
      min: 0,
    },

    autoReminder: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: false,
    },

    lastSync: {
      type: Date,
    },

    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

studentSchema.index({ codeforces_handle: 1 });

// Pre-save hook
studentSchema.pre("save", function (next) {
  this.email = this.email.toLowerCase();
  this.name = this.name.trim();
  this.cfHandle = this.cfHandle.trim();

  if (!this.lastSync) {
    this.lastSync = new Date();
  }

  this.lastUpdated = new Date();
  next()
});

// Pre-update hook (for findOneAndUpdate, updateOne, etc.)
studentSchema.pre(["findOneAndUpdate", "updateOne"], function (next) {
  this.set({ lastUpdated: new Date() });
  next();
});

studentSchema.post("save", function (doc, next) {
  console.log(`[Student Created] ${doc.name} (${doc.cfHandle})`);
  next();
});

studentSchema.post("deleteOne", function (doc, next) {
  console.log(`[Student Removed] ${doc.name} (${doc.codeforces_handle})`);
  next();
});

const Student = mongoose.model<IStudent>("Student", studentSchema);
export default Student;
