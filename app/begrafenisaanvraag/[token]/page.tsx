import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { FuneralForm } from "./FuneralForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Aanvraag begrafenis", robots: { index: false, follow: false } };
export default async function FuneralApplicationPage({ params }: { params: Promise<{ token: string }> }) { const { token } = await params; const application = await prisma.funeralApplication.findUnique({ where: { accessToken: token }, select: { status: true } }); if (!application) notFound(); if (application.status !== "OPEN") return <main className="funeral-page"><section className="funeral-card funeral-complete"><h1>Deze aanvraag is al ingediend</h1><p>Neem contact op met Masjid Ghausia als een wijziging nodig is.</p></section></main>; return <main className="funeral-page"><FuneralForm token={token} /></main>; }
