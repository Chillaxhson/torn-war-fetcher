import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { Member } from '../types.js';
import './target-card.js';

@customElement('target-list')
export class TargetList extends LitElement {
    @property({ type: Array })
    targets: Member[] = [];

    @property({ type: Boolean })
    private showHidden = false;

    static styles = css`
        .grid-container {
            display: grid;
            grid-template-columns: 7fr 3fr;
            gap: 2rem;
            width: 100%;
        }

        .target-column {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
        }

        h2 {
            margin: 0 0 1rem 0;
            color: #eee;
            border-bottom: 2px solid #444;
            padding-bottom: 0.5rem;
        }
    `;

    render() {
        if (this.targets.length === 0) {
            return html`<p>No targets to display. Fill out the form and fetch some!</p>`;
        }

        const activeTargets = this.targets.filter(t => !t.hidden);
        const hiddenTargets = this.targets.filter(t => t.hidden);

        return html`
            <div 
                class="grid-container"
                @notes-changed=${this.handleNotesChanged}
                @toggle-hidden-state=${this.handleTargetHidden}
            >
                <div class="target-column">
                    <h2>Active Targets (${activeTargets.length})</h2>
                    ${activeTargets.map(target => html`
                        <target-card .target=${target}></target-card>
                    `)}
                </div>
                <div class="target-column">
                    <h2>Collapsed Targets (${hiddenTargets.length})</h2>
                     ${hiddenTargets.map(target => html`
                        <target-card .target=${target} collapsed></target-card>
                    `)}
                </div>
            </div>
        `;
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
} 