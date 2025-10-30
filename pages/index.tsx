import type { NextPage } from "next";
import Head from "next/head";
import { useEffect, useRef, useState } from "react";
import styles from "../styles/Home.module.css";

type FeedbackTone = "info" | "success" | "error";
const modulusOptions = [2048, 3072, 4096] as const;
type ModulusLength = typeof modulusOptions[number];

const Home: NextPage = () => {
  const [keySize, setKeySize] = useState<ModulusLength>(2048);
  const [publicKey, setPublicKey] = useState<string>("");
  const [privateKey, setPrivateKey] = useState<string>("");
  const [phase, setPhase] = useState<"idle" | "generating" | "ready">("idle");
  const [message, setMessage] = useState<string>(
    "Keys are generated locally in your browser and never leave this page."
  );
  const [tone, setTone] = useState<FeedbackTone>("info");
  const [copied, setCopied] = useState<"" | "public" | "private">("");
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  const isGenerating = phase === "generating";

  const handleGenerateKeys = async () => {
    if (typeof window === "undefined") {
      return;
    }

    setPhase("generating");
    setTone("info");
    setMessage("Generating RSA key pair…");
    setCopied("");

    try {
      if (!window.crypto || !window.crypto.subtle) {
        throw new Error("This browser does not support the Web Crypto API required for RSA.");
      }

      const keyPair = await window.crypto.subtle.generateKey(
        {
          name: "RSA-OAEP",
          modulusLength: keySize,
          publicExponent: new Uint8Array([1, 0, 1]),
          hash: "SHA-256",
        },
        true,
        ["encrypt", "decrypt"]
      );

      const exportedPublicKey = await window.crypto.subtle.exportKey("spki", keyPair.publicKey);
      const exportedPrivateKey = await window.crypto.subtle.exportKey("pkcs8", keyPair.privateKey);

      setPublicKey(arrayBufferToPem(exportedPublicKey, "PUBLIC KEY"));
      setPrivateKey(arrayBufferToPem(exportedPrivateKey, "PRIVATE KEY"));

      setPhase("ready");
      setTone("success");
      setMessage(`New ${keySize}-bit RSA key pair generated successfully.`);
    } catch (error) {
      console.error(error);
      setPhase("idle");
      setTone("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong while generating the key pair."
      );
    }
  };

  const handleCopy = async (value: string, target: "public" | "private") => {
    if (!value) {
      setTone("info");
      setMessage("Generate a key pair before copying.");
      return;
    }

    if (!navigator.clipboard) {
      setTone("error");
      setMessage("Clipboard API is unavailable in this browser. Copy manually instead.");
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      setCopied(target);
      setTone("success");
      setMessage(`${target === "public" ? "Public" : "Private"} key copied to clipboard.`);

      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
      copyTimeoutRef.current = setTimeout(() => setCopied(""), 2000);
    } catch (error) {
      console.error(error);
      setTone("error");
      setMessage("Clipboard access was blocked. Copy manually instead.");
    }
  };

  return (
    <div className={styles.page}>
      <Head>
        <title>RSA Keysmith</title>
        <meta
          name="description"
          content="Generate RSA key pairs in your browser with a minimalist black and white interface."
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>
        <section className={styles.hero}>
          <span className={styles.badge}>Cryptography Toolkit</span>
          <h1>RSA Keysmith</h1>
          <p>
            Craft secure RSA key pairs with confidence. The entire process happens locally, so
            your secrets never touch the network.
          </p>
        </section>

        <section className={styles.panel}>
          <div className={`${styles.status} ${styles[tone]}`}>{message}</div>

          <div className={styles.controls}>
            <div>
              <h2>Modulus length</h2>
              <p>Select the strength that matches your security posture.</p>
            </div>
            <div className={styles.selector} role="radiogroup" aria-label="RSA key size selector">
              {modulusOptions.map((size) => (
                <button
                  key={size}
                  type="button"
                  className={`${styles.segment} ${keySize === size ? styles.segmentActive : ""}`}
                  onClick={() => setKeySize(size)}
                  disabled={isGenerating}
                  aria-pressed={keySize === size}
                >
                  {size.toLocaleString()} bit
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            className={styles.generateButton}
            onClick={handleGenerateKeys}
            disabled={isGenerating}
          >
            {isGenerating ? "Generating…" : "Generate key pair"}
          </button>

          <div className={styles.outputs}>
            <article className={styles.outputCard}>
              <header className={styles.outputHeader}>
                <div>
                  <h3>Public key</h3>
                  <span>Share freely for anyone who needs to encrypt data for you.</span>
                </div>
                <button
                  type="button"
                  className={styles.copyButton}
                  onClick={() => handleCopy(publicKey, "public")}
                >
                  {copied === "public" ? "Copied" : "Copy"}
                </button>
              </header>
              <textarea
                className={styles.code}
                value={publicKey}
                readOnly
                placeholder="-----BEGIN PUBLIC KEY-----"
              />
            </article>

            <article className={styles.outputCard}>
              <header className={styles.outputHeader}>
                <div>
                  <h3>Private key</h3>
                  <span>Keep offline. Protect with a passphrase or store in a secure vault.</span>
                </div>
                <button
                  type="button"
                  className={styles.copyButton}
                  onClick={() => handleCopy(privateKey, "private")}
                >
                  {copied === "private" ? "Copied" : "Copy"}
                </button>
              </header>
              <textarea
                className={styles.code}
                value={privateKey}
                readOnly
                placeholder="-----BEGIN PRIVATE KEY-----"
              />
            </article>
          </div>
        </section>

        <section className={styles.footer}>
          <div>
            <h4>Security notes</h4>
            <ul>
              <li>Generation stays in-browser via the Web Crypto API; nothing is uploaded anywhere.</li>
              <li>Upgrade to larger key sizes when policy or sensitivity demands greater strength.</li>
              <li>Rotate keys periodically and retire old pairs if compromise is suspected.</li>
            </ul>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Home;

function arrayBufferToPem(buffer: ArrayBuffer, label: string): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  const base64 = window.btoa(binary);
  const wrapped = base64.match(/.{1,64}/g)?.join("\n") ?? base64;
  return `-----BEGIN ${label}-----\n${wrapped}\n-----END ${label}-----`;
}
