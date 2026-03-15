/**
 * Centralized lazy imports module
 *
 * This module manages all dynamic imports to ensure:
 * 1. Resources are only loaded when needed (client-side only)
 * 2. Initialization happens in the correct order
 * 3. No duplicate imports across the application
 */

// ============================================
// Type definitions
// ============================================

import type { IFileSystem } from '@/infra/fs';
import type { TaskScheduler } from '@/tasks/scheduler';
import type { MemoryManager } from '@/memory/manager';
import type { TaskQueue } from '@/tasks/queue';
import type { TaskStore } from '@/tasks/store';
import type { CronScheduler } from '@/crontab/scheduler';

// Get ThreadManager type from the singleton instance
export type ThreadManager = typeof import('@/chat/thread-manager').threadManager;

// ============================================
// Cache for initialized instances
// ============================================

let fsInstance: IFileSystem | null = null;
let threadManagerInstance: ThreadManager | null = null;
let taskSchedulerInstance: TaskScheduler | null = null;
let memoryManagerInstance: MemoryManager | null = null;
let taskQueueInstance: TaskQueue | null = null;
let taskStoreInstance: TaskStore | null = null;
let cronSchedulerInstance: CronScheduler | null = null;

// ============================================
// Initialization flags
// ============================================

let isFsInitialized = false;
let isThreadManagerInitialized = false;
let isTaskSchedulerInitialized = false;

// ============================================
// Filesystem
// ============================================

export async function getFS(): Promise<IFileSystem> {
  if (fsInstance) return fsInstance;

  const { getFilesystem } = await import('@/infra/fs');
  fsInstance = await getFilesystem();
  isFsInitialized = true;
  return fsInstance;
}

// ============================================
// Thread Manager
// ============================================

let getThreadManagerPromise: Promise<ThreadManager> | null = null;

export async function getThreadManager(): Promise<ThreadManager> {
  if (threadManagerInstance) return threadManagerInstance;
  if (getThreadManagerPromise) return getThreadManagerPromise;

  getThreadManagerPromise = (async () => {
    const { threadManager } = await import('@/chat/thread-manager');

    // Initialize filesystem first if not done
    if (!isFsInitialized) {
      await getFS();
    }

    await threadManager.initialize();
    threadManagerInstance = threadManager;
    isThreadManagerInitialized = true;
    return threadManagerInstance;
  })();

  return getThreadManagerPromise;
}

// ============================================
// Task System
// ============================================

export async function getTaskScheduler(): Promise<TaskScheduler> {
  if (taskSchedulerInstance) return taskSchedulerInstance;

  const { taskScheduler } = await import('@/tasks');

  // Ensure task definitions are loaded
  await loadTaskDefinitions();

  await taskScheduler.initialize();
  taskSchedulerInstance = taskScheduler;
  isTaskSchedulerInitialized = true;
  return taskSchedulerInstance;
}

let taskDefinitionsLoaded = false;
export async function loadTaskDefinitions(): Promise<void> {
  if (taskDefinitionsLoaded) return;

  await import('@/tasks/definitions');
  taskDefinitionsLoaded = true;
}

export async function getTaskQueue(): Promise<TaskQueue> {
  if (taskQueueInstance) return taskQueueInstance;

  const { taskQueue } = await import('@/tasks');
  taskQueueInstance = taskQueue;
  return taskQueueInstance;
}

export async function getTaskStore(): Promise<TaskStore> {
  if (taskStoreInstance) return taskStoreInstance;

  const { taskStore } = await import('@/tasks/store');
  taskStoreInstance = taskStore;
  return taskStoreInstance;
}

// ============================================
// Memory Manager
// ============================================

export async function getMemoryManager(): Promise<MemoryManager> {
  if (memoryManagerInstance) return memoryManagerInstance;

  const { memoryManager } = await import('@/memory/manager');
  memoryManagerInstance = memoryManager;
  return memoryManagerInstance;
}

// ============================================
// Cron Scheduler
// ============================================

export async function getCronScheduler(): Promise<CronScheduler> {
  if (cronSchedulerInstance) return cronSchedulerInstance;

  const { cronScheduler } = await import('@/crontab/scheduler');
  cronSchedulerInstance = cronScheduler;
  return cronSchedulerInstance;
}

// ============================================
// Master initialization function
//
// Call this when entering dashboard to initialize
// all core systems in the correct order
// ============================================

export async function initializeDashboard(): Promise<void> {
  // 1. Initialize filesystem first (required by everything else)
  await getFS();

  // 2. Initialize thread manager (requires filesystem)
  await getThreadManager();
}

// ============================================
// Re-export static imports that should remain static
// (for modules that don't need lazy loading)
// ============================================

// Add any static re-exports here if needed
