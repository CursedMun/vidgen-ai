export interface UploadOptions {
  videoPath: string;
  caption?: string;
  description?: string;
  title?: string;
  tags?: string[];
  accountId: number;
  metadata?: Record<string, any>;
}

export interface UploadResult {
  success: boolean;
  postId?: string;
  url?: string;
  error?: string;
}

export abstract class BaseSocialMedia {
  constructor() {}

  /**
   * Upload media to the social platform
   */
  abstract upload(options: UploadOptions): Promise<UploadResult>;

  /**
   * Get the platform name
   */
  abstract getPlatform(): string;
}
