// Copyright 2025 Amazon.com, Inc. or its affiliates.
// SPDX-License-Identifier: MIT-0

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  SpaceBetween,
  Header,
  Button,
  Alert,
  Cards,
  ButtonDropdown,
  Modal,
  Input,
  ExpandableSection,
} from '@cloudscape-design/components';
import { PersonaTile, PersonaTileData } from './PersonaTile';
import { PersonaEditor } from './PersonaEditor';
import { ImportExportService } from '../utils/importExport';
import { SessionScopedStorage, PERSONA_STORAGE_KEYS } from '../utils/sessionScopedStorage';
import { PERSONA_DEFINITIONS, SharedPersonaDefinition } from '@group-chat-ai/shared';
import { useTranslation } from 'react-i18next';

interface PersonaTileManagerProps {
  selectedPersonaIds: string[];
  onSelectionChange: (selectedIds: string[]) => void;
  onPersonasChange?: (personas: PersonaTileData[]) => void;
}

export const PersonaTileManager: React.FC<PersonaTileManagerProps> = ({
  selectedPersonaIds,
  onSelectionChange,
  onPersonasChange,
}) => {
  const { t } = useTranslation('components');
  const [personas, setPersonas] = useState<PersonaTileData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingPersona, setEditingPersona] = useState<PersonaTileData | null>(null);
  const [isEditorVisible, setIsEditorVisible] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [deleteConfirmPersona, setDeleteConfirmPersona] = useState<PersonaTileData | null>(null);
  const [deleteType, setDeleteType] = useState<'modified' | 'custom'>('custom');
  const [showRestoreWarning, setShowRestoreWarning] = useState(false);

  // Convert SharedPersonaDefinition to PersonaTileData
  const convertSharedPersonaToTileData = (
    sharedPersona: SharedPersonaDefinition
  ): PersonaTileData => {
    return {
      personaId: sharedPersona.personaId,
      name: sharedPersona.name,
      role: sharedPersona.role,
      details: sharedPersona.details,
      avatarId: sharedPersona.avatarId,
      voiceId: sharedPersona.defaultVoiceId,
      isCustom: false,
      isSelected: false,
    };
  };

  // Get default persona definitions from shared module
  const getDefaultPersonas = useCallback((): PersonaTileData[] => {
    return PERSONA_DEFINITIONS.map(convertSharedPersonaToTileData);
  }, []);

  // Load edited default personas from session-scoped storage
  const loadEditedDefaultPersonas = (): Record<string, PersonaTileData> => {
    return SessionScopedStorage.getItem(PERSONA_STORAGE_KEYS.EDITED_DEFAULT_PERSONAS, {});
  };

  // Save edited default personas to session-scoped storage
  const saveEditedDefaultPersonas = (editedPersonas: Record<string, PersonaTileData>) => {
    SessionScopedStorage.setItem(PERSONA_STORAGE_KEYS.EDITED_DEFAULT_PERSONAS, editedPersonas);
  };

  // Load custom personas from session-scoped storage
  const loadCustomPersonas = (): PersonaTileData[] => {
    return SessionScopedStorage.getItem(PERSONA_STORAGE_KEYS.CUSTOM_PERSONAS, []);
  };

  // Save custom personas to session-scoped storage
  const saveCustomPersonas = (customPersonas: PersonaTileData[]) => {
    SessionScopedStorage.setItem(PERSONA_STORAGE_KEYS.CUSTOM_PERSONAS, customPersonas);
  };

  // Load deleted default personas from session-scoped storage
  const loadDeletedDefaultPersonas = (): string[] => {
    return SessionScopedStorage.getItem(PERSONA_STORAGE_KEYS.DELETED_DEFAULT_PERSONAS, []);
  };

  // Save deleted default personas to session-scoped storage
  const saveDeletedDefaultPersonas = (deletedIds: string[]) => {
    SessionScopedStorage.setItem(PERSONA_STORAGE_KEYS.DELETED_DEFAULT_PERSONAS, deletedIds);
  };

  // Check if a default persona has been modified
  const isDefaultPersonaModified = (persona: PersonaTileData): boolean => {
    if (persona.isCustom) { return false; }

    const defaultPersonas = getDefaultPersonas();
    const originalPersona = defaultPersonas.find(p => p.personaId === persona.personaId);

    if (!originalPersona) { return false; }

    // Compare key fields to determine if modified
    return (
      persona.name !== originalPersona.name ||
      persona.role !== originalPersona.role ||
      persona.details !== originalPersona.details ||
      persona.avatarId !== originalPersona.avatarId ||
      persona.voiceId !== originalPersona.voiceId
    );
  };

  // Download a single persona as JSON
  const downloadPersona = (persona: PersonaTileData) => {
    ImportExportService.exportPersonas([persona]);
  };

  // Initialize personas on component mount (only once)
  useEffect(() => {
    const defaultPersonas = getDefaultPersonas();
    const editedDefaults = loadEditedDefaultPersonas();
    const customPersonas = loadCustomPersonas();
    const deletedDefaultIds = loadDeletedDefaultPersonas();

    // Merge default personas with any edited versions from session storage
    // and filter out deleted default personas
    const initialDefaultPersonas = defaultPersonas
      .filter((persona: PersonaTileData) => !deletedDefaultIds.includes(persona.personaId))
      .map((persona: PersonaTileData) => {
        const editedVersion = editedDefaults[persona.personaId];
        return editedVersion ? { ...editedVersion, isSelected: false } : persona;
      });

    // Combine default personas with custom personas from session storage
    const allPersonas = [
      ...initialDefaultPersonas,
      ...customPersonas.map(persona => ({ ...persona, isSelected: false })),
    ];

    setPersonas(allPersonas);
  }, [getDefaultPersonas]); // Include getDefaultPersonas dependency

  // Separate effect to sync selection state
  useEffect(() => {
    setPersonas(prevPersonas =>
      prevPersonas.map(persona => ({
        ...persona,
        isSelected: selectedPersonaIds.includes(persona.personaId),
      }))
    );
  }, [selectedPersonaIds]);

  // Notify parent component when personas change
  useEffect(() => {
    if (onPersonasChange && personas.length > 0) {
      onPersonasChange(personas);
    }
  }, [personas, onPersonasChange]);

  const handlePersonaSelect = (personaId: string) => {
    const updatedPersonas = personas.map(p => ({
      ...p,
      isSelected: p.personaId === personaId ? !p.isSelected : p.isSelected,
    }));

    setPersonas(updatedPersonas);

    const newSelectedIds = updatedPersonas.filter(p => p.isSelected).map(p => p.personaId);

    onSelectionChange(newSelectedIds);
  };

  const handlePersonaEdit = (personaId: string) => {
    const persona = personas.find(p => p.personaId === personaId);
    if (persona) {
      setEditingPersona(persona);
      setIsCreating(false);
      setIsEditorVisible(true);
    }
  };

  const handlePersonaDelete = (personaId: string) => {
    const persona = personas.find(p => p.personaId === personaId);
    if (!persona) { return; }

    if (persona.isCustom) {
      // Custom persona - show warning with download option
      setDeleteType('custom');
      setDeleteConfirmPersona(persona);
    } else {
      // Default persona - check if modified
      const isModified = isDefaultPersonaModified(persona);
      if (isModified) {
        // Modified default persona - show warning with download option
        setDeleteType('modified');
        setDeleteConfirmPersona(persona);
      } else {
        // Unmodified default persona - delete without warning
        deleteDefaultPersona(persona);
      }
    }
  };

  // Delete an unmodified default persona (without confirmation)
  const deleteDefaultPersona = (persona: PersonaTileData) => {
    const updatedPersonas = personas.filter(p => p.personaId !== persona.personaId);
    setPersonas(updatedPersonas);

    // Add to deleted default personas list
    const deletedIds = loadDeletedDefaultPersonas();
    deletedIds.push(persona.personaId);
    saveDeletedDefaultPersonas(deletedIds);

    // Update selection if deleted persona was selected
    const newSelectedIds = updatedPersonas.filter(p => p.isSelected).map(p => p.personaId);
    onSelectionChange(newSelectedIds);

    setSuccess(
      // nosemgrep: i18next-key-format
      t('personaTileManager.messages.deleted'));
  };

  const confirmDelete = () => {
    if (!deleteConfirmPersona) { return; }

    const updatedPersonas = personas.filter(p => p.personaId !== deleteConfirmPersona.personaId);
    setPersonas(updatedPersonas);

    if (deleteType === 'custom') {
      // Save updated custom personas to session storage
      const customPersonas = updatedPersonas.filter(p => p.isCustom);
      saveCustomPersonas(customPersonas);
    } else if (deleteType === 'modified') {
      // Remove from edited defaults and add to deleted list
      const editedDefaults = loadEditedDefaultPersonas();
      delete editedDefaults[deleteConfirmPersona.personaId];
      saveEditedDefaultPersonas(editedDefaults);

      const deletedIds = loadDeletedDefaultPersonas();
      saveDeletedDefaultPersonas([...new Set([...deletedIds, deleteConfirmPersona.personaId])]);
    }

    // Update selection if deleted persona was selected
    const newSelectedIds = updatedPersonas.filter(p => p.isSelected).map(p => p.personaId);
    onSelectionChange(newSelectedIds);

    setDeleteConfirmPersona(null);
    setSuccess(
      // nosemgrep: i18next-key-format
      t('personaTileManager.messages.deleted'));
  };

  const handleDownloadAndDelete = () => {
    if (deleteConfirmPersona) {
      downloadPersona(deleteConfirmPersona);
      confirmDelete();
    }
  };

  const handlePersonaSave = (savedPersona: PersonaTileData) => {
    if (isCreating) {
      // Add new persona
      const newPersonas = [...personas, savedPersona];
      setPersonas(newPersonas);

      // Save custom personas to session storage
      const customPersonas = newPersonas.filter(p => p.isCustom);
      saveCustomPersonas(customPersonas);

      setSuccess(
        // nosemgrep: i18next-key-format
        t('personaTileManager.messages.created'));
    } else {
      // Update existing persona
      const updatedPersonas = personas.map(p =>
        p.personaId === savedPersona.personaId ? savedPersona : p
      );
      setPersonas(updatedPersonas);

      // Save to appropriate session storage based on persona type
      if (savedPersona.isCustom) {
        // Save custom personas to session storage
        const customPersonas = updatedPersonas.filter(p => p.isCustom);
        saveCustomPersonas(customPersonas);
      } else {
        // Save edited default personas to session storage
        const editedDefaults = loadEditedDefaultPersonas();
        editedDefaults[savedPersona.personaId] = savedPersona;
        saveEditedDefaultPersonas(editedDefaults);
      }

      setSuccess(
        // nosemgrep: i18next-key-format
        t('personaTileManager.messages.updated'));
    }
  };

  const handleRestoreDefaultPersonas = () => {
    // Show warning modal first
    setShowRestoreWarning(true);
  };

  const restoreOnlyDeletedPersonas = () => {
    // Only clear deleted default personas, keep customizations
    SessionScopedStorage.removeItem(PERSONA_STORAGE_KEYS.DELETED_DEFAULT_PERSONAS);

    // Get all default personas
    const defaultPersonas = getDefaultPersonas();
    const editedDefaults = loadEditedDefaultPersonas();

    // Apply any existing customizations
    const restoredDefaultPersonas = defaultPersonas.map((persona: PersonaTileData) => {
      const editedVersion = editedDefaults[persona.personaId];
      return editedVersion
        ? { ...editedVersion, isSelected: selectedPersonaIds.includes(editedVersion.personaId) }
        : { ...persona, isSelected: selectedPersonaIds.includes(persona.personaId) };
    });

    // Keep any custom personas
    const customPersonas = personas.filter(p => p.isCustom);
    const allPersonas = [...restoredDefaultPersonas, ...customPersonas];

    setPersonas(allPersonas);
    setShowRestoreWarning(false);
    setSuccess(
      // nosemgrep: i18next-key-format
      t('personaTileManager.messages.restoredDeleted'));
  };

  const confirmRestoreDefaultPersonas = () => {
    // Clear edited default personas from session-scoped storage
    SessionScopedStorage.removeItem(PERSONA_STORAGE_KEYS.EDITED_DEFAULT_PERSONAS);

    // Clear deleted default personas to restore all defaults
    SessionScopedStorage.removeItem(PERSONA_STORAGE_KEYS.DELETED_DEFAULT_PERSONAS);

    // Reset to original default personas
    const defaultPersonas = getDefaultPersonas();
    const resetPersonas = defaultPersonas.map((persona: PersonaTileData) => ({
      ...persona,
      isSelected: selectedPersonaIds.includes(persona.personaId),
    }));

    // Keep any custom personas
    const customPersonas = personas.filter(p => p.isCustom);
    const allPersonas = [...resetPersonas, ...customPersonas];

    setPersonas(allPersonas);
    setShowRestoreWarning(false);
    setSuccess(
      // nosemgrep: i18next-key-format
      t('personaTileManager.messages.restored'));
  };

  const handleDownloadAllCustomAndRestore = () => {
    // Download all custom and modified personas before restoring
    const customPersonas = personas.filter(p => p.isCustom);
    const modifiedDefaults = personas.filter(p => !p.isCustom && isDefaultPersonaModified(p));
    const personasToDownload = [...customPersonas, ...modifiedDefaults];

    if (personasToDownload.length > 0) {
      ImportExportService.exportPersonas(personasToDownload);
    }

    confirmRestoreDefaultPersonas();
  };

  const handleCreateNew = () => {
    setEditingPersona(null);
    setIsCreating(true);
    setIsEditorVisible(true);
  };

  const handleImport = async () => {
    try {
      const importedData = await ImportExportService.importFromFile();

      if (importedData.personas) {
        const mergedPersonas = ImportExportService.mergePersonas(personas, importedData.personas);
        setPersonas(mergedPersonas);

        // Save the updated custom personas to session storage for persistence
        const customPersonas = mergedPersonas.filter(p => p.isCustom);
        saveCustomPersonas(customPersonas);

        setSuccess(
          // nosemgrep: i18next-key-format
          t('personaTileManager.messages.importedPersonas', { count: importedData.personas.length }));
      }

      if (importedData.businessContext) {
        setSuccess(prev =>
          prev ?
            // nosemgrep: i18next-key-format
            t('personaTileManager.messages.importedWithContext', { prev }) :
            // nosemgrep: i18next-key-format
            t('personaTileManager.messages.imported')
        );
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : t('personaTileManager.messages.importError'));
    }
  };

  const handleExportPersonas = () => {
    const selectedPersonas = personas.filter(p => p.isSelected);
    if (selectedPersonas.length === 0) {
      setError(
        // nosemgrep: i18next-key-format
        t('personaTileManager.messages.exportError'));
      return;
    }

    ImportExportService.exportPersonas(selectedPersonas);
    setSuccess(
      // nosemgrep: i18next-key-format
      t('personaTileManager.messages.exportedPersonas', { count: selectedPersonas.length }));
  };

  // Filter personas based on search term and sort with custom personas first
  const filteredPersonas = personas
    .filter(
      persona =>
        persona.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        persona.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
        persona.details.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      // Sort custom personas first, then default personas
      if (a.isCustom && !b.isCustom) { return -1; }
      if (!a.isCustom && b.isCustom) { return 1; }
      // Within the same type (custom or default), maintain original order
      return 0;
    });

  const selectedCount = personas.filter(p => p.isSelected).length;
  const customPersonasCount = personas.filter(p => p.isCustom).length;

  // Calculate deleted and modified counts for restore modal
  const deletedPersonaIds = loadDeletedDefaultPersonas();
  const deletedPersonasCount = deletedPersonaIds.length;
  const modifiedPersonas = personas.filter(p => !p.isCustom && isDefaultPersonaModified(p));
  const modifiedPersonasCount = modifiedPersonas.length;
  const hasDeletedPersonas = deletedPersonasCount > 0;
  const hasModifiedPersonas = modifiedPersonasCount > 0;

  // Get deleted personas details
  const deletedPersonasDetails = getDefaultPersonas().filter(p =>
    deletedPersonaIds.includes(p.personaId)
  );

  return (
    <Box>
      <SpaceBetween size='l'>
        <Header
          variant='h2'
          description={
            // nosemgrep: i18next-key-format
            t('personaTileManager.description', { count: selectedCount })}
          actions={
            <SpaceBetween direction='horizontal' size='s'>
              <Button variant='normal' onClick={handleCreateNew} iconName='add-plus'>
                {
                  // nosemgrep: i18next-key-format
                  t('personaTileManager.actions.createCustomPersona')}
              </Button>

              <ButtonDropdown
                items={[
                  {
                    text:
                      // nosemgrep: i18next-key-format
                      t('personaTileManager.actions.importData'),
                    id: 'import',
                    iconName: 'upload',
                  },
                  {
                    text:
                      // nosemgrep: i18next-key-format
                      t('personaTileManager.actions.exportSelected'),
                    id: 'export-personas',
                    iconName: 'download',
                    disabled: selectedCount === 0,
                  },
                  {
                    text:
                      // nosemgrep: i18next-key-format
                      t('personaTileManager.actions.restoreDefault'),
                    id: 'restore-defaults',
                    iconName: 'refresh',
                  },
                ]}
                onItemClick={({ detail }) => {
                  switch (detail.id) {
                    case 'import':
                      handleImport();
                      break;
                    case 'export-personas':
                      handleExportPersonas();
                      break;
                    case 'restore-defaults':
                      handleRestoreDefaultPersonas();
                      break;
                  }
                }}
              >
                {
                  // nosemgrep: i18next-key-format
                  t('personaTileManager.actions.options')}
              </ButtonDropdown>
            </SpaceBetween>
          }
        >
          {
            // nosemgrep: i18next-key-format
            t('personaTileManager.labels.personas')}
        </Header>

        <Alert type='info' dismissible={false}>
          {
            // nosemgrep: i18next-key-format
            t('personaTileManager.helpText')}
        </Alert>

        {error && (
          <Alert type='error' dismissible onDismiss={() => setError(null)}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert type='success' dismissible onDismiss={() => setSuccess(null)}>
            {success}
          </Alert>
        )}

        {selectedCount > 15 && (
          <Alert type='warning'>
            {
              // nosemgrep: i18next-key-format
              t('personaTileManager.warnings.tooManySelected', { count: selectedCount })}
          </Alert>
        )}

        {customPersonasCount > 0 && (
          <Alert type='info'>
            {
              // nosemgrep: i18next-key-format
              t('personaTileManager.messages.customPersonasInfo', { count: customPersonasCount })}
          </Alert>
        )}

        <Input
          type='search'
          placeholder={
            // nosemgrep: i18next-key-format
            t('personaTileManager.search.placeholder')}
          value={searchTerm}
          onChange={event => setSearchTerm(event.detail.value)}
        />

        <Cards
          cardDefinition={{
            header: item => (
              <PersonaTile
                persona={item}
                onSelect={handlePersonaSelect}
                onEdit={handlePersonaEdit}
                onDelete={handlePersonaDelete}
              />
            ),
          }}
          cardsPerRow={[
            { cards: 1 },
            { minWidth: 500, cards: 2 },
            { minWidth: 800, cards: 3 },
            { minWidth: 1200, cards: 4 },
          ]}
          items={filteredPersonas}
          trackBy='personaId'
          empty={
            <Box textAlign='center' color='inherit'>
              <b>{
                // nosemgrep: i18next-key-format
                t('common:labels.noPersonasFound')}</b>
              <Box variant='p' color='inherit'>
                {searchTerm ?
                  // nosemgrep: i18next-key-format
                  t('personaTileManager.search.adjustCriteria') :
                  // nosemgrep: i18next-key-format
                  t('personaTileManager.search.noPersonasAvailable')}
              </Box>
            </Box>
          }
        />

        <PersonaEditor
          persona={editingPersona}
          isVisible={isEditorVisible}
          onDismiss={() => {
            setIsEditorVisible(false);
            setEditingPersona(null);
            setIsCreating(false);
          }}
          onSave={handlePersonaSave}
          isCreating={isCreating}
        />

        {/* Delete confirmation modal for custom and modified personas */}
        <Modal
          onDismiss={() => setDeleteConfirmPersona(null)}
          visible={deleteConfirmPersona !== null}
          size='medium'
          footer={
            <Box float='right'>
              <SpaceBetween direction='horizontal' size='xs'>
                <Button variant='link' onClick={() => setDeleteConfirmPersona(null)}>
                  {
                    // nosemgrep: i18next-key-format
                    t('personaTileManager.delete.cancel')}
                </Button>
                {(deleteType === 'custom' || deleteType === 'modified') && (
                  <Button variant='normal' onClick={handleDownloadAndDelete}>
                    {
                      // nosemgrep: i18next-key-format
                      t('personaTileManager.delete.downloadAndDelete')}
                  </Button>
                )}
                <Button variant='primary' onClick={confirmDelete}>
                  {
                    // nosemgrep: i18next-key-format
                    t('personaTileManager.delete.confirm')}
                </Button>
              </SpaceBetween>
            </Box>
          }
          header={
            // nosemgrep: i18next-key-format
            deleteType === 'custom'
              ? t('personaTileManager.delete.confirmTitleCustom')
              : t('personaTileManager.delete.confirmTitleModified')}
        >
          <SpaceBetween size='m'>
            <Box>
              {
                // nosemgrep: i18next-key-format
                deleteType === 'custom'
                  ? t('personaTileManager.delete.confirmMessageCustom', { name: deleteConfirmPersona?.name })
                  : t('personaTileManager.delete.confirmMessageModified', { name: deleteConfirmPersona?.name })}
            </Box>
            <Box>
              {
                // nosemgrep: i18next-key-format
                deleteType === 'custom'
                  ? t('personaTileManager.delete.customWarning')
                  : t('personaTileManager.delete.modifiedWarning')}
            </Box>
          </SpaceBetween>
        </Modal>

        {/* Restore default personas warning modal */}
        <Modal
          onDismiss={() => setShowRestoreWarning(false)}
          visible={showRestoreWarning}
          size='large'
          footer={
            <Box float='right'>
              <SpaceBetween direction='horizontal' size='xs'>
                <Button variant='link' onClick={() => setShowRestoreWarning(false)}>
                  {
                    // nosemgrep: i18next-key-format
                    t('personaTileManager.restore.cancel')}
                </Button>
                {hasDeletedPersonas && (
                  <Button variant='normal' onClick={restoreOnlyDeletedPersonas}>
                    {
                      // nosemgrep: i18next-key-format
                      t('personaTileManager.restore.restoreOnlyDeleted')}
                  </Button>
                )}
                {(hasModifiedPersonas || customPersonasCount > 0) && (
                  <Button variant='normal' onClick={handleDownloadAllCustomAndRestore}>
                    {
                      // nosemgrep: i18next-key-format
                      t('personaTileManager.restore.downloadAndRestore')}
                  </Button>
                )}
                <Button variant='primary' onClick={confirmRestoreDefaultPersonas}>
                  {
                    // nosemgrep: i18next-key-format
                    t('personaTileManager.restore.confirm')}
                </Button>
              </SpaceBetween>
            </Box>
          }
          header={
            // nosemgrep: i18next-key-format
            t('personaTileManager.restore.confirmTitle')}
        >
          <SpaceBetween size='m'>
            <Box>
              {
                // nosemgrep: i18next-key-format
                t('personaTileManager.restore.confirmMessage')}
            </Box>

            <Box>
              <SpaceBetween size='s'>
                {hasDeletedPersonas && (
                  <Box>
                    <strong>{
                      // nosemgrep: i18next-key-format
                      t('personaTileManager.restore.restoreOnlyDeleted')
                    }:</strong>{' '}
                    {
                      // nosemgrep: i18next-key-format
                      t('personaTileManager.restore.restoreOnlyDeletedHelp')}
                  </Box>
                )}
                <Box>
                  <strong>{
                    // nosemgrep: i18next-key-format
                    t('personaTileManager.restore.downloadAndRestore')
                  }:</strong>{' '}
                  {
                    // nosemgrep: i18next-key-format
                    t('personaTileManager.restore.downloadAndRestoreHelp')}
                </Box>
                <Box>
                  <strong>{
                    // nosemgrep: i18next-key-format
                    t('personaTileManager.restore.confirm')
                  }:</strong>{' '}
                  {
                    // nosemgrep: i18next-key-format
                    t('personaTileManager.restore.confirmHelp')}
                </Box>
              </SpaceBetween>
            </Box>

            {hasDeletedPersonas && (
              <ExpandableSection
                headerText={
                  // nosemgrep: i18next-key-format
                  t('personaTileManager.restore.deletedInfo', { count: deletedPersonasCount })
                }
                variant='footer'
              >
                <Box variant='p'>
                  {deletedPersonasDetails.map(persona => (
                    <Box key={persona.personaId} margin={{ bottom: 'xxs' }}>
                      <strong>{persona.name}</strong> - {persona.role}
                    </Box>
                  ))}
                </Box>
              </ExpandableSection>
            )}

            {hasModifiedPersonas && (
              <ExpandableSection
                headerText={
                  // nosemgrep: i18next-key-format
                  t('personaTileManager.restore.modifiedInfo', { count: modifiedPersonasCount })
                }
                variant='footer'
              >
                <Box variant='p'>
                  {modifiedPersonas.map(persona => (
                    <Box key={persona.personaId} margin={{ bottom: 'xxs' }}>
                      <strong>{persona.name}</strong> - {persona.role}
                    </Box>
                  ))}
                </Box>
              </ExpandableSection>
            )}

            <Box>
              {
                // nosemgrep: i18next-key-format
                t('personaTileManager.restore.warning')}
            </Box>
          </SpaceBetween>
        </Modal>
      </SpaceBetween>
    </Box>
  );
};
