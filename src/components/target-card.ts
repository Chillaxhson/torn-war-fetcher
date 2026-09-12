import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { Member, calculateFairFight } from '../types.js';
import './countdown-timer.js';

@customElement('target-card')
export class TargetCard extends LitElement {
    @property({ type: Object })
    target!: Member;

    @property({ type: Number })
    userBattleStats: number | null = null;

    @property({ type: Boolean, reflect: true })
    collapsed = false;

    @property({ type: Boolean })
    soundEnabled = true;

    static styles = css`
        :host {
            display: block;
            width: 100%;
        }
        
        .target-card {
            background-color: #161b26;
            padding: 0.9rem 1.25rem;
            border-radius: 8px;
            border: 1px solid #242c3f;
            border-left: 5px solid #64748b;
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 1rem;
            transition: all 0.2s ease;
        }

        .target-card:hover {
            border-color: #3b4b6d;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
        }

        :host([collapsed]) .target-card {
            padding: 0.45rem 1rem;
            background-color: #10141d;
            border-color: #1c2333;
        }

        .target-card.status-Okay { 
            border-left-color: #10b981; 
        }
        .target-card.status-Hospital { 
            border-left-color: #ef4444; 
        }
        .target-card.status-Jail { 
            border-left-color: #a855f7; 
        }
        .target-card.status-Traveling { 
            border-left-color: #3b82f6; 
        }
        .target-card.status-Abroad { 
            border-left-color: #06b6d4; 
        }
        .target-card.status-Offline { 
            border-left-color: #64748b; 
        }
        
        .target-card.armed {
            box-shadow: 0 0 14px rgba(245, 158, 11, 0.4);
            border-left-color: #f59e0b;
        }

        :host([collapsed]) .status-details,
        :host([collapsed]) .target-actions .notes-section,
        :host([collapsed]) .target-actions .notify-label,
        :host([collapsed]) .target-actions .attack-button,
        :host([collapsed]) .elim-badges {
            display: none;
        }

        .target-info {
            display: flex;
            flex-direction: column;
            gap: 0.35rem;
            flex-grow: 1;
            min-width: 0;
        }

        .header-line {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            flex-wrap: wrap;
        }

        .name {
            font-weight: 700;
            font-size: 1rem;
            color: #f1f5f9;
        }

        .name a {
            color: inherit;
            text-decoration: none;
            transition: color 0.15s;
        }

        .name a:hover {
            color: #60a5fa;
            text-decoration: underline;
        }

        .level-badge {
            font-size: 0.75rem;
            color: #94a3b8;
            background: #1e2638;
            padding: 1px 6px;
            border-radius: 4px;
            font-family: 'JetBrains Mono', monospace;
        }

        .activity-indicator {
            display: inline-flex;
            align-items: center;
            gap: 5px;
            font-size: 0.75rem;
            color: #94a3b8;
        }

        .dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            display: inline-block;
        }

        .dot.online {
            background-color: #10b981;
            box-shadow: 0 0 8px rgba(16, 185, 129, 0.7);
        }

        .dot.idle {
            background-color: #f59e0b;
            box-shadow: 0 0 8px rgba(245, 158, 11, 0.6);
        }

        .dot.offline {
            background-color: #64748b;
        }

        .status-details {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-size: 0.85rem;
            color: #cbd5e1;
            flex-wrap: wrap;
        }

        .status-badge {
            font-weight: 600;
            padding: 1px 6px;
            border-radius: 4px;
            font-size: 0.75rem;
            text-transform: uppercase;
            letter-spacing: 0.03em;
        }

        .badge-Okay {
            background: rgba(16, 185, 129, 0.15);
            color: #34d399;
            border: 1px solid rgba(16, 185, 129, 0.3);
        }

        .badge-Hospital {
            background: rgba(239, 68, 68, 0.15);
            color: #f87171;
            border: 1px solid rgba(239, 68, 68, 0.3);
        }

        .badge-Traveling, .badge-Abroad {
            background: rgba(59, 130, 246, 0.15);
            color: #60a5fa;
            border: 1px solid rgba(59, 130, 246, 0.3);
        }

        .badge-Jail {
            background: rgba(168, 85, 247, 0.15);
            color: #c084fc;
            border: 1px solid rgba(168, 85, 247, 0.3);
        }

        .badge-Offline, .badge-Federal {
            background: rgba(100, 116, 139, 0.15);
            color: #94a3b8;
            border: 1px solid rgba(100, 116, 139, 0.3);
        }

        .elim-badges {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            margin-top: 2px;
            flex-wrap: wrap;
        }

        .team-chip {
            font-size: 0.75rem;
            font-weight: 700;
            padding: 2px 8px;
            border-radius: 4px;
            background: #1c2333;
            color: #93c5fd;
            border: 1px solid #2e3a52;
            display: inline-flex;
            align-items: center;
            gap: 4px;
        }

        .ff-chip {
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.75rem;
            font-weight: 700;
            padding: 2px 6px;
            border-radius: 4px;
            display: inline-flex;
            align-items: center;
            gap: 4px;
            border: 1px solid;
        }

        .stats-est {
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.75rem;
            color: #94a3b8;
            background: #121620;
            padding: 2px 6px;
            border-radius: 4px;
            border: 1px solid #1f2738;
        }

        .target-actions {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            flex-shrink: 0;
        }

        .action-button {
            padding: 0.5rem 1.1rem;
            color: white;
            text-decoration: none;
            border-radius: 6px;
            font-size: 0.85rem;
            font-weight: 700;
            text-align: center;
            transition: all 0.2s ease;
            border: none;
            cursor: pointer;
            box-shadow: 0 2px 8px rgba(220, 53, 69, 0.35);
            display: inline-flex;
            align-items: center;
            gap: 6px;
        }

        .attack-button {
            background: linear-gradient(180deg, #ef4444, #dc2626);
            border: 1px solid #f87171;
        }

        .attack-button:hover {
            background: linear-gradient(180deg, #f87171, #ef4444);
            box-shadow: 0 4px 14px rgba(239, 68, 68, 0.5);
            transform: translateY(-1px);
        }

        .notes-section {
            position: relative;
        }

        .notes-textarea {
            width: 140px;
            height: 34px;
            background-color: #0f131a;
            border: 1px solid #28334a;
            border-radius: 6px;
            color: #cbd5e1;
            padding: 0.4rem 0.6rem;
            box-sizing: border-box;
            resize: none;
            font-size: 11px;
            font-family: inherit;
            transition: width 0.2s, border-color 0.2s;
        }

        .notes-textarea:focus {
            outline: none;
            width: 190px;
            border-color: #3b82f6;
        }

        .notify-label {
            display: inline-flex;
            align-items: center;
            gap: 5px;
            font-size: 0.75rem;
            color: #94a3b8;
            cursor: pointer;
            user-select: none;
        }

        .notify-label input {
            cursor: pointer;
            accent-color: #f59e0b;
        }

        .collapse-button {
            background: none;
            border: 1px solid #2d374d;
            color: #94a3b8;
            padding: 0.35rem 0.65rem;
            border-radius: 6px;
            cursor: pointer;
            font-size: 0.75rem;
            transition: all 0.2s;
        }

        .collapse-button:hover {
            background-color: #242c3f;
            color: #f1f5f9;
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

    render() {
        const profileUrl = `https://www.torn.com/profiles.php?XID=${this.target.id}`;
        const rawState = this.target.status?.state || 'Offline';
        const stateNormalized = rawState.replace(/\s+/g, '');
        const stateBadgeClass = `badge-${stateNormalized}`;

