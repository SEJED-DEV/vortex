import fs from 'fs';
import path from 'path';

export class Logger {
  private static logDir = path.join(process.cwd(), 'data', 'logs');

  public static init() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }

    const originalLog = console.log;
    const originalError = console.error;

    console.log = (...args: any[]) => {
      const msg = args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : a)).join(' ');
      originalLog(...args);
      this.writeToFile(msg);
    };

    console.error = (...args: any[]) => {
      const msg = args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : a)).join(' ');
      originalError(...args);
      this.writeToFile(`ERROR: ${msg}`);
    };
  }

  public static system(message: string) {
    console.log(message);
  }

  private static writeToFile(message: string) {
    const timestamp = new Date().toLocaleString('en-GB', { timeZone: 'UTC' });
    const logEntry = `[${timestamp}] ${message}\n`;
    fs.appendFileSync(path.join(this.logDir, 'console.log'), logEntry);
  }
}
