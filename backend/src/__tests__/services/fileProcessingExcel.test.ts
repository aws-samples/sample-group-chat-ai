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
});
