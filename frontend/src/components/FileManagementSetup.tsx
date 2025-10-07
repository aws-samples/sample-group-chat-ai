// Copyright 2025 Amazon.com, Inc. or its affiliates.
// SPDX-License-Identifier: MIT-0

import React, { useState } from 'react';
import {
  Modal,
  SpaceBetween,
  Button,
  Table,
  Box,
  Badge,
  Select,
  Alert,
  Multiselect,
  FileUpload,
  Header,
} from '@cloudscape-design/components';
import { PersonaTileData } from './PersonaTile';

export interface FileSetupData {
  id: string;
  file: File;
  isGlobal: boolean;
  targetPersonas: string[];
}

interface FileManagementSetupProps {
  visible: boolean;
  onDismiss: () => void;
  availablePersonas: PersonaTileData[];
  selectedPersonaIds: string[];
  files: FileSetupData[];
  onFilesChange: (files: FileSetupData[]) => void;
}

export const FileManagementSetup: React.FC<FileManagementSetupProps> = ({
  visible,
  onDismiss,
  availablePersonas,
  selectedPersonaIds,
  files,
  onFilesChange,
}) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isGlobal, setIsGlobal] = useState(true);
  const [selectedPersonas, setSelectedPersonas] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Filter personas to only show selected ones
  const filteredPersonas = availablePersonas.filter((p) =>
    selectedPersonaIds.includes(p.personaId)
  );

  const handleFileSelect = (newFiles: File[]) => {
    setSelectedFiles(newFiles);
    setError(null);
  };

  const handleAddFiles = () => {
    if (selectedFiles.length === 0) {
      return;
    }

    if (!isGlobal && selectedPersonas.length === 0) {
      setError('Please select at least one persona for the files');
      return;
    }

    const newFileData: FileSetupData[] = selectedFiles.map((file) => ({
      id: `${file.name}-${Date.now()}-${Math.random()}`,
      file,
      isGlobal,
      targetPersonas: isGlobal ? [] : selectedPersonas,
    }));

    onFilesChange([...files, ...newFileData]);
    setSelectedFiles([]);
    setSelectedPersonas([]);
    setIsGlobal(true);
    setError(null);
  };

  const handleRemoveFile = (fileId: string) => {
    onFilesChange(files.filter((f) => f.id !== fileId));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const getPersonaOptions = () => {
    return filteredPersonas.map((persona) => ({
      label: `${persona.name} (${persona.role})`,
      value: persona.personaId,
    }));
  };

  const getPersonaName = (personaId: string): string => {
    const persona = availablePersonas.find((p) => p.personaId === personaId);
    return persona?.name || personaId;
  };

  return (
    <Modal
      visible={visible}
      onDismiss={onDismiss}
      size="large"
      header={
        <Header
          variant="h2"
          description="Configure files for the conversation. Files will be processed when the conversation starts."
        >
          Manage Files
        </Header>
      }
      footer={
        <Box float="right">
          <Button variant="primary" onClick={onDismiss}>
            Done
          </Button>
        </Box>
      }
    >
      <SpaceBetween size="l">
        {error && (
          <Alert type="error" dismissible onDismiss={() => setError(null)}>
            {error}
          </Alert>
        )}

        {selectedPersonaIds.length === 0 && (
          <Alert type="warning">
            Please select at least one persona in the conversation setup to manage files.
          </Alert>
        )}

        {/* File Upload Section */}
        <SpaceBetween size="m">
          <Header variant="h3">Add Files</Header>

          <FileUpload
            onChange={({ detail }) => handleFileSelect(detail.value)}
            value={selectedFiles}
            i18nStrings={{
              uploadButtonText: (e) => (e ? 'Choose files' : 'Choose file'),
              dropzoneText: (e) => (e ? 'Drop files to upload' : 'Drop file to upload'),
              removeFileAriaLabel: (e) => `Remove file ${e + 1}`,
              limitShowFewer: 'Show fewer files',
              limitShowMore: 'Show more files',
              errorIconAriaLabel: 'Error',
            }}
            multiple
            showFileLastModified
            showFileSize
            showFileThumbnail
            tokenLimit={3}
            constraintText="Supported: PDF, DOCX, CSV, XLSX, TXT, JSON. Max 25MB per file."
          />

          <Select
            selectedOption={isGlobal ? { label: 'All Personas (Global)', value: 'global' } : null}
            onChange={({ detail }) => {
              const newIsGlobal = detail.selectedOption.value === 'global';
              setIsGlobal(newIsGlobal);
              if (newIsGlobal) {
                setSelectedPersonas([]);
              }
            }}
            options={[
              { label: 'All Personas (Global)', value: 'global' },
              { label: 'Specific Personas', value: 'specific' },
            ]}
            selectedAriaLabel="Selected"
            disabled={selectedPersonaIds.length === 0}
          />

          {!isGlobal && (
            <Multiselect
              selectedOptions={selectedPersonas.map((id) => {
                const persona = filteredPersonas.find((p) => p.personaId === id);
                return {
                  label: persona ? `${persona.name} (${persona.role})` : id,
                  value: id,
                };
              })}
              onChange={({ detail }) => {
                setSelectedPersonas(detail.selectedOptions.map((opt) => opt.value!));
              }}
              options={getPersonaOptions()}
              placeholder="Select personas..."
              selectedAriaLabel="Selected"
              disabled={selectedPersonaIds.length === 0}
            />
          )}

          <Button
            variant="primary"
            onClick={handleAddFiles}
            disabled={
              selectedFiles.length === 0 ||
              selectedPersonaIds.length === 0 ||
              (!isGlobal && selectedPersonas.length === 0)
            }
          >
            Add to List
          </Button>
        </SpaceBetween>

        {/* Files List */}
        <SpaceBetween size="m">
          <Header variant="h3">Files to Upload ({files.length})</Header>

          <Table
            columnDefinitions={[
              {
                id: 'fileName',
                header: 'File Name',
                cell: (item) => item.file.name,
              },
              {
                id: 'fileSize',
                header: 'Size',
                cell: (item) => formatFileSize(item.file.size),
              },
              {
                id: 'associations',
                header: 'Available To',
                cell: (item) => {
                  if (item.isGlobal) {
                    return <Badge color="green">All Personas</Badge>;
                  }
                  return (
                    <SpaceBetween size="xxs" direction="horizontal">
                      {item.targetPersonas.map((pId) => (
                        <Badge key={pId}>{getPersonaName(pId)}</Badge>
                      ))}
                    </SpaceBetween>
                  );
                },
              },
              {
                id: 'actions',
                header: 'Actions',
                cell: (item) => (
                  <Button onClick={() => handleRemoveFile(item.id)} variant="inline-link">
                    Remove
                  </Button>
                ),
              },
            ]}
            items={files}
            empty={
              <Box textAlign="center" color="inherit">
                <b>No files added yet</b>
                <Box padding={{ bottom: 's' }} variant="p" color="inherit">
                  Add files above to include them in the conversation
                </Box>
              </Box>
            }
          />
        </SpaceBetween>

        <Alert type="info">
          <b>Note:</b> Files will be uploaded and processed when you start the conversation. Only
          files for selected personas will be processed.
        </Alert>
      </SpaceBetween>
    </Modal>
  );
};
