import { useState } from "react";
import { signInWithPopup, signInWithPhoneNumber, ConfirmationResult } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, googleProvider, setupRecaptcha, db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader } from "@/components/loader";
import { Link } from "wouter";
import { FcGoogle } from "react-icons/fc";
import { Phone, IdCard } from "lucide-react";

interface LoginPageProps {
  onLoginSuccess: () => void;
}

export default function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [loading, setLoading] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [employeeId, setEmployeeId] = useState("");
  const { toast } = useToast();

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      
      // Check if employee exists
      const employeeDoc = await getDoc(doc(db, "employees", result.user.uid));
      
      if (!employeeDoc.exists()) {
        toast({
          title: "Account not found",
          description: "Please complete the signup process first.",
          variant: "destructive",
        });
        await auth.signOut();
        return;
      }
      
      toast({
        title: "Welcome back!",
        description: "Login successful",
      });
      
      onLoginSuccess();
    } catch (error: any) {
      console.error("Google sign-in error:", error);
      toast({
        title: "Login failed",
        description: error.message || "Failed to sign in with Google",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneSignIn = async () => {
    if (!phoneNumber || phoneNumber.length < 10) {
      toast({
        title: "Invalid phone number",
        description: "Please enter a valid phone number with country code",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const recaptchaVerifier = setupRecaptcha("recaptcha-container");
      const formattedPhone = phoneNumber.startsWith("+") ? phoneNumber : `+${phoneNumber}`;
      const result = await signInWithPhoneNumber(auth, formattedPhone, recaptchaVerifier);
      
      setConfirmationResult(result);
      setShowOtpInput(true);
      
      toast({
        title: "OTP sent",
        description: "Please check your phone for the verification code",
      });
    } catch (error: any) {
      console.error("Phone sign-in error:", error);
      toast({
        title: "Failed to send OTP",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || !confirmationResult) return;

    setLoading(true);
    try {
      const result = await confirmationResult.confirm(otp);
      
      // Check if employee exists
      const employeeDoc = await getDoc(doc(db, "employees", result.user.uid));
      
      if (!employeeDoc.exists()) {
        toast({
          title: "Account not found",
          description: "Please complete the signup process first.",
          variant: "destructive",
        });
        await auth.signOut();
        return;
      }
      
      toast({
        title: "Welcome back!",
        description: "Login successful",
      });
      
      onLoginSuccess();
    } catch (error: any) {
      console.error("OTP verification error:", error);
      toast({
        title: "Verification failed",
        description: "Invalid OTP. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEmployeeIdLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!employeeId) {
      toast({
        title: "Employee ID required",
        description: "Please enter your Employee ID",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Search for employee by employeeId in Firestore
      const response = await fetch(`/api/employee/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId }),
      });

      if (!response.ok) {
        throw new Error("Employee not found");
      }

      const data = await response.json();
      
      toast({
        title: "Welcome back!",
        description: `Logged in as ${data.employee.fullName}`,
      });
      
      onLoginSuccess();
    } catch (error: any) {
      console.error("Employee ID login error:", error);
      toast({
        title: "Login failed",
        description: "Employee ID not found. Please check and try again.",
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
          <h1 className="text-3xl font-bold text-foreground">Welcome Back</h1>
          <p className="text-muted-foreground">Sign in to your account</p>
        </div>

        <Card className="p-6">
          <Tabs defaultValue="employeeId" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="employeeId" data-testid="tab-employee-id">
                <IdCard className="w-4 h-4 mr-2" />
                Employee ID
              </TabsTrigger>
              <TabsTrigger value="google" data-testid="tab-google">
                <FcGoogle className="w-4 h-4 mr-2" />
                Google
              </TabsTrigger>
              <TabsTrigger value="phone" data-testid="tab-phone">
                <Phone className="w-4 h-4 mr-2" />
                Phone
              </TabsTrigger>
            </TabsList>

            <TabsContent value="employeeId" className="space-y-4">
              <form onSubmit={handleEmployeeIdLogin} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="employeeId" className="text-sm font-medium">
                    Employee ID
                  </label>
                  <Input
                    id="employeeId"
                    type="text"
                    placeholder="Enter your Employee ID"
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    disabled={loading}
                    data-testid="input-employee-id"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading || !employeeId}
                  data-testid="button-login-employee-id"
                >
                  {loading ? <Loader /> : "Sign In"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="google" className="space-y-4">
              <Button
                onClick={handleGoogleSignIn}
                variant="outline"
                className="w-full"
                disabled={loading}
                data-testid="button-google-signin"
              >
                {loading ? <Loader /> : (
                  <>
                    <FcGoogle className="w-5 h-5 mr-2" />
                    Continue with Google
                  </>
                )}
              </Button>
            </TabsContent>

            <TabsContent value="phone" className="space-y-4">
              {!showOtpInput ? (
                <>
                  <div className="space-y-2">
                    <label htmlFor="phone" className="text-sm font-medium">
                      Phone Number
                    </label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+1234567890"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      disabled={loading}
                      data-testid="input-phone"
                    />
                    <p className="text-xs text-muted-foreground">
                      Include country code (e.g., +1 for US)
                    </p>
                  </div>
                  <Button
                    onClick={handlePhoneSignIn}
                    className="w-full"
                    disabled={loading || !phoneNumber}
                    data-testid="button-send-otp"
                  >
                    {loading ? <Loader /> : "Send OTP"}
                  </Button>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <label htmlFor="otp" className="text-sm font-medium">
                      Verification Code
                    </label>
                    <Input
                      id="otp"
                      type="text"
                      placeholder="Enter 6-digit code"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      disabled={loading}
                      maxLength={6}
                      data-testid="input-otp"
                    />
                  </div>
                  <Button
                    onClick={handleVerifyOtp}
                    className="w-full"
                    disabled={loading || otp.length !== 6}
                    data-testid="button-verify-otp"
                  >
                    {loading ? <Loader /> : "Verify OTP"}
                  </Button>
                  <Button
                    onClick={() => {
                      setShowOtpInput(false);
                      setOtp("");
                      setConfirmationResult(null);
                    }}
                    variant="ghost"
                    className="w-full"
                    data-testid="button-back"
                  >
                    Back
                  </Button>
                </>
              )}
              <div id="recaptcha-container"></div>
            </TabsContent>
          </Tabs>

          <div className="mt-6 text-center text-sm">
            <p className="text-muted-foreground">
              Don't have an account?{" "}
              <Link href="/signup">
                <a className="text-primary hover:underline font-medium" data-testid="link-signup">
                  Sign up
                </a>
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
