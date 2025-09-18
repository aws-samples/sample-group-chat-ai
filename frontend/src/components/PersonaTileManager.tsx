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

  // Initialize personas on component mount (only once)
  useEffect(() => {
    const defaultPersonas = getDefaultPersonas();
    const editedDefaults = loadEditedDefaultPersonas();
    const customPersonas = loadCustomPersonas();

    // Merge default personas with any edited versions from session storage
    const initialDefaultPersonas = defaultPersonas.map((persona: PersonaTileData) => {
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
    if (persona && persona.isCustom) {
      setDeleteConfirmPersona(persona);
    }
  };

  const confirmDelete = () => {
    if (deleteConfirmPersona) {
      const updatedPersonas = personas.filter(p => p.personaId !== deleteConfirmPersona.personaId);
      setPersonas(updatedPersonas);

      // Save updated custom personas to session storage
      const customPersonas = updatedPersonas.filter(p => p.isCustom);
      saveCustomPersonas(customPersonas);

      // Update selection if deleted persona was selected
      const newSelectedIds = updatedPersonas.filter(p => p.isSelected).map(p => p.personaId);

      onSelectionChange(newSelectedIds);
      setDeleteConfirmPersona(null);
      setSuccess(
        // nosemgrep: i18next-key-format
        t('personaTileManager.messages.deleted'));
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

  const handleResetDefaultPersonas = () => {
    // Clear edited default personas from session-scoped storage
    SessionScopedStorage.removeItem(PERSONA_STORAGE_KEYS.EDITED_DEFAULT_PERSONAS);

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
    setSuccess(
      // nosemgrep: i18next-key-format
      t('personaTileManager.messages.reset'));
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
                      t('personaTileManager.actions.resetDefault'),
                    id: 'reset-defaults',
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
                    case 'reset-defaults':
                      handleResetDefaultPersonas();
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
                onDelete={item.isCustom ? handlePersonaDelete : undefined}
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
            t('personaTileManager.delete.confirmTitle')}
        >
          <SpaceBetween size='m'>
            <Box>
              {
                // nosemgrep: i18next-key-format
                t('personaTileManager.delete.confirmMessage', { name: deleteConfirmPersona?.name })}
            </Box>
            <Box>{

              // nosemgrep: i18next-key-format
              t('personaTileManager.delete.cannotUndo')}</Box>
          </SpaceBetween>
        </Modal>
      </SpaceBetween>
    </Box>
  );
};
