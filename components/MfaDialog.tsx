import { QRCode } from "react-qrcode-logo";
import { Button } from "@/components/ui/button";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MfaStage } from "@/hooks/useMFA";
import { AuthFlow } from "@/hooks/useAuth";

interface MfaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stage: MfaStage;
  uri?: string;
  otp?: string;
  onOtpChange: (value: string) => void;
  onSubmit: (email: string, password: string, flow: AuthFlow, onError: (error: string) => void) => Promise<void>;
  email: string;
  password: string;
  flow: AuthFlow;
  onError: (error: string) => void;
  isLoading: boolean;
}

export function MfaDialog({
  open,
  onOpenChange,
  stage,
  uri,
  otp,
  onOtpChange,
  onSubmit,
  email,
  password,
  flow,
  onError,
  isLoading,
}: MfaDialogProps) {
  const handleSubmit = () => {
    onSubmit(email, password, flow, onError);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {stage === "setup" ? "Set up MFA" : "Verify MFA"}
          </DialogTitle>
          <DialogDescription>
            {stage === "setup"
              ? "Your account MFA is not setup. Please set it up to continue."
              : "Please enter the OTP code to verify your login."}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex items-center gap-2">
          <div className="flex flex-col items-center justify-center gap-4 mx-auto">
            {stage === "setup" && uri && (
              <QRCode value={uri} logoImage="/convex.svg" size={250} />
            )}

            <InputOTP
              maxLength={6}
              value={otp}
              onChange={onOtpChange}
              disabled={isLoading}
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
            
            <Button
              onClick={handleSubmit}
              disabled={!otp || otp.length !== 6 || isLoading}
              className="w-full"
            >
              {isLoading ? "Submitting..." : "Submit"}
            </Button>
          </div>
        </div>
        
        <DialogFooter className="sm:justify-start">
          <DialogClose asChild>
            <Button type="button" variant="secondary" disabled={isLoading}>
              Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}