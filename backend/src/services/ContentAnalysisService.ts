// Copyright 2025 Amazon.com, Inc. or its affiliates.
// SPDX-License-Identifier: MIT-0

import { ContentAnalysis, ExpertiseArea, Persona } from '@group-chat-ai/shared';
import { createLogger } from '../config/logger';

const logger = createLogger();

export class ContentAnalysisService {
  private expertiseKeywords: Map<string, string[]> = new Map();

  constructor() {
    this.initializeExpertiseKeywords();
  }

  private initializeExpertiseKeywords(): void {
    // Define expertise areas and their associated keywords
    this.expertiseKeywords.set('strategy', [
      'strategy',
      'strategic',
      'vision',
      'mission',
      'goals',
      'objectives',
      'competitive',
      'market',
      'positioning',
      'advantage',
      'growth',
      'expansion',
      'roadmap',
      'direction',
      'leadership',
      'executive',
    ]);

    this.expertiseKeywords.set('technology', [
      'technology',
      'technical',
      'architecture',
      'system',
      'platform',
      'infrastructure',
      'development',
      'engineering',
      'software',
      'hardware',
      'scalability',
      'performance',
      'security',
      'integration',
      'api',
      'database',
      'cloud',
      'deployment',
      'framework',
      'coding',
    ]);

    this.expertiseKeywords.set('finance', [
      'budget',
      'cost',
      'revenue',
      'profit',
      'roi',
      'investment',
      'financial',
      'funding',
      'expense',
      'pricing',
      'margin',
      'cash flow',
      'valuation',
      'economics',
      'accounting',
      'finance',
    ]);

    this.expertiseKeywords.set('operations', [
      'operations',
      'process',
      'workflow',
      'efficiency',
      'automation',
      'systems',
      'infrastructure',
      'compliance',
      'governance',
      'data',
      'information',
      'security',
      'privacy',
      'integration',
      'management',
    ]);

    this.expertiseKeywords.set('product', [
      'product',
      'feature',
      'user',
      'customer',
      'experience',
      'design',
      'interface',
      'usability',
      'functionality',
      'requirements',
      'roadmap',
      'development',
      'launch',
      'market fit',
      'adoption',
    ]);

    logger.info('Content analysis expertise keywords initialized');
  }

  analyzeContent(content: string): ContentAnalysis {
    const normalizedContent = content.toLowerCase();

    // Extract keywords
    const keywords = this.extractKeywords(normalizedContent);

    // Identify topics
    const topics = this.identifyTopics(normalizedContent, keywords);

    // Analyze sentiment (simple implementation)
    const sentiment = this.analyzeSentiment(normalizedContent);

    // Assess complexity
    const complexity = this.assessComplexity(content);

    // Determine expertise areas
    const expertiseAreas = this.determineExpertiseAreas(keywords, topics);

    const analysis: ContentAnalysis = {
      keywords,
      topics,
      sentiment,
      complexity,
      expertiseAreas,
    };

    logger.info('Content analysis completed', {
      keywordCount: keywords.length,
      topicCount: topics.length,
      expertiseAreaCount: expertiseAreas.length,
      sentiment,
      complexity,
    });

    return analysis;
  }

  determinePersonaRelevance(
    analysis: ContentAnalysis,
    personas: Persona[]
  ): Array<{ personaId: string; relevance: number; reasoning: string }> {
    const relevanceScores = personas.map(persona => {
      let score = 0;
      const reasons: string[] = [];

      // Check expertise keyword matches
      const keywordMatches = this.countKeywordMatches(analysis.keywords, persona.expertiseKeywords);
      if (keywordMatches > 0) {
        score += keywordMatches * 0.3;
        reasons.push(`${keywordMatches} expertise keyword matches`);
      }

      // Check expertise area alignment
      for (const expertiseArea of analysis.expertiseAreas) {
        const areaMatch = this.checkExpertiseAreaMatch(expertiseArea, persona);
        if (areaMatch > 0) {
          score += areaMatch * 0.4;
          reasons.push(`${expertiseArea.area} expertise match (${areaMatch.toFixed(2)})`);
        }
      }

      // Check priority alignment
      const priorityMatch = this.checkPriorityAlignment(analysis.topics, persona.priorities);
      if (priorityMatch > 0) {
        score += priorityMatch * 0.3;
        reasons.push(`Priority alignment (${priorityMatch.toFixed(2)})`);
      }

      // Normalize score to 0-1 range
      const normalizedScore = Math.min(score, 1.0);

      return {
        personaId: persona.personaId,
        relevance: normalizedScore,
        reasoning: reasons.join(', ') || 'No specific matches found',
      };
    });

    // Sort by relevance score (highest first)
    return relevanceScores.sort((a, b) => b.relevance - a.relevance);
  }

  private extractKeywords(content: string): string[] {
    // Simple keyword extraction - split by spaces and filter
    const words = content
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3)
      .map(word => word.toLowerCase());

