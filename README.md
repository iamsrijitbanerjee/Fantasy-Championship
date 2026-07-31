# Fantasy Championship

A custom leaderboard and tracking dashboard built for my friend group's private Sorare 5-a-side tournament. 

We needed a way to track our weekly scores that wasn't just a messy spreadsheet, especially since we have custom rules for streaks and dynamic point allocations depending on if 5 or 6 people play in a given gameweek.

## Features
* **Dynamic Points System:** Automatically scales the Formula 1-style points distribution (15, 10, 6, 4, 0) depending on weekly participation.
* **Streak Tracking:** Monitors 3-week win streaks, podium streaks, and last-place slumps.
* **Captain Bonus:** Awards +3 points to the manager whose captain performed the best that week.
* **Admin Portal:** A simple hidden form to submit weekly scores from a phone directly to the database.

## Tech Stack
* **Frontend:** HTML5, CSS3, Vanilla JavaScript (No frameworks)
* **Backend/Database:** Supabase
* **Hosting:** Netlify

## Setup Instructions
If you want to fork this for your own league:
1. Set up a Supabase project and create a table named `matchdays`.
2. Add columns for `round_number` (int), `captain_bonus_club` (text), and int columns for each manager's score.
3. Add your Supabase URL and Anon Key to the constants at the top of the `script.js` and `admin.html` files.
4. Deploy the folder to Netlify or GitHub Pages.
