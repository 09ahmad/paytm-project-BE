"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const router = express_1.default.Router();
const cors_1 = __importDefault(require("cors"));
const validation_1 = require("../validation");
const db_1 = require("../db");
const config_1 = require("../config");
const middleware_1 = require("../middleware");
const zod_1 = require("zod");
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use((0, cors_1.default)());
router.post("/signup", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const validateUsername = validation_1.usernameSchema.safeParse(req.body.username);
        const validatePassword = validation_1.passwordSchema.safeParse(req.body.password);
        if (!validateUsername.success || !validatePassword.success) {
            res.json({
                message: "Validation faild",
            });
            return;
        }
        const { firstName, lastName, username, password } = req.body;
        const existingUser = yield db_1.UserModel.findOne({
            username: username,
        });
        if (existingUser) {
            res.json({
                message: "user already exist",
            });
            return;
        }
        const dbUser = yield db_1.UserModel.create({
            firstName: firstName,
            lastName: lastName,
            username: username,
            password: password,
        });
        /// ----- Create new account ------
        const userId = dbUser._id;
        yield db_1.Account.create({
            userId,
            balance: 1 + Math.random() * 10000,
        });
        /// -----  ------
        const token = jsonwebtoken_1.default.sign({
            userId: dbUser._id,
        }, config_1.JWT_SECRET_KEY, {
            expiresIn: "1h",
        });
        res.status(200).json({
            message: "User created successfully",
            token: token,
        });
    }
    catch (error) {
        console.error("Error while creating new user", error);
    }
}));
router.post("/signin", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const body = req.body;
    const username = body.username;
    const password = body.password;
    const validateUsername = validation_1.usernameSchema.safeParse(username);
    const validatePassword = validation_1.passwordSchema.safeParse(password);
    if (!validateUsername.success || !validatePassword.success) {
        res.json({
            message: "User validation failed due to incorrect input token ",
        });
        return;
    }
    try {
        const user = yield db_1.UserModel.findOne({
            username,
        });
        if (!(user === null || user === void 0 ? void 0 : user._id)) {
            res.status(411).json({
                message: "User does not exist",
            });
            return;
        }
        const token = jsonwebtoken_1.default.sign({ userId: user._id }, config_1.JWT_SECRET_KEY);
        res.status(200).json({
            message: "signed in ",
            token: token,
        });
    }
    catch (error) {
        console.error("Error while signup", error);
    }
}));
const updateBody = zod_1.z.object({
    password: zod_1.z.string().optional(),
    firstName: zod_1.z.string().optional(),
    lastName: zod_1.z.string().optional(),
});
router.put("/", middleware_1.authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { success } = updateBody.safeParse(req.body);
    if (!success) {
        res.status(411).json({
            message: "User validation failded",
        });
        return;
    }
    try {
        yield db_1.UserModel.updateOne({ _id: req.userId }, req.body);
        res.status(200).json({
            message: "Updated successfully",
        });
    }
    catch (error) {
        res.json({
            message: "Something went wrong while updating the information ",
        });
    }
}));
router.get("/bulk", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const filter = req.query.filter || "";
    try {
        const users = yield db_1.UserModel.find({
            $or: [
                {
                    firstName: { $regex: { filter } },
                    lastName: { $regex: { filter } },
                },
            ],
        });
        if (!users) {
            res.status(404).json({
                message: "no user found for the name",
            });
            return;
        }
        res.json({
            user: users.map((user) => ({
                username: user.username,
                firstName: user.firstName,
                lastName: user.lastName,
                _id: user._id,
            })),
        });
    }
    catch (error) {
        res.status(403).json({
            message: "unable to search",
        });
    }
}));
exports.default = router;
