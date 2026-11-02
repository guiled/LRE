import {
  createReadStream,
  openSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { createInterface } from "node:readline";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { stderr, stdin } from "node:process";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const packageJsonPath = join(repoRoot, "package.json");

const SKIP_ENV = "LRE_SKIP_TAG_VERSION_CHECK";

interface PushRef {
  remoteRef: string;
  remoteOid: string;
}

export function versionFromTagRef(remoteRef: string): string | null {
  if (!remoteRef.startsWith("refs/tags/")) {
    return null;
  }

  const tagName = remoteRef.slice("refs/tags/".length);

  const withV = tagName.match(/^v(\d+\.\d+\.\d+(?:[-+][\w.-]+)?)$/i);

  if (withV) {
    return withV[1];
  }

  const bare = tagName.match(/^(\d+\.\d+\.\d+(?:[-+][\w.-]+)?)$/);
  return bare ? bare[1] : null;
}

function readPackageVersion(): string {
  const pkg = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
    version: string;
  };

  return pkg.version;
}

function setPackageVersion(version: string): void {
  const pkg = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
    version: string;
  };

  pkg.version = version;
  writeFileSync(packageJsonPath, `${JSON.stringify(pkg, null, 2)}\n`, "utf8");
}

async function readPushRefs(): Promise<PushRef[]> {
  const chunks: string[] = [];

  for await (const chunk of stdin) {
    chunks.push(String(chunk));
  }

  const refs: PushRef[] = [];

  for (const line of chunks.join("").split("\n")) {
    const trimmed = line.trim();

    if (!trimmed) {
      continue;
    }

    const parts = trimmed.split(/\s+/);
    const remoteRef = parts[2];
    const remoteOid = parts[3];

    if (!remoteRef || !remoteOid) {
      continue;
    }

    refs.push({ remoteRef, remoteOid });
  }

  return refs;
}

function isTagDelete(remoteOid: string): boolean {
  return /^0+$/.test(remoteOid);
}

async function promptChoice(
  lines: string[],
  defaultChoice: "1" | "2" | "3",
): Promise<"1" | "2" | "3"> {
  for (const line of lines) {
    stderr.write(`${line}\n`);
  }

  stderr.write("\n");
  stderr.write("  [1] Abort push (default)\n");
  stderr.write("  [2] Push tag anyway\n");
  stderr.write(
    "  [3] Update package.json to match tag, then abort (commit and push again)\n",
  );
  stderr.write("\n");
  stderr.write(`Choice [1/2/3] (default ${defaultChoice}): `);

  let ttyFd: number;

  try {
    ttyFd = openSync("/dev/tty", "r");
  } catch {
    stderr.write(
      `\nNo TTY available; aborting push. Set ${SKIP_ENV}=1 to skip this check.\n`,
    );

    return "1";
  }

  const answer = await new Promise<string>((resolve) => {
    const rl = createInterface({
      input: createReadStream("", { fd: ttyFd, autoClose: true }),
      output: stderr,
      terminal: true,
    });

    rl.once("line", (line) => {
      rl.close();
      resolve(line.trim());
    });
  });

  if (answer === "" || answer === "1") {
    return "1";
  }

  if (answer === "2") {
    return "2";
  }

  if (answer === "3") {
    return "3";
  }

  stderr.write(`Unknown choice "${answer}", using default.\n`);

  return defaultChoice;
}

async function main(): Promise<number> {
  if (process.env[SKIP_ENV] === "1") {
    return 0;
  }

  const packageVersion = readPackageVersion();
  const pushRefs = await readPushRefs();

  const tagVersions = new Map<string, string>();

  for (const { remoteRef, remoteOid } of pushRefs) {
    if (isTagDelete(remoteOid)) {
      continue;
    }

    const version = versionFromTagRef(remoteRef);

    if (version === null) {
      continue;
    }

    tagVersions.set(remoteRef, version);
  }

  if (tagVersions.size === 0) {
    return 0;
  }

  const mismatches = [...tagVersions.entries()].filter(
    ([, tagVersion]) => tagVersion !== packageVersion,
  );

  if (mismatches.length === 0) {
    return 0;
  }

  const uniqueVersions = new Set(mismatches.map(([, v]) => v));
  const lines = [
    `package.json version is ${packageVersion}, but you are pushing tag(s) with a different version:`,
    ...mismatches.map(
      ([ref, version]) =>
        `  - ${ref.replace("refs/tags/", "")} (semver ${version})`,
    ),
  ];

  if (uniqueVersions.size > 1) {
    lines.push("");
    lines.push(
      "Multiple conflicting tag versions; fix tags or package.json manually.",
    );

    await promptChoice(lines, "1");

    return 1;
  }

  const targetVersion = [...uniqueVersions][0];
  const choice = await promptChoice(lines, "1");

  if (choice === "2") {
    stderr.write("Continuing push without changing package.json.\n");

    return 0;
  }

  if (choice === "3") {
    setPackageVersion(targetVersion);
    stderr.write(
      `Updated package.json version to ${targetVersion}. Commit the change, then push again.\n`,
    );

    return 1;
  }

  stderr.write("Push aborted.\n");

  return 1;
}

const isDirectRun =
  process.argv[1] !== undefined &&
  fileURLToPath(import.meta.url) === process.argv[1];

if (isDirectRun) {
  const exitCode = await main();
  process.exit(exitCode);
}
