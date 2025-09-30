"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.comparePassword = exports.hashPassword = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const hashPassword = async (plainPassword) => {
    const saltRounds = 10;
    return await bcrypt_1.default.hash(plainPassword, saltRounds);
};
exports.hashPassword = hashPassword;
const comparePassword = async (plainPassword, hash) => {
    return await bcrypt_1.default.compare(plainPassword, hash);
};
exports.comparePassword = comparePassword;
