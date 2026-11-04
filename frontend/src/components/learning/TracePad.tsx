import { useRef, useState } from "react";

/** Transient drawing: only an exploration outcome reaches the server. */
export default function TracePad({
  target,
  onDone,
  disabled,
}: {
  target: string;
  onDone?: () => void;
  disabled: boolean;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [marks, setMarks] = useState(0);
  const point = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return [
      ((event.clientX - rect.left) * 320) / rect.width,
      ((event.clientY - rect.top) * 240) / rect.height,
    ];
  };
  const clear = () => {
    canvas.current?.getContext("2d")?.clearRect(0, 0, 320, 240);
    setMarks(0);
  };
  return (
    <div className="space-y-3 text-center">
      <div className="relative mx-auto w-full max-w-sm rounded-xl border-2 bg-white overflow-hidden">
        <span
          className="absolute inset-0 flex items-center justify-center text-8xl text-gray-300 pointer-events-none"
          aria-hidden="true"
        >
          {target}
        </span>
        <canvas
          ref={canvas}
          width={320}
          height={240}
          tabIndex={0}
          aria-label={`Drawing area: explore ${target}. You may also use the keyboard exploration button.`}
          className="relative w-full touch-none"
          onPointerDown={(e) => {
            if (disabled) return;
            e.currentTarget.setPointerCapture(e.pointerId);
            drawing.current = true;
            const ctx = canvas.current?.getContext("2d");
            const [x, y] = point(e);
            ctx?.beginPath();
            ctx?.moveTo(x, y);
            setMarks((m) => m + 1);
          }}
          onPointerMove={(e) => {
            if (!drawing.current || disabled) return;
            const ctx = canvas.current?.getContext("2d");
            const [x, y] = point(e);
            if (ctx) {
              ctx.lineWidth = 7;
              ctx.lineCap = "round";
              ctx.strokeStyle = "#2563eb";
              ctx.lineTo(x, y);
              ctx.stroke();
            }
          }}
          onPointerUp={() => {
            drawing.current = false;
          }}
          onPointerCancel={() => {
            drawing.current = false;
          }}
        />
      </div>
      <button className="btn btn-secondary" disabled={disabled} onClick={clear}>
        Clear drawing
      </button>
      {onDone && (
        <button
          className="btn btn-primary ml-3"
          disabled={disabled}
          onClick={onDone}
        >
          {marks ? "I explored it!" : "Explore with a grown-up"}
        </button>
      )}
      <p className="text-sm">
        Draw with your finger or pointer. You can also explore the shape
        together and use the button. Your drawing is not stored.
      </p>
    </div>
  );
}
