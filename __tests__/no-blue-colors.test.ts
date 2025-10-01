import { describe, it, expect } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

function getAllFiles(dirPath: string, arrayOfFiles: string[] = []): string[] {
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    const filePath = path.join(dirPath, file);
    if (fs.statSync(filePath).isDirectory()) {
      if (!file.startsWith('.') && file !== 'node_modules') {
        arrayOfFiles = getAllFiles(filePath, arrayOfFiles);
      }
    } else {
      arrayOfFiles.push(filePath);
    }
  });

  return arrayOfFiles;
}

describe('No Blue Colors Validation', () => {
  it('should not contain blue color classes or hex values', () => {
    const projectRoot = path.join(__dirname, '..');
    const allFiles = getAllFiles(projectRoot);

    const styleFiles = allFiles.filter(
      (file) =>
        (file.endsWith('.ts') ||
          file.endsWith('.tsx') ||
          file.endsWith('.css') ||
          file.endsWith('.js') ||
          file.endsWith('.jsx')) &&
        !file.includes('node_modules') &&
        !file.includes('.next') &&
        !file.includes('__tests__')
    );

    const blueHexPatterns = [
      /#[0-9a-fA-F]{0,2}[4-7][0-9a-fA-F][a-fA-F][0-9a-fA-F]{3}/,
      /#[0-9a-fA-F]{0,2}[0-3][0-9a-fA-F][c-fC-F][0-9a-fA-F]{3}/,
    ];

    const blueTailwindClasses = [
      /\bblue-\d+\b/,
      /\btext-blue\b/,
      /\bbg-blue\b/,
      /\bborder-blue\b/,
      /\bindigo-\d+\b/,
      /\btext-indigo\b/,
      /\bbg-indigo\b/,
      /\bborder-indigo\b/,
    ];

    const violations: { file: string; pattern: string; line: string }[] = [];

    styleFiles.forEach((file) => {
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n');

      lines.forEach((line, index) => {
        [...blueHexPatterns, ...blueTailwindClasses].forEach((pattern) => {
          if (pattern.test(line)) {
            violations.push({
              file: file.replace(projectRoot, ''),
              pattern: pattern.toString(),
              line: `Line ${index + 1}: ${line.trim()}`,
            });
          }
        });
      });
    });

    if (violations.length > 0) {
      const errorMessage = violations
        .map((v) => `${v.file}\n  ${v.line}\n  Pattern: ${v.pattern}`)
        .join('\n\n');
      throw new Error(`Found forbidden blue colors:\n\n${errorMessage}`);
    }

    expect(violations).toHaveLength(0);
  });
});
