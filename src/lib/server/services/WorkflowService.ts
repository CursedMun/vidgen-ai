import type { Preset, Prompt, Source, Workflow } from '@prisma/client';
import type { TDatabase } from '../infrastructure/db/client';
import type { RssService } from './RssService';
import type { InstagramService } from './social_media/InstagramService';
import type { YoutubeService } from './social_media/YoutubeService';
import type { TranscriberService } from './TranscriberService';
import type { VideoService } from './VideoService';
type WorkflowExtended = Workflow & {
  preset: Preset & {
    imagePrompt?: Prompt | null;
    audioPrompt?: Prompt | null;
    videoPrompt?: Prompt | null;
  };
  source: Source;
};
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
    await this.process();
    setInterval(() => this.process(), 60000); // Re-run the process every 60 seconds
  }

  private async process() {
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
        await this.processPendingWorkflows(workflows);
      }
    } catch (error) {
      console.error('Error in workflow process loop:', error);
    }
  }

  async processPendingWorkflows(workflows: Workflow[]) {
    for (const wf of workflows) {
      try {
        const workflow = await this.db.workflow.findFirst({
          where: {
            id: wf.id,
            status: 'active',
          },
          include: {
            preset: {
              include: {
                videoPrompt: true,
                audioPrompt: true,
                imagePrompt: true,
              },
            },
            accounts: true,
            source: true,
          },
        });
        if (!workflow) return;
        await this.db.workflow.update({
          where: { id: workflow.id },
          data: { status: 'processing' },
        });
        const workflowRun = await this.db.workflowRun.create({
          data: {
            workflowId: workflow.id,
            title: workflow.title,
            filePath: '',
          },
        });

        console.log(`🚀 Processing Workflow: ${workflow.title}`);

        const reference = await this.getReferenceFromSource(workflow.source);

        if (!workflow.preset) {
          throw new Error('Preset not found');
        }

        const media = await this.generateMedia(workflow, reference);

        if (!media) {
          throw new Error("Media didn't generate");
        }

        const videoDescription =
          await this.videoService.generateSocialMediaDescription(
            workflow.mediaType.toLowerCase() as 'video' | 'image',
            workflow.mediaType === 'video'
              ? workflow.preset.videoPrompt?.content!
              : workflow.preset.imagePrompt?.content!,
          );

        await this.db.workflowRun.update({
          where: { id: workflowRun.id },
          data: {
            filePath: media,
            title: videoDescription,
          },
        });

        // Process all accounts linked to this workflow

        for (const account of workflow.accounts) {
          const job = await this.db.workflowJob.create({
            data: {
              workflowRunId: workflowRun.id,
              accountId: account.id,
            },
          });
          try {
            let externalId = '';

            console.log('videoDescription: ====>', videoDescription);

            if (!account) {
              throw new Error('Account not found');
            }

            // YouTube
            if (account.platform === 'youtube') {
              const result = await this.youtubeService.uploadShort(
                media,
                videoDescription,
                workflow.preset.description || '',
                account,
              );
              externalId = result?.videoId as string;
            }
            // Instagram
            else if (account.platform === 'instagram') {
              await this.instagramService.setCurrentUser(account.id);
              console.log('media: ', media);
              externalId = await this.instagramService.uploadToInstagram(
                media,
                videoDescription,
                workflow.mediaType,
              );
            }

            await this.db.workflowJob.update({
              where: { id: job.id },
              data: {
                status: 'completed',
                externalId: externalId,
                executedAt: new Date(),
              },
            });
          } catch (exeError: any) {
            console.error(`Erro na conta ${account.id}:`, exeError);
            await this.db.workflowJob.update({
              where: { id: job.id },
              data: { status: 'failed', errorMessage: exeError?.message },
            });
          }
        }

        // Calculate next run time based on interval
        const nextRunAt = this.calculateNextRun(workflow.interval);

        // Update workflow to active
        await this.db.workflow.update({
          where: { id: workflow.id },
          data: {
            status: 'active',
            lastRunAt: new Date(),
            nextRunAt: nextRunAt,
          },
        });
      } catch (error: any) {
        console.error(`Critical failure in workflow ${wf.id}:`, error);
        await this.db.workflow.update({
          where: { id: wf.id },
          data: { status: 'deactivated' },
        });
      }
    }
  }

  private async generateMedia(
    workflow: WorkflowExtended,
    reference:
      | {
          text: string;
          videoPath: undefined;
        }
      | {
          text: undefined;
          videoPath: string | undefined;
        },
  ) {
    if (workflow.mediaType === 'image') {
      if (workflow.source.type === 'youtube') {
        throw new Error("Can't generate a image from YouTube video");
      }
      if (!workflow.preset.imagePrompt) {
        throw new Error('Image prompt not found');
      }
      if (!reference.text) {
        throw new Error('Reference text not found');
      }
      return await this.videoService.generatePhoto(
        workflow.preset.imagePrompt.content,
        reference.text,
      );
    }
    if (!workflow.preset.videoPrompt?.content) {
      throw new Error('Video prompt not found');
    }

    await this.videoService.generateVideo(
      workflow.preset.videoPrompt?.content,
      workflow.model,
      workflow.preset.audioPrompt?.content!,
      reference.text,
      reference.videoPath,
    );
  }

  private async getReferenceFromSource(source: Source) {
    if (source.type === 'rss') {
      const rssContent = await this.rssService.fetchLatestRSSContent(
        source.url,
      );

      return { text: rssContent.description, videoPath: undefined };
    }
    //TODO make source.type === "transcription"
    const channel = await this.youtubeService.getYoutubeAccountByLink(
      source.url,
    );
    const videoPath =
      await this.youtubeService.downloadLatestChannelShortVideo(channel);
    return { text: undefined, videoPath };
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
