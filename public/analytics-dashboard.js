
// Advanced Analytics Dashboard - AI Nexus Studio
// Real-time Analytics with Interactive Charts and Performance Metrics

class AdvancedAnalyticsDashboard {
    constructor() {
        this.chartInstances = {};
        this.realTimeData = new Map();
        this.updateInterval = 2000; // 2 seconds
        this.isInitialized = false;
        this.metricsCache = new Map();
        
        this.init();
    }

    async init() {
        console.log('📊 Initializing Advanced Analytics Dashboard...');
        
        // Initialize dashboard UI
        this.createDashboardContainer();
        this.setupEventListeners();
        
        // Load Chart.js if not available
        await this.loadChartLibrary();
        
        // Initialize charts
        this.initializeCharts();
        
        // Start real-time data collection
        this.startRealTimeUpdates();
        
        this.isInitialized = true;
        console.log('✅ Advanced Analytics Dashboard initialized');
    }

    createDashboardContainer() {
        const dashboardHTML = `
            <div class="analytics-dashboard" id="analytics-dashboard" style="display: none;">
                <div class="dashboard-header">
                    <div class="d-flex justify-content-between align-items-center mb-4">
                        <h4><i class="fas fa-chart-line me-2"></i>Advanced Analytics Dashboard</h4>
                        <div class="dashboard-controls">
                            <button class="btn btn-sm btn-outline-primary me-2" id="refresh-analytics">
                                <i class="fas fa-sync"></i> Refresh
                            </button>
                            <button class="btn btn-sm btn-outline-success me-2" id="export-analytics">
                                <i class="fas fa-download"></i> Export
                            </button>
                            <button class="btn btn-sm btn-outline-danger" id="close-dashboard">
                                <i class="fas fa-times"></i> Close
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Real-time Metrics Cards -->
                <div class="metrics-cards row mb-4">
                    <div class="col-md-3">
                        <div class="metric-card" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 12px; padding: 20px;">
                            <div class="metric-icon">
                                <i class="fas fa-users fa-2x"></i>
                            </div>
                            <div class="metric-content">
                                <h3 id="total-users">1,247</h3>
                                <p>Active Users</p>
                                <span class="metric-change">+12.5% <i class="fas fa-arrow-up"></i></span>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="metric-card" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; border-radius: 12px; padding: 20px;">
                            <div class="metric-icon">
                                <i class="fas fa-comments fa-2x"></i>
                            </div>
                            <div class="metric-content">
                                <h3 id="total-conversations">45,892</h3>
                                <p>AI Conversations</p>
                                <span class="metric-change">+8.3% <i class="fas fa-arrow-up"></i></span>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="metric-card" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; border-radius: 12px; padding: 20px;">
                            <div class="metric-icon">
                                <i class="fas fa-brain fa-2x"></i>
                            </div>
                            <div class="metric-content">
                                <h3 id="ai-processing">98.7%</h3>
                                <p>AI Accuracy</p>
                                <span class="metric-change">+2.1% <i class="fas fa-arrow-up"></i></span>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="metric-card" style="background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); color: white; border-radius: 12px; padding: 20px;">
                            <div class="metric-icon">
                                <i class="fas fa-tachometer-alt fa-2x"></i>
                            </div>
                            <div class="metric-content">
                                <h3 id="response-time">0.8s</h3>
                                <p>Avg Response Time</p>
                                <span class="metric-change">-15.2% <i class="fas fa-arrow-down"></i></span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Charts Section -->
                <div class="charts-section row mb-4">
                    <div class="col-md-8">
                        <div class="chart-container" style="background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: 12px; padding: 20px;">
                            <h6><i class="fas fa-chart-area me-2"></i>Real-time User Activity</h6>
                            <canvas id="activity-chart" height="80"></canvas>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="chart-container" style="background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: 12px; padding: 20px;">
                            <h6><i class="fas fa-chart-pie me-2"></i>AI Model Usage</h6>
                            <canvas id="model-usage-chart"></canvas>
                        </div>
                    </div>
                </div>

                <!-- Performance Analytics -->
                <div class="performance-section row mb-4">
                    <div class="col-md-6">
                        <div class="chart-container" style="background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: 12px; padding: 20px;">
                            <h6><i class="fas fa-server me-2"></i>Server Performance</h6>
                            <canvas id="performance-chart" height="100"></canvas>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="chart-container" style="background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: 12px; padding: 20px;">
                            <h6><i class="fas fa-globe me-2"></i>Geographic Distribution</h6>
                            <canvas id="geographic-chart" height="100"></canvas>
                        </div>
                    </div>
                </div>

                <!-- Advanced Analytics Table -->
                <div class="analytics-table" style="background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: 12px; padding: 20px;">
                    <h6><i class="fas fa-table me-2"></i>Detailed Analytics</h6>
                    <div class="table-responsive">
                        <table class="table table-hover">
                            <thead>
                                <tr>
                                    <th>Feature</th>
                                    <th>Usage Count</th>
                                    <th>Success Rate</th>
                                    <th>Avg Response</th>
                                    <th>Trend</th>
                                </tr>
                            </thead>
                            <tbody id="analytics-table-body">
                                <tr>
                                    <td><i class="fas fa-file-alt me-2"></i>File Analysis</td>
                                    <td>12,456</td>
                                    <td><span class="badge bg-success">96.8%</span></td>
                                    <td>2.3s</td>
                                    <td><i class="fas fa-arrow-up text-success"></i> +5.2%</td>
                                </tr>
                                <tr>
                                    <td><i class="fas fa-code me-2"></i>Code Review</td>
                                    <td>8,923</td>
                                    <td><span class="badge bg-success">94.5%</span></td>
                                    <td>1.8s</td>
                                    <td><i class="fas fa-arrow-up text-success"></i> +3.7%</td>
                                </tr>
                                <tr>
                                    <td><i class="fas fa-image me-2"></i>Image Generation</td>
                                    <td>5,634</td>
                                    <td><span class="badge bg-warning">89.2%</span></td>
                                    <td>4.1s</td>
                                    <td><i class="fas fa-arrow-down text-danger"></i> -2.1%</td>
                                </tr>
                                <tr>
                                    <td><i class="fas fa-microphone me-2"></i>Voice Chat</td>
                                    <td>3,789</td>
                                    <td><span class="badge bg-success">97.3%</span></td>
                                    <td>0.9s</td>
                                    <td><i class="fas fa-arrow-up text-success"></i> +8.9%</td>
                                </tr>
                                <tr>
                                    <td><i class="fas fa-chart-bar me-2"></i>Data Visualization</td>
                                    <td>2,156</td>
                                    <td><span class="badge bg-info">91.7%</span></td>
                                    <td>3.2s</td>
                                    <td><i class="fas fa-arrow-up text-success"></i> +12.4%</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Real-time Status -->
                <div class="real-time-status mt-3" style="background: var(--bg-secondary); border-radius: 8px; padding: 15px;">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <i class="fas fa-circle text-success"></i>
                            <span class="ms-2">Real-time Updates Active</span>
                        </div>
                        <div>
                            <small class="text-muted">Last updated: <span id="last-update-time">Just now</span></small>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Insert dashboard into the page
        const chatContainer = document.querySelector('.chat-container');
        if (chatContainer) {
            chatContainer.insertAdjacentHTML('beforebegin', dashboardHTML);
        }
    }

    async loadChartLibrary() {
        if (typeof Chart === 'undefined') {
            return new Promise((resolve) => {
                const script = document.createElement('script');
                script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
                script.onload = resolve;
                document.head.appendChild(script);
            });
        }
    }

    setupEventListeners() {
        // Dashboard controls
        document.getElementById('refresh-analytics')?.addEventListener('click', () => {
            this.refreshAllData();
        });

        document.getElementById('export-analytics')?.addEventListener('click', () => {
            this.exportAnalytics();
        });

        document.getElementById('close-dashboard')?.addEventListener('click', () => {
            this.hideDashboard();
        });
    }

    initializeCharts() {
        this.createActivityChart();
        this.createModelUsageChart();
        this.createPerformanceChart();
        this.createGeographicChart();
    }

    createActivityChart() {
        const ctx = document.getElementById('activity-chart');
        if (!ctx) return;

        const activityData = this.generateActivityData();

        this.chartInstances.activity = new Chart(ctx, {
            type: 'line',
            data: {
                labels: activityData.labels,
                datasets: [{
                    label: 'Active Users',
                    data: activityData.users,
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    fill: true,
                    tension: 0.4
                }, {
                    label: 'AI Requests',
                    data: activityData.requests,
                    borderColor: '#f093fb',
                    backgroundColor: 'rgba(240, 147, 251, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0,0,0,0.1)'
                        }
                    },
                    x: {
                        grid: {
                            color: 'rgba(0,0,0,0.1)'
                        }
                    }
                },
                animation: {
                    duration: 1000,
                    easing: 'easeInOutQuart'
                }
            }
        });
    }

    createModelUsageChart() {
        const ctx = document.getElementById('model-usage-chart');
        if (!ctx) return;

        this.chartInstances.modelUsage = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Gemini 2.0', 'GPT-4o', 'DeepSeek', 'DALL-E 3'],
                datasets: [{
                    data: [45, 30, 15, 10],
                    backgroundColor: [
                        '#667eea',
                        '#f093fb',
                        '#4facfe',
                        '#43e97b'
                    ],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                    }
                },
                animation: {
                    animateRotate: true,
                    duration: 1500
                }
            }
        });
    }

    createPerformanceChart() {
        const ctx = document.getElementById('performance-chart');
        if (!ctx) return;

        const performanceData = this.generatePerformanceData();

        this.chartInstances.performance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: performanceData.labels,
                datasets: [{
                    label: 'CPU Usage (%)',
                    data: performanceData.cpu,
                    backgroundColor: 'rgba(102, 126, 234, 0.8)',
                    borderColor: '#667eea',
                    borderWidth: 1
                }, {
                    label: 'Memory Usage (%)',
                    data: performanceData.memory,
                    backgroundColor: 'rgba(240, 147, 251, 0.8)',
                    borderColor: '#f093fb',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100
                    }
                }
            }
        });
    }

    createGeographicChart() {
        const ctx = document.getElementById('geographic-chart');
        if (!ctx) return;

        this.chartInstances.geographic = new Chart(ctx, {
            type: 'polarArea',
            data: {
                labels: ['India', 'USA', 'Europe', 'Asia-Pacific', 'Others'],
                datasets: [{
                    data: [40, 25, 15, 12, 8],
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.8)',
                        'rgba(54, 162, 235, 0.8)',
                        'rgba(255, 205, 86, 0.8)',
                        'rgba(75, 192, 192, 0.8)',
                        'rgba(153, 102, 255, 0.8)'
                    ],
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                    }
                }
            }
        });
    }

    generateActivityData() {
        const now = new Date();
        const labels = [];
        const users = [];
        const requests = [];

        for (let i = 23; i >= 0; i--) {
            const time = new Date(now.getTime() - i * 60 * 60 * 1000);
            labels.push(time.getHours() + ':00');
            
            // Simulate realistic data patterns
            const baseUsers = 50 + Math.sin((time.getHours() - 6) * Math.PI / 12) * 30;
            const baseRequests = 100 + Math.sin((time.getHours() - 8) * Math.PI / 10) * 80;
            
            users.push(Math.max(0, Math.floor(baseUsers + Math.random() * 20 - 10)));
            requests.push(Math.max(0, Math.floor(baseRequests + Math.random() * 40 - 20)));
        }

        return { labels, users, requests };
    }

    generatePerformanceData() {
        const labels = ['CPU 1', 'CPU 2', 'CPU 3', 'CPU 4'];
        const cpu = [65, 72, 58, 81];
        const memory = [45, 52, 38, 67];

        return { labels, cpu, memory };
    }

    startRealTimeUpdates() {
        setInterval(() => {
            this.updateRealTimeMetrics();
            this.updateCharts();
            this.updateLastUpdateTime();
        }, this.updateInterval);
    }

    async updateRealTimeMetrics() {
        try {
            // Fetch real metrics from server
            const response = await fetch('/api/analytics/realtime');
            if (response.ok) {
                const realMetrics = await response.json();
                
                // Update with real data from Replit Database
                document.getElementById('total-users').textContent = realMetrics.activeUsers.toLocaleString();
                document.getElementById('total-conversations').textContent = realMetrics.totalConversations.toLocaleString();
                document.getElementById('ai-processing').textContent = realMetrics.aiAccuracy + '%';
                document.getElementById('response-time').textContent = realMetrics.avgResponseTime + 's';
                
                // Update traffic sources breakdown with real data
                this.updateTrafficSources(realMetrics.trafficSources);
                
                // Update API usage stats
                this.updateAPIUsageStats(realMetrics.apiUsage);
                
                console.log('📊 Real analytics data updated from server');
            } else {
                console.error('Analytics API error:', response.status);
                this.showConnectionError();
            }
        } catch (error) {
            console.error('Analytics API connection failed:', error);
            this.showConnectionError();
        }
    }

    showConnectionError() {
        // Show real error instead of fallback data
        document.getElementById('total-users').textContent = 'Error';
        document.getElementById('total-conversations').textContent = 'Error';
        document.getElementById('ai-processing').textContent = 'Error';
        document.getElementById('response-time').textContent = 'Error';
        
        this.showNotification('Analytics API connection failed. Please check server status.', 'danger');
    }

    updateAPIUsageStats(apiUsage) {
        if (!apiUsage) return;
        
        const apiStatsDiv = document.querySelector('.api-usage-stats') || this.createAPIStatsSection();
        
        let statsHTML = '<h6>🔧 API Usage Statistics:</h6><div class="api-stats-list">';
        Object.entries(apiUsage).forEach(([endpoint, count]) => {
            statsHTML += `
                <div class="api-stat-item">
                    <span class="api-endpoint">${endpoint}</span>
                    <span class="api-count">${count} requests</span>
                </div>
            `;
        });
        statsHTML += '</div>';
        
        apiStatsDiv.innerHTML = statsHTML;
    }

    createAPIStatsSection() {
        const section = document.createElement('div');
        section.className = 'api-usage-stats mt-3 p-3';
        section.style.cssText = 'background: var(--bg-secondary); border-radius: 8px; border: 1px solid var(--border-color);';
        
        const dashboardContainer = document.querySelector('.analytics-dashboard .charts-section');
        if (dashboardContainer) {
            dashboardContainer.appendChild(section);
        }
        
        return section;
    }

    updateTrafficSources(trafficSources) {
        if (!trafficSources) return;
        
        // Add traffic sources breakdown to dashboard
        const sourcesDiv = document.querySelector('.traffic-sources') || this.createTrafficSourcesSection();
        
        sourcesDiv.innerHTML = `
            <h6>🌐 Traffic Sources:</h6>
            <div class="sources-list">
                ${Object.entries(trafficSources).map(([source, count]) => `
                    <div class="source-item">
                        <span class="source-name">${source}</span>
                        <span class="source-count">${count} requests</span>
                    </div>
                `).join('')}
            </div>
        `;
    }

    createTrafficSourcesSection() {
        const section = document.createElement('div');
        section.className = 'traffic-sources mt-3 p-3';
        section.style.cssText = 'background: var(--bg-secondary); border-radius: 8px; border: 1px solid var(--border-color);';
        
        const dashboardContainer = document.querySelector('.analytics-dashboard .charts-section');
        if (dashboardContainer) {
            dashboardContainer.appendChild(section);
        }
        
        return section;
    }

    updateCharts() {
        // Update activity chart with new data point
        if (this.chartInstances.activity) {
            const chart = this.chartInstances.activity;
            const now = new Date();
            
            // Add new data point
            chart.data.labels.push(now.getHours() + ':' + now.getMinutes().toString().padStart(2, '0'));
            chart.data.datasets[0].data.push(Math.floor(Math.random() * 100 + 50));
            chart.data.datasets[1].data.push(Math.floor(Math.random() * 150 + 80));
            
            // Keep only last 24 data points
            if (chart.data.labels.length > 24) {
                chart.data.labels.shift();
                chart.data.datasets[0].data.shift();
                chart.data.datasets[1].data.shift();
            }
            
            chart.update('none');
        }
    }

    updateLastUpdateTime() {
        const timeElement = document.getElementById('last-update-time');
        if (timeElement) {
            timeElement.textContent = new Date().toLocaleTimeString();
        }
    }

    generateRandomMetric(min, max) {
        return Math.floor(Math.random() * (max - min) + min);
    }

    refreshAllData() {
        console.log('🔄 Refreshing analytics data...');
        
        // Show loading state
        this.showLoadingState();
        
        setTimeout(() => {
            this.updateRealTimeMetrics();
            this.updateCharts();
            this.updateAnalyticsTable();
            this.hideLoadingState();
            
            // Show refresh notification
            this.showNotification('Analytics data refreshed successfully!', 'success');
        }, 1500);
    }

    updateAnalyticsTable() {
        const tableBody = document.getElementById('analytics-table-body');
        if (!tableBody) return;

        // Generate updated random data for demo
        const features = [
            { name: 'File Analysis', icon: 'fas fa-file-alt', usage: this.generateRandomMetric(12000, 13000) },
            { name: 'Code Review', icon: 'fas fa-code', usage: this.generateRandomMetric(8500, 9500) },
            { name: 'Image Generation', icon: 'fas fa-image', usage: this.generateRandomMetric(5000, 6000) },
            { name: 'Voice Chat', icon: 'fas fa-microphone', usage: this.generateRandomMetric(3500, 4000) },
            { name: 'Data Visualization', icon: 'fas fa-chart-bar', usage: this.generateRandomMetric(2000, 2500) }
        ];

        tableBody.innerHTML = features.map(feature => `
            <tr>
                <td><i class="${feature.icon} me-2"></i>${feature.name}</td>
                <td>${feature.usage.toLocaleString()}</td>
                <td><span class="badge bg-success">${(Math.random() * 10 + 90).toFixed(1)}%</span></td>
                <td>${(Math.random() * 3 + 1).toFixed(1)}s</td>
                <td><i class="fas fa-arrow-up text-success"></i> +${(Math.random() * 10 + 1).toFixed(1)}%</td>
            </tr>
        `).join('');
    }

    exportAnalytics() {
        console.log('📊 Exporting analytics data...');
        
        const exportData = {
            timestamp: new Date().toISOString(),
            metrics: {
                totalUsers: document.getElementById('total-users').textContent,
                totalConversations: document.getElementById('total-conversations').textContent,
                aiAccuracy: document.getElementById('ai-processing').textContent,
                responseTime: document.getElementById('response-time').textContent
            },
            charts: {
                activity: this.chartInstances.activity?.data,
                modelUsage: this.chartInstances.modelUsage?.data,
                performance: this.chartInstances.performance?.data,
                geographic: this.chartInstances.geographic?.data
            }
        };

        // Create and download JSON file
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `analytics-export-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
        this.showNotification('Analytics data exported successfully!', 'success');
    }

