// Copyright 2025 Amazon.com, Inc. or its affiliates.
// SPDX-License-Identifier: MIT-0

import React from 'react';
import {
  Container,
  Header,
  SpaceBetween,
  Box,
  TextContent,
  ExpandableSection,
  Alert,
  ColumnLayout,
  Cards,
  Button,
} from '@cloudscape-design/components';
import { useTranslation } from 'react-i18next';

export const UserGuidesPage: React.FC = () => {
  const { t } = useTranslation('pages');
  return (
    <Container>
      <SpaceBetween size='l'>
        {/* nosemgrep: i18next-key-format */}
        <Header
          variant='h1'
          description={t('userGuides.description')}
          actions={
            <Button variant='primary' href='/' iconName='arrow-left'>
              {/* nosemgrep: i18next-key-format */}
              {t('userGuides.backToHome')}
            </Button>
          }
        >
          {/* nosemgrep: i18next-key-format */}
          {t('userGuides.title')}
        </Header>

        <Alert type='info'>
          {/* nosemgrep: i18next-key-format */}
          {t('userGuides.welcome')}
        </Alert>

        {/* nosemgrep: i18next-key-format */}
        <ExpandableSection header={t('userGuides.sections.gettingStarted')} defaultExpanded>
          <SpaceBetween size='m'>
            <TextContent>
              {/* nosemgrep: i18next-key-format */}
              <h3>{t('userGuides.content.whatIsGroupChatAI.title')}</h3>
              <p>
                {/* nosemgrep: i18next-key-format */}
                {t('userGuides.content.whatIsGroupChatAI.description')}
              </p>
              
              {/* nosemgrep: i18next-key-format */}
              <h3>{t('userGuides.content.quickStart.title')}</h3>
              <ol>
                {/* nosemgrep: i18next-key-format */}
                <li>{t('userGuides.content.quickStart.steps.0')}</li>
                {/* nosemgrep: i18next-key-format */}
                <li>{t('userGuides.content.quickStart.steps.1')}</li>
                {/* nosemgrep: i18next-key-format */}
                <li>{t('userGuides.content.quickStart.steps.2')}</li>
                {/* nosemgrep: i18next-key-format */}
                <li>{t('userGuides.content.quickStart.steps.3')}</li>
                {/* nosemgrep: i18next-key-format */}
                <li>{t('userGuides.content.quickStart.steps.4')}</li>
              </ol>
            </TextContent>
          </SpaceBetween>
        </ExpandableSection>

        {/* nosemgrep: i18next-key-format */}
        <ExpandableSection header={t('userGuides.sections.settingUp')}>
          <SpaceBetween size='m'>
            <TextContent>
              {/* nosemgrep: i18next-key-format */}
              <h3>{t('userGuides.content.configuringConversations.title')}</h3>
              <p>
                {/* nosemgrep: i18next-key-format */}
                {t('userGuides.content.configuringConversations.description')}
              </p>
              <ul>
                {/* nosemgrep: i18next-key-format */}
                <li>{t('userGuides.content.configuringConversations.items.0')}</li>
                {/* nosemgrep: i18next-key-format */}
                <li>{t('userGuides.content.configuringConversations.items.1')}</li>
                {/* nosemgrep: i18next-key-format */}
                <li>{t('userGuides.content.configuringConversations.items.2')}</li>
              </ul>
              
              {/* nosemgrep: i18next-key-format */}
              <h3>{t('userGuides.content.selectingPersonas.title')}</h3>
              {/* nosemgrep: i18next-key-format */}
              <p>{t('userGuides.content.selectingPersonas.description')}</p>
              <ul>
                {/* nosemgrep: i18next-key-format */}
                <li>{t('userGuides.content.selectingPersonas.items.0')}</li>
                {/* nosemgrep: i18next-key-format */}
                <li>{t('userGuides.content.selectingPersonas.items.1')}</li>
                {/* nosemgrep: i18next-key-format */}
                <li>{t('userGuides.content.selectingPersonas.items.2')}</li>
              </ul>
            </TextContent>
          </SpaceBetween>
        </ExpandableSection>

        {/* nosemgrep: i18next-key-format */}
        <ExpandableSection header={t('userGuides.sections.duringSession')}>
          <SpaceBetween size='m'>
            <ColumnLayout columns={2}>
              <Box>
                <TextContent>
                  {/* nosemgrep: i18next-key-format */}
                  <h3>{t('userGuides.content.interactionFeatures.title')}</h3>
                  <ul>
                    {/* nosemgrep: i18next-key-format */}
                    <li>{t('userGuides.content.interactionFeatures.items.0')}</li>
                    {/* nosemgrep: i18next-key-format */}
                    <li>{t('userGuides.content.interactionFeatures.items.1')}</li>
                    {/* nosemgrep: i18next-key-format */}
                    <li>{t('userGuides.content.interactionFeatures.items.2')}</li>
                    {/* nosemgrep: i18next-key-format */}
                    <li>{t('userGuides.content.interactionFeatures.items.3')}</li>
                  </ul>
                </TextContent>
              </Box>
              <Box>
                <TextContent>
                  {/* nosemgrep: i18next-key-format */}
                  <h3>{t('userGuides.content.conversationTools.title')}</h3>
                  <ul>
                    {/* nosemgrep: i18next-key-format */}
                    <li>{t('userGuides.content.conversationTools.items.0')}</li>
                    {/* nosemgrep: i18next-key-format */}
                    <li>{t('userGuides.content.conversationTools.items.1')}</li>
                    {/* nosemgrep: i18next-key-format */}
                    <li>{t('userGuides.content.conversationTools.items.2')}</li>
                    {/* nosemgrep: i18next-key-format */}
                    <li>{t('userGuides.content.conversationTools.items.3')}</li>
                  </ul>
                </TextContent>
              </Box>
            </ColumnLayout>
          </SpaceBetween>
        </ExpandableSection>

        {/* nosemgrep: i18next-key-format */}
        <ExpandableSection header={t('userGuides.sections.voiceFeatures')}>
          <SpaceBetween size='m'>
            <TextContent>
              {/* nosemgrep: i18next-key-format */}
              <h3>{t('userGuides.content.voiceInput.title')}</h3>
              <p>
                {/* nosemgrep: i18next-key-format */}
                {t('userGuides.content.voiceInput.description')}
              </p>
              <ul>
                {/* nosemgrep: i18next-key-format */}
                <li>{t('userGuides.content.voiceInput.steps.0')}</li>
                {/* nosemgrep: i18next-key-format */}
                <li>{t('userGuides.content.voiceInput.steps.1')}</li>
                {/* nosemgrep: i18next-key-format */}
                <li>{t('userGuides.content.voiceInput.steps.2')}</li>
                {/* nosemgrep: i18next-key-format */}
                <li>{t('userGuides.content.voiceInput.steps.3')}</li>
              </ul>
              
              {/* nosemgrep: i18next-key-format */}
              <h3>{t('userGuides.content.voiceSynthesis.title')}</h3>
              <p>
                {/* nosemgrep: i18next-key-format */}
                {t('userGuides.content.voiceSynthesis.description')}
              </p>
              <ul>
                {/* nosemgrep: i18next-key-format */}
                <li>{t('userGuides.content.voiceSynthesis.steps.0')}</li>
                {/* nosemgrep: i18next-key-format */}
                <li>{t('userGuides.content.voiceSynthesis.steps.1')}</li>
                {/* nosemgrep: i18next-key-format */}
                <li>{t('userGuides.content.voiceSynthesis.steps.2')}</li>
                {/* nosemgrep: i18next-key-format */}
                <li>{t('userGuides.content.voiceSynthesis.steps.3')}</li>
              </ul>
            </TextContent>
          </SpaceBetween>
        </ExpandableSection>

        {/* nosemgrep: i18next-key-format */}
        <ExpandableSection header={t('userGuides.sections.advancedFeatures')}>
          <SpaceBetween size='m'>
            <Cards
              cardDefinition={{
                header: item => <Box variant='h3'>{item.title}</Box>,
                sections: [
                  {
                    content: item => (
                      <TextContent>
                        <p>{item.description}</p>
                        <ul>
                          {item.features.map((feature: string, index: number) => (
                            <li key={index}>{feature}</li>
                          ))}
                        </ul>
                      </TextContent>
                    ),
                  },
                ],
              }}
              items={[
                {
                  // nosemgrep: i18next-key-format
                  title: t('userGuides.features.personaCustomization.title'),
                  // nosemgrep: i18next-key-format
                  description: t('userGuides.features.personaCustomization.description'),
                  features: [
                    // nosemgrep: i18next-key-format
                    t('userGuides.features.personaCustomization.items.0'),
                    // nosemgrep: i18next-key-format
                    t('userGuides.features.personaCustomization.items.1'),
                    // nosemgrep: i18next-key-format
                    t('userGuides.features.personaCustomization.items.2'),
                    // nosemgrep: i18next-key-format
                    t('userGuides.features.personaCustomization.items.3'),
                  ],
                },
                {
                  // nosemgrep: i18next-key-format
                  title: t('userGuides.features.sessionAnalytics.title'),
                  // nosemgrep: i18next-key-format
                  description: t('userGuides.features.sessionAnalytics.description'),
                  features: [
                    // nosemgrep: i18next-key-format
                    t('userGuides.features.sessionAnalytics.items.0'),
                    // nosemgrep: i18next-key-format
                    t('userGuides.features.sessionAnalytics.items.1'),
                    // nosemgrep: i18next-key-format
                    t('userGuides.features.sessionAnalytics.items.2'),
                    // nosemgrep: i18next-key-format
                    t('userGuides.features.sessionAnalytics.items.3'),
                  ],
                },
                {
                  // nosemgrep: i18next-key-format
                  title: t('userGuides.features.contentManagement.title'),
                  // nosemgrep: i18next-key-format
                  description: t('userGuides.features.contentManagement.description'),
                  features: [
                    // nosemgrep: i18next-key-format
                    t('userGuides.features.contentManagement.items.0'),
                    // nosemgrep: i18next-key-format
                    t('userGuides.features.contentManagement.items.1'),
                    // nosemgrep: i18next-key-format
                    t('userGuides.features.contentManagement.items.2'),
                    // nosemgrep: i18next-key-format
                    t('userGuides.features.contentManagement.items.3'),
                  ],
                },
              ]}
            />
          </SpaceBetween>
        </ExpandableSection>

        {/* nosemgrep: i18next-key-format */}
        <ExpandableSection header={t('userGuides.sections.practiceEffectively')}>
          <SpaceBetween size='m'>
            <TextContent>
              {/* nosemgrep: i18next-key-format */}
              <h3>{t('userGuides.content.bestPractices.title')}</h3>
              <ul>
                {/* nosemgrep: i18next-key-format */}
                <li>{t('userGuides.content.bestPractices.items.0')}</li>
                {/* nosemgrep: i18next-key-format */}
                <li>{t('userGuides.content.bestPractices.items.1')}</li>
                {/* nosemgrep: i18next-key-format */}
                <li>{t('userGuides.content.bestPractices.items.2')}</li>
                {/* nosemgrep: i18next-key-format */}
                <li>{t('userGuides.content.bestPractices.items.3')}</li>
                {/* nosemgrep: i18next-key-format */}
                <li>{t('userGuides.content.bestPractices.items.4')}</li>
              </ul>
              
              {/* nosemgrep: i18next-key-format */}
              <h3>{t('userGuides.content.commonUseCases.title')}</h3>
              <ul>
                {/* nosemgrep: i18next-key-format */}
                <li>{t('userGuides.content.commonUseCases.items.0')}</li>
                {/* nosemgrep: i18next-key-format */}
                <li>{t('userGuides.content.commonUseCases.items.1')}</li>
                {/* nosemgrep: i18next-key-format */}
                <li>{t('userGuides.content.commonUseCases.items.2')}</li>
                {/* nosemgrep: i18next-key-format */}
                <li>{t('userGuides.content.commonUseCases.items.3')}</li>
              </ul>
            </TextContent>
          </SpaceBetween>
        </ExpandableSection>

        {/* nosemgrep: i18next-key-format */}
        <ExpandableSection header={t('userGuides.sections.troubleshooting')}>
          <SpaceBetween size='m'>
            <TextContent>
              {/* nosemgrep: i18next-key-format */}
              <h3>{t('userGuides.content.commonIssues.title')}</h3>
              
              {/* nosemgrep: i18next-key-format */}
              <h4>{t('userGuides.content.connectionProblems.title')}</h4>
              <ul>
                {/* nosemgrep: i18next-key-format */}
                <li>{t('userGuides.content.connectionProblems.items.0')}</li>
                {/* nosemgrep: i18next-key-format */}
                <li>{t('userGuides.content.connectionProblems.items.1')}</li>
                {/* nosemgrep: i18next-key-format */}
                <li>{t('userGuides.content.connectionProblems.items.2')}</li>
              </ul>
              
              {/* nosemgrep: i18next-key-format */}
              <h4>{t('userGuides.content.voiceNotWorking.title')}</h4>
              <ul>
                {/* nosemgrep: i18next-key-format */}
                <li>{t('userGuides.content.voiceNotWorking.items.0')}</li>
                {/* nosemgrep: i18next-key-format */}
                <li>{t('userGuides.content.voiceNotWorking.items.1')}</li>
                {/* nosemgrep: i18next-key-format */}
                <li>{t('userGuides.content.voiceNotWorking.items.2')}</li>
              </ul>
              
              {/* nosemgrep: i18next-key-format */}
              <h4>{t('userGuides.content.performanceIssues.title')}</h4>
              <ul>
                {/* nosemgrep: i18next-key-format */}
                <li>{t('userGuides.content.performanceIssues.items.0')}</li>
                {/* nosemgrep: i18next-key-format */}
                <li>{t('userGuides.content.performanceIssues.items.1')}</li>
                {/* nosemgrep: i18next-key-format */}
                <li>{t('userGuides.content.performanceIssues.items.2')}</li>
              </ul>
            </TextContent>
          </SpaceBetween>
        </ExpandableSection>
      </SpaceBetween>
    </Container>
  );
};
