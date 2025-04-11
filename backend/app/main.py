from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, HTTPException, status, BackgroundTasks, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Any, Optional, Set
import asyncio
import json
import os
from starlette.middleware.base import BaseHTTPMiddleware

from app.models import LDConfig, SimulationStatus
from app.simulation import (
    start_simulation, stop_simulation, get_simulation_status,
    connected_websockets, send_status_to_clients, send_log_to_clients
)
from app.api import router as ld_api_router

# Initialize FastAPI app
app = FastAPI(
    title="LaunchDarkly Guarded Release Runner",
    description="A web application to simulate and send metric events to LaunchDarkly flags for Release Guardian.",
    version="1.0.0"
)

# Since Railway sets the CORS headers at their proxy level,
# Let's remove our custom middleware and use their environment

# Configure FastAPI's CORS middleware - using railway.com as origin since Railway enforces this
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://railway.com",           # Required by Railway
        "https://ld-gr-frontend-production.up.railway.app",  # Specific Railway frontend
        "https://*.railway.app",         # Any Railway subdomain
        "http://localhost:3000",         # Local development
        "http://localhost:8000",         # Local development API
        "*"                              # Fallback for any origin
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include the LaunchDarkly API proxy router
app.include_router(ld_api_router)

@app.get("/", tags=["Health"])
async def health_check():
    """Check if the API is running"""
    return {"status": "healthy", "version": "1.0.0"}

@app.post("/simulation/start", tags=["Simulation"], response_model=SimulationStatus)
async def api_start_simulation(config: LDConfig):
    """Start the simulation with the provided configuration"""
    await start_simulation(config)
    return get_simulation_status()

@app.post("/simulation/stop", tags=["Simulation"], response_model=SimulationStatus)
async def api_stop_simulation():
    """Stop the simulation"""
    await stop_simulation()
    return get_simulation_status()

@app.get("/simulation/status", tags=["Simulation"], response_model=SimulationStatus)
async def api_get_status():
    """Get the current simulation status"""
    return get_simulation_status()

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time updates"""
    await websocket.accept()
    connected_websockets.add(websocket)
    
    try:
        # Send current status when a client connects
        await websocket.send_text(json.dumps({
            "type": "status", 
            "data": get_simulation_status().model_dump()
        }))
        
        # Keep connection alive
        while True:
            # Wait for any message from client (can be used as a ping)
            await websocket.receive_text()
    except WebSocketDisconnect:
        # Client disconnected
        pass
    finally:
        connected_websockets.remove(websocket)
