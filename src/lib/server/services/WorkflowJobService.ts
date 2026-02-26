import {
  Prisma,
  type Preset,
  type Prompt,
  type Workflow,
  type WorkflowJob,
  type WorkflowRun,
} from '@prisma/client';
import type { Source } from 'postcss';
import type { TDatabase } from '../infrastructure/db/client';
import type { RssService } from './RssService';
import type { InstagramService } from './social_media/InstagramService';
import type { YoutubeService } from './social_media/YoutubeService';
import type { TranscriberService } from './TranscriberService';
import type { Asset, VideoService } from './VideoService';
type WorkflowJobWithWorkflow = WorkflowJob & {
  workflow: Workflow;
};
type WorkflowExtended = Workflow & {
  preset?:
    | (Preset & {
        assets: Asset[];
        videoPrompt?: Prompt | null;
        audioPrompt?: Prompt | null;
      })
    | null;
  source: Source;
};
export class WorkflowJobService {
  private initialized = false;
  constructor(
    private db: TDatabase,
    private transcriberService: TranscriberService,
    private videoService: VideoService,
    private youtubeService: YoutubeService,
    private instagramService: InstagramService,
    private rssService: RssService,
  ) {}
  public async init() {
    if (this.initialized) return;
    this.initialized = true;
    await this.processing();
  }
  private async processing() {
    await this.processWorkFlowJobs();
    setTimeout(() => this.processing(), 60000); // Re-run the process every 60 seconds
  }
  private async processWorkFlowJobs() {
    try {
      const workflowsJobs = await this.db.workflowJob.findMany({
        where: {
          status: 'pending',
        },
        include: {
          workflow: true,
        },
      });

      if (workflowsJobs.length > 0) {
        console.log(
          `📋 Found ${workflowsJobs.length} workflow job(s) to process`,
        );
        for (const job of workflowsJobs) {
          await this.db.workflowJob.update({
            where: {
              id: job.id,
            },
            data: {
              status: 'processing',
              executedAt: new Date(),
            },
          });
          if (job.workflow.type == 'video_ideas_fetching') {
            await this.processVideoIdeaFetching(job);
          }
          if (job.workflow.type === 'video_generation') {
            await this.processVideoGeneration(job);
          }
          if (job.workflow.type === 'video_publish_with_sound') {
            await this.processVideoPublishWithSound(job);
          }
        }
      }
    } catch (error) {
      console.error('Error in workflow process loop:', error);
    }
  }
  private async processVideoPublishWithSound(wj: WorkflowJobWithWorkflow) {
    const workflowRun = await this.db.workflowRun.upsert({
      where: {
        workflowJobId: wj.id,
      },
      update: {
        startedAt: new Date(),
        error: Prisma.DbNull,
        result: {},
      },
      create: {
        workflowId: wj.workflowId,
        workflowJobId: wj.id,
        result: {},
        startedAt: new Date(),
      },
    });
    try {
      console.log(`🚀 Processing Workflow Job: ${wj.id}`);
      const jobData = JSON.parse(wj.data as string) as {
        videoId: number;
        soundId: number;
        accountId: number;
      };
      const video = await this.db.video.findFirst({
        where: {
          id: jobData.videoId,
        },
        include: {
          idea: true,
        },
      });
      if (!video) {
        return this.handleFail('Video not found', workflowRun, wj);
      }
      const asset = await this.db.asset.findFirst({
        where: {
          id: jobData.soundId,
        },
      });
      if (!asset) {
        return this.handleFail('Asset not found', workflowRun, wj);
      }
      const account = await this.db.account.findFirst({
        where: {
          id: jobData.accountId,
        },
      });
      if (!account) {
        return this.handleFail('Account not found', workflowRun, wj);
      }
      const mergeAudioAndVideoPath = await this.videoService.mergeAudioAndVideo(
        video.path,
        asset.url,
      );
      const postDescriptionPrompt = `
        Write me a post about this idea to my video
        ${video.idea.description}
        `;
      const postDescription =
        await this.videoService.generateSocialMediaDescription(
          'video',
          postDescriptionPrompt,
        );
      //TODO publish process
      let externalId: string;
      // YouTube
      if (account.platform === 'youtube') {
        const result = await this.youtubeService.uploadShort(
          video.path,
          postDescription,
          postDescription,
          account,
        );
        externalId = result?.videoId as string;
      }
      // Instagram
      else if (account.platform === 'instagram') {
        await this.instagramService.setCurrentUser(account.id);
        externalId = await this.instagramService.uploadToInstagram(
          video.path,
          postDescription,
          'video',
        );
      }
      await this.db.post.create({
        data: {
          accountId: account.id,
          description: postDescription,
          videoId: video.id,
        },
      });

      await this.db.workflowJob.update({
        where: {
          id: wj.id,
        },
        data: {
          status: 'completed',
          completedAt: new Date(),
          workflowRunId: workflowRun.id,
        },
      });
    } catch (err) {
      await this.handleFail(
        `Error processing workflow job:${JSON.stringify(err)}`,
        workflowRun,
        wj,
      );
    }
  }
  private async processVideoIdeaFetching(wj: WorkflowJobWithWorkflow) {
    const workflowRun = await this.db.workflowRun.upsert({
      where: {
        workflowJobId: wj.id,
      },
      update: {
        startedAt: new Date(),
        error: Prisma.DbNull,
        result: {},
      },
      create: {
        workflowId: wj.workflowId,
        workflowJobId: wj.id,
        result: {},
        startedAt: new Date(),
      },
    });
    try {
      console.log(`🚀 Processing Workflow Job: ${wj.id}`);
      console.log(wj.data);
      const videoData = wj.data as {
        videoId: number;
        videoUrl: string;
      };
      const videoPath = await this.youtubeService.downloadShortById(
        videoData.videoId.toString(),
      );
      if (!videoPath) {
        return this.handleFail('Failed to download video', workflowRun, wj);
      }

      const frames = await this.videoService.extractFramesAsBase64(
        videoPath,
        10,
      );
      if (!frames || frames.length === 0) {
        console.log('No frames extracted from video');
      }

      const videoDescription = await this.videoService.describeVideo(videoPath);
      if (!videoDescription) {
        return this.handleFail('Failed to describe video', workflowRun, wj);
      }
      await this.db.idea.create({
        data: {
          url: videoData.videoUrl,
          description: videoDescription,
          sourceId: wj.workflow.sourceId,
          assets: {
            createMany: {
              data: frames.map((frame) => ({
                type: 'image',
                url: frame,
                metadata: Prisma.JsonNull,
              })),
            },
          },
        },
      });
      await this.db.workflowJob.update({
        where: {
          id: wj.id,
        },
        data: {
          status: 'completed',
          completedAt: new Date(),
          workflowRunId: workflowRun.id,
        },
      });
    } catch (error) {
      console.error(`Error processing workflow job ${wj.id}:`, error);
      await this.handleFail(
        `Error processing workflow job:${JSON.stringify(error)}`,
        workflowRun,
        wj,
      );
    }
  }
  private async processVideoGeneration(wj: WorkflowJobWithWorkflow) {
    const extendedWorkflow = await this.db.workflow.findFirst({
      where: {
        id: wj.workflowId,
      },
      include: {
        preset: {
          include: {
            assets: true,
            videoPrompt: true,
            audioPrompt: true,
          },
        },
        source: true,
      },
    });

    const workflowRun = await this.db.workflowRun.upsert({
      where: {
        workflowJobId: wj.id,
      },
      update: {
        startedAt: new Date(),
        error: Prisma.DbNull,
        result: {},
      },
      create: {
        workflowId: wj.workflowId,
        workflowJobId: wj.id,
        result: {},
        startedAt: new Date(),
      },
    });
    if (!extendedWorkflow) {
      return this.handleFail('Extended workflow not found', workflowRun, wj);
    }
    try {
      console.log(`🚀 Processing Workflow Job: ${wj.id}`);
      const imageReferences =
        extendedWorkflow.preset?.assets.map((x) => {
          return {
            mimeType: 'image/png',
            //TODO change when move to S3
            imageBytes: x.url,
          };
        }) ?? [];
      if (!extendedWorkflow.preset?.videoPrompt?.content) {
        throw new Error('Video prompt not found');
      }

      const parsedData = wj.data as {
        ideaId: number;
      };
      const idea = await this.db.idea.findFirst({
        where: { id: parsedData.ideaId },
      });
      if (!idea) {
        return this.handleFail('Idea not found', workflowRun, wj);
      }
      const prompt = `
    ${extendedWorkflow.preset.videoPrompt?.content}

    Reference video style and characteristics:
    ${idea.description}
    ${
      imageReferences.length > 0
        ? `
If face reference images are provided, replace the original subject’s face with the face from the reference images. Use the remaining reference images to guide the overall visual style, mood, lighting, framing, and aesthetic of the video. Maintain natural facial expressions, realistic skin tones, and seamless face integration throughout the motion.`
        : ''
    }
    
    ${
      extendedWorkflow.preset.audioPrompt?.content ??
      `
    Audio:
    """Copy from reference video"""
    `
    }
    `;

      const media = await this.videoService.generateVideo(
        prompt,
        extendedWorkflow.model,
        imageReferences,
      );
      await this.db.video.create({
        data: {
          workflowJobId: wj.id,
          ideaId: idea.id,
          path: media,
        },
      });
      await this.db.workflowJob.update({
        where: {
          id: wj.id,
        },
        data: {
          status: 'completed',
          completedAt: new Date(),
          workflowRunId: workflowRun.id,
        },
      });
    } catch (err) {
      await this.handleFail(
        `Error generating video: ${JSON.stringify(err)}`,
        workflowRun,
        wj,
      );
    }
  }
  private async generateVideo(
    workflow: WorkflowExtended,
    assets: Asset[],
    videoDescription: string,
  ) {
    // if (workflow.mediaType === 'image') {
    //   if (workflow.source.type === 'youtube') {
    //     throw new Error("Can't generate a image from YouTube video");
    //   }
    //   if (!workflow.preset.imagePrompt) {
    //     throw new Error('Image prompt not found');
    //   }
    //   if (!reference.text) {
    //     throw new Error('Reference text not found');
    //   }
    //   return await this.videoService.generatePhoto(
    //     workflow.preset.imagePrompt.content,
    //   );
    // }
  }
  private async handleFail(
    message: string,
    workflowRun: WorkflowRun,
    wj: WorkflowJobWithWorkflow,
  ) {
    await this.db.workflowRun.update({
      where: { id: workflowRun.id },
      data: { error: message, completedAt: new Date() },
    });
    await this.db.workflowJob.update({
      where: {
        id: wj.id,
      },
      data: {
        status: 'failed',
        completedAt: new Date(),
        workflowRunId: workflowRun.id,
      },
    });
    return;
  }
}
