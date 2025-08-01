// Utility to track component re-renders for debugging
export class RenderTracker {
  private static counters: Map<string, number> = new Map();
  private static logs: Map<string, Array<{ timestamp: number; reason?: string }>> = new Map();

  static track(componentName: string, reason?: string) {
    const current = this.counters.get(componentName) || 0;
    this.counters.set(componentName, current + 1);
    
    const logs = this.logs.get(componentName) || [];
    logs.push({ timestamp: Date.now(), reason });
    this.logs.set(componentName, logs);
    
    // Only log in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔄 ${componentName} rendered ${current + 1} times${reason ? ` (${reason})` : ''}`);
    }
  }

  static getStats(componentName: string) {
    return {
      count: this.counters.get(componentName) || 0,
      logs: this.logs.get(componentName) || []
    };
  }

  static getAllStats() {
    const stats: Record<string, any> = {};
    for (const [name, count] of this.counters.entries()) {
      stats[name] = {
        count,
        logs: this.logs.get(name) || []
      };
    }
    return stats;
  }

  static reset(componentName?: string) {
    if (componentName) {
      this.counters.delete(componentName);
      this.logs.delete(componentName);
    } else {
      this.counters.clear();
      this.logs.clear();
    }
  }
}

// Hook to track renders
export function useRenderTracker(componentName: string, dependencies?: any[]) {
  const reason = dependencies ? `deps: ${JSON.stringify(dependencies)}` : undefined;
  RenderTracker.track(componentName, reason);
}