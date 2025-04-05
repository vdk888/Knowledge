# Knowledge Atlas Deployment Guide

This document provides instructions for deploying the Knowledge Atlas application.

## Prerequisites

- A Replit account
- Basic understanding of environment variables and database connections

## Required Environment Variables

The application requires the following environment variables to be set in the deployment environment:

1. `DATABASE_URL` - The PostgreSQL database connection string
   - Example format: `postgresql://username:password@hostname:port/database`
   - Required for database persistence
   - If not provided, the application will fall back to in-memory storage (data will be lost on restarts)

2. `SESSION_SECRET` - A strong random string for securing session cookies
   - Example: `knowledgeAtlasSecretKey123!`
   - If not provided, a default (insecure) value will be used

## Setting Up a PostgreSQL Database

We recommend using [Neon](https://neon.tech) for PostgreSQL hosting:

1. Create a free account at Neon
2. Create a new project
3. Create a database named `knowledge_atlas`
4. On the connection details page, copy the connection string
5. Add the connection string as the `DATABASE_URL` environment variable in your Replit deployment

## Deployment Steps

1. Navigate to the Replit deployment page
2. Add the required environment variables:
   - Click on "⚙️ Show environment secrets"
   - Add `DATABASE_URL` with your PostgreSQL connection string
   - Add `SESSION_SECRET` with a strong random string
3. Click "Deploy" to start the deployment process
4. Once deployed, your application will be available at the assigned URL

## Troubleshooting

If you encounter deployment issues:

1. Check that the `DATABASE_URL` environment variable is correctly formatted
2. Verify that your PostgreSQL database is accessible from Replit
3. Check the deployment logs for specific error messages
4. If database issues persist, the application will automatically fall back to in-memory storage