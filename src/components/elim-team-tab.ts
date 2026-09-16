import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { ElimTeamMember, ContactStatus } from '../types.js';

interface MessageTemplate {
    id: string;
    label: string;
    text: string;
}

const DEFAULT_TEMPLATES: MessageTemplate[] = [
    {
        id: 'vi_polite',
        label: 'Tiếng Việt - Lịch sự / Khéo léo',
        text: 'Chào {name}, hiện tại team mình đang đua top Elimination rất gắt và bạn mới có {attacks} attacks. Nếu đợt này bạn bận không thể hit đều được, bạn có thể cân nhắc out team để nhường slot cho hitter active khác vào gánh team được không? Cảm ơn bạn nhiều!'
    },
    {
        id: 'vi_direct',
        label: 'Tiếng Việt - Thẳng thắn / Cần lọc gấp',
        text: 'Chào {name}, với {attacks} attacks thì bạn đang ở nhóm đóng góp thấp nhất team. Bọn mình đang lọc bớt các thành viên inactive/ít attack để dồn slot cho người mới. Mong bạn chủ động rời team trong hôm nay giúp team nhé. Cảm ơn bạn.'
    },
    {
        id: 'en_polite',
        label: 'English - Diplomatic / Polite',
        text: 'Hi {name}, our team is pushing hard for a top spot in Elimination and we noticed you currently have {attacks} attacks. If you are unable to hit actively this round, could you please consider leaving the team so an active hitter can take the spot? We would really appreciate it!'
    },
    {
        id: 'en_direct',
        label: 'English - Direct / Urgent',
        text: 'Hey {name}, you have {attacks} attacks so far. We are clearing low-activity roster spots to keep our team alive. Please step down and leave the team today so an active attacker can join. Thank you.'
    }
];

@customElement('elim-team-tab')
export class ElimTeamTab extends LitElement {
    @property({ type: String })
    apiKey = '';

    @state()
    private members: ElimTeamMember[] = [];

    @state()
    private teamID = 89;

    @state()
    private page = 1;

    @state()
    private totalPages = 1;

    @state()
    private totalCount = 0;

    @state()
    private teamName = '';

    @state()
    private rfcv = '6aa4459d6796e';

    @state()
    private tornCookie = '';

    @state()
    private showCookieInput = false;

    @state()
    private inputUrl = 'https://www.torn.com/page.php?sid=competitionData&step=viewTeam&teamID=89&showAvailable=0&p=3&rfcv=6aa4459d6796e';

    // State for loading
    @state()
    private isLoading = false;

    @state()
    private loadingProgress = '';

    @state()
    private errorMessage = '';

    @state()
    private successNotification = '';

    // Filters
    @state()
    private lowContributionThreshold = 50;

    @state()
    private filterQuick: 'all' | 'zero' | 'low' | 'uncontacted_low' | 'contacted' | 'left' = 'all';

    @state()
    private filterOnline: string = 'all'; // all, online, idle, offline

    @state()
    private filterStatus: string = 'all'; // all, Hospital, Okay, Abroad, Jail

    @state()
    private searchQuery = '';

    @state()
    private sortBy: 'attacks_asc' | 'attacks_desc' | 'level_desc' | 'level_asc' | 'name' | 'contact' = 'attacks_asc';

    @state()
    private hideCaptains = false;

    // Persuasion messaging
    @state()
    private selectedTemplateId = 'vi_polite';

    @state()
    private customTemplateText = '';

    @state()
    private isEditingTemplate = false;

    // Modals
    @state()
    private showPasteModal = false;

    @state()
    private pasteJsonText = '';

    @state()
    private showConsoleScriptModal = false;

    // Selection
    @state()
    private selectedUserIDs: Set<number> = new Set();

