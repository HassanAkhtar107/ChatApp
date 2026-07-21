from rest_framework import status
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.db.models import Q
from .serializers import UserSignupSerializer, UserSerializer
from chat.models import Message

class SignupView(APIView):
    permission_classes = [AllowAny]
    def post(self, request):
        serializer = UserSignupSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            token, created = Token.objects.get_or_create(user=user)
            user_serializer = UserSerializer(user)
            return Response({
                'token': token.key,
                'user': user_serializer.data
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class LoginView(APIView):
    permission_classes = [AllowAny]
    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')

        if not email or not password:
            return Response({'error': 'Please provide both email and password.'}, status=status.HTTP_400_BAD_REQUEST)

        user = authenticate(username=email, password=password)

        if user is not None:
            token, created = Token.objects.get_or_create(user=user)
            user_serializer = UserSerializer(user)
            return Response({
                'token': token.key,
                'user': user_serializer.data
            }, status=status.HTTP_200_OK)
        else:
            return Response({'error': 'Invalid email or password.'}, status=status.HTTP_401_UNAUTHORIZED)

class UserListView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        users = User.objects.exclude(id=request.user.id).order_by('first_name')
        serializer = UserSerializer(users, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class MessageHistoryView(APIView):
    """
    GET /api/messages/?with=<other_user_id>
    Returns all messages between the authenticated user and the specified user,
    ordered oldest first (frontend will display them in order).
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        other_id = request.query_params.get('with')
        if not other_id:
            return Response({'error': 'Missing ?with=<user_id> parameter.'}, status=400)

        try:
            other_id = int(other_id)
        except ValueError:
            return Response({'error': 'Invalid user id.'}, status=400)

        me = request.user.id
        messages = Message.objects.filter(
            Q(sender_id=me, receiver_id=other_id) |
            Q(sender_id=other_id, receiver_id=me)
        ).order_by('timestamp')

        data = [
            {
                'id': m.id,
                'text': m.text,
                'sender_id': m.sender_id,
                'receiver_id': m.receiver_id,
                'timestamp': m.timestamp.isoformat(),
            }
            for m in messages
        ]
        return Response(data, status=200)

class UpdateFCMTokenView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        token = request.data.get('token')
        print("FCM TOKEN:",token)
        if not token:
            return Response({'error': 'Token is required.'}, status=status.HTTP_400_BAD_REQUEST)
        
        from .models import FCMDevice
        
        device, created = FCMDevice.objects.update_or_create(
            user=request.user,
            defaults={'token': token}
        )
        
        return Response({'message': 'Token updated successfully.'}, status=status.HTTP_200_OK)
