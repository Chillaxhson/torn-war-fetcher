import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import './components/api-form.js';
import './components/target-list.js';
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
    `;

    connectedCallback() {
        super.connectedCallback();
        this.apiKey = localStorage.getItem('tornApiKey') || '';
        const storedFactionIDs = JSON.parse(localStorage.getItem('tornFactionIDs') || '[]');
        if (storedFactionIDs.length > 0) {
            this.factionId = storedFactionIDs[0];
        }
        this.loadTargetData();
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

            <target-list 
                .targets=${this.targets}
                @update-target=${this.handleUpdateTarget}
            ></target-list>
        `;
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
        this.fetchTargets();
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
            if (target.notes || target.hidden) {
                acc[target.id] = {
                    notes: target.notes,
                    hidden: target.hidden,
                };
            }
            return acc;
        }, {} as Record<string, { notes?: string, hidden?: boolean }>);

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

    private async fetchTargets() {
        if (!this.apiKey || !this.factionId) {
            this.error = "API key and Faction ID are required."
            return;
        }
        
        this.isLoading = true;
        this.error = '';

        try {
            const response = await fetch(`/api/faction/${this.factionId}`, {
                headers: { 'X-API-Key': this.apiKey }
            });
            const data = await response.json();

            if (data.error) {
                this.error = `Error: ${data.error}. Details: ${data.details || 'None'}`;
                this.targets = [];
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
            }
        } catch (err) {
            console.error('Failed to fetch targets:', err);
            this.error = 'Could not connect to the local server. Is it running?';
            this.targets = [];
        } finally {
            this.isLoading = false;
        }
    }
} 