import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { UserProfile } from '../types.js';

@customElement('api-form')
export class ApiForm extends LitElement {
    @property({ type: String })
    apiKey = '';

    @property({ type: String })
    factionId = '';
    
    @property({ type: Array })
    factionIdHistory: string[] = [];

    @property({ type: Object })
    userProfile: UserProfile | null = null;

    @property({ type: Number })
    customBattleStats: number | null = null;

    @property({ type: Boolean })
    isLoading = false;

    @property({ type: Boolean })
    soundEnabled = true;

    @property({ type: String })
    spyProvider = 'ffscouter';

    @property({ type: String })
    spyKey = '';

    @state()
    private showKey = false;
    
    @state()
    private showSpyKey = false;

    @state()
    private isEditingStats = false;

    @state()
    private statsInputStr = '';

    static styles = css`
        :host {
            display: block;
            width: 100%;
        }

        .control-panel {
            background: #121620;
            border: 1px solid #242c3f;
            border-radius: 10px;
            padding: 1.25rem 1.5rem;
            display: flex;
            flex-direction: column;
            gap: 1rem;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
        }

        .user-banner {
            display: flex;
            align-items: center;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: 1rem;
            padding-bottom: 0.85rem;
            border-bottom: 1px solid #1e2535;
        }

        .user-meta {
            display: flex;
            align-items: center;
            gap: 0.75rem;
        }

        .user-avatar {
            width: 38px;
            height: 38px;
            border-radius: 8px;
            background: linear-gradient(135deg, #2563eb, #3b82f6);
            color: #fff;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
            font-size: 1rem;
            box-shadow: 0 0 12px rgba(59, 130, 246, 0.4);
        }

        .user-details {
            display: flex;
            flex-direction: column;
            gap: 2px;
        }

        .user-name {
            font-weight: 700;
            font-size: 1rem;
            color: #f1f5f9;
        }

        .user-name a {
            color: inherit;
            text-decoration: none;
        }

        .user-name a:hover {
            color: #60a5fa;
            text-decoration: underline;
        }

        .user-sub {
            font-size: 0.8em;
            color: #94a3b8;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }

        .user-stats-pill {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            background: #191f2d;
            border: 1px solid #2d374d;
            padding: 0.4rem 0.85rem;
            border-radius: 6px;
        }

        .stat-item {
            display: flex;
            flex-direction: column;
            align-items: flex-end;
        }

        .stat-label {
            font-size: 0.65rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: #64748b;
        }

        .stat-val {
            font-family: 'JetBrains Mono', monospace;
            font-weight: 700;
            font-size: 0.95rem;
            color: #10b981;
        }

        .stat-edit-btn {
            background: none;
            border: 1px solid #3b4861;
            color: #94a3b8;
            border-radius: 4px;
            font-size: 0.75rem;
            padding: 2px 6px;
            cursor: pointer;
            transition: all 0.2s;
        }

        .stat-edit-btn:hover {
            background: #28354c;
            color: #fff;
        }

        .team-pill {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 3px 10px;
            border-radius: 9999px;
            font-size: 0.75rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            border: 1px solid rgba(255, 255, 255, 0.15);
        }

        .form-grid {
            display: grid;
            grid-template-columns: 1.2fr 0.85fr 1fr auto;
            gap: 0.85rem;
            align-items: flex-end;
        }

        @media (max-width: 960px) {
            .form-grid {
                grid-template-columns: 1fr 1fr;
            }
            .action-group {
                grid-column: 1 / -1;
                display: flex;
                gap: 0.5rem;
            }
        }

        @media (max-width: 560px) {
            .form-grid {
                grid-template-columns: 1fr;
            }
        }

        .input-box {
            display: flex;
            flex-direction: column;
            gap: 0.35rem;
        }

        label {
            color: #94a3b8;
            font-size: 0.78rem;
            font-weight: 600;
            letter-spacing: 0.02em;
            line-height: 1.2;
        }

        .input-wrapper {
            position: relative;
            display: flex;
            align-items: center;
        }

        input, select {
            width: 100%;
            height: 38px;
            box-sizing: border-box;
            padding: 0 0.85rem;
            border: 1px solid #28334a;
            border-radius: 6px;
            background-color: #0d1017;
            color: #f1f5f9;
            font-family: inherit;
            font-size: 0.85rem;
            transition: border-color 0.2s, box-shadow 0.2s;
        }

        select {
            cursor: pointer;
        }

        input:focus, select:focus {
            outline: none;
            border-color: #3b82f6;
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
        }

        .toggle-btn {
            position: absolute;
            right: 8px;
            background: none;
            border: none;
            color: #64748b;
            cursor: pointer;
            font-size: 0.8rem;
            padding: 4px;
        }

        .toggle-btn:hover {
            color: #94a3b8;
        }

        .btn-primary {
            padding: 0.65rem 1.4rem;
            font-size: 0.9rem;
            font-weight: 600;
            background: linear-gradient(180deg, #2563eb, #1d4ed8);
            color: white;
            border: 1px solid #3b82f6;
            border-radius: 6px;
            cursor: pointer;
            box-shadow: 0 2px 8px rgba(37, 99, 235, 0.3);
            transition: all 0.2s ease;
            white-space: nowrap;
            height: 38px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
        }

        .btn-primary:hover:not(:disabled) {
            background: linear-gradient(180deg, #3b82f6, #2563eb);
            box-shadow: 0 4px 12px rgba(37, 99, 235, 0.5);
            transform: translateY(-1px);
        }

        .btn-primary:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }

        .btn-icon {
            background: #191f2d;
            border: 1px solid #2d374d;
            color: #94a3b8;
            padding: 0.65rem;
            border-radius: 6px;
            cursor: pointer;
            height: 38px;
            width: 38px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
        }

        .btn-icon:hover {
            background: #242c3f;
            color: #f1f5f9;
        }

        .btn-icon.active {
            color: #10b981;
            border-color: rgba(16, 185, 129, 0.4);
            background: rgba(16, 185, 129, 0.1);
        }

        .recent-chips {
            display: flex;
            align-items: center;
            gap: 0.4rem;
            flex-wrap: wrap;
            font-size: 0.75rem;
            color: #64748b;
        }

        .chip-id {
            background: #181f2c;
            border: 1px solid #28334a;
            color: #94a3b8;
            padding: 2px 6px;
            border-radius: 4px;
            cursor: pointer;
            transition: all 0.15s;
        }

        .chip-id:hover {
            background: #2563eb;
            color: #fff;
            border-color: #3b82f6;
        }

        .stats-dialog {
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .stats-dialog input {
            width: 140px;
            padding: 4px 8px;
            font-size: 0.85rem;
        }
    `;

