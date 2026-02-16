import {
  X_APP_KEY,
  X_APP_SECRET
} from '$env/static/private';
import { TwitterApi } from 'twitter-api-v2';
import type { RequestHandler } from './$types';
// /api/login POST

export const GET: RequestHandler = async ({ url, cookies }) => {
  try {
    const oauth_token = url.searchParams.get("oauth_token");
    const oauth_verifier = url.searchParams.get("oauth_verifier");
    const oauth_token_secret = cookies.get('tw_oauth_secret');
    console.log('oauth_token_secret: ', oauth_token_secret);

    if (!oauth_token || !oauth_verifier) {
        return  new Response('Unauthorized', {
            status: 401,
          });
      }

      const client = new TwitterApi({
        appKey: X_APP_KEY,
        appSecret: X_APP_SECRET,
        accessToken: oauth_token,
        accessSecret: oauth_token_secret,
      });

      const loggedClient = await client.login(oauth_verifier)
      cookies.delete('tw_oauth_secret', { path: '/' });
      await loggedClient.client.v2.tweet("Teste de postagem apenas texto!")
    return new Response("")
  } catch (e) {
    console.error(e);
    return new Response('Unauthorized', {
      status: 401,
    });
  }
}