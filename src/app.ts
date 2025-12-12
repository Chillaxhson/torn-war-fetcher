import { LitElement, html, css } from 'lit';
import { inject as injectVercelAnalytics } from '@vercel/analytics';
import { customElement, property, state } from 'lit/decorators.js';
import './components/api-form.js';
import './components/target-list.js';
import './components/countdown-timer.js';
import { Member } from './types.js';

@customElement('torn-app')
export class TornApp extends LitElement {
    @property({ type: String })
    apiKey = '';

    @property({ type: String })
    factionId = '';

    @state()
    private targets: Member[] = [];

    @state()
    private error = '';
    
    @state()
    private isLoading = false;

    @state()
    private nextFetchTime = 0;

    @state()
    private lastUpdatedStr = '';

    private pollInterval: ReturnType<typeof setInterval> | undefined;

    static styles = css`
        :host {
            display: flex;
            flex-direction: column;
            gap: 2rem;
            width: 100%;
            max-width: 1200px;
        }

        h1 {
            text-align: center;
            color: #4CAF50;
            margin: 0;
        }
        
        .error-message {
            color: #f44336;
            text-align: center;
        }

        .refresh-info {
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 1.5rem;
            color: #888;
            font-size: 0.9em;
            background: #222;
            padding: 0.5rem;
            border-radius: 8px;
            width: fit-content;
            margin: 0 auto;
        }

        .last-updated {
            color: #4CAF50;
            font-weight: bold;
            transition: opacity 0.5s;
        }
        
        .last-updated.fade-in {
            animation: fadeIn 0.5s ease-in;
        }

        @keyframes fadeIn {
            from { opacity: 0.3; }
            to { opacity: 1; }
        }
    `;

    connectedCallback() {
        super.connectedCallback();
        if (import.meta.env && import.meta.env.PROD) {
            // Inject Vercel Web Analytics script only in production
            injectVercelAnalytics();
        }
        this.apiKey = localStorage.getItem('tornApiKey') || '';
        const storedFactionIDs = JSON.parse(localStorage.getItem('tornFactionIDs') || '[]');
        if (storedFactionIDs.length > 0) {
            this.factionId = storedFactionIDs[0];
        }
        this.loadTargetData();

        if (this.apiKey && this.factionId) {
            this.startPolling();
        }
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        this.stopPolling();
    }

    render() {
        return html`
            <h1>Torn War Target Fetcher</h1>
            <api-form
                .apiKey=${this.apiKey}
                .factionId=${this.factionId}
                @update-credentials=${this.handleCredentialsUpdate}
            ></api-form>
            
            ${this.isLoading ? html`<p>Loading targets...</p>` : ''}
            ${this.error ? html`<p class="error-message">${this.error}</p>` : ''}
            
            ${this.nextFetchTime > 0 ? html`
                <div class="refresh-info">
                    <span>Next update in: <countdown-timer .until=${this.nextFetchTime}></countdown-timer></span>
                    ${this.lastUpdatedStr ? html`
                        <span class="last-updated">Last Updated: ${this.lastUpdatedStr}</span>
                    ` : ''}
                </div>
            ` : ''}

            <target-list 
                .targets=${this.targets}
                @update-target=${this.handleUpdateTarget}
                @bulk-hide=${this.handleBulkHide}
            ></target-list>
        `;
    }

    private handleBulkHide(e: CustomEvent) {
        const namesToHide: string[] = e.detail.names;
        let changed = false;

        this.targets = this.targets.map(target => {
            if (namesToHide.includes(target.name.toLowerCase()) && !target.hidden) {
                changed = true;
                return { ...target, hidden: true };
            }
            return target;
        });

        if (changed) {
            this.saveTargetData();
        }
    }

    private handleUpdateTarget(e: CustomEvent) {
        const { targetId, changes } = e.detail;
        this.targets = this.targets.map(target => {
            if (target.id === targetId) {
                const newTarget = { ...target };
                if (changes.toggleHidden) {
                    newTarget.hidden = !target.hidden;
                }
                if (changes.notes !== undefined) {
                    newTarget.notes = changes.notes;
                }
                if (changes.notify !== undefined) {
                    newTarget.notify = changes.notify;
                }
                return newTarget;
            }
            return target;
        });
        this.saveTargetData();
    }

