import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { Member } from '../types.js';
import './countdown-timer.js';

@customElement('target-card')
export class TargetCard extends LitElement {
    @property({ type: Object })
    target!: Member;

    @property({ type: Boolean, reflect: true })
    collapsed = false;

    @state()
    private isArmed = false;

    static styles = css`
        :host {
            display: block;
        }
        
        .target-card {
            background-color: #2c2c2c;
            padding: 1rem 1.5rem;
            border-radius: 6px;
            border-left: 5px solid;
            display: flex;
            justify-content: space-between;
            align-items: center;
            transition: all 0.3s;
        }

        :host([collapsed]) .target-card {
            padding-top: 0.5rem;
            padding-bottom: 0.5rem;
            background-color: #222;
        }

        .target-card.status-Okay { border-color: #4CAF50; }
        .target-card.status-Hospital { border-color: #f44336; }
        .target-card.status-Jail { border-color: #9c27b0; }
        .target-card.status-Traveling { border-color: #2196F3; }
        .target-card.status-Offline { border-color: #6c757d; }
        .target-card.armed {
            border-left-color: #FFC107;
            box-shadow: 0 0 12px rgba(255, 193, 7, 0.6);
        }

        :host([collapsed]) .status,
        :host([collapsed]) .target-actions .notes-section,
        :host([collapsed]) .target-actions .notify-label,
        :host([collapsed]) .target-actions .attack-button {
            display: none;
        }

        .target-info {
            display: flex;
            flex-direction: column;
            gap: 0.25rem;
            flex-grow: 1;
        }

        .name {
            font-weight: bold;
            font-size: 1.1em;
        }

        .name a {
            color: inherit;
            text-decoration: none;
        }

        .name a:hover {
            text-decoration: underline;
        }

        .level {
            font-size: 0.9em;
            color: #bbb;
            margin-left: 0.5rem;
        }

        .status-text {
            font-size: 0.95em;
        }

        .target-main {
            display: flex;
            justify-content: space-between;
            align-items: center;
            width: 100%;
        }

        .target-actions {
            display: flex;
            align-items: center;
            gap: 1rem;
            flex-shrink: 0;
        }

        .action-button {
            display: inline-block;
            padding: 0.5rem 1rem;
            color: white;
            text-decoration: none;
            border-radius: 4px;
            font-size: 14px;
            font-weight: bold;
            text-align: center;
            transition: background-color 0.3s ease;
            border: none;
            cursor: pointer;
        }

        .attack-button {
            background-color: #dc3545;
        }

        .attack-button:hover {
            background-color: #c82333;
        }

        .attack-button:disabled {
            background-color: #5a6268;
            cursor: not-allowed;
            pointer-events: none;
        }

        .notes-section {
            position: relative;
        }

        .notes-textarea {
            width: 150px;
            height: 38px;
            background-color: #333;
            border: 1px solid #444;
            border-radius: 4px;
            color: #eee;
            padding: 0.5rem;
            box-sizing: border-box;
            resize: none;
            font-size: 12px;
        }

        .card-footer {
            display: flex;
            justify-content: flex-end;
            width: 100%;
        }

        .collapse-button {
            background: none;
            border: 1px solid #6c757d;
            color: #ccc;
            padding: 0.3rem 0.8rem;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            transition: all 0.2s;
        }

        .collapse-button:hover {
            background-color: #6c757d;
            color: white;
        }
    `;

    render() {
        const attackUrl = `https://www.torn.com/loader.php?sid=attack&user2ID=${this.target.id}`;
        const profileUrl = `https://www.torn.com/profiles.php?XID=${this.target.id}`;
        const isAttackable = !['Hospital', 'Jail', 'Federal'].includes(this.target.status.state);

        return html`
            <div class="target-card status-${this.target.status.state.replace(/\s+/g, '')} ${this.isArmed ? 'armed' : ''}">
                <div class="target-info">
                    <div>
                        <span class="name">
                            <a href=${profileUrl} target="_blank">${this.target.name}</a>
                        </span>
                        <span class="level">(Level: ${this.target.level})</span>
                    </div>
                    <div class="status">
                        <span class="status-text">
                            <strong>${this.target.status.description}</strong>
                        </span>
                        ${this.target.status.until > 0 ? html`
                            - <countdown-timer .until=${this.target.status.until} @timer-end=${this.handleTimerEnd}></countdown-timer>
                        ` : ''}
                    </div>
                </div>
                <div class="target-actions">
                    <div class="notes-section">
                        <textarea 
                            class="notes-textarea"
                            placeholder="Notes..."
                            .value=${this.target.notes || ''}
                            @change=${this.handleNotesChange}
                        ></textarea>
                    </div>
                    <label class="notify-label">
                        <input 
                            type="checkbox" 
                            class="notify-checkbox"
                            .checked=${this.isArmed}
                            @change=${this.toggleArmed}
                        >
                        Notify
                    </label>
                    <button
                        class="action-button attack-button"
                        ?disabled=${!isAttackable}
                        @click=${this.handleAttack}
                    >
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
        const attackUrl = `https://www.torn.com/loader.php?sid=attack&user2ID=${this.target.id}`;
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
        this.isArmed = (e.target as HTMLInputElement).checked;
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
        if (this.isArmed) {
            this.playNotificationSound();
            this.handleAttack();
            this.isArmed = false; 
        }
    }

    private playNotificationSound() {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        if (!audioContext) return;

        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
        gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);

        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.2);
    }
} 