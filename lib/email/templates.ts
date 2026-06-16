import { prisma } from "@/lib/prisma";
import { DEFAULT_EMAIL_TEMPLATES, EMAIL_PLACEHOLDERS, type EmailTemplateKey } from "./defaults";

type TemplateData = Record<string, string | number | Date | null | undefined>;

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
    DEFAULT_EMAIL_TEMPLATES.map((template) =>
      prisma.emailTemplate.upsert({
        where: { key: template.key },
        update: {},
        create: {
          key: template.key,
          name: template.name,
          subject: template.subject,
          bodyText: template.bodyText,
          bodyHtml: textToHtml(template.bodyText),
          availablePlaceholders: [...EMAIL_PLACEHOLDERS],
          isSystem: true
        }
      })
    )
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
  entityId
}: {
  templateKey: EmailTemplateKey;
  recipient: string;
  data: TemplateData;
  entityType?: string;
  entityId?: string;
}) {
  const rendered = await renderEmailTemplate(templateKey, data);
  return prisma.emailLog.create({
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
}
