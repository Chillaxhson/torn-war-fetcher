import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

@customElement('countdown-timer')
export class CountdownTimer extends LitElement {
    @property({ type: Number })
    until = 0;

    @property({ type: Boolean })
    badge = false;

    @state()
    private displayTime = '';

    @state()
    private isUrgent = false;

    @state()
    private isReady = false;

    private intervalId?: number;

    static styles = css`
        :host {
            display: inline-flex;
            align-items: center;
        }

        .timer {
            font-family: 'JetBrains Mono', monospace;
            font-variant-numeric: tabular-nums;
            font-size: 0.9em;
            color: #94a3b8;
        }

        .timer.urgent {
            color: #f59e0b;
            font-weight: 600;
            animation: pulse 1.5s infinite;
        }

        .timer.ready {
            color: #10b981;
            font-weight: 700;
        }

        .timer-badge {
            display: inline-flex;
            align-items: center;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 0.8em;
            font-weight: 600;
            background: rgba(148, 163, 184, 0.1);
            border: 1px solid rgba(148, 163, 184, 0.2);
            color: #cbd5e1;
        }

        .timer-badge.urgent {
            background: rgba(245, 158, 11, 0.15);
            border-color: rgba(245, 158, 11, 0.35);
            color: #fbbf24;
        }

        .timer-badge.ready {
            background: rgba(16, 185, 129, 0.2);
            border-color: rgba(16, 185, 129, 0.4);
            color: #34d399;
        }

        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.6; }
        }
    `;

    connectedCallback() {
        super.connectedCallback();
        this.startTimer();
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        this.stopTimer();
    }

    updated(changedProperties: Map<string, any>) {
        if (changedProperties.has('until')) {
            this.stopTimer();
            this.startTimer();
        }
    }

    private startTimer() {
        this.updateDisplay();
        this.intervalId = window.setInterval(() => this.updateDisplay(), 1000);
    }

    private stopTimer() {
        if (this.intervalId) {
            window.clearInterval(this.intervalId);
            this.intervalId = undefined;
        }
    }

    updateDisplay() {
        const now = Math.floor(Date.now() / 1000);
        const diff = this.until - now;

        if (diff <= 0) {
            this.displayTime = 'Ready';
            this.isReady = true;
            this.isUrgent = false;
            this.stopTimer();
            this.dispatchEvent(new CustomEvent('timer-end', { bubbles: true, composed: true }));
        } else {
            this.isReady = false;
            this.isUrgent = diff <= 120; // 2 minutes or less

            const h = Math.floor(diff / 3600);
            const m = Math.floor((diff % 3600) / 60).toString().padStart(2, '0');
            const s = Math.floor(diff % 60).toString().padStart(2, '0');

            if (h > 0) {
                this.displayTime = `${h}:${m}:${s}`;
            } else {
                this.displayTime = `${m}:${s}`;
            }
        }
    }

    render() {
        const cls = `${this.isReady ? 'ready' : ''} ${this.isUrgent ? 'urgent' : ''}`.trim();
        if (this.badge) {
            return html`<span class="timer-badge ${cls}">${this.displayTime}</span>`;
        }
        return html`<span class="timer ${cls}">${this.displayTime}</span>`;
    }
}
