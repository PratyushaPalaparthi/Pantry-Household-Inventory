"""
Email service for sending verification and notification emails.
"""
import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import structlog

from app.core.config import settings


logger = structlog.get_logger()


async def send_email(
    to_email: str,
    subject: str,
    html_content: str,
    text_content: str = None
):
    """Send an email using SMTP."""
    if not settings.SMTP_HOST:
        logger.warning("SMTP host not configured, skipping email", to=to_email, subject=subject)
        return False
    
    message = MIMEMultipart("alternative")
    message["Subject"] = subject
    message["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>"
    message["To"] = to_email
    
    if text_content:
        message.attach(MIMEText(text_content, "plain"))
    message.attach(MIMEText(html_content, "html"))
    
    # TLS behavior:
    # - use_tls: implicit TLS (e.g., 465)
    # - start_tls: STARTTLS upgrade (e.g., 587)
    use_tls = settings.SMTP_USE_TLS or settings.SMTP_PORT == 465
    start_tls = settings.SMTP_STARTTLS
    if start_tls is None:
        start_tls = (not use_tls) and settings.SMTP_PORT in (587, 25)

    username = settings.SMTP_USER or None
    password = settings.SMTP_PASSWORD or None

    try:
        await aiosmtplib.send(
            message,
            hostname=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            username=username,
            password=password,
            use_tls=use_tls,
            start_tls=start_tls,
            timeout=30,
        )
        logger.info("Email sent successfully", to=to_email, subject=subject)
        return True
    except Exception as e:
        logger.error(
            "Failed to send email",
            to=to_email,
            subject=subject,
            host=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            use_tls=use_tls,
            start_tls=start_tls,
            error=str(e),
        )
        return False


async def send_verification_email(email: str, token: str) -> bool:
    """Send email verification link."""
    base = settings.FRONTEND_URL.rstrip("/")
    verification_url = f"{base}/verify-email?token={token}"
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
            .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
            .button {{ display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
            .footer {{ text-align: center; margin-top: 20px; color: #666; font-size: 12px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>📸 PhotoVault</h1>
                <p>Verify Your Email</p>
            </div>
            <div class="content">
                <p>Hello,</p>
                <p>Thank you for signing up for PhotoVault! Please verify your email address by clicking the button below:</p>
                <p style="text-align: center;">
                    <a href="{verification_url}" class="button">Verify Email</a>
                </p>
                <p>Or copy and paste this link into your browser:</p>
                <p style="word-break: break-all; color: #667eea;">{verification_url}</p>
                <p>This link will expire in {settings.EMAIL_VERIFICATION_EXPIRE_HOURS} hours.</p>
                <p>If you didn't create an account, you can safely ignore this email.</p>
            </div>
            <div class="footer">
                <p>&copy; PhotoVault - Your photos, your privacy</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    text_content = f"""
    PhotoVault - Verify Your Email
    
    Hello,
    
    Thank you for signing up for PhotoVault! Please verify your email address by visiting:
    {verification_url}
    
    This link will expire in {settings.EMAIL_VERIFICATION_EXPIRE_HOURS} hours.
    
    If you didn't create an account, you can safely ignore this email.
    """
    
    return await send_email(email, "Verify your PhotoVault email", html_content, text_content)


async def send_password_reset_email(email: str, token: str) -> bool:
    """Send password reset link."""
    base = settings.FRONTEND_URL.rstrip("/")
    reset_url = f"{base}/reset-password?token={token}"
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
            .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
            .button {{ display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
            .footer {{ text-align: center; margin-top: 20px; color: #666; font-size: 12px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>📸 PhotoVault</h1>
                <p>Reset Your Password</p>
            </div>
            <div class="content">
                <p>Hello,</p>
                <p>We received a request to reset your password. Click the button below to create a new password:</p>
                <p style="text-align: center;">
                    <a href="{reset_url}" class="button">Reset Password</a>
                </p>
                <p>Or copy and paste this link into your browser:</p>
                <p style="word-break: break-all; color: #667eea;">{reset_url}</p>
                <p>This link will expire in 1 hour.</p>
                <p>If you didn't request a password reset, you can safely ignore this email.</p>
            </div>
            <div class="footer">
                <p>&copy; PhotoVault - Your photos, your privacy</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    text_content = f"""
    PhotoVault - Reset Your Password
    
    Hello,
    
    We received a request to reset your password. Visit the link below to create a new password:
    {reset_url}
    
    This link will expire in 1 hour.
    
    If you didn't request a password reset, you can safely ignore this email.
    """
    
    return await send_email(email, "Reset your PhotoVault password", html_content, text_content)


async def send_approval_notification(email: str, approved: bool) -> bool:
    """Send account approval/rejection notification."""
    base = settings.FRONTEND_URL.rstrip("/")
    login_url = f"{base}/login"

    if approved:
        subject = "Your PhotoVault account has been approved!"
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>📸 PhotoVault</h1>
                    <p>Account Approved!</p>
                </div>
                <div class="content">
                    <p>Great news!</p>
                    <p>Your PhotoVault account has been approved. You can now log in and start managing your photos.</p>
                    <p style="text-align: center;">
                        <a href="{login_url}" class="button">Log In Now</a>
                    </p>
                </div>
            </div>
        </body>
        </html>
        """
    else:
        subject = "PhotoVault account registration update"
        html_content = """
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #666; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>📸 PhotoVault</h1>
                </div>
                <div class="content">
                    <p>Hello,</p>
                    <p>We're sorry, but your PhotoVault account registration was not approved at this time.</p>
                    <p>If you believe this is an error, please contact the administrator.</p>
                </div>
            </div>
        </body>
        </html>
        """
    
    return await send_email(email, subject, html_content)
