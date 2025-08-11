import { convexAuth } from "@convex-dev/auth/server";
import { MFA } from "./MFA";
import { internalQuery, mutation } from "./_generated/server";
import { Base64, ConvexError, v } from "convex/values";
import { RandomReader } from "@oslojs/crypto/random";
import { encodeBase32UpperCaseNoPadding } from "@oslojs/encoding";
import { createTOTPKeyURI, verifyTOTP } from "@oslojs/otp";
import { Scrypt } from "lucia";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [MFA],
});

export const getAccountByAccountId = internalQuery({
  args: { accountId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("authAccounts")
      .withIndex("providerAndAccountId", (q) =>
        q.eq("provider", "mfa").eq("providerAccountId", args.accountId),
      )
      .first();
  },
});

export const setupMfa = mutation({
  args: {
    email: v.string(),
    password: v.string(),
    otp: v.string(),
    secretBytes: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .first();
    if (!user) {
      throw new ConvexError("User not found");
    }
    const authAccount = await ctx.db
      .query("authAccounts")
      .withIndex("userIdAndProvider", (q) => q.eq("userId", user._id))
      .first();
    if (!authAccount) {
      throw new ConvexError("Auth account not found");
    }

    const match = await verifySecret(args.password, authAccount.secret!);
    if (!match) {
      throw new ConvexError("Invalid email or password");
    }

    const secretBytes = Base64.toByteArray(args.secretBytes);

    const valid = verifyTOTP(secretBytes, 30, 6, args.otp);

    if (!valid) {
      throw new ConvexError("Invalid totp");
    }

    const totpSecret = encodeBase32UpperCaseNoPadding(secretBytes);

    ctx.db.patch(authAccount._id, {
      totpSecret: totpSecret,
      authenticatorIsSetup: true,
    });

    return true;
  },
});

export const generateTotpSecret = mutation({
  args: { email: v.string(), password: v.string() },
  handler: async (ctx, args) => {
    // console.log("args", args);
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .first();
    if (!user) {
      throw new ConvexError("User not found");
    }

    const authAccount = await ctx.db
      .query("authAccounts")
      .withIndex("userIdAndProvider", (q) => q.eq("userId", user._id))
      .first();

    if (!authAccount) {
      throw new ConvexError("Auth account not found");
    }

    const match = await verifySecret(args.password, authAccount.secret!);
    if (!match) {
      throw new ConvexError("Invalid email or password");
    }

    try {
      const random: RandomReader = {
        read(bytes: Uint8Array): void {
          crypto.getRandomValues(bytes);
        },
      };
      const secretBytes = getRandomBytes(20, random);

      const uri = createTOTPKeyURI("MFA-TEST", args.email, secretBytes, 30, 6);
      // console.log("uri", uri);

      return { uri, secretBytes: Base64.fromByteArray(secretBytes) };
    } catch (error) {
      console.log("error", error);
      throw new ConvexError("Error generating totp secret");
    }
  },
});

function getRandomBytes(length: number, reader: RandomReader): Uint8Array {
  const bytes = new Uint8Array(length);
  reader.read(bytes);
  return bytes;
}
async function verifySecret(password: string, hash: string) {
  return await new Scrypt().verify(hash, password);
}