    static styles = css`
        :host {
            display: block;
            width: 100%;
        }

        .panel-container {
            display: flex;
            flex-direction: column;
            gap: 1.25rem;
        }

        /* Top Config / Fetcher Box */
        .config-box {
            background: #121620;
            border: 1px solid #242c3f;
            border-radius: 10px;
            padding: 1.25rem 1.5rem;
            display: flex;
            flex-direction: column;
            gap: 1rem;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.35);
        }

        .config-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 0.75rem;
        }

        .config-title {
            display: flex;
            align-items: center;
            gap: 0.6rem;
            font-size: 1.1rem;
            font-weight: 700;
            color: #f1f5f9;
        }

        .config-badge {
            background: rgba(239, 68, 68, 0.15);
            border: 1px solid rgba(239, 68, 68, 0.35);
            color: #f87171;
            font-size: 0.75rem;
            padding: 2px 8px;
            border-radius: 9999px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }

        .url-input-group {
            display: flex;
            flex-direction: column;
            gap: 0.35rem;
        }

        .url-input-group label {
            font-size: 0.8rem;
            font-weight: 600;
            color: #94a3b8;
            display: flex;
            justify-content: space-between;
        }

        .url-input-row {
            display: flex;
            gap: 0.5rem;
        }

        .text-input {
            background: #0a0d14;
            border: 1px solid #2d374d;
            border-radius: 6px;
            color: #f1f5f9;
            padding: 0.55rem 0.85rem;
            font-family: inherit;
            font-size: 0.88rem;
            width: 100%;
            transition: border-color 0.15s;
        }

        .text-input:focus {
            outline: none;
            border-color: #3b82f6;
            box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
        }

        .form-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
            gap: 0.75rem;
        }

        .field-label {
            font-size: 0.75rem;
            font-weight: 600;
            color: #94a3b8;
            margin-bottom: 0.25rem;
            display: block;
        }

        .btn-group {
            display: flex;
            align-items: center;
            flex-wrap: wrap;
            gap: 0.5rem;
            margin-top: 0.25rem;
        }

        .btn {
            background: #191f2d;
            border: 1px solid #2d374d;
            color: #cbd5e1;
            padding: 0.5rem 0.9rem;
            border-radius: 6px;
            font-size: 0.85rem;
            font-weight: 600;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 6px;
            transition: all 0.15s ease;
            font-family: inherit;
        }

        .btn:hover:not(:disabled) {
            background: #252f44;
            color: #fff;
            border-color: #4b5563;
        }

        .btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        .btn-primary {
            background: #2563eb;
            border-color: #3b82f6;
            color: #fff;
        }

        .btn-primary:hover:not(:disabled) {
            background: #1d4ed8;
            border-color: #60a5fa;
            box-shadow: 0 0 12px rgba(37, 99, 235, 0.4);
        }

        .btn-danger {
            background: rgba(239, 68, 68, 0.15);
            border-color: rgba(239, 68, 68, 0.4);
            color: #f87171;
        }

        .btn-danger:hover:not(:disabled) {
            background: #ef4444;
            color: #fff;
        }

        .btn-success {
            background: rgba(16, 185, 129, 0.15);
            border-color: rgba(16, 185, 129, 0.4);
            color: #34d399;
        }

        .btn-success:hover:not(:disabled) {
            background: #10b981;
            color: #fff;
        }

        /* Banner & Alerts */
        .alert-error {
            background: rgba(239, 68, 68, 0.12);
            border: 1px solid rgba(239, 68, 68, 0.35);
            color: #f87171;
            padding: 0.75rem 1rem;
            border-radius: 8px;
            font-size: 0.85rem;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .alert-success {
            background: rgba(16, 185, 129, 0.12);
            border: 1px solid rgba(16, 185, 129, 0.35);
            color: #34d399;
            padding: 0.65rem 1rem;
            border-radius: 8px;
            font-size: 0.85rem;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        /* Analytics Stats Cards */
        .analytics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
            gap: 0.75rem;
        }

        .metric-card {
            background: #121620;
            border: 1px solid #242c3f;
            border-radius: 8px;
            padding: 0.85rem 1rem;
            display: flex;
            flex-direction: column;
            gap: 4px;
        }

        .metric-card.danger {
            border-color: rgba(239, 68, 68, 0.4);
            background: rgba(239, 68, 68, 0.05);
        }

        .metric-card.warning {
            border-color: rgba(245, 158, 11, 0.4);
            background: rgba(245, 158, 11, 0.05);
        }

        .metric-card.success {
            border-color: rgba(16, 185, 129, 0.4);
            background: rgba(16, 185, 129, 0.05);
        }

        .metric-card.primary {
            border-color: rgba(59, 130, 246, 0.4);
            background: rgba(59, 130, 246, 0.05);
        }

        .metric-val {
            font-family: 'JetBrains Mono', monospace;
            font-size: 1.4rem;
            font-weight: 800;
            color: #f1f5f9;
            display: flex;
            align-items: baseline;
            gap: 4px;
        }

        .metric-sub {
            font-size: 0.75rem;
            font-weight: 500;
            color: #94a3b8;
        }

        .metric-card.danger .metric-val {
            color: #ef4444;
        }

        .metric-card.warning .metric-val {
            color: #f59e0b;
        }

        .metric-card.success .metric-val {
            color: #10b981;
        }

        .metric-card.primary .metric-val {
            color: #3b82f6;
        }

        .metric-label {
            font-size: 0.7rem;
            color: #94a3b8;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            font-weight: 600;
        }

        /* Persuasion Template Box */
        .template-section {
            background: #121620;
            border: 1px solid #242c3f;
            border-radius: 10px;
            padding: 1.15rem 1.4rem;
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
        }

        .template-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 0.5rem;
        }

        .template-title {
            font-size: 0.95rem;
            font-weight: 700;
            color: #f1f5f9;
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .template-preview {
            background: #090c13;
            border: 1px solid #1e2638;
            border-radius: 6px;
            padding: 0.75rem 1rem;
            font-size: 0.85rem;
            color: #cbd5e1;
            line-height: 1.45;
            white-space: pre-wrap;
            position: relative;
        }

        .template-tokens {
            font-size: 0.75rem;
            color: #64748b;
        }

        .token-tag {
            background: #1e2638;
            color: #93c5fd;
            padding: 1px 5px;
            border-radius: 4px;
            font-family: 'JetBrains Mono', monospace;
        }

        /* Filter Section */
        .filter-section {
            background: #121620;
            border: 1px solid #242c3f;
            border-radius: 10px;
            padding: 1.15rem 1.4rem;
            display: flex;
            flex-direction: column;
            gap: 1rem;
        }

        .filter-pills {
            display: flex;
            flex-wrap: wrap;
            gap: 0.4rem;
        }

        .filter-pill {
            background: #191f2d;
            border: 1px solid #2d374d;
            color: #94a3b8;
            border-radius: 6px;
            padding: 0.35rem 0.75rem;
            font-size: 0.8rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.15s ease;
            display: inline-flex;
            align-items: center;
            gap: 6px;
        }

        .filter-pill:hover {
            background: #232c3f;
            color: #f1f5f9;
        }

        .filter-pill.active {
            background: #2563eb;
            color: #fff;
            border-color: #3b82f6;
        }

        .filter-pill.active.danger {
            background: #dc2626;
            border-color: #ef4444;
        }

        .filter-pill.active.warning {
            background: #d97706;
            border-color: #f59e0b;
        }

        .pill-count {
            background: rgba(0, 0, 0, 0.3);
            padding: 1px 5px;
            border-radius: 9999px;
            font-size: 0.7rem;
            font-family: 'JetBrains Mono', monospace;
        }

        .controls-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 0.75rem;
        }

        .slider-group {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            background: #090c13;
            border: 1px solid #1e2638;
            border-radius: 6px;
            padding: 0.4rem 0.8rem;
        }

        .slider-group label {
            font-size: 0.8rem;
            font-weight: 600;
            color: #94a3b8;
            white-space: nowrap;
        }

        .slider-group input[type="range"] {
            accent-color: #ef4444;
            cursor: pointer;
            width: 110px;
        }

        .slider-val {
            font-family: 'JetBrains Mono', monospace;
            font-weight: 700;
            color: #f87171;
            font-size: 0.85rem;
            min-width: 28px;
        }

        /* Bulk Action Bar */
        .bulk-bar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: 0.5rem;
            background: #161e2e;
            border: 1px solid #2b3954;
            border-radius: 8px;
            padding: 0.6rem 1rem;
        }

        .bulk-text {
            font-size: 0.85rem;
            color: #93c5fd;
            font-weight: 600;
        }

        /* Table & Cards View */
        .roster-table-wrapper {
            background: #121620;
            border: 1px solid #242c3f;
            border-radius: 10px;
            overflow-x: auto;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
        }

        table.roster-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 0.85rem;
            text-align: left;
        }

        table.roster-table th {
            background: #0e121a;
            color: #94a3b8;
            font-weight: 700;
            padding: 0.75rem 0.85rem;
            border-bottom: 1px solid #242c3f;
            white-space: nowrap;
            text-transform: uppercase;
            font-size: 0.7rem;
            letter-spacing: 0.05em;
        }

        table.roster-table td {
            padding: 0.75rem 0.85rem;
            border-bottom: 1px solid #1a2233;
            color: #cbd5e1;
            vertical-align: middle;
        }

        table.roster-table tr:hover td {
            background: rgba(255, 255, 255, 0.02);
        }

        table.roster-table tr.critical-row td {
            background: rgba(239, 68, 68, 0.04);
        }

        table.roster-table tr.critical-row:hover td {
            background: rgba(239, 68, 68, 0.08);
        }

        .player-cell {
            display: flex;
            align-items: center;
            gap: 0.65rem;
        }

        .player-link {
            font-weight: 700;
            color: #f1f5f9;
            text-decoration: none;
            transition: color 0.15s;
        }

        .player-link:hover {
            color: #3b82f6;
            text-decoration: underline;
        }

        .player-id {
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.75rem;
            color: #64748b;
        }

        .badge-role {
            font-size: 0.65rem;
            font-weight: 700;
            padding: 1px 5px;
            border-radius: 4px;
            text-transform: uppercase;
            letter-spacing: 0.03em;
        }

        .badge-captain {
            background: #eab308;
            color: #000;
        }

        .badge-vice {
            background: #3b82f6;
            color: #fff;
        }

        .online-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            display: inline-block;
        }

        .online-dot.online {
            background: #10b981;
            box-shadow: 0 0 6px #10b981;
        }

        .online-dot.idle {
            background: #f59e0b;
        }

        .online-dot.offline {
            background: #64748b;
        }

        /* Attack Badges */
        .attack-badge {
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.92rem;
            font-weight: 800;
            padding: 2px 8px;
            border-radius: 6px;
            display: inline-flex;
            align-items: center;
            gap: 4px;
        }

        .attack-badge.zero {
            background: rgba(239, 68, 68, 0.25);
            border: 1px solid #ef4444;
            color: #fca5a5;
            animation: pulse-border 2s infinite;
        }

        .attack-badge.critical {
            background: rgba(239, 68, 68, 0.15);
            border: 1px solid rgba(239, 68, 68, 0.4);
            color: #f87171;
        }

        .attack-badge.low {
            background: rgba(245, 158, 11, 0.15);
            border: 1px solid rgba(245, 158, 11, 0.4);
            color: #fbbf24;
        }

        .attack-badge.moderate {
            background: rgba(59, 130, 246, 0.15);
            border: 1px solid rgba(59, 130, 246, 0.3);
            color: #93c5fd;
        }

        .attack-badge.good {
            background: rgba(16, 185, 129, 0.15);
            border: 1px solid rgba(16, 185, 129, 0.3);
            color: #34d399;
        }

        @keyframes pulse-border {
            0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
            70% { box-shadow: 0 0 0 6px rgba(239, 68, 68, 0); }
            100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }

        .status-badge {
            font-size: 0.75rem;
            padding: 2px 7px;
            border-radius: 4px;
            font-weight: 600;
            display: inline-flex;
            align-items: center;
            gap: 4px;
        }

        .status-badge.red {
            background: rgba(239, 68, 68, 0.15);
            color: #f87171;
            border: 1px solid rgba(239, 68, 68, 0.3);
        }

        .status-badge.green {
            background: rgba(16, 185, 129, 0.15);
            color: #34d399;
            border: 1px solid rgba(16, 185, 129, 0.3);
        }

        .status-badge.blue {
            background: rgba(59, 130, 246, 0.15);
            color: #93c5fd;
            border: 1px solid rgba(59, 130, 246, 0.3);
        }

        /* Contact Selector Dropdown */
        .contact-select {
            background: #090c13;
            border: 1px solid #2d374d;
            color: #cbd5e1;
            padding: 3px 6px;
            border-radius: 4px;
            font-size: 0.78rem;
            cursor: pointer;
        }

        .contact-select.uncontacted {
            color: #94a3b8;
        }

        .contact-select.contacted {
            color: #fbbf24;
            border-color: rgba(245, 158, 11, 0.5);
        }

        .contact-select.replied {
            color: #60a5fa;
            border-color: rgba(59, 130, 246, 0.5);
        }

        .contact-select.left {
            color: #34d399;
            border-color: rgba(16, 185, 129, 0.5);
        }

        .contact-select.ignored {
            color: #f87171;
            border-color: rgba(239, 68, 68, 0.5);
        }

        /* Action Buttons Cell */
        .action-cell {
            display: flex;
            align-items: center;
            gap: 4px;
            white-space: nowrap;
        }

        .btn-action {
            background: #19202e;
            border: 1px solid #2a354c;
            color: #cbd5e1;
            padding: 4px 8px;
            border-radius: 5px;
            font-size: 0.75rem;
            font-weight: 600;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 4px;
            transition: all 0.12s;
            text-decoration: none;
        }

        .btn-action:hover {
            background: #29354d;
            color: #fff;
            border-color: #3b82f6;
        }

        .btn-action.copy-btn:hover {
            border-color: #10b981;
            color: #34d399;
        }

        .btn-action.mail-btn:hover {
            border-color: #f59e0b;
            color: #fbbf24;
        }

        /* Modal Backdrop & Box */
        .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.75);
            backdrop-filter: blur(4px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            padding: 1rem;
        }

        .modal-box {
            background: #121620;
            border: 1px solid #2d374d;
            border-radius: 12px;
            padding: 1.5rem;
            max-width: 640px;
            width: 100%;
            display: flex;
            flex-direction: column;
            gap: 1rem;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.6);
        }

        .modal-title {
            font-size: 1.15rem;
            font-weight: 700;
            color: #f1f5f9;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .modal-close {
            background: none;
            border: none;
            color: #94a3b8;
            font-size: 1.25rem;
            cursor: pointer;
        }

        .modal-close:hover {
            color: #fff;
        }

        .code-box {
            background: #090c13;
            border: 1px solid #242c3f;
            border-radius: 6px;
            padding: 0.85rem;
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.78rem;
            color: #cbd5e1;
            overflow-x: auto;
            max-height: 240px;
            line-height: 1.5;
        }

        .empty-state {
            padding: 3rem 1rem;
            text-align: center;
            color: #64748b;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 0.75rem;
        }
    `;

