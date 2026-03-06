'use client';

import Image from 'next/image';
import { useEffect, useRef, useState, useCallback } from 'react';

const MESSAGES = [
    "Psst! Sign up — it's free! 🐾",
    "I promise not to knock your budget off the table. 🐾",
    "Zero credit card required. Just zero-based budgeting! 🐾",
    "Ready to guard your stash? I'm watching. 🐾",
    "Purr-fect timing to take control of your money. 🐾",
    "Join the den. We budget hard and nap harder. 🐾",
    "Free forever for the basics. No sneaky fees here! 🐾",
    "I keep a very close eye on every penny. Very. Close. 🐾",
    "Your wallet called — it wants a plan. I've got one! 🐾 ",
    "Let's make your money work harder than a cat. 🐾",
    "Have you tried zero-based budgeting? It changed my life. 🐾",
    "meow. (that means: track your spending) 🐾",
];

const CAT_SIZE = 56;
const LERP = 0.010; // 0–1: lower = more lag/personality

interface Vec2 { x: number; y: number; }

export default function MascotLanding() {
    // Refs — no re-render needed for hot path
    const targetRef = useRef<Vec2 | null>(null);
    const posRef = useRef<Vec2 | null>(null);  // null until first target arrives
    const rafRef = useRef<number | null>(null);
    const walkRef = useRef(0); // accumulated walk phase

    // React state — only for things that affect rendering
    const [renderPos, setRenderPos] = useState<Vec2>({ x: -200, y: -200 });
    const [facingLeft, setFacingLeft] = useState(false);
    const [bobOffset, setBobOffset] = useState(0);
    const [tilt, setTilt] = useState(0);
    const [msgIndex, setMsgIndex] = useState(0);
    const [bubbleVisible, setBubbleVisible] = useState(true);

    // ── Message rotation ─────────────────────────────────────────────────
    useEffect(() => {
        setMsgIndex(Math.floor(Math.random() * MESSAGES.length));
        const id = setInterval(() => {
            setBubbleVisible(false);
            setTimeout(() => {
                setMsgIndex(i => (i + 1) % MESSAGES.length);
                setBubbleVisible(true);
            }, 350);
        }, 4500);
        return () => clearInterval(id);
    }, []);

    // ── Input tracking (page-space coords) ───────────────────────────────
    useEffect(() => {
        const onMouse = (e: MouseEvent) => {
            // pageX/Y = clientX/Y + scroll — perfect for absolute positioning
            targetRef.current = { x: e.pageX, y: e.pageY };
        };

        const onTouch = (e: TouchEvent) => {
            if (e.touches.length > 0) {
                targetRef.current = {
                    x: e.touches[0].pageX,
                    y: e.touches[0].pageY,
                };
            }
        };

        // On scroll (mobile mainly): keep target at viewport centre so cat
        // follows the user as they scroll without a finger position.
        const onScroll = () => {
            // Only update if no recent touch (don't clobber an active touch drag)
            if (!targetRef.current) {
                targetRef.current = {
                    x: window.scrollX + window.innerWidth / 2,
                    y: window.scrollY + window.innerHeight / 2,
                };
            } else {
                // Keep the target in page-space by shifting with the scroll delta
                // (browser re-fires scroll but not mousemove during scroll)
                targetRef.current = {
                    x: window.scrollX + window.innerWidth / 2,
                    y: window.scrollY + window.innerHeight / 2,
                };
            }
        };

        window.addEventListener('mousemove', onMouse, { passive: true });
        window.addEventListener('touchmove', onTouch, { passive: true });
        window.addEventListener('scroll', onScroll, { passive: true });

        return () => {
            window.removeEventListener('mousemove', onMouse);
            window.removeEventListener('touchmove', onTouch);
            window.removeEventListener('scroll', onScroll);
        };
    }, []);

    // ── rAF animation loop ────────────────────────────────────────────────
    const animate = useCallback(() => {
        const target = targetRef.current;

        if (target) {
            // Snap the cat's starting position to the target on first move
            if (!posRef.current) {
                posRef.current = { ...target };
            }

            const pos = posRef.current;

            // Lerp — exponential ease, frame-rate independent enough at 60 fps
            const newX = pos.x + (target.x - pos.x) * LERP;
            const newY = pos.y + (target.y - pos.y) * LERP;

            const dx = newX - pos.x;
            const dy = newY - pos.y;
            const speed = Math.sqrt(dx * dx + dy * dy);

            posRef.current = { x: newX, y: newY };

            // Accumulate walk phase proportional to speed
            if (speed > 0.3) {
                walkRef.current = (walkRef.current + speed * 0.18) % (2 * Math.PI);
                setFacingLeft(dx < -0.05);
                setBobOffset(Math.sin(walkRef.current) * 3);
                setTilt(Math.sin(walkRef.current) * 5);
            } else {
                // Idle: tiny breathing bob
                walkRef.current = (walkRef.current + 0.04) % (2 * Math.PI);
                setBobOffset(Math.sin(walkRef.current) * 1);
                setTilt(0);
            }

            // Offset so the cat is centred on the cursor/touch point
            setRenderPos({
                x: newX - CAT_SIZE / 2,
                y: newY - CAT_SIZE / 2,
            });
        }

        rafRef.current = requestAnimationFrame(animate);
    }, []);

    useEffect(() => {
        rafRef.current = requestAnimationFrame(animate);
        return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
    }, [animate]);

    // ── Bubble positioning ────────────────────────────────────────────────
    // Clamp horizontally so it doesn't overflow the page
    const bubbleW = 220;
    const bubbleX = Math.max(8, renderPos.x - (bubbleW / 2 - CAT_SIZE / 2));
    const aboveY = renderPos.y - 80;
    const bubbleAbove = aboveY > 8;
    const bubbleY = bubbleAbove ? aboveY : renderPos.y + CAT_SIZE + 10;

    // Hide entirely until we have a position
    const catVisible = posRef.current !== null;

    return (
        <>
            {/* Speech bubble — sits just above (or below) the cat */}
            <div
                aria-hidden="true"
                style={{
                    position: 'absolute',
                    left: bubbleX,
                    top: bubbleY,
                    width: bubbleW,
                    zIndex: 9999,
                    pointerEvents: 'none',
                    userSelect: 'none',
                    opacity: catVisible && bubbleVisible ? 1 : 0,
                    transition: 'opacity 0.35s ease',
                }}
            >
                <div
                    style={{
                        background: 'white',
                        color: '#0d1117',
                        fontSize: 12,
                        fontWeight: 600,
                        lineHeight: 1.5,
                        borderRadius: 14,
                        padding: '8px 12px',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
                        position: 'relative',
                    }}
                >
                    {MESSAGES[msgIndex]}

                    {/* Triangle tail */}
                    <span style={{
                        position: 'absolute',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: 0,
                        height: 0,
                        ...(bubbleAbove ? {
                            bottom: -8,
                            borderLeft: '7px solid transparent',
                            borderRight: '7px solid transparent',
                            borderTop: '9px solid white',
                        } : {
                            top: -8,
                            borderLeft: '7px solid transparent',
                            borderRight: '7px solid transparent',
                            borderBottom: '9px solid white',
                        }),
                    }} />
                </div>
            </div>

            {/* The cat itself — position: absolute so it lives in page space */}
            <div
                style={{
                    position: 'absolute',
                    left: renderPos.x,
                    top: renderPos.y,
                    width: CAT_SIZE,
                    height: CAT_SIZE,
                    zIndex: 9998,
                    pointerEvents: catVisible ? 'auto' : 'none',
                    userSelect: 'none',
                    opacity: catVisible ? 1 : 0,
                    transform: `
                        translateY(${bobOffset}px)
                        scaleX(${facingLeft ? -1 : 1})
                        rotate(${tilt}deg)
                    `,
                    filter: 'drop-shadow(0 4px 14px rgba(14, 126, 255, 0.5))',
                    cursor: 'pointer',
                    willChange: 'transform, left, top',
                }}
                onClick={() => window.location.href = '/signup'}
                title="Sign up for CashCat!"
            >
                <Image
                    src="/logo.png"
                    alt="CashCat mascot"
                    width={CAT_SIZE}
                    height={CAT_SIZE}
                    className="rounded-full"
                    priority
                    draggable={false}
                />
            </div>
        </>
    );
}
