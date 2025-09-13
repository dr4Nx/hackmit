import pkg from '@mentra/sdk';
const { AppServer, AppSession } = pkg;
import express from 'express';
import dotenv from 'dotenv';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';

// Load environment variables
dotenv.config();

const PACKAGE_NAME = process.env.PACKAGE_NAME ?? (() => { throw new Error('PACKAGE_NAME is not set in .env file'); })();
const MENTRAOS_API_KEY = process.env.MENTRAOS_API_KEY ?? (() => { throw new Error('MENTRAOS_API_KEY is not set in .env file'); })();
const PORT = parseInt(process.env.PORT || '3000');
const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL || 'http://127.0.0.1:8000';

const photos = []; // Latest photo is always photos[photos.length - 1]

class VideoStreamApp extends AppServer {
  constructor() {
    super({
      packageName: PACKAGE_NAME,
      apiKey: MENTRAOS_API_KEY,
      port: PORT,
      mentraOSWebsocketUrl: 'wss://uscentralapi.mentra.glass/app-ws',
    });
    this.wsClients = new Set();
    this.setupRoutes();
    this.setupWebSocket();
  }

  async onSession(session, sessionId, userId) {
    this.logger.info(`Session started for user ${userId}`);

    session.events.onError(error => {
      this.logger.error(`Session error for user ${userId}:`, error);
    });

    session.events.onDisconnected(() => {
      this.logger.info(`Session disconnected for user ${userId}`);
    });

    const unsubscribe = session.events.onTranscription(data => {
      if (!data.isFinal) return;
      const spokenText = data.text.toLowerCase().trim().replace(/,/g, "");
      this.logger.debug(`Heard: "${spokenText}"`);
       if (spokenText.includes('hey little chef')) {
         this.logger.info("🎤 Voice activation phrase detected!");
         this.logger.info(`📝 Full spoken text: "${data.text}"`);

         // Broadcast the full spoken text to frontend
         this.broadcastVoiceDetected(data.text);

         this.takePhoto(session, userId, data.text).catch(error => {
           this.logger.error(`Photo capture error: ${error}`);
         });
       }
    });

    this.addCleanupHandler(unsubscribe);
  }

