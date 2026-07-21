from django.contrib import admin
from .models import Message

@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ('sender', 'receiver', 'text', 'timestamp')
    list_filter = ('sender', 'receiver')
    ordering = ('-timestamp',)
