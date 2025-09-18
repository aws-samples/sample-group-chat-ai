// Copyright 2025 Amazon.com, Inc. or its affiliates.
// SPDX-License-Identifier: MIT-0

import React, { useState } from 'react';
import {
  Box,
  SpaceBetween,
  Header,
  ExpandableSection,
  Badge,
  TextContent,
  ColumnLayout,
  Button,
} from '@cloudscape-design/components';
import { BusinessContext, BudgetRange, InfluenceLevel } from '@group-chat-ai/shared';
import { useTranslation } from 'react-i18next';

interface BusinessContextDisplayProps {
  businessContext: BusinessContext;
}

export const BusinessContextDisplay: React.FC<BusinessContextDisplayProps> = ({
  businessContext,
}) => {
  const { t } = useTranslation('components');
  const [isExpanded, setIsExpanded] = useState(false);

  const formatEnumValue = (value: string) => {
    return value.charAt(0).toUpperCase() + value.slice(1).replace(/_/g, ' ');
  };

  const formatBudgetRange = (range: BudgetRange) => {
    return range.replace(/_/g, ' ').replace(/k/g, 'K').replace(/to/g, ' to ');
  };

  const formatInfluenceLevel = (level: InfluenceLevel) => {
    return level.replace(/_/g, ' ').charAt(0).toUpperCase() + level.replace(/_/g, ' ').slice(1);
  };

  // Check if business context has any meaningful data
  const hasBusinessContext =
    businessContext &&
    (businessContext.industry ||
      businessContext.companySize ||
      businessContext.companyStage ||
      (businessContext.keyPriorities && businessContext.keyPriorities.length > 0) ||
      (businessContext.challenges && businessContext.challenges.length > 0) ||
      businessContext.budgetRange ||
      businessContext.timeline ||
      businessContext.decisionMakingProcess ||
      (businessContext.stakeholders && businessContext.stakeholders.length > 0) ||
      businessContext.additionalContext);

  if (!hasBusinessContext) {
    return null;
  }

  return (
    <ExpandableSection
      header={<Header actions={
        <Button variant='inline-icon' onClick={() => setIsExpanded(!isExpanded)}>
          {isExpanded ? t('businessContext.hideContext') : t('businessContext.showContext')}
        </Button>
      } description={
        // nosemgrep: i18next-key-format
        t('businessContextDisplay.title.description')
      }>
        {
          // nosemgrep: i18next-key-format
          t('businessContextDisplay.title.title')
        }
      </Header>
      }
      defaultExpanded={false}
      onChange={({ detail }) => setIsExpanded(detail.expanded)}
    >
      <SpaceBetween size='l'>
        {/* Company Information */}
        {(businessContext.industry ||
          businessContext.companySize ||
          businessContext.companyStage) && (
            <Box>
              <SpaceBetween size='m'>
                <Header variant='h3'>{
                  // nosemgrep: i18next-key-format
                  t('businessContextDisplay.headers.companyInformation')
                }</Header>
                <ColumnLayout columns={3} variant='text-grid'>
                  {businessContext.industry && (
                    <Box>
                      <Box variant='awsui-key-label'>{
                        // nosemgrep: i18next-key-format
                        t('businessContextDisplay.fields.industry')
                      }</Box>
                      <Badge color='blue'>{businessContext.industry}</Badge>
                    </Box>
                  )}
                  {businessContext.companySize && (
                    <Box>
                      <Box variant='awsui-key-label'>{
                        // nosemgrep: i18next-key-format
                        t('businessContextDisplay.fields.companySize')
                      }</Box>
                      <Badge color='green'>{formatEnumValue(businessContext.companySize)}</Badge>
                    </Box>
                  )}
                  {businessContext.companyStage && (
                    <Box>
                      <Box variant='awsui-key-label'>{
                        // nosemgrep: i18next-key-format
                        t('businessContextDisplay.fields.companyStage')
                      }</Box>
                      <Badge color='grey'>{formatEnumValue(businessContext.companyStage)}</Badge>
                    </Box>
                  )}
                </ColumnLayout>
              </SpaceBetween>
            </Box>
          )}

        {/* Business Priorities & Challenges */}
        {((businessContext.keyPriorities && businessContext.keyPriorities.length > 0) ||
          (businessContext.challenges && businessContext.challenges.length > 0)) && (
            <Box>
              <SpaceBetween size='m'>
                <Header variant='h3'>{
                  // nosemgrep: i18next-key-format
                  t('businessContextDisplay.headers.businessPriorities')
                }</Header>
                <ColumnLayout columns={2} variant='text-grid'>
                  {businessContext.keyPriorities && businessContext.keyPriorities.length > 0 && (
                    <Box>
                      <Box variant='awsui-key-label'>{
                        // nosemgrep: i18next-key-format
                        t('businessContextDisplay.fields.keyPriorities')
                      }</Box>
                      <SpaceBetween direction='horizontal' size='xs'>
                        {businessContext.keyPriorities.map((priority, index) => (
                          <Badge key={index} color='blue'>
                            {priority}
                          </Badge>
                        ))}
                      </SpaceBetween>
                    </Box>
                  )}
                  {businessContext.challenges && businessContext.challenges.length > 0 && (
                    <Box>
                      <Box variant='awsui-key-label'>{
                        // nosemgrep: i18next-key-format
                        t('businessContextDisplay.fields.currentChallenges')
                      }</Box>
                      <SpaceBetween direction='horizontal' size='xs'>
                        {businessContext.challenges.map((challenge, index) => (
                          <Badge key={index} color='red'>
                            {challenge}
                          </Badge>
                        ))}
                      </SpaceBetween>
                    </Box>
                  )}
                </ColumnLayout>
              </SpaceBetween>
            </Box>
          )}

        {/* Project Details */}
        {(businessContext.budgetRange ||
          businessContext.timeline ||
          businessContext.decisionMakingProcess) && (
            <Box>
              <SpaceBetween size='m'>
                <Header variant='h3'>{
                  //nosemgrep: i18next-key-format
                  t('businessContextDisplay.headers.projectDetails')
                }</Header>
                <ColumnLayout columns={1} variant='text-grid'>
                  {businessContext.budgetRange && (
                    <Box>
                      <Box variant='awsui-key-label'>{
                        // nosemgrep: i18next-key-format
                        t('businessContextDisplay.fields.budgetRange')
                      }</Box>
                      <Badge color='green'>{formatBudgetRange(businessContext.budgetRange)}</Badge>
                    </Box>
                  )}
                  {businessContext.timeline && (
                    <Box>
                      <Box variant='awsui-key-label'>{
                        // nosemgrep: i18next-key-format
                        t('businessContextDisplay.fields.timeline')
                      }</Box>
                      <TextContent>
                        <p style={{ margin: 0 }}>{businessContext.timeline}</p>
                      </TextContent>
                    </Box>
                  )}
                  {businessContext.decisionMakingProcess && (
                    <Box>
                      <Box variant='awsui-key-label'>{
                        // nosemgrep: i18next-key-format
                        t('businessContextDisplay.fields.decisionMakingProcess')
                      }</Box>
                      <TextContent>
                        <p style={{ margin: 0 }}>{businessContext.decisionMakingProcess}</p>
                      </TextContent>
                    </Box>
                  )}
                </ColumnLayout>
              </SpaceBetween>
            </Box>
          )}

        {/* Key Stakeholders */}
        {businessContext.stakeholders && businessContext.stakeholders.length > 0 && (
          <Box>
            <SpaceBetween size='m'>
              <Header variant='h3'>{
                // nosemgrep: i18next-key-format
                t('businessContextDisplay.headers.keyStakeholders')
              }</Header>
              <SpaceBetween size='s'>
                {businessContext.stakeholders.map((stakeholder, index) => (
                  <div
                    key={index}
                    style={{
                      border: '1px solid #e9ebed',
                      borderRadius: '8px',
                      padding: '12px',
                      backgroundColor: '#fafbfc',
                    }}
                  >
                    <SpaceBetween size='s'>
                      <SpaceBetween direction='horizontal' size='s' >
                        <Badge color='blue'>{stakeholder.role
                          ||
                          // nosemgrep: i18next-key-format
                          t('businessContextDisplay.stakeholder.defaultRole', { number: index + 1 })}</Badge>
                        <Badge
                          color={
                            stakeholder.influence === InfluenceLevel.DECISION_MAKER
                              ? 'red'
                              : stakeholder.influence === InfluenceLevel.HIGH
                                ? 'red'
                                : stakeholder.influence === InfluenceLevel.MEDIUM
                                  ? 'blue'
                                  : 'grey'
                          }
                        >

                          {
                            // nosemgrep: i18next-key-format
                            t('businessContextDisplay.stakeholder.influence', { level: formatInfluenceLevel(stakeholder.influence) })}
                        </Badge>
                      </SpaceBetween>

                      {stakeholder.priorities && stakeholder.priorities.length > 0 && (
                        <Box>
                          <Box variant='awsui-key-label'>{
                            // nosemgrep: i18next-key-format
                            t('businessContextDisplay.fields.priorities')
                          }</Box>
                          <SpaceBetween direction='horizontal' size='xs'>
                            {stakeholder.priorities.map((priority, pIndex) => (
                              <Badge key={pIndex} color='blue'>
                                {priority}
                              </Badge>
                            ))}
                          </SpaceBetween>
                        </Box>
                      )}

                      {stakeholder.concerns && stakeholder.concerns.length > 0 && (
                        <Box>
                          <Box variant='awsui-key-label'>{
                            // nosemgrep: i18next-key-format
                            t('businessContextDisplay.fields.concerns')
                          }</Box>
                          <SpaceBetween direction='horizontal' size='xs'>
                            {stakeholder.concerns.map((concern, cIndex) => (
                              <Badge key={cIndex} color='red'>
                                {concern}
                              </Badge>
                            ))}
                          </SpaceBetween>
                        </Box>
                      )}
                    </SpaceBetween>
                  </div>
                ))}
              </SpaceBetween>
            </SpaceBetween>
          </Box>
        )}

        {/* Additional Context */}
        {businessContext.additionalContext && (
          <Box>
            <SpaceBetween size='m'>
              <Header variant='h3'>{
                // nosemgrep: i18next-key-format
                t('businessContextDisplay.fields.additionalContext')
              }</Header>
              <TextContent>
                <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                  {businessContext.additionalContext}
                </p>
              </TextContent>
            </SpaceBetween>
          </Box>
        )}
      </SpaceBetween>
    </ExpandableSection>
  );
};
