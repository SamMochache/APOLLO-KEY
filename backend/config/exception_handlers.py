from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status


def custom_exception_handler(exc, context):
    """
    Custom exception handler to provide better error messages.
    """
    response = exception_handler(exc, context)
    
    # Handle throttling errors
    if response is not None and response.status_code == 429:
        custom_response_data = {
            'error': 'Rate limit exceeded',
            'message': 'Too many requests. Please slow down and try again later.',
            'detail': response.data.get('detail', ''),
            'retry_after': response.get('Retry-After', 'unknown')
        }
        response.data = custom_response_data
    
    return response