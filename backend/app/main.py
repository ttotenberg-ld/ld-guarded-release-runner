from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, HTTPException, status, BackgroundTasks, Request, Response
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
from app.api import router as ld_api_router

# Initialize FastAPI app
app = FastAPI(
    title="LaunchDarkly Guarded Release Runner",
    description="A web application to simulate and send metric events to LaunchDarkly flags for Release Guardian.",
    version="1.0.0"
)

# Add CORS middleware with maximum permissiveness
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allow all methods
    allow_headers=["*"],  # Allow all headers
)

# Add a global OPTIONS route handler that returns a 200 response
@app.options("/{path:path}")
async def options_route(path: str):
    response = Response(status_code=200)
    # Manually add CORS headers to ensure they're correct
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "*"
    return response

# Debug middleware to log requests
@app.middleware("http")
async def log_requests(request: Request, call_next):
    print(f"DEBUG: Received {request.method} request for {request.url.path} from origin: {request.headers.get('origin', 'unknown')}")
    response = await call_next(request)
    print(f"DEBUG: Returning {response.status_code} response with headers: {dict(response.headers)}")
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
