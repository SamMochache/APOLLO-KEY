from rest_framework.throttling import UserRateThrottle, AnonRateThrottle


class BurstRateThrottle(UserRateThrottle):
    """
    Short-term burst protection.
    Prevents rapid-fire requests.
    """
    scope = 'burst'


class SustainedRateThrottle(UserRateThrottle):
    """
    Long-term sustained rate limiting.
    Daily usage cap.
    """
    scope = 'sustained'


class BulkOperationThrottle(UserRateThrottle):
    """
    Stricter limits for bulk operations.
    Prevents abuse of resource-intensive endpoints.
    """
    rate = '10/hour'  # Only 10 bulk operations per hour

class LoginRateThrottle(AnonRateThrottle):
    """
    Prevents brute force login attacks.
    Very strict rate limiting.
    """
    scope = 'login'
    
    def get_cache_key(self, request, view):
        """
        Use IP address + username for rate limiting.
        Prevents same user from being locked out across different IPs.
        """
        ident = self.get_ident(request)
        username = request.data.get('email', 'unknown')
        return self.cache_format % {
            'scope': self.scope,
            'ident': f"{ident}_{username}"
        }