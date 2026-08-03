"""
Media processing service for thumbnails, metadata extraction, and file handling.
"""
import os
import hashlib
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict, Any, Tuple, List
from PIL import Image, ImageOps
try:
    from pillow_heif import register_heif_opener
    register_heif_opener()
except ImportError:
    pass
import exifread
import structlog
import magic
import imagehash

from app.core.config import settings


logger = structlog.get_logger()


# Supported file extensions
PHOTO_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.heif', '.bmp', '.tiff', '.raw', '.cr2', '.nef', '.arw'}
VIDEO_EXTENSIONS = {'.mp4', '.mov', '.avi', '.mkv', '.webm', '.m4v', '.wmv', '.flv'}
SUPPORTED_EXTENSIONS = PHOTO_EXTENSIONS | VIDEO_EXTENSIONS


def get_file_hash(file_path: str) -> str:
    """Calculate SHA-256 hash of a file."""
    sha256_hash = hashlib.sha256()
    with open(file_path, "rb") as f:
        for byte_block in iter(lambda: f.read(4096), b""):
            sha256_hash.update(byte_block)
    return sha256_hash.hexdigest()


def get_perceptual_hash(image_path: str) -> Optional[str]:
    """Calculate perceptual hash for duplicate detection."""
    try:
        image = Image.open(image_path)
        phash = imagehash.phash(image)
        return str(phash)
    except Exception as e:
        logger.warning(f"Failed to calculate perceptual hash: {e}")
        return None


def get_mime_type(file_path: str) -> str:
    """Get MIME type of a file."""
    try:
        mime = magic.Magic(mime=True)
        return mime.from_file(file_path)
    except Exception:
        # Fallback based on extension
        ext = Path(file_path).suffix.lower()
        mime_map = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.webp': 'image/webp',
            '.heic': 'image/heic',
            '.mp4': 'video/mp4',
            '.mov': 'video/quicktime',
            '.avi': 'video/x-msvideo',
        }
        return mime_map.get(ext, 'application/octet-stream')


def get_media_type(file_path: str) -> str:
    """Determine if file is photo or video."""
    ext = Path(file_path).suffix.lower()
    if ext in PHOTO_EXTENSIONS:
        return "photo"
    elif ext in VIDEO_EXTENSIONS:
        return "video"
    return "unknown"


def extract_exif_data(image_path: str) -> Dict[str, Any]:
    """Extract EXIF metadata from an image."""
    exif_data = {}
    
    try:
        with open(image_path, 'rb') as f:
            tags = exifread.process_file(f, details=False)
        
        # Date taken
        date_tags = ['EXIF DateTimeOriginal', 'EXIF DateTimeDigitized', 'Image DateTime']
        for tag in date_tags:
            if tag in tags:
                try:
                    date_str = str(tags[tag])
                    exif_data['taken_at'] = datetime.strptime(date_str, '%Y:%m:%d %H:%M:%S')
                    break
                except ValueError:
                    pass
        
        # Camera info
        if 'Image Make' in tags:
            exif_data['camera_make'] = str(tags['Image Make']).strip()
        if 'Image Model' in tags:
            exif_data['camera_model'] = str(tags['Image Model']).strip()
        if 'EXIF LensModel' in tags:
            exif_data['lens_model'] = str(tags['EXIF LensModel']).strip()
        
        # Camera settings
        if 'EXIF FocalLength' in tags:
            try:
                focal = tags['EXIF FocalLength'].values[0]
                exif_data['focal_length'] = float(focal.num) / float(focal.den)
            except:
                pass
        
        if 'EXIF FNumber' in tags:
            try:
                fnum = tags['EXIF FNumber'].values[0]
                exif_data['aperture'] = float(fnum.num) / float(fnum.den)
            except:
                pass
        
        if 'EXIF ISOSpeedRatings' in tags:
            try:
                exif_data['iso'] = int(str(tags['EXIF ISOSpeedRatings']))
            except:
                pass
        
        if 'EXIF ExposureTime' in tags:
            try:
                exp = tags['EXIF ExposureTime'].values[0]
                if exp.den == 1:
                    exif_data['shutter_speed'] = f"{exp.num}s"
                else:
                    exif_data['shutter_speed'] = f"1/{exp.den}"
            except:
                pass
        
        # GPS coordinates
        gps_data = extract_gps_data(tags)
        if gps_data:
            exif_data.update(gps_data)
        
    except Exception as e:
        logger.warning(f"Failed to extract EXIF data from {image_path}: {e}")
    
    return exif_data


