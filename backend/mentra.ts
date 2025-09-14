import pkg from '@mentra/sdk';
const { AppServer, AppSession } = pkg;
import express from 'express';
import type { Request, Response } from 'express';
import dotenv from 'dotenv';

// Load environment variables from parent directory
dotenv.config({ path: '../.env' });

const PACKAGE_NAME = process.env.PACKAGE_NAME ?? (() => { throw new Error('PACKAGE_NAME is not set in .env file'); })();
const MENTRAOS_API_KEY = process.env.MENTRAOS_API_KEY ?? (() => { throw new Error('MENTRAOS_API_KEY is not set in .env file'); })();
const PORT = parseInt(process.env.PORT || '3000');
const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL || 'http://127.0.0.1:8000';

// TTS Configuration
const ELEVENLABS_VOICE_ID = process.env.ELEVENLABS_VOICE_ID;
const TTS_MODEL = process.env.TTS_MODEL || 'eleven_flash_v2_5';
const TTS_STABILITY = parseFloat(process.env.TTS_STABILITY || '0.7');
const TTS_SIMILARITY_BOOST = parseFloat(process.env.TTS_SIMILARITY_BOOST || '0.8');
const TTS_STYLE = parseFloat(process.env.TTS_STYLE || '0.3');
const TTS_SPEED = parseFloat(process.env.TTS_SPEED || '0.9');

// TypeScript interfaces
interface PhotoData {
  requestId: string;
  buffer: Buffer;
  timestamp: Date;
  mimeType: string;
  filename: string;
  size: number;
  userId: string;
  prompt: string;
  aiAnalysis: string | null;
}

interface TTSOptions {
  model_id?: string;
  voice_settings?: {
    stability?: number;
    similarity_boost?: number;
    style?: number;
    speed?: number;
  };
}

interface TTSResult {
  success: boolean;
  error?: string;
}

const photos: PhotoData[] = []; // Latest photo is always photos[photos.length - 1]

class MentraBridgeServer extends AppServer {
  constructor() {
    super({
      packageName: PACKAGE_NAME,
      apiKey: MENTRAOS_API_KEY,
      port: PORT,
      mentraOSWebsocketUrl: 'wss://uscentralapi.mentra.glass/app-ws',
    } as any);
    this.setupRoutes();
  }

  async onSession(session: any, sessionId: string, userId: string): Promise<void> {
    this.logger.info(`Session started for user ${userId}`);

    session.events.onError((error: any) => {
      this.logger.error(`Session error for user ${userId}:`, error);
    });

    session.events.onDisconnected(() => {
      this.logger.info(`Session disconnected for user ${userId}`);
    });

    const unsubscribe = session.events.onTranscription((data: any) => {
      if (!data.isFinal) return;
      const spokenText = data.text.toLowerCase().trim().replace(/,/g, "");
      this.logger.debug(`Heard: "${spokenText}"`);
       if (spokenText.includes('hey little chef')) {
         this.logger.info("🎤 Voice activation phrase detected!");
         this.logger.info(`📝 Full spoken text: "${data.text}"`);

         // Speak confirmation to glasses
         this.speakToGlasses(session, "I heard you! Taking a photo now...").catch((error: any) => {
           this.logger.error(`TTS confirmation error: ${error.message || error}`);
         });

         this.takePhoto(session, userId, data.text).catch((error: any) => {
           this.logger.error(`Photo capture error: ${error.message || error}`);
         });
       }
    });

    this.addCleanupHandler(unsubscribe);
  }

