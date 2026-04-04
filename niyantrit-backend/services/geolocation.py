"""
Geolocation Service
Handles extraction of location data from EXIF, IP geolocation, and location verification.
"""

import requests
from typing import Dict, Optional, Tuple, List, Any
from datetime import datetime
import math

class GeolocationService:
    """Service for geolocation extraction and verification."""
    
    # Earth's radius in kilometers
    EARTH_RADIUS_KM = 6371
    
    def __init__(self, geoip_api_token: Optional[str] = None):
        """
        Initialize geolocation service.
        
        Args:
            geoip_api_token: Optional API token for GeoIP service
        """
        self.geoip_api_token = geoip_api_token
        self.geoip_url = "https://ipapi.co"  # Free GeoIP service
    
    def extract_location_from_exif(self, exif_data: Dict[str, Any]) -> Optional[Dict[str, float]]:
        """
        Extract latitude and longitude from EXIF data.
        
        Args:
            exif_data: EXIF metadata dictionary
            
        Returns:
            Dict with latitude and longitude, or None if not found
        """
        try:
            gps_latitude = None
            gps_longitude = None
            gps_altitude = None
            
            # Search for GPS info in EXIF data
            for key, value in exif_data.items():
                key_str = str(key).lower()
                value_str = str(value).lower()
                
                if 'gps' in key_str or 'latitude' in key_str:
                    if 'latitude' in key_str and 'ref' not in key_str:
                        gps_latitude = self._parse_gps_coordinate(str(value))
                
                if 'gps' in key_str or 'longitude' in key_str:
                    if 'longitude' in key_str and 'ref' not in key_str:
                        gps_longitude = self._parse_gps_coordinate(str(value))
                
                if 'altitude' in key_str and 'ref' not in key_str:
                    try:
                        gps_altitude = float(value)
                    except:
                        pass
            
            if gps_latitude is not None and gps_longitude is not None:
                return {
                    "latitude": gps_latitude,
                    "longitude": gps_longitude,
                    "altitude": gps_altitude,
                    "source": "EXIF"
                }
            
            return None
        
        except Exception as e:
            print(f"Error extracting location from EXIF: {str(e)}")
            return None
    
    def get_location_from_ip(self, ip_address: str) -> Optional[Dict[str, Any]]:
        """
        Get geolocation from IP address using GeoIP service.
        
        Args:
            ip_address: IP address to geolocate
            
        Returns:
            Dict with location information or None
        """
        try:
            # Use ipapi.co free service (no auth required)
            url = f"{self.geoip_url}/{ip_address}/json/"
            response = requests.get(url, timeout=5)
            response.raise_for_status()
            
            data = response.json()
            
            return {
                "latitude": float(data.get("latitude", 0)),
                "longitude": float(data.get("longitude", 0)),
                "city": data.get("city"),
                "region": data.get("region"),
                "country": data.get("country_name"),
                "country_code": data.get("country_code"),
                "timezone": data.get("timezone"),
                "isp": data.get("org"),
                "source": "IP_GEOLOCATION",
                "accuracy_radius_km": 50  # IP geolocation is typically accurate within 50km
            }
        
        except Exception as e:
            print(f"Error getting location from IP: {str(e)}")
            return None
    
    def verify_location_proximity(
        self,
        complaint_location: Dict[str, float],
        project_location: Dict[str, float],
        max_distance_km: float = 10.0
    ) -> Dict[str, Any]:
        """
        Verify if complaint location is near project location.
        
        Args:
            complaint_location: Dict with latitude/longitude of complaint
            project_location: Dict with latitude/longitude of project
            max_distance_km: Maximum allowed distance in kilometers
            
        Returns:
            Dict with verification results
        """
        try:
            distance = self.calculate_distance(
                complaint_location["latitude"],
                complaint_location["longitude"],
                project_location["latitude"],
                project_location["longitude"]
            )
            
            is_valid = distance <= max_distance_km
            
            return {
                "distance_km": round(distance, 2),
                "is_valid": is_valid,
                "max_distance_km": max_distance_km,
                "flags": [] if is_valid else [
                    f"Complaint location is {distance:.1f}km away from project"
                ],
                "recommendations": [] if is_valid else [
                    "Verify that complainant was at project location when filing",
                    "Request photos/video from project location",
                    "Escalate to official for verification"
                ]
            }
        
        except Exception as e:
            print(f"Error verifying location proximity: {str(e)}")
            return {
                "distance_km": None,
                "is_valid": None,
                "error": str(e)
            }
    
    def calculate_distance(
        self,
        lat1: float,
        lon1: float,
        lat2: float,
        lon2: float
    ) -> float:
        """
        Calculate distance between two GPS coordinates using Haversine formula.
        
        Args:
            lat1, lon1: First coordinate (latitude, longitude)
            lat2, lon2: Second coordinate (latitude, longitude)
            
        Returns:
            Distance in kilometers
        """
        try:
            # Convert to radians
            lat1_rad = math.radians(lat1)
            lon1_rad = math.radians(lon1)
            lat2_rad = math.radians(lat2)
            lon2_rad = math.radians(lon2)
            
            # Haversine formula
            dlat = lat2_rad - lat1_rad
            dlon = lon2_rad - lon1_rad
            
            a = math.sin(dlat/2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon/2)**2
            c = 2 * math.asin(math.sqrt(a))
            
            distance = self.EARTH_RADIUS_KM * c
            return distance
        
        except Exception as e:
            print(f"Error calculating distance: {str(e)}")
            return float('inf')
    
    def geocode_address(self, address: str) -> Optional[Dict[str, float]]:
        """
        Convert address to coordinates using geocoding.
        
        Args:
            address: Street address to geocode
            
        Returns:
            Dict with latitude/longitude or None
        """
        try:
            # Using Nominatim (OpenStreetMap) free geocoding service
            url = "https://nominatim.openstreetmap.org/search"
            params = {
                "q": address,
                "format": "json",
                "limit": 1
            }
            
            # Add User-Agent as required by Nominatim
            headers = {
                "User-Agent": "Niyantrit-Complaint-System/1.0"
            }
            
            response = requests.get(url, params=params, headers=headers, timeout=5)
            response.raise_for_status()
            
            results = response.json()
            
            if results:
                result = results[0]
                return {
                    "latitude": float(result["lat"]),
                    "longitude": float(result["lon"]),
                    "display_name": result.get("display_name"),
                    "address": address,
                    "source": "GEOCODING"
                }
            
            return None
        
        except Exception as e:
            print(f"Error geocoding address: {str(e)}")
            return None
    
    def reverse_geocode_coordinates(
        self,
        latitude: float,
        longitude: float
    ) -> Optional[Dict[str, Any]]:
        """
        Convert coordinates to address using reverse geocoding.
        
        Args:
            latitude: Latitude coordinate
            longitude: Longitude coordinate
            
        Returns:
            Dict with address information or None
        """
        try:
            # Using Nominatim reverse geocoding
            url = "https://nominatim.openstreetmap.org/reverse"
            params = {
                "lat": latitude,
                "lon": longitude,
                "format": "json"
            }
            
            headers = {
                "User-Agent": "Niyantrit-Complaint-System/1.0"
            }
            
            response = requests.get(url, params=params, headers=headers, timeout=5)
            response.raise_for_status()
            
            data = response.json()
            
            if data and "address" in data:
                address = data["address"]
                return {
                    "display_name": data.get("display_name"),
                    "address": address,
                    "latitude": latitude,
                    "longitude": longitude,
                    "city": address.get("city") or address.get("town"),
                    "region": address.get("state") or address.get("province"),
                    "country": address.get("country"),
                    "postcode": address.get("postcode"),
                    "source": "REVERSE_GEOCODING"
                }
            
            return None
        
        except Exception as e:
            print(f"Error reverse geocoding: {str(e)}")
            return None
    
    def get_location_context(self, latitude: float, longitude: float) -> Dict[str, Any]:
        """
        Get comprehensive location context for a coordinate.
        
        Args:
            latitude: Latitude coordinate
            longitude: Longitude coordinate
            
        Returns:
            Dict with address and location information
        """
        try:
            address_info = self.reverse_geocode_coordinates(latitude, longitude)
            
            return {
                "latitude": latitude,
                "longitude": longitude,
                "location_info": address_info,
                "map_url": f"https://www.openstreetmap.org/?mlat={latitude}&mlon={longitude}&zoom=17",
                "google_maps_url": f"https://maps.google.com/?q={latitude},{longitude}",
                "timestamp": datetime.utcnow().isoformat()
            }
        
        except Exception as e:
            print(f"Error getting location context: {str(e)}")
            return {
                "latitude": latitude,
                "longitude": longitude,
                "error": str(e)
            }
    
    def _parse_gps_coordinate(self, coord_str: str) -> Optional[float]:
        """
        Parse GPS coordinate from string format.
        
        Common formats:
        - "40.123456" (decimal degrees)
        - "40° 7' 25.0\" N" (degrees, minutes, seconds)
        - "(40.123456, -73.456789)" (tuple)
        """
        try:
            coord_str = str(coord_str).strip()
            
            # Handle decimal degrees format
            if '°' in coord_str or "'" in coord_str:
                # Degrees, minutes, seconds format
                # Extract numbers
                import re
                numbers = re.findall(r"[-+]?\d+\.?\d*", coord_str)
                
                if len(numbers) >= 2:
                    degrees = float(numbers[0])
                    minutes = float(numbers[1])
                    seconds = float(numbers[2]) if len(numbers) > 2 else 0
                    
                    # Convert to decimal degrees
                    decimal = degrees + minutes/60 + seconds/3600
                    
                    # Apply negative sign if present
                    if 'S' in coord_str or 'W' in coord_str or degrees < 0:
                        decimal = -abs(decimal)
                    
                    return decimal
            else:
                # Try simple float conversion
                return float(coord_str)
        
        except Exception as e:
            print(f"Error parsing GPS coordinate: {str(e)}")
            return None


