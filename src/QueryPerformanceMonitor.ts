import { PrismaClient } from '@prisma/client';
import { injectable } from 'inversify';

/** Query event data structure */
interface QueryEvent {
  query: string;
  params: string;
  duration: number;
  timestamp: Date;
}

/** Query performance metrics */
export interface QueryMetrics {
  query: string;
  params: string;
  duration: number;
  timestamp: Date;
  target: string;
}

/** Query performance statistics */
export interface QueryStats {
  totalQueries: number;
  averageDuration: number;
  slowQueries: QueryMetrics[];
  queryFrequency: Map<string, number>;
  performanceByTarget: Map<string, { count: number; totalDuration: number }>;
}

/** Service for monitoring and analyzing Prisma query performance */
@injectable()
export class QueryPerformanceMonitor {
  private metrics: QueryMetrics[] = [];
  private readonly slowQueryThreshold = 100; // milliseconds
  private isMonitoring = false;

  constructor(private readonly prisma: PrismaClient) {}

  /** Start monitoring query performance */
  startMonitoring(): void {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;

    // Listen to query events
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    (this.prisma as any).$on('query', (event: QueryEvent) => {
      const metric: QueryMetrics = {
        query: event.query,
        params: event.params,
        duration: event.duration,
        timestamp: new Date(event.timestamp),
        target: this.extractTarget(event.query),
      };

      this.metrics.push(metric);

      // Log slow queries immediately
      if (event.duration > this.slowQueryThreshold) {
        console.warn(`🐌 Slow query detected (${event.duration}ms):`, {
          target: metric.target,
          query: event.query.substring(0, 100) + '...',
          params: event.params,
        });
      }
    });

    // Listen to other events for comprehensive monitoring
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    (this.prisma as any).$on('info', (event: unknown) => {
      console.info('📊 Prisma Info:', event);
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    (this.prisma as any).$on('warn', (event: unknown) => {
      console.warn('⚠️ Prisma Warning:', event);
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    (this.prisma as any).$on('error', (event: unknown) => {
      console.error('❌ Prisma Error:', event);
    });

    console.log('🔍 Query performance monitoring started');
  }

  /** Stop monitoring query performance */
  stopMonitoring(): void {
    this.isMonitoring = false;
    console.log('🔍 Query performance monitoring stopped');
  }

  /** Get current performance statistics */
  getStats(): QueryStats {
    const totalQueries = this.metrics.length;
    const averageDuration =
      totalQueries > 0
        ? this.metrics.reduce((sum, m) => sum + m.duration, 0) / totalQueries
        : 0;

    const slowQueries = this.metrics
      .filter((m) => m.duration > this.slowQueryThreshold)
      .sort((a, b) => b.duration - a.duration);

    const queryFrequency = new Map<string, number>();
    const performanceByTarget = new Map<
      string,
      { count: number; totalDuration: number }
    >();

    this.metrics.forEach((metric) => {
      // Count query frequency by target
      const currentCount = queryFrequency.get(metric.target) ?? 0;
      queryFrequency.set(metric.target, currentCount + 1);

      // Aggregate performance by target
      const currentStats = performanceByTarget.get(metric.target) ?? {
        count: 0,
        totalDuration: 0,
      };
      performanceByTarget.set(metric.target, {
        count: currentStats.count + 1,
        totalDuration: currentStats.totalDuration + metric.duration,
      });
    });

    return {
      totalQueries,
      averageDuration,
      slowQueries,
      queryFrequency,
      performanceByTarget,
    };
  }

  /** Generate a performance report */
  generateReport(): string {
    const stats = this.getStats();

    let report = '\n📊 DATABASE QUERY PERFORMANCE REPORT\n';
    report += '=====================================\n\n';

    report += `📈 Overall Statistics:\n`;
    report += `  • Total Queries: ${stats.totalQueries}\n`;
    report += `  • Average Duration: ${stats.averageDuration.toFixed(2)}ms\n`;
    report += `  • Slow Queries (>${this.slowQueryThreshold}ms): ${stats.slowQueries.length}\n\n`;

    if (stats.slowQueries.length > 0) {
      report += `🐌 Top 5 Slowest Queries:\n`;
      stats.slowQueries.slice(0, 5).forEach((query, index) => {
        report += `  ${index + 1}. ${query.target} - ${query.duration}ms\n`;
        report += `     Query: ${query.query.substring(0, 80)}...\n`;
      });
      report += '\n';
    }

    report += `🎯 Performance by Target:\n`;
    const sortedTargets = Array.from(stats.performanceByTarget.entries()).sort(
      (a, b) =>
        b[1].totalDuration / b[1].count - a[1].totalDuration / a[1].count,
    );

    sortedTargets.forEach(([target, perf]) => {
      const avgDuration = perf.totalDuration / perf.count;
      report += `  • ${target}: ${perf.count} queries, avg ${avgDuration.toFixed(2)}ms\n`;
    });

    report += '\n🔄 Query Frequency:\n';
    const sortedFrequency = Array.from(stats.queryFrequency.entries()).sort(
      (a, b) => b[1] - a[1],
    );

    sortedFrequency.slice(0, 10).forEach(([target, count]) => {
      report += `  • ${target}: ${count} times\n`;
    });

    return report;
  }

  /** Clear collected metrics */
  clearMetrics(): void {
    this.metrics = [];
    console.log('🧹 Query performance metrics cleared');
  }

  /** Get metrics for a specific time period */
  getMetricsForPeriod(startTime: Date, endTime: Date): QueryMetrics[] {
    return this.metrics.filter(
      (m) => m.timestamp >= startTime && m.timestamp <= endTime,
    );
  }

  /** Get all collected metrics */
  getAllMetrics(): QueryMetrics[] {
    return [...this.metrics];
  }

  /** Extract target table/operation from SQL query */
  private extractTarget(query: string): string {
    const normalizedQuery = query.toLowerCase().trim();

    // Extract table name from different query types
    if (normalizedQuery.startsWith('select')) {
      const fromRegex = /from\s+["`]?(\w+)["`]?/;
      const fromMatch = fromRegex.exec(normalizedQuery);
      return fromMatch ? `SELECT ${fromMatch[1]}` : 'SELECT unknown';
    }

    if (normalizedQuery.startsWith('insert')) {
      const intoRegex = /insert\s+into\s+["`]?(\w+)["`]?/;
      const intoMatch = intoRegex.exec(normalizedQuery);
      return intoMatch ? `INSERT ${intoMatch[1]}` : 'INSERT unknown';
    }

    if (normalizedQuery.startsWith('update')) {
      const updateRegex = /update\s+["`]?(\w+)["`]?/;
      const updateMatch = updateRegex.exec(normalizedQuery);
      return updateMatch ? `UPDATE ${updateMatch[1]}` : 'UPDATE unknown';
    }

    if (normalizedQuery.startsWith('delete')) {
      const deleteRegex = /delete\s+from\s+["`]?(\w+)["`]?/;
      const deleteMatch = deleteRegex.exec(normalizedQuery);
      return deleteMatch ? `DELETE ${deleteMatch[1]}` : 'DELETE unknown';
    }

    // Handle Prisma-specific queries
    if (normalizedQuery.includes('pragma')) {
      return 'PRAGMA';
    }

    return 'UNKNOWN';
  }
}
