import type { ReactNode } from 'react';
import { ImageResponse } from 'next/og';
import type { InsuranceShareCardModel } from '@/lib/seo/share-card-model';

export const INSURANCE_OG_SIZE = { width: 1200, height: 630 };

const CACHE_HEADERS = {
  'Cache-Control': 'public, max-age=3600, s-maxage=3600',
};

function Frame({ children, accent }: { children: ReactNode; accent: boolean }) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '52px 64px',
        background: 'linear-gradient(145deg, #071428 0%, #0a1f3d 55%, #0d2a52 100%)',
        color: '#ffffff',
        fontFamily: 'system-ui, Segoe UI, Arial, sans-serif',
        position: 'relative',
      }}
    >
      {accent ? (
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: 10,
            background: '#38bdf8',
          }}
        />
      ) : null}
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ color: '#38bdf8', fontSize: 28, fontWeight: 800, letterSpacing: 2 }}>
            INSURANCE
          </span>
          <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: 3 }}>TRUST HUB</span>
        </div>
        <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: 1, color: '#7dd3fc' }}>
          ASK TRUST HUB NETWORK
        </span>
      </div>
      {children}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 20, fontWeight: 700 }}>
        <span style={{ color: '#cbd5e1' }}>Independent insurance research</span>
        <span style={{ color: '#38bdf8' }}>insurancetrusthub.com</span>
      </div>
    </div>
  );
}

export function renderInsuranceShareImage(model: InsuranceShareCardModel) {
  return new ImageResponse(
    (
      <Frame accent={model.kind !== 'fallback'}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 1020 }}>
          {model.eyebrow ? (
            <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: 2, color: '#7dd3fc' }}>
              {model.eyebrow}
            </div>
          ) : null}
          <div style={{ fontSize: 54, fontWeight: 800, lineHeight: 1.08 }}>{model.title}</div>
          {model.subtitle ? <div style={{ fontSize: 28, fontWeight: 600 }}>{model.subtitle}</div> : null}
          {model.fact ? <div style={{ fontSize: 22, color: '#cbd5e1' }}>{model.fact}</div> : null}
        </div>
      </Frame>
    ),
    { ...INSURANCE_OG_SIZE, headers: CACHE_HEADERS },
  );
}
