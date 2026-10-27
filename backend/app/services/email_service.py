import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional, Tuple, List, Dict, Any

from backend.app.config import settings

logger = logging.getLogger("samanvay.email")

class BaseEmailProvider:
    """Base interface for AICTE notification email delivery providers."""
    def send_email(
        self,
        to_email: str,
        subject: str,
        text_body: str,
        html_body: Optional[str] = None
    ) -> Tuple[bool, Optional[str]]:
        raise NotImplementedError


class MockEmailProvider(BaseEmailProvider):
    """
    In-memory mock email provider for unit testing, test suites, and offline development.
    Supports controllable failure simulation to rigorously verify retry behavior.
    """
    def __init__(self):
        self.sent_emails: List[Dict[str, Any]] = []
        self.fail_next_n_attempts: int = 0
        self.simulated_error_msg: str = "Simulated SMTP connection timeout [SYNTHETIC TEST]"

    def send_email(
        self,
        to_email: str,
        subject: str,
        text_body: str,
        html_body: Optional[str] = None
    ) -> Tuple[bool, Optional[str]]:
        if self.fail_next_n_attempts > 0:
            self.fail_next_n_attempts -= 1
            logger.warning(f"MockEmailProvider: Simulated failure for recipient '{to_email}' (Remaining failures: {self.fail_next_n_attempts})")
            return False, self.simulated_error_msg

        record = {
            "to_email": to_email,
            "subject": subject,
            "text_body": text_body,
            "html_body": html_body
        }
        self.sent_emails.append(record)
        logger.info(f"MockEmailProvider: Successfully recorded synthetic email to '{to_email}' with subject '{subject}'")
        return True, None

    def clear(self):
        self.sent_emails.clear()
        self.fail_next_n_attempts = 0


class SmtpEmailProvider(BaseEmailProvider):
    """
    Production-grade SMTP email provider for dispatching official AICTE notifications
    via configured relay servers.
    """
    def __init__(
        self,
        host: str = "smtp.aicte.gov.in",
        port: int = 587,
        username: Optional[str] = None,
        password: Optional[str] = None,
        use_tls: bool = True,
        sender_email: str = "notifications@samanvay.aicte.gov.in"
    ):
        self.host = host
        self.port = port
        self.username = username
        self.password = password
        self.use_tls = use_tls
        self.sender_email = sender_email

    def send_email(
        self,
        to_email: str,
        subject: str,
        text_body: str,
        html_body: Optional[str] = None
    ) -> Tuple[bool, Optional[str]]:
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"AICTE SAMANVAY Portal <{self.sender_email}>"
            msg["To"] = to_email

            part1 = MIMEText(text_body, "plain", "utf-8")
            msg.attach(part1)

            if html_body:
                part2 = MIMEText(html_body, "html", "utf-8")
                msg.attach(part2)

            with smtplib.SMTP(self.host, self.port, timeout=10) as server:
                if self.use_tls:
                    server.starttls()
                if self.username and self.password:
                    server.login(self.username, self.password)
                server.sendmail(self.sender_email, [to_email], msg.as_string())

            logger.info(f"SmtpEmailProvider: Dispatched email to '{to_email}'")
            return True, None
        except Exception as exc:
            err = f"SMTP dispatch failed: {str(exc)}"
            logger.error(err)
            return False, err


# Global mock provider instance for testing and dev
_global_mock_provider = MockEmailProvider()

def get_email_provider() -> BaseEmailProvider:
    """Returns active email provider based on configuration."""
    provider_type = getattr(settings, "EMAIL_PROVIDER", "MOCK").upper()
    if provider_type == "SMTP" and getattr(settings, "SMTP_HOST", None):
        return SmtpEmailProvider(
            host=settings.SMTP_HOST,
            port=getattr(settings, "SMTP_PORT", 587),
            username=getattr(settings, "SMTP_USER", None),
            password=getattr(settings, "SMTP_PASSWORD", None),
            sender_email=getattr(settings, "SMTP_FROM_EMAIL", "notifications@samanvay.aicte.gov.in")
        )
    return _global_mock_provider


def render_aicte_email_template(
    title: str,
    message: str,
    complaint_no: Optional[str] = None,
    severity: str = "INFO",
    ist_time_str: str = ""
) -> Tuple[str, str]:
    """
    Renders standardized Government of India / AICTE regulatory notice text and HTML email formats.
    """
    plain_text = f"""
================================================================================
ALL INDIA COUNCIL FOR TECHNICAL EDUCATION (AICTE)
SAMANVAY — Cross-Bureau Integrated Complaint Management Platform
================================================================================
SEVERITY LEVEL: [{severity.upper()}]
DATE & TIME:    {ist_time_str}
{f"CASE REF NO:   {complaint_no}" if complaint_no else ""}

SUBJECT: {title}

NOTICE DETAILS:
{message}

--------------------------------------------------------------------------------
This is an automated regulatory notification dispatched from the AICTE SAMANVAY Platform.
Please log in to the official dashboard to take immediate procedural action.
Portal: http://samanvay.aicte.gov.in
================================================================================
""".strip()

    color_map = {
        "INFO": "#2563eb",
        "WARNING": "#d97706",
        "CRITICAL": "#dc2626",
        "URGENT": "#7c3aed"
    }
    badge_color = color_map.get(severity.upper(), "#2563eb")

    html_text = f"""
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; }}
    .container {{ max-width: 620px; margin: 0 auto; background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden; }}
    .header {{ background: #0f172a; color: #ffffff; padding: 20px; text-align: center; }}
    .badge {{ display: inline-block; padding: 4px 10px; border-radius: 4px; font-weight: 700; font-size: 11px; color: #ffffff; background-color: {badge_color}; }}
    .content {{ padding: 24px; color: #1e293b; line-height: 1.6; font-size: 14px; }}
    .meta-box {{ background: #f1f5f9; border-radius: 6px; padding: 12px 16px; margin: 16px 0; font-size: 13px; }}
    .footer {{ background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px; text-align: center; font-size: 12px; color: #64748b; }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div style="font-size: 20px;">⚖️ AICTE SAMANVAY</div>
      <div style="font-size: 12px; color: #94a3b8; margin-top: 4px;">Smart Integrated Dashboard for Technical Education Grievances</div>
    </div>
    <div class="content">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <span class="badge">{severity.upper()}</span>
        <span style="font-size: 12px; color: #64748b;">{ist_time_str}</span>
      </div>
      <h2 style="font-size: 18px; color: #0f172a; margin-top: 6px;">{title}</h2>
      {f'<div class="meta-box"><strong>Case Reference:</strong> <code style="font-size: 13px; color: #0369a1;">{complaint_no}</code></div>' if complaint_no else ''}
      <p style="white-space: pre-line;">{message}</p>
    </div>
    <div class="footer">
      Government of India • Ministry of Education • All India Council for Technical Education<br>
      This is a system-generated alert. Please do not reply directly to this email.
    </div>
  </div>
</body>
</html>
""".strip()

    return plain_text, html_text
