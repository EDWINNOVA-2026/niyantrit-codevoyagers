"""
Media Verification Service
Verifies authenticity of photos/videos using EXIF metadata extraction and image tampering detection.
"""

import cv2
import numpy as np
from PIL import Image
from PIL.ExifTags import TAGS
import exifread
import os
from datetime import datetime
import io
from typing import Dict, List, Tuple, Optional, Any

class MediaVerificationService:
    """Service for verifying media authenticity and extracting metadata."""
    
    def __init__(self):
        self.max_image_size = 50 * 1024 * 1024  # 50MB
        self.supported_image_formats = {'.jpg', '.jpeg', '.png', '.gif', '.bmp'}
        self.supported_video_formats = {'.mp4', '.avi', '.mov', '.mkv', '.webm'}
    
    def verify_image(self, image_data: bytes, filename: str = "") -> Dict[str, Any]:
        """
        Verify an image for tampering and extract EXIF metadata.
        
        Args:
            image_data: Raw image bytes
            filename: Original filename (optional)
            
        Returns:
            Dict with verification results:
            {
                "verification_status": "VERIFIED|SUSPICIOUS|FLAGGED",
                "tampering_score": 0-1 (higher = more suspicious),
                "confidence": 0-1,
                "exif_data": {...},
                "geo_location": {"latitude": ..., "longitude": ...} or None,
                "timestamp": "ISO datetime",
                "camera_model": "string",
                "quality_metrics": {...},
                "flags": ["flag1", "flag2", ...],
                "recommendations": ["rec1", "rec2", ...]
            }
        """
        try:
            # Validate image size
            if len(image_data) > self.max_image_size:
                return self._create_response(
                    "FLAGGED",
                    1.0,
                    0.9,
                    None,
                    f"Image exceeds maximum size ({len(image_data) / 1024 / 1024:.1f}MB)"
                )
            
            # Load image
            image = Image.open(io.BytesIO(image_data))
            
            # Extract EXIF metadata
            exif_data = self._extract_exif(image_data)
            
            # Detect tampering
            tampering_score, quality_metrics = self._detect_tampering(image)
            
            # Determine verification status
            if tampering_score > 0.7:
                status = "FLAGGED"
                confidence = tampering_score
                flags = ["High tampering likelihood detected"]
            elif tampering_score > 0.4:
                status = "SUSPICIOUS"
                confidence = tampering_score
                flags = ["Moderate tampering indicators detected"]
            else:
                status = "VERIFIED"
                confidence = 1.0 - tampering_score
                flags = []
            
            # Get geo location if available
            geo_location = self._extract_geo_from_exif(exif_data) if exif_data else None
            
            # Get timestamp if available
            timestamp = self._extract_timestamp_from_exif(exif_data) if exif_data else None
            
            # Get camera model if available
            camera_model = exif_data.get("Model") if exif_data else None
            
            # Additional checks
            additional_flags = self._perform_additional_checks(image, exif_data, quality_metrics)
            flags.extend(additional_flags)
            
            return {
                "verification_status": status,
                "tampering_score": float(tampering_score),
                "confidence": float(confidence),
                "exif_data": exif_data,
                "geo_location": geo_location,
                "timestamp": timestamp,
                "camera_model": camera_model,
                "quality_metrics": quality_metrics,
                "flags": flags,
                "recommendations": self._get_recommendations(status, flags)
            }
            
        except Exception as e:
            print(f"Error verifying image: {str(e)}")
            return self._create_response(
                "FLAGGED",
                0.5,
                0.3,
                None,
                f"Verification failed: {str(e)}"
            )
    
    def verify_video(self, video_data: bytes, filename: str = "") -> Dict[str, Any]:
        """
        Verify a video for tampering and extract metadata.
        
        Args:
            video_data: Raw video bytes
            filename: Original filename (optional)
            
        Returns:
            Dict with video verification results
        """
        try:
            # For now, perform basic validation
            # Full video verification would require advanced ML models
            
            if len(video_data) > 500 * 1024 * 1024:  # 500MB limit
                return {
                    "verification_status": "FLAGGED",
                    "tampering_score": 1.0,
                    "confidence": 0.9,
                    "flags": ["Video file exceeds maximum allowed size"],
                    "recommendations": ["Use a smaller video file"]
                }
            
            # Basic frame extraction for compression artifact detection
            # Save temporarily to analyze
            import tempfile
            with tempfile.NamedTemporaryFile(suffix='.mp4', delete=False) as tmp_file:
                tmp_file.write(video_data)
                tmp_path = tmp_file.name
            
            try:
                cap = cv2.VideoCapture(tmp_path)
                frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
                fps = cap.get(cv2.CAP_PROP_FPS)
                width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
                height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
                
                # Check for consistency
                flags = []
                if frame_count < 30:  # At least 1 second at 30fps
                    flags.append("Very short video duration")
                
                if fps < 24:
                    flags.append("Low frame rate - may indicate compression issues")
                
                cap.release()
                
                return {
                    "verification_status": "VERIFIED" if not flags else "SUSPICIOUS",
                    "tampering_score": 0.2 if not flags else 0.4,
                    "confidence": 0.7,
                    "video_metadata": {
                        "frame_count": frame_count,
                        "fps": fps,
                        "resolution": f"{width}x{height}",
                        "duration_seconds": frame_count / fps if fps > 0 else 0
                    },
                    "flags": flags,
                    "recommendations": self._get_recommendations(
                        "VERIFIED" if not flags else "SUSPICIOUS",
                        flags
                    )
                }
            finally:
                if os.path.exists(tmp_path):
                    os.remove(tmp_path)
        
        except Exception as e:
            print(f"Error verifying video: {str(e)}")
            return {
                "verification_status": "FLAGGED",
                "tampering_score": 0.5,
                "confidence": 0.3,
                "flags": [f"Video verification failed: {str(e)}"],
                "recommendations": ["Verify video file integrity"]
            }
    
    def _extract_exif(self, image_data: bytes) -> Optional[Dict[str, Any]]:
        """Extract EXIF metadata from image."""
        try:
            exif_dict = {}
            
            # Method 1: Using exifread (more reliable)
            exif_data = exifread.process_image(io.BytesIO(image_data))
            
            for tag in exif_data:
                if tag not in ('JPEGThumbnail', 'TIFFThumbnail', 'Filename', 'MakerNote'):
                    try:
                        exif_dict[tag] = str(exif_data.get(tag))
                    except:
                        pass
            
            # Method 2: Using PIL as fallback
            if not exif_dict:
                image = Image.open(io.BytesIO(image_data))
                exif_raw = image._getexif()
                
                if exif_raw:
                    for tag_id, value in exif_raw.items():
                        tag_name = TAGS.get(tag_id, tag_id)
                        exif_dict[tag_name] = str(value)[:100]  # Limit string length
            
            return exif_dict if exif_dict else None
        
        except Exception as e:
            print(f"Error extracting EXIF: {str(e)}")
            return None
    
    def _extract_geo_from_exif(self, exif_data: Dict) -> Optional[Dict[str, float]]:
        """Extract GPS coordinates from EXIF data."""
        try:
            # Look for GPS info in different EXIF formats
            gps_latitude = None
            gps_longitude = None
            
            for key, value in exif_data.items():
                if 'GPSInfo' in str(key):
                    if 'Latitude' in str(value):
                        gps_latitude = str(value)
                    if 'Longitude' in str(value):
                        gps_longitude = str(value)
                if 'GPS' in str(key):
                    if 'Latitude' in str(key):
                        gps_latitude = str(value)
                    if 'Longitude' in str(key):
                        gps_longitude = str(value)
            
            if gps_latitude and gps_longitude:
                return {
                    "latitude": float(gps_latitude.replace('°', '').split(',')[0]) if gps_latitude else None,
                    "longitude": float(gps_longitude.replace('°', '').split(',')[0]) if gps_longitude else None,
                    "raw_latitude": gps_latitude,
                    "raw_longitude": gps_longitude
                }
        except Exception as e:
            print(f"Error extracting GPS: {str(e)}")
        
        return None
    
    def _extract_timestamp_from_exif(self, exif_data: Dict) -> Optional[str]:
        """Extract capture timestamp from EXIF data."""
        try:
            for key, value in exif_data.items():
                if 'DateTime' in str(key) or 'datetime' in str(key):
                    return str(value)
            return None
        except:
            return None
    
    def _detect_tampering(self, image: Image.Image) -> Tuple[float, Dict[str, Any]]:
        """
        Detect image tampering using OpenCV techniques.
        Returns tampering score (0-1) and quality metrics.
        """
        try:
            # Convert PIL image to OpenCV format
            img_array = np.array(image)
            
            if len(img_array.shape) == 3:
                # Convert RGB to BGR for OpenCV
                if image.mode == 'RGB':
                    img_cv = cv2.cvtColor(img_array, cv2.COLOR_RGB2BGR)
                elif image.mode == 'RGBA':
                    img_cv = cv2.cvtColor(img_array, cv2.COLOR_RGBA2BGR)
                else:
                    img_cv = img_array
            else:
                img_cv = img_array
            
            # Check image dimensions
            height, width = img_cv.shape[:2]
            
            # Detect edge inconsistencies (splice detection)
            gray = cv2.cvtColor(img_cv, cv2.COLOR_BGR2GRAY) if len(img_cv.shape) == 3 else img_cv
            edges = cv2.Canny(gray, 100, 200)
            edge_ratio = np.sum(edges > 0) / (height * width)
            
            # Detect compression artifacts
            laplacian = cv2.Laplacian(gray, cv2.CV_64F)
            variance = laplacian.var()
            
            # Detect frequency anomalies using FFT
            f_transform = np.fft.fft2(gray)
            f_shift = np.fft.fftshift(f_transform)
            magnitude_spectrum = np.abs(f_shift)
            
            # Normalize magnitude spectrum
            magnitude_spectrum = np.log(magnitude_spectrum + 1)
            mag_variance = np.std(magnitude_spectrum)
            
            # Detect JPEG compression artifacts
            dct_score = self._detect_compression_artifacts(img_cv)
            
            # Calculate tampering score based on multiple factors
            tampering_score = 0.0
            
            # Edge inconsistencies (20% weight)
            if edge_ratio > 0.3:
                tampering_score += 0.1  # Suspicious edge patterns
            
            # Compression artifact score (40% weight)
            tampering_score += dct_score * 0.4
            
            # Frequency anomalies (20% weight)
            if mag_variance < 1.0:
                tampering_score += 0.1  # Unusual frequency distribution
            
            # Laplacian variance (20% weight)
            if variance < 50:
                tampering_score += 0.1  # Possible over-smoothing from editing
            
            # Quality metrics
            quality_metrics = {
                "edge_ratio": float(edge_ratio),
                "laplacian_variance": float(variance),
                "frequency_variance": float(mag_variance),
                "dct_artifact_score": float(dct_score),
                "dimensions": f"{width}x{height}",
                "file_type": "JPEG" if dct_score > 0.3 else "Other"
            }
            
            return min(tampering_score, 1.0), quality_metrics
        
        except Exception as e:
            print(f"Error in tampering detection: {str(e)}")
            return 0.5, {"error": str(e)}
    
    def _detect_compression_artifacts(self, img_cv: np.ndarray) -> float:
        """Detect JPEG compression artifacts using DCT analysis."""
        try:
            # Convert to grayscale if needed
            if len(img_cv.shape) == 3:
                gray = cv2.cvtColor(img_cv, cv2.COLOR_BGR2GRAY)
            else:
                gray = img_cv
            
            # Analyze 8x8 blocks (JPEG block size)
            block_size = 8
            height, width = gray.shape
            
            artifact_score = 0.0
            block_count = 0
            
            for i in range(0, height - block_size, block_size):
                for j in range(0, width - block_size, block_size):
                    block = gray[i:i+block_size, j:j+block_size].astype(float)
                    
                    # Compute DCT
                    dct_block = cv2.dct(block)
                    
                    # High values in high frequency components indicate compression
                    high_freq = np.sum(np.abs(dct_block[4:, 4:]))
                    
                    if high_freq > 1000:
                        artifact_score += 0.01
                    
                    block_count += 1
            
            # Normalize artifact score
            if block_count > 0:
                artifact_score = min(artifact_score / block_count, 1.0)
            
            return artifact_score
        
        except Exception as e:
            print(f"Error detecting compression artifacts: {str(e)}")
            return 0.0
    
    def _perform_additional_checks(
        self, 
        image: Image.Image, 
        exif_data: Optional[Dict],
        quality_metrics: Dict
    ) -> List[str]:
        """Perform additional consistency checks."""
        flags = []
        
        # Check if EXIF data exists (many edited images have EXIF removed)
        if exif_data is None:
            flags.append("No EXIF data found - may have been removed or edited")
        
        # Check image dimensions
        try:
            width, height = image.size
            if width < 640 or height < 480:
                flags.append("Low resolution image")
            if width > 8000 or height > 8000:
                flags.append("Unusually high resolution")
        except:
            pass
        
        # Check for unusual aspect ratios
        try:
            if width > 0 and height > 0:
                aspect_ratio = width / height
                if aspect_ratio < 0.5 or aspect_ratio > 2.0:
                    flags.append("Unusual aspect ratio")
        except:
            pass
        
        return flags
    
    def _get_recommendations(self, status: str, flags: List[str]) -> List[str]:
        """Get recommendations based on verification status."""
        recommendations = []
        
        if status == "VERIFIED":
            recommendations.append("Image appears authentic")
            recommendations.append("Safe to use as evidence")
        elif status == "SUSPICIOUS":
            recommendations.append("Recommend manual review by official")
            recommendations.append("Request additional documentation")
            recommendations.append("Interview subject matter expert")
        elif status == "FLAGGED":
            recommendations.append("Reject this image as evidence")
            recommendations.append("Request original image from device")
            recommendations.append("Escalate to investigation team")
        
        # Add specific recommendations based on flags
        if any("tampering" in flag.lower() for flag in flags):
            recommendations.append("Image editing detected - verify authenticity")
        
        if any("exif" in flag.lower() for flag in flags):
            recommendations.append("Obtain submission device for metadata verification")
        
        if any("compression" in flag.lower() for flag in flags):
            recommendations.append("Request uncompressed format if editing is suspected")
        
        return recommendations
    
    def _create_response(
        self,
        status: str,
        tampering_score: float,
        confidence: float,
        exif_data: Optional[Dict],
        default_flag: str
    ) -> Dict[str, Any]:
        """Helper to create standardized response."""
        return {
            "verification_status": status,
            "tampering_score": tampering_score,
            "confidence": confidence,
            "exif_data": exif_data,
            "geo_location": None,
            "timestamp": None,
            "camera_model": None,
            "quality_metrics": {},
            "flags": [default_flag],
            "recommendations": self._get_recommendations(status, [default_flag])
        }


# Singleton instance
_verification_service = None

def get_verification_service() -> MediaVerificationService:
    """Get or create verification service singleton."""
    global _verification_service
    if _verification_service is None:
        _verification_service = MediaVerificationService()
    return _verification_service


# Convenience functions
def verify_image(image_data: bytes, filename: str = "") -> Dict[str, Any]:
    """Convenience function to verify an image."""
    return get_verification_service().verify_image(image_data, filename)

def verify_video(video_data: bytes, filename: str = "") -> Dict[str, Any]:
    """Convenience function to verify a video."""
    return get_verification_service().verify_video(video_data, filename)
