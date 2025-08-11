import { useState } from "react";
import { useMutation } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { AuthFlow } from "./useAuth";

export type MfaStage = "setup" | "verify";

interface UseMfaReturn {
  showDialog: boolean;
  setShowDialog: (show: boolean) => void;
  stage: MfaStage;
  setStage: (stage: MfaStage) => void;
  uri: string | undefined;
  otp: string | undefined;
  setOtp: (otp: string | undefined) => void;
  secretBytes: string | undefined;
  isLoading: boolean;
  handleMfaSetup: (email: string, password: string) => Promise<void>;
  handleMfaSubmit: (
    email: string,
    password: string,
    flow: AuthFlow,
    onError: (error: string) => void,
  ) => Promise<void>;
  resetMfaState: () => void;
}

export function useMFA(): UseMfaReturn {
  const { signIn } = useAuthActions();
  const router = useRouter();
  const setupMfaMutation = useMutation(api.auth.setupMfa);
  const generateTotpSecretMutation = useMutation(api.auth.generateTotpSecret);

  const [showDialog, setShowDialog] = useState<boolean>(false);
  const [stage, setStage] = useState<MfaStage>("verify");
  const [uri, setUri] = useState<string | undefined>(undefined);
  const [otp, setOtp] = useState<string | undefined>(undefined);
  const [secretBytes, setSecretBytes] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleMfaSetup = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const res = await generateTotpSecretMutation({ email, password });

      if (res && res.uri && res.secretBytes) {
        setUri(res.uri);
        setSecretBytes(res.secretBytes);
        setStage("setup");
        setShowDialog(true);
      }
    } catch (error) {
      console.error("Failed to generate TOTP secret:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMfaSubmit = async (
    email: string,
    password: string,
    flow: AuthFlow,
    onError: (error: string) => void,
  ) => {
    if (!otp) return;

    setIsLoading(true);

    try {
      if (stage === "setup") {
        if (!secretBytes) {
          throw new Error("Secret bytes not available");
        }

        const res = await setupMfaMutation({
          email,
          password,
          otp,
          secretBytes,
        });

        if (res) {
          await signIn("mfa", {
            email,
            password,
            otp,
            flow: "signIn",
          });

          router.push("/");
        }
      } else if (stage === "verify") {
        await signIn("mfa", {
          email,
          password,
          otp,
          flow,
        }).then();

        router.push("/");
      }
    } catch (error: unknown) {
      setOtp(undefined);
      const errorMessage =
        error instanceof Error ? error.message : "An unknown error occurred";
      onError(errorMessage);

      if (stage === "verify") {
        setShowDialog(false);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const resetMfaState = () => {
    setOtp(undefined);
    setSecretBytes(undefined);
    setUri(undefined);
    setStage("verify");
  };

  return {
    showDialog,
    setShowDialog,
    stage,
    setStage,
    uri,
    otp,
    setOtp,
    secretBytes,
    isLoading,
    handleMfaSetup,
    handleMfaSubmit,
    resetMfaState,
  };
}
