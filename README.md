# Plan2Reality

**Trusted Execution Intelligence for project controls**

*Developed by Team Seekers (IIT Madras BS Degree Programme) for the Smart India Hackathon 2026*  
*Problem Statement ID: SIH26122 (Oil India Limited) - Smart Automation*

## Overview

Plan2Reality is an Intelligent Data Capture and Schedule-Linking Layer designed for Infrastructure Project Management. It serves as a real-time planning-to-execution bridge. Infrastructure projects often suffer because the baseline plan is structured, while actual execution data flows back through unstructured, disconnected formats like daily progress reports (DPRs), site diaries, and spreadsheets. 

Plan2Reality solves this by ingesting heterogeneous field inputs, converting them into structured execution events, and intelligently matching them to exact L5/L6 schedule activities using project context. 

## The Problem

Actual progress data from the field is fragmented, delayed, and inconsistently structured. Manual reconciliation is slow and error-prone, which undermines downstream performance analytics and delays critical interventions. When projects close, execution knowledge is often lost rather than captured in a structured, queryable form.

## Our Solution: The Five Phase Process

1. **Capture**: Bring in field updates. Free-text DPRs, Excel sheets, text, or voice updates are collected from site supervisors without forcing them into rigid forms.
2. **Understand**: Turn updates into structured events. The AI extracts activity, location, progress, dates, and the supporting evidence.
3. **Match & Trust**: Find the right L5/L6 activity. Semantic matching and deterministic project rules validate the update before it is accepted.
4. **Predict**: Understand the schedule impact. Trusted progress updates reveal delays, critical path impacts, and revised completion dates.
5. **Recover & Learn**: Decide what to do next. Compare recovery options and store outcomes to build reusable execution knowledge for future projects.

## Core Prototype Features

This repository contains the interactive frontend prototype demonstrating the Match & Trust pipeline. 

* **Planner Console**: A comprehensive dashboard offering a trusted, traceable view of project execution. It shows the baseline versus forecast completion, the critical path impact, and actionable recovery options.
* **Review Queue**: A dedicated workspace for planners to review uncertain or unmatched field updates. Planners can review confidence scores, accept, reject, or reassign updates to the correct activity.
* **Evidence View**: A transparent audit trail for every matched update. It displays the exact text excerpt that triggered the update, a breakdown of semantic similarity and context checks (WBS, location, timing, dependencies), and a full approval history.

## Technical Stack

* **Framework**: Next.js 16 (App Router)
* **Language**: TypeScript
* **Styling**: Tailwind CSS v4
* **Testing**: Vitest and React Testing Library

## Project Architecture

This repository is built as a highly modular frontend prototype. Currently, there is no live backend or authentication. All data flows through a simulated data access layer (`lib/api/`), which asynchronously resolves static fixtures from `lib/mock-data/`. 

This design ensures that when the real Python/FastAPI backend is integrated, the component code will not need to change. The API contract is strictly defined in `lib/types.ts`.

## Getting Started

Follow these steps to run the project locally.

### Prerequisites

* Node.js 18.x or higher
* npm (or yarn/pnpm)

### Installation

Clone the repository and install the dependencies:

```bash
git clone https://github.com/dakshverma-dev/SIH-2026.git
cd SIH-2026
npm install
```

### Running the Development Server

Start the local development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to view the Landing Page.

### Running Tests

The project includes a comprehensive suite of tests verifying the mock data integrity, API access layer, and UI components. To run the tests:

```bash
npm test
```

## Team Seekers

* **Daksh Verma**: Team Lead, AI and Product Engineer
* **Preethy Parthasarathy**: Domain and Evaluation
* **Yash Jindal**: Research and Presentation
* **Vignesh Reddy Tadasina**: Backend and Security
* **Kartik Chilkoti**: Full Stack and Testing
* **Chetna Nagar**: Data and Gen AI
