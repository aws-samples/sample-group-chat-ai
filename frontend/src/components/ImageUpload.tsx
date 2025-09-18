// Copyright 2025 Amazon.com, Inc. or its affiliates.
// SPDX-License-Identifier: MIT-0

import React, { useState, useRef } from 'react';
import {
  Box,
  Button,
  SpaceBetween,
  Alert,
  ProgressBar,
  Icon,
  TextContent,
} from '@cloudscape-design/components';
import { ImageAttachment } from '@group-chat-ai/shared';
import { useTranslation } from 'react-i18next';

interface ImageUploadProps {
  onImageUploaded: (imageAttachment: ImageAttachment) => void;
  onUploadError: (error: string) => void;
  disabled?: boolean;
  sessionId: string;
}

interface UploadProgress {
  fileName: string;
  progress: number;
  status: 'uploading' | 'processing' | 'complete' | 'error';
  error?: string;
}

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const CHUNK_SIZE = 8 * 1024 * 1024; // 8MB chunks
const SUPPORTED_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/bmp',
  'image/tiff',
];

export const ImageUpload: React.FC<ImageUploadProps> = ({
  onImageUploaded,
  onUploadError,
  disabled = false,
  sessionId,
}) => {
  const { t } = useTranslation('components');
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    if (!SUPPORTED_TYPES.includes(file.type.toLowerCase())) {
      // nosemgrep: i18next-key-format
      return t('imageUpload.unsupportedFileType', { fileType: file.type, supportedTypes: SUPPORTED_TYPES.join(', ') });
    }

    if (file.size > MAX_FILE_SIZE) {
      // nosemgrep: i18next-key-format
      return t('imageUpload.fileSizeExceeded', { maxSize: MAX_FILE_SIZE / (1024 * 1024) });
    }

    if (file.size === 0) {
      // nosemgrep: i18next-key-format
      return t('imageUpload.fileEmpty');
    }

    return null;
  };

  const uploadImageInChunks = async (file: File): Promise<ImageAttachment> => {
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

    setUploadProgress({
      fileName: file.name,
      progress: 0,
      status: 'uploading',
    });

    try {
      // Step 1: Initiate upload
      const initiateResponse = await fetch(`/api/sessions/${sessionId}/images/initiate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          totalChunks,
        }),
      });

      if (!initiateResponse.ok) {
        // nosemgrep: i18next-key-format
        throw new Error(t('imageUpload.uploadInitiateFailed', { error: initiateResponse.statusText }));
      }

      const { imageId } = await initiateResponse.json();

      // Step 2: Upload chunks
      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        const start = chunkIndex * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunk = file.slice(start, end);

        // Convert chunk to base64
        const chunkBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            // Remove data URL prefix (data:application/octet-stream;base64,)
            const base64 = result.split(',')[1];
            resolve(base64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(chunk);
        });

        const chunkResponse = await fetch(`/api/sessions/${sessionId}/images/${imageId}/chunks`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            chunkIndex,
            chunkData: chunkBase64,
            chunkSize: chunk.size,
          }),
        });

        if (!chunkResponse.ok) {
          // nosemgrep: i18next-key-format
          throw new Error(t('imageUpload.chunkUploadFailed', { chunkIndex, error: chunkResponse.statusText }));
        }

        // Update progress
        const progress = Math.round(((chunkIndex + 1) / totalChunks) * 80); // 80% for upload, 20% for processing
        setUploadProgress(prev => (prev ? { ...prev, progress } : null));
      }

      // Step 3: Complete upload
      setUploadProgress(prev => (prev ? { ...prev, status: 'processing', progress: 90 } : null));

      const completeResponse = await fetch(
        `/api/sessions/${sessionId}/images/${imageId}/complete`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ imageId }),
        }
      );

      if (!completeResponse.ok) {
        // nosemgrep: i18next-key-format
        throw new Error(t('imageUpload.uploadCompleteFailed', { error: completeResponse.statusText }));
      }

      const { imageAttachment } = await completeResponse.json();

      setUploadProgress(prev => (prev ? { ...prev, status: 'complete', progress: 100 } : null));

      // Clear progress after a short delay
      setTimeout(() => {
        setUploadProgress(null);
      }, 2000);

      return imageAttachment;
    } catch (error) {
      setUploadProgress(prev =>
        prev
          ? {
              ...prev,
              status: 'error',
              // nosemgrep: i18next-key-format
              error: error instanceof Error ? error.message : t('imageUpload.uploadFailed'),
            }
          : null
      );
      throw error;
    }
  };

  const handleFileSelect = async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      onUploadError(validationError);
      return;
    }

    try {
      const imageAttachment = await uploadImageInChunks(file);
      onImageUploaded(imageAttachment);
    } catch (error) {
      // nosemgrep: i18next-key-format
      const errorMessage = error instanceof Error ? error.message : t('imageUpload.uploadFailed');
      onUploadError(errorMessage);
    }
  };

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
    // Reset input value to allow selecting the same file again
    event.target.value = '';
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    if (!disabled) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);

    if (disabled) {return;}

    const files = Array.from(event.dataTransfer.files);
    const imageFile = files.find(file => SUPPORTED_TYPES.includes(file.type.toLowerCase()));

    if (imageFile) {
      handleFileSelect(imageFile);
    } else if (files.length > 0) {
      // nosemgrep: i18next-key-format
      onUploadError(t('imageUpload.selectValid'));
    }
  };

  const openFileDialog = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <Box>
      <SpaceBetween direction='vertical' size='s'>
        {/* Upload Progress */}
        {uploadProgress && (
          <Box>
            <SpaceBetween direction='vertical' size='xs'>
              <TextContent>
                <small>
                  {/* nosemgrep: i18next-key-format */}
                  {uploadProgress.status === 'uploading' && t('imageUpload.statusUploading')}
                  {/* nosemgrep: i18next-key-format */}
                  {uploadProgress.status === 'processing' && t('imageUpload.statusProcessing')}
                  {/* nosemgrep: i18next-key-format */}
                  {uploadProgress.status === 'complete' && t('imageUpload.statusComplete')}
                  {/* nosemgrep: i18next-key-format */}
                  {uploadProgress.status === 'error' && t('voiceSettings.statusError')}: {uploadProgress.fileName}
                </small>
              </TextContent>
              <ProgressBar
                value={uploadProgress.progress}
                status={uploadProgress.status === 'error' ? 'error' : 'in-progress'}
                description={
                  uploadProgress.status === 'error'
                    ? uploadProgress.error
                    : `${uploadProgress.progress}%`
                }
              />
            </SpaceBetween>
          </Box>
        )}

        {/* Upload Area */}
        <div
          style={{
            border: `2px dashed ${isDragOver ? '#0073bb' : '#d5dbdb'}`,
            borderRadius: '8px',
            padding: '24px',
            textAlign: 'center',
            backgroundColor: isDragOver ? '#f0f8ff' : disabled ? '#f9f9f9' : '#fafbfc',
            cursor: disabled ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
          }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={openFileDialog}
        >
          <SpaceBetween direction='vertical' size='s' >
            <Icon name='upload' size='big' variant={disabled ? 'disabled' : 'normal'} />
            <TextContent>
              <div>
                <strong>
                  {/* nosemgrep: i18next-key-format */}
                  {isDragOver ? t('imageUpload.dropHere') : t('imageUpload.clickToUpload')}
                </strong>
              </div>
              <small>
                {/* nosemgrep: i18next-key-format */}
                {t('imageUpload.supportedFormats', { maxSize: MAX_FILE_SIZE / (1024 * 1024) })}
              </small>
            </TextContent>
            <Button variant='primary' disabled={disabled || !!uploadProgress} iconName='upload'>
              {/* nosemgrep: i18next-key-format */}
              {uploadProgress ? t('imageUpload.uploading') : t('imageUpload.selectImage')}
            </Button>
          </SpaceBetween>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type='file'
          accept={SUPPORTED_TYPES.join(',')}
          onChange={handleFileInputChange}
          style={{ display: 'none' }}
          disabled={disabled}
        />

        {/* Help text */}
        {/* nosemgrep: i18next-key-format */}
        <Alert type='info' header={t('pages.userGuides.features.contentManagement.title')}>
          {/* nosemgrep: i18next-key-format */}
          {t('pages.userGuides.features.contentManagement.description')}
        </Alert>
      </SpaceBetween>
    </Box>
  );
};
