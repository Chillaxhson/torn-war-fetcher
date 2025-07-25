import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { Member } from '../types.js';
import './target-card.js';

@customElement('target-list')
export class TargetList extends LitElement {
    @property({ type: Array })
    targets: Member[] = [];

    static styles = css`
        :host {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
        }
    `;

    render() {
        if (this.targets.length === 0) {
            return html`<p>No targets to display. Fill out the form and fetch some!</p>`;
        }

        return html`
            ${this.targets.map(target => html`
                <target-card .target=${target}></target-card>
            `)}
        `;
    }
} 