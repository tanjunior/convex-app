import { useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useRouter } from "next/navigation";

export type AuthFlow = "signIn" | "signUp";

interface UseAuthReturn {
  flow: AuthFlow;
  setFlow: (flow: AuthFlow) => void;
  email: string;
  setEmail: (email: string) => void;
  password: string;
  setPassword: (password: string) => void;
  error: string | null;
  setError: (error: string | null) => void;
  isLoading: boolean;
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
  toggleFlow: () => void;
  clearError: () => void;
}

interface UseAuthProps {
  onMfaRequired: (email: string, password: string) => void;
  onMfaSetupRequired: (email: string, password: string) => void;
}

export function useAuth({ onMfaRequired, onMfaSetupRequired }: UseAuthProps): UseAuthReturn {
  const { signIn } = useAuthActions();
  const router = useRouter();
  
  const [flow, setFlow] = useState<AuthFlow>("signIn");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    const formData = new FormData(e.target as HTMLFormElement);
    const emailValue = formData.get("email") as string;
    const passwordValue = formData.get("password") as string;
    
    setEmail(emailValue);
    setPassword(passwordValue);
    formData.set("flow", flow);

    try {
      await signIn("mfa", formData);
      router.push("/");
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      if (errorMessage.includes("MFA is not setup")) {
        onMfaSetupRequired(emailValue, passwordValue);
      } else if (errorMessage.includes("Missing OTP param")) {
        onMfaRequired(emailValue, passwordValue);
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const toggleFlow = () => {
    setFlow(flow === "signIn" ? "signUp" : "signIn");
    setError(null);
  };

  const clearError = () => {
    setError(null);
  };

  return {
    flow,
    setFlow,
    email,
    setEmail,
    password,
    setPassword,
    error,
    setError,
    isLoading,
    handleSubmit,
    toggleFlow,
    clearError,
  };
}