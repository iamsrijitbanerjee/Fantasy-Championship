/**
 * ==========================================================
 * CYBER CHAMPIONSHIP ENGINE - v3.0 Final Build
 * ==========================================================
 * Handles Supabase data fetching, dynamic 5/6-man grading algorithms, 
 * streak generation, and FUT card DOM manipulations.
 * * Do not alter the core arrays unless starting a new season.
 */

const SUPABASE_URL = "https://qtthaelgzxswjhbccrgi.supabase.co"; 
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0dGhhZWxnenhzd2poYmNjcmdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5MjM1NDIsImV4cCI6MjA5ODQ5OTU0Mn0.4STLAIEEqmUOglGAsBp7rklU5udTpfZCyLtf9pr5aDg";              

// The pre-calculated state up to Round 29 to prevent excessive DB queries.
// Only rounds >29 will be pulled from Supabase to layer on top of this.
const coreHistoricalBaseline = [
    { id: "srijit", name: "Srijit FC", r1: 10, r2: 9, r3: 2, r4: 4, r5: 2, r6: 0, m300: 23, m350: 8, m400: 0, bonus: 0, text: "Official Champion. Leveraged high-win conversions and consistent tactical pace to seal the title.", currentWinStreak: 1, currentPodiumStreak: 2, currentLastStreak: 0, lastScores: [342, 311, 300] },
    { id: "bitansh", name: "Bitansh FC", r1: 7, r2: 9, r3: 6, r4: 3, r5: 3, r6: 0, m300: 18, m350: 7, m400: 1, bonus: 0, text: "Official Runner Up. Holder of the highest single-round score (424 Pts).", currentWinStreak: 0, currentPodiumStreak: 0, currentLastStreak: 0, lastScores: [290, 315, 245] },
    { id: "sandy", name: "Sandy FC", r1: 6, r2: 3, r3: 8, r4: 7, r5: 3, r6: 0, m300: 13, m350: 6, m400: 1, bonus: 0, text: "Official 2nd Runner Up. Solid midfield engine and high podium finish density.", currentWinStreak: 0, currentPodiumStreak: 0, currentLastStreak: 2, lastScores: [220, 240, 222] },
    { id: "debarshi", name: "Debarshi FC", r1: 4, r2: 5, r3: 8, r4: 10, r5: 1, r6: 0, m300: 14, m350: 3, m400: 1, bonus: 3, text: "High variance danger asset with a 415 ceiling and low bottom-tier exposure.", currentWinStreak: 0, currentPodiumStreak: 1, currentLastStreak: 0, lastScores: [280, 260, 263] },
    { id: "soumik", name: "Soumik FC", r1: 1, r2: 2, r3: 4, r4: 2, r5: 4, r6: 0, m300: 6, m350: 0, m400: 0, bonus: 0, text: "Resilient manager with solid captain bonus unlocks throughout the campaign.", currentWinStreak: 0, currentPodiumStreak: 2, currentLastStreak: 0, lastScores: [210, 255, 280] },
    { id: "arkadeep", name: "Arkadeep FC", r1: 0, r2: 0, r3: 0, r4: 0, r5: 0, r6: 0, m300: 0, m350: 0, m400: 0, bonus: 3, text: "Expansion franchise preparing metrics for future campaigns.", currentWinStreak: 0, currentPodiumStreak: 0, currentLastStreak: 0, lastScores: [0, 0, 0] }
];

let compiledStandings = [];

