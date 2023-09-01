import { Octokit } from 'octokit';
import { injectable } from 'inversify';
import { DateTimeSettingRepository } from './Repositories/DateTimeSettingRepository.js';
import { TelegramService } from './TelegramService.js';
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
    private readonly config: Config,
  ) {}

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
      commitsList = await this.octokit.rest.repos.listCommits({
        owner: 'netzhuffle',
        repo: 'parmelae-bot',
        since: this.lastCommitDateTime?.toISOString(),
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
      if (this.lastCommitDateTime && date <= this.lastCommitDateTime) {
        return;
      }
      await this.updateSettingIfNewer(date);
    }

    const commitMessage = commit.commit.message;
    if (commitMessage.includes('no_announcement')) {
      return;
    }

    const announcementText =
      await this.gitCommitAnnounceGenerator.generate(commitMessage);
    const promises: Promise<void>[] = [];
    this.config.newCommitAnnouncementChats.forEach((chat) => {
      promises.push(this.telegramService.send(announcementText, chat));
    });
    await Promise.all(promises);
  }

  private async updateSettingIfNewer(date: Date): Promise<void> {
    if (this.lastCommitDateTime && date > this.lastCommitDateTime) {
      this.lastCommitDateTime = date;
      await this.dateTimeSettingRepository.update(
        LAST_COMMIT_DATE_TIME_SETTING,
        date,
      );
    }
  }
}
