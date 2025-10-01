// Copyright 2025 Amazon.com, Inc. or its affiliates.
// SPDX-License-Identifier: MIT-0

import React, { useState, useEffect } from 'react';
import {
  Container,
  Header,
  SpaceBetween,
  Button,
  Table,
  Box,
  Badge,
  Select,
  ProgressBar,
  Alert,
  StatusIndicator,
  Multiselect,
  FileUpload,
} from '@cloudscape-design/components';
import { FileContext, FileProcessingStatus } from '@group-chat-ai/shared';
import { useApi } from '../hooks/useApi';
import { PersonaTileData } from './PersonaTile';

interface FileUploadManagerProps {
  sessionId: string;
  availablePersonas: PersonaTileData[];
  onFilesUpdated?: () => void;
}

interface FileUploadState {
  file: File;
  fileId?: string;
  progress: number;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  error?: string;
}

export const FileUploadManager: React.FC<FileUploadManagerProps> = ({
  sessionId,
  availablePersonas,
  onFilesUpdated,
}) => {
  const { apiService } = useApi();
  const [files, setFiles] = useState<FileContext[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadStates, setUploadStates] = useState<Map<string, FileUploadState>>(new Map());
  const [isGlobal, setIsGlobal] = useState(true);
  const [selectedPersonas, setSelectedPersonas] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load existing files
  useEffect(() => {
    loadFiles();
  }, [sessionId]);

  const loadFiles = async () => {
    if (!apiService || !sessionId) return;

    try {
      setLoading(true);
      const response = await apiService.listSessionFiles(sessionId);
      setFiles(response.files);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load files');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (files: File[]) => {
    setSelectedFiles(files);
    setError(null);
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0 || !apiService) return;

    setError(null);

    for (const file of selectedFiles) {
      const uploadKey = `${file.name}-${Date.now()}`;

      try {
        // Set initial upload state
        setUploadStates((prev) =>
          new Map(prev).set(uploadKey, {
            file,
            progress: 0,
            status: 'uploading',
          })
        );

        // Step 1: Initiate upload
        const initiateResponse = await apiService.initiateFileUpload(sessionId, {
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          targetPersonas: isGlobal ? undefined : selectedPersonas,
        });

        // Update with fileId
        setUploadStates((prev) =>
          new Map(prev).set(uploadKey, {
            file,
            fileId: initiateResponse.fileId,
            progress: 25,
            status: 'uploading',
          })
        );

        // Step 2: Upload to S3
        await apiService.uploadFileToS3(initiateResponse.uploadUrl, file);

        setUploadStates((prev) =>
          new Map(prev).set(uploadKey, {
            file,
            fileId: initiateResponse.fileId,
            progress: 75,
            status: 'processing',
          })
        );

        // Step 3: Complete upload (trigger processing)
        await apiService.completeFileUpload(sessionId, initiateResponse.fileId, {
          fileId: initiateResponse.fileId,
        });

        setUploadStates((prev) =>
          new Map(prev).set(uploadKey, {
            file,
            fileId: initiateResponse.fileId,
            progress: 100,
            status: 'completed',
          })
        );

        // Reload files list
        await loadFiles();
        onFilesUpdated?.();
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Upload failed';
        setUploadStates((prev) =>
          new Map(prev).set(uploadKey, {
            file,
            progress: 0,
            status: 'error',
            error: errorMessage,
          })
        );
        setError(errorMessage);
      }
    }

    // Clear selected files after upload
    setSelectedFiles([]);
  };

  const handleDelete = async (fileId: string) => {
    if (!apiService) return;

    try {
      await apiService.deleteFile(sessionId, fileId);
      await loadFiles();
      onFilesUpdated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete file');
    }
  };

  // Removed unused function - will be used in future updates for inline editing
  // const handleUpdateAssociations = async (fileId: string, personaIds: string[], isGlobal: boolean) => {
  //   if (!apiService) return;
  //   try {
  //     await apiService.updateFileAssociations(sessionId, fileId, {
  //       personaIds: isGlobal ? undefined : personaIds,
  //       isGlobal,
  //     });
  //     await loadFiles();
  //     onFilesUpdated?.();
  //   } catch (err) {
  //     setError(err instanceof Error ? err.message : 'Failed to update file associations');
  //   }
  // };

  const getStatusIndicator = (status: FileProcessingStatus) => {
    switch (status) {
      case FileProcessingStatus.PENDING:
        return <StatusIndicator type="pending">Pending</StatusIndicator>;
      case FileProcessingStatus.PROCESSING:
        return <StatusIndicator type="in-progress">Processing</StatusIndicator>;
      case FileProcessingStatus.COMPLETED:
        return <StatusIndicator type="success">Completed</StatusIndicator>;
      case FileProcessingStatus.FAILED:
        return <StatusIndicator type="error">Failed</StatusIndicator>;
      default:
        return <StatusIndicator type="info">Unknown</StatusIndicator>;
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getPersonaOptions = () => {
    return availablePersonas.map((persona) => ({
      label: `${persona.name} (${persona.role})`,
      value: persona.personaId,
    }));
  };

  return (
    <Container
      header={
        <Header
          variant="h2"
          description="Upload files to provide contextual knowledge to AI personas"
        >
          File Upload Manager
        </Header>
      }
    >
      <SpaceBetween size="l">
        {error && (
          <Alert type="error" dismissible onDismiss={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Upload Section */}
        <SpaceBetween size="m">
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
              const isGlobal = detail.selectedOption.value === 'global';
              setIsGlobal(isGlobal);
              if (isGlobal) {
                setSelectedPersonas([]);
              }
            }}
            options={[
              { label: 'All Personas (Global)', value: 'global' },
              { label: 'Specific Personas', value: 'specific' },
            ]}
            selectedAriaLabel="Selected"
          />

          {!isGlobal && (
            <Multiselect
              selectedOptions={selectedPersonas.map((id) => {
                const persona = availablePersonas.find((p) => p.personaId === id);
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
            />
          )}

          <Button
            variant="primary"
            onClick={handleUpload}
            disabled={selectedFiles.length === 0 || (!isGlobal && selectedPersonas.length === 0)}
          >
            Upload Files
          </Button>
        </SpaceBetween>

        {/* Upload Progress */}
        {uploadStates.size > 0 && (
          <SpaceBetween size="s">
            {Array.from(uploadStates.entries()).map(([key, state]) => (
              <Box key={key}>
                <SpaceBetween size="xs">
                  <Box variant="small">{state.file.name}</Box>
                  {state.status === 'error' ? (
                    <StatusIndicator type="error">{state.error}</StatusIndicator>
                  ) : (
                    <ProgressBar
                      value={state.progress}
                      additionalInfo={
                        state.status === 'processing' ? 'Processing file...' : undefined
                      }
                      status={state.status === 'completed' ? 'success' : 'in-progress'}
                    />
                  )}
                </SpaceBetween>
              </Box>
            ))}
          </SpaceBetween>
        )}

        {/* Files Table */}
        <Table
          loading={loading}
          columnDefinitions={[
            {
              id: 'fileName',
              header: 'File Name',
              cell: (item) => item.fileName,
              sortingField: 'fileName',
            },
            {
              id: 'fileType',
              header: 'Type',
              cell: (item) => <Badge>{item.fileType}</Badge>,
            },
            {
              id: 'fileSize',
              header: 'Size',
              cell: (item) => formatFileSize(item.fileSize),
            },
            {
              id: 'associations',
              header: 'Available To',
              cell: (item) => {
                if (item.associatedPersonas.length === 0) {
                  return <Badge color="green">All Personas</Badge>;
                }
                return (
                  <SpaceBetween size="xxs" direction="horizontal">
                    {item.associatedPersonas.map((pId) => {
                      const persona = availablePersonas.find((p) => p.personaId === pId);
                      return <Badge key={pId}>{persona?.name || pId}</Badge>;
                    })}
                  </SpaceBetween>
                );
              },
            },
            {
              id: 'status',
              header: 'Status',
              cell: (item) => getStatusIndicator(item.processingStatus),
            },
            {
              id: 'tokenCount',
              header: 'Tokens',
              cell: (item) => item.tokenCount?.toLocaleString() || '-',
            },
            {
              id: 'actions',
              header: 'Actions',
              cell: (item) => (
                <Button onClick={() => handleDelete(item.fileId)} variant="inline-link">
                  Delete
                </Button>
              ),
            },
          ]}
          items={files}
          empty={
            <Box textAlign="center" color="inherit">
              <b>No files uploaded</b>
              <Box padding={{ bottom: 's' }} variant="p" color="inherit">
                Upload files to provide contextual knowledge to personas
              </Box>
            </Box>
          }
        />
      </SpaceBetween>
    </Container>
  );
};