async function runChampionshipEngine() {
    let processedCollection = [];

    // Failsafe: if URL isn't configured, boot offline mode
    if (SUPABASE_URL.includes("your-project-id")) {
        processedCollection = evaluateStandingsData(coreHistoricalBaseline);
        updateDashboardLayout(processedCollection, 35);
    } else {
        try {
            const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
            let { data: matchdays, error } = await supabaseClient.from('matchdays').select('*').order('round_number', { ascending: true });
            
            if (error || !matchdays || matchdays.length === 0) {
                document.getElementById("syncIndicator").innerText = "Status: Final Standings Locked";
                document.getElementById("syncIndicator").style.color = "var(--gold)";
                processedCollection = evaluateStandingsData(coreHistoricalBaseline);
                updateDashboardLayout(processedCollection, 35);
            } else {
                document.getElementById("syncIndicator").innerText = "Sync Status: Cyber Cloud Synced";
                document.getElementById("syncIndicator").style.color = "var(--turf-green)";
                
                const maxRoundNum = Math.max(...matchdays.map(r => r.round_number || 0)) + 29;
                processedCollection = parseAndInjectCloudRecords(matchdays);
                updateDashboardLayout(processedCollection, maxRoundNum);
                
                // Quote engine puller
                const lastWithQuote = [...matchdays].reverse().find(r => r.winner_quote);
                if (lastWithQuote) {
                    document.getElementById("winnerQuoteField").innerText = `"${lastWithQuote.winner_quote}" — Srijit FC (Champion)`;
                }
            }
        } catch(err) {
            console.error("DB Fetch Error - Falling back to local cache", err);
            processedCollection = evaluateStandingsData(coreHistoricalBaseline);
            updateDashboardLayout(processedCollection, 35);
        }
    }
}

function parseAndInjectCloudRecords(rows) {
    const workingRegistry = {};
    
    // Deep copy baseline to avoid mutating constants
    coreHistoricalBaseline.forEach(c => {
        workingRegistry[c.id] = { ...c, lastScores: [...c.lastScores] };
    });

    // Tracking active consecutive streaks
    const streakTracker = {
        srijit: { win: workingRegistry.srijit.currentWinStreak, podium: workingRegistry.srijit.currentPodiumStreak, last: workingRegistry.srijit.currentLastStreak },
        bitansh: { win: workingRegistry.bitansh.currentWinStreak, podium: workingRegistry.bitansh.currentPodiumStreak, last: workingRegistry.bitansh.currentLastStreak },
        debarshi: { win: workingRegistry.debarshi.currentWinStreak, podium: workingRegistry.debarshi.currentPodiumStreak, last: workingRegistry.debarshi.currentLastStreak },
        sandy: { win: workingRegistry.sandy.currentWinStreak, podium: workingRegistry.sandy.currentPodiumStreak, last: workingRegistry.sandy.currentLastStreak },
        soumik: { win: workingRegistry.soumik.currentWinStreak, podium: workingRegistry.soumik.currentPodiumStreak, last: workingRegistry.soumik.currentLastStreak },
        arkadeep: { win: workingRegistry.arkadeep.currentWinStreak, podium: workingRegistry.arkadeep.currentPodiumStreak, last: workingRegistry.arkadeep.currentLastStreak }
    };

    rows.forEach(round => {
        const dayScoresRaw = [
            { id: "srijit", score: round.srijit_score },
            { id: "bitansh", score: round.bitansh_score },
            { id: "debarshi", score: round.debarshi_score },
            { id: "sandy", score: round.sandy_score },
            { id: "soumik", score: round.soumik_score },
            { id: "arkadeep", score: round.arkadeep_score }
        ];

        // Filter out ghost players for dynamic scaling (5 vs 6 ruleset)
        const dayScores = dayScoresRaw.filter(x => x.score !== null && x.score !== undefined);
        const participantCount = dayScores.length;

        dayScores.forEach(obj => {
            if (obj.score >= 400) workingRegistry[obj.id].m400++;
            if (obj.score >= 350) workingRegistry[obj.id].m350++;
            if (obj.score >= 300) workingRegistry[obj.id].m300++;
            
            workingRegistry[obj.id].lastScores.push(obj.score);
            if (workingRegistry[obj.id].lastScores.length > 3) {
                workingRegistry[obj.id].lastScores.shift();
            }
        });

        dayScores.sort((a,b) => b.score - a.score);
        
        // Distribution logic based on lobby size
        if (participantCount <= 5) {
            dayScores.forEach((team, idx) => {
                if (idx === 0) workingRegistry[team.id].r1++;
                if (idx === 1) workingRegistry[team.id].r2++;
                if (idx === 2) workingRegistry[team.id].r3++;
                if (idx === 3) workingRegistry[team.id].r4++;
                if (idx === 4) workingRegistry[team.id].r5++;
            });
        } else if (participantCount === 6) {
            dayScores.forEach((team, idx) => {
                if (idx === 0) workingRegistry[team.id].r1++;
                if (idx === 1) workingRegistry[team.id].r2++;
                if (idx === 2) workingRegistry[team.id].r3++;
                if (idx === 3) workingRegistry[team.id].r4++;
                if (idx === 4) workingRegistry[team.id].r5++;
                if (idx === 5) workingRegistry[team.id].r6++;
            });
        }

        Object.keys(streakTracker).forEach(id => {
            const hasPlayed = dayScores.some(x => x.id === id);
            if (!hasPlayed) return;

            const dailyRank = dayScores.findIndex(x => x.id === id) + 1;
            
            // Win streak math
            if (dailyRank === 1) {
                streakTracker[id].win++;
                if (streakTracker[id].win === 3) {
                    workingRegistry[id].bonus += 15;
                    streakTracker[id].win = 0;
                }
            } else { streakTracker[id].win = 0; }

            // Podium streak math
            if (dailyRank <= 3) {
                streakTracker[id].podium++;
                if (streakTracker[id].podium === 3) {
                    workingRegistry[id].bonus += 7;
                    streakTracker[id].podium = 0;
                }
            } else { streakTracker[id].podium = 0; }

            // Slump math
            if (dailyRank === participantCount) {
                streakTracker[id].last++;
                if (streakTracker[id].last === 3) {
                    workingRegistry[id].bonus -= 5;
                    streakTracker[id].last = 0;
                }
            } else { streakTracker[id].last = 0; }

            workingRegistry[id].currentWinStreak = streakTracker[id].win;
            workingRegistry[id].currentPodiumStreak = streakTracker[id].podium;
            workingRegistry[id].currentLastStreak = streakTracker[id].last;
        });

        // Captain bonus applicator
        if (round.captain_bonus_club && workingRegistry[round.captain_bonus_club]) {
            workingRegistry[round.captain_bonus_club].bonus += 3;
        }
    });

    return evaluateStandingsData(Object.values(workingRegistry));
}

