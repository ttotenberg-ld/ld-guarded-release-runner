import asyncio
import json
import ldclient
from ldclient.config import Config
import os
import random
import requests
import time
from typing import Dict, Any, List, Optional, Set, Deque
import uuid
from contextlib import asynccontextmanager
from collections import deque

from app.models import LDConfig, SimulationStatus
from app.utils import create_multi_context, error_chance

# Global variables to track simulation state
simulation_status = SimulationStatus(running=False)
active_clients: Dict[str, Any] = {}
connected_websockets: Set = set()

# Message deduplication
last_messages: Deque[str] = deque(maxlen=10)
last_message_time = 0.0

async def send_log_to_clients(message: str):
    """Send a log message to all connected WebSocket clients with deduplication"""
    global last_message_time
    
    # Deduplicate messages within a short time window
    current_time = time.time()
    
    # Skip identical messages sent within 1 second
    if message in last_messages and current_time - last_message_time < 1.0:
        return
    
    # Update tracking
    last_messages.append(message)
    last_message_time = current_time
    
    if connected_websockets:
        await asyncio.gather(
            *[websocket.send_text(json.dumps({"type": "log", "message": message})) for websocket in connected_websockets]
        )

async def send_status_to_clients():
    """Send current simulation status to all connected WebSocket clients"""
    if connected_websockets:
        status_data = json.dumps({"type": "status", "data": simulation_status.model_dump()})
        await asyncio.gather(
            *[websocket.send_text(status_data) for websocket in connected_websockets]
        )

async def init_ld_client(config: LDConfig) -> bool:
    """Initialize the LaunchDarkly client"""
    try:
        # Clean up any existing client
        if "client" in active_clients:
            active_clients["client"].close()
            del active_clients["client"]
            
        # Log toggle values for debugging
        await send_log_to_clients(f"DEBUG - Latency toggle: {config.latency_metric_enabled} (type: {type(config.latency_metric_enabled).__name__})")
        await send_log_to_clients(f"DEBUG - Error toggle: {config.error_metric_enabled} (type: {type(config.error_metric_enabled).__name__})")
        await send_log_to_clients(f"DEBUG - Business toggle: {config.business_metric_enabled} (type: {type(config.business_metric_enabled).__name__})")
            
        # Initialize new client
        ldclient.set_config(Config(config.sdk_key))
        active_clients["client"] = ldclient.get()
        active_clients["config"] = config
        await send_log_to_clients("LaunchDarkly client initialized")
        return True
    except Exception as e:
        error_msg = f"Error initializing LaunchDarkly client: {str(e)}"
        simulation_status.last_error = error_msg
        await send_log_to_clients(error_msg)
        return False

async def check_guarded_rollout() -> bool:
    """Check if the guarded rollout is active"""
    config = active_clients.get("config")
    if not config:
        await send_log_to_clients("No configuration found")
        return False
        
    try:
        url = f'https://app.launchdarkly.com/api/v2/flags/{config.project_key}/{config.flag_key}'
        headers = {'Authorization': config.api_key, 'Content-Type': 'application/json'}
        
        await send_log_to_clients(f"Checking if guarded rollout is active for {config.flag_key}")
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        response_data = response.json()
        
        # Safely access nested keys
        production_env = response_data.get('environments', {}).get('production', {})
        fallthrough = production_env.get('fallthrough', {})
        rollout_active = fallthrough.get('rollout')
        
        rollout_type = None
        if rollout_active and isinstance(rollout_active, dict):
            experiment_allocation = rollout_active.get('experimentAllocation', {})
            if experiment_allocation and isinstance(experiment_allocation, dict):
                rollout_type = experiment_allocation.get('type')
        
        is_active = rollout_type == 'measuredRollout'
        status_msg = "Guarded Rollout is active" if is_active else "Guarded Rollout is not active"
        await send_log_to_clients(status_msg)
        return is_active
    
    except requests.RequestException as e:
        error_msg = f"API request error: {str(e)}"
        simulation_status.last_error = error_msg
        await send_log_to_clients(error_msg)
        return False
    except json.JSONDecodeError as e:
        error_msg = f"Error parsing API response: {str(e)}"
        simulation_status.last_error = error_msg
        await send_log_to_clients(error_msg)
        return False
    except Exception as e:
        error_msg = f"Unexpected error checking rollout: {str(e)}"
        simulation_status.last_error = error_msg
        await send_log_to_clients(error_msg)
        return False