    connectedCallback(): void {
        super.connectedCallback();
        this.factionIdHistory = JSON.parse(localStorage.getItem('tornFactionIDs') || '[]');
        const storedCustomStats = localStorage.getItem('tornCustomStats');
        if (storedCustomStats) {
            this.customBattleStats = Number(storedCustomStats);
        }
    }

    private formatNumber(num: number): string {
        if (!num || isNaN(num)) return '-';
        if (num >= 1e12) return (num / 1e12).toFixed(2) + 'T';
        if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
        if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
        if (num >= 1e3) return (num / 1e3).toFixed(1) + 'k';
        return num.toLocaleString();
    }

    private getEffectiveStats(): number | null {
        if (this.customBattleStats && this.customBattleStats > 0) {
            return this.customBattleStats;
        }
        if (this.userProfile?.battleStats?.total && this.userProfile.battleStats.total > 0) {
            return this.userProfile.battleStats.total;
        }
        if (this.userProfile?.elimination?.bsEstimate && this.userProfile.elimination.bsEstimate > 0) {
            return this.userProfile.elimination.bsEstimate;
        }
        return null;
    }

    private saveCustomStats() {
        const raw = this.statsInputStr.trim().toLowerCase();
        let val: number | null = null;

        if (raw.endsWith('b')) {
            val = parseFloat(raw.replace('b', '')) * 1e9;
        } else if (raw.endsWith('m')) {
            val = parseFloat(raw.replace('m', '')) * 1e6;
        } else if (raw.endsWith('k')) {
            val = parseFloat(raw.replace('k', '')) * 1e3;
        } else {
            val = parseFloat(raw.replace(/,/g, ''));
        }

        if (val && !isNaN(val) && val > 0) {
            this.customBattleStats = val;
            localStorage.setItem('tornCustomStats', String(val));
            this.dispatchEvent(new CustomEvent('update-user-stats', {
                detail: { stats: val },
                bubbles: true,
                composed: true
            }));
        } else if (!raw) {
            this.customBattleStats = null;
            localStorage.removeItem('tornCustomStats');
            this.dispatchEvent(new CustomEvent('update-user-stats', {
                detail: { stats: null },
                bubbles: true,
                composed: true
            }));
        }
        this.isEditingStats = false;
    }

