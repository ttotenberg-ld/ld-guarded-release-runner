from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, HTTPException, status, BackgroundTasks, Request, Response, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Any, Optional, Set
import asyncio
import json
import os
import uuid

from app.models import LDConfig, SimulationStatus, SessionRequest
from app.simulation import (
    start_simulation, stop_simulation, get_simulation_status,
    register_websocket, unregister_websocket, send_status_to_clients, send_log_to_clients
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

@app.get("/session", tags=["Session"], response_model=Dict[str, str])
async def create_session():
    """Create a new session ID for the client"""
    session_id = str(uuid.uuid4())
    return {"session_id": session_id}

@app.post("/simulation/start", tags=["Simulation"], response_model=SimulationStatus)
async def api_start_simulation(config: LDConfig):
    """Start the simulation with the provided configuration"""
    # The session_id is now passed as part of the config
    await start_simulation(config.session_id, config)
    return get_simulation_status(config.session_id)

@app.post("/simulation/stop", tags=["Simulation"], response_model=SimulationStatus)
async def api_stop_simulation(request: SessionRequest):
    """Stop the simulation"""
    await stop_simulation(request.session_id)
    return get_simulation_status(request.session_id)

@app.get("/simulation/status", tags=["Simulation"], response_model=SimulationStatus)
async def api_get_status(session_id: str = Query(..., description="Session ID to get status for")):
    """Get the current simulation status"""
    return get_simulation_status(session_id)

@app.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    """WebSocket endpoint for real-time updates for a specific session"""
    await websocket.accept()
    register_websocket(session_id, websocket)
    
    try:
        # Send current status when a client connects
        current_status = get_simulation_status(session_id)
        await websocket.send_text(json.dumps({
            "type": "status", 
            "data": current_status.model_dump()
        }))
        
        # Keep connection alive
        while True:
            # Wait for any message from client (can be used as a ping)
            await websocket.receive_text()
    except WebSocketDisconnect:
        # Client disconnected
        pass
    finally:
        unregister_websocket(session_id, websocket)
