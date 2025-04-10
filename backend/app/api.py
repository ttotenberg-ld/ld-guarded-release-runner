from fastapi import APIRouter, Depends, HTTPException
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
        return {
            "status_code": response.status_code,
            "data": response.json() if response.text else None,
            "success": response.status_code < 400
        }
    except httpx.RequestError as e:
        logger.error(f"Request error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Request error: {str(e)}")
    except httpx.HTTPStatusError as e:
        logger.error(f"HTTP error: {str(e)}")
        raise HTTPException(status_code=e.response.status_code, detail=f"HTTP error: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}") 