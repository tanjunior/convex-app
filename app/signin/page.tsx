"use client";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useMFA } from "@/hooks/useMFA";
import { MfaDialog } from "@/components/MfaDialog";
import { FormInput } from "@/components/FormInput";
import { ErrorMessage } from "@/components/ErrorMessage";

export default function SignIn() {
  const auth = useAuth({
    onMfaRequired: () => {
      mfa.setStage("verify");
      mfa.setShowDialog(true);
    },
    onMfaSetupRequired: (email, password) => {
      mfa.handleMfaSetup(email, password);
    },
  });
  
  const mfa = useMFA();
  return (
    <div className="flex flex-col gap-8 w-96 mx-auto h-screen justify-center items-center">
      <p>Log in to see the numbers</p>
      
      <form className="flex flex-col gap-4" onSubmit={auth.handleSubmit}>
        <FormInput
          type="email"
          name="email"
          placeholder="Email"
          required
        />
        
        <FormInput
          type="password"
          name="password"
          placeholder="Password"
          required
        />
        
        <Button
          type="submit"
          disabled={auth.isLoading}
          className="w-full"
        >
          {auth.isLoading 
            ? "Loading..." 
            : auth.flow === "signIn" 
              ? "Sign in" 
              : "Sign up"
          }
        </Button>
        
        <div className="flex flex-row gap-2 text-sm">
          <span>
            {auth.flow === "signIn"
              ? "Don't have an account?"
              : "Already have an account?"}
          </span>
          <button
            type="button"
            className="text-foreground underline hover:no-underline cursor-pointer"
            onClick={auth.toggleFlow}
            disabled={auth.isLoading}
          >
            {auth.flow === "signIn" ? "Sign up instead" : "Sign in instead"}
          </button>
        </div>
        
        <ErrorMessage error={auth.error} />
      </form>

      <MfaDialog
        open={mfa.showDialog}
        onOpenChange={mfa.setShowDialog}
        stage={mfa.stage}
        uri={mfa.uri}
        otp={mfa.otp}
        onOtpChange={mfa.setOtp}
        onSubmit={mfa.handleMfaSubmit}
        email={auth.email}
        password={auth.password}
        flow={auth.flow}
        onError={auth.setError}
        isLoading={mfa.isLoading}
      />
    </div>
  );
}