function evaluateStandingsData(clubs) {
    let parsed = clubs.map(club => {
        const standardBasePoints = (club.r1 * 15) + (club.r2 * 10) + (club.r3 * 6) + (club.r4 * 2) + (club.r5 * 0) + (club.r6 * 0);
        const finalTotalPoints = standardBasePoints + club.bonus;
        const matchesPlayed = club.r1 + club.r2 + club.r3 + club.r4 + club.r5 + club.r6;
        const averagePoints = matchesPlayed > 0 ? (finalTotalPoints / matchesPlayed) : 0;
        
        const winPctNumeric = matchesPlayed > 0 ? ((club.r1 / matchesPlayed) * 100).toFixed(0) : 0;
        const podiumPctNumeric = matchesPlayed > 0 ? (((club.r1 + club.r2 + club.r3) / matchesPlayed) * 100).toFixed(0) : 0;

        const lastPlacementsCount = club.r5 + club.r6;
        const consistencyRating = matchesPlayed > 0 ? (((matchesPlayed - lastPlacementsCount) / matchesPlayed) * 100).toFixed(0) : 0;

        const sumScores = club.lastScores.reduce((sum, val) => sum + val, 0);
        const avgFormScore = club.lastScores.length > 0 ? (sumScores / club.lastScores.length) : 0;
        const formRating = Math.min(Math.max(Math.round((avgFormScore / 400) * 100), 10), 99);
        const visionRating = Math.min(Math.max(Math.round(50 + (club.bonus * 2)), 10), 99);

        return {
            ...club,
            mp: matchesPlayed,
            total: finalTotalPoints,
            avg: averagePoints.toFixed(2),
            winPct: parseInt(winPctNumeric),
            podiumPct: parseInt(podiumPctNumeric),
            conRating: parseInt(consistencyRating),
            frmRating: formRating,
            visRating: visionRating
        };
    }).sort((a, b) => b.avg - a.avg);

    // Records calculator
    let highest1sts = -1, serialWinner = "-";
    let highestPodiums = -1, podiumKing = "-";
    let highestFourths = -1, escapeArtist = "-";
    let highestGutter = -1, bottomDanger = "-";

    parsed.forEach(c => {
        let podiumsCount = c.r1 + c.r2 + c.r3;
        let gutterCombined = c.r5 + c.r6; 

        if(c.r1 > highest1sts) { highest1sts = c.r1; serialWinner = `${c.name} (${c.r1})`; }
        if(podiumsCount > highestPodiums) { highestPodiums = podiumsCount; podiumKing = `${c.name} (${podiumsCount})`; }
        if(c.r4 > highestFourths) { highestFourths = c.r4; escapeArtist = `${c.name} (${c.r4})`; }
        if(gutterCombined > highestGutter) { highestGutter = gutterCombined; bottomDanger = `${c.name} (${gutterCombined})`; }
    });
    
    document.getElementById("serialWinnerField").innerText = serialWinner;
    document.getElementById("highestPodiumsField").innerText = podiumKing;
    document.getElementById("escapeArtistField").innerText = escapeArtist;
    document.getElementById("bottomContainmentField").innerText = bottomDanger;

    return parsed;
}

