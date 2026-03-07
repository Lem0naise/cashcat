'use client';

import Image from 'next/image';
import { useEffect, useRef, useState, useCallback } from 'react';

// ── Constants ────────────────────────────────────────────────────────────────

const CAT_SIZE = 56;
const EDGE = 20;                   // px from viewport edge
const IDLE_ARRIVE_MS = 2_000;     // wait before first arrival
const SCAMPER_MIN_MS = 30_000;    // min time before corner-to-corner scamper (30 secs)
const SCAMPER_MAX_MS = 120_000;    // max (2 min)
const HOVER_RADIUS = 90;           // px — proximity to wake the cat
const TIP_HIDE_MS = 5_000;         // tip auto-hides after 5 s

const TIPS: string[] = [
    'Tip: give every penny a job before the month starts.',
    'Tip: track every transaction — the small ones add up!',
    'Tip: build a 1-month expenses buffer, then invest the rest.',
    'Tip: review your budget weekly, not just monthly.',
    'Tip: zero-based budgeting ≠ spending zero — just planning ahead.',
    'meow. (that means: cancel one subscription today)',
    'Tip: separate wants from needs in your categories.',
    'Tip: automate savings on payday — pay yourself first.',
    'Tip: name your savings goals — it makes them feel real.',
    'Tip: an emergency fund is a budget category, not an afterthought.',
];

// Four viewport corners (fixed coords). We pick from these for the cat position.
const CORNERS = [
    { right: EDGE, bottom: EDGE },   // 0 bottom-right
    { right: EDGE, bottom: 'auto' as const, top: EDGE },  // 1 top-right  (needs special treatment)
] as const;

// Simpler: just define as [right, bottom] offsets and flip with translate for top corners.
// We'll use bottom-right and bottom-left as the two cat homes (top corners are distracting).
type Corner = { side: 'left' | 'right'; bottom: number };

const CAT_CORNERS: Corner[] = [
    { side: 'right', bottom: EDGE },
    { side: 'left',  bottom: EDGE },
];

// ── Types ────────────────────────────────────────────────────────────────────

type Phase =
    | 'hidden'        // hasn't arrived yet
    | 'arriving'      // walk-in animation
    | 'sleeping'      // settled in corner, gentle breathe
    | 'awake'         // mouse nearby — alert, tip showing
    | 'peeking'       // peeking up behind the CTA button
    | 'scampering';   // mid-scamper to another corner

// ── Component ────────────────────────────────────────────────────────────────

