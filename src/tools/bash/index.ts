import { Bash } from 'just-bash';

// Lazy import filesystem (client-side only)
async function getBashFS() {
  const { getBashFilesystem } = await import('@/config/agent-fs');
  return getBashFilesystem();
}
/**
 * Bash execution options
 */
export interface BashExecuteOptions {
  cwd?: string;
  env?: Record<string, string>;
  timeout?: number;
  stdin?: string;
}

/**
 * Bash execution result
 */
export interface BashExecuteResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  env: Record<string, string>;
}

// Singleton Bash instance
let bashInstance: Bash | null = null;

/**
 * Get or create the singleton Bash instance
 */
async function getBashInstance(): Promise<Bash> {
  if (!bashInstance) {
    const fs = await getBashFS();
    bashInstance = new Bash({
      fs,
      cwd: '/home/user',
      env: {
        HOME: '/home/user',
        PWD: '/home/user',
        PATH: '/usr/local/bin:/usr/bin:/bin',
        USER: 'localclaw',
      },
      executionLimits: {
        maxCommandCount: 1000,
        maxCallDepth: 10,
        maxLoopIterations: 10000,
      },
    });
  }
  return bashInstance;
}

/**
 * Execute a bash command
 */
export async function executeBash(
  command: string,
  options: BashExecuteOptions = {}
): Promise<BashExecuteResult> {
  const bash = await getBashInstance();

  const execOptions = {
    cwd: options.cwd,
    env: options.env,
    stdin: options.stdin,
  };

  const result = await bash.exec(command, execOptions);

  return {
    stdout: result.stdout,
    stderr: result.stderr,
    exitCode: result.exitCode,
    env: result.env,
  };
}

/**
 * Execute bash with timeout
 */
export async function executeBashWithTimeout(
  command: string,
  options: BashExecuteOptions = {},
  timeoutMs: number = 30000
): Promise<BashExecuteResult> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(`Command timed out after ${timeoutMs}ms`)), timeoutMs);
  });

  return Promise.race([executeBash(command, options), timeoutPromise]);
}

/**
 * Get current working directory
 */
export async function getCwd(): Promise<string> {
  const bash = await getBashInstance();
  return bash.getCwd();
}

/**
 * Get environment variables
 */
export async function getEnv(): Promise<Record<string, string>> {
  const bash = await getBashInstance();
  return bash.getEnv();
}

/**
 * Read a file via bash's filesystem
 */
export async function readFileViaBash(path: string): Promise<string> {
  const bash = await getBashInstance();
  return bash.readFile(path);
}

/**
 * Write a file via bash's filesystem
 */
export async function writeFileViaBash(path: string, content: string): Promise<void> {
  const bash = await getBashInstance();
  return bash.writeFile(path, content);
}

/**
 * Reset the bash instance (useful for testing or cleanup)
 */
export function resetBash(): void {
  bashInstance = null;
}
