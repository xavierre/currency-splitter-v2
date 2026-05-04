# Dynamis Currency Distributor

A Final Fantasy XI tool for managing and distributing ancient currency (Dynamis coins) among party members.

## Overview

Dynamis Distributor helps FFXI players calculate fair distribution of ancient currencies earned from Dynamis events. The tool handles entry fees, relic sales, player management, and generates shareable summaries for Discord.

This project includes both a live distribution calculator and an analytics dashboard that stores recent runs, shows top players, zone statistics, and lottery results.

## Features

- **Multi-Zone Support**: Track currency for all Dynamis zones (Bastok, San d'Oria, Windurst, Jeuno, Beaucedine, Xarcabard, Valkurm, Buburimu, Qufim, Tavnazian)
- **Entry Fee Calculation**: Automatically calculates entry fees based on player count and relic sales
- **Relic Sales Tracking**: Add sold relic drops to reduce the effective fee
- **Player Management**: Add and manage party members and guests
- **Currency Distribution**: Calculate fair per-player currency distribution
- **Leftover Lottery**: Randomly distribute remaining currency pieces among selected players
- **Discord Export**: Generate copyable Discord summary text for run results
- **Run History**: Save runs locally and optionally persist them to Supabase when logged in
- **Analytics Dashboard**: Review recent runs, see top active players, top zones, and average currency by type
- **Lottery Result Display**: Saved runs include lottery winners in analytics view
- **Run Deletion**: Remove saved runs from the history

## Usage

1. Open `index.html` in your browser
2. Select a Dynamis region (Original or Dreamlands)
3. Choose the zone from the instance bar
4. Add party members and guest players
5. Enter relic sales and currency drops (singles + 100s)
6. Click "Calculate Distribution" to see the per-player split
7. Use "Draw Winners" to allocate leftover currency via lottery
8. Copy the Discord summary or save the run
9. Open `dashboard.html` to view analytics and recent saved runs

## Project Structure

- `index.html` — main distribution calculator UI
- `dashboard.html` — analytics dashboard for saved runs
- `script.js` — calculator logic, distribution and lottery handling
- `db.js` — Supabase database integration and analytics helpers
- `auth.js` — authentication support for Supabase-backed persistence
- `styles.css` — shared UI styling

## Tech Stack

- HTML5, CSS3, Vanilla JavaScript
- Supabase (optional) for authenticated run storage and analytics
- LocalStorage fallback for offline run history
- Google Fonts: DM Sans, DM Mono

## Notes

- To persist runs to the database, log in via the authentication flow first
- Lottery results are saved and displayed in analytics when the run is stored after drawing winners

## License

Free for personal use.