   async takePhoto(session, userId, spokenText) {
     try {
       this.logger.info(`📸 Photo request sent for user ${userId}`);

       const photo = await session.camera.requestPhoto();

       this.logger.info(`📸 Photo received, timestamp: ${photo.timestamp}`);

       // Store photo data: buffer + metadata + spoken text
       const photoData = {
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

       // UI feedback
       session.layouts.showTextWall("✅ Photo captured!");

       this.broadcastPhotoUpdate(photoData, spokenText);

       // NEW: Call Python backend for AI analysis
       const fullImageUrl = `https://boilingly-unironed-sharell.ngrok-free.app/api/photo/${photo.requestId}`;
       this.logger.info(`🤖 Starting AI analysis...`);
       this.logger.info(`📸 Full image URL being sent to Python backend: ${fullImageUrl}`);
       this.logger.info(`📸 Photo requestId: ${photo.requestId}`);
       this.logger.info(`📸 Photo exists in photos array: ${photos.some(p => p.requestId === photo.requestId)}`);
       session.layouts.showTextWall("🤖 Analyzing with AI...");
       
       const aiAnalysis = await this.callPythonBackend(fullImageUrl, spokenText);
       
       // Update photo data with AI analysis
       photoData.aiAnalysis = aiAnalysis;
       
       // Broadcast AI analysis update
       this.broadcastAIAnalysis(photoData);

       // UI feedback
       session.layouts.showTextWall("✅ AI analysis complete!");

     } catch (error) {
       this.logger.error(`Error taking photo: ${error}`);
       session.layouts.showTextWall("❌ Photo failed");
     }
   }

  setupWebSocket() {
    const server = createServer();
    this.wss = new WebSocketServer({ server });

    this.wss.on('connection', ws => {
      this.wsClients.add(ws);
      this.logger.info('WebSocket client connected');

      ws.on('close', () => {
        this.wsClients.delete(ws);
        this.logger.info('WebSocket client disconnected');
      });

      ws.on('error', error => {
        this.logger.error('WebSocket error:', error);
        this.wsClients.delete(ws);
      });
    });
    server.listen(PORT + 1, () => {
      this.logger.info(`WebSocket server running on port ${PORT + 1}`);
    });
  }

   /* Broadcast voice detected with full spoken text */
   broadcastVoiceDetected(fullSpokenText) {
     const message = JSON.stringify({
       type: 'voice_detected',
       data: { 
         message: 'Voice detected! Taking photo...',
         spokenText: fullSpokenText
       }
     });
     this.wsClients.forEach(client => {
       if (client.readyState === 1) {
         client.send(message);
       }
     });
   }

  broadcastPhotoUpdate(photoData, spokenText) {
    const quickMessage = JSON.stringify({
      type: 'photo_captured',
      data: {
        requestId: photoData.requestId,
        timestamp: photoData.timestamp.getTime(),
        url: `/api/photo/${photoData.requestId}`,
        size: photoData.size,
        prompt: spokenText
      }
    });
    this.wsClients.forEach(client => {
      if (client.readyState === 1) {
        client.send(quickMessage);
      }
    });
  }

  /**
   * Broadcast AI analysis update to frontend
   */
  broadcastAIAnalysis(photoData) {
    const message = JSON.stringify({
      type: 'ai_analysis',
      data: {
        requestId: photoData.requestId,
        aiAnalysis: photoData.aiAnalysis,
        prompt: photoData.prompt
      }
    });
    this.wsClients.forEach(client => {
      if (client.readyState === 1) {
        client.send(message);
      }
    });
  }

  async onStop(sessionId, userId, reason) {
    this.logger.info(`Session stopped for user ${userId}, reason: ${reason}`);
  }

  /**
   * Call Python backend for AI analysis
   */
  async callPythonBackend(imageUrl, prompt) {
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
    } catch (error) {
      this.logger.error(`❌ Python backend call failed: ${error.message}`);
      return `AI analysis failed: ${error.message}`;
    }
  }

