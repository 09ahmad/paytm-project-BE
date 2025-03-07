import { z } from "zod";

export const usernameSchema = z
  .string()
  .email()
  .min(5, { message: "username must have atleast 4 characters" });
export const passwordSchema = z
  .string()
  .min(5, {
    message: "password should have minimum length of 5",
  })
  .regex(/^(?=.*[A-Z]).{8,}$/, {
    message:
      "Should Contain at least one uppercase letter and have a minimum length of 8 characters.",
  });
