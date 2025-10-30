import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { useAuth } from "@/lib/authContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { BottomNav } from "@/components/bottom-nav";
import { Plus, Calendar, Clock } from "lucide-react";
import type { LeavePermission } from "@shared/schema";
import { leaveRequestSchema, type LeaveRequestForm } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function LeavesPage() {
  const { employee } = useAuth();
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const { toast } = useToast();

  const form = useForm<LeaveRequestForm>({
    resolver: zodResolver(leaveRequestSchema),
    defaultValues: {
      type: "leave",
      startDate: "",
      endDate: "",
      duration: 1,
      reason: "",
    },
  });

  const { data: leaveRequests = [] } = useQuery<LeavePermission[]>({
    queryKey: ["/api/leaves", employee?.employeeId],
    enabled: !!employee,
  });

  const requestMutation = useMutation({
    mutationFn: async (data: LeaveRequestForm) => {
      return apiRequest("POST", "/api/leaves/request", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leaves"] });
      setShowRequestDialog(false);
      form.reset();
      toast({
        title: "Request submitted",
        description: "Your request has been sent to the Superadmin for approval",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Request failed",
        description: error.message || "Failed to submit request",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: LeaveRequestForm) => {
    requestMutation.mutate(data);
  };

  const leavesUsedPercent = employee ? (employee.usedLeaves / employee.totalLeaves) * 100 : 0;
  const permissionsUsedPercent = employee ? (employee.usedPermissions / employee.totalPermissions) * 100 : 0;

  const pendingRequests = leaveRequests.filter((r) => r.status === "pending");
  const approvedRequests = leaveRequests.filter((r) => r.status === "approved");
  const rejectedRequests = leaveRequests.filter((r) => r.status === "rejected");

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="pt-4 pb-2 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Leaves & Permissions</h1>
            <p className="text-sm text-muted-foreground">Manage your time off</p>
          </div>

          <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
            <DialogTrigger asChild>
              <Button size="icon" className="rounded-full" data-testid="button-new-request">
                <Plus className="w-5 h-5" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>New Request</DialogTitle>
                <DialogDescription>
                  Submit a leave or permission request
                </DialogDescription>
              </DialogHeader>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-type">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="leave">Leave</SelectItem>
                            <SelectItem value="permission">Permission</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="startDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Start Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} data-testid="input-start-date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="endDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>End Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} data-testid="input-end-date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="duration"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Duration ({form.watch("type") === "leave" ? "days" : "hours"})</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.5"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value))}
                            data-testid="input-duration"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="reason"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reason</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Provide a reason for your request..."
                            className="resize-none"
                            rows={3}
                            {...field}
                            data-testid="textarea-reason"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={requestMutation.isPending}
                    data-testid="button-submit-request"
                  >
                    {requestMutation.isPending ? "Submitting..." : "Submit Request"}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Balance Cards */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">Leaves</p>
                <Calendar className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {employee?.totalLeaves! - employee?.usedLeaves!}
                </p>
                <p className="text-xs text-muted-foreground">
                  of {employee?.totalLeaves} remaining
                </p>
              </div>
              <Progress value={leavesUsedPercent} className="h-2" />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">Permissions</p>
                <Clock className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {employee?.totalPermissions! - employee?.usedPermissions!}
                </p>
                <p className="text-xs text-muted-foreground">
                  of {employee?.totalPermissions} remaining
                </p>
              </div>
              <Progress value={permissionsUsedPercent} className="h-2" />
            </CardContent>
          </Card>
        </div>

        {/* Requests Tabs */}
        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pending" data-testid="tab-pending">
              Pending ({pendingRequests.length})
            </TabsTrigger>
            <TabsTrigger value="approved" data-testid="tab-approved">
              Approved ({approvedRequests.length})
            </TabsTrigger>
            <TabsTrigger value="rejected" data-testid="tab-rejected">
              Rejected ({rejectedRequests.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-3 mt-4">
            {pendingRequests.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground">No pending requests</p>
                </CardContent>
              </Card>
            ) : (
              pendingRequests.map((request) => (
                <LeaveRequestCard key={request.id} request={request} />
              ))
            )}
          </TabsContent>

          <TabsContent value="approved" className="space-y-3 mt-4">
            {approvedRequests.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground">No approved requests</p>
                </CardContent>
              </Card>
            ) : (
              approvedRequests.map((request) => (
                <LeaveRequestCard key={request.id} request={request} />
              ))
            )}
          </TabsContent>

          <TabsContent value="rejected" className="space-y-3 mt-4">
            {rejectedRequests.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground">No rejected requests</p>
                </CardContent>
              </Card>
            ) : (
              rejectedRequests.map((request) => (
                <LeaveRequestCard key={request.id} request={request} />
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>

      <BottomNav />
    </div>
  );
}

function LeaveRequestCard({ request }: { request: LeavePermission }) {
  return (
    <Card className="hover-elevate" data-testid={`card-request-${request.id}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <Badge variant={request.type === "leave" ? "default" : "secondary"}>
              {request.type}
            </Badge>
            <Badge
              variant={
                request.status === "pending"
                  ? "outline"
                  : request.status === "approved"
                  ? "default"
                  : "destructive"
              }
            >
              {request.status}
            </Badge>
          </div>
          <span className="text-sm text-muted-foreground">
            {request.duration} {request.type === "leave" ? "day" : "hour"}{request.duration !== 1 ? "s" : ""}
          </span>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span>
              {format(new Date(request.startDate), "MMM d")} - {format(new Date(request.endDate), "MMM d, yyyy")}
            </span>
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2">{request.reason}</p>
          {request.reviewedAt && (
            <p className="text-xs text-muted-foreground">
              Reviewed on {format(request.reviewedAt, "MMM d, yyyy")}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