        const actStatus = (this.target.last_action?.status || 'Offline').toLowerCase();
        const actDotClass = actStatus === 'online' ? 'online' : actStatus === 'idle' ? 'idle' : 'offline';
        const lastActionText = this.target.last_action?.relative || '';

        // Calculate Fair Fight if target has elimination / estimated stats
        const ffInfo = calculateFairFight(this.target.elimination?.bsEstimate, this.userBattleStats);

        return html`
            <div class="target-card status-${stateNormalized} ${this.target.notify ? 'armed' : ''}">
                <div class="target-info">
                    <div class="header-line">
                        <span class="activity-indicator" title="Status: ${this.target.last_action?.status || 'Offline'}">
                            <span class="dot ${actDotClass}"></span>
                            ${lastActionText ? html`<span>${lastActionText}</span>` : ''}
                        </span>

                        <span class="name">
                            <a href=${profileUrl} target="_blank" title="View profile on Torn">${this.target.name}</a>
                        </span>

                        <span class="level-badge">Lvl ${this.target.level}</span>

                        ${this.target.position ? html`
                            <span style="font-size: 0.75rem; color: #64748b;">[${this.target.position}]</span>
                        ` : ''}
                    </div>

                    <div class="status-details">
                        <span class="status-badge ${stateBadgeClass}">${this.target.status?.state}</span>
                        <span>${this.target.status?.description}</span>
                        ${this.target.status?.until > 0 ? html`
                            <countdown-timer 
                                badge
                                .until=${this.target.status.until} 
                                @timer-end=${this.handleTimerEnd}
                            ></countdown-timer>
                        ` : ''}
                    </div>

                    ${this.target.elimination?.teamName && this.target.elimination.teamName !== 'None' ? html`
                        <div class="elim-badges">
                            <span class="team-chip" title="Elimination Team">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                                </svg>
                                ${this.target.elimination.teamName}
                            </span>

