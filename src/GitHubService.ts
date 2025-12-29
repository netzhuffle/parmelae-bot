import { Octokit } from 'octokit';
import { injectable, inject } from 'inversify';
import { DateTimeSettingRepository } from './Repositories/DateTimeSettingRepository.js';
import { TelegramService } from './TelegramService.js';
import type { GitHubConfig } from './ConfigInterfaces.js';
import { Config } from './Config.js';
import { RequestError } from '@octokit/request-error';
import { GitCommitAnnouncementGenerator } from './MessageGenerators/GitCommitAnnouncementGenerator.js';

interface Commit {
  commit: {
    committer: {
      date?: string;
    } | null;
    message: string;
  };
}

const LAST_COMMIT_DATE_TIME_SETTING = 'last commit DateTime';

/** Announces new commits on GitHub */
@injectable()
export class GitHubService {
  private lastCommitDateTime: Date | null = null;

  constructor(
    private readonly octokit: Octokit,
    private readonly dateTimeSettingRepository: DateTimeSettingRepository,
    private readonly gitCommitAnnounceGenerator: GitCommitAnnouncementGenerator,
    private readonly telegramService: TelegramService,
    @inject(Config) private readonly config: GitHubConfig,
  ) {}

  /**
   * Converts a Date to ISO string for GitHub API, or returns undefined if invalid.
   * @param date - The date to convert
   * @returns ISO string if valid, undefined otherwise
   */
  private toSinceIso(date: Date | null): string | undefined {
    if (!date || !this.isValidDate(date)) {
      return undefined;
    }
    return date.toISOString();
  }

  /** Fetches commits and announces new ones. */
  async announceNewCommits(): Promise<void> {
    this.lastCommitDateTime = await this.dateTimeSettingRepository.get(
      LAST_COMMIT_DATE_TIME_SETTING,
      new Date(),
    );
    await this.pollAndAnnounceCommits();
  }

  private async pollAndAnnounceCommits(): Promise<void> {
    const commits = await this.pollCommits();
    commits.reverse();
    for (const commit of commits) {
      await this.handleCommit(commit);
    }
  }

  private async pollCommits(): Promise<Commit[]> {
    let commitsList: { data: Commit[] };
    try {
      const sinceParam = this.toSinceIso(this.lastCommitDateTime);
      commitsList = await this.octokit.rest.repos.listCommits({
        owner: 'netzhuffle',
        repo: 'parmelae-bot',
        ...(sinceParam ? { since: sinceParam } : {}),
      });
    } catch (e) {
      if (e instanceof RequestError) {
        // Avoid crash for HTTP request errors.
        console.error(e);
        return [];
      } else {
        // Rethrow otherwise.
        throw e;
      }
    }
    return commitsList.data;
  }

  private async handleCommit(commit: Commit): Promise<void> {
    const dateString = commit.commit.committer?.date;
    if (dateString) {
      const date = new Date(dateString);
      // Validate the date from GitHub API - skip if invalid
      if (!this.isValidDate(date)) {
        console.warn(
          `Invalid date in commit from GitHub API: "${dateString}". Skipping date processing.`,
        );
      } else {
        if (this.lastCommitDateTime && date <= this.lastCommitDateTime) {
          return;
        }
        await this.updateSettingIfNewer(date);
      }
    }

    const commitMessage = commit.commit.message;
    if (commitMessage.includes('no_announcement')) {
      return;
    }

    const announcementText =
      await this.gitCommitAnnounceGenerator.generate(commitMessage);
    const promises: Promise<number>[] = [];
    this.config.newCommitAnnouncementChats.forEach((chat) => {
      promises.push(this.telegramService.send(announcementText, chat));
    });
    await Promise.all(promises);
  }

  private async updateSettingIfNewer(date: Date): Promise<void> {
    // Validate date before processing
    if (!this.isValidDate(date)) {
      console.warn(
        `Cannot update lastCommitDateTime: provided date is invalid.`,
      );
      return;
    }

    if (this.lastCommitDateTime && date > this.lastCommitDateTime) {
      this.lastCommitDateTime = date;
      await this.dateTimeSettingRepository.update(
        LAST_COMMIT_DATE_TIME_SETTING,
        date,
      );
    }
  }

  private isValidDate(date: unknown): date is Date {
    return date instanceof Date && !Number.isNaN(date.getTime());
  }
}
