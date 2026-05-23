import React from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'

export default function Billing() {
  const router = useRouter()

  return (
    <>
      <Head>
        <title>CredentialIQ — Billing</title>
      </Head>

      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 24px',
        background: 'var(--bg)',
      }}>
        <div style={{
          maxWidth: 480,
          width: '100%',
          textAlign: 'center',
        }}>

          {/* Icon */}
          <div style={{
            width: 64,
            height: 64,
            borderRadius: 16,
            background: 'var(--elevated)',
            border: '1.5px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
              stroke="var(--text-4)" strokeWidth="1.6"
              strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="1" x2="12" y2="23"/>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
          </div>

          {/* Heading */}
          <h1 style={{
            fontSize: 22,
            fontWeight: 800,
            color: 'var(--text-1)',
            letterSpacing: '-.04em',
            margin: '0 0 8px',
          }}>
            Billing — Coming Soon
          </h1>

          {/* Body */}
          <p style={{
            fontSize: 13.5,
            color: 'var(--text-4)',
            lineHeight: 1.65,
            margin: '0 0 8px',
          }}>
            Billing features will be available in a future update.
          </p>
          <p style={{
            fontSize: 13.5,
            color: 'var(--text-4)',
            lineHeight: 1.65,
            margin: '0 0 32px',
          }}>
            Provider credentialing, payer enrollment, and document
            management continue to work normally.
          </p>

          {/* CTA */}
          <button
            onClick={() => router.push('/providers')}
            className="btn btn-primary"
            style={{ minWidth: 160 }}
          >
            Go to Providers
          </button>

        </div>
      </div>
    </>
  )
}
