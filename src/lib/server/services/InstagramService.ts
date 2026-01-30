import type { InstagramApi } from '../infrastructure/InstagramApi';

export class InstagramService {
  constructor(private instagramApi: InstagramApi) {}

  public async uploadToInstagram(videoPath: string, title: string) {
    try {
      const initRes = await this.instagramApi.uploadReel(
        videoPath,
        title,
      );
      console.log('initRes: ', initRes);
    } catch (error) {
      console.error('Error uploadToInstagram:', error);
      throw error;
    }
  }

  public async postImageToInstagram(imageUrl: string, title: string) {
    try {
      const resId = await this.instagramApi.uploadImage(imageUrl, title);
      console.log('Post realizado com ID:', resId);
      return resId
    } catch (error) {
      console.error('Falha no InstagramService:', error);
      throw error;
    }
  }
}