# Singleton instance
_geolocation_service = None

def get_geolocation_service(geoip_api_token: Optional[str] = None) -> GeolocationService:
    """Get or create geolocation service singleton."""
    global _geolocation_service
    if _geolocation_service is None:
        _geolocation_service = GeolocationService(geoip_api_token)
    return _geolocation_service


# Convenience functions
def extract_location_from_exif(exif_data: Dict) -> Optional[Dict[str, float]]:
    """Extract location from EXIF data."""
    return get_geolocation_service().extract_location_from_exif(exif_data)

def get_location_from_ip(ip_address: str) -> Optional[Dict[str, Any]]:
    """Get location from IP address."""
    return get_geolocation_service().get_location_from_ip(ip_address)

def verify_location_proximity(
    complaint_location: Dict,
    project_location: Dict,
    max_distance_km: float = 10.0
) -> Dict[str, Any]:
    """Verify location proximity."""
    return get_geolocation_service().verify_location_proximity(
        complaint_location, project_location, max_distance_km
    )

def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance between coordinates."""
    return get_geolocation_service().calculate_distance(lat1, lon1, lat2, lon2)

def geocode_address(address: str) -> Optional[Dict]:
    """Geocode address to coordinates."""
    return get_geolocation_service().geocode_address(address)

def reverse_geocode_coordinates(latitude: float, longitude: float) -> Optional[Dict]:
    """Reverse geocode coordinates to address."""
    return get_geolocation_service().reverse_geocode_coordinates(latitude, longitude)
