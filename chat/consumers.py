import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import User
from .models import Message
import firebase_admin
from firebase_admin import messaging
from asgiref.sync import sync_to_async


class ChatConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for real-time chat.

    Room name is deterministic: sorted user IDs joined by underscore.
    e.g. user 1 and user 3 → room "chat_1_3"
    """

    async def connect(self):
        self.room_name = self.scope['url_route']['kwargs']['room_name']
        self.room_group_name = f'chat_{self.room_name}'

        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()

    async def disconnect(self, close_code):
        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        """Called when a message is received from the WebSocket client."""
        data = json.loads(text_data)
        text = data.get('text', '').strip()
        sender_id = data.get('sender_id')
        receiver_id = data.get('receiver_id')

        if not text or not sender_id or not receiver_id:
            return

        # Save message to database
        message = await self.save_message(sender_id, receiver_id, text)

        # Broadcast to everyone in the room (both sender and receiver)
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'chat_message',
                'id': message.id,
                'text': message.text,
                'sender_id': message.sender_id,
                'receiver_id': message.receiver_id,
                'timestamp': message.timestamp.isoformat(),
            }
        )
        
        # Send Push Notification to the receiver
        await self.send_push_notification(message)

    async def chat_message(self, event):
        """Called when a message is broadcast to the group. Sends it to WebSocket."""
        await self.send(text_data=json.dumps({
            'id': event['id'],
            'text': event['text'],
            'sender_id': event['sender_id'],
            'receiver_id': event['receiver_id'],
            'timestamp': event['timestamp'],
        }))

    @database_sync_to_async
    def save_message(self, sender_id, receiver_id, text):
        sender = User.objects.get(id=sender_id)
        receiver = User.objects.get(id=receiver_id)
        return Message.objects.create(sender=sender, receiver=receiver, text=text)

    @database_sync_to_async
    def get_fcm_token(self, user_id):
        from users.models import FCMDevice
        try:
            device = FCMDevice.objects.get(user_id=user_id)
            return device.token
        except FCMDevice.DoesNotExist:
            return None

    async def send_push_notification(self, message):
        token = await self.get_fcm_token(message.receiver_id)
        if not token:
            return
        
        @sync_to_async
        def _send():
            try:
                notification = messaging.Notification(
                    title=f"New message from {message.sender.first_name or message.sender.username}",
                    body=message.text
                )
                msg = messaging.Message(
                    notification=notification,
                    token=token,
                )
                response = messaging.send(msg)
                print('Successfully sent message:', response)
            except Exception as e:
                print('Error sending FCM message:', e)
                
        await _send()
