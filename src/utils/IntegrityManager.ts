import { execSync } from 'child_process';
export class IntegrityManager {
  static checkStatus(): string {
    try {
      const status = execSync('git status --porcelain', { encoding: 'utf-8' }).trim();
      if (!status) return 'System Integrity: Original (No external changes).';
      const lines = status.split('\n');
      return `System Integrity Alert: ${lines.length} external modifications detected.\nFiles:\n${status}`;
    } catch (e) {
      return 'System Integrity: Unknown (Git not initialized or available).';
    }
  }
}
