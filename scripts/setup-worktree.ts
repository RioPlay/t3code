// @effect-diagnostics nodeBuiltinImport:off - setup-script bootstrap, runs before any Effect runtime exists.
/**
 * Worktree setup for t3.json, portable across POSIX and Windows shells.
 *
 * The previous inline command chained `ln -sf` and `$VAR` expansion, which
 * fails under PowerShell/cmd when T3 types the setup script into a terminal
 * (see ProjectSetupScriptRunner). This Node entrypoint:
 *   1. installs deps (`vp i`)
 *   2. links the project root's `.env` files into the worktree
 *   3. warms the web dependency cache
 *
 * On Windows, symlink creation needs Developer Mode or elevation; when it is
 * denied we fall back to copying (a copy won't track later edits to the root
 * `.env`, so re-run this script after changing it).
 */
import * as NodeChildProcess from "node:child_process";
import * as NodeFs from "node:fs";
import * as NodePath from "node:path";
import * as NodeProcess from "node:process";
import * as NodeURL from "node:url";

export type EnvLinkResult =
  | "linked"
  | "copied"
  | "skipped-same-path"
  | "skipped-missing-source";

export const ENV_LINK_RELATIVE_PATHS = [".env", NodePath.join("infra", "relay", ".env")] as const;

export function resolveWorktreePaths(env: NodeJS.ProcessEnv = NodeProcess.env): {
  readonly projectRoot: string | undefined;
  readonly worktree: string;
} {
  return {
    projectRoot: env.T3CODE_PROJECT_ROOT || undefined,
    worktree: env.T3CODE_WORKTREE_PATH || NodeProcess.cwd(),
  };
}

/**
 * Link `projectRoot/relativePath` into the worktree. Never deletes the
 * destination when the source is missing (avoids wiping a local file if the
 * root has no `.env` yet).
 */
export function linkOrCopyEnvFile(input: {
  readonly projectRoot: string;
  readonly worktree: string;
  readonly relativePath: string;
}): EnvLinkResult {
  const source = NodePath.join(input.projectRoot, input.relativePath);
  const destination = NodePath.join(input.worktree, input.relativePath);
  if (NodePath.resolve(source) === NodePath.resolve(destination)) {
    return "skipped-same-path";
  }
  if (!NodeFs.existsSync(source)) {
    return "skipped-missing-source";
  }

  NodeFs.mkdirSync(NodePath.dirname(destination), { recursive: true });
  NodeFs.rmSync(destination, { force: true });
  try {
    NodeFs.symlinkSync(source, destination, "file");
    return "linked";
  } catch {
    NodeFs.copyFileSync(source, destination);
    console.log(`[setup-worktree] copied ${input.relativePath} (symlink unavailable)`);
    return "copied";
  }
}

export function linkProjectEnvFiles(input: {
  readonly projectRoot: string;
  readonly worktree: string;
  readonly relativePaths?: readonly string[];
}): ReadonlyArray<{ readonly relativePath: string; readonly result: EnvLinkResult }> {
  const relativePaths = input.relativePaths ?? ENV_LINK_RELATIVE_PATHS;
  return relativePaths.map((relativePath) => ({
    relativePath,
    result: linkOrCopyEnvFile({
      projectRoot: input.projectRoot,
      worktree: input.worktree,
      relativePath,
    }),
  }));
}

function run(command: string, args: readonly string[], cwd: string): void {
  // shell: true so Windows resolves launcher shims (vp.cmd) the same way a
  // typed terminal command would. Always pin cwd to the worktree — do not
  // rely on the process already sitting there.
  const result = NodeChildProcess.spawnSync(command, [...args], {
    stdio: "inherit",
    shell: true,
    cwd,
    env: NodeProcess.env,
  });
  if (result.error) {
    console.error(`[setup-worktree] failed to spawn ${command}:`, result.error.message);
    NodeProcess.exit(1);
  }
  if (result.status !== 0) {
    NodeProcess.exit(result.status ?? 1);
  }
}

export function runSetupWorktree(env: NodeJS.ProcessEnv = NodeProcess.env): void {
  const { projectRoot, worktree } = resolveWorktreePaths(env);
  if (!NodeFs.existsSync(worktree)) {
    console.error(`[setup-worktree] worktree path does not exist: ${worktree}`);
    NodeProcess.exit(1);
  }

  NodeProcess.chdir(worktree);

  run("vp", ["i"], worktree);

  if (projectRoot) {
    for (const { relativePath, result } of linkProjectEnvFiles({ projectRoot, worktree })) {
      if (result === "linked" || result === "copied") {
        console.log(`[setup-worktree] ${result} ${relativePath}`);
      }
    }
  } else {
    console.warn("[setup-worktree] T3CODE_PROJECT_ROOT unset; skipping .env link");
  }

  run("node", [NodePath.join("apps", "web", "scripts", "warm-dep-cache.ts")], worktree);
}

const isExecutedDirectly =
  typeof NodeProcess.argv[1] === "string" &&
  NodeURL.pathToFileURL(NodePath.resolve(NodeProcess.argv[1])).href === import.meta.url;

if (isExecutedDirectly) {
  runSetupWorktree();
}
