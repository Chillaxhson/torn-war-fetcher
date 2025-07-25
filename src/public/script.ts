interface Member {
    id: string;
    name: string;
    level: number;
    status: {
        description: string;
        state: string;
        until: number;
    };
}

interface TornFactionData {
    members: Record<string, Omit<Member, 'id'>>;
    error?: string;
    details?: string;
}

document.addEventListener('DOMContentLoaded', () => {
    const fetchButton = document.getElementById('fetchFactionData') as HTMLButtonElement;
    const factionIDInput = document.getElementById('factionIDInput') as HTMLInputElement;
    const apiKeyInput = document.getElementById('apiKeyInput') as HTMLInputElement;
    const targetList = document.getElementById('target-list') as HTMLDivElement;
    let updateInterval: number;

    apiKeyInput.value = localStorage.getItem('tornApiKey') || '';

    fetchButton.addEventListener('click', () => {
        const factionID = factionIDInput.value;
        const apiKey = apiKeyInput.value;

        if (apiKey) {
            localStorage.setItem('tornApiKey', apiKey);
        } else {
            alert('Please enter your API key.');
            return;
        }

        if (factionID) {
            if (updateInterval) clearInterval(updateInterval);
            fetchAndDisplayTargets(factionID, apiKey);
            updateInterval = window.setInterval(() => fetchAndDisplayTargets(factionID, apiKey), 15000);
        } else {
            alert('Please enter a faction ID.');
        }
    });

    async function fetchAndDisplayTargets(factionID: string, apiKey: string) {
        try {
            const response = await fetch(`/api/faction/${factionID}`, {
                headers: { 'X-API-Key': apiKey }
            });
            const data: TornFactionData = await response.json();

            if (data.error) {
                targetList.innerHTML = `<p style="color: red;">Error: ${data.error}</p>`;
                if (data.details) {
                    targetList.innerHTML += `<p style="color: red;">Details: ${data.details}</p>`;
                }
                return;
            }
            
            const members: Member[] = Object.entries(data.members || {})
                .map(([id, member]) => ({ id, ...member }))
                .filter(member => member.id !== '2186323'); 

            members.sort((a, b) => {
                const a_until = a.status.until || 0;
                const b_until = b.status.until || 0;
                if (a_until > 0 && b_until > 0) return a_until - b_until;
                if (a_until > 0) return -1;
                if (b_until > 0) return 1;
                if (a.status.state === 'Okay' && b.status.state !== 'Okay') return -1;
                if (b.status.state === 'Okay' && a.status.state !== 'Okay') return 1;
                return 0;
            });

            renderTargets(members);

        } catch (error) {
            console.error('Failed to fetch or render targets:', error);
            targetList.innerHTML = '<p style="color: red;">Could not connect to the local server. Is it running?</p>';
        }
    }

    function renderTargets(members: Member[]) {
        targetList.innerHTML = ''; 
        const now = Math.floor(Date.now() / 1000);

        members.forEach(member => {
            const card = document.createElement('div');
            card.className = `target-card status-${member.status.state.replace(/\s+/g, '')}`;
            
            let statusHTML = `Status: <strong>${member.status.description}</strong>`;
            const timeUntil = member.status.until - now;

            if (timeUntil > 0) {
                statusHTML += ` - <span class="countdown" data-until="${member.status.until}"></span>`;
            }

            const attackLink = `<a href="https://www.torn.com/loader.php?sid=attack&user2ID=${member.id}" target="_blank" class="attack-link">Attack</a>`;

            card.innerHTML = `
                <div class="target-info">
                    <div>
                        <span class="name">${member.name}</span>
                        <span class="level">(Level: ${member.level})</span>
                    </div>
                    <div class="status">${statusHTML}</div>
                </div>
                <div class="target-actions">
                    ${attackLink}
                </div>
            `;
            targetList.appendChild(card);
        });

        updateCountdowns();
    }

    function updateCountdowns() {
        const countdownElements = document.querySelectorAll('.countdown');
        countdownElements.forEach(el => {
            const until = parseInt((el as HTMLElement).dataset.until!, 10);
            const now = Math.floor(Date.now() / 1000);
            const diff = until - now;

            if (diff <= 0) {
                el.textContent = 'Ready';
            } else {
                const h = Math.floor(diff / 3600).toString().padStart(2, '0');
                const m = Math.floor((diff % 3600) / 60).toString().padStart(2, '0');
                const s = Math.floor(diff % 60).toString().padStart(2, '0');
                el.textContent = `${h}:${m}:${s}`;
            }
        });
    }

    setInterval(updateCountdowns, 1000);
}); 
