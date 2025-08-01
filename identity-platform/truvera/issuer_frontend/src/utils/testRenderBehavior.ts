// Test utility to check for excessive re-rendering
import { RenderTracker } from './renderTracker';

export function checkRenderBehavior() {
  console.log('🔍 Checking render behavior...');
  
  const stats = RenderTracker.getAllStats();
  const issues: string[] = [];
  
  // Check for excessive renders
  Object.entries(stats).forEach(([componentName, data]) => {
    const { count, logs } = data;
    
    if (count > 10) {
      issues.push(`⚠️ ${componentName} has rendered ${count} times - potential performance issue`);
    }
    
    // Check for rapid re-renders (within 100ms)
    const rapidRenders = logs.filter((log: any, index: number) => {
      if (index === 0) return false;
      return log.timestamp - logs[index - 1].timestamp < 100;
    });
    
    if (rapidRenders.length > 3) {
      issues.push(`⚠️ ${componentName} has ${rapidRenders.length} rapid re-renders - potential infinite loop`);
    }
  });
  
  if (issues.length === 0) {
    console.log('✅ No render issues detected');
  } else {
    console.log('❌ Render issues detected:');
    issues.forEach(issue => console.log(issue));
  }
  
  return {
    hasIssues: issues.length > 0,
    issues,
    stats
  };
}

// Auto-check after 30 seconds in development
if (process.env.NODE_ENV === 'development') {
  setTimeout(() => {
    checkRenderBehavior();
  }, 30000);
}