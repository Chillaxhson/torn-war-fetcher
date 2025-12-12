import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { Member } from '../types.js';
import './target-card.js';

@customElement('target-list')
export class TargetList extends LitElement {
    @property({ type: Array })
    targets: Member[] = [];

    @state()
    private showBulkHide = false;

    @state()
    private bulkHideNames = '';

    static styles = css`
        :host {
            display: block;
            width: 100%;
        }

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

        .bulk-hide-section {
            margin-bottom: 1.5rem;
            background-color: #2c2c2c;
            padding: 1rem;
            border-radius: 6px;
            border: 1px solid #444;
        }

        .bulk-hide-toggle {
            background: none;
            border: 1px solid #6c757d;
            color: #ccc;
            padding: 0.3rem 0.8rem;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            margin-bottom: 1rem;
            display: inline-block;
        }

        .bulk-hide-toggle:hover {
            background-color: #6c757d;
            color: white;
        }

        textarea.bulk-input {
            width: 100%;
            height: 100px;
            background-color: #333;
            border: 1px solid #555;
            color: #eee;
            padding: 0.5rem;
            border-radius: 4px;
            box-sizing: border-box;
            resize: vertical;
            font-family: monospace;
            margin-bottom: 0.5rem;
        }

        .bulk-actions {
            display: flex;
            gap: 0.5rem;
            justify-content: flex-end;
        }

        .btn-apply {
            background-color: #d9534f;
            color: white;
            border: none;
            padding: 0.4rem 1rem;
            border-radius: 4px;
            cursor: pointer;
        }

        .btn-apply:hover {
            background-color: #c9302c;
        }
    `;

    render() {
        if (this.targets.length === 0) {
            return html`<p>No targets to display. Fill out the form and fetch some!</p>`;
        }

        const activeTargets = this.targets.filter(t => !t.hidden);
        const hiddenTargets = this.targets.filter(t => t.hidden);

        return html`
            <button class="bulk-hide-toggle" @click=${() => this.showBulkHide = !this.showBulkHide}>
                ${this.showBulkHide ? 'Cancel Bulk Hide' : 'Bulk Hide Targets'}
            </button>

            ${this.showBulkHide ? html`
                <div class="bulk-hide-section">
                    <p style="margin-top:0; color:#aaa; font-size:0.9em">Paste names to hide (one per line):</p>
                    <textarea 
                        class="bulk-input" 
                        .value=${this.bulkHideNames}
                        @input=${(e: any) => this.bulkHideNames = e.target.value}
                        placeholder="Enter names here..."
                    ></textarea>
                    <div class="bulk-actions">
                        <button class="btn-apply" @click=${this.applyBulkHide}>Hide These Targets</button>
                    </div>
                </div>
            ` : ''}

            <div 
                class="grid-container"
                @notes-changed=${this.handleNotesChanged}
                @toggle-hidden-state=${this.handleTargetHidden}
                @notify-changed=${this.handleNotifyChanged}
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
