import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { doc, setDoc, collection, query, where, getDocs } from "firebase/firestore";
import { useLocation } from "wouter";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/authContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Loader } from "@/components/loader";
import { onboardingSchema, type OnboardingForm } from "@shared/schema";
import type { Employee } from "@shared/schema";

export default function OnboardingPage() {
  const [, setLocation] = useLocation();
  const { firebaseUser, setEmployee } = useAuth();
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<OnboardingForm>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      employeeId: "",
      fullName: "",
    },
  });

  const onSubmit = async (data: OnboardingForm) => {
    if (!firebaseUser) {
      toast({
        title: "Authentication required",
        description: "Please sign in first",
        variant: "destructive",
      });
      setLocation("/login");
      return;
    }

    setLoading(true);
    try {
      // Check if employee ID already exists
      const employeesRef = collection(db, "employees");
      const q = query(employeesRef, where("employeeId", "==", data.employeeId));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        toast({
          title: "Employee ID exists",
          description: "This Employee ID is already registered. Please use a different one.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Create employee document
      const employee: Employee = {
        id: firebaseUser.uid,
        firebaseUid: firebaseUser.uid,
        employeeId: data.employeeId,
        fullName: data.fullName,
        email: firebaseUser.email || undefined,
        phoneNumber: firebaseUser.phoneNumber || undefined,
        role: "employee",
        createdAt: Date.now(),
        totalLeaves: 20,
        usedLeaves: 0,
        totalPermissions: 12,
        usedPermissions: 0,
      };

      await setDoc(doc(db, "employees", firebaseUser.uid), employee);
      
      setEmployee(employee);

      toast({
        title: "Welcome aboard!",
        description: "Your account has been created successfully",
      });

      setLocation("/");
    } catch (error: any) {
      console.error("Onboarding error:", error);
      toast({
        title: "Onboarding failed",
        description: error.message || "Failed to create your profile",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md space-y-6 animate-fade-in">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Complete Your Profile</h1>
          <p className="text-muted-foreground">We need a few more details to get you started</p>
        </div>

        <Card className="p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="employeeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Employee ID</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., EMP001"
                        {...field}
                        disabled={loading}
                        data-testid="input-employee-id"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter your full name"
                        {...field}
                        disabled={loading}
                        data-testid="input-full-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full"
                disabled={loading}
                data-testid="button-complete-profile"
              >
                {loading ? <Loader /> : "Complete Profile"}
              </Button>
            </form>
          </Form>
        </Card>
      </div>
    </div>
  );
}
