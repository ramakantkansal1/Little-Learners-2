"""
Authentication endpoints.
"""
from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.exceptions import (
    AuthenticationException,
    ValidationException,
    ConflictException,
    RateLimitException,
)
from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    create_refresh_token,
    decode_token,
    create_csrf_token,
)
from app.models import User, Role, UserRole, RefreshToken, PasswordReset
from app.permissions.dependencies import get_current_user, require_permission
from app.permissions.roles import Permission, Role as RoleEnum

router = APIRouter(prefix="", tags=["authentication"])


# Request/Response models
class ParentRegisterRequest(BaseModel):
    full_name: str = Field(..., min_length=1, max_length=255)
    email: EmailStr
    phone_number: Optional[str] = Field(None, pattern=r"^\+?[1-9]\d{1,14}$")
    password: str = Field(..., min_length=8, max_length=128)
    confirm_password: str
    accept_terms: bool = Field(..., json_schema_extra={"description": "Must accept terms and privacy policy"})
    accept_privacy: bool = Field(..., json_schema_extra={"description": "Must accept privacy policy"})

    def model_post_init(self, __context):
        if self.password != self.confirm_password:
            raise ValueError("Passwords do not match")
        if not self.accept_terms:
            raise ValueError("Must accept terms and conditions")
        if not self.accept_privacy:
            raise ValueError("Must accept privacy policy")


class ParentRegisterResponse(BaseModel):
    message: str
    user_id: int
    email_verification_required: bool


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    remember_me: bool = False


class StudentLoginRequest(BaseModel):
    username: str = Field(..., min_length=1, max_length=100)
    pin: str = Field(..., min_length=4, max_length=6)


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: "UserInfo"


class UserInfo(BaseModel):
    id: int
    email: Optional[str]
    role: str
    is_verified: bool


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    password: str = Field(..., min_length=8, max_length=128)
    confirm_password: str

    def model_post_init(self, __context):
        if self.password != self.confirm_password:
            raise ValueError("Passwords do not match")


class MessageResponse(BaseModel):
    message: str


class CSRFTokenResponse(BaseModel):
    csrf_token: str


# Helper functions
async def get_or_create_role(db: AsyncSession, role_name: RoleEnum) -> Role:
    """Get or create a role."""
    result = await db.execute(select(Role).where(Role.name == role_name.value))
    role = result.scalar_one_or_none()
    if not role:
        role = Role(name=role_name.value, description=f"{role_name.value.capitalize()} role", is_system=True)
        db.add(role)
        await db.flush()
    return role


async def assign_role(db: AsyncSession, user_id: int, role_name: RoleEnum, assigned_by: Optional[int] = None):
    """Assign a role to a user."""
    role = await get_or_create_role(db, role_name)
    existing = await db.execute(
        select(UserRole).where(UserRole.user_id == user_id, UserRole.role_id == role.id)
    )
    if not existing.scalar_one_or_none():
        user_role = UserRole(user_id=user_id, role_id=role.id, assigned_by=assigned_by)
        db.add(user_role)


def set_auth_cookies(response: Response, access_token: str, refresh_token: str, remember_me: bool = False):
    """Set authentication cookies."""
    # Access token cookie
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=settings.APP_ENV == "production",
        samesite="strict",
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/",
    )

    # Refresh token cookie
    refresh_max_age = settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60
    if remember_me:
        refresh_max_age = 30 * 24 * 60 * 60  # 30 days for remember me

    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=settings.APP_ENV == "production",
        samesite="strict",
        max_age=refresh_max_age,
        path="/",
    )

    # CSRF token
    csrf_token = create_csrf_token()
    response.set_cookie(
        key="csrf_token",
        value=csrf_token,
        httponly=True,
        secure=settings.APP_ENV == "production",
        samesite="strict",
        max_age=refresh_max_age,
        path="/",
    )

    return csrf_token


def clear_auth_cookies(response: Response):
    """Clear authentication cookies."""
    for cookie_name in ["access_token", "refresh_token", "csrf_token"]:
        response.delete_cookie(key=cookie_name, path="/", secure=settings.APP_ENV == "production", samesite="strict")