   async takePhoto(session: any, userId: string, spokenText: string): Promise<void> {
     try {
       this.logger.info(`📸 Photo request sent for user ${userId}`);
       const startTime = Date.now();

       // Try to see if there are any camera options
       this.logger.info(`📸 Camera object type: ${typeof session.camera}`);
       this.logger.info(`📸 Camera methods: ${Object.getOwnPropertyNames(session.camera)}`);
       this.logger.info(`📸 Camera prototype methods: ${Object.getOwnPropertyNames(Object.getPrototypeOf(session.camera))}`);
       
       const photo = await session.camera.requestPhoto();
       const captureTime = Date.now() - startTime;

       this.logger.info(`📸 Photo received, timestamp: ${photo.timestamp}`);
       this.logger.info(`⏱️  Photo capture took: ${captureTime}ms`);
       this.logger.info(`📊 Photo size: ${photo.size} bytes, mimeType: ${photo.mimeType}`);

       // Store photo data: buffer + metadata + spoken text
       const photoData: PhotoData = {
         requestId: photo.requestId,
         buffer: photo.buffer,
         timestamp: photo.timestamp,
         mimeType: photo.mimeType,
         filename: photo.filename,
         size: photo.size,
         userId,
         prompt: spokenText,
         aiAnalysis: null // Will be filled by AI call
       };
       photos.push(photoData);



       // Photo captured successfully

      const base64StartTime = Date.now();
      const imageBase64 = photo.buffer.toString('base64');
      const base64Time = Date.now() - base64StartTime;
      
      this.logger.info(`🤖 Starting AI analysis...`);
      this.logger.info(`📸 Sending base64 image directly to Python backend`);
      this.logger.info(`📸 Photo requestId: ${photo.requestId}`);
      this.logger.info(`📸 Image size: ${imageBase64.length} characters`);
      this.logger.info(`⏱️  Base64 conversion took: ${base64Time}ms`);
      
      const aiStartTime = Date.now();
      const aiAnalysis = await this.callPythonBackendDirect(imageBase64, spokenText, photo.mimeType);
      const aiTime = Date.now() - aiStartTime;
      this.logger.info(`⏱️  AI analysis took: ${aiTime}ms`);
       
       // Update photo data with AI analysis
       photoData.aiAnalysis = aiAnalysis;

       // Speak AI analysis to glasses using TTS
       this.logger.info(`🔊 Speaking AI analysis to glasses...`);

       // Validate AI analysis before speaking
       if (!aiAnalysis || typeof aiAnalysis !== 'string' || aiAnalysis.trim().length === 0) {
         this.logger.error(`❌ AI analysis is invalid: ${aiAnalysis}`);
         await this.speakToGlasses(session, "Sorry, I couldn't analyze the image properly. Please try again.");
         return;
       }

       // First speak a brief status message
       await this.speakToGlasses(session, "Analysis complete. Here's what I found:");

       // Then speak the full AI analysis
       const ttsResult = await this.speakToGlasses(session, aiAnalysis, {
         model_id: "eleven_flash_v2_5", // Fast model for real-time response
         voice_settings: {
           stability: 0.7,
           similarity_boost: 0.8,
           style: 0.3,
           speed: 0.9
         }
       });

       if (ttsResult.success) {
         this.logger.info("✅ AI analysis successfully spoken to glasses");
       } else {
         this.logger.error(`❌ Failed to speak AI analysis: ${ttsResult.error}`);
         // Fallback: speak a simple error message
         await this.speakToGlasses(session, "Sorry, I couldn't read the analysis aloud, but you can see it on the screen.");
       }


     } catch (error: any) {
       this.logger.error(`Error taking photo: ${error.message || error}`);
     }
   }


  async onStop(sessionId: string, userId: string, reason: string): Promise<void> {
    this.logger.info(`Session stopped for user ${userId}, reason: ${reason}`);
  }

