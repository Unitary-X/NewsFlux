import aiosmtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.core.config import settings

logger = logging.getLogger(__name__)

class EmailService:
    """Service for sending emails via SMTP"""

    @staticmethod
    async def send_email(
        to_email: str,
        subject: str,
        html_content: str,
        plain_text_content: str = None,
    ) -> bool:
        """
        Send an email via SMTP.
        
        Args:
            to_email: Recipient email address
            subject: Email subject
            html_content: HTML email body
            plain_text_content: Plain text fallback (optional)
        
        Returns:
            bool: True if email sent successfully, False otherwise
        """
        if not settings.EMAILS_ENABLED:
            logger.info(f"Emails disabled. Would send to {to_email}: {subject}")
            return False

        try:
            message = MIMEMultipart("alternative")
            message["Subject"] = subject
            message["From"] = settings.SMTP_FROM_EMAIL
            message["To"] = to_email

            # Attach plain text version
            if plain_text_content:
                message.attach(MIMEText(plain_text_content, "plain"))
            
            # Attach HTML version (preferred)
            message.attach(MIMEText(html_content, "html"))

            # Send via SMTP
            async with aiosmtplib.SMTP(hostname=settings.SMTP_SERVER, port=settings.SMTP_PORT) as smtp:
                await smtp.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                await smtp.sendmail(
                    settings.SMTP_FROM_EMAIL,
                    to_email,
                    message.as_string(),
                )
            
            logger.info(f"Email sent successfully to {to_email}: {subject}")
            return True

        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {str(e)}")
            return False

    @staticmethod
    def get_agency_created_template(agency_name: str, admin_username: str, dashboard_url: str) -> tuple[str, str]:
        """Get email template for agency creation"""
        plain_text = f"""
Welcome to NewsFlux!

Your agency '{agency_name}' has been successfully created.

Admin Username: {admin_username}

You can now login and start managing your newspaper distribution.

Dashboard: {dashboard_url}

Best regards,
NewsFlux Team
        """
        
        html = f"""
        <html>
            <body style="font-family: Arial, sans-serif;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h1>Welcome to NewsFlux! 🎉</h1>
                    <p>Your agency <strong>'{agency_name}'</strong> has been successfully created.</p>
                    
                    <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <p><strong>Admin Username:</strong> {admin_username}</p>
                    </div>
                    
                    <p>You can now login and start managing your newspaper distribution.</p>
                    
                    <a href="{dashboard_url}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
                        Go to Dashboard
                    </a>
                    
                    <hr style="margin-top: 30px; border: none; border-top: 1px solid #ddd;">
                    <p style="color: #666; font-size: 12px;">Best regards,<br>NewsFlux Team</p>
                </div>
            </body>
        </html>
        """
        
        return plain_text, html

    @staticmethod
    def get_agency_suspended_template(agency_name: str, reason: str, support_email: str) -> tuple[str, str]:
        """Get email template for agency suspension"""
        plain_text = f"""
Important Notice: Agency Suspension

Your agency '{agency_name}' has been suspended.

Reason: {reason}

For more information, please contact support at {support_email}

Best regards,
NewsFlux Team
        """
        
        html = f"""
        <html>
            <body style="font-family: Arial, sans-serif;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h1 style="color: #dc3545;">⚠️ Agency Suspension Notice</h1>
                    <p>Your agency <strong>'{agency_name}'</strong> has been suspended.</p>
                    
                    <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ffc107;">
                        <p><strong>Reason:</strong> {reason}</p>
                    </div>
                    
                    <p>For more information or to appeal this decision, please contact support.</p>
                    
                    <a href="mailto:{support_email}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
                        Contact Support
                    </a>
                    
                    <hr style="margin-top: 30px; border: none; border-top: 1px solid #ddd;">
                    <p style="color: #666; font-size: 12px;">Best regards,<br>NewsFlux Team</p>
                </div>
            </body>
        </html>
        """
        
        return plain_text, html

    @staticmethod
    def get_billing_reminder_template(agency_name: str, amount: float, due_date: str, invoice_url: str) -> tuple[str, str]:
        """Get email template for billing reminder"""
        plain_text = f"""
Billing Reminder - {agency_name}

Hello,

This is a reminder that your invoice is due on {due_date}.

Amount Due: ${amount:.2f}

View and pay your invoice: {invoice_url}

Thank you for your business!

Best regards,
NewsFlux Team
        """
        
        html = f"""
        <html>
            <body style="font-family: Arial, sans-serif;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h1>Billing Reminder</h1>
                    <p>Hello,</p>
                    <p>This is a reminder that your invoice is due on <strong>{due_date}</strong>.</p>
                    
                    <div style="background-color: #e8f4f8; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <p style="font-size: 24px; color: #007bff; margin: 0;"><strong>${amount:.2f}</strong></p>
                        <p style="margin: 10px 0 0 0; color: #666;">Amount Due</p>
                    </div>
                    
                    <a href="{invoice_url}" style="background-color: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
                        View & Pay Invoice
                    </a>
                    
                    <p style="margin-top: 30px; color: #666;">Thank you for your business!</p>
                    
                    <hr style="margin-top: 30px; border: none; border-top: 1px solid #ddd;">
                    <p style="color: #666; font-size: 12px;">Best regards,<br>NewsFlux Team</p>
                </div>
            </body>
        </html>
        """
        
        return plain_text, html

    @staticmethod
    def get_announcement_template(title: str, message: str, platform_url: str) -> tuple[str, str]:
        """Get email template for announcements"""
        plain_text = f"""
Important Announcement: {title}

{message}

View more on the platform: {platform_url}

Best regards,
NewsFlux Team
        """
        
        html = f"""
        <html>
            <body style="font-family: Arial, sans-serif;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h1>📢 Announcement</h1>
                    <h2>{title}</h2>
                    
                    <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #007bff;">
                        <p>{message}</p>
                    </div>
                    
                    <a href="{platform_url}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
                        View on Platform
                    </a>
                    
                    <hr style="margin-top: 30px; border: none; border-top: 1px solid #ddd;">
                    <p style="color: #666; font-size: 12px;">Best regards,<br>NewsFlux Team</p>
                </div>
            </body>
        </html>
        """
        
        return plain_text, html