function updateDashboardLayout(data, globalRound) {
    compiledStandings = data;
    
    document.getElementById("latestGlobalRound").innerText = `Global Camp: Final Standings (${globalRound} Rounds)`;

    const tableContainer = document.getElementById("leagueRows");
    tableContainer.innerHTML = "";
    
    data.forEach((club, index) => {
        const tr = document.createElement("tr");
        tr.className = "interactive-row";
        tr.setAttribute("onclick", `activateScoutSpotlight('${club.id}', this, ${index + 1})`);
        
        let titleBadge = "";
        if (index === 0) titleBadge = " 👑 <small style='color:var(--gold); font-weight:800;'>(CHAMPION)</small>";
        else if (index === 1) titleBadge = " 🥈 <small style='color:var(--silver); font-weight:800;'>(RUNNER UP)</small>";
        else if (index === 2) titleBadge = " 🥉 <small style='color:var(--bronze); font-weight:800;'>(2ND RUNNER UP)</small>";

        tr.innerHTML = `
            <td class="text-center"><span class="rank-box">${index + 1}</span></td>
            <td class="club-title">${club.name}${titleBadge}</td>
            <td class="text-center" style="font-weight: 600; color: var(--text-dim);">${club.mp}</td>
            <td class="text-center">${club.r1}</td>
            <td class="text-center">${club.r2}</td>
            <td class="text-center">${club.r3}</td>
            <td class="text-center">${club.r4}</td>
            <td class="text-center">${club.r5}</td>
            <td class="text-center ${club.r6 > 0 ? 'clr-danger' : ''}">${club.r6}</td>
            <td class="text-center"><span class="bonus-badge">${club.bonus >= 0 ? '+' : ''}${club.bonus}</span></td>
            <td class="text-center"><span class="score-badge">${club.avg}</span></td>
            <td class="text-right" style="font-weight: 800; color: var(--text-light); font-family: 'Rajdhani'; font-size:1.15rem;">${club.total}</td>
        `;
        tableContainer.appendChild(tr);
    });

    const streakWrapper = document.getElementById("streakWatchoutContainer");
    streakWrapper.innerHTML = "";
    
    data.forEach(club => {
        if (club.currentWinStreak > 0 || club.currentPodiumStreak > 0 || club.currentLastStreak > 0) {
            const row = document.createElement("div");
            row.className = "streak-row-item";
            
            let pillsHtml = "";
            if (club.currentWinStreak > 0) {
                pillsHtml += `<span class="streak-pill-item streak-win">${club.currentWinStreak}x Win Streak</span>`;
            }
            if (club.currentPodiumStreak > 0) {
                pillsHtml += `<span class="streak-pill-item ${club.currentPodiumStreak >= 3 ? 'streak-podium blink-critical-text' : 'streak-podium'}">${club.currentPodiumStreak}x Podium Streak</span>`;
            }
            if (club.currentLastStreak > 0) {
                pillsHtml += `<span class="streak-pill-item ${club.currentLastStreak >= 2 ? 'streak-last blink-critical-text' : 'streak-last'}">${club.currentLastStreak}x Last Place Slump</span>`;
            }

            row.innerHTML = `
                <div class="streak-club-info">${club.name}</div>
                <div class="streak-pills-holder">${pillsHtml}</div>
            `;
            streakWrapper.appendChild(row);
        }
    });

    const milestoneContainer = document.getElementById("milestoneRows");
    milestoneContainer.innerHTML = "";
    data.forEach(club => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td class="club-title">${club.name}</td>
            <td class="text-center font-weight-bold" style="color:var(--text-light);">${club.m300 || '-'}</td>
            <td class="text-center font-weight-bold" style="color:var(--text-dim);">${club.m350 || '-'}</td>
            <td class="text-center ${club.m400 > 0 ? 'score-badge' : ''}" style="max-width:80px; margin:auto;">${club.m400 || '-'}</td>
            <td class="text-center">-</td>
        `;
        milestoneContainer.appendChild(tr);
    });

    const leaderDelta = (data[0].avg - data[1].avg).toFixed(2);
    const secondaryDelta = (data[1].avg - data[2].avg).toFixed(2);
    
    document.getElementById("tickerDeltas").innerText = `🏆 FINAL RESULTS: ${data[0].name} finishes 1st with ${data[0].avg} Pts/Round • Victory gap over 2nd place ${data[1].name} is ${leaderDelta} Avg Pts • Bronze threshold margin stands at ${secondaryDelta} Pts.`;

    const radarContainer = document.getElementById("radarContainer");
    radarContainer.innerHTML = `
        <div class="radar-card">
            <h3 class="clr-gold">${data[0].name} (Champion) vs ${data[1].name} (Runner Up)</h3>
            <p>Title Decider Delta: ${data[0].name} sealed the tournament by a decisive <strong>${leaderDelta} Average Points</strong> margin over ${data[1].name}.</p>
        </div>
        <div class="radar-card radar-card-alt">
            <h3 class="clr-cyan">${data[1].name} vs ${data[2].name} (2nd Runner Up)</h3>
            <p>Podium Split: 2nd and 3rd place finishes concluded within a gap of <strong>${secondaryDelta} Average Points</strong>.</p>
        </div>
    `;
}

// Simple UI View Switcher
function toggleView(tabId) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');

    ['championship-tab', 'milestone-tab', 'radar-tab'].forEach(id => {
        document.getElementById(id).classList.add('hidden-view');
    });
    document.getElementById(tabId).classList.remove('hidden-view');
}

// FUT Card Engine
function activateScoutSpotlight(clubId, elementRow, currentRank) {
    document.querySelectorAll("#leagueRows tr").forEach(r => r.classList.remove("active-row"));
    elementRow.classList.add("active-row");

    const selectedTeam = compiledStandings.find(c => c.id === clubId);
    if(selectedTeam) {
        document.getElementById("spotlightPromptText").classList.add("hidden-view");
        
        const cardContainer = document.getElementById("futCardContainer");
        const cardBody = document.getElementById("futCardBody");
        cardContainer.classList.remove("hidden-view");
        
        // Final OVR Math
        const overallRating = Math.round((selectedTeam.winPct + selectedTeam.podiumPct + selectedTeam.frmRating + selectedTeam.visRating) / 4);

        // Apply Gold Skin to Champ
        let rankEmblem = "⚽";
        if(currentRank === 1) { rankEmblem = "👑"; cardBody.className = "fut-card gold-tier"; }
        else if(currentRank === 2) { rankEmblem = "🥈"; cardBody.className = "fut-card"; }
        else if(currentRank === 3) { rankEmblem = "🥉"; cardBody.className = "fut-card"; }
        else if(currentRank === 6) { rankEmblem = "🥄"; cardBody.className = "fut-card"; }
        else { cardBody.className = "fut-card"; }

        // DOM Injection
        document.getElementById("futRankBadge").innerText = rankEmblem;
        document.getElementById("futOvr").innerText = overallRating;
        document.getElementById("futName").innerText = selectedTeam.name;
        document.getElementById("futVic").innerText = selectedTeam.winPct;
        document.getElementById("futPod").innerText = selectedTeam.podiumPct;
        document.getElementById("futFrm").innerText = selectedTeam.frmRating;
        document.getElementById("futVis").innerText = selectedTeam.visRating;
        document.getElementById("futTotalPoints").innerText = selectedTeam.total;
        document.getElementById("futMatches").innerText = selectedTeam.mp;
    }
}

// Ignite the loop
runChampionshipEngine();