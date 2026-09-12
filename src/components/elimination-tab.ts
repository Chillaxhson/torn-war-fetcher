import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { Member, EliminationTeam, calculateFairFight } from '../types.js';
import './countdown-timer.js';

@customElement('elimination-tab')
export class EliminationTab extends LitElement {
    @property({ type: Array })
    targets: Member[] = [];

    @property({ type: Array })
    teams: EliminationTeam[] = [];

    @property({ type: Number })
    userBattleStats: number | null = null;

    @property({ type: Boolean })
    isLoading = false;

    @property({ type: Boolean })
    soundEnabled = true;

    // Filters
    @state()
    private selectedTeamIds: number[] = []; // empty = all

    @state()
    private ffMin = '1.25';

    @state()
    private ffMax = '3.5';

    @state()
    private selectedStatuses: string[] = ['Okay', 'Abroad']; // default: attackable now

    @state()
    private selectedActivities: string[] = ['online', 'idle', 'offline'];

    @state()
    private searchQuery = '';

    @state()
    private sortBy = 'ff-asc'; // 'ff-asc' | 'ff-desc' | 'level-asc' | 'level-desc' | 'status' | 'name'

    static styles = css`
        :host {
            display: block;
            width: 100%;
        }

        .elim-panel {
            display: flex;
            flex-direction: column;
            gap: 1.25rem;
        }

        /* Tactical Header Bar */
        .analytics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
            gap: 0.75rem;
        }

        .metric-card {
            background: #121620;
            border: 1px solid #242c3f;
            border-radius: 8px;
            padding: 0.75rem 1rem;
            display: flex;
            flex-direction: column;
            gap: 4px;
        }

        .metric-card.accent {
            border-color: rgba(59, 130, 246, 0.4);
            background: rgba(59, 130, 246, 0.05);
        }

        .metric-card.success {
            border-color: rgba(16, 185, 129, 0.4);
            background: rgba(16, 185, 129, 0.05);
        }

        .metric-val {
            font-family: 'JetBrains Mono', monospace;
            font-size: 1.35rem;
            font-weight: 800;
            color: #f1f5f9;
        }

        .metric-card.success .metric-val {
            color: #10b981;
        }

        .metric-card.accent .metric-val {
            color: #3b82f6;
        }

        .metric-label {
            font-size: 0.7rem;
            color: #94a3b8;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            font-weight: 600;
        }

        /* Filter Panel */
        .filter-section {
            background: #121620;
            border: 1px solid #242c3f;
            border-radius: 10px;
            padding: 1.25rem 1.5rem;
            display: flex;
            flex-direction: column;
            gap: 1.15rem;
        }

        .filter-row {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
        }

        .filter-label {
            font-size: 0.75rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: #94a3b8;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .teams-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
            gap: 0.5rem;
        }

        .team-chip-btn {
            background: #161b26;
            border: 1px solid #28334a;
            color: #cbd5e1;
            padding: 0.5rem 0.75rem;
            border-radius: 6px;
            font-size: 0.8rem;
            font-weight: 600;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 6px;
            transition: all 0.15s;
            text-align: left;
        }

        .team-chip-btn:hover {
            border-color: #3b82f6;
            color: #fff;
        }

        .team-chip-btn.active {
            border-color: var(--team-color, #3b82f6);
            background: rgba(59, 130, 246, 0.15);
            color: #fff;
            box-shadow: 0 0 10px rgba(59, 130, 246, 0.2);
        }

        .team-chip-btn.eliminated {
            opacity: 0.45;
            text-decoration: line-through;
        }

        .team-badge-circle {
            width: 10px;
            height: 10px;
            border-radius: 50%;
            background-color: var(--team-color, #3b82f6);
            flex-shrink: 0;
        }

        .team-count {
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.75rem;
            background: rgba(0, 0, 0, 0.3);
            padding: 1px 6px;
            border-radius: 4px;
            color: #94a3b8;
        }

        .ff-controls {
            display: flex;
            align-items: center;
            gap: 1rem;
            flex-wrap: wrap;
        }

        .ff-inputs {
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }

        .ff-inputs input {
            width: 70px;
            padding: 0.4rem 0.5rem;
            border-radius: 6px;
            border: 1px solid #28334a;
            background: #0d1017;
            color: #f1f5f9;
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.9rem;
            text-align: center;
        }

        .ff-inputs input:focus {
            outline: none;
            border-color: #3b82f6;
        }

        .ff-presets {
            display: flex;
            align-items: center;
            gap: 0.35rem;
            flex-wrap: wrap;
        }

        .btn-preset {
            background: #191f2d;
            border: 1px solid #28334a;
            color: #94a3b8;
            padding: 0.3rem 0.6rem;
            border-radius: 4px;
            font-size: 0.75rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.15s;
        }

        .btn-preset:hover {
            border-color: #3b82f6;
            color: #fff;
        }

        .btn-preset.active {
            background: #2563eb;
            color: #fff;
            border-color: #3b82f6;
        }

        /* Chip buttons */
        .chips-group {
            display: flex;
            align-items: center;
            gap: 0.35rem;
            flex-wrap: wrap;
        }

        .chip-toggle {
            background: #191f2d;
            border: 1px solid #28334a;
            color: #94a3b8;
            padding: 0.35rem 0.75rem;
            border-radius: 6px;
            font-size: 0.8rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.15s;
        }

        .chip-toggle:hover {
            border-color: #3b82f6;
            color: #fff;
        }

        .chip-toggle.active {
            background: #2563eb;
            color: #fff;
            border-color: #3b82f6;
        }

        /* Target Board */
        .board-header {
            display: grid;
            grid-template-columns: 35px 2fr 110px 90px 70px 100px 1.2fr 100px;
            gap: 0.75rem;
            align-items: center;
            padding: 0.6rem 1rem;
            background: #121620;
            border: 1px solid #242c3f;
            border-radius: 8px 8px 0 0;
            font-size: 0.7rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: #64748b;
        }

        @media (max-width: 960px) {
            .board-header {
                display: none;
            }
        }

        .board-list {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
        }

        .board-row {
            display: grid;
            grid-template-columns: 35px 2fr 110px 90px 70px 100px 1.2fr 100px;
            gap: 0.75rem;
            align-items: center;
            padding: 0.75rem 1rem;
            background: #161b26;
            border: 1px solid #242c3f;
            border-radius: 6px;
            transition: all 0.15s ease;
        }

        .board-row:hover {
            border-color: #3b4b6d;
            background: #19202f;
        }

        .board-row.status-Okay {
            border-left: 4px solid #10b981;
        }

        .board-row.status-Hospital {
            border-left: 4px solid #ef4444;
        }

        .board-row.status-Abroad, .board-row.status-Traveling {
            border-left: 4px solid #06b6d4;
        }

        .board-row.armed {
            box-shadow: 0 0 12px rgba(245, 158, 11, 0.4);
            border-left: 4px solid #f59e0b;
        }

        @media (max-width: 960px) {
            .board-row {
                display: flex;
                flex-direction: column;
                align-items: stretch;
                gap: 0.6rem;
            }
        }

        .c-rank {
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.8rem;
            color: #64748b;
        }

        .c-name {
            font-weight: 700;
            font-size: 0.95rem;
            color: #f1f5f9;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .c-name a {
            color: inherit;
            text-decoration: none;
        }

        .c-name a:hover {
            color: #60a5fa;
            text-decoration: underline;
        }

        .c-ff {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            font-family: 'JetBrains Mono', monospace;
            font-weight: 700;
            font-size: 0.85rem;
            padding: 2px 6px;
            border-radius: 4px;
            border: 1px solid;
            width: fit-content;
        }

        .c-stats {
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.8rem;
            color: #94a3b8;
        }

        .c-lvl {
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.85rem;
            color: #cbd5e1;
        }

        .c-act {
            display: flex;
            align-items: center;
            gap: 5px;
            font-size: 0.75rem;
            color: #94a3b8;
        }

        .dot {
            width: 7px;
            height: 7px;
            border-radius: 50%;
            display: inline-block;
        }

        .dot.online { background: #10b981; box-shadow: 0 0 6px rgba(16, 185, 129, 0.7); }
        .dot.idle { background: #f59e0b; box-shadow: 0 0 6px rgba(245, 158, 11, 0.6); }
        .dot.offline { background: #64748b; }

        .c-team {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            font-size: 0.8rem;
            font-weight: 700;
            color: #cbd5e1;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .c-action {
            display: flex;
            align-items: center;
            justify-content: flex-end;
            gap: 0.5rem;
        }

        .btn-hit {
            background: linear-gradient(180deg, #ef4444, #dc2626);
            color: white;
            padding: 0.4rem 0.85rem;
            border-radius: 6px;
            text-decoration: none;
            font-size: 0.8rem;
            font-weight: 700;
            border: 1px solid #f87171;
            transition: all 0.2s;
            display: inline-flex;
            align-items: center;
            gap: 4px;
        }

        .btn-hit:hover {
            background: linear-gradient(180deg, #f87171, #ef4444);
            box-shadow: 0 0 10px rgba(239, 68, 68, 0.5);
            transform: translateY(-1px);
        }

        .status-pill {
            font-size: 0.75rem;
            padding: 1px 6px;
            border-radius: 4px;
            font-weight: 600;
        }

        .status-pill.Okay { background: rgba(16, 185, 129, 0.15); color: #34d399; }
        .status-pill.Hospital { background: rgba(239, 68, 68, 0.15); color: #f87171; }
        .status-pill.Abroad, .status-pill.Traveling { background: rgba(6, 182, 212, 0.15); color: #22d3ee; }
        .status-pill.Jail { background: rgba(168, 85, 247, 0.15); color: #c084fc; }

        .search-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 1rem;
            flex-wrap: wrap;
        }

        .search-box input {
            padding: 0.45rem 0.85rem;
            border-radius: 6px;
            border: 1px solid #28334a;
            background: #0d1017;
            color: #f1f5f9;
            font-size: 0.85rem;
            font-family: inherit;
        }

        .sort-select {
            padding: 0.45rem 0.75rem;
            border-radius: 6px;
            border: 1px solid #28334a;
            background: #0d1017;
            color: #cbd5e1;
            font-size: 0.8rem;
            font-family: inherit;
            cursor: pointer;
        }

        .alert-check {
            cursor: pointer;
            accent-color: #f59e0b;
        }

        .empty-box {
            text-align: center;
            padding: 3rem 1rem;
            color: #64748b;
            background: #121620;
            border-radius: 8px;
            border: 1px dashed #242c3f;
        }
    `;

