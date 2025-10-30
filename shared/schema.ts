import { z } from "zod";

// Employee Schema
export const employeeSchema = z.object({
  id: z.string(),
  firebaseUid: z.string(),
  employeeId: z.string(),
  fullName: z.string(),
  email: z.string().optional(),
  phoneNumber: z.string().optional(),
  role: z.enum(["employee", "superadmin"]),
  createdAt: z.number(),
  // Leave balances
  totalLeaves: z.number().default(20),
  usedLeaves: z.number().default(0),
  totalPermissions: z.number().default(12),
  usedPermissions: z.number().default(0),
});

export const insertEmployeeSchema = employeeSchema.omit({
  id: true,
  createdAt: true,
});

export type Employee = z.infer<typeof employeeSchema>;
export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;

// Attendance Schema
export const attendanceSchema = z.object({
  id: z.string(),
  employeeId: z.string(),
  employeeName: z.string(),
  date: z.string(), // YYYY-MM-DD format
  checkIn: z.number().optional(), // timestamp
  checkOut: z.number().optional(), // timestamp
  checkInPhotoUrl: z.string().optional(),
  checkOutPhotoUrl: z.string().optional(),
  status: z.enum(["checked-in", "checked-out", "absent"]),
  createdAt: z.number(),
});

export const insertAttendanceSchema = attendanceSchema.omit({
  id: true,
  createdAt: true,
});

export type Attendance = z.infer<typeof attendanceSchema>;
export type InsertAttendance = z.infer<typeof insertAttendanceSchema>;

// Leave/Permission Schema
export const leavePermissionSchema = z.object({
  id: z.string(),
  employeeId: z.string(),
  employeeName: z.string(),
  type: z.enum(["leave", "permission"]),
  startDate: z.string(), // YYYY-MM-DD
  endDate: z.string(), // YYYY-MM-DD
  duration: z.number(), // in days for leave, hours for permission
  reason: z.string(),
  status: z.enum(["pending", "approved", "rejected"]),
  submittedAt: z.number(),
  reviewedAt: z.number().optional(),
  reviewedBy: z.string().optional(),
});

export const insertLeavePermissionSchema = leavePermissionSchema.omit({
  id: true,
  submittedAt: true,
  reviewedAt: true,
  reviewedBy: true,
});

export type LeavePermission = z.infer<typeof leavePermissionSchema>;
export type InsertLeavePermission = z.infer<typeof insertLeavePermissionSchema>;

// Chat Message Schema
export const chatMessageSchema = z.object({
  id: z.string(),
  senderId: z.string(),
  senderName: z.string(),
  senderRole: z.enum(["employee", "superadmin"]),
  receiverId: z.string(),
  message: z.string(),
  timestamp: z.number(),
  read: z.boolean().default(false),
});

export const insertChatMessageSchema = chatMessageSchema.omit({
  id: true,
  timestamp: true,
  read: true,
});

export type ChatMessage = z.infer<typeof chatMessageSchema>;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;

// Form Schemas with Validation
export const loginWithEmployeeIdSchema = z.object({
  employeeId: z.string().min(1, "Employee ID is required"),
});

export const onboardingSchema = z.object({
  employeeId: z.string().min(3, "Employee ID must be at least 3 characters"),
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
});

export const leaveRequestSchema = z.object({
  type: z.enum(["leave", "permission"]),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  duration: z.number().min(0.5, "Duration must be at least 0.5"),
  reason: z.string().min(10, "Reason must be at least 10 characters"),
});

export const chatMessageFormSchema = z.object({
  message: z
    .string()
    .min(1, "Message cannot be empty")
    .max(1000, "Message too long"),
});

export type LoginWithEmployeeIdForm = z.infer<typeof loginWithEmployeeIdSchema>;
export type OnboardingForm = z.infer<typeof onboardingSchema>;
export type LeaveRequestForm = z.infer<typeof leaveRequestSchema>;
export type ChatMessageForm = z.infer<typeof chatMessageFormSchema>;

export type User = {
  id: string;
  username: string;
};

export type InsertUser = Omit<User, "id">;
