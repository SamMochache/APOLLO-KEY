from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.conf import settings
from django.core.validators import FileExtensionValidator
from PIL import Image

User = get_user_model()

# ✅ Registration Serializer
class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = ("email", "username", "first_name", "last_name", "password", "password2", "role")

    def validate(self, attrs):
        if attrs["password"] != attrs["password2"]:
            raise serializers.ValidationError({"password": "Password fields didn't match."})
        return attrs

    def create(self, validated_data):
        validated_data.pop("password2")
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user

class MaxFileSizeValidator:
    """Custom validator to limit file upload size."""
    def __init__(self, max_mb=2):
        self.max_mb = max_mb

    def __call__(self, value):
        limit = self.max_mb * 1024 * 1024
        if value.size > limit:
            raise serializers.ValidationError(f"File too large. Max size is {self.max_mb}MB.")


# ✅ User Serializer (supports read + write for profile updates)
class UserSerializer(serializers.ModelSerializer):
    profile_photo = serializers.ImageField(
        required=False,
        allow_null=True,
        validators=[
            FileExtensionValidator(allowed_extensions=["jpg", "jpeg", "png", "gif"]),
            MaxFileSizeValidator(max_mb=2),
        ],
    )

    class Meta:
        model = User
        fields = ("id", "email", "username", "first_name", "last_name", "role", "profile_photo")
        read_only_fields = ("email", "role")

    def validate_profile_photo(self, value):
        """Validate uploaded image integrity using Pillow."""
        if value:
            try:
                img = Image.open(value)
                img.verify()  # verifies file is a real image
            except Exception:
                raise serializers.ValidationError("Invalid or corrupted image file.")
        return value

    def to_representation(self, instance):
        """Return full URL for profile photo."""
        rep = super().to_representation(instance)
        request = self.context.get("request")
        if instance.profile_photo and hasattr(instance.profile_photo, "url"):
            rep["profile_photo"] = request.build_absolute_uri(instance.profile_photo.url)
        else:
            rep["profile_photo"] = None
        return rep
    profile_photo = serializers.ImageField(required=False)

    class Meta:
        model = User
        fields = ("id", "email", "username", "first_name", "last_name", "role", "profile_photo")
        read_only_fields = ("email", "role")

    def to_representation(self, instance):
        """Return full URL for profile photo"""
        rep = super().to_representation(instance)
        request = self.context.get("request")
        if instance.profile_photo and hasattr(instance.profile_photo, "url"):
            rep["profile_photo"] = request.build_absolute_uri(instance.profile_photo.url)
        else:
            rep["profile_photo"] = None
        return rep


# ✅ Custom JWT Token Serializer (adds role + username to token)
class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["username"] = user.username
        token["role"] = getattr(user, "role", "user")
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        data["username"] = self.user.username
        data["role"] = getattr(self.user, "role", "user")
        return data

# ✅ Password Reset Request Serializer
class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        """Check if user with this email exists"""
        if not User.objects.filter(email=value).exists():
            pass  # Don't reveal if email exists
        return value

    def save(self):
        email = self.validated_data['email']
        try:
            user = User.objects.get(email=email)
            
            # Generate token and uid
            token = default_token_generator.make_token(user)
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            
            # Build reset link
            reset_link = f"{settings.FRONTEND_URL}/reset-password/{uid}/{token}/"
            
            # Render email template
            html_message = render_to_string('password_reset_email.html', {
                'user': user,
                'reset_link': reset_link,
                'site_name': 'APOLLO-KEY'
            })
            
            # Send email
            send_mail(
                subject='Password Reset Request - APOLLO-KEY',
                message=f'Click the link to reset your password: {reset_link}',
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[email],
                html_message=html_message,
                fail_silently=False,
            )
        except User.DoesNotExist:
            pass


# ✅ Password Reset Confirm Serializer
class PasswordResetConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    new_password = serializers.CharField(write_only=True, validators=[validate_password])
    new_password2 = serializers.CharField(write_only=True)

    def validate(self, attrs):
        if attrs['new_password'] != attrs['new_password2']:
            raise serializers.ValidationError({"new_password": "Password fields didn't match."})
        
        try:
            uid = force_str(urlsafe_base64_decode(attrs['uid']))
            user = User.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            raise serializers.ValidationError({"uid": "Invalid user ID."})
        
        if not default_token_generator.check_token(user, attrs['token']):
            raise serializers.ValidationError({"token": "Invalid or expired token."})
        
        attrs['user'] = user
        return attrs

    def save(self):
        user = self.validated_data['user']
        user.set_password(self.validated_data['new_password'])
        user.save()
        return user