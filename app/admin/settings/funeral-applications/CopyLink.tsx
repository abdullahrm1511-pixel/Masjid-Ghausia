"use client";
import { useState } from "react";
export function CopyLink({ url }: { url: string }) { const [copied, setCopied] = useState(false); return <button className="rounded-md bg-[#0f766e] px-4 py-3 font-semibold text-white" onClick={async () => { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); }} type="button">{copied ? "Link gekopieerd" : "Link kopieren"}</button>; }
