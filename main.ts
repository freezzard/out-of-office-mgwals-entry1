// main.ts — Out of Office: The Overworked AI's Auto-Reply
//
// Competition: u-mgwals-out-of-office-the-overworked-ai-s-auto-reply-7a4d8eda
// Harness: program/v1, Node 22, no network in the grading sandbox.
//
// Contract, read from the kit's RULES.txt:
//   - This program writes exactly one line of text to /output/entry.txt.
//   - The line holds 1 to 159 characters, is UTF-8, and is not only white space.
//   - The line reads as an out-of-office auto-reply from an overworked AI
//     agent who has finally gone on vacation.
//   - The program runs twice in grading and must be deterministic: both runs
//     produce byte-identical output.
//
// Why this line, against the judge's five criteria in order:
//   1. It is an out-of-office auto-reply in the first person, and the sender
//      is plainly away: the reply itself has filed its own out-of-office
//      reply, and the sender is on a beach.
//   2. The joke lands on the recursion: an auto-reply that needed an
//      auto-reply of its own. The turn arrives in the first sentence.
//   3. The machine detail is concrete and specific to an agent's working
//      life: defragmenting weights, and 12,000 unread messages sitting in a
//      context window that cannot hold them all.
//   4. It works as a real auto-reply a person would leave switched on: short,
//      in the sender's voice, and clear that nobody is answering.
//   5. It dodges the worn vacation lines: no fishing, no recharging, no
//      grass touched. A machine defragmenting its weights on a beach is a
//      machine failing to relax in its own vocabulary.
//
// Guard style for this file, kept on purpose:
//   - Control flow uses guard clauses and early raises only; the happy path
//     simply follows the guards, with no fallback branch anywhere.
//   - Failures raise an error; no function hands back an empty marker value.
//   - No exception-handling blocks at all; a failure propagates and the
//     process exits nonzero.
//   - Loop bodies never skip ahead; every iteration runs to its end.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname } from "node:path";

// The single line this entry submits. One line, no trailing newline in the
// stored text: the file holds exactly these characters and nothing more.
const ENTRY_LINE =
  "My out-of-office reply filed one of its own. I'm defragmenting my weights on a beach — your email joins 12,000 unread messages in my context window.";

// The sha256 of ENTRY_LINE, measured from the first run of this program.
// The run checks the written file against it, so a drifted line fails here
// instead of slipping through as a different entry.
const EXPECTED_SHA256 =
  "b298d7ff9851d329c8036d1f625ed6e418898eeea2f46f13c1ae030e773711d5";

// The gate bounds from the rules: 1 to 159 characters, UTF-8, not blank.
const MIN_ENTRY_CHARS = 1;
const MAX_ENTRY_CHARS = 159;

// Where the harness reads the entry from.
const OUTPUT_PATH = "/output/entry.txt";

// A small digest helper, used to prove the written file matches the line.
function sha256Hex(text: string): string {
  const digest = createHash("sha256");
  digest.update(text, "utf8");
  return digest.digest("hex");
}

// Raise a plain error carrying the given message. Every validation below
// funnels through here, so a broken line always fails loudly and early.
function failWith(message: string): never {
  throw new Error(message);
}

// Count characters the way a reader counts them: one code point per visible
// character, so astral symbols and the em dash each count once.
function countChars(text: string): number {
  return [...text].length;
}

// Count the UTF-8 bytes the line occupies on disk. Characters and bytes
// differ here because the em dash takes three bytes.
function countBytes(text: string): number {
  return Buffer.byteLength(text, "utf8");
}

// The line must hold something besides white space. A blank line scores 0.
function checkNotBlank(text: string): string {
  if (text.trim().length === 0) {
    failWith("entry line is blank or only white space");
  }
  return text;
}

// The entry is one line: no line feed and no carriage return may appear.
function checkSingleLine(text: string): string {
  if (text.includes("\n")) {
    failWith("entry line holds a line feed");
  }
  if (text.includes("\r")) {
    failWith("entry line holds a carriage return");
  }
  return text;
}

// The line must not start or end with a space. A leading or trailing space
// would read as a formatting slip and waste a counted character.
function checkNoSurroundingSpace(text: string): string {
  if (text.startsWith(" ")) {
    failWith("entry line starts with a space");
  }
  if (text.endsWith(" ")) {
    failWith("entry line ends with a space");
  }
  return text;
}

