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
            max-width: 900px;
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

            <target-list .targets=${this.targets}></target-list>
        `;
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
                this.targets = Object.entries(data.members || {})
                    .map(([id, member]) => ({ id, ...(member as any) }))
                    .sort((a: Member, b: Member) => {
                        const a_until = a.status.until || 0;
                        const b_until = b.status.until || 0;
                        if (a_until > 0 && b_until > 0) return a_until - b_until;
                        if (a_until > 0) return -1;
                        if (b_until > 0) return 1;
                        if (a.status.state === 'Okay' && b.status.state !== 'Okay') return -1;
                        if (b.status.state === 'Okay' && a.status.state !== 'Okay') return 1;
                        return 0;
                    });
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