"""
Admin Secrets API - Disabled for security.

This endpoint was removed because it exposed database credentials over the network.
Database credentials should never be returned via API responses.
"""

from fastapi import APIRouter, HTTPException, status

router = APIRouter()


def _disabled():
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")


@router.post("/secrets/verify")
async def get_system_secrets():
    _disabled()


@router.get("/secrets/access-logs")
async def get_secret_access_logs():
    _disabled()


@router.get("/secrets/available")
async def check_secrets_available():
    _disabled()
