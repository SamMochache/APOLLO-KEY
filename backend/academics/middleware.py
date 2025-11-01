import logging

logger = logging.getLogger('academics')


class ThrottleLoggingMiddleware:
    """
    Log when users hit rate limits.
    Useful for monitoring abuse.
    """
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        response = self.get_response(request)
        
        # Log rate limit hits
        if response.status_code == 429:
            user = getattr(request, 'user', None)
            logger.warning(
                f"Rate limit hit: {user} | Path: {request.path} | IP: {request.META.get('REMOTE_ADDR')}"
            )
        
        return response