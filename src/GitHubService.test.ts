import { describe, beforeEach, it, expect, mock, spyOn } from 'bun:test';
import { GitHubService } from './GitHubService.js';
import { DateTimeSettingRepositoryFake } from './Fakes/DateTimeSettingRepositoryFake.js';
import { DateTimeSettingRepository } from './Repositories/DateTimeSettingRepository.js';
import { Octokit } from 'octokit';
import { GitCommitAnnouncementGenerator } from './MessageGenerators/GitCommitAnnouncementGenerator.js';
import { TelegramService } from './TelegramService.js';
import { ConfigFake } from './Fakes/ConfigFake.js';

describe('GitHubService', () => {
  let service: GitHubService;
  let dateTimeRepository: DateTimeSettingRepositoryFake;
  let octokit: Octokit;
  let gitCommitAnnounceGenerator: GitCommitAnnouncementGenerator;
  let telegramService: TelegramService;
  let config: ConfigFake;
  let listCommitsMock: ReturnType<typeof mock>;
  let generateMock: ReturnType<typeof mock>;
  let sendMock: ReturnType<typeof mock>;

  beforeEach(() => {
    dateTimeRepository = new DateTimeSettingRepositoryFake();
    listCommitsMock = mock();
    octokit = {
      rest: {
        repos: {
          listCommits: listCommitsMock,
        },
      },
    } as unknown as Octokit;
    generateMock = mock();
    gitCommitAnnounceGenerator = {
      generate: generateMock,
    } as unknown as GitCommitAnnouncementGenerator;
    sendMock = mock();
    telegramService = {
      send: sendMock,
    } as unknown as TelegramService;
    config = new ConfigFake();

    service = new GitHubService(
      octokit,
      dateTimeRepository as unknown as DateTimeSettingRepository,
      gitCommitAnnounceGenerator,
      telegramService,
      config,
    );
  });

  describe('announceNewCommits', () => {
    it('should handle date from repository', async () => {
      const validDate = new Date('2025-11-13T15:24:36.000Z');
      dateTimeRepository.setStoredDate('last commit DateTime', validDate);

      listCommitsMock.mockResolvedValue({
        data: [],
      });

      await service.announceNewCommits();

      expect(dateTimeRepository.getCallArgs).toHaveLength(1);
      expect(dateTimeRepository.getCallArgs[0].setting).toBe(
        'last commit DateTime',
      );
    });
  });

  describe('pollCommits', () => {
    it('should include since parameter when lastCommitDateTime is valid', async () => {
      const validDate = new Date('2025-11-13T15:24:36.000Z');
      dateTimeRepository.setStoredDate('last commit DateTime', validDate);

      listCommitsMock.mockResolvedValue({
        data: [],
      });

      await service.announceNewCommits();

      expect(listCommitsMock).toHaveBeenCalledWith({
        owner: 'netzhuffle',
        repo: 'parmelae-bot',
        since: validDate.toISOString(),
      });
    });

    it('should omit since parameter when lastCommitDateTime is invalid', async () => {
      const invalidDate = new Date(NaN);
      dateTimeRepository.setStoredDate('last commit DateTime', invalidDate);
      spyOn(console, 'warn').mockImplementation(() => {
        // Suppress console output in tests
      });

      listCommitsMock.mockResolvedValue({
        data: [],
      });

      await service.announceNewCommits();

      expect(listCommitsMock).toHaveBeenCalledWith({
        owner: 'netzhuffle',
        repo: 'parmelae-bot',
      });
    });

    it('should omit since parameter when lastCommitDateTime is null', async () => {
      dateTimeRepository.setStoredDate('last commit DateTime', new Date(NaN));
      spyOn(console, 'warn').mockImplementation(() => {
        // Suppress console output in tests
      });

      listCommitsMock.mockResolvedValue({
        data: [],
      });

      await service.announceNewCommits();

      const callArgs = listCommitsMock.mock.calls[0]?.[0] as {
        owner: string;
        repo: string;
        since?: string;
      };
      expect(callArgs).not.toHaveProperty('since');
    });
  });

  describe('handleCommit', () => {
    it('should skip invalid commit dates and log warning', async () => {
      const validDate = new Date('2025-11-13T15:24:36.000Z');
      dateTimeRepository.setStoredDate('last commit DateTime', validDate);
      const consoleWarnSpy = spyOn(console, 'warn').mockImplementation(() => {
        // Suppress console output in tests
      });

      listCommitsMock.mockResolvedValue({
        data: [
          {
            commit: {
              committer: {
                date: 'invalid-date-string',
              },
              message: 'Test commit',
            },
          },
        ],
      });
      generateMock.mockResolvedValue('Announcement');
      sendMock.mockResolvedValue(1);

      await service.announceNewCommits();

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid date in commit'),
      );
      expect(dateTimeRepository.updateCallArgs).toHaveLength(0);

      consoleWarnSpy.mockRestore();
    });

    it('should process valid commit dates', async () => {
      const oldDate = new Date('2025-11-13T15:24:36.000Z');
      const newDate = new Date('2025-11-17T10:00:00.000Z');
      dateTimeRepository.setStoredDate('last commit DateTime', oldDate);

      listCommitsMock.mockResolvedValue({
        data: [
          {
            commit: {
              committer: {
                date: newDate.toISOString(),
              },
              message: 'Test commit',
            },
          },
        ],
      });
      generateMock.mockResolvedValue('Announcement');
      sendMock.mockResolvedValue(1);

      await service.announceNewCommits();

      expect(dateTimeRepository.updateCallArgs).toHaveLength(1);
      expect(dateTimeRepository.updateCallArgs[0].newDate).toEqual(newDate);
    });

    it('should skip commits with no_announcement flag', async () => {
      const validDate = new Date('2025-11-13T15:24:36.000Z');
      dateTimeRepository.setStoredDate('last commit DateTime', validDate);

      listCommitsMock.mockResolvedValue({
        data: [
          {
            commit: {
              committer: {
                date: new Date().toISOString(),
              },
              message: 'Test commit no_announcement',
            },
          },
        ],
      });

      await service.announceNewCommits();

      expect(generateMock).not.toHaveBeenCalled();
    });
  });
});
