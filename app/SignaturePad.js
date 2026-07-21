'use client';
import { useRef, useEffect, useState } from 'react';

// Finger/mouse signature capture. Writes a PNG data URL into a hidden input
// so it posts along with the rest of the signing form.
export default function SignaturePad({ name = 'signatureData' }) {
  const canvasRef = useRef(null);
  const hiddenRef = useRef(null);
  const [empty, setEmpty] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    const ctx = canvas.getContext('2d');
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#12356b';

    let drawing = false;
    const at = (e) => {
      const r = canvas.getBoundingClientRect();
      const p = e.touches && e.touches.length ? e.touches[0] : e;
      return { x: p.clientX - r.left, y: p.clientY - r.top };
    };
    const start = (e) => {
      e.preventDefault();
      drawing = true;
      const { x, y } = at(e);
      ctx.beginPath();
      ctx.moveTo(x, y);
    };
    const move = (e) => {
      if (!drawing) return;
      e.preventDefault();
      const { x, y } = at(e);
      ctx.lineTo(x, y);
      ctx.stroke();
      setEmpty(false);
    };
    const end = () => {
      if (!drawing) return;
      drawing = false;
      if (hiddenRef.current) hiddenRef.current.value = canvas.toDataURL('image/png');
    };

    canvas.addEventListener('mousedown', start);
    canvas.addEventListener('mousemove', move);
    window.addEventListener('mouseup', end);
    canvas.addEventListener('touchstart', start, { passive: false });
    canvas.addEventListener('touchmove', move, { passive: false });
    canvas.addEventListener('touchend', end);
    return () => {
      canvas.removeEventListener('mousedown', start);
      canvas.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', end);
      canvas.removeEventListener('touchstart', start);
      canvas.removeEventListener('touchmove', move);
      canvas.removeEventListener('touchend', end);
    };
  }, []);

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (hiddenRef.current) hiddenRef.current.value = '';
    setEmpty(true);
  };

  return (
    <div>
      <canvas
        ref={canvasRef}
        style={{
          width: '100%', height: 170, border: '2px dashed var(--line)', borderRadius: 10,
          background: '#fff', touchAction: 'none', display: 'block', cursor: 'crosshair',
        }}
      />
      <input ref={hiddenRef} type="hidden" name={name} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
        <span className="muted">{empty ? 'Sign with your finger or mouse above' : 'Signature captured ✓'}</span>
        <button type="button" className="btn ghost" style={{ padding: '5px 12px', fontSize: 12 }} onClick={clear}>Clear</button>
      </div>
    </div>
  );
}
