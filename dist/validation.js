"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.passwordSchema = exports.usernameSchema = void 0;
const zod_1 = require("zod");
exports.usernameSchema = zod_1.z
    .string()
    .email()
    .min(5, { message: "username must have atleast 4 characters" });
exports.passwordSchema = zod_1.z
    .string()
    .min(5, {
    message: "password should have minimum length of 5",
})
    .regex(/^(?=.*[A-Z]).{8,}$/, {
    message: "Should Contain at least one uppercase letter and have a minimum length of 8 characters.",
});
