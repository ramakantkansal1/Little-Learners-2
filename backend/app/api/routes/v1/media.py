"""
Media API endpoints.
"""
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from pydantic import BaseModel, Field
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.exceptions import NotFoundException, ValidationException
from app.models import MediaAsset, LessonMedia, ActivityMedia, MediaTypeEnum
from app.permissions.dependencies import get_current_user, require_permission
from app.permissions.roles import Permission

router = APIRouter(tags=["media"])


# Response Models
class MediaAssetResponse(BaseModel):
    id: int
    file_name: str
    original_name: str
    file_url: Optional[str]
    media_type: str
    mime_type: str
    file_size: int
    width: Optional[int]
    height: Optional[int]
    duration_seconds: Optional[float]
    alt_text: Optional[str]
    caption: Optional[str]
    source: Optional[str]
    license: Optional[str]
    attribution: Optional[str]
    language: Optional[str]
    tags: Optional[List[str]]
    is_processed: bool
    processing_error: Optional[str]
    created_at: str

    class Config:
        from_attributes = True


class MediaUploadResponse(BaseModel):
    id: int
    file_name: str
    original_name: str
    file_url: str
    media_type: str
    mime_type: str
    file_size: int

    class Config:
        from_attributes = True


# Endpoints
@router.get("", response_model=List[MediaAssetResponse])
async def list_media(
    media_type: Optional[str] = Query(None),
    language: Optional[str] = Query(None),
    is_processed: Optional[bool] = Query(None),
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """List media assets."""
    # Check permissions
    user_roles = [ur.role.name for ur in current_user.user_roles]
    if "admin" not in user_roles:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    query = select(MediaAsset).where(MediaAsset.deleted_at.is_(None)).order_by(MediaAsset.created_at.desc())
    
    if media_type:
        query = query.where(MediaAsset.media_type == media_type)
    if language:
        query = query.where(MediaAsset.language == language)
    if is_processed is not None:
        query = query.where(MediaAsset.is_processed == is_processed)
    
    query = query.limit(limit).offset(offset)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{media_id}", response_model=MediaAssetResponse)
async def get_media(
    media_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """Get a specific media asset."""
    user_roles = [ur.role.name for ur in current_user.user_roles]
    if "admin" not in user_roles:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await db.execute(
        select(MediaAsset).where(MediaAsset.id == media_id).where(MediaAsset.deleted_at.is_(None))
    )
    media = result.scalar_one_or_none()
    if not media:
        raise NotFoundException("Media asset not found")
    return media


@router.post("/upload", response_model=MediaUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_media(
    file: UploadFile = File(...),
    media_type: str = Form(...),
    language: Optional[str] = Form(None),
    alt_text: Optional[str] = Form(None),
    caption: Optional[str] = Form(None),
    source: Optional[str] = Form(None),
    license: Optional[str] = Form(None),
    attribution: Optional[str] = Form(None),
    tags: Optional[str] = Form(None),  # Comma-separated
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """Upload a new media asset."""
    user_roles = [ur.role.name for ur in current_user.user_roles]
    if "admin" not in user_roles:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Validate media type
    try:
        MediaTypeEnum(media_type)
    except ValueError:
        raise ValidationException(f"Invalid media type: {media_type}")
    
    # Read file content
    content = await file.read()
    file_size = len(content)
    
    # Validate file size (max 50MB)
    max_size = 50 * 1024 * 1024
    if file_size > max_size:
        raise ValidationException(f"File too large. Maximum size: {max_size / 1024 / 1024}MB")
    
    # Generate file name
    import uuid
    file_ext = file.filename.split('.')[-1] if '.' in file.filename else ''
    file_name = f"{uuid.uuid4().hex}.{file_ext}" if file_ext else uuid.uuid4().hex
    
    # Save to local storage (in production, use S3 or similar)
    import os
    upload_dir = os.getenv("UPLOAD_DIR", "./uploads")
    os.makedirs(upload_dir, exist_ok=True)
    file_path = os.path.join(upload_dir, file_name)
    
    with open(file_path, "wb") as f:
        f.write(content)
    
    # Get dimensions for images
    width = None
    height = None
    duration_seconds = None
    
    if media_type == "image":
        try:
            from PIL import Image
            img = Image.open(file_path)
            width, height = img.size
        except Exception:
            pass
    elif media_type in ("audio", "video"):
        # TODO: Use ffprobe to get duration
        pass
    
    # Parse tags
    tag_list = [t.strip() for t in tags.split(",")] if tags else []
    
    # Create media asset record
    media = MediaAsset(
        file_name=file_name,
        original_name=file.filename or file_name,
        file_path=file_path,
        file_url=f"/uploads/{file_name}",  # In production, use CDN URL
        media_type=MediaTypeEnum(media_type),
        mime_type=file.content_type or "application/octet-stream",
        file_size=file_size,
        width=width,
        height=height,
        duration_seconds=duration_seconds,
        alt_text=alt_text,
        caption=caption,
        source=source,
        license=license,
        attribution=attribution,
        language=language,
        tags=tag_list,
        uploaded_by=current_user.id,
        is_processed=True,
    )
    db.add(media)
    await db.commit()
    await db.refresh(media)
    
    return MediaUploadResponse(
        id=media.id,
        file_name=media.file_name,
        original_name=media.original_name,
        file_url=media.file_url,
        media_type=media.media_type.value,
        mime_type=media.mime_type,
        file_size=media.file_size,
    )


@router.delete("/{media_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_media(
    media_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """Soft delete a media asset."""
    user_roles = [ur.role.name for ur in current_user.user_roles]
    if "admin" not in user_roles:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await db.execute(
        select(MediaAsset).where(MediaAsset.id == media_id).where(MediaAsset.deleted_at.is_(None))
    )
    media = result.scalar_one_or_none()
    if not media:
        raise NotFoundException("Media asset not found")
    
    # Check if media is used in lessons or activities
    lesson_media_result = await db.execute(
        select(LessonMedia).where(LessonMedia.media_asset_id == media_id)
    )
    if lesson_media_result.scalar_one_or_none():
        raise ValidationException("Media is used in lessons, cannot delete")
    
    activity_media_result = await db.execute(
        select(ActivityMedia).where(ActivityMedia.media_asset_id == media_id)
    )
    if activity_media_result.scalar_one_or_none():
        raise ValidationException("Media is used in activities, cannot delete")
    
    media.deleted_at = datetime.now(timezone.utc)
    await db.commit()


@router.get("/lessons/{lesson_id}/media", response_model=List[MediaAssetResponse])
async def get_lesson_media(
    lesson_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """Get all media associated with a lesson."""
    user_roles = [ur.role.name for ur in current_user.user_roles]
    if "admin" not in user_roles and "parent" not in user_roles and "student" not in user_roles:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    result = await db.execute(
        select(MediaAsset)
        .join(LessonMedia, MediaAsset.id == LessonMedia.media_asset_id)
        .where(LessonMedia.lesson_id == lesson_id)
        .where(MediaAsset.deleted_at.is_(None))
        .order_by(LessonMedia.display_order)
    )
    return result.scalars().all()


@router.get("/activities/{activity_id}/media", response_model=List[MediaAssetResponse])
async def get_activity_media(
    activity_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """Get all media associated with an activity."""
    user_roles = [ur.role.name for ur in current_user.user_roles]
    if "admin" not in user_roles and "parent" not in user_roles and "student" not in user_roles:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    result = await db.execute(
        select(MediaAsset)
        .join(ActivityMedia, MediaAsset.id == ActivityMedia.media_asset_id)
        .where(ActivityMedia.activity_id == activity_id)
        .where(MediaAsset.deleted_at.is_(None))
        .order_by(ActivityMedia.display_order)
    )
    return result.scalars().all()