                            ${ffInfo.fairFight ? html`
                                <span 
                                    class="ff-chip" 
                                    style="background: ${ffInfo.color}15; color: ${ffInfo.textColor}; border-color: ${ffInfo.color}40;"
                                    title="Fair Fight: ${ffInfo.fairFight.toFixed(2)} (${ffInfo.difficulty})"
                                >
                                    FF ${ffInfo.fairFight.toFixed(2)} &middot; ${ffInfo.difficulty}
                                </span>
                            ` : ''}

                            ${this.target.elimination?.bsEstimate ? html`
                                <span class="stats-est" title="Estimated Battle Stats">
                                    ~${this.formatNumber(this.target.elimination.bsEstimate)} stats
                                </span>
                            ` : ''}
                        </div>
                    ` : ''}
                </div>

                <div class="target-actions">
                    <div class="notes-section">
                        <textarea 
                            class="notes-textarea"
                            placeholder="Add notes..."
                            .value=${this.target.notes || ''}
                            @change=${this.handleNotesChange}
                        ></textarea>
                    </div>

                    <label class="notify-label" title="Sound alarm when target leaves hospital">
                        <input 
                            type="checkbox" 
                            .checked=${this.target.notify || false}
                            @change=${this.toggleArmed}
                        >
                        Alert
                    </label>

                    <button
                        class="action-button attack-button"
                        @click=${this.handleAttack}
                        title="Open direct attack window"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                            <circle cx="12" cy="12" r="10"/>
                            <line x1="22" y1="12" x2="18" y2="12"/>
                            <line x1="6" y1="12" x2="2" y2="12"/>
                            <line x1="12" y1="6" x2="12" y2="2"/>
                            <line x1="12" y1="22" x2="12" y2="18"/>
                        </svg>
                        Attack
                    </button>

                    <button class="collapse-button" @click=${this.hideTarget}>
                        ${this.collapsed ? 'Unhide' : 'Hide'}
                    </button>
                </div>
            </div>
        `;
    }

    private handleAttack() {
        const attackUrl = `https://www.torn.com/page.php?sid=attack&user2ID=${this.target.id}`;
        window.open(attackUrl, '_blank');
    }

    private hideTarget() {
        this.dispatchEvent(new CustomEvent('toggle-hidden-state', {
            detail: { targetId: this.target.id },
            bubbles: true,
            composed: true
        }));
    }

    private toggleArmed(e: Event) {
        const notify = (e.target as HTMLInputElement).checked;
        this.dispatchEvent(new CustomEvent('notify-changed', {
            detail: { targetId: this.target.id, notify },
            bubbles: true,
            composed: true
        }));
    }

    private handleNotesChange(e: Event) {
        const notes = (e.target as HTMLTextAreaElement).value;
        this.dispatchEvent(new CustomEvent('notes-changed', {
            detail: { targetId: this.target.id, notes },
            bubbles: true,
            composed: true
        }));
    }
    
    private handleTimerEnd() {
        if (this.target.notify) {
            if (this.soundEnabled) {
                this.playNotificationSound();
            }
            this.handleAttack();
            this.dispatchEvent(new CustomEvent('notify-changed', {
                detail: { targetId: this.target.id, notify: false },
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
            oscillator.frequency.setValueAtTime(587.33, audioContext.currentTime); // D5
            oscillator.frequency.setValueAtTime(880.00, audioContext.currentTime + 0.1); // A5
            gainNode.gain.setValueAtTime(0.4, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);

            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.4);
        } catch {
            // Audio context not allowed or failed
        }
    }
}
