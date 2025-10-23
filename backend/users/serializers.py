from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

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


# ✅ User Serializer (supports read + write for profile updates)
class UserSerializer(serializers.ModelSerializer):
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
