from django.db import models
from django.contrib.auth.models import User

class FCMDevice(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='fcm_device')
    token = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"FCMDevice for {self.user.username}"
