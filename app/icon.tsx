import { ImageResponse } from 'next/og';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0A2540',
          borderRadius: '50%',
        }}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M32 12c-8 0-14 4-18 10 4 6 10 10 18 10s14-4 18-10c-4-6-10-10-18-10z"
            stroke="white"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path d="M32 22v18" stroke="white" strokeWidth="3" strokeLinecap="round" />
          <path d="M26 32h12" stroke="white" strokeWidth="3" strokeLinecap="round" />
        </svg>
      </div>
    ),
    { ...size }
  );
}