import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv


load_dotenv()


SMTP_HOST = os.getenv("SMTP_HOST")
SMTP_PORT = int(os.getenv("SMTP_PORT", 465))
SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASS = os.getenv("SMTP_PASS")




def send_email(recipient: str, subject: str, html_body: str):
   """Generic helper to send HTML emails via SMTP."""
   try:
       msg = MIMEMultipart("alternative")
       msg["From"] = f"ALLURE TEAM <{SMTP_USER}>"
       msg["To"] = recipient
       msg["Subject"] = subject
       msg.attach(MIMEText(html_body, "html"))


       with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT) as server:
           server.login(SMTP_USER, SMTP_PASS)
           server.send_message(msg)


       print(f"✅ Payment email sent to {recipient}")
   except Exception as e:
       print(f"❌ Error sending payment email to {recipient}: {e}")
       raise




def send_payment_confirmation_from_db(pool, provider_ref: str):
   """
   Sends a payment confirmation email based on a completed payment in the DB.
   It looks up data from the `payments` and `app_user` tables.
   """


   with pool.acquire() as conn:
       cursor = conn.cursor()


       # Fetch payment info with user email
       cursor.execute("""
           SELECT u.email, u.name, p.amount, p.currency, p.payment_provider, p.created_at
             FROM paymentss p
             JOIN app_user u ON p.user_id = u.user_id
            WHERE p.payment_intent_id = :1
              AND p.status = 'SUCCEEDED'
       """, [provider_ref])


       row = cursor.fetchone()
       if not row:
           print(f"⚠️ No successful payment found for payment_intent_id={provider_ref}")
           return


       email, name, amount, currency, provider, created_at = row


       # HTML Email Body
       html = f"""
       <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto;
                   padding: 1.5rem; background-color: #f9f9f9; border-radius: 10px;">
         <h2 style="color: #2d3748;">Payment Confirmation</h2>
         <p style="font-size: 16px; color: #4a5568;">Hello {name or ''},</p>


         <p style="font-size: 16px; color: #4a5568;">
           We’ve successfully received your payment through <strong>{provider}</strong>.
         </p>


         <p style="font-size: 16px; color: #4a5568;">
           <strong>Amount:</strong> {currency} ${amount:.2f}<br/>
           <strong>Date:</strong> {created_at.strftime('%Y-%m-%d %H:%M')}<br/>
           <strong>Reference:</strong> {provider_ref}
         </p>


         <p style="font-size: 16px; color: #4a5568;">
           Your transaction has been completed and will appear on your invoice shortly.
         </p>


         <div style="margin-top: 2rem;">
           <p style="font-size: 14px; color: #a0aec0;">— The KeySpotting Team</p>
         </div>
       </div>
       """


       send_email(email, "✅ Payment Confirmation", html)