async def send_events(num_events: int = 1000):
    """Send events to LaunchDarkly"""
    client = active_clients.get("client")
    config = active_clients.get("config")
    
    if not client or not config:
        await send_log_to_clients("LaunchDarkly client not initialized")
        return
    
    # Correctly convert toggle values to ensure they're strictly boolean
    # Use "is False" to check actual False value, not just truthy/falsy
    latency_enabled = config.latency_metric_enabled is not False
    error_enabled = config.error_metric_enabled is not False
    business_enabled = config.business_metric_enabled is not False
    
    # Additional debugging to show exact values
    await send_log_to_clients(f"DEBUG - Raw latency toggle value: '{config.latency_metric_enabled}' (type: {type(config.latency_metric_enabled).__name__})")
    await send_log_to_clients(f"DEBUG - Processed latency toggle: {latency_enabled}")
    
    events_sent = 0
    
    for i in range(num_events):
        if not simulation_status.running:
            break
            
        try:
            context = create_multi_context()
            flag_variation = client.variation(config.flag_key, context, False)
            
            # Use control/treatment terminology in logs
            variation_str = "treatment" if flag_variation else "control"
            await send_log_to_clients(f"Executing {variation_str}")
            
            if flag_variation:
                # Treatment (true variation)
                # Error metric tracking - only if enabled
                if error_enabled and error_chance(config.error_metric_1_true_converted):
                    client.track(config.error_metric_1, context)
                    await send_log_to_clients(f"Tracking {config.error_metric_1} for treatment")
                elif not error_enabled:
                    await send_log_to_clients(f"Skipping {config.error_metric_1} tracking (disabled)")
                
                # Business metric tracking - only if enabled
                if business_enabled and error_chance(config.business_metric_1_true_converted):
                    client.track(config.business_metric_1, context)
                    await send_log_to_clients(f"Tracking {config.business_metric_1} for treatment")
                elif not business_enabled:
                    await send_log_to_clients(f"Skipping {config.business_metric_1} tracking (disabled)")
                
                # Latency metric tracking - only if enabled
                if latency_enabled:
                    latency_value = random.randint(config.latency_metric_1_true_range[0], config.latency_metric_1_true_range[1])
                    client.track(config.latency_metric_1, context, metric_value=latency_value)
                    await send_log_to_clients(f"Tracking {config.latency_metric_1} with value {latency_value} for treatment")
                else:
                    await send_log_to_clients(f"Skipping {config.latency_metric_1} tracking (disabled)")
            else:
                # Control (false variation)
                # Error metric tracking - only if enabled
                if error_enabled and error_chance(config.error_metric_1_false_converted):
                    client.track(config.error_metric_1, context)
                    await send_log_to_clients(f"Tracking {config.error_metric_1} for control")
                elif not error_enabled:
                    await send_log_to_clients(f"Skipping {config.error_metric_1} tracking (disabled)")
                
                # Business metric tracking - only if enabled
                if business_enabled and error_chance(config.business_metric_1_false_converted):
                    client.track(config.business_metric_1, context)
                    await send_log_to_clients(f"Tracking {config.business_metric_1} for control")
                elif not business_enabled:
                    await send_log_to_clients(f"Skipping {config.business_metric_1} tracking (disabled)")
                
                # Latency metric tracking - only if enabled
                if latency_enabled:
                    latency_value = random.randint(config.latency_metric_1_false_range[0], config.latency_metric_1_false_range[1])
                    client.track(config.latency_metric_1, context, metric_value=latency_value)
                    await send_log_to_clients(f"Tracking {config.latency_metric_1} with value {latency_value} for control")
                else:
                    await send_log_to_clients(f"Skipping {config.latency_metric_1} tracking (disabled)")
            
            client.flush()
            events_sent += 1
            simulation_status.events_sent += 1
            
            # Update status periodically
            if events_sent % 10 == 0:
                await send_status_to_clients()
                
            # Sleep to avoid overwhelming the service
            await asyncio.sleep(0.05)
            
        except Exception as e:
            error_msg = f"Error during event sending: {str(e)}"
            simulation_status.last_error = error_msg
            await send_log_to_clients(error_msg)
            continue
    
    await send_status_to_clients()

async def simulation_loop():
    """Main simulation loop"""
    while simulation_status.running:
        is_active = await check_guarded_rollout()
        
        if is_active:
            await send_events(100)  # Send batches of 100 for better control
        else:
            await send_log_to_clients("Waiting for guarded rollout to become active...")
            await asyncio.sleep(5)  # Check again in 5 seconds

async def start_simulation(config: LDConfig):
    """Start the simulation"""
    if simulation_status.running:
        await send_log_to_clients("Simulation already running")
        return
        
    # Initialize client
    if not await init_ld_client(config):
        return
    
    # Reset status
    simulation_status.running = True
    simulation_status.events_sent = 0
    simulation_status.last_error = None
    
    # Start simulation in background
    asyncio.create_task(simulation_loop())
    await send_status_to_clients()
    await send_log_to_clients("Simulation started")

async def stop_simulation():
    """Stop the simulation"""
    if not simulation_status.running:
        await send_log_to_clients("No simulation running")
        return
        
    simulation_status.running = False
    await send_status_to_clients()
    await send_log_to_clients("Simulation stopped")
    
    # Clean up
    if "client" in active_clients:
        try:
            active_clients["client"].flush()
            active_clients["client"].close()
        except Exception as e:
            await send_log_to_clients(f"Error during cleanup: {str(e)}")

def get_simulation_status() -> SimulationStatus:
    """Get current simulation status"""
    return simulation_status