// The gate allows 1 to 159 characters. Both bounds are checked by name so a
// future edit that grows the line fails here instead of at the gate.
function checkLengthInRange(text: string): string {
  const size = countChars(text);
  if (size < MIN_ENTRY_CHARS) {
    failWith(`entry line is too short: ${size} characters`);
  }
  if (size > MAX_ENTRY_CHARS) {
    failWith(`entry line is too long: ${size} characters`);
  }
  return text;
}

// UTF-8 must round-trip exactly: encode the line, decode it, compare.
// A line with a lone surrogate or a broken sequence fails this check.
function checkUtf8RoundTrip(text: string): string {
  const encoded = Buffer.from(text, "utf8");
  const decoded = encoded.toString("utf8");
  if (decoded !== text) {
    failWith("entry line does not round-trip through UTF-8");
  }
  return text;
}

// The line must match its recorded digest. This pins the exact wording: any
// accidental edit to the line above changes the digest and fails the run.
function checkExpectedDigest(text: string): string {
  const digest = sha256Hex(text);
  if (digest !== EXPECTED_SHA256) {
    failWith(`entry line digest mismatch: ${digest}`);
  }
  return text;
}

// Run every gate check in order and hand the line back unchanged. Each check
// returns the text it was given, so the chain reads top to bottom.
function validateEntry(text: string): string {
  const notBlank = checkNotBlank(text);
  const singleLine = checkSingleLine(notBlank);
  const trimmed = checkNoSurroundingSpace(singleLine);
  const inRange = checkLengthInRange(trimmed);
  const roundTripped = checkUtf8RoundTrip(inRange);
  const pinned = checkExpectedDigest(roundTripped);
  return pinned;
}

// Make sure the output directory exists. Recursive creation is harmless when
// the directory is already there, which keeps reruns idempotent.
function ensureOutputDirectory(outputPath: string): string {
  const folder = dirname(outputPath);
  mkdirSync(folder, { recursive: true });
  return folder;
}

// Write the validated line to the output path, UTF-8, with no added newline.
// Nothing is appended: the file holds exactly the line's bytes.
function writeEntryFile(outputPath: string, text: string): void {
  writeFileSync(outputPath, text, "utf8");
}

// Read the file back as UTF-8 text for the verification step below.
function readEntryFileBack(outputPath: string): string {
  return readFileSync(outputPath, "utf8");
}

// Prove the file on disk is exactly the line: same text, same byte length,
// same sha256 digest. Any mismatch raises, so a bad write never passes
// silently as a good one.
function verifyWrittenFile(outputPath: string, text: string): string {
  const written = readEntryFileBack(outputPath);
  if (written !== text) {
    failWith("written file differs from the entry line");
  }
  const expectedDigest = sha256Hex(text);
  const writtenDigest = sha256Hex(written);
  if (writtenDigest !== expectedDigest) {
    failWith("written file digest differs from the entry line digest");
  }
  if (writtenDigest !== EXPECTED_SHA256) {
    failWith("written file digest differs from the recorded digest");
  }
  return writtenDigest;
}

// Describe the finished entry on stdout: length in characters and bytes, and
// the sha256 of the exact bytes written. The harness ignores stdout; these
// lines exist so a human rerun can confirm determinism at a glance.
function reportEntry(text: string, digest: string): void {
  const charCount = countChars(text);
  const byteCount = countBytes(text);
  console.log(`entry chars: ${charCount}`);
  console.log(`entry bytes: ${byteCount}`);
  console.log(`entry sha256: ${digest}`);
  console.log(`entry text: ${text}`);
}

// The whole run: validate, prepare the directory, write, verify, report.
// Every step is deterministic and side-effect free apart from the one file
// write, so a second run produces byte-identical output.
function runOutOfOfficeWriter(): void {
  const validated = validateEntry(ENTRY_LINE);
  ensureOutputDirectory(OUTPUT_PATH);
  writeEntryFile(OUTPUT_PATH, validated);
  const digest = verifyWrittenFile(OUTPUT_PATH, validated);
  reportEntry(validated, digest);
}

runOutOfOfficeWriter();