  /**
   * Text-to-Speech function using MentraOS built-in TTS
   */
  async speakToGlasses(session: any, text: string, options: TTSOptions = {}): Promise<TTSResult> {
    try {
      if (!text || typeof text !== 'string' || text.trim().length === 0) {
        this.logger.error(`❌ Invalid text for TTS: ${text}`);
        return { success: false, error: 'Invalid text input' };
      }

      this.logger.info(`🔊 Speaking to glasses: "${text.substring(0, 50)}..."`);

      const result = await session.audio.speak(text);

      if (result.success) {
        this.logger.info("TTS successful - Message spoken");
      } else {
        this.logger.error(`❌ TTS failed: ${result.error}`);
      }

      return result;
    } catch (error: any) {
      this.logger.error(`❌ TTS exception: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Call Python backend for AI analysis with base64 image (OPTIMIZED)
   */
  async callPythonBackendDirect(imageBase64: string, prompt: string, mimeType: string): Promise<string> {
    try {
      this.logger.info(`🤖 Calling Python backend for AI analysis (base64 direct)`);
      this.logger.info(`📸 Image size: ${imageBase64.length} characters`);
      this.logger.info(`💬 Prompt: ${prompt}`);

      const response = await fetch(`${PYTHON_BACKEND_URL}/inference-direct`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image_base64: imageBase64,
          mime_type: mimeType,
          prompt: prompt
        })
      });

      if (!response.ok) {
        throw new Error(`Python backend error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      this.logger.info(`AI analysis response structure: ${JSON.stringify(data, null, 2)}`);
      this.logger.info(`AI analysis data type: ${typeof data.data}`);
      this.logger.info(`AI analysis data value: ${data.data}`);

      if (data.data && typeof data.data === 'string') {
        this.logger.info(`AI analysis received: ${data.data.substring(0, 100)}...`);
        this.logger.info(`FULL AI ANALYSIS RESULT: ${data.data}`);
        return data.data;
      } else {
        this.logger.error(`❌ Invalid AI analysis response: ${JSON.stringify(data)}`);
        return `AI analysis failed: Invalid response format`;
      }
    } catch (error: any) {
      this.logger.error(`❌ Python backend call failed: ${error.message || error}`);
      return `AI analysis failed: ${error.message || error}`;
    }
  }

  /**
   * Call Python backend for AI analysis (LEGACY - with URL)
   */
  async callPythonBackend(imageUrl: string, prompt: string): Promise<string> {
    try {
      this.logger.info(`🤖 Calling Python backend for AI analysis`);
      this.logger.info(`📸 Image URL: ${imageUrl}`);
      this.logger.info(`💬 Prompt: ${prompt}`);

      const response = await fetch(`${PYTHON_BACKEND_URL}/inference`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image_url: imageUrl,
          prompt: prompt
        })
      });

      if (!response.ok) {
        throw new Error(`Python backend error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      this.logger.info(`AI analysis received: ${data.data.substring(0, 100)}...`);
      this.logger.info(`FULL AI ANALYSIS RESULT: ${data.data}`);
      
      return data.data;
    } catch (error: any) {
      this.logger.error(`❌ Python backend call failed: ${error.message || error}`);
      return `AI analysis failed: ${error.message || error}`;
    }
  }

  setupRoutes(): void {
    const app = this.getExpressApp();

    // Simple health check endpoint
    app.get('/health', (req: Request, res: Response) => {
      res.json({
        status: 'ok',
        message: 'Mentra Bridge Server is running',
        totalPhotos: photos.length
      });
    });

    // API endpoint to get photo count and latest status
    app.get('/api/status', (req: Request, res: Response) => {
      const latestPhoto = photos.length > 0 ? photos[photos.length - 1] : null;
      res.json({
        totalPhotos: photos.length,
        latestPhoto: latestPhoto ? {
          requestId: latestPhoto.requestId,
          timestamp: latestPhoto.timestamp.getTime(),
          size: latestPhoto.size,
          prompt: latestPhoto.prompt,
          hasAIAnalysis: !!latestPhoto.aiAnalysis
        } : null,
        pythonBackendUrl: PYTHON_BACKEND_URL
      });
    });

    // Clear photos endpoint for maintenance
    app.post('/api/clear-photos', (req: Request, res: Response) => {
      const count = photos.length;
      photos.length = 0;
      this.logger.info(`🗑️ Cleared ${count} photos`);
      res.json({ message: `Cleared ${count} photos` });
    });
  }
}

// Start the bridge server
console.log('🌉 Starting Mentra Bridge Server...');
console.log(`📦 Package: ${PACKAGE_NAME}`);
console.log(`🔌 Port: ${PORT}`);
console.log(`🐍 Python Backend: ${PYTHON_BACKEND_URL}`);
console.log(`🔑 API Key: ${MENTRAOS_API_KEY ? `${MENTRAOS_API_KEY.substring(0, 8)}...` : 'NOT SET'}`);

const app = new MentraBridgeServer();

app.start().then(() => {
  console.log('✅ Mentra Bridge Server started successfully');
  console.log('📱 Connect your MentraOS glasses to start processing');
  console.log('🎤 Say "hey little chef" to take photos with AI analysis');
}).catch(error => {
  console.error('❌ Failed to start bridge server:', error);
  process.exit(1);
});
