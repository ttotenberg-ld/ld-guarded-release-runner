# LaunchDarkly Guarded Release Runner

A web application to simulate and send metric events to LaunchDarkly flags for Release Guardian.

## Features

- Web UI built with React and Material-UI
- FastAPI backend for efficient API processing
- Real-time event logging with WebSockets
- Configurable metrics simulation for latency, errors, and business conversions
- **Configurable flag evaluation rate** - Control the rate of flag evaluations from 0.1 to 100 per second
- Automatic detection of guarded rollouts
- **Supports all flag types** - Works with boolean flags, multivariate flags, and AI configs - automatically identifies control and treatment variations
- Configuration via UI with local storage persistence
- **One-click LaunchDarkly resource creation** - Easily create flag and metrics in LaunchDarkly

## What does it do?

It sends metric events to a LaunchDarkly flag (boolean, multivariate, or AI config) to be measured in Release Guardian. The simulator automatically identifies control and treatment variations from your experiment's baseline configuration. With the default setup, the treatment variation will over time show regressions in `latency` and increases in `error-rate`, along with improvements in `purchase-completion` metrics. Release Guardian will detect these changes and take the action you define during setup.

## Prerequisites

- Python 3.8+
- Node.js 14+
- npm or yarn
- LaunchDarkly account with:
  - Server-side SDK Key
  - API Key with write permissions to flags and metrics
  - A project where you want to set up guarded releases

## Getting Started

### Backend Setup

1. Navigate to the backend directory:
   ```
   cd backend
   ```

2. Install the backend dependencies (from the backend directory):
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

2. Install the frontend dependencies:
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
- **API Key** - LaunchDarkly API Key with write permissions to flags and metrics
- **Project Key** - Project where the flag exists
- **Flag Key** - Flag key to evaluate and send events to (supports boolean, multivariate, and AI config flags)

### Traffic Configuration
- **Evaluations Per Second** - Rate of flag evaluations (min: 0.1, max: 100, default: 20.0)

### Error Metric Configuration
- **Error Metric Name** - Default is "error-rate"
- **Control Conversion Rate** - Percentage of time error metric triggers for control
- **Treatment Conversion Rate** - Percentage of time error metric triggers for treatment

### Latency Configuration
- **Latency Metric Name** - Default is "latency"
- **Control Range** - Min, Max values for the latency metric for control
- **Treatment Range** - Min, Max values for the latency metric for treatment

### Business Conversion Configuration
- **Business Metric Name** - Default is "purchase-completion"
- **Control Conversion Rate** - Percentage of time business metric triggers for control
- **Treatment Conversion Rate** - Percentage of time business metric triggers for treatment

## How to Use

1. Enter your LaunchDarkly credentials and configuration in the web UI
2. Configure your metrics for error rate, latency, and business conversions
3. Adjust the evaluation rate to control how frequently flag evaluations occur
4. (Optional) Click "Create LaunchDarkly Resources" to automatically create the flag and enabled metrics in LaunchDarkly
5. Click "Save & Start Simulation" in the Controls pane to save your configuration and begin sending events
6. View the status panel in the center to monitor the simulation and statistics
7. Watch the real-time event log on the right side of the interface
8. Click "Stop Simulation" when finished

## Resource Creation

The new **Create LaunchDarkly Resources** feature automatically creates the following resources in LaunchDarkly:

1. **Boolean Flag** - Creates a flag with the key you specified, with two variations: true (treatment) and false (control)
2. **Error Metric** - Creates an occurrence metric where lower is better, using the error metric name you specified (only if enabled)
3. **Latency Metric** - Creates a numeric average metric where lower is better, using the latency metric name you specified (only if enabled)
4. **Conversion Metric** - Creates an occurrence metric where higher is better, using the business metric name you specified (only if enabled)

All resources will be created with appropriate configurations for use with LaunchDarkly's Release Guardian feature. The resources will be tagged with "guarded-rollout-runner" for easy identification in the LaunchDarkly dashboard.

**Note:** While the automatic resource creation generates boolean flags, the simulation tool works with any flag type - boolean, multivariate, or AI configs. The simulator automatically detects the baseline (control) variation from your experiment configuration, ensuring accurate tracking regardless of flag type, number of variations, or variation indices used.

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