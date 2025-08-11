import { ConvexCredentials } from "@convex-dev/auth/providers/ConvexCredentials";
import {
  type GenericDoc,
  createAccount,
  retrieveAccount,
} from "@convex-dev/auth/server";
import type { GenericDataModel } from "convex/server";
import { ConvexError } from "convex/values";
import { Scrypt } from "lucia";
import { verifyTOTP } from "@oslojs/otp";
import { decodeBase32 } from "@oslojs/encoding";
import { internal } from "./_generated/api";

export const MFA = ConvexCredentials({
  id: "mfa",
  authorize: async (params, ctx) => {
    //   const { hash, verify } = new Scrypt();
    const flow = params.flow as string;
    const passwordToValidate =
      flow === "signUp"
        ? (params.password as string)
        : flow === "reset-verification"
          ? (params.newPassword as string)
          : null;
    if (passwordToValidate !== null) {
      validateDefaultPasswordRequirements(passwordToValidate);
    }
    const profile = defaultProfile(params);
    const { email } = profile;
    const secret = params.password as string;
    let account: GenericDoc<GenericDataModel, "authAccounts">;
    let user: GenericDoc<GenericDataModel, "users">;
    if (flow === "signUp") {

      //check if email already exist
      const existingAccount = await ctx.runQuery(internal.auth.getAccountByAccountId, { accountId: email });
      if (existingAccount !== null) {
        throw new ConvexError({
          message: "Email already exist",
          code: "EMAIL_ALREADY_EXIST",
        });
      }


      if (secret === undefined) {
        throw new Error("Missing `password` param for `signUp` flow");
      }
      const created = await createAccount(ctx, {
        provider: "mfa",
        account: { id: email, secret },
        profile: profile as any,
        shouldLinkViaEmail: true,
        shouldLinkViaPhone: false,
      });

      ({ account, user } = created);

      throw new ConvexError({
        message: "MFA is not setup",
        code: "MFA_NOT_SETUP",
      });
    } else if (flow === "signIn") {
      if (secret === undefined) {
        throw new Error("Missing `password` param for `signIn` flow");
      }
      const retrieved = await retrieveAccount(ctx, {
        provider: "mfa",
        account: { id: email, secret },
      });
      if (retrieved === null) {
        throw new Error("Invalid credentials");
      }

      ({ account, user } = retrieved);

      if (!account.authenticatorIsSetup) {
        throw new ConvexError({
          message: "MFA is not setup",
          code: "MFA_NOT_SETUP",
        });
      }

      if ((params.otp as string) === undefined) {
        throw new ConvexError("Missing OTP param");
      }

      const totpSecret = decodeBase32(account.totpSecret as string);
      const valid = verifyTOTP(totpSecret, 30, 6, params.otp as string);

      if (!valid) {
        throw new ConvexError("Invalid OTP");
      }

      // START: Optional, support password reset
    } else {
      throw new Error(
        "Missing `flow` param, it must be one of " +
          '"signUp", "signIn", "reset", "reset-verification" or ' +
          '"email-verification"!',
      );
    }
    // START: Optional, email verification during sign in
    //   if (!account.emailVerified) {
    //     return await signInViaProvider(ctx, config.verify, {
    //       accountId: account._id,
    //       params,
    //     });
    //   }
    // END
    return { userId: user._id };
  },
  crypto: {
    async hashSecret(password: string) {
      return await new Scrypt().hash(password);
    },
    async verifySecret(password: string, hash: string) {
      return await new Scrypt().verify(hash, password);
    },
  },
});

function validateDefaultPasswordRequirements(password: string) {
  if (!password || password.length < 8) {
    throw new Error("Invalid password");
  }
}

function defaultProfile(params: Record<string, unknown>) {
  return {
    email: params.email as string,
  };
}
