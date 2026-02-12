/**
 * csvExport Tests
 * CSV content generation: escaping, formatting, field mapping
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Extract pure CSV generation logic from csvExport.ts
 * These are the core functions we test (without DOM dependencies)
 */

/**
 * Pure function: Generate CSV content from data
 * (Extracted from exportToCSV to make it testable)
 */
function generateCSVContent(
  headers: string[],
  data: Record<string, any>[],
  dateFields: string[] = [],
  numberFields: string[] = []
): string {
  const rows = data.map(row =>
    headers.map(header => {
      const value = row[header];

      if (value === null || value === undefined) {
        return '';
      }

      // Handle dates
      if (dateFields.includes(header) && value) {
        const date = new Date(value);
        return isNaN(date.getTime()) ? value : date.toLocaleDateString();
      }

      // Handle numbers
      if (numberFields.includes(header) && typeof value === 'number') {
        return value.toString();
      }

      // Handle strings - escape commas and quotes
      const stringValue = value.toString();
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }

      return stringValue;
    }).join(',')
  );

  return [headers.join(','), ...rows].join('\n');
}

/**
 * Helper: Escape CSV field value
 */
function escapeCSVField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Helper: Parse CSV content for testing
 */
function parseCSVContent(content: string): string[][] {
  const lines: string[] = [];
  let currentLine = '';
  let inQuotes = false;

  // First, split content while respecting quoted fields
  for (let i = 0; i < content.length; i++) {
    const char = content[i];

    if (char === '"') {
      if (inQuotes && content[i + 1] === '"') {
        currentLine += '""';
        i++;
      } else {
        inQuotes = !inQuotes;
        currentLine += char;
      }
    } else if (char === '\n' && !inQuotes) {
      lines.push(currentLine);
      currentLine = '';
    } else {
      currentLine += char;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  // Then parse each line into fields
  return lines.map(line => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current);
    return result;
  });
}

// ────────────────────────────────────────────────────────────
// CSV Escaping Tests
// ────────────────────────────────────────────────────────────
describe('escapeCSVField', () => {
  it('leaves plain text unchanged', () => {
    expect(escapeCSVField('Hello')).toBe('Hello');
  });

  it('escapes field with comma', () => {
    expect(escapeCSVField('Smith, John')).toBe('"Smith, John"');
  });

  it('escapes field with double quotes', () => {
    expect(escapeCSVField('He said "hello"')).toBe('"He said ""hello"""');
  });

  it('escapes field with newline', () => {
    expect(escapeCSVField('Line 1\nLine 2')).toBe('"Line 1\nLine 2"');
  });

  it('escapes field with comma and quotes', () => {
    expect(escapeCSVField('Value with "comma, and quotes"')).toBe('"Value with ""comma, and quotes"""');
  });

  it('handles empty string', () => {
    expect(escapeCSVField('')).toBe('');
  });

  it('handles only comma', () => {
    expect(escapeCSVField(',')).toBe('","');
  });

  it('handles only quotes', () => {
    expect(escapeCSVField('""')).toBe('""""""');
  });
});