    connectedCallback() {
        super.connectedCallback();
        // Load saved state from localStorage
        const savedMembers = localStorage.getItem('tornElimRosterMembers');
        if (savedMembers) {
            try {
                this.members = JSON.parse(savedMembers);
            } catch {}
        }

        const savedRfcv = localStorage.getItem('tornElimRfcv');
        if (savedRfcv) this.rfcv = savedRfcv;

        const savedCookie = localStorage.getItem('tornSessionCookie');
        if (savedCookie) this.tornCookie = savedCookie;

        const savedTeamId = localStorage.getItem('tornElimTeamID');
        if (savedTeamId) this.teamID = Number(savedTeamId);

        const savedThreshold = localStorage.getItem('tornElimLowThreshold');
        if (savedThreshold) this.lowContributionThreshold = Number(savedThreshold);

        const savedCustomTemplate = localStorage.getItem('tornElimCustomTemplate');
        if (savedCustomTemplate) this.customTemplateText = savedCustomTemplate;
    }

    render() {
        const filteredMembers = this.getFilteredMembers();
        const stats = this.calculateAnalytics();

        return html`
            <div class="panel-container">
                <!-- Notifications -->
                ${this.errorMessage ? html`
                    <div class="alert-error">
                        <span>⚠️ ${this.errorMessage}</span>
                        <button class="modal-close" @click=${() => this.errorMessage = ''}>&times;</button>
                    </div>
                ` : ''}

                ${this.successNotification ? html`
                    <div class="alert-success">
                        <span>✓ ${this.successNotification}</span>
                        <button class="modal-close" @click=${() => this.successNotification = ''}>&times;</button>
                    </div>
                ` : ''}

                <!-- Configuration & Fetching Section -->
                <div class="config-box">
                    <div class="config-header">
                        <div class="config-title">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.2">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                <circle cx="9" cy="7" r="4"></circle>
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                            </svg>
                            <span>Elimination Team Roster & Low Contribution Persuader</span>
                            <span class="config-badge">Elim 2024 / Target Fetcher</span>
                        </div>

                        <div class="btn-group">
                            <button class="btn" @click=${() => this.showPasteModal = true}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                                    <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
                                </svg>
                                <span>Paste JSON Payload</span>
                            </button>

                            <button class="btn" @click=${() => this.showConsoleScriptModal = true}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="4 17 10 11 4 5"></polyline>
                                    <line x1="12" y1="19" x2="20" y2="19"></line>
                                </svg>
                                <span>Torn Console Helper</span>
                            </button>

                            ${this.members.length > 0 ? html`
                                <button class="btn btn-danger" @click=${this.clearRoster}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <polyline points="3 6 5 6 21 6"></polyline>
                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                    </svg>
                                    <span>Clear Roster</span>
                                </button>
                            ` : ''}
                        </div>
                    </div>

                    <!-- Quick URL Input -->
                    <div class="url-input-group">
                        <label>
                            <span>Dán trực tiếp URL Torn Elimination Endpoint (tự động phân tích các tham số):</span>
                            <a href="javascript:void(0)" style="color:#60a5fa; text-decoration:none;" @click=${() => this.showCookieInput = !this.showCookieInput}>
                                ${this.showCookieInput ? '▲ Ẩn Torn Session Cookie' : '▼ Nhập Torn Session Cookie (nếu có)'}
                            </a>
                        </label>
                        <div class="url-input-row">
                            <input 
                                type="text" 
                                class="text-input" 
                                placeholder="https://www.torn.com/page.php?sid=competitionData&step=viewTeam&teamID=89&showAvailable=0&p=3&rfcv=6aa4459d6796e"
                                .value=${this.inputUrl}
                                @input=${this.handleUrlInput}
                            />
                            <button class="btn btn-primary" ?disabled=${this.isLoading} @click=${() => this.fetchRoster(false)}>
                                ${this.isLoading ? html`<span>Tải...</span>` : html`
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <polyline points="1 4 1 10 7 10"></polyline>
                                        <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
                                    </svg>
                                    <span>Fetch Page</span>
                                `}
                            </button>
                            <button class="btn btn-success" ?disabled=${this.isLoading} @click=${() => this.fetchRoster(true)}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                                </svg>
                                <span>Fetch All (1..N)</span>
                            </button>
                        </div>
                    </div>

                    <!-- Optional Cookie Input -->
                    ${this.showCookieInput ? html`
                        <div class="url-input-group">
                            <label>Torn Session Cookie (PHPSESSID - chỉ cần nhập nếu Torn Cloudflare chặn request từ IP server):</label>
                            <input 
                                type="password" 
                                class="text-input" 
                                placeholder="PHPSESSID=xxxxxx; cf_clearance=yyyyyy"
                                .value=${this.tornCookie}
                                @input=${(e: any) => {
                                    this.tornCookie = e.target.value;
                                    localStorage.setItem('tornSessionCookie', this.tornCookie);
                                }}
                            />
                        </div>
                    ` : ''}

                    <!-- Parameters Grid -->
                    <div class="form-grid">
                        <div>
                            <span class="field-label">Team ID</span>
                            <input 
                                type="number" 
                                class="text-input" 
                                .value=${String(this.teamID)}
                                @input=${(e: any) => {
                                    this.teamID = Number(e.target.value);
                                    localStorage.setItem('tornElimTeamID', String(this.teamID));
                                    this.updateInputUrl();
                                }}
                            />
                        </div>

                        <div>
                            <span class="field-label">Page (p)</span>
                            <input 
                                type="number" 
                                class="text-input" 
                                min="1"
                                .value=${String(this.page)}
                                @input=${(e: any) => {
                                    this.page = Number(e.target.value);
                                    this.updateInputUrl();
                                }}
                            />
                        </div>

                        <div style="grid-column: span 2;">
                            <span class="field-label">RFCV Token</span>
                            <input 
                                type="text" 
                                class="text-input" 
                                .value=${this.rfcv}
                                @input=${(e: any) => {
                                    this.rfcv = e.target.value;
                                    localStorage.setItem('tornElimRfcv', this.rfcv);
                                    this.updateInputUrl();
                                }}
                            />
                        </div>
                    </div>

                    ${this.loadingProgress ? html`
                        <div style="font-size: 0.85rem; color: #3b82f6; display: flex; align-items: center; gap: 8px;">
                            <span class="online-dot online"></span>
                            <span>${this.loadingProgress}</span>
                        </div>
                    ` : ''}
                </div>

                <!-- Executive Summary Cards -->
                ${this.members.length > 0 ? html`
                    <div class="analytics-grid">
                        <div class="metric-card primary">
                            <span class="metric-label">Tổng Roster</span>
                            <div class="metric-val">
                                ${stats.totalMembers}
                                <span class="metric-sub">${this.teamName ? `(${this.teamName})` : ''}</span>
                            </div>
                        </div>

                        <div class="metric-card">
                            <span class="metric-label">Tổng Attacks Toàn Team</span>
                            <div class="metric-val">
                                ${stats.totalAttacks.toLocaleString()}
                                <span class="metric-sub">avg ${stats.avgAttacks}</span>
                            </div>
                        </div>

                        <div class="metric-card danger">
                            <span class="metric-label">0 Attacks (Dead weight)</span>
                            <div class="metric-val">
                                ${stats.zeroAttackCount}
                                <span class="metric-sub">(${stats.zeroAttackPct}%)</span>
                            </div>
                        </div>

                        <div class="metric-card warning">
                            <span class="metric-label">Đóng góp thấp (&le; ${this.lowContributionThreshold} hits)</span>
                            <div class="metric-val">
                                ${stats.lowAttackCount}
                                <span class="metric-sub">(${stats.lowAttackPct}%)</span>
                            </div>
                        </div>

                        <div class="metric-card success">
                            <span class="metric-label">Tiến Độ Thuyết Phục</span>
                            <div class="metric-val">
                                ${stats.contactedCount}
                                <span class="metric-sub">/ ${stats.lowAttackCount} đã nhắn</span>
                            </div>
                        </div>

                        <div class="metric-card">
                            <span class="metric-label">Đã Out Team</span>
                            <div class="metric-val" style="color: #34d399;">
                                ${stats.leftCount}
                                <span class="metric-sub">thành viên</span>
                            </div>
                        </div>
                    </div>

                    <!-- Persuasion Template Toolkit -->
                    <div class="template-section">
                        <div class="template-header">
                            <div class="template-title">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2">
                                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                                </svg>
                                <span>Bộ Mẫu Tin Nhắn Thuyết Phục Rời Team (Outreach Templates)</span>
                            </div>

                            <div style="display: flex; gap: 0.5rem; align-items: center;">
                                <select 
                                    class="text-input" 
                                    style="width: auto; padding: 0.35rem 0.65rem; font-size: 0.8rem;"
                                    .value=${this.selectedTemplateId}
                                    @change=${(e: any) => this.selectedTemplateId = e.target.value}
                                >
                                    ${DEFAULT_TEMPLATES.map(t => html`
                                        <option value=${t.id} ?selected=${this.selectedTemplateId === t.id}>${t.label}</option>
                                    `)}
                                    <option value="custom" ?selected=${this.selectedTemplateId === 'custom'}>Mẫu Tùy Chỉnh (Custom)</option>
                                </select>

                                ${this.selectedTemplateId === 'custom' ? html`
                                    <button class="btn" style="padding: 0.35rem 0.65rem;" @click=${() => this.isEditingTemplate = !this.isEditingTemplate}>
                                        ${this.isEditingTemplate ? 'Đóng Edit' : 'Chỉnh Sửa'}
                                    </button>
                                ` : ''}
                            </div>
                        </div>

                        ${this.isEditingTemplate && this.selectedTemplateId === 'custom' ? html`
                            <textarea
                                class="text-input"
                                rows="3"
                                placeholder="Nhập mẫu tin nhắn của bạn với các biến {name}, {attacks}, {level}..."
                                .value=${this.customTemplateText}
                                @input=${(e: any) => {
                                    this.customTemplateText = e.target.value;
                                    localStorage.setItem('tornElimCustomTemplate', this.customTemplateText);
                                }}
                            ></textarea>
                        ` : html`
                            <div class="template-preview">
                                ${this.getActiveTemplate().replace('{name}', 'BoarHendlich').replace('{attacks}', '12').replace('{level}', '52')}
                            </div>
                        `}

                        <div class="template-tokens">
                            <span>Biến tự động thay thế khi copy: </span>
                            <span class="token-tag">{name}</span> (Tên player), 
                            <span class="token-tag">{attacks}</span> (Số hit), 
                            <span class="token-tag">{level}</span> (Level)
                        </div>
                    </div>

                    <!-- Smart Filters & Threshold Section -->
                    <div class="filter-section">
                        <div class="controls-row">
                            <div class="filter-pills">
                                <button 
                                    class="filter-pill ${this.filterQuick === 'all' ? 'active' : ''}" 
                                    @click=${() => this.filterQuick = 'all'}
                                >
                                    <span>Tất Cả</span>
                                    <span class="pill-count">${stats.totalMembers}</span>
                                </button>

                                <button 
                                    class="filter-pill danger ${this.filterQuick === 'zero' ? 'active danger' : ''}" 
                                    @click=${() => this.filterQuick = 'zero'}
                                >
                                    <span>💀 0 Attacks</span>
                                    <span class="pill-count">${stats.zeroAttackCount}</span>
                                </button>

                                <button 
                                    class="filter-pill warning ${this.filterQuick === 'low' ? 'active warning' : ''}" 
                                    @click=${() => this.filterQuick = 'low'}
                                >
                                    <span>⚠️ &le; ${this.lowContributionThreshold} Attacks</span>
                                    <span class="pill-count">${stats.lowAttackCount}</span>
                                </button>

                                <button 
                                    class="filter-pill ${this.filterQuick === 'uncontacted_low' ? 'active' : ''}" 
                                    @click=${() => this.filterQuick = 'uncontacted_low'}
                                >
                                    <span>⏳ Cần Nhắn (Chưa liên hệ)</span>
                                    <span class="pill-count">${stats.uncontactedLowCount}</span>
                                </button>

                                <button 
                                    class="filter-pill ${this.filterQuick === 'contacted' ? 'active' : ''}" 
                                    @click=${() => this.filterQuick = 'contacted'}
                                >
                                    <span>✉️ Đã Nhắn</span>
                                    <span class="pill-count">${stats.contactedCount}</span>
                                </button>

                                <button 
                                    class="filter-pill ${this.filterQuick === 'left' ? 'active' : ''}" 
                                    @click=${() => this.filterQuick = 'left'}
                                >
                                    <span>🚪 Đã Rời Team</span>
                                    <span class="pill-count">${stats.leftCount}</span>
                                </button>
                            </div>

                            <!-- Threshold Slider -->
                            <div class="slider-group">
                                <label>Ngưỡng Low Contribution:</label>
                                <input 
                                    type="range" 
                                    min="5" 
                                    max="200" 
                                    step="5" 
                                    .value=${String(this.lowContributionThreshold)}
                                    @input=${(e: any) => {
                                        this.lowContributionThreshold = Number(e.target.value);
                                        localStorage.setItem('tornElimLowThreshold', String(this.lowContributionThreshold));
                                    }}
                                />
                                <span class="slider-val">&le; ${this.lowContributionThreshold}</span>
                            </div>
                        </div>

                        <!-- Secondary Filters & Search -->
                        <div class="controls-row">
                            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; flex: 1;">
                                <input 
                                    type="text" 
                                    class="text-input" 
                                    placeholder="🔍 Tìm theo tên player, ID hoặc faction tag..."
                                    style="max-width: 320px;"
                                    .value=${this.searchQuery}
                                    @input=${(e: any) => this.searchQuery = e.target.value}
                                />

                                <select 
                                    class="text-input" 
                                    style="width: auto;"
                                    .value=${this.filterOnline}
                                    @change=${(e: any) => this.filterOnline = e.target.value}
                                >
                                    <option value="all">Online: Tất cả</option>
                                    <option value="online">Chỉ Online</option>
                                    <option value="idle">Idle</option>
                                    <option value="offline">Offline</option>
                                </select>

                                <select 
                                    class="text-input" 
                                    style="width: auto;"
                                    .value=${this.filterStatus}
                                    @change=${(e: any) => this.filterStatus = e.target.value}
                                >
                                    <option value="all">Trạng thái: Tất cả</option>
                                    <option value="Hospital">Chỉ Hospital (Viện)</option>
                                    <option value="Okay">Chỉ Okay (Tự do)</option>
                                    <option value="Abroad">Chỉ Abroad (Nước ngoài)</option>
                                    <option value="Jail">Chỉ Jail (Tù)</option>
                                </select>

                                <select 
                                    class="text-input" 
                                    style="width: auto;"
                                    .value=${this.sortBy}
                                    @change=${(e: any) => this.sortBy = e.target.value}
                                >
                                    <option value="attacks_asc">Sắp xếp: Attack ít nhất lên đầu (Mặc định)</option>
                                    <option value="attacks_desc">Sắp xếp: Attack nhiều nhất</option>
                                    <option value="level_desc">Level cao nhất</option>
                                    <option value="level_asc">Level thấp nhất</option>
                                    <option value="name">Tên A-Z</option>
                                    <option value="contact">Trạng thái liên hệ</option>
                                </select>
                            </div>

                            <label style="font-size: 0.8rem; color: #94a3b8; display: flex; align-items: center; gap: 6px; cursor: pointer;">
                                <input 
                                    type="checkbox" 
                                    .checked=${this.hideCaptains}
                                    @change=${(e: any) => this.hideCaptains = e.target.checked}
                                />
                                <span>Ẩn Captain & Vice-Captain</span>
                            </label>
                        </div>
                    </div>

                    <!-- Bulk Action Toolbar -->
                    ${this.selectedUserIDs.size > 0 ? html`
                        <div class="bulk-bar">
                            <span class="bulk-text">
                                Đã chọn ${this.selectedUserIDs.size} thành viên
                            </span>

                            <div class="btn-group">
                                <button class="btn btn-primary" @click=${this.bulkCopyMessages}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                    </svg>
                                    <span>Copy Hàng Loạt Tin Nhắn</span>
                                </button>

                                <button class="btn" @click=${this.bulkExportDiscord}>
                                    <span>📋 Copy List cho Discord / Captain</span>
                                </button>

                                <button class="btn btn-success" @click=${() => this.bulkSetContactStatus('contacted')}>
                                    <span>Đánh dấu "Đã nhắn"</span>
                                </button>

                                <button class="btn" @click=${() => this.selectedUserIDs = new Set()}>
                                    <span>Bỏ chọn</span>
                                </button>
                            </div>
                        </div>
                    ` : ''}

                    <!-- Roster Table -->
                    <div class="roster-table-wrapper">
                        <table class="roster-table">
                            <thead>
                                <tr>
                                    <th style="width: 36px; text-align: center;">
                                        <input 
                                            type="checkbox" 
                                            .checked=${filteredMembers.length > 0 && filteredMembers.every(m => this.selectedUserIDs.has(m.userID))}
                                            @change=${(e: any) => {
                                                if (e.target.checked) {
                                                    this.selectedUserIDs = new Set(filteredMembers.map(m => m.userID));
                                                } else {
                                                    this.selectedUserIDs = new Set();
                                                }
                                            }}
                                        />
                                    </th>
                                    <th>Player / ID</th>
                                    <th>Level</th>
                                    <th>Faction</th>
                                    <th>Status</th>
                                    <th>Online</th>
                                    <th>Attacks (Elim)</th>
                                    <th>Trạng Thái Liên Hệ</th>
                                    <th style="text-align: right;">Hành Động Thuyết Phục</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${filteredMembers.length === 0 ? html`
                                    <tr>
                                        <td colspan="9" style="text-align: center; padding: 2rem; color: #64748b;">
                                            Không có thành viên nào khớp với bộ lọc hiện tại.
                                        </td>
                                    </tr>
                                ` : filteredMembers.map(m => {
                                    const isZero = m.attacks === 0;
                                    const isLow = m.attacks <= this.lowContributionThreshold;
                                    const isSelected = this.selectedUserIDs.has(m.userID);
                                    const statusText = Array.isArray(m.status) ? m.status[1] : 'Okay';
                                    const statusColor = Array.isArray(m.status) ? m.status[0] : 'green';
                                    const isCaptain = Boolean(m.isCaptain || m.is_captain);
                                    const isVice = Boolean(m.isViceCaptain || m.is_vice_captain);

                                    return html`
                                        <tr class="${isZero ? 'critical-row' : ''}">
                                            <td style="text-align: center;">
                                                <input 
                                                    type="checkbox" 
                                                    .checked=${isSelected}
                                                    @change=${(e: any) => {
                                                        const newSet = new Set(this.selectedUserIDs);
                                                        if (e.target.checked) newSet.add(m.userID);
                                                        else newSet.delete(m.userID);
                                                        this.selectedUserIDs = newSet;
                                                    }}
                                                />
                                            </td>

                                            <td>
                                                <div class="player-cell">
                                                    <a 
                                                        href="https://www.torn.com/profiles.php?NID=${m.userID}" 
                                                        target="_blank" 
                                                        class="player-link"
                                                    >
                                                        ${m.playername}
                                                    </a>
                                                    <span class="player-id">[${m.userID}]</span>

                                                    ${isCaptain ? html`<span class="badge-role badge-captain">CAPTAIN</span>` : ''}
                                                    ${isVice ? html`<span class="badge-role badge-vice">VICE</span>` : ''}
                                                </div>
                                            </td>

                                            <td style="font-family: 'JetBrains Mono', monospace; font-weight: 600;">
                                                ${m.level}
                                            </td>

                                            <td>
                                                ${m.factionName ? html`
                                                    <a 
                                                        href="https://www.torn.com/factions.php?step=profile&ID=${m.factionID}" 
                                                        target="_blank"
                                                        style="color: #94a3b8; text-decoration: none; font-size: 0.8rem; display: inline-flex; align-items: center; gap: 4px;"
                                                    >
                                                        ${m.factionTag ? html`<strong style="color: #f1f5f9;">[${m.factionTag}]</strong>` : ''}
                                                        <span>${m.factionName}</span>
                                                    </a>
                                                ` : html`<span style="color: #64748b;">-</span>`}
                                            </td>

                                            <td>
                                                <span class="status-badge ${statusColor}">
                                                    ${statusText}
                                                    ${m.hospitalTimeStr ? html`(${m.hospitalTimeStr})` : ''}
                                                </span>
                                            </td>

                                            <td>
                                                <div style="display: flex; align-items: center; gap: 6px;">
                                                    <span class="online-dot ${m.onlineStatus || 'offline'}"></span>
                                                    <span style="font-size: 0.8rem; text-transform: capitalize; color: #94a3b8;">
                                                        ${m.onlineStatus || 'offline'}
                                                    </span>
                                                </div>
                                            </td>

                                            <td>
                                                <div class="attack-badge ${this.getAttackBadgeClass(m.attacks)}">
                                                    ${m.attacks === 0 ? '💀 0' : m.attacks}
                                                    ${isZero ? html`<span style="font-size:0.65rem; font-weight:700;">DEAD</span>` : ''}
                                                </div>
                                            </td>

                                            <td>
                                                <select 
                                                    class="contact-select ${m.contactStatus || 'uncontacted'}"
                                                    .value=${m.contactStatus || 'uncontacted'}
                                                    @change=${(e: any) => this.setMemberContactStatus(m.userID, e.target.value)}
                                                >
                                                    <option value="uncontacted">⏳ Chưa liên hệ</option>
                                                    <option value="contacted">✉️ Đã nhắn</option>
                                                    <option value="replied">💬 Đã trả lời</option>
                                                    <option value="left">🚪 Đã rời team</option>
                                                    <option value="ignored">❌ Từ chối / Kệ</option>
                                                </select>
                                            </td>

                                            <td style="text-align: right;">
                                                <div class="action-cell" style="justify-content: flex-end;">
                                                    <button 
                                                        class="btn-action copy-btn" 
                                                        title="Copy tin nhắn thuyết phục"
                                                        @click=${() => this.copyPersuasionMessage(m)}
                                                    >
                                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                                        </svg>
                                                        <span>Copy Msg</span>
                                                    </button>

                                                    <a 
                                                        href="https://www.torn.com/messages.php#/p=compose&XID=${m.userID}" 
                                                        target="_blank" 
                                                        class="btn-action mail-btn"
                                                        title="Mở Torn Mail soạn tin nhắn"
                                                        @click=${() => this.markAsContactedIfUncontacted(m.userID)}
                                                    >
                                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                                                            <polyline points="22,6 12,13 2,6"></polyline>
                                                        </svg>
                                                        <span>Mail</span>
                                                    </a>

                                                    <a 
                                                        href="https://www.torn.com${m.attack_link || `/page.php?sid=attack&user2ID=${m.userID}`}" 
                                                        target="_blank" 
                                                        class="btn-action"
                                                        title="Torn Attack Page"
                                                    >
                                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                            <line x1="14.5" y1="17.5" x2="3" y2="6"></line>
                                                            <line x1="10" y1="21" x2="3" y2="14"></line>
                                                            <polygon points="21 3 15 3 21 9 21 3"></polygon>
                                                        </svg>
                                                    </a>
                                                </div>
                                            </td>
                                        </tr>
                                    `;
                                })}
                            </tbody>
                        </table>
                    </div>
                ` : html`
                    <div class="empty-state">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#475569" stroke-width="1.5">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                            <circle cx="9" cy="7" r="4"></circle>
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                        </svg>
                        <strong style="color: #cbd5e1; font-size: 1.1rem;">Chưa có dữ liệu thành viên Elim Team</strong>
                        <p style="max-width: 480px; font-size: 0.85rem; line-height: 1.5;">
                            Nhập URL hoặc Team ID & RFCV ở trên rồi bấm <strong>Fetch Page</strong> hoặc <strong>Fetch All</strong> để tải danh sách thành viên. 
                            Nếu Cloudflare của Torn chặn request server, bạn có thể bấm <strong>Paste JSON Payload</strong> hoặc sử dụng <strong>Torn Console Helper</strong>.
                        </p>
                    </div>
                `}

                <!-- Modal: Paste JSON Payload -->
                ${this.showPasteModal ? html`
                    <div class="modal-overlay" @click=${(e: any) => { if (e.target.classList.contains('modal-overlay')) this.showPasteModal = false; }}>
                        <div class="modal-box">
                            <div class="modal-title">
                                <span>Paste Raw JSON Payload từ Torn</span>
                                <button class="modal-close" @click=${() => this.showPasteModal = false}>&times;</button>
                            </div>
                            <p style="font-size: 0.85rem; color: #94a3b8; margin: 0;">
                                Dán payload JSON của Torn (từ F12 Network tab hoặc copy từ response của endpoint competitionData):
                            </p>
                            <textarea 
                                class="text-input" 
                                rows="10" 
                                placeholder='{"members": [...]} hoặc dán trực tiếp array [{ "userID": 4028556, "playername": "...", "attacks": 302 }]'
                                .value=${this.pasteJsonText}
                                @input=${(e: any) => this.pasteJsonText = e.target.value}
                            ></textarea>
                            <div class="btn-group" style="justify-content: flex-end;">
                                <button class="btn" @click=${() => this.showPasteModal = false}>Hủy</button>
                                <button class="btn btn-primary" @click=${this.loadPastedJson}>
                                    Load Dữ Liệu
                                </button>
                            </div>
                        </div>
                    </div>
                ` : ''}

                <!-- Modal: Browser Console Helper -->
                ${this.showConsoleScriptModal ? html`
                    <div class="modal-overlay" @click=${(e: any) => { if (e.target.classList.contains('modal-overlay')) this.showConsoleScriptModal = false; }}>
                        <div class="modal-box">
                            <div class="modal-title">
                                <span>Torn Console Helper Script</span>
                                <button class="modal-close" @click=${() => this.showConsoleScriptModal = false}>&times;</button>
                            </div>
                            <p style="font-size: 0.85rem; color: #94a3b8; margin: 0;">
                                Nếu Cloudflare chặn IP server của bạn, hãy mở tab Torn trong trình duyệt (nơi bạn đã đăng nhập), bấm F12 &rarr; Console, dán đoạn code sau và Enter:
                            </p>
                            <pre class="code-box">${this.generateConsoleScript()}</pre>
                            <div class="btn-group" style="justify-content: flex-end;">
                                <button class="btn btn-primary" @click=${this.copyConsoleScript}>
                                    📋 Copy Snippet
                                </button>
                                <button class="btn" @click=${() => this.showConsoleScriptModal = false}>Đóng</button>
                            </div>
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }

    private handleUrlInput(e: any) {
        this.inputUrl = e.target.value;
        try {
            const url = new URL(this.inputUrl);
            const tid = url.searchParams.get('teamID');
            if (tid) {
                this.teamID = Number(tid);
                localStorage.setItem('tornElimTeamID', String(this.teamID));
            }
            const p = url.searchParams.get('p');
            if (p) this.page = Number(p);
            const token = url.searchParams.get('rfcv');
            if (token) {
                this.rfcv = token;
                localStorage.setItem('tornElimRfcv', this.rfcv);
            }
        } catch {
            // Not a full URL yet, ignore
        }
    }

    private updateInputUrl() {
        this.inputUrl = `https://www.torn.com/page.php?sid=competitionData&step=viewTeam&teamID=${this.teamID}&showAvailable=0&p=${this.page}&rfcv=${this.rfcv}`;
    }

    private async fetchRoster(fetchAll = false) {
        this.isLoading = true;
        this.errorMessage = '';
        this.loadingProgress = fetchAll ? 'Đang kết nối và lấy toàn bộ trang...' : `Đang tải trang ${this.page}...`;

        try {
            const endpoint = `/api/elimination/team-roster?teamID=${this.teamID}&p=${this.page}&rfcv=${encodeURIComponent(this.rfcv)}&fetchAll=${fetchAll}`;
            const res = await fetch(endpoint, {
                headers: this.tornCookie ? { 'X-Torn-Cookie': this.tornCookie } : {}
            });

            const data = await res.json();

            if (!res.ok || !data.ok) {
                if (data.isCloudflare || data.error?.includes('Cloudflare')) {
                    this.errorMessage = 'Cloudflare của Torn đã chặn request từ server. Vui lòng bấm "Paste JSON Payload" hoặc sử dụng "Torn Console Helper" để lấy trực tiếp từ tab Torn của bạn!';
                } else {
                    this.errorMessage = data.error || 'Lỗi không xác định khi tải danh sách thành viên.';
                }
                return;
            }

            if (data.teamName) this.teamName = data.teamName;
            if (data.totalPages) this.totalPages = data.totalPages;
            if (data.total) this.totalCount = data.total;

            const incomingMembers: ElimTeamMember[] = (data.members || []).map((m: any) => this.parseHospitalTime(m));

            if (fetchAll) {
                this.mergeMembers(incomingMembers, true);
                this.successNotification = `Đã tải thành công toàn bộ ${this.members.length} thành viên của Team!`;
            } else {
                this.mergeMembers(incomingMembers, false);
                this.successNotification = `Đã tải thành công trang ${this.page} (${incomingMembers.length} thành viên)!`;
            }

            // Save to localStorage
            this.saveMembersToStorage();
        } catch (err: any) {
            this.errorMessage = err.message || 'Lỗi kết nối tới backend server.';
        } finally {
            this.isLoading = false;
            this.loadingProgress = '';
        }
    }