    private handleCredentialsUpdate(event: CustomEvent) {
        this.apiKey = event.detail.apiKey;
        this.factionId = event.detail.factionId;
        this.saveCredentials();
        this.startPolling();
    }

    private saveCredentials() {
        localStorage.setItem('tornApiKey', this.apiKey);
        if (this.factionId) {
            let existingIDs = JSON.parse(localStorage.getItem('tornFactionIDs') || '[]');
            existingIDs = [this.factionId, ...existingIDs.filter((id: string) => id !== this.factionId)];
            if (existingIDs.length > 10) existingIDs.pop();
            localStorage.setItem('tornFactionIDs', JSON.stringify(existingIDs));
        }
    }

    private saveTargetData() {
        if (!this.factionId) return;
        const dataToSave = this.targets.reduce((acc, target) => {
            if (target.notes || target.hidden || target.notify) {
                acc[target.id] = {
                    notes: target.notes,
                    hidden: target.hidden,
                    notify: target.notify
                };
            }
            return acc;
        }, {} as Record<string, { notes?: string, hidden?: boolean, notify?: boolean }>);

        localStorage.setItem(`tornTargetData_${this.factionId}`, JSON.stringify(dataToSave));
    }

    private loadTargetData() {
        if (!this.factionId) return;
        const savedData = JSON.parse(localStorage.getItem(`tornTargetData_${this.factionId}`) || '{}');
        if (this.targets.length > 0) {
            this.targets = this.targets.map(target => ({
                ...target,
                ...(savedData[target.id] || {}),
            }));
        }
    }

    private startPolling() {
        this.stopPolling();
        // Initial fetch
        this.fetchTargets();
        
        // Set initial timer
        this.nextFetchTime = Math.floor(Date.now() / 1000) + 30;

        // Poll every 30 seconds to keep data fresh during war
        this.pollInterval = setInterval(() => {
            this.fetchTargets(true);
            this.nextFetchTime = Math.floor(Date.now() / 1000) + 30;
        }, 10000); 
    }

    private stopPolling() {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = undefined;
            this.nextFetchTime = 0;
        }
    }

    private async fetchTargets(isBackground = false) {
        if (!this.apiKey || !this.factionId) {
            this.error = "API key and Faction ID are required."
            return;
        }
        
        if (!isBackground) {
            this.isLoading = true;
        }
        this.error = '';

        try {
            const response = await fetch(`/api/faction/${this.factionId}`, {
                headers: { 'X-API-Key': this.apiKey }
            });
            const data = await response.json();

            if (data.error) {
                this.error = `Error: ${data.error}. Details: ${data.details || 'None'}`;
                this.targets = [];
                // Stop polling if we have a critical error (like auth) to avoid spamming
                if (data.error.code === 2 || data.error.includes?.('Key') || data.error.includes?.('Access')) {
                    this.stopPolling();
                }
            } else {
                const statusPriority: Record<string, number> = {
                    'Okay': 1,
                    'Hospital': 2,
                    'Traveling': 3,
                    'Jail': 4,
                    'Federal': 5,
                    'Offline': 6,
                };

                this.targets = Object.entries(data.members || {})
                    .map(([id, member]) => ({ id, ...(member as any) }))
                    .sort((a: Member, b: Member) => {
                        const priorityA = statusPriority[a.status.state] || 99;
                        const priorityB = statusPriority[b.status.state] || 99;

                        if (priorityA !== priorityB) {
                            return priorityA - priorityB;
                        }

                        // If statuses are the same, sort by time remaining (ascending)
                        const a_until = a.status.until || 0;
                        const b_until = b.status.until || 0;
                        return a_until - b_until;
                    });
                this.loadTargetData();
                
                // Update timestamp
                const now = new Date();
                this.lastUpdatedStr = now.toLocaleTimeString();
            }
        } catch (err) {
            console.error('Failed to fetch targets:', err);
            this.error = 'Could not connect to the local server. Is it running?';
            this.targets = [];
        } finally {
            if (!isBackground) {
                this.isLoading = false;
            }
        }
    }
}
