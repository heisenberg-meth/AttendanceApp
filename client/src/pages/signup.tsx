import { useState } from "react";
import { signInWithPopup, signInWithPhoneNumber, ConfirmationResult } from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, googleProvider, setupRecaptcha, db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader } from "@/components/loader";
import { Link, useLocation } from "wouter";
import { FcGoogle } from "react-icons/fc";
import { Phone } from "lucide-react";

export default function SignupPage() {
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const { toast } = useToast();

  const handleGoogleSignUp = async () => {
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      
      // Check if employee already exists
      const employeeDoc = await getDoc(doc(db, "employees", result.user.uid));
      
      if (employeeDoc.exists()) {
        toast({
          title: "Account exists",
          description: "This account already exists. Redirecting to login...",
        });
        setTimeout(() => setLocation("/login"), 2000);
        return;
      }
      
      // Redirect to onboarding
      setLocation("/onboarding");
    } catch (error: any) {
      console.error("Google sign-up error:", error);
      toast({
        title: "Signup failed",
        description: error.message || "Failed to sign up with Google",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneSignUp = async () => {
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
      console.error("Phone sign-up error:", error);
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
      
      // Check if employee already exists
      const employeeDoc = await getDoc(doc(db, "employees", result.user.uid));
      
      if (employeeDoc.exists()) {
        toast({
          title: "Account exists",
          description: "This account already exists. Redirecting to login...",
        });
        setTimeout(() => setLocation("/login"), 2000);
        return;
      }
      
      // Redirect to onboarding
      setLocation("/onboarding");
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

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md space-y-6 animate-fade-in">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Get Started</h1>
          <p className="text-muted-foreground">Create your account to continue</p>
        </div>

        <Card className="p-6">
          <Tabs defaultValue="google" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="google" data-testid="tab-google">
                <FcGoogle className="w-4 h-4 mr-2" />
                Google
              </TabsTrigger>
              <TabsTrigger value="phone" data-testid="tab-phone">
                <Phone className="w-4 h-4 mr-2" />
                Phone
              </TabsTrigger>
            </TabsList>

            <TabsContent value="google" className="space-y-4">
              <Button
                onClick={handleGoogleSignUp}
                variant="outline"
                className="w-full"
                disabled={loading}
                data-testid="button-google-signup"
              >
                {loading ? <Loader /> : (
                  <>
                    <FcGoogle className="w-5 h-5 mr-2" />
                    Continue with Google
                  </>
                )}
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                You'll be asked to complete your profile after signing in
              </p>
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
                    onClick={handlePhoneSignUp}
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
                    {loading ? <Loader /> : "Verify & Continue"}
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
              Already have an account?{" "}
              <Link href="/login">
                <a className="text-primary hover:underline font-medium" data-testid="link-login">
                  Sign in
                </a>
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
