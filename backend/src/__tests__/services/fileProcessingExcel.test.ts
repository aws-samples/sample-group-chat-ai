// Copyright 2025 Amazon.com, Inc. or its affiliates.
// SPDX-License-Identifier: MIT-0

// Verifies the xlsx -> exceljs swap in FileProcessingService: a real .xlsx
// buffer (built with ExcelJS) and a CSV buffer both round-trip through
// processFile and yield the expected flattened text.

import ExcelJS from 'exceljs';
import { FileProcessingService } from '../../services/FileProcessingService';

const XLSX_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const CSV_MIME = 'text/csv';

describe('FileProcessingService Excel/CSV extraction (exceljs)', () => {
  const service = new FileProcessingService();

  async function buildXlsxBuffer(): Promise<Buffer> {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('People');
    ws.addRow(['Name', 'Role']);
    ws.addRow(['Ada', 'Engineer']);
    ws.addRow(['Grace', 'Admiral']);
    const ab = await wb.xlsx.writeBuffer();
    return Buffer.from(ab as ArrayBuffer);
  }

  it('extracts cell text and the sheet name from a real .xlsx buffer', async () => {
    const buffer = await buildXlsxBuffer();
    const result = await service.processFile(buffer, 'people.xlsx', XLSX_MIME);

    expect(result.extractedText).toContain('--- Sheet: People ---');
    expect(result.extractedText).toContain('Name');
    expect(result.extractedText).toContain('Ada');
    expect(result.extractedText).toContain('Engineer');
    expect(result.extractedText).toContain('Grace');
    expect(result.chunks.length).toBeGreaterThan(0);
  });

  it('extracts text from a CSV buffer', async () => {
    const csv = 'col1,col2\nalpha,beta\ngamma,delta\n';
    const buffer = Buffer.from(csv, 'utf-8');
    const result = await service.processFile(buffer, 'data.csv', CSV_MIME);

    expect(result.extractedText).toContain('alpha');
    expect(result.extractedText).toContain('delta');
  });

  it('does not throw on an empty worksheet', async () => {
    const wb = new ExcelJS.Workbook();
    wb.addWorksheet('Empty');
    const buffer = Buffer.from((await wb.xlsx.writeBuffer()) as ArrayBuffer);
    const result = await service.processFile(buffer, 'empty.xlsx', XLSX_MIME);
    expect(result.extractedText).toContain('--- Sheet: Empty ---');
  });

  // The following three exercise the non-primitive branches of cellToText,
  // which is where the xlsx -> exceljs swap differs most (SheetJS flattened
  // everything to a string; exceljs surfaces rich cell objects). Each builds a
  // real .xlsx so the cell is serialized and re-parsed exactly as an uploaded
  // file would be, rather than hand-constructing the in-memory object.

  it('extracts the computed result of a FORMULA cell', async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Formulas');
    ws.getCell('A1').value = 2;
    ws.getCell('B1').value = 3;
    // exceljs serializes {formula, result}; cellToText must prefer `result`.
    ws.getCell('C1').value = { formula: 'A1+B1', result: 5 };
    const buffer = Buffer.from((await wb.xlsx.writeBuffer()) as ArrayBuffer);

    const result = await service.processFile(buffer, 'formula.xlsx', XLSX_MIME);

    // The computed result (5) must appear, and the raw formula text must NOT.
    expect(result.extractedText).toContain('5');
    expect(result.extractedText).not.toContain('A1+B1');
  });

  it('extracts the display text of a DATE cell', async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Dates');
    const d = new Date(Date.UTC(2026, 0, 15, 0, 0, 0)); // 2026-01-15T00:00:00Z
    ws.getCell('A1').value = d;
    const buffer = Buffer.from((await wb.xlsx.writeBuffer()) as ArrayBuffer);

    const result = await service.processFile(buffer, 'date.xlsx', XLSX_MIME);

    // cellToText returns date.toISOString(); the date portion survives
    // cleanText (which only collapses whitespace, and ':' / '-' are kept).
    expect(result.extractedText).toContain('2026-01-15');
  });

  it('extracts the visible text of a HYPERLINK cell', async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Links');
    // exceljs serializes {text, hyperlink}; cellToText must return `text`.
    ws.getCell('A1').value = {
      text: 'AWS Console',
      hyperlink: 'https://console.aws.amazon.com',
    };
    const buffer = Buffer.from((await wb.xlsx.writeBuffer()) as ArrayBuffer);

    const result = await service.processFile(buffer, 'link.xlsx', XLSX_MIME);

    expect(result.extractedText).toContain('AWS Console');
  });

  it('extracts concatenated runs of a RICH TEXT cell', async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Rich');
    // exceljs serializes {richText:[{text}, ...]}; cellToText joins the runs.
    ws.getCell('A1').value = {
      richText: [
        { text: 'Hello ' },
        { text: 'World', font: { bold: true } },
      ],
    };
    const buffer = Buffer.from((await wb.xlsx.writeBuffer()) as ArrayBuffer);

    const result = await service.processFile(buffer, 'rich.xlsx', XLSX_MIME);

    // Runs are concatenated to "Hello World"; cleanText collapses the internal
    // space to a single space, so assert on the joined text.
    expect(result.extractedText).toContain('Hello World');
  });
});
