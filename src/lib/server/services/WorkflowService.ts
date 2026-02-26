import { type Source, type Workflow } from '@prisma/client';
import type { TDatabase } from '../infrastructure/db/client';
import type { RssService } from './RssService';
import type { InstagramService } from './social_media/InstagramService';
import type { YoutubeService } from './social_media/YoutubeService';
import type { TranscriberService } from './TranscriberService';
import type { VideoService } from './VideoService';

export class WorkflowService {
  constructor(
    private db: TDatabase,
    private transcriberService: TranscriberService,
    private videoService: VideoService,
    private youtubeService: YoutubeService,
    private instagramService: InstagramService,
    private rssService: RssService,
  ) {}

  async init() {
    await this.processWorkFlows();
    setTimeout(() => this.init(), 60000); // Re-run the process every 60 seconds
  }

  private async processWorkFlows() {
    try {
      const now = new Date();
      const workflows = await this.db.workflow.findMany({
        where: {
          OR: [
            { nextRunAt: { lte: now } },
            {
              AND: [{ lastRunAt: null }],
            },
          ],
          status: 'active',
        },
      });

      if (workflows.length > 0) {
        console.log(`📋 Found ${workflows.length} workflow(s) to process`);
        for (const wf of workflows) {
          if (wf.type == 'video_ideas_fetching') {
            await this.processVideoIdeaJobCreation(wf);
          }
          if (wf.type === 'video_generation') {
            await this.processVideoGenerationJobCreation(wf);
          }
          if (wf.type === 'video_publish_with_sound') {
            await this.processVideoPublishWithSoundJobCreation(wf);
          }
          // await this.processPendingWorkflows(wf);
          // Calculate next run time based on interval
          const nextRunAt = this.calculateNextRun(wf.interval);

          // Update workflow to active
          await this.db.workflow.update({
            where: { id: wf.id },
            data: {
              status: 'active',
              lastRunAt: new Date(),
              nextRunAt: nextRunAt,
            },
          });
        }
      }
    } catch (error) {
      console.error('Error in workflow process loop:', error);
    }
  }
  private async processVideoPublishWithSoundJobCreation(wf: Workflow) {
    try {
      const workflowLimitPerDay = await this.db.workflowJobsPerDay.findFirst({
        where: {
          type: wf.type,
        },
      });
      const countJobsToday = await this.db.workflowJob.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
            lt: new Date(new Date().setHours(24, 0, 0, 0)),
          },
        },
      });
      if (workflowLimitPerDay && countJobsToday >= workflowLimitPerDay.count) {
        console.log(`🚫 Workflow limit reached for today: ${wf.type}`);
        return;
      }
      const workflow = await this.db.workflow.findFirst({
        where: {
          id: wf.id,
          status: 'active',
        },
        include: {
          preset: {
            include: {
              assets: true,
            },
          },
          accounts: true,
        },
      });
      if (!workflow) return;
      await this.db.workflow.update({
        where: { id: workflow.id },
        data: { status: 'processing' },
      });
      const videosGenerated = await this.db.video.findMany({
        where: {
          AND: [
            {
              workflowJob: {
                workflowId: wf.id,
              },
            },
            {
              posts: {
                none: {},
              },
            },
          ],
        },
        take: wf.jobsPerInterval,
        include: {
          idea: true,
        },
      });
      if (!videosGenerated) {
        console.warn(
          '[WorkflowService] No videos generated found for workflow ID: ',
          wf.id,
        );
        return;
      }

      const soundsInThisPreset = workflow.preset?.assets.filter((x) => x.type);
      if (!soundsInThisPreset) {
        console.warn(
          '[WorkflowService] No sounds found in preset for workflow ID: ',
          wf.id,
        );
        return;
      }
      await this.db.workflowJob.createMany({
        data: videosGenerated
          .map((video) => {
            const randomSound =
              soundsInThisPreset[
                Math.floor(Math.random() * soundsInThisPreset.length)
              ];
            return workflow.accounts.map((x) => {
              return {
                workflowId: workflow.id,
                data: {
                  videoId: video.id,
                  soundId: randomSound.id,
                  accountId: x.id,
                },
              };
            });
          })
          .flat(),
      });
    } catch (error) {
      await this.db.workflow.update({
        where: { id: wf.id },
        data: { status: 'deactivated' },
      });
      console.error('Error in processVideoIdeaFetching:', error);
    } finally {
      await this.db.workflow.update({
        where: { id: wf.id },
        data: { status: 'active' },
      });
    }
  }
  private async processVideoIdeaJobCreation(wf: Workflow) {
    try {
      const workflowLimitPerDay = await this.db.workflowJobsPerDay.findFirst({
        where: {
          type: wf.type,
        },
      });
      const countJobsToday = await this.db.workflowJob.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
            lt: new Date(new Date().setHours(24, 0, 0, 0)),
          },
          workflow: {
            type: wf.type,
          },
        },
      });
      if (workflowLimitPerDay && countJobsToday >= workflowLimitPerDay.count) {
        console.log(`🚫 Workflow limit reached for today: ${wf.type}`);
        return;
      }
      const workflow = await this.db.workflow.findFirst({
        where: {
          id: wf.id,
          status: 'active',
        },
        include: {
          source: true,
        },
      });
      if (!workflow) return;
      await this.db.workflow.update({
        where: { id: workflow.id },
        data: { status: 'processing' },
      });
      const ideasAssociatedWithThisSource = await this.db.idea.findMany({
        where: {
          sourceId: workflow.sourceId,
        },
      });
      const channel = await this.youtubeService.getYoutubeAccountByLink(
        workflow.source.url,
      );
      const latestShorts = await this.youtubeService.findLatestShorts(
        channel.channelId,
      );
      if (!latestShorts) {
        console.log(`No latest shorts found for channel: ${channel.channelId}`);
        return;
      }
      const uniqueShorts = latestShorts
        .filter(
          (short) =>
            !ideasAssociatedWithThisSource.some(
              (idea) =>
                idea.url ===
                `https://www.youtube.com/shorts/${short.id.videoId}`,
            ),
        )
        .slice(0, wf.jobsPerInterval || undefined);

      await this.db.workflowJob.createMany({
        data: uniqueShorts.map((x) => ({
          workflowId: workflow.id,
          data: {
            videoId: x.id.videoId,
            videoUrl: `https://www.youtube.com/shorts/${x.id.videoId}`,
          },
        })),
      });
    } catch (error) {
      await this.db.workflow.update({
        where: { id: wf.id },
        data: { status: 'deactivated' },
      });
      console.error('Error in processVideoIdeaFetching:', error);
    } finally {
      await this.db.workflow.update({
        where: { id: wf.id },
        data: { status: 'active' },
      });
    }
  }
  private async processVideoGenerationJobCreation(wf: Workflow) {
    try {
      const workflowLimitPerDay = await this.db.workflowJobsPerDay.findFirst({
        where: {
          type: wf.type,
        },
      });
      const countJobsToday = await this.db.workflowJob.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
            lt: new Date(new Date().setHours(24, 0, 0, 0)),
          },
          workflow: {
            type: wf.type,
          },
        },
      });
      if (workflowLimitPerDay && countJobsToday >= workflowLimitPerDay.count) {
        console.log(`🚫 Workflow limit reached for today: ${wf.type}`);
        return;
      }
      const workflow = await this.db.workflow.findFirst({
        where: {
          id: wf.id,
          status: 'active',
        },
        include: {
          source: true,
        },
      });
      if (!workflow) return;
      await this.db.workflow.update({
        where: { id: workflow.id },
        data: { status: 'processing' },
      });
      const ideasAssociated = await this.db.idea.findMany({
        where: {
          sourceId: workflow.sourceId,
        },
      });
      const ideas = ideasAssociated.map((idea) => {
        return {
          ideaId: idea.id,
        };
      });
      const existing = await this.db.workflowJob.findMany({
        where: {
          workflow: {
            type: 'video_generation',
          },
          data: {
            equals: ideas,
          },
        },
      });
      const uniqueIdeas = ideas
        .filter(
          (idea) =>
            !existing.some(
              (e) => e.data && (e.data as any).ideaId === idea.ideaId,
            ),
        )
        .slice(0, wf.jobsPerInterval || undefined);
      await this.db.workflowJob.createMany({
        data: uniqueIdeas.map((idea) => ({
          workflowId: workflow.id,
          data: {
            ideaId: idea.ideaId,
          },
        })),
      });
    } catch (error) {
      await this.db.workflow.update({
        where: { id: wf.id },
        data: { status: 'deactivated' },
      });
      console.error('Error in processVideoIdeaFetching:', error);
    } finally {
      await this.db.workflow.update({
        where: { id: wf.id },
        data: { status: 'active' },
      });
    }
  }

  private async getReferenceFromSource(source: Source) {
    if (source.type === 'rss') {
      const rssContent = await this.rssService.fetchLatestRSSContent(
        source.url,
      );

      return { text: rssContent.description, videoPath: undefined };
    }
  }

  private calculateNextRun(frequency: string): Date | null {
    if (!frequency || frequency === 'once') {
      return null;
    }

    const now = new Date();

    // Parse frequency string (e.g., "1h", "2h", "30m", "1w", "2d")
    const match = frequency.match(/^(\d+)([mhdw])$/);

    if (!match) {
      console.warn(`Invalid frequency format: ${frequency}`);
      return null;
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    let milliseconds = 0;

    switch (unit) {
      case 'm': // minutes
        milliseconds = value * 60 * 1000;
        break;
      case 'h': // hours
        milliseconds = value * 60 * 60 * 1000;
        break;
      case 'd': // days
        milliseconds = value * 24 * 60 * 60 * 1000;
        break;
      case 'w': // weeks
        milliseconds = value * 7 * 24 * 60 * 60 * 1000;
        break;
      default:
        return null;
    }

    return new Date(now.getTime() + milliseconds);
  }
}
