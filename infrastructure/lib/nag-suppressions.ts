/**
 * Copyright 2025 Amazon.com, Inc. or its affiliates.
 * SPDX-License-Identifier: MIT-0
 */

import { Validations } from 'aws-cdk-lib';
import { IConstruct } from 'constructs';

/**
 * A cdk-nag rule acknowledgment.
 *
 * Mirrors the cdk-nag v2 `NagPackSuppression` shape so call sites keep their
 * `{ id, reason, appliesTo }` lists.
 */
export interface NagSuppression {
  /** Rule ID, e.g. `AwsSolutions-IAM5`. */
  readonly id: string;
  /** Why the finding is acceptable. */
  readonly reason: string;
  /** Finding IDs within the rule, e.g. `Resource::*` or `Action::s3:List*`. */
  readonly appliesTo?: string[];
}

/**
 * Acknowledge cdk-nag findings on a construct and all of its children.
 *
 * cdk-nag v3 replaced `NagSuppressions` with CDK's native
 * `Validations.of(scope).acknowledge()`, which takes one ID per call. A
 * granular finding uses the `RuleId[FindingId]` form, so each `appliesTo`
 * entry becomes its own acknowledgment. An acknowledgment on a construct also
 * covers its descendants, which matches v2's `applyToChildren: true`.
 */
export function addNagSuppressions(scope: IConstruct, suppressions: NagSuppression[]): void {
  const validations = Validations.of(scope);
  for (const { id, reason, appliesTo } of suppressions) {
    const ids = appliesTo && appliesTo.length > 0 ? appliesTo.map((finding) => `${id}[${finding}]`) : [id];
    for (const ackId of ids) {
      validations.acknowledge({ id: ackId, reason });
    }
  }
}