    private parseHospitalTime(member: ElimTeamMember): ElimTeamMember {
        if (!member.icons) return member;
        try {
            // Look for hospital timer in icons: data-time='7530'>02:05:30</span>
            const timerMatch = member.icons.match(/class=['"]timer['"][^>]*>([^<]+)<\/span>/);
            if (timerMatch && timerMatch[1]) {
                return {
                    ...member,
                    hospitalTimeStr: timerMatch[1]
                };
            }
        } catch {}
        return member;
    }

    private mergeMembers(newMembers: ElimTeamMember[], replaceAll = false) {
        if (replaceAll) {
            // Keep existing contactStatus and notes if member was already present
            const oldMap = new Map(this.members.map(m => [m.userID, m]));
            this.members = newMembers.map(m => {
                const old = oldMap.get(m.userID);
                return old ? { ...m, contactStatus: old.contactStatus, contactNotes: old.contactNotes } : m;
            });
        } else {
            const memberMap = new Map(this.members.map(m => [m.userID, m]));
            for (const m of newMembers) {
                const existing = memberMap.get(m.userID);
                memberMap.set(m.userID, existing ? { ...m, contactStatus: existing.contactStatus, contactNotes: existing.contactNotes } : m);
            }
            this.members = Array.from(memberMap.values());
        }
    }

    private loadPastedJson() {
        if (!this.pasteJsonText.trim()) return;
        try {
            const parsed = JSON.parse(this.pasteJsonText.trim());
            // Use client-side normalization
            let rawList: any[] = [];
            if (Array.isArray(parsed)) {
                rawList = parsed;
            } else if (Array.isArray(parsed.members)) {
                rawList = parsed.members;
            } else if (Array.isArray(parsed.list)) {
                rawList = parsed.list;
            } else if (typeof parsed === 'object') {
                rawList = Object.values(parsed);
            }

            const formatted: ElimTeamMember[] = rawList.map((m: any) => this.parseHospitalTime({
                userID: Number(m.userID || m.id || m.userId),
                playername: m.playername || m.name || m.playerName || '',
                honorID: m.honorID !== undefined ? Number(m.honorID) : undefined,
                honorStyle: m.honorStyle || 'default',
                level: Number(m.level || 0),
                status: Array.isArray(m.status) ? m.status : [m.status?.color || 'green', m.status?.description || 'Okay', m.status?.state || 0],
                icons: m.icons || '',
                factionID: m.factionID ? Number(m.factionID) : undefined,
                factionName: m.factionName,
                factionTag: m.factionTag,
                factionImageUrl: m.factionImageUrl,
                factionRank: m.factionRank,
                onlineStatus: (m.onlineStatus || m.online || 'offline').toLowerCase(),
                isCaptain: Number(m.isCaptain ?? m.is_captain ?? 0),
                isViceCaptain: Number(m.isViceCaptain ?? m.is_vice_captain ?? 0),
                is_captain: Number(m.isCaptain ?? m.is_captain ?? 0),
                is_vice_captain: Number(m.isViceCaptain ?? m.is_vice_captain ?? 0),
                attacks: Number(m.attacks ?? m.attackCount ?? 0),
                attack_link: m.attack_link || `/page.php?sid=attack&user2ID=${m.userID || m.id}`
            }));

            this.mergeMembers(formatted, false);
            this.saveMembersToStorage();
            this.showPasteModal = false;
            this.pasteJsonText = '';
            this.successNotification = `Đã nhập thành công ${formatted.length} thành viên từ JSON!`;
        } catch (err: any) {
            alert('JSON không hợp lệ: ' + err.message);
        }
    }

    private clearRoster() {
        if (confirm('Bạn có chắc chắn muốn xóa danh sách thành viên hiện tại?')) {
            this.members = [];
            this.selectedUserIDs.clear();
            localStorage.removeItem('tornElimRosterMembers');
            this.successNotification = 'Đã làm trống danh sách.';
        }
    }

    private saveMembersToStorage() {
        localStorage.setItem('tornElimRosterMembers', JSON.stringify(this.members));
    }

    private setMemberContactStatus(userId: number, status: string) {
        this.members = this.members.map(m => {
            if (m.userID === userId) {
                return {
                    ...m,
                    contactStatus: status as ContactStatus,
                    contactedAt: status === 'contacted' ? Date.now() : m.contactedAt
                };
            }
            return m;
        });
        this.saveMembersToStorage();
    }

    private markAsContactedIfUncontacted(userId: number) {
        const m = this.members.find(x => x.userID === userId);
        if (m && (!m.contactStatus || m.contactStatus === 'uncontacted')) {
            this.setMemberContactStatus(userId, 'contacted');
        }
    }

    private getActiveTemplate(): string {
        if (this.selectedTemplateId === 'custom' && this.customTemplateText.trim()) {
            return this.customTemplateText.trim();
        }
        const t = DEFAULT_TEMPLATES.find(x => x.id === this.selectedTemplateId);
        return t ? t.text : DEFAULT_TEMPLATES[0].text;
    }

    private formatMessageForMember(member: ElimTeamMember): string {
        const tmpl = this.getActiveTemplate();
        return tmpl
            .replace(/{name}/g, member.playername)
            .replace(/{attacks}/g, String(member.attacks))
            .replace(/{level}/g, String(member.level))
            .replace(/{id}/g, String(member.userID));
    }

    private async copyPersuasionMessage(member: ElimTeamMember) {
        const msg = this.formatMessageForMember(member);
        await navigator.clipboard.writeText(msg);
        this.markAsContactedIfUncontacted(member.userID);
        this.successNotification = `Đã copy tin nhắn cho ${member.playername}!`;
    }

    private async bulkCopyMessages() {
        const selected = this.members.filter(m => this.selectedUserIDs.has(m.userID));
        if (selected.length === 0) return;

        const lines = selected.map(m => {
            return `--- [${m.playername} | ID: ${m.userID} | Attacks: ${m.attacks}] ---\n${this.formatMessageForMember(m)}\n`;
        }).join('\n');

        await navigator.clipboard.writeText(lines);
        this.successNotification = `Đã copy ${selected.length} tin nhắn vào clipboard!`;
    }

    private async bulkExportDiscord() {
        const selected = this.members.filter(m => this.selectedUserIDs.has(m.userID));
        if (selected.length === 0) return;

        let output = `**Elimination Low Contributors Report - Team ${this.teamID}**\n`;
        output += `Total low contributors: ${selected.length}\n\n`;
        for (const m of selected) {
            output += `• **${m.playername}** [${m.userID}] (Lvl ${m.level}) - **${m.attacks} attacks** | Status: ${Array.isArray(m.status) ? m.status[1] : 'Okay'} | <https://www.torn.com/profiles.php?NID=${m.userID}>\n`;
        }

        await navigator.clipboard.writeText(output);
        this.successNotification = `Đã copy danh sách định dạng Discord cho ${selected.length} người!`;
    }

    private bulkSetContactStatus(status: ContactStatus) {
        this.members = this.members.map(m => {
            if (this.selectedUserIDs.has(m.userID)) {
                return {
                    ...m,
                    contactStatus: status,
                    contactedAt: status === 'contacted' ? Date.now() : m.contactedAt
                };
            }
            return m;
        });
        this.saveMembersToStorage();
        this.successNotification = `Đã cập nhật trạng thái "${status}" cho ${this.selectedUserIDs.size} người.`;
    }

    private getAttackBadgeClass(attacks: number): string {
        if (attacks === 0) return 'zero';
        if (attacks <= 10) return 'critical';
        if (attacks <= this.lowContributionThreshold) return 'low';
        if (attacks <= 150) return 'moderate';
        return 'good';
    }

    private calculateAnalytics() {
        const totalMembers = this.members.length;
        if (totalMembers === 0) {
            return {
                totalMembers: 0,
                totalAttacks: 0,
                avgAttacks: '0',
                zeroAttackCount: 0,
                zeroAttackPct: '0',
                lowAttackCount: 0,
                lowAttackPct: '0',
                contactedCount: 0,
                uncontactedLowCount: 0,
                leftCount: 0
            };
        }

        let totalAttacks = 0;
        let zeroAttackCount = 0;
        let lowAttackCount = 0;
        let contactedCount = 0;
        let uncontactedLowCount = 0;
        let leftCount = 0;

        for (const m of this.members) {
            totalAttacks += m.attacks;
            if (m.attacks === 0) zeroAttackCount++;
            if (m.attacks <= this.lowContributionThreshold) {
                lowAttackCount++;
                if (!m.contactStatus || m.contactStatus === 'uncontacted') {
                    uncontactedLowCount++;
                }
            }
            if (m.contactStatus === 'contacted' || m.contactStatus === 'replied') contactedCount++;
            if (m.contactStatus === 'left') leftCount++;
        }

        const avgAttacks = (totalAttacks / totalMembers).toFixed(1);
        const zeroAttackPct = ((zeroAttackCount / totalMembers) * 100).toFixed(1);
        const lowAttackPct = ((lowAttackCount / totalMembers) * 100).toFixed(1);

        return {
            totalMembers,
            totalAttacks,
            avgAttacks,
            zeroAttackCount,
            zeroAttackPct,
            lowAttackCount,
            lowAttackPct,
            contactedCount,
            uncontactedLowCount,
            leftCount
        };
    }

    private getFilteredMembers(): ElimTeamMember[] {
        return this.members.filter(m => {
            // Quick Filter
            if (this.filterQuick === 'zero' && m.attacks !== 0) return false;
            if (this.filterQuick === 'low' && m.attacks > this.lowContributionThreshold) return false;
            if (this.filterQuick === 'uncontacted_low') {
                if (m.attacks > this.lowContributionThreshold) return false;
                if (m.contactStatus && m.contactStatus !== 'uncontacted') return false;
            }
            if (this.filterQuick === 'contacted' && m.contactStatus !== 'contacted' && m.contactStatus !== 'replied') return false;
            if (this.filterQuick === 'left' && m.contactStatus !== 'left') return false;

            // Online filter
            if (this.filterOnline !== 'all' && (m.onlineStatus || 'offline') !== this.filterOnline) return false;

            // Status filter
            if (this.filterStatus !== 'all') {
                const s = Array.isArray(m.status) ? m.status[1] : 'Okay';
                if (s !== this.filterStatus) return false;
            }

            // Hide captains
            if (this.hideCaptains && (m.isCaptain || m.is_captain || m.isViceCaptain || m.is_vice_captain)) return false;

            // Search query
            if (this.searchQuery.trim()) {
                const q = this.searchQuery.toLowerCase().trim();
                const nameMatch = m.playername.toLowerCase().includes(q);
                const idMatch = String(m.userID).includes(q);
                const factionMatch = (m.factionName?.toLowerCase().includes(q) || m.factionTag?.toLowerCase().includes(q));
                if (!nameMatch && !idMatch && !factionMatch) return false;
            }

            return true;
        }).sort((a, b) => {
            if (this.sortBy === 'attacks_asc') return a.attacks - b.attacks;
            if (this.sortBy === 'attacks_desc') return b.attacks - a.attacks;
            if (this.sortBy === 'level_desc') return b.level - a.level;
            if (this.sortBy === 'level_asc') return a.level - b.level;
            if (this.sortBy === 'name') return a.playername.localeCompare(b.playername);
            if (this.sortBy === 'contact') {
                const order: Record<string, number> = { uncontacted: 0, contacted: 1, replied: 2, left: 3, ignored: 4 };
                return (order[a.contactStatus || 'uncontacted'] || 0) - (order[b.contactStatus || 'uncontacted'] || 0);
            }
            return 0;
        });
    }

    private generateConsoleScript(): string {
        return `// Chạy đoạn này trong F12 Console trên tab https://www.torn.com:
(async () => {
    const teamID = ${this.teamID};
    const rfcv = window.rfcv || '${this.rfcv}';
    console.log('%c[Torn Fetcher] Bắt đầu tải toàn bộ thành viên team ' + teamID + '...', 'color: #3b82f6; font-weight: bold;');
    
    let allMembers = [];
    let p = 1;
    let totalPages = 1;
    
    while (p <= totalPages && p <= 25) {
        console.log(\`Đang tải trang \${p}...\`);
        try {
            const res = await fetch(\`/page.php?sid=competitionData&step=viewTeam&teamID=\${teamID}&showAvailable=0&p=\${p}&rfcv=\${rfcv}\`, {
                headers: { 'X-Requested-With': 'XMLHttpRequest', 'Accept': 'application/json, text/javascript, */*' }
            });
            const data = await res.json();
            const list = Array.isArray(data) ? data : (data.members || data.list || []);
            if (list.length === 0) break;
            allMembers.push(...list);
            if (data.totalPages && data.totalPages > totalPages) totalPages = data.totalPages;
            p++;
            await new Promise(r => setTimeout(r, 200));
        } catch (err) {
            console.error('Lỗi khi tải trang ' + p + ':', err);
            break;
        }
    }
    
    console.log('%c✓ Đã tải xong ' + allMembers.length + ' thành viên!', 'color: #10b981; font-weight: bold;');
    
    // Lưu vào biến toàn cục để truy xuất
    window.tornElimMembers = allMembers;
    const jsonStr = JSON.stringify(allMembers);
    
    // Dùng lệnh copy() có sẵn trong DevTools console (không bị lỗi Document is not focused)
    let copied = false;
    if (typeof copy === 'function') {
        try {
            copy(jsonStr);
            copied = true;
        } catch (e) {}
    }
    
    // Fallback nếu không có hàm copy() của DevTools
    if (!copied) {
        try {
            const ta = document.createElement('textarea');
            ta.value = jsonStr;
            ta.style.position = 'fixed';
            ta.style.left = '-9999px';
            document.body.appendChild(ta);
            ta.select();
            copied = document.execCommand('copy');
            document.body.removeChild(ta);
        } catch (e) {}
    }
    
    // Thử đồng bộ trực tiếp vào ứng dụng nếu đang mở ở localhost
    let synced = false;
    try {
        const syncRes = await fetch('http://localhost:3000/api/elimination/team-roster', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rawJson: allMembers })
        });
        if (syncRes.ok) synced = true;
    } catch (e) {}
    
    if (synced) {
        console.log('%c✓ Đã tự động đồng bộ thành công vào ứng dụng (localhost:3000)!', 'color: #3b82f6; font-size: 13px; font-weight: bold;');
        alert('Đã tải và tự động đồng bộ ' + allMembers.length + ' thành viên vào ứng dụng!');
    } else if (copied) {
        console.log('%c✓ Đã copy thành công dữ liệu vào Clipboard!', 'color: #10b981; font-size: 13px; font-weight: bold;');
        alert('Đã tải xong ' + allMembers.length + ' thành viên và COPY vào Clipboard! Hãy quay lại app và bấm "Paste JSON Payload".');
    } else {
        console.log('%cDữ liệu đã được lưu vào window.tornElimMembers. Bạn có thể gõ copy(JSON.stringify(window.tornElimMembers)) để copy.', 'color: #f59e0b; font-size: 13px;');
        alert('Đã tải xong ' + allMembers.length + ' thành viên! Hãy gõ: copy(JSON.stringify(window.tornElimMembers)) vào Console để copy.');
    }
})();`;
    }

    private async copyConsoleScript() {
        await navigator.clipboard.writeText(this.generateConsoleScript());
        this.successNotification = 'Đã copy Console Script vào clipboard!';
    }
}
