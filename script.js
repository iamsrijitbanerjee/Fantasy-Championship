// Database connection
const SUPABASE_URL = "https://qtthaelgzxswjhbccrgi.supabase.co"; 
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0dGhhZWxnenhzd2poYmNjcmdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5MjM1NDIsImV4cCI6MjA5ODQ5OTU0Mn0.4STLAIEEqmUOglGAsBp7rklU5udTpfZCyLtf9pr5aDg";              

// Initial baseline data up to round 29
const baselineData = [
    { id: "srijit", name: "Srijit FC", r1: 10, r2: 9, r3: 2, r4: 4, r5: 2, r6: 0, bonus: 0, currentWinStreak: 1, currentPodiumStreak: 2, currentLastStreak: 0 },
    { id: "bitansh", name: "Bitansh FC", r1: 7, r2: 9, r3: 6, r4: 3, r5: 3, r6: 0, bonus: 0, currentWinStreak: 0, currentPodiumStreak: 0, currentLastStreak: 0 },
    { id: "sandy", name: "Sandy FC", r1: 6, r2: 3, r3: 8, r4: 7, r5: 3, r6: 0, bonus: 0, currentWinStreak: 0, currentPodiumStreak: 0, currentLastStreak: 2 },
    { id: "debarshi", name: "Debarshi FC", r1: 4, r2: 5, r3: 8, r4: 10, r5: 1, r6: 0, bonus: 3, currentWinStreak: 0, currentPodiumStreak: 1, currentLastStreak: 0 },
    { id: "soumik", name: "Soumik FC", r1: 1, r2: 2, r3: 4, r4: 2, r5: 4, r6: 0, bonus: 3, currentWinStreak: 0, currentPodiumStreak: 2, currentLastStreak: 0 },
    { id: "arkadeep", name: "Arkadeep FC", r1: 0, r2: 0, r3: 0, r4: 0, r5: 0, r6: 0, bonus: 0, currentWinStreak: 0, currentPodiumStreak: 0, currentLastStreak: 0 }
];

async function initDashboard() {
    let finalData = [];

    try {
        const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        let { data: matchdays, error } = await supabase.from('matchdays').select('*').order('round_number', { ascending: true });
        
        if (error || !matchdays || matchdays.length === 0) {
            document.getElementById("sync-status").innerText = "Showing Local Baseline (No Cloud Data)";
            finalData = calculateStandings(baselineData);
            renderDashboard(finalData, 29);
        } else {
            document.getElementById("sync-status").innerText = "Database Synced Successfully";
            const currentRound = Math.max(...matchdays.map(r => r.round_number || 0)) + 29;
            finalData = processCloudData(matchdays);
            renderDashboard(finalData, currentRound);
        }
    } catch(err) {
        console.error("Error fetching data:", err);
        document.getElementById("sync-status").innerText = "Offline Mode";
        finalData = calculateStandings(baselineData);
        renderDashboard(finalData, 29);
    }
}

function processCloudData(rows) {
    // Clone baseline so we don't mutate the original array
    const dataObj = {};
    baselineData.forEach(c => {
        dataObj[c.id] = { ...c };
    });

    const streaks = {
        srijit: { win: dataObj.srijit.currentWinStreak, podium: dataObj.srijit.currentPodiumStreak, last: dataObj.srijit.currentLastStreak },
        bitansh: { win: dataObj.bitansh.currentWinStreak, podium: dataObj.bitansh.currentPodiumStreak, last: dataObj.bitansh.currentLastStreak },
        debarshi: { win: dataObj.debarshi.currentWinStreak, podium: dataObj.debarshi.currentPodiumStreak, last: dataObj.debarshi.currentLastStreak },
        sandy: { win: dataObj.sandy.currentWinStreak, podium: dataObj.sandy.currentPodiumStreak, last: dataObj.sandy.currentLastStreak },
        soumik: { win: dataObj.soumik.currentWinStreak, podium: dataObj.soumik.currentPodiumStreak, last: dataObj.soumik.currentLastStreak },
        arkadeep: { win: dataObj.arkadeep.currentWinStreak, podium: dataObj.arkadeep.currentPodiumStreak, last: dataObj.arkadeep.currentLastStreak }
    };

    rows.forEach(round => {
        const rawScores = [
            { id: "srijit", score: round.srijit_score },
            { id: "bitansh", score: round.bitansh_score },
            { id: "debarshi", score: round.debarshi_score },
            { id: "sandy", score: round.sandy_score },
            { id: "soumik", score: round.soumik_score },
            { id: "arkadeep", score: round.arkadeep_score }
        ];

        const activePlayers = rawScores.filter(x => x.score !== null && x.score !== undefined);
        const playerCount = activePlayers.length;

        activePlayers.sort((a,b) => b.score - a.score);
        
        // Add placements
        activePlayers.forEach((team, idx) => {
            if (idx === 0) dataObj[team.id].r1++;
            if (idx === 1) dataObj[team.id].r2++;
            if (idx === 2) dataObj[team.id].r3++;
            if (idx === 3) dataObj[team.id].r4++;
            if (idx === 4) dataObj[team.id].r5++;
            if (idx === 5) dataObj[team.id].r6++;
        });

        // Calculate streaks and bonuses
        Object.keys(streaks).forEach(id => {
            const played = activePlayers.some(x => x.id === id);
            if (!played) return;

            const rank = activePlayers.findIndex(x => x.id === id) + 1;
            
            // Win streak
            if (rank === 1) {
                streaks[id].win++;
                if (streaks[id].win === 3) { dataObj[id].bonus += 15; streaks[id].win = 0; }
            } else { streaks[id].win = 0; }

            // Podium streak
            if (rank <= 3) {
                streaks[id].podium++;
                if (streaks[id].podium === 3) { dataObj[id].bonus += 7; streaks[id].podium = 0; }
            } else { streaks[id].podium = 0; }

            // Last place streak
            if (rank === playerCount) {
                streaks[id].last++;
                if (streaks[id].last === 3) { dataObj[id].bonus -= 5; streaks[id].last = 0; }
            } else { streaks[id].last = 0; }

            dataObj[id].currentWinStreak = streaks[id].win;
            dataObj[id].currentPodiumStreak = streaks[id].podium;
            dataObj[id].currentLastStreak = streaks[id].last;
        });

        // Captain bonus
        if (round.captain_bonus_club && dataObj[round.captain_bonus_club]) {
            dataObj[round.captain_bonus_club].bonus += 3;
        }
    });

    return calculateStandings(Object.values(dataObj));
}