  setupRoutes() {
    const app = this.getExpressApp();
    app.use(express.static('public'));

    app.get('/', (req, res) => {
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>MentraOS Video Stream</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 0; 
              padding: 20px; 
              background: #f0f0f0;
            }
            .container { 
              max-width: 1200px; 
              margin: 0 auto; 
              background: white; 
              padding: 20px; 
              border-radius: 10px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            h1 { 
              text-align: center; 
              color: #333; 
              margin-bottom: 30px;
            }
            .video-container { 
              text-align: center; 
              margin: 20px 0;
            }
            .video-stream { 
              max-width: 100%; 
              height: auto; 
              border: 2px solid #ddd; 
              border-radius: 10px;
              background: #000;
            }
            .controls { 
              text-align: center; 
              margin: 20px 0;
            }
            .status { 
              text-align: center; 
              margin: 20px 0; 
              padding: 10px; 
              background: #e8f5e8; 
              border-radius: 5px;
            }
            .photo-grid { 
              display: grid; 
              grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); 
              gap: 10px; 
              margin: 20px 0;
            }
            .photo-item { 
              border: 1px solid #ddd; 
              border-radius: 5px; 
              overflow: hidden;
            }
            .photo-item img { 
              width: 100%; 
              height: 150px; 
              object-fit: cover;
            }
            .photo-info { 
              padding: 10px; 
              font-size: 12px; 
              background: #f9f9f9;
            }
            button { 
              background: #007bff; 
              color: white; 
              border: none; 
              padding: 10px 20px; 
              border-radius: 5px; 
              cursor: pointer; 
              margin: 5px;
            }
            button:hover { 
              background: #0056b3; 
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>📸 MentraOS Video Stream</h1>
            
            <div class="status">
              <p>🎤 Say "hey little chef" to take photos with your MentraOS glasses!</p>
              <p>📸 Photos will appear below automatically with AI analysis</p>
              <p>🔗 Image URLs are displayed for each photo</p>
            </div>

            <div class="spoken-text" id="spokenText" style="text-align: center; margin: 20px 0; padding: 15px; background: #f8f9fa; border-radius: 5px; border-left: 4px solid #007bff; font-style: italic; display: none;">
              <strong>You said:</strong> <span id="spokenTextContent"></span>
            </div>

            <div class="controls">
              <button onclick="refreshPhotos()">🔄 Refresh Photos</button>
              <button onclick="clearPhotos()">🗑️ Clear All</button>
            </div>

            <div class="video-container">
              <h3>Latest Photo Stream</h3>
              <img id="latestPhoto" class="video-stream" src="/api/latest-photo-image" alt="No photo yet" style="display: none;">
              <div id="noPhoto" style="text-align: center; padding: 50px; color: #666;">
                No photos yet. Say "computer" to take a photo!
              </div>
              <div id="latestPhotoUrl" style="text-align: center; margin-top: 10px; padding: 10px; background: #f8f9fa; border-radius: 5px; display: none;">
                <strong>Latest Photo URL:</strong><br>
                <a id="latestPhotoLink" href="#" target="_blank" style="color: #007bff; word-break: break-all;">Loading...</a>
              </div>
            </div>

            <div class="photo-grid" id="photoGrid">
              <!-- Photos will be loaded here -->
            </div>
          </div>

          <script>
            let photoCount = 0;
            
            // Connect to WebSocket for real-time updates
            let ws = null;
            function connectWebSocket() {
              const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
              const wsUrl = \`\${protocol}//\${window.location.hostname}:3001\`;
              
              ws = new WebSocket(wsUrl);
              
              ws.onopen = function() {
                console.log('WebSocket connected');
              };
              
              ws.onmessage = function(event) {
                const message = JSON.parse(event.data);
                console.log('WebSocket message received:', message);
                if (message.type === 'voice_detected') {
                  console.log('Voice detected! Spoken text:', message.data.spokenText);
                  showVoiceFeedback(message.data.spokenText);
                } else if (message.type === 'photo_captured') {
                  console.log('Photo captured! Showing URL immediately');
                  showPhotoUrl(message.data);
                  addPhotoToGrid(message.data);
                } else if (message.type === 'ai_analysis') {
                  console.log('AI analysis received!');
                  updatePhotoWithAI(message.data);
                }
              };
              
              ws.onclose = function() {
                console.log('WebSocket disconnected, reconnecting...');
                setTimeout(connectWebSocket, 1000);
              };
              
              ws.onerror = function(error) {
                console.error('WebSocket error:', error);
              };
            }
            
            // Start WebSocket connection
            connectWebSocket();
            
            // Show immediate feedback when voice is detected
            function showVoiceFeedback(spokenText) {
              console.log('showVoiceFeedback called with:', spokenText);
              const status = document.querySelector('.status');
              const spokenTextDiv = document.getElementById('spokenText');
              const spokenTextContent = document.getElementById('spokenTextContent');
              
              console.log('Elements found:', { status, spokenTextDiv, spokenTextContent });
              
              // Show the spoken text
              if (spokenText) {
                console.log('Setting spoken text:', spokenText);
                spokenTextContent.textContent = spokenText;
                spokenTextDiv.style.display = 'block';
              } else {
                console.log('No spoken text provided');
              }
              
              // Show status message
              const originalHTML = status.innerHTML;
              status.innerHTML = '<p style="color: #28a745; font-weight: bold;">🎤 Voice detected! Taking photo...</p>';
              setTimeout(() => {
                status.innerHTML = originalHTML;
              }, 3000);
            }
            
            // Show photo URL immediately (before image loads)
            function showPhotoUrl(photoData) {
              const latestPhotoUrl = document.getElementById('latestPhotoUrl');
              const latestPhotoLink = document.getElementById('latestPhotoLink');
              const fullUrl = window.location.origin + photoData.url;
              
              latestPhotoLink.href = photoData.url;
              latestPhotoLink.textContent = fullUrl;
              latestPhotoUrl.style.display = 'block';
              
              // Show success message
              const status = document.querySelector('.status');
              const originalHTML = status.innerHTML;
              status.innerHTML = '<p style="color: #28a745; font-weight: bold;">✅ Photo captured! URL ready below.</p>';
              setTimeout(() => {
                status.innerHTML = originalHTML;
              }, 3000);
            }
            
            // Add photo to grid without polling
            function addPhotoToGrid(photoData) {
              const photoGrid = document.getElementById('photoGrid');
              const latestPhoto = document.getElementById('latestPhoto');
              const noPhoto = document.getElementById('noPhoto');
              
              // Update latest photo
              latestPhoto.src = photoData.url;
              latestPhoto.style.display = 'block';
              noPhoto.style.display = 'none';
              
              // Add to grid (prepend to show newest first)
              const photoItem = document.createElement('div');
              photoItem.className = 'photo-item';
              photoItem.id = \`photo-\${photoData.requestId}\`;
              photoItem.innerHTML = \`
                <img src="\${photoData.url}" alt="Photo \${photoData.requestId}">
                <div class="photo-info">
                  <div>📅 \${new Date(photoData.timestamp).toLocaleString()}</div>
                  <div>🆔 \${photoData.requestId.substring(0, 8)}...</div>
                  <div>📏 \${Math.round(photoData.size / 1024)}KB</div>
                  <div style="margin-top: 8px; padding: 4px; background: #e8f4fd; border-radius: 3px; font-size: 11px; font-style: italic;">
                    💬 "\${photoData.prompt || 'No prompt'}"
                  </div>
                  <div id="ai-analysis-\${photoData.requestId}" style="margin-top: 8px; padding: 4px; background: #f0f8ff; border-radius: 3px; font-size: 10px; display: none;">
                    🤖 <strong>AI Analysis:</strong> <span id="ai-text-\${photoData.requestId}">Analyzing...</span>
                  </div>
                  <div style="margin-top: 8px; padding: 4px; background: #f0f0f0; border-radius: 3px; font-size: 10px; word-break: break-all;">
                    🔗 <a href="\${photoData.url}" target="_blank">\${photoData.url}</a>
                  </div>
                </div>
              \`;
              
              // Insert at the beginning of the grid
              photoGrid.insertBefore(photoItem, photoGrid.firstChild);
            }

            // Update photo with AI analysis
            function updatePhotoWithAI(data) {
              const aiAnalysisDiv = document.getElementById(\`ai-analysis-\${data.requestId}\`);
              const aiTextSpan = document.getElementById(\`ai-text-\${data.requestId}\`);
              
              if (aiAnalysisDiv && aiTextSpan) {
                aiTextSpan.textContent = data.aiAnalysis;
                aiAnalysisDiv.style.display = 'block';
                console.log('AI analysis updated for photo:', data.requestId);
              }
            }
            
            // Fallback polling every 2 seconds
            setInterval(refreshPhotos, 2000);
            
            async function refreshPhotos() {
              try {
                const response = await fetch('/api/all-photos');
                const photos = await response.json();
                
                const photoGrid = document.getElementById('photoGrid');
                const latestPhoto = document.getElementById('latestPhoto');
                const noPhoto = document.getElementById('noPhoto');
                const latestPhotoUrl = document.getElementById('latestPhotoUrl');
                const latestPhotoLink = document.getElementById('latestPhotoLink');
                
                if (photos.length > 0) {
                  // Show latest photo
                  const latest = photos[0];
                  const photoUrl = \`/api/photo/\${latest.requestId}\`;
                  latestPhoto.src = photoUrl;
                  latestPhoto.style.display = 'block';
                  noPhoto.style.display = 'none';
                  
                  // Show latest photo URL
                  latestPhotoLink.href = photoUrl;
                  latestPhotoLink.textContent = window.location.origin + photoUrl;
                  latestPhotoUrl.style.display = 'block';
                  
                  // Update photo grid
                  photoGrid.innerHTML = photos.map(photo => \`
                    <div class="photo-item">
                      <img src="/api/photo/\${photo.requestId}" alt="Photo \${photo.requestId}">
                      <div class="photo-info">
                        <div>📅 \${new Date(photo.timestamp).toLocaleString()}</div>
                        <div>🆔 \${photo.requestId.substring(0, 8)}...</div>
                        <div>📏 \${Math.round(photo.size / 1024)}KB</div>
                        <div style="margin-top: 8px; padding: 4px; background: #f0f0f0; border-radius: 3px; font-size: 10px; word-break: break-all;">
                          🔗 <a href="/api/photo/\${photo.requestId}" target="_blank">/api/photo/\${photo.requestId}</a>
                        </div>
                      </div>
                    </div>
                  \`).join('');
                } else {
                  latestPhoto.style.display = 'none';
                  noPhoto.style.display = 'block';
                  latestPhotoUrl.style.display = 'none';
                  photoGrid.innerHTML = '';
                }
              } catch (error) {
                console.error('Error refreshing photos:', error);
              }
            }
            
            function clearPhotos() {
              fetch('/api/clear-photos', { method: 'POST' })
                .then(() => refreshPhotos());
            }
            
            // Load photos on page load
            refreshPhotos();
          </script>
        </body>
        </html>
      `);
    });


    app.get('/health', (req, res) => {
      res.json({ status: 'ok', message: 'MentraOS Video Stream App is running' });
    });

    /* CHANGE 7: For latest-photo-image and all-photos endpoints, fast direct access, no sorting needed. */
    app.get('/api/latest-photo-image', (req, res) => {
      if (photos.length === 0) {
        res.status(404).send('No photo available');
        return;
      }
      const latestPhoto = photos[photos.length - 1];
      res.set({
        'Content-Type': latestPhoto.mimeType,
        'Cache-Control': 'no-cache'
      });
      res.send(latestPhoto.buffer);
    });

    app.get('/api/all-photos', (req, res) => {
      // Array already in order, return reverse for latest-first
      res.json([...photos].reverse().map(photo => ({
        requestId: photo.requestId,
        timestamp: photo.timestamp.getTime(),
        size: photo.size,
        mimeType: photo.mimeType,
        prompt: photo.prompt || ''
      })));
    });

    // New endpoint: Get latest photo with URL and prompt
    app.get('/api/latest-photo-data', (req, res) => {
      if (photos.length === 0) {
        res.status(404).json({ error: 'No photo available' });
        return;
      }
      const latestPhoto = photos[photos.length - 1];
      res.json({
        url: `/api/photo/${latestPhoto.requestId}`,
        prompt: latestPhoto.prompt || ''
      });
    });

    app.get('/api/photo/:requestId', (req, res) => {
      const photo = photos.find(p => p.requestId === req.params.requestId);
      if (!photo) {
        res.status(404).json({ error: 'Photo not found' });
        return;
      }
      res.set({
        'Content-Type': photo.mimeType,
        'Cache-Control': 'no-cache'
      });
      res.send(photo.buffer);
    });

    // No change—clear is just photos.length = 0 for array
    app.post('/api/clear-photos', (req, res) => {
      photos.length = 0;
      res.json({ message: 'All photos cleared' });
    });
  }
}

// Start the server
console.log('Starting Video Stream App...');
console.log(`Package: ${PACKAGE_NAME}`);
console.log(`Port: ${PORT}`);
console.log(`API Key: ${MENTRAOS_API_KEY ? `${MENTRAOS_API_KEY.substring(0, 8)}...` : 'NOT SET'}`);

const app = new VideoStreamApp();

app.start().then(() => {
  console.log('✅ App server started successfully');
  console.log('📱 Connect your MentraOS glasses to test the app');
}).catch(error => {
  console.error('❌ Failed to start app server:', error);
  process.exit(1);
});
