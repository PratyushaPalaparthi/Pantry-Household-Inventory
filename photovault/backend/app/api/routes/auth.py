"""
Authentication routes.
"""
import os
from datetime import datetime, timedelta
from uuid import UUID, uuid4
from fastapi import APIRouter, Depends, HTTPException, Request, status, BackgroundTasks
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

limiter = Limiter(key_func=get_remote_address)

from app.db.session import get_db
from app.models.models import User, EmailVerification
from app.schemas.schemas import (
    UserCreate, UserLogin, TokenResponse, TokenRefresh,
    PasswordReset, PasswordResetConfirm, EmailVerify, UserResponse
)
from app.core.security import (
    verify_password, get_password_hash, create_access_token,
    create_refresh_token, create_email_verification_token,
    create_password_reset_token, decode_token, verify_email_token,
    verify_password_reset_token
)
from app.core.config import settings
from app.services.email import send_verification_email, send_password_reset_email
from app.api.deps import get_current_user


router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
async def register(
    request: Request,
    user_data: UserCreate,
    db: AsyncSession = Depends(get_db)
):
    """Register a new user."""
    # Check if email already exists
    result = await db.execute(select(User).where(User.email == user_data.email))
    existing_user = result.scalar_one_or_none()
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    verification_required = bool(settings.EMAIL_VERIFICATION_REQUIRED)

    # Create user
    user = User(
        email=user_data.email,
        hashed_password=get_password_hash(user_data.password),
        full_name=user_data.full_name,
        is_active=True,
        is_verified=not verification_required,
        is_approved=not settings.REQUIRE_ADMIN_APPROVAL,
        role="user"
    )
    
    db.add(user)

    # If verification is required, create token and send email before committing so
    # users don't get stuck with an un-verified account when SMTP is misconfigured.
    if verification_required:
        await db.flush()

        token = create_email_verification_token(user.email)
        verification = EmailVerification(
            email=user.email,
            token=token,
            expires_at=datetime.utcnow() + timedelta(hours=settings.EMAIL_VERIFICATION_EXPIRE_HOURS),
        )
        db.add(verification)

        ok = await send_verification_email(user.email, token)
        if not ok:
            await db.rollback()
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=(
                    "Could not send verification email. "
                    "Please check SMTP settings (or start the local Mailpit container)."
                ),
            )

    await db.commit()
    await db.refresh(user)
    
    return user


@router.post("/login", response_model=TokenResponse)
@limiter.limit("20/minute")
async def login(
    request: Request,
    credentials: UserLogin,
    db: AsyncSession = Depends(get_db)
):
    """Login and get access token."""
    result = await db.execute(select(User).where(User.email == credentials.email))
    user = result.scalar_one_or_none()
    
    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive"
        )
    
    if settings.EMAIL_VERIFICATION_REQUIRED and not user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email not verified. Please check your inbox."
        )
    
    if not user.is_approved:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account pending admin approval"
        )
    
    # Update last login
    user.last_login = datetime.utcnow()
    await db.commit()
    
    # Create tokens
    access_token = create_access_token(str(user.id), user.role)
    refresh_token = create_refresh_token(str(user.id))
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    token_data: TokenRefresh,
    db: AsyncSession = Depends(get_db)
):
    """Refresh access token."""
    payload = decode_token(token_data.refresh_token)
    
    if not payload or payload.type != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )
    
    try:
        user_id = UUID(payload.sub)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )
    
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive"
        )
    
    access_token = create_access_token(str(user.id), user.role)
    new_refresh_token = create_refresh_token(str(user.id))
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=new_refresh_token,
        expires_in=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )


