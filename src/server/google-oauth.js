// Google OAuth Integration for AI Nexus Studio
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

class GoogleWorkspaceIntegration {
    constructor() {
        this.oauth2Client = null;
        this.credentials = null;
        this.isInitialized = false;
    }

    initialize() {
        try {
            // Check if credentials exist
            const credentialsPath = path.join(__dirname, '../../credentials.json');

            if (fs.existsSync(credentialsPath)) {
                this.credentials = JSON.parse(fs.readFileSync(credentialsPath));
                this.setupOAuth();
            } else {
                console.warn('⚠️ Google OAuth credentials not found. Create credentials.json file.');
            }
        } catch (error) {
            console.warn('⚠️ Google OAuth initialization failed:', error.message);
        }
    }

    setupOAuth() {
        if (!this.credentials?.web) return;

        this.oauth2Client = new google.auth.OAuth2(
            this.credentials.web.client_id,
            this.credentials.web.client_secret,
            this.credentials.web.redirect_uris[0]
        );

        this.isInitialized = true;
        console.log('✅ Google OAuth initialized');
    }

    getAuthUrl() {
        if (!this.oauth2Client) {
            throw new Error('OAuth client not initialized');
        }

        const scopes = [
            'https://www.googleapis.com/auth/calendar.readonly',
            'https://www.googleapis.com/auth/drive.readonly',
            'https://www.googleapis.com/auth/gmail.readonly'
        ];

        return this.oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: scopes
        });
    }

    async handleCallback(code) {
        try {
            const { tokens } = await this.oauth2Client.getToken(code);
            this.oauth2Client.setCredentials(tokens);

            // Save tokens
            const tokensPath = path.join(__dirname, '../../tokens.json');
            fs.writeFileSync(tokensPath, JSON.stringify(tokens, null, 2));

            return { success: true };
        } catch (error) {
            console.error('OAuth callback error:', error);
            return { success: false, error: error.message };
        }
    }

    async getCalendarEvents() {
        if (!this.isInitialized) return [];

        try {
            const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
            const response = await calendar.events.list({
                calendarId: 'primary',
                timeMin: new Date().toISOString(),
                maxResults: 10,
                singleEvents: true,
                orderBy: 'startTime'
            });

            return response.data.items || [];
        } catch (error) {
            console.error('Calendar API error:', error);
            return [];
        }
    }

    async getDriveFiles() {
        if (!this.isInitialized) return [];

        try {
            const drive = google.drive({ version: 'v3', auth: this.oauth2Client });
            const response = await drive.files.list({
                pageSize: 10,
                fields: 'nextPageToken, files(id, name)'
            });

            return response.data.files || [];
        } catch (error) {
            console.error('Drive API error:', error);
            return [];
        }
    }

    async getGmailMessages() {
        if (!this.isInitialized) return [];

        try {
            const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
            const response = await gmail.users.messages.list({
                userId: 'me',
                maxResults: 10
            });

            return response.data.messages || [];
        } catch (error) {
            console.error('Gmail API error:', error);
            return [];
        }
    }

    disconnect() {
        this.oauth2Client = null;
        const tokensPath = path.join(__dirname, '../../tokens.json');
        if (fs.existsSync(tokensPath)) {
            fs.unlinkSync(tokensPath);
        }
        console.log('🔌 Google OAuth disconnected');
    }
}

module.exports = GoogleWorkspaceIntegration;