# Two45 V54 — Finish Staged Fixtures First

September 30, 2026

Queue-priority fix:
- Fully staged fixtures with both baseline inputs ready are now highest priority.
- Half-staged fixtures come next.
- Untouched fixtures are opened only after staged work has been advanced.

This fixes the state-machine bug where a fixture could have both team baselines cached, then be pushed behind untouched games. The pipeline appeared busy but the completed count stopped moving.
