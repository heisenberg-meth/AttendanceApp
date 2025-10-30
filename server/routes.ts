import type { Express } from "express";
import { createServer, type Server } from "http";
import { Resend } from "resend";
import admin from "firebase-admin";
import * as XLSX from "xlsx";
import cron from "node-cron";
import { format } from "date-fns";

// Initialize Firebase Admin
const serviceAccount = {
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
};

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: serviceAccount.projectId,
    storageBucket: `${serviceAccount.projectId}.firebasestorage.app`,
  });
}

const db = admin.firestore();
const storage = admin.storage();

// Resend client setup - from resend blueprint
let connectionSettings: any;

async function getResendClient() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? "repl " + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
    ? "depl " + process.env.WEB_REPL_RENEWAL
    : null;

  if (!xReplitToken) {
    throw new Error("X_REPLIT_TOKEN not found for repl/depl");
  }

  connectionSettings = await fetch(
    "https://" +
      hostname +
      "/api/v2/connection?include_secrets=true&connector_names=resend",
    {
      headers: {
        Accept: "application/json",
        X_REPLIT_TOKEN: xReplitToken,
      },
    }
  )
    .then((res) => res.json())
    .then((data) => data.items?.[0]);

  if (!connectionSettings || !connectionSettings.settings.api_key) {
    throw new Error("Resend not connected");
  }

  return {
    client: new Resend(connectionSettings.settings.api_key),
    fromEmail: connectionSettings.settings.from_email,
  };
}

const SUPERADMIN_EMAIL = "nmdevi63@gmail.com";

