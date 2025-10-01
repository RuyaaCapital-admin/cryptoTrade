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

describe('No Mock Data Validation', () => {
  it('should not contain any mock, stub, or fake data references', () => {
    const projectRoot = path.join(__dirname, '..');
    const allFiles = getAllFiles(projectRoot);

    const codeFiles = allFiles.filter(
      (file) =>
        (file.endsWith('.ts') ||
          file.endsWith('.tsx') ||
          file.endsWith('.js') ||
          file.endsWith('.jsx')) &&
        !file.includes('node_modules') &&
        !file.includes('.next') &&
        !file.includes('__tests__')
    );

    const forbiddenPatterns = [
      /mock/i,
      /stub/i,
      /fake/i,
      /fixture/i,
      /__mocks__/,
      /msw/,
      /faker/,
    ];

    const violations: { file: string; pattern: string; line: string }[] = [];

    codeFiles.forEach((file) => {
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n');

      lines.forEach((line, index) => {
        forbiddenPatterns.forEach((pattern) => {
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
      throw new Error(
        `Found forbidden mock/stub/fake references:\n\n${errorMessage}`
      );
    }

    expect(violations).toHaveLength(0);
  });

  it('should not have __mocks__ directory', () => {
    const projectRoot = path.join(__dirname, '..');
    const mocksDirs = getAllFiles(projectRoot).filter((file) =>
      file.includes('__mocks__')
    );

    expect(mocksDirs).toHaveLength(0);
  });
});
