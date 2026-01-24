# Firext-system

## Project Overview

A fire extinguisher monitoring system that combines hardware sensors and web interface for comprehensive fire safety management.

## Technology Stack

- Database: Firebase

## System Components

### Hardware Component

- Monitors fire extinguisher weight for leak detection
- Adds new fire extinguishers to the system

### Web Component

- Displays all fire extinguishers
- Manages fire extinguisher details
- Monitors locations and expiration dates

## Database Schema

### Docks Collection

```json
{
  "id": "string",
  "name": "string",
  "location": "string",
  "weight": "number",
  "created_at": "timestamp",
  "updated_at": "timestamp",
  "expires_at": "timestamp"
}
```

## User Stories

As a user:

- I want to be able to create, edit, and delete docks
- I want to be able to see the location of the docks
- I want to be able to edit the expiration date of the dock
- I want to be able to monitor the weight changes and expires_at of the docks
- I want to be notified if a dock is too light
- I want to be notified if a dock is expired

## Screens

### Home/Dashboard Screen

Features:

- Card display of docks (Name, Location, Weight and Expiration) for monitoring, sorted by expiration date
- Weight status indicators:
  - 🟢 Green: Heavy enough
  - 🟡 Yellow: Medium weight
  - 🔴 Red: Light (indicates leak)
- Expiration status indicators:
  - 🟢 Green: Far from expiration
  - 🟡 Yellow: Near expiration
  - 🔴 Red: Expired
- Notification tab for displaying leaks and expired extinguisher alerts

### Configure Docks Screen

Features:

- List of all docks with complete details
- Search bar for finding specific docks
- CRUD operation buttons
"# firext-system" 
