from fastapi import APIRouter, Depends, HTTPException, Response, Request
from pydantic import BaseModel
import httpx
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ld-api-proxy", tags=["LaunchDarkly API Proxy"])

class ProxyRequest(BaseModel):
    url: str
    method: str
    payload: dict
    api_key: str
    headers: dict = None

# Add specific OPTIONS handler for the proxy endpoint with manual CORS headers
@router.options("/proxy")
async def options_proxy(request: Request):
    logger.info("OPTIONS request received for /ld-api-proxy/proxy")
    response = Response(status_code=200)
    # Set CORS headers manually
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "*"
    logger.info(f"Returning OPTIONS response with headers: {dict(response.headers)}")
    return response

@router.post("/proxy")
async def proxy_launchdarkly_request(request: ProxyRequest):
    """
    Proxy requests to LaunchDarkly API to avoid CORS issues
    """
    try:
        # Create headers with the provided API key
        headers = {
            "Authorization": request.api_key,
            "Content-Type": "application/json"
        }
        
        # Add any custom headers provided in the request
        if request.headers:
            headers.update(request.headers)
        
        logger.info(f"Proxying request to LaunchDarkly: {request.method} {request.url}")
        
        # Make the request
        async with httpx.AsyncClient() as client:
            if request.method.lower() == "get":
                response = await client.get(
                    request.url,
                    headers=headers,
                    timeout=30.0
                )
            elif request.method.lower() == "post":
                response = await client.post(
                    request.url,
                    headers=headers,
                    json=request.payload,
                    timeout=30.0
                )
            elif request.method.lower() == "put":
                response = await client.put(
                    request.url,
                    headers=headers,
                    json=request.payload,
                    timeout=30.0
                )
            elif request.method.lower() == "delete":
                response = await client.delete(
                    request.url,
                    headers=headers,
                    timeout=30.0
                )
            else:
                raise HTTPException(status_code=400, detail=f"Unsupported method: {request.method}")
            
        # Return the response data
        response_data = {
            "status_code": response.status_code,
            "data": response.json() if response.text else None,
            "success": response.status_code < 400,
            "headers": dict(response.headers),
            "url": response.url
        }
        
        logger.info(f"Response status code: {response.status_code}")
        
        return response_data
    except httpx.RequestError as e:
        logger.error(f"Request error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Request error: {str(e)}")
    except httpx.HTTPStatusError as e:
        logger.error(f"HTTP error: {str(e)}")
        raise HTTPException(status_code=e.response.status_code, detail=f"HTTP error: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}") 