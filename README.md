# sorare-world-cup

This is a mobile-friendly analytics dashboard and automated data input terminal created for a 40-round 5-a-side Sorare football tournament. The application removes the need for manual code updates by using a serverless cloud database backend, which processes daily raw scores, evaluates tournament standings in real-time, and provides insights on performance.

---

## The Championship Scoring Engine

To keep the competition exciting throughout the tournament, this league uses a grading system inspired by Formula 1. Positions are evaluated automatically based on the daily raw scores entered through the admin panel:

* 1st Place: 15 Points
* 2nd Place: 10 Points
* 3rd Place: 6 Points
* 4th Place: 2 Points
* 5th Place: 0 Points

### The Ranking Philosophy

Instead of adding up points like standard tournaments, this terminal determines rankings based solely on Average Points per Round. 
* Formula: Average Points = Total Points / Rounds Played

This approach rewards efficiency and encourages strategic winning. It also adjusts the standings based on the number of matchdays managers have participated in.

---

## Main Systems & Visual Features

* Cyber Stadium Theme: A high-contrast "Pitch Black & Neon Turf" user interface with responsive glassmorphic card containers, bright glowing borders, and smooth hover effects.
* Mobile-First Blueprint: An adaptive design with fluid flex-wrapping and swipe-friendly navigation, perfectly suited for smartphone use.
* Interactive Scouting Dossier: Live DOM element manipulation lets users click or tap any club row to instantly gather win conversion rates, podium indices, and tactical traits in the sidebar.
* Milestone Breakout Matrix: Tracks significant achievements in individual gameweeks, focusing on the 300+, 350+, and 400+ point levels.
* Tactical Derby Radar: Measures real-time calculations to highlight gaps between title contenders and mid-table teams.

---

## Tech Stack & Architecture

* Frontend: Semantic HTML5, CSS3 Grid/Flexbox layouts, Vanilla JavaScript ES6+ (Async/Await engine).
* Backend Database: Supabase (PostgreSQL relational cloud database connecting through direct REST API).
* Hosting Engine: Netlify (Continuous integration pipeline connected to GitHub repository branches).
