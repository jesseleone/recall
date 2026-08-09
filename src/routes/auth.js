import { Router } from "express";
import { User } from "../models/User.js";
import { signToken } from "../middleware/auth.js";

export const authRouter = Router();

authRouter.post("/register", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password || password.length < 8) {
    return res.status(400).json({ error: "email and password (min 8 chars) are required" });
  }

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    return res.status(409).json({ error: "An account with that email already exists" });
  }

  const passwordHash = await User.hashPassword(password);
  const user = await User.create({ email, passwordHash });

  res.status(201).json({ token: signToken(user), user: { id: user._id, email: user.email } });
});

authRouter.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: (email || "").toLowerCase() });

  if (!user || !(await user.verifyPassword(password || ""))) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  res.json({ token: signToken(user), user: { id: user._id, email: user.email } });
});
