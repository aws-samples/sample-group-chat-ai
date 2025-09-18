// Copyright 2025 Amazon.com, Inc. or its affiliates.
// SPDX-License-Identifier: MIT-0

import React, { useState } from 'react';
import { Box, SpaceBetween, TextContent, Button, Modal, Icon } from '@cloudscape-design/components';
import { ImageAttachment } from '@group-chat-ai/shared';
import { useTranslation } from 'react-i18next';

interface ImageMessageProps {
  imageAttachment: ImageAttachment;
  showFileName?: boolean;
  maxWidth?: number;
  maxHeight?: number;
}

export const ImageMessage: React.FC<ImageMessageProps> = ({
  imageAttachment,
  showFileName = true,
  maxWidth = 400,
  maxHeight = 300,
}) => {
  const { t } = useTranslation(['common', 'components']);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [imageError, setImageError] = useState(false);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) {return '0 Bytes';}
    const k = 1024;
    // nosemgrep: i18next-colon-format-error
    const sizes = t('common:file.sizes', { returnObjects: true }) as string[];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatUploadTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    // nosemgrep: i18next-colon-format-error
    if (diffMins < 1) {return t('components:imageMessage.justNow');}
    if (diffMins < 60) {return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;}
    if (diffHours < 24) {return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;}
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  const getImageSrc = (): string => {
    if (imageAttachment.thumbnailData) {
      return `data:${imageAttachment.fileType};base64,${imageAttachment.thumbnailData}`;
    } else if (imageAttachment.base64Data) {
      return `data:${imageAttachment.fileType};base64,${imageAttachment.base64Data}`;
    }
    return '';
  };

  const getFullImageSrc = (): string => {
    if (imageAttachment.base64Data) {
      return `data:${imageAttachment.fileType};base64,${imageAttachment.base64Data}`;
    }
    return getImageSrc();
  };

  const handleImageError = () => {
    setImageError(true);
  };

  const handleImageClick = () => {
    if (!imageError) {
      setIsModalOpen(true);
    }
  };

  if (imageError) {
    return (
      <Box>
        <div
          style={{
            border: '2px dashed #d5dbdb',
            borderRadius: '8px',
            padding: '16px',
            textAlign: 'center',
            backgroundColor: '#fafbfc',
            maxWidth: `${maxWidth}px`,
          }}
        >
          <SpaceBetween direction='vertical' size='s' >
            <Icon name='file' size='big' variant='disabled' />
            <TextContent>
              <div>
                {/* nosemgrep: i18next-colon-format-error */}
                <strong>{t('common:labels.imageUnavailable')}</strong>
              </div>
              {showFileName && (
                <div>
                  <small>{imageAttachment.fileName}</small>
                  <br />
                  <small>
                    {formatFileSize(imageAttachment.fileSize)} •{' '}
                    {formatUploadTime(imageAttachment.uploadedAt)}
                  </small>
                </div>
              )}
            </TextContent>
          </SpaceBetween>
        </div>
      </Box>
    );
  }

  return (
    <Box>
      <SpaceBetween direction='vertical' size='xs'>
        {/* Image thumbnail */}
        <div
          style={{
            position: 'relative',
            display: 'inline-block',
            cursor: 'pointer',
            borderRadius: '8px',
            overflow: 'hidden',
            border: '1px solid #d5dbdb',
            maxWidth: `${maxWidth}px`,
          }}
          onClick={handleImageClick}
        >
          <img
            src={getImageSrc()}
            alt={imageAttachment.fileName}
            onError={handleImageError}
            style={{
              maxWidth: '100%',
              maxHeight: `${maxHeight}px`,
              objectFit: 'contain',
              display: 'block',
            }}
          />

          {/* Overlay with expand icon */}
          <div
            style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              borderRadius: '4px',
              padding: '4px',
              color: 'white',
            }}
          >
            <Icon name='expand' variant='inverted' />
          </div>
        </div>

        {/* File info */}
        {showFileName && (
          <TextContent>
            <div>
              <strong>{imageAttachment.fileName}</strong>
            </div>
            <small>
              {formatFileSize(imageAttachment.fileSize)} •{' '}
              {formatUploadTime(imageAttachment.uploadedAt)}
            </small>
          </TextContent>
        )}
      </SpaceBetween>

      {/* Full-size modal */}
      <Modal
        visible={isModalOpen}
        onDismiss={() => setIsModalOpen(false)}
        header={imageAttachment.fileName}
        size='max'
        footer={
          <Box float='right'>
            <SpaceBetween direction='horizontal' size='xs'>
              <Button variant='link' onClick={() => setIsModalOpen(false)}>
                {/* nosemgrep: i18next-colon-format-error */}
                {t('components:imageMessage.actions.close')}
              </Button>
            </SpaceBetween>
          </Box>
        }
      >
        <Box>
          <SpaceBetween direction='vertical' size='m'>
            {/* Full-size image */}
            <div style={{ textAlign: 'center' }}>
              <img
                src={getFullImageSrc()}
                alt={imageAttachment.fileName}
                style={{
                  maxWidth: '100%',
                  maxHeight: '80vh',
                  objectFit: 'contain',
                }}
              />
            </div>

            {/* Image details */}
            <Box>
              <SpaceBetween direction='vertical' size='xs'>
                <TextContent>
                  <div>
                    {/* nosemgrep: i18next-colon-format-error */}
                    <strong>{t('common:labels.fileDetails')}</strong>
                  </div>
                  {/* nosemgrep: i18next-colon-format-error */}
                  <div>{t('components:imageMessage.details.name')}: {imageAttachment.fileName}</div>
                  {/* nosemgrep: i18next-colon-format-error */}
                  <div>{t('components:imageMessage.details.type')}: {imageAttachment.fileType}</div>
                  {/* nosemgrep: i18next-colon-format-error */}
                  <div>{t('components:imageMessage.details.size')}: {formatFileSize(imageAttachment.fileSize)}</div>
                  {/* nosemgrep: i18next-colon-format-error */}
                  <div>{t('components:imageMessage.details.uploaded')}: {formatUploadTime(imageAttachment.uploadedAt)}</div>
                  {/* nosemgrep: i18next-colon-format-error */}
                  {imageAttachment.chunks && <div>{t('components:imageMessage.details.chunks')}: {imageAttachment.chunks.length}</div>}
                </TextContent>
              </SpaceBetween>
            </Box>
          </SpaceBetween>
        </Box>
      </Modal>
    </Box>
  );
};
