import { prisma } from "@/lib/prisma";
import { DEFAULT_EMAIL_TEMPLATES, EMAIL_PLACEHOLDERS, type EmailTemplateKey } from "./defaults";

type TemplateData = Record<string, string | number | Date | null | undefined>;
type EmailAttachment = {
  filename: string;
  content: Buffer;
};

function textToHtml(input: string) {
  return input
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${paragraph.replace(/\n/g, "<br />")}</p>`)
    .join("\n");
}

function stringifyValue(value: TemplateData[string]) {
  if (value instanceof Date) return value.toLocaleDateString("nl-NL");
  if (value === null || value === undefined) return "";
  return String(value);
}

export function renderTemplateString(input: string, data: TemplateData) {
  return input.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (_, key: string) => stringifyValue(data[key]));
}

export async function ensureDefaultEmailTemplates() {
  await Promise.all(
    DEFAULT_EMAIL_TEMPLATES.map(async (template) => {
      const existing = await prisma.emailTemplate.findUnique({ where: { key: template.key } });
      const shouldRefreshBody =
        (template.key === "REGISTRATION_APPROVED_PAYMENT_REQUIRED" && !existing?.bodyText?.includes("{{eenmalig_bedrag}}")) ||
        (template.key === "REGISTRATION_ANSWERS_COPY" && !existing?.bodyText?.includes("{{lidnummer}}"));

      return prisma.emailTemplate.upsert({
        where: { key: template.key },
        update: {
          availablePlaceholders: [...EMAIL_PLACEHOLDERS],
          ...(shouldRefreshBody
            ? {
                name: template.name,
                subject: template.subject,
                bodyText: template.bodyText,
                bodyHtml: textToHtml(template.bodyText),
                isSystem: true
              }
            : {})
        },
        create: {
          key: template.key,
          name: template.name,
          subject: template.subject,
          bodyText: template.bodyText,
          bodyHtml: textToHtml(template.bodyText),
          availablePlaceholders: [...EMAIL_PLACEHOLDERS],
          isSystem: true
        }
      });
    })
  );
}

export async function resetEmailTemplate(key: EmailTemplateKey) {
  const template = DEFAULT_EMAIL_TEMPLATES.find((item) => item.key === key);
  if (!template) throw new Error("Onbekende template");

  return prisma.emailTemplate.upsert({
    where: { key },
    update: {
      name: template.name,
      subject: template.subject,
      bodyText: template.bodyText,
      bodyHtml: textToHtml(template.bodyText),
      availablePlaceholders: [...EMAIL_PLACEHOLDERS],
      isSystem: true
    },
    create: {
      key,
      name: template.name,
      subject: template.subject,
      bodyText: template.bodyText,
      bodyHtml: textToHtml(template.bodyText),
      availablePlaceholders: [...EMAIL_PLACEHOLDERS],
      isSystem: true
    }
  });
}

export async function renderEmailTemplate(key: EmailTemplateKey, data: TemplateData) {
  await ensureDefaultEmailTemplates();
  const template = await prisma.emailTemplate.findUnique({ where: { key } });
  if (!template) throw new Error(`Template ${key} bestaat niet`);

  const bodyText = renderTemplateString(template.bodyText || "", data);
  return {
    key,
    subject: renderTemplateString(template.subject, data),
    bodyText,
    bodyHtml: renderTemplateString(template.bodyHtml || textToHtml(template.bodyText || ""), data)
  };
}

export async function prepareEmailLog({
  templateKey,
  recipient,
  data,
  entityType,
  entityId,
  attachments,
  throwOnSendError
}: {
  templateKey: EmailTemplateKey;
  recipient: string;
  data: TemplateData;
  entityType?: string;
  entityId?: string;
  attachments?: EmailAttachment[];
  throwOnSendError?: boolean;
}) {
  const rendered = await renderEmailTemplate(templateKey, data);
  const emailLog = await prisma.emailLog.create({
    data: {
      templateKey,
      recipient,
      subject: rendered.subject,
      bodyText: rendered.bodyText,
      bodyHtml: rendered.bodyHtml,
      status: "PREPARED",
      entityType,
      entityId
    }
  });

  try {
    await sendEmail({
      to: recipient,
      subject: rendered.subject,
      html: rendered.bodyHtml,
      text: rendered.bodyText,
      attachments
    });
  } catch (error) {
    console.error("E-mail versturen mislukt", error);
    if (throwOnSendError) {
      throw error;
    }
  }

  return emailLog;
}

async function sendEmail({
  to,
  subject,
  html,
  text,
  attachments
}: {
  to: string;
  subject: string;
  html: string;
  text?: string | null;
  attachments?: EmailAttachment[];
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL || "St. GBC <noreply@stgbc.masjidghausia.nl>";

  if (!apiKey) {
    console.warn("RESEND_API_KEY ontbreekt; e-mail is alleen gelogd.");
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from,
      to,
      subject,
      html,
      text: text || undefined,
      attachments: attachments?.map((attachment) => ({
        filename: attachment.filename,
        content: attachment.content.toString("base64")
      }))
    })
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`E-mail versturen mislukt: ${message}`);
  }
}
