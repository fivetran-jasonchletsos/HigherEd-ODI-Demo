# Cascade University, ODI Demo

A reference build of Fivetran's Open Data Infrastructure for the higher-education industry.

**Live demo:** https://fivetran-jasonchletsos.github.io/HigherEd-ODI-Demo/

## The institution

Cascade University is a fictional private research university in the Pacific Northwest:

- 24,000 students, 18K undergraduate and 6K graduate
- R1 research classification
- $1.4B annual operating budget
- $2.8B endowment
- 220,000 living alumni

## The audience

- **CIO:** owns the integration architecture across Banner, Workday, Salesforce, Canvas, Slate, and Cayuse
- **VP of Enrollment Management:** owns the application funnel, yield, melt, and tuition discount rate

## Architecture

Six systems of record, lake-centric.

1. **Sources:** Banner SIS (Ellucian), Workday HCM + Financials, Salesforce Education Cloud, Canvas LMS, Slate, Cayuse Research IS
2. **Ingest:** Fivetran connectors land bronze Iceberg tables on S3, governed by Snowflake Polaris
3. **Conform:** dbt builds silver, one student, one course, one gift, one grant
4. **Serve:** Gold marts powering CIO and VP dashboards through Snowflake
5. **Reason:** dbt-wizard run-time agents for yield prediction, advising outreach, donor capacity scoring. Humans and agents read the same gold layer

## Run locally

```bash
cd cascade-app/frontend
npm ci
npm run dev
```

Visit http://localhost:5173/HigherEd-ODI-Demo/.

## Deploy

GitHub Actions builds `cascade-app/frontend` and publishes to GitHub Pages on every push to `main` that touches `cascade-app/**`.

## Synthetic data

All data shown is synthetic and presented for ODI architecture demonstration only. No portion of this site represents an actual student, employee, donor, or research project.
