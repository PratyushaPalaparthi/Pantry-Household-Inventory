// Sets (or resets) the owner account's password.
//
// A single-user self-hosted app has no email-based password reset, so this is
// the recovery path. It updates the password hash in place, leaving inventory,
// receipts, and price history untouched.
//
//   npm run set-password
//   npm run set-password -- someone@example.com   (if you have >1 account)
//
// The password is read from stdin, never from argv, so it doesn't land in your
// shell history or the process list. Typing is hidden when run interactively.

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { createInterface } from "readline";
import { Writable } from "stream";
import { stdin, stdout } from "process";

const MIN_LENGTH = 8;

// For piped (non-TTY) input, stdin is drained once up front and served line by
// line — reading it per-prompt would discard whatever arrived in the same chunk.
let pipedLines = null;

async function readPipedLine() {
  if (pipedLines === null) {
    const chunks = [];
    stdin.setEncoding("utf8");
    for await (const chunk of stdin) chunks.push(chunk);
    pipedLines = chunks.join("").split("\n").map((line) => line.replace(/\r$/, ""));
  }
  return pipedLines.shift() ?? "";
}

// Reads one line with echo suppressed.
//
// This delegates to readline rather than parsing raw keypresses by hand.
// Hand-rolling it is a trap: backspace arrives as 0x7f (which is *greater* than
// space, so naive "ignore control characters" checks let it through and append
// it to the password), and a single data chunk can carry several characters at
// once when input is pasted or typed quickly. readline handles all of that.
function readSecret(question) {
  if (!stdin.isTTY) {
    stdout.write(question);
    return readPipedLine().then((line) => {
      stdout.write("\n");
      return line;
    });
  }

  return new Promise((resolve, reject) => {
    let muted = false;

    // Swallows readline's echo of the typed characters, but still lets the
    // prompt itself through (it's written before muting starts).
    const mutedOutput = new Writable({
      write(chunk, encoding, callback) {
        if (!muted) stdout.write(chunk, encoding);
        callback();
      },
    });

    const rl = createInterface({ input: stdin, output: mutedOutput, terminal: true });

    rl.on("SIGINT", () => {
      rl.close();
      stdout.write("\n");
      reject(new Error("Cancelled."));
    });

    rl.question(question, (answer) => {
      rl.close();
      stdout.write("\n");
      resolve(answer);
    });

    muted = true;
  });
}

// Rejects anything that would be impossible to retype, which is exactly how a
// corrupted hash gets written and locks you out of your own app.
function findUntypeableCharacter(password) {
  for (const char of password) {
    const code = char.codePointAt(0);
    if (code < 0x20 || code === 0x7f) {
      return `U+${code.toString(16).toUpperCase().padStart(4, "0")}`;
    }
  }
  return null;
}

const prisma = new PrismaClient();

try {
  const requestedEmail = process.argv[2];
  const users = await prisma.user.findMany({ select: { id: true, email: true }, orderBy: { createdAt: "asc" } });

  if (users.length === 0) {
    console.error("No account exists yet. Just sign up in the app — the first signup becomes the owner.");
    process.exit(1);
  }

  const user = requestedEmail
    ? users.find((u) => u.email === requestedEmail.toLowerCase())
    : users.length === 1
      ? users[0]
      : null;

  if (!user) {
    console.error(
      requestedEmail
        ? `No account found for "${requestedEmail}". Existing: ${users.map((u) => u.email).join(", ")}`
        : `Multiple accounts exist — pass one: ${users.map((u) => u.email).join(", ")}`
    );
    process.exit(1);
  }

  console.log(`Setting a new password for: ${user.email}\n`);

  const password = await readSecret("New password: ");

  if (password.length < MIN_LENGTH) {
    console.error(`Password must be at least ${MIN_LENGTH} characters. Nothing was changed.`);
    process.exit(1);
  }

  const untypeable = findUntypeableCharacter(password);
  if (untypeable) {
    console.error(
      `Password contains a control character (${untypeable}) that you would not be able to type at the login form. ` +
        `Nothing was changed.`
    );
    process.exit(1);
  }

  const confirmation = await readSecret("Confirm password: ");
  if (password !== confirmation) {
    console.error("Passwords didn't match. Nothing was changed.");
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);

  // Verify the hash round-trips before committing it. Cheap insurance against
  // writing a hash the login form can never satisfy.
  if (!(await bcrypt.compare(password, passwordHash))) {
    console.error("Internal error: the new hash failed verification. Nothing was changed.");
    process.exit(1);
  }

  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

  console.log(`\nDone. Log in at /login as ${user.email}.`);
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