    // Remove duplicates and common stop words
    const stopWords = new Set([
      'this',
      'that',
      'with',
      'have',
      'will',
      'from',
      'they',
      'been',
      'have',
      'their',
      'said',
      'each',
      'which',
      'them',
      'than',
      'many',
    ]);

    return [...new Set(words.filter(word => !stopWords.has(word)))];
  }

  private identifyTopics(content: string, _keywords: string[]): string[] {
    const topics: string[] = [];

    // Check for common business topics
    const topicPatterns = {
      budget: /budget|cost|expense|financial|money|price/i,
      timeline: /timeline|schedule|deadline|time|when|date/i,
      resources: /resource|team|people|staff|personnel/i,
      risk: /risk|challenge|problem|issue|concern/i,
      opportunity: /opportunity|benefit|advantage|value/i,
      implementation: /implement|deploy|launch|rollout|execute/i,
      scalability: /scale|growth|expand|increase|volume/i,
      security: /security|secure|protection|privacy|compliance/i,
      integration: /integrat|connect|interface|api|system/i,
      performance: /performance|speed|efficiency|optimize/i,
    };

    for (const [topic, pattern] of Object.entries(topicPatterns)) {
      if (pattern.test(content)) {
        topics.push(topic);
      }
    }

    return topics;
  }

  private analyzeSentiment(content: string): number {
    // Simple sentiment analysis based on positive/negative words
    const positiveWords = [
      'good',
      'great',
      'excellent',
      'amazing',
      'wonderful',
      'fantastic',
      'positive',
      'benefit',
      'advantage',
      'opportunity',
      'success',
      'win',
    ];

    const negativeWords = [
      'bad',
      'terrible',
      'awful',
      'horrible',
      'negative',
      'problem',
      'issue',
      'concern',
      'risk',
      'challenge',
      'difficult',
      'fail',
    ];

    let positiveCount = 0;
    let negativeCount = 0;

    const words = content.toLowerCase().split(/\s+/);

    for (const word of words) {
      if (positiveWords.includes(word)) {positiveCount++;}
      if (negativeWords.includes(word)) {negativeCount++;}
    }

    // Return sentiment score between -1 (negative) and 1 (positive)
    const totalSentimentWords = positiveCount + negativeCount;
    if (totalSentimentWords === 0) {return 0;}

    return (positiveCount - negativeCount) / totalSentimentWords;
  }

  private assessComplexity(content: string): number {
    // Simple complexity assessment based on length and structure
    const wordCount = content.split(/\s+/).length;
    const sentenceCount = content.split(/[.!?]+/).length;
    const avgWordsPerSentence = wordCount / Math.max(sentenceCount, 1);

    // Normalize complexity to 0-1 range
    // More words and longer sentences = higher complexity
    const lengthComplexity = Math.min(wordCount / 200, 1);
    const structureComplexity = Math.min(avgWordsPerSentence / 20, 1);

    return (lengthComplexity + structureComplexity) / 2;
  }

  private determineExpertiseAreas(keywords: string[], _topics: string[]): ExpertiseArea[] {
    const expertiseAreas: ExpertiseArea[] = [];

    for (const [area, areaKeywords] of this.expertiseKeywords.entries()) {
      const matchingKeywords = keywords.filter(keyword =>
        areaKeywords.some(
          areaKeyword => keyword.includes(areaKeyword) || areaKeyword.includes(keyword)
        )
      );

      if (matchingKeywords.length > 0) {
        const confidence = Math.min(matchingKeywords.length / areaKeywords.length, 1);

        expertiseAreas.push({
          area,
          confidence,
          keywords: matchingKeywords,
        });
      }
    }

    return expertiseAreas.sort((a, b) => b.confidence - a.confidence);
  }

  private countKeywordMatches(contentKeywords: string[], personaKeywords: string[]): number {
    let matches = 0;

    for (const contentKeyword of contentKeywords) {
      for (const personaKeyword of personaKeywords) {
        if (
          contentKeyword.includes(personaKeyword.toLowerCase()) ||
          personaKeyword.toLowerCase().includes(contentKeyword)
        ) {
          matches++;
          break; // Count each content keyword only once
        }
      }
    }

    return matches;
  }

  private checkExpertiseAreaMatch(expertiseArea: ExpertiseArea, persona: Persona): number {
    // Check if persona's expertise keywords match the identified expertise area
    const areaKeywords = this.expertiseKeywords.get(expertiseArea.area) || [];
    const matches = this.countKeywordMatches(areaKeywords, persona.expertiseKeywords);

    return matches > 0 ? expertiseArea.confidence * (matches / areaKeywords.length) : 0;
  }

  private checkPriorityAlignment(topics: string[], priorities: string[]): number {
    let alignmentScore = 0;

    for (const topic of topics) {
      for (const priority of priorities) {
        if (priority.toLowerCase().includes(topic) || topic.includes(priority.toLowerCase())) {
          alignmentScore += 0.2; // Each alignment adds to the score
        }
      }
    }

    return Math.min(alignmentScore, 1.0);
  }
}
