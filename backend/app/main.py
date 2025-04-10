from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, HTTPException, status, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Any, Optional, Set
import asyncio
import json
import os

from app.models import LDConfig, SimulationStatus
from app.simulation import (
    start_simulation, stop_simulation, get_simulation_status,
    connected_websockets, send_status_to_clients, send_log_to_clients
)

# Initialize FastAPI app
app = FastAPI(
    title="LaunchDarkly Guarded Release Runner",
    description="A web application to simulate and send metric events to LaunchDarkly flags for Release Guardian.",
    version="1.0.0"
)

# Configure CORS to allow requests from the frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For production, restrict to your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
