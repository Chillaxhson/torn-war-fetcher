import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('api-form')
export class ApiForm extends LitElement {
    @property({ type: String })
    apiKey = '';

    @property({ type: String })
    factionId = '';
    
    @property({ type: Array })
    factionIdHistory = [];

    static styles = css`
        .input-group {
            display: flex;
            gap: 1rem;
            align-items: flex-end;
        }

        .input-item {
            display: flex;
            flex-direction: column;
            flex-grow: 1;
        }
        
        label {
            margin-bottom: 0.5rem;
            color: #ccc;
            font-size: 0.9em;
        }

        input {
            padding: 0.75rem;
            border: 1px solid #444;
            border-radius: 4px;
            background-color: #333;
            color: #f0f0f0;
            font-size: 1rem;
        }

        button {
            padding: 0.75rem 1.5rem;
            font-size: 1rem;
            background-color: #4CAF50;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            transition: background-color 0.3s ease;
        }

        button:hover {
            background-color: #57a846;
        }
    `;

    connectedCallback(): void {
        super.connectedCallback();
        this.factionIdHistory = JSON.parse(localStorage.getItem('tornFactionIDs') || '[]');
    }

    render() {
        return html`
            <div class="input-group">
                <div class="input-item">
                    <label for="apiKeyInput">API Key:</label>
                    <input
                        type="text"
                        id="apiKeyInput"
                        .value=${this.apiKey}
                        @input=${(e: Event) => this.apiKey = (e.target as HTMLInputElement).value}
                        placeholder="Enter Your API Key"
                    >
                </div>
                <div class="input-item">
                    <label for="factionIDInput">Faction ID:</label>
                    <input
                        type="text"
                        id="factionIDInput"
                        .value=${this.factionId}
                        @input=${(e: Event) => this.factionId = (e.target as HTMLInputElement).value}
                        list="factionIDs"
                        placeholder="Enter Faction ID"
                    >
                    <datalist id="factionIDs">
                        ${this.factionIdHistory.map(id => html`<option .value=${id}></option>`)}
                    </datalist>
                </div>
                <button @click=${this.dispatchUpdate}>Fetch Targets</button>
            </div>
        `;
    }

    private dispatchUpdate() {
        const event = new CustomEvent('update-credentials', {
            detail: {
                apiKey: this.apiKey,
                factionId: this.factionId,
            },
            bubbles: true,
            composed: true,
        });
        this.dispatchEvent(event);
    }
} 