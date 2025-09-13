import pkg from '@mentra/sdk';
const { AppServer, AppSession } = pkg;
import express from 'express';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const PACKAGE_NAME = process.env.PACKAGE_NAME ?? (() => { throw new Error('PACKAGE_NAME is not set in .env file'); })();
const MENTRAOS_API_KEY = process.env.MENTRAOS_API_KEY ?? (() => { throw new Error('MENTRAOS_API_KEY is not set in .env file'); })();
const PORT = parseInt(process.env.PORT || '3000');


class VideoStreamApp extends AppServer {
  constructor() {
    super({
      packageName: PACKAGE_NAME,
      apiKey: MENTRAOS_API_KEY,
      port: PORT,
      mentraOSWebsocketUrl: 'wss://uscentralapi.mentra.glass/app-ws',
    });
    this.photos = new Map(); 
    this.setupRoutes();
  }

  /**
   * Handle new session creation and voice activation events
   */
  async onSession(session, sessionId, userId) {
    this.logger.info(`Session started for user ${userId}`);

    // Add error handling for session events
    session.events.onError((error) => {
      this.logger.error(`Session error for user ${userId}:`, error);
    });
    
    session.events.onDisconnected(() => {
      this.logger.info(`Session disconnected for user ${userId}`);
    });

    // Handle voice transcriptions for photo capture
    const unsubscribe = session.events.onTranscription((data) => {
      // Only process final transcriptions
      if (!data.isFinal) return;

      // Normalize the spoken text for comparison
      const spokenText = data.text.toLowerCase().trim();
      this.logger.debug(`Heard: "${spokenText}"`);

      // Check for the activation phrase "computer"
      if (spokenText.includes('computer')) {
        this.logger.info("🎤 Voice activation phrase 'computer' detected!");
        
        // Show visual feedback
        session.layouts.showTextWall("📸 Taking photo...");
        
        // Take a photo
        this.takePhoto(session, userId);
      }
    });

    // Clean up the listener when the session ends
    this.addCleanupHandler(unsubscribe);
  }

  /**
   * Take a photo and store it
   */
  async takePhoto(session, userId) {
    try {
      const photo = await session.camera.requestPhoto();
      this.logger.info(`Photo taken for user ${userId}, timestamp: ${photo.timestamp}`);
      
      // Store the photo
      this.photos.set(userId, {
        requestId: photo.requestId,
        buffer: photo.buffer,
        timestamp: photo.timestamp,
        userId: userId,
        mimeType: photo.mimeType,
        filename: photo.filename,
        size: photo.size
      });
      
      this.logger.info(`Photo stored for user ${userId}`);
      
      // Show success feedback
      session.layouts.showTextWall("✅ Photo captured!");
      
    } catch (error) {
      this.logger.error(`Error taking photo: ${error}`);
      session.layouts.showTextWall("❌ Photo failed");
    }
  }

  async onStop(sessionId, userId, reason) {
    this.logger.info(`Session stopped for user ${userId}, reason: ${reason}`);
  }


  /**
   * Set up API routes and web interface
   */
  setupRoutes() {
    const app = this.getExpressApp();

    // Serve static files from public directory
    app.use(express.static('public'));

    // Main web interface - shows video stream
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
              <p>🎤 Say "computer" to take photos with your MentraOS glasses!</p>
              <p>📸 Photos will appear below automatically</p>
              <p>🔗 Image URLs are displayed for each photo</p>
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
            
            // Refresh photos every 2 seconds
            setInterval(refreshPhotos, 50);
            
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

    // Health check endpoint
    app.get('/health', (req, res) => {
      res.json({ status: 'ok', message: 'MentraOS Video Stream App is running' });
    });

    // Get latest photo image
    app.get('/api/latest-photo-image', (req, res) => {
      const latestPhoto = Array.from(this.photos.values()).sort((a, b) => b.timestamp - a.timestamp)[0];
      
      if (!latestPhoto) {
        res.status(404).send('No photo available');
        return;
      }

      res.set({
        'Content-Type': latestPhoto.mimeType,
        'Cache-Control': 'no-cache'
      });
      res.send(latestPhoto.buffer);
    });

    // Get all photos
    app.get('/api/all-photos', (req, res) => {
      const allPhotos = Array.from(this.photos.values())
        .sort((a, b) => b.timestamp - a.timestamp)
        .map(photo => ({
          requestId: photo.requestId,
          timestamp: photo.timestamp.getTime(),
          size: photo.size,
          mimeType: photo.mimeType
        }));
      
      res.json(allPhotos);
    });

    // Get photo data
    app.get('/api/photo/:requestId', (req, res) => {
      const requestId = req.params.requestId;
      const photo = Array.from(this.photos.values()).find(p => p.requestId === requestId);
      
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

    // Clear all photos
    app.post('/api/clear-photos', (req, res) => {
      this.photos.clear();
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
}).catch((error) => {
  console.error('❌ Failed to start app server:', error);
  process.exit(1);
});
