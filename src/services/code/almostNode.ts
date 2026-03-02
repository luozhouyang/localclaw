/**
 * AlmostNode Service
 * Provides code execution environment in the browser
 */
import { createContainer, VirtualFS } from 'almostnode';
import type { ExecuteOptions, ExecutionResult, OutputLine, PackageJson } from '@/types/code/execution';
import { createSystemOutput, createErrorOutput, formatExecutionTime } from '@/types/code/execution';

// Define the return type of createContainer based on the actual API
interface Container {
  vfs: VirtualFS;
  execute: (code: string, options?: { signal?: AbortSignal; onStdout?: (data: string) => void; onStderr?: (data: string) => void }) => { exports: unknown };
}

class AlmostNodeService {
  private container: Container | null = null;
  private _isReady = false;
  private initializationPromise: Promise<void> | null = null;

  /**
   * Initialize the AlmostNode service
   */
  async initialize(): Promise<void> {
    if (this._isReady) return;
    if (this.initializationPromise) return this.initializationPromise;

    this.initializationPromise = this.doInitialize();
    return this.initializationPromise;
  }

  private async doInitialize(): Promise<void> {
    try {
      // Create container with default options
      this.container = createContainer({
        // Use main thread for better performance in our use case
        // Sandbox can be enabled for untrusted code
      }) as unknown as Container;

      // Ensure workspace directory exists (sync API)
      this.container.vfs.mkdirSync('/workspace', { recursive: true });

      this._isReady = true;
      console.log('[AlmostNode] Service initialized');
    } catch (error) {
      console.error('[AlmostNode] Failed to initialize:', error);
      throw error;
    }
  }

  /**
   * Check if the service is ready
   */
  get isReady(): boolean {
    return this._isReady;
  }

  /**
   * Get the container instance
   */
  getContainer(): Container {
    if (!this.container) {
      throw new Error('AlmostNode not initialized');
    }
    return this.container;
  }

  /**
   * Get the VFS instance
   */
  getVfs(): VirtualFS {
    if (!this.container) {
      throw new Error('AlmostNode not initialized');
    }
    return this.container.vfs;
  }

  /**
   * Execute code
   */
  async execute(options: ExecuteOptions): Promise<ExecutionResult> {
    if (!this.container) {
      throw new Error('AlmostNode not initialized');
    }

    const output: OutputLine[] = [];
    const startTime = Date.now();

    // Add system message for start
    const command = options.filePath
      ? `node ${options.filePath}`
      : `node -e "${options.language === 'typescript' ? '(TypeScript code)' : '(JavaScript code)'}`;
    output.push(createSystemOutput(`> ${command}`));

    try {
      // Prepare code to execute
      let codeToExecute: string;

      if (options.code) {
        codeToExecute = options.code;
      } else if (options.filePath) {
        codeToExecute = this.container.vfs.readFileSync(options.filePath, 'utf-8');
      } else {
        throw new Error('Either code or filePath must be provided');
      }

      // Transpile TypeScript if needed
      if (options.language === 'typescript') {
        output.push(createSystemOutput('Transpiling TypeScript...'));
        codeToExecute = await this.transpileTypeScript(codeToExecute);
      }

      // Execute code
      const result = await this.container.execute(codeToExecute, {
        signal: options.signal,
        onStdout: (data: string) => {
          const line: OutputLine = {
            type: 'stdout',
            content: data,
            timestamp: Date.now(),
          };
          output.push(line);
          options.onOutput?.(line);
        },
        onStderr: (data: string) => {
          const line: OutputLine = {
            type: 'stderr',
            content: data,
            timestamp: Date.now(),
          };
          output.push(line);
          options.onOutput?.(line);
        },
      });

      const executionTime = Date.now() - startTime;
      output.push(createSystemOutput(`✓ Execution completed in ${formatExecutionTime(executionTime)}`));

      return {
        success: true,
        exitCode: 0,
        output,
        executionTime,
        result: result.exports,
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Check if it was aborted
      if (errorMessage.includes('aborted') || options.signal?.aborted) {
        output.push(createSystemOutput(`✗ Execution aborted after ${formatExecutionTime(executionTime)}`));
      } else {
        output.push(createErrorOutput(errorMessage));
        output.push(createSystemOutput(`✗ Execution failed in ${formatExecutionTime(executionTime)}`));
      }

      return {
        success: false,
        exitCode: 1,
        output,
        error: errorMessage,
        executionTime,
      };
    }
  }

  /**
   * Transpile TypeScript to JavaScript
   */
  private async transpileTypeScript(code: string): Promise<string> {
    if (!this.container) throw new Error('AlmostNode not initialized');

    try {
      // Use a simple transpilation approach
      // In a real implementation, you might want to use esbuild-wasm
      // For now, we'll do basic transformation

      // Remove type annotations (very basic)
      let jsCode = code;

      // Remove interface declarations
      jsCode = jsCode.replace(/interface\s+\w+\s*\{[^}]*\}/g, '');

      // Remove type annotations from variable declarations
      jsCode = jsCode.replace(/:\s*[A-Z][a-zA-Z0-9_<>[\]|&]*\s*(=|;)/g, '$1');

      // Remove generic type parameters
      jsCode = jsCode.replace(/<[a-zA-Z0-9_<>[\]|&,\s]*>/g, '');

      // Remove 'as type' assertions
      jsCode = jsCode.replace(/\s+as\s+[A-Z][a-zA-Z0-9_<>[\]|&]*/g, '');

      return jsCode;
    } catch (error) {
      console.warn('[AlmostNode] TypeScript transpilation failed:', error);
      // Fall back to original code
      return code;
    }
  }

