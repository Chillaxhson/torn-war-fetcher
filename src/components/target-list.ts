import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { Member, calculateFairFight } from '../types.js';
import './target-card.js';

@customElement('target-list')
export class TargetList extends LitElement {
    @property({ type: Array })
    targets: Member[] = [];

    @property({ type: Number })
    userBattleStats: number | null = null;

    @property({ type: Boolean })
    soundEnabled = true;

    @state()
    private showBulkHide = false;

    @state()
    private bulkHideNames = '';

    @state()
    private searchQuery = '';

    @state()
    private filterStatus = 'all'; // 'all' | 'okay' | 'hospital' | 'abroad' | 'online'
    
    @state()
    private ffFilter = 'all'; // 'all' | '3' | '2.5' | '2' | '1' | 'unknown'

    @state()
    private sortBy = 'status'; // 'status' | 'level-desc' | 'level-asc' | 'name'

    @state()
    private showCollapsedSection = false;

    static styles = css`
        :host {
            display: block;
            width: 100%;
        }

        .summary-bar {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            flex-wrap: wrap;
            margin-bottom: 1.25rem;
        }

        .stat-card {
            background: #121620;
            border: 1px solid #242c3f;
            border-radius: 8px;
            padding: 0.6rem 1rem;
            display: flex;
            flex-direction: column;
            gap: 2px;
            min-width: 100px;
        }

        .stat-card.hittable {
            border-color: rgba(16, 185, 129, 0.4);
            background: rgba(16, 185, 129, 0.05);
        }

        .stat-card .num {
            font-family: 'JetBrains Mono', monospace;
            font-size: 1.25rem;
            font-weight: 700;
            color: #f1f5f9;
        }

        .stat-card.hittable .num {
            color: #10b981;
        }

        .stat-card .lbl {
            font-size: 0.7rem;
            color: #94a3b8;
            text-transform: uppercase;
            letter-spacing: 0.04em;
        }

        .filter-toolbar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 1rem;
            flex-wrap: wrap;
            background: #121620;
            border: 1px solid #242c3f;
            border-radius: 8px;
            padding: 0.75rem 1rem;
            margin-bottom: 1.25rem;
        }

        .search-box {
            position: relative;
            flex-grow: 1;
            min-width: 180px;
            max-width: 320px;
        }

        .search-box input {
            width: 100%;
            padding: 0.45rem 0.75rem 0.45rem 2rem;
            border-radius: 6px;
            border: 1px solid #28334a;
            background: #0d1017;
            color: #f1f5f9;
            font-size: 0.85rem;
            font-family: inherit;
        }

        .search-box input:focus {
            outline: none;
            border-color: #3b82f6;
        }

        .search-icon {
            position: absolute;
            left: 8px;
            top: 50%;
            transform: translateY(-50%);
            color: #64748b;
        }

        .filter-chips {
            display: flex;
            align-items: center;
            gap: 0.35rem;
            flex-wrap: wrap;
        }

        .chip-btn {
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

        .chip-btn:hover {
            border-color: #3b82f6;
            color: #f1f5f9;
        }

        .chip-btn.active {
            background: #2563eb;
            color: #fff;
            border-color: #3b82f6;
        }

        .chip-btn.badge-okay.active {
            background: #10b981;
            border-color: #059669;
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

        .sort-select:focus {
            outline: none;
            border-color: #3b82f6;
        }

        .btn-text {
            background: none;
            border: 1px solid #334155;
            color: #94a3b8;
            padding: 0.35rem 0.75rem;
            border-radius: 6px;
            font-size: 0.8rem;
            cursor: pointer;
            transition: all 0.15s;
        }

        .btn-text:hover {
            background: #1e293b;
            color: #fff;
        }

        .bulk-hide-section {
            margin-bottom: 1.25rem;
            background: #161b26;
            padding: 1rem 1.25rem;
            border-radius: 8px;
            border: 1px solid #334155;
        }

        textarea.bulk-input {
            width: 100%;
            height: 90px;
            background-color: #0d1017;
            border: 1px solid #28334a;
            color: #eee;
            padding: 0.6rem;
            border-radius: 6px;
            box-sizing: border-box;
            resize: vertical;
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.85rem;
            margin-bottom: 0.6rem;
        }

        .bulk-actions {
            display: flex;
            gap: 0.5rem;
            justify-content: flex-end;
        }

        .btn-apply {
            background: #dc2626;
            color: white;
            border: none;
            padding: 0.4rem 1rem;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 600;
            font-size: 0.85rem;
        }

        .btn-apply:hover {
            background: #b91c1c;
        }

        .targets-container {
            display: flex;
            flex-direction: column;
            gap: 0.6rem;
        }

        .section-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding-bottom: 0.5rem;
            margin: 1.5rem 0 0.75rem 0;
            border-bottom: 1px solid #242c3f;
        }

        .section-header h2 {
            font-size: 1.05rem;
            font-weight: 700;
            color: #f1f5f9;
            margin: 0;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .count-pill {
            background: #1e2638;
            color: #94a3b8;
            padding: 2px 8px;
            border-radius: 9999px;
            font-size: 0.75rem;
            font-family: 'JetBrains Mono', monospace;
        }

        .empty-notice {
            text-align: center;
            padding: 3rem 1rem;
            color: #64748b;
            font-size: 0.95rem;
            background: #121620;
            border-radius: 8px;
            border: 1px dashed #242c3f;
        }
    `;

