import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

// This app is single-user by design: once one account exists, signup closes.
// Prevents anyone who finds the app exposed from creating their own login.
export async function POST(req: Request) {
  const existingCount = await prisma.user.count();
  if (existingCount > 0) {
    return NextResponse.json(
      { error: "Signup is closed. This app already has an owner account." },
      { status: 403 }
    );
  }

  const body = await req.json();
  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { email, password } = parsed.data;
  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.create({
    data: { email: email.toLowerCase(), passwordHash },
  });

  return NextResponse.json({ ok: true });
}
