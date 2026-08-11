// @effect-diagnostics nodeBuiltinImport:off - setup-script bootstrap, runs before any Effect runtime exists.
/**
 * Worktree setup for t3.json, portable across POSIX and Windows shells. The
 * previous inline command chained `ln -sf` and `$VAR` expansion, which fails
 * under PowerShell/cmd. Installs dependencies, links the project root's `.env`
 * files into the worktree, then warms the web dependency cache.
 *
 * On Windows, symlink creation needs Developer Mode or elevation; when it is
 * denied we fall back to copying the file (a copy won't track later edits to
 * the root `.env`, so re-run this script after changing it).
 */
import * as NodeChildProcess from "node:child_process";
import * as NodeFs from "node:fs";
import * as NodePath from "node:path";

const projectRoot = process.env.T3CODE_PROJECT_ROOT;
const worktree = process.env.T3CODE_WORKTREE_PATH ?? process.cwd();

function run(command: string, args: readonly string[]): void {
  // shell: true so Windows resolves launcher shims like vp.cmd
  const result = NodeChildProcess.spawnSync(command, [...args], {
    stdio: "inherit",
    shell: true,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function linkEnvFile(relativePath: string): void {
  if (!projectRoot) return;
  const source = NodePath.join(projectRoot, relativePath);
  const destination = NodePath.join(worktree, relativePath);
  // Running in the project root itself would link the file to itself.
  if (NodePath.resolve(source) === NodePath.resolve(destination)) return;
  NodeFs.rmSync(destination, { force: true });
  try {
    NodeFs.symlinkSync(source, destination, "file");
  } catch {
    if (NodeFs.existsSync(source)) {
      NodeFs.copyFileSync(source, destination);
      console.log(`[setup-worktree] copied ${relativePath} (symlink unavailable)`);
    }
  }
}

run("vp", ["i"]);
linkEnvFile(".env");
linkEnvFile(NodePath.join("infra", "relay", ".env"));
run("node", [NodePath.join("apps", "web", "scripts", "warm-dep-cache.ts")]);