def extract_gps_data(tags: dict) -> Optional[Dict[str, float]]:
    """Extract GPS coordinates from EXIF tags."""
    try:
        gps_latitude = tags.get('GPS GPSLatitude')
        gps_latitude_ref = tags.get('GPS GPSLatitudeRef')
        gps_longitude = tags.get('GPS GPSLongitude')
        gps_longitude_ref = tags.get('GPS GPSLongitudeRef')
        gps_altitude = tags.get('GPS GPSAltitude')
        
        if not (gps_latitude and gps_longitude):
            return None
        
        def convert_to_degrees(value):
            d = float(value.values[0].num) / float(value.values[0].den)
            m = float(value.values[1].num) / float(value.values[1].den)
            s = float(value.values[2].num) / float(value.values[2].den)
            return d + (m / 60.0) + (s / 3600.0)
        
        lat = convert_to_degrees(gps_latitude)
        if gps_latitude_ref and str(gps_latitude_ref) == 'S':
            lat = -lat
        
        lon = convert_to_degrees(gps_longitude)
        if gps_longitude_ref and str(gps_longitude_ref) == 'W':
            lon = -lon
        
        result = {'latitude': lat, 'longitude': lon}
        
        if gps_altitude:
            try:
                alt = float(gps_altitude.values[0].num) / float(gps_altitude.values[0].den)
                result['altitude'] = alt
            except:
                pass
        
        return result
        
    except Exception as e:
        logger.warning(f"Failed to extract GPS data: {e}")
        return None


def get_image_dimensions(image_path: str) -> Tuple[int, int]:
    """Get image dimensions."""
    try:
        with Image.open(image_path) as img:
            return img.size
    except Exception as e:
        logger.warning(f"Failed to get image dimensions: {e}")
        return (0, 0)


def get_video_metadata(video_path: str) -> Dict[str, Any]:
    """Extract metadata from a video file."""
    metadata = {}
    
    try:
        import ffmpeg
        
        probe = ffmpeg.probe(video_path)
        
        # Get video stream info
        video_stream = next(
            (s for s in probe['streams'] if s['codec_type'] == 'video'),
            None
        )
        
        if video_stream:
            metadata['width'] = int(video_stream.get('width', 0))
            metadata['height'] = int(video_stream.get('height', 0))
            
            # Duration
            if 'duration' in video_stream:
                metadata['duration'] = float(video_stream['duration'])
            elif 'duration' in probe.get('format', {}):
                metadata['duration'] = float(probe['format']['duration'])
        
        # Creation time
        format_tags = probe.get('format', {}).get('tags', {})
        creation_time = format_tags.get('creation_time')
        if creation_time:
            try:
                metadata['taken_at'] = datetime.fromisoformat(creation_time.replace('Z', '+00:00'))
            except:
                pass
        
    except Exception as e:
        logger.warning(f"Failed to extract video metadata from {video_path}: {e}")
    
    return metadata


def _generate_thumbnail_via_ffmpeg(image_path: str, output_path: str, size: int) -> bool:
    """Use ffmpeg to extract+resize a single frame — fallback for formats PIL can't open (e.g. HEIC)."""
    try:
        import subprocess
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        # scale=W:H:force_original_aspect_ratio=decrease fits within size×size (same as PIL thumbnail)
        result = subprocess.run(
            [
                "ffmpeg", "-y", "-i", image_path,
                "-vf", f"scale={size}:{size}:force_original_aspect_ratio=decrease",
                "-frames:v", "1",
                "-update", "1",
                output_path,
            ],
            capture_output=True,
            timeout=60,
        )
        return result.returncode == 0 and os.path.exists(output_path)
    except Exception as e:
        logger.error(f"ffmpeg thumbnail fallback failed for {image_path}: {e}")
        return False


def generate_thumbnail(
    image_path: str,
    output_path: str,
    size: int,
    quality: int = 85
) -> bool:
    """Generate a thumbnail for an image."""
    try:
        with Image.open(image_path) as img:
            # Apply EXIF orientation so portrait/rotated photos display correctly
            img = ImageOps.exif_transpose(img)

            # Convert to RGB if necessary (RGBA, palette, etc.)
            if img.mode not in ('RGB',):
                img = img.convert('RGB')

            # Maintain aspect ratio, fit within size×size
            img.thumbnail((size, size), Image.Resampling.LANCZOS)

            # Ensure output directory exists
            os.makedirs(os.path.dirname(output_path), exist_ok=True)

            # Save thumbnail
            img.save(output_path, 'JPEG', quality=quality, optimize=True)

            return True

    except Exception as e:
        logger.warning(f"PIL failed for {image_path} ({e}), trying ffmpeg fallback")
        return _generate_thumbnail_via_ffmpeg(image_path, output_path, size)


