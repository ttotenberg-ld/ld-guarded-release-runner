# LaunchDarkly Guarded Release Runner

A web application to simulate and send metric events to LaunchDarkly flags for Release Guardian.

## Features

- Web UI built with React and Material-UI
- FastAPI backend for efficient API processing
- Real-time event logging with WebSockets
- Configurable metrics simulation for latency, errors, and business conversions
- Automatic detection of guarded rollouts
- Configuration via UI with local storage persistence

## What does it do?

It sends metric events to a LaunchDarkly flag to be measured in Release Guardian. With the default setup, the flag serving the treatment variation will over time show regressions in `latency` and increases in `error-rate`, along with improvements in `conversion` metrics. Release Guardian will detect these changes and take the action you define during setup.

## Prerequisites

- Python 3.8+
- Node.js 14+
- npm or yarn
- LaunchDarkly account with:
  - Server-side SDK Key
  - API Key with read permissions to flags
  - A project with a flag set up for Release Guardian

## Getting Started

### Backend Setup

1. Navigate to the backend directory:
   ```
   cd backend
   ```

2. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

3. Run the FastAPI server:
   ```
   python run.py
   ```

   The API will be available at http://localhost:8000.

### Frontend Setup

1. Navigate to the frontend directory:
   ```
   cd frontend
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the development server:
   ```
   npm start
   ```

   The UI will be available at http://localhost:3000.

## Configuration

All configuration parameters can be set directly through the web UI. The configuration is stored in your browser's localStorage to persist between sessions.

The following parameters can be configured:

### LaunchDarkly Connection
- **SDK Key** - LaunchDarkly server-side SDK Key (secret)
- **API Key** - LaunchDarkly API Key with read permissions to flags
- **Project Key** - Project where the flag exists
- **Flag Key** - Flag key to evaluate and send events to

### Error Metric Configuration
- **Error Metric Name** - Default is "error-rate"
- **Control Conversion Rate** - Percentage of time error metric triggers for control
- **Treatment Conversion Rate** - Percentage of time error metric triggers for treatment

### Latency Configuration
- **Latency Metric Name** - Default is "latency"
- **Control Range** - Min, Max values for the latency metric for control
- **Treatment Range** - Min, Max values for the latency metric for treatment

### Business Conversion Configuration
- **Business Metric Name** - Default is "conversion"
- **Control Conversion Rate** - Percentage of time business metric triggers for control
- **Treatment Conversion Rate** - Percentage of time business metric triggers for treatment

## How to Use

1. Enter your LaunchDarkly credentials and configuration in the web UI
2. Configure your metrics for error rate, latency, and business conversions
3. Click "Start Simulation" to begin sending events
4. The event log will show real-time updates of events being sent
5. View the status panel to monitor the simulation
6. Click "Stop Simulation" when finished

## Deployment

### Backend Deployment

The FastAPI backend can be deployed to Heroku, AWS, or any platform that supports Python applications.

Example Heroku deployment:
```
cd backend
heroku create ld-guardian-api
git push heroku main
```

### Frontend Deployment

The React frontend can be deployed to GitHub Pages, Netlify, Vercel, or any static site hosting service.

Example GitHub Pages deployment:
```
cd frontend
npm run build
npm install -g gh-pages
gh-pages -d build
```

## Development

### Backend Development

- API documentation is available at http://localhost:8000/docs when running locally
- Tests can be added in the `backend/tests` directory

### Frontend Development

- Component tests can be added using Jest and React Testing Library
- Modify the theme in `src/index.js` to customize the UI appearance

## License

This project is open-source software.