// ────────────────────────────────────────────────────────────
// CSV Content Generation Tests
// ────────────────────────────────────────────────────────────
describe('generateCSVContent', () => {
  // --- Basic generation ---
  it('generates CSV with headers and single row', () => {
    const headers = ['name', 'age'];
    const data = [{ name: 'Alice', age: 30 }];

    const csv = generateCSVContent(headers, data);

    const lines = csv.split('\n');
    expect(lines[0]).toBe('name,age');
    expect(lines[1]).toBe('Alice,30');
  });

  it('generates CSV with multiple rows', () => {
    const headers = ['name', 'age'];
    const data = [
      { name: 'Alice', age: 30 },
      { name: 'Bob', age: 25 },
      { name: 'Charlie', age: 35 }
    ];

    const csv = generateCSVContent(headers, data);

    const lines = csv.split('\n');
    expect(lines).toHaveLength(4); // header + 3 data rows
  });

  // --- Null/Undefined handling ---
  it('converts null to empty string', () => {
    const headers = ['name', 'email'];
    const data = [{ name: 'Alice', email: null }];

    const csv = generateCSVContent(headers, data);
    const parsed = parseCSVContent(csv);

    expect(parsed[1][1]).toBe('');
  });

  it('converts undefined to empty string', () => {
    const headers = ['name', 'phone'];
    const data = [{ name: 'Bob', phone: undefined }];

    const csv = generateCSVContent(headers, data);
    const parsed = parseCSVContent(csv);

    expect(parsed[1][1]).toBe('');
  });

  it('handles mixed null and values', () => {
    const headers = ['first', 'middle', 'last'];
    const data = [{ first: 'John', middle: null, last: 'Doe' }];

    const csv = generateCSVContent(headers, data);
    const parsed = parseCSVContent(csv);

    expect(parsed[1]).toEqual(['John', '', 'Doe']);
  });

  // --- String escaping ---
  it('escapes fields with commas', () => {
    const headers = ['name', 'address'];
    const data = [{ name: 'Alice', address: 'Main St, Apt 5' }];

    const csv = generateCSVContent(headers, data);

    expect(csv).toContain('"Main St, Apt 5"');
  });

  it('escapes fields with quotes', () => {
    const headers = ['name', 'quote'];
    const data = [{ name: 'Alice', quote: 'She said "hello"' }];

    const csv = generateCSVContent(headers, data);

    expect(csv).toContain('"She said ""hello"""');
  });

  it('escapes fields with newlines', () => {
    const headers = ['name', 'description'];
    const data = [{ name: 'Item', description: 'Line 1\nLine 2' }];

    const csv = generateCSVContent(headers, data);

    expect(csv).toContain('"Line 1\nLine 2"');
  });

  it('escapes multiple special characters', () => {
    const headers = ['data'];
    const data = [{ data: 'Value with "comma, newline\nand quotes"' }];

    const csv = generateCSVContent(headers, data);

    const parsed = parseCSVContent(csv);
    expect(parsed[1][0]).toBe('Value with "comma, newline\nand quotes"');
  });

  // --- Date formatting ---
  it('formats dates when dateFields specified', () => {
    const headers = ['name', 'birthDate'];
    const testDate = new Date('2023-05-15T00:00:00Z');
    const data = [{ name: 'Alice', birthDate: testDate }];

    const csv = generateCSVContent(headers, data, ['birthDate']);

    const parsed = parseCSVContent(csv);
    // Should be formatted as locale date string (without year if it's not displayed)
    expect(parsed[1][0]).toBe('Alice');
    // Date format depends on locale, so just verify it's a valid date string
    const dateStr = parsed[1][1];
    expect(dateStr).toBeTruthy();
    // Should be formatted (not ISO format)
    expect(dateStr).not.toContain('T');
  });

  it('handles invalid date values in dateFields', () => {
    const headers = ['name', 'birthDate'];
    const data = [{ name: 'Alice', birthDate: 'invalid-date' }];

    const csv = generateCSVContent(headers, data, ['birthDate']);

    const parsed = parseCSVContent(csv);
    expect(parsed[1][1]).toBe('invalid-date');
  });

  it('leaves null dates empty', () => {
    const headers = ['name', 'birthDate'];
    const data = [{ name: 'Alice', birthDate: null }];

    const csv = generateCSVContent(headers, data, ['birthDate']);

    const parsed = parseCSVContent(csv);
    expect(parsed[1][1]).toBe('');
  });

  // --- Number formatting ---
  it('formats numbers when numberFields specified', () => {
    const headers = ['id', 'score'];
    const data = [{ id: 42, score: 95.5 }];

    const csv = generateCSVContent(headers, data, [], ['id', 'score']);

    const parsed = parseCSVContent(csv);
    expect(parsed[1][0]).toBe('42');
    expect(parsed[1][1]).toBe('95.5');
  });

  it('handles zero in numberFields', () => {
    const headers = ['id', 'count'];
    const data = [{ id: 0, count: 0 }];

    const csv = generateCSVContent(headers, data, [], ['id', 'count']);

    const parsed = parseCSVContent(csv);
    expect(parsed[1][0]).toBe('0');
    expect(parsed[1][1]).toBe('0');
  });

  // --- Mixed type handling ---
  it('converts boolean to string', () => {
    const headers = ['name', 'active'];
    const data = [{ name: 'Alice', active: true }];

    const csv = generateCSVContent(headers, data);

    expect(csv).toContain('true');
  });

  it('converts objects to string representation', () => {
    const headers = ['name', 'meta'];
    const data = [{ name: 'Item', meta: { key: 'value' } }];

    const csv = generateCSVContent(headers, data);

    expect(csv).toContain('[object Object]');
  });

  // --- Edge cases ---
  it('handles empty data array', () => {
    const headers = ['name', 'age'];
    const data: Record<string, any>[] = [];

    const csv = generateCSVContent(headers, data);

    const lines = csv.split('\n');
    expect(lines).toHaveLength(1); // Only header
    expect(lines[0]).toBe('name,age');
  });

  it('handles empty headers', () => {
    const headers: string[] = [];
    const data = [{ name: 'Alice' }];

    const csv = generateCSVContent(headers, data);

    // Should produce empty lines
    expect(csv).toBe('\n');
  });

  it('handles missing fields in data object', () => {
    const headers = ['name', 'email', 'phone'];
    const data = [{ name: 'Alice' }]; // missing email and phone

    const csv = generateCSVContent(headers, data);

    const parsed = parseCSVContent(csv);
    expect(parsed[1]).toEqual(['Alice', '', '']);
  });

  it('handles extra fields in data (ignores them)', () => {
    const headers = ['name', 'age'];
    const data = [{ name: 'Alice', age: 30, extraField: 'ignored' }];

    const csv = generateCSVContent(headers, data);

    expect(csv).not.toContain('ignored');
    expect(csv).toContain('Alice');
  });

  // --- Real-world participant data ---
  it('generates valid CSV for participant data', () => {
    const headers = ['id', 'firstName', 'lastName', 'email', 'joinDate', 'active'];
    const data = [
      { id: 1, firstName: 'John', lastName: 'Doe', email: 'john@example.com', joinDate: new Date('2024-01-15'), active: true },
      { id: 2, firstName: 'Jane', lastName: 'Smith', email: 'jane@example.com', joinDate: new Date('2024-02-20'), active: false },
      { id: 3, firstName: 'Bob', lastName: null, email: 'bob@test.org', joinDate: new Date('2023-12-01'), active: true }
    ];

    const csv = generateCSVContent(
      headers,
      data,
      ['joinDate'],
      ['id']
    );

    const parsed = parseCSVContent(csv);
    expect(parsed).toHaveLength(4); // header + 3 rows
    expect(parsed[1][0]).toBe('1');
    expect(parsed[1][1]).toBe('John');
    expect(parsed[3][2]).toBe(''); // null lastName
  });

  // --- Real-world event data with tricky characters ---
  it('handles event data with special characters', () => {
    const headers = ['eventName', 'location', 'description'];
    const data = [
      {
        eventName: 'Spring "National" Championship',
        location: 'New York, NY',
        description: 'Multi-day event\nWith multiple disciplines\nAnd age categories'
      }
    ];

    const csv = generateCSVContent(headers, data);
    const parsed = parseCSVContent(csv);

    expect(parsed[1][0]).toBe('Spring "National" Championship');
    expect(parsed[1][1]).toBe('New York, NY');
    expect(parsed[1][2].includes('Multi-day')).toBe(true);
  });
});