def generate_video_thumbnail(
    video_path: str,
    output_path: str,
    size: int,
    timestamp: float = 1.0
) -> bool:
    """Generate a thumbnail from a video frame."""
    import subprocess

    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    # Determine a sensible seek position: 10% of duration, clamped to [0.5s, 5s].
    # Seeking before -i (input-side) is fast and avoids decoding every frame.
    seek = timestamp
    try:
        probe = subprocess.run(
            ["ffprobe", "-v", "quiet", "-show_entries", "format=duration",
             "-of", "csv=p=0", video_path],
            capture_output=True, text=True, timeout=15,
        )
        if probe.returncode == 0 and probe.stdout.strip():
            duration = float(probe.stdout.strip())
            seek = max(0.5, min(5.0, duration * 0.1))
    except Exception:
        seek = 0.5  # safe fallback

    try:
        result = subprocess.run(
            [
                "ffmpeg", "-y",
                "-ss", str(seek),          # input-side seek — fast key-frame seek
                "-i", video_path,
                "-vf", f"scale={size}:{size}:force_original_aspect_ratio=decrease",
                "-frames:v", "1",
                "-update", "1",
                output_path,
            ],
            capture_output=True,
            timeout=60,
        )
        return result.returncode == 0 and os.path.exists(output_path)
    except Exception as e:
        logger.error(f"Failed to generate video thumbnail for {video_path}: {e}")
        return False


def generate_all_thumbnails(
    media_path: str,
    media_id: str,
    media_type: str
) -> Dict[str, str]:
    """Generate all thumbnail sizes for a media file."""
    thumbnails = {}
    
    thumbnail_base = os.path.join(settings.THUMBNAIL_PATH, media_id[:2], media_id[2:4])
    os.makedirs(thumbnail_base, exist_ok=True)
    
    sizes = {
        'small': settings.THUMBNAIL_SIZES[0],
        'medium': settings.THUMBNAIL_SIZES[1] if len(settings.THUMBNAIL_SIZES) > 1 else 300,
        'large': settings.THUMBNAIL_SIZES[2] if len(settings.THUMBNAIL_SIZES) > 2 else 600,
    }
    
    for name, size in sizes.items():
        output_path = os.path.join(thumbnail_base, f"{media_id}_{name}.jpg")
        
        if media_type == "photo":
            success = generate_thumbnail(media_path, output_path, size)
        else:
            success = generate_video_thumbnail(media_path, output_path, size)
        
        if success:
            thumbnails[f'thumbnail_{name}'] = output_path
    
    return thumbnails


def process_media_file(file_path: str) -> Dict[str, Any]:
    """Process a media file and extract all metadata."""
    result = {
        'filename': os.path.basename(file_path),
        'original_path': file_path,
        'file_size': os.path.getsize(file_path),
        'mime_type': get_mime_type(file_path),
        'media_type': get_media_type(file_path),
        'file_hash': get_file_hash(file_path),
    }
    
    if result['media_type'] == 'photo':
        # Get dimensions
        width, height = get_image_dimensions(file_path)
        result['width'] = width
        result['height'] = height
        
        # Get EXIF data
        exif_data = extract_exif_data(file_path)
        result.update(exif_data)
        
    elif result['media_type'] == 'video':
        # Get video metadata
        video_data = get_video_metadata(file_path)
        result.update(video_data)
    
    return result


def scan_directory(
    directory: str,
    recursive: bool = True
) -> List[str]:
    """Scan a directory for supported media files."""
    media_files = []
    
    if recursive:
        for root, dirs, files in os.walk(directory):
            # Skip hidden directories
            dirs[:] = [d for d in dirs if not d.startswith('.')]
            
            for file in files:
                if file.startswith('.'):
                    continue
                
                ext = Path(file).suffix.lower()
                if ext in SUPPORTED_EXTENSIONS:
                    media_files.append(os.path.join(root, file))
    else:
        for file in os.listdir(directory):
            if file.startswith('.'):
                continue
            
            file_path = os.path.join(directory, file)
            if os.path.isfile(file_path):
                ext = Path(file).suffix.lower()
                if ext in SUPPORTED_EXTENSIONS:
                    media_files.append(file_path)
    
    return media_files