@router.post("/verify-email")
async def verify_email(
    data: EmailVerify,
    db: AsyncSession = Depends(get_db)
):
    """Verify email address."""
    email = verify_email_token(data.token)
    
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification token"
        )
    
    # Check verification record
    result = await db.execute(
        select(EmailVerification).where(
            EmailVerification.token == data.token,
            EmailVerification.is_used == False
        )
    )
    verification = result.scalar_one_or_none()
    
    if not verification or verification.expires_at < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification token"
        )
    
    # Update user
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    user.is_verified = True
    verification.is_used = True
    await db.commit()
    
    return {"message": "Email verified successfully"}


@router.post("/resend-verification")
@limiter.limit("5/minute")
async def resend_verification(
    request: Request,
    data: PasswordReset,  # Reuse schema, just needs email
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """Resend verification email."""
    if not settings.EMAIL_VERIFICATION_REQUIRED:
        return {"message": "Email verification is disabled"}

    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()
    
    if not user:
        # Don't reveal if email exists
        return {"message": "If the email exists, a verification link will be sent"}
    
    if user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already verified"
        )
    
    # Create new verification token
    token = create_email_verification_token(user.email)
    verification = EmailVerification(
        email=user.email,
        token=token,
        expires_at=datetime.utcnow() + timedelta(hours=settings.EMAIL_VERIFICATION_EXPIRE_HOURS)
    )
    db.add(verification)
    await db.commit()
    
    background_tasks.add_task(send_verification_email, user.email, token)
    
    return {"message": "If the email exists, a verification link will be sent"}


@router.post("/forgot-password")
@limiter.limit("5/minute")
async def forgot_password(
    request: Request,
    data: PasswordReset,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """Request password reset."""
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()
    
    if user:
        token = create_password_reset_token(user.email)
        background_tasks.add_task(send_password_reset_email, user.email, token)
    
    # Always return success to prevent email enumeration
    return {"message": "If the email exists, a password reset link will be sent"}


@router.post("/reset-password")
async def reset_password(
    data: PasswordResetConfirm,
    db: AsyncSession = Depends(get_db)
):
    """Reset password with token."""
    email = verify_password_reset_token(data.token)
    
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token"
        )
    
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    user.hashed_password = get_password_hash(data.new_password)
    await db.commit()
    
    return {"message": "Password reset successfully"}


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_user)
):
    """Get current user information."""
    return current_user


@router.post("/logout")
async def logout(
    current_user: User = Depends(get_current_user)
):
    """Logout (client should discard tokens)."""
    # In a production system, you might want to blacklist the token
    return {"message": "Logged out successfully"}


@router.post("/sso-session", response_model=TokenResponse)
async def sso_session(request: Request, db: AsyncSession = Depends(get_db)):
    """Exchange an upstream single sign-on identity for a normal session.

    When this app sits behind a proxy that already authenticated the caller
    (Authelia, Cloudflare Access, oauth2-proxy), showing a second login form is
    pointless friction. The proxy forwards the verified address on Remote-Email;
    this hands back the same tokens the password flow would.

    SECURITY: Remote-Email is trustworthy only because the proxy overwrites it
    on every request, which holds while this service is unreachable except
    through that proxy. It publishes no port and sits on a private network, so
    that holds here. If it is ever exposed directly, TRUST_PROXY_AUTH must be
    turned off, or anyone could name themselves any user.
    """
    if os.getenv("TRUST_PROXY_AUTH", "").lower() != "true":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")

    email = (request.headers.get("remote-email") or "").strip().lower()
    if not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No single sign-on identity was provided",
        )

    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if user is None:
        # First arrival through the proxy. The proxy owns authentication, so
        # this account gets a password hash nothing can match rather than an
        # empty one, which a future bug might treat as valid. Active and
        # approved immediately: the proxy already vetted them.
        user = User(
            email=email,
            hashed_password=f"sso-only:{uuid4()}",
            full_name=request.headers.get("remote-name") or email.split("@")[0],
            is_active=True,
            is_approved=True,
            is_verified=True,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)

    return TokenResponse(
        access_token=create_access_token(str(user.id), user.role),
        refresh_token=create_refresh_token(str(user.id)),
        expires_in=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )
