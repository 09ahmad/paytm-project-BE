"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = void 0;
const express_1 = __importDefault(require("express"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("./config");
const app = (0, express_1.default)();
app.use(express_1.default.json());
const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;
    console.log(authHeader);
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res.status(403).json({
            error: "Unauthorized",
        });
        return;
    }
    const token = authHeader.split(" ")[1];
    try {
        const decode = jsonwebtoken_1.default.verify(token, config_1.JWT_SECRET_KEY);
        if (decode && decode.userId) {
            req.userId = decode.userId;
            next();
        }
        else {
            res.status(403).json({
                message: "Invalid token payload",
            });
            return;
        }
    }
    catch (error) {
        res.status(403).json({
            message: "Error in middleware authorization",
        });
        return;
    }
};
exports.authMiddleware = authMiddleware;