    render() {
        if (this.targets.length === 0) {
            return html`
                <div class="empty-notice">
                    <p style="margin: 0 0 0.5rem 0; font-size: 1.1rem; color: #94a3b8; font-weight: 600;">
                        No targets loaded
                    </p>
                    <p style="margin: 0; font-size: 0.85rem;">
                        Enter your API key and target faction ID above, then click <strong>Fetch Targets</strong>.
                    </p>
                </div>
            `;
        }

        // Calculate summary counts
        const totalCount = this.targets.length;
        const okayCount = this.targets.filter(t => t.status?.state === 'Okay' && !t.hidden).length;
        const hospCount = this.targets.filter(t => t.status?.state === 'Hospital' && !t.hidden).length;
        const abroadCount = this.targets.filter(t => (t.status?.state === 'Abroad' || t.status?.state === 'Traveling') && !t.hidden).length;
        const onlineCount = this.targets.filter(t => t.last_action?.status?.toLowerCase() === 'online' && !t.hidden).length;

        // Filter and sort targets
        let filtered = this.targets.filter(t => {
            if (t.hidden) return false;

            // Search filter
            if (this.searchQuery.trim()) {
                const q = this.searchQuery.trim().toLowerCase();
                const matchesName = t.name.toLowerCase().includes(q);
                const matchesId = t.id.includes(q);
                if (!matchesName && !matchesId) return false;
            }

            // Status filter
            if (this.filterStatus === 'okay') {
                if (t.status?.state !== 'Okay') return false;
            } else if (this.filterStatus === 'hospital') {
                if (t.status?.state !== 'Hospital') return false;
            } else if (this.filterStatus === 'abroad') {
                if (t.status?.state !== 'Abroad' && t.status?.state !== 'Traveling') return false;
            } else if (this.filterStatus === 'online') {
                if (t.last_action?.status?.toLowerCase() !== 'online') return false;
            }
            
            // FF Filter
            if (this.ffFilter !== 'all') {
                const ff = calculateFairFight(t.elimination?.bsEstimate, this.userBattleStats);
                if (this.ffFilter === 'unknown' && ff.fairFight !== null) return false;
                if (this.ffFilter !== 'unknown') {
                    if (ff.fairFight === null) return false;
                    const fVal = ff.fairFight;
                    if (this.ffFilter === '3' && fVal < 3) return false;
                    if (this.ffFilter === '2.5' && (fVal < 2.5 || fVal >= 3)) return false;
                    if (this.ffFilter === '2' && (fVal < 2 || fVal >= 2.5)) return false;
                    if (this.ffFilter === '1' && (fVal < 1 || fVal >= 2)) return false;
                }
            }

            return true;
        });

        // Sorting
        filtered = this.sortTargets(filtered);

        const hiddenTargets = this.targets.filter(t => t.hidden);

        return html`
            <!-- Summary Bar -->
            <div class="summary-bar">
                <div class="stat-card">
                    <span class="num">${totalCount}</span>
                    <span class="lbl">Faction Total</span>
                </div>
                <div class="stat-card hittable">
                    <span class="num">${okayCount}</span>
                    <span class="lbl">Attackable (Okay)</span>
                </div>
                <div class="stat-card">
                    <span class="num">${hospCount}</span>
                    <span class="lbl">In Hospital</span>
                </div>
                <div class="stat-card">
                    <span class="num">${abroadCount}</span>
                    <span class="lbl">Traveling / Abroad</span>
                </div>
                <div class="stat-card">
                    <span class="num">${onlineCount}</span>
                    <span class="lbl">Online Now</span>
                </div>
            </div>

            <!-- Toolbar -->
            <div class="filter-toolbar">
                <div class="search-box">
                    <svg class="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="11" cy="11" r="8"/>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    </svg>
                    <input
                        type="text"
                        placeholder="Search targets..."
                        .value=${this.searchQuery}
                        @input=${(e: any) => this.searchQuery = e.target.value}
                    >
                </div>

                <div class="filter-chips">
                    <button 
                        class="chip-btn ${this.filterStatus === 'all' ? 'active' : ''}"
                        @click=${() => this.filterStatus = 'all'}
                    >
                        All (${totalCount})
                    </button>
                    <button 
                        class="chip-btn badge-okay ${this.filterStatus === 'okay' ? 'active' : ''}"
                        @click=${() => this.filterStatus = 'okay'}
                    >
                        Okay (${okayCount})
                    </button>
                    <button 
                        class="chip-btn ${this.filterStatus === 'hospital' ? 'active' : ''}"
                        @click=${() => this.filterStatus = 'hospital'}
                    >
                        Hospital (${hospCount})
                    </button>
                    <button 
                        class="chip-btn ${this.filterStatus === 'abroad' ? 'active' : ''}"
                        @click=${() => this.filterStatus = 'abroad'}
                    >
                        Abroad (${abroadCount})
                    </button>
                    <button 
                        class="chip-btn ${this.filterStatus === 'online' ? 'active' : ''}"
                        @click=${() => this.filterStatus = 'online'}
                    >
                        Online (${onlineCount})
                    </button>
                </div>

                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <select 
                        class="sort-select"
                        .value=${this.ffFilter}
                        @change=${(e: any) => this.ffFilter = e.target.value}
                    >
                        <option value="all">Any FF</option>
                        <option value="3">FF 3.0+</option>
                        <option value="2.5">FF 2.5 - 3.0</option>
                        <option value="2">FF 2.0 - 2.5</option>
                        <option value="1">FF 1.0 - 2.0</option>
                        <option value="unknown">Unknown Stats</option>
                    </select>

                    <select 
                        class="sort-select"
                        .value=${this.sortBy}
                        @change=${(e: any) => this.sortBy = e.target.value}
                    >
                        <option value="status">Sort: Status & Time</option>
                        <option value="ff-desc">Sort: FF (High to Low)</option>
                        <option value="ff-asc">Sort: FF (Low to High)</option>
                        <option value="level-desc">Sort: Level (High to Low)</option>
                        <option value="level-asc">Sort: Level (Low to High)</option>
                        <option value="name">Sort: Name (A-Z)</option>
                    </select>

                    <button class="btn-text" @click=${() => this.showBulkHide = !this.showBulkHide}>
                        ${this.showBulkHide ? 'Cancel' : 'Bulk Hide'}
                    </button>
                </div>
            </div>

            <!-- Bulk Hide Section -->
            ${this.showBulkHide ? html`
                <div class="bulk-hide-section">
                    <p style="margin-top:0; color:#cbd5e1; font-size:0.85rem; font-weight: 600;">
                        Paste names to hide from list (one per line):
                    </p>
                    <textarea 
                        class="bulk-input" 
                        .value=${this.bulkHideNames}
                        @input=${(e: any) => this.bulkHideNames = e.target.value}
                        placeholder="PlayerName1&#10;PlayerName2&#10;..."
                    ></textarea>
                    <div class="bulk-actions">
                        <button class="btn-apply" @click=${this.applyBulkHide}>Hide These Targets</button>
                    </div>
                </div>
            ` : ''}

            <!-- Targets List -->
            <div 
                class="targets-container"
                @notes-changed=${this.handleNotesChanged}
                @toggle-hidden-state=${this.handleTargetHidden}
                @notify-changed=${this.handleNotifyChanged}
            >
                ${filtered.length > 0 ? filtered.map(target => html`
                    <target-card 
                        .target=${target}
                        .userBattleStats=${this.userBattleStats}
                        .soundEnabled=${this.soundEnabled}
                    ></target-card>
                `) : html`
                    <div class="empty-notice">
                        <p style="margin: 0;">No targets match the current filters.</p>
                    </div>
                `}

                <!-- Collapsed / Hidden Targets Section -->
                ${hiddenTargets.length > 0 ? html`
                    <div class="section-header">
                        <h2>
                            <span>Hidden Targets</span>
                            <span class="count-pill">${hiddenTargets.length}</span>
                        </h2>
                        <button class="btn-text" @click=${() => this.showCollapsedSection = !this.showCollapsedSection}>
                            ${this.showCollapsedSection ? 'Collapse Section' : 'Show Hidden Targets'}
                        </button>
                    </div>

                    ${this.showCollapsedSection ? hiddenTargets.map(target => html`
                        <target-card 
                            .target=${target}
                            .userBattleStats=${this.userBattleStats}
                            .soundEnabled=${this.soundEnabled}
                            collapsed
                        ></target-card>
                    `) : ''}
                ` : ''}
            </div>
        `;
    }