export async function registerRoutes(app: Express): Promise<Server> {
  // Employee ID login (custom endpoint)
  app.post("/api/employee/login", async (req, res) => {
    try {
      const { employeeId } = req.body;

      const employeesRef = db.collection("employees");
      const snapshot = await employeesRef
        .where("employeeId", "==", employeeId)
        .limit(1)
        .get();

      if (snapshot.empty) {
        return res.status(404).json({ error: "Employee not found" });
      }

      const employee = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
      return res.json({ employee });
    } catch (error: any) {
      console.error("Employee login error:", error);
      return res.status(500).json({ error: error.message });
    }
  });

  // Get today's attendance for an employee
  app.get("/api/attendance/today", async (req, res) => {
    try {
      const employeeId = req.query.employeeId as string;
      if (!employeeId) {
        return res.status(400).json({ error: "Employee ID required" });
      }

      const today = format(new Date(), "yyyy-MM-dd");
      const attendanceRef = db.collection("attendance");
      const snapshot = await attendanceRef
        .where("employeeId", "==", employeeId)
        .where("date", "==", today)
        .limit(1)
        .get();

      if (snapshot.empty) {
        return res.json(null);
      }

      const attendance = {
        id: snapshot.docs[0].id,
        ...snapshot.docs[0].data(),
      };
      return res.json(attendance);
    } catch (error: any) {
      console.error("Get today attendance error:", error);
      return res.status(500).json({ error: error.message });
    }
  });

  // Get recent attendance for an employee
  app.get("/api/attendance/recent", async (req, res) => {
    try {
      const employeeId = req.query.employeeId as string;
      if (!employeeId) {
        return res.status(400).json({ error: "Employee ID required" });
      }

      const attendanceRef = db.collection("attendance");
      const snapshot = await attendanceRef
        .where("employeeId", "==", employeeId)
        .orderBy("createdAt", "desc")
        .limit(10)
        .get();

      const attendance = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      return res.json(attendance);
    } catch (error: any) {
      console.error("Get recent attendance error:", error);
      return res.status(500).json({ error: error.message });
    }
  });

  // Mark attendance (check-in or check-out)
  app.post("/api/attendance/mark", async (req, res) => {
    try {
      const { type, photoUrl } = req.body;
      const employeeId = req.query.employeeId as string;

      if (!employeeId || !type || !photoUrl) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // Get employee details
      const employeeDoc = await db
        .collection("employees")
        .doc(employeeId)
        .get();
      if (!employeeDoc.exists) {
        return res.status(404).json({ error: "Employee not found" });
      }
      const employee = employeeDoc.data();

      const today = format(new Date(), "yyyy-MM-dd");
      const timestamp = Date.now();

      // Check if attendance record exists for today
      const attendanceRef = db.collection("attendance");
      const snapshot = await attendanceRef
        .where("employeeId", "==", employeeId)
        .where("date", "==", today)
        .limit(1)
        .get();

      if (type === "check-in") {
        if (!snapshot.empty) {
          return res.status(400).json({ error: "Already checked in today" });
        }

        // Create new attendance record
        const newAttendance = {
          employeeId,
          employeeName: employee?.fullName,
          date: today,
          checkIn: timestamp,
          checkInPhotoUrl: photoUrl,
          status: "checked-in",
          createdAt: timestamp,
        };

        const docRef = await attendanceRef.add(newAttendance);
        return res.json({ id: docRef.id, ...newAttendance });
      } else if (type === "check-out") {
        if (snapshot.empty) {
          return res
            .status(400)
            .json({ error: "No check-in record found for today" });
        }

        // Update existing attendance record
        const docId = snapshot.docs[0].id;
        await attendanceRef.doc(docId).update({
          checkOut: timestamp,
          checkOutPhotoUrl: photoUrl,
          status: "checked-out",
        });

        const updated = await attendanceRef.doc(docId).get();
        return res.json({ id: updated.id, ...updated.data() });
      }

      return res.status(400).json({ error: "Invalid type" });
    } catch (error: any) {
      console.error("Mark attendance error:", error);
      return res.status(500).json({ error: error.message });
    }
  });

  // Get leaves/permissions for an employee
  app.get("/api/leaves", async (req, res) => {
    try {
      const employeeId = req.query.employeeId as string;
      if (!employeeId) {
        return res.status(400).json({ error: "Employee ID required" });
      }

      const leavesRef = db.collection("leaves");
      const snapshot = await leavesRef
        .where("employeeId", "==", employeeId)
        .orderBy("submittedAt", "desc")
        .get();

      const leaves = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      return res.json(leaves);
    } catch (error: any) {
      console.error("Get leaves error:", error);
      return res.status(500).json({ error: error.message });
    }
  });

  // Submit leave/permission request
  app.post("/api/leaves/request", async (req, res) => {
    try {
      const { type, startDate, endDate, duration, reason } = req.body;
      const employeeId = req.query.employeeId as string;

      if (
        !employeeId ||
        !type ||
        !startDate ||
        !endDate ||
        !duration ||
        !reason
      ) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // Get employee details
      const employeeDoc = await db
        .collection("employees")
        .doc(employeeId)
        .get();
      if (!employeeDoc.exists) {
        return res.status(404).json({ error: "Employee not found" });
      }
      const employee = employeeDoc.data();

      const newRequest = {
        employeeId,
        employeeName: employee?.fullName,
        type,
        startDate,
        endDate,
        duration,
        reason,
        status: "pending",
        submittedAt: Date.now(),
      };

      const docRef = await db.collection("leaves").add(newRequest);
      return res.json({ id: docRef.id, ...newRequest });
    } catch (error: any) {
      console.error("Request leave error:", error);
      return res.status(500).json({ error: error.message });
    }
  });

  // Superadmin: Get all employees
  app.get("/api/superadmin/employees", async (req, res) => {
    try {
      const employeesRef = db.collection("employees");
      const snapshot = await employeesRef.get();

      const employees = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      return res.json(employees);
    } catch (error: any) {
      console.error("Get employees error:", error);
      return res.status(500).json({ error: error.message });
    }
  });

  // Superadmin: Get today's attendance
  app.get("/api/superadmin/attendance/today", async (req, res) => {
    try {
      const today = format(new Date(), "yyyy-MM-dd");
      const attendanceRef = db.collection("attendance");
      const snapshot = await attendanceRef.where("date", "==", today).get();

      const attendance = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      return res.json(attendance);
    } catch (error: any) {
      console.error("Get today attendance error:", error);
      return res.status(500).json({ error: error.message });
    }
  });

  // Superadmin: Get pending leave requests
  app.get("/api/superadmin/leaves/pending", async (req, res) => {
    try {
      const leavesRef = db.collection("leaves");
      const snapshot = await leavesRef.where("status", "==", "pending").get();

      const leaves = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      return res.json(leaves);
    } catch (error: any) {
      console.error("Get pending leaves error:", error);
      return res.status(500).json({ error: error.message });
    }
  });

  // Superadmin: Review leave request
  app.post("/api/superadmin/leaves/review", async (req, res) => {
    try {
      const { requestId, status } = req.body;

      if (!requestId || !status) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const leaveRef = db.collection("leaves").doc(requestId);
      const leaveDoc = await leaveRef.get();

      if (!leaveDoc.exists) {
        return res.status(404).json({ error: "Leave request not found" });
      }

      const leaveData = leaveDoc.data();
      if (!leaveData) {
        return res.status(404).json({ error: "Leave data not found" });
      }

      // Update leave request
      await leaveRef.update({
        status,
        reviewedAt: Date.now(),
        reviewedBy: "superadmin",
      });

      // Update employee leave/permission balance
      if (status === "approved") {
        const employeeRef = db
          .collection("employees")
          .doc(leaveData.employeeId);
        const employeeDoc = await employeeRef.get();
        const employee = employeeDoc.data();

        if (leaveData.type === "leave") {
          await employeeRef.update({
            usedLeaves: (employee?.usedLeaves || 0) + leaveData.duration,
          });
        } else {
          await employeeRef.update({
            usedPermissions:
              (employee?.usedPermissions || 0) + leaveData.duration,
          });
        }
      }

      return res.json({ success: true });
    } catch (error: any) {
      console.error("Review leave error:", error);
      return res.status(500).json({ error: error.message });
    }
  });

  // Superadmin: Generate monthly report
  app.post("/api/superadmin/reports/generate", async (req, res) => {
    try {
      await generateMonthlyReport();
      return res.json({ success: true });
    } catch (error: any) {
      console.error("Generate report error:", error);
      return res.status(500).json({ error: error.message });
    }
  });

  // Schedule daily attendance email (every day at 6 PM)
  cron.schedule("0 18 * * *", async () => {
    console.log("Running daily attendance email job...");
    await sendDailyAttendanceEmail();
  });

  // Schedule monthly report (1st day of month at 9 AM)
  cron.schedule("0 9 1 * *", async () => {
    console.log("Running monthly report job...");
    await generateMonthlyReport();
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Daily attendance email
async function sendDailyAttendanceEmail() {
  try {
    const today = format(new Date(), "yyyy-MM-dd");
    const attendanceRef = db.collection("attendance");
    const snapshot = await attendanceRef.where("date", "==", today).get();

    const attendance = snapshot.docs.map((doc) => doc.data());

    // Generate HTML email
    let emailHtml = `
      <h2>Daily Attendance Summary - ${format(new Date(), "MMMM d, yyyy")}</h2>
      <table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse;">
        <thead>
          <tr style="background-color: #B39DDB; color: white;">
            <th>Employee Name</th>
            <th>Employee ID</th>
            <th>Check-in</th>
            <th>Check-out</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
    `;

    attendance.forEach((record: any) => {
      emailHtml += `
        <tr>
          <td>${record.employeeName}</td>
          <td>${record.employeeId}</td>
          <td>${record.checkIn ? format(record.checkIn, "h:mm a") : "-"}</td>
          <td>${record.checkOut ? format(record.checkOut, "h:mm a") : "-"}</td>
          <td>${record.status}</td>
        </tr>
      `;
    });

    emailHtml += `
        </tbody>
      </table>
      <p style="margin-top: 20px;">Total Present: ${attendance.length}</p>
    `;

    // Send email via Resend
    const { client, fromEmail } = await getResendClient();
    await client.emails.send({
      from: fromEmail,
      to: SUPERADMIN_EMAIL,
      subject: `Daily Attendance Report - ${format(new Date(), "MMM d, yyyy")}`,
      html: emailHtml,
    });

    console.log("Daily attendance email sent successfully");
  } catch (error) {
    console.error("Error sending daily attendance email:", error);
  }
}

// Monthly report generation and email
async function generateMonthlyReport() {
  try {
    // Get all employees
    const employeesSnapshot = await db.collection("employees").get();
    const employees = employeesSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Get attendance for the past month
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const startDate = format(
      new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1),
      "yyyy-MM-dd"
    );
    const endDate = format(
      new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0),
      "yyyy-MM-dd"
    );

    const reportData = [];

    for (const employee of employees as any[]) {
      const attendanceSnapshot = await db
        .collection("attendance")
        .where("employeeId", "==", employee.employeeId)
        .where("date", ">=", startDate)
        .where("date", "<=", endDate)
        .get();

      const workingDays = attendanceSnapshot.docs.filter(
        (doc) => doc.data().status === "checked-out"
      ).length;

      reportData.push({
        "Employee Name": employee.fullName,
        "Employee ID": employee.employeeId,
        "Working Days": workingDays,
        "Leaves Taken": employee.usedLeaves,
        "Permissions Used": employee.usedPermissions,
        "Total Leaves": employee.totalLeaves,
        "Total Permissions": employee.totalPermissions,
      });
    }

    // Generate Excel file
    const worksheet = XLSX.utils.json_to_sheet(reportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Monthly Report");
    const excelBuffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });

    // Send email with Excel attachment via Resend
    const { client, fromEmail } = await getResendClient();
    await client.emails.send({
      from: fromEmail,
      to: SUPERADMIN_EMAIL,
      subject: `Monthly Attendance Report - ${format(lastMonth, "MMMM yyyy")}`,
      html: `
        <h2>Monthly Attendance Report</h2>
        <p>Please find attached the monthly attendance report for ${format(
          lastMonth,
          "MMMM yyyy"
        )}.</p>
        <p>Summary:</p>
        <ul>
          <li>Total Employees: ${employees.length}</li>
          <li>Report Period: ${format(new Date(startDate), "MMM d")} - ${format(
        new Date(endDate),
        "MMM d, yyyy"
      )}</li>
        </ul>
      `,
      attachments: [
        {
          filename: `Monthly_Report_${format(lastMonth, "yyyy-MM")}.xlsx`,
          content: excelBuffer,
        },
      ],
    });

    console.log("Monthly report generated and emailed successfully");
  } catch (error) {
    console.error("Error generating monthly report:", error);
  }
}
