from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    # room_name = sorted user IDs joined by underscore e.g. "1_3"
    re_path(r'ws/chat/(?P<room_name>\w+)/$', consumers.ChatConsumer.as_asgi()),
]