    private sortTargets(list: Member[]): Member[] {
        const statusPriority: Record<string, number> = {
            'Okay': 1,
            'Hospital': 2,
            'Traveling': 3,
            'Abroad': 3,
            'Jail': 4,
            'Federal': 5,
            'Offline': 6,
        };

        return [...list].sort((a, b) => {
            if (this.sortBy === 'ff-desc' || this.sortBy === 'ff-asc') {
                const ffA = calculateFairFight(a.elimination?.bsEstimate, this.userBattleStats).fairFight || 999;
                const ffB = calculateFairFight(b.elimination?.bsEstimate, this.userBattleStats).fairFight || 999;
                if (this.sortBy === 'ff-desc') return ffB - ffA;
                return ffA - ffB;
            }
            
            if (this.sortBy === 'level-desc') {
                return b.level - a.level;
            }
            if (this.sortBy === 'level-asc') {
                return a.level - b.level;
            }
            if (this.sortBy === 'name') {
                return a.name.localeCompare(b.name);
            }

            // Default: sort by status priority
            const pA = statusPriority[a.status?.state] || 99;
            const pB = statusPriority[b.status?.state] || 99;
            if (pA !== pB) return pA - pB;

            // If same status, sort by time remaining ascending
            const untilA = a.status?.until || 0;
            const untilB = b.status?.until || 0;
            return untilA - untilB;
        });
    }

