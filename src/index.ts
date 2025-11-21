import axios from "axios";
import * as childProcess from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { GoogleGenAI, Part } from '@google/genai';

const YOUTUBE_API_KEY = "AIzaSyBvjeyozJDDU9rGqMeEKAEuDOK4QBaxqog";
const CHANNEL_NAME = "DevSoutinho";
// Client Gemini: GEMINI_API_KEY key of the environment
const ai = new GoogleGenAI({});
const exec = promisify(childProcess.exec);
const unlink = promisify(fs.unlink); // delete local file


/**
 * Converts the local audio file into a base64-encoded Part object for the Gemini API.
 */
function fileToGenerativePart(filePath: string, mimeType: string): Part {
  return {
    inlineData: {
      data: fs.readFileSync(filePath).toString("base64"),
      mimeType,
    },
  };
}

async function findChannel(nome: string): Promise<string | null> {
    const url = "https://www.googleapis.com/youtube/v3/search";
    const params = { part: "snippet", q: nome, type: "channel", key: YOUTUBE_API_KEY, maxResults: 1 };
    try {
        const res = await axios.get(url, { params });
        return res.data.items.length ? res.data.items[0].id.channelId : null;
    } catch (error) {
        console.error("Error searching for channel:", (error as Error).message);
        return null;
    }
}

async function findFirstShort(channelId: string): Promise<string | null> {
    const url = "https://www.googleapis.com/youtube/v3/search";
    const params = {
        part: "snippet", channelId: channelId, type: "video",
        videoDuration: "short", order: "date", maxResults: 1, key: YOUTUBE_API_KEY,
    };
    try {
        const res = await axios.get(url, { params });
        return res.data.items.length ? res.data.items[0].id.videoId : null;
    } catch (error) {
        console.error("Error searching for Shorts:", (error as Error).message);
        return null;
    }
}

async function downloadAudio(videoUrl: string): Promise<string> {
    const tempDir = os.tmpdir();
    const filePath = path.join(tempDir, `audio_${Date.now()}.mp3`);
    // yt-dlp: Extract the audio and save it as an MP3 file.
    const command = `yt-dlp -x --audio-format mp3 -o "${filePath}" "${videoUrl}"`;

    await exec(command);
    return filePath;
}

async function transcribeAudio(localFilePath: string): Promise<string> {
    // Converts the local audio file to Gemini format.
    const audioPart = fileToGenerativePart(localFilePath, "audio/mp3");
    // Define the transcription prompt.
    const prompt = `Transcribe the provided audio in its entirety. Output the transcription in the original spoken language. Do not add any comments, introductions, or extra formatting—only the transcribed text.`;
    // API
    const response = await ai.models.generateContent({
        model: "gemini-2.5-pro",
        contents: [audioPart, prompt],
        config: {
            temperature: 0.1,
        }
    });

    return response.text || "";
}

async function cleanupFiles(localFilePath: string): Promise<void> {
    await unlink(localFilePath);
}

export async function getAudioTranscription(videoUrl: string): Promise<string> {
    let localFilePath: string | null = null;

    try {
        localFilePath = await downloadAudio(videoUrl);
        const transcription = await transcribeAudio(localFilePath);
        return transcription;
    } catch (error) {
        console.error("ERROR IN THE TRANSCRIPTION PROCESS (Gemini):", (error as Error).message);
        throw new Error("Audio transcription error.");
    } finally {
        if (localFilePath) {
            await cleanupFiles(localFilePath).catch(err => console.error("Error:", err));
        }
    }
}

async function abrirShortsETranscrever() {
    const channelId = await findChannel(CHANNEL_NAME);
    if (!channelId) return console.log("Channel not found.");

    const videoId = await findFirstShort(channelId);
    if (!videoId) return console.log("No shorts found.");

    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    console.log(`Vídeo: ${videoUrl}`);

    try {
        const transcricao = await getAudioTranscription(videoUrl);

        console.log("Transcription:");
        console.log(transcricao);

    } catch (e) {
        console.error("The transcription process failed.");
    }
}


abrirShortsETranscrever().catch(console.error);