    render() {
        const effectiveStats = this.getEffectiveStats();

        return html`
            <div class="control-panel">
                ${this.userProfile ? html`
                    <div class="user-banner">
                        <div class="user-meta">
                            <div class="user-avatar">
                                ${this.userProfile.name ? this.userProfile.name.charAt(0).toUpperCase() : 'U'}
                            </div>
                            <div class="user-details">
                                <div class="user-name">
                                    <a href="https://www.torn.com/profiles.php?XID=${this.userProfile.id}" target="_blank">
                                        ${this.userProfile.name}
                                    </a>
                                    <span style="font-weight: normal; color: #94a3b8; font-size: 0.85em;">
                                        [${this.userProfile.id}]
                                    </span>
                                </div>
                                <div class="user-sub">
                                    <span>Lvl ${this.userProfile.level}</span>
                                    ${this.userProfile.factionName ? html`
                                        <span>&bull;</span>
                                        <span>${this.userProfile.factionName}</span>
                                    ` : ''}
                                    ${this.userProfile.elimination?.team ? html`
                                        <span>&bull;</span>
                                        <span class="team-pill" style="background: rgba(59, 130, 246, 0.15); color: #60a5fa; border-color: rgba(59, 130, 246, 0.4);">
                                            ${this.userProfile.elimination.team}
                                        </span>
                                    ` : ''}
                                </div>
                            </div>
                        </div>

                        <div class="user-stats-pill">
                            <div class="stat-item">
                                <span class="stat-label">
                                    ${this.customBattleStats ? 'Custom Stats' : 'Your Battle Stats'}
                                </span>
                                ${this.isEditingStats ? html`
                                    <div class="stats-dialog">
                                        <input 
                                            type="text" 
                                            placeholder="e.g. 50M, 1.2B" 
                                            .value=${this.statsInputStr}
                                            @input=${(e: any) => this.statsInputStr = e.target.value}
                                            @keydown=${(e: KeyboardEvent) => e.key === 'Enter' && this.saveCustomStats()}
                                        >
                                        <button class="stat-edit-btn" @click=${this.saveCustomStats}>Set</button>
                                        <button class="stat-edit-btn" @click=${() => this.isEditingStats = false}>Cancel</button>
                                    </div>
                                ` : html`
                                    <span class="stat-val">
                                        ${effectiveStats ? this.formatNumber(effectiveStats) : 'Unknown'}
                                    </span>
                                `}
                            </div>
                            ${!this.isEditingStats ? html`
                                <button 
                                    class="stat-edit-btn" 
                                    @click=${() => {
                                        this.statsInputStr = effectiveStats ? String(effectiveStats) : '';
                                        this.isEditingStats = true;
                                    }}
                                    title="Edit your battle stats used for Fair Fight calculations"
                                >
                                    ${effectiveStats ? 'Edit' : '+ Add'}
                                </button>
                            ` : ''}
                        </div>
                    </div>
                ` : ''}

                <div class="form-grid">
                    <div class="input-box">
                        <label for="apiKeyInput">Torn API Key:</label>
                        <div class="input-wrapper">
                            <input
                                type=${this.showKey ? 'text' : 'password'}
                                id="apiKeyInput"
                                .value=${this.apiKey}
                                @input=${(e: Event) => this.apiKey = (e.target as HTMLInputElement).value}
                                placeholder="Enter your Torn API Key"
                                autocomplete="off"
                            >
                            <button 
                                class="toggle-btn" 
                                @click=${() => this.showKey = !this.showKey}
                                type="button"
                                title=${this.showKey ? 'Hide key' : 'Show key'}
                            >
                                ${this.showKey ? 'Hide' : 'Show'}
                            </button>
                        </div>
                    </div>

                    <div class="input-box">
                        <label for="factionIDInput">Target Faction ID:</label>
                        <div class="input-wrapper">
                            <input
                                type="text"
                                id="factionIDInput"
                                .value=${this.factionId}
                                @input=${(e: Event) => this.factionId = (e.target as HTMLInputElement).value}
                                list="factionIDs"
                                placeholder="e.g. 9201"
                            >
                            <datalist id="factionIDs">
                                ${this.factionIdHistory.map(id => html`<option .value=${id}></option>`)}
                            </datalist>
                        </div>
                    </div>

                    <div class="input-box">
                        <label for="spyProvider">Spy Data Provider:</label>
                        <select 
                            id="spyProvider" 
                            .value=${this.spyProvider || 'ffscouter'}
                            @change=${(e: any) => { this.spyProvider = e.target.value; this.dispatchUpdate(); }}
                        >
                            <option value="ffscouter">FFScouter v2 (Default)</option>
                            <option value="tornstats">TornStats API</option>
                            <option value="bsp">BSP (lol-manager)</option>
                            <option value="torncortex">TornCortex</option>
                        </select>
                    </div>

                    <div class="action-group" style="display: flex; align-items: center; gap: 0.5rem;">
                        <button 
                            class="btn-primary" 
                            @click=${this.dispatchUpdate}
                            ?disabled=${this.isLoading || !this.apiKey || !this.factionId}
                        >
                            ${this.isLoading ? html`<span>Loading...</span>` : html`
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                                    <path d="M3 3v5h5"/>
                                    <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/>
                                    <path d="M16 21h5v-5"/>
                                </svg>
                                <span>Fetch Targets</span>
                            `}
                        </button>

                        <button 
                            class="btn-icon ${this.soundEnabled ? 'active' : ''}" 
                            @click=${this.toggleSound}
                            title=${this.soundEnabled ? 'Audio alerts enabled' : 'Audio alerts muted'}
                            type="button"
                        >
                            ${this.soundEnabled ? html`
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>
                                </svg>
                            ` : html`
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                                    <line x1="23" y1="9" x2="17" y2="15"/>
                                    <line x1="17" y1="9" x2="23" y2="15"/>
                                </svg>
                            `}
                        </button>
                    </div>
                </div>

                ${this.factionIdHistory.length > 0 ? html`
                    <div class="recent-chips" style="margin-top: 0.6rem;">
                        <span>Recent:</span>
                        ${this.factionIdHistory.slice(0, 5).map(id => html`
                            <span class="chip-id" @click=${() => { this.factionId = id; this.dispatchUpdate(); }}>
                                ${id}
                            </span>
                        `)}
                    </div>
                ` : ''}

                ${this.spyProvider === 'tornstats' ? html`
                    <div style="margin-top: 0.85rem; max-width: 420px;">
                        <div class="input-box">
                            <label for="spyKeyInput">TornStats API Key:</label>
                            <div class="input-wrapper">
                                <input
                                    type=${this.showSpyKey ? 'text' : 'password'}
                                    id="spyKeyInput"
                                    .value=${this.spyKey}
                                    @input=${(e: Event) => this.spyKey = (e.target as HTMLInputElement).value}
                                    placeholder="Enter your TornStats API Key"
                                    autocomplete="off"
                                >
                                <button 
                                    class="toggle-btn" 
                                    @click=${() => this.showSpyKey = !this.showSpyKey}
                                    type="button"
                                >
                                    ${this.showSpyKey ? 'Hide' : 'Show'}
                                </button>
                            </div>
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }

    private toggleSound() {
        this.soundEnabled = !this.soundEnabled;
        this.dispatchEvent(new CustomEvent('toggle-sound', {
            detail: { soundEnabled: this.soundEnabled },
            bubbles: true,
            composed: true
        }));
    }

    private dispatchUpdate() {
        const event = new CustomEvent('update-credentials', {
            detail: {
                apiKey: this.apiKey.trim(),
                factionId: this.factionId.trim(),
                spyProvider: this.spyProvider || 'ffscouter',
                spyKey: this.spyKey.trim(),
            },
            bubbles: true,
            composed: true,
        });
        this.dispatchEvent(event);
    }
}