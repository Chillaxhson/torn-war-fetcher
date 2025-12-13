import { LitElement, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

@customElement('countdown-timer')
export class CountdownTimer extends LitElement {
    @property({ type: Number })
    until = 0;

    @state()
    private displayTime = '';

    private intervalId?: number;

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

        if (diff <= 1) {
            this.displayTime = 'Ready';
            this.stopTimer();
            this.dispatchEvent(new CustomEvent('timer-end', { bubbles: true, composed: true }));
        } else {
            const h = Math.floor(diff / 3600).toString().padStart(2, '0');
            const m = Math.floor((diff % 3600) / 60).toString().padStart(2, '0');
            const s = Math.floor(diff % 60).toString().padStart(2, '0');
            this.displayTime = `${h}:${m}:${s}`;
        }
    }

    render() {
        return html`<span>${this.displayTime}</span>`;
    }
}
