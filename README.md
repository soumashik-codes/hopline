# Hopline

An accessible journey planner for London. An early-stage project exploring how journey planning could work better for disabled travellers.

> **Status:** early prototype. Line status uses live TfL data; search, routes and nearby departures still use sample data.

## Why I'm building this

In most journey planners, accessibility is a filter you switch on. I want to find out whether planning the whole journey around a person's access needs, and keeping an eye on things like lift outages while they travel, makes travel less stressful.

## What's built so far

- Journey planning with routes compared by speed, cost, changes and step-free access
- The stops in between on each leg
- A step-by-step journey mode that counts down the stops until you get off
- Line status, saved trips and home/work shortcuts

## What's next

Before building more features, I'm speaking to disabled travellers to understand where existing apps (including TfL Go and Citymapper) fall short. What I build next will depend on what I learn.

## Accessibility approach

Hopline aims for WCAG 2.2 AA: full keyboard and screen-reader support, good colour contrast, large tap targets, and never using colour alone to carry meaning.

## Product decisions

Key decisions and the reasoning behind them are in [docs/decisions.md](docs/decisions.md).

## How it's built

Next.js, TypeScript and the TfL Unified API. I'm building Hopline using AI-assisted development with Claude Code. I own the product side (the problem, users, requirements, scope and priorities) and direct the build.

## Running it locally

1. Clone the repo and run `npm install`
2. Copy `.env.example` to `.env.local` and add a free TfL API key from api-portal.tfl.gov.uk
3. Run `npm run dev` and open http://localhost:3000