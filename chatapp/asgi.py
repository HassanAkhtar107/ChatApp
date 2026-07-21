import os
from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'chatapp.settings')

# Fetch the ASGI application to trigger Django's setup (sets up models, settings, etc.)
django_asgi_app = get_asgi_application()

from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
import chat.routing

application = ProtocolTypeRouter({
    # Normal HTTP requests go to Django as usual
    'http': django_asgi_app,

    # WebSocket requests go through Channels with auth middleware
    'websocket': AuthMiddlewareStack(
        URLRouter(
            chat.routing.websocket_urlpatterns
        )
    ),
})
