import { LitElement, html, css } from 'lit';
import { inject as injectVercelAnalytics } from '@vercel/analytics';
import { customElement, property, state } from 'lit/decorators.js';
import './components/api-form.js';
import './components/target-list.js';
import './components/elimination-tab.js';
import './components/countdown-timer.js';
import { Member, UserProfile, EliminationTeam } from './types.js';

@customElement('torn-app')
export class TornApp extends LitElement {
    @property({ type: String })
    apiKey = '';

    @property({ type: String })
    factionId = '';
    
    @state()
    private factionIdHistory: string[] = [];

    @state()
    private activeTab: 'war' | 'elimination' = 'war';

    @state()
    private targets: Member[] = [];

    @state()
    private userProfile: UserProfile | null = null;

    @state()
    private eliminationTeams: EliminationTeam[] = [];

    @state()
    private customBattleStats: number | null = null;

    @state()
    private soundEnabled = true;

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
            gap: 1.5rem;
            width: 100%;
            max-width: 1200px;
            margin: 0 auto;
        }

        header.app-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: 1rem;
            padding-bottom: 0.5rem;
        }

        .brand-logo {
            display: flex;
            align-items: center;
            gap: 0.75rem;
        }

        .logo-icon {
            width: 36px;
            height: 36px;
            border-radius: 8px;
            background: linear-gradient(135deg, #ef4444, #dc2626);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            box-shadow: 0 0 16px rgba(239, 68, 68, 0.4);
        }

        h1 {
            font-size: 1.5rem;
            font-weight: 800;
            color: #f1f5f9;
            margin: 0;
            letter-spacing: -0.02em;
        }

        h1 span.highlight {
            background: linear-gradient(135deg, #60a5fa, #3b82f6);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        /* Navigation Tab Bar */
        .tab-bar {
            display: flex;
            gap: 0.5rem;
            border-bottom: 1px solid #242c3f;
            padding-bottom: 0;
            margin-top: 0.5rem;
        }

        .nav-tab {
            background: none;
            border: none;
            border-bottom: 2px solid transparent;
            color: #94a3b8;
            font-family: inherit;
            font-size: 0.95rem;
            font-weight: 700;
            padding: 0.65rem 1.25rem;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            transition: all 0.2s;
            margin-bottom: -1px;
            border-radius: 6px 6px 0 0;
        }

        .nav-tab:hover {
            color: #f1f5f9;
            background: rgba(255, 255, 255, 0.03);
        }

        .nav-tab.active {
            color: #f1f5f9;
            border-bottom-color: #3b82f6;
            background: rgba(59, 130, 246, 0.08);
        }

        .nav-tab.active.elim-tab {
            border-bottom-color: #ef4444;
            background: rgba(239, 68, 68, 0.08);
        }

        .tab-pill {
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.75rem;
            padding: 1px 6px;
            border-radius: 9999px;
            background: #1e2638;
            color: #cbd5e1;
        }

        .nav-tab.active .tab-pill {
            background: #2563eb;
            color: #fff;
        }

        .nav-tab.active.elim-tab .tab-pill {
            background: #dc2626;
            color: #fff;
        }

        /* Status & Refresh Info */
        .status-toolbar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 0.75rem;
            background: #121620;
            border: 1px solid #242c3f;
            border-radius: 8px;
            padding: 0.5rem 1rem;
            font-size: 0.85rem;
            color: #94a3b8;
        }

        .refresh-tag {
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }

        .last-updated {
            color: #10b981;
            font-weight: 600;
        }

        .btn-refresh {
            background: #191f2d;
            border: 1px solid #2d374d;
            color: #94a3b8;
            padding: 0.35rem 0.75rem;
            border-radius: 6px;
            font-size: 0.8rem;
            font-weight: 600;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 5px;
            transition: all 0.15s;
        }

        .btn-refresh:hover:not(:disabled) {
            background: #28334a;
            color: #f1f5f9;
            border-color: #3b82f6;
        }

        .btn-refresh:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        .error-banner {
            background: rgba(239, 68, 68, 0.1);
            border: 1px solid rgba(239, 68, 68, 0.3);
            color: #f87171;
            padding: 0.75rem 1.25rem;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-size: 0.9rem;
        }
    `;

    connectedCallback() {
        super.connectedCallback();
        if (import.meta.env && import.meta.env.PROD) {
            injectVercelAnalytics();
        }

        this.apiKey = localStorage.getItem('tornApiKey') || '';
        this.spyProvider = localStorage.getItem('tornSpyProvider') || 'ffscouter';
        this.spyKey = localStorage.getItem('tornSpyKey') || '';
        this.factionIdHistory = JSON.parse(localStorage.getItem('tornFactionIDs') || '[]');
        if (this.factionIdHistory.length > 0) {
            this.factionId = this.factionIdHistory[0];
        }

        const storedTab = localStorage.getItem('tornActiveTab');
        if (storedTab === 'war' || storedTab === 'elimination') {
            this.activeTab = storedTab;
        }

        const storedCustomStats = localStorage.getItem('tornCustomStats');
        if (storedCustomStats) {
            this.customBattleStats = Number(storedCustomStats);
        }

        const storedSound = localStorage.getItem('tornSoundEnabled');
        if (storedSound !== null) {
            this.soundEnabled = storedSound === 'true';
        }

        // Fetch user profile and elimination teams
        if (this.apiKey) {
            this.fetchUserProfile();
        }
        this.fetchTeamsList();

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
            <header class="app-header">
                <div class="brand-logo">
                    <div class="logo-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                        </svg>
                    </div>
                    <div>
                        <h1>Torn <span class="highlight">Target Fetcher</span></h1>
                    </div>
                </div>
            </header>

            <!-- Control & Credentials Form -->
            <api-form
                .apiKey=${this.apiKey}
                .factionId=${this.factionId}
                .factionIdHistory=${this.factionIdHistory}
                .userProfile=${this.userProfile}
                .customBattleStats=${this.customBattleStats}
                .isLoading=${this.isLoading}
                .soundEnabled=${this.soundEnabled}
                .spyProvider=${this.spyProvider}
                .spyKey=${this.spyKey}
                @update-credentials=${this.handleCredentialsUpdate}
                @update-user-stats=${this.handleUpdateUserStats}
                @toggle-sound=${this.handleToggleSound}
            ></api-form>

            ${this.error ? html`
                <div class="error-banner">
                    <span>${this.error}</span>
                    <button 
                        style="background:none; border:none; color:inherit; cursor:pointer; font-weight:700;"
                        @click=${() => this.error = ''}
                    >&times;</button>
                </div>
            ` : ''}

            <!-- Navigation Tabs -->
            <div class="tab-bar">
                <button 
                    class="nav-tab ${this.activeTab === 'war' ? 'active' : ''}"
                    @click=${() => this.switchTab('war')}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="22" y1="12" x2="18" y2="12"/>
                        <line x1="6" y1="12" x2="2" y2="12"/>
                        <line x1="12" y1="6" x2="12" y2="2"/>
                        <line x1="12" y1="22" x2="12" y2="18"/>
                    </svg>
                    <span>War Targets</span>
                    ${this.targets.length > 0 ? html`<span class="tab-pill">${this.targets.length}</span>` : ''}
                </button>

                <button 
                    class="nav-tab elim-tab ${this.activeTab === 'elimination' ? 'active' : ''}"
                    @click=${() => this.switchTab('elimination')}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
                    </svg>
                    <span>Elimination Targets</span>
                    ${this.targets.length > 0 ? html`<span class="tab-pill">${this.targets.length}</span>` : ''}
                </button>
            </div>

            <!-- Polling Status Toolbar -->
            ${this.nextFetchTime > 0 || this.lastUpdatedStr ? html`
                <div class="status-toolbar">
                    <div class="refresh-tag">
                        ${this.nextFetchTime > 0 ? html`
                            <span>Next auto-refresh in: <strong><countdown-timer .until=${this.nextFetchTime}></countdown-timer></strong></span>
                        ` : ''}
                        ${this.lastUpdatedStr ? html`
                            <span style="color:#64748b;">&bull;</span>
                            <span>Updated at: <strong class="last-updated">${this.lastUpdatedStr}</strong></span>
                        ` : ''}
                    </div>

                    <button 
                        class="btn-refresh" 
                        @click=${() => this.fetchTargets()}
                        ?disabled=${this.isLoading}
                    >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                            <path d="M3 3v5h5"/>
                            <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/>
                            <path d="M16 21h5v-5"/>
                        </svg>
                        ${this.isLoading ? 'Refreshing...' : 'Refresh Now'}
                    </button>
                </div>
            ` : ''}

            <!-- Tab Content -->
            ${this.activeTab === 'war' ? html`
                <target-list 
                    .targets=${this.targets}
                    .userBattleStats=${this.getEffectiveBattleStats()}
                    .soundEnabled=${this.soundEnabled}
                    @update-target=${this.handleUpdateTarget}
                    @bulk-hide=${this.handleBulkHide}
                ></target-list>
            ` : html`
                <elimination-tab
                    .targets=${this.targets}
                    .teams=${this.eliminationTeams}
                    .userBattleStats=${this.getEffectiveBattleStats()}
                    .isLoading=${this.isLoading}
                    .soundEnabled=${this.soundEnabled}
                    @update-target=${this.handleUpdateTarget}
                ></elimination-tab>
            `}
        `;
    }

    private getEffectiveBattleStats(): number | null {
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

    private switchTab(tab: 'war' | 'elimination') {
        this.activeTab = tab;
        localStorage.setItem('tornActiveTab', tab);
        // If switching to elimination, re-fetch targets to ensure elimination metadata is fully populated
        if (this.apiKey && this.factionId) {
            this.fetchTargets(true);
        }
    }

    private async fetchUserProfile() {
        if (!this.apiKey) return;
        try {
            const res = await fetch('/api/user/me', {
                headers: { 'X-API-Key': this.apiKey }
            });
            const data = await res.json();
            if (data && !data.error) {
                this.userProfile = data;
            }
        } catch {
            // Ignore error
        }
    }

    private async fetchTeamsList() {
        try {
            const res = await fetch('/api/elimination/teams');
            const data = await res.json();
            if (data && data.ok && Array.isArray(data.teams)) {
                this.eliminationTeams = data.teams;
            }
        } catch {
            // Ignore error
        }
    }

    private handleUpdateUserStats(e: CustomEvent) {
        this.customBattleStats = e.detail.stats;
    }

    private handleToggleSound(e: CustomEvent) {
        this.soundEnabled = e.detail.soundEnabled;
        localStorage.setItem('tornSoundEnabled', String(this.soundEnabled));
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

    private spyProvider: string = 'ffscouter';
    private spyKey: string = '';
    private hasLoadedSpyData: boolean = false;
    private cachedMemberStats = new Map<string, { bsEstimate: number | null, bsEstimateSource?: string, fairFight?: number | null }>();

    private handleCredentialsUpdate(event: CustomEvent) {
        const newApiKey = event.detail.apiKey;
        const newFactionId = event.detail.factionId;
        const newSpyProvider = event.detail.spyProvider || 'ffscouter';
        const newSpyKey = event.detail.spyKey || '';

        const credentialsChanged = (this.factionId !== newFactionId) || (this.spyProvider !== newSpyProvider) || (this.spyKey !== newSpyKey);
        if (credentialsChanged) {
            this.hasLoadedSpyData = false;
            this.cachedMemberStats.clear();
        }

        this.apiKey = newApiKey;
        this.factionId = newFactionId;
        this.spyProvider = newSpyProvider;
        this.spyKey = newSpyKey;

        this.saveCredentials();
        this.fetchUserProfile();
        this.startPolling();
    }

    private saveCredentials() {
        localStorage.setItem('tornApiKey', this.apiKey);
        localStorage.setItem('tornSpyProvider', this.spyProvider);
        localStorage.setItem('tornSpyKey', this.spyKey);
        
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
        this.fetchTargets();
        
        this.nextFetchTime = Math.floor(Date.now() / 1000) + 15;

        this.pollInterval = setInterval(() => {
            this.fetchTargets(true);
            this.nextFetchTime = Math.floor(Date.now() / 1000) + 15;
        }, 15000); 
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
            this.error = "API key and Faction ID are required.";
            return;
        }
        
        if (!isBackground) {
            this.isLoading = true;
        }
        this.error = '';

        // Only fetch spy data if not yet loaded or on manual trigger
        const skipSpy = isBackground && this.hasLoadedSpyData;

        try {
            const baseEndpoint = this.activeTab === 'elimination' 
                ? `/api/elimination/faction/${this.factionId}`
                : `/api/faction/${this.factionId}`;

            const params = new URLSearchParams();
            params.set('provider', this.spyProvider || 'ffscouter');
            if (skipSpy) {
                params.set('skipSpy', 'true');
            }

            const headers: Record<string, string> = { 'X-API-Key': this.apiKey };
            if (this.spyProvider === 'tornstats' && this.spyKey) {
                headers['X-TornStats-Key'] = this.spyKey;
            }

            const response = await fetch(`${baseEndpoint}?${params.toString()}`, {
                headers
            });
            const data = await response.json();

            if (data.error) {
                this.error = `Error: ${data.error}. Details: ${data.details || 'None'}`;
                this.targets = [];
                if (data.error.code === 2 || data.error.includes?.('Key') || data.error.includes?.('Access')) {
                    this.stopPolling();
                }
            } else {
                const statusPriority: Record<string, number> = {
                    'Okay': 1,
                    'Hospital': 2,
                    'Traveling': 3,
                    'Abroad': 3,
                    'Jail': 4,
                    'Federal': 5,
                    'Offline': 6,
                };

                this.targets = Object.entries(data.members || {})
                    .map(([id, member]: [string, any]) => {
                        if (!skipSpy && (member.bsEstimate !== undefined || member.elimination?.bsEstimate !== undefined)) {
                            this.cachedMemberStats.set(id, {
                                bsEstimate: member.bsEstimate ?? member.elimination?.bsEstimate ?? null,
                                bsEstimateSource: member.bsEstimateSource ?? member.elimination?.bsEstimateSource,
                                fairFight: member.fairFight ?? null
                            });
                        }

                        const cached = this.cachedMemberStats.get(id);
                        const bsEstimate = member.bsEstimate ?? cached?.bsEstimate ?? member.elimination?.bsEstimate ?? null;
                        const bsEstimateSource = member.bsEstimateSource ?? cached?.bsEstimateSource ?? member.elimination?.bsEstimateSource;
                        const fairFight = member.fairFight ?? cached?.fairFight ?? null;

                        return {
                            id,
                            ...member,
                            bsEstimate,
                            bsEstimateSource,
                            fairFight,
                            elimination: member.elimination ? {
                                ...member.elimination,
                                bsEstimate,
                                bsEstimateSource
                            } : undefined
                        };
                    })
                    .sort((a: Member, b: Member) => {
                        const priorityA = statusPriority[a.status?.state] || 99;
                        const priorityB = statusPriority[b.status?.state] || 99;

                        if (priorityA !== priorityB) {
                            return priorityA - priorityB;
                        }

                        const a_until = a.status?.until || 0;
                        const b_until = b.status?.until || 0;
                        return a_until - b_until;
                    });

                if (!skipSpy) {
                    this.hasLoadedSpyData = true;
                }

                this.loadTargetData();
                
                const now = new Date();
                this.lastUpdatedStr = now.toLocaleTimeString();
            }
        } catch (err) {
            console.error('Failed to fetch targets:', err);
            this.error = 'Could not connect to the API server. Is it running?';
            this.targets = [];
        } finally {
            if (!isBackground) {
                this.isLoading = false;
            }
        }
    }
}