    private formatNumber(num: number | null | undefined): string {
        if (!num || isNaN(num)) return '?';
        if (num >= 1e12) return (num / 1e12).toFixed(2) + 'T';
        if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
        if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
        if (num >= 1e3) return (num / 1e3).toFixed(0) + 'k';
        return num.toLocaleString();
    }

    private toggleTeamSelection(teamId: number) {
        if (this.selectedTeamIds.includes(teamId)) {
            this.selectedTeamIds = this.selectedTeamIds.filter(id => id !== teamId);
        } else {
            this.selectedTeamIds = [...this.selectedTeamIds, teamId];
        }
    }

    private toggleStatus(st: string) {
        if (this.selectedStatuses.includes(st)) {
            this.selectedStatuses = this.selectedStatuses.filter(s => s !== st);
        } else {
            this.selectedStatuses = [...this.selectedStatuses, st];
        }
    }

    private toggleActivity(act: string) {
        if (this.selectedActivities.includes(act)) {
            this.selectedActivities = this.selectedActivities.filter(a => a !== act);
        } else {
            this.selectedActivities = [...this.selectedActivities, act];
        }
    }

    private setFfPreset(min: string, max: string) {
        this.ffMin = min;
        this.ffMax = max;
    }

    render() {
        if (this.targets.length === 0) {
            return html`
                <div class="empty-box">
                    <p style="margin: 0 0 0.5rem 0; font-size: 1.1rem; color: #94a3b8; font-weight: 600;">
                        No elimination targets loaded
                    </p>
                    <p style="margin: 0; font-size: 0.85rem;">
                        Enter your API key and target faction ID in the form above to fetch and filter targets.
                    </p>
                </div>
            `;
        }

        // Count faction members belonging to each elimination team
        const factionTeamCounts = new Map<number, number>();
        let inElimCount = 0;
        for (const t of this.targets) {
            const teamId = t.elimination?.teamId;
            if (teamId) {
                factionTeamCounts.set(teamId, (factionTeamCounts.get(teamId) || 0) + 1);
                inElimCount++;
            }
        }

        // Parse Fair Fight bounds
        const minFF = parseFloat(this.ffMin);
        const maxFF = parseFloat(this.ffMax);
        const hasMinFF = !isNaN(minFF) && minFF > 0;
        const hasMaxFF = !isNaN(maxFF) && maxFF > 0;

        // Filter targets
        const filtered = this.targets.filter(t => {
            if (t.hidden) return false;

            // Search query
            if (this.searchQuery.trim()) {
                const q = this.searchQuery.trim().toLowerCase();
                if (!t.name.toLowerCase().includes(q) && !t.id.includes(q)) {
                    return false;
                }
            }

            // Elimination Team filter
            const targetTeamId = t.elimination?.teamId;
            if (this.selectedTeamIds.length > 0) {
                if (!targetTeamId || !this.selectedTeamIds.includes(targetTeamId)) {
                    return false;
                }
            }

            // Status filter
            const state = t.status?.state || 'Offline';
            if (this.selectedStatuses.length > 0) {
                const matchesState = this.selectedStatuses.some(s => {
                    if (s === 'Abroad') return state === 'Abroad' || state === 'Traveling';
                    return state === s;
                });
                if (!matchesState) return false;
            }

            // Activity filter
            const act = (t.last_action?.status || 'Offline').toLowerCase();
            if (this.selectedActivities.length > 0 && !this.selectedActivities.includes(act)) {
                return false;
            }

            // Fair Fight bounds
            if (hasMinFF || hasMaxFF) {
                const ff = calculateFairFight(t.elimination?.bsEstimate, this.userBattleStats);
                if (ff.fairFight !== null) {
                    if (hasMinFF && ff.fairFight < minFF) return false;
                    if (hasMaxFF && ff.fairFight > maxFF) return false;
                }
            }

            return true;
        });

        // Sort targets
        const sorted = this.sortTargets(filtered);

        // Count attackable now (Okay and matching current FF)
        const attackableCount = sorted.filter(t => t.status?.state === 'Okay').length;

        return html`
            <div class="elim-panel">
                <!-- Analytics Summary -->
                <div class="analytics-grid">
                    <div class="metric-card success">
                        <span class="metric-val">${attackableCount}</span>
                        <span class="metric-label">Attackable Now (Okay)</span>
                    </div>
                    <div class="metric-card accent">
                        <span class="metric-val">${filtered.length}</span>
                        <span class="metric-label">Targets in FF & Filters</span>
                    </div>
                    <div class="metric-card">
                        <span class="metric-val">${inElimCount} / ${this.targets.length}</span>
                        <span class="metric-label">Faction In Elimination</span>
                    </div>
                    <div class="metric-card">
                        <span class="metric-val">
                            ${this.userBattleStats ? this.formatNumber(this.userBattleStats) : 'Custom'}
                        </span>
                        <span class="metric-label">Your Battle Stats</span>
                    </div>
                </div>

                <!-- Comprehensive Elimination Filter Panel -->
                <div class="filter-section">
                    <!-- Teams selection -->
                    <div class="filter-row">
                        <div class="filter-label">
                            <span>Filter by Enemy Team</span>
                            <button 
                                class="btn-preset ${this.selectedTeamIds.length === 0 ? 'active' : ''}"
                                @click=${() => this.selectedTeamIds = []}
                            >
                                ${this.selectedTeamIds.length === 0 ? 'All Teams Selected' : 'Select All Teams'}
                            </button>
                        </div>
                        <div class="teams-grid">
                            ${this.teams.map(team => {
                                const countInFaction = factionTeamCounts.get(team.id) || 0;
                                const isSelected = this.selectedTeamIds.includes(team.id);
                                return html`
                                    <button 
                                        class="team-chip-btn ${isSelected ? 'active' : ''} ${team.eliminated ? 'eliminated' : ''}"
                                        style="--team-color: ${team.color};"
                                        @click=${() => this.toggleTeamSelection(team.id)}
                                        title="${team.name}${team.eliminated ? ' (Eliminated)' : ''} - ${countInFaction} members in this faction"
                                    >
                                        <span style="display: flex; align-items: center; gap: 6px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                                            <span class="team-badge-circle"></span>
                                            ${team.name}
                                        </span>
                                        <span class="team-count">${countInFaction}</span>
                                    </button>
                                `;
                            })}
                        </div>
                    </div>

                    <!-- Fair Fight Range -->
                    <div class="filter-row">
                        <div class="filter-label">
                            <span>Fair Fight (FF) Range</span>
                            <span style="font-weight: normal; color: #64748b; font-size: 0.7rem;">
                                Formula: 1 + 2.67 &times; &radic;(Target BS / Your BS)
                            </span>
                        </div>
                        <div class="ff-controls">
                            <div class="ff-inputs">
                                <input 
                                    type="number" 
                                    step="0.1" 
                                    min="1" 
                                    max="99" 
                                    placeholder="Min" 
                                    .value=${this.ffMin}
                                    @input=${(e: any) => this.ffMin = e.target.value}
                                >
                                <span style="color: #64748b; font-size: 0.85rem;">to</span>
                                <input 
                                    type="number" 
                                    step="0.1" 
                                    min="1" 
                                    max="99" 
                                    placeholder="Max" 
                                    .value=${this.ffMax}
                                    @input=${(e: any) => this.ffMax = e.target.value}
                                >
                            </div>

                            <div class="ff-presets">
                                <button 
                                    class="btn-preset ${this.ffMin === '1.0' && this.ffMax === '2.0' ? 'active' : ''}"
                                    @click=${() => this.setFfPreset('1.0', '2.0')}
                                >
                                    Easy (&le; 2.0)
                                </button>
                                <button 
                                    class="btn-preset ${this.ffMin === '1.25' && this.ffMax === '3.5' ? 'active' : ''}"
                                    @click=${() => this.setFfPreset('1.25', '3.5')}
                                >
                                    Optimal (1.25 - 3.5)
                                </button>
                                <button 
                                    class="btn-preset ${this.ffMin === '3.5' && this.ffMax === '4.5' ? 'active' : ''}"
                                    @click=${() => this.setFfPreset('3.5', '4.5')}
                                >
                                    Hard (3.5 - 4.5)
                                </button>
                                <button 
                                    class="btn-preset ${!this.ffMin && !this.ffMax ? 'active' : ''}"
                                    @click=${() => this.setFfPreset('', '')}
                                >
                                    Any / All
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Status & Activity filters -->
                    <div style="display: flex; gap: 1.5rem; flex-wrap: wrap;">
                        <div class="filter-row" style="flex: 1; min-width: 200px;">
                            <span class="filter-label">Status</span>
                            <div class="chips-group">
                                <button 
                                    class="chip-toggle ${this.selectedStatuses.includes('Okay') ? 'active' : ''}"
                                    @click=${() => this.toggleStatus('Okay')}
                                >
                                    Okay
                                </button>
                                <button 
                                    class="chip-toggle ${this.selectedStatuses.includes('Abroad') ? 'active' : ''}"
                                    @click=${() => this.toggleStatus('Abroad')}
                                >
                                    Abroad / Traveling
                                </button>
                                <button 
                                    class="chip-toggle ${this.selectedStatuses.includes('Hospital') ? 'active' : ''}"
                                    @click=${() => this.toggleStatus('Hospital')}
                                >
                                    Hospital
                                </button>
                                <button 
                                    class="chip-toggle ${this.selectedStatuses.includes('Jail') ? 'active' : ''}"
                                    @click=${() => this.toggleStatus('Jail')}
                                >
                                    Jail
                                </button>
                            </div>
                        </div>

                        <div class="filter-row" style="flex: 1; min-width: 200px;">
                            <span class="filter-label">Active State</span>
                            <div class="chips-group">
                                <button 
                                    class="chip-toggle ${this.selectedActivities.includes('online') ? 'active' : ''}"
                                    @click=${() => this.toggleActivity('online')}
                                >
                                    Online
                                </button>
                                <button 
                                    class="chip-toggle ${this.selectedActivities.includes('idle') ? 'active' : ''}"
                                    @click=${() => this.toggleActivity('idle')}
                                >
                                    Idle
                                </button>
                                <button 
                                    class="chip-toggle ${this.selectedActivities.includes('offline') ? 'active' : ''}"
                                    @click=${() => this.toggleActivity('offline')}
                                >
                                    Offline
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Search & Sort Row -->
                    <div class="search-row">
                        <div class="search-box">
                            <input 
                                type="text"
                                placeholder="Search target by name or ID..."
                                .value=${this.searchQuery}
                                @input=${(e: any) => this.searchQuery = e.target.value}
                            >
                        </div>

                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <span style="font-size: 0.8rem; color: #94a3b8;">Sort by:</span>
                            <select 
                                class="sort-select"
                                .value=${this.sortBy}
                                @change=${(e: any) => this.sortBy = e.target.value}
                            >
                                <option value="ff-asc">Fair Fight (Lowest / Easiest first)</option>
                                <option value="ff-desc">Fair Fight (Highest / Hardest first)</option>
                                <option value="status">Status (Okay first)</option>
                                <option value="level-asc">Level (Low to High)</option>
                                <option value="level-desc">Level (High to Low)</option>
                                <option value="name">Name (A-Z)</option>
                            </select>
                        </div>
                    </div>
                </div>

                <!-- Elimination Board List -->
                <div>
                    <div class="board-header">
                        <span>#</span>
                        <span>Player</span>
                        <span>Fair Fight</span>
                        <span>Est Stats</span>
                        <span>Level</span>
                        <span>Activity</span>
                        <span>Team</span>
                        <span style="text-align: right;">Action</span>
                    </div>

                    <div class="board-list">
                        ${sorted.length > 0 ? sorted.map((target, idx) => {
                            const est = target.bsEstimate ?? target.elimination?.bsEstimate ?? null;
                            const ff = calculateFairFight(est, this.userBattleStats);
                            const act = (target.last_action?.status || 'Offline').toLowerCase();
                            const actClass = act === 'online' ? 'online' : act === 'idle' ? 'idle' : 'offline';
                            const stateNormalized = (target.status?.state || 'Offline').replace(/\s+/g, '');
                            const attackUrl = `https://www.torn.com/page.php?sid=attack&user2ID=${target.id}`;

                            return html`
                                <div class="board-row status-${stateNormalized} ${target.notify ? 'armed' : ''}">
                                    <span class="c-rank">${idx + 1}</span>

                                    <div class="c-name">
                                        <a href="https://www.torn.com/profiles.php?XID=${target.id}" target="_blank">
                                            ${target.name}
                                        </a>
                                        <span class="status-pill ${stateNormalized}">
                                            ${target.status?.state}
                                        </span>
                                        ${target.status?.until > 0 ? html`
                                            <countdown-timer 
                                                badge
                                                .until=${target.status.until}
                                                @timer-end=${() => this.handleTimerEnd(target)}
                                            ></countdown-timer>
                                        ` : ''}
                                    </div>

                                    <div>
                                        ${ff.fairFight ? html`
                                            <span 
                                                class="c-ff" 
                                                style="background: ${ff.color}15; color: ${ff.textColor}; border-color: ${ff.color}40;"
                                                title="Fair Fight: ${ff.fairFight.toFixed(2)} (${ff.difficulty})"
                                            >
                                                ${ff.fairFight.toFixed(2)} &middot; ${ff.difficulty}
                                            </span>
                                        ` : html`<span style="color: #64748b; font-size: 0.8rem;">?</span>`}
                                    </div>

                                    <span class="c-stats">
                                        ~${this.formatNumber(target.elimination?.bsEstimate)}
                                    </span>

                                    <span class="c-lvl">Lvl ${target.level}</span>

                                    <div class="c-act">
                                        <span class="dot ${actClass}"></span>
                                        <span>${target.last_action?.relative || 'Offline'}</span>
                                    </div>

                                    <div class="c-team" title="${target.elimination?.teamName}">
                                        ${target.elimination?.teamName && target.elimination.teamName !== 'None' ? html`
                                            <span style="color: #60a5fa; font-weight: 700;">
                                                ${target.elimination.teamName}
                                            </span>
                                        ` : html`
                                            <span style="color: #64748b;">Not in Elim</span>
                                        `}
                                    </div>

                                    <div class="c-action">
                                        <input 
                                            type="checkbox" 
                                            class="alert-check"
                                            title="Alarm when out of hospital"
                                            .checked=${target.notify || false}
                                            @change=${(e: any) => this.toggleNotify(target.id, e.target.checked)}
                                        >
                                        <a class="btn-hit" href=${attackUrl} target="_blank">
                                            Attack
                                        </a>
                                    </div>
                                </div>
                            `;
                        }) : html`
                            <div class="empty-box">
                                <p style="margin: 0;">No targets match the current elimination team and Fair Fight filters.</p>
                            </div>
                        `}
                    </div>
                </div>
            </div>
        `;
    }

    private toggleNotify(targetId: string, notify: boolean) {
        this.dispatchEvent(new CustomEvent('update-target', {
            detail: { targetId, changes: { notify } },
            bubbles: true,
            composed: true
        }));
    }

    private handleTimerEnd(target: Member) {
        if (target.notify) {
            if (this.soundEnabled) {
                this.playNotificationSound();
            }
            window.open(`https://www.torn.com/page.php?sid=attack&user2ID=${target.id}`, '_blank');
            this.dispatchEvent(new CustomEvent('update-target', {
                detail: { targetId: target.id, changes: { notify: false } },
                bubbles: true,
                composed: true
            }));
        }
    }

    private playNotificationSound() {
        try {
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            if (!audioContext) return;

            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(587.33, audioContext.currentTime);
            oscillator.frequency.setValueAtTime(880.00, audioContext.currentTime + 0.1);
            gainNode.gain.setValueAtTime(0.4, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);

            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.4);
        } catch {
            // Audio context not allowed or failed
        }
    }

    private sortTargets(list: Member[]): Member[] {
        return [...list].sort((a, b) => {
            const ffA = calculateFairFight(a.elimination?.bsEstimate, this.userBattleStats).fairFight || 999;
            const ffB = calculateFairFight(b.elimination?.bsEstimate, this.userBattleStats).fairFight || 999;

            if (this.sortBy === 'ff-asc') {
                return ffA - ffB;
            }
            if (this.sortBy === 'ff-desc') {
                return ffB - ffA;
            }
            if (this.sortBy === 'level-asc') {
                return a.level - b.level;
            }
            if (this.sortBy === 'level-desc') {
                return b.level - a.level;
            }
            if (this.sortBy === 'name') {
                return a.name.localeCompare(b.name);
            }

            // Status sorting
            const priority: Record<string, number> = { Okay: 1, Hospital: 2, Abroad: 3, Traveling: 3, Jail: 4, Offline: 5 };
            const pA = priority[a.status?.state] || 99;
            const pB = priority[b.status?.state] || 99;
            if (pA !== pB) return pA - pB;

            return (a.status?.until || 0) - (b.status?.until || 0);
        });
    }
}
