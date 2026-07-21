from django.urls import path
from .views import SignupView, LoginView, UserListView, MessageHistoryView, UpdateFCMTokenView

urlpatterns = [
    path('signup/', SignupView.as_view(), name='signup'),
    path('login/', LoginView.as_view(), name='login'),
    path('users/', UserListView.as_view(), name='user-list'),
    path('messages/', MessageHistoryView.as_view(), name='message-history'),
    path('update-fcm-token/', UpdateFCMTokenView.as_view(), name='update-fcm-token'),
]
