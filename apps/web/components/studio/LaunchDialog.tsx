"use client";

import { useState, useRef } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { useStudioStore } from "@/lib/store";
import { getEngine } from "@/lib/engine/engine";

type LaunchStep = "form" | "confirm" | "signing" | "done" | "error";

interface LaunchResult {
  mint: string;
  txSig: string;
}

export function LaunchDialog() {
  const { launchDialogOpen, setLaunchDialogOpen, meta, setMeta } =
    useStudioStore();

  const { connected, publicKey, sendTransaction } = useWallet();
  const { setVisible: setWalletModalVisible } = useWalletModal();

  const [step, setStep]               = useState<LaunchStep>("form");
  const [result, setResult]           = useState<LaunchResult | null>(null);
  const [error, setError]             = useState<string>("");
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!launchDialogOpen) return null;

  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const url = ev.target?.result as string;
      setCoverPreview(url);
      setMeta({ coverDataUrl: url });
    };
    reader.readAsDataURL(file);
  };

  const handleLaunch = async () => {
    if (!connected || !publicKey) {
      setWalletModalVisible(true);
      return;
    }

    setStep("confirm");
  };

  const handleConfirm = async () => {
    setStep("signing");

    try {
      // Export a short WAV for on-chain metadata
      const wavBlob = await getEngine().renderToWavBlob(8);
      const wavBase64 = await blobToBase64(wavBlob);

      // TODO: POST to /api/launch — returns serialized transaction + mint
      // For now, use a stub response
      const res = await fetch("/api/launch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: meta.name,
          ticker: meta.ticker,
          description: meta.description,
          coverDataUrl: meta.coverDataUrl,
          audioBase64: wavBase64,
          creator: publicKey.toBase58(),
        }),
      });

      if (!res.ok) {
        const err = await res.json() as { error?: string };
        throw new Error(err.error ?? "Launch failed");
      }

      const data = await res.json() as { mint: string; txBase64: string };

      // TODO: Deserialize tx, sign + send via wallet adapter
      // const tx = Transaction.from(Buffer.from(data.txBase64, "base64"));
      // const sig = await sendTransaction(tx, connection);
      //
      // Stub: skip actual signing for scaffold
      void sendTransaction; // referenced to avoid lint error

      setResult({ mint: data.mint, txSig: "stub-tx-sig" });
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setStep("error");
    }
  };

  const handleClose = () => {
    setLaunchDialogOpen(false);
    setStep("form");
    setError("");
    setResult(null);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
        onClick={handleClose}
      />

      {/* Dialog */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-label="Launch song as coin"
      >
        <div
          className="w-full max-w-md rounded-2xl border p-6 flex flex-col gap-5"
          style={{
            backgroundColor: "var(--surface-1)",
            borderColor: "var(--border)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2
              className="text-lg font-bold"
              style={{ color: "var(--text-primary)" }}
            >
              Launch as Coin 🪙
            </h2>
            <button
              onClick={handleClose}
              className="text-lg leading-none"
              style={{ color: "var(--text-muted)" }}
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          {/* Steps */}
          {(step === "form") && (
            <div className="flex flex-col gap-4">
              {/* Track name */}
              <div>
                <label
                  className="block text-xs mb-1"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Track name
                </label>
                <input
                  type="text"
                  value={meta.name}
                  onChange={(e) => setMeta({ name: e.target.value })}
                  placeholder="2am Study Session"
                  maxLength={50}
                  className="w-full px-4 py-2.5 rounded-xl text-sm outline-none focus:ring-1"
                  style={{
                    backgroundColor: "var(--surface-2)",
                    color: "var(--text-primary)",
                    border: "1px solid var(--border-subtle)",
                  }}
                />
              </div>

              {/* Ticker */}
              <div>
                <label
                  className="block text-xs mb-1"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Ticker (3–6 chars)
                </label>
                <input
                  type="text"
                  value={meta.ticker}
                  onChange={(e) =>
                    setMeta({ ticker: e.target.value.toUpperCase().slice(0, 6) })
                  }
                  placeholder="LOFI"
                  maxLength={6}
                  className="w-full px-4 py-2.5 rounded-xl text-sm outline-none focus:ring-1 font-mono"
                  style={{
                    backgroundColor: "var(--surface-2)",
                    color: "var(--accent)",
                    border: "1px solid var(--border-subtle)",
                  }}
                />
              </div>

              {/* Description */}
              <div>
                <label
                  className="block text-xs mb-1"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Description
                </label>
                <textarea
                  value={meta.description}
                  onChange={(e) => setMeta({ description: e.target.value })}
                  placeholder="Made on a rainy Tuesday. Vibes only."
                  rows={2}
                  maxLength={200}
                  className="w-full px-4 py-2.5 rounded-xl text-sm resize-none outline-none focus:ring-1"
                  style={{
                    backgroundColor: "var(--surface-2)",
                    color: "var(--text-primary)",
                    border: "1px solid var(--border-subtle)",
                  }}
                />
              </div>

              {/* Cover */}
              <div>
                <label
                  className="block text-xs mb-1"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Cover image (optional)
                </label>
                <div
                  className="rounded-xl overflow-hidden h-24 flex items-center justify-center cursor-pointer border-2 border-dashed transition-colors"
                  style={{ borderColor: "var(--border-subtle)" }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {coverPreview ? (
                    <img
                      src={coverPreview}
                      alt="Cover preview"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span
                      className="text-sm"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Click to upload
                    </span>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleCoverUpload}
                />
              </div>

              {/* Wallet connect / launch */}
              {!connected ? (
                <button
                  onClick={() => setWalletModalVisible(true)}
                  className="w-full py-3 rounded-xl font-bold transition-all hover:opacity-90"
                  style={{
                    backgroundColor: "var(--accent)",
                    color: "var(--background)",
                  }}
                >
                  Connect Wallet to Launch
                </button>
              ) : (
                <button
                  onClick={handleLaunch}
                  disabled={!meta.name || !meta.ticker}
                  className="w-full py-3 rounded-xl font-bold transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: "var(--accent)",
                    color: "var(--background)",
                  }}
                >
                  Launch → pump.fun
                </button>
              )}
            </div>
          )}

          {step === "confirm" && (
            <div className="flex flex-col gap-4 text-center">
              <div className="text-4xl">🎵</div>
              <p style={{ color: "var(--text-secondary)" }}>
                Launching{" "}
                <strong style={{ color: "var(--accent)" }}>{meta.name}</strong>{" "}
                as <code className="font-mono">${meta.ticker}</code>
              </p>
              <p
                className="text-xs"
                style={{ color: "var(--text-muted)" }}
              >
                This will export your track, upload metadata to Arweave, and
                create a bonding-curve token on pump.fun devnet. Fees: ~0.02
                SOL.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setStep("form")}
                  className="flex-1 py-2.5 rounded-xl text-sm"
                  style={{
                    backgroundColor: "var(--surface-2)",
                    color: "var(--text-secondary)",
                  }}
                >
                  Back
                </button>
                <button
                  onClick={handleConfirm}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold"
                  style={{
                    backgroundColor: "var(--accent)",
                    color: "var(--background)",
                  }}
                >
                  Sign &amp; Launch
                </button>
              </div>
            </div>
          )}

          {step === "signing" && (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="animate-spin text-3xl">⚙️</div>
              <p style={{ color: "var(--text-secondary)" }}>
                Rendering track and signing transaction…
              </p>
            </div>
          )}

          {step === "done" && result && (
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="text-4xl">🎉</div>
              <p
                className="font-bold"
                style={{ color: "var(--text-primary)" }}
              >
                {meta.name} is live!
              </p>
              <p className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>
                Mint: {result.mint}
              </p>
              <a
                href={`/track/${result.mint}`}
                className="w-full py-2.5 rounded-xl text-sm font-bold text-center block"
                style={{
                  backgroundColor: "var(--accent)",
                  color: "var(--background)",
                }}
              >
                View Song-Coin Page →
              </a>
            </div>
          )}

          {step === "error" && (
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="text-4xl">😢</div>
              <p style={{ color: "var(--red)" }}>{error}</p>
              <button
                onClick={() => setStep("form")}
                className="py-2 px-6 rounded-xl text-sm"
                style={{
                  backgroundColor: "var(--surface-2)",
                  color: "var(--text-secondary)",
                }}
              >
                Try again
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1] ?? "");
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