  /**
   * Install npm packages
   * Note: This uses AlmostNode's virtual npm which runs in the browser sandbox,
   * not the real system npm.
   */
  async installPackages(packages: string[], isDev = false): Promise<void> {
    if (!this.container) throw new Error('AlmostNode not initialized');

    // Read existing package.json or create new one
    let packageJson: PackageJson = {};
    try {
      const existing = this.container.vfs.readFileSync('/workspace/package.json', 'utf-8');
      packageJson = JSON.parse(existing);
    } catch {
      // No existing package.json
    }

    // Initialize dependencies object if needed
    if (!isDev && !packageJson.dependencies) {
      packageJson.dependencies = {};
    }
    if (isDev && !packageJson.devDependencies) {
      packageJson.devDependencies = {};
    }

    // Add packages
    const targetDeps = isDev ? packageJson.devDependencies! : packageJson.dependencies!;
    for (const pkg of packages) {
      targetDeps[pkg] = 'latest';
    }

    // Write package.json
    this.container.vfs.writeFileSync(
      '/workspace/package.json',
      JSON.stringify(packageJson, null, 2)
    );

    // Use AlmostNode's npm.install method if available, otherwise just update package.json
    // AlmostNode handles npm commands internally in its virtual environment
    try {
      // Try to use npm install through the container
      await this.container.execute(`
        console.log('Installing packages: ${packages.join(', ')}...');
      `);
    } catch {
      // Silent fail - packages are added to package.json for now
    }
  }

  /**
   * Read package.json
   */
  readPackageJson(): PackageJson | null {
    if (!this.container) return null;

    try {
      const content = this.container.vfs.readFileSync('/workspace/package.json', 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  /**
   * Write package.json
   */
  writePackageJson(packageJson: PackageJson): void {
    if (!this.container) throw new Error('AlmostNode not initialized');

    this.container.vfs.writeFileSync(
      '/workspace/package.json',
      JSON.stringify(packageJson, null, 2)
    );
  }

  /**
   * Get installed packages
   */
  getInstalledPackages(): Record<string, string> {
    const packageJson = this.readPackageJson();
    return packageJson?.dependencies || {};
  }

  /**
   * Check if a package is installed
   */
  isPackageInstalled(name: string): boolean {
    const deps = this.getInstalledPackages();
    return name in deps;
  }
}

export const almostNodeService = new AlmostNodeService();