    private applyBulkHide() {
        if (!this.bulkHideNames.trim()) return;

        const namesToHide = this.bulkHideNames
            .split('\n')
            .map(n => n.trim().toLowerCase())
            .filter(n => n.length > 0);

        if (namesToHide.length === 0) return;

        this.dispatchEvent(new CustomEvent('bulk-hide', {
            detail: { names: namesToHide },
            bubbles: true,
            composed: true
        }));

        this.bulkHideNames = '';
        this.showBulkHide = false;
    }

    private handleNotesChanged(e: CustomEvent) {
        const { targetId, notes } = e.detail;
        this.dispatchEvent(new CustomEvent('update-target', { 
            detail: { targetId, changes: { notes } },
            bubbles: true,
            composed: true
        }));
    }

    private handleTargetHidden(e: CustomEvent) {
        const { targetId } = e.detail;
        this.dispatchEvent(new CustomEvent('update-target', { 
            detail: { targetId, changes: { toggleHidden: true } },
            bubbles: true,
            composed: true
        }));
    }

    private handleNotifyChanged(e: CustomEvent) {
        const { targetId, notify } = e.detail;
        this.dispatchEvent(new CustomEvent('update-target', { 
            detail: { targetId, changes: { notify } },
            bubbles: true,
            composed: true
        }));
    }
}
