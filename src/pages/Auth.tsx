import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { BookOpen, Eye, EyeOff, Mail, ArrowLeft, Loader2 } from "lucide-react";
import { z } from "zod";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

const authSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  fullName: z.string().min(2, "Name must be at least 2 characters").optional(),
});

const Auth = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  
  // OTP Sign Up states
  const [showOTPSignUp, setShowOTPSignUp] = useState(false);
  const [otpStep, setOtpStep] = useState<"email" | "otp" | "password">("email");
  const [otpValue, setOtpValue] = useState("");
  const [otpEmail, setOtpEmail] = useState("");
  const [otpFullName, setOtpFullName] = useState("");
  const [otpPassword, setOtpPassword] = useState("");
  const [sendingOTP, setSendingOTP] = useState(false);
  const [verifyingOTP, setVerifyingOTP] = useState(false);

  // OTP Sign In states
  const [showOTPSignIn, setShowOTPSignIn] = useState(false);
  const [signInOtpStep, setSignInOtpStep] = useState<"email" | "otp">("email");
  const [signInOtpEmail, setSignInOtpEmail] = useState("");
  const [signInOtpValue, setSignInOtpValue] = useState("");

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate("/dashboard");
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/dashboard");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validatedData = authSchema.parse({ email, password });
      
      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signUp({
        email: validatedData.email,
        password: validatedData.password,
        options: {
          emailRedirectTo: redirectUrl
        }
      });

      if (error) {
        if (error.message.includes("already registered")) {
          toast.error("This email is already registered. Please sign in instead.");
        } else {
          toast.error(error.message);
        }
      } else {
        toast.success("Account created successfully! Please sign in.");
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error("An error occurred during sign up");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validatedData = authSchema.parse({ email, password });
      
      const { error } = await supabase.auth.signInWithPassword({
        email: validatedData.email,
        password: validatedData.password,
      });

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          toast.error("Invalid email or password. Please try again.");
        } else {
          toast.error(error.message);
        }
      } else {
        toast.success("Signed in successfully!");
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error("An error occurred during sign in");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`
        }
      });

      if (error) {
        toast.error(error.message);
      }
    } catch (error) {
      toast.error("An error occurred during Google sign in");
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validatedEmail = z.string().email().parse(email);
      
      const { error } = await supabase.auth.resetPasswordForEmail(validatedEmail, {
        redirectTo: `${window.location.origin}/auth`,
      });

      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Password reset email sent! Check your inbox.");
        setShowForgotPassword(false);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error("Please enter a valid email address");
      } else {
        toast.error("An error occurred");
      }
    } finally {
      setLoading(false);
    }
  };

  // OTP Sign Up Handlers
  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setSendingOTP(true);

    try {
      const validatedEmail = z.string().email().parse(otpEmail);
      const validatedName = z.string().min(2).parse(otpFullName);

      const response = await supabase.functions.invoke("send-otp", {
        body: { email: validatedEmail },
      });

      if (response.error) {
        toast.error(response.error.message || "Failed to send OTP");
        return;
      }

      if (response.data?.error) {
        toast.error(response.data.error);
        return;
      }

      toast.success("Verification code sent to your email!");
      setOtpStep("otp");
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error("Failed to send verification code");
      }
    } finally {
      setSendingOTP(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otpValue.length !== 6) {
      toast.error("Please enter the complete 6-digit code");
      return;
    }

    setVerifyingOTP(true);

    try {
      // First verify the OTP
      const response = await supabase.functions.invoke("verify-otp", {
        body: { 
          email: otpEmail, 
          otp: otpValue,
          isSignUp: false // Just verify first
        },
      });

      if (response.error) {
        toast.error(response.error.message || "Invalid verification code");
        return;
      }

      if (response.data?.error) {
        toast.error(response.data.error);
        return;
      }

      toast.success("Email verified! Now set your password.");
      setOtpStep("password");
    } catch (error) {
      toast.error("Failed to verify code");
    } finally {
      setVerifyingOTP(false);
    }
  };

  const handleCompleteOTPSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validatedPassword = z.string().min(6, "Password must be at least 6 characters").parse(otpPassword);

      // Send a new OTP and verify with password in one step
      // First send new OTP
      const sendResponse = await supabase.functions.invoke("send-otp", {
        body: { email: otpEmail },
      });

      if (sendResponse.error || sendResponse.data?.error) {
        // If we can't send, try to create the user directly since email was already verified
        const response = await supabase.functions.invoke("verify-otp", {
          body: { 
            email: otpEmail, 
            otp: otpValue,
            password: validatedPassword,
            fullName: otpFullName,
            isSignUp: true
          },
        });

        if (response.error) {
          toast.error(response.error.message || "Failed to create account");
          return;
        }

        if (response.data?.error) {
          toast.error(response.data.error);
          return;
        }
      }

      // Create user via the edge function
      const createResponse = await supabase.functions.invoke("verify-otp", {
        body: { 
          email: otpEmail, 
          otp: otpValue,
          password: validatedPassword,
          fullName: otpFullName,
          isSignUp: true
        },
      });

      if (createResponse.data?.error) {
        toast.error(createResponse.data.error);
        return;
      }

      toast.success("Account created successfully! Please sign in.");
      
      // Reset OTP form and switch to sign in
      setShowOTPSignUp(false);
      setOtpStep("email");
      setOtpValue("");
      setOtpEmail("");
      setOtpFullName("");
      setOtpPassword("");
      setEmail(otpEmail);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error("Failed to create account");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setSendingOTP(true);
    try {
      const response = await supabase.functions.invoke("send-otp", {
        body: { email: otpEmail },
      });

      if (response.error || response.data?.error) {
        toast.error("Failed to resend code");
        return;
      }

      toast.success("New verification code sent!");
    } catch (error) {
      toast.error("Failed to resend code");
    } finally {
      setSendingOTP(false);
    }
  };

  const resetOTPFlow = () => {
    setShowOTPSignUp(false);
    setOtpStep("email");
    setOtpValue("");
    setOtpEmail("");
    setOtpFullName("");
    setOtpPassword("");
  };

  // OTP Sign In Handlers
  const handleSendSignInOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setSendingOTP(true);

    try {
      const validatedEmail = z.string().email().parse(signInOtpEmail);

      const response = await supabase.functions.invoke("send-otp", {
        body: { email: validatedEmail },
      });

      if (response.error) {
        toast.error(response.error.message || "Failed to send OTP");
        return;
      }

      if (response.data?.error) {
        toast.error(response.data.error);
        return;
      }

      toast.success("Verification code sent to your email!");
      setSignInOtpStep("otp");
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error("Failed to send verification code");
      }
    } finally {
      setSendingOTP(false);
    }
  };

  const handleVerifySignInOTP = async () => {
    if (signInOtpValue.length !== 6) {
      toast.error("Please enter the complete 6-digit code");
      return;
    }

    setVerifyingOTP(true);

    try {
      const response = await supabase.functions.invoke("verify-otp", {
        body: { 
          email: signInOtpEmail, 
          otp: signInOtpValue,
          isSignUp: false,
          isSignIn: true
        },
      });

      if (response.error) {
        toast.error(response.error.message || "Invalid verification code");
        return;
      }

      if (response.data?.error) {
        toast.error(response.data.error);
        return;
      }

      // If we got a token_hash, verify with Supabase to complete sign in
      if (response.data?.token_hash) {
        const { error: verifyError } = await supabase.auth.verifyOtp({
          email: signInOtpEmail,
          token: response.data.token_hash,
          type: 'magiclink'
        });

        if (verifyError) {
          // Try alternative: sign in with the magic link directly
          toast.success("Email verified! Please use the magic link sent to your email.");
          resetSignInOTPFlow();
          return;
        }
      }

      toast.success("Signed in successfully!");
      // Auth state change will handle navigation
    } catch (error) {
      toast.error("Failed to sign in");
    } finally {
      setVerifyingOTP(false);
    }
  };

  const handleResendSignInOTP = async () => {
    setSendingOTP(true);
    try {
      const response = await supabase.functions.invoke("send-otp", {
        body: { email: signInOtpEmail },
      });

      if (response.error || response.data?.error) {
        toast.error("Failed to resend code");
        return;
      }

      toast.success("New verification code sent!");
    } catch (error) {
      toast.error("Failed to resend code");
    } finally {
      setSendingOTP(false);
    }
  };

  const resetSignInOTPFlow = () => {
    setShowOTPSignIn(false);
    setSignInOtpStep("email");
    setSignInOtpEmail("");
    setSignInOtpValue("");
  };

  // OTP Sign Up UI
  if (showOTPSignUp) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--gradient-primary)' }}>
        <Card className="w-full max-w-md shadow-[var(--shadow-medium)]">
          <CardHeader className="text-center">
            <Button
              variant="ghost"
              size="sm"
              className="absolute left-4 top-4"
              onClick={resetOTPFlow}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <div className="flex justify-center mb-4 mt-4">
              <div className="p-3 rounded-full bg-primary/10">
                <BookOpen className="h-8 w-8 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">
              {otpStep === "email" && "Sign Up with Email OTP"}
              {otpStep === "otp" && "Enter Verification Code"}
              {otpStep === "password" && "Set Your Password"}
            </CardTitle>
            <CardDescription>
              {otpStep === "email" && "We'll send a verification code to your email"}
              {otpStep === "otp" && `Enter the 6-digit code sent to ${otpEmail}`}
              {otpStep === "password" && "Create a password for your account"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {otpStep === "email" && (
              <form onSubmit={handleSendOTP} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="otp-name">Full Name</Label>
                  <Input
                    id="otp-name"
                    type="text"
                    placeholder="Your name"
                    value={otpFullName}
                    onChange={(e) => setOtpFullName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="otp-email">Email</Label>
                  <Input
                    id="otp-email"
                    type="email"
                    placeholder="you@example.com"
                    value={otpEmail}
                    onChange={(e) => setOtpEmail(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={sendingOTP}>
                  {sendingOTP ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending Code...
                    </>
                  ) : (
                    "Send Verification Code"
                  )}
                </Button>
              </form>
            )}

            {otpStep === "otp" && (
              <div className="space-y-6">
                <div className="flex justify-center">
                  <InputOTP
                    maxLength={6}
                    value={otpValue}
                    onChange={(value) => setOtpValue(value)}
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                <Button 
                  className="w-full" 
                  onClick={handleVerifyOTP}
                  disabled={verifyingOTP || otpValue.length !== 6}
                >
                  {verifyingOTP ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    "Verify Code"
                  )}
                </Button>
                <div className="text-center">
                  <Button
                    type="button"
                    variant="link"
                    className="text-sm text-muted-foreground"
                    onClick={handleResendOTP}
                    disabled={sendingOTP}
                  >
                    {sendingOTP ? "Sending..." : "Didn't receive the code? Resend"}
                  </Button>
                </div>
              </div>
            )}

            {otpStep === "password" && (
              <form onSubmit={handleCompleteOTPSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="otp-password">Password</Label>
                  <div className="relative">
                    <Input
                      id="otp-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={otpPassword}
                      onChange={(e) => setOtpPassword(e.target.value)}
                      required
                      minLength={6}
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">Must be at least 6 characters</p>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating Account...
                    </>
                  ) : (
                    "Create Account"
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // OTP Sign In UI
  if (showOTPSignIn) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--gradient-primary)' }}>
        <Card className="w-full max-w-md shadow-[var(--shadow-medium)]">
          <CardHeader className="text-center">
            <Button
              variant="ghost"
              size="sm"
              className="absolute left-4 top-4"
              onClick={resetSignInOTPFlow}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <div className="flex justify-center mb-4 mt-4">
              <div className="p-3 rounded-full bg-primary/10">
                <BookOpen className="h-8 w-8 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">
              {signInOtpStep === "email" ? "Sign In with Email OTP" : "Enter Verification Code"}
            </CardTitle>
            <CardDescription>
              {signInOtpStep === "email" 
                ? "We'll send a verification code to your email" 
                : `Enter the 6-digit code sent to ${signInOtpEmail}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {signInOtpStep === "email" && (
              <form onSubmit={handleSendSignInOTP} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-otp-email">Email</Label>
                  <Input
                    id="signin-otp-email"
                    type="email"
                    placeholder="you@example.com"
                    value={signInOtpEmail}
                    onChange={(e) => setSignInOtpEmail(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={sendingOTP}>
                  {sendingOTP ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending Code...
                    </>
                  ) : (
                    "Send Verification Code"
                  )}
                </Button>
              </form>
            )}

            {signInOtpStep === "otp" && (
              <div className="space-y-6">
                <div className="flex justify-center">
                  <InputOTP
                    maxLength={6}
                    value={signInOtpValue}
                    onChange={(value) => setSignInOtpValue(value)}
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                <Button 
                  className="w-full" 
                  onClick={handleVerifySignInOTP}
                  disabled={verifyingOTP || signInOtpValue.length !== 6}
                >
                  {verifyingOTP ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    "Sign In"
                  )}
                </Button>
                <div className="text-center">
                  <Button
                    type="button"
                    variant="link"
                    className="text-sm text-muted-foreground"
                    onClick={handleResendSignInOTP}
                    disabled={sendingOTP}
                  >
                    {sendingOTP ? "Sending..." : "Didn't receive the code? Resend"}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--gradient-primary)' }}>
      <Card className="w-full max-w-md shadow-[var(--shadow-medium)]">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-full bg-primary/10">
              <BookOpen className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold">AcePlan</CardTitle>
          <CardDescription>Your personal study management companion</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin">
              {showForgotPassword ? (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reset-email">Email</Label>
                    <Input
                      id="reset-email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Sending..." : "Send Reset Link"}
                  </Button>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    className="w-full" 
                    onClick={() => setShowForgotPassword(false)}
                  >
                    Back to Sign In
                  </Button>
                </form>
              ) : (
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Password</Label>
                  <div className="relative">
                    <Input
                      id="signin-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Signing in..." : "Sign In"}
                </Button>

                <div className="text-center">
                  <Button
                    type="button"
                    variant="link"
                    className="text-sm text-muted-foreground hover:text-primary"
                    onClick={() => setShowForgotPassword(true)}
                  >
                    Forgot password?
                  </Button>
                </div>

                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="w-full border-primary text-primary hover:bg-primary/10"
                    onClick={() => setShowOTPSignIn(true)}
                  >
                    <Mail className="mr-2 h-4 w-4" />
                    Sign In with Email OTP
                  </Button>

                  <Button 
                    type="button" 
                    variant="outline" 
                    className="w-full" 
                    onClick={handleGoogleSignIn}
                  >
                    <Mail className="mr-2 h-4 w-4" />
                    Google
                  </Button>
                </div>
              </form>
              )}
            </TabsContent>
            
            <TabsContent value="signup">
              <div className="space-y-4">
                {/* Email OTP Sign Up Button */}
                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full border-primary text-primary hover:bg-primary/10"
                  onClick={() => setShowOTPSignUp(true)}
                >
                  <Mail className="mr-2 h-4 w-4" />
                  Sign Up with Email OTP
                </Button>

                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">Or sign up with password</span>
                  </div>
                </div>

                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Full Name</Label>
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="Your name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <div className="relative">
                      <Input
                        id="signup-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Creating account..." : "Sign Up"}
                  </Button>

                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
                    </div>
                  </div>

                  <Button 
                    type="button" 
                    variant="outline" 
                    className="w-full" 
                    onClick={handleGoogleSignIn}
                  >
                    <Mail className="mr-2 h-4 w-4" />
                    Google
                  </Button>
                </form>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;