export default function MascotLanding() {
    const [phase, setPhase]               = useState<Phase>('hidden');
    const [corner, setCorner]             = useState<Corner>(CAT_CORNERS[0]);
    const [tipIndex, setTipIndex]         = useState(0);
    const [tipVisible, setTipVisible]     = useState(false);
    const [meowBounce, setMeowBounce]     = useState(false);

    const reducedMotion    = useRef(false);
    const phaseRef         = useRef<Phase>('hidden');
    const cornerRef        = useRef<Corner>(CAT_CORNERS[0]);
    const tipIndexRef      = useRef(0);
    const tipHideTimer     = useRef<ReturnType<typeof setTimeout> | null>(null);
    const scamperTimer     = useRef<ReturnType<typeof setTimeout> | null>(null);
    const arriveTimer      = useRef<ReturnType<typeof setTimeout> | null>(null);
    const walkInTimer      = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Keep refs in sync so callbacks don't go stale
    const syncPhase = useCallback((p: Phase) => {
        phaseRef.current = p;
        setPhase(p);
    }, []);
    const syncCorner = useCallback((c: Corner) => {
        cornerRef.current = c;
        setCorner(c);
    }, []);

    // ── Reduced motion ───────────────────────────────────────────────────────
    useEffect(() => {
        const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
        reducedMotion.current = mq.matches;
        const h = (e: MediaQueryListEvent) => { reducedMotion.current = e.matches; };
        mq.addEventListener('change', h);
        return () => mq.removeEventListener('change', h);
    }, []);

    // ── Schedule next corner-to-corner scamper ───────────────────────────────
    const scheduleNextScamper = useCallback(() => {
        if (scamperTimer.current) clearTimeout(scamperTimer.current);
        const delay = SCAMPER_MIN_MS + Math.random() * (SCAMPER_MAX_MS - SCAMPER_MIN_MS);
        scamperTimer.current = setTimeout(() => {
            const cur = phaseRef.current;
            if (cur !== 'sleeping' && cur !== 'awake') return; // don't interrupt
            if (reducedMotion.current) { scheduleNextScamper(); return; }

            // Pick a different corner
            const nextCorner = CAT_CORNERS.find(c => c.side !== cornerRef.current.side)
                ?? CAT_CORNERS[0];

            syncPhase('scampering');
            // After scamper-out animation (0.5 s), move corner and walk in
            walkInTimer.current = setTimeout(() => {
                syncCorner(nextCorner);
                syncPhase('arriving');
                // After walk-in animation (1 s), sleep
                walkInTimer.current = setTimeout(() => {
                    syncPhase('sleeping');
                    scheduleNextScamper();
                }, 1000);
            }, 500);
        }, delay);
    }, [syncPhase, syncCorner]);

    // ── Initial arrival after idle ───────────────────────────────────────────
    useEffect(() => {
        if (reducedMotion.current) return;
        arriveTimer.current = setTimeout(() => {
            syncPhase('arriving');
            walkInTimer.current = setTimeout(() => {
                syncPhase('sleeping');
                scheduleNextScamper();
            }, 1000);
        }, IDLE_ARRIVE_MS);

        return () => {
            if (arriveTimer.current)  clearTimeout(arriveTimer.current);
            if (walkInTimer.current)  clearTimeout(walkInTimer.current);
            if (scamperTimer.current) clearTimeout(scamperTimer.current);
            if (tipHideTimer.current) clearTimeout(tipHideTimer.current);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Proximity detection — wake / sleep the cat ───────────────────────────
    useEffect(() => {
        const onMove = (e: MouseEvent) => {
            const cur = phaseRef.current;
            if (cur === 'hidden' || cur === 'arriving' || cur === 'scampering' || cur === 'peeking') return;

            // Compute cat's current viewport position
            const vw = window.innerWidth;
            const vh = window.innerHeight;
            const catX = cornerRef.current.side === 'right'
                ? vw - EDGE - CAT_SIZE / 2
                : EDGE + CAT_SIZE / 2;
            const catY = vh - cornerRef.current.bottom - CAT_SIZE / 2;

            const dx = e.clientX - catX;
            const dy = e.clientY - catY;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < HOVER_RADIUS && cur === 'sleeping') {
                // Wake up and show a tip
                syncPhase('awake');
                // Pick a new tip
                const next = (tipIndexRef.current + 1) % TIPS.length;
                tipIndexRef.current = next;
                setTipIndex(next);
                setTipVisible(true);

                if (tipHideTimer.current) clearTimeout(tipHideTimer.current);
                tipHideTimer.current = setTimeout(() => setTipVisible(false), TIP_HIDE_MS);
            } else if (dist >= HOVER_RADIUS && cur === 'awake') {
                syncPhase('sleeping');
                setTipVisible(false);
            }
        };

        window.addEventListener('mousemove', onMove, { passive: true });
        return () => window.removeEventListener('mousemove', onMove);
    }, [syncPhase]);

    // ── Hover on CTA button — peek up ───────────────────────────────────────
    useEffect(() => {
        const findCTA = () =>
            Array.from(document.querySelectorAll('a[href="/signup"]')).find(
                el => (el.textContent ?? '').trim().startsWith('Start Budgeting Free')
            ) as HTMLElement | undefined;

        let cta: HTMLElement | undefined;

        const onEnter = () => {
            if (reducedMotion.current) return;
            const cur = phaseRef.current;
            if (cur === 'sleeping' || cur === 'awake' || cur === 'hidden') {
                syncPhase('peeking');
                setTipVisible(false);
            }
        };

        const onLeave = () => {
            if (phaseRef.current === 'peeking') syncPhase('sleeping');
        };

        const t = setTimeout(() => {
            cta = findCTA();
            if (cta) {
                cta.addEventListener('mouseenter', onEnter);
                cta.addEventListener('mouseleave', onLeave);
            }
        }, 300);

        return () => {
            clearTimeout(t);
            if (cta) {
                cta.removeEventListener('mouseenter', onEnter);
                cta.removeEventListener('mouseleave', onLeave);
            }
        };
    }, [syncPhase]);

    // ── Click easter egg ─────────────────────────────────────────────────────
    const handleClick = useCallback(() => {
        const cur = phaseRef.current;
        if (cur !== 'sleeping' && cur !== 'awake') return;

        setMeowBounce(true);
        setTimeout(() => setMeowBounce(false), 500);

        const next = (tipIndexRef.current + 1) % TIPS.length;
        tipIndexRef.current = next;
        setTipIndex(next);
        setTipVisible(true);

        if (tipHideTimer.current) clearTimeout(tipHideTimer.current);
        tipHideTimer.current = setTimeout(() => setTipVisible(false), TIP_HIDE_MS);
    }, []);

    // ── Derived layout ───────────────────────────────────────────────────────

    const isLeft = corner.side === 'left';

    // Cat fixed position
    const catStyle: React.CSSProperties = {
        position: 'fixed',
        bottom: corner.bottom,
        ...(isLeft ? { left: EDGE } : { right: EDGE }),
        width: CAT_SIZE,
        height: CAT_SIZE,
        zIndex: 9998,
        userSelect: 'none',
        cursor: (phase === 'sleeping' || phase === 'awake') ? 'pointer' : 'default',
        filter: phase === 'awake'
            ? 'drop-shadow(0 0 12px rgba(132,214,132,0.6))'
            : 'drop-shadow(0 4px 10px rgba(14,126,255,0.35))',
    };

    // Animation & transform per phase
    let animation: string | undefined;
    let transform: string | undefined;
    let opacity = 1;
    let transition: string | undefined;

    if (phase === 'hidden') {
        opacity = 0;
    } else if (phase === 'arriving') {
        // Slide in from off-screen side
        animation = `mascot-arrive-${isLeft ? 'left' : 'right'} 1s cubic-bezier(0.22,1,0.36,1) forwards`;
    } else if (phase === 'sleeping') {
        animation = 'mascot-breathe 3.5s ease-in-out infinite';
        if (meowBounce) {
            transform = 'translateY(-14px)';
            transition = 'transform 0.15s ease-out';
            animation = undefined;
        }
    } else if (phase === 'awake') {
        // Upright, slight scale up, tail wag handled by keyframe
        animation = meowBounce ? undefined : 'mascot-wag 0.6s ease-in-out infinite';
        if (meowBounce) {
            transform = 'translateY(-14px)';
            transition = 'transform 0.15s ease-out';
        }
    } else if (phase === 'peeking') {
        animation = 'mascot-peek 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards';
    } else if (phase === 'scampering') {
        // Slide off-screen to the SAME side the cat is on
        animation = `mascot-scamper-${isLeft ? 'left' : 'right'} 0.5s ease-in forwards`;
    }

    // Tip bubble — appears to the inside of the cat (left cat → bubble on right, right cat → bubble on left)
    const bubbleStyle: React.CSSProperties = {
        position: 'fixed',
        bottom: corner.bottom + CAT_SIZE / 2 - 20,
        ...(isLeft
            ? { left: EDGE + CAT_SIZE + 10 }
            : { right: EDGE + CAT_SIZE + 10 }),
        maxWidth: 220,
        zIndex: 9999,
        pointerEvents: 'none',
        userSelect: 'none',
        opacity: tipVisible ? 1 : 0,
        transform: tipVisible ? 'translateY(0)' : 'translateY(6px)',
        transition: 'opacity 0.3s ease, transform 0.3s ease',
    };

    if (phase === 'hidden') return null;

    return (
        <>
            {/* Tip bubble */}
            <div aria-live="polite" style={bubbleStyle}>
                <div style={{
                    background: 'white',
                    color: '#0d1117',
                    fontSize: 12,
                    fontWeight: 600,
                    lineHeight: 1.5,
                    borderRadius: 14,
                    padding: '8px 12px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
                    position: 'relative',
                }}>
                    {TIPS[tipIndex]}
                    {/* Tail pointing toward the cat */}
                    <span style={{
                        position: 'absolute',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: 0,
                        height: 0,
                        ...(isLeft ? {
                            left: -8,
                            borderTop: '7px solid transparent',
                            borderBottom: '7px solid transparent',
                            borderRight: '9px solid white',
                        } : {
                            right: -8,
                            borderTop: '7px solid transparent',
                            borderBottom: '7px solid transparent',
                            borderLeft: '9px solid white',
                        }),
                    }} />
                </div>
            </div>

            {/* The cat */}
            <div
                role="button"
                aria-label="CashCat mascot — click for a budgeting tip"
                tabIndex={0}
                onClick={handleClick}
                onKeyDown={e => e.key === 'Enter' && handleClick()}
                style={{
                    ...catStyle,
                    opacity,
                    transform,
                    transition,
                    animation,
                }}
            >
                <Image
                    src="/logo.png"
                    alt="CashCat mascot"
                    width={CAT_SIZE}
                    height={CAT_SIZE}
                    className="rounded-full"
                    draggable={false}
                    priority
                />
            </div>

            {/* Keyframes */}
            <style>{`
                @keyframes mascot-arrive-right {
                    from { transform: translateX(${CAT_SIZE + EDGE + 16}px); opacity: 0; }
                    15%  { opacity: 1; }
                    to   { transform: translateX(0); opacity: 1; }
                }
                @keyframes mascot-arrive-left {
                    from { transform: translateX(-${CAT_SIZE + EDGE + 16}px); opacity: 0; }
                    15%  { opacity: 1; }
                    to   { transform: translateX(0); opacity: 1; }
                }
                @keyframes mascot-scamper-right {
                    to { transform: translateX(${CAT_SIZE + EDGE + 16}px); opacity: 0; }
                }
                @keyframes mascot-scamper-left {
                    to { transform: translateX(-${CAT_SIZE + EDGE + 16}px); opacity: 0; }
                }
                @keyframes mascot-breathe {
                    0%, 100% { transform: rotate(28deg) translateY(0px); }
                    50%      { transform: rotate(28deg) translateY(-2px); }
                }
                @keyframes mascot-wag {
                    0%, 100% { transform: rotate(-4deg) scale(1.05); }
                    50%      { transform: rotate(4deg) scale(1.05); }
                }
                @keyframes mascot-peek {
                    from { transform: translateY(${CAT_SIZE}px); opacity: 0; }
                    to   { transform: translateY(0); opacity: 1; }
                }
            `}</style>
        </>
    );
}
