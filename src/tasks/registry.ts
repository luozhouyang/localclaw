import type { TaskDefinition } from './types';

class TaskRegistry {
  private definitions = new Map<string, TaskDefinition<any, any>>();

  register<Input, Output>(definition: TaskDefinition<Input, Output>): void {
    if (this.definitions.has(definition.type)) {
      console.warn(`[TaskRegistry] Task type "${definition.type}" is being redefined`);
    }
    this.definitions.set(definition.type, definition);
  }

  get(type: string): TaskDefinition | undefined {
    return this.definitions.get(type);
  }

  list(): TaskDefinition[] {
    return Array.from(this.definitions.values());
  }

  validateInput(type: string, input: unknown): { success: boolean; error?: string } {
    const definition = this.get(type);
    if (!definition) {
      return { success: false, error: `Unknown task type: ${type}` };
    }

    if (definition.inputSchema) {
      const result = definition.inputSchema.safeParse(input);
      if (!result.success) {
        return { success: false, error: result.error.message };
      }
    }

    return { success: true };
  }
}

// Singleton instance
export const taskRegistry = new TaskRegistry();

// Helper function for defining tasks
export function defineTask<Input, Output>(
  definition: TaskDefinition<Input, Output>
): TaskDefinition<Input, Output> {
  taskRegistry.register(definition);
  return definition;
}