// ────────────────────────────────────────────────────────────
// CSV Parsing Tests (verify our generated CSV is valid)
// ────────────────────────────────────────────────────────────
describe('parseCSVContent (verification)', () => {
  it('parses simple CSV correctly', () => {
    const csv = 'name,age\nAlice,30\nBob,25';
    const parsed = parseCSVContent(csv);

    expect(parsed[0]).toEqual(['name', 'age']);
    expect(parsed[1]).toEqual(['Alice', '30']);
    expect(parsed[2]).toEqual(['Bob', '25']);
  });

  it('parses quoted fields with commas', () => {
    const csv = 'name,address\nAlice,"Main St, Apt 5"';
    const parsed = parseCSVContent(csv);

    expect(parsed[1][1]).toBe('Main St, Apt 5');
  });

  it('parses escaped quotes', () => {
    const csv = 'quote\n"She said ""hello"""';
    const parsed = parseCSVContent(csv);

    expect(parsed[1][0]).toBe('She said "hello"');
  });

  it('parses multiline fields', () => {
    const csv = 'description\n"Line 1\nLine 2\nLine 3"';
    const parsed = parseCSVContent(csv);

    expect(parsed[1][0]).toContain('Line 1');
    expect(parsed[1][0]).toContain('Line 2');
  });
});