function calculateStandings(teams) {
    let results = teams.map(team => {
        const basePts = (team.r1 * 15) + (team.r2 * 10) + (team.r3 * 6) + (team.r4 * 2) + (team.r5 * 0) + (team.r6 * 0);
        const totalPts = basePts + team.bonus;
        const matches = team.r1 + team.r2 + team.r3 + team.r4 + team.r5 + team.r6;
        const avg = matches > 0 ? (totalPts / matches) : 0;
        
        return { ...team, mp: matches, total: totalPts, avg: avg.toFixed(2) };
    });

    // Sort by average points descending
    results.sort((a, b) => b.avg - a.avg);

    // Calculate Records
    let mostWins = -1, winnerName = "-";
    let mostPodiums = -1, podiumName = "-";
    let mostLast = -1, lastName = "-";

    results.forEach(t => {
        let podiums = t.r1 + t.r2 + t.r3;
        let lastPlaces = t.r5 + t.r6;

        if (t.r1 > mostWins) { mostWins = t.r1; winnerName = `${t.name} (${t.r1})`; }
        if (podiums > mostPodiums) { mostPodiums = podiums; podiumName = `${t.name} (${podiums})`; }
        if (lastPlaces > mostLast) { mostLast = lastPlaces; lastName = `${t.name} (${lastPlaces})`; }
    });

    document.getElementById("rec-wins").innerText = winnerName;
    document.getElementById("rec-podiums").innerText = podiumName;
    document.getElementById("rec-last").innerText = lastName;

    return results;
}

function renderDashboard(data, round) {
    document.getElementById("round-indicator").innerText = `Reporting Data up to Round ${round}`;

    const tbody = document.getElementById("table-body");
    tbody.innerHTML = "";
    
    data.forEach((team, index) => {
        const tr = document.createElement("tr");
        let rankMedal = index + 1;
        if (index === 0) rankMedal = "1";
        if (index === 1) rankMedal = "2";
        if (index === 2) rankMedal = "3";

        tr.innerHTML = `
            <td><strong>${rankMedal}</strong></td>
            <td>${team.name}</td>
            <td>${team.mp}</td>
            <td>${team.r1}</td>
            <td>${team.r2}</td>
            <td>${team.r3}</td>
            <td>${team.bonus > 0 ? '+'+team.bonus : team.bonus}</td>
            <td><strong>${team.avg}</strong></td>
            <td>${team.total}</td>
        `;
        tbody.appendChild(tr);
    });

    // Render Streaks
    const streakDiv = document.getElementById("streak-container");
    streakDiv.innerHTML = "";
    let hasStreaks = false;

    data.forEach(team => {
        if (team.currentWinStreak > 0 || team.currentPodiumStreak > 0 || team.currentLastStreak > 0) {
            hasStreaks = true;
            let text = `<strong>${team.name}:</strong> `;
            if (team.currentWinStreak > 0) text += `${team.currentWinStreak}x Win Streak. `;
            if (team.currentPodiumStreak > 0) text += `${team.currentPodiumStreak}x Podium Streak. `;
            if (team.currentLastStreak > 0) text += `${team.currentLastStreak}x Last Place Slump.`;
            
            const div = document.createElement("div");
            div.className = "streak-item";
            div.innerHTML = text;
            streakDiv.appendChild(div);
        }
    });

    if (!hasStreaks) {
        streakDiv.innerHTML = '<p class="empty-state" style="font-size: 14px; color: #777;">No active streaks right now.</p>';
    }
}

// Start the app
initDashboard();
