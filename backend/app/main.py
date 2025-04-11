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

# Custom middleware to set CORS headers
class CORSMiddlewareCustom(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        
        # Set CORS headers
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Requested-With"
        
        return response

# Add our custom middleware first
app.add_middleware(CORSMiddlewareCustom)

# Configure FastAPI's CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://ld-gr-frontend-production.up.railway.app",  # Specific Railway frontend
        "https://*.railway.app",                             # Any Railway subdomain
        "http://localhost:3000",                            # Local development
        "http://localhost:8000",                            # Local development API
        "*"                                                 # Fallback for any origin
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add OPTIONS method handler for CORS preflight requests
@app.options("/{full_path:path}")
async def options_handler(request: Request, full_path: str):
    response = Response()
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Requested-With"
    return response

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
