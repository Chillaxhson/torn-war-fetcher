import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { Member } from '../types.js';
import './countdown-timer.js';

@customElement('target-card')
export class TargetCard extends LitElement {
    @property({ type: Object })
    target!: Member;

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
            transition: background-color 0.2s, box-shadow 0.3s;
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

        .target-info {
            display: flex;
            flex-direction: column;
            gap: 0.25rem;
        }

        .name {
            font-weight: bold;
            font-size: 1.1em;
        }

        .level {
            font-size: 0.9em;
            color: #bbb;
            margin-left: 0.5rem;
        }

        .status-text {
            font-size: 0.95em;
        }

        .target-actions {
            display: flex;
            align-items: center;
            gap: 1rem;
        }

        .notify-label {
            display: flex;
            align-items: center;
            cursor: pointer;
            font-size: 14px;
            gap: 0.5rem;
        }

        .notify-checkbox {
            width: 18px;
            height: 18px;
            cursor: pointer;
        }

        .attack-link {
            display: inline-block;
            padding: 0.5rem 1rem;
            background-color: #dc3545;
            color: white;
            text-decoration: none;
            border-radius: 4px;
            font-size: 14px;
            font-weight: bold;
            text-align: center;
            transition: background-color 0.3s ease;
        }

        .attack-link:hover {
            background-color: #c82333;
        }

        .attack-link.disabled {
            background-color: #5a6268;
            cursor: not-allowed;
            pointer-events: none;
        }
    `;

    render() {
        const attackUrl = `https://www.torn.com/loader.php?sid=attack&user2ID=${this.target.id}`;
        const isAttackable = !['Hospital', 'Jail', 'Federal'].includes(this.target.status.state);

        return html`
            <div class="target-card status-${this.target.status.state.replace(/\s+/g, '')} ${this.isArmed ? 'armed' : ''}">
                <div class="target-info">
                    <div>
                        <span class="name">${this.target.name}</span>
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
                    <label class="notify-label">
                        <input 
                            type="checkbox" 
                            class="notify-checkbox"
                            .checked=${this.isArmed}
                            @change=${this.toggleArmed}
                        >
                        Notify & Attack
                    </label>
                    <a 
                        href=${attackUrl} 
                        target="_blank" 
                        class="attack-link ${!isAttackable ? 'disabled' : ''}"
                    >
                        Attack
                    </a>
                </div>
            </div>
        `;
    }

    private toggleArmed(e: Event) {
        this.isArmed = (e.target as HTMLInputElement).checked;
    }
    
    private handleTimerEnd() {
        if (this.isArmed) {
            this.playNotificationSound();
            const attackUrl = `https://www.torn.com/loader.php?sid=attack&user2ID=${this.target.id}`;
            window.open(attackUrl, '_blank');
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