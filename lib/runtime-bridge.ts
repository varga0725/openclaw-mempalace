import { spawn } from "node:child_process";
import os from "node:os";
import path from "node:path";

export function defaultPalacePath() {
  return path.join(os.homedir(), ".mempalace", "palace");
}

export function expandHomePath(inputPath?: string) {
  if (!inputPath) return defaultPalacePath();
  if (inputPath === "~") return os.homedir();
  if (inputPath.startsWith("~/")) return path.join(os.homedir(), inputPath.slice(2));
  return inputPath;
}

export function runPythonJson(script: string, payload: any): Promise<any> {
  return new Promise((resolve) => {
    const child = spawn("python3", ["-c", script], { stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (d) => (stdout += String(d)));
    child.stderr.on("data", (d) => (stderr += String(d)));
    child.on("close", (code) => {
      if (code === 0) {
        try {
          resolve(JSON.parse(stdout || "{}"));
        } catch {
          resolve({ ok: true, raw: stdout });
        }
      } else {
        resolve({ ok: false, error: stderr || `python exited ${code}` });
      }
    });

    child.stdin.write(JSON.stringify(payload));
    child.stdin.end();
  });
}