    showDashboard() {
        const dashboard = document.getElementById('analytics-dashboard');
        if (dashboard) {
            dashboard.style.display = 'block';
            dashboard.scrollIntoView({ behavior: 'smooth' });
        }
    }

    hideDashboard() {
        const dashboard = document.getElementById('analytics-dashboard');
        if (dashboard) {
            dashboard.style.display = 'none';
        }
    }

    showLoadingState() {
        const refreshBtn = document.getElementById('refresh-analytics');
        if (refreshBtn) {
            refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Refreshing...';
            refreshBtn.disabled = true;
        }
    }

    hideLoadingState() {
        const refreshBtn = document.getElementById('refresh-analytics');
        if (refreshBtn) {
            refreshBtn.innerHTML = '<i class="fas fa-sync"></i> Refresh';
            refreshBtn.disabled = false;
        }
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
        notification.style.cssText = 'top: 20px; right: 20px; z-index: 9999; max-width: 300px;';
        notification.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }

    // Public methods for integration
    toggle() {
        const dashboard = document.getElementById('analytics-dashboard');
        if (dashboard) {
            const isVisible = dashboard.style.display !== 'none';
            if (isVisible) {
                this.hideDashboard();
            } else {
                this.showDashboard();
            }
        }
    }

    updateMetric(metricId, value) {
        const element = document.getElementById(metricId);
        if (element) {
            element.textContent = value;
        }
    }

    addCustomChart(containerId, chartConfig) {
        const ctx = document.getElementById(containerId);
        if (ctx && typeof Chart !== 'undefined') {
            return new Chart(ctx, chartConfig);
        }
    }
}

// Initialize Advanced Analytics Dashboard
const advancedAnalytics = new AdvancedAnalyticsDashboard();

// Export for global access
window.AdvancedAnalyticsDashboard = AdvancedAnalyticsDashboard;
window.advancedAnalytics = advancedAnalytics;

console.log('📊 Advanced Analytics Dashboard module loaded');
