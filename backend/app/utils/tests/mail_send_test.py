import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from mail import send_email

#  test
send_email("example@gmail.com", "Test", "<h1>✅ SMTP works!</h1>")
print("✅ Email send!")