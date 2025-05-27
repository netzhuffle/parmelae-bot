import {
  QueryMetrics,
  QueryPerformanceMonitor,
} from './QueryPerformanceMonitor.js';

/** Analysis result for query patterns */
export interface QueryAnalysisResult {
  potentialN1Issues: N1QueryPattern[];
  missingIndexCandidates: IndexCandidate[];
  inefficientQueries: QueryMetrics[];
  recommendations: string[];
}

/** Potential N+1 query pattern */
export interface N1QueryPattern {
  baseQuery: string;
  repeatedQuery: string;
  frequency: number;
  totalDuration: number;
  description: string;
}

/** Index candidate suggestion */
export interface IndexCandidate {
  table: string;
  columns: string[];
  reason: string;
  estimatedImpact: 'high' | 'medium' | 'low';
  queryPattern: string;
}

/** Utility for analyzing query performance and identifying optimization opportunities */
export class QueryAnalysisUtility {
  constructor(private readonly monitor: QueryPerformanceMonitor) {}

  /** Analyze current query patterns and provide optimization recommendations */
  analyzeQueries(): QueryAnalysisResult {
    const metrics = this.getAllMetrics();

    const potentialN1Issues = this.detectN1Patterns(metrics);
    const missingIndexCandidates = this.suggestIndexes(metrics);
    const inefficientQueries = this.identifyInefficientQueries(metrics);
    const recommendations = this.generateRecommendations(
      potentialN1Issues,
      missingIndexCandidates,
      inefficientQueries,
    );

    return {
      potentialN1Issues,
      missingIndexCandidates,
      inefficientQueries,
      recommendations,
    };
  }

  /** Detect potential N+1 query patterns */
  private detectN1Patterns(metrics: QueryMetrics[]): N1QueryPattern[] {
    const patterns: N1QueryPattern[] = [];
    const queryGroups = new Map<string, QueryMetrics[]>();

    // Group similar queries
    metrics.forEach((metric) => {
      const normalizedQuery = this.normalizeQuery(metric.query);
      if (!queryGroups.has(normalizedQuery)) {
        queryGroups.set(normalizedQuery, []);
      }
      queryGroups.get(normalizedQuery)!.push(metric);
    });

    // Look for patterns that might indicate N+1 issues
    queryGroups.forEach((queries, normalizedQuery) => {
      if (queries.length > 10) {
        // Threshold for potential N+1
        const totalDuration = queries.reduce((sum, q) => sum + q.duration, 0);
        const avgDuration = totalDuration / queries.length;

        // Check if these are likely N+1 queries (many similar queries in short time)
        const timeSpan = this.getTimeSpan(queries);
        if (timeSpan < 5000 && avgDuration > 10) {
          // Within 5 seconds, each taking >10ms
          patterns.push({
            baseQuery: 'Unknown base query',
            repeatedQuery: normalizedQuery,
            frequency: queries.length,
            totalDuration,
            description: `Detected ${queries.length} similar queries in ${timeSpan}ms - potential N+1 pattern`,
          });
        }
      }
    });

    return patterns;
  }

  /** Suggest database indexes based on query patterns */
  private suggestIndexes(metrics: QueryMetrics[]): IndexCandidate[] {
    const candidates: IndexCandidate[] = [];
    const wherePatterns = new Map<
      string,
      { count: number; totalDuration: number }
    >();

    metrics.forEach((metric) => {
      const whereColumns = this.extractWhereColumns(metric.query);
      const table = this.extractTableName(metric.query);

      if (table && whereColumns.length > 0) {
        const key = `${table}:${whereColumns.join(',')}`;
        const current = wherePatterns.get(key) ?? {
          count: 0,
          totalDuration: 0,
        };
        wherePatterns.set(key, {
          count: current.count + 1,
          totalDuration: current.totalDuration + metric.duration,
        });
      }
    });

    // Suggest indexes for frequently used WHERE conditions
    wherePatterns.forEach((stats, key) => {
      const [table, columnsStr] = key.split(':');
      const columns = columnsStr.split(',');

      if (stats.count > 5 && stats.totalDuration > 100) {
        // Threshold for index suggestion
        const avgDuration = stats.totalDuration / stats.count;
        const impact =
          avgDuration > 50 ? 'high' : avgDuration > 20 ? 'medium' : 'low';

        candidates.push({
          table,
          columns,
          reason: `Used in ${stats.count} queries with avg duration ${avgDuration.toFixed(2)}ms`,
          estimatedImpact: impact,
          queryPattern: `WHERE ${columns.join(' AND ')}`,
        });
      }
    });

    // Add specific known optimization opportunities
    this.addKnownIndexCandidates(candidates, metrics);

    return candidates;
  }

  /** Add known index candidates based on application patterns */
  private addKnownIndexCandidates(
    candidates: IndexCandidate[],
    metrics: QueryMetrics[],
  ): void {
    const messageQueries = metrics.filter((m) =>
      m.query.toLowerCase().includes('message'),
    );
    const toolMessageQueries = metrics.filter((m) =>
      m.query.toLowerCase().includes('toolmessage'),
    );

    if (messageQueries.length > 0) {
      candidates.push({
        table: 'Message',
        columns: ['chatId', 'id'],
        reason: 'Composite index for message history queries',
        estimatedImpact: 'high',
        queryPattern: 'WHERE chatId = ? AND id < ?',
      });

      candidates.push({
        table: 'Message',
        columns: ['sentAt'],
        reason: 'Index for cleanup operations and time-based queries',
        estimatedImpact: 'medium',
        queryPattern: 'WHERE sentAt < ?',
      });

      candidates.push({
        table: 'Message',
        columns: ['fromId'],
        reason: 'Index for user message queries',
        estimatedImpact: 'medium',
        queryPattern: 'WHERE fromId = ?',
      });
    }

    if (toolMessageQueries.length > 0) {
      candidates.push({
        table: 'ToolMessage',
        columns: ['messageId'],
        reason: 'Index for tool message lookups',
        estimatedImpact: 'high',
        queryPattern: 'WHERE messageId = ?',
      });

      candidates.push({
        table: 'ToolMessage',
        columns: ['toolCallId'],
        reason: 'Index for tool call correlation',
        estimatedImpact: 'medium',
        queryPattern: 'WHERE toolCallId = ?',
      });
    }
  }

