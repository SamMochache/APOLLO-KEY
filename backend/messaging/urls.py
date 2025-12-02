# backend/messaging/urls.py
from rest_framework.routers import DefaultRouter
from .views import MessageViewSet

router = DefaultRouter()
router.register(r'messages', MessageViewSet, basename='message')

urlpatterns = router.urls
