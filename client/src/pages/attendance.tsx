import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import Webcam from "react-webcam";
import { format } from "date-fns";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";
import { useAuth } from "@/lib/authContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { BottomNav } from "@/components/bottom-nav";
import { Camera, Clock, CheckCircle2, LogOut, CalendarDays } from "lucide-react";
import type { Attendance } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function AttendancePage() {
  const { employee } = useAuth();
  const [showCamera, setShowCamera] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const webcamRef = useRef<Webcam>(null);
  const { toast } = useToast();

  const today = format(new Date(), "yyyy-MM-dd");

  const { data: todayAttendance, isLoading } = useQuery<Attendance>({
    queryKey: ["/api/attendance/today", employee?.employeeId],
    enabled: !!employee,
  });

  const { data: recentAttendance = [] } = useQuery<Attendance[]>({
    queryKey: ["/api/attendance/recent", employee?.employeeId],
    enabled: !!employee,
  });

  const markAttendanceMutation = useMutation({
    mutationFn: async (data: { type: "check-in" | "check-out"; photoUrl: string }) => {
      return apiRequest("POST", "/api/attendance/mark", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendance/today"] });
      queryClient.invalidateQueries({ queryKey: ["/api/attendance/recent"] });
      setShowCamera(false);
      setCapturedImage(null);
    },
  });

  const capturePhoto = () => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      setCapturedImage(imageSrc);
    }
  };

  const uploadPhotoAndMarkAttendance = async (type: "check-in" | "check-out") => {
    if (!capturedImage || !employee) return;

    setUploadingPhoto(true);
    try {
      // Convert base64 to blob
      const response = await fetch(capturedImage);
      const blob = await response.blob();

      // Upload to Firebase Storage
      const timestamp = Date.now();
      const storageRef = ref(storage, `attendance/${employee.employeeId}/${today}-${type}-${timestamp}.jpg`);
      await uploadBytes(storageRef, blob);
      const photoUrl = await getDownloadURL(storageRef);

      // Mark attendance
      await markAttendanceMutation.mutateAsync({ type, photoUrl });

      toast({
        title: type === "check-in" ? "Checked In!" : "Checked Out!",
        description: `Your attendance has been recorded at ${format(new Date(), "h:mm a")}`,
      });
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({
        title: "Failed to record attendance",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleMarkAttendance = (type: "check-in" | "check-out") => {
    setShowCamera(true);
  };

  const canCheckIn = !todayAttendance || todayAttendance.status === "absent";
  const canCheckOut = todayAttendance?.status === "checked-in";

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="pt-4 pb-2">
          <h1 className="text-2xl font-bold text-foreground">Attendance</h1>
          <p className="text-sm text-muted-foreground">
            {format(new Date(), "EEEE, MMMM d, yyyy")}
          </p>
        </div>

        {/* Today's Status Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-primary" />
              Today's Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Status</p>
                    <Badge
                      variant={
                        todayAttendance?.status === "checked-in"
                          ? "default"
                          : todayAttendance?.status === "checked-out"
                          ? "secondary"
                          : "outline"
                      }
                      className="text-sm"
                      data-testid="badge-status"
                    >
                      {todayAttendance?.status === "checked-in"
                        ? "Checked In"
                        : todayAttendance?.status === "checked-out"
                        ? "Checked Out"
                        : "Not Marked"}
                    </Badge>
                  </div>

                  {todayAttendance?.checkIn && (
                    <div className="text-right space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">Check-in Time</p>
                      <p className="text-lg font-semibold text-foreground flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {format(todayAttendance.checkIn, "h:mm a")}
                      </p>
                    </div>
                  )}

                  {todayAttendance?.checkOut && (
                    <div className="text-right space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">Check-out Time</p>
                      <p className="text-lg font-semibold text-foreground flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {format(todayAttendance.checkOut, "h:mm a")}
                      </p>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <Button
                    onClick={() => handleMarkAttendance("check-in")}
                    disabled={!canCheckIn || markAttendanceMutation.isPending}
                    className="flex-1"
                    data-testid="button-check-in"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Check In
                  </Button>

                  <Button
                    onClick={() => handleMarkAttendance("check-out")}
                    disabled={!canCheckOut || markAttendanceMutation.isPending}
                    variant="outline"
                    className="flex-1"
                    data-testid="button-check-out"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Check Out
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Recent Attendance */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Recent Attendance</h2>
          <div className="space-y-3">
            {recentAttendance.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground">No attendance records yet</p>
                </CardContent>
              </Card>
            ) : (
              recentAttendance.map((record) => (
                <Card key={record.id} className="hover-elevate">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-1 h-12 rounded-full ${
                        record.status === "checked-in" ? "bg-success" : "bg-muted"
                      }`} />
                      <div>
                        <p className="font-medium">{format(new Date(record.date), "MMMM d, yyyy")}</p>
                        <p className="text-sm text-muted-foreground">
                          {record.checkIn && `In: ${format(record.checkIn, "h:mm a")}`}
                          {record.checkOut && ` • Out: ${format(record.checkOut, "h:mm a")}`}
                        </p>
                      </div>
                    </div>
                    <Badge variant={record.status === "checked-out" ? "secondary" : "default"}>
                      {record.status === "checked-out" ? "Complete" : "In Progress"}
                    </Badge>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Camera Dialog */}
      <Dialog open={showCamera} onOpenChange={setShowCamera}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Take Attendance Photo</DialogTitle>
            <DialogDescription>
              Please take a clear photo for attendance verification
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {!capturedImage ? (
              <>
                <div className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                  <Webcam
                    ref={webcamRef}
                    audio={false}
                    screenshotFormat="image/jpeg"
                    className="w-full h-full object-cover"
                    videoConstraints={{
                      facingMode: "user",
                    }}
                  />
                </div>
                <Button
                  onClick={capturePhoto}
                  className="w-full"
                  size="lg"
                  data-testid="button-capture"
                >
                  <Camera className="w-5 h-5 mr-2" />
                  Capture Photo
                </Button>
              </>
            ) : (
              <>
                <div className="relative aspect-square rounded-lg overflow-hidden">
                  <img src={capturedImage} alt="Captured" className="w-full h-full object-cover" />
                </div>
                <div className="flex gap-3">
                  <Button
                    onClick={() => setCapturedImage(null)}
                    variant="outline"
                    className="flex-1"
                    disabled={uploadingPhoto}
                    data-testid="button-retake"
                  >
                    Retake
                  </Button>
                  <Button
                    onClick={() => uploadPhotoAndMarkAttendance(canCheckIn ? "check-in" : "check-out")}
                    className="flex-1"
                    disabled={uploadingPhoto}
                    data-testid="button-confirm"
                  >
                    {uploadingPhoto ? "Uploading..." : "Confirm"}
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
}