# Endpoints
@router.post("/parent/register", response_model=ParentRegisterResponse, status_code=status.HTTP_201_CREATED)
async def parent_register(
    request: ParentRegisterRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    """Register a new parent account."""
    # Check if email already exists
    existing = await db.execute(select(User).where(User.email == request.email))
    if existing.scalar_one_or_none():
        raise ConflictException("An account with this email already exists")

    # Check if phone already exists (if provided)
    if request.phone_number:
        from app.models import ParentProfile
        existing_phone = await db.execute(
            select(ParentProfile).where(ParentProfile.phone_number == request.phone_number)
        )
        if existing_phone.scalar_one_or_none():
            raise ConflictException("An account with this phone number already exists")

    # Create user
    password_hash = get_password_hash(request.password)
    user = User(
        email=request.email,
        password_hash=password_hash,
        is_active=True,
        is_verified=not settings.EMAIL_VERIFICATION_ENABLED,  # Auto-verify if email verification disabled
    )
    db.add(user)
    await db.flush()

    # Assign parent role
    await assign_role(db, user.id, RoleEnum.PARENT)

    # Create parent profile
    from app.models import ParentProfile
    parent_profile = ParentProfile(
        user_id=user.id,
        full_name=request.full_name,
        phone_number=request.phone_number,
        phone_verified=False,
    )
    db.add(parent_profile)

    # Create default user preferences
    from app.models import UserPreference
    preferences = UserPreference(user_id=user.id)
    db.add(preferences)

    await db.commit()

    # Set auth cookies if auto-verified
    if user.is_verified:
        access_token = create_access_token(subject=str(user.id), email=user.email, role=RoleEnum.PARENT.value)
        refresh_token = create_refresh_token(subject=str(user.id))
        set_auth_cookies(response, access_token, refresh_token)

    return ParentRegisterResponse(
        message="Registration successful" + (" - please verify your email" if not user.is_verified else ""),
        user_id=user.id,
        email_verification_required=not user.is_verified,
    )


@router.post("/parent/login", response_model=TokenResponse)
async def parent_login(
    request: LoginRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    """Parent login with email and password."""
    # Find user by email
    result = await db.execute(select(User).where(User.email == request.email))
    user = result.scalar_one_or_none()

    if not user or user.is_deleted:
        raise AuthenticationException("Invalid credentials")

    # Check if user has parent role
    user_roles = [ur.role.name for ur in user.user_roles if not ur.role.is_deleted]
    if RoleEnum.PARENT.value not in user_roles and RoleEnum.ADMIN.value not in user_roles:
        raise AuthenticationException("Invalid credentials")

    # Verify password
    if not verify_password(request.password, user.password_hash):
        # Increment failed attempts
        user.failed_login_attempts += 1
        if user.failed_login_attempts >= 5:
            user.locked_until = datetime.now(timezone.utc) + timedelta(minutes=15)
        await db.commit()
        raise AuthenticationException("Invalid credentials")

    # Check if account is locked
    if user.locked_until and user.locked_until > datetime.now(timezone.utc):
        raise AuthenticationException("Account temporarily locked. Try again later.")

    # Reset failed attempts on successful login
    user.failed_login_attempts = 0
    user.locked_until = None
    user.last_login_at = datetime.now(timezone.utc)

    # Determine role (admin takes precedence)
    role = RoleEnum.ADMIN.value if RoleEnum.ADMIN.value in user_roles else RoleEnum.PARENT.value

    # Create tokens
    access_token = create_access_token(subject=str(user.id), email=user.email, role=role)
    refresh_token = create_refresh_token(subject=str(user.id))

    # Store refresh token in database
    import hashlib
    token_hash = hashlib.sha256(refresh_token.encode()).hexdigest()
    refresh_token_obj = RefreshToken(
        user_id=user.id,
        token_hash=token_hash,
        jti=decode_token(refresh_token).jti,
        expires_at=datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    )
    db.add(refresh_token_obj)

    await db.commit()

    # Set cookies
    set_auth_cookies(response, access_token, refresh_token, request.remember_me)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserInfo(id=user.id, email=user.email, role=role, is_verified=user.is_verified),
    )


@router.post("/student/login", response_model=TokenResponse)
async def student_login(
    request: StudentLoginRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    """Student login with username and PIN."""
    from app.models import StudentProfile

    # Find student by display name (username)
    result = await db.execute(
        select(StudentProfile).where(StudentProfile.display_name == request.username)
    )
    student = result.scalar_one_or_none()

    if not student or student.is_deleted or not student.is_active:
        raise AuthenticationException("Invalid credentials")

    if not student.pin_hash:
        raise AuthenticationException("PIN not set for this account")

    # Verify PIN
    if not verify_password(request.pin, student.pin_hash):
        raise AuthenticationException("Invalid credentials")

    # Get associated user
    user_result = await db.execute(select(User).where(User.id == student.user_id))
    user = user_result.scalar_one_or_none()

    if not user or user.is_deleted or not user.is_active:
        raise AuthenticationException("Invalid credentials")

    # Create tokens
    access_token = create_access_token(subject=str(user.id), email=user.email, role=RoleEnum.STUDENT.value)
    refresh_token = create_refresh_token(subject=str(user.id))

    # Store refresh token
    import hashlib
    token_hash = hashlib.sha256(refresh_token.encode()).hexdigest()
    refresh_token_obj = RefreshToken(
        user_id=user.id,
        token_hash=token_hash,
        jti=decode_token(refresh_token).jti,
        expires_at=datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    )
    db.add(refresh_token_obj)

    # Update last activity
    student.last_activity_at = datetime.now(timezone.utc)

    await db.commit()

    # Set cookies
    set_auth_cookies(response, access_token, refresh_token)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserInfo(id=user.id, email=user.email, role=RoleEnum.STUDENT.value, is_verified=user.is_verified),
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    """Refresh access token using refresh token."""
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        raise AuthenticationException("Refresh token not provided")

    token_data = decode_token(refresh_token)
    if not token_data or token_data.type != "refresh":
        raise AuthenticationException("Invalid refresh token")

    # Check if token exists in database and is not revoked
    import hashlib
    token_hash = hashlib.sha256(refresh_token.encode()).hexdigest()
    result = await db.execute(
        select(RefreshToken).where(RefreshToken.token_hash == token_hash)
    )
    stored_token = result.scalar_one_or_none()

    if not stored_token or stored_token.is_revoked() or stored_token.is_expired():
        raise AuthenticationException("Refresh token revoked or expired")

    # Get user
    user_result = await db.execute(select(User).where(User.id == int(token_data.sub)))
    user = user_result.scalar_one_or_none()

    if not user or user.is_deleted or not user.is_active:
        raise AuthenticationException("User not found or inactive")

    # Determine role
    user_roles = [ur.role.name for ur in user.user_roles if not ur.role.is_deleted]
    if RoleEnum.ADMIN.value in user_roles:
        role = RoleEnum.ADMIN.value
    elif RoleEnum.PARENT.value in user_roles:
        role = RoleEnum.PARENT.value
    else:
        role = RoleEnum.STUDENT.value

    # Rotate tokens - revoke old refresh token
    stored_token.revoked_at = datetime.now(timezone.utc)

    # Create new tokens
    new_access_token = create_access_token(subject=str(user.id), email=user.email, role=role)
    new_refresh_token = create_refresh_token(subject=str(user.id))

    # Store new refresh token
    new_token_hash = hashlib.sha256(new_refresh_token.encode()).hexdigest()
    new_refresh_token_obj = RefreshToken(
        user_id=user.id,
        token_hash=new_token_hash,
        jti=decode_token(new_refresh_token).jti,
        expires_at=datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    )
    db.add(new_refresh_token_obj)

    await db.commit()

    # Set new cookies
    set_auth_cookies(response, new_access_token, new_refresh_token)

    return TokenResponse(
        access_token=new_access_token,
        refresh_token=new_refresh_token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserInfo(id=user.id, email=user.email, role=role, is_verified=user.is_verified),
    )


@router.post("/logout", response_model=MessageResponse)
async def logout(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Logout and revoke tokens."""
    # Revoke refresh token
    refresh_token = request.cookies.get("refresh_token")
    if refresh_token:
        import hashlib
        token_hash = hashlib.sha256(refresh_token.encode()).hexdigest()
        result = await db.execute(
            select(RefreshToken).where(RefreshToken.token_hash == token_hash)
        )
        stored_token = result.scalar_one_or_none()
        if stored_token:
            stored_token.revoked_at = datetime.now(timezone.utc)
            await db.commit()

    # Clear cookies
    clear_auth_cookies(response)

    return MessageResponse(message="Logged out successfully")


@router.post("/forgot-password", response_model=MessageResponse)
async def forgot_password(
    request: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    """Request password reset."""
    result = await db.execute(select(User).where(User.email == request.email))
    user = result.scalar_one_or_none()

    # Always return success to prevent email enumeration
    if not user or user.is_deleted:
        return MessageResponse(message="If an account exists, a reset link has been sent")

    # In development, we'll just log the token instead of sending email
    import secrets
    reset_token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(reset_token.encode()).hexdigest()

    # Delete any existing reset tokens for this user
    await db.execute(delete(PasswordReset).where(PasswordReset.user_id == user.id))

    # Create new reset token
    reset_token_obj = PasswordReset(
        user_id=user.id,
        token_hash=token_hash,
        expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
    )
    db.add(reset_token_obj)
    await db.commit()

    # TODO: Send email with reset link in production
    if settings.DEBUG:
        print(f"Password reset token for {request.email}: {reset_token}")

    return MessageResponse(message="If an account exists, a reset link has been sent")


@router.post("/reset-password", response_model=MessageResponse)
async def reset_password(
    request: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    """Reset password using token."""
    token_hash = hashlib.sha256(request.token.encode()).hexdigest()

    result = await db.execute(
        select(PasswordReset).where(PasswordReset.token_hash == token_hash)
    )
    reset_token = result.scalar_one_or_none()

    if not reset_token or reset_token.is_used() or reset_token.is_expired():
        raise ValidationException("Invalid or expired reset token")

    # Get user
    user_result = await db.execute(select(User).where(User.id == reset_token.user_id))
    user = user_result.scalar_one_or_none()

    if not user or user.is_deleted:
        raise ValidationException("Invalid reset token")

    # Update password
    user.password_hash = get_password_hash(request.password)
    reset_token.used_at = datetime.now(timezone.utc)

    # Revoke all refresh tokens for security
    await db.execute(
        delete(RefreshToken).where(RefreshToken.user_id == user.id)
    )

    await db.commit()

    return MessageResponse(message="Password reset successfully")


@router.get("/csrf-token", response_model=CSRFTokenResponse)
async def get_csrf_token(response: Response):
    """Get CSRF token for form submissions."""
    csrf_token = create_csrf_token()
    response.set_cookie(
        key="csrf_token",
        value=csrf_token,
        httponly=True,
        secure=settings.APP_ENV == "production",
        samesite="strict",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        path="/",
    )
    return CSRFTokenResponse(csrf_token=csrf_token)


@router.get("/me", response_model=UserInfo)
async def get_current_user_info(
    current_user: User = Depends(get_current_user),
):
    """Get current user information."""
    user_roles = [ur.role.name for ur in current_user.user_roles if not ur.role.is_deleted]
    role = RoleEnum.ADMIN.value if RoleEnum.ADMIN.value in user_roles else (
        RoleEnum.PARENT.value if RoleEnum.PARENT.value in user_roles else RoleEnum.STUDENT.value
    )
    return UserInfo(
        id=current_user.id,
        email=current_user.email,
        role=role,
        is_verified=current_user.is_verified,
    )