  /** Identify inefficient queries that need optimization */
  private identifyInefficientQueries(metrics: QueryMetrics[]): QueryMetrics[] {
    return metrics
      .filter((metric) => {
        // Criteria for inefficient queries
        return (
          metric.duration > 100 || // Slow queries
          this.hasCartesianProduct(metric.query) || // Potential cartesian products
          this.hasUnnecessaryJoins(metric.query) || // Complex joins
          this.lacksLimitClause(metric.query) // Missing LIMIT on potentially large results
        );
      })
      .sort((a, b) => b.duration - a.duration);
  }

  /** Generate optimization recommendations */
  private generateRecommendations(
    n1Issues: N1QueryPattern[],
    indexCandidates: IndexCandidate[],
    inefficientQueries: QueryMetrics[],
  ): string[] {
    const recommendations: string[] = [];

    if (n1Issues.length > 0) {
      recommendations.push(
        `🔄 N+1 Query Issues: Found ${n1Issues.length} potential N+1 patterns. Consider using 'include' or batch loading.`,
      );
    }

    if (indexCandidates.length > 0) {
      const highImpact = indexCandidates.filter(
        (c) => c.estimatedImpact === 'high',
      );
      if (highImpact.length > 0) {
        recommendations.push(
          `📈 High Impact Indexes: Add indexes on ${highImpact.map((c) => `${c.table}(${c.columns.join(', ')})`).join(', ')}`,
        );
      }
    }

    if (inefficientQueries.length > 0) {
      recommendations.push(
        `🐌 Slow Queries: ${inefficientQueries.length} queries taking >100ms need optimization`,
      );
    }

    // Specific recommendations based on patterns
    const messageQueries = inefficientQueries.filter((q) =>
      q.target.includes('Message'),
    );
    if (messageQueries.length > 0) {
      recommendations.push(
        `💬 Message Queries: Consider using selective 'include' and 'select' for message relations`,
      );
    }

    const pokemonQueries = inefficientQueries.filter((q) =>
      q.target.includes('Pokemon'),
    );
    if (pokemonQueries.length > 0) {
      recommendations.push(
        `🎮 Pokemon Queries: Complex collection stats queries should be optimized with better relation loading`,
      );
    }

    if (recommendations.length === 0) {
      recommendations.push(
        '✅ No major performance issues detected in current query patterns',
      );
    }

    return recommendations;
  }

  /** Get all metrics from the monitor */
  private getAllMetrics(): QueryMetrics[] {
    return this.monitor.getAllMetrics();
  }

  /** Normalize query for pattern detection */
  private normalizeQuery(query: string): string {
    return query
      .replace(/\$\d+/g, '?') // Replace parameter placeholders
      .replace(/\d+/g, 'N') // Replace numbers
      .replace(/['"][^'"]*['"]/g, 'STRING') // Replace string literals
      .toLowerCase()
      .trim();
  }

  /** Get time span of queries */
  private getTimeSpan(queries: QueryMetrics[]): number {
    if (queries.length < 2) return 0;

    const timestamps = queries.map((q) => q.timestamp.getTime()).sort();
    return timestamps[timestamps.length - 1] - timestamps[0];
  }

  /** Extract WHERE clause columns */
  private extractWhereColumns(query: string): string[] {
    const whereRegex =
      /where\s+(.+?)(?:\s+order\s+by|\s+limit|\s+group\s+by|$)/;
    const whereMatch = whereRegex.exec(query.toLowerCase());
    if (!whereMatch) return [];

    const whereClause = whereMatch[1];
    const columns: string[] = [];

    // Simple extraction - could be more sophisticated
    const columnRegex = /["`]?(\w+)["`]?\s*[=<>]/g;
    let columnMatch;
    while ((columnMatch = columnRegex.exec(whereClause)) !== null) {
      const column = columnMatch[1];
      if (column && !columns.includes(column)) {
        columns.push(column);
      }
    }

    return columns;
  }

  /** Extract table name from query */
  private extractTableName(query: string): string | null {
    const fromRegex = /from\s+["`]?(\w+)["`]?/;
    const fromMatch = fromRegex.exec(query.toLowerCase());
    return fromMatch ? fromMatch[1] : null;
  }

  /** Check for potential cartesian products */
  private hasCartesianProduct(query: string): boolean {
    const lowerQuery = query.toLowerCase();
    return (
      lowerQuery.includes('join') &&
      !lowerQuery.includes('on ') &&
      !lowerQuery.includes('using')
    );
  }

  /** Check for unnecessary joins */
  private hasUnnecessaryJoins(query: string): boolean {
    const joinMatches = query.toLowerCase().match(/join/g);
    const joinCount = joinMatches?.length ?? 0;
    return joinCount > 3; // Arbitrary threshold
  }

  /** Check if query lacks LIMIT clause for potentially large results */
  private lacksLimitClause(query: string): boolean {
    const lowerQuery = query.toLowerCase();
    return (
      lowerQuery.startsWith('select') &&
      !lowerQuery.includes('limit') &&
      !lowerQuery.includes('where') &&
      !lowerQuery.includes('findunique')
    );
  }
}
