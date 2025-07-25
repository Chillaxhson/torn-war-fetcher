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
    const armedTargets = new Set<string>();

    apiKeyInput.value = localStorage.getItem('tornApiKey') || '';
    
    // Load faction IDs and populate datalist
    const storedFactionIDs = JSON.parse(localStorage.getItem('tornFactionIDs') || '[]');
    if (storedFactionIDs.length > 0) {
        factionIDInput.value = storedFactionIDs[0];
        const datalist = document.getElementById('factionIDs');
        if (datalist) {
            datalist.innerHTML = '';
            storedFactionIDs.forEach((id: string) => {
                const option = document.createElement('option');
                option.value = id;
                datalist.appendChild(option);
            });
        }
    }


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
            // Save the faction ID
            let existingIDs = JSON.parse(localStorage.getItem('tornFactionIDs') || '[]');
            existingIDs = [factionID, ...existingIDs.filter((id: string) => id !== factionID)];
            if (existingIDs.length > 10) {
                existingIDs.pop();
            }
            localStorage.setItem('tornFactionIDs', JSON.stringify(existingIDs));
            
            // Update datalist
            const datalist = document.getElementById('factionIDs');
            if (datalist) {
                datalist.innerHTML = '';
                existingIDs.forEach((id: string) => {
                    const option = document.createElement('option');
                    option.value = id;
                    datalist.appendChild(option);
                });
            }

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
            
            fetchButton.textContent = 'Refetch Targets';

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

    function playNotificationSound() {
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

    function renderTargets(members: Member[]) {
        targetList.innerHTML = '';
        const now = Math.floor(Date.now() / 1000);

        members.forEach(member => {
            const card = document.createElement('div');
            card.id = `target-${member.id}`;
            card.className = `target-card status-${member.status.state.replace(/\s+/g, '')}`;
            
            let statusHTML = `Status: <strong>${member.status.description}</strong>`;
            const timeUntil = member.status.until - now;

            if (timeUntil > 0) {
                statusHTML += ` - <span class="countdown" data-until="${member.status.until}"></span>`;
            }

            const attackUrl = `https://www.torn.com/loader.php?sid=attack&user2ID=${member.id}`;

            card.innerHTML = `
                <div class="target-info">
                    <div>
                        <span class="name">${member.name}</span>
                        <span class="level">(Level: ${member.level})</span>
                    </div>
                    <div class="status">${statusHTML}</div>
                </div>
                <div class="target-actions">
                    <label class="notify-label">
                        <input type="checkbox" class="notify-checkbox" data-attack-url="${attackUrl}"> Notify & Attack
                    </label>
                    <a href="${attackUrl}" target="_blank" class="attack-link">Attack</a>
                </div>
            `;
            targetList.appendChild(card);

            const checkbox = card.querySelector('.notify-checkbox') as HTMLInputElement;
            checkbox.checked = armedTargets.has(member.id);
            if (checkbox.checked) {
                card.classList.add('armed');
            }

            checkbox.addEventListener('change', () => {
                if (checkbox.checked) {
                    armedTargets.add(member.id);
                    card.classList.add('armed');
                } else {
                    armedTargets.delete(member.id);
                    card.classList.remove('armed');
                }
            });
        });

        updateCountdowns();
    }

    function updateCountdowns() {
        const countdownElements = document.querySelectorAll('.countdown');
        countdownElements.forEach(el => {
            const card = el.closest('.target-card') as HTMLDivElement;
            if (!card) return;

            const memberId = card.id.replace('target-', '');
            const until = parseInt((el as HTMLElement).dataset.until!, 10);
            const now = Math.floor(Date.now() / 1000);
            const diff = until - now;

            if (diff <= 1) {
                el.textContent = 'Ready';
                if (armedTargets.has(memberId)) {
                    const checkbox = card.querySelector('.notify-checkbox') as HTMLInputElement;
                    const attackUrl = checkbox.dataset.attackUrl;

                    playNotificationSound();
                    if (attackUrl) {
                        window.open(attackUrl, '_blank');
                    }
                    
                    armedTargets.delete(memberId);
                    checkbox.checked = false;
                    card.classList.remove('armed');
                }
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
