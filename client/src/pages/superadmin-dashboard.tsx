import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { signOut } from "firebase/auth";
import { useLocation } from "wouter";
import { auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Users, Calendar, Clock, LogOut, Check, X, Download } from "lucide-react";
import type { Employee, Attendance, LeavePermission } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function SuperadminDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ["/api/superadmin/employees"],
  });

  const { data: todayAttendance = [] } = useQuery<Attendance[]>({
    queryKey: ["/api/superadmin/attendance/today"],
  });

  const { data: leaveRequests = [] } = useQuery<LeavePermission[]>({
    queryKey: ["/api/superadmin/leaves/pending"],
  });

  const approveLeaveMutation = useMutation({
    mutationFn: async ({ requestId, status }: { requestId: string; status: "approved" | "rejected" }) => {
      return apiRequest("POST", "/api/superadmin/leaves/review", { requestId, status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/leaves/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/employees"] });
      toast({
        title: "Request reviewed",
        description: "The leave request has been updated",
      });
    },
  });

  const handleGenerateReport = async () => {
    try {
      const response = await fetch("/api/superadmin/reports/generate", {
        method: "POST",
      });
      
      if (!response.ok) throw new Error("Failed to generate report");

      toast({
        title: "Report generated",
        description: "The monthly report has been generated and emailed",
      });
    } catch (error: any) {
      toast({
        title: "Report generation failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setLocation("/login");
    } catch (error: any) {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const stats = {
    totalEmployees: employees.length,
    presentToday: todayAttendance.filter((a) => a.status !== "absent").length,
    pendingLeaves: leaveRequests.length,
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Superadmin Dashboard</h1>
            <p className="text-muted-foreground">Manage employees and attendance</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleGenerateReport} variant="outline" data-testid="button-generate-report">
              <Download className="w-4 h-4 mr-2" />
              Generate Report
            </Button>
            <Button onClick={handleLogout} variant="destructive" data-testid="button-logout">
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Employees</p>
                  <p className="text-3xl font-bold mt-2">{stats.totalEmployees}</p>
                </div>
                <Users className="w-8 h-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Present Today</p>
                  <p className="text-3xl font-bold mt-2">{stats.presentToday}</p>
                </div>
                <Calendar className="w-8 h-8 text-success" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pending Requests</p>
                  <p className="text-3xl font-bold mt-2">{stats.pendingLeaves}</p>
                </div>
                <Clock className="w-8 h-8 text-warning" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="attendance" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="attendance" data-testid="tab-attendance">Attendance</TabsTrigger>
            <TabsTrigger value="employees" data-testid="tab-employees">Employees</TabsTrigger>
            <TabsTrigger value="requests" data-testid="tab-requests">Leave Requests</TabsTrigger>
          </TabsList>

          <TabsContent value="attendance" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Today's Attendance</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Employee ID</TableHead>
                      <TableHead>Check-in</TableHead>
                      <TableHead>Check-out</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Photo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {todayAttendance.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                          No attendance records for today
                        </TableCell>
                      </TableRow>
                    ) : (
                      todayAttendance.map((record) => (
                        <TableRow key={record.id} data-testid={`row-attendance-${record.id}`}>
                          <TableCell className="font-medium">{record.employeeName}</TableCell>
                          <TableCell>{record.employeeId}</TableCell>
                          <TableCell>
                            {record.checkIn ? format(record.checkIn, "h:mm a") : "-"}
                          </TableCell>
                          <TableCell>
                            {record.checkOut ? format(record.checkOut, "h:mm a") : "-"}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                record.status === "checked-in"
                                  ? "default"
                                  : record.status === "checked-out"
                                  ? "secondary"
                                  : "outline"
                              }
                            >
                              {record.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {record.checkInPhotoUrl && (
                              <Avatar className="w-10 h-10">
                                <AvatarImage src={record.checkInPhotoUrl} alt="Check-in photo" />
                                <AvatarFallback>Photo</AvatarFallback>
                              </Avatar>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="employees" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>All Employees</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Employee ID</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Leaves</TableHead>
                      <TableHead>Permissions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employees.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                          No employees found
                        </TableCell>
                      </TableRow>
                    ) : (
                      employees.map((employee) => (
                        <TableRow key={employee.id} data-testid={`row-employee-${employee.id}`}>
                          <TableCell className="font-medium">{employee.fullName}</TableCell>
                          <TableCell>{employee.employeeId}</TableCell>
                          <TableCell>{employee.email || "-"}</TableCell>
                          <TableCell>
                            {employee.totalLeaves - employee.usedLeaves}/{employee.totalLeaves}
                          </TableCell>
                          <TableCell>
                            {employee.totalPermissions - employee.usedPermissions}/{employee.totalPermissions}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="requests" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Pending Leave Requests</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Dates</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leaveRequests.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                          No pending requests
                        </TableCell>
                      </TableRow>
                    ) : (
                      leaveRequests.map((request) => (
                        <TableRow key={request.id} data-testid={`row-request-${request.id}`}>
                          <TableCell className="font-medium">{request.employeeName}</TableCell>
                          <TableCell>
                            <Badge variant={request.type === "leave" ? "default" : "secondary"}>
                              {request.type}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {request.duration} {request.type === "leave" ? "day" : "hour"}
                            {request.duration !== 1 ? "s" : ""}
                          </TableCell>
                          <TableCell>
                            {format(new Date(request.startDate), "MMM d")} -{" "}
                            {format(new Date(request.endDate), "MMM d")}
                          </TableCell>
                          <TableCell className="max-w-xs truncate">{request.reason}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() =>
                                  approveLeaveMutation.mutate({ requestId: request.id, status: "approved" })
                                }
                                disabled={approveLeaveMutation.isPending}
                                data-testid={`button-approve-${request.id}`}
                              >
                                <Check className="w-4 h-4 mr-1" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() =>
                                  approveLeaveMutation.mutate({ requestId: request.id, status: "rejected" })
                                }
                                disabled={approveLeaveMutation.isPending}
                                data-testid={`button-reject-${request.id}`}
                              >
                                <X className="w-4 h-4 mr-1" />
                                Reject
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
